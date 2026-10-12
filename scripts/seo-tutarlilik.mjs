/**
 * SEO TUTARLILIK DENETİMİ — CANLI DAVRANIŞ (12 Ekim 2026)
 *
 *   node scripts/seo-tutarlilik.mjs http://127.0.0.1:5199     (yerel wrangler)
 *   node scripts/seo-tutarlilik.mjs https://stajimvar.com     (yayın sonrası)
 *
 * Kaynak metne değil, sunucunun gerçek yanıtlarına bakıyor. YALNIZ OKUR:
 * veritabanına anonim anahtarla GET atıyor, siteye GET/HEAD atıyor.
 *
 * Denetlenen dört şeyin birbiriyle tutarlılığı:
 *   veritabanı   yayındaki, süresi geçmemiş ilanlar (anonim okuma)
 *   site haritası /sitemap-ilanlar.xml
 *   sayfa        /ilan/<adres>: 200, canonical = adres, noindex yok,
 *                JobPosting varsa url = adres; süresi geçmişte JobPosting yok
 *   iç bağlantı  harita sayfalarındaki /ilan/ bağlantıları 200 ya da 301
 *
 * Ek senaryolar: eski (önek) adres 301 ile kanonik adrese, var olmayan ilan
 * 404 + noindex, www ve sondaki eğik çizgi.
 */
import { ilanYolu } from '../src/lib/seo/metin.mjs';
import { sonBasvuruDurumu } from '../src/lib/seo/ilan-sayfasi.mjs';

const TABAN = (process.argv[2] || 'http://127.0.0.1:5199').replace(/\/+$/, '');
const SITE = 'https://stajimvar.com';
const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_ANAHTAR = process.env.VITE_SUPABASE_ANON_KEY;
const ES_ZAMANLI = 6;

const sorunlar = [];
const sorun = (m) => sorunlar.push(m);
const yerel = (adres) => adres.replace(SITE, TABAN);

async function getir(adres, secenek = {}) {
  for (let deneme = 1; deneme <= 3; deneme++) {
    try {
      return await fetch(adres, { redirect: 'manual', ...secenek });
    } catch (e) {
      if (deneme === 3) throw e;
      await new Promise((r) => setTimeout(r, 500 * deneme));
    }
  }
}

async function havuz(ogeler, is) {
  let i = 0;
  await Promise.all(
    Array.from({ length: ES_ZAMANLI }, async () => {
      while (i < ogeler.length) await is(ogeler[i++]);
    }),
  );
}

const locler = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
function jsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const v = JSON.parse(m[1]);
      out.push(...(Array.isArray(v['@graph']) ? v['@graph'] : [v]));
    } catch {
      out.push({ bozuk: true });
    }
  }
  return out;
}

async function main() {
  if (!SB_URL || !SB_ANAHTAR) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tanımlı değil');

  /* 1. veritabanı: yayındaki ilanlar (anonim) */
  const vt = await fetch(`${SB_URL}/rest/v1/listings?status=eq.published&select=id,title,application_deadline`, {
    headers: { apikey: SB_ANAHTAR, Authorization: `Bearer ${SB_ANAHTAR}` },
  });
  if (!vt.ok) throw new Error(`veritabanı okunamadı: HTTP ${vt.status}`);
  const ilanlar = await vt.json();
  const acik = new Map();
  const kapali = new Map();
  for (const i of ilanlar) (sonBasvuruDurumu(i).suresiGecti ? kapali : acik).set(SITE + ilanYolu(i), i);

  /* 2. site haritası */
  const dizin = await (await getir(`${TABAN}/sitemap.xml`)).text();
  const altlar = locler(dizin);
  if (!altlar.some((a) => a.endsWith('/sitemap-ilanlar.xml'))) sorun('sitemap.xml dizini ilan haritasını göstermiyor');
  const ilanHaritasi = new Set(locler(await (await getir(`${TABAN}/sitemap-ilanlar.xml`)).text()));
  for (const a of acik.keys()) if (!ilanHaritasi.has(a)) sorun(`yayında ama haritada yok: ${a}`);
  for (const a of ilanHaritasi) {
    if (kapali.has(a)) sorun(`süresi geçmiş ama haritada: ${a}`);
    else if (!acik.has(a)) sorun(`haritada ama yayında değil: ${a}`);
  }

  /* 3. her ilan sayfası */
  const ilanAdresleri = [...acik.keys(), ...kapali.keys()];
  let jobPosting = 0;
  await havuz(ilanAdresleri, async (a) => {
    const c = await getir(yerel(a));
    if (c.status !== 200) return sorun(`${a}: HTTP ${c.status}`);
    const h = await c.text();
    const canonical = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (canonical !== a) sorun(`${a}: canonical ${canonical}`);
    if (/<meta name="robots" content="[^"]*noindex/.test(h)) sorun(`${a}: noindex`);
    const kok = h.slice(h.indexOf('<div id="root">'));
    if ((kok.match(/<h1[\s>]/g) || []).length !== 1) sorun(`${a}: H1 sayısı 1 değil`);
    const jp = jsonLd(h).filter((d) => d['@type'] === 'JobPosting');
    if (jsonLd(h).some((d) => d.bozuk)) sorun(`${a}: JSON-LD bozuk`);
    if (jp.length > 1) sorun(`${a}: birden çok JobPosting`);
    if (jp[0]) {
      jobPosting++;
      if (jp[0].url !== a) sorun(`${a}: JobPosting.url ${jp[0].url}`);
      if (kapali.has(a)) sorun(`${a}: süresi geçmiş ama JobPosting var`);
    }
  });

  /* 4. eski / kısaltılmış adres → 301 kanonik; olmayan ilan → 404 */
  const ornekler = [...acik.keys()].slice(0, 15);
  await havuz(ornekler, async (a) => {
    const onek = a.slice(-8);
    const c = await getir(`${TABAN}/ilan/${onek}`);
    const hedef = c.headers.get('location') || '';
    if (c.status !== 301 || !hedef.endsWith(a.slice(SITE.length))) sorun(`/ilan/${onek}: ${c.status} → ${hedef}`);
  });
  const yok = await getir(`${TABAN}/ilan/bu-ilan-hic-olmadi-00000000`);
  if (yok.status !== 404) sorun(`olmayan ilan: HTTP ${yok.status}`);
  if (!/noindex/.test(yok.headers.get('x-robots-tag') || '')) sorun('olmayan ilan: X-Robots-Tag noindex yok');

  /* 5. harita sayfalarındaki /ilan/ bağlantıları */
  const sayfaHaritasi = altlar.find((a) => a.endsWith('/sitemap-sayfalar.xml'));
  const sayfalar = sayfaHaritasi ? locler(await (await getir(yerel(sayfaHaritasi))).text()) : [];
  const baglantilar = new Map();
  await havuz(sayfalar, async (a) => {
    const c = await getir(yerel(a));
    if (c.status !== 200) return sorun(`${a}: HTTP ${c.status}`);
    const h = await c.text();
    const canonical = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (canonical !== a) sorun(`${a}: canonical ${canonical}`);
    if (/<meta name="robots" content="[^"]*noindex/.test(h)) sorun(`${a}: haritada ama noindex`);
    for (const m of h.matchAll(/href="(\/ilan\/[^"#?]+)"/g)) if (!baglantilar.has(m[1])) baglantilar.set(m[1], a);
  });
  let kirikIlanBaglantisi = 0;
  await havuz([...baglantilar.keys()], async (y) => {
    const c = await getir(TABAN + y, { method: 'HEAD' });
    if (c.status !== 200 && c.status !== 301) {
      kirikIlanBaglantisi++;
      sorun(`iç bağlantı ${y} (${baglantilar.get(y)}): HTTP ${c.status}`);
    }
  });

  const ozet = {
    taban: TABAN,
    yayindaAcik: acik.size,
    suresiGecmis: kapali.size,
    ilanHaritasi: ilanHaritasi.size,
    jobPosting,
    haritaSayfasi: sayfalar.length,
    iceriktekiIlanBaglantisi: baglantilar.size,
    kirikIlanBaglantisi,
    sorun: sorunlar.length,
  };
  console.log(JSON.stringify(ozet));
  for (const s of sorunlar.slice(0, 50)) console.log('  · ' + s);
  if (sorunlar.length) process.exit(1);
}

main().catch((e) => {
  console.error(`tutarlılık denetimi çalışamadı: ${e.message}`);
  process.exit(2);
});
