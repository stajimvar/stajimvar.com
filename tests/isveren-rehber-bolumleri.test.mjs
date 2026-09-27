import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { listeMaddesi } from '../scripts/rehber-sayimi.mjs';

/*
  İŞVEREN REHBERLERİ — BÖLÜM GÖRSELLERİ (27 Eylül 2026)

  /stajyer-nasil-alinir pilotunun dili beş işveren rehberine taşındı:
  bölüm başına özet, temsili fotoğraf, açılır ayrıntı, kontrol listesi.
  Görseller `assets/isveren-rehber-bolumleri-20260927` teslim paketinden
  (manifest.json); yalnız web sürümleri `public/rehber-gorselleri/bolumler`
  altında. Kapaklar değişmedi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const DIZIN = path.join(KOK, 'public', 'rehber-gorselleri', 'bolumler');
const kaynak = JSON.parse(readFileSync(path.join(DIZIN, 'kaynak.json'), 'utf8'));

const REHBERLER = [
  'iyi-staj-ilani-nasil-yazilir',
  'zorunlu-staj-isverenin-yukumlulukleri',
  'staj-basvurularini-degerlendirme',
  'stajyerin-ilk-gunu-oryantasyon',
  'staj-sonu-referans-teklif-geri-bildirim',
];

test('on bölüm görselinin AVIF + WebP çifti ve kaynak kaydı var; özgün PNG yok', () => {
  const idler = Object.keys(kaynak).sort();
  assert.equal(idler.length, 10);
  for (const id of idler) {
    for (const uzanti of ['avif', 'webp']) {
      assert.ok(existsSync(path.join(DIZIN, `${id}.${uzanti}`)), `${id}.${uzanti}`);
    }
    assert.ok(!existsSync(path.join(DIZIN, `${id}.png`)), `${id}.png siteye girmemeli`);
    const k = kaynak[id];
    assert.equal(k.etiket, 'Temsili görsel');
    assert.equal(k.tur, 'ai-photorealistic');
    assert.equal(k.lisans, 'generated');
    assert.equal(k.genislik, 1280);
    assert.equal(k.yukseklik, 720);
    assert.ok(REHBERLER.includes(k.rehber), `${id}: bilinmeyen rehber`);
  }
  /* Kapak kayıtları ayrı dosyada; bölüm kayıtları onu ezmiyor. */
  const kapaklar = JSON.parse(oku('public/rehber-gorselleri/kaynak.json'));
  for (const slug of REHBERLER) assert.ok(kapaklar[slug], `${slug} kapak kaydı`);
});

test('her rehber kendi iki görselini, manifestteki alt metinle ve tekrarsız kullanıyor', () => {
  const veri = oku('src/data/rehber-yazilari/isveren.tsx');
  const kullanilan = [...veri.matchAll(/dosya: '([^']+)',\s*alt: '([^']+)'/g)];
  assert.equal(kullanilan.length, 10);
  assert.equal(new Set(kullanilan.map((m) => m[1])).size, 10, 'aynı fotoğraf iki kez');
  for (const [, id, alt] of kullanilan) {
    assert.ok(kaynak[id], `${id}: kaynak kaydı yok`);
    assert.equal(alt, kaynak[id].alt, `${id}: alt metin manifestle aynı değil`);
  }
  /* Görsel doğru rehberin bloğunda: slug'lar arasında kalan dilimde. */
  for (let i = 0; i < REHBERLER.length; i += 1) {
    const bas = veri.indexOf(`slug: '${REHBERLER[i]}'`);
    const son = i + 1 < REHBERLER.length ? veri.indexOf(`slug: '${REHBERLER[i + 1]}'`) : veri.length;
    const dilim = veri.slice(bas, son);
    const burada = [...dilim.matchAll(/dosya: '([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(
      burada.sort(),
      Object.keys(kaynak).filter((id) => kaynak[id].rehber === REHBERLER[i]).sort(),
      REHBERLER[i],
    );
  }
});

test('bölüm kartı: başlık kartın dışında, fotoğraf gecikmeli ve ölçülü, "Temsili görsel" yazıyor', () => {
  const govde = oku('src/data/rehber-govde.tsx');
  /* h2 gövdenin doğrudan çocuğu kalmalı (içindekiler `:scope > h2` okuyor). */
  assert.match(
    govde,
    /\{b\.baslik && <Baslik>\{b\.baslik\}<\/Baslik>\}\s*\{!kartVar && <p>[\s\S]{0,60}\{kartVar && \(\s*<div\s+className=\{`overflow-hidden rounded-2xl/,
  );
  assert.match(govde, /b\.ozet \? \(\s*<BolumKarti/);
  const bolum = oku('src/components/RehberBolum.tsx');
  assert.match(bolum, /loading="lazy"/);
  assert.match(bolum, /width=\{1280\}\s*height=\{720\}/);
  assert.match(bolum, /sizes=\{BOLUM_BOYUTLARI\}/);
  assert.match(bolum, /type="image\/avif"/);
  assert.match(bolum, /Temsili görsel/);
  assert.match(bolum, /aspect-video/);
  /* Açılır ayrıntı yerel <details>; işaretler yalnız bu tarayıcıda. */
  assert.match(bolum, /<details className="group/);
  assert.match(bolum, /İşaretler yalnız bu tarayıcıda kalır; resmî bir onay/);
  assert.match(bolum, /catch \{/);
});

test('sigorta başlığı koşulsuz değil; ücret ve sigorta koşulları korunuyor', () => {
  const veri = oku('src/data/rehber-yazilari/isveren.tsx');
  assert.doesNotMatch(veri, /baslik: 'Sigorta: okul yapar, işveren yapmaz'/);
  assert.match(veri, /baslik: 'Sigorta: üniversitenin zorunlu stajında okul yapar'/);
  assert.match(veri, /Gönüllü stajda okulun sigortası otomatik devreye girmiyor/);
  assert.match(veri, /3308 sayılı Kanun/);
  assert.match(veri, /Bu sayfada tutar, oran ve devlet katkısı payı yazmıyoruz/);
  assert.match(veri, /ücret ve sigorta staj kuralına değil çalışma kuralına tabi/);
});

test('nesne maddeli kontrol listesi bir kez sayılıyor (reklam eşiği şişmiyor)', () => {
  const govde = [
    '        maddeler: [',
    "          { ad: 'Bir', ayrinti: 'açıklama bir' },",
    '          {',
    "            ad: 'İki',",
    "            ayrinti: 'açıklama iki',",
    '          },',
    '        ],',
  ].join('\n');
  assert.equal(listeMaddesi(govde), 2);
  /* Düz dize listesi eskisi gibi. */
  assert.equal(listeMaddesi("        liste: [\n          'a',\n          'b',\n        ],"), 2);
});
