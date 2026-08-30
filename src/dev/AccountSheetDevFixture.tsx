import React from 'react';
import { Header } from '../components/Header';
import type { StudentProfile } from '../types';

const testStudent: StudentProfile = {
  id: 'development-account-sheet-fixture',
  fullName: 'Geliştirme Test Öğrencisi',
  email: 'development-fixture@example.invalid',
  phone: '',
  university: 'Geliştirme Üniversitesi',
  faculty: '',
  department: 'Bilgisayar Mühendisliği',
  gradeLevel: '3. Sınıf',
  graduationYear: 2027,
  gpa: 0,
  avatarUrl: '',
  bio: '',
  skills: [],
  targetRoles: [],
  preferences: {
    workType: 'Any',
    cities: [],
    type: 'Any',
    mandatoryInsuranceProvidedByUni: false,
    earliestStartDate: '',
    weeklyDaysAvailable: 0,
  },
  projects: [],
  earnedBadges: [],
};

type FixtureTab = 'internships' | 'badges' | 'applications' | 'profile' | 'company-portal';

/** Yalnızca Vite development girişinden ulaşılan, üretim verisi kullanmayan e2e yüzeyi. */
export const AccountSheetDevFixture: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<FixtureTab>('internships');
  const [activeSubTab, setActiveSubTab] = React.useState('all');
  const [backgroundClicks, setBackgroundClicks] = React.useState(0);
  const [lastAction, setLastAction] = React.useState('hazır');
  /*
    Şirket üyeliği anahtarı: "İşveren paneli" bağlantısı yalnızca üyede
    çizilmeli. İki durumu da elle görebilmek için fixture'da açılıp
    kapanıyor; gerçek uygulamada bayrak company_members'tan geliyor.
  */
  const [sirketUyesi, setSirketUyesi] = React.useState(false);

  return (
    <div className="min-h-[2800px] bg-[#F9FAFB]">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        userRole="student"
        setUserRole={() => undefined}
        activeStudent={testStudent}
        applicationsCount={3}
        isLoggedIn
        isAdmin
        onOpenAdmin={() => setLastAction('admin')}
        onOpenGuides={() => setLastAction('guides')}
        onOpenOpportunities={() => setLastAction('opportunities')}
        onLogout={() => setLastAction('logout')}
        sirketUyesiMi={sirketUyesi}
        onDunyaDegistir={() => setLastAction('isveren-paneli')}
        bulunulanYol="/"
      />

      <div className="fixed left-2 top-20 z-[300] rounded-xl bg-white p-2 shadow-lg">
        <button
          type="button"
          data-testid="fixture-sirket-uyeligi"
          onClick={() => setSirketUyesi((v) => !v)}
          className="rounded-lg border px-2 py-1 text-xs font-bold"
        >
          Şirket üyeliği: {sirketUyesi ? 'VAR' : 'YOK'}
        </button>
      </div>

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-12 pb-28">
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">Development-only e2e yüzeyi</p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Hesap menüsü görsel doğrulaması</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Bu sayfa üretim verisi veya gerçek oturum kullanmaz; yalnızca mobil hesap menüsü için güvenli test fixture'ıdır.
          </p>
          <button
            type="button"
            data-testid="fixture-background-button"
            onClick={() => setBackgroundClicks((count) => count + 1)}
            className="mt-5 rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-700"
          >
            Arka plan etkileşim testi
          </button>
          <p className="mt-3 text-sm text-gray-600">
            Arka plan tıklaması: <span data-testid="fixture-background-click-count">{backgroundClicks}</span>
          </p>
          <p className="text-sm text-gray-600">
            Son eylem: <span data-testid="fixture-active-tab">{activeTab}</span> / {lastAction}
          </p>
        </section>

        {Array.from({ length: 9 }, (_, index) => (
          <section key={index} className="min-h-56 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Kaydırma doğrulama alanı {index + 1}</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
              Panel ekranın üstünde, ortasında ve altında açıldığında bu içerik yalnızca arka plan olarak kalmalıdır.
            </p>
          </section>
        ))}
      </main>
    </div>
  );
};
