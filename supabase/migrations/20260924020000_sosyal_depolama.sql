-- D aşaması, 2/3 — sosyal katmanın private Storage kovaları ve RLS'i
--
-- OKUMA YETKİSİ PAYLAŞIMIN KİTLESİYLE AYNI KAPIDAN GEÇİYOR
-- --------------------------------------------------------
-- Paylaşım satırını gizleyip görselini açık bırakmak, paylaşımı hiç
-- gizlememektir: dosya adresi bir kez sızdığında içerik sızmış olur.
-- Bu yüzden okuma politikası kendi kuralını YAZMIYOR,
-- `sosyal_gizli.paylasim_gorunur()` çağırıyor — posts, post_media,
-- post_likes, post_saves ile birebir aynı fonksiyon. Kitle kuralı,
-- arşiv ve taslak durumu değişince dosya erişimi kendiliğinden
-- değişiyor; iki yerde ayrışamıyor.
--
-- MEVCUT `avatars` KOVASI KULLANILMIYOR
-- -------------------------------------
-- O kova `public = true` (0001). Sosyal katmanın profil fotoğrafı alan
-- ve topluluk kuralına tabi; herkese açık bir kovaya koymak o kuralı
-- ilk günden delerdi. Sosyal katman kendi private kovasını kullanıyor.

/* ================================================================== */
/*  1) KOVALAR — private, üç görsel türü, açık boyut sınırı            */
/* ================================================================== */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('sosyal-paylasim', 'sosyal-paylasim', false, 5242880,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('sosyal-avatar',   'sosyal-avatar',   false, 2097152,
     array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/*
  TÜR DENETİMİ UZANTIYA DEĞİL KOVAYA BAĞLI.

  Uzantı kullanıcının yazdığı bir dize; `.jpg` adıyla SVG yüklenebilir.
  `allowed_mime_types` sunucu tarafında, Storage servisinin kendi
  denetiminde çalışıyor: GIF, SVG ve video kovaya hiç giremiyor.
  Boyut sınırı da burada — "sınırsız yükleme" diye bir hâl yok.
*/

/* ================================================================== */
/*  2) YARDIMCILAR — sosyal_gizli, PostgREST'e kapalı                  */
/* ================================================================== */

/*
  Yardımcılar neden `sosyal_gizli`de: 20260922010000'de ölçüldü —
  `public` şemadaki bir yardımcı `/rpc/...` üzerinden doğrudan
  çağrılabiliyor ve "bu paylaşım var mı / sahibi kim" sorusunu
  cevaplayan bir kâhin hâline geliyor. Bu şema PostgREST tarafından
  sunulmuyor.
*/

/*
  Yol: sosyal-paylasim/<yazar>/<post>/<rastgele>.<uzanti>
  İkinci klasör paylaşım kimliği; dosyadan paylaşıma tek adımda ulaşılıyor.
  Beklenen biçimde olmayan yol için FALSE — fail-closed.
*/
create or replace function sosyal_gizli.paylasim_dosyasi_gorunur(nesne_adi text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  parcalar text[] := string_to_array(coalesce(nesne_adi, ''), '/');
  post_kimligi uuid;
begin
  if array_length(parcalar, 1) is distinct from 3 then
    return false;
  end if;
  begin
    post_kimligi := parcalar[2]::uuid;
  exception when others then
    return false;
  end;
  return sosyal_gizli.paylasim_gorunur(post_kimligi);
end;
$$;

/*
  Avatar yolu: sosyal-avatar/<profil>/<rastgele>.<uzanti>
  Profil fotoğrafı da alan/topluluk kuralını AŞMIYOR: görünmeyen bir
  profilin fotoğrafı da görünmüyor.
*/
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
  return sahip = auth.uid() or sosyal_gizli.sosyal_gorunur(sahip);
end;
$$;

/* ================================================================== */
/*  3) POLİTİKALAR                                                     */
/* ================================================================== */

/*
  YAZMA: yalnız kendi klasörü.
  `(storage.foldername(name))[1] = auth.uid()::text` — depodaki `cvs`
  kovasının kalıbı (0001). Sahiplik yolun BİRİNCİ parçasında olduğu
  için politika tek karşılaştırmayla zorlanabiliyor.
*/
drop policy if exists "sosyal kendi klasorune yukler" on storage.objects;
create policy "sosyal kendi klasorune yukler"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('sosyal-paylasim', 'sosyal-avatar')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sosyal kendi dosyasini gunceller" on storage.objects;
create policy "sosyal kendi dosyasini gunceller"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('sosyal-paylasim', 'sosyal-avatar')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('sosyal-paylasim', 'sosyal-avatar')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/*
  SİLME de yalnız kendi klasörü. Yarım kalan yüklemeyi temizleme yolu
  bu: istemci kendi dosyalarını siliyor, başkasınınkine hiçbir koşulda
  dokunamıyor. Eski profil fotoğrafının temizlenmesi de buradan.
*/
drop policy if exists "sosyal kendi dosyasini siler" on storage.objects;
create policy "sosyal kendi dosyasini siler"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('sosyal-paylasim', 'sosyal-avatar')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/*
  OKUMA: kitle kapısı. Sahibi kendi dosyasını her hâlükârda görüyor
  (taslak yüklerken kendi önizlemesi gerekiyor); başkası yalnız
  paylaşım kendisine görünüyorsa.
*/
drop policy if exists "sosyal paylasim dosyasi kitlesine acik" on storage.objects;
create policy "sosyal paylasim dosyasi kitlesine acik"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sosyal-paylasim'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or sosyal_gizli.paylasim_dosyasi_gorunur(name)
    )
  );

drop policy if exists "sosyal avatar gorunurluge tabi" on storage.objects;
create policy "sosyal avatar gorunurluge tabi"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sosyal-avatar'
    and sosyal_gizli.avatar_dosyasi_gorunur(name)
  );

/*
  `anon` bu iki kovada hiçbir yetkiye sahip değil: yukarıdaki
  politikaların hepsi `to authenticated`. Giriş yapmamış ziyaretçi
  imzalı URL de alamıyor, çünkü imzayı üreten istek de RLS'e tabi.
*/
