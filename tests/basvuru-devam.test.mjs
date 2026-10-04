import test from 'node:test';
import assert from 'node:assert/strict';
import {
  basvuruKarari,
  basvuruyaAcikMi,
  MESAJ_ILAN_KAPALI,
  MESAJ_PROFIL_YOK,
  MESAJ_SIRKET_HESABI,
  MESAJ_ZATEN_BASVURDU,
} from '../src/lib/basvuru-devam.mjs';

/*
  BAŞVURU KAPISI — #309 sonrası kalan üç durum

  1. profil yüklenirken kayıt penceresi açılmıyor, bekleniyor; profil
     gerçekten yoksa profil tamamlamaya gidiliyor
  2. şirket hesabı: niyet sessizce değil, mesajla düşüyor; başvuru yok
  3. ilan yayından kalkmış / kapanmışsa uyarı; pencere açılmıyor
*/

const temel = {
  oturumVar: true,
  rol: 'student',
  profil: 'hazir',
  basvurularHazir: true,
  zatenBasvurdu: false,
  ilan: 'bulundu',
  platformIci: true,
  acik: true,
};
const karar = (fark) => basvuruKarari({ ...temel, ...fark });

test('oturum yoksa giriş', () => {
  assert.equal(karar({ oturumVar: false }).tur, 'giris');
});

test('1) profil YÜKLENİRKEN bekleniyor — kayıt penceresi yok', () => {
  assert.equal(karar({ profil: 'yukleniyor' }).tur, 'bekle', 'yüklenirken yeniden kayıt istenmemeli');
  assert.notEqual(karar({ profil: 'yukleniyor' }).tur, 'giris');
});

test('1) profil gerçekten YOKSA profil tamamlama — giriş değil', () => {
  const k = karar({ profil: 'yok' });
  assert.equal(k.tur, 'profil-yok');
  assert.equal(k.mesaj, MESAJ_PROFIL_YOK);
});

test('1) profil okunamadıysa hata cümlesi; ne kayıt ne pencere', () => {
  assert.equal(karar({ profil: 'hata' }).tur, 'profil-hata');
});

test('2) şirket hesabı: öğrenci hesabı mesajı, profil beklenmiyor, başvuru yok', () => {
  for (const profil of ['yukleniyor', 'hazir', 'yok']) {
    const k = karar({ rol: 'company', profil });
    assert.equal(k.tur, 'sirket-hesabi', `profil=${profil}`);
    assert.equal(k.mesaj, MESAJ_SIRKET_HESABI);
  }
});

test('3) ilan bulunamadı (yayından kalktı), kapandı ya da platform içi değil → kapalı', () => {
  for (const fark of [{ ilan: 'bulunamadi' }, { acik: false }, { platformIci: false }]) {
    const k = karar(fark);
    assert.equal(k.tur, 'kapali', JSON.stringify(fark));
    assert.equal(k.mesaj, MESAJ_ILAN_KAPALI);
  }
});

test('ilan sunucudan okunurken ve başvuru listesi gelmeden karar verilmiyor', () => {
  assert.equal(karar({ ilan: 'yukleniyor' }).tur, 'bekle');
  assert.equal(karar({ basvurularHazir: false }).tur, 'bekle');
});

test('zaten başvurduysa pencere açılmıyor; her şey yolundaysa açılıyor', () => {
  assert.deepEqual(karar({ zatenBasvurdu: true }), { tur: 'zaten', mesaj: MESAJ_ZATEN_BASVURDU });
  assert.deepEqual(karar({}), { tur: 'ac' });
});

test('basvuruyaAcikMi: yayın durumu ve son başvuru günü (son gün dahil)', () => {
  const bugun = '2026-10-04';
  assert.equal(basvuruyaAcikMi({ applicationDeadline: '' }, bugun), true, 'son tarih yoksa açık');
  assert.equal(basvuruyaAcikMi({ applicationDeadline: '2026-10-04' }, bugun), true, 'son gün açık');
  assert.equal(basvuruyaAcikMi({ applicationDeadline: '2026-10-03' }, bugun), false);
  assert.equal(basvuruyaAcikMi({ applicationDeadline: '2026-10-03T23:59:00Z' }, bugun), false);
  assert.equal(basvuruyaAcikMi({ status: 'archived', applicationDeadline: '' }, bugun), false);
  assert.equal(basvuruyaAcikMi(null, bugun), false);
});

test('kapanış nedeni: süre doldu ile yayından kalkma ayrı; yayın durumu önce gelir', async () => {
  const { basvuruKapanisNedeni, ETIKET_SURE_DOLDU, ETIKET_ILAN_KAPALI } = await import('../src/lib/basvuru-devam.mjs');
  const bugun = '2026-10-04';
  assert.equal(basvuruKapanisNedeni({ applicationDeadline: '' }, bugun), null);
  assert.equal(basvuruKapanisNedeni({ applicationDeadline: '2026-10-04' }, bugun), null, 'son gün açık');
  assert.equal(basvuruKapanisNedeni({ applicationDeadline: '2026-10-03' }, bugun), 'sure-doldu');
  assert.equal(basvuruKapanisNedeni({ status: 'archived', applicationDeadline: '2026-10-03' }, bugun), 'kapali');
  assert.equal(basvuruKapanisNedeni({ status: 'closed', applicationDeadline: '' }, bugun), 'kapali');
  assert.equal(basvuruKapanisNedeni(null, bugun), 'kapali');
  assert.equal(ETIKET_SURE_DOLDU, 'Başvuru süresi doldu');
  assert.equal(ETIKET_ILAN_KAPALI, 'İlan başvuruya kapalı');
  /* İki işlev aynı kuralı söylüyor: açık ⇔ neden yok. */
  for (const ilan of [{ applicationDeadline: '' }, { applicationDeadline: '2026-10-01' }, { status: 'archived' }]) {
    assert.equal(basvuruyaAcikMi(ilan, bugun), basvuruKapanisNedeni(ilan, bugun) === null);
  }
});
