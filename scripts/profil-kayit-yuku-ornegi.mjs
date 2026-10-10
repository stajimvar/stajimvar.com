/**
 * PROFİL KAYIT YÜKÜ ÖRNEĞİ (11 Ekim 2026)
 *
 * Tarayıcının `ogrenci_profilini_kaydet`e gönderdiği yükü GERÇEK
 * kodla üretir: profil taslağı (lib/profil-taslagi.mjs) → yama →
 * `profilKayitYuku` (queries/mappers.ts). Çıktı tek kullanımlık test
 * veritabanında işleve verilir (supabase/tests/ogrenci-profili-toplu-kayit.test.sql):
 * istemcinin biçimi ile işlevin beklediği biçim ayrışırsa CI düşer.
 *
 *   node scripts/profil-kayit-yuku-ornegi.mjs > /tmp/yuk.json
 *
 * Kurgu öğrenci; ağ yok.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const giris = `
  import { profilKayitYuku } from './src/lib/queries/mappers.ts';
  import { taslakOlustur, taslaktanYama } from './src/lib/profil-taslagi.mjs';
  export { profilKayitYuku, taslakOlustur, taslaktanYama };
`;
const cikis = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'profil-yuk-')), 'paket.mjs');
await build({
  stdin: { contents: giris, resolveDir: KOK, loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: cikis,
  logLevel: 'silent',
});
const { profilKayitYuku, taslakOlustur, taslaktanYama } = await import(`file://${cikis.replace(/\\/g, '/')}`);

const kayitli = {
  id: 'ornek',
  fullName: 'Kayit 01',
  email: 'ornek@ornek.test',
  phone: '',
  university: '',
  department: '',
  gradeLevel: '1. Sınıf',
  graduationYear: 2030,
  gpa: 0,
  bio: 'Ilk hali',
  city: '',
  skills: [{ name: 'Excel', level: 'Advanced', category: 'General', verified: true }],
  softSkills: [],
  languages: [{ id: 'l1', language: 'İngilizce', level: 'B2', proficiencyText: 'B2', verified: true }],
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
  interfaceLanguage: '',
  preferredJobCountries: [],
  preferences: { workType: 'Any', cities: [], type: 'Any', mandatoryInsuranceProvidedByUni: false, earliestStartDate: '', weeklyDaysAvailable: 5 },
};

/* Ekrandaki gibi: bütün bölümlerde değişiklik, tek kayıt. */
const t = taslakOlustur(kayitli);
t.kisisel = { ad: 'Deniz', soyad: 'Yılmaz', sehir: 'İstanbul', telefon: '0555 123 45 67', hakkimda: 'Istemci yuku' };
t.baglanti = { linkedin: 'linkedin.com/in/deniz', portfolyo: 'ornek.test', github: 'deniz-ornek' };
t.egitimler[0] = { ...t.egitimler[0], okul: 'Ornek Universitesi', bolum: 'Giyim Uretim Teknolojisi', duzey: 'on_lisans', basYil: '2024', suruyor: true, gpa: '3,25', sinif: '2. Sınıf' };
t.egitimler.push({ id: 'y-e', ana: false, okul: 'Ornek Lisesi', bolum: 'Sayisal', duzey: 'lise', basYil: '2019', sonYil: '2023', suruyor: false, gpa: '88,5', sinif: '' });
t.deneyimler.push(
  { id: 'y-d1', position: 'Satis danismani', organization: 'Ornek Magaza', employmentType: 'yari_zamanli', startMonth: '8', startYear: '2023', endMonth: '', endYear: '', ongoing: true, description: 'Musteri iliskileri\nStok takibi' },
  { id: 'y-d2', position: 'Stajyer', organization: 'Ornek Atolye', employmentType: 'staj', startMonth: '6', startYear: '2022', endMonth: '9', endYear: '2022', ongoing: false, description: '' },
);
t.diller.push({ id: 'y-l', ad: 'Türkçe', seviye: 'Ana dil', dogrulandi: false });
t.yetenekler.push('Figma', 'İletişim');
t.ilgiler.push('Spor', 'Seyahat');
t.projeler.push({ id: 'y-p', baslik: 'Koleksiyon', aciklama: 'Okul projesi', araclar: 'Kalip, Teknik cizim', adres: 'ornek.test/proje', basYil: '2024', sonYil: '2024', suruyor: false });
t.sertifikalar.push({ id: 'y-c', ad: 'Girisimcilik', kurum: 'Ornek Ajans', yil: '2026', ay: '3', url: 'ornek.test/dogrula' });
t.cvGizli.push('telefon');
t.tercih = { ...t.tercih, hedefler: ['Üretim Planlama Stajyeri'], sehirler: ['İstanbul'], calismaSekli: 'Hybrid', stajTuru: 'Long-term', sigorta: true, arayuzDili: 'tr', ulkeler: ['TR'] };

const programlar = new Set(['figma', 'excel']);
const { yama, hatalar } = taslaktanYama(t, kayitli, {
  sehirler: ['İstanbul'],
  yetenekTuru: (ad) => (programlar.has(ad.toLocaleLowerCase('tr-TR')) ? 'program' : 'beceri'),
});
if (hatalar.length) {
  console.error(JSON.stringify(hatalar));
  process.exit(1);
}
process.stdout.write(JSON.stringify(profilKayitYuku(yama)));
