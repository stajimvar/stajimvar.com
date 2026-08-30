-- DEPODA EKSİK OLAN DEPOLAMA POLİTİKASI
--
-- Üretimde `storage.objects` üzerinde "avatar ve logo herkese acik"
-- adında bir SELECT politikası var; depodaki göçlerde yok. 0001 yalnızca
-- YÜKLEME politikasını ("avatar ve logo yukleme") yazıyor, okumayı
-- yazmıyor.
--
-- Sonucu sessiz ve büyük: depodan sıfırdan kurulan bir veritabanında
-- avatars ve logos kovalarındaki hiçbir dosya okunamaz — profil
-- fotoğrafları ve kurum logoları herkes için kırık görünür.
--
-- NEDEN ŞİMDİYE KADAR GÖRÜLMEDİ
-- Şema temel denetimi yalnızca `public` ve `extensions` şemalarını
-- karşılaştırıyor; `storage` hiç bakılmayan bir alandı. CV erişim
-- politikaları da orada yaşıyor, yani bu kör noktanın maliyeti yüksek.
--
-- Politika üretimdeki tanımın aynısı. Kova adı dışında koşul yok:
-- avatar ve logo zaten herkese açık gösteriliyor.
drop policy if exists "avatar ve logo herkese acik" on storage.objects;
create policy "avatar ve logo herkese acik" on storage.objects
  for select using (bucket_id in ('avatars', 'logos'));
