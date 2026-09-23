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
