/**
 * ŞİRKET SAYFASI: YAN HAKLAR, SOSYAL BAĞLANTILAR, TANITIM VİDEOSU
 * (9 Kasım 2026, rakip analizi #12)
 *
 * Kurallar veritabanı kısıtlarıyla AYNI (20270108010000); burada form
 * kaydetmeden önce söylüyor, sunucu yine reddediyor.
 */
export const YAN_HAK_EN_FAZLA = 12;
export const YAN_HAK_UZUNLUK = 60;

/** Her satır bir yan hak; boşlar atılıyor, tekrar yok, en fazla 12. */
export function yanHaklarAyir(metin) {
  const gorulen = new Set();
  const sonuc = [];
  for (const ham of String(metin ?? '').split(/\r?\n/)) {
    const s = ham.replace(/^[\s•\-*–]+/, '').trim().replace(/\s+/g, ' ');
    const anahtar = s.toLocaleLowerCase('tr');
    if (s.length < 2 || gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    sonuc.push(s);
  }
  return sonuc;
}

export function yanHaklarHatasi(metin) {
  const liste = yanHaklarAyir(metin);
  if (liste.length > YAN_HAK_EN_FAZLA) return `En fazla ${YAN_HAK_EN_FAZLA} yan hak yazılabilir.`;
  if (liste.some((s) => s.length > YAN_HAK_UZUNLUK)) return `Her yan hak en fazla ${YAN_HAK_UZUNLUK} karakter olabilir.`;
  return '';
}

export const LINKEDIN_DESENI = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(company|school|showcase)\/[A-Za-z0-9\-_.%]+\/?$/;
export const INSTAGRAM_DESENI = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]{1,30}\/?$/;

/** YouTube adresinden 11 haneli video kimliği; tanınmıyorsa null. */
export function youtubeKimligi(adres) {
  const s = String(adres ?? '').trim();
  const m =
    s.match(/^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})(?:[&#].*)?$/) ||
    s.match(/^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?#].*)?$/) ||
    s.match(/^https:\/\/(?:www\.)?youtube\.com\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})(?:[?#/].*)?$/);
  return m ? m[1] : null;
}

/** Form alanı hatası; boş alan geçerli (isteğe bağlı). */
export function baglantiHatasi(alan, deger) {
  const s = String(deger ?? '').trim();
  if (!s) return '';
  if (alan === 'linkedin' && !LINKEDIN_DESENI.test(s)) return 'LinkedIn şirket sayfası adresi olmalı (https://www.linkedin.com/company/…).';
  if (alan === 'instagram' && !INSTAGRAM_DESENI.test(s)) return 'Instagram profil adresi olmalı (https://www.instagram.com/…).';
  if (alan === 'video' && !youtubeKimligi(s)) return 'Şimdilik yalnız YouTube video adresi (https://www.youtube.com/watch?v=…).';
  return '';
}
