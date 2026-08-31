-- TEKLİFİ ŞİRKET VERİR, KARARI ÖĞRENCİ VERİR
--
-- ÖLÇÜM (üretim şeması, 31 Ağustos 2026)
-- --------------------------------------
-- `application_status` yedi değer taşıyor ve teklifin ARDINDAN ne olduğu
-- hiçbirinde yok:
--
--   offer_extended  ŞİRKETİN aksiyonu: teklif verildi.
--   rejected        ŞİRKETİN kararı: aday olumsuz.
--   withdrawn       ÖĞRENCİNİN kararı: başvurudan vazgeçti.
--
-- Öğrencinin "bu teklifi kabul ediyorum" ya da "bu teklifi reddediyorum"
-- demesinin karşılığı YOK. Mevcut değerlerle modellemek iki yanlıştan
-- birini gerektirirdi:
--
--   * Öğrencinin teklifi reddetmesini `rejected` yazmak — şirketin
--     "bu adayı istemiyoruz" kararıyla aynı kelimeye düşerdi. İki taraf
--     aynı ekranda birbirinin kararını okuyor; karıştırmak yanlış bilgi.
--   * `withdrawn` yazmak — öğrenci başvurusundan vazgeçmedi, aksine
--     sonuna kadar gitti ve teklifi değerlendirdi.
--
-- AYRI KOLON MU, ENUM MU
-- ----------------------
-- `offer_response` gibi ayrı bir kolon da düşünüldü ve elendi: ürünün
-- tamamı "bu başvuru hangi durumda" sorusunu TEK yerden okuyor — kart
-- rozeti, öğrenci cümlesi, süzgeçler, RLS kuralları, durum sözlüğü.
-- İkinci bir kolon, durumu iki alanın bileşkesi yapardı; aynı bilgi iki
-- yerde durur, süzgeçler ve politikalar ikisini birden bilmek zorunda
-- kalırdı. Tek canonical alan `status` olarak KALIYOR.
--
-- Değerler ekleniyor, hiçbiri değiştirilmiyor: geçmiş kayıtlar aynen
-- duruyor.
alter type application_status add value if not exists 'offer_accepted';
alter type application_status add value if not exists 'offer_declined';

-- TEKLİFİN İÇERİĞİ
--
-- Boş bir "Teklif" durumu öğrenciye neye karar verdiğini söylemiyor.
-- Ücret, çalışma biçimi ve süre zaten İLANDA duruyor; tekrar sorulmuyor.
-- Eksik olan iki şey ekleniyor:
--
--   offer_note        şirketin teklif metni (öğrenciye görünür)
--   offer_start_date  planlanan başlangıç (opsiyonel)
--
-- `company_feedback` bu iş için kullanılmadı: o alan sürecin herhangi bir
-- anında yazılan genel not ve sonradan üzerine yazılabiliyor. Teklifin
-- şartları, öğrenci karar verirken sessizce değişmemeli.
alter table public.applications
  add column if not exists offer_note       text,
  add column if not exists offer_start_date date;

comment on column public.applications.offer_note is
  'Şirketin teklif metni. Öğrenciye görünür. Sürecin herhangi bir anında yazılan genel notla karıştırılmamalı: teklifin şartları sonradan üzerine yazılmamalı.';
comment on column public.applications.offer_start_date is
  'Teklif edilen başlangıç tarihi. Opsiyonel: teklif göndermenin şartı değil.';

-- YANIT ZAMANI İÇİN YENİ KOLON YOK
--
-- `status_changed_at` her durum değişiminde tetikleyiciyle damgalanıyor
-- (stamp_application_status_change). Öğrenci teklife yanıt verdiğinde
-- durum değiştiği için yanıtın zamanı zaten orada. Ayrı bir
-- `offer_responded_at` aynı anı ikinci kez saklamak olurdu.
