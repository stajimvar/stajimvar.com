/**
 * LOGO YEDEĞİ — logosu olmayan kurumda baş harfler ve renk (14 Ekim 2026)
 *
 * İki yerde aynı sonucu vermeli:
 *   · React kartları (CompanyLogo.tsx — Tailwind sınıfları)
 *   · ön render kartları (scripts/onrender.mjs — index.html'deki satır içi stil)
 * Aynı şirket iki görünümde farklı harf ya da renk alsaydı, JavaScript
 * açılınca kutu "değişmiş" görünürdü. Uydurma logo yok: yalnız şirketin
 * adından türeyen harfler.
 */

/** Renk paletinin uzunluğu (CompanyLogo.tsx'teki PALETTE ile aynı sıra). */
export const PALET_UZUNLUGU = 6;

/** "Texas Instruments" → "TI", "Otis" → "OT", boşsa "?". */
export function basHarfler(ad) {
  const kelimeler = String(ad ?? '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (kelimeler.length === 0) return '?';
  if (kelimeler.length === 1) return kelimeler[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (kelimeler[0][0] + kelimeler[1][0]).toLocaleUpperCase('tr-TR');
}

/** Addan kararlı palet sırası (0..PALET_UZUNLUGU-1). */
export function paletSirasi(ad) {
  let toplam = 0;
  for (const ch of String(ad ?? '')) toplam = (toplam + ch.codePointAt(0)) % 997;
  return toplam % PALET_UZUNLUGU;
}
