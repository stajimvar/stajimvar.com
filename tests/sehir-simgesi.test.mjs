import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { sehirAnahtari } from '../src/lib/sehir-anahtari.mjs';

/*
  ŞEHİR SİMGELERİ

  Şeridin dairesinde artık rakam değil şehrin simgesi var. İki şey
  korunuyor: anahtarın Türkçe adlarla tutması ve simgesi olmayan şehrin
  daireyi boş bırakmaması.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const SIMGE = readFileSync(path.join(KOK, 'src/components/SehirSimgesi.tsx'), 'utf8');
const SERIT = readFileSync(path.join(KOK, 'src/components/SehirSeridi.tsx'), 'utf8');

/** Katalogda bugün yayında olan şehirler (üretimden sorguyla alındı). */
const YAYINDAKI_SEHIRLER = [
  'İstanbul',
  'İzmir',
  'Bursa',
  'Konya',
  'Şanlıurfa',
  'Ankara',
  'Eskişehir',
];

test('Türkçe adlar doğru anahtara düşüyor', () => {
  /*
    Büyük İ tuzağı: `toLowerCase()` 'İ'yi 'i' + birleşen nokta yapıyor
    ve anahtar tutmuyordu. Bu test o davranışı sabitliyor.
  */
  assert.equal(sehirAnahtari('İstanbul'), 'istanbul');
  assert.equal(sehirAnahtari('Şanlıurfa'), 'sanliurfa');
  assert.equal(sehirAnahtari('Eskişehir'), 'eskisehir');
  assert.equal(sehirAnahtari('İZMİR'), 'izmir');
  assert.equal(sehirAnahtari('  Bursa  '), 'bursa');
  /* Bozuk girdi çökmüyor, boş anahtara düşüyor: genel silüet çizilir. */
  for (const bozuk of [undefined, null, '', 42, {}]) {
    assert.equal(typeof sehirAnahtari(bozuk), 'string');
  }
});

test('yayındaki her şehrin kendi simgesi var', () => {
  for (const ad of YAYINDAKI_SEHIRLER) {
    const anahtar = sehirAnahtari(ad);
    assert.match(
      SIMGE,
      new RegExp(`^\\s{2}${anahtar}: \\(`, 'm'),
      `${ad} (${anahtar}) için simge yok`
    );
  }
});

test('tanınmayan şehir için genel silüet var', () => {
  assert.match(SIMGE, /const GENEL = \(/);
  assert.match(SIMGE, /\?\? GENEL/, 'bilinmeyen şehirde yedek çizim kullanılmalı');
});

test('simgeler çizim — fotoğraf ya da dış kaynak yok', () => {
  assert.doesNotMatch(SIMGE, /<img\s/, 'bitmap kullanılmamalı');
  assert.doesNotMatch(SIMGE, /<image\b|xlink:href|url\(/i, 'gömülü görsel olmamalı');
  assert.doesNotMatch(SIMGE, /https?:\/\//, 'dış kaynak olmamalı');
  assert.doesNotMatch(SIMGE, /unsplash|pexels|shutterstock|istockphoto|getty/i);
});

test('simge rengi devralıyor ve ekran okuyucuya görünmüyor', () => {
  /* Seçili dairenin zemini koyu; ikon `currentColor` ile beyaza dönüyor. */
  assert.match(SIMGE, /stroke="currentColor"/);
  assert.match(SIMGE, /aria-hidden/);
});

test('şeritte sayı dairenin içinden çıktı, adın altına indi', () => {
  /*
    Dairede rakam varken şirket şeridiyle aynı geometri iki farklı şey
    anlatıyordu (orada logo, burada sayı). Sayı artık ilan şeridindeki
    gibi alt satırda.
  */
  assert.match(SERIT, /\{adet\} etkinlik/, 'adet alt satırda yazmalı');
  assert.match(SERIT, /<SehirSimgesi sehir=\{sehir\.ad\}/, 'dairede simge çizilmeli');
  const daire = SERIT.slice(SERIT.indexOf('const Daire'), SERIT.indexOf('export const SehirSeridi'));
  assert.doesNotMatch(daire, /tabular-nums[^\n]*\{adet\}/, 'rakam dairenin içinde kalmamalı');
});

test('şeritteki erişilebilir cümle duruyor', () => {
  /* Görünen iki satır aria-hidden; ad ve adet tek cümlede okunuyor. */
  assert.match(SERIT, /<span className="sr-only">\{okunan\}<\/span>/);
  assert.match(SERIT, /okunan=\{`\$\{sehir\.ad\}, \$\{sehir\.adet\} etkinlik`\}/);
});
