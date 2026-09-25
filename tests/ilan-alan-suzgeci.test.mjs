import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

import { alanaUyuyorMu, alanSecenekleri } from '../src/lib/ilan-alan-suzgeci.mjs';

const gorunum = readFileSync('src/components/MatchedInternshipsView.tsx', 'utf8');

const SEKTORLER = [
  { id: 'moda', slug: 'tekstil-moda-hazir-giyim', ad: 'Tekstil, Moda ve Hazır Giyim' },
  { id: 'yazilim', slug: 'bilisim-yazilim', ad: 'Bilişim ve Yazılım' },
  { id: 'isletme', slug: 'ekonomi-isletme-yonetim', ad: 'Ekonomi, İşletme ve Yönetim' },
  { id: 'hukuk', slug: 'hukuk-adalet', ad: 'Hukuk ve Adalet' },
];
const SEKTORLER_L = [...SEKTORLER, { id: 'lojistik', slug: 'lojistik-havacilik-denizcilik', ad: 'Lojistik' }];

/* ------------------------------------------------------------ süzme */

test('seçim yokken alanı olmayan ilan da geçiyor', () => {
  assert.equal(alanaUyuyorMu([], []), true);
  assert.equal(alanaUyuyorMu(undefined, []), true);
  assert.equal(alanaUyuyorMu(['moda'], []), true);
});

test('seçilenlerden HERHANGİ BİRİNİ taşıyan ilan geçiyor', () => {
  assert.equal(alanaUyuyorMu(['isletme', 'moda'], ['moda']), true);
  assert.equal(alanaUyuyorMu(['isletme', 'moda'], ['yazilim', 'isletme']), true);
  assert.equal(alanaUyuyorMu(['yazilim'], ['moda', 'hukuk']), false);
});

test('seçim varken alanı boş ilan düşüyor — "Diğer" kovası yok', () => {
  assert.equal(alanaUyuyorMu([], ['moda']), false);
  assert.equal(alanaUyuyorMu(undefined, ['moda']), false);
});

/* ---------------------------------------------------------- sayım */

const d = (alan, tip, count) => ({ alan, tip, count });
const VARSAYILAN = ['staj', 'uzun_donem'];

test('sayılar sunucunun dağılımından, istemci saymıyor', () => {
  /* İki alanlı ilan sunucuda iki alanda da sayılmış geliyor; aynen yazılıyor. */
  const secenekler = alanSecenekleri(
    SEKTORLER,
    [d('isletme', 'staj', 1), d('moda', 'staj', 1), d('yazilim', 'staj', 3)],
    [],
    VARSAYILAN,
  );
  assert.deepEqual(
    secenekler.map((s) => [s.id, s.adet]),
    [
      ['moda', 1],
      ['yazilim', 3],
      ['isletme', 1],
    ],
  );
});

test('yalnız seçili türlerin satırları toplanıyor (yerel tohumun beklentisi)', () => {
  /* Supply Chain (staj) + Satın Alma Yönetici Adayı (mt), ikisi de Lojistik. */
  const dagilim = [
    d('lojistik', 'staj', 1),
    d('lojistik', 'mt', 1),
    d('isletme', 'staj', 1),
    d('moda', 'staj', 1),
  ];
  const adet = (tipler) =>
    Object.fromEntries(alanSecenekleri(SEKTORLER_L, dagilim, [], tipler).map((s) => [s.id, s.adet]));
  assert.deepEqual(adet(VARSAYILAN), { moda: 1, lojistik: 1, isletme: 1 });
  assert.deepEqual(adet([...VARSAYILAN, 'mt']), { moda: 1, lojistik: 2, isletme: 1 });
});

test('tür süzgeci boşsa bütün türler sayılıyor (listedeki kuralla aynı)', () => {
  const dagilim = [d('hukuk', 'staj', 1), d('hukuk', 'mt', 2), d('hukuk', 'siniflandirilmadi', 1)];
  assert.equal(alanSecenekleri(SEKTORLER, dagilim, [], [])[0].adet, 4);
});

test('sınıfı olmayan satır yalnız "siniflandirilmadi" seçiliyse sayılıyor', () => {
  const dagilim = [d('hukuk', 'siniflandirilmadi', 2)];
  assert.deepEqual(alanSecenekleri(SEKTORLER, dagilim, [], VARSAYILAN), []);
  assert.equal(alanSecenekleri(SEKTORLER, dagilim, [], [...VARSAYILAN, 'siniflandirilmadi'])[0].adet, 2);
});

test('türle sıfıra düşen alan çizilmiyor, seçiliyse 0 ile kalıyor', () => {
  const dagilim = [d('yazilim', 'staj', 1), d('hukuk', 'mt', 1)];
  assert.deepEqual(alanSecenekleri(SEKTORLER, dagilim, [], VARSAYILAN).map((s) => s.id), ['yazilim']);
  assert.deepEqual(
    alanSecenekleri(SEKTORLER, dagilim, ['hukuk'], VARSAYILAN).map((s) => [s.id, s.adet]),
    [
      ['yazilim', 1],
      ['hukuk', 0],
    ],
  );
});

test('sıra sitenin alan sırası, sayıya göre değil', () => {
  const secenekler = alanSecenekleri(SEKTORLER, [d('hukuk', 'staj', 9), d('moda', 'staj', 1)], [], VARSAYILAN);
  assert.deepEqual(secenekler.map((s) => s.id), ['moda', 'hukuk']);
});

test('dağılım yoksa (eski açılış tohumu) seçenek yok', () => {
  assert.deepEqual(alanSecenekleri(SEKTORLER, undefined, [], VARSAYILAN), []);
  assert.deepEqual(alanSecenekleri(SEKTORLER, undefined, ['moda'], VARSAYILAN), []);
});

test('alan adları yoksa seçenek yok (blok çizilmiyor)', () => {
  assert.deepEqual(alanSecenekleri(null, [d('moda', 'staj', 1)], [], VARSAYILAN), []);
  assert.deepEqual(alanSecenekleri([], [d('moda', 'staj', 1)], [], VARSAYILAN), []);
});

test('bozuk dağılım satırı sayı uydurmuyor', () => {
  const secenekler = alanSecenekleri(
    SEKTORLER,
    [null, { alan: 'moda', tip: 'staj' }, d('hukuk', 'staj', 2)],
    [],
    VARSAYILAN,
  );
  assert.deepEqual(secenekler.map((s) => [s.id, s.adet]), [['hukuk', 2]]);
});

/* ------------------------------------------------ görünüme bağlantı */

test('süzme istemcide kesişimle, sayılar sunucu dağılımından', () => {
  assert.match(gorunum, /atla !== 'alan' && !alanaUyuyorMu\(listing\.alanIdleri \?\? \[\], seciliAlanlar\)/);
  assert.match(gorunum, /alanSecenekleri\(alanAdlari \?\? \[\], alanFacets, seciliAlanlar, ilanTipleri\)/);
  /* Seçenekler artık yüklenmiş ilanlardan sayılmıyor. */
  assert.equal(/alanSecenekleri\(alanAdlari, ilanAlanlari/.test(gorunum), false);
});

test('App alan dağılımını ülke dağılımı gibi indiriyor', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /alanFacets=\{globalListings\.page\.facets\.alanlar\}/);
});

test('alan seçiliyken kalan sayfalar yükleniyor', () => {
  assert.match(gorunum, /const alanAcik = seciliAlanlar\.length > 0;/);
  assert.match(gorunum, /!kayitlilarAcik && !alanAcik/);
});

test('alan bloğu yalnız seçenek varken çiziliyor ve Konum bloğunun üstünde', () => {
  /* A paketi (26 Eylül 2026): başlıklar "Bölüm veya alan" ve Türkiye'de "Şehir" / dışında "Ülke". */
  const alan = gorunum.indexOf('<FiltreBlogu baslik="Bölüm veya alan">');
  const konum = gorunum.indexOf("<FiltreBlogu baslik={seciliBolge === 'turkiye' ? 'Şehir' : 'Ülke'}>");
  assert.notEqual(alan, -1, 'Alan bloğu bulunamadı');
  assert.ok(alan < konum, 'Alan bloğu Konum bloğunun üstünde değil');
  assert.match(gorunum, /\{alanSecenekListesi\.length > 0 && \(\s*<FiltreBlogu baslik="Bölüm veya alan">/);
});

test('alan adları alınamazsa durum null kalıyor, sıfır yazılmıyor', () => {
  assert.match(gorunum, /\.catch\(\(\) => \{\s*if \(!iptal\) setAlanAdlari\(null\);/);
});

test('toplu davranışlar alanı da kapsıyor: sayaç, temizle, boş sonuç çipi', () => {
  const sayac = gorunum.match(/const acikSuzgecSayisi =[\s\S]+?;\n/);
  assert.ok(sayac);
  assert.match(sayac[0], /seciliAlanlar\.length/);

  const temizle = gorunum.match(/const suzgecleriTemizle = \(\) => \{[\s\S]+?\n {2}\};/);
  assert.ok(temizle);
  assert.match(temizle[0], /setSeciliAlanlar\(\[\]\)/);

  assert.match(gorunum, /ekle\(seciliAlanlar\.length > 0, `Alan \(\$\{seciliAlanlar\.length\}\)`, 'alan'/);
});

test('alan seçiliyken "Bu aramayı kaydet" çizilmiyor (sözleşme alanı taşımıyor)', () => {
  assert.match(gorunum, /\{onToast && seciliAlanlar\.length === 0 && \(/);
});

test('eski "sektör verimiz yok" gerekçesi kaldırıldı', () => {
  assert.equal(/Sektor verimiz yok/.test(gorunum), false);
});

test('süzgeç satırı 44 piksellik dokunma hedefi', () => {
  const satir = gorunum.match(/const SecenekSatiri[\s\S]+?<label className="([^"]+)"/);
  assert.ok(satir);
  assert.match(satir[1], /\bmin-h-11\b/);
});
