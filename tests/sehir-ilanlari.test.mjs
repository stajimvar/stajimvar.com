import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import {
  SEHIR_SAYFALARI,
  SEHIR_ESIGI,
  SEHIR_ILAN_SECIMI,
  sehirAdresiniCoz,
  sehirIlanlari,
  sehirSayfasi,
  sehirYolu,
} from '../src/lib/seo/sehir-ilanlari.mjs';
import { sehirIsteginiCoz, yedekTazeMi, YEDEK_AZAMI_SAAT } from '../src/lib/seo/kenar-sehir.mjs';
import { ilanIli } from '../src/lib/ilan-ili.mjs';
import { ilanYolu } from '../src/lib/seo/metin.mjs';

/*
  /staj-ilanlari/istanbul — ŞEHİR SAYFASI (14 Ekim 2026)

  Kural, sayfalama ve işaretleme src/lib/seo/sehir-ilanlari.mjs; kenar
  kararı src/lib/seo/kenar-sehir.mjs; ara katman functions/_middleware.ts.
  Veritabanına dokunulmuyor: Supabase yerine sahte fetch, Cloudflare yerine
  bellek içi ASSETS ve önbellek.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const BUGUN = '2026-10-14';
const SIMDI = Date.parse('2026-10-14T09:00:00Z');
const etiketler = { konum: (i) => i.il || i.city || '', calisma: (w) => ({ 'On-site': 'Ofisten', Hybrid: 'Hibrit', Remote: 'Uzaktan' })[w] || w };

let sira = 0;
const ilan = (ek = {}) => {
  sira++;
  const n = String(sira).padStart(8, '0');
  return {
    id: `${n}-0000-4000-8000-000000000000`,
    title: `İstanbul Stajyeri ${sira}`,
    city: 'Istanbul',
    il: 'İstanbul',
    ilce: null,
    country_code: 'TR',
    work_type: 'On-site',
    posted_at: `2026-10-${String((sira % 28) + 1).padStart(2, '0')}T10:00:00Z`,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-10-10T10:00:00Z',
    application_deadline: null,
    status: 'published',
    companies: { name: `Şirket ${sira}`, logo_url: null },
    ...ek,
  };
};
const istanbullar = (n) => Array.from({ length: n }, () => ilan());

/* ------------------------------------------------------------ adresler */

test('adres: yalnız İstanbul; /sayfa/1 ve sondaki eğik çizgi kanoniğe; biçimsiz adres yok', () => {
  assert.deepEqual(Object.keys(SEHIR_SAYFALARI), ['istanbul'], 'başka şehir sayfası açılmamalı');
  assert.deepEqual(sehirAdresiniCoz('/staj-ilanlari/istanbul'), { slug: 'istanbul', il: 'İstanbul', sayfa: 1 });
  assert.deepEqual(sehirAdresiniCoz('/staj-ilanlari/istanbul/sayfa/2'), { slug: 'istanbul', il: 'İstanbul', sayfa: 2 });
  assert.deepEqual(sehirAdresiniCoz('/staj-ilanlari/istanbul/sayfa/1'), { yonlendir: '/staj-ilanlari/istanbul' });
  assert.deepEqual(sehirAdresiniCoz('/staj-ilanlari/istanbul/'), { yonlendir: '/staj-ilanlari/istanbul' });
  assert.deepEqual(sehirAdresiniCoz('/staj-ilanlari/istanbul/sayfa/3/'), { yonlendir: '/staj-ilanlari/istanbul/sayfa/3' });
  for (const yol of [
    '/staj-ilanlari/ankara',
    '/staj-ilanlari/izmir/sayfa/2',
    '/staj-ilanlari/sayfa/2',
    '/staj-ilanlari/istanbul/sayfa/0',
    '/staj-ilanlari/istanbul/sayfa/02',
    '/staj-ilanlari/istanbul/sayfa/x',
    '/staj-ilanlari/istanbul/baska',
    '/staj-ilanlari/constructor',
    '/staj-ilanlari',
  ]) {
    assert.equal(sehirAdresiniCoz(yol), null, yol);
  }
  assert.equal(sehirYolu('istanbul'), '/staj-ilanlari/istanbul');
  assert.equal(sehirYolu('istanbul', 1), '/staj-ilanlari/istanbul');
  assert.equal(sehirYolu('istanbul', 3), '/staj-ilanlari/istanbul/sayfa/3');
});

/* --------------------------------------------------------- seçim kuralı */

test('seçim: yalnız İstanbul; ilanIli kuralı; kapanmış, yayında olmayan ve tekrar yok', () => {
  const dogrulanmis = ilan({ city: 'Gebze', il: 'İstanbul' });
  const turetilmis = ilan({ city: 'Maslak', il: null });
  const ulkesiz = ilan({ city: 'İstanbul', il: null, country_code: null });
  const onekli = ilan({ city: 'Turkey - Istanbul', il: null });
  const ankara = ilan({ city: 'Ankara', il: 'Ankara' });
  const yalnizUlke = ilan({ city: 'Turkey', il: null });
  const belirsiz = ilan({ city: 'İstanbul / Ankara', il: null });
  const yabanci = ilan({ city: 'Istanbul', il: null, country_code: 'FR' });
  const dunBitti = ilan({ application_deadline: '2026-10-13' });
  const bugunSon = ilan({ application_deadline: '2026-10-14' });
  const taslak = ilan({ status: 'draft' });
  const kopya = { ...bugunSon, id: 'ffffffff-0000-4000-8000-000000000000' };
  const liste = sehirIlanlari(
    [dogrulanmis, turetilmis, ulkesiz, onekli, ankara, yalnizUlke, belirsiz, yabanci, dunBitti, bugunSon, taslak, kopya, bugunSon],
    'İstanbul',
    BUGUN,
  );
  const kimlikler = new Set(liste.map((i) => i.id));
  for (const var_ of [dogrulanmis, turetilmis, ulkesiz, onekli, bugunSon]) assert.ok(kimlikler.has(var_.id), var_.city);
  for (const yok of [ankara, yalnizUlke, belirsiz, yabanci, dunBitti, taslak, kopya]) assert.ok(!kimlikler.has(yok.id), `${yok.city} ${yok.status}`);
  assert.equal(liste.length, 5);
  for (const i of liste) assert.equal(ilanIli(i), 'İstanbul');
  /* En yeni önce (arşivle aynı sıra). */
  const zamanlar = liste.map((i) => i.posted_at);
  assert.deepEqual(zamanlar, [...zamanlar].sort().reverse());
});

/* ---------------------------------------------------- sayfalama ve HTML */

test('sayfalama: 30 ilan; son sayfa kalanı; aralık dışı null; /sayfa/1 bağlantısı yok', () => {
  const ilanlar = istanbullar(65);
  const s1 = sehirSayfasi({ slug: 'istanbul', sayfa: 1, ilanlar, etiketler, bugun: BUGUN });
  const s2 = sehirSayfasi({ slug: 'istanbul', sayfa: 2, ilanlar, etiketler, bugun: BUGUN });
  const s3 = sehirSayfasi({ slug: 'istanbul', sayfa: 3, ilanlar, etiketler, bugun: BUGUN });
  assert.equal(s1.toplamSayfa, 3);
  assert.deepEqual([s1.dilim.length, s2.dilim.length, s3.dilim.length], [30, 30, 5]);
  assert.equal(s1.adet, 65);
  assert.equal(sehirSayfasi({ slug: 'istanbul', sayfa: 4, ilanlar, etiketler, bugun: BUGUN }), null);
  assert.equal(sehirSayfasi({ slug: 'istanbul', sayfa: 0, ilanlar, etiketler, bugun: BUGUN }), null);
  assert.equal(sehirSayfasi({ slug: 'ankara', sayfa: 1, ilanlar, etiketler, bugun: BUGUN }), null);
  /* Sayfalar kesişmiyor, toplam = adet. */
  const hepsi = [...s1.dilim, ...s2.dilim, ...s3.dilim].map((i) => i.id);
  assert.equal(new Set(hepsi).size, 65);
  for (const s of [s1, s2, s3]) {
    assert.doesNotMatch(s.s.govde, /\/sayfa\/1"/, 'birinci sayfaya /sayfa/1 diye bağlanılıyor');
  }
  assert.match(s2.s.govde, /<a href="\/staj-ilanlari\/istanbul">← Önceki sayfa<\/a>/);
  assert.match(s2.s.govde, /<a href="\/staj-ilanlari\/istanbul\/sayfa\/3">Sonraki sayfa →<\/a>/);
  assert.match(s2.s.govde, /<span aria-current="page">2<\/span>/);
});

test('ilk HTML: tek H1, gerçek ilan bağlantıları, BreadcrumbList, JobPosting yok, şehre özgü başlık', () => {
  const ilanlar = istanbullar(35);
  const s1 = sehirSayfasi({ slug: 'istanbul', sayfa: 1, ilanlar, etiketler, bugun: BUGUN });
  const s2 = sehirSayfasi({ slug: 'istanbul', sayfa: 2, ilanlar, etiketler, bugun: BUGUN });
  assert.equal(s1.s.baslik, 'İstanbul Staj İlanları | StajımVar');
  assert.equal(s2.s.baslik, 'İstanbul staj ilanları — sayfa 2/2 | StajımVar');
  /* Bilgi satırları bağlantı gibi görünmüyor (vurgu sınıfı yok); dağılım veriden. */
  assert.match(s1.s.govde, /<p>Çalışma şekli: Ofisten 35<\/p>/);
  assert.doesNotMatch(s1.s.govde, /class="sv-alt"/);
  assert.match(s1.s.aciklama, /^İstanbul'daki 35 açık staj ilanı, 35 şirketin kendi kariyer sayfasından/);
  for (const s of [s1, s2]) {
    assert.equal((s.s.govde.match(/<h1\b/g) || []).length, 1);
    assert.doesNotMatch(JSON.stringify(s.s.jsonLd), /JobPosting|ItemList/);
    assert.equal(s.s.kirintiYok, true, 'otomatik kırıntı kapalı (ara adresler 404 olurdu)');
    const kartlar = [...s.s.govde.matchAll(/<a class="sv-kart-baslik" href="([^"]+)">/g)].map((m) => m[1]);
    assert.equal(kartlar.length, s.dilim.length);
    assert.deepEqual(kartlar, s.dilim.map((i) => ilanYolu(i)));
  }
  assert.deepEqual(
    s1.s.jsonLd.itemListElement.map((o) => [o.position, o.name, o.item]),
    [
      [1, 'Ana sayfa', 'https://stajimvar.com/'],
      [2, 'Staj ilanları', 'https://stajimvar.com/staj-ilanlari'],
      [3, 'İstanbul', 'https://stajimvar.com/staj-ilanlari/istanbul'],
    ],
  );
  assert.equal(s2.s.jsonLd.itemListElement.at(-1).item, 'https://stajimvar.com/staj-ilanlari/istanbul/sayfa/2');
  assert.equal(s1.s.jsonLd['@type'], 'BreadcrumbList');
});

test(`eşik: ${SEHIR_ESIGI}'dan az ilan noindex (haritaya girmez); eşikte ve üstünde dizine açık`, () => {
  assert.equal(SEHIR_ESIGI, 10);
  assert.equal(sehirSayfasi({ slug: 'istanbul', ilanlar: istanbullar(9), etiketler, bugun: BUGUN }).s.dizinDisi, true);
  assert.equal(sehirSayfasi({ slug: 'istanbul', ilanlar: istanbullar(10), etiketler, bugun: BUGUN }).s.dizinDisi, false);
  const bos = sehirSayfasi({ slug: 'istanbul', ilanlar: [], etiketler, bugun: BUGUN });
  assert.equal(bos.toplamSayfa, 1);
  assert.equal(bos.s.dizinDisi, true);
  assert.match(bos.s.govde, /Şu anda İstanbul'daki açık staj ilanı yok\./);
  /* Ön render eşik altını haritadan dışlıyor: sayfaYaz dizinDisi'ni harita kararına çeviriyor. */
  const r = oku('scripts/onrender.mjs');
  assert.match(r, /YAZILAN_ADRESLER\.set\(yol, \{ dizinDisi: Boolean\(s\.dizinDisi\)/);
  assert.match(r, /if \(bilgi\.dizinDisi \|\| HARITADAN_DISLANAN\.has\(yol\)/);
  assert.match(r, /sayfaYaz\(sehirYolu\(slug, n\), bu\.s\);/);
});

/* ------------------------------------------------- kenar karar tablosu */

const KABUK = '<!doctype html><html><head><title>StajımVar</title><meta name="description" content="" /><meta property="og:title" content="" /><meta property="og:description" content="" /><link rel="canonical" href="https://stajimvar.com/" /></head><body><div id="root"></div></body></html>';
const AYAR = { taban: 'https://ornek.supabase.co', anahtar: 'anon' };
const json = (v, durum = 200) => new Response(JSON.stringify(v), { status: durum, headers: { 'content-type': 'application/json' } });
const coz = (yol, getir, ek = {}) =>
  sehirIsteginiCoz({ yol, ayar: AYAR, getir, kabukGetir: async () => KABUK, etiketler, bugun: BUGUN, ...ek });

test('kenar: 200 kendine canonical; /sayfa/1 301; aralık dışı 404; bilinmeyen şehir dokunulmuyor', async () => {
  const istekler = [];
  const getir = async (adres) => {
    istekler.push(adres);
    return json(istanbullar(65));
  };
  const s1 = await coz('/staj-ilanlari/istanbul', getir);
  assert.equal(s1.tur, 200);
  assert.match(s1.html, /<link rel="canonical" href="https:\/\/stajimvar\.com\/staj-ilanlari\/istanbul" \/>/);
  assert.equal((s1.html.match(/rel="canonical"/g) || []).length, 1);
  assert.doesNotMatch(s1.html, /noindex/);
  assert.match(s1.html, /"@type":"BreadcrumbList"/);
  const s3 = await coz('/staj-ilanlari/istanbul/sayfa/3', getir);
  assert.equal(s3.tur, 200);
  assert.match(s3.html, /<link rel="canonical" href="https:\/\/stajimvar\.com\/staj-ilanlari\/istanbul\/sayfa\/3" \/>/);
  assert.deepEqual(await coz('/staj-ilanlari/istanbul/sayfa/1', getir), { tur: 301, konum: '/staj-ilanlari/istanbul' });
  assert.deepEqual(await coz('/staj-ilanlari/istanbul/sayfa/4', getir), { tur: 404 });
  assert.deepEqual(await coz('/staj-ilanlari/ankara', getir), { tur: 'gec' });
  /* Sorgu: yalnız yayındaki ilanlar, tamamı (sayfa sınırı yok), anonim seçim. */
  assert.match(istekler[0], /\/rest\/v1\/listings\?status=eq\.published&select=/);
  assert.doesNotMatch(istekler[0], /limit=/);
  assert.equal(decodeURIComponent(istekler[0].split('select=')[1]), SEHIR_ILAN_SECIMI);
  assert.match(SEHIR_ILAN_SECIMI, /\bil\b.*\bilce\b/);
});

test('kenar: kapanan ilan bir sonraki çizimde listeden çıkıyor', async () => {
  const liste = istanbullar(12);
  const ilk = await coz('/staj-ilanlari/istanbul', async () => json(liste));
  const kapanan = liste[0];
  assert.ok(ilk.html.includes(ilanYolu(kapanan)));
  /* Yayından kalktı: sorgu artık onu döndürmüyor (status=eq.published). */
  const sonra = await coz('/staj-ilanlari/istanbul', async () => json(liste.slice(1)));
  assert.ok(!sonra.html.includes(ilanYolu(kapanan)));
  /* Son başvurusu geçti ama hâlâ published: yine listede yok. */
  const suresiGecen = { ...liste[1], application_deadline: '2026-10-01' };
  const ucuncu = await coz('/staj-ilanlari/istanbul', async () => json([suresiGecen, ...liste.slice(2)]));
  assert.ok(!ucuncu.html.includes(ilanYolu(suresiGecen)));
});

test('kenar: veri ya da kabuk okunamazsa 404 değil yedek; yedek yalnız taze derlemeyle', async () => {
  for (const getir of [async () => json({ message: 'x' }, 500), async () => json({ message: 'x' }, 401), async () => { throw new Error('ağ'); }]) {
    assert.equal((await coz('/staj-ilanlari/istanbul', getir)).tur, 'yedek');
  }
  assert.equal((await coz('/staj-ilanlari/istanbul', async () => json(istanbullar(3)), { kabukGetir: async () => null })).tur, 'yedek');
  assert.equal((await sehirIsteginiCoz({ yol: '/staj-ilanlari/istanbul', ayar: {}, getir: async () => json([]), kabukGetir: async () => KABUK, etiketler })).tur, 'yedek');
  /* Bayat yedeğin sınırı. */
  assert.equal(YEDEK_AZAMI_SAAT, 12);
  assert.equal(yedekTazeMi(new Date(SIMDI - 3600e3).toISOString(), SIMDI), true);
  assert.equal(yedekTazeMi(new Date(SIMDI - 11.9 * 3600e3).toISOString(), SIMDI), true);
  assert.equal(yedekTazeMi(new Date(SIMDI - 12.1 * 3600e3).toISOString(), SIMDI), false);
  assert.equal(yedekTazeMi(new Date(SIMDI + 3600e3).toISOString(), SIMDI), false, 'gelecek tarihli damga');
  for (const bozuk of [null, undefined, '', 'dün', 42]) assert.equal(yedekTazeMi(bozuk, SIMDI), false, String(bozuk));
});

/* ------------------------------------ ara katman: gerçek durum kodları */

registerHooks({
  resolve(belirtec, baglam, sonraki) {
    try {
      return sonraki(belirtec, baglam);
    } catch (hata) {
      if (hata?.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(belirtec) && !/\.[cm]?[jt]sx?$/.test(belirtec)) {
        return sonraki(`${belirtec}.ts`, baglam);
      }
      throw hata;
    }
  },
});

const ONBELLEK = new Map();
globalThis.caches = {
  default: {
    match: async (i) => ONBELLEK.get(i.url)?.clone(),
    put: async (i, c) => {
      ONBELLEK.set(i.url, c.clone());
    },
    delete: async (i) => ONBELLEK.delete(i.url),
  },
};
const html = (g) => new Response(g, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
const BULUNAMADI = '<html><head><meta name="robots" content="noindex" /></head><body>Sayfa bulunamadı</body></html>';

async function istek(araKatman, adres, { veri = null, damga = null, dosyalar = {}, env = {} } = {}) {
  const bekleyen = [];
  const gercek = globalThis.fetch;
  const supabaseIstekleri = [];
  globalThis.fetch = async (url) => {
    supabaseIstekleri.push(String(url));
    if (veri instanceof Error) throw veri;
    if (veri === null) throw new Error('ağ çağrısı beklenmiyordu');
    return json(veri);
  };
  try {
    const yol = new URL(adres).pathname;
    const cevap = await araKatman.onRequest({
      request: new Request(adres),
      env: {
        ...env,
        ASSETS: {
          fetch: async (r) => {
            const p = new URL(r.url).pathname;
            if (p === '/_onrender/kabuk') return html(KABUK);
            if (p === '/404.html') return html(BULUNAMADI);
            if (p === '/_onrender/sehir-derleme.json' && damga) return json({ zaman: damga });
            return new Response('yok', { status: 404 });
          },
        },
      },
      next: async () => (dosyalar[yol] ? html(dosyalar[yol]) : new Response('Not found', { status: 404 })),
      waitUntil: (is) => bekleyen.push(is),
    });
    await Promise.all(bekleyen);
    return { cevap, govde: await cevap.text(), supabaseIstekleri };
  } finally {
    globalThis.fetch = gercek;
  }
}

const ENV = { SUPABASE_URL: 'https://ornek.supabase.co', SUPABASE_ANON_KEY: 'anon' };
const SITE = 'https://stajimvar.com';

test('ara katman: 200 / 301 / 404 / bilinmeyen şehir 404; yalnız 200 kenarda tutuluyor', async () => {
  const araKatman = await import('../functions/_middleware.ts');
  const veri = istanbullar(65);
  ONBELLEK.clear();
  const s1 = await istek(araKatman, `${SITE}/staj-ilanlari/istanbul`, { veri, env: ENV });
  assert.equal(s1.cevap.status, 200);
  assert.equal(s1.cevap.headers.get('x-sehir-kaynagi'), 'kenar');
  assert.match(s1.govde, /<h1>İstanbul Staj İlanları<\/h1>/);
  assert.equal(ONBELLEK.size, 1, '200 kenarda tutulmadı');
  /* İkinci istek önbellekten: veritabanına gidilmiyor. */
  const tekrar = await istek(araKatman, `${SITE}/staj-ilanlari/istanbul`, { veri: new Error('okunmamalıydı'), env: ENV });
  assert.equal(tekrar.cevap.status, 200);
  assert.equal(tekrar.cevap.headers.get('x-onbellek'), 'HIT');
  assert.equal(tekrar.supabaseIstekleri.length, 0);

  for (const n of [2, 3]) {
    const s = await istek(araKatman, `${SITE}/staj-ilanlari/istanbul/sayfa/${n}`, { veri, env: ENV });
    assert.equal(s.cevap.status, 200, `sayfa ${n}`);
  }
  const bir = await istek(araKatman, `${SITE}/staj-ilanlari/istanbul/sayfa/1`, { veri, env: ENV });
  assert.equal(bir.cevap.status, 301);
  assert.equal(bir.cevap.headers.get('location'), `${SITE}/staj-ilanlari/istanbul`);

  ONBELLEK.clear();
  const disi = await istek(araKatman, `${SITE}/staj-ilanlari/istanbul/sayfa/9`, { veri, env: ENV });
  assert.equal(disi.cevap.status, 404);
  assert.equal(disi.cevap.headers.get('x-robots-tag'), 'noindex');
  assert.equal(disi.cevap.headers.get('cache-control'), 'no-store');
  assert.equal(ONBELLEK.size, 0, '404 kenarda tutuldu');

  for (const yol of ['/staj-ilanlari/ankara', '/staj-ilanlari/izmir/sayfa/2', '/staj-ilanlari/istanbul/baska']) {
    const s = await istek(araKatman, `${SITE}${yol}`, { veri: null, env: ENV });
    assert.equal(s.cevap.status, 404, yol);
    assert.equal(s.supabaseIstekleri.length, 0, `${yol}: veritabanına gidildi`);
  }
});

test('ara katman: veri okunamazsa taze derleme yedeği, bayatsa ya da yoksa 503 — kapanmış ilan sınırsız gösterilmiyor', async () => {
  const araKatman = await import('../functions/_middleware.ts');
  const yedek = '<html><body><h1>İstanbul Staj İlanları</h1>derleme kopyası</body></html>';
  const dosyalar = { '/staj-ilanlari/istanbul': yedek };
  const taze = new Date(Date.now() - 2 * 3600e3).toISOString();
  const bayat = new Date(Date.now() - 30 * 3600e3).toISOString();

  ONBELLEK.clear();
  const a = await istek(araKatman, `${SITE}/staj-ilanlari/istanbul`, { veri: new Error('kesinti'), damga: taze, dosyalar, env: ENV });
  assert.equal(a.cevap.status, 200);
  assert.equal(a.govde, yedek);
  assert.equal(a.cevap.headers.get('x-ilan-kaynagi'), 'statik-yedek');
  assert.equal(a.cevap.headers.get('cache-control'), 'no-store');
  assert.equal(ONBELLEK.size, 0, 'yedek kenarda tutuldu');

  for (const [ad, ayar] of [
    ['bayat damga', { damga: bayat, dosyalar }],
    ['damga yok', { damga: null, dosyalar }],
    ['dosya yok', { damga: taze, dosyalar: {} }],
  ]) {
    ONBELLEK.clear();
    const b = await istek(araKatman, `${SITE}/staj-ilanlari/istanbul`, { veri: new Error('kesinti'), env: ENV, ...ayar });
    assert.equal(b.cevap.status, 503, ad);
    assert.equal(b.cevap.headers.get('x-robots-tag'), 'noindex', ad);
    assert.equal(b.cevap.headers.get('cache-control'), 'no-store', ad);
    assert.ok(Number(b.cevap.headers.get('retry-after')) > 0, ad);
    assert.equal(ONBELLEK.size, 0, ad);
  }
});

/* --------------------------------------------------- kaynak bağlantıları */

test('ilk HTML, kenar ve uygulama aynı seçim kuralı; /staj-ilanlari bağlantısı; önbellek kapsamı dar', () => {
  const r = oku('scripts/onrender.mjs');
  assert.match(r, /const ilk = sehirSayfasi\(\{ slug, sayfa: 1, ilanlar, etiketler: kartEtiketleri \}\);/);
  assert.match(r, /fs\.writeFileSync\(path\.join\(dist, '_onrender', 'sehir-derleme\.json'\)/);
  const kenar = oku('src/lib/seo/kenar-sehir.mjs');
  assert.match(kenar, /const sayfa = sehirSayfasi\(\{ slug: cozum\.slug, sayfa: cozum\.sayfa, ilanlar, etiketler/);
  const bilesen = oku('src/components/SehirIlanlari.tsx');
  assert.match(bilesen, /\.select\(SEHIR_ILAN_SECIMI\)\s*\.eq\('status', 'published'\)/);
  assert.match(bilesen, /setIlanlar\(sehirIlanlari\(\(data \?\? \[\]\) as unknown\[\], tanim\?\.il\) as SadeIlan\[\]\);/);
  assert.match(bilesen, /ARSIV_SAYFA_BOYU/);
  assert.match(oku('src/App.tsx'), /temizYol\.match\(\/\^\\\/staj-ilanlari\\\/\(istanbul\)\(\?:\\\/sayfa\\\/\(\[1-9\]\\d\{0,3\}\)\)\?\$\/\)/);
  assert.match(oku('src/components/StajIlanlariIcerik.tsx'), /<Bag href="\/staj-ilanlari\/istanbul" onNavigate=\{onNavigate\} className=\{BAG\}>\s*İstanbul staj ilanları/);
  const onbellek = oku('src/lib/onbellek-politikasi.mjs');
  assert.match(onbellek, /export const BELGE_BOLUMLERI = \['\/ilan', '\/bolum', '\/rehber', '\/staj-ilanlari\/istanbul'\];/);
  const ara = oku('functions/_middleware.ts');
  assert.match(ara, /if \(okuma && sehirAdresiniCoz\(istekYolu\)\) \{/);
  assert.match(ara, /if \(yedekTazeMi\(damga\)\) \{/);
});

/* ------------------------------------------------------------------ dist */

const DIST = path.join(KOK, 'dist');
const distVar = fs.existsSync(path.join(DIST, 'staj-ilanlari', 'istanbul.html'));
const distOku = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const govdesi = (h) => h.slice(h.indexOf('<div id="root">'), h.lastIndexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');

test('dist: sayfalar, canonical, harita, tek H1, BreadcrumbList, gerçek ve İstanbul ilanları', { skip: !distVar }, () => {
  const harita = distOku('sitemap-sayfalar.xml');
  const sayfalar = ['staj-ilanlari/istanbul.html'];
  const dizin = path.join(DIST, 'staj-ilanlari', 'istanbul', 'sayfa');
  if (fs.existsSync(dizin)) for (const f of fs.readdirSync(dizin)) sayfalar.push(`staj-ilanlari/istanbul/sayfa/${f}`);
  assert.ok(!sayfalar.includes('staj-ilanlari/istanbul/sayfa/1.html'), '/sayfa/1 dosyası yazılmamalı');
  const gorulen = new Set();
  let toplamKart = 0;
  for (const dosya of sayfalar) {
    const yol = '/' + dosya.replace(/\.html$/, '');
    const h = distOku(dosya);
    const kok = govdesi(h);
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(h);
    assert.equal((kok.match(/<h1\b/g) || []).length, 1, `${yol}: H1`);
    assert.equal((h.match(/rel="canonical"/g) || []).length, 1);
    assert.match(h, new RegExp(`<link rel="canonical" href="https://stajimvar\\.com${yol.replace(/\//g, '\\/')}" />`));
    assert.match(h, /"@type":"BreadcrumbList"/);
    assert.doesNotMatch(h, /"@type":"(JobPosting|ItemList)"/);
    assert.equal(harita.includes(`<loc>https://stajimvar.com${yol}</loc>`), !noindex, `${yol}: harita ile noindex tutarsız`);
    const kartlar = [...kok.matchAll(/<li class="sv-kart">[\s\S]*?<\/li>/g)].map((m) => m[0]);
    assert.ok(kartlar.length <= 30, `${yol}: ${kartlar.length} kart`);
    toplamKart += kartlar.length;
    for (const kart of kartlar) {
      const hedef = kart.match(/class="sv-kart-baslik" href="([^"]+)"/)[1];
      assert.ok(!gorulen.has(hedef), `${hedef} iki kez`);
      gorulen.add(hedef);
      const ilanDosyasi = path.join(DIST, `${hedef.slice(1)}.html`);
      assert.ok(fs.existsSync(ilanDosyasi), `${hedef}: ilan sayfası yok`);
      assert.doesNotMatch(fs.readFileSync(ilanDosyasi, 'utf8'), /Başvuru dönemi kapandı/, `${hedef}: kapanmış`);
      const konum = (kart.match(/class="sv-kart-konum">(?:<svg[\s\S]*?<\/svg>)?([^<]*)/) || [])[1] || '';
      assert.match(konum, /İstanbul/, `${hedef}: İstanbul dışı konum (${konum})`);
    }
    for (const [, s] of kok.matchAll(/href="\/sirket\/([^"]+)"/g)) {
      assert.doesNotMatch(distOku(`sirket/${s}.html`), /noindex/, `${yol}: dizin dışı şirket bağlantısı`);
    }
  }
  assert.ok(toplamKart >= SEHIR_ESIGI, `yalnız ${toplamKart} İstanbul ilanı`);
  assert.match(distOku('staj-ilanlari.html'), /href="\/staj-ilanlari\/istanbul"/, '/staj-ilanlari İstanbul sayfasına bağlanmıyor');
  assert.ok(Date.parse(JSON.parse(distOku('_onrender/sehir-derleme.json')).zaman) > 0);
});

test('dist: İstanbul sayfası /staj-ilanlari ve arşivin kopyası değil (metin benzerliği eşiği)', { skip: !distVar }, () => {
  /* 14 Ekim 2026 ölçümü: ortak pay %21.7 (/staj-ilanlari), %12.3 (arşiv sayfa 1). */
  const kelimeler = (h) =>
    govdesi(h).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').toLocaleLowerCase('tr').split(/[^a-zçğıöşü0-9]+/).filter(Boolean);
  const parcalar = (w) => {
    const s = new Set();
    for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(' '));
    return s;
  };
  const ist = parcalar(kelimeler(distOku('staj-ilanlari/istanbul.html')));
  for (const f of ['staj-ilanlari.html', 'staj-ilanlari/sayfa/1.html', 'index.html']) {
    const o = parcalar(kelimeler(distOku(f)));
    const ortak = [...ist].filter((x) => o.has(x)).length;
    assert.ok(ortak / ist.size < 0.5, `${f}: İstanbul metninin %${Math.round((100 * ortak) / ist.size)}'i ortak`);
  }
});
