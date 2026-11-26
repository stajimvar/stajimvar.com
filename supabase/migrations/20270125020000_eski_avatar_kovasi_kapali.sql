/*
  ESKİ PROFİL FOTOĞRAFI KOVASI KAPALI (26 Kasım 2026)

  Profil fotoğrafı Eylül'den beri kapalı `sosyal-avatar` kovasında
  (social_profiles.avatar_path); eski `uploadAvatar` yolu kaldırıldı
  (StudentProfileView). Eski `avatars` kovası ise hâlâ herkese açıktı ve
  "avatar ve logo herkese acik" politikası kovanın tamamını herkese
  okutuyordu (listeleme dahil). Ölçüldü: kovada 2 eski fotoğraf var,
  ikisinin sahibinin de yeni fotoğrafı kapalı kovada.

  Gizlilik metni "profil fotoğrafının herkese açık adresi yoktur" diyor;
  bu göç sistemi metne uyduruyor.

  - `avatars` kovası herkese açık değil (public = false).
  - Okuma politikası ikiye ayrıldı: logolar herkese açık (değişmedi),
    eski fotoğrafı yalnız sahibi okuyabiliyor.
  - Dosya SİLİNMİYOR; geri almak tek satır.
*/

update storage.buckets set public = false where id = 'avatars';

drop policy if exists "avatar ve logo herkese acik" on storage.objects;

create policy "logo herkese acik" on storage.objects
  for select using (bucket_id = 'logos');

create policy "eski avatar yalniz sahibine" on storage.objects
  for select using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
