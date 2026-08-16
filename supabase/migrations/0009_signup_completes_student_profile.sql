-- =====================================================================
-- 0009 — Kayıt anında öğrenci profilini ve KVKK onayını tamamla
--
-- Sorun: "Confirm email" açık olduğu için `supabase.auth.signUp()` çağrısı
-- oturum döndürmüyor. İstemci oturumsuzken `student_profiles` satırını
-- oluşturamıyor ve KVKK onayını yazamıyordu — yani kullanıcı formda kutuyu
-- işaretliyor, kayıt kaydı hiçbir yerde tutulmuyordu. Aydınlatma onayının
-- kanıtını kaybetmek KVKK açısından kabul edilemez.
--
-- Çözüm: onay bilgisi signUp sırasında kullanıcı meta verisine yazılıyor ve
-- bu tetikleyici, kayıt anında (oturum olsun olmasın) kalıcı hale getiriyor.
-- Öğrenci rolündeyse `student_profiles` satırı da burada açılıyor.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted_role user_role := coalesce((meta->>'role')::user_role, 'student');
  consented   boolean := coalesce((meta->>'kvkk_consent')::boolean, false);
begin
  insert into public.profiles (
    id, email, full_name, role,
    kvkk_consent_at, kvkk_consent_version, marketing_consent
  )
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_name', ''),
    wanted_role,
    -- Onay yoksa alan boş kalır; uydurma bir tarih yazılmaz.
    case when consented then now() else null end,
    nullif(meta->>'kvkk_consent_version', ''),
    coalesce((meta->>'marketing_consent')::boolean, false)
  );

  -- Öğrenci profili kayıt anında açılır; kullanıcı e-postasını doğrulayana
  -- kadar beklemeye gerek yok, satır zaten kişisel veri içermiyor.
  if wanted_role = 'student' then
    insert into public.student_profiles (id) values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
