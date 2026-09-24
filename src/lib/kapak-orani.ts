/**
 * KAPAK ORANLARI — TEK KAYNAK
 *
 * Dosya 3:1 kaydediliyor (`kapagaCevir`), profil başlığında ise `lg:` ve
 * üstünde 5:1 gösteriliyor. Neden: 1440'ta 3:1 bant 1343×448 piksel
 * ölçüldü ve 900 piksellik ekranın yarısını kaplıyordu. 5:1'de aynı
 * genişlik yaklaşık 269 piksel.
 *
 * Geniş ekranda `object-cover object-center` 3:1 dosyanın ortadaki yatay
 * şeridini gösteriyor; üstten ve alttan kesilen pay aşağıdaki
 * `GENIS_EKRAN_KESIMI`. Kırpma ekranı bu payı karartarak gösteriyor ki
 * kırparken görülen ile profilde görülen ayrışmasın. İki yer aynı sabiti
 * okuyor: oran değişince kılavuz da değişiyor.
 */

/** Kaydedilen dosyanın oranı (genişlik / yükseklik). */
export const KAPAK_ORANI = 3;

/** Profil başlığındaki bandın `lg:` ve üstündeki oranı. */
export const GENIS_EKRAN_ORANI = 5;

/**
 * Geniş ekranda dosyanın üstünden ve altından AYRI AYRI kesilen pay
 * (yükseklik oranı). 3 ve 5 için (1 − 3/5) / 2 = 0,2.
 */
export const GENIS_EKRAN_KESIMI = (1 - KAPAK_ORANI / GENIS_EKRAN_ORANI) / 2;

/*
  BANT ORANININ TAILWIND SINIFI — sayılarla aynı yerde

  Literal yazılıyor: Tailwind kaynağı düz metin olarak tarıyor ve
  `lg:aspect-[${GENIS_EKRAN_ORANI}/1]` gibi çalışma anında kurulan bir
  dizeyi göremez. Sayılar yukarıdaki sabitlerle aynı olmak zorunda;
  `profil-kapagi-arayuzu` testi ikisini karşılaştırıyor. Öğrenci kapağı
  (`KapakFotografi kip="bant"`) ve şirketin logo bandı bu sınıfı okuyor:
  üç profil ekranının üst bandı aynı yükseklikte.
*/
export const KAPAK_BANDI_SINIFI = 'aspect-[3/1] lg:aspect-[5/1]';
/** Dosyanın kendisi — her ekranda 3:1 (düzenleme önizlemesi, yükleme ekranı). */
export const KAPAK_DOSYASI_SINIFI = 'aspect-[3/1]';
