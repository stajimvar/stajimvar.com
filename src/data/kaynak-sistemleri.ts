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
export const KAYNAK_TOPLAM = 76;

export const KAYNAK_SISTEMLERI: readonly KaynakSistemi[] = [
  { ad: 'Şirketin kendi kariyer sayfası', adet: 23 },
  { ad: 'Greenhouse', adet: 13 },
  { ad: 'Lever', adet: 13 },
  { ad: 'Ashby', adet: 9 },
  { ad: 'Workable', adet: 8 },
  { ad: 'SmartRecruiters', adet: 4 },
  { ad: 'Workday', adet: 4 },
  { ad: 'Personio', adet: 2 },
];
