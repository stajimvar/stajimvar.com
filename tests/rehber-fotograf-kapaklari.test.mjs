import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const KOK = path.resolve(import.meta.dirname, '..');
const KAPAK_DIZINI = path.join(KOK, 'public', 'rehber-gorselleri');
const kaynaklar = JSON.parse(readFileSync(path.join(KAPAK_DIZINI, 'kaynak.json'), 'utf8'));
const sluglar = readdirSync(KAPAK_DIZINI)
  .filter((ad) => ad.endsWith('.webp'))
  .map((ad) => ad.replace(/\.webp$/, ''))
  .sort();

test('her rehber kapağı fotoğraf kaynağıyla kayıtlı', () => {
  assert.equal(sluglar.length, 71, `beklenen 71 kapak, bulunan ${sluglar.length}`);
  assert.deepEqual(Object.keys(kaynaklar).sort(), sluglar);
  for (const slug of sluglar) {
    assert.match(kaynaklar[slug].tur, /^(cc0-photo|ai-photorealistic)$/i, `${slug}: fotoğraf türü yok`);
    assert.ok(kaynaklar[slug].kaynak, `${slug}: kaynak yok`);
  }
});

test('rehber kapaklarının tamamı 16:9 ve AVIF + WebP', async () => {
  for (const slug of sluglar) {
    for (const uzanti of ['avif', 'webp']) {
      const dosya = path.join(KAPAK_DIZINI, `${slug}.${uzanti}`);
      assert.ok(existsSync(dosya), `${slug}.${uzanti} eksik`);
      const meta = await sharp(dosya).metadata();
      assert.equal(meta.width, 720, `${slug}.${uzanti}: genişlik 720 değil`);
      assert.equal(meta.height, 405, `${slug}.${uzanti}: yükseklik 405 değil`);
    }
  }
});

test('aynı fotoğraf iki rehberde kullanılmıyor', () => {
  const gorulen = new Map();
  for (const slug of sluglar) {
    const ozet = createHash('sha256')
      .update(readFileSync(path.join(KAPAK_DIZINI, `${slug}.webp`)))
      .digest('hex');
    assert.ok(!gorulen.has(ozet), `${slug} ile ${gorulen.get(ozet)} aynı kapağı kullanıyor`);
    gorulen.set(ozet, slug);
  }
});

test('ikonlu kapak üreticisi yeniden görsellerin üstüne yazamaz', () => {
  const paket = JSON.parse(readFileSync(path.join(KOK, 'package.json'), 'utf8'));
  assert.equal(paket.scripts['rehber-kapaklari'], undefined);
});

test('kart kapak URLleri eski CDN önbelleğini kıran fotoğraf sürümünü taşır', () => {
  const kart = readFileSync(path.join(KOK, 'src/components/RehberKartlari.tsx'), 'utf8');
  assert.match(kart, /\.avif\?v=rehber-fotograf-20260907/);
  assert.match(kart, /\.webp\?v=rehber-fotograf-20260907/);
});
