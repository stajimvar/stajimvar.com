-- PROFİL KOPYASI TAŞIMA TESTİ — 2/2: GÖÇ SONRASI KARŞILAŞTIRMA
--
-- Önce `profil-kopyasi-tasima-oncesi.sql`, sonra göç, sonra bu betik.
-- Ölçülenler: hiçbir kopya kaybolmadı ve içeriği değişmedi; başvuru
-- satırındaki sütun boşaldı; tarihler, görüntülenme damgası, durum ve
-- eski teklif kaydı DEĞİŞMEDİ; erişim yeni kurala göre.

\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.ok(kosul boolean, ad text) returns void
language plpgsql as $$
begin
  if kosul then raise notice 'GECTI  %', ad;
  else raise exception 'DUSTU  %', ad; end if;
end $$;

select pg_temp.ok(to_regclass('public.basvuru_profil_kopyalari') is not null,
                  'GOC UYGULANDI: korumali tablo var');

/* ---- KOPYALAR KAYBOLMADI, İÇERİK AYNI ---- */
select pg_temp.ok(
  (select count(*) from goc_testi.once where kopya is not null)
  = (select count(*) from public.basvuru_profil_kopyalari k
      where k.basvuru_id in (select id from goc_testi.once)),
  'KOPYA SAYISI: once ile sonra esit');

select pg_temp.ok(
  not exists (
    select 1 from goc_testi.once o
      left join public.basvuru_profil_kopyalari k on k.basvuru_id = o.id
     where o.kopya is not null and (k.kopya is null or k.kopya <> o.kopya)),
  'KOPYA ICERIGI: her kopya birebir ayni tasindi');

select pg_temp.ok(
  not exists (
    select 1 from public.basvuru_profil_kopyalari k
      join goc_testi.once o on o.id = k.basvuru_id
     where o.kopya is null),
  'FAZLA KOPYA YOK: kopyasi olmayan basvuruya kopya uydurulmadi');

select pg_temp.ok(
  (select count(*) from public.applications
    where id in (select id from goc_testi.once) and profile_snapshot is not null) = 0,
  'ESKI SUTUN: basvuru satirlarinda kopya kalmadi');

/* ---- BAŞVURU KAYDI DEĞİŞMEDİ ---- */
select pg_temp.ok(
  not exists (
    select 1 from goc_testi.once o
      join public.applications a on a.id = o.id
     where a.applied_at          is distinct from o.applied_at
        or a.updated_at          is distinct from o.updated_at
        or a.status_changed_at   is distinct from o.status_changed_at
        or a.ilk_goruntulenme_at is distinct from o.ilk_goruntulenme_at
        or a.aday_ilerleme_at    is distinct from o.aday_ilerleme_at
        or a.status::text        is distinct from o.status
        or a.contact_share_consent_at      is distinct from o.contact_share_consent_at
        or a.contact_share_consent_version is distinct from o.contact_share_consent_version
        or a.offer_note          is distinct from o.offer_note),
  'BASVURU KAYDI: tarihler, goruntulenme, durum, riza ve eski teklif DEGISMEDI');

select pg_temp.ok(
  (select count(*) from public.applications where id in (select id from goc_testi.once))
  = (select count(*) from goc_testi.once),
  'BASVURU SAYISI: hicbir basvuru silinmedi');

/* ---- ERİŞİM YENİ KURALA GÖRE ---- */
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '0a000000-0000-4000-8000-0000000000a1', 'role', 'authenticated')::text, true);
set local role authenticated;

select pg_temp.ok(
  (select count(*) from public.basvuru_profil_kopyalari
    where basvuru_id in ('0e000000-0000-4000-8000-0000000000e1',
                         '0e000000-0000-4000-8000-0000000000e4',
                         '0e000000-0000-4000-8000-0000000000e5')) = 3,
  'ERISIM: dogrulanmis sirket ic+rizali kopyalari goruyor (e1, e4, e5)');
select pg_temp.ok(
  (select count(*) from public.basvuru_profil_kopyalari
    where basvuru_id = '0e000000-0000-4000-8000-0000000000e3') = 0,
  'ERISIM: eski dis riza kopyasi KAPALI (e3)');
select pg_temp.ok(
  (select count(*) from public.applications
    where id = '0e000000-0000-4000-8000-0000000000e4' and status = 'offer_extended'
      and offer_note = 'Eski teklif notu') = 1,
  'ESKI TEKLIF: sirket eski kaydi okumaya devam ediyor');
reset role;
commit;

begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '0a000000-0000-4000-8000-0000000000a2', 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.ok(
  (select count(*) from public.basvuru_profil_kopyalari
    where basvuru_id = '0e000000-0000-4000-8000-0000000000e6') = 0,
  'ERISIM: dogrulanmamis sirket kendi basvurusunun kopyasini GORMUYOR (e6)');
reset role;
commit;

begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '0a000000-0000-4000-8000-0000000000b3', 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.ok(
  (select count(*) from public.basvuru_profil_kopyalari
    where basvuru_id in ('0e000000-0000-4000-8000-0000000000e4',
                         '0e000000-0000-4000-8000-0000000000e6')) = 2,
  'ERISIM: ogrenci kendi kopyalarini goruyor');
/* Öğrenci eski açık teklifi hâlâ yanıtlayabiliyor. */
select pg_temp.ok(
  public.teklife_yanit_ver('0e000000-0000-4000-8000-0000000000e4', true)::text = 'offer_accepted',
  'ESKI ACIK TEKLIF: ogrenci goc sonrasi yanit verebiliyor');
reset role;
rollback;

select 'TASIMA TESTI GECTI' as sonuc;
