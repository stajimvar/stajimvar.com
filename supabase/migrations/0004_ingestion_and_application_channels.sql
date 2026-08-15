-- =====================================================================
-- 0004 — İlan toplama (ingestion) altyapısı ve başvuru kanalı modeli
--
-- Bu migrasyon şemayı "şirketler kendi ilanını girer" varsayımından
-- "ilanların çoğu dış kaynaklardan toplanır" gerçeğine taşır.
--
-- Üç ana değişiklik:
--   1. sources / ingestion_runs — kaynak kaydı, uyum bayrakları, çalıştırma günlüğü
--   2. listings — köken, dedup anahtarları, HR e-postası, başvuru yöntemi
--   3. applications — snapshot, açık rıza, e-posta teslim durumu (audit)
-- =====================================================================

-- ---------------------------------------------------------------- Enum'lar

-- İlanın/şirketin nereden geldiği.
create type listing_origin as enum (
  'scraped',   -- dış kaynaktan otomatik toplandı
  'internal',  -- şirket StajımVar'a kendi girdi
  'manual'     -- editör elle ekledi
);

-- Öğrenci bu ilana nasıl başvurur?
create type application_method as enum (
  -- Başvuru StajımVar'da toplanır, doğrulanmış İK e-postasına iletilir.
  'email_application',
  -- Başvuru hukuken/teknik olarak resmî harici sistemden yapılmalı (Kariyer Kapısı vb.).
  'external',
  -- Şirket StajımVar üyesidir, başvuru tamamen platform içinde kalır.
  'internal'
);

-- Kaynağa nasıl erişiyoruz? HTML kazıma en son çare.
create type source_kind as enum (
  'api',       -- resmî API
  'rss',       -- RSS/Atom akışı
  'jsonld',    -- sayfada schema.org JobPosting yapılandırılmış verisi
  'sitemap',   -- sitemap.xml üzerinden keşif
  'partner',   -- anlaşmalı veri aktarımı
  'manual'     -- elle giriş
);

create type ingest_status as enum ('ok', 'partial', 'failed');

-- Başvurunun şirkete iletim durumu.
create type email_delivery_status as enum (
  'not_required',       -- external/internal başvuru — e-posta gönderilmiyor
  'pending',            -- kuyrukta
  'sent',               -- sağlayıcı kabul etti
  'bounced',            -- geri döndü
  'failed',             -- gönderilemedi
  'skipped_unverified'  -- İK e-postası doğrulanmadığı için GÖNDERİLMEDİ
);

-- ---------------------------------------------------------------- sources

create table public.sources (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  base_url            text not null,
  kind                source_kind not null,

  -- --- Uyum alanları. Hepsi bilinçli olarak "kapalı" varsayılanla başlar. ---

  -- Bu kaynağı çekmek robots.txt tarafından açıkça izinli mi? Elle doğrulanır.
  robots_allowed      boolean not null default false,
  -- Kullanım şartları ne zaman ve kim tarafından okundu.
  tos_reviewed_at     timestamptz,
  tos_reviewed_by     uuid references public.profiles(id),
  tos_notes           text,
  -- İstek hızı sınırları. Edge Function bunlara uymak zorunda.
  rate_limit_per_min  int not null default 10 check (rate_limit_per_min between 1 and 120),
  crawl_delay_seconds int not null default 6  check (crawl_delay_seconds >= 0),
  user_agent          text not null default 'StajimVarBot/1.0 (+https://stajimvar.com/bot)',

  -- Ana şalter. tos_reviewed_at ve robots_allowed olmadan açılamaz (aşağıdaki check).
  is_enabled          boolean not null default false,

  last_run_at         timestamptz,
  last_success_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Bir kaynağı, uyum kontrolleri yapılmadan açmak mümkün olmasın.
  constraint sources_enable_requires_review check (
    is_enabled = false
    or (robots_allowed = true and tos_reviewed_at is not null)
  )
);

comment on table public.sources is
  'İlan kaynakları. is_enabled yalnızca robots.txt ve kullanım şartları elle doğrulandıktan sonra açılabilir.';

create table public.ingestion_runs (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references public.sources(id) on delete cascade,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         ingest_status not null default 'ok',
  fetched_count  int not null default 0,
  created_count  int not null default 0,
  updated_count  int not null default 0,
  skipped_count  int not null default 0,  -- staj olmadığı için elenenler
  deactivated_count int not null default 0,
  error_text     text
);

create index on public.ingestion_runs (source_id, started_at desc);

-- ---------------------------------------------------------------- companies

-- Toplanan ilanların işvereni de bir companies kaydına bağlanır; böylece tek
-- şirket modeli korunur ve ileride şirket kendi kaydını sahiplenebilir.
alter table public.companies
  add column origin       listing_origin not null default 'internal',
  add column claimed_at   timestamptz,
  add column claimed_by   uuid references public.profiles(id),
  -- İsim normalizasyonu ile dedup: "Trendyol Group" ve "TRENDYOL GROUP" aynı kayıt.
  add column name_normalized text
    generated always as (lower(regexp_replace(name, '[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+', '', 'g'))) stored;

create unique index companies_name_normalized_key on public.companies (name_normalized);

comment on column public.companies.origin is
  'scraped = ilan toplama sırasında otomatik açıldı, henüz sahiplenilmedi (verified = false).';

-- ---------------------------------------------------------------- listings

alter table public.listings
  add column origin              listing_origin not null default 'internal',
  add column source_id           uuid references public.sources(id) on delete set null,
  -- Kaynağın kendi ilan kimliği (varsa). Dedup'ın birinci anahtarı.
  add column source_listing_id   text,
  -- İlanın kaynaktaki adresi ve kanonik hali. Dedup'ın ikinci anahtarı.
  add column source_url          text,
  add column canonical_url       text,
  -- Başvurunun yapılacağı orijinal adres (external yöntemde zorunlu).
  add column apply_url           text,
  -- İçerik parmak izi. Değişmediyse UPDATE atlanır. Dedup'ın üçüncü anahtarı.
  add column content_hash        text,

  add column first_seen_at       timestamptz,
  add column last_seen_at        timestamptz,
  add column imported_at         timestamptz,
  -- Kaynaktan kalktığında/süresi dolduğunda doldurulur; status 'closed' olur.
  add column deactivated_at      timestamptz,
  add column deactivation_reason text,

  -- Başvuru kanalı
  add column application_method  application_method not null default 'internal',
  add column hr_email            text,
  add column hr_email_verified   boolean not null default false,
  -- E-posta nereden geldi: 'source_field' | 'company_domain_mx' | 'manual' ...
  add column hr_email_source     text,
  add column hr_email_verified_at timestamptz,

  add column insurance_note      text,
  -- Kaynaktan gelen ham kayıt; ayrıştırma hatalarını sonradan çözebilmek için.
  add column raw                 jsonb;

comment on column public.listings.deactivated_at is
  'Aktif/pasif durumu status alanından okunur: status = ''published'' aktif demektir. Bu alan pasife alma anını ve sebebini saklar.';

-- --- Dedup indeksleri --------------------------------------------------

-- 1) Kaynak + kaynağın ilan kimliği
create unique index listings_source_listing_key
  on public.listings (source_id, source_listing_id)
  where source_id is not null and source_listing_id is not null;

-- 2) Kanonik URL
create unique index listings_canonical_url_key
  on public.listings (canonical_url)
  where canonical_url is not null;

-- 3) İçerik parmak izi (aynı ilan farklı URL'lerde yayınlanmış olabilir)
create unique index listings_source_content_hash_key
  on public.listings (source_id, content_hash)
  where source_id is not null and content_hash is not null;

create index listings_last_seen_idx on public.listings (source_id, last_seen_at)
  where origin = 'scraped';

-- --- Başvuru kanalı tutarlılığı ----------------------------------------

-- KRİTİK: doğrulanmamış bir e-postaya öğrenci verisi gönderilemesin diye
-- kuralı veritabanı düzeyinde bağlıyoruz. Uygulama katmanı hata yapsa bile
-- email_application yöntemi doğrulanmış adres olmadan kaydedilemez.
alter table public.listings
  add constraint listings_email_method_requires_verified_email check (
    application_method <> 'email_application'
    or (hr_email is not null and hr_email_verified = true)
  );

-- external yöntemi başvuru adresi olmadan anlamsız.
alter table public.listings
  add constraint listings_external_method_requires_url check (
    application_method <> 'external' or apply_url is not null
  );

-- Toplanan ilan mutlaka bir kaynağa bağlı olmalı.
alter table public.listings
  add constraint listings_scraped_requires_source check (
    origin <> 'scraped' or source_id is not null
  );

-- ---------------------------------------------------------------- applications

alter table public.applications
  add column application_method     application_method not null default 'internal',

  -- Başvuru anındaki CV ve profil fotoğrafı. Öğrenci profilini sonradan
  -- değiştirse bile şirkete giden başvurunun ne olduğu kayıtta kalır.
  add column cv_snapshot_path       text,
  add column profile_snapshot       jsonb,

  -- KVKK: iletişim bilgisinin şirketle paylaşılmasına açık rıza.
  -- Bu alan boşken hiçbir kişisel veri dışarı çıkmaz (aşağıdaki check).
  add column contact_share_consent_at timestamptz,
  add column contact_share_consent_version text,

  add column submitted_at           timestamptz,
  add column email_delivery_status  email_delivery_status not null default 'not_required',
  add column email_provider_message_id text,
  add column email_last_error       text,
  add column email_attempts         int not null default 0,

  -- Audit
  add column created_via            text,  -- 'web' | 'api'
  add column status_changed_at      timestamptz;

-- E-posta ile iletilecek bir başvuru, açık rıza olmadan kaydedilemez.
alter table public.applications
  add constraint applications_email_requires_consent check (
    application_method <> 'email_application'
    or contact_share_consent_at is not null
  );

create index applications_delivery_idx on public.applications (email_delivery_status)
  where email_delivery_status in ('pending', 'failed');

-- ---------------------------------------------------------------- Tetikleyiciler

-- status değiştiğinde damgala (şirket "ne zaman reddetti" sorusuna cevap).
create or replace function public.stamp_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.stamp_application_status_change() from public, anon, authenticated;

create trigger applications_stamp_status_change
  before update on public.applications
  for each row execute function public.stamp_application_status_change();

create or replace function public.touch_sources_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.touch_sources_updated_at() from public, anon, authenticated;

create trigger sources_touch_updated_at
  before update on public.sources
  for each row execute function public.touch_sources_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.sources        enable row level security;
alter table public.ingestion_runs enable row level security;

-- Kaynak yönetimi ve çalıştırma günlükleri yalnızca admin'e açık.
-- Ingestion'ın kendisi service_role ile çalışır ve RLS'i baypas eder.
create policy sources_admin_all on public.sources
  for all using (public.is_admin()) with check (public.is_admin());

create policy ingestion_runs_admin_read on public.ingestion_runs
  for select using (public.is_admin());

-- ---------------------------------------------------------------- Kolon yetkileri
--
-- İK e-posta adresi ve kaynaktan gelen ham kayıt tarayıcıya hiç inmemeli:
-- başvuru gönderimi zaten server-side yapılıyor, istemcinin bu alanlara ihtiyacı yok.
-- Adresi açıkta bırakmak, ilan listesini toplu e-posta hedef listesine çevirir.
--
-- DİKKAT: PostgreSQL'de tablo düzeyinde SELECT yetkisi varken kolon düzeyinde REVOKE
-- etkisizdir. Bu yüzden önce tablo yetkisi geri alınıp izin verilen kolonlar tek tek
-- veriliyor. Yeni kolon eklendiğinde bu listeye de eklenmesi gerekir.

revoke select on public.listings from anon, authenticated;

grant select (
  id, company_id, title, department, work_type, city,
  mandatory_staj_accepted, voluntary_staj_accepted,
  is_paid, stipend_text, duration, term, application_deadline, min_grade_level,
  required_skills, preferred_skills, description, responsibilities, perks,
  category, featured, status, applicants_count, posted_at, created_at, updated_at,
  origin, source_id, source_listing_id, source_url, canonical_url, apply_url,
  content_hash, first_seen_at, last_seen_at, imported_at,
  deactivated_at, deactivation_reason,
  application_method, hr_email_verified, insurance_note
) on public.listings to anon, authenticated;
