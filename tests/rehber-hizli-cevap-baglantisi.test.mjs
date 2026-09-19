import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

/*
  HIZLI CEVAP DA MARKDOWN YOLUNDAN GEÇİYOR

  Kusur: `hizliCevap` rehber sayfasında düz metin olarak çiziliyordu.
  Paragraflar `metniCiz` ile `[metin](/adres)` yazımını gerçek bağlantıya
  çeviriyordu ama hızlı cevap kutusu o yoldan geçmiyordu; canlıda
  `/rehber/burslar-hangi-aylarda-acilir` içinde
  `[KYK başvuruları](/rehber/kyk-burs-ve-kredi)` köşeli parantezleriyle
  ekranda duruyordu. Ölçüldü: 76 rehberin 12'si, toplam 14 bağlantı.

  Aynı kusur sık sorulanların cevabında da vardı (8 rehber, 8 bağlantı);
  ikisi de aynı çizicye bağlandığı için ikisi birlikte ölçülüyor.

  Bu test kaynakta "MetinCizimi çağrılıyor mu" diye bakmıyor — çağrı
  durup çizimin bozulduğu bir hâl mümkün. Gerçek `GuidePage` bileşeni
  `renderToStaticMarkup` ile çiziliyor ve ÇIKTIDAKİ kutular ölçülüyor:
  ham `](` sıfır, markdown'daki her adres gerçek bir `<a href>` olarak var.

  Çizim için esbuild gerekiyor çünkü kaynak TSX; ön render
  (`scripts/onrender.mjs`) da rehber verisini aynı yolla yüklüyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const BAGLANTI = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Hızlı cevap kutusu: "Kısa cevap" etiketinden sonraki tek paragraf. */
const KUTU = /Kısa cevap<\/p>.*?<p[^>]*>(.*?)<\/p>/s;
/** Sık sorulanlar: her `<details>`'in cevap paragrafı. */
const SSS_KUTUSU = /<\/summary><p[^>]*>(.*?)<\/p>/gs;

async function ciziciyiKur() {
  const giris = path.join(KOK, 'node_modules', '.cache', 'hizli-cevap-giris.tsx');
  const cikti = path.join(KOK, 'node_modules', '.cache', 'hizli-cevap-giris.mjs');
  fs.mkdirSync(path.dirname(giris), { recursive: true });
  fs.writeFileSync(
    giris,
    [
      "import React from 'react';",
      "import { renderToStaticMarkup } from 'react-dom/server';",
      "import { GuidePage } from '../../src/components/GuidePages';",
      "export { REHBERLER } from '../../src/data/rehberler';",
      'export const ciz = (slug) =>',
      '  renderToStaticMarkup(React.createElement(GuidePage, { slug, onNavigate: () => {} }));',
      '',
    ].join('\n')
  );

  const esbuild = await import('esbuild');
  await (esbuild.build || esbuild.default.build)({
    entryPoints: [giris],
    outfile: cikti,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    logLevel: 'silent',
    /* Bağımlılıklar Node'a bırakılıyor — React'in tek kopya kalması için. */
    packages: 'external',
  });

  return import(url.pathToFileURL(cikti).href + `?t=${Date.now()}`);
}

test('hızlı cevap ve SSS içindeki markdown bağlantıları gerçek <a href> olarak çiziliyor', async () => {
  const { REHBERLER, ciz } = await ciziciyiKur();

  const markdownli = (m) => /\]\(/.test(m || '');
  const hedefler = REHBERLER.filter(
    (r) => markdownli(r.hizliCevap) || (r.sss || []).some((s) => markdownli(s.cevap))
  );
  /*
    Kapsam boşalırsa test sessizce "geçer" duruma düşerdi. Ölçüm anında
    12 rehber vardı; sayı değişebilir ama sıfır olamaz — sıfırsa ya veri
    ya da bu testin varsayımı kaymıştır.
  */
  assert.ok(
    hedefler.length > 0,
    'markdown bağlantısı taşıyan rehber kalmadı; test artık bir şey ölçmüyor'
  );

  for (const r of hedefler) {
    const html = ciz(r.slug);
    const kutu = html.match(KUTU);
    assert.ok(kutu, `${r.slug}: hızlı cevap kutusu çizilmedi`);

    const govde = kutu[1];
    assert.equal(
      (govde.match(/\]\(/g) || []).length,
      0,
      `${r.slug}: hızlı cevapta ham markdown kaldı -> ${govde}`
    );

    baglantilariDogrula(r.slug, 'hızlı cevap', r.hizliCevap, govde);

    /* Sık sorulanların cevabı da aynı yoldan geçiyor. */
    const sssHtml = [...html.matchAll(SSS_KUTUSU)].map((m) => m[1]).join(' ');
    assert.equal(
      (sssHtml.match(/\]\(/g) || []).length,
      0,
      `${r.slug}: sık sorulanlarda ham markdown kaldı`
    );
    for (const s of r.sss || []) baglantilariDogrula(r.slug, 'SSS', s.cevap, sssHtml);
  }
});

function baglantilariDogrula(slug, yer, kaynak, html) {
  BAGLANTI.lastIndex = 0;
  let esles;
  while ((esles = BAGLANTI.exec(kaynak)) !== null) {
    const [, yazi, adres] = esles;
    assert.ok(
      html.includes(`href="${adres}"`),
      `${slug} (${yer}): "${yazi}" bağlantısı ${adres} adresine çizilmedi`
    );
    assert.ok(html.includes(`>${yazi}</a>`), `${slug} (${yer}): "${yazi}" bağlantı metni kayboldu`);
  }
}
