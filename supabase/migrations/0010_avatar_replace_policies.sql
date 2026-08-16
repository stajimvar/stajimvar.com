-- =====================================================================
-- 0010 — Kullanıcı kendi avatarını değiştirebilsin
--
-- 0001'de yalnızca INSERT politikası vardı. Profil fotoğrafı değiştirmek
-- aynı yola yeniden yazmayı (upsert) gerektiriyor; UPDATE politikası
-- olmadığı için ikinci yükleme sessizce başarısız oluyordu.
--
-- Sınır aynı: yalnızca kendi kullanıcı kimliğiyle adlandırılmış klasör.
-- =====================================================================

create policy "kullanici kendi avatarini gunceller"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "kullanici kendi avatarini siler"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
