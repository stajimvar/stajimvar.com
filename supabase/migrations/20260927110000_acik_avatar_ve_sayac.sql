-- PROFİL FOTOĞRAFI VE PAYLAŞIM SAYISI HERKESE AÇIK; PAYLAŞIMLAR DEĞİL
--
-- ÜRÜN KARARI
-- -----------
--   profil fotoğrafı   herkese açık (giriş yapmamış ziyaretçiye de)
--   paylaşım sayısı    herkese açık
--   paylaşımların içeriği   yalnız bağlantı/alan kapısından geçene
--
-- "Bu kişi var ve şu kadar üretmiş" görünüyor, içerik görünmüyor —
-- bağlantı kurmak için bir sebep kalıyor.
--
-- BUGÜNKÜ DURUM VE İKİ AYRI ENGEL
-- -------------------------------
-- 1) AVATAR: `sosyal-avatar` özel bir kova ve okuma politikası yalnız
--    `to authenticated`. Üstelik `sosyal_gorunur` oturum yokken tanımı
--    gereği `false` dönüyor (`auth.uid() is null` dalı). Yani giriş
--    yapmamış ziyaretçi hiçbir avatarı göremiyordu; kişi fotoğrafını
--    bir kez koysa bile herkese açık profilinde baş harf çıkıyordu.
--
-- 2) SAYAÇ: `public.sosyal_sayaclar` paylaşımları GÖREBİLDİĞİN KADAR
--    sayıyor — `paylasim_gorunur(p.id)` süzgeci sayımın içinde. Bu
--    fonksiyonu `anon`a açmak işe yaramazdı: bağlantısı olmayan kişi
--    gerçek sayıyı değil 0 görürdü. Sayım ile içerik aynı kapıya
--    bağlanmış durumda, o yüzden AYRI bir fonksiyon gerekiyor.
--
-- PAYLAŞIM RLS'İNE DOKUNULMUYOR
-- -----------------------------
-- `posts` politikası ve `sosyal_gizli.paylasim_gorunur` olduğu gibi
-- kalıyor. Açılan tek şey SAYI ve FOTOĞRAF; içerik kapısı aynı.

-- ------------------------------------------------------------------
-- 1) AVATAR: YAYIMLANMIŞ PROFİLİN FOTOĞRAFI HERKESE GÖRÜNÜR
-- ------------------------------------------------------------------
--
-- Üç dal: sahibi, yayımlanmış profil, eski görünürlük kapısı.
-- Ortadaki dal YENİ ve oturum istemiyor — `anon` da buradan geçiyor.
--
-- `engelli_mi` KONTROLÜ BU DALDA YOK ve olamaz: engelleme iki kişi
-- arasında bir ilişki, oturumsuz çağıranın kimliği yok. Zaten
-- engellenen kişi profili de göremiyor; avatar tek başına ek bir şey
-- sızdırmıyor. Oturumlu çağıran için üçüncü dal (`sosyal_gorunur`)
-- engellemeyi uygulamaya devam ediyor.
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

  if sahip = auth.uid() then
    return true;
  end if;

  /* YENİ: yayımlanmış profilin fotoğrafı herkese açık. */
  if exists (
    select 1 from public.social_profiles o
     where o.profile_id = sahip and o.yayinda_mi
  ) then
    return true;
  end if;

  return sosyal_gizli.sosyal_gorunur(sahip);
end;
$$;

-- Oturumsuz ziyaretçi için okuma. Yazma/silme politikaları
-- `to authenticated` olarak duruyor: yükleme ve değiştirme yalnız
-- hesap sahibinde.
drop policy if exists "sosyal avatar yayimda ise herkese acik" on storage.objects;
create policy "sosyal avatar yayimda ise herkese acik"
  on storage.objects for select to anon
  using (
    bucket_id = 'sosyal-avatar'
    and sosyal_gizli.avatar_dosyasi_gorunur(name)
  );

-- ------------------------------------------------------------------
-- 2) AÇIK SAYAÇ: SAYIYI VERİR, İÇERİĞİ VERMEZ
-- ------------------------------------------------------------------
--
-- `sosyal_sayaclar`tan farkı tek satır: paylaşım sayımında
-- `paylasim_gorunur` süzgeci YOK. Arşivlenmemiş paylaşımların tamamı
-- sayılıyor, ama hiçbir paylaşımın kimliği, başlığı ya da görseli
-- dönmüyor — geriye yalnız iki tam sayı gidiyor.
--
-- KAPI `yayinda_mi`: yayımlanmamış profil için satır dönmüyor. Arayüz
-- satır gelmediğinde sayacı hiç çizmiyor; 0 uydurmuyor ("bilmiyorum"
-- ile "sıfır" aynı şey değil).
--
-- `engelli_mi` BURADA DA YOK, sebebi yukarıdakiyle aynı: oturumsuz
-- çağıranın kimliği yok. Oturumlu çağıran için `sosyal_sayaclar`
-- kullanılmaya devam ediyor ve o engellemeyi uyguluyor.
create or replace function public.sosyal_acik_sayaclar(hedef uuid)
returns table (paylasim integer, baglanti integer)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*)::int from public.posts p
      where p.author_id = hedef
        and p.archived_at is null),
    (select count(*)::int from public.connections c
      where c.durum = 'kabul' and (c.requester_id = hedef or c.addressee_id = hedef))
  where exists (
    select 1 from public.social_profiles o
     where o.profile_id = hedef and o.yayinda_mi
  )
$$;

revoke all on function public.sosyal_acik_sayaclar(uuid) from public;
grant execute on function public.sosyal_acik_sayaclar(uuid) to anon, authenticated;

comment on function public.sosyal_acik_sayaclar(uuid) is
  'Yayımlanmış profilin paylaşım ve bağlantı SAYISI. İçerik döndürmez; paylaşım RLS''i bundan etkilenmez.';
