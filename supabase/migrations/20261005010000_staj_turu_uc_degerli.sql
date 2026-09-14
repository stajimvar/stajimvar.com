-- STAJ TÜRÜ KABULÜ ÜÇ DEĞERLİ
--
-- ÖLÇÜLDÜ (14 Eylül 2026, üretim, 175 ilan):
--   (zorunlu, gönüllü) = (true, true) → 122
--                        (false, true) →  53
--   yani `voluntary_staj_accepted` 175 ilanın 175'inde TRUE.
--
-- Sebebi veri değil VARSAYILAN: sütun `not null default true` ve iki
-- içe aktarıcı da sabit `True` yazıyor (promote.py:238,
-- kariyer_html_kosu.py:216). Alan hiçbir şey ölçmüyor; "gönüllü staj
-- kabul ediliyor" rozeti bu hâliyle 175 ilan hakkında kanıtsız bir
-- iddia olurdu.
--
-- `mandatory_staj_accepted` ise KANITA DAYALI — ama yalnız true tarafı:
-- `detect_mandatory_staj` açık ifade bulunca true diyor, bulamayınca
-- `False` dönüp nota "Kaynakta belirtilmemiş" yazıyor. Yani false hem
-- "kabul etmiyor" hem "bilinmiyor" anlamına geliyor ve ikisi
-- ayrılamıyor. `is_paid` ile birebir aynı kusur (göç 20261001010000).
--
-- ÜÇ DEĞER, ÜÇ ANLAM
--   true  → kaynakta açık kabul ifadesi
--   false → kaynakta açık RET ifadesi
--   null  → kaynak söylemiyor
--
-- GERİ ALINABİLİR: iki sütunun null'a açılması ve varsayılanın
-- kaldırılması. Mevcut satırların değerleri bu göçte DEĞİŞMİYOR;
-- kanıta dayalı düzeltme ayrı bir betikle (scripts/staj-turu-duzelt.mjs)
-- ve kayıt kayıt yapılıyor.

alter table public.listings
  alter column mandatory_staj_accepted drop not null,
  alter column mandatory_staj_accepted drop default,
  alter column voluntary_staj_accepted drop not null,
  alter column voluntary_staj_accepted drop default;

comment on column public.listings.mandatory_staj_accepted is
  'true = kaynakta açık "zorunlu staj kabul ediliyor" ifadesi, '
  'false = açık ret, null = kaynak söylemiyor. Varsayılan YOK: '
  'bilinmeyeni true saymak SGK rozetini uydurmak, false saymak '
  '"kabul etmiyor" demek olurdu.';

comment on column public.listings.voluntary_staj_accepted is
  'true = kaynakta açık "gönüllü staj kabul ediliyor" ifadesi, '
  'false = açık ret, null = kaynak söylemiyor.';
