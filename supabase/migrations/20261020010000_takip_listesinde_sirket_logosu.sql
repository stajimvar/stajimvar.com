-- TAKİP LİSTELERİNDE ŞİRKETİN LOGOSU GÖRÜNÜYOR
--
-- ÖLÇÜLEN DURUM (canlı, 19 Eylül 2026)
-- ------------------------------------
-- Ağım'daki "Takip ettiğin şirketler" bölümünde şirket, logosu yerine
-- baş harfleriyle ("OG") çiziliyordu. Sebep: satırın fotoğrafı
-- `social_profiles.avatar_path`ten okunuyor, şirket sayfalarında o alan
-- BOŞ ve logo başka yerde — `companies.logo_url`de.
--
--   @ogulsize     avatar_path YOK   companies.logo_url DOLU
--   @stajimvaryg  avatar_path YOK   companies.logo_url DOLU
--
-- Yani veri vardı, RPC onu hiç döndürmüyordu; istemci de göstermediği
-- bir şeyi gösteremiyordu.
--
-- ÇÖZÜM: iki liste RPC'si de `logo_url` döndürüyor. `avatar_path` ile
-- BİRLİKTE duruyor, onun yerine geçmiyor: şirket kendi sosyal profiline
-- fotoğraf yüklediğinde (paylaşım akışındaki profil fotoğrafı) o
-- kazanmalı, kurumsal logo yedek kalmalı. Hangisinin öncelikli olduğu
-- arayüzün kararı; sunucu ikisini de veriyor.
--
-- ÖĞRENCİ SATIRINDA `logo_url` HER ZAMAN NULL: `sirket_id` boş olduğu
-- için join eşleşmiyor. Ayrı bir dal yazmaya gerek yok.
--
-- GÖRÜNÜRLÜK GENİŞLEMİYOR: `companies` tablosunun okunabilir sütunları
-- 20261016010000 ile zaten anon/authenticated'a açık (logo_url o listede).
-- Burada yeni bir alan açılmıyor, var olan alan listeye ekleniyor.

drop function if exists public.takipcilerim(integer, integer);
create or replace function public.takipcilerim(p_limit integer default 50, p_offset integer default 0)
returns table (
  profile_id  uuid,
  username    text,
  gorunen_ad  text,
  avatar_path text,
  sirket_id   uuid,
  logo_url    text,
  takip_tarihi timestamptz
)
language sql stable security definer set search_path = public
as $$
  select sp.profile_id, sp.username, sp.gorunen_ad, sp.avatar_path, sp.sirket_id, c.logo_url, t.created_at
    from public.takipler t
    join public.social_profiles sp on sp.profile_id = t.takipci_id
    left join public.companies c on c.id = sp.sirket_id
   where t.hedef_id = auth.uid()
     and sp.yayinda_mi
     and not sosyal_gizli.engelli_mi(sp.profile_id)
   order by t.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function public.takipcilerim(integer, integer) from public;
grant execute on function public.takipcilerim(integer, integer) to authenticated;

drop function if exists public.takip_ettiklerim(integer, integer);
create or replace function public.takip_ettiklerim(p_limit integer default 50, p_offset integer default 0)
returns table (
  profile_id  uuid,
  username    text,
  gorunen_ad  text,
  avatar_path text,
  sirket_id   uuid,
  logo_url    text,
  takip_tarihi timestamptz
)
language sql stable security definer set search_path = public
as $$
  select sp.profile_id, sp.username, sp.gorunen_ad, sp.avatar_path, sp.sirket_id, c.logo_url, t.created_at
    from public.takipler t
    join public.social_profiles sp on sp.profile_id = t.hedef_id
    left join public.companies c on c.id = sp.sirket_id
   where t.takipci_id = auth.uid()
     and sp.yayinda_mi
     and not sosyal_gizli.engelli_mi(sp.profile_id)
   order by t.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function public.takip_ettiklerim(integer, integer) from public;
grant execute on function public.takip_ettiklerim(integer, integer) to authenticated;
