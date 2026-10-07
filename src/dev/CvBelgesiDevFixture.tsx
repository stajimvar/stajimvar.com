import React from 'react';
import { CvPage } from '../components/CvPage';
import type { StudentProfile } from '../types';

/**
 * Yazdırılabilir CV'nin geliştirme fikstürü (7 Ekim 2026).
 *
 * `/cv/yazdir` giriş arkasında; şablonu (lila tasarım) bir oturum
 * açmadan görmek ve PDF çıktısını denemek için. GERÇEK `CvPage`
 * çiziliyor. Örnek kişi uydurma ve örnek alan adları kullanıyor;
 * fotoğraf yerine sitedeki temsili bir görsel. Üretim paketine girmiyor.
 */
const TAM: StudentProfile = {
  id: '00000000-0000-4000-8000-0000000000cv',
  fullName: 'Deniz Yılmaz Karaca',
  email: 'deniz.karaca@ornek.com',
  phone: '+90 555 000 00 00',
  university: 'Mimar Sinan Güzel Sanatlar Üniversitesi',
  faculty: 'Mimarlık Fakültesi',
  department: 'Giyim Üretim Teknolojisi',
  gradeLevel: '2. Sınıf',
  graduationYear: 2028,
  gpa: 3.25,
  avatarUrl: '/kampus-gorselleri/kampus-384.webp',
  bio: 'Staj yapmak için yer arıyorum. Üretim planlaması ve dijital tasarım araçlarıyla çalışmayı seviyorum.',
  linkedinUrl: 'https://www.linkedin.com/in/ornek',
  portfolioUrl: 'https://ornek.com',
  city: 'İstanbul',
  skills: [
    { name: 'Canva', level: 'Intermediate', verified: false },
    { name: 'HTML / CSS', level: 'Intermediate', verified: true },
    { name: 'JavaScript', level: 'Intermediate', verified: false },
  ],
  softSkills: ['Takım çalışması', 'Analitik düşünme'],
  languages: [
    { id: 'l1', language: 'İngilizce', level: 'B1' },
    { id: 'l2', language: 'Rusça', level: 'A2' },
  ],
  targetRoles: ['Üretim planlama stajyeri', 'Ürün geliştirme stajyeri'],
  projects: [
    {
      id: 'p1',
      title: 'Staj ilanları bir yerde',
      description: 'Öğrencilerin, öğretmenlerin ve işverenlerin hayatını kolaylaştırmak için bir site yazdım.',
      techStack: ['React', 'Supabase'],
      liveUrl: 'https://ornek.com/proje',
    },
  ],
  experiences: [
    {
      id: 'e1',
      position: 'Üretim stajyeri',
      organization: 'Örnek Tekstil A.Ş. · İstanbul',
      startYear: 2025,
      startMonth: 6,
      endYear: 2025,
      endMonth: 9,
      ongoing: false,
      description: 'Kesimhane ve dikim hattında üretim takibine yardım ettim.',
    },
    {
      id: 'e2',
      position: 'Kulüp yönetim kurulu üyesi',
      organization: 'Moda Tasarım Kulübü',
      startYear: 2026,
      startMonth: 2,
      ongoing: true,
    },
  ],
  preferences: {},
  earnedBadges: [],
} as unknown as StudentProfile;

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
} as StudentProfile;

const DURUMLAR = { tam: TAM, fotografsiz: FOTOGRAFSIZ, az: AZ } as const;

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
