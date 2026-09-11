/**
 * SERİDE PARMAKLA GEZİNME — SAF KARAR KURALLARI
 *
 * Paylaşım ayrıntısındaki fotoğraf serisi dar ekranda parmakla
 * kaydırılarak geziliyor. "Bu hareket yatay mı, dikey mi", "eşiği geçti
 * mi", "uçta mıyız" soruları bileşenin işaretçi olaylarının içinde
 * yazılsaydı hiçbiri çalıştırılarak ölçülemezdi (bkz. sosyal-etkilesim.mjs
 * başlığı: bu depoda "kaynak testi geçti ama davranış oluşmadı" iki kez
 * yaşandı). Buradaki üç fonksiyon DOM'a dokunmuyor; bileşen tam olarak
 * bunları çağırıyor ve gezinmenin kendisi (`oncekiKare` / `sonrakiKare`)
 * yine bileşende, ok düğmeleri ve klavyeyle AYNI fonksiyon.
 */

/**
 * Bir kaydırmanın "geçti" sayılması için gereken yatay yol (px).
 *
 * 40 seçildi: kart ızgarasındaki dokunma hedefi 44 px; ondan kısa bir
 * yol, dokunurken parmağın kayması ile kasıtlı kaydırmayı ayıramazdı.
 * Görsel alanının genişliğine oranlanmadı — 390 px'te ve 1440 px'te
 * "aynı hareket aynı sonucu versin" diye.
 */
export const KAYDIRMA_ESIGI = 40;

/**
 * Yön kilidi için gereken ilk yol (px). Bu yolun altında hareket
 * "belirsiz": ne sayfa kaydırması engelleniyor ne görsel kayıyor.
 */
export const YON_KILIDI = 8;

/**
 * Parmağın ilk hareketinin yönü.
 *
 * Yön BİR KEZ karar veriliyor ve sonra değişmiyor: yatay başlayan
 * hareket dikeye dönse de seri gezinmesi olarak sürüyor, dikey başlayan
 * hareket sayfaya bırakılıyor (`touch-action: pan-y` tarayıcıya zaten
 * bunu söylüyor; burada aynı karar bileşenin kendi durumunda veriliyor
 * ki tarayıcı `pointercancel` göndermeden önce görsel kaymaya
 * başlamasın).
 *
 * @param {number} dx Başlangıca göre yatay yol (px).
 * @param {number} dy Başlangıca göre dikey yol (px).
 * @returns {'belirsiz' | 'yatay' | 'dikey'}
 */
export function yonuBelirle(dx, dy) {
  if (Math.abs(dx) < YON_KILIDI && Math.abs(dy) < YON_KILIDI) return 'belirsiz';
  return Math.abs(dx) > Math.abs(dy) ? 'yatay' : 'dikey';
}

/**
 * Parmak sürerken görselin ne kadar kayacağı (px).
 *
 * Uçta sıfır: ilk karede sağa, son karede sola çekmek görseli
 * kımıldatmıyor. "Lastik" direnci de yok — bırakınca geri gelen bir
 * görsel, kullanıcıya "bir sonraki var ama gelmedi" dedirtirdi; oysa
 * yok. Tek fotoğrafta da sıfır: gezilecek seri yok.
 *
 * @param {{ dx: number, indeks: number, toplam: number }} girdi
 * @returns {number}
 */
export function parmakKaymasi({ dx, indeks, toplam }) {
  if (toplam <= 1) return 0;
  if (dx > 0 && indeks <= 0) return 0;
  if (dx < 0 && indeks >= toplam - 1) return 0;
  return dx;
}

/**
 * Parmak kalkınca ne olacağı.
 *
 * Eşiği geçen yatay hareket kare değiştiriyor; uçta ya da eşiğin
 * altında kalan hareket hiçbir şey yapmıyor ve görsel yerine dönüyor.
 * Karar `parmakKaymasi` ile aynı uç kuralını kullanıyor: parmak
 * sürerken kımıldamayan görsel bırakınca da geçmiyor.
 *
 * @param {{ dx: number, indeks: number, toplam: number, esik?: number }} girdi
 * @returns {'onceki' | 'sonraki' | 'yok'}
 */
export function gezinmeKarari({ dx, indeks, toplam, esik = KAYDIRMA_ESIGI }) {
  if (parmakKaymasi({ dx, indeks, toplam }) === 0) return 'yok';
  if (Math.abs(dx) < esik) return 'yok';
  return dx < 0 ? 'sonraki' : 'onceki';
}
