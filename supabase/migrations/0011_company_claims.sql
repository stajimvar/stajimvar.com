-- =============================================================================
-- Şirket sahiplenme talepleri
-- =============================================================================
--
-- NEDEN BU TABLO
-- --------------
-- İlanları şirketlerin kendi kariyer sayfalarından derliyoruz; şirketin
-- kendisinin haberi yok. Bir İK sorumlusu kendi şirketinin ilanını burada
-- görüp "bu bizim" demek istediğinde bir yol olmalı.
--
-- NEDEN DOĞRUDAN DEĞİL DE TALEP
-- -----------------------------
-- Sahiplenme, o kişiye şirketin ilanları ve gelen başvurular üzerinde yetki
-- veriyor. Otomatik vermek, "şirket e-postam var" diyen herkese başka bir
-- şirketin başvurularını açmak demek. Doğrulama e-postası da şu an
-- gönderemiyoruz (alan adı doğrulaması yapılmadı).
--
-- Bu yüzden akış talep + yönetici onayı: kişi bilgilerini bırakıyor, yönetici
-- kurumsal e-posta ve şirket sitesini karşılaştırıp onaylıyor. Site sahibinin
-- "şirketler ilan girsin ama benim onayımdan geçsin" kararıyla da aynı çizgi.

create table public.company_claims (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,

  -- Başvuran kişi. Yönetici bu bilgilerle şirketin sitesindeki bilgiyi
  -- karşılaştırıyor; onay bir insan kararı, otomatik eşleşme değil.
  contact_name    text not null,
  contact_title   text,
  -- citext eklentisi bu projede kurulu degil; adres uygulamada kucuk harfe
  -- cevrilerek yaziliyor ve burada bicim kontrolu yapiliyor.
  work_email      text not null check (work_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  phone           text,
  note            text,

  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  reject_reason   text,
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),

  -- Aynı kişi aynı şirket için bekleyen ikinci talep açamasın. Reddedilmiş
  -- taleplerden sonra yeniden denenebilsin diye kısmi index kullanılıyor.
  constraint company_claims_reviewed_together check (
    (status = 'pending' and reviewed_at is null)
    or (status <> 'pending' and reviewed_at is not null)
  )
);

create unique index company_claims_tek_bekleyen
  on public.company_claims (company_id, user_id)
  where status = 'pending';

create index company_claims_bekleyenler
  on public.company_claims (status, created_at desc)
  where status = 'pending';

comment on table public.company_claims is
  'Şirket sahiplenme talepleri. Onay yönetici tarafından elle verilir; '
  'onaylanınca company_members kaydı açılır ve companies.claimed_at dolar.';

-- -----------------------------------------------------------------------------
-- Onay: tek yerde, tek işlemde
-- -----------------------------------------------------------------------------
-- Onay üç ayrı tabloya yazıyor. Bunu istemciye üç ayrı istek olarak yaptırmak,
-- ikincisi başarısız olduğunda yarım kalmış bir yetki bırakırdı: üyelik var
-- ama şirket sahiplenilmemiş görünür. Tek fonksiyon, tek işlem.
create or replace function public.approve_company_claim(claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  talep public.company_claims;
begin
  if not public.is_admin() then
    raise exception 'yalnizca yonetici onaylayabilir';
  end if;

  select * into talep from public.company_claims where id = claim_id for update;
  if not found then
    raise exception 'talep bulunamadi';
  end if;
  if talep.status <> 'pending' then
    raise exception 'talep zaten sonuclanmis: %', talep.status;
  end if;

  update public.company_claims
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = claim_id;

  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  values (talep.company_id, talep.user_id, 'Owner', true)
  on conflict (company_id, user_id)
  do update set recruiter_role = 'Owner', is_owner = true;

  -- Şirket ilk kez sahipleniliyorsa işaretle. Sonraki üyeler bu alanı ezmesin.
  update public.companies
     set claimed_at = coalesce(claimed_at, now()),
         claimed_by = coalesce(claimed_by, talep.user_id)
   where id = talep.company_id;

  -- Kullanıcı artık şirket tarafında. Öğrenci profili silinmiyor; kişi hem
  -- öğrenci hem İK sorumlusu olabilir ve verisini kaybetmemeli.
  update public.profiles set role = 'company' where id = talep.user_id;
end;
$$;

create or replace function public.reject_company_claim(claim_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'yalnizca yonetici reddedebilir';
  end if;

  update public.company_claims
     set status = 'rejected', reject_reason = reason,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = claim_id and status = 'pending';

  if not found then
    raise exception 'bekleyen talep bulunamadi';
  end if;
end;
$$;

revoke all on function public.approve_company_claim(uuid) from public, anon;
revoke all on function public.reject_company_claim(uuid, text) from public, anon;
grant execute on function public.approve_company_claim(uuid) to authenticated;
grant execute on function public.reject_company_claim(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.company_claims enable row level security;

-- Kişi yalnızca kendi talebini görür. Başkasının kurumsal e-postası ve
-- telefonu kişisel veri; talep listesi herkese açık olamaz.
create policy "kendi talebini gorur" on public.company_claims
  for select using (user_id = auth.uid() or public.is_admin());

-- Talep yalnızca kendi adına açılabilir ve daima 'pending' başlar.
create policy "kendi adina talep acar" on public.company_claims
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

-- Güncelleme yalnızca yönetici fonksiyonlarıyla. Doğrudan UPDATE yok:
-- olsaydı kişi kendi talebini 'approved' yapabilirdi.
create policy "yalnizca yonetici gunceller" on public.company_claims
  for update using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.company_claims to authenticated;
revoke update, delete on public.company_claims from authenticated;
