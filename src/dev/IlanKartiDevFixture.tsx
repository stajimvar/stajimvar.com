import React from 'react';
import { InternshipCard } from '../components/InternshipCard';
import type { InternshipListing, MatchBreakdown } from '../types';

/**
 * İlan kartının alt CTA alanının bütün durumları.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Alt alan ilan türüne ve öğrencinin durumuna göre değişiyor: dış ilan,
 * StajımVar ilanı, başvurulmuş, işaretlenmiş, şirketin kendi ilanı,
 * resmî adresi olmayan kayıt. Bunların çoğu ancak giriş yapmış bir
 * öğrenciyle ya da belirli veriyle görülüyor; tarayıcıda hiç
 * görülmeden değişiyorlardı.
 *
 * Asıl amaç: alt alanın GEOMETRİSİNİN bütün durumlarda aynı kalması.
 * Fikstür gerçek kartı çiziyor, kopyasını değil. Üretim paketine
 * girmiyor.
 */

const temel = {
  id: 'x',
  companyName: 'Örnek Teknoloji',
  companyLogo: '',
  companyIndustry: 'Teknoloji',
  companySize: '51-200',
  companyLocation: 'İstanbul',
  companyDescription: '',
  companyRating: 0,
  title: 'Yazılım Geliştirme Stajyeri',
  department: 'Mühendislik',
  workType: 'Hybrid',
  city: 'İstanbul',
  mandatoryStajAccepted: true,
  voluntaryStajAccepted: true,
  stipend: { isPaid: true, amountText: 'Asgari staj ücreti' },
  duration: '20 iş günü',
  term: 'Summer 2026',
  applicationDeadline: '2026-09-30',
  minGradeLevel: '2. Sınıf ve üzeri',
  requiredSkills: ['React', 'TypeScript'],
  preferredSkills: [],
  description: '',
  responsibilities: [],
  perks: [],
  applicantsCount: 0,
  postedAt: '2026-08-20T00:00:00Z',
  origin: 'scraped',
  applicationMethod: 'external',
  applyUrl: 'https://ornek.test/basvuru',
} as unknown as InternshipListing;

const eslesme = {
  coreSkillsMatchScore: 0,
  bonusSkillsScore: 0,
  locationScore: 0,
  availabilityScore: 0,
  overallScore: 0,
  matchedRequiredSkills: [],
  missingRequiredSkills: [],
  matchedPreferredSkills: [],
  missingPreferredSkills: [],
  isEligibleForMandatory: true,
  isWorkTypeCompatible: true,
} as unknown as MatchBreakdown;

const ic = {
  ...temel,
  origin: 'employer_posted',
  applicationMethod: 'internal',
  applyUrl: undefined,
} as unknown as InternshipListing;

const DURUMLAR: {
  ad: string;
  listing: InternshipListing;
  hasApplied?: boolean;
  kendiIlanim?: boolean;
}[] = [
  { ad: 'Dış ilan — başvurulmamış', listing: temel },
  { ad: 'Dış ilan — işaretlenmiş', listing: temel, hasApplied: true },
  { ad: 'StajımVar ilanı — başvurulmamış', listing: ic },
  { ad: 'StajımVar ilanı — başvurulmuş', listing: ic, hasApplied: true },
  { ad: 'Şirketin kendi ilanı', listing: ic, kendiIlanim: true },
  {
    ad: 'Resmî adresi olmayan kayıt',
    listing: { ...temel, applyUrl: undefined, sourceUrl: undefined } as unknown as InternshipListing,
  },
  {
    ad: 'Çok uzun başlık + son başvuru yok',
    listing: {
      ...temel,
      title: 'Yapay Zekâ ve Makine Öğrenmesi Araştırma Geliştirme Uzun Dönem Stajyeri',
      companyName: 'Türkiye Bilimsel ve Teknolojik Araştırma Kurumu',
      applicationDeadline: '',
    } as unknown as InternshipListing,
  },
];

export const IlanKartiDevFixture: React.FC = () => (
  <div className="min-h-screen bg-gray-50 p-4">
    <div className="mx-auto max-w-3xl space-y-5">
      {DURUMLAR.map((d) => (
        <div key={d.ad}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {d.ad}
          </p>
          <InternshipCard
            listing={d.listing}
            match={eslesme}
            hasApplied={Boolean(d.hasApplied)}
            kendiIlanim={Boolean(d.kendiIlanim)}
            onViewDetails={() => undefined}
            onQuickApply={() => undefined}
            kayitli={false}
            onToggleKayit={() => undefined}
          />
        </div>
      ))}
    </div>
  </div>
);
