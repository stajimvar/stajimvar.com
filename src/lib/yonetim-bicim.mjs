/**
 * YÖNETİM PANELİ — SAYI BİÇİMLEME
 *
 * Panelde görünen her sayı buradan geçiyor ki tek bir ekranda "1042" ve
 * "1.042" yan yana çıkmasın.
 *
 * Bu dosya `yonetim-demo.mjs`'in kalanı. O dosya ziyaretçi trafiğini
 * üretilmiş veriyle dolduruyordu; trafik artık gerçek olaylardan
 * geldiği için üreteç tamamen kaldırıldı ve geriye yalnız biçimleme
 * kaldı. İsim de değişti: "demo" adı taşıyan bir modülden veri okumak,
 * panelin hangi sayısının gerçek olduğu sorusunu yeniden doğururdu.
 */

/** 1042 → "1.042". Panelin her yerinde aynı biçim. */
export function sayi(deger) {
  if (deger === null || deger === undefined || Number.isNaN(deger)) return '—';
  return new Intl.NumberFormat('tr-TR').format(Math.round(deger));
}

/** 0.412 → "%41,2" */
export function yuzde(oran, basamak = 1) {
  if (oran === null || oran === undefined || Number.isNaN(oran)) return '—';
  return `%${(oran * 100).toFixed(basamak).replace('.', ',')}`;
}

/**
 * Saniye → "18 sn" / "18 dk" / "2 sa 5 dk".
 *
 * Saat ve dakika birlikte yazılıyor: "2 sa" tek başına 2 saat 55
 * dakikayı da anlatır ve fark gizlenir.
 */
export function sure(saniye) {
  if (saniye === null || saniye === undefined || Number.isNaN(saniye)) return '—';
  const s = Math.max(0, Math.round(saniye));
  if (s < 60) return `${s} sn`;
  const dk = Math.floor(s / 60);
  if (dk < 60) return `${dk} dk`;
  const sa = Math.floor(dk / 60);
  const kalan = dk % 60;
  return kalan ? `${sa} sa ${kalan} dk` : `${sa} sa`;
}
