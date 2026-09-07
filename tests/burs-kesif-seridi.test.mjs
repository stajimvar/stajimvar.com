import test from 'node:test';
import assert from 'node:assert/strict';
import * as bursKesif from '../src/lib/burs-kesif.mjs';

const BURS_KESIF_KATEGORILERI = bursKesif.BURS_KESIF_KATEGORILERI ?? [];
const bursKesifKategorisineUyar = bursKesif.bursKesifKategorisineUyar ?? (() => false);
const bursKesifSayilari = bursKesif.bursKesifSayilari ?? (() => ({}));
const bursKesifSonuclari = bursKesif.bursKesifSonuclari ?? (() => []);
const yurtdisiBursuMu = bursKesif.yurtdisiBursuMu ?? (() => false);

const SIMDI = new Date('2026-09-06T12:00:00+03:00');
const gun = (n) => {
  const tarih = new Date('2026-09-06T12:00:00+03:00');
  tarih.setUTCDate(tarih.getUTCDate() + n);
  return tarih.toISOString();
};

const burs = (ek = {}) => ({
  id: 'b1',
  title: 'Örnek burs',
  organizationName: 'Örnek kurum',
  shortDescription: '',
  opportunityType: 'scholarship',
  educationLevels: [],
  eligibleDepartments: [],
  eligibleClassYears: [],
  cities: [],
  countries: [],
  languageRequirements: [],
  status: 'published',
  applicationDeadline: gun(20),
  ...ek,
});

test('keşif şeridi sekiz kategoriyi onaylanan sırada tutuyor', () => {
  assert.deepEqual(
    BURS_KESIF_KATEGORILERI.map(({ id, etiket }) => [id, etiket]),
    [
      ['tumu', 'Tümü'],
      ['sana-uygun', 'Sana Uygun'],
      ['yeni-eklenenler', 'Yeni Eklenenler'],
      ['son-gunler', 'Son Günler'],
      ['karsiliksiz', 'Karşılıksız'],
      ['lisans', 'Lisans'],
      ['yuksek-lisans', 'Yüksek Lisans'],
      ['yurt-disi', 'Yurt Dışı'],
    ]
  );
});

test('yeni eklenenler son yedi İstanbul takvim gününü kapsıyor', () => {
  assert.equal(bursKesifKategorisineUyar(burs({ publishedAt: gun(0) }), 'yeni-eklenenler', { now: SIMDI }), true);
  assert.equal(bursKesifKategorisineUyar(burs({ publishedAt: gun(-6) }), 'yeni-eklenenler', { now: SIMDI }), true);
  assert.equal(bursKesifKategorisineUyar(burs({ publishedAt: gun(-7) }), 'yeni-eklenenler', { now: SIMDI }), false);
  assert.equal(bursKesifKategorisineUyar(burs({ publishedAt: gun(1) }), 'yeni-eklenenler', { now: SIMDI }), false);
  assert.equal(bursKesifKategorisineUyar(burs({}), 'yeni-eklenenler', { now: SIMDI }), false);
});

test('son günler yalnız açık ve 0–7 gün kalan bursları kapsıyor', () => {
  assert.equal(bursKesifKategorisineUyar(burs({ applicationDeadline: gun(0) }), 'son-gunler', { now: SIMDI }), true);
  assert.equal(bursKesifKategorisineUyar(burs({ applicationDeadline: gun(7) }), 'son-gunler', { now: SIMDI }), true);
  assert.equal(bursKesifKategorisineUyar(burs({ applicationDeadline: gun(8) }), 'son-gunler', { now: SIMDI }), false);
  assert.equal(bursKesifKategorisineUyar(burs({ applicationDeadline: gun(-1) }), 'son-gunler', { now: SIMDI }), false);
  assert.equal(
    bursKesifKategorisineUyar(
      burs({ applicationStartAt: gun(2), applicationDeadline: gun(7) }),
      'son-gunler',
      { now: SIMDI }
    ),
    false
  );
});

test('karşılıksız ve eğitim seviyeleri mevcut doğruluk kurallarını kullanıyor', () => {
  assert.equal(bursKesifKategorisineUyar(burs({ repayable: false }), 'karsiliksiz', { now: SIMDI }), true);
  assert.equal(bursKesifKategorisineUyar(burs({ repayable: true }), 'karsiliksiz', { now: SIMDI }), false);
  assert.equal(bursKesifKategorisineUyar(burs({}), 'karsiliksiz', { now: SIMDI }), false);

  assert.equal(bursKesifKategorisineUyar(burs({ educationLevels: ['Lisans'] }), 'lisans', { now: SIMDI }), true);
  assert.equal(bursKesifKategorisineUyar(burs({ educationLevels: ['Doktora'] }), 'lisans', { now: SIMDI }), false);
  assert.equal(bursKesifKategorisineUyar(burs({ educationLevels: [] }), 'lisans', { now: SIMDI }), true);
  assert.equal(
    bursKesifKategorisineUyar(burs({ educationLevels: ['Yüksek Lisans'] }), 'yuksek-lisans', { now: SIMDI }),
    true
  );
});

test('sana uygun yalnız doğrulanmış profil uyumunu kabul ediyor', () => {
  const student = { gradeLevel: 'Lisans', department: 'Hukuk', city: 'Ankara' };
  const damgalar = {
    departmentsVerifiedAt: '2026-08-01T00:00:00Z',
    educationLevelsVerifiedAt: '2026-08-01T00:00:00Z',
    citiesVerifiedAt: '2026-08-01T00:00:00Z',
  };
  const uygun = burs({ ...damgalar, educationLevels: ['Lisans'] });

  assert.equal(bursKesifKategorisineUyar(uygun, 'sana-uygun', { student, now: SIMDI }), true);
  assert.equal(
    bursKesifKategorisineUyar(burs({ educationLevels: ['Lisans'] }), 'sana-uygun', { student, now: SIMDI }),
    false
  );
  assert.equal(bursKesifKategorisineUyar(uygun, 'sana-uygun', { student: null, now: SIMDI }), false);
});

test('yurt dışı sınıflandırması bölüm ve şerit için aynı kaynağı kullanıyor', () => {
  const turler = ['international', 'education', 'student_support', 'youth_program'];
  for (const opportunityType of turler) {
    const item = burs({ opportunityType });
    assert.equal(yurtdisiBursuMu(item), true);
    assert.equal(bursKesifKategorisineUyar(item, 'yurt-disi', { now: SIMDI }), true);
  }
  assert.equal(yurtdisiBursuMu(burs({ countries: ['Almanya'] })), true);
  assert.equal(yurtdisiBursuMu(burs()), false);
});

test('sayımlar seçili kategoriden etkilenmez ve sıfır kategorileri korur', () => {
  const veri = [
    burs({ id: 'a', repayable: false, publishedAt: gun(-1), educationLevels: ['Lisans'] }),
    burs({ id: 'b', applicationDeadline: gun(5), opportunityType: 'international' }),
  ];
  const sayilar = bursKesifSayilari(veri, { now: SIMDI });
  assert.deepEqual(sayilar, {
    tumu: 2,
    'sana-uygun': 0,
    'yeni-eklenenler': 1,
    'son-gunler': 1,
    karsiliksiz: 1,
    lisans: 2,
    'yuksek-lisans': 1,
    'yurt-disi': 1,
  });
});

test('kategori süzmesi taban listenin sırasını değiştirmiyor', () => {
  const veri = [
    burs({ id: 'once', repayable: false, applicationDeadline: gun(20) }),
    burs({ id: 'elenecek', repayable: true, applicationDeadline: gun(1) }),
    burs({ id: 'sonra', repayable: false, applicationDeadline: gun(2) }),
  ];
  assert.deepEqual(
    bursKesifSonuclari(veri, 'karsiliksiz', { now: SIMDI }).map((item) => item.id),
    ['once', 'sonra']
  );
  assert.equal(bursKesifSonuclari(veri, 'tumu', { now: SIMDI }), veri);
});
