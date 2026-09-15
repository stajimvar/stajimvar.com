/*
 * ŞİRKET KART GÖRSELLERİ — ÜRETİLMİŞ DOSYA
 *
 * `node scripts/sirket-gorselleri-uret.mjs --yaz` üretiyor; elle
 * düzenlenmiyor. Tek kaynak: public/ilan-gorselleri/manifest.json.
 *
 * Kullanım hakkı doğrulanmamış dosyalar BURAYA GİRMİYOR (bkz. betik).
 * Türü "temsili" olan görsel gerçek ofis fotoğrafı değildir ve kart
 * bunu okuyucuya söyler.
 */

export interface SirketGorseli {
  /** public/ altındaki adres. */
  yol: string;
  /** "temsili" = üretilmiş görsel; kartta öyle etiketleniyor. */
  tur: 'temsili';
}

export const SIRKET_GORSELLERI: Readonly<Record<string, SirketGorseli>> = {
  '2zero-gmbh': { yol: '/ilan-gorselleri/kart/2zero-gmbh.webp', tur: 'temsili' },
  'about-you': { yol: '/ilan-gorselleri/kart/about-you.webp', tur: 'temsili' },
  'atrya': { yol: '/ilan-gorselleri/kart/atrya.webp', tur: 'temsili' },
  'baykar': { yol: '/ilan-gorselleri/kart/baykar.webp', tur: 'temsili' },
  'bertelsmann': { yol: '/ilan-gorselleri/kart/bertelsmann.webp', tur: 'temsili' },
  'bosch': { yol: '/ilan-gorselleri/kart/bosch.webp', tur: 'temsili' },
  'craftly': { yol: '/ilan-gorselleri/kart/craftly.webp', tur: 'temsili' },
  'envista': { yol: '/ilan-gorselleri/kart/envista.webp', tur: 'temsili' },
  'festo': { yol: '/ilan-gorselleri/kart/festo.webp', tur: 'temsili' },
  'fixfirst': { yol: '/ilan-gorselleri/kart/fixfirst.webp', tur: 'temsili' },
  'hopn-ug': { yol: '/ilan-gorselleri/kart/hopn-ug.webp', tur: 'temsili' },
  'inca': { yol: '/ilan-gorselleri/kart/inca.webp', tur: 'temsili' },
  'inception-media': { yol: '/ilan-gorselleri/kart/inception-media.webp', tur: 'temsili' },
  'kantar-media': { yol: '/ilan-gorselleri/kart/kantar-media.webp', tur: 'temsili' },
  'kenvue': { yol: '/ilan-gorselleri/kart/kenvue.webp', tur: 'temsili' },
  'klara-blau': { yol: '/ilan-gorselleri/kart/klara-blau.webp', tur: 'temsili' },
  'kluuu': { yol: '/ilan-gorselleri/kart/kluuu.webp', tur: 'temsili' },
  'mahle': { yol: '/ilan-gorselleri/kart/mahle.webp', tur: 'temsili' },
  'melagence-gmbh': { yol: '/ilan-gorselleri/kart/melagence-gmbh.webp', tur: 'temsili' },
  'neckar-hub': { yol: '/ilan-gorselleri/kart/neckar-hub.webp', tur: 'temsili' },
  'ogretmenim-dergisi': { yol: '/ilan-gorselleri/kart/ogretmenim-dergisi.webp', tur: 'temsili' },
  'oguz-law': { yol: '/ilan-gorselleri/kart/oguz-law.webp', tur: 'temsili' },
  'paynion': { yol: '/ilan-gorselleri/kart/paynion.webp', tur: 'temsili' },
  'plus-bahcesehir-egitim': { yol: '/ilan-gorselleri/kart/plus-bahcesehir-egitim.webp', tur: 'temsili' },
  'tiktok': { yol: '/ilan-gorselleri/kart/tiktok.webp', tur: 'temsili' },
  'vodafone-turkiye': { yol: '/ilan-gorselleri/kart/vodafone-turkiye.webp', tur: 'temsili' },
  'wegain-gmbh': { yol: '/ilan-gorselleri/kart/wegain-gmbh.webp', tur: 'temsili' },
  'wongdoody': { yol: '/ilan-gorselleri/kart/wongdoody.webp', tur: 'temsili' },
  'yami-studios-ug': { yol: '/ilan-gorselleri/kart/yami-studios-ug.webp', tur: 'temsili' },
};

/**
 * Şirketin kart görseli — yoksa null.
 *
 * Eşleme ŞİRKETE bağlı: aynı şirketin bütün ilanları aynı görseli
 * alıyor. Bilinmeyen slug uydurma bir dosyaya düşmüyor.
 */
export function sirketGorseli(slug: string | null | undefined): SirketGorseli | null {
  if (!slug) return null;
  return SIRKET_GORSELLERI[slug] ?? null;
}
