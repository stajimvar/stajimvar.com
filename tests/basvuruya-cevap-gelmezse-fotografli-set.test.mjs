import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { aciklamaKur, paylasimSorunlari } from '../src/lib/instagram-paylasim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public', 'paylasim', 'setler.json');

test('cevapsız başvuru karuseli panelde yayına hazır dört fotoğraflı karttır', async () => {
  const setler = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const set = setler.find((item) => item.kod === 'basvuruya-cevap-gelmezse-fotografli');

  assert.ok(set, 'cevapsız başvuru karuseli setler.json içinde yer almalı');
  assert.equal(set.ad, 'Başvuruya cevap gelmezse — fotoğraflı');
  assert.equal(set.surum, 'v1');
  assert.equal(set.guncellendi, '2026-09-08');
  assert.deepEqual(set.kartlar, [
    '/paylasim/basvuruya-cevap-gelmezse-fotografli/01-v1.jpg',
    '/paylasim/basvuruya-cevap-gelmezse-fotografli/02-v1.jpg',
    '/paylasim/basvuruya-cevap-gelmezse-fotografli/03-v1.jpg',
    '/paylasim/basvuruya-cevap-gelmezse-fotografli/04-v1.jpg',
  ]);
  assert.match(set.metin, /bir hafta bekle/i);
  assert.match(set.metin, /aynı e-posta zincirine/i);
  assert.match(set.metin, /üçüncü hatırlatma yok/i);
  assert.match(set.metin, /stajimvar\.com\/rehber\/basvuruya-cevap-gelmezse/);

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
