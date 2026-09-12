import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { aciklamaKur, paylasimSorunlari } from '../src/lib/instagram-paylasim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public', 'paylasim', 'setler.json');

const beklenenler = [
  {
    kod: 'ilana-gore-cv',
    ad: 'CV’ni ilana göre uyarlamanın 3 adımı — fotoğraflı taslak',
    metinKanitlari: [/ilanın dilini/i, /kanıt/i, /anahtar kelime/i],
  },
  {
    kod: 'kendinden-bahset-cevabi',
    ad: '“Kendinden bahset” sorusuna net cevap — fotoğraflı taslak',
    metinKanitlari: [/şu an/i, /geçmiş/i, /bu rol/i],
  },
  {
    kod: 'online-mulakat-kontrolu',
    ad: 'Online mülakat öncesi 10 dakikalık kontrol — fotoğraflı taslak',
    metinKanitlari: [/kamera/i, /mikrofon/i, /bağlantı/i],
  },
  {
    kod: 'motivasyon-yazisi',
    ad: 'Motivasyon yazısının 3 güçlü bölümü — fotoğraflı taslak',
    metinKanitlari: [/neden bu kurum/i, /katkı/i, /örnek/i],
  },
  {
    kod: 'staj-teklifi-degerlendirme',
    ad: 'Staj teklifini değerlendirirken 5 kontrol — fotoğraflı taslak',
    metinKanitlari: [/görev/i, /rehberlik/i, /koşul/i],
  },
  {
    kod: 'ilk-hafta-ogrenme-hedefi',
    ad: 'Stajın ilk haftası için öğrenme hedefi — fotoğraflı taslak',
    metinKanitlari: [/gözlem/i, /uygulama/i, /geri bildirim/i],
  },
];

for (const beklenen of beklenenler) {
  test(`${beklenen.kod} yönetici paneline dört kartlık taslak olarak eklenir`, async () => {
    const setler = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const set = setler.find((item) => item.kod === beklenen.kod);

    assert.ok(set, `${beklenen.kod} setler.json içinde yer almalı`);
    assert.equal(set.ad, beklenen.ad);
    assert.equal(set.surum, 'v1');
    assert.equal(set.kartlar.length, 4);
    assert.deepEqual(
      set.kartlar,
      [1, 2, 3, 4].map((no) => `/paylasim/${beklenen.kod}/0${no}-v1.jpg`),
    );
    for (const kanit of beklenen.metinKanitlari) assert.match(set.metin, kanit);

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

      const istatistik = await sharp(dosya).stats();
      const ortalamaAydinlik = istatistik.channels
        .slice(0, 3)
        .reduce((toplam, kanal) => toplam + kanal.mean, 0) / 3;
      assert.ok(
        ortalamaAydinlik >= 135,
        `${asset} aydınlık tasarım eşiğini geçmeli; ölçülen ${ortalamaAydinlik.toFixed(1)}`,
      );
    }
  });
}

test('yeni altı postun başlıkları paneldeki diğer setlerle tekrar etmez', () => {
  const setler = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const adlar = setler.map((set) => set.ad.toLocaleLowerCase('tr-TR'));
  assert.equal(new Set(adlar).size, adlar.length);
});
