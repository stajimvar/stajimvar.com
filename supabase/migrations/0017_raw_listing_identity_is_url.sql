-- İlan kimliği (kaynak, canonical_url) — veritabanı seviyesinde zorunlu.
--
-- NEDEN
-- -----
-- Keşif kaydı önce `content_hash` ile aranıyordu ve hash açıklamadan
-- üretiliyor. Açıklamayı Türkçeye çeviriyoruz ve çeviri her turda birebir
-- aynı gelmiyor; birkaç karakterlik fark hash'i değiştirip aynı ilan için
-- ikinci bir satır açıyordu.
--
-- Uygulama tarafı 2026-08-17'de düzeltildi (repository.upsert_raw_listing
-- artık adrese bakıyor). Ama uygulama kodu "önce ara, yoksa ekle" yapıyor;
-- bu desen yarışa açık ve yalnızca sözleşmeye dayanıyor.
--
-- Ölçüldü: düzeltmeden ÖNCE oluşmuş bir çift hâlâ duruyordu — aynı kaynak,
-- aynı adres, iki satır. Biri her turda tazeleniyordu, diğerinin
-- `consecutive_missing_runs` sayacı 13'e tırmanmıştı. Otomatik düşürme
-- açılsaydı sistem AÇIK bir ilanı kapanmış sanabilirdi.
--
-- Bu kısıt aynı hatanın bir daha oluşmasını imkânsız kılıyor.

-- Kısıttan önce artık kayıtları temizle: aynı (kaynak, adres) için en eski
-- satır kalır, sonrakiler silinir. En eski olan, ilanın gerçek geçmişini
-- taşıyan satır.
delete from public.raw_listings a
using public.raw_listings b
where a.source_id = b.source_id
  and a.canonical_url = b.canonical_url
  and a.first_seen_at > b.first_seen_at;

create unique index if not exists raw_listings_source_url_key
  on public.raw_listings (source_id, canonical_url);
