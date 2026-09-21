/**
 * REHBER KÜNYESİ — EKRAN, ÖN RENDER VE JSON-LD İÇİN TEK KAYNAK
 *
 * NEDEN AYRI BİR MODÜL
 * --------------------
 * Ölçüldü (21 Eylül 2026, canlı `rehber/ats-uyumlu-cv`): sayfanın
 * "Bu rehber neye dayanıyor" ve "Resmî kaynaklar" bölümleri ÖN RENDER
 * EDİLMİŞ HTML'DE YOKTU; yalnız React hidrasyonundan sonra çiziliyordu.
 * Sebebi `scripts/onrender.mjs` içindeki çıkarımın `dayanak` alanını hiç
 * almamasıydı.
 *
 * Aynı bilgiyi iki yerde ayrı ayrı yazmak bu ayrışmayı üretiyor. Künye
 * artık burada hesaplanıyor; hem `GuidePages.tsx` hem `onrender.mjs`
 * bu işlevi çağırıyor. Biri değişirse ikisi birden değişiyor.
 *
 * YAZAR KURUM, KİŞİ DEĞİL
 * -----------------------
 * Rehberleri tek bir gerçek kişi yazmıyor; var olmayan bir yazar adı
 * uydurmak Google'ın E-E-A-T beklentisini karşılamaz, yanlış beyan olur.
 * Article JSON-LD zaten `Organization` kullanıyor (`StajımVar`); görünür
 * künye de aynı şeyi söylüyor ki yapısal veri ile ekran ayrışmasın.
 */

/** Görünür künyede ve JSON-LD'de kullanılan kurumsal yazar. */
export const YAZAR = 'StajımVar Editör Ekibi';

/** Hatalı bilgi bildirimi için var olan iletişim sayfası. */
export const BILDIRIM_YOLU = '/iletisim';

/** `2026-09-01` → `1 Eylül 2026`. Geçersiz girdide `null`. */
const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function tarihYaz(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const esles = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!esles) return null;
  const [, yil, ay, gun] = esles;
  const ayAdi = AYLAR[Number(ay) - 1];
  if (!ayAdi) return null;
  return `${Number(gun)} ${ayAdi} ${yil}`;
}

/**
 * Bir rehberin künye alanları.
 *
 * `dayanak` ile `kaynaklar` BİR ARADA DÖNMÜYOR: resmî kaynağı olan
 * rehberde dayanak cümlesi anlamsız, olmayan rehberde kaynak listesi
 * boş. Veri şeması da ikisini ayrı tutuyor (bkz. `rehberler.tsx`).
 *
 * @param {{guncelleme?: string, kaynaklar?: unknown[], dayanak?: string}} rehber
 */
export function kunye(rehber = {}) {
  const kaynaklar = Array.isArray(rehber.kaynaklar) ? rehber.kaynaklar : [];
  const kaynakVar = kaynaklar.length > 0;
  return {
    yazar: YAZAR,
    tarih: tarihYaz(rehber.guncelleme),
    /* Ham değer JSON-LD `dateModified` için; ekrandakiyle aynı günü anlatıyor. */
    tarihIso: rehber.guncelleme || null,
    kaynaklar,
    kaynakVar,
    dayanak: !kaynakVar && rehber.dayanak ? rehber.dayanak : null,
    bildirimYolu: BILDIRIM_YOLU,
  };
}
