import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  HER ROTANIN BİR KARŞILIĞI OLSUN

  Bilinmeyen adresler artık gerçek 404 döndürüyor. Kazancı büyük ama bir
  riski var: App.tsx'e ön render EDİLMEYEN yeni bir rota eklenip
  functions/_middleware.ts'e yazılmazsa, çalışan bir sayfa 404 alır ve bu
  ancak biri şikâyet edince fark edilir.

  Burada iki liste karşılaştırılıyor: App.tsx'in tanıdığı adresler ile
  (ön render dosyaları + ara katmanın uygulama listesi). Açık varsa test
  kırılıyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const DIST = path.join(KOK, 'dist');

const app = fs.readFileSync(path.join(KOK, 'src', 'App.tsx'), 'utf8');
const araKatman = fs.readFileSync(path.join(KOK, 'functions', '_middleware.ts'), 'utf8');
/* Yasal ve kurumsal adresler ayrı bir tabloda duruyor. */
const yasal = fs.readFileSync(path.join(KOK, 'src', 'components', 'LegalPage.tsx'), 'utf8');

/* App.tsx'te tam eşleşmeyle karşılanan adresler. */
function appRotalari() {
  const bulunan = new Set();
  for (const e of app.matchAll(/temizYol === '(\/[^']*)'/g)) bulunan.add(e[1]);
  for (const e of app.matchAll(/^\s*const \w+ = new Set\(\[([^\]]*)\]\)/gm)) {
    for (const t of e[1].matchAll(/'(\/[^']*)'/g)) bulunan.add(t[1]);
  }
  for (const e of yasal.matchAll(/^\s*'(\/[a-z0-9-]+)': '/gm)) bulunan.add(e[1]);
  bulunan.delete('/');
  return [...bulunan];
}

/* Ara katmanın uygulamaya ait saydığı adresler ve önekler. */
function araKatmanKapsami(yol) {
  const adresler = [...araKatman.matchAll(/^\s*'(\/[^']*)',$/gm)].map((e) => e[1]);
  if (adresler.includes(yol)) return true;
  if (yol === '/yonetim' || yol.startsWith('/yonetim/')) return true;
  const onekler = [...araKatman.matchAll(/'(\/[a-z-]+\/)'/g)].map((e) => e[1]);
  return onekler.some((o) => yol.startsWith(o) && yol.length > o.length);
}

function onRenderVar(yol) {
  return fs.existsSync(path.join(DIST, yol.replace(/^\//, '') + '.html'));
}

test('App.tsx rotalarının hepsi ya ön render ya ara katman kapsamında', () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.log('dist yok — adres kapsamı testi atlandı');
    return;
  }

  const acikta = appRotalari().filter((y) => !onRenderVar(y) && !araKatmanKapsami(y));
  assert.deepEqual(
    acikta,
    [],
    'Bu adresler 404 döner. Ya ön render et ya functions/_middleware.ts listesine ekle:\n  ' +
      acikta.join('\n  ')
  );
});

test('404 sayfası üretiliyor ve dizine girmeyi reddediyor', () => {
  const dosya = path.join(DIST, '404.html');
  if (!fs.existsSync(path.join(DIST, 'index.html'))) return;
  assert.ok(fs.existsSync(dosya), 'dist/404.html yok — Pages gerçek 404 döndüremez');
  const h = fs.readFileSync(dosya, 'utf8');
  assert.match(h, /<meta name="robots" content="noindex/, '404 sayfasında noindex yok');
  assert.match(h, /Sayfa bulunamadı/, '404 sayfasının gövdesi boş');
});

test('_redirects her şeyi yakalayan bir SPA kuralı içermiyor', () => {
  const dosya = path.join(DIST, '_redirects');
  if (!fs.existsSync(dosya)) return;
  const satirlar = fs
    .readFileSync(dosya, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'));
  const yakalayan = satirlar.filter((s) => /^\/\*\s/.test(s));
  assert.deepEqual(
    yakalayan,
    [],
    'Her şeyi yakalayan kural geri geldi; yumuşak 404 yeniden başlar:\n  ' + yakalayan.join('\n  ')
  );
});
