-- İşverenin kendi açtığı ilan.
--
-- Yeni tablo açılmıyor: listings.origin zaten var (scraped/internal/manual)
-- ve işverenin kendi eliyle açtığı ilan bunlardan hiçbiri değil. Ayrımı
-- tutmak şart, çünkü toplama hattı ile işveren ilanı farklı kurallara
-- tabi: toplananın kaynağı doğrulanıyor, işverenin ilanı ise şirket
-- kademesine göre canlı ya da taslak oluyor.
alter type public.listing_origin add value if not exists 'employer_posted';
