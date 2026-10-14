import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';

/*
  SEO TEKNİK REGRESYON KİLİDİ (14 Ekim 2026)

  15 Eylül 2026'daki görünürlük düşüşünden sonra 10–17 Eylül arasındaki
  değişiklikler incelendi. O hafta canlıda ÖLÇÜLMÜŞ ve commit
  mesajlarına yazılmış teknik hatalar:

    67f56ed (12 Eyl)  /kesfet/* toptan /firsatlar'a 301 aldı; harita bu
                      yönlendirilmiş adresleri bildirmeye devam etti.
    1c26001 (14 Eyl)  canlı haritada 99 yönlendirilmiş /kesfet adresi,
                      404 dönen /firsatlar adresleri, 159 ilanın yalnız 62'si;
                      169 adresin lastmod'u derleme günüydü.
                      /yurtdisi-firsatlari ilk HTML'de 83 karakter, 0 bağlantı.
                      Liste sayfaları 404 veren üç fırsata bağlanıyordu.
    47270ab (15 Eyl)  son başvuru günü gelen fırsatın sayfası aynı gün 404
                      oluyordu (gösterim alan btso-yuksekogrenim-bursu dahil).

  Bunların kaynağı düzeltildi ve bir kısmı başka testlerde (site haritası
  hijyeni, SEO kapısı, kenar ilan sayfası) korunuyor. Bu dosya kalan
  boşlukları kapatıyor: robots.txt'nin kapsamı, başlık dosyasının
  noindex'i, yönlendirme kurallarının biçimi ve hedefleri, ara katmanın
  GERÇEK durum kodları (kaynak metni değil, çalıştırılan kod) ve ilk
  HTML'in kanonik/ince içerik kuralları.

  Davranış DEĞİŞTİRMİYOR; bugünkü doğru davranışı kilitliyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const DIST = path.join(KOK, 'dist');
const SITE = 'https://stajimvar.com';
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

/* İçerik aileleri: arama motorunun bulması gereken sayfaların önekleri. */
const ICERIK_ONEKLERI = [
  '/ilan/', '/staj-ilanlari', '/firsatlar', '/burslar', '/kyk', '/yurtdisi-firsatlari',
  '/yarismalar', '/rehber', '/bolum', '/bolumler', '/sirket/', '/isveren', '/araclar',
  '/staj-programlari', '/assets/',
];

/* ------------------------------------------------------------ robots.txt */

function robotsKurallari() {
  return oku('public/robots.txt')
    .split('\n')
    .map((s) => s.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(':');
      return { alan: s.slice(0, i).trim().toLowerCase(), deger: s.slice(i + 1).trim() };
    });
}

test('robots.txt: herkese açık, yalnız yönetim kapalı; içerik ailesi ve /assets engellenmiyor', () => {
  const kurallar = robotsKurallari();
  assert.ok(
    kurallar.some((k) => k.alan === 'user-agent' && k.deger === '*'),
    'robots.txt "User-agent: *" taşımıyor',
  );
  const engeller = kurallar.filter((k) => k.alan === 'disallow').map((k) => k.deger);
  /*
    Boş "Disallow:" hiçbir şeyi engellemez; "/" bütün siteyi engeller.
    Yeni bir Disallow eklenecekse bu listeye bilerek yazılmalı.
  */
  const IZINLI_ENGELLER = ['/yonetim/'];
  for (const e of engeller.filter(Boolean)) {
    assert.ok(IZINLI_ENGELLER.includes(e), `robots.txt'te beklenmeyen Disallow: ${e}`);
  }
  for (const e of engeller.filter(Boolean)) {
    for (const onek of ['/', ...ICERIK_ONEKLERI]) {
      /* robots.txt önek eşleşmesi: "Disallow: /ilan" /ilan/x'i de kapatır. */
      assert.ok(
        !(onek === '/' ? e === '/' || e === '/*' : onek.startsWith(e.replace(/\*$/, ''))),
        `robots.txt "${e}" içerik adresini (${onek}) engelliyor`,
      );
    }
  }
  /* Google robots.txt'teki noindex'i desteklemiyor; varsa yanlış güvence. */
  assert.ok(!kurallar.some((k) => k.alan === 'noindex'), 'robots.txt noindex yönergesi taşıyor');
  const haritalar = kurallar.filter((k) => k.alan === 'sitemap').map((k) => k.deger);
  assert.deepEqual(haritalar, [`${SITE}/sitemap.xml`], 'robots.txt tek ve kanonik site haritasını göstermeli');
});

/* -------------------------------------------------------------- _headers */

function baslikBloklari() {
  const bloklar = [];
  let simdiki = null;
  for (const satir of oku('public/_headers').split('\n')) {
    if (!satir.trim() || satir.trim().startsWith('#')) continue;
    if (!/^\s/.test(satir)) {
      simdiki = { desen: satir.trim(), basliklar: [] };
      bloklar.push(simdiki);
    } else if (simdiki) simdiki.basliklar.push(satir.trim());
  }
  return bloklar;
}

test('_headers: X-Robots-Tag yalnız ön render yardımcı dosyalarında; HTML ve genel kural noindex taşımıyor', () => {
  const bloklar = baslikBloklari();
  assert.ok(bloklar.length > 0, '_headers okunamadı');
  for (const b of bloklar) {
    const robot = b.basliklar.filter((h) => /^x-robots-tag\s*:/i.test(h));
    if (b.desen === '/_onrender/*') {
      assert.deepEqual(robot, ['X-Robots-Tag: noindex'], '/_onrender/* noindex taşımalı');
      continue;
    }
    assert.equal(robot.length, 0, `_headers "${b.desen}" kuralı X-Robots-Tag yazıyor: ${robot.join(', ')}`);
  }
  /* Site haritası XML olarak sunulmalı; HTML sanılırsa okunmuyor. */
  const harita = bloklar.find((b) => b.desen === '/sitemap*.xml');
  assert.ok(harita, '_headers site haritası kuralını kaybetti');
  assert.ok(harita.basliklar.some((h) => /^Content-Type:\s*application\/xml/i.test(h)), 'site haritası application/xml değil');
});

/* ------------------------------------------------------------- _redirects */

function yonlendirmeKurallari(dosya) {
  return fs
    .readFileSync(dosya, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))
    .map((s) => {
      const [kaynak, hedef, durum, ...fazla] = s.split(/\s+/);
      return { satir: s, kaynak, hedef, durum, fazla };
    });
}

const kaynakEslesir = (kaynak, yol) =>
  kaynak.endsWith('/*') ? yol === kaynak.slice(0, -2) || yol.startsWith(kaynak.slice(0, -1)) : kaynak === yol;

test('_redirects: yalnız kalıcı 301, site içi hedef, zincir ve döngü yok', () => {
  const kurallar = yonlendirmeKurallari(path.join(KOK, 'public/_redirects'));
  assert.ok(kurallar.length > 0);
  const kaynaklar = new Set(kurallar.map((k) => k.kaynak));
  for (const k of kurallar) {
    assert.equal(k.fazla.length, 0, `fazla alan: ${k.satir}`);
    /*
      200 (yeniden yazma) bilinmeyen adreslere içerik verip yumuşak 404
      üretir; 302/307 kalıcı taşınmayı arama motoruna söylemez.
    */
    assert.equal(k.durum, '301', `kalıcı olmayan ya da yeniden yazan kural: ${k.satir}`);
    assert.match(k.kaynak, /^\/[^\s]*$/, `kaynak site içi yol değil: ${k.satir}`);
    assert.match(k.hedef, /^\/(?!\/)[^\s?#]*$/, `hedef site içi, sorgusuz yol değil: ${k.satir}`);
    assert.notEqual(k.kaynak, k.hedef, `kendine yönlendirme: ${k.satir}`);
    assert.ok(!kaynakEslesir(k.kaynak, k.hedef), `hedef kendi kaynağına uyuyor (döngü): ${k.satir}`);
    /* Zincir: hedef başka bir kuralın kaynağıysa arama motoru iki atlama yapıyor. */
    assert.ok(![...kaynaklar].some((s) => kaynakEslesir(s, k.hedef)), `yönlendirme zinciri: ${k.satir}`);
  }
});

test('_redirects: canlı içerik ailesi toptan yönlendirilmiyor (yalnız kapanmış eski bölümler)', () => {
  /*
    67f56ed: /kesfet/* bölüm kapandığı için toptan /firsatlar'a gitti; o
    bölümün sayfaları da kalktı. Aynı kalıp yanlışlıkla canlı bir aileye
    (/ilan/*, /rehber/*, /bolum/*, /firsatlar/*…) uygulanırsa yüzlerce
    dizinli sayfa tek bir merkez sayfaya düşer — Google bunu yumuşak 404
    sayıyor. Yeni bir joker kural ancak bölüm gerçekten kapandıysa ve bu
    listeye bilerek eklenerek yazılabilir.
  */
  const KAPANMIS_ESKI_BOLUMLER = ['/kesfet/*', '/ilanlar/*', '/sirketler/*'];
  const kurallar = yonlendirmeKurallari(path.join(KOK, 'public/_redirects'));
  for (const k of kurallar.filter((r) => r.kaynak.includes('*'))) {
    assert.ok(KAPANMIS_ESKI_BOLUMLER.includes(k.kaynak), `canlı bir aileyi toptan yönlendirebilecek joker kural: ${k.satir}`);
  }
  for (const k of kurallar) {
    for (const aile of ['/rehber', '/bolum', '/bolumler', '/burslar', '/firsatlar', '/staj-ilanlari', '/kyk']) {
      assert.ok(
        !(k.kaynak === aile || k.kaynak.startsWith(`${aile}/`)),
        `içerik ailesinden yönlendirme (ayrı karar gerektirir): ${k.satir}`,
      );
    }
  }
});

/* ------------------------------------- ara katman: gerçek durum kodları */

/*
  Ara katman TypeScript; uzantısız bir yerel içe aktarma (`../src/lib/sehir`)
  taşıyor. Node türleri kendisi siliyor; burada yalnız uzantısız yolu
  `.ts`e tamamlayan bir çözümleme kancası var. Cloudflare'in `caches`
  nesnesi ve ASSETS bağlamı bellek içi taklit; ağ çağrısı yapılmıyor
  (`fetch` çağrılırsa test düşüyor).
*/
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
    put: async (istek, cevap) => {
      ONBELLEK.set(istek.url, cevap.clone());
    },
    delete: async (istek) => ONBELLEK.delete(istek.url),
  },
};
const gercekFetch = globalThis.fetch;

const ANASAYFA = '<!doctype html><html><head><link rel="canonical" href="https://stajimvar.com/" /></head><body><div id="root">kabuk</div></body></html>';
const BULUNAMADI = '<!doctype html><html><head><meta name="robots" content="noindex" /></head><body>Sayfa bulunamadı</body></html>';
const html = (govde, durum = 200) =>
  new Response(govde, { status: durum, headers: { 'content-type': 'text/html; charset=utf-8' } });

const VARLIKLAR = {
  '/': () => html(ANASAYFA),
  '/404.html': () => html(BULUNAMADI),
  '/gecerli-adresler.json': () =>
    new Response(JSON.stringify({ sirket: ['var-olan-sirket'] }), { headers: { 'content-type': 'application/json' } }),
};

let araKatman;
async function istek(adres, { dosyalar = {}, yontem = 'GET' } = {}) {
  araKatman ??= await import('../functions/_middleware.ts');
  const bekleyenler = [];
  globalThis.fetch = async () => {
    throw new Error('ara katman testinde ağ çağrısı yapılmamalı');
  };
  try {
    const request = new Request(adres, { method: yontem });
    const yol = new URL(adres).pathname;
    const cevap = await araKatman.onRequest({
      request,
      env: {
        ASSETS: {
          fetch: async (r) => (VARLIKLAR[new URL(r.url).pathname] || (() => new Response('yok', { status: 404 })))(),
        },
      },
      next: async () => (dosyalar[yol] ? html(dosyalar[yol]) : new Response('Not found', { status: 404 })),
      waitUntil: (is) => bekleyenler.push(is),
    });
    await Promise.all(bekleyenler);
    return { cevap, govde: await cevap.text() };
  } finally {
    globalThis.fetch = gercekFetch;
  }
}

test('ara katman: www isteği yol ve sorgu korunarak çıplak alan adına 301', async () => {
  const { cevap } = await istek('https://www.stajimvar.com/rehber/staj-sigortasi?utm_source=x');
  assert.equal(cevap.status, 301);
  assert.equal(cevap.headers.get('location'), 'https://stajimvar.com/rehber/staj-sigortasi?utm_source=x');
});

test('ara katman: süresi geçmiş fırsatın yazılmış sayfası 200 kalıyor (47270ab: aynı gün 404 oluyordu)', async () => {
  const sayfa = '<html><body><h1>Örnek burs</h1>Başvuru dönemi kapandı</body></html>';
  const { cevap, govde } = await istek('https://stajimvar.com/firsatlar/ornek-burs', {
    dosyalar: { '/firsatlar/ornek-burs': sayfa },
  });
  assert.equal(cevap.status, 200);
  assert.equal(govde, sayfa);
  assert.equal(cevap.headers.get('x-robots-tag'), null);
});

test('ara katman: veri önekinde dosyası olmayan adres gerçek 404 + noindex, önbelleğe girmiyor', async () => {
  for (const yol of ['/firsatlar/olmayan-firsat', '/bolum/olmayan-bolum', '/sirket/olmayan-sirket']) {
    ONBELLEK.clear();
    const { cevap, govde } = await istek(`${SITE}${yol}`);
    assert.equal(cevap.status, 404, `${yol} 404 değil (yumuşak 404)`);
    assert.equal(cevap.headers.get('x-robots-tag'), 'noindex', `${yol} noindex başlığı yok`);
    assert.equal(cevap.headers.get('cache-control'), 'no-store', `${yol} önbelleğe açık`);
    assert.match(govde, /Sayfa bulunamadı/);
    assert.equal(ONBELLEK.size, 0, `${yol}: 404 kenar önbelleğine yazıldı`);
  }
});

test('ara katman: sayfası yazılmamış ama geçerli şirket 200, listede olmayan şirket 404', async () => {
  assert.equal((await istek(`${SITE}/sirket/var-olan-sirket`)).cevap.status, 200);
  assert.equal((await istek(`${SITE}/sirket/uydurma-sirket`)).cevap.status, 404);
});

test('ara katman: bilinmeyen adres 404, uygulama kabuğu (200) almıyor', async () => {
  for (const yol of ['/boyle-bir-sayfa-yok', '/rehberler', '/burs/x', '/kesfet-yeni']) {
    const { cevap, govde } = await istek(`${SITE}${yol}`);
    assert.equal(cevap.status, 404, `${yol} ${cevap.status} döndü`);
    assert.doesNotMatch(govde, /kabuk/, `${yol} ana sayfa kabuğunu aldı`);
  }
});

test('ara katman: oturuma bağlı uygulama adresi kabuğu 200 ile alıyor, önbelleğe girmiyor', async () => {
  ONBELLEK.clear();
  const { cevap, govde } = await istek(`${SITE}/cv`);
  assert.equal(cevap.status, 200);
  assert.equal(govde, ANASAYFA);
  assert.equal(cevap.headers.get('cache-control'), 'no-store');
  assert.equal(ONBELLEK.size, 0);
});

test('ara katman: yazılmış belge sayfası olduğu gibi 200 ve kenarda tutuluyor', async () => {
  ONBELLEK.clear();
  const sayfa = '<html><head><link rel="canonical" href="https://stajimvar.com/rehber/ornek" /></head><body><h1>Rehber</h1></body></html>';
  const { cevap, govde } = await istek(`${SITE}/rehber/ornek`, { dosyalar: { '/rehber/ornek': sayfa } });
  assert.equal(cevap.status, 200);
  assert.equal(govde, sayfa);
  assert.equal(ONBELLEK.size, 1, 'belge sayfası kenarda tutulmadı');
});

test('ara katman: ilan verisi okunamazsa 404 verilmiyor — derleme dosyası ya da 503 + noindex', async () => {
  ONBELLEK.clear();
  const yedekli = await istek(`${SITE}/ilan/ornek-stajyer-12345678`, {
    dosyalar: { '/ilan/ornek-stajyer-12345678': '<html><body><h1>İlan</h1></body></html>' },
  });
  assert.equal(yedekli.cevap.status, 200);
  assert.equal(yedekli.cevap.headers.get('x-ilan-kaynagi'), 'statik-yedek');

  const yedeksiz = await istek(`${SITE}/ilan/baska-stajyer-87654321`);
  assert.equal(yedeksiz.cevap.status, 503, 'veri okunamayınca ilan 404 aldı (Google sayfayı düşürür)');
  assert.equal(yedeksiz.cevap.headers.get('x-robots-tag'), 'noindex');
  assert.ok(Number(yedeksiz.cevap.headers.get('retry-after')) > 0);
  assert.equal(ONBELLEK.size, 0, 'yedek ya da 503 kenar önbelleğine yazıldı');
});

/* ------------------------------------------------- dist: ilk HTML kuralları */

/*
  Aşağıdakiler derleme çıktısına bakıyor. dist yoksa atlanıyor; PR
  doğrulamasında derlemeden sonra ayrıca koşuyor (pr-dogrulama.yml).
*/
const distVar = fs.existsSync(path.join(DIST, 'sitemap.xml'));
const distOku = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const locler = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

function haritaYollari() {
  const yollar = new Set();
  for (const alt of locler(distOku('sitemap.xml'))) {
    for (const loc of locler(distOku(alt.slice(SITE.length + 1)))) yollar.add(loc.slice(SITE.length) || '/');
  }
  return yollar;
}

function htmlDosyalari(dizin) {
  const sonuc = [];
  for (const g of fs.readdirSync(dizin, { withFileTypes: true })) {
    const tam = path.join(dizin, g.name);
    if (g.isDirectory()) {
      if (!['assets', '_onrender', 'og'].includes(g.name)) sonuc.push(...htmlDosyalari(tam));
    } else if (g.name.endsWith('.html')) sonuc.push(tam);
  }
  return sonuc;
}

const dosyadanYol = (dosya) => {
  const y = '/' + path.relative(DIST, dosya).replace(/\\/g, '/').replace(/\.html$/, '');
  return y === '/index' ? '/' : y;
};

test('dist: her sayfada tek canonical, kendi kanonik adresi; og:url aynı; www/pages.dev/sorgu yok', { skip: !distVar }, () => {
  for (const dosya of htmlDosyalari(DIST)) {
    const yol = dosyadanYol(dosya);
    if (yol === '/404') continue;
    const h = fs.readFileSync(dosya, 'utf8');
    const canonicallar = [...h.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(canonicallar.length, 1, `${yol}: ${canonicallar.length} canonical`);
    const [canonical] = canonicallar;
    assert.equal(canonical, SITE + (yol === '/' ? '/' : yol), `${yol}: canonical başka adresi gösteriyor (${canonical})`);
    const og = h.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
    if (og) assert.equal(og, canonical, `${yol}: og:url canonical'dan farklı`);
  }
});

test('dist: haritadaki hiçbir adres bir yönlendirme kuralının kaynağı değil', { skip: !distVar }, () => {
  /* 1c26001: canlı harita 99 adet 301 veren /kesfet adresi bildiriyordu. */
  const kurallar = yonlendirmeKurallari(path.join(DIST, '_redirects'));
  for (const yol of haritaYollari()) {
    const kural = kurallar.find((k) => kaynakEslesir(k.kaynak, yol));
    assert.ok(!kural, `haritadaki ${yol} yönlendiriliyor: ${kural?.satir}`);
  }
});

test('dist: yönlendirme hedefleri yazılmış sayfaya gidiyor (ilan hedefleri kenarda çözülüyor)', { skip: !distVar }, () => {
  const gecerli = new Set(JSON.parse(distOku('gecerli-adresler.json')).sirket || []);
  for (const k of yonlendirmeKurallari(path.join(DIST, '_redirects'))) {
    /* /ilan/ hedefleri canlı veriden kenarda çiziliyor; kapanmış ilan 404 alıyor. */
    if (k.hedef.startsWith('/ilan/')) continue;
    const dosya = k.hedef === '/' ? 'index.html' : `${k.hedef.slice(1)}.html`;
    const var_ =
      fs.existsSync(path.join(DIST, dosya)) ||
      fs.existsSync(path.join(DIST, k.hedef.slice(1))) ||
      (k.hedef.startsWith('/sirket/') && gecerli.has(k.hedef.slice('/sirket/'.length)));
    assert.ok(var_, `yönlendirme 404'e gidiyor: ${k.satir}`);
  }
});

test('dist: ana merkez sayfaları haritada, yazılmış ve dizine açık', { skip: !distVar }, () => {
  const harita = haritaYollari();
  const MERKEZLER = [
    '/', '/staj-ilanlari', '/firsatlar', '/burslar', '/kyk', '/yurtdisi-firsatlari', '/yarismalar',
    '/staj-programlari', '/rehber', '/bolumler', '/isveren', '/universite-kariyer-merkezleri',
  ];
  for (const yol of MERKEZLER) {
    assert.ok(harita.has(yol), `${yol} site haritasından düştü`);
    const h = distOku(yol === '/' ? 'index.html' : `${yol.slice(1)}.html`);
    assert.doesNotMatch(h, /<meta name="robots" content="[^"]*noindex/i, `${yol} noindex aldı`);
  }
  /* Aileler tamamen boşalmasın: rehber ve bölüm depoda duran içerik. */
  const aile = (onek) => [...harita].filter((y) => y.startsWith(onek)).length;
  assert.ok(aile('/rehber/') > 0, 'haritada hiç rehber yok');
  assert.ok(aile('/bolum/') > 0, 'haritada hiç bölüm yok');
});

test('dist: haritadaki sayfaların ilk HTML\'i içerik taşıyor (ince sayfa kilidi)', { skip: !distVar }, () => {
  /*
    1c26001: /yurtdisi-firsatlari ilk HTML'de 83 karakter metin ve sıfır
    bağlantı taşıyordu. Eşik görünür metin için 150 karakter.

    BİLİNEN İNCE SAYFALAR (14 Ekim 2026 ölçümü, rapor edildi): bu yedi
    adres ön render'da yalnız başlık + tek cümle yazıyor (64–106 karakter,
    iç bağlantı 0) ve haritada. Bu bir onay DEĞİL, bekleyen bir karar;
    burada yalnız listenin BÜYÜMESİ engelleniyor. İçerik eklenince
    adres listeden çıkarılmalı.
  */
  const BILINEN_INCE = new Set([
    '/firsat-takvimi', '/araclar', '/araclar/net-hesaplama', '/araclar/siralama-tahmini',
    '/araclar/staj-gunu-hesaplama', '/araclar/staj-ucreti-hesaplama', '/stajyer-nasil-alinir',
  ]);
  const ince = [];
  for (const yol of haritaYollari()) {
    const h = distOku(yol === '/' ? 'index.html' : `${yol.slice(1)}.html`);
    const kok = h.slice(h.indexOf('<div id="root">'), h.lastIndexOf('</body>'));
    const metin = kok
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (metin.length < 150 && !BILINEN_INCE.has(yol)) ince.push(`${yol} (${metin.length})`);
  }
  assert.deepEqual(ince, [], `ilk HTML'i ince olan harita sayfaları: ${ince.join(', ')}`);
});
