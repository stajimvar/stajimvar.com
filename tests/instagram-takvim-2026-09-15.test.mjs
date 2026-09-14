import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { aciklamaKur, paylasimSorunlari } from '../src/lib/instagram-paylasim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public', 'paylasim', 'setler.json');

const takvim = [
  ['2026-09-15-1230-cv-guclu-madde', '15 Eylül 2026 Salı • 12.30 • CV’de güçlü madde yazma'],
  ['2026-09-15-2030-ilan-okuma', '15 Eylül 2026 Salı • 20.30 • Staj ilanını doğru okuma'],
  ['2026-09-16-1230-star-cevabi', '16 Eylül 2026 Çarşamba • 12.30 • STAR yöntemiyle cevap verme'],
  ['2026-09-16-2030-basvuru-takibi', '16 Eylül 2026 Çarşamba • 20.30 • Başvuru sonrası doğru takip'],
  ['2026-09-17-1230-ilk-gun-hazirligi', '17 Eylül 2026 Perşembe • 12.30 • Stajın ilk gününe hazırlık'],
  ['2026-09-17-2030-yardim-isteme', '17 Eylül 2026 Perşembe • 20.30 • İş yerinde doğru yardım isteme'],
  ['2026-09-18-1230-linkedin-profil', '18 Eylül 2026 Cuma • 12.30 • Öğrenci LinkedIn profili'],
  ['2026-09-18-2030-haftalik-staj-gunlugu', '18 Eylül 2026 Cuma • 20.30 • Haftalık staj günlüğü'],
  ['2026-09-19-1230-portfoy-kaniti', '19 Eylül 2026 Cumartesi • 12.30 • Portföyde çalışma kanıtı'],
  ['2026-09-19-2030-ret-sonrasi', '19 Eylül 2026 Cumartesi • 20.30 • Staj reddinden sonra ilerleme'],
  ['2026-09-20-1230-basvuru-plani', '20 Eylül 2026 Pazar • 12.30 • Haftalık başvuru planı'],
  ['2026-09-20-2030-departman-kesfi', '20 Eylül 2026 Pazar • 20.30 • Sana uygun departmanı keşfetme'],
  ['2026-09-21-1230-cv-son-kontrol', '21 Eylül 2026 Pazartesi • 12.30 • CV için 10 saniyelik son kontrol'],
  ['2026-09-21-2030-tesekkur-mesaji', '21 Eylül 2026 Pazartesi • 20.30 • Mülakat sonrası teşekkür mesajı'],
];

test('panelin ilk 14 sırasında 15-21 Eylül gönderileri değişmeden kalır', () => {
  const setler = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(setler.length >= 14);
  assert.deepEqual(setler.slice(0, 14).map(({ kod, ad }) => [kod, ad]), takvim);
  assert.equal(new Set(setler.slice(0, 14).map((set) => set.ad)).size, 14);
});

test('her planlı gönderi dört paylaşılabilir JPEG kart ve eksiksiz metin içerir', async () => {
  const setler = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const [kod] of takvim) {
    const set = setler.find((item) => item.kod === kod);
    assert.ok(set, `${kod} panelde bulunmalı`);
    assert.equal(set.kartlar.length, 4);
    assert.ok(set.metin.length >= 240, `${kod} açıklaması yeterli olmalı`);
    assert.ok(set.etiketler.length >= 6 && set.etiketler.length <= 8);
    assert.deepEqual(
      paylasimSorunlari(
        {
          gorseller: set.kartlar.map((asset) => `https://stajimvar.com${asset}`),
          aciklama: aciklamaKur(set.metin, set.etiketler),
        },
        'stajimvar.com',
      ),
      [],
    );

    for (const asset of set.kartlar) {
      const dosya = path.join(root, 'public', asset);
      assert.ok(fs.existsSync(dosya), `${asset} bulunmalı`);
      const bilgi = await sharp(dosya).metadata();
      assert.equal(bilgi.format, 'jpeg');
      assert.equal(bilgi.width, 1440);
      assert.equal(bilgi.height, 1920);
    }
  }
});
