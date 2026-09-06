import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { KESFET_GEO_ACIK } from '../src/lib/kesfet-geo-ayari.mjs';

/*
  COĞRAFİ KEŞİF ASKIDA

  Küre + harita canlıda beğenilmedi, kapatıldı ama SİLİNMEDİ. Bu dosya
  askıya almanın sözleşmesini koruyor: biri bayrağı atlayıp paneli geri
  koyarsa ya da bayrağı bir yerde unutursa test yakalasın.
*/

const kesfetSayfasi = readFileSync(new URL('../src/components/KesfetPage.tsx', import.meta.url), 'utf8');

test('bayrak kapalı: coğrafi keşif sitede görünmüyor', () => {
  assert.equal(KESFET_GEO_ACIK, false);
});

test('küre paneli bayrağa bağlı, çağrısı silinmemiş', () => {
  assert.match(kesfetSayfasi, /import \{ KESFET_GEO_ACIK \} from '\.\.\/lib\/kesfet-geo-ayari\.mjs'/);
  assert.match(
    kesfetSayfasi,
    /\{KESFET_GEO_ACIK && \(\s*<KesfetGlobePanel/,
    'küre paneli yalnızca bayrak açıkken çiziliyor',
  );
  /* Geri açmak tek satır olsun diye import ve çağrı yerinde duruyor. */
  assert.match(kesfetSayfasi, /import \{ KesfetGlobePanel \} from '\.\/KesfetGlobePanel'/);
  assert.match(kesfetSayfasi, /import \{ KesfetGeoPanel \} from '\.\/KesfetGeoPanel'/);
});

test('adresteki ?yer= askıdayken haritayı açamıyor', () => {
  /*
    Panel gizlenip durum açık bırakılsaydı `?yer=TR` haritayı yine açardı
    ve ilk satırı aldığı için kart sayısı 24'ten 21'e düşerdi. Harita da
    küreyle aynı `geoActive` değerine bağlı: ikisi ayrışamıyor.
  */
  assert.match(kesfetSayfasi, /const geoActive = KESFET_GEO_ACIK && geo\.layout\.mapOpen;/);
  assert.match(kesfetSayfasi, /\{geoActive && \(\s*<KesfetGeoPanel/);
});

test('askıdayken ızgara düzeni okunmuyor: ilk üç kart yerinde', () => {
  assert.match(kesfetSayfasi, /gorunenKartlar\(listEvents, geoActive \? geo\.layout : null\)/);
  /* Sayaç ile ızgara aynı listeden besleniyor; askı bunu değiştirmiyor. */
  assert.match(kesfetSayfasi, /\$\{listTotal\} etkinlik · \$\{gridEvents\.length\} gösteriliyor/);
});

test('askıdayken coğrafi sayım isteği atılmıyor', () => {
  assert.match(
    kesfetSayfasi,
    /useKesfetGeo\(filters, catalog\.query, KESFET_GEO_ACIK && phase !== 'loading'\)/,
    "hook'un etkin olma argümanı bayrakla birlikte kapanıyor",
  );
});

test('askıya alma kod silmiyor: coğrafi dosyalar yerinde', () => {
  const dosyalar = [
    '../src/components/KesfetGlobe.tsx',
    '../src/components/KesfetGlobePanel.tsx',
    '../src/components/KesfetGeoMap.tsx',
    '../src/components/KesfetGeoPanel.tsx',
    '../src/components/KesfetGeoBreadcrumb.tsx',
    '../src/components/useKesfetGeo.ts',
    '../src/components/kesfet-geo-state.mjs',
    '../src/lib/kesfet-geo.mjs',
    '../src/lib/kesfet-geo-filtre.mjs',
  ];
  for (const yol of dosyalar) {
    assert.ok(existsSync(new URL(yol, import.meta.url)), `${yol} askıya alınırken silinmemeli`);
  }
});
