import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { basvuruKopyasi } from '../src/lib/basvuru-kopyasi.mjs';
import { kartVerisi, onyargisizla } from '../src/lib/aday-kart.mjs';
import { adayCvOgrencisi } from '../src/lib/aday-cv.mjs';

/*
  İŞVEREN EKRANINDAKİ CV — BAŞVURU ANINDAKİ KOPYADAN (11 Ekim 2026)

  Öğrencinin başvururken yazılan kopyası → kart → CvBelgesi'nin beklediği
  öğrenci. Zincir gerçek kodla sınanıyor; ekran aynı şablonu (CvBelgesi)
  kullanıyor, ikinci bir CV tasarımı yok.
*/

const ogrenci = {
  fullName: 'Deniz Yılmaz',
  email: 'deniz@ornek.test',
  phone: '05551112233',
  avatarUrl: 'https://ornek.supabase.co/storage/v1/object/public/avatars/x.jpg',
  university: 'Mimar Sinan Güzel Sanatlar Üniversitesi',
  department: 'Giyim Üretim Teknolojisi',
  gradeLevel: '2. Sınıf',
  gpa: 3.4,
  bio: 'Moda ve tasarıma ilgi duyan bir öğrenciyim.',
  city: 'İstanbul',
  linkedinUrl: 'https://www.linkedin.com/in/deniz',
  portfolioUrl: 'javascript:alert(1)',
  skills: [{ name: 'Canva' }, { name: 'Figma' }],
  softSkills: ['Ekip Çalışması', 'canva'],
  languages: [{ language: 'İngilizce', level: 'B1' }, { language: 'Türkçe', level: 'Ana dil' }],
  interests: ['Moda', 'Seyahat'],
  educationLevel: 'on_lisans',
  educationStartYear: 2024,
  educationOngoing: true,
  graduationYear: 2027,
  educations: [{ school: 'Örnek Lisesi', department: '', level: 'lise', startYear: 2019, endYear: 2023, ongoing: false, gpa: 90 }],
  experiences: [
    { position: 'Stajyer', organization: 'Beymen', startYear: 2023, startMonth: 7, endYear: 2023, endMonth: 9, ongoing: false, employmentType: 'staj', description: 'Ürün yerleştirme' },
    { position: 'Satış Danışmanı', organization: 'Zara', startYear: 2024, startMonth: 6, endYear: 2024, endMonth: 9, ongoing: false, employmentType: 'yari_zamanli', description: 'Müşteri danışmanlığı\nMağaza düzeni' },
  ],
  projects: [{ title: 'Koleksiyon Çalışması', description: 'Sürdürülebilir koleksiyon', techStack: ['Kumaş seçimi'], liveUrl: 'https://ornek.test/p', startYear: 2025, endYear: 2025, ongoing: false }],
  certificates: [{ name: 'KOSGEB Girişimcilik Eğitimi', issuer: 'KOSGEB', issueYear: 2025, issueMonth: 1, url: 'javascript:alert(1)' }],
  cvGizli: ['ilgi'],
  preferences: { cities: ['Ankara'] },
  earnedBadges: [],
};

const satir = (kopya, ek = {}) => ({
  id: 'b1',
  status: 'submitted',
  application_method: 'internal',
  contact_share_consent_at: '2026-10-05T10:00:00Z',
  contact_share_consent_version: 'v1',
  profile_snapshot: kopya,
  ...ek,
});

test('kopyanın CV kısmı: tam liste, tekrar yok, not ortalaması/telefon/e-posta yok', () => {
  const kopya = basvuruKopyasi(ogrenci);
  const metin = JSON.stringify(kopya);
  assert.ok(kopya.cv, 'cv alt nesnesi yazılıyor');
  assert.deepEqual(kopya.cv.yetenekler, ['Canva', 'Figma', 'Ekip Çalışması']);
  assert.equal(kopya.cv.sehir, 'İstanbul', 'oturduğu il; staj tercihi değil');
  assert.deepEqual(kopya.cv.deneyimler.map((d) => [d.pozisyon, d.tur]), [['Satış Danışmanı', 'yari_zamanli'], ['Stajyer', 'staj']]);
  assert.equal(kopya.cv.egitim.mezuniyet, null, 'süren eğitimde mezuniyet yılı yazılmıyor');
  assert.ok(!/gpa|"not"|05551112233|deniz@ornek\.test|"telefon"|"eposta"/.test(metin.replace(/"gizli":\[[^\]]*\]/, '')));
  assert.deepEqual(kopya.cv.gizli, ['ilgi']);
  /* Ek eğitimde not ortalaması da yok. */
  assert.equal('gpa' in kopya.cv.ekEgitimler[0], false);
});

test('kart → CV: başvuru anındaki bilgi, aynı şablonun beklediği biçimde', () => {
  const kart = kartVerisi(satir(basvuruKopyasi(ogrenci)));
  const s = adayCvOgrencisi(kart);
  assert.equal(s.fullName, 'Deniz Yılmaz');
  assert.equal(s.university, 'Mimar Sinan Güzel Sanatlar Üniversitesi');
  assert.equal(s.educationLevel, 'on_lisans');
  assert.equal(s.educationOngoing, true);
  assert.equal(s.graduationYear, undefined);
  assert.equal(s.gpa, 0, 'not ortalaması CV\'ye girmiyor');
  assert.equal(s.city, 'İstanbul');
  assert.equal(s.bio, 'Moda ve tasarıma ilgi duyan bir öğrenciyim.');
  assert.deepEqual(s.experiences.map((d) => [d.position, d.startYear, d.startMonth, d.employmentType]), [
    ['Satış Danışmanı', 2024, 6, 'yari_zamanli'],
    ['Stajyer', 2023, 7, 'staj'],
  ]);
  assert.deepEqual(s.languages.map((l) => `${l.language}:${l.level}`), ['İngilizce:B1', 'Türkçe:Ana dil']);
  assert.equal(s.educations[0].school, 'Örnek Lisesi');
  assert.equal(s.educations[0].gpa, null);
  assert.equal(s.projects[0].liveUrl, 'https://ornek.test/p');
  assert.deepEqual(s.projects[0].techStack, ['Kumaş seçimi']);
  assert.equal(s.certificates[0].name, 'KOSGEB Girişimcilik Eğitimi');
  /* Öğrencinin "CV'de neler görünsün" tercihi işveren ekranında da geçerli. */
  assert.deepEqual(s.cvGizli, ['ilgi']);
});

test('güvensiz adresler CV\'ye girmiyor; bağlantılar yalnız https', () => {
  const s = adayCvOgrencisi(kartVerisi(satir(basvuruKopyasi(ogrenci))));
  assert.equal(s.portfolioUrl, undefined, 'javascript: portföy düştü');
  assert.equal(s.certificates[0].url, '', 'javascript: sertifika adresi düştü');
  assert.equal(s.linkedinUrl, 'https://www.linkedin.com/in/deniz');
});

test('iletişim yalnız sunucunun verdiği satırdan; yoksa CV\'de telefon ve e-posta yok', () => {
  const kart = kartVerisi(satir(basvuruKopyasi(ogrenci)));
  const kapali = adayCvOgrencisi(kart);
  assert.equal(kapali.email, '');
  assert.equal(kapali.phone, '');
  const acik = adayCvOgrencisi(kart, { iletisim: { eposta: 'deniz@ornek.test', telefon: '05551112233' } });
  assert.equal(acik.email, 'deniz@ornek.test');
  assert.equal(acik.phone, '05551112233');
});

test('önyargısız inceleme: ad, fotoğraf, bağlantılar ve iletişim CV\'de de yok', () => {
  const kart = onyargisizla(kartVerisi(satir(basvuruKopyasi(ogrenci))));
  const s = adayCvOgrencisi(kart, { iletisim: { eposta: 'deniz@ornek.test', telefon: '05551112233' } });
  assert.equal(s.fullName, 'Aday');
  assert.equal(s.avatarUrl, '');
  assert.equal(s.linkedinUrl, undefined);
  assert.equal(s.projects[0].liveUrl, undefined);
  for (const g of ['foto', 'telefon', 'eposta', 'linkedin', 'portfoy']) assert.ok(s.cvGizli.includes(g), g);
});

test('rıza yoksa CV yok; eski kopya üst düzey alanlarla, uydurmadan', () => {
  assert.equal(kartVerisi(satir(basvuruKopyasi(ogrenci), { contact_share_consent_at: null })).cvKopya, null);
  const eski = { ...basvuruKopyasi(ogrenci) };
  delete eski.cv;
  eski.diller = ['İngilizce (B1)'];
  const s = adayCvOgrencisi(kartVerisi(satir(eski)));
  assert.equal(s.bio, '', 'eski kopyada hakkımda yok — uydurulmuyor');
  assert.equal(s.city, '', 'eski kopyadaki şehir staj tercihi; CV\'de konum olarak yazılmıyor');
  assert.deepEqual(s.languages.map((l) => [l.language, l.level]), [['İngilizce', 'B1']]);
  assert.equal(s.experiences.length, 2);
  assert.deepEqual(s.certificates, []);
});

test('ekran aynı CV bileşenini kullanıyor; ikinci bir şablon yok', () => {
  const cekmece = fs.readFileSync('src/sirket/AdayCekmecesi.tsx', 'utf8');
  assert.match(cekmece, /import \{ CvOnizleme, CvYazdirmaAlani \} from '\.\.\/components\/CvPage';/);
  const kod = cekmece.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(kod, /CvBelgesi|grid-cols-\[262px/);
  /* İndir: yalnız kâğıt, aynı A4 kuralları. */
  const cv = fs.readFileSync('src/components/CvPage.tsx', 'utf8');
  assert.match(cv, /html\[data-cv-yazdir\] body > \*:not\(\.cv-yazdirma-alani\) \{ display: none !important; \}/);
  assert.match(cv, /<CvBelgesi student=\{student\} \/>/);
});
