-- KAPANMIŞ İLANA BAŞVURU VERİTABANINDA REDDEDİLİYOR (12 Ekim 2026)
--
-- Neden: ilan sayfaları kenarda önbelleğe alınıyor (60 sn taze + 300 sn
-- bayat). İlan kapandıktan sonra bir ziyaretçi kısa süre eski sayfayı
-- görebilir; ayrıca açık bir sekme saatlerce eski durumda kalabilir.
-- Önbellekteki HTML'de başvuru formu yok, ama başvuruyu durduran asıl
-- kapı istemci değil VERİTABANI olmalı. Bu dosya o kapıyı sınıyor:
--
--   politika "ogrenci basvuru yapar" (applications, INSERT, WITH CHECK)
--     student_id = auth.uid()
--     ilan status = 'published'
--     application_deadline boş ya da bugün/sonrası
--     başvuran ilanın şirketinin üyesi değil
--
-- Her red denemesinden sonra AYNI yükle açık ilana ekleme yapılıyor:
-- reddin yükteki bir hatadan değil, ilan durumundan geldiği görülsün.
--
-- Yerel test veritabanında koşuyor; tek işlem, sonunda ROLLBACK.
-- ÜRETİME UYGULANMIYOR.

\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;

create or replace function pg_temp.bekle(kosul boolean, ad text)
returns void language plpgsql as $$
begin
  if not kosul then raise exception 'DUSTU  %', ad; end if;
  raise notice 'GECTI  %', ad;
end $$;

/*
  Ekleme RLS ile mi reddedildi? Yalnız satır güvenliği hatası (42501)
  "reddedildi" sayılıyor; kısıt ya da yazım hatası testi yanlışlıkla
  geçirmesin.
*/
create or replace function pg_temp.rls_reddi_mi(ilan uuid)
returns boolean language plpgsql as $$
begin
  insert into public.applications
    (listing_id, student_id, match_score, application_method, email_delivery_status, created_via)
  values (ilan, '9d000000-0000-4000-8000-00000000000c', 50, 'internal', 'not_required', 'web');
  return false;
exception
  when insufficient_privilege then return true;
end $$;

create or replace function pg_temp.basvuru_sayisi(ilan uuid)
returns bigint language sql as $$
  select count(*) from public.applications
   where listing_id = ilan and student_id = '9d000000-0000-4000-8000-00000000000c'
$$;

grant execute on function pg_temp.bekle(boolean, text) to authenticated;
grant execute on function pg_temp.rls_reddi_mi(uuid) to authenticated;
grant execute on function pg_temp.basvuru_sayisi(uuid) to authenticated;

/* ================================================================== */
/*  FİKSTÜR                                                            */
/* ================================================================== */

select set_config('request.jwt.claims', '{"role":"service_role"}', true);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('9d000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sirket@kapali.test', '', now(), now(), now()),
  ('9d000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@kapali.test', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, email, role) values
  ('9d000000-0000-4000-8000-00000000000a', 'sirket@kapali.test', 'company'::user_role),
  ('9d000000-0000-4000-8000-00000000000c', 'ogrenci@kapali.test', 'student'::user_role)
on conflict (id) do update set role = excluded.role;

insert into public.companies (id, name, slug, verified, origin, website_url) values
  ('9e000000-0000-4000-8000-000000000001', 'Kapali Test', 'kapali-test-sirket', true, 'manual', 'https://kapali.test');

insert into public.company_members (company_id, user_id, recruiter_role, is_owner) values
  ('9e000000-0000-4000-8000-000000000001', '9d000000-0000-4000-8000-00000000000a', 'Owner', true);

/*
    ...01  yayında, süresiz                 → AÇIK (kontrol grubu)
    ...02  yayında, sonra 'closed' yapılan  → önbellekte açık görünen ilan
    ...03  'archived'
    ...04  'draft'
    ...05  yayında, son gün dün             → süresi dolmuş
    ...06  yayında, son gün bugün           → AÇIK (sınır günü)
*/
insert into public.listings (id, company_id, title, status, origin, application_method, application_deadline) values
  ('9f000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000001', 'Acik', 'published', 'employer_posted', 'internal', null),
  ('9f000000-0000-4000-8000-000000000002', '9e000000-0000-4000-8000-000000000001', 'Kapanacak', 'published', 'employer_posted', 'internal', null),
  ('9f000000-0000-4000-8000-000000000003', '9e000000-0000-4000-8000-000000000001', 'Arsiv', 'archived', 'employer_posted', 'internal', null),
  ('9f000000-0000-4000-8000-000000000004', '9e000000-0000-4000-8000-000000000001', 'Taslak', 'draft', 'employer_posted', 'internal', null),
  ('9f000000-0000-4000-8000-000000000005', '9e000000-0000-4000-8000-000000000001', 'Suresi dolmus', 'published', 'employer_posted', 'internal', current_date - 1),
  ('9f000000-0000-4000-8000-000000000006', '9e000000-0000-4000-8000-000000000001', 'Son gun bugun', 'published', 'employer_posted', 'internal', current_date);

/* Öğrenci sayfayı açtıktan sonra şirket ilanı kapatıyor. */
update public.listings set status = 'closed' where id = '9f000000-0000-4000-8000-000000000002';

/* ================================================================== */
/*  ÖĞRENCİ OLARAK BAŞVURU DENEMELERİ                                  */
/* ================================================================== */

select set_config('request.jwt.claims',
  '{"sub":"9d000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
set local role authenticated;

select pg_temp.bekle(
  (select count(*) from public.listings where id = '9f000000-0000-4000-8000-000000000002') = 0,
  'ogrenci: kapanan ilan canli okumada artik gelmiyor (istemci "kapali" ciziyor)');

select pg_temp.bekle(pg_temp.rls_reddi_mi('9f000000-0000-4000-8000-000000000002'),
  'kapanan (closed) ilana basvuru RLS ile reddedildi');
select pg_temp.bekle(pg_temp.rls_reddi_mi('9f000000-0000-4000-8000-000000000003'),
  'arsivlenmis ilana basvuru reddedildi');
select pg_temp.bekle(pg_temp.rls_reddi_mi('9f000000-0000-4000-8000-000000000004'),
  'taslak ilana basvuru reddedildi');
select pg_temp.bekle(pg_temp.rls_reddi_mi('9f000000-0000-4000-8000-000000000005'),
  'son basvuru gunu gecmis ilana basvuru reddedildi');

/* Kontrol grubu: aynı yük açık ilanlarda kabul ediliyor. */
select pg_temp.bekle(not pg_temp.rls_reddi_mi('9f000000-0000-4000-8000-000000000001'),
  'ayni yukle acik ilana basvuru KABUL edildi (red yukten degil ilan durumundan)');
select pg_temp.bekle(not pg_temp.rls_reddi_mi('9f000000-0000-4000-8000-000000000006'),
  'son gunu bugun olan ilana basvuru KABUL edildi');

reset role;

select pg_temp.bekle(
  pg_temp.basvuru_sayisi('9f000000-0000-4000-8000-000000000002')
  + pg_temp.basvuru_sayisi('9f000000-0000-4000-8000-000000000003')
  + pg_temp.basvuru_sayisi('9f000000-0000-4000-8000-000000000004')
  + pg_temp.basvuru_sayisi('9f000000-0000-4000-8000-000000000005') = 0,
  'kapali ilanlarda hic basvuru satiri olusmadi');
select pg_temp.bekle(
  pg_temp.basvuru_sayisi('9f000000-0000-4000-8000-000000000001') = 1,
  'acik ilanda tek basvuru satiri var');

rollback;
