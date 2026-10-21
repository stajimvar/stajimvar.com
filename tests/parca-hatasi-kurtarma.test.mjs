import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { parcaYuklemeHatasiMi } from '../src/lib/parca-hatasi-tanima.mjs';
import { kurtarmaIstegiMi, onbellekAnahtariAdresi, KURTARMA_PARAMETRESI } from '../src/lib/onbellek-politikasi.mjs';

/*
  PARÇA HATASI KURTARMASI (17 Ekim 2026)

  16 Ekim'de canlıda yeniden üretildi: gecikmeli rehber parçası 404
  dönünce `/rehber/burs-cakisma` tamamen boşalıyordu (#root 0 karakter) ve
  `?sv=` kurtarması kenar önbelleğinden AYNI bayat HTML'i alıyordu.
    D1  parça hatası sınırı: ön render kopyası kalıyor (lib/parca-hatasi.tsx)
    D2  vite:preloadError → aynı tek seferlik kurtarma (index.html)
    D3  ?sv= isteği önbellekten okunmuyor (functions/_middleware.ts)
  Tarayıcı davranışı e2e/parca-hatasi.spec.ts'te.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

/* ------------------------------------------------------------ D1: tanıma */

test('parça hatası tanıma: tarayıcıların mesajları evet, gerçek uygulama hataları hayır', () => {
  for (const h of [
    new TypeError('Failed to fetch dynamically imported module: https://stajimvar.com/assets/GuidePages-BXpk7mqa.js'),
    new TypeError('error loading dynamically imported module: https://stajimvar.com/assets/x.js'),
    new TypeError('Importing a module script failed.'),
    new Error('Unable to preload CSS for /assets/GuidePages-abc.css'),
    Object.assign(new Error('x'), { name: 'ChunkLoadError' }),
  ]) assert.equal(parcaYuklemeHatasiMi(h), true, h.message);
  for (const h of [
    new TypeError("Cannot read properties of undefined (reading 'map')"),
    new Error('Rendered more hooks than during the previous render.'),
    new Error('Failed to fetch'),
    null,
    undefined,
    '',
  ]) assert.equal(parcaYuklemeHatasiMi(h), false, String(h?.message ?? h));
});

test('D1 sınırı: yalnız parça hatasını yakalıyor, gerisini yeniden fırlatıyor; Suspense\'i sarıyor', () => {
  const s = oku('src/lib/parca-hatasi.tsx');
  assert.match(s, /if \(!parcaYuklemeHatasiMi\(hata\)\) throw hata;/);
  assert.match(s, /if \(onRenderKopyasiKullanilabilir\(\)\) return <OnRenderYedegi kalici \/>;/);
  assert.match(s, /window\.svVarlikKurtar\?\.\(\)/);
  assert.match(s, /console\.error\('\[parca-hatasi\]/);
  /* Kopya yoksa boş değil: gerçek bir yenileme bağlantısı. */
  assert.match(s, /<a href=\{[^}]*location\.pathname/);
  const m = oku('src/main.tsx');
  assert.match(m, /<ParcaHatasiSiniri>\s*<Suspense fallback=\{<OnRenderYedegi \/>\}>[\s\S]*?<\/Suspense>\s*<\/ParcaHatasiSiniri>/);
  /* Bekleme yedeği eskisi gibi aria-busy taşıyor; kalıcı kopya taşımıyor. */
  assert.match(oku('src/lib/onrender-yedek.tsx'), /aria-busy=\{kalici \? undefined : 'true'\}/);
});

/* -------------------------------------------- D2: tek bayrak, tek yenileme */

test('D2: vite:preloadError ve sınır index.html\'deki AYNI tek seferlik kurtarmayı çağırıyor', () => {
  const h = oku('index.html');
  const betik = h.slice(h.indexOf('BAYAT HTML KURTARMASI'), h.indexOf('</script>', h.indexOf('BAYAT HTML KURTARMASI')));
  assert.equal((betik.match(/sessionStorage\.setItem\(ANAHTAR, '1'\)/g) || []).length, 1, 'tek bayrak');
  assert.equal((betik.match(/location\.replace\(/g) || []).length, 1, 'tek yenileme noktası');
  assert.match(betik, /window\.addEventListener\('vite:preloadError', function \(\) \{\s*kurtar\(\);\s*\}\);/);
  assert.match(betik, /window\.svVarlikKurtar = kurtar;/);
  /* Hata uygulamaya ulaşmaya devam etmeli (sınır kopyayı göstersin). */
  assert.doesNotMatch(betik, /\.preventDefault\(/);
});

test('D2: kurtarma işlevi davranışı — aynı oturumda en fazla bir yenileme, depolama kapalıysa hiç', () => {
  const h = oku('index.html');
  const bas = h.indexOf('(function () {', h.indexOf('BAYAT HTML KURTARMASI'));
  const kod = h.slice(bas, h.indexOf('})();', bas) + 5);
  const calistir = ({ depolamaKapali = false } = {}) => {
    const depo = new Map();
    const yenilemeler = [];
    const dinleyiciler = {};
    const pencere = { addEventListener: (ad, f) => { dinleyiciler[ad] = f; } };
    const sessionStorage = {
      getItem: (k) => { if (depolamaKapali) throw new Error('kapalı'); return depo.get(k) ?? null; },
      setItem: (k, v) => { if (depolamaKapali) throw new Error('kapalı'); depo.set(k, v); },
    };
    const location = { pathname: '/rehber/burs-cakisma', search: '', hash: '', replace: (a) => yenilemeler.push(a) };
    new Function('window', 'sessionStorage', 'location', kod)(pencere, sessionStorage, location);
    return { pencere, dinleyiciler, yenilemeler };
  };
  const { pencere, dinleyiciler, yenilemeler } = calistir();
  /* Üç yol aynı hatada: öğe error olayı, vite:preloadError, sınır. */
  dinleyiciler.error({ target: { tagName: 'LINK', href: 'https://stajimvar.com/assets/GuidePages-x.js' } });
  dinleyiciler['vite:preloadError']({});
  pencere.svVarlikKurtar();
  assert.equal(yenilemeler.length, 1);
  assert.match(yenilemeler[0], /^\/rehber\/burs-cakisma\?sv=\d+$/);
  /* /assets dışındaki öğe hatası yenileme başlatmıyor. */
  const ikinci = calistir();
  ikinci.dinleyiciler.error({ target: { tagName: 'IMG', src: 'https://stajimvar.com/logo.png' } });
  assert.equal(ikinci.yenilemeler.length, 0);
  /* Depolama kapalı (gizli sekme): döngü riskine girilmiyor. */
  const ucuncu = calistir({ depolamaKapali: true });
  ucuncu.dinleyiciler['vite:preloadError']({});
  assert.equal(ucuncu.yenilemeler.length, 0);
});

/* ------------------------------------------------- D3: ?sv= önbellekten okunmuyor */

test('D3 politika: anahtar değişmedi; yalnız sv kurtarma isteği', () => {
  assert.equal(KURTARMA_PARAMETRESI, 'sv');
  assert.equal(kurtarmaIstegiMi('https://stajimvar.com/rehber/x?sv=123'), true);
  assert.equal(kurtarmaIstegiMi('https://stajimvar.com/rehber/x?a=1&sv=1'), true);
  for (const u of ['https://stajimvar.com/rehber/x', 'https://stajimvar.com/rehber/x?utm_source=x', 'https://stajimvar.com/rehber/x?svx=1']) {
    assert.equal(kurtarmaIstegiMi(u), false, u);
  }
  assert.equal(onbellekAnahtariAdresi('https://stajimvar.com/rehber/x?sv=1'), 'https://stajimvar.com/rehber/x');
  assert.equal(onbellekAnahtariAdresi('https://stajimvar.com/rehber/x?utm_source=a'), 'https://stajimvar.com/rehber/x');
});

/* Ara katmanı Node'da çalıştırmak: uzantısız göreli içe aktarımlar .ts'ye. */
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
    match: async (istek) => ONBELLEK.get(istek.url)?.clone(),
    put: async (istek, cevap) => { ONBELLEK.set(istek.url, cevap.clone()); },
    delete: async (istek) => ONBELLEK.delete(istek.url),
  },
};

let surum = 'eski';
async function istek(araKatman, adres) {
  const bekleyenler = [];
  const cevap = await araKatman.onRequest({
    request: new Request(adres),
    env: { ASSETS: { fetch: async () => new Response('yok', { status: 404 }) } },
    next: async () =>
      new Response(`<!doctype html><html><body><div id="root">${surum}</div><script src="/assets/index-${surum}.js"></script></body></html>`, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    waitUntil: (is) => bekleyenler.push(is),
  });
  await Promise.all(bekleyenler);
  return { durum: cevap.status, onbellek: cevap.headers.get('x-onbellek'), govde: await cevap.text() };
}

test('D3 ara katman: ?sv= bayat kopyayı okumuyor, taze cevabı yazıyor; normal HIT/MISS değişmedi', async () => {
  const araKatman = await import('../functions/_middleware.ts');
  ONBELLEK.clear();
  const ADRES = 'https://stajimvar.com/rehber/burs-cakisma';

  surum = 'eski';
  const ilk = await istek(araKatman, ADRES);
  assert.equal(ilk.onbellek, 'MISS');
  assert.match(ilk.govde, /index-eski\.js/);
  const ikinci = await istek(araKatman, ADRES);
  assert.equal(ikinci.onbellek, 'HIT', 'normal istek önbellekten gelmeli');
  /* Sorgu dizesi hâlâ anahtar dışı: pazarlama parametresi aynı kopyayı alıyor. */
  assert.equal((await istek(araKatman, `${ADRES}?utm_source=x`)).onbellek, 'HIT');

  /* Dağıtım: varlık adları değişti. Önbellekte eski HTML duruyor. */
  surum = 'yeni';
  const normal = await istek(araKatman, ADRES);
  assert.equal(normal.onbellek, 'HIT');
  assert.match(normal.govde, /index-eski\.js/, 'test kurgusu: bayat kopya hâlâ önbellekte');

  /* Kurtarma isteği: önbellekten OKUMUYOR, taze HTML alıyor. */
  const kurtarma = await istek(araKatman, `${ADRES}?sv=${Date.now()}`);
  assert.equal(kurtarma.durum, 200);
  assert.equal(kurtarma.onbellek, 'MISS-KURTARMA');
  assert.match(kurtarma.govde, /index-yeni\.js/);

  /* Taze cevap aynı anahtara yazıldı: sonraki normal istek de taze. */
  const sonra = await istek(araKatman, ADRES);
  assert.equal(sonra.onbellek, 'HIT');
  assert.match(sonra.govde, /index-yeni\.js/);
  assert.equal(ONBELLEK.size, 1, 'kurtarma ayrı bir önbellek kaydı açmadı (anahtar aynı)');
});

test('D3 ara katman: önbelleğe uygun olmayan adresler etkilenmiyor', async () => {
  const araKatman = await import('../functions/_middleware.ts');
  ONBELLEK.clear();
  surum = 'x';
  for (const yol of ['/staj-ilanlari?sv=1', '/firsatlar/btso-yuksekogrenim-bursu?sv=1', '/cv?sv=1']) {
    const r = await istek(araKatman, `https://stajimvar.com${yol}`);
    assert.notEqual(r.onbellek, 'MISS-KURTARMA', yol);
  }
  assert.equal(ONBELLEK.size, 0);
});
