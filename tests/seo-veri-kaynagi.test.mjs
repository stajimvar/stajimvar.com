import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { zorunluVeriGetir, VeriKaynagiHatasi, azalmaKapisi } from '../src/lib/seo/veri-kaynagi.mjs';
import { ilanYolu, slugla, ilanAdresiniCoz } from '../src/lib/seo/metin.mjs';

/*
  HATA VEREN VERİ OKUMASI EKSİK SİTE YAYINLAMIYOR (12 Ekim 2026)

  Ön render'ın zorunlu okumaları (ilanlar, fırsatlar, şirketler) artık
  `zorunluVeriGetir`den geçiyor. Meşru boş sonuç geçerli; erişim, ağ, API
  ve biçim hataları "ilan yok" sayılmıyor, derlemeyi durduruyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const ANAHTAR = 'gizli-olmayan-ama-yazdirilmamasi-gereken-anahtar';
const temel = (getir, ek = {}) => ({
  kaynak: 'yayındaki ilanlar',
  taban: 'https://proje.supabase.co',
  anahtar: ANAHTAR,
  yol: '/rest/v1/listings?status=eq.published',
  getir,
  ...ek,
});
const cevap = (govde, durum = 200) => async () => new Response(govde, { status: durum });

test('meşru boş sonuç geçerli: 200 + [] boş dizi döner', async () => {
  assert.deepEqual(await zorunluVeriGetir(temel(cevap('[]'))), []);
});

test('hata türleri ayrışıyor ve mesaj anahtar/adres içermiyor', async () => {
  const durumlar = [
    ['eksik yapılandırma', temel(cevap('[]'), { anahtar: undefined }), 'yapilandirma'],
    ['401', temel(cevap('{"message":"Invalid API key"}', 401)), 'yetki'],
    ['403', temel(cevap('{}', 403)), 'yetki'],
    ['500', temel(cevap('{}', 500)), 'sunucu'],
    ['400', temel(cevap('{}', 400)), 'istemci'],
    ['bozuk JSON', temel(cevap('<html>Bad gateway</html>')), 'bozuk-yanit'],
    ['dizi değil', temel(cevap('{"listings":[]}')), 'bozuk-yanit'],
    ['ağ', temel(async () => { throw new TypeError('fetch failed'); }), 'ag'],
  ];
  for (const [ad, girdi, tur] of durumlar) {
    await assert.rejects(zorunluVeriGetir(girdi), (e) => {
      assert.ok(e instanceof VeriKaynagiHatasi, ad);
      assert.equal(e.tur, tur, ad);
      assert.ok(!e.message.includes(ANAHTAR), `${ad}: mesaj anahtarı içermemeli`);
      assert.ok(!e.message.includes('proje.supabase.co'), `${ad}: mesaj adresi içermemeli`);
      assert.match(e.message, /yayındaki ilanlar okunamadı/, `${ad}: kaynağın adı görünmeli`);
      return true;
    });
  }
});

test('geçici hata bir kez yeniden deneniyor; kalıcı hata denenmiyor', async () => {
  let n = 0;
  const veri = await zorunluVeriGetir(temel(async () => (++n === 1 ? new Response('{}', { status: 503 }) : new Response('[1]'))));
  assert.deepEqual(veri, [1]);
  assert.equal(n, 2);
  let m = 0;
  await assert.rejects(zorunluVeriGetir(temel(async () => { m++; return new Response('{}', { status: 401 }); })));
  assert.equal(m, 1);
});

test('zaman aşımı sınıflandırılıyor', async () => {
  const askida = (_a, s) => new Promise((_, r) => s.signal.addEventListener('abort', () => r(Object.assign(new Error('x'), { name: 'AbortError' }))));
  await assert.rejects(zorunluVeriGetir(temel(askida, { zamanAsimiMs: 30, deneme: 1 })), (e) => e.tur === 'zaman-asimi');
});

test('azalma kapısı: gerçek kapanışa izin veriyor, beklenmeyen büyük düşüşü durduruyor', () => {
  assert.equal(azalmaKapisi({ onceki: 178, simdi: 170 }).gecti, true, 'olağan kapanış');
  assert.equal(azalmaKapisi({ onceki: 178, simdi: 150 }).gecti, true, '%16 düşüş eşik altında');
  assert.equal(azalmaKapisi({ onceki: 178, simdi: 40 }).gecti, false, '%78 düşüş');
  assert.equal(azalmaKapisi({ onceki: 178, simdi: 0 }).gecti, false, 'sıfıra düşüş');
  assert.equal(azalmaKapisi({ onceki: 178, simdi: 40, onay: true }).gecti, true, 'bilerek onaylanmış toplu kapanış');
  assert.equal(azalmaKapisi({ onceki: 30, simdi: 10 }).gecti, true, 'küçük sayılarda adet eşiği koruyor');
  assert.equal(azalmaKapisi({ onceki: NaN, simdi: 10 }).gecti, true, 'önceki yayın bilinmiyor');
});

test('ön render, zorunlu veri okunamazsa DURUYOR (sıfır ilanlı site üretmiyor)', () => {
  /*
    Gerçek betik, dist kabuğu olan geçici bir kökte, Supabase adresi
    olarak kapalı bir yerel bağlantı noktasıyla koşuluyor: ağ hatası
    "ilan yok" sayılmamalı, süreç 0 dışı kodla bitmeli.
  */
  /* Kaynak index.html açılış iskeletini taşıyor; derleme gerekmiyor. */
  const kaynak = path.join(KOK, 'index.html');
  const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'onrender-'));
  /* Vite modül betiğini <head>'e taşıyor; derlenmiş kabuğun biçimi bu. */
  const kabuk = fs
    .readFileSync(kaynak, 'utf8')
    .replace(/\s*<script type="module" src="\/src\/main\.tsx"><\/script>/, '')
    .replace('</head>', '<script type="module" src="/assets/x.js"></script></head>');
  fs.writeFileSync(path.join(gecici, 'index.html'), kabuk);
  const sonuc = spawnSync(process.execPath, [path.join(KOK, 'scripts', 'onrender.mjs')], {
    cwd: KOK,
    env: {
      ...process.env,
      ONRENDER_DIST: gecici,
      SUPABASE_URL: 'http://127.0.0.1:9',
      VITE_SUPABASE_URL: 'http://127.0.0.1:9',
      VITE_SUPABASE_ANON_KEY: 'test',
    },
    encoding: 'utf8',
    timeout: 180000,
  });
  fs.rmSync(gecici, { recursive: true, force: true });
  assert.notEqual(sonuc.status, 0, 'veri okunamadığı hâlde ön render başarıyla bitti');
  assert.match(sonuc.stderr, /eksik yayın engellendi/);
  assert.doesNotMatch(sonuc.stderr, /test@|apikey/);
});

test('ilan adresi: istemci ve sunucu aynı kural, kısaltma yok, eski biçimler çözülüyor', async () => {
  const uzun = { id: '0a684a87-1111-4222-8333-944444444444', title: 'Internship at Berlin-based Fashion Agency and Showroom (Paris, Berlin, Munich)' };
  assert.equal(ilanYolu(uzun), '/ilan/internship-at-berlin-based-fashion-agency-and-showroom-paris-berlin-munich-0a684a87');
  assert.equal(slugla('İş Güvenliği & Çevre — Ölçüm Stajı'), 'is-guvenligi-cevre-olcum-staji');
  assert.equal(slugla('Praktikum Qualitäts- und Änderungsmanagement'), 'praktikum-qualitats-und-anderungsmanagement');
  assert.deepEqual(ilanAdresiniCoz('bir-baslik-0a684a87'), { onek: '0a684a87', tamKimlik: null });
  assert.deepEqual(ilanAdresiniCoz('0A684A87'), { onek: '0a684a87', tamKimlik: null });
  assert.equal(ilanAdresiniCoz('baslik-yok'), null);
  /* İstemcinin bağlantısı (src/lib/slug.ts) aynı modülü kullanıyor. */
  const slugTs = fs.readFileSync(path.join(KOK, 'src', 'lib', 'slug.ts'), 'utf8');
  assert.match(slugTs, /return ilanYolu\(listing\)\.slice\('\/ilan\/'\.length\);/);
});

test('SEO kapısı bozuk çıktıyı durduruyor (noindex, iki H1, kırık bağlantı, eksik dosya)', () => {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-kapisi-'));
  const sayfa = (govde, ek = '') =>
    `<html><head><title>Bir sayfa başlığı</title><link rel="canonical" href="https://stajimvar.com/a" />${ek}</head><body><div id="root">${govde}</div></body></html>`;
  fs.writeFileSync(path.join(kok, 'a.html'), sayfa('<h1>Bir</h1><h1>İki</h1><a href="/olmayan">x</a>', '<meta name="robots" content="noindex, follow" />'));
  fs.writeFileSync(path.join(kok, 'robots.txt'), 'Sitemap: https://stajimvar.com/sitemap.xml\n');
  fs.writeFileSync(
    path.join(kok, 'sitemap.xml'),
    '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://stajimvar.com/sitemap-sayfalar.xml</loc></sitemap></sitemapindex>',
  );
  /* Gizli anahtar sızıntısı: service_role JWT ve sb_secret_ (sahte değerler). */
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  fs.mkdirSync(path.join(kok, 'assets'));
  fs.writeFileSync(
    path.join(kok, 'assets', 'paket.js'),
    `const a="eyJ${b64({ alg: 'HS256' }).slice(3)}.${b64({ role: 'service_role', iss: 'test' })}.imzaimzaimzaimza";` +
      'const b="sb_secret_sahtedegersahtedeger";' +
      `const c="eyJ${b64({ alg: 'HS256' }).slice(3)}.${b64({ role: 'anon', iss: 'test' })}.imzaimzaimzaimza";`,
  );
  fs.writeFileSync(
    path.join(kok, 'sitemap-sayfalar.xml'),
    '<?xml version="1.0"?><urlset><url><loc>https://stajimvar.com/a</loc></url><url><loc>https://stajimvar.com/yok</loc></url></urlset>',
  );
  const sonuc = spawnSync(process.execPath, [path.join(KOK, 'scripts', 'seo-kapisi.mjs')], {
    env: { ...process.env, SEO_KAPISI_DIST: kok },
    encoding: 'utf8',
  });
  fs.rmSync(kok, { recursive: true, force: true });
  assert.equal(sonuc.status, 1);
  assert.match(sonuc.stderr, /\/a: haritada ama noindex/);
  assert.match(sonuc.stderr, /\/a: ilk HTML'de 2 adet <h1>/);
  assert.match(sonuc.stderr, /\/yok: haritada ama dosyası yok/);
  assert.match(sonuc.stderr, /kırık iç bağlantı: \/olmayan/);
  assert.match(sonuc.stderr, /\/assets\/paket\.js: rolü "service_role" olan JWT/);
  assert.match(sonuc.stderr, /\/assets\/paket\.js: gizli Supabase anahtarı \(sb_secret_\)/);
  /* anon JWT serbest; hata mesajı anahtar değerini içermiyor. */
  assert.doesNotMatch(sonuc.stderr, /rolü "anon"/);
  assert.doesNotMatch(sonuc.stderr, /sahtedegersahtedeger|imzaimza/);
});

test('SEO kapısı gerçek derleme çıktısında temiz', () => {
  if (!fs.existsSync(path.join(KOK, 'dist', 'sitemap-ilanlar.xml'))) return;
  const sonuc = spawnSync(process.execPath, [path.join(KOK, 'scripts', 'seo-kapisi.mjs')], { cwd: KOK, encoding: 'utf8' });
  assert.equal(sonuc.status, 0, sonuc.stderr);
});
