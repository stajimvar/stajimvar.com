import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  eslemeliRehberler,
  firsatEylemleri,
  rehberEylemleri,
} from '../src/lib/rehber-eylemleri.mjs';

/*
  REHBER → ÜRÜN EŞLEMESİ REGRESYONU

  Bu eşleme elle kuruldu ve öyle kalmalı. Rehber verisinde ürün ilişkisi
  yok (`kategori` yalnız ogrenci/isveren ayrımı yapıyor); slug ya da
  başlıktaki kelimeye bakıp otomatik bağlantı üretmek "burs" geçen her
  rehberi burs sayfasına bağlamak olurdu.

  Testler iki şeyi koruyor: bağlantılar GERÇEK adreslere gitsin ve
  sayfa bağlantı çöplüğüne dönmesin.
*/

const KOK = path.resolve(import.meta.dirname, '..');

/** Sitede gerçekten var olan ürün adresleri. */
const GECERLI_YOLLAR = new Set([
  '/',
  '/staj-programlari',
  '/cv',
  '/burslar',
  '/kyk',
  '/yurtdisi-firsatlari',
  '/universite-kariyer-merkezleri',
  '/bolumler',
  '/kesfet',
]);

function rehberSluglari() {
  const dosyalar = readdirSync(path.join(KOK, 'src/data/rehber-yazilari'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => path.join(KOK, 'src/data/rehber-yazilari', f));
  dosyalar.push(path.join(KOK, 'src/data/rehberler.tsx'));

  const sluglar = new Set();
  for (const d of dosyalar) {
    for (const m of readFileSync(d, 'utf8').matchAll(/slug: '([^']+)'/g)) sluglar.add(m[1]);
  }
  return sluglar;
}

/* ------------------------------------------- G: en fazla üç eylem */

test('G: hiçbir rehberde üçten fazla eylem yok', () => {
  for (const slug of eslemeliRehberler()) {
    const e = rehberEylemleri(slug);
    assert.ok(e.length >= 1 && e.length <= 3, `${slug}: ${e.length} eylem`);
  }
});

test('G2: eşlemesi olmayan rehber hiçbir şey göstermiyor', () => {
  assert.deepEqual(rehberEylemleri('boyle-bir-rehber-yok'), []);
  assert.deepEqual(rehberEylemleri(''), []);
  assert.deepEqual(rehberEylemleri(undefined), []);
});

/* ------------------------------------------- H: deterministik eşleme */

test('H: aynı slug her çağrıda aynı sonucu veriyor', () => {
  const a = rehberEylemleri('ats-uyumlu-cv');
  const b = rehberEylemleri('ats-uyumlu-cv');
  assert.deepEqual(a, b);
  assert.equal(a[0].yol, '/cv');
});

test('H2: eşlemedeki her slug gerçek bir rehber', () => {
  const gercek = rehberSluglari();
  const hayalet = eslemeliRehberler().filter((s) => !gercek.has(s));
  assert.deepEqual(hayalet, [], 'var olmayan rehbere eşleme yazılmış');
});

test('H3: her eylem gerçek bir ürün adresine gidiyor', () => {
  for (const slug of eslemeliRehberler()) {
    for (const e of rehberEylemleri(slug)) {
      assert.ok(GECERLI_YOLLAR.has(e.yol), `${slug} → bilinmeyen adres ${e.yol}`);
    }
  }
});

/* ------------------------------- I: rastgele bölüm eşlemesi yok */

test('I: eşleme kelime tahminiyle değil elle kurulmuş', () => {
  const kaynak = readFileSync(path.join(KOK, 'src/lib/rehber-eylemleri.mjs'), 'utf8');
  const kod = kaynak
    .split('\n')
    .filter((s) => {
      const t = s.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
  for (const yasak of ['.includes(', 'startsWith(', 'RegExp', 'match(']) {
    assert.ok(
      !kod.includes(`slug${yasak}`) && !kod.includes(`baslik${yasak}`),
      `slug/başlık üzerinde ${yasak} ile tahmin yapılmamalı`
    );
  }
});

/* --------------------------- J: fırsat eşlemesi tür değerinden */

test('J: fırsat türleri gerçek enum değerleriyle eşleşiyor', () => {
  /* opportunities.opportunity_type: ölçülen değerler. */
  assert.deepEqual(
    firsatEylemleri('scholarship').map((e) => e.yol),
    ['/burslar', '/kyk']
  );
  assert.deepEqual(firsatEylemleri('kyk').map((e) => e.yol), ['/kyk', '/burslar']);
  assert.deepEqual(
    firsatEylemleri('international').map((e) => e.yol),
    ['/yurtdisi-firsatlari', '/burslar']
  );
  assert.deepEqual(firsatEylemleri('competition').map((e) => e.yol), ['/kesfet']);
});

test('J2: tanınmayan tür için uydurma bağlantı yok', () => {
  assert.deepEqual(firsatEylemleri('bilinmeyen_tur'), []);
  assert.deepEqual(firsatEylemleri(null), []);
  assert.deepEqual(firsatEylemleri(undefined), []);
});

test('J3: alt dize eşleşmesi kullanılmıyor', () => {
  /*
    "student_support" içinde "support" geçiyor; alt dize araması onu
    yanlış aileye bağlayabilirdi. Tam değer eşleşmesi bunu engelliyor.
  */
  assert.deepEqual(firsatEylemleri('student_support').map((e) => e.yol), ['/burslar']);
  assert.deepEqual(firsatEylemleri('scholarship_fake_suffix'), []);
});

/* --------------------------------- M: bağlantılar taranabilir */

test('M: rehber ve fırsat eylemleri gerçek <a href> ile çiziliyor', () => {
  for (const dosya of [
    'src/components/GuidePages.tsx',
    'src/components/OpportunityDetailPage.tsx',
    'src/components/IsverenKimlikSayfasi.tsx',
  ]) {
    const govde = readFileSync(path.join(KOK, dosya), 'utf8');
    assert.match(govde, /href=\{e\.yol\}/, `${dosya}: CTA <a href> olmalı`);
  }
});

test('M2: ön render ile uygulama aynı eşlemeyi kullanıyor', () => {
  const onrender = readFileSync(path.join(KOK, 'scripts/onrender.mjs'), 'utf8');
  assert.match(onrender, /rehber-eylemleri/, 'ön render aynı kaynaktan beslenmeli');
  assert.match(onrender, /hazirlikEylemleri/);
});

/* ----------------------------- A: erişilebilir bağlantı metni */

test('A: bağlamsız CTA metni yok', () => {
  const yasak = /^(devam|buraya tıkla|tıkla|daha fazla|git)$/i;
  for (const slug of eslemeliRehberler()) {
    for (const e of rehberEylemleri(slug)) {
      assert.ok(!yasak.test(e.baslik.trim()), `bağlamsız CTA: ${e.baslik}`);
      assert.ok(e.baslik.length > 8, `çok kısa CTA: ${e.baslik}`);
    }
  }
});

/* ------------------------ kapsam: eşleme anlamlı bir orana ulaşmış */

test('kapsam: rehberlerin en az yarısında eylem var', () => {
  const toplam = rehberSluglari().size;
  const esleme = eslemeliRehberler().length;
  assert.ok(toplam >= 60, `rehber sayısı ${toplam}`);
  assert.ok(esleme >= toplam / 2, `${toplam} rehberin yalnız ${esleme} tanesinde eşleme var`);
});


/* ------------------- K/L: kariyer merkezi eşleşmesi */

test('K: üniversite tam eşleşince kendi merkezi gösteriliyor', async () => {
  const { profilMerkezi } = await import('../src/lib/rehber-arama.mjs');
  const merkezler = [
    { universite: 'İstanbul Üniversitesi-Cerrahpaşa' },
    { universite: 'İstanbul Üniversitesi' },
    { universite: 'Boğaziçi Üniversitesi' },
  ];
  assert.equal(
    profilMerkezi('İstanbul Üniversitesi', merkezler).universite,
    'İstanbul Üniversitesi'
  );
  assert.equal(profilMerkezi('Boğaziçi', merkezler).universite, 'Boğaziçi Üniversitesi');
});

test('L: belirsiz üniversite adı kişiselleştirme üretmiyor', () => {
  /*
    ÖLÇÜLDÜ: iki yönlü `includes` yüzünden "İstanbul Üniversitesi"
    yazan öğrenciye "İstanbul Üniversitesi-Cerrahpaşa" merkezi
    açılıyordu — farklı iki üniversite. Yalnız "İstanbul" bile
    eşleşiyordu. Yanlış kişiselleştirme, kişiselleştirmemekten kötü.
  */
  return import('../src/lib/rehber-arama.mjs').then(({ profilMerkezi }) => {
    const merkezler = [{ universite: 'İstanbul Üniversitesi-Cerrahpaşa' }];
    assert.equal(profilMerkezi('İstanbul Üniversitesi', merkezler), null);
    assert.equal(profilMerkezi('İstanbul', merkezler), null);
    assert.equal(profilMerkezi('', merkezler), null);
    assert.equal(profilMerkezi(undefined, merkezler), null);
  });
});

test('L2: takma adlar elle yazılmış, tahminle üretilmiyor', () => {
  const kaynak = readFileSync(path.join(KOK, 'src/lib/rehber-arama.mjs'), 'utf8');
  const govde = kaynak.slice(kaynak.indexOf('export function profilMerkezi'));
  assert.doesNotMatch(govde, /\.includes\(/, 'alt dize eşleşmesi geri gelmemeli');
  assert.match(kaynak, /UNIVERSITE_TAKMA_ADLARI/);
});
