import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ilanIli, metindekiIller, ileUyuyorMu } from '../src/lib/ilan-ili.mjs';
import { ilBul, katla, TR_ILLERI } from '../src/lib/il-bul.mjs';
import { aramaEslesiyorMu, filtreleriDogrula, ilaniNormalize } from '../src/lib/kayitli-arama.mjs';

/*
  İLANIN İLİ — TEK KURAL (14 Ekim 2026)

  Şehir menüsü, "Diğer" görünümü, şehir sayacı ve kayıtlı arama süzgeci
  aynı fonksiyonu (src/lib/ilan-ili.mjs) kullanıyor. Veritabanına
  dokunulmuyor; doğrulanmış `il` varsa esas, yoksa yalnız Türkiye ilanında
  ham metinden, belirsizse null.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

test('önce doğrulanmış il alanı; geçersiz değer yok sayılıyor', () => {
  assert.equal(ilanIli({ il: 'Kocaeli', city: 'Istanbul', country_code: 'TR' }), 'Kocaeli');
  assert.equal(ilanIli({ il: 'İstanbul', city: 'Turkey - Istanbul', countryCode: 'TR' }), 'İstanbul');
  /* Kısıtlı listede olmayan değer il sayılmıyor; metinden türetiliyor. */
  assert.equal(ilanIli({ il: 'Istanbull', city: 'Istanbul', country_code: 'TR' }), 'İstanbul');
});

test('il boşsa Türkiye ilanının şehir metninden türetiliyor', () => {
  const tr = (city) => ilanIli({ il: null, city, country_code: 'TR' });
  assert.equal(tr('Istanbul'), 'İstanbul');
  assert.equal(tr('İstanbul'), 'İstanbul');
  assert.equal(tr('Turkey - Istanbul'), 'İstanbul');
  assert.equal(tr('Zincirlikuyu, Istanbul'), 'İstanbul');
  assert.equal(tr('Şişli'), 'İstanbul');
  assert.equal(tr('Çankaya'), 'Ankara');
  assert.equal(tr('Gebze'), 'Kocaeli');
  assert.equal(tr('Adana'), 'Adana');
  /* Ülke kodu boş ama metin açıkça bir Türk ili (canlıda Ogulsize). */
  assert.equal(ilanIli({ il: null, city: 'İstanbul', country_code: null }), 'İstanbul');
});

test('ülke adı şehir sayılmıyor; belirsizde ve bilinmeyende il uydurulmuyor', () => {
  for (const city of ['Turkey', 'Türkiye', 'TR', 'turkey ']) {
    assert.equal(ilanIli({ city, country_code: 'TR' }), null, city);
  }
  /* İki il: ilBul ilk bulduğunu döndürüyordu; burada null. */
  assert.equal(ilBul('İstanbul / Ankara'), 'Ankara');
  assert.equal(ilanIli({ city: 'İstanbul / Ankara', country_code: 'TR' }), null);
  assert.equal(ilanIli({ city: 'Kadıköy, Ankara', country_code: 'TR' }), null);
  assert.deepEqual(metindekiIller('İstanbul / Ankara').sort(), ['Ankara', 'İstanbul']);
  assert.equal(ilanIli({ city: 'Organize Sanayi Bölgesi', country_code: 'TR' }), null);
  assert.equal(ilanIli({ city: '', country_code: 'TR' }), null);
  assert.equal(ilanIli({ city: null, country_code: 'TR' }), null);
  assert.equal(ilanIli(null), null);
});

test('yurt dışı ve konumu çelişen ilanda il yok', () => {
  assert.equal(ilanIli({ city: 'Berlin', country_code: 'DE' }), null);
  assert.equal(ilanIli({ city: 'Paris', countryCode: 'FR' }), null);
  /* Ülke FR ama metin Türk ili: coğrafya belirsiz, il uydurulmuyor. */
  assert.equal(ilanIli({ city: 'Istanbul', country_code: 'FR' }), null);
});

test('tek ilin geçtiği her metinde eski ilBul ile aynı sonuç', () => {
  const ornekler = [
    'Istanbul', 'Ankara', 'İzmir', 'Turkey - Istanbul', 'Türkiye / İzmir', 'Zincirlikuyu, Istanbul',
    'Maslak', 'Ataşehir', 'Kozyatağı, İstanbul', 'Çorlu', 'Gebze', 'Bornova', 'Nilüfer', 'Manisa', 'Kocaeli',
    ...TR_ILLERI,
  ];
  for (const city of ornekler) {
    if (metindekiIller(city).length !== 1) continue;
    assert.equal(ilanIli({ city, country_code: 'TR' }), ilBul(city), city);
  }
});

test('ileUyuyorMu: eski eşleşmeler korunuyor, eksikler ekleniyor', () => {
  const ilanlar = [
    { city: 'Istanbul', country_code: 'TR' },
    { city: 'İstanbul', country_code: 'TR' },
    { city: 'Turkey - Istanbul', country_code: 'TR' },
    { city: 'Zincirlikuyu, Istanbul', country_code: 'TR' },
    { city: 'Şişli', country_code: 'TR' },
    { city: 'Turkey', country_code: 'TR' },
    { city: 'İstanbul / Ankara', country_code: 'TR' },
    { city: 'Berlin', country_code: 'DE' },
    { city: 'Ankara', il: 'Ankara', country_code: 'TR' },
    { city: 'Kocaeli', country_code: null },
  ];
  const secimler = ['İstanbul', 'Istanbul', 'Ankara', 'Berlin', 'Turkey', 'Turkey - Istanbul', 'İstanbul / Ankara', 'Kocaeli'];
  for (const ilan of ilanlar) {
    for (const s of secimler) {
      const eski = katla(ilan.city) === katla(s);
      if (eski) assert.ok(ileUyuyorMu(ilan, s), `eski eşleşme kayboldu: ${ilan.city} / ${s}`);
    }
  }
  /* Yeni eşleşmeler: ilçe ve önekli yazımlar artık İstanbul aramasına giriyor. */
  for (const city of ['Turkey - Istanbul', 'Zincirlikuyu, Istanbul', 'Şişli']) {
    assert.ok(ileUyuyorMu({ city, country_code: 'TR' }, 'İstanbul'), city);
  }
  /* Belirsiz ve yanlış il eklenmiyor. */
  assert.equal(ileUyuyorMu({ city: 'İstanbul / Ankara', country_code: 'TR' }, 'Ankara'), false);
  assert.equal(ileUyuyorMu({ city: 'Turkey', country_code: 'TR' }, 'İstanbul'), false);
  assert.equal(ileUyuyorMu({ city: 'Ankara', country_code: 'TR' }, 'İstanbul'), false);
  assert.equal(ileUyuyorMu({ city: 'Berlin', country_code: 'DE' }, ''), true);
});

test('kayıtlı arama: "Turkey - Istanbul" ilanı İstanbul aramasında; doğrulanmış il okunuyor', () => {
  const f = filtreleriDogrula({ city: 'İstanbul' });
  assert.equal(f.city, 'İstanbul');
  const esles = (ham) => aramaEslesiyorMu(ilaniNormalize({ id: 'x', title: 'Stajyer', ...ham }), f);
  assert.equal(esles({ city: 'Turkey - Istanbul', country_code: 'TR' }), true);
  assert.equal(esles({ city: 'Istanbul', country_code: 'TR' }), true);
  assert.equal(esles({ city: 'Ankara', country_code: 'TR' }), false);
  assert.equal(esles({ city: 'Turkey', country_code: 'TR' }), false);
  /* Doğrulanmış il ham metne baskın (snake_case ve camelCase). */
  assert.equal(esles({ city: 'Gebze', il: 'İstanbul', country_code: 'TR' }), true);
  assert.equal(ilaniNormalize({ il: 'Ankara' }).il, 'Ankara');
  assert.equal(ilaniNormalize({ city: 'Istanbul' }).il, null);
  /* Şehir seçilmemiş arama etkilenmiyor. */
  assert.equal(aramaEslesiyorMu(ilaniNormalize({ id: 'y', title: 'Stajyer', city: 'Turkey' }), filtreleriDogrula({})), true);
});

test('şehir menüsü, "Diğer", şehir sayacı ve kayıtlı arama aynı fonksiyonu kullanıyor', () => {
  const liste = oku('src/components/MatchedInternshipsView.tsx');
  assert.match(liste, /import \{ ilanIli \} from '\.\.\/lib\/ilan-ili\.mjs';/);
  assert.match(liste, /selectedCity === 'diger' && ilanIli\(listing\) !== null/);
  assert.match(liste, /\.map\(\(item\) => ilanIli\(item\.listing\) \?\? item\.listing\.city\)/);
  assert.match(liste, /const il = ilanIli\(listing\);/);
  assert.doesNotMatch(liste, /ilBul\(/);
  const arama = oku('src/lib/kayitli-arama.mjs');
  assert.match(arama, /if \(!ileUyuyorMu\(i, f\.city\)\) return false;/);
  assert.doesNotMatch(arama, /katla\(i\.city\) !== katla\(f\.city\)/);
});
