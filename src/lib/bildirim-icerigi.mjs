/**
 * BİLDİRİMİN İÇERİĞİ — beğenilen paylaşımın kimliği
 *
 * Bildirim satırı paylaşım kolonu taşımıyor; kimlik olay anahtarında
 * (`notifications.dedupe_key`) duruyor ve biçimi göçlerde sabit
 * (20260927130000_sosyal_bildirimler.sql):
 *
 *   begeni:<paylaşım>:<beğenen>   → içerik PAYLAŞIM
 *
 * Kişi kimliğini `bildirim-kisisi.mjs` aynı anahtardan okuyor; burada
 * ikinci değil BİRİNCİ parça isteniyor. İkisi ayrı dosyada çünkü ayrı
 * sorulara cevap veriyorlar ve tek bir "anahtarı parçala" işlevi
 * çağıranın hangisini istediğini belirsiz bırakırdı.
 *
 * NEDEN GEREKLİ
 * -------------
 * Bildirim listesinde altı satır "Selin Dikme paylaşımını beğendi" diye
 * yan yana duruyordu; hangi paylaşımın beğenildiği hiçbir satırda
 * yazmıyordu ve satırlar birbirinden ayırt edilemiyordu (kullanıcı
 * bildirdi, 27 Eylül 2026). Kimlik zaten anahtardaydı, yalnız
 * okunmuyordu.
 *
 * Başka bir anahtar ya da bozuk kimlik → `null`: paylaşım uydurulmuyor,
 * satır önizlemesiz kalıyor.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function bildirimIcerigi(anahtar) {
  if (typeof anahtar !== 'string') return null;
  const [tur, a, b, ...fazla] = anahtar.split(':');
  if (fazla.length > 0) return null;
  if (tur !== 'begeni') return null;
  if (!b) return null;
  return a && UUID.test(a) ? a : null;
}
