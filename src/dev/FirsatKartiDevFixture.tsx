import React from 'react';
import { Card } from '../components/OpportunitiesPage';
import { OneCikanBurslar } from '../components/OneCikanBurslar';
import type { Opportunity } from '../lib/opportunities';

/**
 * Fırsat kartının zorlayıcı durumları tek ekranda.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Kartın yerleşimi başlık uzunluğuna, tutarın bilinip bilinmemesine ve
 * resmî kaynak etiketinin uzunluğuna göre değişiyor. Üretimde bu
 * varyasyonların hepsi aynı anda bulunmuyor; iki düğmenin taşıp taşmadığı
 * ancak en uzun etiketle görülüyor.
 *
 * Fikstür GERÇEK kartı çiziyor, kopyasını değil. Üretim paketine girmiyor.
 */

const gun = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const temel = {
  id: 'x',
  slug: 'ornek',
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
  lastCheckedAt: '2026-08-23T00:00:00Z',
  applicationDeadline: gun(5),
} as unknown as Opportunity;

const ORNEKLER: { ad: string; item: Opportunity }[] = [
  { ad: 'Kısa başlık', item: { ...temel, title: 'KYK Bursu' } },
  {
    ad: 'Uzun başlık (iki satır)',
    item: {
      ...temel,
      title: 'TÜBİTAK 2247-C Stajyer Araştırmacı Burs Programı (STAR) Lisans Öğrencileri',
      organizationName: 'Türkiye Bilimsel ve Teknolojik Araştırma Kurumu',
    },
  },
  {
    ad: 'Uzun resmî kaynak etiketi (Resmî başvuru)',
    item: { ...temel, applicationUrl: 'https://ornek.test/basvuru', applicationDeadline: gun(-2) },
  },
  {
    ad: 'Başvur (açık + başvuru adresi)',
    item: { ...temel, applicationUrl: 'https://ornek.test/basvuru' },
  },
  { ad: 'Tarihsiz', item: { ...temel, applicationDeadline: undefined } as Opportunity },
  { ad: 'Bugün son gün', item: { ...temel, applicationDeadline: gun(0) } },
  {
    ad: 'Doğrulanmış tutar',
    item: {
      ...temel,
      amountMin: 3000,
      currency: 'TRY',
      paymentPeriod: 'monthly',
      amountVerifiedAt: '2026-08-01T00:00:00Z',
    } as Opportunity,
  },
  {
    ad: 'Resmî kaynak yok (tek düğme)',
    item: { ...temel, sourceUrl: '', verifiedAt: undefined } as Opportunity,
  },
];

/*
  ŞERİT SENARYOLARI

  Öne çıkanlar en az üç uygun kayıt ister; ikisiyle hiç çizilmemeli.
  Görseli olmayan, adı çok uzun ve tarihi olmayan kayıtlar da şeritte
  nasıl davrandığı görülsün diye burada.
*/
const SERIT_DOLU: Opportunity[] = [
  { ...temel, id: 's1', applicationDeadline: gun(1), coverImageUrl: undefined } as Opportunity,
  {
    ...temel,
    id: 's2',
    title: 'Türkiye Bilimsel ve Teknolojik Araştırma Kurumu 2247-C Stajyer Araştırmacı Burs Programı',
    organizationName: 'Türkiye Bilimsel ve Teknolojik Araştırma Kurumu',
    applicationDeadline: gun(3),
    organizationLogoUrl: undefined,
  } as Opportunity,
  { ...temel, id: 's3', applicationDeadline: gun(9), sourceUrl: '', verifiedAt: undefined } as Opportunity,
  { ...temel, id: 's4', applicationDeadline: undefined } as Opportunity,
  { ...temel, id: 's5', applicationDeadline: gun(-5) } as Opportunity,
];

const SERIT_AZ: Opportunity[] = [
  { ...temel, id: 'a1', applicationDeadline: gun(2) } as Opportunity,
  { ...temel, id: 'a2', applicationDeadline: gun(4) } as Opportunity,
];

export const FirsatKartiDevFixture: React.FC = () => (
  <div className="min-h-screen bg-gray-50 p-4">
    <div className="mx-auto max-w-6xl">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        Şerit — üç ve üzeri uygun kayıt (tarihsiz ve süresi dolan girmiyor)
      </p>
      <OneCikanBurslar items={SERIT_DOLU} onNavigate={() => undefined} />

      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        Şerit — yalnızca iki uygun kayıt (hiç çizilmemeli)
      </p>
      <div className="mb-6 rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-500">
        <OneCikanBurslar items={SERIT_AZ} onNavigate={() => undefined} />
        Bu kutunun içi boş kalmalı.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ORNEKLER.map((o) => (
          <div key={o.ad}>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {o.ad}
            </p>
            {/* Fixture girişli kullanıcıyı taklit ediyor: kapıyı burada denemek
                istiyorsak `girisGerekli` true yapılır. */}
            <Card
              item={o.item}
              onNavigate={() => undefined}
              fit={null}
              girisGerekli={false}
              onRequireLogin={() => undefined}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
);
