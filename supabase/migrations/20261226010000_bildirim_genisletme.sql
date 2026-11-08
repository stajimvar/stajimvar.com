/*
  BİLDİRİMLERİN GENİŞLETİLMESİ — İLK BEŞ (9 Kasım 2026, kullanıcı isteği "ilk 5'i yap")

  Envanterde eksik çıkan ve kullanıcının seçtiği beş bildirim:

    1. YÖNETİCİYE: yeni şirket talebi, yeni sahiplenme talebi, incelemeye
       düşen ilan (ilan ya da değişiklik). Ölçülen: Modmere talebi ve
       incelemedeki ilanı yönetici ekrana bakana kadar fark edilmedi.
    2. ŞİRKETE: ilan yayına alınmadı / yayından kaldırıldı / değişiklik
       uygulanmadı — yöneticinin yazdığı gerekçeyle.
    3. TALEP SAHİBİNE: sahiplenme talebi onaylandı ya da reddedildi; yeni
       şirket talebi reddedildi (onayı 20261224010000).
    4. ÖĞRENCİYE: kaydettiği ilanın son başvurusuna 3 gün ve 1 gün kala.
    5. ÖĞRENCİYE: bölümüne uygun yeni ilan — günde en çok BİR toplu bildirim.

  1–3 olay anında, tetikleyiciyle (karar işlevlerine dokunulmadan; kararlar
  zaten ilan_kontrolleri'ne ve talep tablolarına yazılıyor). 4–5 günlük iş:
  `ogrenci_ilan_bildirimleri()` yalnız service_role'e açık, GitHub Actions
  günde bir çağırıyor (.github/workflows/ogrenci-ilan-bildirimleri.yml).

  "BÖLÜMÜNE UYGUN" KURALI sitenin kendi kuralı: öğrencinin bölümü
  (departments.ad ya da onaylı takma ad) → department_sectors → ilanın
  BİRİNCİL alanı (alan_idleri[1], başlıktan türetilen). İkinci alan şirket
  sektöründen geldiği için kullanılmıyor (lib/bolum-ilanlari.mjs ile aynı
  gerekçe). Bölümü eşleşmeyen öğrenciye öneri UYDURULMUYOR.

  Her bildirim dedupe_key ile bir kez; bildirim yazılamazsa asıl işlem
  (karar, talep) DURMUYOR.

  GERİ ALMA
    drop trigger if exists yonetici_talep_bildirimi on public.sirket_talepleri;
    drop trigger if exists sirket_talebi_ret_bildirimi on public.sirket_talepleri;
    drop trigger if exists yonetici_sahiplenme_bildirimi on public.company_claims;
    drop trigger if exists sahiplenme_karar_bildirimi on public.company_claims;
    drop trigger if exists ilan_kontrol_bildirimi on public.ilan_kontrolleri;
    drop function if exists public.ogrenci_ilan_bildirimleri();
    drop function if exists public.ilan_kontrol_bildir();
    drop function if exists public.sahiplenme_karar_bildir();
    drop function if exists public.sirket_talebi_ret_bildir();
    drop function if exists public.yonetici_sahiplenme_bildir();
    drop function if exists public.yonetici_talep_bildir();
    drop function if exists public.sirket_uyelerine_bildir(uuid, text, text, text, text, text);
    drop function if exists public.yoneticilere_bildir(text, text, text, text, text);
    drop function if exists public.ilan_bildirim_yolu(uuid, text);
*/

-- 0) Yardımcılar ----------------------------------------------------------

/* Uygulamanın ilan adresi: başlık + kimliğin ilk 8 hanesi. Uygulama ve
   kenar yönlendirmesi ilanı önekten buluyor (lib/slug idPrefixFromSlug). */
create or replace function public.ilan_bildirim_yolu(p_id uuid, p_baslik text)
returns text language sql immutable set search_path to 'public'
as $$
  select '/ilan/'
    || coalesce(nullif(trim(both '-' from regexp_replace(
         lower(translate(coalesce(p_baslik, ''), 'ıİIşŞğĞüÜöÖçÇâîû', 'iiissgguuooccaiu')),
         '[^a-z0-9]+', '-', 'g')), ''), 'ilan')
    || '-' || left(p_id::text, 8);
$$;

create or replace function public.yoneticilere_bildir(
  p_tur text, p_baslik text, p_govde text, p_hedef text, p_anahtar text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
  select p.id, p_tur, p_baslik, p_govde, p_hedef, p_anahtar || ':' || p.id::text
    from public.profiles p
   where p.role = 'admin'
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
exception when others then
  raise warning 'yoneticilere_bildir(%): %', p_tur, sqlerrm;
end;
$$;

create or replace function public.sirket_uyelerine_bildir(
  p_sirket uuid, p_tur text, p_baslik text, p_govde text, p_hedef text, p_anahtar text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if p_sirket is null then return; end if;
  insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
  select m.user_id, p_tur, p_baslik, p_govde, p_hedef, p_anahtar || ':' || m.user_id::text
    from public.company_members m
   where m.company_id = p_sirket
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
exception when others then
  raise warning 'sirket_uyelerine_bildir(%): %', p_tur, sqlerrm;
end;
$$;

-- 1) Yöneticiye: yeni talepler ----------------------------------------------

create or replace function public.yonetici_talep_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.yoneticilere_bildir(
    'yonetici_sirket_talebi',
    'Yeni şirket talebi',
    coalesce(nullif(trim(new.sirket_adi), ''), 'Bir şirket') || ' eklenmek için onay bekliyor.',
    '/yonetim/onay',
    'yonetici-sirket-talebi:' || new.id::text);
  return new;
end;
$$;

drop trigger if exists yonetici_talep_bildirimi on public.sirket_talepleri;
create trigger yonetici_talep_bildirimi
  after insert on public.sirket_talepleri
  for each row execute function public.yonetici_talep_bildir();

create or replace function public.yonetici_sahiplenme_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  ad text;
begin
  select c.name into ad from public.companies c where c.id = new.company_id;
  perform public.yoneticilere_bildir(
    'yonetici_sahiplenme',
    'Yeni sahiplenme talebi',
    coalesce(nullif(trim(ad), ''), 'Bir şirket') || ' için sahiplenme talebi onay bekliyor.',
    '/yonetim/onay',
    'yonetici-sahiplenme:' || new.id::text);
  return new;
end;
$$;

drop trigger if exists yonetici_sahiplenme_bildirimi on public.company_claims;
create trigger yonetici_sahiplenme_bildirimi
  after insert on public.company_claims
  for each row
  when (new.status = 'pending')
  execute function public.yonetici_sahiplenme_bildir();

-- 1b + 2) İlan kontrol kayıtları: incelemeye düştü / yönetici reddetti ------

create or replace function public.ilan_kontrol_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  l record;
  gerekce text;
  baslik text;
begin
  select li.id, li.title, li.company_id, li.origin::text as origin, c.name as sirket
    into l
    from public.listings li
    left join public.companies c on c.id = li.company_id
   where li.id = new.listing_id;
  if not found then return new; end if;

  if new.karar = 'inceleme' then
    perform public.yoneticilere_bildir(
      'yonetici_ilan_inceleme',
      case when new.kapsam = 'degisiklik' then 'İlan değişikliği incelemede' else 'İlan incelemede' end,
      coalesce(nullif(trim(l.title), ''), 'İlan') || ' · ' || coalesce(nullif(trim(l.sirket), ''), 'şirket')
        || ' onay kuyruğunda bekliyor.',
      '/yonetim/onay',
      'yonetici-inceleme:' || new.id::text);
    return new;
  end if;

  if new.kaynak = 'yonetici' and new.karar in ('yonetici_ret', 'yonetici_kaldirdi', 'degisiklik_ret')
     and l.origin = 'employer_posted' then
    gerekce := nullif(trim(new.gerekceler -> 0 ->> 'mesaj'), '');
    baslik := case new.karar
      when 'yonetici_ret' then 'İlanın yayına alınmadı'
      when 'yonetici_kaldirdi' then 'İlanın yayından kaldırıldı'
      else 'İlan değişikliğin uygulanmadı' end;
    perform public.sirket_uyelerine_bildir(
      l.company_id,
      'ilan_' || new.karar,
      baslik,
      coalesce(nullif(trim(l.title), ''), 'İlan') || coalesce(' — Gerekçe: ' || gerekce, '. Ayrıntı ilan sayfanda.'),
      '/sirket/ilanlar',
      'ilan-karar:' || new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists ilan_kontrol_bildirimi on public.ilan_kontrolleri;
create trigger ilan_kontrol_bildirimi
  after insert on public.ilan_kontrolleri
  for each row
  when (new.karar in ('inceleme', 'yonetici_ret', 'yonetici_kaldirdi', 'degisiklik_ret'))
  execute function public.ilan_kontrol_bildir();

-- 3) Talep sahibine: sahiplenme kararı, yeni şirket talebi reddi -------------

create or replace function public.sahiplenme_karar_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  ad text;
  gerekce text;
  onay boolean := new.status = 'approved';
begin
  if new.user_id is null then return new; end if;
  select c.name into ad from public.companies c where c.id = new.company_id;
  ad := coalesce(nullif(trim(ad), ''), 'Şirket');
  gerekce := nullif(trim(coalesce(new.reject_reason, '')), '');
  begin
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    values (
      new.user_id,
      case when onay then 'sahiplenme_onaylandi' else 'sahiplenme_reddedildi' end,
      case when onay then 'Sahiplenme talebin onaylandı' else 'Sahiplenme talebin reddedildi' end,
      case when onay
           then ad || ' artık senin yönetiminde. İlan girebilirsin.'
           else ad || ' için talebin onaylanmadı.' || coalesce(' Gerekçe: ' || gerekce, '') end,
      case when onay then '/sirket/ilanlar' else '/isveren/baslangic' end,
      'sahiplenme-karar:' || new.id::text)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  exception when others then
    raise warning 'sahiplenme_karar_bildir: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists sahiplenme_karar_bildirimi on public.company_claims;
create trigger sahiplenme_karar_bildirimi
  after update of status on public.company_claims
  for each row
  when (old.status is distinct from new.status and new.status in ('approved', 'rejected'))
  execute function public.sahiplenme_karar_bildir();

create or replace function public.sirket_talebi_ret_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  gerekce text;
begin
  if new.user_id is null then return new; end if;
  gerekce := nullif(trim(coalesce(new.karar_gerekcesi, '')), '');
  if gerekce in ('YONETICI_REDDI', 'Belirtilmedi') then gerekce := null; end if;
  begin
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    values (
      new.user_id, 'sirket_reddedildi', 'Şirket talebin reddedildi',
      coalesce(nullif(trim(new.sirket_adi), ''), 'Şirket') || ' için talebin onaylanmadı.'
        || coalesce(' Gerekçe: ' || gerekce, '') || ' Bilgileri düzeltip yeniden gönderebilirsin.',
      '/isveren/baslangic',
      'sirket-reddedildi:' || new.id::text)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  exception when others then
    raise warning 'sirket_talebi_ret_bildir: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists sirket_talebi_ret_bildirimi on public.sirket_talepleri;
create trigger sirket_talebi_ret_bildirimi
  after update of durum on public.sirket_talepleri
  for each row
  when (old.durum is distinct from 'reddedildi' and new.durum = 'reddedildi')
  execute function public.sirket_talebi_ret_bildir();

-- 4 + 5) Öğrenci: son başvuru yaklaşıyor, bölümüne uygun yeni ilan ----------

create or replace function public.ogrenci_ilan_bildirimleri()
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  bugun date := (now() at time zone 'Europe/Istanbul')::date;
  son_basvuru int := 0;
  uygun int := 0;
begin
  /* 4) Kaydedilen ilan: son başvuruya 3 gün ve 1 gün kala. Başvurduysa yok. */
  with aday as (
    select s.user_id, l.id, l.title, l.application_deadline - bugun as kalan
      from public.saved_listings s
      join public.listings l on l.id = s.listing_id
     where l.status = 'published'
       and l.application_deadline - bugun in (1, 3)
       and not exists (
         select 1 from public.applications a
          where a.listing_id = l.id and a.student_id = s.user_id)
  ), yazilan as (
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    select user_id, 'son_basvuru_yaklasiyor',
           case when kalan = 1 then 'Son başvuru yarın' else 'Son başvuruya 3 gün kaldı' end,
           coalesce(nullif(trim(title), ''), 'Kaydettiğin ilan') || ' için başvuru '
             || case when kalan = 1 then 'yarın' else '3 gün sonra' end || ' kapanıyor.',
           public.ilan_bildirim_yolu(id, title),
           'son-basvuru:' || id::text || ':' || user_id::text || ':' || kalan::text
      from aday
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into son_basvuru from yazilan;

  /* 5) Bölümüne uygun yeni ilan: son 24 saatte yayına giren, birincil alanı
        öğrencinin bölümünün alanlarından biri. Günde öğrenci başına tek. */
  with ogrenci_bolum as (
    select sp.id as ogrenci, d.id as bolum
      from public.student_profiles sp
      join public.departments d
        on lower(d.ad) = lower(trim(sp.department))
        or exists (select 1 from public.department_aliases da
                    where da.department_id = d.id and lower(da.takma_ad) = lower(trim(sp.department)))
     where coalesce(trim(sp.department), '') <> ''
  ), yeni as (
    select l.id, l.title, l.alan_idleri[1] as alan
      from public.listings l
     where l.status = 'published'
       and greatest(l.posted_at, l.created_at) > now() - interval '24 hours'
       and cardinality(l.alan_idleri) > 0
  ), eslesen as (
    select distinct ob.ogrenci, y.id, y.title
      from ogrenci_bolum ob
      join public.department_sectors ds on ds.department_id = ob.bolum
      join yeni y on y.alan = ds.sector_id
     where not exists (select 1 from public.applications a where a.listing_id = y.id and a.student_id = ob.ogrenci)
  ), ozet as (
    select ogrenci, count(*) as adet,
           (array_agg(title order by title))[1] as ilk_baslik,
           (array_agg(id order by title))[1] as ilk_id
      from eslesen
     group by ogrenci
  ), yazilan as (
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    select ogrenci, 'uygun_yeni_ilan',
           case when adet = 1 then 'Bölümüne uygun yeni ilan' else 'Bölümüne uygun ' || adet || ' yeni ilan' end,
           case when adet = 1 then coalesce(nullif(trim(ilk_baslik), ''), 'Yeni bir ilan') || ' yayında.'
                else coalesce(nullif(trim(ilk_baslik), ''), 'Yeni ilanlar') || ' ve ' || (adet - 1) || ' ilan daha yayında.' end,
           case when adet = 1 then public.ilan_bildirim_yolu(ilk_id, ilk_baslik) else '/staj-ilanlari' end,
           'uygun-ilan:' || ogrenci::text || ':' || bugun::text
      from ozet
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into uygun from yazilan;

  insert into public.zamanlanmis_is_kayitlari (is_adi, islenen, ayrinti)
  values ('ogrenci_ilan_bildirimleri', son_basvuru + uygun,
          jsonb_build_object('son_basvuru', son_basvuru, 'uygun_yeni_ilan', uygun));

  return jsonb_build_object('son_basvuru', son_basvuru, 'uygun_yeni_ilan', uygun);
end;
$$;

-- Yetkiler ---------------------------------------------------------------------

revoke all on function public.yoneticilere_bildir(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.sirket_uyelerine_bildir(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.yonetici_talep_bildir() from public, anon, authenticated;
revoke all on function public.yonetici_sahiplenme_bildir() from public, anon, authenticated;
revoke all on function public.ilan_kontrol_bildir() from public, anon, authenticated;
revoke all on function public.sahiplenme_karar_bildir() from public, anon, authenticated;
revoke all on function public.sirket_talebi_ret_bildir() from public, anon, authenticated;
revoke all on function public.ogrenci_ilan_bildirimleri() from public, anon, authenticated;
grant execute on function public.ogrenci_ilan_bildirimleri() to service_role;
