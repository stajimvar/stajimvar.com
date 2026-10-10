import React from 'react';
import { CvPage } from '../components/CvPage';
import type { StudentProfile } from '../types';
import { ORNEK_OGRENCI } from './ornek-ogrenci';

/**
 * Yazdırılabilir CV'nin geliştirme fikstürü (7 Ekim 2026; 10 Ekim'de mavi şablona geçti).
 *
 * `/cv/yazdir` giriş arkasında; şablonu (mavi tasarım) bir oturum
 * açmadan görmek ve PDF çıktısını denemek için. GERÇEK `CvPage`
 * çiziliyor. Örnek kişi uydurma ve örnek alan adları kullanıyor;
 * fotoğraf yerine sitedeki temsili bir görsel. Üretim paketine girmiyor.
 */
/*
  Tam CV: profil düzenleme fikstürüyle AYNI örnek öğrenci (mavi
  referanstaki içerik). Uzun: aynı kişiye fazladan kayıtlar — ikinci
  sayfaya taşmayı ve kayıtların bölünmediğini görmek için. Gizli:
  "CV'de neler görünsün" ayarında telefon, not ve ilgi alanları kapalı.
*/
const TAM: StudentProfile = ORNEK_OGRENCI;

const UZUN: StudentProfile = {
  ...TAM,
  experiences: [
    ...TAM.experiences,
    ...[2022, 2021, 2020].map((y, i) => ({
      id: `uzun-e${i}`,
      position: 'Dönem stajyeri',
      organization: `Örnek Atölye ${i + 1}`,
      startYear: y,
      startMonth: 6,
      endYear: y,
      endMonth: 9,
      ongoing: false,
      employmentType: 'staj' as const,
      description: 'Kesimhane ve dikim hattında üretim takibine yardım ettim.\nNumune hazırlığında kalıp ekibine destek oldum.\nGünlük üretim raporlarını tuttum.',
    })),
  ],
  educations: [
    { id: 'uzun-ed1', school: 'Örnek Anadolu Lisesi', department: '', level: 'lise', startYear: 2019, endYear: 2023, ongoing: false, gpa: 88.5 },
  ],
  certificates: [
    ...(TAM.certificates ?? []),
    { id: 'uzun-c2', name: 'İş Sağlığı ve Güvenliği', issuer: 'Örnek Eğitim Merkezi', issueYear: 2025, issueMonth: 3, url: 'https://ornek.com/dogrula/123' },
  ],
};

const GIZLI: StudentProfile = { ...TAM, cvGizli: ['telefon', 'not', 'ilgi'] };

const FOTOGRAFSIZ: StudentProfile = { ...TAM, avatarUrl: '' };

const AZ: StudentProfile = {
  ...TAM,
  avatarUrl: '',
  bio: '',
  phone: '',
  city: undefined,
  linkedinUrl: undefined,
  portfolioUrl: undefined,
  skills: [],
  softSkills: [],
  languages: [],
  projects: [],
  experiences: [],
  targetRoles: [],
  educations: [],
  certificates: [],
  interests: [],
} as StudentProfile;

const DURUMLAR = { tam: TAM, uzun: UZUN, gizli: GIZLI, fotografsiz: FOTOGRAFSIZ, az: AZ } as const;

export const CvBelgesiDevFixture: React.FC = () => {
  const ilk = (new URLSearchParams(window.location.search).get('durum') ?? 'tam') as keyof typeof DURUMLAR;
  const [durum, setDurum] = React.useState<keyof typeof DURUMLAR>(ilk in DURUMLAR ? ilk : 'tam');
  return (
    <>
      <div className="yazdirma-disi flex flex-wrap gap-2 bg-amber-50 px-4 py-2 text-xs">
        {(Object.keys(DURUMLAR) as (keyof typeof DURUMLAR)[]).map((d) => (
          <button
            key={d}
            type="button"
            id={`dev-cv-${d}`}
            onClick={() => setDurum(d)}
            className={`rounded-lg border px-3 py-1.5 font-bold ${durum === d ? 'bg-gray-900 text-white' : 'bg-white'}`}
          >
            {d}
          </button>
        ))}
      </div>
      <CvPage key={durum} student={DURUMLAR[durum]} onBack={() => undefined} />
    </>
  );
};
