-- Fırsat kapak görseli.
--
-- Burs kartları 16:9 bir kapakla çiziliyor. Kapak üretim sırası:
--   1. Kurumun kendi resmî görseli (bu alan)
--   2. Yoksa kurum logosu + kurumdan türetilen vurgu rengi ile marka kapağı
--   3. Logo da yoksa baş harflerle üretilen kapak
--
-- Alan BOŞ başlıyor ve boş kalması sorun değil: 68 kaydın 60'ında logo
-- var, yani ikinci basamak zaten çalışıyor. Buraya yalnızca kurumun
-- kendi sayfasından alınmış, doğrulanmış görseller yazılacak. Stok
-- fotoğraf, yapay zekâ görseli ya da bursla ilgisiz bir kapak
-- konmayacak — böyle bir görsel kartı süslerken bilgiyi bozar.

alter table public.opportunities
  add column if not exists cover_image_url text;

comment on column public.opportunities.cover_image_url is
  'Kurumun kendi sayfasından doğrulanmış burs görseli. Stok/AI görsel konmaz; boşsa logo veya baş harf kapağı üretilir.';
