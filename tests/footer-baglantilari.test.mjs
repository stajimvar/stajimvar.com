import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { SEHIR_SAYFALARI, sehirYolu } from '../src/lib/seo/sehir-sayfalari.mjs';

/*
  ALT BİLGİ BAĞLANTILARI (20 Ekim 2026)

  Footer.tsx ilk hâliyle beş şehir sayfasına (Ankara, İzmir, Kocaeli,
  Manisa, Tekirdağ) ve /kvkk adresine bağlanıyordu; hiçbiri yoktu, hepsi
  404 veriyordu. Alt bilgi her sayfada olduğu için kırık bir bağlantı
  yüzlerce sayfaya birden yayılıyor.
*/
const KOK = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const FOOTER = oku('src/components/Footer.tsx');
const APP = oku('src/App.tsx');
const adresler = [...FOOTER.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);

test('şehir bağlantıları yalnız açık şehir sayfalarına gidiyor', () => {
  const sehirler = adresler.filter((a) => /^\/staj-ilanlari\/[^/]+$/.test(a));
  assert.ok(sehirler.length > 0);
  for (const a of sehirler) {
    const slug = a.slice('/staj-ilanlari/'.length);
    assert.ok(Object.hasOwn(SEHIR_SAYFALARI, slug), `${a} şehir sayfası değil`);
    assert.equal(a, sehirYolu(slug));
  }
});

test('yasal metin bağlantıları LEGAL_ROUTES içindeki adresler', () => {
  const yasal = oku('src/lib/yasal-rotalar.ts');
  for (const a of ['/gizlilik', '/kvkk-aydinlatma-metni', '/cerez-politikasi', '/kullanim-kosullari']) {
    assert.ok(adresler.includes(a), `${a} alt bilgide yok`);
    assert.ok(yasal.includes(`'${a}'`), `${a} yasal rota değil`);
  }
  assert.ok(!adresler.includes('/kvkk'));
});

test('eski alt bilginin bağlantıları korunuyor', () => {
  for (const a of ['/rehber', '/bolumler', '/staj-programlari', '/universite-kariyer-merkezleri', '/araclar',
    '/isveren', '/isveren/ilan-ver', '/ilan-kurallari', '/ilan-bildir', '/hakkimizda', '/iletisim']) {
    assert.ok(adresler.includes(a), `${a} alt bilgiden düştü`);
  }
  assert.match(FOOTER, /Çerez tercihleri/);
  assert.match(APP, /onCookiePreferences=\{\(\) => setTercihlerAcik\(true\)\}/);
});

test('alt bilgi iki kabukta da; telefonda alt menü payı var', () => {
  assert.equal((APP.match(/<Footer /g) || []).length, 1);
  assert.equal((APP.match(/\{altBilgi\}/g) || []).length, 2);
  assert.match(APP, /pb-\[calc\(88px\+env\(safe-area-inset-bottom\)\)\] lg:pb-0">\s*<Footer /);
  assert.ok(!/<footer className="border-t/.test(APP), 'eski alt bilgi duruyor');
});

test('iç bağlantılar uygulama içinde açılıyor, değiştirici tuşlar tarayıcıda kalıyor', () => {
  assert.match(FOOTER, /e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey/);
  assert.equal((FOOTER.match(/onClick=\{\(e\) => go\(e, /g) || []).length, 3);
});
