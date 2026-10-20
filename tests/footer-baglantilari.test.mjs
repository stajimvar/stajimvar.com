import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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

/*
  STAJ TÜRLERİ SÜTUNU VE SOSYAL HESAPLAR (20 Ekim 2026)

  "Şehre Göre Staj" iki satıra inince boş görünüyordu; sütun "Staj Türleri"
  oldu. Rehber ve bölüm adresleri içerik kayıtlarındaki slug'larla, ilan
  arşivi adresi App.tsx'teki eşleşmeyle denetleniyor.
*/
const slugKumesi = (dosyalar) => new Set(dosyalar.flatMap((d) =>
  [...oku(d).matchAll(/slug: '([a-z0-9-]+)'/g)].map((m) => m[1])));

test('rehber bağlantıları gerçek rehber yazılarına gidiyor', () => {
  const klasor = path.join(KOK, 'src/data/rehber-yazilari');
  const dosyalar = ['src/data/rehberler.tsx', ...readdirSync(klasor).map((d) => `src/data/rehber-yazilari/${d}`)];
  const slugs = slugKumesi(dosyalar);
  const rehber = adresler.filter((a) => a.startsWith('/rehber/'));
  assert.ok(rehber.length >= 15);
  for (const a of rehber) assert.ok(slugs.has(a.slice('/rehber/'.length)), `${a} rehber yazısı değil`);
});

test('bölüm bağlantıları gerçek bölüm sayfalarına gidiyor', () => {
  const slugs = slugKumesi(['src/data/bolumler.ts']);
  for (const a of adresler.filter((x) => x.startsWith('/bolum/'))) {
    assert.ok(slugs.has(a.slice('/bolum/'.length)), `${a} bölüm sayfası değil`);
  }
});

test('Staj Türleri sütunu istenen sırada; yurt dışı stajı tek yerde', () => {
  const sutun = FOOTER.slice(FOOTER.indexOf('title: "Staj Türleri"'), FOOTER.indexOf('title: "Bölüme Göre Staj"'));
  assert.deepEqual([...sutun.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]), [
    '/staj-ilanlari/istanbul', '/rehber/zorunlu-staj-rehberi', '/rehber/gonullu-staj-rehberi',
    '/rehber/uzaktan-staj-kabul-edilir-mi', '/rehber/yurtdisinda-staj', '/rehber/erasmus-staj-hareketliligi',
    '/rehber/iaeste-ile-yurtdisinda-staj', '/staj-ilanlari/sayfa/1', '/staj-ilanlari',
  ]);
  assert.match(sutun, /\{ label: "Tüm staj ilanları", href: "\/staj-ilanlari", highlight: true \}/);
  assert.equal(adresler.filter((a) => a === '/rehber/yurtdisinda-staj').length, 1);
  assert.ok(adresler.includes('/rehber/staj-ucreti-nasil-hesaplanir'));
  assert.ok(APP.includes(String.raw`/^\/staj-ilanlari\/sayfa\/([1-9]\d{0,3})$/`), 'ilan arşivi rotası yok');
});

test('sosyal hesaplar dolu, Telegram boş; başlık ikonlarla görünüyor', () => {
  const hesap = (ad) => FOOTER.match(new RegExp(`name: "${ad}", href: "([^"]*)"`))?.[1];
  assert.equal(hesap('Instagram'), 'https://www.instagram.com/stajimvar/');
  assert.equal(hesap('LinkedIn'), 'https://www.linkedin.com/company/stajimvar/');
  assert.equal(hesap('X'), 'https://x.com/StajimVar');
  assert.equal(hesap('TikTok'), 'https://www.tiktok.com/@stajimvar');
  assert.equal(hesap('YouTube'), 'https://www.youtube.com/@stajimvar');
  assert.equal(hesap('Telegram'), '');
  assert.match(FOOTER, /target="_blank" rel="noopener noreferrer"/);
});

test('zorunlu staj rehberi tek yerde (Staj Türleri); Öğrenci Rehberi\'nde ATS CV rehberi', () => {
  assert.equal(adresler.filter((a) => a === '/rehber/zorunlu-staj-rehberi').length, 1);
  const sutun = FOOTER.slice(FOOTER.indexOf('title: "Öğrenci Rehberi"'), FOOTER.indexOf('title: "Fırsatlar ve Araçlar"'));
  assert.match(sutun, /\{ label: "ATS uyumlu CV nasıl hazırlanır\?", href: "\/rehber\/ats-uyumlu-cv" \}/);
});
