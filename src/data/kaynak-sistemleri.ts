/*
 * TAKİP EDİLEN KAYNAK ÖZETİ — ÜRETİLMİŞ DOSYA
 *
 * `node scripts/kaynak-ozeti.mjs --yaz` üretiyor; elle düzenlenmiyor.
 * Tek kaynak: automation/sources.json.
 *
 * Hakkımızda sayfasındaki liste bu diziden çiziliyor. Sayı elle
 * yazılsaydı yeni kaynak eklendiği gün eskir ve güven sayfası
 * sessizce yanlış konuşmaya başlardı.
 */
export interface KaynakSistemi {
  /** Sistemin kendi yazdığı ad. */
  ad: string;
  /** O sistemden okunan şirket kaynağı sayısı. */
  adet: number;
}

/** Takip edilen toplam şirket kaynağı. */
export const KAYNAK_TOPLAM = 41;

export const KAYNAK_SISTEMLERI: readonly KaynakSistemi[] = [
  { ad: 'Lever', adet: 13 },
  { ad: 'Greenhouse', adet: 10 },
  { ad: 'Workable', adet: 8 },
  { ad: 'Ashby', adet: 6 },
  { ad: 'Workday', adet: 2 },
  { ad: 'SmartRecruiters', adet: 1 },
  { ad: 'Şirketin kendi kariyer sayfası', adet: 1 },
];
