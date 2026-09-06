/**
 * KART ALT DÜĞMELERİ — TEK KAYNAK
 *
 * NEDEN VAR
 * ---------
 * İlan kartı ile fırsat/burs kartının alt düğmeleri aynı işi yapıyor —
 * solda "detaya git", sağda "başvur / resmî kaynağa git" — ama iki ayrı
 * dosyada elle yazıldıkları için ayrışmışlardı (canlıda ölçüldü):
 *
 *   ilan kartı      Detaylar = beyaz çerçeveli · başvuru = mavi · text-xs
 *   fırsat kartı    Detayı gör = MAVİ          · kaynak   = beyaz · text-sm
 *
 * Yani renkler terstir ve yazı boyu iki punto farklıydı. Aynı ürünün iki
 * listesinde "mavi düğme" birinde başvuruyu, ötekinde detay sayfasını
 * gösteriyordu; kullanıcı hangi düğmenin siteden çıkardığını karttan
 * öğrenemiyordu.
 *
 * KURAL
 * -----
 * Mavi kutu ana eylemdir: başvuru ya da resmî kaynak. Detay her zaman
 * ikincil, beyaz çerçeveli kutudur. Geometri (yükseklik, köşe, punto,
 * iç boşluk) üçünde de aynı yerden gelir; kart durumu değişince alt
 * alan zıplamaz.
 *
 * `min-h-11`: telefonda dokunma hedefi 44 pikselin altına düşmüyor.
 */
export const CTA_ORTAK =
  'flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors';

/** Detay/geri dönüş gibi ikincil eylemler. */
export const CTA_IKINCIL =
  'cursor-pointer border border-gray-200 bg-white text-gray-800 hover:bg-gray-50';

/** Başvuru ya da resmî kaynak: karttaki tek ana eylem. */
export const CTA_BIRINCIL = 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 shadow-xs';

/*
  Başarı durumu tıklanmıyor: `cursor-pointer` ve `hover` YOK. Ölçüsü
  düğmeyle aynı ama davranışı düğme gibi değil — basılabilir görünüp
  hiçbir şey yapmayan bir kutu, kullanıcıyı boşuna deneme yaptırır.
*/
export const CTA_BASARI = 'border border-emerald-200 bg-emerald-50 text-emerald-800';
