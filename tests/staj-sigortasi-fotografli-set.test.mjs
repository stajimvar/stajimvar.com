import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { aciklamaKur, paylasimSorunlari } from '../src/lib/instagram-paylasim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public', 'paylasim', 'setler.json');

test('fotoğraflı staj sigortası karuseli panelde yayına hazır dört karttır', async () => {
  const setler = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const set = setler.find((item) => item.kod === 'staj-sigortasi-fotografli');

  assert.ok(set, 'fotoğraflı karusel setler.json içinde yer almalı');
  assert.equal(set.ad, 'Staj sigortasını kim yapar? — fotoğraflı');
  assert.equal(set.surum, 'v1');
  assert.equal(set.guncellendi, '2026-09-08');
  assert.deepEqual(set.kartlar, [
    '/paylasim/staj-sigortasi-fotografli/01-v1.jpg',
    '/paylasim/staj-sigortasi-fotografli/02-v1.jpg',
    '/paylasim/staj-sigortasi-fotografli/03-v1.jpg',
    '/paylasim/staj-sigortasi-fotografli/04-v1.jpg',
  ]);
  assert.match(set.metin, /zorunlu stajda.*okul/is);
  assert.match(set.metin, /gönüllü stajda.*yazılı/is);
  assert.match(set.metin, /stajimvar\.com\/rehber\/staj-sigortasi-kim-yapar/);

  const tamAdresler = set.kartlar.map((asset) => `https://stajimvar.com${asset}`);
  assert.deepEqual(
    paylasimSorunlari(
      { gorseller: tamAdresler, aciklama: aciklamaKur(set.metin, set.etiketler) },
      'stajimvar.com',
    ),
    [],
  );

  for (const asset of set.kartlar) {
    const dosya = path.join(root, 'public', asset);
    assert.ok(fs.existsSync(dosya), `${asset} bulunmalı`);
    const metadata = await sharp(dosya).metadata();
    assert.equal(metadata.format, 'jpeg', `${asset} JPEG olmalı`);
    assert.equal(metadata.width, 1440, `${asset} genişliği 1440 olmalı`);
    assert.equal(metadata.height, 1920, `${asset} yüksekliği 1920 olmalı`);
  }
});
