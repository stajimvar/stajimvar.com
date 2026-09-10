-- E aşaması — sahibinin kendi arşivini okuyabilmesi
--
-- ÖLÇÜLEN EKSİK
-- -------------
-- `posts` SELECT politikası (20260923070000):
--   using (archived_at is null and sosyal_gizli.paylasim_gorunur(id))
-- `archived_at is null` şartı YAZARA DA uygulanıyordu. Sonuç: kimse —
-- paylaşımın sahibi dahil — arşivlediği kaydı okuyamıyordu. "Arşiv"
-- ekranı ve "Profilde yeniden göster" eylemi sunucu tarafında
-- imkânsızdı: satır hiç dönmüyordu.
--
-- Bu, D'de arşivin tek yönlü bir kapı olarak kalmasının da sebebiydi.
--
-- KALIP ZATEN DEPODA VAR
-- ----------------------
-- Aynı sorun `post_media` için daha önce çözülmüş ve politikası şöyle
-- yazılmış:
--   using (sosyal_gizli.paylasim_sahibi(post_id) = auth.uid()
--          or sosyal_gizli.paylasim_gorunur(post_id))
-- Yani "sahibi kendi görselini arşivde de görür" kuralı zaten var; satır
-- tarafında yoktu. İkisi arasındaki bu tutarsızlık kapanıyor.
--
-- GENİŞLEME YALNIZ YAZAR İÇİN
-- ---------------------------
-- İkinci dal (`archived_at is null and paylasim_gorunur(id)`) HİÇ
-- DEĞİŞMİYOR. Başkası için arşiv, taslak, kitle, engel ve alan sınırı
-- aynen duruyor. Mevcut iki arşiv testi (sosyal-paylasim-kitlesi ve
-- sosyal-guvenlik-duzeltmeleri) tam olarak bunu ölçüyor ve geçmeye
-- devam ediyor.
--
-- SAYAÇ ETKİLENMİYOR
-- ------------------
-- `sosyal_sayaclar` kendi gövdesinde `p.archived_at is null` taşıyor;
-- arşivlenmiş paylaşım sahibinin sayacına GİRMİYOR. Profil ızgarası da
-- istemcide `archived_at is null` ile süzülüyor (`paylasimlariGetir`),
-- arşiv ekranı ise aynı fonksiyonun `arsiv: true` dalını kullanıyor.

drop policy if exists "ayni sektordeki paylasim okunur" on public.posts;
create policy "ayni sektordeki paylasim okunur" on public.posts
  for select to authenticated
  using (
    /* Sahibi kendi kaydını her durumda okur: arşiv ve taslak dahil.
       Taslak zaten paylasim_gorunur içinden geliyordu; yeni olan arşiv. */
    author_id = auth.uid()
    or (archived_at is null and sosyal_gizli.paylasim_gorunur(id))
  );

/*
  Geri yükleme için yeni bir yetki GEREKMİYOR: `archived_at` kolonu
  20260924010000'de zaten istemciye açık kolonlar arasında
  (`grant update (aciklama, kitle, archived_at)`), UPDATE politikası da
  satırı sahibine bağlıyor. `archived_at = null` yazmak paylaşımın
  kitlesine ve `post_media` sırasına DOKUNMUYOR; ikisi de ayrı sütun ve
  ayrı tabloda duruyor, bu yüzden geri yükleme onları kendiliğinden
  koruyor.

  Kalıcı silme bu aşamada da YOK: ne RPC'si ne politikası açılıyor.
*/
