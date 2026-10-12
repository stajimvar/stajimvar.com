import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/*
  ÖĞRENCİ REHBERLERİ — BÖLÜM GÖRSELLERİ (12 Ekim 2026)

  İlk 25 öğrenci rehberine dörder temsili fotoğraf: teslim paketi
  `assets/ogrenci-rehber-ilk-100-20261011` (manifest.json). Siteye yalnız
  web/ altındaki AVIF + WebP çiftleri girdi; özgün PNG'ler girmedi.
  Fotoğraf metnin yerine geçmiyor: başlığın altında (ya da bölümün
  sonunda) kısa başlık + tek cümlelik özetle duruyor; şemalar, listeler,
  kaynaklar ve bağlantılar yerinde. Kapaklar ve diğer 46 öğrenci rehberi
  değişmedi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const DIZIN = path.join(KOK, 'public', 'rehber-gorselleri', 'ogrenci');
const kaynak = JSON.parse(readFileSync(path.join(DIZIN, 'kaynak.json'), 'utf8'));

const REHBERLER = [
  'zorunlu-staj-rehberi', 'staj-cv-nasil-yazilir', 'staj-mulakati', 'staj-basvuru-epostasi',
  'staj-defteri-nasil-doldurulur', 'kyk-burs-ve-kredi', 'staj-nasil-bulunur', 'gonullu-staj-rehberi',
  'universite-staj-birimi', 'stajdan-ise-gecis', 'yurtdisinda-staj', 'staj-sigortasi-kim-yapar',
  'staj-ucreti-nasil-hesaplanir', 'staj-basvurusu-gerekli-belgeler', 'ilan-acmayan-sirkete-nasil-yazilir',
  'stajda-izin-ve-devamsizlik', 'uzaktan-staj-kabul-edilir-mi', 'stajyerin-gorev-ve-sorumluluklari',
  'kotu-gecen-stajda-ne-yapilir', 'ats-uyumlu-cv', 'cvde-proje-nasil-anlatilir', 'on-yazi-nasil-yazilir',
  'portfolyo-nasil-hazirlanir', 'linkedin-profili-nasil-duzenlenir', 'online-mulakat',
];

const KAYNAK_DOSYALARI = [
  'src/data/rehberler.tsx',
  ...readdirSync(path.join(KOK, 'src/data/rehber-yazilari'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `src/data/rehber-yazilari/${f}`),
];

/** Tüm rehber dilimleri: slug → kaynak metni (slug satırından bir sonrakine). */
function dilimler() {
  const sonuc = {};
  for (const dosya of KAYNAK_DOSYALARI) {
    const t = oku(dosya);
    const konumlar = [...t.matchAll(/\n {4}slug: '([^']+)',/g)].map((m) => [m[1], m.index]);
    konumlar.forEach(([slug, bas], i) => {
      sonuc[slug] = { dosya, metin: t.slice(bas, i + 1 < konumlar.length ? konumlar[i + 1][1] : t.length) };
    });
  }
  return sonuc;
}

/** Dilimdeki öğrenci fotoğrafları, sayfadaki sırayla: { dosya, alt, baslik, ozet }. */
function fotograflar(metin) {
  const jsx = [...metin.matchAll(/<OgrenciBolumGorseli\s+dosya="([^"]+)"\s+baslik="([^"]+)"\s+ozet="([^"]+)"\s+alt="([^"]+)"\s*\/>/g)]
    .map((m) => ({ i: m.index, dosya: m[1], baslik: m[2], ozet: m[3], alt: m[4] }));
  const veri = [...metin.matchAll(/bolumFotografi2?: \{\s*dosya: '([^']+)',\s*baslik: '([^']+)',\s*ozet: '([^']+)',\s*gorselAlt: '([^']+)',/g)]
    .map((m) => ({ i: m.index, dosya: m[1], baslik: m[2], ozet: m[3], alt: m[4] }));
  return [...jsx, ...veri].sort((a, b) => a.i - b.i);
}

test('100 fotoğrafın AVIF + WebP çifti ve kaynak kaydı var; özgün PNG yok', () => {
  const idler = Object.keys(kaynak).sort();
  assert.equal(idler.length, 100);
  for (const id of idler) {
    for (const uzanti of ['avif', 'webp']) {
      assert.ok(existsSync(path.join(DIZIN, `${id}.${uzanti}`)), `${id}.${uzanti}`);
    }
    const k = kaynak[id];
    assert.equal(k.etiket, 'Temsili görsel');
    assert.equal(k.tur, 'ai-photorealistic');
    assert.equal(k.lisans, 'generated');
    assert.equal(k.genislik, 1280);
    assert.equal(k.yukseklik, 720);
    assert.match(k.ozgunSha256, /^[0-9a-f]{64}$/);
    assert.ok(REHBERLER.includes(k.rehber), `${id}: bilinmeyen rehber`);
    assert.ok(id.includes(k.rehber), `${id}: dosya adı rehberle uyuşmuyor`);
  }
  const dosyalar = readdirSync(DIZIN);
  assert.equal(dosyalar.filter((f) => /\.png$/i.test(f)).length, 0, 'özgün PNG siteye girmemeli');
  assert.equal(dosyalar.length, 201, '100 × (avif + webp) + kaynak.json');
});

test('25 rehberin her birinde dört farklı ve doğru fotoğraf; alt metin kayıtla aynı', () => {
  const d = dilimler();
  const kullanilan = new Set();
  for (const slug of REHBERLER) {
    assert.ok(d[slug], `${slug} bulunamadı`);
    const f = fotograflar(d[slug].metin);
    assert.equal(f.length, 4, `${slug}: ${f.length} fotoğraf`);
    assert.equal(new Set(f.map((x) => x.dosya)).size, 4, `${slug}: aynı fotoğraf iki kez`);
    for (const x of f) {
      assert.equal(kaynak[x.dosya]?.rehber, slug, `${x.dosya}: başka rehberin fotoğrafı`);
      assert.equal(x.alt, kaynak[x.dosya].alt, `${x.dosya}: alt metin kayıtla aynı değil`);
      assert.ok(x.alt.length >= 40, `${x.dosya}: alt metin sahneyi anlatmıyor`);
      assert.ok(x.baslik.length > 3 && x.ozet.length > 20, `${x.dosya}: başlık/özet eksik`);
      assert.ok(!kullanilan.has(x.dosya), `${x.dosya} iki rehberde`);
      kullanilan.add(x.dosya);
    }
  }
  assert.equal(kullanilan.size, 100);
});

test('diğer öğrenci rehberlerinde ve işveren rehberlerinde öğrenci fotoğrafı yok', () => {
  const d = dilimler();
  for (const [slug, { metin }] of Object.entries(d)) {
    if (REHBERLER.includes(slug)) continue;
    assert.equal(fotograflar(metin).length, 0, `${slug}: dokunulmaması gereken rehberde fotoğraf`);
    assert.doesNotMatch(metin, /OgrenciBolumGorseli|bolumFotografi/, slug);
  }
});

test('altyazılar ücret, tutar ya da kesinlik iddiası taşımıyor', () => {
  const d = dilimler();
  for (const slug of REHBERLER) {
    for (const x of fotograflar(d[slug].metin)) {
      const metin = `${x.baslik} ${x.ozet} ${x.alt}`;
      assert.doesNotMatch(metin, /\d+[.,]?\d*\s*(TL|₺|lira)|%\s*\d|\d+\s*%/i, `${x.dosya}: tutar/oran`);
      assert.doesNotMatch(metin, /\b(garanti|kesinlikle|her zaman)\b/i, `${x.dosya}: kesinlik iddiası`);
    }
  }
});

test('fotoğraf bileşeni: picture + AVIF/WebP, ölçü, sizes, lazy, "Temsili görsel", oran korunuyor', () => {
  const bolum = oku('src/components/RehberBolum.tsx');
  const b = bolum.slice(bolum.indexOf('export const OgrenciBolumGorseli'), bolum.indexOf('export const SadeAyrinti'));
  assert.match(b, /<picture/);
  assert.match(b, /type="image\/avif"/);
  assert.match(b, /\/rehber-gorselleri\/ogrenci\/\$\{dosya\}\.avif/);
  assert.match(b, /\/rehber-gorselleri\/ogrenci\/\$\{dosya\}\.webp/);
  assert.match(b, /loading="lazy"/);
  assert.match(b, /width=\{1280\}\s*height=\{720\}/);
  assert.match(b, /sizes=\{OGRENCI_BOYUTLARI\}/);
  assert.match(b, /aspect-video h-auto w-full/);
  assert.match(b, /Temsili görsel/);
  assert.match(b, /alt=\{alt\}/);
  assert.match(b, /<figcaption/);
  assert.doesNotMatch(b, /\.png/);
});

test('fotoğraflar metni eksiltmiyor: gövde çiziminde liste, şema ve uyarı yerinde', () => {
  const govde = oku('src/data/rehber-govde.tsx');
  const ciz = govde.slice(govde.indexOf('export const GovdeCizimi'));
  /* Varsayılan yer başlığın altı; `konum: 'son'` ve ikinci fotoğraf bloğun sonunda. */
  assert.ok(ciz.indexOf('<Baslik>') < ciz.indexOf("konum !== 'son' && <FotografCizimi"));
  assert.ok(ciz.indexOf("konum !== 'son' && <FotografCizimi") < ciz.indexOf('b.paragraflar?.map'));
  for (const parca of ['<RehberFigur', '<KontrolListesi', '<Karsilastirma', '<KarsilastirmaTablosu', 'b.uyari']) {
    assert.ok(ciz.indexOf(parca) > 0 && ciz.indexOf(parca) < ciz.indexOf("konum === 'son' && <FotografCizimi"), parca);
  }
  /* Alt metin ve dosya adı okuma süresine girmiyor. */
  const rehberler = oku('src/data/rehberler.tsx');
  assert.match(rehberler, /METIN_OLMAYAN_ALANLAR = new Set\(\[[^\]]*'gorselAlt'[^\]]*'konum'/);
});

test('reklam sayımı fotoğraf altyazısını saymıyor', async () => {
  const { fotografAltyazisiz, kelimeSay } = await import('../scripts/rehber-sayimi.mjs');
  const jsx = "<P>Bir iki üç dört.</P>\n<OgrenciBolumGorseli\n  dosya=\"x\"\n  baslik=\"Beş altı\"\n  ozet=\"Yedi sekiz dokuz.\"\n  alt=\"On on bir.\"\n/>";
  assert.equal(kelimeSay(fotografAltyazisiz(jsx)), kelimeSay('<P>Bir iki üç dört.</P>'));
  const veri = "      {\n        baslik: 'Başlık burada',\n        bolumFotografi: {\n          dosya: 'x',\n          baslik: 'Beş altı',\n          ozet: 'Yedi sekiz.',\n          gorselAlt: 'On bir.',\n        },\n        paragraflar: ['Bir iki üç.'],\n      },";
  assert.doesNotMatch(fotografAltyazisiz(veri), /Yedi|bolumFotografi/);
  assert.match(fotografAltyazisiz(veri), /Başlık burada[\s\S]*Bir iki üç/);
});
