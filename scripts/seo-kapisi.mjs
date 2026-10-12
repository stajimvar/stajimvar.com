/**
 * SEO KAPISI — DAĞITIMDAN ÖNCE ÇIKTININ KENDİSİ SINANIYOR (12 Ekim 2026)
 *
 * `npm run build` zincirinin son halkası: `scripts/onrender.mjs`ten sonra
 * koşuyor ve `dist/`i okuyor. Kaynak metne değil ÜRETİLEN HTML'e bakıyor;
 * bir kural kırıksa derleme düşüyor ve eksik/bozuk SEO çıktısı yayına
 * çıkmıyor.
 *
 * Denetlenenler:
 *   1. /sitemap.xml bir dizin; gösterdiği alt haritalar var ve geçerli.
 *   2. Haritadaki her adresin dosyası var, `noindex` taşımıyor, canonical'ı
 *      kendisi, tek <h1>'i var, gizli SEO kopyası (`data-seo-prerender`) yok.
 *   3. Her JSON-LD bloğu ayrıştırılabiliyor; JobPosting yalnız /ilan/
 *      sayfalarında ve Google'ın zorunlu alanlarıyla.
 *   4. İç bağlantılar: ön render edilmiş sayfalardaki her `href="/..."`
 *      gerçek bir dosyaya, `_redirects` kuralına ya da uygulama rotasına
 *      gidiyor. Kırık bağlantı derlemeyi durduruyor.
 *   5. robots.txt site haritasını gösteriyor.
 *
 * Çıktı: dist/_onrender/seo-kapisi.json (özet) + konsol.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const kok = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const dist = process.env.SEO_KAPISI_DIST || path.join(kok, 'dist');
const SITE = 'https://stajimvar.com';

/*
  ÖN RENDER EDİLMEYEN AMA GEÇERLİ UYGULAMA ADRESLERİ

  `functions/_middleware.ts` bunlara 200 kabuk veriyor (oturuma bağlı
  ekranlar). Liste orada tutuluyor; burada yalnız bağlantı denetimi için
  önek düzeyinde tekrar ediliyor. Yeni bir uygulama rotası eklenip buraya
  yazılmazsa kapı onu kırık bağlantı sayar — bilerek: o durumda ara
  katmanın listesi de güncellenmeli.
*/
const UYGULAMA_ONEKLERI = [
  '/profil', '/cv', '/baglantilar', '/takip', '/kampusum', '/agim', '/topluluklar',
  '/mesajlar', '/paylasim/', '/ayarlar/bildirimler', '/sifre-yenile', '/basvuru-sablonu',
  '/bana-uygun', '/kaydedilen-firsatlar', '/yonetim', '/sirket/ilanlar', '/sirket/basvuranlar',
  '/sirket/adaylar', '/sirket/aday', '/sirket/profil', '/sirket/ilan',
];

const hatalar = [];
const uyarilar = [];
const hata = (m) => hatalar.push(m);

const oku = (p) => fs.readFileSync(p, 'utf8');
const dosyaYolu = (yol) => (yol === '/' ? path.join(dist, 'index.html') : path.join(dist, yol.replace(/^\//, '') + '.html'));
const locler = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

/* ------------------------------------------------------------ 1. haritalar */
const dizinYolu = path.join(dist, 'sitemap.xml');
if (!fs.existsSync(dizinYolu)) hata('dist/sitemap.xml yok');
const dizin = fs.existsSync(dizinYolu) ? oku(dizinYolu) : '';
if (dizin && !/<sitemapindex[\s>]/.test(dizin)) hata('sitemap.xml bir sitemapindex değil');
const altHaritalar = locler(dizin);
const haritaAdresleri = new Set();
for (const alt of altHaritalar) {
  if (!alt.startsWith(SITE + '/')) {
    hata(`site haritası dizininde yabancı adres: ${alt}`);
    continue;
  }
  const dosya = path.join(dist, alt.slice(SITE.length + 1));
  if (!fs.existsSync(dosya)) {
    hata(`alt harita dosyası yok: ${alt}`);
    continue;
  }
  const xml = oku(dosya);
  if (!/<urlset[\s>]/.test(xml) || !xml.trim().endsWith('</urlset>')) hata(`alt harita bozuk: ${alt}`);
  for (const loc of locler(xml)) {
    if (!loc.startsWith(SITE + '/')) hata(`haritada yabancı adres: ${loc}`);
    if (/[?#]/.test(loc)) hata(`haritada parametreli adres: ${loc}`);
    if (loc !== SITE + '/' && loc.endsWith('/')) hata(`haritada eğik çizgiyle biten adres: ${loc}`);
    if (haritaAdresleri.has(loc)) hata(`haritada tekrar eden adres: ${loc}`);
    haritaAdresleri.add(loc);
  }
}
if (haritaAdresleri.size < 50) hata(`site haritasında yalnız ${haritaAdresleri.size} adres var`);

/* -------------------------------------------------- 2–3. harita sayfaları */
function jsonLdBloklari(html, ad) {
  const bloklar = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      bloklar.push(JSON.parse(m[1]));
    } catch {
      hata(`${ad}: JSON-LD ayrıştırılamıyor`);
    }
  }
  return bloklar;
}

const dugumler = (veri) => (Array.isArray(veri?.['@graph']) ? veri['@graph'] : [veri]);

function jobPostingDenetle(jp, ad) {
  for (const alan of ['title', 'description', 'datePosted', 'hiringOrganization']) {
    if (!jp[alan]) hata(`${ad}: JobPosting.${alan} yok`);
  }
  if (jp.hiringOrganization && !String(jp.hiringOrganization.name || '').trim()) hata(`${ad}: hiringOrganization.name boş`);
  if (/^bilinmiyor$/i.test(String(jp.hiringOrganization?.name || ''))) hata(`${ad}: uydurma şirket adı`);
  if (jp.description && String(jp.description).replace(/<[^>]+>/g, '').trim() === String(jp.title).trim()) {
    hata(`${ad}: açıklama başlıkla aynı`);
  }
  const uzaktan = jp.jobLocationType === 'TELECOMMUTE';
  if (!jp.jobLocation && !(uzaktan && jp.applicantLocationRequirements)) hata(`${ad}: jobLocation yok`);
  for (const yer of [].concat(jp.jobLocation || [])) {
    if (!yer?.address?.addressCountry) hata(`${ad}: jobLocation.address.addressCountry yok`);
  }
  if (jp.validThrough && !/^\d{4}-\d{2}-\d{2}/.test(jp.validThrough)) hata(`${ad}: validThrough biçimi`);
  if (jp.url && !jp.url.startsWith(SITE + '/ilan/')) hata(`${ad}: JobPosting.url ilan adresi değil`);
}

let jobPostingSayisi = 0;
for (const loc of haritaAdresleri) {
  const yol = loc.slice(SITE.length) || '/';
  const ad = yol;
  const dosya = dosyaYolu(yol);
  if (!fs.existsSync(dosya)) {
    hata(`${ad}: haritada ama dosyası yok`);
    continue;
  }
  const html = oku(dosya);
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) hata(`${ad}: haritada ama noindex`);
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (canonical !== loc) hata(`${ad}: canonical kendisi değil (${canonical || 'yok'})`);
  if ((html.match(/<link[^>]+rel="canonical"/g) || []).length !== 1) hata(`${ad}: canonical sayısı 1 değil`);
  const kok = html.slice(html.indexOf('<div id="root">'));
  const h1 = (kok.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) hata(`${ad}: ilk HTML'de ${h1} adet <h1>`);
  if (/data-seo-prerender>/.test(kok)) hata(`${ad}: gizli SEO kopyası (data-seo-prerender) var`);
  if (!/<title>[^<]{5,}<\/title>/.test(html)) hata(`${ad}: <title> boş`);
  for (const veri of jsonLdBloklari(html, ad)) {
    for (const d of dugumler(veri)) {
      if (d?.['@type'] === 'JobPosting') {
        jobPostingSayisi++;
        if (!yol.startsWith('/ilan/')) hata(`${ad}: ilan dışı sayfada JobPosting`);
        else jobPostingDenetle(d, ad);
      }
      if (d?.['@type'] === 'BreadcrumbList') {
        for (const o of d.itemListElement || []) {
          const hedef = String(o.item || '');
          if (!hedef.startsWith(SITE)) continue;
          const y = hedef.slice(SITE.length) || '/';
          if (!fs.existsSync(dosyaYolu(y))) hata(`${ad}: kırıntı yolu dosyası olmayan adrese gidiyor (${y})`);
        }
      }
    }
  }
}

/* ------------------------------------------------------- 4. iç bağlantılar */
const yonlendirmeler = [];
const redirectsDosyasi = path.join(dist, '_redirects');
if (fs.existsSync(redirectsDosyasi)) {
  for (const satir of oku(redirectsDosyasi).split(/\r?\n/)) {
    const k = satir.trim().split(/\s+/);
    if (!k[0] || k[0].startsWith('#') || k.length < 2) continue;
    yonlendirmeler.push(k[0]);
  }
}
const yonlendirmeVarMi = (yol) =>
  yonlendirmeler.some((k) => (k.endsWith('/*') ? yol.startsWith(k.slice(0, -1)) : k === yol));
const gecerliSirketler = (() => {
  try {
    return new Set(JSON.parse(oku(path.join(dist, 'gecerli-adresler.json'))).sirket || []);
  } catch {
    return new Set();
  }
})();

function baglantiGecerliMi(yol) {
  if (fs.existsSync(dosyaYolu(yol))) return true;
  if (fs.existsSync(path.join(dist, yol.replace(/^\//, '')))) return true; // varlık (png, pdf…)
  if (yonlendirmeVarMi(yol)) return true;
  if (UYGULAMA_ONEKLERI.some((o) => yol === o || yol.startsWith(o.endsWith('/') ? o : `${o}/`))) return true;
  if (yol.startsWith('/sirket/') && gecerliSirketler.has(yol.slice('/sirket/'.length))) return true;
  return false;
}

function htmlDosyalari(dizin) {
  const sonuc = [];
  for (const g of fs.readdirSync(dizin, { withFileTypes: true })) {
    const tam = path.join(dizin, g.name);
    if (g.isDirectory()) {
      if (['assets', '_onrender', 'og'].includes(g.name)) continue;
      sonuc.push(...htmlDosyalari(tam));
    } else if (g.name.endsWith('.html')) sonuc.push(tam);
  }
  return sonuc;
}

const kiriklar = new Map();
let baglantiSayisi = 0;
for (const dosya of htmlDosyalari(dist)) {
  const html = oku(dosya);
  const govde = html.slice(html.indexOf('<div id="root">'));
  for (const m of govde.matchAll(/href="(\/[^"#?]*)/g)) {
    const yol = m[1].replace(/&amp;/g, '&');
    if (yol.startsWith('//')) continue;
    baglantiSayisi++;
    if (!baglantiGecerliMi(yol.length > 1 ? yol.replace(/\/+$/, '') : yol)) {
      const kaynak = '/' + path.relative(dist, dosya).replace(/\\/g, '/').replace(/\.html$/, '');
      if (!kiriklar.has(yol)) kiriklar.set(yol, kaynak);
    }
  }
}
for (const [yol, kaynak] of kiriklar) hata(`kırık iç bağlantı: ${yol} (ör. ${kaynak})`);

/* ---------------------------------------------- 4b. gizli anahtar sızıntısı */
/*
  Yayınlanacak her dosyada (HTML, JS, JSON, XML) gizli Supabase anahtarı
  aranıyor: yeni biçim `sb_secret_…` ve rolü `anon` olmayan JWT. Herkese
  açık (publishable/anon) anahtar zaten pakette ve `_onrender/
  supabase-genel.json`da; o serbest. Değer hiçbir koşulda yazdırılmıyor.
*/
const METIN_UZANTI = /\.(html|js|mjs|json|xml|txt|css|map)$/i;
function tumDosyalar(dizin) {
  const sonuc = [];
  for (const g of fs.readdirSync(dizin, { withFileTypes: true })) {
    const tam = path.join(dizin, g.name);
    if (g.isDirectory()) sonuc.push(...tumDosyalar(tam));
    else if (METIN_UZANTI.test(g.name)) sonuc.push(tam);
  }
  return sonuc;
}
function jwtRolu(jeton) {
  try {
    const govde = jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(govde, 'base64').toString('utf8')).role || '?';
  } catch {
    return '?';
  }
}
for (const dosya of tumDosyalar(dist)) {
  const metin = oku(dosya);
  const ad = '/' + path.relative(dist, dosya).replace(/\\/g, '/');
  if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(metin)) hata(`${ad}: gizli Supabase anahtarı (sb_secret_) bulundu`);
  for (const m of metin.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    const rol = jwtRolu(m[0]);
    if (rol !== 'anon') hata(`${ad}: rolü "${rol}" olan JWT bulundu (yalnız anon yayınlanabilir)`);
  }
}

/* ------------------------------------------------------------ 5. robots */
const robots = fs.existsSync(path.join(dist, 'robots.txt')) ? oku(path.join(dist, 'robots.txt')) : '';
if (!/^Sitemap: https:\/\/stajimvar\.com\/sitemap\.xml$/m.test(robots)) hata('robots.txt site haritasını göstermiyor');

/* ---------------------------------------------------------------- sonuç */
const ozet = {
  haritaAdresi: haritaAdresleri.size,
  jobPosting: jobPostingSayisi,
  icBaglanti: baglantiSayisi,
  kirikBaglanti: kiriklar.size,
  hata: hatalar.length,
};
fs.mkdirSync(path.join(dist, '_onrender'), { recursive: true });
fs.writeFileSync(path.join(dist, '_onrender', 'seo-kapisi.json'), JSON.stringify({ ...ozet, hatalar, uyarilar }, null, 2));
console.log(`SEO kapısı: ${JSON.stringify(ozet)}`);
for (const u of uyarilar) console.log(`  uyarı: ${u}`);
if (hatalar.length) {
  console.error(`SEO kapısı DURDU — ${hatalar.length} sorun:`);
  for (const h of hatalar.slice(0, 60)) console.error(`  · ${h}`);
  if (hatalar.length > 60) console.error(`  … ve ${hatalar.length - 60} sorun daha (dist/_onrender/seo-kapisi.json)`);
  process.exit(1);
}
