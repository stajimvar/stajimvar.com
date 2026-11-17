/**
 * OKULA GÖRE BÖLÜM ÖNERİSİ (17 Kasım 2026)
 *
 * Kaynak: YÖK Atlas, 2026 YKS tercih kılavuzu (228 üniversite, 21.493
 * program). `scripts/yok-universite-bolumleri.mjs` kılavuzdan
 * `src/data/universite-bolumleri.json` dosyasını üretiyor; her yıl yeni
 * kılavuzla yeniden çalıştırılır.
 *
 * Öğrenci okulunu yazınca bölüm önerilerinde ÖNCE o okulun programları
 * geliyor, ardından genel liste. Liste kapalı değil: kılavuzda olmayan
 * (öğrenci alımı durmuş, özel yetenekle alan) bir program da yazılabilir.
 */

/** Okul adı → eşleştirme anahtarı. Büyük/küçük harf, şapka, parantez içi (il) ve noktalama önemsiz. */
export function okulAnahtari(ad) {
  return String(ad ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * @param {{ programlar: string[], okullar: Record<string, number[]> } | null} veri
 * @param {string} okul
 * @param {string[]} genel  Genel bölüm listesi (TR_DEPARTMENTS)
 * @returns {string[]} Önce okulun programları, sonra genel listedeki ötekiler; tekrarsız.
 */
export function okulaGoreBolumler(veri, okul, genel) {
  const sira = veri?.okullar?.[okulAnahtari(okul)];
  if (!sira || sira.length === 0) return genel;
  const okulun = sira.map((i) => veri.programlar[i]).filter(Boolean);
  const gorulen = new Set(okulun);
  return [...okulun, ...genel.filter((b) => !gorulen.has(b))];
}
