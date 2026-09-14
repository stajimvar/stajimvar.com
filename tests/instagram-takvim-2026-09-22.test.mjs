import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { aciklamaKur, paylasimSorunlari } from '../src/lib/instagram-paylasim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public', 'paylasim', 'setler.json');
const oncekiKodlar = [
  '2026-09-15-1230-cv-guclu-madde', '2026-09-15-2030-ilan-okuma',
  '2026-09-16-1230-star-cevabi', '2026-09-16-2030-basvuru-takibi',
  '2026-09-17-1230-ilk-gun-hazirligi', '2026-09-17-2030-yardim-isteme',
  '2026-09-18-1230-linkedin-profil', '2026-09-18-2030-haftalik-staj-gunlugu',
  '2026-09-19-1230-portfoy-kaniti', '2026-09-19-2030-ret-sonrasi',
  '2026-09-20-1230-basvuru-plani', '2026-09-20-2030-departman-kesfi',
  '2026-09-21-1230-cv-son-kontrol', '2026-09-21-2030-tesekkur-mesaji',
];

const ikinciHafta = [
  ['2026-09-22-1230-hedef-sirket-listesi', '22 Eylül 2026 Salı • 12.30 • Hedef şirket listesi oluşturma'],
  ['2026-09-22-2030-beceri-ogrenme-plani', '22 Eylül 2026 Salı • 20.30 • İlandaki beceri için öğrenme planı'],
  ['2026-09-23-1230-basvuru-dosyalari', '23 Eylül 2026 Çarşamba • 12.30 • Başvuru dosyalarını düzenleme'],
  ['2026-09-23-2030-kariyer-merkezi', '23 Eylül 2026 Çarşamba • 20.30 • Kariyer merkezinden yararlanma'],
  ['2026-09-24-1230-kulup-deneyimi', '24 Eylül 2026 Perşembe • 12.30 • Kulüp deneyimini CV’ye çevirme'],
  ['2026-09-24-2030-gonulluluk-deneyimi', '24 Eylül 2026 Perşembe • 20.30 • Gönüllülük deneyimini anlatma'],
  ['2026-09-25-1230-mini-proje', '25 Eylül 2026 Cuma • 12.30 • Staj için mini proje seçme'],
  ['2026-09-25-2030-teknik-gorev', '25 Eylül 2026 Cuma • 20.30 • Teknik değerlendirme görevini planlama'],
  ['2026-09-26-1230-bilmiyorum-cevabi', '26 Eylül 2026 Cumartesi • 12.30 • Mülakatta bilmediğin soruya cevap'],
  ['2026-09-26-2030-grup-mulakati', '26 Eylül 2026 Cumartesi • 20.30 • Grup mülakatında görünür olma'],
  ['2026-09-27-1230-sirket-arastirmasi', '27 Eylül 2026 Pazar • 12.30 • 15 dakikada şirket araştırması'],
  ['2026-09-27-2030-referans-isteme', '27 Eylül 2026 Pazar • 20.30 • Staj için referans isteme'],
  ['2026-09-28-1230-ucret-konusmasi', '28 Eylül 2026 Pazartesi • 12.30 • Staj ücretini ve koşulları sorma'],
  ['2026-09-28-2030-haftalik-dersler', '28 Eylül 2026 Pazartesi • 20.30 • Başvurulardan haftalık ders çıkarma'],
];

test('ikinci hafta önceki 14 gönderiyi koruyup sırasıyla ekleniyor', () => {
  /*
    TOPLAM UZUNLUK İDDİASI KALDIRILDI

    Bu test `setler.length === 28` ve `slice(14)` ile manifestin TAM
    28 set olduğunu varsayıyordu. Takvime üçüncü ve dördüncü hafta
    eklendi (36 set) ve `slice(14)` 14 yerine 22 kayıt döndürdüğü için
    kırıldı — takvime set eklemek dağıtımı kilitliyordu.

    Bu testin işi ikinci haftanın DOĞRU ve SIRASIYLA eklendiğini
    ölçmek; manifestin toplam boyu onun işi değil. Sonraki haftalar
    aşağıdaki pencerenin dışında kalıyor ve bu testi ilgilendirmiyor.
  */
  const setler = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(setler.length >= oncekiKodlar.length + ikinciHafta.length);

  /* Birinci hafta başta ve bozulmamış. */
  assert.deepEqual(setler.slice(0, oncekiKodlar.length).map((set) => set.kod), oncekiKodlar);

  /* İkinci hafta hemen ardından, aynı sırayla. */
  assert.deepEqual(
    setler
      .slice(oncekiKodlar.length, oncekiKodlar.length + ikinciHafta.length)
      .map(({ kod, ad }) => [kod, ad]),
    ikinciHafta
  );

  /* Kod ve ad bütün manifestte tekil: mükerrer set yok. */
  assert.equal(new Set(setler.map((set) => set.kod)).size, setler.length, 'kodlar tekil olmalı');
  assert.equal(new Set(setler.map((set) => set.ad)).size, setler.length, 'adlar tekil olmalı');
});

test('ikinci haftadaki 14 gönderinin dört paylaşılabilir JPEG kartı vardır', async () => {
  const setler = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const [kod] of ikinciHafta) {
    const set = setler.find((item) => item.kod === kod);
    assert.ok(set, `${kod} panelde bulunmalı`);
    assert.equal(set.kartlar.length, 4);
    assert.ok(set.metin.length >= 240);
    assert.ok(set.etiketler.length >= 6 && set.etiketler.length <= 8);
    assert.deepEqual(
      paylasimSorunlari({
        gorseller: set.kartlar.map((asset) => `https://stajimvar.com${asset}`),
        aciklama: aciklamaKur(set.metin, set.etiketler),
      }, 'stajimvar.com'),
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
