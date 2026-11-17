/**
 * Öğrencinin zorunlu temel bilgileri: okul, bölüm, şehir (17 Kasım 2026).
 * Pencere (OgrenciTemelBilgileri.tsx) ve kapı (App.tsx) aynı kuralı kullanıyor.
 *
 * @typedef {{ university: string, department: string, city: string }} TemelBilgiler
 */

const dolu = (v, en = 2) => typeof v === 'string' && v.trim().length >= en;

/**
 * Eksik alanlar → hata cümlesi. Boş nesne: hepsi tamam.
 * @param {Partial<TemelBilgiler> | null | undefined} b
 * @returns {Partial<Record<keyof TemelBilgiler, string>>}
 */
export function temelBilgiHatalari(b) {
  /** @type {Partial<Record<keyof TemelBilgiler, string>>} */
  const h = {};
  if (!dolu(b?.university, 3)) h.university = 'Okulunu yaz.';
  if (!dolu(b?.department)) h.department = 'Bölümünü yaz.';
  if (!dolu(b?.city)) h.city = 'Şehrini yaz.';
  return h;
}

/** @param {Partial<TemelBilgiler> | null | undefined} b */
export function temelBilgilerEksik(b) {
  return Object.keys(temelBilgiHatalari(b)).length > 0;
}
