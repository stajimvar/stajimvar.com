import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enCokOkunanlar,
  ilgiKonulari,
  kisisellestirilebilir,
  kisiyeGoreSirala,
  okunmaVerisiYeterli,
  oncelikliKonular,
  yeniEklenenler,
} from '../src/lib/rehber-siralama.mjs';
import {
  GECMIS_GUN,
  GECMIS_SINIRI,
  gecmiseEkle,
  gecmisiDuzenle,
} from '../src/lib/rehber-gecmis.mjs';

/*
  Rehber merkezi iki iddiada bulunuyor: "sana özel seçilenler" ve "en çok
  okunanlar". İkisi de yanlış olduğunda pahalı:

    - Kişiselleştirme yokken "sana özel" demek, kullanıcıya kendisi
      hakkında yanlış bir şey söylemek oluyor.
    - Okunma verisi yokken popülerlik sıralaması göstermek uydurma veri.

  Buradaki testler o iki kapıyı tutuyor.
*/

const GUN = 24 * 60 * 60 * 1000;
const simdi = Date.parse('2026-08-26T09:00:00Z');
const gunOnce = (n) => simdi - n * GUN;

/* ------------------------------------------------------ kişiselleştirme */

test('profil yoksa kişiselleştirme yok', () => {
  assert.equal(kisisellestirilebilir(null), false);
  assert.equal(kisisellestirilebilir(undefined), false);
  assert.deepEqual(oncelikliKonular(null), []);
});

test('boş profil kişiselleştirme sayılmıyor', () => {
  /* Adı olan ama eğitim bilgisi olmayan profil sıralama için yetersiz. */
  assert.equal(kisisellestirilebilir({ fullName: 'X', department: '', targetRoles: [] }), false);
});

test('sınıf bilgisi tek başına yeterli', () => {
  assert.equal(kisisellestirilebilir({ gradeLevel: '3. Sınıf' }), true);
  assert.deepEqual(oncelikliKonular({ gradeLevel: '3. Sınıf' }), ['staj', 'cv', 'yurtdisi']);
});

test('sınıf yoksa ilgi alanından kişiselleştirme çıkabiliyor', () => {
  const ogrenci = { targetRoles: ['Erasmus ile yurt dışında okumak'] };
  assert.equal(kisisellestirilebilir(ogrenci), true);
  assert.deepEqual(ilgiKonulari(ogrenci), ['yurtdisi']);
});

test('ilgi konuları Türkçe karakterden etkilenmiyor', () => {
  assert.deepEqual(ilgiKonulari({ bio: 'BURS ve KYK arıyorum' }), ['burs']);
  assert.deepEqual(ilgiKonulari({ department: 'Özgeçmiş yazımı' }), ['cv']);
});

test('sınıf ve ilgi birleşiyor, tekrar etmiyor', () => {
  const konular = oncelikliKonular({ gradeLevel: '4. Sınıf', targetRoles: ['burs başvurusu'] });
  assert.deepEqual(konular, ['kariyer', 'cv', 'staj', 'burs']);
  assert.equal(new Set(konular).size, konular.length);
});

test('sıralama önceliğe uyuyor ve kararlı', () => {
  const rehberler = [
    { slug: 'a', konu: 'yurt' },
    { slug: 'b', konu: 'cv' },
    { slug: 'c', konu: 'staj' },
    { slug: 'd', konu: 'staj' },
  ];
  const sirali = kisiyeGoreSirala(rehberler, { gradeLevel: '3. Sınıf' });
  assert.deepEqual(
    sirali.map((r) => r.slug),
    ['c', 'd', 'b', 'a']
  );

  /* Aynı girdi her seferinde aynı sırayı vermeli. */
  assert.deepEqual(
    kisiyeGoreSirala(rehberler, { gradeLevel: '3. Sınıf' }).map((r) => r.slug),
    sirali.map((r) => r.slug)
  );
});

test('öne çıkan yazı kendi konusunda önde', () => {
  const rehberler = [
    { slug: 'a', konu: 'staj' },
    { slug: 'b', konu: 'staj', oneCikan: true },
  ];
  assert.deepEqual(
    kisiyeGoreSirala(rehberler, { gradeLevel: '3. Sınıf' }).map((r) => r.slug),
    ['b', 'a']
  );
});

test('kişiselleştirme yoksa sıra bozulmuyor', () => {
  const rehberler = [{ slug: 'a', konu: 'staj' }, { slug: 'b', konu: 'cv' }];
  assert.deepEqual(
    kisiyeGoreSirala(rehberler, null).map((r) => r.slug),
    ['a', 'b']
  );
});

/* ------------------------------------------------------------- okunma */

test('okunma verisi yetersizken bölüm gösterilmiyor', () => {
  assert.equal(okunmaVerisiYeterli({}), false);
  assert.equal(okunmaVerisiYeterli({ a: 5 }), false);
  assert.equal(okunmaVerisiYeterli({ a: 5, b: 2 }), false);
  assert.equal(okunmaVerisiYeterli({ a: 5, b: 2, c: 0 }), false);
});

test('üç farklı yazı okunmuşsa bölüm gösteriliyor', () => {
  assert.equal(okunmaVerisiYeterli({ a: 5, b: 2, c: 1 }), true);
});

test('en çok okunanlar gerçek sayıya göre ve okunmayanı almıyor', () => {
  const rehberler = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }];
  const sayilar = { a: 3, b: 40, c: 0 };
  assert.deepEqual(
    enCokOkunanlar(rehberler, sayilar, 3).map((r) => r.slug),
    ['b', 'a']
  );
});

/* --------------------------------------------------------- yeni eklenen */

test('tarihi olmayan yazı "yeni eklenenler" içine girmiyor', () => {
  const rehberler = [
    { slug: 'a', guncelleme: '2026-01-01' },
    { slug: 'b' },
    { slug: 'c', guncelleme: '2026-08-01' },
  ];
  assert.deepEqual(
    yeniEklenenler(rehberler, 5).map((r) => r.slug),
    ['c', 'a']
  );
});

/* -------------------------------------------------------------- geçmiş */

test('geçmiş boşken bölüm için veri yok', () => {
  assert.deepEqual(gecmisiDuzenle(null), []);
  assert.deepEqual(gecmisiDuzenle([]), []);
  assert.deepEqual(gecmisiDuzenle('bozuk'), []);
});

test('bozuk kayıtlar eleniyor', () => {
  const ham = [{ slug: 'a', zaman: gunOnce(1) }, { slug: '', zaman: gunOnce(1) }, { zaman: 5 }, null];
  assert.deepEqual(
    gecmisiDuzenle(ham, simdi).map((k) => k.slug),
    ['a']
  );
});

test('eski kayıt "kaldığın yer" sayılmıyor', () => {
  const ham = [
    { slug: 'yeni', zaman: gunOnce(2) },
    { slug: 'eski', zaman: gunOnce(GECMIS_GUN + 1) },
  ];
  assert.deepEqual(
    gecmisiDuzenle(ham, simdi).map((k) => k.slug),
    ['yeni']
  );
});

test('aynı yazı bir kez, en yeni okumayla', () => {
  const ham = [
    { slug: 'a', zaman: gunOnce(5) },
    { slug: 'a', zaman: gunOnce(1) },
  ];
  const sonuc = gecmisiDuzenle(ham, simdi);
  assert.equal(sonuc.length, 1);
  assert.equal(sonuc[0].zaman, gunOnce(1));
});

test('yeni okuma başa geçiyor ve sınır aşılmıyor', () => {
  let gecmis = [];
  for (let i = 0; i < GECMIS_SINIRI + 5; i += 1) {
    gecmis = gecmiseEkle(gecmis, `yazi-${i}`, simdi + i);
  }
  assert.equal(gecmis.length, GECMIS_SINIRI);
  assert.equal(gecmis[0].slug, `yazi-${GECMIS_SINIRI + 4}`);
});
