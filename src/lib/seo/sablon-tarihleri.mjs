/**
 * ŞABLON DEĞİŞİKLİK TARİHLERİ — SİTE HARİTASI lastmod (23 Kasım 2026)
 *
 * `lastmod` yalnız içeriğin gerçek değişiklik tarihinden yazılıyor (derleme
 * günü asla). Ama içeriği yalnız veri değiştirmiyor: 17 Kasım'da bölüm ve
 * şirket sayfalarının başlığı, açıklaması ve H1'i değişti (lib/seo/
 * bolum-seo.mjs, sirket-seo.mjs) ve haritadaki tarih yerinde kaldı.
 * Ölçüldü (Search Console, 23 Kasım): Google /sirket/bosch sayfasını en
 * son 14 Eylül'de okumuş; yeni başlığı hiç görmedi.
 *
 * Sayfa türünün şablonu değiştiğinde tarih BURAYA elle yazılır; haritaya
 * veri tarihiyle şablon tarihinin yenisi girer. Sabit bir tarih olduğu
 * için her derlemede aynı kalır.
 */
export const SABLON_DEGISIKLIKLERI = Object.freeze({
  bolum: '2026-11-17',
  sirket: '2026-11-17',
});

/** Tarihlerin en yenisi (YYYY-AA-GG); hiçbiri yoksa null. */
export function enYeniTarih(...tarihler) {
  return tarihler.filter(Boolean).map((t) => String(t).slice(0, 10)).sort().pop() || null;
}
