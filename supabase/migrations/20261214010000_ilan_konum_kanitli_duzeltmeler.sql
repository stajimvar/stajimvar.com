/*
  İLAN KONUMU — RESMÎ KAYNAKLA DOĞRULANMIŞ DÜZELTMELER (13 Ekim 2026)

  JobPosting'i eksik 21 açık ilanın her biri resmî ilan sayfasında kontrol
  edildi (kaynağın kendi yapısal verisi ve görünür metni). Bu göç YALNIZ
  kaynağın açıkça söylediği değerleri yazıyor; kanıtı her satırın yanında.
  Kaynağın söylemediği, çelişkili ya da kontrol edilemeyen ilanlara
  dokunulmuyor (liste: docs/seo/jobposting-eksikleri-2026-10-13.md).

  İKİ BÖLÜM
  ---------
  1. Yapı: toplama hattından gelen uzaktan ilan için DOĞRULAMA DAMGASI.
     `basvuru_ulkeleri` işverenin kendi ilanında işverenin beyanı; öteki
     ilanlarda bu alanı ancak kaynağı kontrol eden biri yazabilir. Kimin,
     neye bakarak yazdığı kayıtlı olmadan değer JobPosting'e girmemeli
     (src/lib/seo/ilan-sayfasi.mjs, basvurulabilenUlkeler). Bu yüzden:
       basvuru_ulkeleri_kanit           kaynak adresi + kaynaktaki ifade
       basvuru_ulkeleri_dogrulandi_at   doğrulama zamanı
     Ülkeler sonradan değişirse damga kendiliğinden düşüyor (eski kanıt yeni
     değeri doğrulamaz). Yalnız otomasyon/yönetim (service_role, göç)
     yazabiliyor; işveren ve ziyaretçi okuyabiliyor.
     JobPosting'in damgayı okuması AYRI PR: ilan sorgusu yeni sütunu ancak
     bu göç canlıya çıktıktan sonra isteyebilir (derleme göçten ÖNCE koşuyor).

  2. Veri: kanıtlı düzeltmeler. Her güncelleme ilanın ŞU ANKİ değerine
     koşullu: değer bu arada değiştiyse güncelleme hiçbir şey yapmıyor
     (üzerine yazma yok). Etkilenen satır sayısı NOTICE olarak yazılıyor.

  Başvurulara, işveren ilanlarına ve öteki ilanlara dokunulmuyor.
*/

/* ================================================================== */
/*  1) YAPI                                                            */
/* ================================================================== */

alter table public.listings
  add column if not exists basvuru_ulkeleri_kanit text,
  add column if not exists basvuru_ulkeleri_dogrulandi_at timestamptz;

alter table public.listings
  drop constraint if exists listings_basvuru_ulkeleri_damgasi,
  add constraint listings_basvuru_ulkeleri_damgasi check (
    basvuru_ulkeleri_dogrulandi_at is null
    or (basvuru_ulkeleri is not null and length(btrim(coalesce(basvuru_ulkeleri_kanit, ''))) > 0)
  );

comment on column public.listings.basvuru_ulkeleri_kanit is
  'Başvurulabilen ülkelerin kanıtı: resmî kaynak adresi ve kaynaktaki ifade.';
comment on column public.listings.basvuru_ulkeleri_dogrulandi_at is
  'Başvurulabilen ülkeler resmî kaynakla doğrulandıysa zamanı. Ülkeler değişince kendiliğinden boşalır.';

/* Ülkeler değişti ama damga aynı işlemde yenilenmediyse eski kanıt geçersiz. */
create or replace function public.basvuru_ulkeleri_damgasi_dusur()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.basvuru_ulkeleri is distinct from old.basvuru_ulkeleri
     and new.basvuru_ulkeleri_dogrulandi_at is not distinct from old.basvuru_ulkeleri_dogrulandi_at then
    new.basvuru_ulkeleri_dogrulandi_at := null;
    new.basvuru_ulkeleri_kanit := null;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_basvuru_ulkeleri_damgasi on public.listings;
create trigger listings_basvuru_ulkeleri_damgasi
  before update on public.listings
  for each row execute function public.basvuru_ulkeleri_damgasi_dusur();

revoke all on function public.basvuru_ulkeleri_damgasi_dusur() from public, anon, authenticated;

/* Okuma açık (ilan sayfası ve işveren paneli); yazma yalnız service_role/göç. */
grant select (basvuru_ulkeleri_kanit, basvuru_ulkeleri_dogrulandi_at) on public.listings to anon, authenticated;

/* ================================================================== */
/*  2) KANITLI VERİ DÜZELTMELERİ                                        */
/* ================================================================== */

do $$
declare
  n integer;
begin
  /*
    a) Ofis ilanı, ülke yok — resmî kaynak ülkeyi söylüyor.

    Hiroba Games — Workable ilan sayfasının yapısal verisi:
      addressLocality "Çankaya", addressRegion "Ankara", addressCountry "Turkey"
  */
  update public.listings set country_code = 'TR'
   where id::text like '2a1ca32c-%' and status = 'published'
     and country_code is null and city = 'Çankaya' and work_type = 'On-site';
  get diagnostics n = row_count; raise notice 'Hiroba Games ulke TR: % satir', n;

  /*
    Novartis — novartis.com ilan sayfasının yapısal verisi:
      addressLocality "Istanbul Ataşehir", addressCountry "Türkiye"
  */
  update public.listings set country_code = 'TR', city = 'İstanbul'
   where id::text like 'f5eff36e-%' and status = 'published'
     and country_code is null and city is null and work_type = 'On-site';
  get diagnostics n = row_count; raise notice 'Novartis Istanbul/TR: % satir', n;

  /*
    Luron AI — careers.luron.ai/jobs/qa-intern görünür metni:
      "Based in Istanbul and able to work on-site with the team."
  */
  update public.listings set country_code = 'TR', city = 'İstanbul'
   where id::text like 'b39b1b88-%' and status = 'published'
     and country_code is null and city is null and work_type = 'On-site';
  get diagnostics n = row_count; raise notice 'Luron AI Istanbul/TR: % satir', n;

  /*
    b) "Uzaktan" diye kayıtlı ama kaynak ofis + uzaktan karma çalışma
       söylüyor. Google TELECOMMUTE'u yalnız %100 uzaktan işte istiyor; bu
       ilanlar hibrit. Şehir ve ülke zaten kaynaktan kayıtlı.

    Atrya — join.com: "flexible Aufteilung zwischen Büro (HoFT, Prenzlauer
      Berg) und Remote"; yapısal veri: Berlin, Schönhauser Allee 9, DE
  */
  update public.listings set work_type = 'Hybrid'
   where id::text like 'cc55e6ec-%' and status = 'published'
     and work_type = 'Remote' and city = 'Berlin' and country_code = 'DE' and basvuru_ulkeleri is null;
  get diagnostics n = row_count; raise notice 'Atrya hibrit: % satir', n;

  /*
    Neckar Hub — join.com: "Flexible Arbeitsmöglichkeiten …: remote oder vor
      Ort in einem unserer Hubs"; yapısal veri: Tübingen, DE
  */
  update public.listings set work_type = 'Hybrid'
   where id::text like '8bcb8de3-%' and status = 'published'
     and work_type = 'Remote' and city = 'Tübingen' and country_code = 'DE' and basvuru_ulkeleri is null;
  get diagnostics n = row_count; raise notice 'Neckar Hub hibrit: % satir', n;

  /*
    c) Tamamen uzaktan ve kaynak başvurulabilen ülkeyi AÇIKÇA söylüyor.
       Kanıt satırda saklanıyor, damga atılıyor.
  */
  update public.listings
     set basvuru_ulkeleri = array['DE'],
         basvuru_ulkeleri_kanit = 'https://join.com/companies/fixfirst/16668569-founders-associate-intern — kaynak yapısal verisi: jobLocationType TELECOMMUTE, applicantLocationRequirements Country "Germany"; sayfa: "Remote (Germany)"',
         basvuru_ulkeleri_dogrulandi_at = now()
   where id::text like 'a67768ee-%' and status = 'published' and work_type = 'Remote' and basvuru_ulkeleri is null;
  get diagnostics n = row_count; raise notice 'FixFirst DE: % satir', n;

  update public.listings
     set basvuru_ulkeleri = array['TR'],
         basvuru_ulkeleri_kanit = 'https://app.gethirex.com/o/kaizen-technology/uyiv8wb6ymtfh4ys--part-time-product-specialist-student-position-4/ — kaynak yapısal verisi: jobLocationType TELECOMMUTE, applicantLocationRequirements Country "TR"; sayfa: "Istanbul, Türkiye · Staj · Uzaktan"',
         basvuru_ulkeleri_dogrulandi_at = now()
   where id::text like '11c26e17-%' and status = 'published' and work_type = 'Remote' and basvuru_ulkeleri is null;
  get diagnostics n = row_count; raise notice 'Kaizen Loyalty TR: % satir', n;

  update public.listings
     set basvuru_ulkeleri = array['DE'],
         basvuru_ulkeleri_kanit = 'https://jobs.ashbyhq.com/trading212/f8d628f4-6093-48bc-942e-6057b44707fc — kaynak yapısal verisi: jobLocationType TELECOMMUTE, applicantLocationRequirements Country "Germany"',
         basvuru_ulkeleri_dogrulandi_at = now()
   where id::text like '43f222b6-%' and status = 'published' and work_type = 'Remote' and basvuru_ulkeleri is null;
  get diagnostics n = row_count; raise notice 'Trading 212 DE: % satir', n;

  update public.listings
     set basvuru_ulkeleri = array['DE'],
         basvuru_ulkeleri_kanit = 'https://job-boards.greenhouse.io/wongdoody/jobs/7988851003 — kaynak konumu: "Berlin, DE | Germany (REMOTE)"',
         basvuru_ulkeleri_dogrulandi_at = now()
   where id::text like '04217342-%' and status = 'published' and work_type = 'Remote' and basvuru_ulkeleri is null;
  get diagnostics n = row_count; raise notice 'WongDoody DE: % satir', n;
end $$;
