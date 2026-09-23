/**
 * İLAN SIRASI HER YENİLEMEDE KAYIYOR
 *
 * ÖLÇÜLEN SORUN (kullanıcı, 23 Eylül 2026): "3 gündür siteye giriyorum,
 * hep aynı ilan en üstte."
 *
 * Sebebi varsayılan sıralamanın `match` olması. Eşleşme puanı profilden
 * hesaplanıyor; profili olmayan ziyaretçide puanlar birbirine çok yakın
 * çıkıyor ve sıra pratikte SABİTLENİYOR. 188 ilanın hep aynı ilk beşi
 * görünüyor: alttaki 183 ilan hiç görülmüyor, site de ölü duruyor.
 *
 * NEDEN KARIŞTIRMA DEĞİL DE DÖNDÜRME
 *
 * Rastgele karıştırma sırayı yok ediyor: "daha fazla göster"e basınca
 * aynı ilan ikinci kez çıkabiliyor, bir başkası hiç çıkmayabiliyor.
 * Döngüsel kaydırma ise kümeyi ve göreli sırayı OLDUĞU GİBİ bırakıp
 * yalnız başlangıç noktasını değiştiriyor — her ilan sırasını koruyor,
 * sadece kimin önce geldiği değişiyor.
 *
 * TAKAS AÇIK: dönüş, eşleşme sırasını da kaydırıyor. Profilini
 * doldurmuş kullanıcının en iyi eşleşmesi her zaman en üstte
 * olmayabilir. Bugünkü hâlde o sıralama zaten bilgi taşımıyordu; üç gün
 * aynı ekranı görmek kesin bir zarar, sıralamanın kayması olası bir
 * zarar. Kullanıcı belirli bir sıralama SEÇTİYSE (en yeni, son başvuru,
 * şirket adı…) dönüş uygulanmıyor — seçilmiş bir sırayı bozmak başka
 * bir şey olurdu.
 */

/**
 * Sayfa yüklenirken bir kez üretilen tohum.
 *
 * Modül seviyesinde: bileşen yeniden çizildiğinde (süzgeç değişimi,
 * "daha fazla göster") tohum AYNI kalıyor, yani sıra ekranda zıplamıyor.
 * Sayfa yenilenince modül baştan değerlendiği için yeni tohum geliyor.
 */
export const DONUS_TOHUMU = Math.random();

/**
 * Diziyi döngüsel kaydırır: [a,b,c,d] → [c,d,a,b].
 *
 * @template T
 * @param {T[]} dizi
 * @param {number} tohum 0 ile 1 arasında
 * @returns {T[]} aynı öğeler, kaydırılmış başlangıç
 */
export function ilanlariDondur(dizi, tohum = DONUS_TOHUMU) {
  if (!Array.isArray(dizi) || dizi.length < 2) return dizi;
  const t = Number.isFinite(tohum) ? Math.abs(tohum) % 1 : 0;
  const kayma = Math.floor(t * dizi.length) % dizi.length;
  if (kayma === 0) return dizi;
  return [...dizi.slice(kayma), ...dizi.slice(0, kayma)];
}
