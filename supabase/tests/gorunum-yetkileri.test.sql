-- GÖRÜNÜMLER security_invoker SONRASI — GERÇEK ROLLERLE (12 Ekim 2026)
--
-- Göç: 20261212010000_gorunumler_security_invoker.sql
--   discover_event_occurrence_rows ve firsat_tutar_kuyrugu artık sorgulayanın
--   yetkisiyle okunuyor; alttaki tabloların RLS'i uygulanıyor.
--
-- Bu dosya göçün uygulamadaki sorguları BOZMADIĞINI dört rolle ölçüyor:
--   anon            — ziyaretçi (PostgREST anonim anahtar)
--   authenticated   — öğrenci (rolü 'student')
--   authenticated   — yönetici (profiles.role = 'admin' → is_admin())
--   service_role    — scripts/firsat-tutar-kontrol.mjs (servis anahtarı)
--
-- Sorgular uygulamanın kullandıkları:
--   list_active_discover_events()   SECURITY INVOKER — RLS artık uygulanıyor
--   get_discover_event_by_slug()    SECURITY DEFINER (sahibi postgres) — değişmemeli
--   firsat_tutar_kuyrugu            servis anahtarıyla okunuyor
--
-- Yerel test veritabanında koşuyor; hepsi tek işlem içinde, sonunda
-- ROLLBACK. ÜRETİME UYGULANMIYOR.

\set ON_ERROR_STOP on
set client_min_messages = notice;

create schema if not exists gy;

create or replace function gy.ok(kosul boolean, ad text) returns void
language plpgsql as $$
begin
  if kosul then raise notice 'GECTI  %', ad;
  else raise exception 'DUSTU  %', ad; end if;
end $$;

grant usage on schema gy to anon, authenticated, service_role;
grant execute on all functions in schema gy to anon, authenticated, service_role;

begin;

/* ================================================================== */
/*  FİKSTÜR (postgres olarak)                                          */
/* ================================================================== */

select set_config('request.jwt.claims', '{"role":"service_role"}', true);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('9a000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@gorunum.test', '', now(), now(), now()),
  ('9a000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'yonetici@gorunum.test', '', now(), now(), now())
on conflict (id) do nothing;

/* handle_new_user profil satırını açıyor; rol upsert ile sabitleniyor. */
insert into public.profiles (id, email, role) values
  ('9a000000-0000-4000-8000-000000000001', 'ogrenci@gorunum.test', 'student'::user_role),
  ('9a000000-0000-4000-8000-000000000002', 'yonetici@gorunum.test', 'admin'::user_role)
on conflict (id) do update set role = excluded.role;

/*
  Dört etkinlik. Yönetici eklemesi (import_source_id null) tetikleyiciyle
  'admin:<id>' seansını kendisi açıyor: yayında/taslakta 'scheduled',
  arşivde 'archived'.
    gy-yayinda   yayında, gelecekte      → herkese görünür
    gy-gecmis    yayında, bitmiş         → etkinlik görünür, seans görünmez
    gy-taslak    taslak, gelecekte       → yalnız yönetici
    gy-arsiv     arşiv, gelecekte        → yalnız yönetici
*/
insert into public.discover_events
  (id, slug, title, description, category, city, venue_name, starts_at, ends_at, source_url, status)
values
  ('9b000000-0000-4000-8000-000000000001', 'gy-yayinda', 'GY yayinda', 'a', 'museum', 'Istanbul', 'Mekan',
   now() + interval '2 days', now() + interval '3 days', 'https://ornek.test/1', 'published'),
  ('9b000000-0000-4000-8000-000000000002', 'gy-gecmis', 'GY gecmis', 'a', 'museum', 'Istanbul', 'Mekan',
   now() - interval '10 days', now() - interval '9 days', 'https://ornek.test/2', 'published'),
  ('9b000000-0000-4000-8000-000000000003', 'gy-taslak', 'GY taslak', 'a', 'museum', 'Istanbul', 'Mekan',
   now() + interval '2 days', now() + interval '3 days', 'https://ornek.test/3', 'draft'),
  ('9b000000-0000-4000-8000-000000000004', 'gy-arsiv', 'GY arsiv', 'a', 'museum', 'Istanbul', 'Mekan',
   now() + interval '2 days', now() + interval '3 days', 'https://ornek.test/4', 'archived');

select gy.ok(
  (select count(*) from public.discover_event_occurrences
    where event_id::text like '9b000000-%') = 4,
  'fikstur: her etkinlige tetikleyiciyle bir seans acildi');

/*
  Üç fırsat. Kuyruk = yayında VE tutarı belirsiz/boş.
    gy-kuyrukta    yayında, amount_status null   → kuyrukta
    gy-taslak-f    taslak,  amount_status null   → görünüm süzgeci dışarıda bırakıyor
    gy-kesin       yayında, amount_status kesin  → kuyrukta değil
*/
insert into public.opportunities
  (id, slug, title, organization_name, opportunity_type, source_url, status, amount_status)
values
  ('9c000000-0000-4000-8000-000000000001', 'gy-kuyrukta', 'GY kuyrukta', 'Kurum', 'scholarship',
   'https://ornek.test/f1', 'published', null),
  ('9c000000-0000-4000-8000-000000000002', 'gy-taslak-f', 'GY taslak', 'Kurum', 'scholarship',
   'https://ornek.test/f2', 'draft', null),
  ('9c000000-0000-4000-8000-000000000003', 'gy-kesin', 'GY kesin', 'Kurum', 'scholarship',
   'https://ornek.test/f3', 'published', 'kesin');

/* ================================================================== */
/*  KATALOG: göç uygulanmış mı                                         */
/* ================================================================== */

select gy.ok(
  (select count(*) from pg_class c
    where c.oid in ('public.discover_event_occurrence_rows'::regclass, 'public.firsat_tutar_kuyrugu'::regclass)
      and exists (select 1 from unnest(coalesce(c.reloptions, '{}')) o
                   where lower(o) in ('security_invoker=on', 'security_invoker=true', 'security_invoker=1'))) = 2,
  'katalog: iki gorunum de security_invoker=on');

select gy.ok(
  (select p.prosecdef and pg_get_userbyid(p.proowner) = 'postgres'
     from pg_proc p where p.oid = 'public.get_discover_event_by_slug(text)'::regprocedure),
  'katalog: get_discover_event_by_slug SECURITY DEFINER, sahibi postgres');

select gy.ok(
  (select not p.prosecdef from pg_proc p
    where p.oid = 'public.list_active_discover_events(timestamptz, timestamptz)'::regprocedure),
  'katalog: list_active_discover_events SECURITY INVOKER');

/* ================================================================== */
/*  ANONİM                                                              */
/* ================================================================== */

select set_config('role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select gy.ok(
  (select count(*) from public.discover_event_occurrence_rows where slug like 'gy-%') = 1
  and (select min(slug) from public.discover_event_occurrence_rows where slug like 'gy-%') = 'gy-yayinda',
  'anon: gorunum yalniz yayindaki gelecek seansi donduruyor (sizinti kapandi)');

select gy.ok(
  (select count(*) from public.discover_event_occurrence_rows
    where slug like 'gy-%' and (status <> 'published' or occurrence_status <> 'scheduled')) = 0,
  'anon: taslak/arsiv etkinlik ve arsiv seans gorunumde yok');

select gy.ok(
  (select array_agg(slug order by slug) from public.list_active_discover_events() where slug like 'gy-%')
    = array['gy-yayinda'],
  'anon: list_active_discover_events() hata vermiyor, yayindaki etkinligi donduruyor');

select gy.ok(
  (select count(*) from public.list_active_discover_events(now(), now() + interval '30 days')
    where slug = 'gy-yayinda') = 1,
  'anon: list_active_discover_events(aralik) calisiyor');

select gy.ok(
  (select count(*) from public.get_discover_event_by_slug('gy-yayinda')) = 1,
  'anon: get_discover_event_by_slug yayindaki etkinligi donduruyor');

select gy.ok(
  (select count(*) from public.get_discover_event_by_slug('gy-gecmis')) = 1,
  'anon: get_discover_event_by_slug (DEFINER) gecmis seansli yayindaki etkinligi eskisi gibi donduruyor');

select gy.ok(
  (select count(*) from public.get_discover_event_by_slug('gy-taslak')) = 0
  and (select count(*) from public.get_discover_event_by_slug('gy-arsiv')) = 0,
  'anon: get_discover_event_by_slug taslak/arsiv etkinligi vermiyor');

select gy.ok(
  (select count(*) from public.firsat_tutar_kuyrugu where slug like 'gy-%') = 1,
  'anon: firsat_tutar_kuyrugu yalniz yayindaki fırsatı gosteriyor (onceki davranisla ayni)');

reset role;

/* ================================================================== */
/*  ÖĞRENCİ (authenticated, rol student)                               */
/* ================================================================== */

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select gy.ok(not public.is_admin(), 'ogrenci: is_admin() false');

select gy.ok(
  (select count(*) from public.discover_event_occurrence_rows where slug like 'gy-%') = 1,
  'ogrenci: gorunum anonimle ayni (1 satir)');

select gy.ok(
  (select array_agg(slug order by slug) from public.list_active_discover_events() where slug like 'gy-%')
    = array['gy-yayinda'],
  'ogrenci: list_active_discover_events() calisiyor');

select gy.ok(
  (select count(*) from public.get_discover_event_by_slug('gy-gecmis')) = 1,
  'ogrenci: get_discover_event_by_slug calisiyor');

select gy.ok(
  (select count(*) from public.firsat_tutar_kuyrugu where slug like 'gy-%') = 1,
  'ogrenci: firsat_tutar_kuyrugu 1 satir');

reset role;

/* ================================================================== */
/*  YÖNETİCİ (authenticated, profiles.role = admin)                    */
/* ================================================================== */

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select gy.ok(public.is_admin(), 'yonetici: is_admin() true');

select gy.ok(
  (select count(*) from public.discover_event_occurrence_rows where slug like 'gy-%') = 4,
  'yonetici: gorunum dort seansin hepsini gosteriyor (yonetici politikasi)');

select gy.ok(
  (select array_agg(slug order by slug) from public.list_active_discover_events() where slug like 'gy-%')
    = array['gy-yayinda'],
  'yonetici: list_active_discover_events() yine yalniz yayindakini donduruyor (islev suzgeci)');

select gy.ok(
  (select count(*) from public.get_discover_event_by_slug('gy-taslak')) = 0,
  'yonetici: get_discover_event_by_slug yayinda olmayani vermiyor (islev suzgeci)');

select gy.ok(
  (select count(*) from public.firsat_tutar_kuyrugu where slug like 'gy-%') = 1,
  'yonetici: firsat_tutar_kuyrugu 1 satir (gorunum suzgeci taslagi disarida birakiyor)');

reset role;

/* ================================================================== */
/*  SERVİS ROLÜ (scripts/firsat-tutar-kontrol.mjs)                     */
/* ================================================================== */

select set_config('role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select gy.ok(
  (select array_agg(slug order by slug) from public.firsat_tutar_kuyrugu where slug like 'gy-%')
    = array['gy-kuyrukta'],
  'servis: firsat_tutar_kuyrugu betigin bekledigi satiri donduruyor');

select gy.ok(
  (select count(*) from public.discover_event_occurrence_rows where slug like 'gy-%') = 4,
  'servis: gorunum RLS disinda tum seanslari okuyor');

reset role;

rollback;

drop schema gy cascade;
