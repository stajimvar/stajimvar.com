-- E aşaması — beğenen kimliğinin gizlenmesi
--
-- ÖLÇÜLEN SIZINTI
-- ---------------
-- 20260923070000'deki `begeniler okunur` politikası üç dallıydı:
--
--   user_id = auth.uid()
--   or sosyal_gizli.paylasim_sahibi(post_id) = auth.uid()
--   or sosyal_gizli.paylasim_gorunur(post_id)
--
-- İkinci ve üçüncü dal `post_likes` SATIRLARINI açıyordu; satırda da
-- `user_id` var. Gerçek yerel PostgREST ile ölçüldü:
--
--   PAYLASIM SAHIBI  -> [{"user_id":"f9234b38-…"}]   (1 satır)
--   UZAK (ne sahibi ne beğenen) -> [{"user_id":"6c06ddcb-…"}]
--
-- Yani "kim beğendi" sorusunun cevabı hem paylaşım sahibine hem de
-- paylaşımı görebilen herkese açıktı. Arayüzde böyle bir liste hiç
-- çizilmemişti; sızıntı ekranda değil VERİ KATMANINDAYDI. Bir istemci
-- ya da başka bir araç doğrudan `/rest/v1/post_likes?post_id=eq.…`
-- isteğiyle beğenenlerin kimliğini toplayabilirdi.
--
-- NEDEN "sahibi görebilsin" DE YETMİYOR
-- -------------------------------------
-- Beğeni, kaydetme kadar sessiz bir eylem. Kullanıcı bir paylaşımı
-- beğenirken kimliğini paylaşım sahibine bildirmeyi seçmiş olmuyor;
-- yalnız sayacı bir artırıyor. `post_saves` bu kuralı zaten taşıyor
-- ("kaydedilenler yalniz sahibine": sahibi bile kaydedenleri görmüyor).
-- İki eylem aynı ağırlıkta olduğu hâlde farklı davranıyordu; fark
-- kapanıyor.
--
-- SAYIYI KAYBETMİYORUZ
-- --------------------
-- Politika daralınca `select count(*) from post_likes` istemci için
-- yalnız KENDİ satırını sayar hâle geliyor; yani her paylaşım 0 ya da 1
-- görünürdü. Bu yüzden sayı, satır döndürmeyen dar kapsamlı bir RPC'ye
-- taşınıyor. Kalıp yeni değil: `sosyal_sayaclar` da aynı biçimde
-- `security definer` olup yetkisiz çağırana SATIR DÖNDÜRMÜYOR.

/* ================================================================== */
/*  1) POLİTİKA: YALNIZ KENDİ SATIRI                                   */
/* ================================================================== */

/*
  INSERT ve DELETE zaten `user_id = auth.uid()` ile sınırlı; onlara
  dokunulmuyor. Kendi paylaşımını beğenmek de serbest kalıyor, çünkü
  `paylasim_gorunur` sahibi ilk dalda kapsıyor.
*/
drop policy if exists "begeniler okunur" on public.post_likes;
create policy "begeniler okunur" on public.post_likes
  for select to authenticated
  using (user_id = auth.uid());

comment on table public.post_likes is
  'Beğeni satırları YALNIZ sahibine okunur. Paylaşımın sahibi dâhil kimse başkasının beğenisini göremez; toplam sayı public.paylasim_begeni_sayisi(uuid) ile alınır.';

/* ================================================================== */
/*  2) SAYI: DAR KAPSAMLI RPC                                          */
/* ================================================================== */

/**
 * Bir paylaşımın toplam beğeni sayısı.
 *
 * DAR OLMASININ ÜÇ AYRI SEBEBİ VAR:
 *
 *   · Tek argüman alıyor: `post_id`. Kullanıcı kimliği, kitle, tarih
 *     ya da "kimler" gibi bir süzgeç yok; genişletilebilecek bir yüzey
 *     bırakmıyor.
 *   · `returns table (adet integer)` — tek kolon. `security definer`
 *     olduğu için RLS'i atlıyor, bu yüzden gövdesinden SATIR değil
 *     yalnız SAYI çıkıyor. Kimlik döndürebilecek bir kolon yok.
 *   · `where sosyal_gizli.paylasim_gorunur(hedef_post)` gövdenin en
 *     dışında: koşul tutmazsa fonksiyon SIFIR SATIR dönüyor. Yetkisiz
 *     çağıran "0" değil HİÇBİR ŞEY alıyor; arayüz de 0 uydurmak yerine
 *     sayacı çizmiyor. `paylasim_gorunur` arşiv, taslak, alan sınırı ve
 *     kitleyi zaten tek kapıda topluyor.
 */
create or replace function public.paylasim_begeni_sayisi(hedef_post uuid)
returns table (adet integer)
language sql stable security definer set search_path = public
as $$
  select (select count(*)::int from public.post_likes l where l.post_id = hedef_post)
  where sosyal_gizli.paylasim_gorunur(hedef_post)
$$;

revoke all on function public.paylasim_begeni_sayisi(uuid) from public;
grant execute on function public.paylasim_begeni_sayisi(uuid) to authenticated;

/*
  KAYDETME POLİTİKALARINA DOKUNULMADI: `post_saves` zaten tamamen özel
  ve bu turda tek satırı bile değişmiyor. Kaydetme için sayaç RPC'si de
  AÇILMIYOR — kaydetme sayısı kimseye gösterilen bir şey değil.
*/
