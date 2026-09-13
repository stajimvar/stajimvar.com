-- FIRSAT TUTARI — KARAR DEĞİL KANIT SAKLANIYOR
--
-- Kart "Tutar kurumca açıklanacak" diyordu ve bu cümle VARSAYIMLA
-- üretiliyordu: kaydın türü burs/yurt dışı ise "demek ki bir ödeme var,
-- kurum henüz açıklamamış" deniyordu. 113 kaydın 106'sı bu cümleyi
-- kaynağında böyle yazdığı için değil, TÜRÜ öyle olduğu için
-- gösteriyordu.
--
-- Durum artık yalnızca kurumun kendi güncel sayfasından okunan kanıta
-- dayanıyor. Bu göç o kanıtı saklayacak alanları açıyor: ne zaman
-- bakıldı, hangi adrese bakıldı, sayfada ne yazıyordu, hangi karara
-- varıldı.
--
-- GERİYE UYUMLU: bütün sütunlar NULL kabul ediyor ve varsayılanları yok.
-- Kontrol edilmemiş kayıtta `amount_status` NULL kalıyor; arayüz NULL'u
-- "bilinmiyor" sayıp tutar satırını hiç çizmiyor. Yani göç uygulandığı
-- anda hiçbir kayıt bir şey iddia etmiyor.

alter table public.opportunities
  -- Belirlenen durum. NULL = kaynak tutar açısından henüz kontrol edilmedi.
  add column if not exists amount_status text,
  -- Kararın verildiği an. Eski bir damga "yeniden bakılmalı" demek.
  add column if not exists amount_checked_at timestamptz,
  -- Kararın okunduğu ADRES. `source_url` kaydın genel kaynağı; tutar
  -- başka bir sayfada (örneğin bir PDF) yazıyor olabilir.
  add column if not exists amount_source_url text,
  -- Kararı destekleyen kısa kaynak metni. Bir insan bakıp "bu cümle
  -- gerçekten bunu mu söylüyor" diye denetleyebilsin diye duruyor.
  add column if not exists amount_evidence text,
  -- Okunan sayfanın metin özeti (SHA-256). Aynı sayfa değişmediyse
  -- betik satırı yeniden YAZMIYOR: gereksiz yazma hem `updated_at`
  -- damgasını kirletiyor hem de değişiklik geçmişini okunmaz yapıyor.
  add column if not exists amount_source_hash text;

-- Durum kümesi kapalı: arayüzdeki `TUTAR_DURUMU` ile birebir.
--   kesin          güncel dönem için kesin rakam bulundu
--   aciklanacak    kaynak "tutar sonra açıklanacak" diyor
--   mali_destek    destek var, miktar programa/şehre/kişiye göre değişiyor
--   belirtilmemis  güncel sayfa okundu, tutardan hiç söz etmiyor
--   ucretsiz       katılımın ücretsiz olduğu açıkça yazıyor
--   belirsiz       açılamadı, çelişkili ya da karar verilemedi → kuyruk
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_amount_status_check'
  ) then
    alter table public.opportunities
      add constraint opportunities_amount_status_check
      check (
        amount_status is null
        or amount_status in ('kesin', 'aciklanacak', 'mali_destek', 'belirtilmemis', 'ucretsiz', 'belirsiz')
      );
  end if;
end $$;

comment on column public.opportunities.amount_status is
  'Tutar durumu; yalnızca kurumun güncel resmî sayfasından okunan kanıta dayanır. NULL = kontrol edilmedi, arayüz satırı çizmez.';
comment on column public.opportunities.amount_checked_at is
  'Tutar açısından kaynağa en son ne zaman bakıldığı.';
comment on column public.opportunities.amount_source_url is
  'Kararın okunduğu adres (HTML ya da PDF). source_url''den farklı olabilir.';
comment on column public.opportunities.amount_evidence is
  'Kararı destekleyen kısa kaynak metni; insan denetimi için.';
comment on column public.opportunities.amount_source_hash is
  'Okunan metnin SHA-256 özeti. Değişmediyse satır yeniden yazılmıyor.';

-- İNCELEME KUYRUĞU
--
-- Betik belirsiz kalan kaydı TAHMİN ETMİYOR: durumu 'belirsiz' yazıp
-- sebebini buraya bırakıyor. Görünüm, kuyruğu tek sorguda okunur
-- kılıyor; ayrı bir tablo açmak aynı satırı iki yerde tutmak olurdu.
create or replace view public.firsat_tutar_kuyrugu as
  select
    id, slug, title, organization_name, opportunity_type,
    source_url, amount_source_url, amount_status, amount_checked_at, amount_evidence
  from public.opportunities
  where status = 'published'
    and (amount_status is null or amount_status = 'belirsiz')
  order by amount_checked_at nulls first, organization_name;

comment on view public.firsat_tutar_kuyrugu is
  'Tutarı doğrulanamamış yayındaki kayıtlar: hiç bakılmamışlar önce gelir.';
