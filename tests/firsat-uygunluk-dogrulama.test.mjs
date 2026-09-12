import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { opportunityFit, personalizationReadyCount } from '../src/lib/firsat-degerlendirme.mjs';
import { firsatRozetleri } from '../src/lib/firsat-kategori.mjs';

/*
  UNKNOWN ≠ VERIFIED · DOLU DİZİ ≠ DOĞRULANMIŞ UYGUNLUK

  `opportunityFit` doğrulama damgalarına hiç bakmıyordu: `educationLevels`
  dizisi doluysa "kesin bilgi" sayıyor ve öğrenciyi o bilgiyle listeden
  ELEYEBİLİYORDU. Üretimde ölçüldü (31 Ağustos 2026): dizisi dolu 11
  kaydın on birinde de education_levels_verified_at NULL — yani "kesin"
  denen her kayıt aslında doğrulanmamıştı.

  Buradaki testler üç boyutun (bölüm, seviye, şehir) her biri için üç
  durumu da bağlıyor ve "dolu dizi = doğrulanmış" varsayan yeni bir
  yardımcının doğmasını engelliyor.
*/

const DAMGA = '2026-08-01T00:00:00Z';

const firsat = (ek = {}) => ({
  id: 'f1',
  title: 'Örnek Burs',
  shortDescription: '',
  educationLevels: [],
  eligibleDepartments: [],
  cities: [],
  ...ek,
});

const OGRENCI = { gradeLevel: 'Lisans', department: 'Hukuk', city: 'Ankara' };

/** Üç boyutu da doğrulanmış, kısıtsız bir taban. */
const HEPSI_DOGRULANMIS = {
  departmentsVerifiedAt: DAMGA,
  educationLevelsVerifiedAt: DAMGA,
  citiesVerifiedAt: DAMGA,
};

/* --------------------------------------------------- eğitim seviyesi */

test('education_levels dolu + damga NULL → DOĞRULANMADI, eşleştirme yok', () => {
  const f = opportunityFit(firsat({ educationLevels: ['Yüksek Lisans'] }), OGRENCI);
  assert.equal(f.durum, 'bilinmiyor');
  assert.equal(f.kesin, false, 'doğrulanmamış dizi "kesin" sayılıyor');
});

test('education_levels dolu + damga NULL öğrenciyi ELEMİYOR', () => {
  /* Eskiden 'sart_uymuyor' dönüyordu ve fırsat listeden çıkıyordu. */
  const f = opportunityFit(firsat({ educationLevels: ['Doktora'] }), OGRENCI);
  assert.notEqual(f.durum, 'sart_uymuyor');
});

test('damga dolu + dizi boş → kısıt yok, uygun', () => {
  const f = opportunityFit(firsat(HEPSI_DOGRULANMIS), OGRENCI);
  assert.equal(f.durum, 'uygun_olabilir');
  assert.equal(f.kesin, true);
});

test('damga dolu + [Lisans] → yalnız lisans eşleşir', () => {
  const f = firsat({ ...HEPSI_DOGRULANMIS, educationLevels: ['Lisans'] });
  assert.equal(opportunityFit(f, OGRENCI).durum, 'uygun_olabilir');
  assert.equal(
    opportunityFit(f, { ...OGRENCI, gradeLevel: 'Yüksek Lisans / Mezun' }).durum,
    'sart_uymuyor',
  );
});

/* ----------------------------------------------------------- bölüm */

test('eligible_departments dolu + damga NULL → DOĞRULANMADI', () => {
  const f = opportunityFit(firsat({ eligibleDepartments: ['Tıp'] }), OGRENCI);
  assert.equal(f.durum, 'bilinmiyor');
  assert.equal(f.kesin, false);
});

test('bölüm damgası dolu + [Hukuk] → yalnız hukuk eşleşir', () => {
  const f = firsat({ ...HEPSI_DOGRULANMIS, eligibleDepartments: ['Hukuk'] });
  assert.equal(opportunityFit(f, OGRENCI).durum, 'uygun_olabilir');
  assert.equal(opportunityFit(f, { ...OGRENCI, department: 'Tıp' }).durum, 'sart_uymuyor');
});

/* ----------------------------------------------------------- şehir */

test('cities dolu + damga NULL → DOĞRULANMADI', () => {
  const f = opportunityFit(firsat({ cities: ['İzmir'] }), OGRENCI);
  assert.equal(f.durum, 'bilinmiyor');
  assert.equal(f.kesin, false);
});

test('şehir damgası dolu + [Ankara] → yalnız Ankara eşleşir', () => {
  const f = firsat({ ...HEPSI_DOGRULANMIS, cities: ['Ankara'] });
  assert.equal(opportunityFit(f, OGRENCI).durum, 'uygun_olabilir');
  assert.equal(opportunityFit(f, { ...OGRENCI, city: 'İzmir' }).durum, 'sart_uymuyor');
});

/*
  ŞEHİR İSTEĞE BAĞLI OLDU — ÜÇ KURAL

  `student_profiles.city` 20260926130000 göçüyle geldi ve İSTEĞE BAĞLI.
  Önceki hâlde `StudentProfile`ta ikamet ili diye bir alan hiç yoktu:
  şehir boyutu her gerçek kullanıcıda BILINMIYOR dönüyordu, dolayısıyla
  "Sana uygun" rozeti ve "Bana uygun" süzgeci hiçbir zaman sonuç
  vermiyordu. Aşağıdaki üç test o boyutun yeni sözleşmesini bağlıyor.
*/

test('çevrim içi fırsatta şehir aranmıyor: damgasız da olsa boyut UYGUN', () => {
  /*
    `event_mode = 'online'` kayıtta fiziksel bir yer yok; doğrulanacak
    şehir de yok. Damga şartı burada tutulsaydı çevrim içi etkinlikler
    yalnızca bu yüzden kişiselleştirmenin dışında kalırdı.
  */
  const f = firsat({
    departmentsVerifiedAt: DAMGA,
    educationLevelsVerifiedAt: DAMGA,
    eventMode: 'online',
  });
  assert.equal(personalizationReadyCount([f]), 1, 'çevrim içi kayıt hazır sayılmıyor');
  const sehirsiz = opportunityFit(f, { gradeLevel: 'Lisans', department: 'Hukuk' });
  assert.equal(sehirsiz.durum, 'uygun_olabilir', 'çevrim içi kayıtta şehir aranıyor');
  assert.equal(sehirsiz.kesin, true);
});

test('şehir şartı + profilde şehir yok → belirsiz; rozet yok, kayıt düşmüyor', () => {
  const f = firsat({ ...HEPSI_DOGRULANMIS, cities: ['Ankara'] });
  const sonuc = opportunityFit(f, { gradeLevel: 'Lisans', department: 'Hukuk' });

  assert.equal(sonuc.durum, 'bilinmiyor');
  assert.notEqual(sonuc.durum, 'sart_uymuyor', 'eksik profil şart ihlali sayılıyor');
  assert.equal(sonuc.kesin, false);
  assert.deepEqual(firsatRozetleri(f, { fit: sonuc, simdi: new Date(2026, 8, 11) }), []);
  /* Not hangi alanın eksik olduğunu söylüyor; "bölüm, sınıf ve şehir" demiyor. */
  assert.match(String(sonuc.not), /şehir/);
  assert.doesNotMatch(String(sonuc.not), /bölüm|sınıf/);
});

test('şehir şartı + eşleşmeyen şehir → uygun değil, rozet yok', () => {
  const f = firsat({ ...HEPSI_DOGRULANMIS, cities: ['Ankara'] });
  const sonuc = opportunityFit(f, { ...OGRENCI, city: 'Şanlıurfa' });

  assert.equal(sonuc.durum, 'sart_uymuyor');
  assert.equal(sonuc.kesin, true, 'doğrulanmış şart "kesin" sayılmıyor');
  assert.deepEqual(firsatRozetleri(f, { fit: sonuc, simdi: new Date(2026, 8, 11) }), []);
});

/* ------------------------------------------------- boyutların birliği */

test('boyutlardan biri doğrulanmamışsa kesin bilgi yok', () => {
  const eksik = { ...HEPSI_DOGRULANMIS };
  delete eksik.citiesVerifiedAt;
  const f = opportunityFit(firsat(eksik), OGRENCI);
  assert.equal(f.durum, 'bilinmiyor');
  assert.equal(f.kesin, false);
});

test('öğrencinin kendi bilgisi eksikse "uygun" denmiyor', () => {
  const f = firsat({ ...HEPSI_DOGRULANMIS, eligibleDepartments: ['Hukuk'] });
  const sonuc = opportunityFit(f, { gradeLevel: 'Lisans', city: 'Ankara' });
  assert.equal(sonuc.durum, 'bilinmiyor');
  assert.equal(sonuc.kesin, false);
});

/* ------------------------------------------------------- başlık izi */

test('başlıktan okunan sinyal ELEME yapmıyor, yalnız uyarı yazıyor', () => {
  const f = opportunityFit(
    firsat({ title: 'TÜBİTAK 2250 Lisansüstü Bursu' }),
    { gradeLevel: '2. Sınıf', department: 'Hukuk', city: 'Ankara' },
  );
  assert.equal(f.durum, 'bilinmiyor', 'başlık tahmini durum üretiyor');
  assert.equal(f.kesin, false);
  assert.match(String(f.not), /lisansüstü/i, 'uyarı metni kayboldu');
});

/* ----------------------------------------------------------- sayaç */

test('personalizationReadyCount yalnız üç damgası da olanı sayıyor', () => {
  const liste = [
    firsat({ id: '1' }),
    firsat({ id: '2', educationLevels: ['Lisans'] }),
    firsat({ id: '3', ...HEPSI_DOGRULANMIS }),
  ];
  assert.equal(personalizationReadyCount(liste), 1);
});

/* --------------------------------------- "dolu dizi = doğrulanmış" nöbeti */

test('kişiselleştirme kararı damgasız dizi uzunluğuna bakmıyor', () => {
  /*
    Yeni bir yardımcı "dizi doluysa doğrulanmış" varsayarsa bu test
    kırılır: karar veren tek yer burs-uygunluk.mjs olmalı.
  */
  const kaynak = readFileSync(
    new URL('../src/lib/firsat-degerlendirme.mjs', import.meta.url),
    'utf8',
  );
  const govde = kaynak.slice(kaynak.indexOf('export function opportunityFit'));
  assert.doesNotMatch(
    govde,
    /(educationLevels|eligibleDepartments|cities)[^\n]*\.length\s*>\s*0/,
    'opportunityFit dizi uzunluğuna bakarak karar veriyor',
  );
  assert.match(
    kaynak,
    /kisisellestirmeyeHazir/,
    'doğrulama kapısı (kisisellestirmeyeHazir) kullanılmıyor',
  );
});
