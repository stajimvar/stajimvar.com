import React from 'react';
import { ListingPage } from '../components/ListingPage';
import type { InternshipListing } from '../types';

/**
 * İlan detay sayfasının dört başvuru durumu.
 *
 * NEDEN GEREKİYOR
 * ---------------
 * Sayfanın sağ kartı ve telefondaki sabit çubuk ilanın başvuru yoluna
 * göre değişiyor: StajımVar üzerinden açık ilan, son günü geçmiş iç
 * ilan, şirket sayfasına giden dış ilan, adresi olmayan kayıt. Bunlar
 * aynı anda tek bir canlı ilanda bulunmuyor; canlı Supabase'e bağlanmadan
 * hepsini görmek için GERÇEK `ListingPage` `hazirIlan` ile çiziliyor,
 * kopyası değil.
 *
 * Veriler açıkça örnek: şirket adlarında "(fikstür)", metinlerin başında
 * "Geliştirme fikstürü" yazıyor. Tarihler bugüne göre hesaplanıyor; sabit
 * bir tarih birkaç hafta sonra "açık" durumunu "kapalı"ya çevirirdi.
 *
 * Üretim paketine girmiyor: yalnız `ilan-detay-test.html` üzerinden,
 * development sunucusunda açılıyor.
 */

const gunKaydir = (gun: number) => {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() + gun);
  return t.toISOString().slice(0, 10);
};

const temel = {
  companyLogo: '',
  companyIndustry: 'Tekstil',
  companySize: '51-200',
  companyLocation: 'İstanbul',
  companyDescription: '',
  companyRating: 0,
  department: '',
  minGradeLevel: '',
  requiredSkills: [],
  preferredSkills: [],
  responsibilities: [],
  perks: [],
  applicantsCount: 0,
  postedAt: '2026-09-20T00:00:00Z',
} as const;

const IC_METIN = [
  'Geliştirme fikstürü — örnek ilan metni, gerçek bir ilan değildir.',
  'Üniversitelerin Endüstri Mühendisliği, Tekstil Mühendisliği ya da Moda Tasarımı bölümlerinde öğrenciysen,',
  'okulun staj sürecinde SGK primini karşılıyorsa,',
  'haftada en az 3 gün bizimle olabilecek ve en az 60 iş günü staj süresine sahipsen,',
  'üretim ve yönetim tarafında staj deneyimi kazanmak istiyorsan,',
  'öğrenmeye meraklıysan ve mezun olmadan önce deneyimini geliştirmek istiyorsan başvurabilirsin.',
  '',
  'Bu paragraf satır sonlarının korunduğunu görmek için ayrı duruyor.',
].join('\n');

const DIS_METIN = [
  'Geliştirme fikstürü — örnek çeviri metni, gerçek bir ilan değildir.',
  '',
  'Veri platformu ekibimizde, günlük olarak milyonlarca olayı işleyen boru hatlarının bakımına ve geliştirilmesine katkı verecek bir stajyer arıyoruz. Ekip; veri alma, dönüştürme ve raporlama katmanlarından sorumlu.',
  '',
  'Sorumluluklar:',
  '- Python ve SQL ile veri dönüştürme işleri yazmak ve test etmek',
  '- Mevcut boru hatlarının izlenmesine ve hata ayıklamasına destek olmak',
  '- Ekip içi kod incelemelerine katılmak',
  '',
  'Aradığımız nitelikler:',
  '- Bilgisayar mühendisliği ya da ilgili bir bölümde lisans öğrencisi olmak',
  '- Python ile temel düzeyde deneyim',
  '- İngilizce iletişim becerisi',
  '',
  'Bu metin satır ölçüsünü ve katlanmayı görmek için 900 karakterden uzun tutuldu. Katlanan metin "Kaynak metnin tamamını göster" düğmesiyle açılıyor; açıldığında yalnızca bu fikstür metni görünür, başka içerik eklenmez. Uzun paragrafların okunabilir bir satır uzunluğunda kalıp kalmadığı da bu paragrafla ölçülüyor.',
].join('\n');

const ic = {
  ...temel,
  id: 'fikstur-ic',
  companyName: 'Örnek Tekstil (fikstür)',
  companySlug: 'ornek-tekstil-fikstur',
  title: 'Stajyer',
  workType: 'On-site',
  city: 'İstanbul',
  mandatoryStajAccepted: true,
  voluntaryStajAccepted: null,
  stipend: { isPaid: true, amountText: 'Asgari staj ücreti' },
  duration: '20 iş günü',
  term: 'All Year',
  applicationDeadline: gunKaydir(60),
  description: IC_METIN,
  origin: 'internal',
  applicationMethod: 'internal',
} as unknown as InternshipListing;

const DURUMLAR: { anahtar: string; ad: string; ilan: InternshipListing }[] = [
  { anahtar: 'ic', ad: 'İç ilan — açık', ilan: ic },
  {
    anahtar: 'dis',
    ad: 'Dış ilan — resmî site, çeviri',
    ilan: {
      ...temel,
      id: 'fikstur-dis',
      companyName: 'Example GmbH (fikstür)',
      companySlug: 'example-gmbh-fikstur',
      companyIndustry: 'Yazılım',
      title: 'Yazılım Geliştirme Stajyeri — Veri Platformu Ekibi',
      sourceTitle: 'Software Engineering Intern – Data Platform',
      department: 'Mühendislik',
      workType: 'Hybrid',
      city: 'Berlin',
      countryCode: 'DE',
      originalLanguage: 'en',
      mandatoryStajAccepted: null,
      voluntaryStajAccepted: true,
      stipend: { isPaid: true },
      insuranceProvider: 'isveren',
      duration: '6 ay',
      term: 'Fall 2026',
      applicationDeadline: gunKaydir(30),
      lastSeenAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      requiredSkills: ['Python', 'SQL'],
      description: DIS_METIN,
      origin: 'scraped',
      applicationMethod: 'external',
      applyUrl: 'https://kariyer.example.com/jobs/fikstur-12345',
      sourceUrl: 'https://kariyer.example.com/jobs/fikstur-12345',
    } as unknown as InternshipListing,
  },
  {
    anahtar: 'kapali',
    ad: 'İç ilan — son günü geçmiş',
    ilan: {
      ...ic,
      id: 'fikstur-kapali',
      title: 'Pazarlama Stajyeri',
      applicationDeadline: gunKaydir(-3),
    } as unknown as InternshipListing,
  },
  {
    anahtar: 'eksik',
    ad: 'Eksik alanlı, adressiz kayıt',
    ilan: {
      ...temel,
      id: 'fikstur-eksik',
      companyName: 'Uzun Adlı Örnek Araştırma ve Geliştirme Kurumu (fikstür)',
      title: 'Yapay Zekâ ve Makine Öğrenmesi Araştırma Geliştirme Uzun Dönem Stajyeri',
      workType: 'Remote',
      city: 'Ankara',
      mandatoryStajAccepted: null,
      voluntaryStajAccepted: null,
      stipend: { isPaid: null },
      duration: '',
      term: '',
      applicationDeadline: '',
      kaynakDurumu: 'belirsiz',
      description: 'Geliştirme fikstürü — süre, ücret, dönem ve son başvuru alanları bilerek boş bırakıldı.',
      origin: 'manual',
      applicationMethod: 'external',
    } as unknown as InternshipListing,
  },
];

export const IlanDetayDevFixture: React.FC = () => {
  const secili = new URLSearchParams(window.location.search).get('durum') ?? 'ic';
  const durum = DURUMLAR.find((d) => d.anahtar === secili) ?? DURUMLAR[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <nav
        aria-label="Fikstür durumları"
        className="flex flex-wrap items-center gap-2 border-b border-dashed border-gray-300 bg-white px-4 py-2"
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Geliştirme fikstürü
        </span>
        {DURUMLAR.map((d) => (
          <a
            key={d.anahtar}
            href={`?durum=${d.anahtar}`}
            aria-current={d === durum ? 'page' : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              d === durum ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {d.ad}
          </a>
        ))}
      </nav>
      <ListingPage
        key={durum.anahtar}
        gomulu
        idPrefix={durum.ilan.id}
        hazirIlan={durum.ilan}
        onBack={() => undefined}
        onNavigate={() => undefined}
        onApply={() => undefined}
        onTrack={() => undefined}
      />
      {/*
        Site kabuğunda telefonda alt gezinme (60 px) sabit çubuğun altında
        duruyor; fikstür `Header`ı çizmiyor. Yeri boş kalmasın ve çubuğun
        konumu gerçeğe denk düşsün diye yalnız bir yer işareti var.
      */}
      <div
        aria-hidden="true"
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start justify-center border-t border-dashed border-gray-300 bg-gray-100 pt-5 text-[10px] font-bold uppercase tracking-wide text-gray-700"
      >
        Alt gezinmenin yeri (fikstürde çizilmiyor)
      </div>
    </div>
  );
};
