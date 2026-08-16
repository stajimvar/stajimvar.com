-- =====================================================================
-- 0008 — `logos` kovasının kabul ettiği dosya tiplerini düzelt
--
-- İki değişiklik:
--
-- 1. `image/x-icon` EKLENDİ. Şirket logolarını kendi sitelerinden alıyoruz ve
--    birçok site marka işaretini yalnızca favicon.ico olarak yayımlıyor.
--    Kova bu tipi reddettiği için Pointr, Xometry, Appier ve Constructor
--    logosuz kalıyordu.
--
-- 2. `image/svg+xml` KALDIRILDI. Kova herkese açık ve içine üçüncü taraf
--    sitelerden indirilen dosyalar konuyor. SVG bir XML belgesidir; içine
--    <script> gömülebilir. Supabase alan adından servis edilen kötü niyetli
--    bir SVG, tarayıcıda o origin bağlamında çalışır. Logo için SVG'ye
--    ihtiyacımız yok; raster formatlar yeterli.
-- =====================================================================

update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon'
]
where id = 'logos';
