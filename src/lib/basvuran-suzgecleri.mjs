/**
 * BAŞVURANLAR SÜZGEÇLERİ VE SIRALAMA (9 Kasım 2026, rakip analizi #3)
 *
 * Başvuranlar'da yalnız durum süzgeci vardı. Rakiplerin hepsinde bölüm,
 * okul, sınıf, şehir süzgeci ve sıralama var. Seçenekler gelen
 * başvurulardan türüyor (boş seçenek göstermiyor); kural saf işlev.
 */

const tr = (d) => String(d ?? '').trim();

/** Kartlardaki bir alanın benzersiz değerleri, Türkçe sırayla. */
export function secenekler(kartlar, alan) {
  const kume = new Set();
  for (const k of kartlar) {
    const d = tr(k?.[alan]);
    if (d) kume.add(d);
  }
  return [...kume].sort((a, b) => a.localeCompare(b, 'tr'));
}

/** Seçilen süzgeçlere uyan kart. Boş süzgeç "hepsi" demek. */
export function suzgeceUyar(kart, suzgec) {
  for (const alan of ['bolum', 'universite', 'sinif', 'sehir']) {
    const s = tr(suzgec?.[alan]);
    if (s && tr(kart?.[alan]) !== s) return false;
  }
  return true;
}

export const SIRALAMALAR = [
  { id: 'yeni', etiket: 'En yeni başvuru' },
  { id: 'eski', etiket: 'En eski başvuru' },
  { id: 'ad', etiket: 'Ada göre (A–Z)' },
];

/** Yeni dizi döndürüyor; girdiyi değiştirmiyor. Tarihi olmayan sona. */
export function sirala(kartlar, siralama) {
  const zaman = (k) => {
    const t = Date.parse(k?.tarih ?? '');
    return Number.isNaN(t) ? null : t;
  };
  const kopya = [...kartlar];
  if (siralama === 'ad') {
    return kopya.sort((a, b) => tr(a?.ad).localeCompare(tr(b?.ad), 'tr'));
  }
  const yon = siralama === 'eski' ? 1 : -1;
  return kopya.sort((a, b) => {
    const ta = zaman(a);
    const tb = zaman(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return (ta - tb) * yon;
  });
}
