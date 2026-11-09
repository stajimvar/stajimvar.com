/**
 * SON BAŞVURUYU HIZLI UZAT (9 Kasım 2026, rakip analizi #6)
 *
 * Yeni tarih: geçmiş tarih bugünden, ileri tarih kendisinden 30 gün
 * sonrası. İstanbul günü (sunucu kuralıyla aynı). Tarih yoksa uzatma yok
 * (süresiz ilan).
 */
export const UZATMA_GUNU = 30;

export function istanbulBugun(simdi = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(simdi);
}

export function uzatilmisTarih(sonBasvuru, simdi = new Date(), gun = UZATMA_GUNU) {
  const d = String(sonBasvuru ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const bugun = istanbulBugun(simdi);
  const taban = d < bugun ? bugun : d;
  const t = new Date(`${taban}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + gun);
  return t.toISOString().slice(0, 10);
}
