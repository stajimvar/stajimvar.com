-- PROFİL KOPYASI TAŞIMA TESTİ — 1/2: GÖÇ ÖNCESİ KURULUM
--
-- 20261203010000 mevcut kopyaları `applications.profile_snapshot`
-- sütunundan korumalı tabloya taşıyor. Bu test o taşımayı ÜRETİMDEKİ
-- gibi ölçüyor: veri ÖNCE eski şemada kuruluyor, göç SONRA uygulanıyor.
--
-- Yerel test veritabanında, iki aşamalı koşuyor (CI'da değil — CI her
-- koşuda şemayı tek seferde sıfırdan kuruyor):
--
--   supabase db reset --local --no-seed --version 20261202010000
--   psql ... -f supabase/tests/profil-kopyasi-tasima-oncesi.sql
--   supabase migration up --local
--   psql ... -f supabase/tests/profil-kopyasi-tasima-sonrasi.sql
--
-- Veri KURGU (@ornek.test). Üretimin biçimine benziyor: site içi ve dış
-- başvuru, rızalı ve rızasız, eski açık teklif, görüntülenmiş başvuru.

\set ON_ERROR_STOP on
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.basvuru_profil_kopyalari') is not null then
    raise exception 'Bu betik 20261203010000 ONCESI semada kosmali (korumali tablo zaten var).';
  end if;
end $$;

create schema if not exists goc_testi;
drop table if exists goc_testi.once;

begin;

do $$
declare k uuid;
begin
  foreach k in array array[
    '0a000000-0000-4000-8000-0000000000a1'::uuid,  -- T1 sahibi
    '0a000000-0000-4000-8000-0000000000a2'::uuid,  -- T2 sahibi (dogrulanmamis)
    '0a000000-0000-4000-8000-0000000000b1'::uuid,  -- ogrenci 1
    '0a000000-0000-4000-8000-0000000000b2'::uuid,  -- ogrenci 2
    '0a000000-0000-4000-8000-0000000000b3'::uuid   -- ogrenci 3
  ] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at)
    values (k, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            k::text || '@ornek.test', '', now(), now(), now())
    on conflict (id) do nothing;
    insert into public.profiles (id, email, full_name, phone)
    values (k, k::text || '@ornek.test', 'Gecis ' || right(k::text, 2), '+90 500 000 00 00')
    on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone;
  end loop;
end $$;

insert into public.student_profiles (id) values
  ('0a000000-0000-4000-8000-0000000000b1'),
  ('0a000000-0000-4000-8000-0000000000b2'),
  ('0a000000-0000-4000-8000-0000000000b3')
on conflict (id) do nothing;

insert into public.companies (id, name, slug, verified) values
  ('0c000000-0000-4000-8000-0000000000c1', 'Gecis Testi Sirketi', 'gecis-testi-1', true),
  ('0c000000-0000-4000-8000-0000000000c2', 'Gecis Testi Dogrulanmamis', 'gecis-testi-2', false)
on conflict (id) do nothing;

insert into public.company_members (company_id, user_id, is_owner, recruiter_role) values
  ('0c000000-0000-4000-8000-0000000000c1', '0a000000-0000-4000-8000-0000000000a1', true, 'Owner'),
  ('0c000000-0000-4000-8000-0000000000c2', '0a000000-0000-4000-8000-0000000000a2', true, 'Owner')
on conflict do nothing;

/* Dış ilan `apply_url` istiyor (listings_external_method_requires_url). */
insert into public.listings (id, company_id, title, status, application_method, apply_url) values
  ('0d000000-0000-4000-8000-0000000000d1', '0c000000-0000-4000-8000-0000000000c1', 'Gecis Ic Ilan', 'draft', 'internal', null),
  ('0d000000-0000-4000-8000-0000000000d2', '0c000000-0000-4000-8000-0000000000c1', 'Gecis Dis Ilan', 'draft', 'external', 'https://ornek.test/basvur'),
  ('0d000000-0000-4000-8000-0000000000d3', '0c000000-0000-4000-8000-0000000000c2', 'Gecis Dogrulanmamis Ilan', 'draft', 'internal', null)
on conflict (id) do nothing;

/*
  ALTI BAŞVURU. Tarih alanları açıkça yazılıyor ki taşımadan sonra
  "değişmedi" iddiası gerçek bir değerle karşılaştırılsın.
    e1  ic   · riza v1 · kopya VAR · goruntulenmis
    e2  ic   · riza YOK · kopya YOK
    e3  dis  · riza v1 · kopya VAR (eski dis riza)
    e4  ic   · riza v2 · kopya VAR · eski acik teklif
    e5  ic   · riza v1 · kopya VAR · geri cekilmis
    e6  ic   · dogrulanmamis sirket · riza v2 · kopya VAR
*/
insert into public.applications
  (id, listing_id, student_id, status, application_method, applied_at, updated_at,
   status_changed_at, ilk_goruntulenme_at, contact_share_consent_at, contact_share_consent_version,
   offer_note, profile_snapshot)
values
  ('0e000000-0000-4000-8000-0000000000e1', '0d000000-0000-4000-8000-0000000000d1', '0a000000-0000-4000-8000-0000000000b1',
   'under_review', 'internal', '2026-08-01 09:00+00', '2026-08-05 10:00+00', '2026-08-05 10:00+00', '2026-08-03 12:00+00',
   '2026-08-01 09:00+00', '2026-08-v1', null,
   '{"ad":"Gecis Bir","universite":"Ornek Universitesi","projeler":[{"baslik":"Proje","aciklama":"Aciklama"}]}'),
  ('0e000000-0000-4000-8000-0000000000e2', '0d000000-0000-4000-8000-0000000000d1', '0a000000-0000-4000-8000-0000000000b2',
   'submitted', 'internal', '2026-08-02 09:00+00', '2026-08-02 09:00+00', null, null,
   null, null, null, null),
  ('0e000000-0000-4000-8000-0000000000e3', '0d000000-0000-4000-8000-0000000000d2', '0a000000-0000-4000-8000-0000000000b1',
   'submitted', 'external', '2026-08-03 09:00+00', '2026-08-03 09:00+00', null, null,
   '2026-08-03 09:00+00', '2026-08-v1', null, '{"ad":"Gecis Bir"}'),
  ('0e000000-0000-4000-8000-0000000000e4', '0d000000-0000-4000-8000-0000000000d1', '0a000000-0000-4000-8000-0000000000b3',
   'offer_extended', 'internal', '2026-08-04 09:00+00', '2026-08-20 10:00+00', '2026-08-20 10:00+00', '2026-08-06 08:00+00',
   '2026-08-04 09:00+00', '2026-09-v2', 'Eski teklif notu', '{"ad":"Gecis Uc","bolum":"Ornek Bolum"}'),
  ('0e000000-0000-4000-8000-0000000000e5', '0d000000-0000-4000-8000-0000000000d2', '0a000000-0000-4000-8000-0000000000b2',
   'withdrawn', 'internal', '2026-08-05 09:00+00', '2026-08-07 09:00+00', '2026-08-07 09:00+00', null,
   '2026-08-05 09:00+00', '2026-08-v1', null, '{"ad":"Gecis Iki"}'),
  ('0e000000-0000-4000-8000-0000000000e6', '0d000000-0000-4000-8000-0000000000d3', '0a000000-0000-4000-8000-0000000000b3',
   'submitted', 'internal', '2026-08-06 09:00+00', '2026-08-06 09:00+00', null, null,
   '2026-08-06 09:00+00', '2026-09-v2', null, '{"ad":"Gecis Uc"}')
on conflict (id) do nothing;

/* PARMAK İZİ: taşımadan sonra birebir karşılaştırılacak alanlar. */
create table goc_testi.once as
select a.id, a.status::text as status, a.applied_at, a.updated_at, a.status_changed_at,
       a.ilk_goruntulenme_at, a.aday_ilerleme_at, a.contact_share_consent_at,
       a.contact_share_consent_version, a.offer_note, a.profile_snapshot as kopya
  from public.applications a
 where a.id::text like '0e000000-%';

commit;

select 'ONCESI KURULDU: ' || count(*) || ' basvuru, ' || count(kopya) || ' kopya' as sonuc
  from goc_testi.once;
