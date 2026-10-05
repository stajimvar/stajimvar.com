-- İŞE ALIM MERKEZİ — GERÇEK VERİTABANI TESTİ
--
-- Yerel test veritabanında koşuyor (supabase start + db reset).
-- ÜRETİME UYGULANMIYOR. Çalıştırma:
--
--   docker exec -i supabase_db_<ref> psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f /dev/stdin < supabase/tests/ise-alim-merkezi.test.sql
--
-- NE SINANIYOR: RLS ve RPC'ler GERÇEK ROLLERLE. Her bölüm
-- `set local role authenticated` + `request.jwt.claims` ile belirli bir
-- kullanıcıymış gibi davranıyor; yani postgres süper kullanıcısının
-- politikaları atlaması sınamayı bozmuyor.
--
-- Her sınama `ok(...)` ile raporlanıyor; bir tanesi bile düşerse
-- ON_ERROR_STOP betiği durduruyor.

\set ON_ERROR_STOP on
set client_min_messages = notice;

create schema if not exists t;

create or replace function t.ok(kosul boolean, ad text) returns void
language plpgsql as $$
begin
  if kosul then
    raise notice 'GECTI  %', ad;
  else
    raise exception 'DUSTU  %', ad;
  end if;
end $$;

/* Belirli bir kullanıcı gibi davran. */
create or replace function t.kimlik(p uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p::text, 'role', 'authenticated')::text, true);
end $$;

create or replace function t.yonetici() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  /* BOS METIN JSON DEGIL: applications tetikleyicileri auth.uid()
     okurken "invalid input syntax for type json" veriyordu. */
  perform set_config('request.jwt.claims', '{}', true);
end $$;

/*
  Yardımcılar `authenticated` iken de çağrılıyor (sınamanın yarısı o
  rolde koşuyor), bu yüzden şema ona açılıyor. Yalnız test şeması ve
  yalnız test veritabanı.
*/
grant usage on schema t to authenticated;
grant execute on all functions in schema t to authenticated;

/* ================================================================== */
/*  FİKSTÜR                                                            */
/* ================================================================== */
-- Uydurma değil KURGU veri: gerçek kullanıcı verisi kullanılmıyor ve
-- bu veritabanı yalnız test için var.

begin;

do $$
declare
  k uuid;
begin
  foreach k in array array[
    '11111111-1111-1111-1111-111111111111'::uuid,  -- A sahibi
    '22222222-2222-2222-2222-222222222222'::uuid,  -- A recruiter
    '33333333-3333-3333-3333-333333333333'::uuid,  -- A viewer
    '44444444-4444-4444-4444-444444444444'::uuid,  -- uye degil
    '55555555-5555-5555-5555-555555555555'::uuid,  -- B sahibi
    '66666666-6666-6666-6666-666666666666'::uuid,  -- ogrenci 1
    '77777777-7777-7777-7777-777777777777'::uuid,  -- ogrenci 2
    '88888888-8888-8888-8888-888888888888'::uuid   -- A recruiter 2
  ] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at)
    values (k, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            k::text || '@ornek.test', '', now(), now(), now())
    on conflict (id) do nothing;

    insert into public.profiles (id, email, full_name)
    values (k, k::text || '@ornek.test', 'Kisi ' || left(k::text, 4))
    on conflict (id) do nothing;
  end loop;
end $$;

insert into public.student_profiles (id) values
  ('66666666-6666-6666-6666-666666666666'),
  ('77777777-7777-7777-7777-777777777777')
on conflict (id) do nothing;

insert into public.companies (id, name, slug, verified) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'A Sirketi', 'a-sirketi', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'B Sirketi', 'b-sirketi', true)
on conflict (id) do nothing;

insert into public.company_members (company_id, user_id, is_owner, recruiter_role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', true,  'Owner'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', false, 'Recruiter'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', false, 'Recruiter'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', false, 'Viewer'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', true,  'Owner')
on conflict do nothing;

/*
  TASLAK ILAN: `guard_listing_publish` dogrudan 'published' yazmayi
  reddediyor (ilan yayina ancak otomatik kontrol ya da yonetici
  onayiyla aliniyor). Buradaki sinamalarin hicbiri ilan durumuna
  bakmiyor; korumayi test icin devre disi birakmak, uretimdeki gercek
  kurali sinama disi birakmak olurdu.
*/
insert into public.listings (id, company_id, title, status) values
  ('ccccccc1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'A ilani', 'draft'),
  ('ccccccc2-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'B ilani', 'draft')
on conflict (id) do nothing;

insert into public.applications (id, listing_id, student_id, status, applied_at) values
  ('ddddddd1-0000-0000-0000-000000000001', 'ccccccc1-0000-0000-0000-000000000001',
   '66666666-6666-6666-6666-666666666666', 'submitted', now() - interval '40 days'),
  ('ddddddd2-0000-0000-0000-000000000002', 'ccccccc1-0000-0000-0000-000000000001',
   '77777777-7777-7777-7777-777777777777', 'submitted', now() - interval '2 days'),
  ('ddddddd3-0000-0000-0000-000000000003', 'ccccccc2-0000-0000-0000-000000000002',
   '66666666-6666-6666-6666-666666666666', 'submitted', now() - interval '10 days')
on conflict (id) do nothing;

commit;

/* ================================================================== */
/*  1) ROL OKUYUCU                                                     */
/* ================================================================== */

begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
select t.ok(public.sirket_rolum('aaaaaaaa-0000-0000-0000-000000000001') = 'Owner',
            'Owner rolu Owner okunuyor');
select t.ok(public.sirket_basvuru_yazabilir('aaaaaaaa-0000-0000-0000-000000000001'),
            'Owner yazabilir');
select t.ok(not public.sirket_basvuru_yazabilir('bbbbbbbb-0000-0000-0000-000000000002'),
            'A Owner B sirketinde yazamaz');
commit;

begin;
select t.kimlik('22222222-2222-2222-2222-222222222222');
select t.ok(public.sirket_rolum('aaaaaaaa-0000-0000-0000-000000000001') = 'Recruiter',
            'Recruiter rolu okunuyor');
select t.ok(public.sirket_basvuru_yazabilir('aaaaaaaa-0000-0000-0000-000000000001'),
            'Recruiter yazabilir');
commit;

begin;
select t.kimlik('33333333-3333-3333-3333-333333333333');
select t.ok(public.sirket_rolum('aaaaaaaa-0000-0000-0000-000000000001') = 'Viewer',
            'Viewer rolu okunuyor');
select t.ok(not public.sirket_basvuru_yazabilir('aaaaaaaa-0000-0000-0000-000000000001'),
            'Viewer YAZAMAZ');
commit;

begin;
select t.kimlik('44444444-4444-4444-4444-444444444444');
select t.ok(public.sirket_rolum('aaaaaaaa-0000-0000-0000-000000000001') is null,
            'Uye olmayanin rolu yok');
select t.ok(not public.sirket_basvuru_yazabilir('aaaaaaaa-0000-0000-0000-000000000001'),
            'Uye olmayan yazamaz');
commit;

/* ================================================================== */
/*  2) RLS: OKUMA VE YAZMA                                             */
/* ================================================================== */

-- VIEWER OKUYOR (rolun amaci "gorsun ama karismasin")
begin;
select t.kimlik('33333333-3333-3333-3333-333333333333');
select t.ok((select count(*) from public.applications
              where listing_id = 'ccccccc1-0000-0000-0000-000000000001') = 2,
            'Viewer kendi sirketinin basvurularini OKUYOR');
select t.ok((select count(*) from public.applications
              where listing_id = 'ccccccc2-0000-0000-0000-000000000002') = 0,
            'Viewer baska sirketin basvurusunu goremiyor');
commit;

-- VIEWER YAZAMIYOR
begin;
select t.kimlik('33333333-3333-3333-3333-333333333333');
update public.applications set status = 'under_review'
 where id = 'ddddddd1-0000-0000-0000-000000000001';
select t.ok((select status from public.applications
              where id = 'ddddddd1-0000-0000-0000-000000000001') = 'submitted',
            'Viewer durum degistiremiyor (RLS satiri gormuyor)');
rollback;

-- RECRUITER YAZIYOR
begin;
select t.kimlik('22222222-2222-2222-2222-222222222222');
update public.applications set status = 'under_review'
 where id = 'ddddddd1-0000-0000-0000-000000000001';
select t.ok((select status from public.applications
              where id = 'ddddddd1-0000-0000-0000-000000000001') = 'under_review',
            'Recruiter durum degistirebiliyor');
rollback;

-- BASKA SIRKETIN VERISI
begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
update public.applications set status = 'under_review'
 where id = 'ddddddd3-0000-0000-0000-000000000003';
select t.yonetici();
select t.ok((select status from public.applications
              where id = 'ddddddd3-0000-0000-0000-000000000003') = 'submitted',
            'A sahibi B sirketinin basvurusunu DEGISTIREMIYOR');
rollback;

/* ================================================================== */
/*  3) EKIP LISTESI                                                    */
/* ================================================================== */

begin;
select t.kimlik('33333333-3333-3333-3333-333333333333');
select t.ok((select count(*) from public.sirket_ekibi('aaaaaaaa-0000-0000-0000-000000000001')) = 4,
            'Viewer ekibi gorebiliyor (4 uye)');
select t.ok((select count(*) from public.sirket_ekibi('aaaaaaaa-0000-0000-0000-000000000001')
              where yazabilir) = 3,
            'Yazabilen uye sayisi 3 (Owner + 2 Recruiter)');
commit;

begin;
select t.kimlik('44444444-4444-4444-4444-444444444444');
select t.ok((select count(*) from public.sirket_ekibi('aaaaaaaa-0000-0000-0000-000000000001')) = 0,
            'Uye olmayan ekibi goremiyor');
commit;

/* ================================================================== */
/*  4) SORUMLU ATAMA                                                   */
/* ================================================================== */

-- Viewer atayamaz
begin;
select t.kimlik('33333333-3333-3333-3333-333333333333');
do $$
begin
  perform public.basvuru_sorumlusu_ata(
    'ddddddd1-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222', null);
  raise exception 'DUSTU  Viewer atama yapamamali';
exception when sqlstate '42501' then
  raise notice 'GECTI  Viewer sorumlu atayamiyor (yetki-yok)';
end $$;
rollback;

-- Viewer'a is atanamaz
begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
do $$
begin
  perform public.basvuru_sorumlusu_ata(
    'ddddddd1-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333', null);
  raise exception 'DUSTU  Viewer''a is atanabildi';
exception when sqlstate 'P0001' then
  raise notice 'GECTI  Viewer''a is ATANAMIYOR (uye-uygun-degil)';
end $$;
rollback;

-- Baska sirketin uyesine is atanamaz
begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
do $$
begin
  perform public.basvuru_sorumlusu_ata(
    'ddddddd1-0000-0000-0000-000000000001',
    '55555555-5555-5555-5555-555555555555', null);
  raise exception 'DUSTU  Baska sirketin uyesine is atandi';
exception when sqlstate 'P0001' then
  raise notice 'GECTI  Baska sirketin uyesine is ATANAMIYOR';
end $$;
rollback;

-- Basarili atama
begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
select public.basvuru_sorumlusu_ata(
  'ddddddd1-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222', null);
select t.ok((select atanan_uye from public.applications
              where id = 'ddddddd1-0000-0000-0000-000000000001')
            = '22222222-2222-2222-2222-222222222222',
            'Owner sorumlu atayabiliyor');
rollback;

-- ESZAMANLI ATAMA: ikinci yazan, gordugu deger degistigi icin reddediliyor
begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
select public.basvuru_sorumlusu_ata(
  'ddddddd1-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222', null);
do $$
begin
  /* Ikinci kullanici hala "sorumlusu yok" goruyordu (p_beklenen = null). */
  perform public.basvuru_sorumlusu_ata(
    'ddddddd1-0000-0000-0000-000000000001',
    '88888888-8888-8888-8888-888888888888', null);
  raise exception 'DUSTU  Eszamanli atama sessizce ezdi';
exception when sqlstate 'P0001' then
  raise notice 'GECTI  Eszamanli atama REDDEDILDI (sorumlu-degisti)';
end $$;
select t.ok((select atanan_uye from public.applications
              where id = 'ddddddd1-0000-0000-0000-000000000001')
            = '22222222-2222-2222-2222-222222222222',
            'Ilk atama korundu');
rollback;

/* ================================================================== */
/*  5) ATAMA ADAYIN BEKLEYISINI BITIRMIYOR (20261127010000)            */
/* ================================================================== */

begin;
select t.yonetici();
create temp table _once as
  select aday_ilerleme_at as i, updated_at as u
    from public.applications where id = 'ddddddd1-0000-0000-0000-000000000001';

select t.kimlik('11111111-1111-1111-1111-111111111111');
select public.basvuru_sorumlusu_ata(
  'ddddddd1-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222', null);

select t.yonetici();
select t.ok((select a.aday_ilerleme_at from public.applications a
              where a.id = 'ddddddd1-0000-0000-0000-000000000001')
            = (select i from _once),
            'SORUMLU ATAMA adayin ilerleme damgasini DEGISTIRMIYOR');
select t.ok((select a.updated_at from public.applications a
              where a.id = 'ddddddd1-0000-0000-0000-000000000001')
            > (select u from _once),
            '... ama updated_at tazeleniyor (eski olcu bu yuzden yanlisti)');
rollback;

-- Gercek ilerleme damgayi TAZELIYOR
begin;
select t.yonetici();
create temp table _once2 as
  select aday_ilerleme_at as i from public.applications
   where id = 'ddddddd1-0000-0000-0000-000000000001';
select t.kimlik('22222222-2222-2222-2222-222222222222');
update public.applications set status = 'under_review'
 where id = 'ddddddd1-0000-0000-0000-000000000001';
select t.yonetici();
select t.ok((select a.aday_ilerleme_at from public.applications a
              where a.id = 'ddddddd1-0000-0000-0000-000000000001')
            > (select i from _once2),
            'DURUM DEGISIMI ilerleme damgasini tazeliyor');
rollback;

/* ================================================================== */
/*  6) IS YUKU VE DENGELI DAGITIM                                      */
/* ================================================================== */

begin;
select t.kimlik('33333333-3333-3333-3333-333333333333');
select t.ok((select coalesce(sum(acik), 0) from public.sirket_is_yuku('aaaaaaaa-0000-0000-0000-000000000001')) = 2,
            'Is yuku acik basvurulari sayiyor');
commit;

-- Viewer dagitamaz
begin;
select t.kimlik('33333333-3333-3333-3333-333333333333');
do $$
begin
  perform public.basvurulari_dagit('aaaaaaaa-0000-0000-0000-000000000001', null);
  raise exception 'DUSTU  Viewer dagitim yapabildi';
exception when sqlstate '42501' then
  raise notice 'GECTI  Viewer dagitim YAPAMIYOR';
end $$;
rollback;

-- Dengeli dagitim: 2 sorumsuz basvuru, 3 yazabilen uye -> ikisi ayri kisilere
begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
select t.ok(public.basvurulari_dagit('aaaaaaaa-0000-0000-0000-000000000001', null) = 2,
            'Dagitim 2 sorumsuz basvuruyu atadi');
select t.ok((select count(distinct atanan_uye) from public.applications
              where listing_id = 'ccccccc1-0000-0000-0000-000000000001') = 2,
            'DENGE: iki basvuru ayri kisilere gitti');
/* Ikinci kosu: dagitacak sey kalmadi, mevcut atamalar bozulmuyor. */
select t.ok(public.basvurulari_dagit('aaaaaaaa-0000-0000-0000-000000000001', null) = 0,
            'Ikinci dagitim 0: var olan atamaya dokunmuyor');
rollback;

/* ================================================================== */
/*  7) DEGERLENDIRME                                                   */
/* ================================================================== */

begin;
select t.kimlik('22222222-2222-2222-2222-222222222222');
-- Olcut yalniz sahip ekler
do $$
begin
  perform public.olcut_kaydet('aaaaaaaa-0000-0000-0000-000000000001', 'Iletisim', 1, null);
  raise exception 'DUSTU  Recruiter olcut ekleyebildi';
exception when sqlstate '42501' then
  raise notice 'GECTI  Olcutu yalniz SAHIP tanimliyor';
end $$;
rollback;

begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
create temp table _olcut as
  select (public.olcut_kaydet('aaaaaaaa-0000-0000-0000-000000000001', 'Iletisim', 1, null)).id as id;

-- Gecersiz puan reddediliyor
select t.kimlik('22222222-2222-2222-2222-222222222222');
do $$
declare o uuid;
begin
  select id into o from _olcut;
  perform public.degerlendirme_yaz('ddddddd1-0000-0000-0000-000000000001',
                                   jsonb_build_object(o::text, 9), null);
  raise exception 'DUSTU  9 puan kabul edildi';
exception when sqlstate 'P0001' then
  raise notice 'GECTI  1-5 disindaki puan REDDEDILIYOR';
end $$;

-- Baska sirketin olcutune puan verilemiyor
select t.kimlik('55555555-5555-5555-5555-555555555555');
do $$
declare o uuid;
begin
  select id into o from _olcut;
  perform public.degerlendirme_yaz('ddddddd3-0000-0000-0000-000000000003',
                                   jsonb_build_object(o::text, 3), null);
  raise exception 'DUSTU  Baska sirketin olcutu kullanildi';
exception when sqlstate 'P0001' then
  raise notice 'GECTI  Baska sirketin olcutune puan VERILEMIYOR';
end $$;

-- Viewer degerlendirme yazamaz
select t.kimlik('33333333-3333-3333-3333-333333333333');
do $$
declare o uuid;
begin
  select id into o from _olcut;
  perform public.degerlendirme_yaz('ddddddd1-0000-0000-0000-000000000001',
                                   jsonb_build_object(o::text, 3), null);
  raise exception 'DUSTU  Viewer degerlendirme yazdi';
exception when sqlstate '42501' then
  raise notice 'GECTI  Viewer degerlendirme YAZAMIYOR';
end $$;

-- Recruiter yaziyor, gecmis uzerine YAZILMIYOR
select t.kimlik('22222222-2222-2222-2222-222222222222');
do $$
declare o uuid;
begin
  select id into o from _olcut;
  perform public.degerlendirme_yaz('ddddddd1-0000-0000-0000-000000000001',
                                   jsonb_build_object(o::text, 3), 'ilk');
  perform public.degerlendirme_yaz('ddddddd1-0000-0000-0000-000000000001',
                                   jsonb_build_object(o::text, 5), 'fikir degistirdim');
end $$;
select t.ok((select count(*) from public.basvuru_degerlendirme_gecmisi('ddddddd1-0000-0000-0000-000000000001')) = 2,
            'Ayni kisinin ikinci degerlendirmesi ESKISINI SILMIYOR');

-- Viewer gecmisi OKUYOR
select t.kimlik('33333333-3333-3333-3333-333333333333');
select t.ok((select count(*) from public.basvuru_degerlendirme_gecmisi('ddddddd1-0000-0000-0000-000000000001')) = 2,
            'Viewer degerlendirme gecmisini OKUYABILIYOR');
select t.ok((select ad from public.basvuru_degerlendirme_gecmisi('ddddddd1-0000-0000-0000-000000000001') limit 1)
            is not null,
            'Gecmiste degerlendirenin ADI goruluyor');

-- Baska sirket gecmisi goremiyor
select t.kimlik('55555555-5555-5555-5555-555555555555');
select t.ok((select count(*) from public.basvuru_degerlendirme_gecmisi('ddddddd1-0000-0000-0000-000000000001')) = 0,
            'Baska sirket degerlendirme gecmisini GOREMIYOR');
rollback;

/* ================================================================== */
/*  8) ILAN KAPANISINDA BEKLEYENLER                                    */
/* ================================================================== */

begin;
select t.kimlik('33333333-3333-3333-3333-333333333333');
select t.ok((select count(*) from public.ilan_bekleyen_adaylar('ccccccc1-0000-0000-0000-000000000001')) = 2,
            'Bekleyen adaylar listeleniyor');
select t.ok((select max(bekleme_gun) from public.ilan_bekleyen_adaylar('ccccccc1-0000-0000-0000-000000000001')) >= 39,
            'Bekleme gunu GERCEK tarihten geliyor');
commit;

begin;
select t.kimlik('44444444-4444-4444-4444-444444444444');
select t.ok((select count(*) from public.ilan_bekleyen_adaylar('ccccccc1-0000-0000-0000-000000000001')) = 0,
            'Uye olmayan bekleyen adaylari goremiyor');
commit;

-- Sonuclanmis basvuru bekleyen SAYILMIYOR
begin;
select t.kimlik('22222222-2222-2222-2222-222222222222');
update public.applications set status = 'rejected'
 where id = 'ddddddd1-0000-0000-0000-000000000001';
select t.ok((select count(*) from public.ilan_bekleyen_adaylar('ccccccc1-0000-0000-0000-000000000001')) = 1,
            'Sonuclanmis basvuru bekleyen listesinden dusuyor');
rollback;

/* ================================================================== */
/*  9) HATIRLATMA VE TEKRAR KORUMASI                                   */
/* ================================================================== */

begin;
select t.yonetici();
delete from public.notifications where type = 'basvuru_bekliyor';

select t.ok(public.bekleyen_basvuru_hatirlatmalari() >= 1,
            'Hatirlatma uretiliyor');

-- IKINCI KOSU: ayni gun tekrar calistirildiginda YENI BILDIRIM YOK
select t.ok(public.bekleyen_basvuru_hatirlatmalari() = 0,
            'TEKRAR KOSU yeni bildirim uretmiyor (dedupe_key)');

-- 40 gunluk basvuru icin YALNIZ en yuksek esik
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 1,
            '40 gunluk basvuru icin TEK bildirim (sadece 30 esigi)');
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd2-0000-0000-0000-000000000002') = 0,
            '2 gunluk basvuru icin bildirim YOK');
rollback;

-- ATAMA HATIRLATMAYI SUSTURMUYOR (eski kusur)
begin;
select t.yonetici();
delete from public.notifications where type = 'basvuru_bekliyor';
select t.kimlik('11111111-1111-1111-1111-111111111111');
select public.basvuru_sorumlusu_ata(
  'ddddddd1-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222', null);
select t.yonetici();
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 0,
            'on kosul: bildirim yok');
select t.ok(public.bekleyen_basvuru_hatirlatmalari() >= 1,
            'SORUMLU ATANDIKTAN SONRA DA hatirlatma uretiliyor');
select t.ok((select recipient_id from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001')
            = '22222222-2222-2222-2222-222222222222',
            'Hatirlatma SORUMLUYA gidiyor');
rollback;

-- Yetkisiz kullanici hatirlatma URETEMIYOR
begin;
select t.kimlik('11111111-1111-1111-1111-111111111111');
do $$
begin
  perform public.bekleyen_basvuru_hatirlatmalari();
  raise exception 'DUSTU  authenticated hatirlatma uretebildi';
exception when insufficient_privilege then
  raise notice 'GECTI  authenticated hatirlatma URETEMIYOR';
end $$;
rollback;


/* ================================================================== */
/*  10) BEKLEME DONEMI: ILERLEMEDEN SONRA YENIDEN HATIRLATILIYOR       */
/* ================================================================== */
--
-- Kusur (20261128010000 oncesi): dedupe_key yalniz basvuru + esik +
-- alici tasiyordu. Sureci ilerletince yeni bir bekleme donemi
-- basliyordu ama anahtar birebir ayni cikiyor ve yeni hatirlatma
-- sessizce dusuyordu. Yani sureci ilerleten ekip, tam da ilerlettigi
-- icin bir daha uyarilmiyordu.
--
-- Senaryo AYNI BASVURU ve AYNI SORUMLU uzerinde yurutuluyor.

begin;
select t.yonetici();
delete from public.notifications where type = 'basvuru_bekliyor';

/* Sorumlu sabit: alici donem boyunca degismesin. */
update public.applications
   set atanan_uye = '22222222-2222-2222-2222-222222222222'
 where id = 'ddddddd1-0000-0000-0000-000000000001';

/*
  NEDEN clock_timestamp(): `now()` ISLEM BASLANGIC ANI ve islem boyunca
  SABIT. Iki ayri donemi `now() - 8 days` ile damgalasaydik ikisi de
  ayni ana duserdi, dolayisiyla ayni donem kimligini uretirdi ve sinama
  gercekte olmayan bir cakismayi olcerdi. Gercek hayatta iki donem
  farkli anlarda basliyor; clock_timestamp() bunu yansitiyor.
*/
/* ---- 1. ADIM: ilk donem, 8 gundur bekliyor -> 7 esigi ---- */
update public.applications
   set aday_ilerleme_at = clock_timestamp() - interval '8 days'
 where id = 'ddddddd1-0000-0000-0000-000000000001';

select public.bekleyen_basvuru_hatirlatmalari();
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 1,
            '1. ADIM: ilk donem icin hatirlatma yazildi');

/* ---- 2. ADIM: ayni donemde tekrar kosu SESSIZ ---- */
select public.bekleyen_basvuru_hatirlatmalari();
select public.bekleyen_basvuru_hatirlatmalari();
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 1,
            '2. ADIM: ayni donemde tekrar kosular yeni bildirim URETMIYOR');

/* ---- 3. ADIM: sirket sureci ilerletiyor ---- */
--  Durum degisimi `aday_ilerleme_at`i tazeliyor (20261127010000)
--  ve YENI BIR DONEM basliyor.
update public.applications
   set status = 'under_review'
 where id = 'ddddddd1-0000-0000-0000-000000000001';

select t.ok((select aday_ilerleme_at from public.applications
              where id = 'ddddddd1-0000-0000-0000-000000000001') > now() - interval '1 minute',
            '3. ADIM: ilerleme yeni donemi baslatti');

/* Yeni donemde henuz 7 gun dolmadi: hatirlatma OLMAMALI. */
select public.bekleyen_basvuru_hatirlatmalari();
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 1,
            '3. ADIM: yeni donem taze iken hatirlatma YOK');

/* ---- 4. ADIM: yeni asamada yine 7 gun bekliyor ---- */
--  Yalnizca damga geri aliniyor; hicbir aday alani degismedigi icin
--  tetikleyici bu degeri EZMIYOR -- bu da ayrimin kendisini dogruluyor.
update public.applications
   set aday_ilerleme_at = clock_timestamp() - interval '8 days'
 where id = 'ddddddd1-0000-0000-0000-000000000001';

select public.bekleyen_basvuru_hatirlatmalari();
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 2,
            '4. ADIM: YENI DONEM icin YENI hatirlatma yazildi');

/* Ikisi de AYNI aliciya gitti: senaryo tek sorumlu uzerinde. */
select t.ok((select count(distinct recipient_id) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 1,
            '4. ADIM: iki hatirlatma da AYNI sorumluya gitti');

/* Anahtarlar donem alaninda ayrisiyor, oteki alanlar ayni. */
select t.ok((select count(distinct dedupe_key) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 2,
            '4. ADIM: iki kayit FARKLI dedupe_key tasiyor');

/* ---- 5. ADIM: yeni donemde de tekrar kosu sessiz ---- */
select public.bekleyen_basvuru_hatirlatmalari();
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 2,
            '5. ADIM: yeni donemde tekrar kosu SESSIZ');

/* ---- 6. ADIM: SORUMLU ATAMAK YENI DONEM BASLATMIYOR ---- */
--  Sorumluyu kaldirip ayni kisiye geri veriyoruz: net sonuc ayni
--  alici. Donem degismediyse yeni bildirim olmamali.
select t.kimlik('11111111-1111-1111-1111-111111111111');
select public.basvuru_sorumlusu_ata(
  'ddddddd1-0000-0000-0000-000000000001', null,
  '22222222-2222-2222-2222-222222222222');
select public.basvuru_sorumlusu_ata(
  'ddddddd1-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222', null);
select t.yonetici();

select t.ok((select aday_ilerleme_at from public.applications
              where id = 'ddddddd1-0000-0000-0000-000000000001')
            < now() - interval '7 days',
            '6. ADIM: atama donem damgasina DOKUNMADI');

select public.bekleyen_basvuru_hatirlatmalari();
select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 2,
            '6. ADIM: sorumlu atamak YENI HATIRLATMA URETMIYOR');

rollback;

/* ---- Ucuncu donem de aciliyor: kural tek sefere mahsus degil ---- */
begin;
select t.yonetici();
delete from public.notifications where type = 'basvuru_bekliyor';
update public.applications
   set atanan_uye = '22222222-2222-2222-2222-222222222222'
 where id = 'ddddddd1-0000-0000-0000-000000000001';

do $$
declare i integer;
begin
  for i in 1..3 loop
    update public.applications
       set aday_ilerleme_at = clock_timestamp() - interval '8 days'
     where id = 'ddddddd1-0000-0000-0000-000000000001';
    perform public.bekleyen_basvuru_hatirlatmalari();
    /* Sonraki dongu icin gercek ilerleme: damga tazeleniyor. */
    update public.applications
       set company_feedback = 'donem ' || i
     where id = 'ddddddd1-0000-0000-0000-000000000001';
  end loop;
end $$;

select t.ok((select count(*) from public.notifications
              where type = 'basvuru_bekliyor'
                and application_id = 'ddddddd1-0000-0000-0000-000000000001') = 3,
            'UC AYRI DONEM, UC hatirlatma (kural tek sefere mahsus degil)');
rollback;

select 'TUM SINAMALAR GECTI' as sonuc;
