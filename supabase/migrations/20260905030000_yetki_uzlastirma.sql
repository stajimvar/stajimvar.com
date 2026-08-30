-- YETKİ FARKLARI — DENETİMİN KÖR NOKTASI
--
-- Şema temel denetimi tabloları, fonksiyonları, politikaları ve
-- tetikleyicileri karşılaştırıyor ama GRANT/REVOKE satırlarını yalnızca
-- ayrı bir dosyaya döküyor, karşılaştırmıyor. Üretim ile depodan kurulan
-- şemanın yetki dökümleri elle karşılaştırıldığında üç fark çıktı.
--
-- 1) app_role / is_admin / is_company_member: PUBLIC'ten alınmamış
--
-- Üretimde bu üç yardımcı fonksiyonun EXECUTE hakkı PUBLIC'ten geri
-- alınmış; depodaki 0002_harden_functions yalnızca üç TETİKLEYİCİ
-- fonksiyonu geri alıyor, bu üçünü atlıyor. Yani depodan kurulan bir
-- veritabanı üretimden GEVŞEK kalkıyor.
--
-- 0003_fix_anon_execute'un anon ve authenticated'a verdiği EXECUTE
-- korunuyor: RLS politikaları çağıranın yetkisiyle değerlendiği için o
-- yetki alınırsa giriş yapmamış ziyaretçi hiçbir ilanı göremiyor. Burada
-- alınan yalnızca PUBLIC — yani ileride eklenecek her yeni rolün
-- kendiliğinden aldığı hak.
revoke all on function public.app_role()                from public;
revoke all on function public.is_admin()                from public;
revoke all on function public.is_company_member(uuid)   from public;

grant execute on function public.app_role()              to anon, authenticated;
grant execute on function public.is_admin()              to anon, authenticated;
grant execute on function public.is_company_member(uuid) to anon, authenticated;

-- 2) listings.last_seen_at okunamıyordu
--
-- Üretimde anon ve authenticated bu sütunu okuyabiliyor; depodaki
-- göçlerde karşılık gelen yetki yok. Arayüz onu kullanıyor:
-- InternshipCard ve CompanyPage "en son ne zaman görüldü" tazelik
-- satırını bu alandan çiziyor. Depodan kurulan bir ortamda o satır
-- sessizce kaybolurdu.
grant select (last_seen_at) on public.listings to anon, authenticated;
