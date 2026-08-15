-- =============================================================================
-- DÜZELTME — 0002'de yapılan hatanın telafisi
--
-- 0002'de yardımcı fonksiyonların EXECUTE hakkı anon rolünden de alınmıştı.
-- Ancak RLS politikaları çağıran rolün yetkisiyle değerlendiriliyor; bu yüzden
-- "yayindaki ilanlar herkese acik" politikası is_company_member() çağıramadı ve
-- GİRİŞ YAPMAMIŞ ZİYARETÇİLER HİÇBİR İLANI GÖREMEZ hale geldi.
--
-- Bu fonksiyonların anon'a açık olması güvenlik sorunu değil: yalnızca çağıranın
-- kendi rolünü/üyeliğini döndürüyorlar, başkasının verisini sızdırmıyorlar.
-- =============================================================================

grant execute on function public.app_role()              to anon, authenticated;
grant execute on function public.is_admin()              to anon, authenticated;
grant execute on function public.is_company_member(uuid) to anon, authenticated;
