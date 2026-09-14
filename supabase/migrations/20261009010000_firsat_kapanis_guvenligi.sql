-- FIRSAT KAPANIŞI: İKİ TEYİT ARASINDA EN AZ 24 SAAT
--
-- BULGU — KENDİ ELİMLE ÜRETTİM
-- ---------------------------
-- Kapanış eşiği "art arda iki kesin hata" diyordu ama İKİ ÖLÇÜMÜN NE
-- KADAR ARAYLA yapıldığını sormuyordu. Dün işçiyi elle iki kez
-- koşturdum (aralarında ~30 dakika) ve
-- `ahmet-ve-nezahat-kelesoglu-vakfi-bursu` kaydı ikinci koşuda
-- `expired` oldu.
--
-- O iki ölçüm BAĞIMSIZ DEĞİL: aynı yarım saat içinde, aynı geçici
-- durumu iki kez gördüler. Kurumun sitesi o sırada bakımda olsaydı,
-- gerçekten açık bir burs yarım saat içinde listeden düşerdi. Eşiğin
-- amacı "iki kez baktık" değil, "iki AYRI GÜN baktık".
--
-- ÇÖZÜM: sayaç yalnızca son sayılan hatadan en az 24 saat sonra
-- artıyor. Elle arka arkaya koşan kontroller sayacı ilerletmiyor;
-- yalnız `source_checked_at` güncelleniyor.
--
-- Zamanlanmış koşu üç günde bir olduğu için gerçek kapanışta gecikme
-- olmuyor: iki zamanlı koşu zaten 72 saat arayla.

alter table public.opportunities
  add column if not exists source_failure_last_at timestamptz;

comment on column public.opportunities.source_failure_last_at is
  'Sayaca SAYILAN son kesin hatanın zamanı. Sayaç yalnızca bu damgadan '
  'en az 24 saat sonra artıyor; arka arkaya çalıştırılan kontroller '
  'bağımsız teyit sayılmıyor. NULL = henüz sayılan hata yok.';

/*
  ARKA ARKAYA İKİ KONTROLLE KAPANAN KAYIT GERİ AÇILIYOR
  -----------------------------------------------------
  Kural değişti; kuraldan ÖNCE o kuralla kapanmış kayıt da geri
  değerlendirilmeli. Yoksa yeni kural yalnız bundan sonrasını korur ve
  benim ürettiğim hata listede kalır.

  Koşul dar tutuldu — yalnız BUGÜN, `closed` ile ve tam iki sayaçla
  düşen kayıtlar. Ölçtüm: bu koşula uyan kayıt sayısı 1
  (`ahmet-ve-nezahat-kelesoglu-vakfi-bursu`, HTTP 404, iki elle koşu).

  Kayıt "açık" ilan EDİLMİYOR: `published` durumuna dönüyor, sayaç
  sıfırlanıyor ve `source_status` temizleniyor. Bir sonraki ZAMANLANMIŞ
  koşu kaynağa yeniden bakıp kararı kendisi veriyor. Hâlâ 404 dönüyorsa
  24 saat arayla iki koşuda kapanacak.

  `verified_at` ELLE ATILMIYOR: fırsatın açık olduğunu doğrulamadım,
  yalnız kapatma gerekçesini geçersiz saydım.
*/
update public.opportunities
   set status = 'published',
       source_failure_count = 0,
       source_status = null,
       source_failure_last_at = null
 where status = 'expired'
   and source_status = 'closed'
   and source_failure_count = 2
   and source_checked_at >= now() - interval '24 hours'
   /*
     SON BAŞVURU TARİHİ GEÇMİŞ OLANLAR GERİ AÇILMIYOR: onlar zaten
     tarihten dolayı kapanmalı ve bu düzeltmenin konusu değil.
   */
   and (application_deadline is null or application_deadline >= now());
