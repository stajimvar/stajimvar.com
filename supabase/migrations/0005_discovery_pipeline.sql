-- =====================================================================
-- 0005 — Keşif pipeline'ı: staging, başvuru kanalları, olay günlüğü
--
-- Pipeline:
--   keşfet → staj mı? → şirket kim? → kaynak güvenilir mi? → duplicate mi?
--         → hâlâ aktif mi? → başvuru kanalı ne? → yayınla
--
-- Bulunan her şey doğrudan `listings`'e girmez. Önce `raw_listings`'e düşer,
-- her adımda elenebilir ve neden elendiği kayıtta kalır. Böylece hangi kaynağın
-- kaç ilan getirdiği ve nerede kaybettiği ölçülebilir.
-- =====================================================================

-- ---------------------------------------------------------------- Enum'lar

-- Kaynağın ne kadar güvenilir olduğu. Yayınlama yetkisini bu belirler.
create type source_trust as enum (
  -- Şirketin kendi kariyer sayfası, ATS'i (Greenhouse/Lever/Workable) veya
  -- resmî kamu portalı. Doğrudan yayınlanabilir.
  'official',
  -- Üniversite kariyer merkezi, anlaşmalı kaynak. Yayınlanabilir.
  'verified_third_party',
  -- Yalnızca ipucu. TEK BAŞINA YAYINLANAMAZ; ilan şirketin resmî
  -- kaynağında doğrulanmadan `listings`'e geçemez.
  'discovery_signal'
);

create type pipeline_status as enum (
  'discovered',          -- kaynaktan alındı, henüz işlenmedi
  'needs_verification',  -- discovery_signal kaynağından geldi, resmî teyit bekliyor
  'rejected',            -- elendi (reject_reason'a bak)
  'promoted',            -- listings'e geçti
  'stale'                -- kaynakta artık yok
);

create type reject_reason as enum (
  'not_internship',        -- staj değil (Senior Developer vb.)
  'company_unresolved',    -- şirket eşleştirilemedi
  'source_untrusted',      -- discovery_signal, resmî kaynakta doğrulanamadı
  'duplicate',             -- zaten var
  'inactive',              -- kaynakta kapanmış
  'no_application_channel',-- başvuru kanalı yok
  'parse_error'
);

create type channel_type as enum ('email', 'external_url', 'internal');

create type channel_verification as enum ('unverified', 'verified', 'rejected');

create type import_event_type as enum (
  'discovered', 'updated', 'rejected', 'promoted', 'deactivated', 'error'
);

-- ---------------------------------------------------------------- sources

alter table public.sources
  -- Hangi adaptör kodu çalışacak: 'greenhouse' | 'lever' | 'workable'
  -- | 'jsonld' | 'rss' | 'kariyerkapisi' | ...
  add column adapter    text not null default 'jsonld',
  add column trust      source_trust not null default 'discovery_signal',
  -- Kaynak tek bir şirkete aitse (şirketin kendi kariyer sayfası).
  add column company_id uuid references public.companies(id) on delete cascade,
  add column next_run_at timestamptz,
  add column run_interval_minutes int not null default 360
    check (run_interval_minutes >= 30);

comment on column public.sources.trust is
  'discovery_signal kaynaklarından gelen ilanlar resmî kaynakta doğrulanmadan yayınlanamaz.';

-- ---------------------------------------------------------------- raw_listings

create table public.raw_listings (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid not null references public.sources(id) on delete cascade,

  -- Kimlik / dedup anahtarları
  external_id       text,          -- kaynağın kendi ilan kimliği
  url               text not null,
  canonical_url     text,
  content_hash      text not null,

  -- Ham kayıt. Ayrıştırma hatalarını sonradan çözebilmek için saklanır.
  raw               jsonb not null,

  -- Normalleştirilmiş alanlar (ayrıştırma sonucu, henüz doğrulanmamış)
  title             text,
  company_name_raw  text,
  description       text,
  city              text,
  work_type_guess   text,
  posted_at         timestamptz,
  deadline          date,
  apply_url         text,

  -- Sınıflandırma: bu bir staj ilanı mı?
  is_internship     boolean,
  internship_score  numeric(4,3) check (internship_score between 0 and 1),
  classifier_notes  text,

  -- Pipeline durumu
  status            pipeline_status not null default 'discovered',
  reject_reason     reject_reason,
  matched_company_id uuid references public.companies(id) on delete set null,
  promoted_listing_id uuid references public.listings(id) on delete set null,

  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  processed_at      timestamptz,

  -- Elenen kaydın sebebi mutlaka yazılsın; "sessizce kayboldu" olmasın.
  constraint raw_listings_rejected_needs_reason check (
    status <> 'rejected' or reject_reason is not null
  )
);

comment on table public.raw_listings is
  'Keşif havuzu. Bulunan her ilan önce buraya düşer; yalnızca tüm kontrolleri geçen listings''e promote edilir.';

create unique index raw_listings_source_external_key
  on public.raw_listings (source_id, external_id)
  where external_id is not null;

create unique index raw_listings_source_hash_key
  on public.raw_listings (source_id, content_hash);

create index raw_listings_status_idx on public.raw_listings (status, last_seen_at);
create index raw_listings_source_status_idx on public.raw_listings (source_id, status);

-- ---------------------------------------------------------------- application_channels

create table public.application_channels (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  type          channel_type not null,
  -- e-posta adresi veya başvuru URL'si
  value         text not null,

  verification  channel_verification not null default 'unverified',
  -- Nasıl doğrulandı: 'published_on_career_page' | 'ats_official'
  --                 | 'company_claimed' | 'manual_review'
  verification_method text,
  -- Nerede gördük. Doğrulanmış kanal kanıtsız olamaz (aşağıdaki check).
  evidence_url  text,
  verified_at   timestamptz,
  verified_by   uuid references public.profiles(id),

  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),

  unique (company_id, type, value),

  -- Doğrulanmış bir kanal, kanıt ve yöntem olmadan işaretlenemez.
  constraint channels_verified_needs_evidence check (
    verification <> 'verified'
    or (evidence_url is not null and verification_method is not null and verified_at is not null)
  ),

  -- KRİTİK: genel kurumsal kutulara CV gönderilmez.
  -- "kariyer@" / "ik@" / "staj@" gibi açıkça işe alım için yayınlanmış
  -- adresler kabul; "info@", "iletisim@", "contact@", "destek@" reddedilir.
  constraint channels_no_generic_mailbox check (
    type <> 'email'
    or lower(split_part(value, '@', 1)) not in (
      'info', 'iletisim', 'contact', 'destek', 'support', 'hello', 'merhaba',
      'admin', 'webmaster', 'sales', 'satis', 'pazarlama', 'marketing',
      'noreply', 'no-reply', 'postmaster', 'abuse', 'bilgi'
    )
  ),

  constraint channels_email_shape check (
    type <> 'email' or value ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
  ),

  constraint channels_url_shape check (
    type <> 'external_url' or value ~* '^https?://'
  )
);

comment on constraint channels_no_generic_mailbox on public.application_channels is
  'info@/iletisim@ gibi genel kutular başvuru kanalı olamaz — oraya CV göndermek kişisel veriyi yanlış yere yollamaktır.';

create index application_channels_company_idx
  on public.application_channels (company_id, type, verification);

-- ---------------------------------------------------------------- listings

-- 0004'te İK e-postası doğrudan listings üzerindeydi. Kanal artık şirket
-- düzeyinde ve doğrulanabilir bir kayıt; ilan ona referans veriyor.
-- Tablolar boş olduğu için veri taşıma gerekmiyor.
alter table public.listings
  drop constraint listings_email_method_requires_verified_email,
  drop column hr_email,
  drop column hr_email_verified,
  drop column hr_email_source,
  drop column hr_email_verified_at;

alter table public.listings
  add column application_channel_id uuid references public.application_channels(id) on delete restrict,
  add column raw_listing_id uuid references public.raw_listings(id) on delete set null;

-- Cross-tablo kural olduğu için CHECK ile ifade edilemez; tetikleyici ile bağlanıyor.
create or replace function public.enforce_listing_application_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ch public.application_channels%rowtype;
begin
  if new.application_method = 'email_application' then
    if new.application_channel_id is null then
      raise exception 'email_application yöntemi doğrulanmış bir başvuru kanalı gerektirir';
    end if;

    select * into ch from public.application_channels where id = new.application_channel_id;

    if ch.type <> 'email' then
      raise exception 'email_application yöntemi email tipinde kanal gerektirir, bulunan: %', ch.type;
    end if;
    if ch.verification <> 'verified' then
      raise exception 'Doğrulanmamış başvuru kanalına öğrenci verisi gönderilemez (kanal: %)', ch.id;
    end if;
    if ch.company_id <> new.company_id then
      raise exception 'Başvuru kanalı başka bir şirkete ait';
    end if;
    if not ch.is_active then
      raise exception 'Başvuru kanalı pasif durumda';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_listing_application_channel() from public, anon, authenticated;

create trigger listings_enforce_application_channel
  before insert or update on public.listings
  for each row execute function public.enforce_listing_application_channel();

-- ---------------------------------------------------------------- import_runs / import_events

alter table public.ingestion_runs rename to import_runs;

alter table public.import_runs
  add column promoted_count int not null default 0,
  add column rejected_count int not null default 0;

create table public.import_events (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid references public.import_runs(id) on delete cascade,
  source_id      uuid not null references public.sources(id) on delete cascade,
  raw_listing_id uuid references public.raw_listings(id) on delete set null,
  event_type     import_event_type not null,
  message        text,
  payload        jsonb,
  created_at     timestamptz not null default now()
);

create index import_events_run_idx on public.import_events (run_id, created_at);
create index import_events_source_idx on public.import_events (source_id, event_type, created_at desc);

-- Kaynak verimliliği: hangi kaynak kaç ilan getirdi, nerede kaybetti.
create or replace view public.source_effectiveness
with (security_invoker = true) as
select
  s.id            as source_id,
  s.slug,
  s.name,
  s.trust,
  s.is_enabled,
  count(r.id)                                          as discovered,
  count(*) filter (where r.status = 'promoted')        as promoted,
  count(*) filter (where r.status = 'rejected')        as rejected,
  count(*) filter (where r.reject_reason = 'not_internship') as rejected_not_internship,
  count(*) filter (where r.reject_reason = 'duplicate')      as rejected_duplicate,
  max(r.last_seen_at)                                  as last_discovery_at
from public.sources s
left join public.raw_listings r on r.source_id = s.id
group by s.id, s.slug, s.name, s.trust, s.is_enabled;

-- ---------------------------------------------------------------- RLS

alter table public.raw_listings         enable row level security;
alter table public.application_channels enable row level security;
alter table public.import_events        enable row level security;

-- Keşif havuzu ve olay günlüğü yalnızca admin'e açık.
-- Pipeline'ın kendisi service_role ile çalışır, RLS'i baypas eder.
create policy raw_listings_admin_all on public.raw_listings
  for all using (public.is_admin()) with check (public.is_admin());

create policy import_events_admin_read on public.import_events
  for select using (public.is_admin());

-- Başvuru kanalları: şirket üyeleri kendi kanallarını görebilir ama
-- DOĞRULAMA DURUMUNU KENDİLERİ DEĞİŞTİREMEZ (aşağıdaki tetikleyici).
create policy channels_company_read on public.application_channels
  for select using (public.is_admin() or public.is_company_member(company_id));

create policy channels_company_insert on public.application_channels
  for insert with check (public.is_company_member(company_id) or public.is_admin());

create policy channels_company_update on public.application_channels
  for update using (public.is_company_member(company_id) or public.is_admin())
  with check (public.is_company_member(company_id) or public.is_admin());

create policy channels_admin_delete on public.application_channels
  for delete using (public.is_admin());

-- Şirket kendi kanalını "doğrulanmış" işaretleyemesin — aksi halde herkes
-- istediği adrese öğrenci CV'si akıtabilirdi.
create or replace function public.guard_channel_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' and new.verification <> 'unverified' then
    raise exception 'Başvuru kanalı doğrulamasını yalnızca StajımVar yapar';
  end if;

  if tg_op = 'UPDATE' and new.verification is distinct from old.verification then
    raise exception 'Başvuru kanalı doğrulamasını yalnızca StajımVar yapar';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_channel_verification() from public, anon, authenticated;

create trigger application_channels_guard_verification
  before insert or update on public.application_channels
  for each row execute function public.guard_channel_verification();

-- ---------------------------------------------------------------- Kolon yetkileri

-- 0004'teki GRANT listesi hr_email* kolonları düştüğü ve yenileri eklendiği için
-- baştan yazılıyor.
revoke select on public.listings from anon, authenticated;

grant select (
  id, company_id, title, department, work_type, city,
  mandatory_staj_accepted, voluntary_staj_accepted,
  is_paid, stipend_text, duration, term, application_deadline, min_grade_level,
  required_skills, preferred_skills, description, responsibilities, perks,
  category, featured, status, applicants_count, posted_at, created_at, updated_at,
  origin, source_id, source_url, canonical_url, apply_url,
  application_method, application_channel_id, insurance_note
) on public.listings to anon, authenticated;

-- Kanalın kendi değeri (e-posta adresi) yalnızca şirket üyesine ve admin'e açık;
-- ziyaretçi hiç göremez.
revoke all on public.application_channels from anon;
