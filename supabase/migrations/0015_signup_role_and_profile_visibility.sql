-- =============================================================================
-- Kayıtta rol seçilemez + öğrenci profilleri yalnızca doğrulanmış şirketlere
-- =============================================================================
--
-- BULGU
-- -----
-- `profiles.role`, kayıt sırasında `raw_user_meta_data->>'role'` değerinden
-- alınıyordu. O meta veriyi İSTEMCİ gönderiyor. Yani kayıt olurken
-- `role: 'company'` geçen herkes şirket kullanıcısı oluyordu.
--
-- Tek başına sınırlı bir sorun olurdu; asıl zarar `student_profiles`
-- politikasıyla birleşince çıkıyordu:
--
--     using (is_open_to_offers AND app_role() = 'company')
--
-- Kendini şirket ilan eden herkes, teklife açık TÜM öğrenci profillerini
-- okuyabiliyordu: üniversite, bölüm, not ortalaması, özgeçmiş metni.
-- Doğrulama yok, şirket üyeliği yok; tek şart kayıt isteğine bir alan eklemek.
--
-- DÜZELTME
-- --------
-- 1) Tetikleyici artık meta veriyi yok sayıp herkesi `student` yazıyor.
--    Şirket rolü yalnızca yönetici onayından geçen sahiplenme talebiyle
--    veriliyor (approve_company_claim).
-- 2) Politika üç şart birden istiyor: öğrenci açıkça izin vermiş olacak,
--    bakan kişi gerçek bir şirketin üyesi olacak, o şirket doğrulanmış olacak.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  consented boolean := coalesce((meta->>'kvkk_consent')::boolean, false);
begin
  insert into public.profiles (
    id, email, full_name, role,
    kvkk_consent_at, kvkk_consent_version, marketing_consent
  )
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_name', ''),
    -- DAİMA 'student'. Yetki yükseltme kayıt formundan yapılamaz.
    'student',
    case when consented then now() else null end,
    nullif(meta->>'kvkk_consent_version', ''),
    coalesce((meta->>'marketing_consent')::boolean, false)
  );

  insert into public.student_profiles (id) values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$BODY$;

drop policy if exists "sirketler acik profilleri gorur" on public.student_profiles;

create policy "dogrulanmis sirketler acik profilleri gorur" on public.student_profiles
  for select using (
    is_open_to_offers
    and exists (
      select 1
      from public.company_members cm
      join public.companies c on c.id = cm.company_id
      where cm.user_id = auth.uid()
        and c.verified = true
    )
  );

-- DOĞRULANDI (geçici bir kullanıcıyla, gerçek HTTP üzerinden):
--   role:'company' meta verisiyle kayıt   -> veritabanına 'student' yazıldı
--   aynı kullanıcı student_profiles okur  -> yalnızca kendi satırı (1)
-- Test kullanıcısı sonrasında silindi.
