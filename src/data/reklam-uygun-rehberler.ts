/*
 * REKLAM GÖSTERİLEBİLECEK REHBERLER — ÜRETİLMİŞ DOSYA
 *
 * `node scripts/rehber-sayimi.mjs --yaz` üretiyor; elle düzenlenmiyor.
 * Kapı `src/lib/reklam-kapisi.mjs` içindeki editoryalDeger(); burada
 * yalnız o kapıdan geçen sluglar duruyor.
 *
 * Kelime sayısı tek başına ölçüt değil: 70 rehberin medyanı 396
 * kelime ve en uzunu 894. İnternette dolaşan "1000 kelime" eşiği bu
 * sitede her şeyi elerdi ve hiçbir şey anlatmazdı.
 */
export const REKLAM_UYGUN_REHBERLER: readonly string[] = [
  'gonullu-staj-rehberi',
  'kyk-burs-ve-kredi',
  'staj-basvuru-epostasi',
  'staj-cv-nasil-yazilir',
  'staj-defteri-nasil-doldurulur',
  'staj-mulakati',
  'staj-nasil-bulunur',
  'staj-sigortasi-kim-yapar',
  'staj-ucreti-nasil-hesaplanir',
  'universite-staj-birimi',
  'yurtdisinda-staj',
  'zorunlu-staj-rehberi',
];
