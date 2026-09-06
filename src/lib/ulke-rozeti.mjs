import { normalizeCountryCode } from './global-preferences.mjs';

/**
 * İlan kartında ve ilan detayında ülke rozeti çizilmeli mi?
 *
 * Yayındaki ilanların büyük çoğunluğu Türkiye. Her karta "Türkiye" basmak
 * 60+ kartlık bir listede bilgi değil gürültü üretir: aynı kelime her satırda
 * tekrarlanınca göz onu taramayı bırakır, üstelik şirket adı ve başlık gibi
 * asıl ayırt edici alanlardan yer çalar. Rozetin işi kuralı değil İSTİSNAYI
 * işaretlemek — bu yüzden yalnız yurt dışı ilanlarda bir değer döner.
 *
 * Kod geçerliliği ülke seçicinin kullandığı normalizeCountryCode ile
 * ölçülüyor: 'ZZ' gibi ülke olmayan bölgeler burada da eleniyor, böylece
 * rozette "Bilinmeyen Bölge" yazan bir kutu çıkmıyor.
 *
 * @param {unknown} countryCode İlanın ISO 3166-1 alpha-2 ülke kodu.
 * @returns {string|null} Rozette gösterilecek normalize kod; gerekmiyorsa null.
 */
export function ulkeRozetiGerekli(countryCode) {
  const kod = normalizeCountryCode(countryCode);
  return kod && kod !== 'TR' ? kod : null;
}
