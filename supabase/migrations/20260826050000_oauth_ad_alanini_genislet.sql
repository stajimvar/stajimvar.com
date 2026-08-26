-- OAuth ile gelen kullanıcının adını da yakala.
--
-- Trigger yalnızca meta->>'full_name' okuyordu; bunu bizim kayıt formumuz
-- yazıyor. Google ve Microsoft ile gelen kullanıcıda alan adı sağlayıcıya
-- göre değişiyor (name, preferred_username). Yakalanmayınca profil adsız
-- kalıyor ve kullanıcı sitede kendi adı yerine boşluk görüyordu.
--
-- ROL YİNE DAİMA 'student': yetki yükseltme kayıt yolundan yapılamaz.
-- OAuth ile gelmek ŞİRKET DOĞRULAMASI DEĞİLDİR; ilan yayınlama ve aday
-- erişimi company_members + RLS kapısının arkasında kalmaya devam ediyor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  consented boolean := coalesce((meta->>'kvkk_consent')::boolean, false);
  ad        text := nullif(trim(coalesce(
                      meta->>'full_name',
                      meta->>'name',
                      meta->>'preferred_username',
                      ''
                    )), '');
begin
  insert into public.profiles (
    id, email, full_name, role,
    kvkk_consent_at, kvkk_consent_version, marketing_consent
  )
  values (
    new.id,
    new.email,
    coalesce(ad, ''),
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
$function$;
