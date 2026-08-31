import React from 'react';
import { ScholarshipDiscoveryCard } from '../components/ScholarshipDiscoveryCard';
import { ZamanTupu } from '../components/ZamanTupu';
import type { Opportunity } from '../lib/opportunities';

/**
 * Zaman tüpünün altı durumu tek ekranda.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Üretimde bugün yalnızca birkaç tarih aralığı var; "bugün son gün" ya da
 * "süresi doldu" durumları oradan görülemiyor ve doğru zamanı beklemek
 * gerekiyordu. Fikstür GERÇEK bileşeni ve gerçek kartı çiziyor, kopyasını
 * değil. Üretim paketine girmiyor.
 */

const gun = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const temel = {
  id: 'x',
  slug: 'ornek-burs',
  title: 'Örnek Vakfı Lisans Bursu',
  organizationName: 'Örnek Eğitim Vakfı',
  opportunityType: 'scholarship',
  shortDescription: '',
  description: '',
  eligibility: '',
  educationLevels: [],
  eligibleDepartments: [],
  eligibleClassYears: [],
  cities: [],
  countries: [],
  languageRequirements: [],
  requiredDocuments: [],
  status: 'published',
  sourceUrl: 'https://ornek.test/burs',
  verifiedAt: '2026-08-01T00:00:00Z',
} as unknown as Opportunity;

const ORNEKLER: { ad: string; item: Opportunity }[] = [
  { ad: 'Bugün son gün', item: { ...temel, applicationDeadline: gun(0) } },
  { ad: 'Yarın', item: { ...temel, applicationDeadline: gun(1) } },
  { ad: '3 gün kaldı', item: { ...temel, applicationDeadline: gun(3) } },
  { ad: '6 gün kaldı', item: { ...temel, applicationDeadline: gun(6) } },
  { ad: '18 gün kaldı', item: { ...temel, applicationDeadline: gun(18) } },
  { ad: '90 gün kaldı', item: { ...temel, applicationDeadline: gun(90) } },
  {
    ad: 'Yakında açılıyor',
    item: { ...temel, applicationStartAt: gun(12), applicationDeadline: gun(60) } as Opportunity,
  },
  { ad: 'Takvim yok', item: { ...temel, applicationDeadline: undefined } as Opportunity },
  { ad: 'Süresi doldu', item: { ...temel, applicationDeadline: gun(-4) } },
];

export const ZamanTupuDevFixture: React.FC = () => (
  <div className="min-h-screen bg-gray-50 p-4">
    <div className="mx-auto max-w-5xl space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
          Tüp — tek başına
        </h2>
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          {ORNEKLER.map((o) => (
            <div key={o.ad} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {o.ad}
              </p>
              <ZamanTupu item={o.item} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
          Kart içinde
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ORNEKLER.map((o) => (
            <ScholarshipDiscoveryCard
              key={o.ad}
              item={o.item}
              saved={false}
              onSave={() => undefined}
              onNavigate={() => undefined}
            />
          ))}
        </div>
      </section>
    </div>
  </div>
);
