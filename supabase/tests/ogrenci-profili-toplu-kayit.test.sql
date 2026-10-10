-- ÖĞRENCİ PROFİLİ TOPLU KAYIT — GERÇEK ROLLERLE (20261207010000)
--
-- Yerel test veritabanında koşuyor. ÜRETİME UYGULANMIYOR.
--
-- Sınanan kurallar: kayıt tek işlemde (bir parça hata verirse hiçbiri
-- yazılmıyor), yalnız çağıranın kendi satırları, listede olmayan sütun
-- reddediliyor, doğrulanmış beceri ve dil satırları korunuyor, anonim
-- çağıramıyor.

\set ON_ERROR_STOP on
set client_min_messages = notice;

create schema if not exists t;

create or replace function t.ok(kosul boolean, ad text) returns void
language plpgsql as $$
begin
  if kosul then raise notice 'GECTI  %', ad;
  else raise exception 'DUSTU  %', ad; end if;
end $$;

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
  perform set_config('request.jwt.claims', '{}', true);
end $$;

/* Çağrı hata vermeli; verdiği hata metni döner (vermezse test düşer). */
create or replace function t.hata(yuk jsonb) returns text
language plpgsql as $$
begin
  perform public.ogrenci_profilini_kaydet(yuk);
  raise exception 'DUSTU  beklenen hata gelmedi: %', yuk;
exception when others then
  if sqlerrm like 'DUSTU%' then raise; end if;
  return sqlerrm;
end $$;

grant usage on schema t to authenticated, anon;
grant execute on all functions in schema t to authenticated, anon;

/* ================================================================== */
/*  FİKSTÜR (kurgu; @ornek.test)                                       */
/* ================================================================== */

begin;

do $$
declare k uuid;
begin
  foreach k in array array[
    'fa000001-0000-4000-8000-000000000001'::uuid,  -- ogrenci A
    'fa000002-0000-4000-8000-000000000002'::uuid   -- ogrenci B
  ] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at)
    values (k, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            k::text || '@ornek.test', '', now(), now(), now())
    on conflict (id) do nothing;
    insert into public.profiles (id, email, full_name)
    values (k, k::text || '@ornek.test', 'Kayit ' || right(k::text, 2))
    on conflict (id) do update set full_name = excluded.full_name;
  end loop;
end $$;

insert into public.student_profiles (id, bio) values
  ('fa000001-0000-4000-8000-000000000001', 'Ilk hali'),
  ('fa000002-0000-4000-8000-000000000002', 'B ilk hali')
on conflict (id) do update set bio = excluded.bio;

/* Testle doğrulanmış beceri ve dil: yalnız sunucu (yönetici) yazabiliyor. */
insert into public.student_skills (student_id, name, level, verified) values
  ('fa000001-0000-4000-8000-000000000001', 'Excel', 'Advanced', true),
  ('fa000001-0000-4000-8000-000000000001', 'Canva', 'Beginner', false);
insert into public.student_languages (student_id, language, level, verified) values
  ('fa000001-0000-4000-8000-000000000001', 'İngilizce', 'B2', true);

/* ------------------------------------------------- tam yük, tek işlem */
select t.kimlik('fa000001-0000-4000-8000-000000000001');
select public.ogrenci_profilini_kaydet(jsonb_build_object(
  'profil', jsonb_build_object('full_name', 'Deniz Ornek', 'phone', '05550000000'),
  'ogrenci', jsonb_build_object(
    'bio', 'Yeni hakkimda', 'city', 'İstanbul', 'university', 'Ornek Universitesi',
    'department', 'Giyim Uretim Teknolojisi', 'education_level', 'on_lisans',
    'education_start_year', 2024, 'education_ongoing', true,
    'interests', jsonb_build_array('Spor', 'Seyahat'), 'cv_gizli', jsonb_build_array('telefon')),
  'yetenekler', jsonb_build_array(
    jsonb_build_object('name', 'Excel', 'level', 'Beginner', 'category', 'General'),
    jsonb_build_object('name', 'Figma', 'level', 'Intermediate', 'category', 'General')),
  'diller', jsonb_build_array(
    jsonb_build_object('language', 'İngilizce', 'level', 'A1', 'proficiency_text', 'A1'),
    jsonb_build_object('language', 'Türkçe', 'level', 'Ana dil', 'proficiency_text', 'Ana dil')),
  'projeler', jsonb_build_array(jsonb_build_object('title', 'Proje 1', 'tech_stack', jsonb_build_array('Kalip'), 'sort_order', 0)),
  'deneyimler', jsonb_build_array(
    jsonb_build_object('position', 'Satis danismani', 'organization', 'Ornek Magaza', 'start_year', 2023,
                       'start_month', 8, 'ongoing', true, 'employment_type', 'yari_zamanli', 'sort_order', 0),
    jsonb_build_object('position', 'Stajyer', 'organization', 'Ornek Atolye', 'start_year', 2022,
                       'start_month', 6, 'end_year', 2022, 'end_month', 9, 'ongoing', false, 'sort_order', 1)),
  'egitimler', jsonb_build_array(jsonb_build_object('school', 'Ornek Lisesi', 'level', 'lise', 'start_year', 2019,
                                                     'end_year', 2023, 'ongoing', false, 'gpa', 88.5, 'sort_order', 0)),
  'sertifikalar', jsonb_build_array(jsonb_build_object('name', 'Girisimcilik', 'issuer', 'Ornek Ajans',
                                                        'issue_year', 2026, 'url', 'https://ornek.test/dogrula', 'sort_order', 0))
));

select t.ok((select full_name = 'Deniz Ornek' and phone = '05550000000' from public.profiles
              where id = 'fa000001-0000-4000-8000-000000000001'), 'profiles alanlari yazildi');
select t.ok((select bio = 'Yeni hakkimda' and education_level = 'on_lisans' and education_ongoing
                    and interests = array['Spor','Seyahat'] and cv_gizli = array['telefon']
               from public.student_profiles where id = 'fa000001-0000-4000-8000-000000000001'),
            'student_profiles alanlari yazildi');
select t.ok((select count(*) from public.student_experiences where student_id = 'fa000001-0000-4000-8000-000000000001') = 2,
            'iki deneyim yazildi');
select t.ok((select count(*) from public.student_educations where student_id = 'fa000001-0000-4000-8000-000000000001') = 1
        and (select count(*) from public.student_certificates where student_id = 'fa000001-0000-4000-8000-000000000001') = 1
        and (select count(*) from public.student_projects where student_id = 'fa000001-0000-4000-8000-000000000001') = 1,
            'egitim, sertifika ve proje yazildi');

/* Doğrulanmış satırlar korunuyor; çıkarılan siliniyor, yeni ekleniyor. */
select t.ok((select verified and level = 'Advanced' from public.student_skills
              where student_id = 'fa000001-0000-4000-8000-000000000001' and name = 'Excel'),
            'dogrulanmis beceri korunuyor (silinmedi, seviyesi degismedi)');
select t.ok(not exists (select 1 from public.student_skills
              where student_id = 'fa000001-0000-4000-8000-000000000001' and name = 'Canva'),
            'listeden cikarilan beceri silindi');
select t.ok((select level = 'Intermediate' and not verified from public.student_skills
              where student_id = 'fa000001-0000-4000-8000-000000000001' and name = 'Figma'),
            'yeni beceri dogrulanmamis eklendi');
select t.ok((select verified and level = 'B2' from public.student_languages
              where student_id = 'fa000001-0000-4000-8000-000000000001' and language = 'İngilizce'),
            'dogrulanmis dilin seviyesi degismedi');
select t.ok(exists (select 1 from public.student_languages
              where student_id = 'fa000001-0000-4000-8000-000000000001' and language = 'Türkçe' and level = 'Ana dil'),
            'yeni dil eklendi');

/* ----------------------------------------- bir parça hata → hiçbiri */
select t.ok(t.hata(jsonb_build_object(
  'ogrenci', jsonb_build_object('bio', 'Yarim kalmamali'),
  'deneyimler', '[]'::jsonb,
  'sertifikalar', jsonb_build_array(jsonb_build_object('name', 'Kotu', 'url', 'javascript:alert(1)'))
)) is not null, 'gecersiz sertifika adresi reddedildi');
select t.ok((select bio = 'Yeni hakkimda' from public.student_profiles where id = 'fa000001-0000-4000-8000-000000000001'),
            'hata olunca hakkimda yazilmadi (tek islem)');
select t.ok((select count(*) from public.student_experiences where student_id = 'fa000001-0000-4000-8000-000000000001') = 2,
            'hata olunca deneyimler silinmedi (tek islem)');

/* ------------------------------------------- liste dışı alan reddi */
select t.ok(t.hata('{"profil": {"role": "admin"}}') like 'Bu alan güncellenemez%', 'rol degistirilemiyor');
select t.ok(t.hata('{"ogrenci": {"earned_badges": ["sahte"]}}') like 'Bu alan güncellenemez%', 'rozet yazilamiyor');
select t.ok(t.hata('{"baska": {}}') like 'Bilinmeyen bölüm%', 'bilinmeyen bolum reddedildi');
/* `verified` yükte olsa da yazılmıyor: ekleme sütun listesinde yok. */
select public.ogrenci_profilini_kaydet(
  '{"yetenekler": [{"name": "Excel"}, {"name": "Figma"}, {"name": "Hile", "verified": true}]}');
select t.ok(exists (select 1 from public.student_skills where name = 'Hile' and not verified),
            'beceri dogrulanmis olarak yazilamiyor');

/* ------------------------------------------------- başkasının satırı */
select t.kimlik('fa000002-0000-4000-8000-000000000002');
select public.ogrenci_profilini_kaydet('{"ogrenci": {"bio": "B yeni"}, "deneyimler": []}');
select t.yonetici();
select t.ok((select bio = 'Yeni hakkimda' from public.student_profiles where id = 'fa000001-0000-4000-8000-000000000001')
        and (select count(*) from public.student_experiences where student_id = 'fa000001-0000-4000-8000-000000000001') = 2,
            'B kendi kaydiyla A''ya dokunamadi');
select t.ok((select bio = 'B yeni' from public.student_profiles where id = 'fa000002-0000-4000-8000-000000000002'),
            'B kendi profilini yazdi');

/* ------------------------------------------- tarayıcının gerçek yükü */
/*
  supabase/tests/veri/profil-kayit-yuku.json istemci koduyla üretiliyor
  (scripts/profil-kayit-yuku-ornegi.mjs; `npm test` dosyanın güncel
  olduğunu denetliyor). Biçim işlevle ayrışırsa burada düşer.
*/
\set istemci_yuku `cat supabase/tests/veri/profil-kayit-yuku.json`
select t.kimlik('fa000002-0000-4000-8000-000000000002');
select public.ogrenci_profilini_kaydet(:'istemci_yuku'::jsonb);
select t.yonetici();
select t.ok((select full_name = 'Deniz Yılmaz' and phone = '0555 123 45 67' and interface_language = 'tr'
               from public.profiles where id = 'fa000002-0000-4000-8000-000000000002'), 'istemci yuku: profiles');
select t.ok((select education_level = 'on_lisans' and education_ongoing and gpa = 3.25 and grade_level::text = '2. Sınıf'
                    and pref_work_type::text = 'Hybrid' and pref_uni_provides_insurance and cv_gizli = array['telefon']
                    and linkedin_url = 'https://linkedin.com/in/deniz'
               from public.student_profiles where id = 'fa000002-0000-4000-8000-000000000002'), 'istemci yuku: student_profiles');
select t.ok((select count(*) from public.student_experiences where student_id = 'fa000002-0000-4000-8000-000000000002') = 2
        and (select count(*) from public.student_educations where student_id = 'fa000002-0000-4000-8000-000000000002') = 1
        and (select count(*) from public.student_projects where student_id = 'fa000002-0000-4000-8000-000000000002') = 1
        and (select count(*) from public.student_certificates where student_id = 'fa000002-0000-4000-8000-000000000002') = 1
        and (select count(*) from public.student_skills where student_id = 'fa000002-0000-4000-8000-000000000002') = 2
        and (select count(*) from public.student_languages where student_id = 'fa000002-0000-4000-8000-000000000002') = 2,
            'istemci yuku: butun cocuk tablolar yazildi');

/* ------------------------------------------------------------ anonim */
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  perform public.ogrenci_profilini_kaydet('{"ogrenci": {"bio": "anon"}}');
  raise exception 'DUSTU  anonim cagirabildi';
exception when insufficient_privilege then
  raise notice 'GECTI  anonim cagiramiyor';
end $$;

rollback;

select 'OGRENCI PROFILI TOPLU KAYIT: TUM SINAMALAR GECTI' as sonuc;
