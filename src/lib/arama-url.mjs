/**
 * Arama teriminin adresle senkronu.
 *
 * NEDEN GEREKLİ
 * -------------
 * Arama yalnızca bellekteydi: `stajimvar.com/?q=yazılım` bağlantısını açan
 * kişi hiçbir arama uygulanmamış ana sayfayı görüyordu — paylaşılan bağlantı
 * ve arama motoru sonucu boşa gidiyordu. Sayfa yenilendiğinde de terim
 * kayboluyordu.
 *
 * Parametre adı `q`: dışarıdan gelen bağlantılarda yaygın olan bu.
 */

/** @param {string} arama `window.location.search` */
export function aramaTeriminiOku(arama) {
  try {
    return new URLSearchParams(arama || '').get('q')?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Terime göre yeni adres üretir. Terim boşsa parametre siliniyor; boş `?q=`
 * bırakmak aynı sayfanın iki ayrı adresi demek olurdu (canonical karmaşası).
 *
 * @param {string} yol `window.location.pathname`
 * @param {string} arama `window.location.search`
 * @param {string} terim
 */
export function aramaAdresi(yol, arama, terim) {
  const parametreler = new URLSearchParams(arama || '');
  const temiz = (terim || '').trim();
  if (temiz) parametreler.set('q', temiz);
  else parametreler.delete('q');
  const kuyruk = parametreler.toString();
  return kuyruk ? `${yol}?${kuyruk}` : yol;
}
