/**
 * Ülke kodundan Türkçe ad.
 *
 * Tarayıcının kendi bölge adı tablosu kullanılıyor: 'TR' → "Türkiye".
 * Uygulamaya 250 satırlık bir ülke listesi gömmek, tarayıcıda hazır duran
 * ve yerelleştirmesi bakımlı olan veriyi kopyalamak olurdu. Tablo yoksa
 * (çok eski tarayıcı) kodun kendisi gösteriliyor — uydurma ad üretilmiyor.
 */
let cozucu: Intl.DisplayNames | null | undefined;

const cozucuAl = () => {
  if (cozucu !== undefined) return cozucu;
  try {
    cozucu = new Intl.DisplayNames(['tr'], { type: 'region' });
  } catch {
    cozucu = null;
  }
  return cozucu;
};

export function ulkeAdi(code: string): string {
  const kod = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(kod)) return kod;
  try {
    return cozucuAl()?.of(kod) || kod;
  } catch {
    return kod;
  }
}
