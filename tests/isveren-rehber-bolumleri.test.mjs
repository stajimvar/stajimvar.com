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

/*
  22 ADIM → GÖRSEL (teslim paketi isveren-rehber-adimlari-20260927,
  manifest.json `steps`). Paket depoda değil; eşleme buraya yazıldı ki
  test paketsiz de koşsun. 14 ve 22 karşılaştırma: dosya değil, HTML
  seçenek alanı (`secenekAlani`).
*/
const ADIMLAR = [
  ['iyi-staj-ilani-nasil-yazilir', 'Başlık: pozisyon + alan, süs yok', '11-ilan-baslik'],
  ['iyi-staj-ilani-nasil-yazilir', 'İlk paragraf: stajyer ne yapacak?', '01-ilan-is-tanimi'],
  ['iyi-staj-ilani-nasil-yazilir', 'Süre, dönem ve ücret: belirsiz bırakmayın', '02-ilan-kosullar'],
  ['iyi-staj-ilani-nasil-yazilir', 'Aranan nitelikler: üçten fazla yazmayın', '12-ilan-nitelikler'],
  ['iyi-staj-ilani-nasil-yazilir', 'Yayınlamadan önce', '13-ilan-son-kontrol'],
  ['zorunlu-staj-isverenin-yukumlulukleri', 'Önce ayırın: zorunlu mu, gönüllü mü?', '14-zorunlu-gonullu'],
  ['zorunlu-staj-isverenin-yukumlulukleri', 'Sigortayı kim yapar?', '04-yukumluluk-teyit'],
  ['zorunlu-staj-isverenin-yukumlulukleri', 'İmzalayacağınız belgeler', '03-yukumluluk-belgeler'],
  ['zorunlu-staj-isverenin-yukumlulukleri', 'Bir sorumlu atayın — tek satırlık ama en önemli iş', '15-yukumluluk-sorumlu'],
  ['zorunlu-staj-isverenin-yukumlulukleri', 'Ücret: yazmadığımız şey ve neden', '16-yukumluluk-ucret'],
  ['staj-basvurularini-degerlendirme', 'Neye bakılır, neye bakılmaz', '05-basvuru-olcutler'],
  ['staj-basvurularini-degerlendirme', 'Kısa liste: en fazla beş kişi', '17-basvuru-kisa-liste'],
  ['staj-basvurularini-degerlendirme', 'Mülakat: yirmi dakika, üç soru', '06-basvuru-gorusme'],
  ['staj-basvurularini-degerlendirme', 'Karar ve teklif', '18-basvuru-karar-teklif'],
  ['stajyerin-ilk-gunu-oryantasyon', 'Staj başlamadan önce hazır olması gerekenler', '19-ilk-gun-hazirlik'],
  ['stajyerin-ilk-gunu-oryantasyon', 'İlk gün: bir saat, üç şey', '07-ilk-gun-karsilama'],
  ['stajyerin-ilk-gunu-oryantasyon', 'Haftalık hedef: yazılı ve küçük', '08-ilk-gun-ilk-gorev'],
  ['stajyerin-ilk-gunu-oryantasyon', 'Staj defteri: ertelemeyin', '20-ilk-gun-defter'],
  ['staj-sonu-referans-teklif-geri-bildirim', 'Okul belgeleri: form ve defter', '21-staj-sonu-belgeler'],
  ['staj-sonu-referans-teklif-geri-bildirim', 'Geri bildirim: on dakika, iki yönlü', '09-staj-sonu-geri-bildirim'],
  ['staj-sonu-referans-teklif-geri-bildirim', 'Referans: söyleyin ve yazın', '10-staj-sonu-sonraki-adim'],
  ['staj-sonu-referans-teklif-geri-bildirim', 'Teklif: dört seçenek', '22-staj-sonu-secenekler'],
];
const KARSILASTIRMA = new Set(['14-zorunlu-gonullu', '22-staj-sonu-secenekler']);

/** Rehberin veri dilimi (slug'dan bir sonraki slug'a). */
function dilim(veri, slug) {
  const bas = veri.indexOf(`slug: '${slug}'`);
  const sonraki = REHBERLER[REHBERLER.indexOf(slug) + 1];
  return veri.slice(bas, sonraki ? veri.indexOf(`slug: '${sonraki}'`) : veri.length);
}

/** Bir adımın bloğu: başlığından bir sonraki adım başlığına (ya da sss'e). */
function blok(veri, slug, baslik) {
  const d = dilim(veri, slug);
  const bas = d.indexOf(`baslik: '${baslik}'`);
  assert.ok(bas >= 0, `${slug}: "${baslik}" yok`);
  const sonrakiler = [d.indexOf("\n        baslik: '", bas + 1), d.indexOf('\n    sss:', bas)].filter((i) => i > 0);
  return d.slice(bas, Math.min(...sonrakiler));
}

test('yirmi fotoğrafın AVIF + WebP çifti ve kaynak kaydı var; özgün PNG yok', () => {
  const idler = Object.keys(kaynak).sort();
  assert.equal(idler.length, 20);
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
  /* Karşılaştırmalar dosya olarak yüklenmedi (HTML). */
  for (const id of KARSILASTIRMA) {
    for (const uzanti of ['svg', 'webp', 'avif']) assert.ok(!existsSync(path.join(DIZIN, `${id}.${uzanti}`)));
  }
  /* Kapak kayıtları ayrı dosyada; bölüm kayıtları onu ezmiyor. */
  const kapaklar = JSON.parse(oku('public/rehber-gorselleri/kaynak.json'));
  for (const slug of REHBERLER) assert.ok(kapaklar[slug], `${slug} kapak kaydı`);
});

test('22 adımın her birinde manifestteki görsel var; alt metin kayıtla aynı, fotoğraf tekrarı yok', () => {
  const veri = oku('src/data/rehber-yazilari/isveren.tsx');
  assert.equal(ADIMLAR.length, 22);
  const kullanilan = [];
  for (const [slug, baslik, id] of ADIMLAR) {
    const b = blok(veri, slug, baslik);
    assert.match(b, /ozet:/, `${baslik}: özet yok`);
    if (KARSILASTIRMA.has(id)) {
      assert.match(b, /secenekAlani: \{/, `${baslik}: seçenek alanı yok`);
      assert.doesNotMatch(b, /bolumGorseli/);
    } else {
      const m = b.match(/dosya: '([^']+)',\s*alt: '([^']+)'/);
      assert.ok(m, `${baslik}: görsel yok`);
      assert.equal(m[1], id, `${baslik}: yanlış görsel`);
      assert.equal(m[2], kaynak[id].alt, `${id}: alt metin kayıtla aynı değil`);
      kullanilan.push(id);
    }
  }
  assert.equal(new Set(kullanilan).size, 20, 'aynı fotoğraf iki adımda');
  /* Veride de 22 adım: her işveren bloğunun özeti var. */
  const sayilar = REHBERLER.map((s) => (dilim(veri, s).match(/\n        ozet:/g) ?? []).length);
  assert.deepEqual(sayilar, [5, 5, 4, 4, 4]);
});

test('adım düzeni: başlık → görsel → özet → ayrıntı; iç içe kart yok', () => {
  const govde = oku('src/data/rehber-govde.tsx');
  assert.doesNotMatch(govde, /BolumKarti|BolumFotografi|BolumAyrintisi/);
  assert.match(govde, /b\.ozet \? \(\s*<Adim /);
  const adim = govde.slice(govde.indexOf('const Adim'), govde.indexOf('export const GovdeCizimi'));
  /* Fotoğraf ve seçenek alanı özetin önünde. */
  assert.ok(adim.indexOf('<SadeFotograf') < adim.indexOf('<p className={OZET}>'));
  assert.ok(adim.indexOf('<SecenekAlani') < adim.lastIndexOf('<p className={OZET}>'));
  /* h2 gövdenin doğrudan çocuğu (içindekiler `:scope > h2`). */
  assert.match(adim, /return \(\s*<>\s*\{b\.baslik && <Baslik sade>/);
  const bolum = oku('src/components/RehberBolum.tsx');
  assert.match(bolum, /loading="lazy"/);
  assert.match(bolum, /width=\{1280\}\s*height=\{720\}/);
  assert.match(bolum, /sizes=\{ADIM_BOYUTLARI\}/);
  assert.match(bolum, /type="image\/avif"/);
  assert.match(bolum, /Temsili görsel/);
  assert.match(bolum, /aspect-video/);
  /* Ayrıntı satırı çerçevesiz ve her adımda aynı etiket. */
  const satir = bolum.slice(bolum.indexOf('export const SadeAyrinti'), bolum.indexOf('/* ---', bolum.indexOf('export const SadeAyrinti')));
  assert.doesNotMatch(satir, /border/);
  assert.match(satir, /Ayrıntıyı aç/);
  assert.doesNotMatch(oku('src/data/rehber-yazilari/isveren.tsx'), /ayrintiEtiketi/);
  /* İşaret listesi kutusuz; işaretler yalnız bu tarayıcıda. */
  const liste = bolum.slice(bolum.indexOf('export const IsaretListesi'));
  assert.doesNotMatch(liste, /rounded-2xl border/);
  assert.match(liste, /İşaretler yalnız bu tarayıcıda kalır; resmî bir onay/);
  assert.match(liste, /catch \{/);
  /* Küçük numara dairesi. */
  const stil = oku('src/components/RehberOkuma.tsx');
  assert.match(stil, /\.rehber-govde--sayili > h2\.bolum-sade::before \{\s*width: 1\.75rem; height: 1\.75rem;[^}]*box-shadow: none;/);
});

test('karşılaştırmalar HTML: telefonda alt alta, geniş ekranda iki sütun, kırpılmıyor', () => {
  const bolum = oku('src/components/RehberBolum.tsx');
  const alan = bolum.slice(bolum.indexOf('export const SecenekAlani'), bolum.indexOf('/* ---', bolum.indexOf('export const SecenekAlani')));
  assert.match(alan, /<ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">/);
  assert.doesNotMatch(alan, /aspect-|<img/);
  const veri = oku('src/data/rehber-yazilari/isveren.tsx');
  const zorunlu = blok(veri, 'zorunlu-staj-isverenin-yukumlulukleri', 'Önce ayırın: zorunlu mu, gönüllü mü?');
  assert.match(zorunlu, /baslik: 'Zorunlu staj'[\s\S]*baslik: 'Gönüllü staj'/);
  const teklif = blok(veri, 'staj-sonu-referans-teklif-geri-bildirim', 'Teklif: dört seçenek');
  for (const ad of ['Yarı zamanlı devam', 'Gelecek yaz için söz', 'Mezuniyet sonrası teklif', 'Yalnız referans']) {
    assert.match(teklif, new RegExp(`baslik: '${ad}'`));
  }
  /* Yarı zamanlı devamın ücret ve sigorta koşulu seçenek alanında görünür. */
  assert.match(teklif, /satirlar: \[[^\]]*çalışma kuralına tabi/);
});

test('sigorta başlığı soru; kapsam ve koşul görünür özette, ücret ve sigorta koşulları korunuyor', () => {
  const veri = oku('src/data/rehber-yazilari/isveren.tsx');
  assert.doesNotMatch(veri, /baslik: 'Sigorta: okul yapar, işveren yapmaz'/);
  const sigorta = blok(veri, 'zorunlu-staj-isverenin-yukumlulukleri', 'Sigortayı kim yapar?');
  const ozet = sigorta.slice(sigorta.indexOf('ozet:'), sigorta.indexOf('bolumGorseli'));
  assert.match(ozet, /zorunlu stajında iş kazası ve meslek hastalığı/);
  assert.match(ozet, /gönüllü stajda ve meslek lisesi beceri eğitiminde kurallar farklı/);
  assert.match(sigorta, /akis: \{/);
  assert.match(veri, /Gönüllü stajda okulun sigortası otomatik devreye girmiyor/);
  assert.match(veri, /İşverenin SGK\\'ya öğrenci için bildirim/);
  assert.match(veri, /3308 sayılı Kanun/);
  assert.match(veri, /Bu sayfada tutar, oran ve devlet katkısı payı yazmıyoruz/);
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
