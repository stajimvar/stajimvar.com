/**
 * BOT ZİYARETİ — ÖLÇÜME GİRMEYEN İSTEKLER (16 Kasım 2026)
 *
 * ÖLÇÜLEN SORUN
 * -------------
 * Son 30 günde 1.767 oturumun 1.443'ü ABD'dendi ve neredeyse tamamı veri
 * merkezi şehirlerinden (Ashburn 1.087, Phoenix, Des Moines, Moses Lake,
 * Council Bluffs): tek olay, 0 saniye, girişsiz. Türkiye'den gerçek oturum
 * ~300'dü. Yönetim paneli trafiği yaklaşık 6 kat fazla gösteriyordu.
 *
 * Ziyaret kaydı istemci betiğinden geliyor; yani bunlar JavaScript
 * çalıştıran otomatik tarayıcılar: arama motoru çizicileri, yapay zekâ
 * tarayıcıları, izleme araçları, CI koşuları.
 *
 * KURAL (`functions/api/olay.ts` yazmadan önce soruyor)
 *   1. Kullanıcı aracısı kendini bot/otomasyon olarak tanıtıyor, ya da hiç yok
 *   2. İstek bilinen bir bulut/veri merkezi ağından (ASN) geliyor
 *   3. Cloudflare isteği doğrulanmış bot olarak işaretlemiş
 * Üçünden biri yeterli. Bot isteği HİÇ yazılmıyor (yönetim paneli
 * ziyaretleriyle aynı karar: `site_olayi_yaz`).
 *
 * BİLİNEN BEDEL: şirket VPN'i bulut ağından çıkan gerçek bir ziyaretçi de
 * sayılmaz. Az sayıda gerçek ziyaretçiyi kaçırmak, binlerce botu saymaktan
 * daha küçük bir hata.
 */

/** Kendini tanıtan otomasyon. Gerçek tarayıcı adları (Chrome, Safari) eşleşmiyor. */
const BOT_ARACISI =
  /(?<!cu)bot\b|bot[\/;) ]|crawl|spider|slurp|headless|lighthouse|pagespeed|playwright|puppeteer|selenium|phantomjs|python-requests|python-urllib|aiohttp|httpx|curl\/|wget\/|go-http-client|node-fetch|axios\/|okhttp|java\/|libwww|scrapy|facebookexternalhit|whatsapp\/|bingpreview|uptime|pingdom|gtmetrix|google-inspectiontool|googleother|chatgpt|claude|anthropic|perplexity|bytespider|ahrefs|semrush/i;

/**
 * Bulut ve barındırma ağları (ASN). Buradan gelen "ziyaretçi" bir
 * sunucudur. Liste ölçülen şehirlerin sahiplerini (Amazon, Microsoft,
 * Google) ve yaygın barındırıcıları kapsıyor.
 */
export const VERI_MERKEZI_AGLARI = new Set([
  16509, 14618, 8987, // Amazon
  8075, 8068, 8069, // Microsoft Azure
  15169, 396982, 19527, // Google / Google Cloud
  36459, // GitHub
  13335, // Cloudflare
  14061, // DigitalOcean
  16276, // OVH
  24940, // Hetzner
  63949, // Linode / Akamai
  20473, // Vultr
  31898, // Oracle Cloud
  45102, 37963, // Alibaba Cloud
  132203, 45090, // Tencent Cloud
  54113, // Fastly
  32934, // Meta (bağlantı önizleme tarayıcıları)
]);

/**
 * @param {{ araci?: string | null, asn?: unknown, dogrulanmisBot?: unknown }} istek
 * @returns {boolean} true → ölçüme yazılmaz
 */
export function botZiyaretiMi(istek) {
  const araci = typeof istek?.araci === 'string' ? istek.araci.trim() : '';
  if (!araci) return true;
  if (BOT_ARACISI.test(araci)) return true;
  const asn = Number(istek?.asn);
  if (Number.isInteger(asn) && VERI_MERKEZI_AGLARI.has(asn)) return true;
  return istek?.dogrulanmisBot === true;
}

/**
 * GEÇMİŞ KAYIT İÇİN ŞEHİR LİSTESİ (göç 20270116010000 ile aynı)
 *
 * Eski satırlarda kullanıcı aracısı ve ASN saklanmadı; geriye dönük ayırma
 * yalnız davranıştan yapılabiliyor: veri merkezi şehri + en çok 2 olay +
 * 10 saniyeden kısa + girişsiz. Liste ölçülen şehirlerle sınırlı.
 */
export const VERI_MERKEZI_SEHIRLERI = [
  'Ashburn', 'Phoenix', 'Des Moines', 'Moses Lake', 'Council Bluffs',
  'Boardman', 'Quincy', 'The Dalles', 'Washington',
];
