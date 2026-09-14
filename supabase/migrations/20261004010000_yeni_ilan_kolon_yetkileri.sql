-- YENİ İLAN KOLONLARINA OKUMA YETKİSİ
--
-- CANLIDA KIRIKTI (14 Eylül 2026): `insurance_provider` kolonu
-- `LISTING_COLUMNS`a eklendiği anda BÜTÜN ilan sorguları düştü:
--
--   GET /rest/v1/listings?select=id,insurance_provider
--   → 42501 "permission denied for table listings"
--
-- İlan detay sayfası "İlan yüklenemedi" gösteriyordu.
--
-- SEBEP: `listings` tablosunda SELECT tablo düzeyinde verilmiyor,
-- KOLON KOLON veriliyor (bkz. 20260906010000 ve 20260905020000).
-- Göç 20261001010000 üç yeni kolon ekledi
-- (`location_raw`, `insurance_provider`, `department_tags`) ama yetki
-- vermedi. Kolon listesine eklenmeyen bir kolon sorunsuz görünüyordu;
-- eklenince tablonun tamamı kapandı.
--
-- Postgres'te kolon düzeyinde SELECT yetkisi olan bir tabloda,
-- yetkisi OLMAYAN bir kolonu istemek tablo düzeyinde reddedilir —
-- yani tek bir eksik kolon bütün sorguyu düşürüyor.
--
-- Üç kolon da herkese açık ilan bilgisi: konumun ham hâli, sigortayı
-- sağlayan taraf ve bölüm etiketleri. Kartta ve detayda gösterilmek
-- üzere eklendiler.
--
-- NOT (20260905020000'den): sütun listesi HER ayrıcalığa ayrı bağlanır;
-- `grant select, insert (sutunlar)` yazmak SELECT'i TÜM TABLOYA
-- verirdi. Bu yüzden yalnız `select` ve yalnız bu üç kolon.

grant select (location_raw, insurance_provider, department_tags)
  on public.listings to anon, authenticated;

comment on column public.listings.insurance_provider is
  'Staj sigortasını kim sağlıyor: isveren / universite / aday / yok. '
  'null = kaynak söylemiyor — "yok" ile AYNI ŞEY DEĞİL. '
  'Okuma yetkisi: anon + authenticated (20261004010000).';
