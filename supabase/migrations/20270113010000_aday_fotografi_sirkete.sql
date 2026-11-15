-- BAŞVURANIN FOTOĞRAFI ŞİRKETE (15 Kasım 2026)
--
-- ÖLÇÜLEN SORUN
-- -------------
-- Şirket ekranı adayın fotoğrafını başvuru kopyasındaki `fotoUrl`den
-- okuyor; o da ESKİ alandan (`profiles.avatar_url`) dolduruluyor. Oysa
-- fotoğrafın tek kaynağı artık `social_profiles.avatar_path` (private
-- `sosyal-avatar` kovası, bkz. src/lib/profil-fotografi.ts). Canlıda:
-- fotoğraflı 12 öğrencinin 12'si yeni alanda, eski alanda yalnız 2.
-- Fotoğraf yüklemiş başvuran şirkete fotoğrafsız görünüyordu.
--
-- KARAR
-- -----
-- Şirket, başvuranın YALNIZ ŞU ANKİ avatar dosyasını okuyabiliyor ve
-- yalnız profil kopyasını görebildiği koşulda:
--   · şirket doğrulanmış ve çağıran üye (`basvuru_sirketi_mi`)
--   · paylaşım etkin (`basvuru_iletisimi_acik`) — öğrenci kapatınca
--     fotoğraf da kapanıyor, profil kopyasıyla aynı kural
--   · iki taraf arasında engelleme yok (`engelli_mi`) — avatar kapısının
--     öteki dalıyla aynı kural (bkz. 20260927120000)
-- Klasördeki eski dosyalar açılmıyor: yol `avatar_path` ile birebir
-- eşleşmeli.

/* ------------------------------------------------------------------ */
/* 1) Kapı: bu nesne, çağıranın şirketine başvurmuş birinin avatarı mı */
/* ------------------------------------------------------------------ */

create or replace function sosyal_gizli.aday_fotografi_sirkete_acik(nesne_adi text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
      from public.social_profiles sp
      join public.applications a on a.student_id = sp.profile_id
     where sp.avatar_path = nesne_adi
       and sosyal_gizli.basvuru_sirketi_mi(a.id)
       and public.basvuru_iletisimi_acik(a.id)
       and not sosyal_gizli.engelli_mi(sp.profile_id)
  )
$$;

revoke all on function sosyal_gizli.aday_fotografi_sirkete_acik(text) from public, anon;
grant execute on function sosyal_gizli.aday_fotografi_sirkete_acik(text) to authenticated;

/* ------------------------------------------------------------------ */
/* 2) Avatar okuma kapısı: eski iki dal aynen, üçüncü dal eklendi      */
/* ------------------------------------------------------------------ */

create or replace function sosyal_gizli.avatar_dosyasi_gorunur(nesne_adi text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  parcalar text[] := string_to_array(coalesce(nesne_adi, ''), '/');
  sahip uuid;
begin
  if array_length(parcalar, 1) is distinct from 2 then
    return false;
  end if;
  begin
    sahip := parcalar[1]::uuid;
  exception when others then
    return false;
  end;
  return sahip = auth.uid() or sosyal_gizli.sosyal_gorunur(sahip)
      or sosyal_gizli.aday_fotografi_sirkete_acik(nesne_adi);
end;
$$;

/* ------------------------------------------------------------------ */
/* 3) Panelin fotoğraf yolları: başvuru kimliği → avatar yolu          */
/* ------------------------------------------------------------------ */

/*
  Şirket `social_profiles` satırını okuyamıyor; yolu bu fonksiyon veriyor.
  Aynı üç koşul: kapının izin vermeyeceği bir yol hiç dönmüyor.
*/
create or replace function public.sirket_aday_foto_yollari(p_basvurular uuid[])
returns table (basvuru_id uuid, yol text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select a.id, sp.avatar_path
    from public.applications a
    join public.social_profiles sp on sp.profile_id = a.student_id
   where a.id = any(coalesce(p_basvurular, '{}'::uuid[]))
     and nullif(btrim(sp.avatar_path), '') is not null
     and sosyal_gizli.basvuru_sirketi_mi(a.id)
     and public.basvuru_iletisimi_acik(a.id)
     and not sosyal_gizli.engelli_mi(sp.profile_id)
$$;

revoke all on function public.sirket_aday_foto_yollari(uuid[]) from public, anon;
grant execute on function public.sirket_aday_foto_yollari(uuid[]) to authenticated;
