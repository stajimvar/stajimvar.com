/**
 * Profil kartında öğrenciye özgü okul, bölüm ve alan bilgisini yalnız
 * öğrenci hesaplarında gösterir. Resmî hesap bir kurum kimliğidir.
 *
 * @param {boolean | null | undefined} resmiMi
 */
export function ogrenciKimligiGorunurMu(resmiMi) {
  return resmiMi !== true;
}
