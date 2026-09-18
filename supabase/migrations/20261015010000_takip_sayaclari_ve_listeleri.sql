-- TAKİP SAYAÇLARI VE LİSTELERİ
--
-- KARAR (kullanıcı, 18 Eylül 2026): öğrenci şirket sayfasında "Takip et"
-- görsün; öğrencinin kendi profilinde "takip" (takip ettiği şirket)
-- sayacı açılsın; şirket Ağım'da takipçilerini görsün.
--
-- 20261014010000 tabloyu, politikaları ve iki sayaç RPC'sini kurdu.
-- Burada eksik olan üç şey:
--
--   1. sosyal_sayaclar() takipçi ve takip sayılarını da dönsün — arayüz
--      profil başlığını tek RPC ile çiziyor, ikinci bir çağrı eklemek
--      yerine aynı satıra iki sütun ekleniyor. Sütun adıyla okunduğu
--      için geriye uyumlu.
--
--   2. Takipçi listesi tek RPC'den. İlk taslak "şirket öğrenci profilini
--      okuyamaz, sektör şartı var" diye gerekçelendirmişti; ÖLÇÜLDÜ, yanlış:
--      okuma politikası artık sosyal_gorunur() (yayında + engelsiz),
--      sektör sorulmuyor. RPC'nin gerçek gerekçesi başka: takipler ×
--      social_profiles birleşimini, engel süzgecini ve sayfalamayı tek
--      çağrıda vermek; ve YALNIZ çağıranın kendi takipçilerini döndürmek
--      (başkasının takipçi listesi hiçbir yoldan okunmuyor).
--
--   3. Öğrencinin takip ettiği şirketler: şirket sayfaları zaten herkese
--      açık, RPC şart değil; ama takipçi listesiyle aynı biçimde dönsün
--      diye simetrik bir RPC var. İkisi de sayfalı.

-- ------------------------------------------------------- 1. sayaçlar
/* Dönüş tipi değişiyor; CREATE OR REPLACE bunu yapamıyor, önce DROP. */
drop function if exists public.sosyal_sayaclar(uuid);

create function public.sosyal_sayaclar(hedef uuid)
returns table (paylasim integer, baglanti integer, takipci integer, takip integer)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*)::int from public.posts p
      where p.author_id = hedef
        and p.archived_at is null
        and sosyal_gizli.paylasim_gorunur(p.id)),
    (select count(*)::int from public.connections c
      where c.durum = 'kabul' and (c.requester_id = hedef or c.addressee_id = hedef)),
    (select count(*)::int from public.takipler t where t.hedef_id = hedef),
    (select count(*)::int from public.takipler t where t.takipci_id = hedef)
  where sosyal_gizli.sosyal_gorunur(hedef)
$$;

revoke all on function public.sosyal_sayaclar(uuid) from public;
grant execute on function public.sosyal_sayaclar(uuid) to authenticated;

-- ------------------------------------------------ 2. takipçilerim
create or replace function public.takipcilerim(p_limit integer default 50, p_offset integer default 0)
returns table (
  profile_id  uuid,
  username    text,
  gorunen_ad  text,
  avatar_path text,
  sirket_id   uuid,
  takip_tarihi timestamptz
)
language sql stable security definer set search_path = public
as $$
  select sp.profile_id, sp.username, sp.gorunen_ad, sp.avatar_path, sp.sirket_id, t.created_at
    from public.takipler t
    join public.social_profiles sp on sp.profile_id = t.takipci_id
   where t.hedef_id = auth.uid()
     and sp.yayinda_mi
     and sp.username is not null
     and not sosyal_gizli.engelli_mi(sp.profile_id)
   order by t.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function public.takipcilerim(integer, integer) from public;
grant execute on function public.takipcilerim(integer, integer) to authenticated;

-- --------------------------------------------- 3. takip ettiklerim
create or replace function public.takip_ettiklerim(p_limit integer default 50, p_offset integer default 0)
returns table (
  profile_id  uuid,
  username    text,
  gorunen_ad  text,
  avatar_path text,
  sirket_id   uuid,
  takip_tarihi timestamptz
)
language sql stable security definer set search_path = public
as $$
  select sp.profile_id, sp.username, sp.gorunen_ad, sp.avatar_path, sp.sirket_id, t.created_at
    from public.takipler t
    join public.social_profiles sp on sp.profile_id = t.hedef_id
   where t.takipci_id = auth.uid()
     and sp.yayinda_mi
     and not sosyal_gizli.engelli_mi(sp.profile_id)
   order by t.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function public.takip_ettiklerim(integer, integer) from public;
grant execute on function public.takip_ettiklerim(integer, integer) to authenticated;
