-- KUYRUK GÖRÜNÜMÜ RLS'İ ATLIYORDU
--
-- ÖLÇÜLDÜ (14 Eylül 2026, üretim): anon anahtarıyla
--
--   GET /rest/v1/ilan_bildirim_kuyrugu?select=id,listing_url
--   → [{"id":"4b2f83cb…","listing_url":"https://stajimvar.com/ilan/…"}]
--
-- Aynı anahtarla `listing_reports` tablosu `[]` dönüyordu. Yani RLS
-- tabloda çalışıyor, GÖRÜNÜMDE çalışmıyordu.
--
-- SEBEP: Postgres'te bir görünüm, varsayılan olarak görünümün SAHİBİ
-- yetkisiyle çalışıyor. Sahip `postgres` ve o rol RLS'e tabi değil; yani
-- görünüm, altındaki tablonun politikalarını sessizce atlıyor. Tabloya
-- "yalnız yönetici okur" politikası yazmak, görünümü de kapattığımız
-- anlamına GELMİYORDU.
--
-- NE SIZIYORDU: bekleyen bildirimlerin ilan adresi, şirket, pozisyon,
-- sorun türü, tarih ve son hata metni. `reporter_email` ile `details`
-- görünümde olmadığı için sızmadı — ama bu bir tasarım değil şans:
-- görünüme bir alan eklemek e-postayı herkese açardı.
--
-- İKİ KATMANLI DÜZELTME
-- --------------------
-- 1) `security_invoker`: görünüm artık ÇAĞIRANIN yetkisiyle çalışıyor,
--    yani tablodaki `is_admin()` politikası görünümde de geçerli.
-- 2) `revoke select ... from anon`: birinci madde yeterli, ama görünümün
--    anon'a hiç açık olmaması için sebep de yok. Bir gün politika
--    değişirse ikinci kilit duruyor.

alter view public.ilan_bildirim_kuyrugu set (security_invoker = on);

revoke select on public.ilan_bildirim_kuyrugu from anon;

comment on view public.ilan_bildirim_kuyrugu is
  'Gönderilmeyi bekleyen bildirimler. security_invoker: RLS çağıranın '
  'yetkisiyle uygulanıyor, yani yalnız yönetici okuyor.';
