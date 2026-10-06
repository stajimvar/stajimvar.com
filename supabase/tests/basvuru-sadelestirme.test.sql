-- SADELEŞTİRİLMİŞ BAŞVURU AKIŞI — GERÇEK ROLLERLE
--
-- Yerel test veritabanında koşuyor. ÜRETİME UYGULANMIYOR.
--
--   docker exec -i supabase_db_<ref> psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f /dev/stdin < supabase/tests/basvuru-sadelestirme.test.sql

\set ON_ERROR_STOP on
set client_min_messages = notice;

create schema if not exists s;

create or replace function s.ok(kosul boolean, ad text) returns void
language plpgsql as $$
begin
  if kosul then raise notice 'GECTI  %', ad;
  else raise exception 'DUSTU  %', ad; end if;
end $$;

create or replace function s.kimlik(p uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p::text, 'role', 'authenticated')::text, true);
end $$;

create or replace function s.anonim() returns void
language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{}', true);
end $$;

create or replace function s.yonetici() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{}', true);
end $$;

grant usage on schema s to authenticated, anon;
grant execute on all functions in schema s to authenticated, anon;

/* ================================================================== */
/*  FİKSTÜR                                                            */
/* ================================================================== */

begin;

do $$
declare k uuid;
begin
  foreach k in array array[
    '11111111-aaaa-0000-0000-000000000001'::uuid,  -- A sahibi (Owner)
    '22222222-aaaa-0000-0000-000000000002'::uuid,  -- A recruiter
    '33333333-aaaa-0000-0000-000000000003'::uuid,  -- A viewer
    '44444444-bbbb-0000-0000-000000000004'::uuid,  -- B sahibi (baska sirket)
    '55555555-cccc-0000-0000-000000000005'::uuid,  -- C sahibi (DOGRULANMAMIS)
    '66666666-dddd-0000-0000-000000000006'::uuid,  -- ogrenci 1
    '77777777-dddd-0000-0000-000000000007'::uuid   -- ogrenci 2
  ] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at)
    values (k, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            k::text || '@ornek.test', '', now(), now(), now())
    on conflict (id) do nothing;
    /*
      PROFIL SATIRI ZATEN VAR: auth.users'a yazinca tetikleyici
      olusturuyor. `do nothing` fiksturu sessizce yazmiyordu ve telefon
      null kaliyordu -- sinama da "telefon gelmiyor" diye dusuyordu.
    */
    insert into public.profiles (id, email, full_name, phone)
    values (k, k::text || '@ornek.test', 'Kisi ' || left(k::text, 4), '+90 500 000 00 00')
    on conflict (id) do update
      set full_name = excluded.full_name,
          phone     = excluded.phone;
  end loop;
end $$;

insert into public.student_profiles (id) values
  ('66666666-dddd-0000-0000-000000000006'),
  ('77777777-dddd-0000-0000-000000000007')
on conflict (id) do nothing;

/*
  AD BENZERSİZ: `companies_name_normalized_key` adları benzersiz tutuyor
  ve CI bu dosyayı öteki test dosyalarıyla AYNI veritabanında, onlardan
  sonra koşturuyor. "A Sirketi" adı ise-alim-merkezi.test.sql'de zaten
  var; aynı ad çakışıp betiği ilk satırda durduruyordu.
*/
insert into public.companies (id, name, slug, verified) values
  ('a0000000-0000-0000-0000-00000000000a', 'Sade Akis A Sirketi', 'sade-akis-a', true),
  ('b0000000-0000-0000-0000-00000000000b', 'Sade Akis B Sirketi', 'sade-akis-b', true),
  ('c0000000-0000-0000-0000-00000000000c', 'Sade Akis C Sirketi', 'sade-akis-c', false)
on conflict (id) do nothing;

insert into public.company_members (company_id, user_id, is_owner, recruiter_role) values
  ('a0000000-0000-0000-0000-00000000000a', '11111111-aaaa-0000-0000-000000000001', true,  'Owner'),
  ('a0000000-0000-0000-0000-00000000000a', '22222222-aaaa-0000-0000-000000000002', false, 'Recruiter'),
  ('a0000000-0000-0000-0000-00000000000a', '33333333-aaaa-0000-0000-000000000003', false, 'Viewer'),
  ('b0000000-0000-0000-0000-00000000000b', '44444444-bbbb-0000-0000-000000000004', true,  'Owner'),
  ('c0000000-0000-0000-0000-00000000000c', '55555555-cccc-0000-0000-000000000005', true,  'Owner')
on conflict do nothing;

insert into public.listings (id, company_id, title, status) values
  ('aaaa1111-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'A ilani', 'draft'),
  /* External basvuru AYRI ilanda: (listing_id, student_id) benzersiz. */
  ('aaaa2222-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'A dis ilani', 'draft'),
  ('cccc1111-0000-0000-0000-00000000000c', 'c0000000-0000-0000-0000-00000000000c', 'C ilani', 'draft')
on conflict (id) do nothing;

/*
  DORT BASVURU, DORT AYRI DURUM:
    i1  internal · riza VAR  (eski surum)   → acilmali
    i2  internal · riza YOK                 → acilmamali
    e1  external · riza VAR  (eski surum)   → ACILMAMALI (kapsam yetmez)
    c1  dogrulanmamis sirkette, riza VAR    → acilmamali
*/
insert into public.applications
  (id, listing_id, student_id, status, applied_at, application_method,
   contact_share_consent_at, contact_share_consent_version)
values
  ('1111aaaa-0000-0000-0000-000000001001'::uuid, 'aaaa1111-0000-0000-0000-00000000000a',
   '66666666-dddd-0000-0000-000000000006', 'submitted', now() - interval '3 days',
   'internal', now() - interval '3 days', '2026-08-v1'),
  ('2222aaaa-0000-0000-0000-000000002002'::uuid, 'aaaa1111-0000-0000-0000-00000000000a',
   '77777777-dddd-0000-0000-000000000007', 'submitted', now() - interval '2 days',
   'internal', null, null),
  ('3333aaaa-0000-0000-0000-000000003001'::uuid, 'aaaa2222-0000-0000-0000-00000000000a',
   '66666666-dddd-0000-0000-000000000006', 'submitted', now() - interval '5 days',
   'external', now() - interval '5 days', '2026-08-v1'),
  ('4444cccc-0000-0000-0000-000000004001'::uuid, 'cccc1111-0000-0000-0000-00000000000c',
   '66666666-dddd-0000-0000-000000000006', 'submitted', now() - interval '4 days',
   'internal', now() - interval '4 days', '2026-09-v2')
on conflict (id) do nothing;

commit;

/* ================================================================== */
/*  1) PAYLASIM KAPISI                                                 */
/* ================================================================== */

begin;
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok(public.basvuru_iletisimi_acik('1111aaaa-0000-0000-0000-000000001001'),
            'internal + riza  → paylasim ACIK');
select s.ok(not public.basvuru_iletisimi_acik('2222aaaa-0000-0000-0000-000000002002'),
            'internal + riza YOK → paylasim KAPALI');
select s.ok(not public.basvuru_iletisimi_acik('3333aaaa-0000-0000-0000-000000003001'),
            'external + ESKI riza → paylasim KAPALI (yeni onay VARSAYILMIYOR)');
commit;

/* ================================================================== */
/*  2) ILETISIM KIME ACILIYOR                                          */
/* ================================================================== */

-- Owner: teklif kabulu ARANMADAN goruyor
begin;
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select count(*) from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) = 1,
            'OWNER: teklif kabulu olmadan iletişimi goruyor');
select s.ok((select telefon from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) is not null,
            'OWNER: telefon geliyor');
commit;

-- Recruiter: goruyor
begin;
select s.kimlik('22222222-aaaa-0000-0000-000000000002');
select s.ok((select count(*) from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) = 1,
            'RECRUITER: iletişimi goruyor');
commit;

-- VIEWER: GORMUYOR
begin;
select s.kimlik('33333333-aaaa-0000-0000-000000000003');
select s.ok((select count(*) from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) = 0,
            'VIEWER: iletişimi GORMUYOR');
select s.ok((select count(*) from public.applications
              where listing_id in ('aaaa1111-0000-0000-0000-00000000000a',
                                   'aaaa2222-0000-0000-0000-00000000000a')) = 3,
            'VIEWER: basvurulari okumaya devam ediyor');
commit;

-- Baska sirket: gormuyor
begin;
select s.kimlik('44444444-bbbb-0000-0000-000000000004');
select s.ok((select count(*) from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) = 0,
            'BASKA SIRKET: iletişimi gormuyor');
commit;

-- Dogrulanmamis sirket: kendi basvurusunda bile gormuyor
begin;
select s.kimlik('55555555-cccc-0000-0000-000000000005');
select s.ok((select count(*) from public.basvuru_iletisimi('4444cccc-0000-0000-0000-000000004001')) = 0,
            'DOGRULANMAMIS SIRKET: iletişimi gormuyor');
commit;

-- Giris yapmamis kullanici
begin;
select s.anonim();
do $$
begin
  perform public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001');
  raise exception 'DUSTU  anon iletişim RPC cagirabildi';
exception when insufficient_privilege then
  raise notice 'GECTI  ANON: iletişim RPC cagiramiyor';
end $$;
rollback;

/* ================================================================== */
/*  3) OGRENCI PAYLASIMI ACIP KAPATABILIYOR                            */
/* ================================================================== */

-- External basvuruda ogrenci acinca ACILIYOR
begin;
select s.kimlik('66666666-dddd-0000-0000-000000000006');
select s.ok(public.ogrenci_paylasimi_ac('3333aaaa-0000-0000-0000-000000003001', true) is not null,
            'OGRENCI: external basvuruda paylasimi acabiliyor');
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select count(*) from public.basvuru_iletisimi('3333aaaa-0000-0000-0000-000000003001')) = 1,
            'OGRENCI ACINCA: sirket external basvuruda da goruyor');
rollback;

-- KAPATINCA SUNUCUDA ENGELLENIYOR
begin;
select s.kimlik('66666666-dddd-0000-0000-000000000006');
select public.ogrenci_paylasimi_ac('1111aaaa-0000-0000-0000-000000001001', false);
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok(not public.basvuru_iletisimi_acik('1111aaaa-0000-0000-0000-000000001001'),
            'KAPATINCA: paylasim kapisi KAPANIYOR');
select s.ok((select count(*) from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) = 0,
            'KAPATINCA: sirket iletişimi ARTIK GORMUYOR');
rollback;

-- Sirket baskasinin izni adina paylasim ACAMIYOR
begin;
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
do $$
begin
  perform public.ogrenci_paylasimi_ac('2222aaaa-0000-0000-0000-000000002002', true);
  raise exception 'DUSTU  Sirket ogrenci adina izin verdi';
exception when sqlstate '42501' then
  raise notice 'GECTI  SIRKET: ogrenci adina paylasim ACAMIYOR';
end $$;
rollback;

/* ================================================================== */
/*  4) GORUNTULENME                                                    */
/* ================================================================== */

begin;
select s.yonetici();
delete from public.notifications where type = 'basvuru_goruntulendi';

-- Yetkili uye acinca kayit ve TEK bildirim
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok(public.basvuru_goruntulendi('1111aaaa-0000-0000-0000-000000001001') is not null,
            'GORUNTULENME: yetkili uye acinca damga yaziliyor');
select s.yonetici();
/* Ilk damgayi SAKLA: `now()` islem boyunca sabit oldugu icin
   "damga tazelenmedi"i zaman karsilastirmasiyla degil, DEGER
   esitligiyle olcuyoruz. */
create temp table _ilk_damga as
  select ilk_goruntulenme_at as an from public.applications
   where id = '1111aaaa-0000-0000-0000-000000001001';
select s.ok((select count(*) from public.notifications
              where type = 'basvuru_goruntulendi'
                and application_id = '1111aaaa-0000-0000-0000-000000001001') = 1,
            'GORUNTULENME: ogrenciye TEK bildirim');

-- Tekrar acmalar bildirim URETMIYOR
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select public.basvuru_goruntulendi('1111aaaa-0000-0000-0000-000000001001');
select s.kimlik('22222222-aaaa-0000-0000-000000000002');
select public.basvuru_goruntulendi('1111aaaa-0000-0000-0000-000000001001');
select s.yonetici();
select s.ok((select count(*) from public.notifications
              where type = 'basvuru_goruntulendi'
                and application_id = '1111aaaa-0000-0000-0000-000000001001') = 1,
            'GORUNTULENME: tekrar acmalar bildirim YAGMURU uretmiyor');

-- Ilk damga TAZELENMIYOR
select s.ok((select ilk_goruntulenme_at from public.applications
              where id = '1111aaaa-0000-0000-0000-000000001001')
            = (select an from _ilk_damga),
            'GORUNTULENME: tekrar acmalar ilk damgayi TAZELEMIYOR');
rollback;

-- VIEWER de sayiliyor (sirket gercekten bakti)
begin;
select s.yonetici();
delete from public.notifications where type = 'basvuru_goruntulendi';
select s.kimlik('33333333-aaaa-0000-0000-000000000003');
select s.ok(public.basvuru_goruntulendi('1111aaaa-0000-0000-0000-000000001001') is not null,
            'GORUNTULENME: VIEWER acinca da sayiliyor');
rollback;

-- Baska sirket ve dogrulanmamis sirket KAYIT ACAMIYOR
begin;
select s.kimlik('44444444-bbbb-0000-0000-000000000004');
do $$
begin
  perform public.basvuru_goruntulendi('1111aaaa-0000-0000-0000-000000001001');
  raise exception 'DUSTU  Baska sirket goruntulenme yazdi';
exception when sqlstate '42501' then
  raise notice 'GECTI  BASKA SIRKET: goruntulenme YAZAMIYOR';
end $$;
rollback;

begin;
select s.kimlik('55555555-cccc-0000-0000-000000000005');
do $$
begin
  perform public.basvuru_goruntulendi('4444cccc-0000-0000-0000-000000004001');
  raise exception 'DUSTU  Dogrulanmamis sirket goruntulenme yazdi';
exception when sqlstate '42501' then
  raise notice 'GECTI  DOGRULANMAMIS SIRKET: goruntulenme YAZAMIYOR';
end $$;
rollback;

-- Ogrencinin kendi acmasi SAYILMIYOR
begin;
select s.yonetici();
delete from public.notifications where type = 'basvuru_goruntulendi';
select s.kimlik('66666666-dddd-0000-0000-000000000006');
do $$
begin
  perform public.basvuru_goruntulendi('1111aaaa-0000-0000-0000-000000001001');
  raise notice 'GECTI  OGRENCI: kendi acmasi kayit uretmiyor (yetki kapisi)';
exception when sqlstate '42501' then
  raise notice 'GECTI  OGRENCI: kendi acmasi SAYILMIYOR';
end $$;
select s.yonetici();
select s.ok((select count(*) from public.notifications
              where type = 'basvuru_goruntulendi') = 0,
            'OGRENCI: kendi acmasindan bildirim YOK');
rollback;

/* ================================================================== */
/*  5) ESKI KAYITLAR OKUNABILIR KALIYOR                                */
/* ================================================================== */
--
-- Uretimde yanit bekleyen 1 `offer_extended` ve yanitlanmis 1
-- `interview_scheduled` var. Sade akis bunlari SILMIYOR ve
-- donusturmuyor; ogrencinin yanit yolu da acik kaliyor.

begin;
select s.yonetici();
update public.applications
   set status = 'offer_extended', offer_note = 'eski teklif',
       offer_start_date = current_date + 30
 where id = '2222aaaa-0000-0000-0000-000000002002';

select s.kimlik('77777777-dddd-0000-0000-000000000007');
select s.ok((select count(*) from public.applications
              where id = '2222aaaa-0000-0000-0000-000000002002'
                and status = 'offer_extended'
                and offer_note is not null) = 1,
            'ESKI TEKLIF: ogrenci kaydi OKUYABILIYOR');

/*
  Ogrenci aktif teklifi hala YANITLAYABILIYOR.

  Yanit DOGRUDAN UPDATE ile verilmiyor -- RLS ve
  `guard_ogrenci_karari_nihai` tetikleyicisi buna izin vermiyor.
  Yol `teklife_yanit_ver` RPC'si (20260911020000) ve sade akis o
  RPC'ye DOKUNMUYOR: sirket yeni teklif ACAMASA da, acik kalmis
  tekliflerin yanit yolu oldugu gibi duruyor.
*/
select public.teklife_yanit_ver('2222aaaa-0000-0000-0000-000000002002', true);
select s.ok((select status from public.applications
              where id = '2222aaaa-0000-0000-0000-000000002002') = 'offer_accepted',
            'ESKI TEKLIF: ogrenci teklife_yanit_ver ile YANIT VEREBILIYOR');
rollback;

/* Kabul edilmis eski teklifte ogrenci sirket yetkilisini hala goruyor. */
begin;
/*
  Kabul da gercek yoldan veriliyor: `guard_ogrenci_karari_nihai`
  tetikleyicisi "Bu karari yalnizca aday verebilir" diyor ve dogrudan
  UPDATE'i reddediyor -- yonetici olarak bile. Once teklif aciliyor,
  sonra ogrenci RPC ile kabul ediyor.
*/
select s.yonetici();
update public.applications
   set status = 'offer_extended'
 where id = '1111aaaa-0000-0000-0000-000000001001';
select s.kimlik('66666666-dddd-0000-0000-000000000006');
select public.teklife_yanit_ver('1111aaaa-0000-0000-0000-000000001001', true);
select s.ok((select count(*) from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) = 1,
            'ESKI KABUL: ogrenci sirket yetkilisini HALA goruyor');
rollback;

/* ================================================================== */
/*  6) PROFİL KOPYASI SUNUCUDA DA KAPANIYOR (20261203010000)           */
/* ================================================================== */
--
-- Kopya korumalı tabloda (`basvuru_profil_kopyalari`). Şirket yalnız
-- doğrulanmış şirkette VE paylaşım ETKİNKEN okur. Ölçülen yollar:
-- doğrudan tablo, başvuru satırı (eski sütun), güncel profil RPC'si,
-- yetenek RPC'si ve iletişim RPC'si.

begin;
select s.yonetici();
/*
  KURULUM: üç başvuruya kopya yazılıyor. Kasten e-postalı ve telefonlu:
  temizlik tetikleyicisinin taşınan kopyada da çalıştığı ölçülüyor.
*/
update public.applications
   set profile_snapshot = '{"ad":"Aday Bir","universite":"Ornek Universitesi","eposta":"sizinti@ornek.test","telefon":"+900000000000"}'::jsonb
 where id in ('1111aaaa-0000-0000-0000-000000001001',
              '3333aaaa-0000-0000-0000-000000003001',
              '4444cccc-0000-0000-0000-000000004001');

select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id in ('1111aaaa-0000-0000-0000-000000001001',
                                   '3333aaaa-0000-0000-0000-000000003001',
                                   '4444cccc-0000-0000-0000-000000004001')) = 3,
            'KOPYA KURULUM: uc kopya korumali tabloya tasindi');
select s.ok((select count(*) from public.applications
              where id in ('1111aaaa-0000-0000-0000-000000001001',
                           '3333aaaa-0000-0000-0000-000000003001',
                           '4444cccc-0000-0000-0000-000000004001')
                and profile_snapshot is not null) = 0,
            'KOPYA KURULUM: basvuru satirinda kopya KALMADI');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where kopya ? 'eposta' or kopya ? 'telefon') = 0,
            'KOPYA KURULUM: tasinan kopyada e-posta/telefon YOK');
commit;

/* ---- PAYLAŞIM AÇIK: yetkili şirket okur ---- */
begin;
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '1111aaaa-0000-0000-0000-000000001001') = 1,
            'ACIK: Owner kopyayi okur');
select s.ok((public.basvuru_aday_guncel_profili('1111aaaa-0000-0000-0000-000000001001') ->> 'riza') = 'true',
            'ACIK: Owner guncel profili okur');
select s.kimlik('22222222-aaaa-0000-0000-000000000002');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '1111aaaa-0000-0000-0000-000000001001') = 1,
            'ACIK: Recruiter kopyayi okur');
/* Profil Viewer'a açık; iletişim değil (bölüm 2'de ölçüldü). */
select s.kimlik('33333333-aaaa-0000-0000-000000000003');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '1111aaaa-0000-0000-0000-000000001001') = 1,
            'ACIK: Viewer profil kopyasini okur (iletisimi okumaz)');
commit;

/* ---- ÖĞRENCİ KAPATIYOR: hiçbir yoldan okunmuyor ---- */
begin;
select s.kimlik('66666666-dddd-0000-0000-000000000006');
select public.ogrenci_paylasimi_ac('1111aaaa-0000-0000-0000-000000001001', false);

select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '1111aaaa-0000-0000-0000-000000001001') = 0,
            'KAPALI: Owner korumali tablodan OKUYAMAZ');
select s.ok((select count(*) from public.applications
              where id = '1111aaaa-0000-0000-0000-000000001001'
                and profile_snapshot is not null) = 0,
            'KAPALI: Owner basvuru satirindan (eski sutun) OKUYAMAZ');
select s.ok((select count(*) from public.applications a
               left join public.basvuru_profil_kopyalari k on k.basvuru_id = a.id
              where a.id = '1111aaaa-0000-0000-0000-000000001001'
                and k.kopya is not null) = 0,
            'KAPALI: birlestirme ile de OKUYAMAZ');
select s.ok((public.basvuru_aday_guncel_profili('1111aaaa-0000-0000-0000-000000001001') ->> 'riza') = 'false',
            'KAPALI: guncel profil RPC kapali');
select s.ok((public.basvuru_aday_guncel_profili('1111aaaa-0000-0000-0000-000000001001') -> 'guncel') is null,
            'KAPALI: guncel profil RPC veri DONDURMUYOR');
select s.ok(cardinality(public.basvuru_aday_yetenekleri('1111aaaa-0000-0000-0000-000000001001')) = 0,
            'KAPALI: yetenek RPC bos');
select s.ok((select count(*) from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) = 0,
            'KAPALI: iletisim RPC bos');
select s.kimlik('33333333-aaaa-0000-0000-000000000003');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '1111aaaa-0000-0000-0000-000000001001') = 0,
            'KAPALI: Viewer da OKUYAMAZ');

/* Başvurunun temel kaydı duruyor. */
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select count(*) from public.applications
              where id = '1111aaaa-0000-0000-0000-000000001001'
                and status = 'submitted' and applied_at is not null) = 1,
            'KAPALI: basvurunun temel kaydi sirkete gorunur kaliyor');

/* Öğrenci kendi kopyasını HER durumda okur. */
select s.kimlik('66666666-dddd-0000-0000-000000000006');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '1111aaaa-0000-0000-0000-000000001001') = 1,
            'KAPALI: ogrenci KENDI kopyasini okur');

/* ---- TEKRAR AÇIYOR: aynı kopya geri geliyor ---- */
select public.ogrenci_paylasimi_ac('1111aaaa-0000-0000-0000-000000001001', true);
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select kopya ->> 'ad' from public.basvuru_profil_kopyalari
              where basvuru_id = '1111aaaa-0000-0000-0000-000000001001') = 'Aday Bir',
            'TEKRAR ACIK: ayni kopya geri geldi (silinmemis)');
select s.ok((public.basvuru_aday_guncel_profili('1111aaaa-0000-0000-0000-000000001001') ->> 'riza') = 'true',
            'TEKRAR ACIK: guncel profil RPC acik');
select s.ok((select count(*) from public.basvuru_iletisimi('1111aaaa-0000-0000-0000-000000001001')) = 1,
            'TEKRAR ACIK: iletisim RPC acik');
rollback;

/* ---- KAPALIYKEN BİLDİRİM METNİ DE ADI TAŞIMIYOR ---- */
begin;
select s.yonetici();
delete from public.notifications where application_id = '1111aaaa-0000-0000-0000-000000001001';
select s.kimlik('66666666-dddd-0000-0000-000000000006');
select public.ogrenci_paylasimi_ac('1111aaaa-0000-0000-0000-000000001001', false);
update public.applications set status = 'withdrawn'
 where id = '1111aaaa-0000-0000-0000-000000001001';
select s.yonetici();
/* Bildirim şirketin HER üyesine gidiyor; hepsi adsız olmalı. */
select s.ok((select count(*) > 0
                    and count(*) = count(*) filter (where title like 'Bir aday%')
               from public.notifications
              where application_id = '1111aaaa-0000-0000-0000-000000001001'
                and type = 'geri_cekildi'),
            'KAPALI: sirkete giden geri cekme bildirimlerinin HEPSI adsiz');
select s.ok((select count(*) from public.notifications
              where application_id = '1111aaaa-0000-0000-0000-000000001001'
                and (title like '%Aday Bir%' or body like '%Aday Bir%')) = 0,
            'KAPALI: bildirimin hicbir yerinde ad yok');
rollback;

/* ---- ERİŞİMİ OLMAYANLAR ---- */
begin;
/* Başka şirket */
select s.kimlik('44444444-bbbb-0000-0000-000000000004');
select s.ok((select count(*) from public.basvuru_profil_kopyalari) = 0,
            'BASKA SIRKET: hicbir kopyayi OKUYAMAZ');
do $$
begin
  perform public.basvuru_aday_guncel_profili('1111aaaa-0000-0000-0000-000000001001');
  raise exception 'DUSTU  baska sirket guncel profili okudu';
exception when sqlstate '42501' then
  raise notice 'GECTI  BASKA SIRKET: guncel profil RPC reddediyor';
end $$;

/* Doğrulanmamış şirket, KENDİ ilanındaki onaylı başvuru */
select s.kimlik('55555555-cccc-0000-0000-000000000005');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '4444cccc-0000-0000-0000-000000004001') = 0,
            'DOGRULANMAMIS SIRKET: kendi basvurusunun kopyasini OKUYAMAZ');

/* Eski external rıza: A kendi ilanında bile okuyamaz */
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '3333aaaa-0000-0000-0000-000000003001') = 0,
            'ESKI EXTERNAL RIZA: kopya kapali (yeni onay varsayilmiyor)');
select s.ok((public.basvuru_aday_guncel_profili('3333aaaa-0000-0000-0000-000000003001') ->> 'riza') = 'false',
            'ESKI EXTERNAL RIZA: guncel profil kapali');
commit;

/* Giriş yapmamış kullanıcı */
begin;
select s.anonim();
do $$
begin
  perform count(*) from public.basvuru_profil_kopyalari;
  raise exception 'DUSTU  anon kopya tablosunu okudu';
exception when insufficient_privilege then
  raise notice 'GECTI  ANON: kopya tablosuna YETKISI YOK';
end $$;
rollback;

/* Öğrenci external başvuruda paylaşımı AÇARSA kopya açılıyor */
begin;
select s.kimlik('66666666-dddd-0000-0000-000000000006');
select public.ogrenci_paylasimi_ac('3333aaaa-0000-0000-0000-000000003001', true);
select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '3333aaaa-0000-0000-0000-000000003001') = 1,
            'EXTERNAL + OGRENCI ACTI: kopya acildi');
rollback;

/* ---- YENİ BAŞVURU: kopya yazıldığı anda taşınıyor ---- */
begin;
/* Öğrenci yalnız YAYINDAKİ ilana başvurabiliyor; ilan servis rolüyle. */
select s.yonetici();
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into public.listings (id, company_id, title, status, origin, application_method)
values ('aaaa3333-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a',
        'Sade Akis Yeni Ilan', 'published', 'employer_posted', 'internal');

select s.kimlik('77777777-dddd-0000-0000-000000000007');
insert into public.applications
  (id, listing_id, student_id, match_score, application_method,
   email_delivery_status, created_via, contact_share_consent_at,
   contact_share_consent_version, profile_snapshot)
values ('5555aaaa-0000-0000-0000-000000005001', 'aaaa3333-0000-0000-0000-00000000000a',
        '77777777-dddd-0000-0000-000000000007', 70, 'internal', 'not_required', 'web', now(),
        '2026-10-sade-v1',
        '{"ad":"Yeni Aday","bolum":"Ornek Bolum","eposta":"yeni@ornek.test","telefon":"+900000000001"}');

select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '5555aaaa-0000-0000-0000-000000005001') = 1,
            'YENI BASVURU: ogrenci kendi kopyasini korumali tabloda goruyor');

select s.yonetici();
select s.ok((select profile_snapshot is null from public.applications
              where id = '5555aaaa-0000-0000-0000-000000005001'),
            'YENI BASVURU: basvuru satirindaki sutun BOS');
select s.ok((select kopya ->> 'ad' = 'Yeni Aday' and not (kopya ? 'eposta') and not (kopya ? 'telefon')
               from public.basvuru_profil_kopyalari
              where basvuru_id = '5555aaaa-0000-0000-0000-000000005001'),
            'YENI BASVURU: kopya dogru tasindi, iletisim temizlendi');
select s.ok((select count(*) from public.notifications
              where application_id = '5555aaaa-0000-0000-0000-000000005001'
                and type = 'yeni_basvuru' and body like 'Yeni Aday%') >= 1,
            'YENI BASVURU: sirket bildirimi adi TASIYOR (paylasim acik)');

select s.kimlik('11111111-aaaa-0000-0000-000000000001');
select s.ok((select count(*) from public.basvuru_profil_kopyalari
              where basvuru_id = '5555aaaa-0000-0000-0000-000000005001') = 1,
            'YENI BASVURU: yetkili sirket kopyayi okur');
rollback;

select 'TUM SADELESTIRME SINAMALARI GECTI' as sonuc;
