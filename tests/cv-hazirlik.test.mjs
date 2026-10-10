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

test('platform CV: okul ve bölüm yeterli; yetenek, dil, proje ve deneyim isteğe bağlı', () => {
  /* 6 Ekim 2026: boş isteğe bağlı bölümler CV oluşturmayı engellemiyor. */
  assert.equal(platformCvHazirMi({ university: 'X', department: 'Y', skills: [], softSkills: [] }), true);
  assert.equal(platformCvHazirMi({ university: 'X', department: 'Y' }), true);
  assert.equal(platformCvHazirMi({ university: 'X', department: 'Y', skills: [{ name: 'Canva' }], softSkills: [] }), true);
  assert.equal(platformCvHazirMi({ university: 'X', department: '', skills: [{ name: 'Canva' }] }), false);
  assert.equal(platformCvHazirMi({ university: '  ', department: 'Y' }), false);
});

test('CV adımı: oluşturulmuş CV ya da yüklenmiş PDF birbirinin alternatifi', () => {
  assert.equal(cvVarMi({ cvPath: 'u/profil/x.pdf', skills: [] }), true);
  assert.equal(cvVarMi({ university: 'X', department: 'Y', softSkills: ['İletişim'], skills: [] }), true);
  assert.equal(cvVarMi({ skills: [] }), false);
});

/*
  11 EKİM 2026 (kullanıcı kararı): yüzde yalnız temel bilgilere bakıyor.
  Fotoğraf artık zorunlu adım; CV, yetenek, proje ve not ortalaması değil.
  Senaryolar tests/profil-taslagi.test.mjs'de.
*/
test('doluluk: temel bilgiler tamamsa %100; CV, yetenek, proje ve not adım değil', () => {
  const ogrenci = {
    fullName: 'Deniz Yılmaz', email: 'd@ornek.test', city: 'İzmir', phone: '1', bio: 'b',
    university: 'X', department: 'Y', educationLevel: 'lisans', educationStartYear: 2024, educationOngoing: true,
    languages: [{ language: 'Türkçe', level: 'Ana dil' }], skills: [], projects: [], gpa: 0,
  };
  const { oran, adimlar, tamam } = profilDolulugu(ogrenci, { fotografVar: true });
  assert.equal(oran, 100);
  assert.equal(tamam, true);
  assert.deepEqual(adimlar.map((a) => a.anahtar), ['ad', 'foto', 'sehir', 'telefon', 'eposta', 'tanitim', 'egitim', 'dil']);
  assert.ok(!adimlar.some((a) => /cv|program|beceri|proje|ortalama|hedef/i.test(a.anahtar + a.etiket)));
  /* Fotoğraf yoksa %100 değil. */
  assert.equal(profilDolulugu(ogrenci, { fotografVar: false }).oran, 88);
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
  /* Eksik adım doğru yere götürüyor: fotoğraf yüklemeye, ötekiler kendi bölümüne ve alanına. */
  assert.match(profil, /a\.bolum === 'foto' \? fotografDegistir\(\) : bolumeGit\(a\.bolum as DuzenlemeBolumu, a\.alan\)/);
  /*
    PDF yükleme ve "Profilimden CV oluştur" düzenleme ekranının CV satırında
    (6 Ekim 2026, ProfilDuzenleme): ikisi ayrı ve net seçenek.
  */
  const duzenleme = fs.readFileSync('src/components/ProfilDuzenleme.tsx', 'utf8');
  const cvSatiri = duzenleme.slice(duzenleme.indexOf('baslik="CV"'));
  assert.match(cvSatiri, /PDF yükle/);
  assert.match(cvSatiri, /Profilimden CV oluştur/);
  assert.match(cvSatiri, /<CvAlani\s+kompakt/);
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /onCvOlustur=\{\(\) => setCvAkisi\(\{ baslangic: 'form', ilan: null \}\)\}/);
});
