import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  BAŞVURU DURUMU SÖZLÜĞÜ — TEK TERİM, İKİ TARAF

  Panelde aynı başvuru iki farklı adla görünüyordu (kart "İnceleniyor",
  çekmece "İncelemede"); o düzeltildi. Sonra daha büyüğü çıktı: ÖĞRENCİ
  ekranı kendi sözlüğünü kuruyordu —

    under_review          → "İK İnceliyor"
    technical_assessment  → "Teknik Case Aşamasında"
    offer_extended        → "🎉 Staj Teklifi Geldi!"
    withdrawn             → "İşlemde"        ← yanlış

  Sonuncusu tutarsızlıktan öte hataydı: öğrencinin kendi geri çektiği
  başvuru ona "İşlemde" diyordu.

  Bu testler üç şeyi bağlıyor:
    1. Terim sözlüğü enum'un TAMAMINI kapsıyor — ham enum sızamaz.
    2. Ne panelde ne öğrenci ekranında ikinci bir sözlük doğuyor.
    3. İki taraf da aynı kaynağı okuyor.
*/

/* Nesne kapanışı: satır içi kaçış bir kez backspace karakterine dönüştü. */
const KAPANIS = String.fromCharCode(10) + '};';

const oku = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

const sozluk = oku('src/lib/basvuru-durumu.mjs');
const renkler = oku('src/sirket/basvuru-durumu.ts');
const tipler = oku('src/lib/database.types.ts');

/** database.types.ts içindeki application_status enum üyeleri. */
function enumUyeleri() {
  const bas = tipler.indexOf('application_status:');
  assert.ok(bas > -1, 'application_status enum bulunamadı');
  const govde = tipler.slice(bas, tipler.indexOf(';', bas));
  return [...govde.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

/** Bir nesne sabitinin gövdesi — yorum metni sayılmasın diye ayrı çıkarılıyor. */
function govde(kaynak, ad) {
  const bas = kaynak.indexOf(`export const ${ad}`);
  assert.ok(bas > -1, `${ad} bulunamadı`);
  const son = kaynak.indexOf(KAPANIS, bas);
  assert.ok(son > bas, `${ad} kapanışı bulunamadı`);
  return kaynak.slice(bas, son);
}

/* ------------------------------------------------------------- kapsam */

test('terim sözlüğü enum üyelerinin tamamını kapsıyor', () => {
  const uyeler = enumUyeleri();
  assert.ok(uyeler.length >= 7, `enum beklenenden kısa: ${uyeler.join(', ')}`);
  const g = govde(sozluk, 'DURUM_ADI');
  for (const uye of uyeler) {
    assert.ok(g.includes(`${uye}:`), `${uye} için görünen ad yok — ham enum yazılabilir`);
  }
});

test('öğrenci cümlesi enum üyelerinin tamamını kapsıyor', () => {
  const g = govde(sozluk, 'OGRENCI_CUMLESI');
  for (const uye of enumUyeleri()) {
    assert.ok(g.includes(`${uye}:`), `${uye} için öğrenci cümlesi yok`);
  }
});

test('şirket cümlesi enum üyelerinin tamamını kapsıyor', () => {
  const g = govde(sozluk, 'SIRKET_CUMLESI');
  for (const uye of enumUyeleri()) {
    assert.ok(g.includes(`${uye}:`), `${uye} için şirket cümlesi yok`);
  }
});

test('renk haritası enum üyelerinin tamamını kapsıyor', () => {
  const g = govde(renkler, 'DURUM_ROZETI');
  for (const uye of enumUyeleri()) {
    assert.ok(g.includes(`${uye}:`), `${uye} için rozet rengi yok`);
  }
});

test('DURUM_SIRASI enum ile aynı kümeyi taşıyor', () => {
  const bas = sozluk.indexOf('export const DURUM_SIRASI');
  const g = sozluk.slice(bas, sozluk.indexOf('];', bas));
  const sirada = [...g.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...sirada].sort(), [...enumUyeleri()].sort());
});

/* -------------------------------------------------- ikinci sözlük yok */

const EKRANLAR = [
  'src/sirket/AdayKarti.tsx',
  'src/sirket/AdayIzgarasi.tsx',
  'src/sirket/AdayCekmecesi.tsx',
  /* Öğrenci tarafı da AYNI sözlüğü kullanmalı; burada ayrı bir sözlük vardı. */
  'src/components/ApplicationsTrackerView.tsx',
];

test('ekranlarda ikinci bir durum sözlüğü tanımlanmıyor', () => {
  for (const yol of [...EKRANLAR, 'src/lib/aday-kart.mjs']) {
    assert.doesNotMatch(
      oku(yol),
      /^\s*(export\s+)?const\s+(DURUM_ETIKETI|DURUM_ADI|DURUM_SIRASI|OGRENCI_CUMLESI)\s*[:=]/m,
      `${yol}: ikinci durum sözlüğü tanımlanmış`,
    );
  }
});

test('öğrenci ekranı switch/case ile kendi etiketini üretmiyor', () => {
  const ogrenci = oku('src/components/ApplicationsTrackerView.tsx');
  for (const uye of enumUyeleri()) {
    assert.doesNotMatch(
      ogrenci,
      new RegExp(`case\\s+'${uye}'`),
      `öğrenci ekranı ${uye} için kendi etiketini üretiyor`,
    );
  }
});

test('iki taraf da ortak terim kaynağını okuyor', () => {
  for (const yol of ['src/sirket/basvuru-durumu.ts', 'src/components/ApplicationsTrackerView.tsx']) {
    assert.match(oku(yol), /basvuru-durumu\.mjs/, `${yol}: ortak sözlüğü okumuyor`);
  }
});

test('tanınmayan durumda ham değer geri verilmiyor', () => {
  for (const yol of EKRANLAR) {
    assert.doesNotMatch(oku(yol), /\?\?\s*kart\.durum/, `${yol}: ham enum'a geri düşülüyor`);
  }
});

test('eski ve yeni adlar aynı anda yaşamıyor', () => {
  const hepsi = [...EKRANLAR, 'src/lib/basvuru-durumu.mjs', 'src/sirket/basvuru-durumu.ts']
    .map(oku)
    .join('\n');
  for (const eski of ['İncelemede', 'Teknik Case Aşamasında', 'İK İnceliyor', 'Staj Teklifi Geldi']) {
    assert.ok(!hepsi.includes(`'${eski}'`), `eski ad hâlâ var: ${eski}`);
  }
});

/* ------------------------------------------------- geçiş kuralları */

test('şirket seçenekleri ADAYIN kararlarını içermiyor', async () => {
  /*
    Üç değer adayın kararı: başvurusunu geri çekmesi, teklifi kabul
    etmesi, teklifi reddetmesi. Şirket üçünü de onun adına veremez.
    Aynı kural veritabanında da duruyor (işveren güncelleme
    politikasının WITH CHECK ifadesi) — buradaki liste yalnızca arayüzün
    doğru seçenekleri göstermesi için.
  */
  const m = await import('../src/lib/basvuru-durumu.mjs');
  for (const d of ['withdrawn', 'offer_accepted', 'offer_declined']) {
    assert.ok(!m.SIRKET_DURUMLARI.includes(d), `${d} şirket seçeneklerinde`);
  }
  assert.equal(m.SIRKET_DURUMLARI.length, enumUyeleri().length - 3);
});

test('akış sırası: her adımın bir sonrakisi doğru', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.sonrakiDurum('submitted'), 'under_review');
  assert.equal(m.sonrakiDurum('under_review'), 'technical_assessment');
  assert.equal(m.sonrakiDurum('technical_assessment'), 'interview_scheduled');
  assert.equal(m.sonrakiDurum('interview_scheduled'), 'offer_extended');
  /* Kapanmış durumlarda bir sonraki adım yok. */
  assert.equal(m.sonrakiDurum('offer_extended'), null);
  assert.equal(m.sonrakiDurum('rejected'), null);
  assert.equal(m.sonrakiDurum('withdrawn'), null);
});

test('kapanmış durumlar doğru işaretleniyor', async () => {
  /*
    `offer_extended` ARTIK KAPALI DEĞİL: teklif verildiğinde süreç
    bitmiyor, öğrencinin kararı bekleniyor. Kapanış öğrencinin yanıtıyla
    ya da şirketin olumsuz kararıyla geliyor.
  */
  const m = await import('../src/lib/basvuru-durumu.mjs');
  for (const d of ['rejected', 'withdrawn', 'offer_accepted', 'offer_declined'])
    assert.equal(m.durumKapandi(d), true, `${d} kapalı sayılmalı`);
  for (const d of [
    'submitted',
    'under_review',
    'technical_assessment',
    'interview_scheduled',
    'offer_extended',
  ])
    assert.equal(m.durumKapandi(d), false, `${d} kapalı sayılmamalı`);
});

test('teklif beklerken sıradaki hamle şirkette değil', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.teklifBekliyor('offer_extended'), true);
  assert.equal(m.sonrakiDurum('offer_extended'), null, 'şirkete sonraki adım gösteriliyor');
  /* Öğrenci de bu aşamada geri çekmiyor: kabul ya da ret. */
  assert.equal(m.ogrenciGeriCekebilir('offer_extended'), false);
  assert.equal(m.ogrenciGeriCekebilir('under_review'), true);
  assert.equal(m.ogrenciGeriCekebilir('offer_accepted'), false);
});

test('iletişim yalnızca kabul edilmiş teklifte açık', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  assert.equal(m.iletisimAcik('offer_accepted'), true);
  for (const d of ['offer_extended', 'offer_declined', 'rejected', 'withdrawn', 'interview_scheduled'])
    assert.equal(m.iletisimAcik(d), false, `${d} için iletişim açık görünüyor`);
});

test('şirket ve öğrenci cümleleri aynı terimden ayrılıyor ama karışmıyor', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  /*
    Öğrencinin teklifi reddetmesi ile ŞİRKETİN olumsuz kararı aynı
    kelimeye düşmemeli: biri adayın, diğeri şirketin kararı.
  */
  assert.notEqual(m.SIRKET_CUMLESI.offer_declined, m.SIRKET_CUMLESI.rejected);
  assert.notEqual(m.OGRENCI_CUMLESI.offer_declined, m.OGRENCI_CUMLESI.rejected);
  assert.match(m.SIRKET_CUMLESI.offer_declined, /Öğrenci/);
  assert.match(m.OGRENCI_CUMLESI.offer_declined, /reddettin/);
  for (const d of enumUyeleri()) {
    assert.notEqual(m.sirketDurumCumlesi(d), 'Durum bilinmiyor', `${d} için şirket cümlesi yok`);
  }
});

test('iki taraf da aynı terimi veriyor', async () => {
  const m = await import('../src/lib/basvuru-durumu.mjs');
  for (const d of enumUyeleri()) {
    assert.equal(typeof m.durumAdi(d), 'string');
    assert.notEqual(m.durumAdi(d), 'Durum bilinmiyor', `${d} için terim yok`);
    /* Öğrenci cümlesi TERİMİ içermeli: farklı kelime değil, aynı kelimenin cümlesi. */
    assert.notEqual(m.ogrenciDurumCumlesi(d), 'Durum bilinmiyor', `${d} için cümle yok`);
  }
  assert.equal(m.durumAdi('uydurma'), 'Durum bilinmiyor');
  assert.equal(m.ogrenciDurumCumlesi('uydurma'), 'Durum bilinmiyor');
});
