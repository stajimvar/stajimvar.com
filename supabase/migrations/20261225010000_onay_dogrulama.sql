/*
  YÖNETİCİ ONAYI = DOĞRULAMA (9 Kasım 2026, kullanıcı kararı)

  Ölçülen: Modmere'nin şirket talebi onaylandı ama şirket `verified = false`
  açıldı (20261223010000 onayı doğrulamadan ayırmıştı; doğrulama yalnız
  VKN'li sirket_dogrula ile). Sonuç: onaylı işverenin ilanı "Şirket hesabın
  henüz doğrulanmadı" diye incelemeye düşüyor, adaylar kapalı kalıyor.
  Kullanıcı seçti: "Onay = doğrulama" — yönetici şirket ya da sahiplenme
  talebini onaylayınca şirket doğrulanmış olur, VKN istenmez.

  Sunucudaki bütün kurallar (ilan kontrolü, başvuru bildirimi, onay kuyruğu,
  sirket_dogrulandi) yalnız companies.verified'e bakıyor; vkn_dogrulandi_at
  VKN'ye dayalı doğrulamanın damgası olarak boş kalıyor (uydurulmuyor).

  BU GÖÇ
    1. approve_sirket_talebi: şirket verified = true açılıyor.
    2. approve_company_claim: sahiplenme onayı şirketi doğruluyor.
    3. Geriye dönük: onaylanmış yeni şirket taleplerinin şirketleri
       (bugün yalnız Modmere) doğrulanıyor.

  GERİ ALMA
    20261223010000'deki approve_sirket_talebi ve 20260830020000 sonrası
    approve_company_claim tanımları yeniden uygulanır; Modmere için
    update public.companies set verified = false where id = '1db9b3ef-93e6-4ab4-bb6a-e8d691e34adc';
*/

-- 1) Yeni şirket talebi onayı ----------------------------------------------

create or replace function public.approve_sirket_talebi(talep_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare
  t public.sirket_talepleri;
  yeni_id uuid;
  kok text;
begin
  if not public.is_admin() then
    raise exception 'yalnizca yonetici onaylayabilir';
  end if;

  select * into t from public.sirket_talepleri where id = talep_id for update;
  if not found then
    raise exception 'talep bulunamadi';
  end if;
  if t.durum not in ('yeni', 'inceleniyor') then
    raise exception 'talep zaten sonuclanmis: %', t.durum;
  end if;
  if t.user_id is null then
    raise exception 'talep bir hesaba bagli degil; sahip atanamaz';
  end if;
  if exists (
    select 1 from public.companies c
     where c.name_normalized = lower(regexp_replace(t.sirket_adi, '[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+', '', 'g'))
  ) then
    raise exception 'bu adla bir sirket zaten var; var olan sirketi sahiplenme talebiyle ilerleyin';
  end if;

  kok := trim(both '-' from regexp_replace(
    lower(translate(t.sirket_adi, 'ıİşŞğĞüÜöÖçÇ', 'iissgguuoocc')), '[^a-z0-9]+', '-', 'g'));
  if kok = '' then kok := 'sirket'; end if;

  insert into public.companies (
    name, slug, website_url, industry, size, location, description, logo_url, vkn,
    origin, verified, created_by, claimed_at, claimed_by
  ) values (
    t.sirket_adi,
    left(kok, 40) || '-' || substr(md5(t.id::text), 1, 6),
    nullif(trim(t.web_sitesi), ''),
    nullif(trim(t.sektor), ''),
    nullif(trim(t.calisan_sayisi), ''),
    nullif(trim(t.sehir), ''),
    nullif(trim(t.tanitim), ''),
    nullif(trim(t.logo_url), ''),
    nullif(trim(t.vkn), ''),
    'manual', true, t.user_id, now(), t.user_id
  )
  returning id into yeni_id;

  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  values (yeni_id, t.user_id, coalesce(nullif(trim(t.gorev), ''), 'Owner'), true)
  on conflict (company_id, user_id) do update set is_owner = true;

  update public.profiles set role = 'company' where id = t.user_id;

  update public.sirket_talepleri
     set durum = 'onaylandi', sirket_id = yeni_id, karar_gerekcesi = 'YONETICI_ONAYI'
   where id = talep_id;

  return yeni_id;
end;
$$;

-- 2) Sahiplenme onayı -------------------------------------------------------

create or replace function public.approve_company_claim(claim_id uuid)
returns void language plpgsql security definer set search_path to 'public'
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
     set status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         karar_gerekcesi = 'YONETICI_ONAYI'
   where id = claim_id;

  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  values (talep.company_id, talep.user_id, 'Owner', true)
  on conflict (company_id, user_id)
  do update set recruiter_role = 'Owner', is_owner = true;

  update public.companies
     set claimed_at = coalesce(claimed_at, now()),
         claimed_by = coalesce(claimed_by, talep.user_id),
         verified = true,
         dogrulama_notu = null,
         dogrulama_reddi_at = null
   where id = talep.company_id;

  update public.profiles set role = 'company' where id = talep.user_id;
end;
$$;

revoke all on function public.approve_sirket_talebi(uuid) from public, anon;
revoke all on function public.approve_company_claim(uuid) from public, anon;
grant execute on function public.approve_sirket_talebi(uuid) to authenticated;
grant execute on function public.approve_company_claim(uuid) to authenticated;

-- 3) Geriye dönük -----------------------------------------------------------

update public.companies
   set verified = true, dogrulama_notu = null, dogrulama_reddi_at = null
 where verified = false
   and id in (select sirket_id from public.sirket_talepleri where durum = 'onaylandi' and sirket_id is not null);
