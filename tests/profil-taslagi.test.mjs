import test from 'node:test';
import assert from 'node:assert/strict';
import { adSoyadAyir, profilDolulugu } from '../src/lib/cv-hazirlik.mjs';
import { taslakOlustur, taslakKirliMi, taslaktanYama, degisenBolumler } from '../src/lib/profil-taslagi.mjs';

/*
  PROFİL TASLAĞI VE %100 KURALI — KULLANICININ SENARYOLARI (11 Ekim 2026)

  Ekran tek "Tüm değişiklikleri kaydet" düğmesiyle kaydediyor; taslağı
  kayda çeviren saf kısım burada gerçek verilerle sınanıyor. Kayıt
  sonrası profil, yamanın kayıtlı profile uygulanmasıyla bulunuyor
  (App `handleUpdateProfile` aynısını yapıyor).
*/

const uygula = (s, yama) => ({
  ...s,
  ...yama,
  preferences: yama.preferences ? { ...s.preferences, ...yama.preferences } : s.preferences,
});
const SEHIRLER = ['İstanbul', 'Ankara', 'İzmir'];
const PROGRAMLAR = new Set(['excel', 'figma', 'python', 'canva', 'microsoft office', 'adobe photoshop']);
const secenek = { sehirler: SEHIRLER, yetenekTuru: (ad) => (PROGRAMLAR.has(ad.toLocaleLowerCase('tr-TR')) ? 'program' : 'beceri') };

/** Yeni kayıt olmuş, hiçbir şey doldurmamış öğrenci (mappers'ın verdiği biçim). */
const yeniOgrenci = () => ({
  id: 'o1',
  fullName: 'Deniz',
  email: 'deniz@ornek.test',
  phone: '',
  university: '',
  department: '',
  gradeLevel: '1. Sınıf',
  graduationYear: 2030,
  gpa: 0,
  bio: '',
  city: '',
  skills: [],
  softSkills: [],
  languages: [],
  projects: [],
  experiences: [],
  educations: [],
  certificates: [],
  interests: [],
  cvGizli: [],
  targetRoles: [],
  educationLevel: null,
  educationStartYear: null,
  educationOngoing: null,
  preferences: { workType: 'Any', cities: [], type: 'Any', mandatoryInsuranceProvidedByUni: false, earliestStartDate: '', weeklyDaysAvailable: 5 },
});

/** Temel bilgileri doldurur (ekrandaki alanlara yazmak gibi). */
const temeliDoldur = (t) => {
  t.kisisel = { ad: 'Deniz', soyad: 'Yılmaz', sehir: 'İstanbul', telefon: '0555 123 45 67', hakkimda: 'Üretime ilgi duyan bir öğrenciyim.' };
  t.egitimler[0] = { ...t.egitimler[0], okul: 'Ornek Üniversitesi', bolum: 'Giyim Üretim Teknolojisi', duzey: 'on_lisans', basYil: '2024', suruyor: true };
  t.diller = [{ id: 'yeni-dil-1', ad: 'Türkçe', seviye: 'Ana dil', dogrulandi: false }];
  return t;
};

test('ad ve soyad: son kelime soyad, tek kelimede soyad boş', () => {
  assert.deepEqual(adSoyadAyir('Mustafa Oğulcan Doğan'), { ad: 'Mustafa Oğulcan', soyad: 'Doğan' });
  assert.deepEqual(adSoyadAyir('  Deniz  '), { ad: 'Deniz', soyad: '' });
  assert.deepEqual(adSoyadAyir(undefined), { ad: '', soyad: '' });
});

test('dokunulmamış taslak kirli değil ve boş yama üretiyor', () => {
  const s = yeniOgrenci();
  const t = taslakOlustur(s);
  assert.equal(taslakKirliMi(t, s), false);
  assert.deepEqual(taslaktanYama(t, s, secenek), { yama: {}, hatalar: [] });
});

test('Senaryo 1 — yeni öğrenci temel bilgileri doldurup tek kayıtla %100', () => {
  const s = yeniOgrenci();
  assert.ok(profilDolulugu(s, { fotografVar: false }).oran < 25);
  const t = temeliDoldur(taslakOlustur(s));
  assert.equal(taslakKirliMi(t, s), true);
  assert.deepEqual(degisenBolumler(t, s).sort(), ['diller', 'egitimler', 'kisisel']);
  const { yama, hatalar } = taslaktanYama(t, s, secenek);
  assert.deepEqual(hatalar, []);
  const kayitli = uygula(s, yama);
  assert.equal(kayitli.fullName, 'Deniz Yılmaz');
  const sonuc = profilDolulugu(kayitli, { fotografVar: true });
  assert.equal(sonuc.oran, 100);
  assert.equal(sonuc.tamam, true);
  /* Kayıttan sonra taslak yeniden kurulunca ekran temiz. */
  assert.equal(taslakKirliMi(taslakOlustur(kayitli), kayitli), false);
});

test('ilerleme gerçek: her zorunlu adım yüzdeyi aynı ölçüde artırıyor', () => {
  const s = yeniOgrenci();
  /* Sekiz adım; yeni öğrencide yalnız e-posta dolu. */
  assert.equal(profilDolulugu(s).adimlar.length, 8);
  assert.equal(profilDolulugu(s).oran, 13);
  assert.equal(profilDolulugu({ ...s, city: 'İzmir', phone: '1' }).oran, 38);
  assert.equal(profilDolulugu({ ...s, city: 'İzmir', phone: '1' }, { fotografVar: true }).oran, 50);
});

test('Senaryo 2 — yetenek, proje, sertifika, LinkedIn yokken de %100', () => {
  const s = yeniOgrenci();
  const kayitli = uygula(s, taslaktanYama(temeliDoldur(taslakOlustur(s)), s, secenek).yama);
  assert.equal(kayitli.skills.length + kayitli.projects.length + kayitli.certificates.length, 0);
  assert.equal(kayitli.linkedinUrl ?? '', '');
  assert.equal(profilDolulugu(kayitli, { fotografVar: true }).oran, 100);
});

test('Senaryo 3 — deneyimsiz öğrenci %100; yarım bırakılmış deneyim ise anlaşılır hata', () => {
  const s = yeniOgrenci();
  const t = temeliDoldur(taslakOlustur(s));
  assert.equal(t.deneyimler.length, 0);
  assert.equal(profilDolulugu(uygula(s, taslaktanYama(t, s, secenek).yama), { fotografVar: true }).oran, 100);

  /* "Deneyim ekle"ye basıp hiçbir şey yazmamak kayıt engellemiyor. */
  t.deneyimler.push({ id: 'yeni-d', position: '', organization: '', employmentType: '', startMonth: '', startYear: '', endMonth: '', endYear: '', ongoing: false, description: '' });
  assert.deepEqual(taslaktanYama(t, s, secenek).hatalar, []);
  /* Başlanmış ama kurumu eksik kayıt engelliyor; mesaj alanı gösteriyor. */
  t.deneyimler[0].position = 'Satış danışmanı';
  const { hatalar } = taslaktanYama(t, s, secenek);
  assert.equal(hatalar.length, 1);
  assert.equal(hatalar[0].bolum, 'deneyim');
  assert.equal(hatalar[0].alan, 'deneyim-yeni-d-kurum');
  assert.equal(hatalar[0].mesaj, 'Şirket adını yaz.');
});

test('Senaryo 4 — 15 yetenek, bölümler arası gezinti, tek kayıt; tekrar yok, tür doğru', () => {
  const s = { ...yeniOgrenci(), skills: [{ name: 'Excel', level: 'Advanced', category: 'General', verified: true }] };
  const t = taslakOlustur(s);
  const secilen = ['İletişim', 'Takım Çalışması', 'Liderlik', 'Problem Çözme', 'Canva', 'Microsoft Office', 'Satış',
    'Müşteri İlişkileri', 'Proje Yönetimi', 'Python', 'Figma', 'Adobe Photoshop', 'Üretim Planlama', 'Kalite Kontrol', 'Sunum'];
  t.yetenekler.push(...secilen, 'iletişim' /* aynı yetenek farklı harfle */);
  /* Başka bölümlere geçip oralarda da değişiklik. */
  t.kisisel.sehir = 'Ankara';
  t.ilgiler.push('Spor', 'Seyahat');
  const { yama, hatalar } = taslaktanYama(t, s, secenek);
  assert.deepEqual(hatalar, []);
  const adlar = [...yama.skills.map((k) => k.name), ...yama.softSkills];
  assert.equal(adlar.length, 16, 'Excel + 15 seçim, tekrar yok');
  assert.ok(yama.skills.find((k) => k.name === 'Excel').verified, 'doğrulanmış program korunuyor');
  assert.deepEqual(yama.skills.map((k) => k.name).sort(), ['Adobe Photoshop', 'Canva', 'Excel', 'Figma', 'Microsoft Office', 'Python']);
  assert.ok(yama.softSkills.includes('Kalite Kontrol'));
  assert.equal(yama.city, 'Ankara');
  assert.deepEqual(yama.interests, ['Spor', 'Seyahat']);
});

test('Senaryo 5 — iki deneyim ve iki eğitim kaydediliyor; deneyim en yeniden eskiye', () => {
  const s = yeniOgrenci();
  const t = temeliDoldur(taslakOlustur(s));
  t.deneyimler.push(
    { id: 'yeni-d1', position: 'Stajyer', organization: 'Ornek Atölye', employmentType: 'staj', startMonth: '6', startYear: '2022', endMonth: '9', endYear: '2022', ongoing: false, description: 'Kesimhane' },
    { id: 'yeni-d2', position: 'Satış danışmanı', organization: 'Ornek Mağaza', employmentType: 'yari_zamanli', startMonth: '8', startYear: '2023', endMonth: '', endYear: '', ongoing: true, description: '' },
  );
  t.egitimler.push({ id: 'yeni-e1', ana: false, okul: 'Ornek Lisesi', bolum: 'Sayısal', duzey: 'lise', basYil: '2019', sonYil: '2023', suruyor: false, gpa: '88,5', sinif: '' });
  const { yama, hatalar } = taslaktanYama(t, s, secenek);
  assert.deepEqual(hatalar, []);
  assert.deepEqual(yama.experiences.map((d) => d.position), ['Satış danışmanı', 'Stajyer']);
  assert.equal(yama.experiences[0].employmentType, 'yari_zamanli');
  assert.equal(yama.educations.length, 1);
  assert.equal(yama.educations[0].gpa, 88.5);
  assert.equal(yama.university, 'Ornek Üniversitesi');
  assert.equal(yama.educationOngoing, true);
});

test('Senaryo 7 — telefonu CV\'de gizlemek profildeki telefonu ve yüzdeyi değiştirmiyor', () => {
  const s = uygula(yeniOgrenci(), taslaktanYama(temeliDoldur(taslakOlustur(yeniOgrenci())), yeniOgrenci(), secenek).yama);
  const once = profilDolulugu(s, { fotografVar: true }).oran;
  const t = taslakOlustur(s);
  t.cvGizli.push('telefon');
  const { yama } = taslaktanYama(t, s, secenek);
  assert.deepEqual(Object.keys(yama), ['cvGizli']);
  const sonra = uygula(s, yama);
  assert.equal(sonra.phone, '0555 123 45 67');
  assert.equal(profilDolulugu(sonra, { fotografVar: true }).oran, once);
});

test('Senaryo 8 — eski kayıt: taslak bilgileri kaybetmiyor, dokunulmayan bölüm yazılmıyor', () => {
  const eski = {
    ...yeniOgrenci(),
    fullName: 'Ayşe Nur Kaya',
    city: 'İzmir',
    phone: '05551112233',
    bio: 'Merhaba',
    university: 'Ege Üniversitesi',
    department: 'Kimya',
    gradeLevel: '3. Sınıf',
    gpa: 3.1,
    linkedinUrl: 'https://www.linkedin.com/in/ayse',
    languages: [{ id: 'l1', language: 'İngilizce', level: 'C2', proficiencyText: 'C2 · Anadil düzeyi', verified: false }],
    skills: [{ name: 'Excel', level: 'Advanced', category: 'General', verified: true }],
    softSkills: ['İletişim'],
    experiences: [{ id: 'e1', position: 'Stajyer', organization: 'Ornek', startYear: 2025, startMonth: 6, endYear: 2025, endMonth: 9, ongoing: false, description: '' }],
    projects: [{ id: 'p1', title: 'Proje', description: '', techStack: [], liveUrl: 'https://ornek.test/canli' }],
  };
  const t = taslakOlustur(eski);
  assert.equal(taslakKirliMi(t, eski), false);
  assert.equal(t.kisisel.ad, 'Ayşe Nur');
  assert.equal(t.diller[0].seviye, 'C2', 'eski seviye korunuyor');
  assert.equal(t.egitimler[0].suruyor, true, 'sınıftan türetiliyor');
  /* Yalnız hakkımda değişince yama yalnız kişisel alanları taşıyor. */
  t.kisisel.hakkimda = 'Merhaba, kimya öğrencisiyim.';
  const { yama } = taslaktanYama(t, eski, secenek);
  assert.deepEqual(Object.keys(yama).sort(), ['bio', 'city', 'fullName', 'phone']);
  assert.equal(yama.fullName, 'Ayşe Nur Kaya');
  /* Eğitim düzeyi ve başlangıç yılı girilmemiş eski kayıt %100 değil — gerçek durum. */
  const d = profilDolulugu(eski, { fotografVar: true });
  assert.equal(d.adimlar.find((a) => a.anahtar === 'egitim').tamam, false);
  assert.equal(d.oran, 88);
  /* Proje adresi canlı adres olarak kalıyor. */
  const t2 = taslakOlustur(eski);
  t2.projeler[0].aciklama = 'Yeni açıklama';
  assert.equal(taslaktanYama(t2, eski, secenek).yama.projects[0].liveUrl, 'https://ornek.test/canli');
});

test('doğrulanmış dilin seviyesi taslakta değişse de kayda geçmiyor', () => {
  const s = { ...yeniOgrenci(), languages: [{ id: 'l1', language: 'İngilizce', level: 'B2', proficiencyText: 'B2', verified: true }] };
  const t = taslakOlustur(s);
  t.diller[0].seviye = 'A1';
  const { yama } = taslaktanYama(t, s, secenek);
  assert.equal(yama.languages[0].level, 'B2');
});

test('geçersiz girişler: bağlantı, sertifika adresi, tekrar eden dil, şehir, telefon', () => {
  const s = yeniOgrenci();
  const t = taslakOlustur(s);
  t.baglanti.linkedin = 'ornek.com/ben';
  t.baglanti.portfolyo = 'ftp://ornek.com';
  t.sertifikalar.push({ id: 'yeni-c', ad: 'Sertifika', kurum: '', yil: '', ay: '', url: 'javascript:alert(1)' });
  t.diller.push({ id: 'a', ad: 'Türkçe', seviye: 'Ana dil' }, { id: 'b', ad: 'türkçe', seviye: 'B1' }, { id: 'c', ad: 'Almanca', seviye: '' });
  t.kisisel.sehir = 'Paris';
  t.kisisel.telefon = 'ara beni';
  const alanlar = taslaktanYama(t, s, secenek).hatalar.map((h) => h.alan).sort();
  assert.deepEqual(alanlar, [
    'baglanti-linkedin', 'baglanti-portfolyo', 'dil-b-ad', 'dil-c-seviye', 'sehir', 'sertifika-yeni-c-url', 'telefon',
  ]);
  /* Doğru biçimler geçiyor ve https ile tamamlanıyor. */
  const t2 = taslakOlustur(s);
  t2.baglanti.linkedin = 'linkedin.com/in/deniz';
  t2.baglanti.portfolyo = 'ornek.com';
  const { yama, hatalar } = taslaktanYama(t2, s, secenek);
  assert.deepEqual(hatalar, []);
  assert.equal(yama.linkedinUrl, 'https://linkedin.com/in/deniz');
  assert.equal(yama.portfolioUrl, 'https://ornek.com');
});

test('isteğe bağlı alanlar yüzdeyi etkilemiyor', () => {
  const s = uygula(yeniOgrenci(), taslaktanYama(temeliDoldur(taslakOlustur(yeniOgrenci())), yeniOgrenci(), secenek).yama);
  const bos = profilDolulugu(s, { fotografVar: true }).oran;
  const dolu = profilDolulugu(
    { ...s, skills: [{ name: 'Excel' }], projects: [{}], certificates: [{}], targetRoles: ['x'], cvPath: 'a.pdf', linkedinUrl: 'x', gpa: 3 },
    { fotografVar: true },
  ).oran;
  assert.equal(bos, 100);
  assert.equal(dolu, 100);
});

test('mezun öğrencide mezuniyet yılı ancak "devam etmiyor" deyince sayılıyor', () => {
  const s = {
    ...yeniOgrenci(),
    university: 'U', department: 'D', educationLevel: 'lisans', educationStartYear: 2018, gradeLevel: 'Yüksek Lisans / Mezun',
    graduationYear: 2027 /* okuyucunun tahmini */,
  };
  const egitim = (x) => profilDolulugu(x).adimlar.find((a) => a.anahtar === 'egitim').tamam;
  assert.equal(egitim(s), false);
  assert.equal(egitim({ ...s, educationOngoing: false, graduationYear: 2022 }), true);
  /* Ek eğitim kaydı da yeterli. */
  assert.equal(egitim({ ...yeniOgrenci(), educations: [{ school: 'L', department: 'S', level: 'lise', startYear: 2019, endYear: 2023, ongoing: false }] }), true);
});

test('veritabanı testindeki istemci yükü güncel (gerçek kodla üretilen yükle aynı)', async () => {
  /* supabase/tests/ogrenci-profili-toplu-kayit.test.sql bu dosyayı işleve veriyor. */
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const uretilen = execFileSync(process.execPath, ['scripts/profil-kayit-yuku-ornegi.mjs'], { encoding: 'utf8' });
  const kayitli = fs.readFileSync('supabase/tests/veri/profil-kayit-yuku.json', 'utf8');
  assert.equal(uretilen, kayitli, 'yükü yeniden üret: node scripts/profil-kayit-yuku-ornegi.mjs > supabase/tests/veri/profil-kayit-yuku.json');
  const yuk = JSON.parse(uretilen);
  assert.deepEqual(Object.keys(yuk).sort(), ['deneyimler', 'diller', 'egitimler', 'ogrenci', 'profil', 'projeler', 'sertifikalar', 'yetenekler']);
  assert.ok(yuk.yetenekler.every((y) => !('verified' in y)), 'doğrulama istemciden gönderilmiyor');
});
