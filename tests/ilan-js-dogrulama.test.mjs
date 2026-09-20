import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ENGEL_IZI, YOK_IZI, karar } from '../scripts/ilan-js-dogrulama.mjs';

/**
 * BELİRSİZ İLANLARIN ÇİZEREK DOĞRULANMASI
 *
 * Bu aşama var çünkü `belirsiz` etiketi ilanın durumunu değil sayfanın
 * JavaScript ile çizilmesini ölçüyordu. Testler üç sonucun birbirine
 * karışmadığını ve ikisinin ASLA kapatma üretmediğini bağlıyor.
 */

const oku = (y) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const AKIS = oku('.github/workflows/ilan-baglanti-kontrolu.yml');
const BETIK = oku('scripts/ilan-js-dogrulama.mjs');

/* ------------------------------------------ 1. BOT ENGELİ KAPATMIYOR */

test('bot engeli kapatmıyor, geçici sayılıyor', () => {
  /*
    ÖLÇÜLEN GERÇEK ÖRNEK: Dior sayfası headless çizildiğinde
    "Page unavailable · Reference ID: 0.7cc… · Your IP: …" döndürdü.
    Bu bir CDN engeli; ilan hakkında hiçbir şey söylemiyor.
  */
  const k = karar('Page unavailable Reference ID: 0.7cc11302 Your IP: 95.70.218.5', 'INTERNSHIP E-Business');
  assert.equal(k.sonuc, 'engel');
  /* Kalıp gerçekten o ifadeyi tanıyor (regex'in kendisi dizeye çevrilip sınanıyor). */
  assert.ok(ENGEL_IZI.test('Page unavailable'));
  assert.ok(ENGEL_IZI.test('Verify you are human'));

  /* Engel dalı `erisilemedi` yazıyor ve sayacı artırıyor — kapatmıyor. */
  const dal = BETIK.slice(BETIK.indexOf("k.sonuc === 'engel'"));
  const govde = dal.slice(0, dal.indexOf('} else {'));
  assert.match(govde, /source_status: 'erisilemedi'/);
  assert.match(govde, /consecutive_failures: \(ilan\.consecutive_failures \?\? 0\) \+ 1/);
  assert.ok(!/status: 'closed'/.test(govde), 'engel ilanı kapatmamalı');
});

test('engel önce bakılıyor: engel sayfası kısa ve kanıtsız', () => {
  /*
    Sıra tersine olsaydı engel sayfası "kanıt yok" diye okunup sessizce
    belirsiz kalırdı ve bir sonraki koşuda öne alınmazdı.
  */
  const kod = BETIK.slice(BETIK.indexOf('export function karar'));
  assert.ok(
    kod.indexOf('ENGEL_IZI.test') < kod.indexOf('YOK_IZI.test'),
    'engel kontrolü önce olmalı'
  );
});

/* ------------------------------------------- 2. KAPATMA KESİN KANITLA */

test('yalnız sayfanın kendi "ilan yok" ifadesi kapatıyor', () => {
  const ornekler = [
    ['Ana Sayfa Kariyer Şu anda mevcut olan ilan yok', 'Kariyer Deneyim Stajyeri'],
    ['This position has been filled. Browse other jobs.', 'Supply Chain Internship'],
    ['Bu ilan artık yayında değil.', 'Satış Stajyeri'],
    ['This job is no longer available', 'Yazılım Stajyeri'],
  ];
  for (const [metin, baslik] of ornekler) {
    const k = karar(metin, baslik);
    assert.equal(k.sonuc, 'kapali', metin.slice(0, 40));
    assert.match(k.sebep, /sayfa metni/);
  }
  assert.ok(YOK_IZI.test('no longer available'));
});

test('boş ya da kanıtsız sayfa KAPATMIYOR', () => {
  /*
    Ham HTML'de 1 kelime dönen Workday/Oracle sayfaları çizildikten
    sonra da boş kalabilir. Kanıt yoksa ilana DOKUNULMUYOR: ne açılıyor
    ne kapanıyor. Kanıtsız kapatmak, açık bir ilanı listeden silmek.
  */
  assert.equal(karar('FATER', 'Satış Stajyeri').sonuc, 'belirsiz');
  assert.equal(karar('', 'Herhangi bir ilan').sonuc, 'belirsiz');

  const dal = BETIK.slice(BETIK.indexOf('sayac.belirsiz++'));
  const govde = dal.slice(0, 260);
  assert.ok(!/status: 'closed'/.test(govde));
  assert.ok(!/source_status: 'kapali'/.test(govde));
});

/* --------------------------------------------- 3. AÇIK KANITI SIKI */

test('açık kararı hem dolu içerik hem başlık eşleşmesi istiyor', () => {
  const dolu = 'Sales Internship Istanbul Turkiye Hybrid responsibilities requirements apply '.repeat(30);
  assert.equal(karar(dolu, 'Sales Internship').sonuc, 'acik');

  /* Uzun ama alakasız sayfa (genel kariyer listesi) açık SAYILMIYOR. */
  const alakasiz = 'Kariyer firsatlari basvuru surecimiz hakkinda bilgi '.repeat(40);
  assert.equal(karar(alakasiz, 'Yazılım Mühendisliği Stajyeri').sonuc, 'belirsiz');

  /* Başlık eşleşiyor ama sayfa ince: yetmiyor. */
  assert.equal(karar('Sales Internship', 'Sales Internship').sonuc, 'belirsiz');
});

test('kanıtla açılan ilan kapalıysa geri yayına alınıyor', () => {
  const dal = BETIK.slice(BETIK.indexOf("k.sonuc === 'acik'"));
  const govde = dal.slice(0, dal.indexOf("} else if (k.sonuc === 'kapali')"));
  assert.match(govde, /source_verified_at: simdi/);
  assert.match(govde, /consecutive_failures: 0/);
  /* Eski kapanma izi temizleniyor: yanıltıcı sebep kalmasın. */
  assert.match(govde, /closure_reason: null/);
  assert.match(govde, /if \(ilan\.status === 'closed'\) guncelleme\.status = 'published'/);
});

/* --------------------------------------- 4. KAPSAM VE ZAMANLAMA */

test('yalnız belirsizlere bakıyor, yeni cron yok', () => {
  assert.match(BETIK, /\.eq\('source_status', 'belirsiz'\)/);
  assert.match(BETIK, /\.in\('status', \['published', 'draft'\]\)/);

  /* Aynı iş akışı, tek zamanlama. */
  assert.equal((AKIS.match(/cron:/g) ?? []).length, 1, 'ikinci cron kurulmamalı');
  assert.match(AKIS, /node scripts\/ilan-js-dogrulama\.mjs/);
  assert.match(AKIS, /npx playwright install --with-deps chromium/);
  /* Birinci aşama duruyor. */
  assert.match(AKIS, /node scripts\/ilan-baglanti-kontrol\.mjs/);
});

test('aynı alan adına art arda gidilmiyor', () => {
  assert.match(BETIK, /alanSon\.set\(kok, Date\.now\(\)\)/);
  /* Playwright tembel yükleniyor: tarayıcı yokken import kırılmasın. */
  assert.match(BETIK, /await import\('@playwright\/test'\)/);
});
