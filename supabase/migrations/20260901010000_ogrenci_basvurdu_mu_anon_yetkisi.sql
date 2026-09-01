-- P0: ANON ROLÜNDE EXECUTE YOKTU, TÜM İLAN OKUMALARI DÜŞTÜ
--
-- `listings` select politikası `ogrenci_basvurdu_mu()` çağırıyor.
-- Fonksiyon `security definer` olarak kuruldu ama EXECUTE yalnız
-- `authenticated` ve `service_role` rollerine verildi. Anonim ziyaretçi
-- politikayı çalıştıramadığı için ana sayfa dahil her ilan okuması
-- "permission denied for function ogrenci_basvurdu_mu" ile düştü.
--
-- Anon için sızıntı yok: `auth.uid()` null olduğundan
-- `a.student_id = auth.uid()` hiçbir satırda tutmuyor ve fonksiyon her
-- zaman false dönüyor. Yani anon yalnız politikanın çalışmasını
-- sağlıyor, hiçbir başvuru bilgisi görmüyor.

grant execute on function public.ogrenci_basvurdu_mu(uuid) to anon;
