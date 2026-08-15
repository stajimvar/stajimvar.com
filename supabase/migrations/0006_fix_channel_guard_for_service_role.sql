-- =====================================================================
-- 0006 — Kanal doğrulama muhafızını sunucu tarafı için düzelt
--
-- 0005'teki guard_channel_verification() yalnızca is_admin()'e bakıyordu.
-- Kanal doğrulamasını yapan Edge Function service_role ile çalışır ve
-- service_role admin DEĞİLDİR — yani muhafız, korumaya çalıştığı sistemin
-- kendi doğrulama akışını da bloke ediyordu.
--
-- Yeni mantık, güveni JWT'nin varlığına göre kuruyor:
--   - JWT yok      → doğrudan veritabanı bağlantısı (migrasyon, bakım) → geç
--   - service_role → sunucu tarafı pipeline → geç
--   - admin        → geç
--   - diğer herkes → reddet (şirket kendi kanalını doğrulayamaz)
-- =====================================================================

create or replace function public.guard_channel_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
begin
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;

  -- PostgREST üzerinden gelen her istek (anon dahil) claim taşır.
  -- Claim yoksa istek API'den gelmiyor demektir: migrasyon veya bakım bağlantısı.
  if claims is null then
    return new;
  end if;

  if claims->>'role' = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' and new.verification <> 'unverified' then
    raise exception 'Başvuru kanalı doğrulamasını yalnızca StajımVar yapar';
  end if;

  if tg_op = 'UPDATE' and new.verification is distinct from old.verification then
    raise exception 'Başvuru kanalı doğrulamasını yalnızca StajımVar yapar';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_channel_verification() from public, anon, authenticated;
