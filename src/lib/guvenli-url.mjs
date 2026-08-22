/**
 * Dış adresleri güvenli, mutlak HTTPS adrese çevirir.
 *
 * NEDEN GEREKLİ
 * -------------
 * Şirket kayıtlarındaki web adresleri şemasız geliyor ("alumil.com"). Şemasız
 * bir değer `href`'e konduğunda tarayıcı onu GÖRELİ YOL sayıyor: şirket
 * sayfasındaki "Web sitesi" bağlantısı stajimvar.com/sirket/alumil.com adresine
 * gidiyordu — yani kullanıcı hiçbir zaman şirketin sitesine ulaşamıyordu.
 *
 * Şema eklemek tek başına yetmiyor: veritabanına elle girilen bir alan burası.
 * `javascript:` gibi bir değer bağlantıya konursa tıklayan kişinin oturumunda
 * kod çalışır. Yerel ve özel ağ adresleri de kabul edilmiyor; sunucu tarafında
 * bir gün bu adres çağrılırsa iç ağ taranabilir hale gelir (SSRF).
 */

/** Yerel makine, özel ağ ve çözümlenemeyen isimler. */
export function yerelKonakMi(konak) {
  const ad = String(konak || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!ad) return true;
  if (ad === 'localhost' || ad.endsWith('.localhost') || ad.endsWith('.local')) return true;
  if (ad === '::1' || ad.startsWith('fc') || ad.startsWith('fd')) return true;

  const ipv4 = ad.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // bulut sağlayıcıların metadata adresi
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  // Noktasız isimler (intranet konakları) çözümlenemez sayılıyor.
  return !ad.includes('.');
}

/**
 * @param {unknown} ham veritabanından gelen adres
 * @returns {string|null} güvenliyse mutlak HTTPS adres, değilse null
 */
export function guvenliDisAdres(ham) {
  if (typeof ham !== 'string') return null;
  const metin = ham.trim();
  if (!metin) return null;

  // Şeması olan değeri olduğu gibi bırak: eksik şemayı tamamlamak, "javascript:"
  // gibi bir değeri "https://javascript:..." yapıp gizlemek anlamına gelmemeli.
  const semaVar = /^[a-z][a-z0-9+.-]*:/i.test(metin);
  const aday = semaVar ? metin : `https://${metin}`;

  let url;
  try {
    url = new URL(aday);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null; // "https://kullanici@site" ile kimlik gizleme
  if (yerelKonakMi(url.hostname)) return null;
  return url.toString();
}
