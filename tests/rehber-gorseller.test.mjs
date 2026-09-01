import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  GÖRSEL REHBER REGRESYONU

  Amaç: görselin dekorasyon değil BİLGİ olması ve metnin görselin içine
  hapsolmaması. Bir örneği ekran görüntüsü olarak koymak, öğrencinin onu
  kopyalamasını engellemek demek.

  Ölçüm notu: rehber blokları `slug: '...'` + `konu:` ikilisiyle
  ayrılıyor. Yalnız `slug:` ile ayırmak yanlış bloklar üretiyordu —
  ilk denemede beş rehberin de "görsel bileşeni yok" görünmesine yol
  açtı, oysa ikisi zaten görselliydi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
/*
  CRLF NORMALLEŞTİRİLİYOR

  Depoda satır sonları Windows'ta CRLF'e dönüyor; blok ayırıcı satır
  sonuyla yazılınca hiçbir rehber bulunamıyor ve test sessizce
  "görsel yok" diyordu (ölçüldü).
*/
const KAYNAK = readFileSync(path.join(KOK, 'src/data/rehberler.tsx'), 'utf8').replace(
  /\r\n/g,
  '\n'
);
const GORSELLER = readFileSync(
  path.join(KOK, 'src/components/RehberGorseller.tsx'),
  'utf8'
);

const HEDEF = [
  'staj-nasil-bulunur',
  'staj-cv-nasil-yazilir',
  'staj-basvuru-epostasi',
  'staj-mulakati',
  'zorunlu-staj-rehberi',
];

function rehberGovdesi(slug) {
  const konum = [...KAYNAK.matchAll(/slug: '([^']+)',\n {4}konu:/g)].map((m) => ({
    slug: m[1],
    i: m.index,
  }));
  const k = konum.findIndex((x) => x.slug === slug);
  assert.ok(k >= 0, `${slug} bulunamadı`);
  return KAYNAK.slice(konum[k].i, k + 1 < konum.length ? konum[k + 1].i : KAYNAK.length);
}

function bilesenSayisi(govde, ad) {
  return (govde.match(new RegExp(`<${ad}\\b`, 'g')) || []).length;
}

/* ------------------------- her hedef rehberde görsel anlatım var */

for (const slug of HEDEF) {
  test(`${slug}: en az iki görsel anlatım bloğu var`, () => {
    const govde = rehberGovdesi(slug);
    const toplam = [
      'Akis',
      'Karsilastirma',
      'KarsilastirmaTablosu',
      'KontrolListesi',
      'RehberOrnek',
      'EpostaOrnegi',
      'CvIskeleti',
    ].reduce((a, b) => a + bilesenSayisi(govde, b), 0);
    assert.ok(toplam >= 2, `${slug}: yalnız ${toplam} görsel blok`);
  });
}

test('C: karşılaştırma mobilde alt alta diziliyor', () => {
  /* Tek sütun varsayılan, iki sütun yalnız sm ve üstünde. */
  assert.match(GORSELLER, /grid-cols-1 sm:grid-cols-2/);
});

test('D: kontrol listesi semantik liste', () => {
  const blok = GORSELLER.slice(GORSELLER.indexOf('export const KontrolListesi'));
  assert.match(blok.slice(0, 900), /<ul/);
  assert.match(blok.slice(0, 900), /<li/);
});

test('E: akış adımları sıralı liste ve etiketli', () => {
  const blok = GORSELLER.slice(GORSELLER.indexOf('export const Akis'));
  assert.match(blok.slice(0, 900), /<ol/);
});

test('F: örnek metin kopyalanabilir — görsele gömülü değil', () => {
  const blok = GORSELLER.slice(GORSELLER.indexOf('export const RehberOrnek'));
  assert.match(blok.slice(0, 2000), /<pre/, 'örnek metin HTML içinde olmalı');
  assert.match(blok.slice(0, 2000), /clipboard\.writeText/);
});

test('A: figür bileşenleri figure/figcaption kullanıyor', () => {
  for (const ad of ['RehberOrnek', 'EpostaOrnegi', 'CvIskeleti']) {
    const blok = GORSELLER.slice(GORSELLER.indexOf(`export const ${ad}`));
    assert.match(blok.slice(0, 2500), /<figure/, `${ad}: figure yok`);
    assert.match(blok.slice(0, 2500), /figcaption/, `${ad}: figcaption yok`);
  }
});

test('e-posta maketi alanları etiketli (ekran okuyucu)', () => {
  const blok = GORSELLER.slice(GORSELLER.indexOf('export const EpostaOrnegi'));
  assert.match(blok.slice(0, 2000), /<dl/);
  assert.match(blok.slice(0, 2000), /<dt/);
  assert.match(blok.slice(0, 2000), /Kime/);
  assert.match(blok.slice(0, 2000), /Konu/);
});

test('B/29: renk tek bilgi taşıyıcısı değil — ikon ve başlık da var', () => {
  const blok = GORSELLER.slice(
    GORSELLER.indexOf('export const Karsilastirma'),
    GORSELLER.indexOf('export const KontrolListesi')
  );
  assert.match(blok, /kotuBaslik/);
  assert.match(blok, /iyiBaslik/);
  assert.match(blok, /<X /, 'kötü tarafta ikon olmalı');
  assert.match(blok, /<Check /, 'iyi tarafta ikon olmalı');
});

/* ------------------------ stok fotoğraf ve sahte kişi yok */

test('30: stok fotoğraf yok — görseller kodla çizilmiş', () => {
  assert.doesNotMatch(GORSELLER, /unsplash|pexels|shutterstock|istockphoto/i);
  assert.doesNotMatch(GORSELLER, /<img\s/, 'rehber görselleri bitmap değil');
});

test('N: örneklerde uydurma kişi verisi yok', () => {
  const eposta = rehberGovdesi('staj-basvuru-epostasi');
  const cv = rehberGovdesi('staj-cv-nasil-yazilir');
  /* Yer tutucular köşeli parantezli; gerçek ad/telefon yazılmıyor. */
  assert.match(eposta, /\[Ad Soyad\]/);
  assert.match(cv, /\[Ad Soyad\]/);
  assert.doesNotMatch(eposta, /\b05\d{2}[\s-]?\d{3}/, 'gerçek telefon biçimi yazılmamalı');
});

/* ---------------------------- M: iddia güvenliği korunuyor */

test('M: ölçülmemiş üstünlük iddiası geri gelmedi', () => {
  assert.doesNotMatch(KAYNAK, /En çok işe yarayan ama en az denenen/);
  assert.doesNotMatch(KAYNAK, /staj bulmanın en çok işe yarayan yolu/i);
});

test('M2: zorunlu staj akışı okula göre değişebildiğini söylüyor', () => {
  const govde = rehberGovdesi('zorunlu-staj-rehberi');
  assert.match(govde, /her üniversitede aynı değil/i);
  assert.match(govde, /kendi bölümünün staj yönergesi/i);
});

/* ------------------------ L: reklam editoryal bloğu bölmüyor */

test('L: reklam yuvası içeriğin sonunda, blokların arasında değil', () => {
  const rehberSayfasi = readFileSync(path.join(KOK, 'src/components/GuidePages.tsx'), 'utf8');
  const yuva = rehberSayfasi.indexOf('<GoogleAdBanner');
  const govdeCizimi = rehberSayfasi.indexOf('rehber.icerik');
  assert.ok(yuva > 0, 'rehberde reklam yuvası olmalı');
  assert.ok(
    govdeCizimi > 0 && yuva > govdeCizimi,
    'reklam gövdeden SONRA gelmeli; editoryal bloğu bölmemeli'
  );
});

/* ------------------------------- N: Auto Ads owner durumu */

test('N: Auto Ads durumu dokümante edilmiş', () => {
  const ayar = readFileSync(path.join(KOK, 'reklam.json'), 'utf8');
  assert.match(ayar, /Auto Ads/i, 'Auto Ads durumu reklam.json içinde yazılı olmalı');
});
