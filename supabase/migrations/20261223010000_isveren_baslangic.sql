/*
  İŞVEREN BAŞLANGICI — ŞİRKET PROFİLİ TALEPTE, ONAY YOLU UÇTAN UCA (7 Kasım 2026)

  Kullanıcı kararı: "İşverenim" diye kaydolan kişiye, e-posta doğrulamasından
  sonra şirket profilini dolduracağı bir sayfa çıkıyor (/isveren/baslangic).
  Alanlar: şirket adı + web sitesi (zorunlu), sektör, çalışan sayısı, şehir,
  VKN, kısa tanıtım, logo, görev/unvan, telefon.

  ÖLÇÜLEN EKSİKLER
    · sirket_talepleri (listede olmayan şirket) bu alanların hiçbirini
      taşımıyordu; kişi kendi talebini GÖREMİYORDU ("onay bekleniyor" ekranı
      kurulamıyordu) ve ekleme koşulu `true` olduğu için başkası adına
      (`user_id`) talep bırakılabiliyordu.
    · Yeni şirket talebini ONAYLAYAN bir işlev yoktu: talep tabloya düşüyor,
      hiçbir zaman şirkete dönüşmüyordu. Yönetici ekranı yalnız
      company_claims'i (var olan şirketi sahiplenme) onaylayabiliyordu.
    · company_claims VKN taşımıyordu.

  BU GÖÇ
    1. sirket_talepleri: sektor, calisan_sayisi, sehir, vkn, tanitim, logo_url.
       company_claims: vkn. VKN biçimi şirket tablosuyla aynı kuraldan
       (vkn_gecerli).
    2. sirket_talepleri politikaları: kişi kendi talebini görüyor; giriş
       yapmış kişi yalnız kendi adına (`user_id = auth.uid()`), anonim ise
       kullanıcısız talep bırakabiliyor; durum her zaman 'yeni' başlıyor.
    3. approve_sirket_talebi / reject_sirket_talebi: yalnız yönetici. Onay
       şirketi açıyor (origin 'manual', verified false — doğrulama ayrı ve
       VKN/alan adı kuralıyla), kişiyi sahip yapıyor ve profiles.role'ü
       'company' yapıyor (approve_company_claim ile aynı sonuç). Aynı adlı
       şirket varsa onay DURUYOR: o durumda doğru yol var olan şirketi
       sahiplenme talebi.
    4. Yönetici kuyruğu görünümü yeni talebin VKN'sini de gösteriyor.

  Başka hiçbir tabloya ve satıra dokunulmuyor.

  GERİ ALMA
    drop function if exists public.approve_sirket_talebi(uuid);
    drop function if exists public.reject_sirket_talebi(uuid, text);
    drop policy if exists "kendi sirket talebini gorur" on public.sirket_talepleri;
    -- ekleme politikası eski haline: with check (true)
    alter table public.sirket_talepleri drop column if exists sektor, drop column if exists calisan_sayisi,
      drop column if exists sehir, drop column if exists vkn, drop column if exists tanitim,
      drop column if exists logo_url, drop column if exists karar_gerekcesi, drop column if exists sirket_id;
    alter table public.company_claims drop column if exists vkn;
*/

-- 1) Sütunlar -----------------------------------------------------------

alter table public.sirket_talepleri
  add column if not exists sektor text,
  add column if not exists calisan_sayisi text,
  add column if not exists sehir text,
  add column if not exists vkn text,
  add column if not exists tanitim text,
  add column if not exists logo_url text,
  add column if not exists karar_gerekcesi text,
  add column if not exists sirket_id uuid references public.companies(id);

alter table public.company_claims
  add column if not exists vkn text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sirket_talepleri_vkn_check') then
    alter table public.sirket_talepleri
      add constraint sirket_talepleri_vkn_check check (vkn is null or public.vkn_gecerli(vkn));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'company_claims_vkn_check') then
    alter table public.company_claims
      add constraint company_claims_vkn_check check (vkn is null or public.vkn_gecerli(vkn));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sirket_talepleri_tanitim_uzunluk') then
    alter table public.sirket_talepleri
      add constraint sirket_talepleri_tanitim_uzunluk check (tanitim is null or char_length(tanitim) <= 1200);
  end if;
end $$;

/*
  Ekleme yetkisi bu tabloda SÜTUN BAZLI (20260826020000). Yeni profil
  alanları eklenebilir; sirket_id, karar_gerekcesi ve durum eklenemez
  (onay yalnız işlevden, durum varsayılan 'yeni').
*/
grant insert (sektor, calisan_sayisi, sehir, vkn, tanitim, logo_url)
  on public.sirket_talepleri to anon, authenticated;

-- 2) Politikalar ---------------------------------------------------------

drop policy if exists "herkes sirket talebi birakabilir" on public.sirket_talepleri;
create policy "herkes sirket talebi birakabilir"
  on public.sirket_talepleri for insert to anon, authenticated
  with check (
    durum = 'yeni'
    and sirket_id is null
    and karar_gerekcesi is null
    and (
      (auth.uid() is null and user_id is null)
      or user_id = auth.uid()
    )
  );

drop policy if exists "kendi sirket talebini gorur" on public.sirket_talepleri;
create policy "kendi sirket talebini gorur"
  on public.sirket_talepleri for select to authenticated
  using (user_id = auth.uid());

-- 3) Onay ve ret ---------------------------------------------------------

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
    'manual', false, t.user_id, now(), t.user_id
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

create or replace function public.reject_sirket_talebi(talep_id uuid, reason text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'yalnizca yonetici reddedebilir';
  end if;
  update public.sirket_talepleri
     set durum = 'reddedildi', karar_gerekcesi = coalesce(nullif(trim(reason), ''), 'YONETICI_REDDI')
   where id = talep_id and durum in ('yeni', 'inceleniyor');
  if not found then
    raise exception 'talep bulunamadi ya da zaten sonuclanmis';
  end if;
end;
$$;

revoke all on function public.approve_sirket_talebi(uuid) from public, anon;
revoke all on function public.reject_sirket_talebi(uuid, text) from public, anon;
grant execute on function public.approve_sirket_talebi(uuid) to authenticated;
grant execute on function public.reject_sirket_talebi(uuid, text) to authenticated;

-- 4) Yönetici kuyruğu ------------------------------------------------------

create or replace view public.yonetici_talep_kuyrugu as
  select
    'sahiplenme'::text as tur, c.id, co.name as sirket_adi, co.website_url as web_sitesi,
    c.contact_name as yetkili_adi, c.work_email as eposta, c.contact_title as gorev,
    c.phone as telefon, c.status as durum, c.created_at, c.company_id, coalesce(c.vkn, co.vkn) as vkn,
    public.serbest_eposta_mi(c.work_email) as serbest_eposta,
    public.alan_adi_eslesiyor(co.website_url, c.work_email) as alan_adi_eslesiyor
  from public.company_claims c
  join public.companies co on co.id = c.company_id
  union all
  select
    'yeni-sirket'::text, t.id, t.sirket_adi, t.web_sitesi, t.yetkili_adi,
    t.kurumsal_eposta, t.gorev, t.telefon, t.durum, t.created_at, t.sirket_id, t.vkn,
    public.serbest_eposta_mi(t.kurumsal_eposta),
    public.alan_adi_eslesiyor(t.web_sitesi, t.kurumsal_eposta)
  from public.sirket_talepleri t;

alter view public.yonetici_talep_kuyrugu set (security_invoker = on);
grant select on public.yonetici_talep_kuyrugu to authenticated;
