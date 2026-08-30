-- BAŞVURU YOLU ŞİRKETİN SEÇİMİ OLMAKTAN ÇIKIYOR
--
-- Şirketin açtığı ilanda başvuru iki yoldan birine gidebiliyordu:
-- "Kendi sitemizden" (application_method = 'external' + apply_url) ya da
-- "StajımVar ile başvur" (internal). Seçenek kaldırıldı; başvuru artık
-- her zaman StajımVar üzerinden geliyor.
--
-- Dışarı yönlendirme geçici bir çözümdü: öğrenci siteden çıkıyor, ne
-- başvurduğu ne de sonucun ne olduğu bilinebiliyordu.
--
-- NEDEN KOLON YETKİSİYLE
-- ----------------------
-- Formdan seçeneği kaldırmak istemciyi değiştirir, kuralı değiştirmez:
-- istek gövdesine `application_method: 'external'` yazan biri eski
-- davranışı sürdürebilirdi. Yetki kalkınca kural veritabanında duruyor.
--
-- İki kolon da `authenticated` rolünün yazma listesinden çıkıyor. Sistem
-- sabitlemesi kolonun kendi varsayılanı: application_method DEFAULT
-- 'internal', apply_url NULL. Şirket bu alanları hiç göndermiyor.
--
-- service_role'a DOKUNULMUYOR: taranan ilanlar (origin = 'scraped')
-- şirketin kendi adresine gitmeye devam ediyor ve onları tarama
-- otomasyonu yazıyor. Üretimdeki 15 ilanın tamamı bu grupta; hiçbiri
-- etkilenmiyor.
--
-- Mevcut veri: şirket tarafından açılmış ilan yok, bu yüzden geriye
-- dönük bir dönüştürme gerekmiyor.

revoke insert (application_method, apply_url) on public.listings from authenticated;
revoke update (application_method, apply_url) on public.listings from authenticated;
