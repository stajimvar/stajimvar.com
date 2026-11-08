/*
  KALAN BİLDİRİMLER (9 Kasım 2026, kullanıcı isteği "kalan bildirimleri de yap")

  Bildirim envanterinin ilk beşinden (20261226010000) sonra kalanlar:

  OLAY ANINDA (tetikleyici)
    a. Öğrenciye: kaydettiği ilan kapandı (yayından çıktı: kapandı, arşivlendi
       ya da yönetici kaldırdı). Başvurduysa yok.
    b. Şirkete: ilan sistem tarafından kapandı (son başvuru geçti, kaynak
       kapandı ya da yönetici kapattı). Şirketin kendi kapatması bildirim
       üretmiyor — kendi eylemi.
    c. Şirkete: şirket doğrulandı (VKN ile, sirket_dogrula) ya da
       doğrulama reddedildi (sirket_dogrulamayi_reddet), gerekçesiyle.
    d. Yöneticiye: bir ilan bildirildi (listing_reports; sahte ilan, ücret
       talebi vb.).

  GÜNLÜK İŞ (`gunluk_bildirimler()`, 09:00 İstanbul; ogrenci_ilan_bildirimleri
  de bunun içinden çağrılıyor)
    e. Öğrenciye: kaydettiği fırsatın/bursun son başvurusuna 3 ve 1 gün kala.
    f. Öğrenciye: başvurusu 7 gündür şirketin incelemesini bekliyor (bir kez).
    g. Öğrenciye: profilini tamamla — bölüm ya da CV eksikse, ayda en çok bir.
    h. Öğrenciye: haftalık özet (pazartesi) — geçen hafta bölümüne uygun
       yeni ilan sayısı ve bu hafta son başvurusu dolan kaydedilen ilanlar.
       İkisi de sıfırsa bildirim yok.
    i. Şirkete: yayındaki ilanının son başvurusuna 3 gün kala.

  YAPILMAYANLAR (bilerek)
    · "Sana uygun burs açıldı": burs uygunluğu yalnız *_verified_at
      damgasıyla belirlenebiliyor ve yayındaki fırsatların hiçbirinde bölüm
      doğrulama damgası yok (ölçüldü: 0/79). Uydurma eşleşme gönderilmiyor.
    · "Ekibe davet edildin": sitede ekip daveti özelliği yok.
    · Şirkete günlük başvuru özeti: her başvuru zaten anında "Yeni başvuru"
      bildirimi üretiyor; özet aynı bilgiyi ikinci kez gönderirdi.

  Her bildirim dedupe_key ile bir kez; bildirim hatası asıl işlemi durdurmuyor.

  GERİ ALMA
    drop trigger if exists ilan_kapandi_bildirimi on public.listings;
    drop trigger if exists sirket_dogrulama_bildirimi on public.companies;
    drop trigger if exists ilan_sikayet_bildirimi on public.listing_reports;
    drop function if exists public.gunluk_bildirimler();
    drop function if exists public.ilan_kapandi_bildir();
    drop function if exists public.sirket_dogrulama_bildir();
    drop function if exists public.ilan_sikayet_bildir();
*/

-- a + b) İlan kapandı ---------------------------------------------------------

create or replace function public.ilan_kapandi_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  baslik text := coalesce(nullif(trim(new.title), ''), 'İlan');
  sistem boolean := auth.uid() is null or public.is_admin();
begin
  begin
    /* Kaydeden ve başvurmamış öğrenciler. */
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    select s.user_id, 'kayitli_ilan_kapandi', 'Kaydettiğin ilan kapandı',
           baslik || ' artık başvuru almıyor. Benzer ilanlara göz atabilirsin.',
           '/staj-ilanlari',
           'kayitli-ilan-kapandi:' || new.id::text || ':' || s.user_id::text
      from public.saved_listings s
     where s.listing_id = new.id
       and not exists (select 1 from public.applications a
                        where a.listing_id = new.id and a.student_id = s.user_id)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;

    /* Şirket ilanı sistem ya da yönetici tarafından kapandıysa şirkete. */
    if sistem and new.origin = 'employer_posted' and new.status in ('closed', 'archived') then
      perform public.sirket_uyelerine_bildir(
        new.company_id, 'ilan_kapandi', 'İlanın kapandı',
        baslik || ' yayından çıktı'
          || case when new.application_deadline is not null and new.application_deadline < (now() at time zone 'Europe/Istanbul')::date
                  then ' (son başvuru tarihi geçti).' else '.' end
          || ' İstersen ilanlarından yeniden yayınlayabilirsin.',
        '/sirket/ilanlar',
        'ilan-kapandi:' || new.id::text || ':' || extract(epoch from now())::bigint::text);
    end if;
  exception when others then
    raise warning 'ilan_kapandi_bildir: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists ilan_kapandi_bildirimi on public.listings;
create trigger ilan_kapandi_bildirimi
  after update of status on public.listings
  for each row
  when (old.status = 'published' and new.status <> 'published')
  execute function public.ilan_kapandi_bildir();

-- c) Şirket doğrulandı / doğrulama reddedildi ------------------------------------

create or replace function public.sirket_dogrulama_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.vkn_dogrulandi_at is not null and old.vkn_dogrulandi_at is distinct from new.vkn_dogrulandi_at then
    perform public.sirket_uyelerine_bildir(
      new.id, 'sirket_dogrulandi', 'Şirketin doğrulandı',
      coalesce(nullif(trim(new.name), ''), 'Şirketin') || ' doğrulandı. İlanların otomatik kontrolden geçince doğrudan yayına çıkar, aday bilgileri açılır.',
      '/sirket/ilanlar',
      'sirket-dogrulandi:' || new.id::text || ':' || extract(epoch from new.vkn_dogrulandi_at)::bigint::text);
  elsif new.dogrulama_reddi_at is not null and old.dogrulama_reddi_at is distinct from new.dogrulama_reddi_at then
    perform public.sirket_uyelerine_bildir(
      new.id, 'sirket_dogrulama_reddedildi', 'Şirket doğrulaman reddedildi',
      coalesce(nullif(trim(new.name), ''), 'Şirketin') || ' doğrulanamadı.'
        || coalesce(' Gerekçe: ' || nullif(trim(new.dogrulama_notu), ''), '')
        || ' Bilgileri düzeltip yeniden gönderebilirsin.',
      '/sirket/profil',
      'sirket-dogrulama-reddi:' || new.id::text || ':' || extract(epoch from new.dogrulama_reddi_at)::bigint::text);
  end if;
  return new;
end;
$$;

drop trigger if exists sirket_dogrulama_bildirimi on public.companies;
create trigger sirket_dogrulama_bildirimi
  after update of vkn_dogrulandi_at, dogrulama_reddi_at on public.companies
  for each row
  execute function public.sirket_dogrulama_bildir();

-- d) Yöneticiye: ilan bildirildi ---------------------------------------------------

create or replace function public.ilan_sikayet_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if coalesce(new.test_mi, false) then return new; end if;
  perform public.yoneticilere_bildir(
    'yonetici_ilan_bildirildi', 'Bir ilan bildirildi',
    coalesce(nullif(trim(new.position_title), ''), 'İlan')
      || coalesce(' · ' || nullif(trim(new.company_name), ''), '')
      || coalesce(' — ' || nullif(trim(new.reason), ''), ''),
    '/yonetim/talepler',
    'yonetici-ilan-bildirildi:' || new.id::text);
  return new;
end;
$$;

drop trigger if exists ilan_sikayet_bildirimi on public.listing_reports;
create trigger ilan_sikayet_bildirimi
  after insert on public.listing_reports
  for each row
  execute function public.ilan_sikayet_bildir();

-- e–i) Günlük iş -----------------------------------------------------------------

create or replace function public.gunluk_bildirimler()
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  bugun date := (now() at time zone 'Europe/Istanbul')::date;
  ogrenci jsonb;
  firsat int := 0;
  bekleyen int := 0;
  profil int := 0;
  haftalik int := 0;
  sirket_son int := 0;
begin
  ogrenci := public.ogrenci_ilan_bildirimleri();

  /* e) Kaydedilen fırsatın son başvurusu: 3 ve 1 gün kala. */
  with aday as (
    select s.user_id, o.slug, o.title, o.id, o.application_deadline::date - bugun as kalan
      from public.saved_opportunities s
      join public.opportunities o on o.id = s.opportunity_id
     where o.status::text = 'published'
       and o.application_deadline is not null
       and o.application_deadline::date - bugun in (1, 3)
  ), y as (
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    select user_id, 'firsat_son_basvuru',
           case when kalan = 1 then 'Son başvuru yarın' else 'Son başvuruya 3 gün kaldı' end,
           coalesce(nullif(trim(title), ''), 'Kaydettiğin fırsat') || ' için başvuru '
             || case when kalan = 1 then 'yarın' else '3 gün sonra' end || ' kapanıyor.',
           '/firsatlar/' || slug,
           'firsat-son-basvuru:' || id::text || ':' || user_id::text || ':' || kalan::text
      from aday
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into firsat from y;

  /* f) Başvuru 7 gündür ilk aşamada (site içi şirket ilanı). Bir kez. */
  with aday as (
    select a.id, a.student_id, l.title, c.name as sirket
      from public.applications a
      join public.listings l on l.id = a.listing_id
      left join public.companies c on c.id = l.company_id
     where a.status = 'submitted'
       and l.origin = 'employer_posted'
       and coalesce(a.submitted_at, a.applied_at) <= now() - interval '7 days'
       and coalesce(a.submitted_at, a.applied_at) > now() - interval '14 days'
  ), y as (
    insert into public.notifications (recipient_id, type, title, body, target_url, application_id, dedupe_key)
    select student_id, 'basvuru_yanit_bekliyor', 'Başvurun hâlâ değerlendirmede',
           coalesce(nullif(trim(sirket), ''), 'Şirket') || ' · ' || coalesce(nullif(trim(title), ''), 'ilan')
             || ' başvurun bir haftadır yanıt bekliyor. Bu arada başka ilanlara da başvurabilirsin.',
           '/profil?basvuru=' || id::text, id,
           'basvuru-yanit-bekliyor:' || id::text
      from aday
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into bekleyen from y;

  /* g) Profilini tamamla: bölüm ya da CV eksik; hesap 3 günden eski; ayda bir. */
  with aday as (
    select sp.id,
           coalesce(trim(sp.department), '') = '' as bolum_yok,
           sp.cv_path is null as cv_yok
      from public.student_profiles sp
      join public.profiles p on p.id = sp.id
     where p.role = 'student'
       and p.created_at < now() - interval '3 days'
       and (coalesce(trim(sp.department), '') = '' or sp.cv_path is null)
  ), y as (
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    select id, 'profil_tamamla', 'Profilini tamamla',
           case when bolum_yok and cv_yok then 'Bölümünü ve CV''ni eklersen sana uygun ilanları gösterebilir, tek tıkla başvurabilirsin.'
                when bolum_yok then 'Bölümünü eklersen sana uygun ilanları ve bursları gösterebiliriz.'
                else 'CV''ni eklersen ilanlara tek tıkla başvurabilirsin.' end,
           '/cv',
           'profil-tamamla:' || id::text || ':' || to_char(bugun, 'YYYY-MM')
      from aday
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into profil from y;

  /* h) Haftalık özet: yalnız pazartesi; iki sayı da sıfırsa yok. */
  if extract(isodow from bugun) = 1 then
    with ogrenci_bolum as (
      select sp.id as ogrenci, d.id as bolum
        from public.student_profiles sp
        join public.departments d
          on lower(d.ad) = lower(trim(sp.department))
          or exists (select 1 from public.department_aliases da
                      where da.department_id = d.id and lower(da.takma_ad) = lower(trim(sp.department)))
       where coalesce(trim(sp.department), '') <> ''
    ), uygun as (
      select ob.ogrenci, count(distinct l.id) as adet
        from ogrenci_bolum ob
        join public.department_sectors ds on ds.department_id = ob.bolum
        join public.listings l on l.alan_idleri[1] = ds.sector_id
       where l.status = 'published'
         and greatest(l.posted_at, l.created_at) > now() - interval '7 days'
       group by ob.ogrenci
    ), dolan as (
      select s.user_id as ogrenci, count(*) as adet
        from public.saved_listings s
        join public.listings l on l.id = s.listing_id
       where l.status = 'published'
         and l.application_deadline between bugun and bugun + 6
       group by s.user_id
    ), ozet as (
      select coalesce(u.ogrenci, d.ogrenci) as ogrenci,
             coalesce(u.adet, 0) as uygun, coalesce(d.adet, 0) as dolan
        from uygun u full join dolan d on d.ogrenci = u.ogrenci
    ), y as (
      insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
      select ogrenci, 'haftalik_ozet', 'Haftalık özetin',
             concat_ws(' ',
               case when uygun > 0 then 'Geçen hafta bölümüne uygun ' || uygun || ' yeni ilan yayına girdi.' end,
               case when dolan > 0 then 'Kaydettiğin ' || dolan || ' ilanın son başvurusu bu hafta.' end),
             '/staj-ilanlari',
             'haftalik-ozet:' || ogrenci::text || ':' || to_char(bugun, 'IYYY-IW')
        from ozet
       where uygun > 0 or dolan > 0
      on conflict (dedupe_key) where dedupe_key is not null do nothing
      returning 1
    )
    select count(*) into haftalik from y;
  end if;

  /* i) Şirket: yayındaki ilanının son başvurusuna 3 gün kala. */
  with aday as (
    select l.id, l.title, l.company_id
      from public.listings l
     where l.status = 'published'
       and l.origin = 'employer_posted'
       and l.application_deadline - bugun = 3
  ), y as (
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    select m.user_id, 'ilan_suresi_doluyor', 'İlanının süresi doluyor',
           coalesce(nullif(trim(a.title), ''), 'İlan') || ' için son başvuru 3 gün sonra. Uzatmak istersen ilanı düzenleyebilirsin.',
           '/sirket/ilanlar',
           'ilan-suresi-doluyor:' || a.id::text || ':' || m.user_id::text
      from aday a
      join public.company_members m on m.company_id = a.company_id
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into sirket_son from y;

  insert into public.zamanlanmis_is_kayitlari (is_adi, islenen, ayrinti)
  values ('gunluk_bildirimler', firsat + bekleyen + profil + haftalik + sirket_son,
          jsonb_build_object('firsat_son_basvuru', firsat, 'basvuru_yanit_bekliyor', bekleyen,
                             'profil_tamamla', profil, 'haftalik_ozet', haftalik,
                             'ilan_suresi_doluyor', sirket_son));

  return ogrenci || jsonb_build_object(
    'firsat_son_basvuru', firsat, 'basvuru_yanit_bekliyor', bekleyen,
    'profil_tamamla', profil, 'haftalik_ozet', haftalik, 'ilan_suresi_doluyor', sirket_son);
end;
$$;

-- Yetkiler -------------------------------------------------------------------------

revoke all on function public.ilan_kapandi_bildir() from public, anon, authenticated;
revoke all on function public.sirket_dogrulama_bildir() from public, anon, authenticated;
revoke all on function public.ilan_sikayet_bildir() from public, anon, authenticated;
revoke all on function public.gunluk_bildirimler() from public, anon, authenticated;
grant execute on function public.gunluk_bildirimler() to service_role;
