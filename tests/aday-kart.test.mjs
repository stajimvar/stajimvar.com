import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  BIRINCI_SIRA,
  IKINCI_SIRA,
  kartVerisi,
  kimlikSatiri,
  monogram,
  onyargisizla,
  uyumBandi,
} from '../src/lib/aday-kart.mjs';
import { basvuruKopyasi } from '../src/lib/basvuru-kopyasi.mjs';

/* ------------------------------------------------------------ uyum bandı */

test('uyum bandı üç eşiğe göre ayrılıyor', () => {
  assert.equal(uyumBandi(90), 'yuksek');
  assert.equal(uyumBandi(75), 'yuksek');
  assert.equal(uyumBandi(74), 'orta');
  assert.equal(uyumBandi(50), 'orta');
  assert.equal(uyumBandi(49), 'dusuk');
  assert.equal(uyumBandi(0), 'dusuk');
});

test('puan yoksa band uydurulmuyor', () => {
  assert.equal(uyumBandi(null), 'bilinmiyor');
  assert.equal(uyumBandi(undefined), 'bilinmiyor');
  assert.equal(uyumBandi('abc'), 'bilinmiyor');
});

/* -------------------------------------------------------------- monogram */

test('monogram Türkçe büyütme kuralına uyuyor', () => {
  assert.equal(monogram('irem yılmaz'), 'İY');
  assert.equal(monogram('Ali'), 'A');
  assert.equal(monogram('Ayşe Nur Demir'), 'AD');
});

test('ad yoksa monogram soru işareti', () => {
  assert.equal(monogram(null), '?');
  assert.equal(monogram('   '), '?');
});

test('kimlik satırı boş alanları atlıyor', () => {
  assert.equal(
    kimlikSatiri({ universite: 'X Üni', bolum: 'Makine', sinif: '3. Sınıf' }),
    'X Üni · Makine · 3. Sınıf'
  );
  assert.equal(kimlikSatiri({ universite: 'X Üni', bolum: null, sinif: null }), 'X Üni');
  assert.equal(kimlikSatiri({}), '');
});

/* ------------------------------------------------------------ kart verisi */

const RIZALI = {
  id: 'a1',
  status: 'submitted',
  applied_at: '2026-08-20T09:00:00Z',
  match_score: 80,
  listing_id: 'i1',
  contact_share_consent_at: '2026-08-20T09:00:00Z',
  profile_snapshot: {
    ad: 'Aday A',
    universite: 'Örnek Üni',
    bolum: 'Bilgisayar',
    sinif: '3. Sınıf',
    sehir: 'İzmir',
    yetenekler: ['React', 'SQL'],
  },
};

test('rıza varsa kimlik alanları karta geçiyor', () => {
  const k = kartVerisi(RIZALI);
  assert.equal(k.paylasildi, true);
  assert.equal(k.ad, 'Aday A');
  assert.equal(k.universite, 'Örnek Üni');
  assert.equal(k.band, 'yuksek');
  assert.deepEqual(k.yetenekler, ['React', 'SQL']);
});

test('RIZA YOKSA kart hiçbir kimlik bilgisi taşımıyor', () => {
  const k = kartVerisi({
    id: 'a2',
    match_score: 40,
    contact_share_consent_at: null,
    profile_snapshot: null,
  });
  assert.equal(k.paylasildi, false);
  assert.equal(k.ad, null);
  assert.equal(k.universite, null);
  assert.equal(k.bolum, null);
  assert.equal(k.sehir, null);
  assert.equal(k.fotoUrl, null);
  assert.deepEqual(k.projeler, []);
});

test('kopya varken rıza damgası yoksa yine paylaşılmıyor', () => {
  /* Damga olmadan kopyaya güvenmek, rızasız veriyi göstermek olurdu. */
  const k = kartVerisi({ ...RIZALI, contact_share_consent_at: null });
  assert.equal(k.paylasildi, false);
  assert.equal(k.ad, null);
});

test('kopyada yetenek yoksa canlı tablodan tamamlanıyor', () => {
  const k = kartVerisi(
    { ...RIZALI, profile_snapshot: { ...RIZALI.profile_snapshot, yetenekler: undefined } },
    { yetenekler: [{ name: 'Figma' }, { name: 'Excel' }] }
  );
  assert.deepEqual(k.yetenekler, ['Figma', 'Excel']);
});

test('kart en fazla beş yetenek gösteriyor', () => {
  const k = kartVerisi({
    ...RIZALI,
    profile_snapshot: { ...RIZALI.profile_snapshot, yetenekler: ['a', 'b', 'c', 'd', 'e', 'f'] },
  });
  assert.equal(k.yetenekler.length, 5);
});

/* ----------------------------------------------------------- önyargısız */

test('önyargısız mod ad ve fotoğrafı siliyor, gerisini bırakıyor', () => {
  const k = onyargisizla(kartVerisi({ ...RIZALI, profile_snapshot: { ...RIZALI.profile_snapshot, fotoUrl: 'x.png' } }));
  assert.equal(k.ad, null);
  assert.equal(k.fotoUrl, null);
  assert.equal(k.gizli, true);
  assert.equal(k.universite, 'Örnek Üni');
  assert.equal(k.sehir, 'İzmir');
  assert.deepEqual(k.yetenekler, ['React', 'SQL']);
});

/* ------------------------------------------------------------- mini ATS */

test('birinci sıra üç karar, ikinci sıra katlı iki eylem', () => {
  assert.equal(BIRINCI_SIRA.length, 3);
  assert.equal(IKINCI_SIRA.length, 2);
  const hepsi = [...BIRINCI_SIRA, ...IKINCI_SIRA].map((e) => e.id);
  /* Hepsi application_status enum'unda gerçekten var olan değerler. */
  const gecerli = [
    'submitted',
    'under_review',
    'technical_assessment',
    'interview_scheduled',
    'offer_extended',
    'rejected',
    'withdrawn',
  ];
  hepsi.forEach((id) => assert.ok(gecerli.includes(id), `${id} enum'da yok`));
});

/* --------------------------------------------------------- profil kopyası */

test('başvuru kopyası hassas alanları taşımıyor', () => {
  const kopya = basvuruKopyasi({
    fullName: 'Aday A',
    email: 'a@example.com',
    phone: '05001112233',
    gpa: 3.4,
    university: 'Örnek Üni',
    department: 'Bilgisayar',
    gradeLevel: '3. Sınıf',
    preferences: { cities: ['İzmir'] },
    skills: [{ name: 'React' }],
    projects: [{ title: 'P', description: 'D', githubUrl: 'https://g/x' }],
    earnedBadges: ['r1'],
  });

  assert.equal(kopya.ad, 'Aday A');
  assert.equal(kopya.sehir, 'İzmir');
  assert.deepEqual(kopya.yetenekler, ['React']);
  assert.equal(kopya.projeler[0].adres, 'https://g/x');

  /* Telefon, GPA, TCKN ve adres kopyada YOK. */
  assert.equal('telefon' in kopya, false);
  assert.equal('phone' in kopya, false);
  assert.equal('gpa' in kopya, false);
  assert.equal('tckn' in kopya, false);
  assert.equal('adres' in kopya, false);
});

test('profil yoksa kopya da yok', () => {
  assert.equal(basvuruKopyasi(null), null);
});

test('boş profilden kopya üretilmiyor (boş nesne kaydedilmez)', () => {
  /* Profilini hiç doldurmamış öğrenci: alan null kalmalı, {} değil. */
  assert.equal(basvuruKopyasi({ preferences: {}, skills: [], projects: [] }), null);
  assert.equal(basvuruKopyasi({}), null);
});

test('tek bir gerçek alan varsa kopya üretiliyor', () => {
  const sadeceAd = basvuruKopyasi({ fullName: 'Aday A' });
  assert.ok(sadeceAd);
  assert.equal(sadeceAd.ad, 'Aday A');

  const sadeceYetenek = basvuruKopyasi({ skills: [{ name: 'React' }] });
  assert.ok(sadeceYetenek);
  assert.deepEqual(sadeceYetenek.yetenekler, ['React']);
});

test('kopya rıza anında istenen sekiz alanı taşıyor', () => {
  const k = basvuruKopyasi({
    fullName: 'Aday A',
    avatarUrl: 'https://x/foto.png',
    university: 'Örnek Üni',
    department: 'Bilgisayar',
    gradeLevel: '3. Sınıf',
    preferences: { cities: ['İzmir'] },
    skills: [{ name: 'React' }],
    projects: [{ title: 'P', description: 'D', liveUrl: 'https://p' }],
  });

  assert.equal(k.ad, 'Aday A');
  assert.equal(k.fotoUrl, 'https://x/foto.png');
  assert.equal(k.universite, 'Örnek Üni');
  assert.equal(k.bolum, 'Bilgisayar');
  assert.equal(k.sinif, '3. Sınıf');
  assert.equal(k.sehir, 'İzmir');
  assert.deepEqual(k.yetenekler, ['React']);
  assert.equal(k.projeler.length, 1);
});
