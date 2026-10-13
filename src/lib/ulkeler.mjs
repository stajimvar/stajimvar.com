/**
 * İLAN FORMUNDA ÜLKE SEÇENEKLERİ (13 Ekim 2026)
 *
 * Kodlar ISO 3166-1 alfa-2; veritabanı kısıtı (`listings_country_code_iso`,
 * `listings_basvuru_ulkeleri_iso`) aynı biçimi istiyor. Ad listesi elle
 * yazılmıyor: tarayıcının ve Node'un `Intl.DisplayNames` Türkçe bölge
 * adları kullanılıyor ("DE" → "Almanya"). Ad üretilemezse kodun kendisi
 * gösteriliyor; kayıt her zaman kod.
 *
 * Liste kapsamlı değil, bilinçli: stajyer ilanlarının geldiği ve
 * öğrencilerin başvurduğu ülkeler. Türkiye başta, kalanı Türkçe alfabe
 * sırasıyla. Listede olmayan bir ülke gerekirse buraya kod eklemek yeter.
 */

export const ULKE_KODLARI = [
  'TR',
  'AE', 'AT', 'AZ', 'BE', 'BG', 'CA', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR',
  'GB', 'GE', 'GR', 'HR', 'HU', 'IE', 'IL', 'IT', 'JP', 'KR', 'KZ', 'LT', 'LU', 'LV', 'MT',
  'NL', 'NO', 'PL', 'PT', 'QA', 'RO', 'RS', 'SA', 'SE', 'SG', 'SI', 'SK', 'UA', 'US',
];

let adlar = null;
function adlandirici() {
  if (adlar !== null) return adlar;
  try {
    adlar = new Intl.DisplayNames(['tr'], { type: 'region' });
  } catch {
    adlar = false;
  }
  return adlar;
}

/** "DE" → "Almanya". Bilinmeyen ya da geçersiz kod kendisi olarak döner. */
export function ulkeAdi(kod) {
  const k = String(kod ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(k)) return k;
  const a = adlandirici();
  try {
    return (a && a.of(k)) || k;
  } catch {
    return k;
  }
}

/** Veritabanının kabul ettiği biçim: iki büyük harf. */
export function ulkeKoduGecerli(kod) {
  return /^[A-Z]{2}$/.test(String(kod ?? ''));
}

/** Formdaki seçenekler: Türkiye başta, kalanı Türkçe ada göre. */
export const ULKE_SECENEKLERI = (() => {
  const [ilk, ...kalan] = ULKE_KODLARI;
  const sirali = kalan
    .map((kod) => ({ kod, ad: ulkeAdi(kod) }))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  return [{ kod: ilk, ad: ulkeAdi(ilk) }, ...sirali];
})();

/**
 * Seçilen ülke listesini temizler: geçerli kodlar, tekrar yok, sıra
 * korunuyor. Boş liste `[]`.
 */
export function ulkeListesiTemizle(liste) {
  const gorulen = new Set();
  const sonuc = [];
  for (const k of Array.isArray(liste) ? liste : []) {
    const kod = String(k ?? '').trim().toUpperCase();
    if (ulkeKoduGecerli(kod) && !gorulen.has(kod)) {
      gorulen.add(kod);
      sonuc.push(kod);
    }
  }
  return sonuc;
}
