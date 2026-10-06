-- ÖĞRENCİ DENEYİMLERİ — GERÇEK ROLLERLE (20261205010000)
--
-- Yerel test veritabanında koşuyor. ÜRETİME UYGULANMIYOR.
--
--   docker exec -i supabase_db_<ref> psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f /dev/stdin < supabase/tests/ogrenci-deneyimleri.test.sql
--
-- Sınanan kural: deneyimi yalnız sahibi okur/yazar; şirket tabloyu doğrudan
-- okuyamaz, yalnız paylaşımı etkin başvuruda `basvuru_aday_guncel_profili`
-- üzerinden görür. Tarih kuralları ve üst sınır sunucuda.

\set ON_ERROR_STOP on
set client_min_messages = notice;

create schema if not exists d;

create or replace function d.ok(kosul boolean, ad text) returns void
language plpgsql as $$
begin
  if kosul then raise notice 'GECTI  %', ad;
  else raise exception 'DUSTU  %', ad; end if;
end $$;

create or replace function d.kimlik(p uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p::text, 'role', 'authenticated')::text, true);
end $$;

create or replace function d.anonim() returns void
language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{}', true);
end $$;

create or replace function d.yonetici() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{}', true);
end $$;

grant usage on schema d to authenticated, anon;
grant execute on all functions in schema d to authenticated, anon;

/* ================================================================== */
/*  FİKSTÜR (kurgu; @ornek.test)                                       */
/* ================================================================== */

begin;

do $$
declare k uuid;
begin
  foreach k in array array[
    'de000001-0000-4000-8000-000000000001'::uuid,  -- A sahibi (Owner)
    'de000002-0000-4000-8000-000000000002'::uuid,  -- A recruiter
    'de000003-0000-4000-8000-000000000003'::uuid,  -- A viewer
    'de000004-0000-4000-8000-000000000004'::uuid,  -- B sahibi (baska sirket)
    'de000005-0000-4000-8000-000000000005'::uuid,  -- C sahibi (DOGRULANMAMIS)
    'de000006-0000-4000-8000-000000000006'::uuid,  -- ogrenci 1 (deneyimli)
    'de000007-0000-4000-8000-000000000007'::uuid   -- ogrenci 2
  ] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at)
    values (k, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            k::text || '@ornek.test', '', now(), now(), now())
    on conflict (id) do nothing;
    insert into public.profiles (id, email, full_name)
    values (k, k::text || '@ornek.test', 'Deneyim ' || right(k::text, 2))
    on conflict (id) do update set full_name = excluded.full_name;
  end loop;
end $$;

insert into public.student_profiles (id) values
  ('de000006-0000-4000-8000-000000000006'),
  ('de000007-0000-4000-8000-000000000007')
on conflict (id) do nothing;

insert into public.companies (id, name, slug, verified) values
  ('de00000a-0000-4000-8000-00000000000a', 'Deneyim Testi A Sirketi', 'deneyim-testi-a', true),
  ('de00000b-0000-4000-8000-00000000000b', 'Deneyim Testi B Sirketi', 'deneyim-testi-b', true),
  ('de00000c-0000-4000-8000-00000000000c', 'Deneyim Testi C Sirketi', 'deneyim-testi-c', false)
on conflict (id) do nothing;

insert into public.company_members (company_id, user_id, is_owner, recruiter_role) values
  ('de00000a-0000-4000-8000-00000000000a', 'de000001-0000-4000-8000-000000000001', true,  'Owner'),
  ('de00000a-0000-4000-8000-00000000000a', 'de000002-0000-4000-8000-000000000002', false, 'Recruiter'),
  ('de00000a-0000-4000-8000-00000000000a', 'de000003-0000-4000-8000-000000000003', false, 'Viewer'),
  ('de00000b-0000-4000-8000-00000000000b', 'de000004-0000-4000-8000-000000000004', true,  'Owner'),
  ('de00000c-0000-4000-8000-00000000000c', 'de000005-0000-4000-8000-000000000005', true,  'Owner')
on conflict do nothing;

insert into public.listings (id, company_id, title, status, application_method, apply_url) values
  ('de0000a1-0000-4000-8000-0000000000a1', 'de00000a-0000-4000-8000-00000000000a', 'Deneyim A ilani', 'draft', 'internal', null),
  ('de0000a2-0000-4000-8000-0000000000a2', 'de00000a-0000-4000-8000-00000000000a', 'Deneyim A ikinci', 'draft', 'internal', null),
  ('de0000a3-0000-4000-8000-0000000000a3', 'de00000a-0000-4000-8000-00000000000a', 'Deneyim A dis', 'draft', 'external', 'https://ornek.test/basvur'),
  ('de0000c1-0000-4000-8000-0000000000c1', 'de00000c-0000-4000-8000-00000000000c', 'Deneyim C ilani', 'draft', 'internal', null)
on conflict (id) do nothing;

/*
  DÖRT BAŞVURU (ogrenci 1):
    p1  A · internal · riza VAR          → deneyim acilmali
    p2  A · internal · riza YOK          → acilmamali
    p3  A · external · eski riza surumu  → acilmamali (kapsam yetmez)
    p4  C · dogrulanmamis sirket, riza   → hic okunamamali
*/
insert into public.applications
  (id, listing_id, student_id, status, applied_at, application_method,
   contact_share_consent_at, contact_share_consent_version)
values
  ('de00a001-0000-4000-8000-00000000a001', 'de0000a1-0000-4000-8000-0000000000a1',
   'de000006-0000-4000-8000-000000000006', 'submitted', now() - interval '3 days',
   'internal', now() - interval '3 days', '2026-10-sade-v1'),
  ('de00a002-0000-4000-8000-00000000a002', 'de0000a2-0000-4000-8000-0000000000a2',
   'de000006-0000-4000-8000-000000000006', 'submitted', now() - interval '2 days',
   'internal', null, null),
  ('de00a003-0000-4000-8000-00000000a003', 'de0000a3-0000-4000-8000-0000000000a3',
   'de000006-0000-4000-8000-000000000006', 'submitted', now() - interval '2 days',
   'external', now() - interval '2 days', '2026-08-v1'),
  ('de00c001-0000-4000-8000-00000000c001', 'de0000c1-0000-4000-8000-0000000000c1',
   'de000006-0000-4000-8000-000000000006', 'submitted', now() - interval '1 days',
   'internal', now() - interval '1 days', '2026-10-sade-v1')
on conflict (id) do nothing;

commit;

/* ================================================================== */
/*  1) ÖĞRENCİ KENDİ DENEYİMİNİ YAZAR VE OKUR                          */
/* ================================================================== */

/* Yeniden koşulabilir: önceki koşunun satırları temizleniyor. */
begin;
select d.yonetici();
delete from public.student_experiences
 where student_id in ('de000006-0000-4000-8000-000000000006', 'de000007-0000-4000-8000-000000000007');
commit;

begin;
select d.kimlik('de000006-0000-4000-8000-000000000006');
insert into public.student_experiences
  (student_id, position, organization, start_year, start_month, end_year, end_month, ongoing, description, sort_order)
values
  ('de000006-0000-4000-8000-000000000006', 'Tasarim stajyeri', 'Ornek Ajans', 2025, 6, 2025, 9, false, 'Arayuz taslaklari hazirladim.', 0),
  ('de000006-0000-4000-8000-000000000006', 'Gonullu egitmen', 'Ornek Dernek', 2026, 2, null, null, true, null, 1);
select d.ok((select count(*) from public.student_experiences) = 2, 'ogrenci kendi iki deneyimini okuyor');
update public.student_experiences set description = 'Guncel aciklama' where position = 'Tasarim stajyeri';
select d.ok((select description from public.student_experiences where position = 'Tasarim stajyeri') = 'Guncel aciklama',
            'ogrenci kendi deneyimini guncelliyor');
commit;

/* Başka öğrencinin adına yazamaz. */
begin;
select d.kimlik('de000007-0000-4000-8000-000000000007');
do $$
begin
  insert into public.student_experiences (student_id, position, organization, start_year, start_month, ongoing)
  values ('de000006-0000-4000-8000-000000000006', 'Sahte', 'Sahte', 2025, 1, true);
  raise exception 'DUSTU  baska ogrencinin adina deneyim yazilabildi';
exception when insufficient_privilege then
  raise notice 'GECTI  baska ogrencinin adina deneyim yazilamiyor (RLS)';
end $$;
select d.ok((select count(*) from public.student_experiences) = 0, 'ogrenci 2 ogrenci 1in deneyimlerini goremiyor');
update public.student_experiences set position = 'Ele gecirildi';
delete from public.student_experiences;
rollback;

begin;
select d.yonetici();
select d.ok((select count(*) from public.student_experiences
              where student_id = 'de000006-0000-4000-8000-000000000006'
                and position = 'Tasarim stajyeri') = 1,
            'ogrenci 2 baskasinin deneyimini degistiremedi ve silemedi');
commit;

/* Anonim tabloyu hiç okuyamaz. */
begin;
select d.anonim();
do $$
begin
  perform count(*) from public.student_experiences;
  raise exception 'DUSTU  anonim deneyim tablosunu okuyabildi';
exception when insufficient_privilege then
  raise notice 'GECTI  anonim deneyim tablosunu okuyamiyor';
end $$;
rollback;

/* ================================================================== */
/*  2) ŞİRKET TABLOYU DOĞRUDAN OKUYAMAZ                                */
/* ================================================================== */

do $$
declare u uuid;
begin
  foreach u in array array[
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de000002-0000-4000-8000-000000000002'::uuid,
    'de000003-0000-4000-8000-000000000003'::uuid,
    'de000004-0000-4000-8000-000000000004'::uuid,
    'de000005-0000-4000-8000-000000000005'::uuid
  ] loop
    perform d.kimlik(u);
    perform d.ok((select count(*) from public.student_experiences) = 0,
                 'sirket uyesi ' || right(u::text, 2) || ' tabloyu dogrudan okuyamiyor');
  end loop;
  perform d.yonetici();
end $$;

/* ================================================================== */
/*  3) GÜNCEL PROFİL RPC: YALNIZ ETKİN PAYLAŞIMDA                      */
/* ================================================================== */

do $$
declare
  u uuid;
  j jsonb;
begin
  /* Owner, Recruiter ve Viewer: profil okuma kuralı değişmedi (üçü de okuyor). */
  foreach u in array array[
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de000002-0000-4000-8000-000000000002'::uuid,
    'de000003-0000-4000-8000-000000000003'::uuid
  ] loop
    perform d.kimlik(u);
    j := public.basvuru_aday_guncel_profili('de00a001-0000-4000-8000-00000000a001');
    perform d.ok((j ->> 'riza')::boolean, right(u::text, 2) || ': p1 paylasim etkin');
    perform d.ok(jsonb_array_length(j -> 'guncel' -> 'deneyimler') = 2,
                 right(u::text, 2) || ': p1 iki deneyim donuyor');
    perform d.ok((j -> 'guncel' -> 'deneyimler' -> 0 ->> 'baslangic') = '2025-06'
                 and (j -> 'guncel' -> 'deneyimler' -> 0 ->> 'bitis') = '2025-09'
                 and (j -> 'guncel' -> 'deneyimler' -> 1 ->> 'devam')::boolean
                 and (j -> 'guncel' -> 'deneyimler' -> 1 -> 'bitis') = 'null'::jsonb,
                 right(u::text, 2) || ': tarih bicimi ve devam eden deneyim');

    j := public.basvuru_aday_guncel_profili('de00a002-0000-4000-8000-00000000a002');
    perform d.ok(not (j ->> 'riza')::boolean and not (j ? 'guncel'),
                 right(u::text, 2) || ': p2 rizasiz, deneyim yok');

    j := public.basvuru_aday_guncel_profili('de00a003-0000-4000-8000-00000000a003');
    perform d.ok(not (j ->> 'riza')::boolean and not (j ? 'guncel'),
                 right(u::text, 2) || ': p3 eski dis riza, deneyim yok');
  end loop;

  /* Başka şirket ve doğrulanmamış şirket: başvuruyu hiç göremez. */
  foreach u in array array[
    'de000004-0000-4000-8000-000000000004'::uuid,
    'de000005-0000-4000-8000-000000000005'::uuid
  ] loop
    perform d.kimlik(u);
    begin
      perform public.basvuru_aday_guncel_profili('de00a001-0000-4000-8000-00000000a001');
      raise exception 'DUSTU  % baskasinin basvurusunu okuyabildi', right(u::text, 2);
    exception when insufficient_privilege then
      raise notice 'GECTI  % baskasinin basvurusunda deneyim goremiyor', right(u::text, 2);
    end;
  end loop;

  perform d.kimlik('de000005-0000-4000-8000-000000000005');
  begin
    perform public.basvuru_aday_guncel_profili('de00c001-0000-4000-8000-00000000c001');
    raise exception 'DUSTU  dogrulanmamis sirket kendi basvurusunu okuyabildi';
  exception when insufficient_privilege then
    raise notice 'GECTI  dogrulanmamis sirket deneyim goremiyor';
  end;

  /* Anonim RPC'yi çağıramaz. */
  perform d.anonim();
  begin
    perform public.basvuru_aday_guncel_profili('de00a001-0000-4000-8000-00000000a001');
    raise exception 'DUSTU  anonim guncel profili okuyabildi';
  exception when insufficient_privilege then
    raise notice 'GECTI  anonim guncel profili okuyamiyor';
  end;
  perform d.yonetici();
end $$;

/* Öğrenci paylaşımı kapatınca deneyim de kapanıyor. */
begin;
select d.yonetici();
update public.applications set contact_share_consent_at = null
 where id = 'de00a001-0000-4000-8000-00000000a001';
select d.kimlik('de000001-0000-4000-8000-000000000001');
select d.ok(not (public.basvuru_aday_guncel_profili('de00a001-0000-4000-8000-00000000a001') ->> 'riza')::boolean,
            'paylasim kapaninca deneyim de kapaniyor');
rollback;

/* ================================================================== */
/*  4) TARİH KURALLARI VE ÜST SINIR                                    */
/* ================================================================== */

begin;
do $$
begin
  perform d.kimlik('de000007-0000-4000-8000-000000000007');

  begin
    insert into public.student_experiences (student_id, position, organization, start_year, start_month, end_year, end_month, ongoing)
    values ('de000007-0000-4000-8000-000000000007', 'A', 'B', 2025, 9, 2025, 3, false);
    raise exception 'DUSTU  bitis baslangictan once kabul edildi';
  exception when check_violation then
    raise notice 'GECTI  bitis baslangictan once olamiyor';
  end;

  begin
    insert into public.student_experiences (student_id, position, organization, start_year, start_month, end_year, end_month, ongoing)
    values ('de000007-0000-4000-8000-000000000007', 'A', 'B', 2025, 9, 2026, 1, true);
    raise exception 'DUSTU  devam eden deneyime bitis yazildi';
  exception when check_violation then
    raise notice 'GECTI  devam eden deneyimin bitisi olamiyor';
  end;

  begin
    insert into public.student_experiences (student_id, position, organization, start_year, start_month, ongoing)
    values ('de000007-0000-4000-8000-000000000007', 'A', 'B', 2025, 9, false);
    raise exception 'DUSTU  biten deneyim bitissiz kabul edildi';
  exception when check_violation then
    raise notice 'GECTI  biten deneyimin bitisi zorunlu';
  end;

  begin
    insert into public.student_experiences (student_id, position, organization, start_year, start_month, ongoing)
    values ('de000007-0000-4000-8000-000000000007', '   ', 'B', 2025, 9, true);
    raise exception 'DUSTU  bos pozisyon kabul edildi';
  exception when check_violation then
    raise notice 'GECTI  pozisyon bos olamiyor';
  end;

  /* Aynı ay başlayıp biten kabul. */
  insert into public.student_experiences (student_id, position, organization, start_year, start_month, end_year, end_month, ongoing)
  values ('de000007-0000-4000-8000-000000000007', 'Kisa', 'Gun', 2025, 7, 2025, 7, false);
  perform d.ok(true, 'ayni ay baslayip biten deneyim kabul');

  /* 30 sınırı: 29 daha (toplam 30), 31.si reddediliyor. */
  insert into public.student_experiences (student_id, position, organization, start_year, start_month, ongoing)
  select 'de000007-0000-4000-8000-000000000007', 'Deneyim ' || g, 'Kurum', 2024, 1, true
    from generate_series(1, 29) g;
  perform d.ok((select count(*) from public.student_experiences) = 30, '30 deneyim kabul');
  begin
    insert into public.student_experiences (student_id, position, organization, start_year, start_month, ongoing)
    values ('de000007-0000-4000-8000-000000000007', 'Fazla', 'Kurum', 2024, 1, true);
    raise exception 'DUSTU  31. deneyim kabul edildi';
  exception when check_violation then
    raise notice 'GECTI  31. deneyim reddediliyor';
  end;

  perform d.yonetici();
end $$;
rollback;

/* ================================================================== */
/*  5) BAŞVURU KOPYASI SONRADAN DEĞİŞMİYOR                             */
/* ================================================================== */
--
-- Kopya başvuru anında yazılıyor ve ayrı tabloda; deneyimi sonradan
-- düzenlemek kopyaya dokunmuyor.

begin;
select d.yonetici();
insert into public.basvuru_profil_kopyalari (basvuru_id, kopya)
values ('de00a001-0000-4000-8000-00000000a001',
        '{"surum":1,"ad":"Deneyim 06","deneyimler":[{"pozisyon":"Tasarim stajyeri","kurum":"Ornek Ajans","baslangic":"2025-06","bitis":"2025-09","devam":false,"aciklama":"Ilk hali"}]}')
on conflict (basvuru_id) do update set kopya = excluded.kopya;

select d.kimlik('de000006-0000-4000-8000-000000000006');
update public.student_experiences set description = 'Sonradan degisti', position = 'Kidemli stajyer'
 where position = 'Tasarim stajyeri';
delete from public.student_experiences where position = 'Gonullu egitmen';

select d.kimlik('de000001-0000-4000-8000-000000000001');
select d.ok(
  (select k.kopya -> 'deneyimler' -> 0 ->> 'aciklama' from public.basvuru_profil_kopyalari k
    where k.basvuru_id = 'de00a001-0000-4000-8000-00000000a001') = 'Ilk hali',
  'kopya basvuru anindaki deneyimi koruyor');
select d.ok(
  (public.basvuru_aday_guncel_profili('de00a001-0000-4000-8000-00000000a001')
     -> 'guncel' -> 'deneyimler' -> 0 ->> 'pozisyon') = 'Kidemli stajyer',
  'guncel profil degisikligi ayri gosteriyor');
rollback;

/* Profil silinince deneyimler de gidiyor (cascade); başka tabloda iz kalmıyor. */
begin;
select d.yonetici();
delete from public.student_profiles where id = 'de000007-0000-4000-8000-000000000007';
select d.ok((select count(*) from public.student_experiences
              where student_id = 'de000007-0000-4000-8000-000000000007') = 0,
            'ogrenci profili silinince deneyimleri de siliniyor');
rollback;

select 'OGRENCI DENEYIMLERI: TUM SINAMALAR GECTI' as sonuc;
