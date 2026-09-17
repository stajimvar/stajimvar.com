import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KARSILAMA_YAYIN_ANI,
  cvCagrisiKapatildiMi,
  cvCagrisiniKapat,
  cvVarMi,
  karsilamaGosterilsinMi,
  karsilamaIsaretle,
  platformCvHazirMi,
  profilDolulugu,
} from '../src/lib/cv-hazirlik.mjs';

const depoYap = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const yeni = new Date(KARSILAMA_YAYIN_ANI + 3600_000).toISOString();

test('platform CV: okul, bölüm ve en az bir program/beceri', () => {
  assert.equal(platformCvHazirMi({ university: 'X', department: 'Y', skills: [], softSkills: [] }), false);
  assert.equal(platformCvHazirMi({ university: 'X', department: 'Y', skills: [{ name: 'Canva' }], softSkills: [] }), true);
  assert.equal(platformCvHazirMi({ university: 'X', department: '', skills: [{ name: 'Canva' }] }), false);
});

test('CV adımı: oluşturulmuş CV ya da yüklenmiş PDF birbirinin alternatifi', () => {
  assert.equal(cvVarMi({ cvPath: 'u/profil/x.pdf', skills: [] }), true);
  assert.equal(cvVarMi({ university: 'X', department: 'Y', softSkills: ['İletişim'], skills: [] }), true);
  assert.equal(cvVarMi({ skills: [] }), false);
});

test('doluluk: fotoğraf ve not ortalaması adım değil; oluşturulan CV PDF istemeden tamam', () => {
  const ogrenci = {
    university: 'X', department: 'Y', bio: 'b', phone: '1', skills: [{ name: 'Canva' }], softSkills: ['İletişim'],
    languages: [{}], projects: [{}], targetRoles: ['r'], preferences: { cities: ['İstanbul'] }, avatarUrl: '', gpa: 0,
  };
  const { oran, adimlar } = profilDolulugu(ogrenci);
  assert.equal(oran, 100);
  assert.ok(!adimlar.some((a) => /fotoğraf|ortalama/i.test(a.etiket)));
  assert.equal(adimlar.find((a) => a.anahtar === 'cv').tamam, true);
});

test('karşılama yalnız yayından sonra açılan yeni hesaba, bir kez, hesap bazında', () => {
  const depo = depoYap();
  const simdi = KARSILAMA_YAYIN_ANI + 2 * 3600_000;
  assert.equal(karsilamaGosterilsinMi({ depo, kullaniciId: A, hesapOlusturmaAni: yeni, simdi }), true);
  /* Mevcut kullanıcı: hesap yayından önce. */
  assert.equal(
    karsilamaGosterilsinMi({ depo, kullaniciId: A, hesapOlusturmaAni: '2026-01-01T00:00:00Z', simdi }),
    false,
  );
  /* CV'si olan yeni kullanıcı da görmüyor. */
  assert.equal(karsilamaGosterilsinMi({ depo, kullaniciId: A, hesapOlusturmaAni: yeni, cvVar: true, simdi }), false);
  /* Gösterildi işareti yalnız o hesabı etkiliyor. */
  karsilamaIsaretle(depo, A, 'atlandi');
  assert.equal(karsilamaGosterilsinMi({ depo, kullaniciId: A, hesapOlusturmaAni: yeni, simdi }), false);
  assert.equal(karsilamaGosterilsinMi({ depo, kullaniciId: B, hesapOlusturmaAni: yeni, simdi }), true);
  /* Pencere dışı (14 gün sonrası) ve tarihsiz hesap. */
  assert.equal(
    karsilamaGosterilsinMi({ depo, kullaniciId: B, hesapOlusturmaAni: yeni, simdi: simdi + 20 * 86400_000 }),
    false,
  );
  assert.equal(karsilamaGosterilsinMi({ depo, kullaniciId: B, hesapOlusturmaAni: null, simdi }), false);
});

test('depo erişilemezse karşılama açılmıyor değil, açılıyor ama işaret yazılamıyor; çağrı kapatma hesap bazında', () => {
  const bozuk = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  assert.equal(karsilamaIsaretle(bozuk, A), false);
  const depo = depoYap();
  assert.equal(cvCagrisiKapatildiMi(depo, A), false);
  cvCagrisiniKapat(depo, A);
  assert.equal(cvCagrisiKapatildiMi(depo, A), true);
  assert.equal(cvCagrisiKapatildiMi(depo, B), false);
});

test('profildeki "CV oluştur" adımı kısa CV akışını açıyor; PDF yükleme ayrı bölümde', async () => {
  const fs = await import('node:fs');
  const profil = fs.readFileSync('src/components/StudentProfileView.tsx', 'utf8');
  assert.match(profil, /a\.anahtar === 'cv' && onCvOlustur\s*\?\s*onCvOlustur\(\)/);
  /* PDF yükleme bölümü (id="cv", CvAlani) yerinde. */
  assert.match(profil, /id="cv"[\s\S]{0,600}<CvAlani/);
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /onCvOlustur=\{\(\) => setCvAkisi\(\{ baslangic: 'form', ilan: null \}\)\}/);
});
