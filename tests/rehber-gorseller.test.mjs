import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { rehberBloklari } from '../scripts/rehber-sayimi.mjs';

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

/*
  Rehberler iki yerde yaşıyor: elle yazılan JSX (`rehberler.tsx`) ve veriyle
  çizilen `metinRehberi` yazıları (`rehber-yazilari/*.tsx`). Görsel kuralları
  ikisi için de geçerli, o yüzden hepsi taranıyor.
*/
const REHBER_KAYNAKLARI = [
  KAYNAK,
  ...readdirSync(path.join(KOK, 'src/data/rehber-yazilari'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) =>
      readFileSync(path.join(KOK, 'src/data/rehber-yazilari', f), 'utf8').replace(/\r\n/g, '\n')
    ),
];

/** İki yazımda da geçen figür adresleri: `kaynak="..."` ve `kaynak: '...'`. */
const FIGUR_KAYNAKLARI = REHBER_KAYNAKLARI.flatMap((s) => [
  ...[...s.matchAll(/kaynak="([^"]+)"/g)].map((m) => m[1]),
  ...[...s.matchAll(/kaynak: '([^']+)'/g)].map((m) => m[1]),
]).filter((y) => y.startsWith('/rehber-gorseller/'));

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

test('30: stok fotoğraf yok — görseller kendi ürettiğimiz varlıklar', () => {
  for (const dosya of [GORSELLER, KAYNAK]) {
    assert.doesNotMatch(dosya, /unsplash|pexels|shutterstock|istockphoto|freepik/i);
  }
  /*
    Tek <img> geçidi RehberFigur; başka bileşen doğrudan img basmıyor.
    Böylece görsel kaynağı, alt metni ve boyut zorunluluğu tek yerde kalıyor.
  */
  const imgler = [...GORSELLER.matchAll(/<img\s/g)];
  assert.equal(imgler.length, 1, 'img yalnız RehberFigur içinde olmalı');
  const figur = GORSELLER.slice(GORSELLER.indexOf('export const RehberFigur'));
  assert.match(figur.slice(0, 1200), /<img\s/, 'img RehberFigur içinde değil');
});

test('30b: rehber görselleri yerel SVG — dış barındırıcı yok', () => {
  assert.ok(FIGUR_KAYNAKLARI.length >= 11, `yalnız ${FIGUR_KAYNAKLARI.length} figür var`);
  for (const yol of FIGUR_KAYNAKLARI) {
    assert.match(yol, /^\/rehber-gorseller\/[a-z0-9-]+\.svg$/, `${yol}: yerel SVG olmalı`);
    const tam = path.join(KOK, 'public', yol.replace(/^\//, ''));
    const svg = readFileSync(tam, 'utf8');
    assert.match(svg, /<svg\b/, `${yol}: SVG değil`);
    assert.doesNotMatch(svg, /<image\b|xlink:href|<script/i, `${yol}: gömülü bitmap ya da script`);
    assert.match(svg, /role="img"/, `${yol}: role="img" yok`);
    assert.match(svg, /aria-label="/, `${yol}: aria-label yok`);
  }
});

test('30c: her figürün alt metni ve boyutu var (CLS)', () => {
  const jsx = [...REHBER_KAYNAKLARI.join('\n').matchAll(/<RehberFigur[\s\S]*?\/>/g)].map(
    (m) => m[0]
  );
  assert.ok(jsx.length >= 7, `yalnız ${jsx.length} JSX RehberFigur kullanımı`);
  for (const f of jsx) {
    assert.match(f, /alt="[^"]{40,}"/, 'alt metni açıklayıcı olmalı');
    assert.match(f, /genislik=\{\d+\}/, 'genislik yok — yer ayrılmıyor');
    assert.match(f, /yukseklik=\{\d+\}/, 'yukseklik yok — yer ayrılmıyor');
  }

  /* `metinRehberi` ile yazılan rehberlerde figür bir veri anahtarı. */
  const veri = [...REHBER_KAYNAKLARI.join('\n').matchAll(/figur: \{[\s\S]*?\n {8}\}/g)].map(
    (m) => m[0]
  );
  assert.ok(veri.length >= 3, `yalnız ${veri.length} veri figürü`);
  for (const f of veri) {
    assert.match(f, /genislik: \d+/, 'genislik yok — yer ayrılmıyor');
    assert.match(f, /yukseklik: \d+/, 'yukseklik yok — yer ayrılmıyor');
    const alt = /alt:\s*([\s\S]*?)\n\s{10}[a-z]/.exec(f);
    assert.ok(alt && alt[1].length > 40, 'alt metni açıklayıcı olmalı');
  }
});

/* ------------------------------------- eager/lazy ve preload politikası */

test('30f: rehber başına en fazla bir eager görsel', () => {
  /*
    İlk turda dört rehberde `gecikmeli={false}` vardı; ölçüm hiçbirinin
    ilk ekranda olmadığını gösterdi (telefonda üst kenar 743–1817px,
    masaüstünde 695px). Eager verilen görsel ön render çıktısına ayrıca
    preload düşürüp gerçek LCP ile yarışıyor.
  */
  for (const kaynak of REHBER_KAYNAKLARI) {
    for (const { slug, govde } of rehberBloklari(kaynak)) {
      const eager =
        (govde.match(/gecikmeli=\{false\}/g) || []).length +
        (govde.match(/gecikmeli: false/g) || []).length;
      assert.ok(eager <= 1, `${slug}: ${eager} eager görsel — en fazla bir tane olabilir`);
    }
  }
});

test('30g: ön render çıktısında gereksiz görsel preload yok', () => {
  /* Derleme yapılmadıysa test atlanmıyor, sessizce geçiyor: CI'da build var. */
  const dizin = path.join(KOK, 'dist/rehber');
  if (!existsSync(dizin)) return;
  for (const ad of readdirSync(dizin).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(path.join(dizin, ad), 'utf8');
    const preload = (html.match(/rel="preload" as="image"[^>]*rehber-gorseller/g) || []).length;
    assert.ok(preload <= 1, `${ad}: ${preload} görsel preload`);
  }
});

test('30d: zorunlu staj görseli okula göre değişkenliği yazıyor', () => {
  const svg = readFileSync(
    path.join(KOK, 'public/rehber-gorseller/zorunlu-staj-sureci.svg'),
    'utf8'
  );
  assert.match(svg, /Üniversitene göre süreç değişebilir\./);
});

test('30e: kanal görseli sıralama iddiası taşımıyor', () => {
  const svg = readFileSync(
    path.join(KOK, 'public/rehber-gorseller/staj-bulma-kanallari.svg'),
    'utf8'
  );
  assert.match(svg, /sıralama değil/i, 'kanalların sıralama olmadığı görselde yazmalı');
  assert.doesNotMatch(svg, /en iyi|en etkili|en çok işe yarayan/i);
});

/* ------------------------------------ görsel varlıklar eskimeye dayanıklı */

function svgOku(ad) {
  return readFileSync(path.join(KOK, 'public/rehber-gorseller', ad), 'utf8');
}

test('31: görsellere eskiyecek veri gömülmemiş', () => {
  /*
    Bir görsel dosyası metin kadar kolay güncellenmiyor: içine yazılan
    tutar, tarih ya da mevzuat maddesi değiştiğinde bütün varlık eskiyor.
    Bu yüzden değişken bilgi HTML'de kalıyor, SVG'de kavram duruyor.
  */
  for (const ad of readdirSync(path.join(KOK, 'public/rehber-gorseller'))) {
    const svg = svgOku(ad);
    /* Adresler (xmlns="…/2000/svg") ve yorumlar okunan metin değil. */
    const govde = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/https?:\/\/\S+/g, '');
    assert.doesNotMatch(govde, /\b(19|20)\d{2}\b/, `${ad}: yıl yazılı`);
    assert.doesNotMatch(govde, /₺|\bTL\b|\bLira\b/i, `${ad}: para tutarı yazılı`);
    assert.doesNotMatch(govde, /\bmadde\s*\d|sayılı Kanun|\b\d{4} sayılı\b/i, `${ad}: mevzuat maddesi`);
  }
});

/* ------------------------------------------- ikinci turun iddia güvenliği */

test('32: ölçülmemiş rekabet iddiası staj-nasil-bulunur’da yok', () => {
  const govde = rehberGovdesi('staj-nasil-bulunur');
  for (const kalip of [
    /aday sayısı da az/i,
    /rekabet neredeyse sıfır/i,
    /en az denenen/i,
    /düşük rekabet/i,
  ]) {
    assert.doesNotMatch(govde, kalip, `ölçülmemiş rekabet iddiası: ${kalip}`);
  }
  assert.match(govde, /garanti değil/i, 'belirsizlik açıkça söylenmeli');
});

test('33: sigorta görseli kesin hukuki sonuç üretmiyor', () => {
  const svg = svgOku('staj-sigortasi-karar-agaci.svg');
  assert.match(svg, /genellikle okul/i, 'kesinlik değil eğilim yazmalı');
  assert.match(svg, /yönerge/i, 'doğrulama adresi görselde olmalı');
  for (const kalip of [/her zorunlu stajda/i, /mutlaka/i, /her üniversitede/i, /kesinlikle/i]) {
    assert.doesNotMatch(svg, kalip, `blanket iddia: ${kalip}`);
  }
});

test('34: belge görseli okula göre değişkenliği yazıyor', () => {
  assert.match(svgOku('staj-belge-dosyasi.svg'), /üniversitene göre değişebilir/i);
});

test('35: yurt dışı yol haritası vize belirsizliğini yazıyor', () => {
  const svg = svgOku('yurtdisi-staj-yol-haritasi.svg');
  assert.match(svg, /ülkeye\/programa göre değişebilir/i);
});

test('36: yurt dışı kanalları sıralama değil', () => {
  const svg = svgOku('yurtdisi-staj-kanallari.svg');
  assert.match(svg, /sıralama değil/i);
  assert.doesNotMatch(svg, /en iyi|en kolay|en avantajlı/i);
});

test('37: sorun karar ağacı acil durumları sıraya sokmuyor', () => {
  const svg = svgOku('stajda-sorun-karar-agaci.svg');
  assert.match(svg, /sıra beklemez/i, 'acil şerit ayrı olmalı');
  /*
    Türkçe büyük İ tuzağı: JS'in `i` bayrağı U+0130'u 'i' ile eşleştirmiyor,
    o yüzden kalıplar iki harfi de açıkça sayıyor.
  */
  for (const konu of [/[Tt]aciz/, /[Aa]yrımcılık/, /[İi]ş güvenliği/]) {
    assert.match(svg, konu, `acil şeritte eksik: ${konu}`);
  }
  /* Acil durumlar "önce sorumlunla konuş" adımının altına düşmemeli. */
  const acil = svg.search(/sıra beklemez/i);
  const konus = svg.search(/Sorumlunla konuş/i);
  assert.ok(acil > 0 && konus > acil, 'acil şerit konuşma adımından önce gelmeli');
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
