import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOLUM_GORUNUMU,
  BOLUM_ONCELIGI,
  BOS_SUZGEC,
  TURKIYE_GENELI,
  bursBolumleri,
  bursEtiketleri,
  bursSonuclari,
  bursSuzgecSecenekleri,
  bursSuzgectenGecer,
  bursTarihDurumu,
  bursTarihMetni,
  bursTutariVar,
  kisitaUyar,
  profilYeterliMi,
  suzgecAktifMi,
  turkiyeGeneliMi,
} from '../src/lib/burs-kesif.mjs';

/*
  Tarih hesapları Europe/Istanbul'a göre gün başına normalize ediliyor.
  Testler bunu doğrudan sınıyor: saat dilimi kayarsa aynı burs bir yerde
  "son gün", başka yerde "yarın" görünürdü.
*/
const SIMDI = new Date('2026-09-01T09:00:00+03:00');
const gun = (n) => {
  const t = new Date(SIMDI);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

const burs = (ek = {}) => ({
  id: ek.id ?? 'b1',
  slug: 'ornek',
  title: 'Örnek Burs',
  organizationName: 'Örnek Vakfı',
  opportunityType: 'scholarship',
  educationLevels: [],
  eligibleDepartments: [],
  cities: [],
  countries: [],
  verifiedAt: '2026-08-01T00:00:00Z',
  ...ek,
});

/* ------------------------------------------------------- tarih durumu */

test('son 3 gün "son-gunler", 4-7 gün "yakin", 8+ gün normal', () => {
  assert.equal(bursTarihDurumu(burs({ applicationDeadline: gun(0) }), SIMDI), 'son-gunler');
  assert.equal(bursTarihDurumu(burs({ applicationDeadline: gun(3) }), SIMDI), 'son-gunler');
  assert.equal(bursTarihDurumu(burs({ applicationDeadline: gun(4) }), SIMDI), 'yakin');
  assert.equal(bursTarihDurumu(burs({ applicationDeadline: gun(7) }), SIMDI), 'yakin');
  assert.equal(bursTarihDurumu(burs({ applicationDeadline: gun(8) }), SIMDI), 'normal');
});

test('henüz açılmamış burs "yakinda", tarihi olmayan "tarihsiz"', () => {
  assert.equal(
    bursTarihDurumu(burs({ applicationStartAt: gun(10), applicationDeadline: gun(40) }), SIMDI),
    'yakinda'
  );
  assert.equal(bursTarihDurumu(burs({}), SIMDI), 'tarihsiz');
});

test('süresi dolan burs "kapali"', () => {
  assert.equal(bursTarihDurumu(burs({ applicationDeadline: gun(-1) }), SIMDI), 'kapali');
});

test('tarih metni tek cümle ve sahte aciliyet içermiyor', () => {
  assert.equal(bursTarihMetni(burs({ applicationDeadline: gun(0) }), SIMDI), 'Bugün son gün');
  assert.equal(bursTarihMetni(burs({ applicationDeadline: gun(1) }), SIMDI), 'Son gün yarın');
  assert.equal(bursTarihMetni(burs({}), SIMDI), 'Başvuru tarihi açıklanmadı');
  assert.match(
    bursTarihMetni(burs({ applicationStartAt: gun(10), applicationDeadline: gun(40) }), SIMDI),
    /açılıyor$/
  );
  /* "hemen", "acele", ünlem yok. */
  for (const g of [0, 1, 2, 5, 20]) {
    const metin = bursTarihMetni(burs({ applicationDeadline: gun(g) }), SIMDI);
    assert.ok(!/hemen|acele|kaçırma|!/i.test(metin), `baskı dili: ${metin}`);
  }
});

test('açılış tarihi gün-ay olarak yazılıyor', () => {
  const metin = bursTarihMetni(
    burs({ applicationStartAt: '2026-09-30', applicationDeadline: gun(60) }),
    SIMDI
  );
  assert.equal(metin, '30 Eylül’ta açılıyor'.replace('’', "'"));
});

/* ---------------------------------------------------------- etiketler */

test('etiketler yalnızca veriden geliyor ve üçle sınırlı', () => {
  const e = bursEtiketleri(
    burs({ educationLevels: ['Lisans', 'Yüksek Lisans'], cities: ['Ankara'], countries: ['Almanya'] })
  );
  assert.equal(e.length, 3);
  assert.deepEqual(e, ['Lisans', 'Yüksek Lisans', 'Ankara']);
});

test('alan boşsa etiket uydurulmuyor', () => {
  assert.deepEqual(bursEtiketleri(burs({})), []);
});

test('tutar yalnızca doğrulanmışsa var sayılıyor', () => {
  assert.equal(bursTutariVar(burs({})), false);
  assert.equal(bursTutariVar(burs({ amountMin: 5000 })), false);
  assert.equal(bursTutariVar(burs({ amountVerifiedAt: '2026-08-01' })), true);
});

/* ----------------------------------------------------------- süzgeçler */

test('boş süzgeç arama modunu açmıyor', () => {
  assert.equal(suzgecAktifMi(BOS_SUZGEC), false);
  assert.equal(suzgecAktifMi({ ...BOS_SUZGEC, q: 'tübitak' }), true);
  assert.equal(suzgecAktifMi({ ...BOS_SUZGEC, durum: 'acik' }), true);
});

const SEHIR_DAMGASI = '2026-08-30T00:00:00Z';

test('Türkiye geneli = şehir şartı OLMADIĞI DOĞRULANMIŞ', () => {
  /*
    Boş şehir listesi tek başına yetmiyor. Boş liste iki zıt şey olabilir:
    kaynak okundu ve şart yok, ya da kaynak hiç okunmadı. İkincisine
    "Türkiye geneli" demek, Ankara'da oturma şartı olabilecek bir bursu
    İzmir'deki öğrenciye olgu diye sunmak olurdu.
  */
  assert.equal(turkiyeGeneliMi(burs({})), false, 'damgasız boş liste iddia taşımamalı');
  assert.equal(turkiyeGeneliMi(burs({ citiesVerifiedAt: SEHIR_DAMGASI })), true);
  assert.equal(
    turkiyeGeneliMi(burs({ citiesVerifiedAt: SEHIR_DAMGASI, cities: ['İzmir'] })),
    false
  );
  assert.equal(
    turkiyeGeneliMi(burs({ citiesVerifiedAt: SEHIR_DAMGASI, countries: ['Almanya'] })),
    false
  );
});

test('süzgeçler beklendiği gibi eliyor', () => {
  const b = burs({ educationLevels: ['Lisans'], cities: ['İzmir'], applicationDeadline: gun(5) });
  assert.equal(bursSuzgectenGecer(b, { seviye: 'Lisans' }, SIMDI), true);
  assert.equal(bursSuzgectenGecer(b, { seviye: 'Doktora' }, SIMDI), false);
  assert.equal(bursSuzgectenGecer(b, { yer: 'İzmir' }, SIMDI), true);
  assert.equal(bursSuzgectenGecer(b, { yer: TURKIYE_GENELI }, SIMDI), false);
  assert.equal(bursSuzgectenGecer(b, { durum: 'acik' }, SIMDI), true);
  assert.equal(bursSuzgectenGecer(b, { durum: 'yakinda' }, SIMDI), false);
  assert.equal(bursSuzgectenGecer(b, { q: 'örnek' }, SIMDI), true);
  assert.equal(bursSuzgectenGecer(b, { q: 'bulunmayan' }, SIMDI), false);
});

test('seçeneği olmayan süzgeç boş liste döndürüyor (kutu çizilmesin)', () => {
  const secenekler = bursSuzgecSecenekleri([burs({}), burs({ id: 'b2' })]);
  /* Hiçbir kayıtta bölüm yok: liste boş, ekranda kutu çizilmiyor. */
  assert.deepEqual(secenekler.bolumler, []);
  assert.deepEqual(secenekler.seviyeler, []);
  /*
    Hepsi şehirsiz AMA hiçbiri doğrulanmamış: "Türkiye geneli" seçeneği
    sunulmuyor. Sunulsaydı seçen kişiye doğrulanmamış kayıtları olgu
    diye verirdik.
  */
  assert.deepEqual(secenekler.yerler, []);

  const damgali = bursSuzgecSecenekleri([burs({ citiesVerifiedAt: SEHIR_DAMGASI })]);
  assert.deepEqual(damgali.yerler, [[TURKIYE_GENELI, 'Türkiye geneli']]);
});

test('süzgeç seçenekleri gerçek veriden türetiliyor', () => {
  const secenekler = bursSuzgecSecenekleri([
    burs({ id: 'a', educationLevels: ['Lisans'], cities: ['Ankara'] }),
    burs({ id: 'b', opportunityType: 'kyk', educationLevels: ['Doktora'] }),
  ]);
  assert.deepEqual(secenekler.seviyeler, [['Doktora', 'Doktora'], ['Lisans', 'Lisans']]);
  assert.equal(secenekler.turler.length, 2);
  assert.ok(secenekler.yerler.some(([k]) => k === 'Ankara'));
});

/* ------------------------------------------------------------ bölümler */

test('öncelik ve görünüm listeleri aynı bölümleri içeriyor', () => {
  assert.deepEqual([...BOLUM_ONCELIGI].sort(), [...BOLUM_GORUNUMU].sort());
});

test('bir burs yalnızca TEK bölümde görünüyor', () => {
  const veri = [
    burs({ id: '1', applicationDeadline: gun(1) }),
    burs({ id: '2', applicationDeadline: gun(10) }),
    burs({ id: '3', applicationStartAt: gun(20), applicationDeadline: gun(50) }),
    burs({ id: '4' }),
    burs({ id: '5', opportunityType: 'international', countries: ['Almanya'] }),
  ];
  const bolumler = bursBolumleri(veri, { now: SIMDI });
  const gorulen = bolumler.flatMap((b) => b.items.map((i) => i.id));
  assert.equal(gorulen.length, new Set(gorulen).size, 'aynı burs iki bölümde');
});

test('son günler bölümü "sana uygun"dan önce sahipleniyor', () => {
  /*
    Profiline uyan ve iki gün sonra kapanan bir burs "Son Günler"e
    düşmeli: tarih kaçırılınca telafisi olmayan tek bilgi.
  */
  const veri = [burs({ id: '1', educationLevels: ['Lisans'], applicationDeadline: gun(2) })];
  const bolumler = bursBolumleri(veri, {
    now: SIMDI,
    student: { gradeLevel: '3. Sınıf' },
  });
  const sonGunler = bolumler.find((b) => b.id === 'son-gunler');
  assert.ok(sonGunler, 'son günler bölümü yok');
  assert.equal(sonGunler.items[0].id, '1');
});

test('süresi dolan burslar hiçbir bölümde yok', () => {
  const veri = [
    burs({ id: 'gecmis', applicationDeadline: gun(-5) }),
    burs({ id: 'acik', applicationDeadline: gun(10) }),
  ];
  const gorulen = bursBolumleri(veri, { now: SIMDI }).flatMap((b) => b.items.map((i) => i.id));
  assert.ok(!gorulen.includes('gecmis'));
  assert.ok(gorulen.includes('acik'));
});

test('profil yetersizse "Bu Dönem Öne Çıkanlar" gösteriliyor', () => {
  const veri = [burs({ id: '1', applicationDeadline: gun(20) })];
  const bolumler = bursBolumleri(veri, { now: SIMDI, student: null });
  assert.ok(bolumler.some((b) => b.id === 'one-cikanlar'));
  assert.ok(!bolumler.some((b) => b.id === 'sana-uygun'));
});

/*
  ÜÇ BOYUTU DA DOĞRULANMIŞ BURS.

  Damgalar olmadan bu bölüm açılmamalı; bu testler tam olarak o sınırı
  çiziyor. Önce `educationLevels: ['Lisans']` yazmak yetiyordu ve
  bölüm açılıyordu — yani dolu dizi doğrulanmış sayılıyordu.
*/
const DAMGALI = {
  departmentsVerifiedAt: '2026-08-01T00:00:00Z',
  educationLevelsVerifiedAt: '2026-08-01T00:00:00Z',
  citiesVerifiedAt: '2026-08-01T00:00:00Z',
};

const OGRENCI = { gradeLevel: 'Lisans', department: 'Hukuk', city: 'Ankara' };

test('üç boyut da doğrulanmış ve eşleşiyorsa "Sana Uygun Burslar" açılıyor', () => {
  const veri = [
    burs({ id: '1', ...DAMGALI, educationLevels: ['Lisans'], applicationDeadline: gun(20) }),
  ];
  const bolumler = bursBolumleri(veri, { now: SIMDI, student: OGRENCI });
  const kisisel = bolumler.find((b) => b.id === 'sana-uygun');
  assert.ok(kisisel, '"sana uygun" bölümü açılmadı');
  assert.equal(kisisel.baslik, 'Sana Uygun Burslar');
  assert.equal(kisisel.kisisel, true);
});

test('DOLU DİZİ AMA DAMGA YOK: "sana uygun" açılmıyor', () => {
  /*
    Üretimde ölçülen durum bu: education_levels dolu 11 kaydın on
    birinde de education_levels_verified_at NULL. Dolu dizi doğrulanmış
    uygunluk DEĞİL.
  */
  const veri = [burs({ id: '1', educationLevels: ['Lisans'], applicationDeadline: gun(20) })];
  const bolumler = bursBolumleri(veri, { now: SIMDI, student: OGRENCI });
  assert.ok(!bolumler.some((b) => b.id === 'sana-uygun'));
});

test('boyutlardan biri doğrulanmamışsa "sana uygun" açılmıyor', () => {
  const eksik = { ...DAMGALI };
  delete eksik.citiesVerifiedAt;
  const veri = [burs({ id: '1', ...eksik, educationLevels: ['Lisans'], applicationDeadline: gun(20) })];
  const bolumler = bursBolumleri(veri, { now: SIMDI, student: OGRENCI });
  assert.ok(!bolumler.some((b) => b.id === 'sana-uygun'));
});

test('hiçbir kısıt doğrulanmamışsa profil dolu olsa bile "sana uygun" açılmıyor', () => {
  const veri = [burs({ id: '1', applicationDeadline: gun(20) })];
  const bolumler = bursBolumleri(veri, { now: SIMDI, student: OGRENCI });
  assert.ok(!bolumler.some((b) => b.id === 'sana-uygun'));
});

test('bölümlerde uydurma eşleşme yüzdesi yok', () => {
  const veri = [burs({ id: '1', educationLevels: ['Lisans'], applicationDeadline: gun(20) })];
  const bolumler = bursBolumleri(veri, { now: SIMDI, student: { gradeLevel: '2. Sınıf' } });
  const metin = JSON.stringify(bolumler);
  assert.ok(!/uyumPuani|matchScore|"%\d/.test(metin));
});

test('boş bölüm çizilmiyor', () => {
  const bolumler = bursBolumleri([], { now: SIMDI });
  assert.deepEqual(bolumler, []);
});

test('profilYeterliMi yalnızca sınıf bilgisine bakıyor', () => {
  assert.equal(profilYeterliMi(null), false);
  assert.equal(profilYeterliMi({}), false);
  assert.equal(profilYeterliMi({ gradeLevel: '1. Sınıf' }), true);
});

/* ------------------------------------------------------------ sonuçlar */

test('sonuç ızgarasında süresi dolanlar yok, sıralama tarihe göre', () => {
  const veri = [
    burs({ id: 'uzak', applicationDeadline: gun(30) }),
    burs({ id: 'gecmis', applicationDeadline: gun(-2) }),
    burs({ id: 'yakin', applicationDeadline: gun(2) }),
    burs({ id: 'tarihsiz' }),
  ];
  const sonuc = bursSonuclari(veri, { q: 'örnek' }, SIMDI).map((i) => i.id);
  assert.deepEqual(sonuc, ['yakin', 'uzak', 'tarihsiz']);
});

/* -------------------------------- kısıt semantiği (boş liste = kısıt yok) */

test('boş kısıt listesi "kısıt yok" demek, "eşleşmiyor" değil', () => {
  assert.equal(kisitaUyar([], 'Makine Mühendisliği'), true);
  assert.equal(kisitaUyar(null, 'Makine Mühendisliği'), true);
  assert.equal(kisitaUyar(undefined, 'X'), true);
  assert.equal(kisitaUyar(['Makine Mühendisliği'], 'Makine Mühendisliği'), true);
  assert.equal(kisitaUyar(['Tıp'], 'Makine Mühendisliği'), false);
});

test('bölüm kısıtı olmayan burs, bölüm süzgecinden geçiyor', () => {
  /*
    "Tüm lisans öğrencileri" diyen bursta eligible_departments boş. Önce
    bu burs bölüm süzgecinde eleniyordu — yani öğrenci kendisine AÇIK olan
    bursları kendi eliyle gizliyordu.
  */
  const kisitsiz = burs({ id: 'kisitsiz', eligibleDepartments: [] });
  const kisitli = burs({ id: 'kisitli', eligibleDepartments: ['Tıp'] });
  assert.equal(bursSuzgectenGecer(kisitsiz, { bolum: 'Bilgisayar Mühendisliği' }, SIMDI), true);
  assert.equal(bursSuzgectenGecer(kisitli, { bolum: 'Bilgisayar Mühendisliği' }, SIMDI), false);
  assert.equal(bursSuzgectenGecer(kisitli, { bolum: 'Tıp' }, SIMDI), true);
});

test('eğitim seviyesi kısıtı yoksa seviye süzgeci elemiyor', () => {
  assert.equal(bursSuzgectenGecer(burs({ educationLevels: [] }), { seviye: 'Lisans' }, SIMDI), true);
  assert.equal(
    bursSuzgectenGecer(burs({ educationLevels: ['Doktora'] }), { seviye: 'Lisans' }, SIMDI),
    false
  );
});

test('şehir süzgeci gizlemiyor, "Türkiye geneli" ise iddia istiyor', () => {
  /*
    İki farklı iş, iki farklı kural:

    Bir ŞEHİR seçmek eleme işi. Şehir şartı bilinmeyen bursu elemek, var
    olabilecek bir fırsatı öğrenciden gizlemek olur — kart zaten kısıtı
    kendi anlatıyor, karar öğrencinin. Bu yüzden burada boş liste geçiyor.

    "Türkiye geneli" seçmek ise İDDİA işi: "şehir şartı yok olanları
    göster". Doğrulanmamış kayıt bu cevabın içine giremez.
  */
  assert.equal(bursSuzgectenGecer(burs({ cities: [] }), { yer: 'İzmir' }, SIMDI), true);
  assert.equal(bursSuzgectenGecer(burs({ cities: ['Ankara'] }), { yer: 'İzmir' }, SIMDI), false);

  assert.equal(bursSuzgectenGecer(burs({ cities: [] }), { yer: TURKIYE_GENELI }, SIMDI), false);
  assert.equal(
    bursSuzgectenGecer(burs({ cities: [], citiesVerifiedAt: SEHIR_DAMGASI }), { yer: TURKIYE_GENELI }, SIMDI),
    true
  );
  assert.equal(
    bursSuzgectenGecer(burs({ cities: ['Ankara'], citiesVerifiedAt: SEHIR_DAMGASI }), { yer: TURKIYE_GENELI }, SIMDI),
    false
  );
});

/* --------------------------------- kişiselleştirme semantiği (uçtan uca) */

/*
  Bu blok "sana uygun" hesabının veri semantiğini bağlıyor. Yanlış bir
  "sana uygun" etiketi, hiç göstermemekten kötü: öğrenci başvuramayacağı
  bir bursa emek harcıyor.
*/

const ogrenci = { bolum: 'Bilgisayar Mühendisliği', seviye: 'Lisans', sehir: 'İzmir' };

const uygunMu = (b) =>
  kisitaUyar(b.eligibleDepartments, ogrenci.bolum) &&
  kisitaUyar(b.educationLevels, ogrenci.seviye) &&
  kisitaUyar([...(b.cities ?? []), ...(b.countries ?? [])], ogrenci.sehir);

test('bölüm kısıtı yoksa öğrenciye uygun', () => {
  assert.equal(uygunMu(burs({ eligibleDepartments: [] })), true);
});

test('bölüm kısıtı öğrencinin bölümünü içeriyorsa uygun', () => {
  assert.equal(uygunMu(burs({ eligibleDepartments: ['Bilgisayar Mühendisliği'] })), true);
});

test('bölüm kısıtı başka bölümse UYGUN DEĞİL', () => {
  assert.equal(uygunMu(burs({ eligibleDepartments: ['Hukuk'] })), false);
});

test('eğitim seviyesi semantiği aynı kuralı izliyor', () => {
  assert.equal(uygunMu(burs({ educationLevels: [] })), true);
  assert.equal(uygunMu(burs({ educationLevels: ['Lisans'] })), true);
  assert.equal(uygunMu(burs({ educationLevels: ['Doktora'] })), false);
  /* "Lisansüstü" lisansı KAPSAMIYOR. */
  assert.equal(uygunMu(burs({ educationLevels: ['Yüksek Lisans', 'Doktora'] })), false);
});

test('şehir semantiği aynı kuralı izliyor', () => {
  assert.equal(uygunMu(burs({ cities: [] })), true);
  assert.equal(uygunMu(burs({ cities: ['İzmir'] })), true);
  assert.equal(uygunMu(burs({ cities: ['Ankara'] })), false);
});

test('üç kısıt birlikte değerlendiriliyor', () => {
  const hepsiUyan = burs({
    eligibleDepartments: ['Bilgisayar Mühendisliği'],
    educationLevels: ['Lisans'],
    cities: ['İzmir'],
  });
  assert.equal(uygunMu(hepsiUyan), true);

  const biriUymayan = burs({
    eligibleDepartments: ['Bilgisayar Mühendisliği'],
    educationLevels: ['Lisans'],
    cities: ['Ankara'],
  });
  assert.equal(uygunMu(biriUymayan), false);
});

test('tutar doğrulanmadan karta yazılmıyor', () => {
  /*
    Çıkarıcının bulduğu tutar bir ÖNERİ. amount_min dolu ama
    amount_verified_at boşsa kart tutarı GÖSTERMİYOR.
  */
  assert.equal(bursTutariVar(burs({ amountMin: 3000, paymentPeriod: 'monthly' })), false);
  assert.equal(
    bursTutariVar(burs({ amountMin: 3000, amountVerifiedAt: '2026-08-30T00:00:00Z' })),
    true
  );
});
