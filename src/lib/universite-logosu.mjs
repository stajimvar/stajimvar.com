/**
 * Üniversite adı → logo dosyası eşleştirmesi — ÇALIŞMA ZAMANI SÜRÜMÜ.
 *
 * NEDEN BURADA
 * ------------
 * `universiteKodu` KariyerMerkezleri.tsx içindeydi; okul rozeti onu
 * kullanıyor ve rozetin testleri Node'da koşuyor, bir `.mjs` modülü de
 * `.tsx` dosyasından içe aktaramıyor. Kuralı ikinci kez yazmak yerine
 * fonksiyon buraya taşındı; bileşen onu yeniden dışa veriyor.
 *
 * EŞLEŞTİRME TAM, BENZERLİK ARAMIYOR
 * ----------------------------------
 * Ad normalleştirilip birebir aranıyor. Yaklaşık eşleştirme (ilk kelime,
 * en yakın ad) bir okulun rozetine BAŞKA bir okulun amblemini koyar:
 * "İstanbul Üniversitesi", "İstanbul Teknik Üniversitesi" ve "İstanbul
 * Gelişim Üniversitesi" aynı kelimeyle başlıyor. Eşleşme yoksa rozet
 * kısaltmaya düşüyor — bilinmeyen okulda boş kalmıyor.
 */

/**
 * Üniversite kodunu adından üretiyor: "Ege Üniversitesi" → ege-universitesi.
 *
 * Logo dosyaları da aynı kuralla adlandırıldı; iki yerde ayrı yazılsaydı
 * biri değiştiğinde logolar sessizce kaybolurdu.
 *
 * @param {string} ad
 * @returns {string}
 */
export function universiteKodu(ad) {
  return (ad || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Rozette gösterilen logolar.
 *
 * NEDEN AYRI BİR LİSTE (public klasörünü taramak yerine)
 * -----------------------------------------------------
 * Tarayıcı klasör listeleyemez; dosyanın varlığını ancak isteyip 404
 * alınca öğrenir. Liste, isteği hiç atmadan bilmeyi sağlıyor. Testi her
 * satırın karşılığında gerçek bir dosya olduğunu doğruluyor.
 *
 * NEDEN HER DOSYA BURADA DEĞİL
 * ----------------------------
 * Rozet 28 piksel. Kariyer merkezleri sayfası aynı dosyaları 36 pikselde
 * çiziyor ve orada sorun olmayan iki logo bu boyda bilgi taşımıyor:
 *
 *   - Sabancı Üniversitesi: logosu bir yazı markası; 28 pikselde lacivert
 *     bir dikdörtgene dönüşüyor, okunmuyor.
 *   - Muğla Sıtkı Koçman Üniversitesi: ince çizgili amblem; küçülünce
 *     soluklaşıp boş rozet izlenimi veriyor.
 *
 * İkisinde rozet kısaltmayı gösteriyor — okunmayan bir amblemden iyi.
 */
export const ROZET_LOGOLARI = [
  'akdeniz-universitesi',
  'ataturk-universitesi',
  'bogazici-universitesi',
  'cukurova-universitesi',
  'dokuz-eylul-universitesi',
  'ege-universitesi',
  'eskisehir-osmangazi-universitesi',
  'gazi-universitesi',
  'hacettepe-universitesi',
  'istanbul-universitesi',
  'izmir-yuksek-teknoloji-enstitusu',
  'karadeniz-teknik-universitesi',
  'marmara-universitesi',
  'mimar-sinan-guzel-sanatlar-universitesi',
  'ondokuz-mayis-universitesi',
  'pamukkale-universitesi',
  'sakarya-universitesi',
  'selcuk-universitesi',
  'suleyman-demirel-universitesi',
  'tobb-ekonomi-ve-teknoloji-universitesi',
  'yildiz-teknik-universitesi',
];

/**
 * Okulun logo adresi; logosu yoksa null.
 *
 * @param {string | null | undefined} okul
 * @returns {string | null}
 */
export function universiteLogosu(okul) {
  const kod = universiteKodu(okul || '');
  return kod && ROZET_LOGOLARI.includes(kod) ? `/universite-logolari/${kod}.png` : null;
}
