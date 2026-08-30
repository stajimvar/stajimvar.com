import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DURUM,
  boyutEslesmesi,
  incelemeSirasi,
  kapsamaOzeti,
  kisisellestirmeyeHazir,
  kisitDurumu,
  ogrenciyeUygun,
} from '../src/lib/burs-uygunluk.mjs';

/*
  ANA KURAL: UNKNOWN ≠ UNRESTRICTED

  Bu dosyadaki her test o ayrımı koruyor. Geçen bir test, kısıtları
  bilinmeyen bir bursun "sana uygun" etiketiyle gösterilmesi demek —
  öğrenci başvuramayacağı bir burs için emek harcar.
*/

const DAMGA = '2026-08-30T00:00:00Z';

const burs = (ek = {}) => ({
  id: 'b1',
  title: 'Örnek Burs',
  eligibleDepartments: [],
  educationLevels: [],
  cities: [],
  ...ek,
});

/** Üç boyutu da doğrulanmış, hiç kısıtı olmayan burs. */
const acikBurs = (ek = {}) =>
  burs({
    departmentsVerifiedAt: DAMGA,
    educationLevelsVerifiedAt: DAMGA,
    citiesVerifiedAt: DAMGA,
    ...ek,
  });

const OGRENCI = { bolum: 'Bilgisayar Mühendisliği', seviye: 'Lisans', sehir: 'İzmir' };

/* ------------------------------------------------------------ üç durum */

test('damga yoksa DOĞRULANMADI — dizi boş olsa bile', () => {
  assert.equal(kisitDurumu(burs(), 'bolum'), DURUM.DOGRULANMADI);
  assert.equal(kisitDurumu(burs(), 'seviye'), DURUM.DOGRULANMADI);
  assert.equal(kisitDurumu(burs(), 'sehir'), DURUM.DOGRULANMADI);
});

test('DİZİ DOLU AMA DAMGA YOKSA yine DOĞRULANMADI', () => {
  /*
    68 kaydın 11'inde eğitim seviyesi elle girilmişti ve kaynaktan
    doğrulandıklarına dair kayıt yok. Var olan veriyi "doğrulanmış"
    saymak, bu modelin önlemeye çalıştığı hatanın kendisi olurdu.
  */
  const b = burs({ educationLevels: ['Lisans'] });
  assert.equal(kisitDurumu(b, 'seviye'), DURUM.DOGRULANMADI);
});

test('damga dolu + dizi boş = KISIT YOK', () => {
  assert.equal(kisitDurumu(burs({ departmentsVerifiedAt: DAMGA }), 'bolum'), DURUM.KISIT_YOK);
});

test('damga dolu + dizi dolu = KISITLI', () => {
  const b = burs({ departmentsVerifiedAt: DAMGA, eligibleDepartments: ['Hukuk'] });
  assert.equal(kisitDurumu(b, 'bolum'), DURUM.KISITLI);
});

/* -------------------------------------------------------- boyut eşleşme */

test('BÖLÜM DOĞRULANMADI → BILINMIYOR, uygun sayılmıyor', () => {
  assert.equal(boyutEslesmesi(burs(), 'bolum', OGRENCI.bolum), 'BILINMIYOR');
});

test('bölüm KISIT YOK → her bölüme uyuyor', () => {
  const b = burs({ departmentsVerifiedAt: DAMGA });
  assert.equal(boyutEslesmesi(b, 'bolum', 'Bilgisayar Mühendisliği'), 'UYUYOR');
  assert.equal(boyutEslesmesi(b, 'bolum', 'Hukuk'), 'UYUYOR');
});

test('bölüm KISITLI + eşleşme → UYUYOR', () => {
  const b = burs({ departmentsVerifiedAt: DAMGA, eligibleDepartments: ['Bilgisayar Mühendisliği'] });
  assert.equal(boyutEslesmesi(b, 'bolum', 'Bilgisayar Mühendisliği'), 'UYUYOR');
});

test('bölüm KISITLI + eşleşmeme → UYMUYOR', () => {
  const b = burs({ departmentsVerifiedAt: DAMGA, eligibleDepartments: ['Hukuk'] });
  assert.equal(boyutEslesmesi(b, 'bolum', 'Bilgisayar Mühendisliği'), 'UYMUYOR');
});

test('öğrencinin kendi bilgisi eksikse de BILINMIYOR', () => {
  const b = burs({ departmentsVerifiedAt: DAMGA, eligibleDepartments: ['Hukuk'] });
  assert.equal(boyutEslesmesi(b, 'bolum', undefined), 'BILINMIYOR');
  assert.equal(boyutEslesmesi(b, 'bolum', ''), 'BILINMIYOR');
});

/* --------------------------- aynı kural seviye ve şehir için de geçerli */

for (const [boyut, damgaAlani, listeAlani, uyan, uymayan] of [
  ['seviye', 'educationLevelsVerifiedAt', 'educationLevels', 'Lisans', 'Doktora'],
  ['sehir', 'citiesVerifiedAt', 'cities', 'İzmir', 'Ankara'],
]) {
  test(`${boyut}: DOĞRULANMADI → BILINMIYOR`, () => {
    assert.equal(boyutEslesmesi(burs(), boyut, uyan), 'BILINMIYOR');
  });

  test(`${boyut}: KISIT YOK → UYUYOR`, () => {
    assert.equal(boyutEslesmesi(burs({ [damgaAlani]: DAMGA }), boyut, uyan), 'UYUYOR');
    assert.equal(boyutEslesmesi(burs({ [damgaAlani]: DAMGA }), boyut, uymayan), 'UYUYOR');
  });

  test(`${boyut}: KISITLI + eşleşme → UYUYOR`, () => {
    const b = burs({ [damgaAlani]: DAMGA, [listeAlani]: [uyan] });
    assert.equal(boyutEslesmesi(b, boyut, uyan), 'UYUYOR');
  });

  test(`${boyut}: KISITLI + eşleşmeme → UYMUYOR`, () => {
    const b = burs({ [damgaAlani]: DAMGA, [listeAlani]: [uyan] });
    assert.equal(boyutEslesmesi(b, boyut, uymayan), 'UYMUYOR');
  });
}

/* -------------------------------------------- kişiselleştirmeye hazırlık */

test('üç boyut da doğrulanmadan HAZIR DEĞİL', () => {
  assert.equal(kisisellestirmeyeHazir(burs()), false);
  assert.equal(kisisellestirmeyeHazir(burs({ departmentsVerifiedAt: DAMGA })), false);
  assert.equal(
    kisisellestirmeyeHazir(burs({ departmentsVerifiedAt: DAMGA, educationLevelsVerifiedAt: DAMGA })),
    false
  );
  assert.equal(kisisellestirmeyeHazir(acikBurs()), true);
});

test('TEK BİR DOĞRULANMAMIŞ BOYUT "sana uygun"u kapatıyor', () => {
  /*
    Seviyesi doğrulanmış ama bölümü bilinmeyen bir burs aslında yalnızca
    hukuk öğrencilerine açık olabilir. Bilgisayar mühendisliği
    öğrencisine "sana uygun" demek yanlış olur.
  */
  const yarim = burs({ educationLevelsVerifiedAt: DAMGA, citiesVerifiedAt: DAMGA });
  assert.equal(ogrenciyeUygun(yarim, OGRENCI), false);
});

test('üç boyut doğrulanmış ve kısıtsızsa uygun', () => {
  assert.equal(ogrenciyeUygun(acikBurs(), OGRENCI), true);
});

test('kısıtlar eşleşiyorsa uygun', () => {
  const b = acikBurs({
    eligibleDepartments: ['Bilgisayar Mühendisliği'],
    educationLevels: ['Lisans'],
    cities: ['İzmir'],
  });
  assert.equal(ogrenciyeUygun(b, OGRENCI), true);
});

test('bir kısıt uymuyorsa uygun değil', () => {
  const b = acikBurs({ cities: ['Ankara'] });
  assert.equal(ogrenciyeUygun(b, OGRENCI), false);
});

test('öğrenci profili eksikse uygun sayılmıyor', () => {
  assert.equal(ogrenciyeUygun(acikBurs({ eligibleDepartments: ['Hukuk'] }), {}), false);
});

/* ------------------------------------------------------------- kapsama */

test('kapsama özeti gerçek veriden sayıyor', () => {
  const veri = [
    burs({ id: '1' }),
    burs({ id: '2', departmentsVerifiedAt: DAMGA }),
    acikBurs({ id: '3' }),
    acikBurs({ id: '4', amountVerifiedAt: DAMGA }),
  ];
  const o = kapsamaOzeti(veri);
  assert.equal(o.toplam, 4);
  assert.equal(o.bolumDogrulandi, 3);
  assert.equal(o.seviyeDogrulandi, 2);
  assert.equal(o.sehirDogrulandi, 2);
  assert.equal(o.tutarDogrulandi, 1);
  assert.equal(o.ucBoyutTamam, 2);
  assert.equal(o.hicDokunulmamis, 1);
});

test('boş listede kapsama sıfır', () => {
  const o = kapsamaOzeti([]);
  assert.equal(o.toplam, 0);
  assert.equal(o.ucBoyutTamam, 0);
});

/* -------------------------------------------------------- inceleme sırası */

test('önerisi olanlar en başa geliyor', () => {
  const veri = [
    burs({ id: 'onerisiz' }),
    burs({ id: 'onerili' }),
  ];
  const sira = incelemeSirasi(veri, { onerili: 2 });
  assert.equal(sira[0].id, 'onerili');
});

test('son başvurusu yaklaşanlar dokunulmamışlardan önce', () => {
  const yakin = burs({
    id: 'yakin',
    applicationDeadline: new Date(Date.now() + 5 * 86400000).toISOString(),
  });
  const uzak = burs({ id: 'uzak' });
  const sira = incelemeSirasi([uzak, yakin], {});
  assert.equal(sira[0].id, 'yakin');
});
