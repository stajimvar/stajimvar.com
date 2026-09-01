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

-- VERSİYON UZAK DEFTERE GÖRE SEÇİLDİ
--
-- Bu düzeltme kesinti sırasında önce doğrudan uygulandı ve uzak defter
-- `20260901031143` satırını kendisi yazdı. Yerel dosyaya başka bir
-- versiyon vermek `remoteOnly` ayrışması üretiyor ve `db push`
-- kilitleniyor; dosya bu yüzden defterdeki versiyonu taşıyor.

grant execute on function public.ogrenci_basvurdu_mu(uuid) to anon;
