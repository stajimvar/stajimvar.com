import React, { useState } from 'react';
import { SKILL_QUIZZES } from './data/skillQuizzes';
import {
  fetchPublishedListings,
  fetchStudentProfile,
  fetchStudentApplications,
  createApplication,
  saveStudentProfile,
  fetchIsAdmin,
} from './lib/queries';
import { getCurrentUser, onAuthChange, signOut, KVKK_VERSION, type AuthResult } from './lib/auth';
import {
  StudentProfile,
  InternshipListing,
  ApplicationRecord,
  SkillQuiz,
  MatchBreakdown,
  CompanyAccount,
} from './types';
import { Header } from './components/Header';
import { MatchedInternshipsView } from './components/MatchedInternshipsView';
import { SkillQuizzesView } from './components/SkillQuizzesView';
import { ApplicationsTrackerView } from './components/ApplicationsTrackerView';
import { StudentProfileView } from './components/StudentProfileView';
import { CompanyPortalView } from './components/CompanyPortalView';
import { InternshipDetailModal } from './components/InternshipDetailModal';
import { SkillAssessmentModal } from './components/SkillAssessmentModal';
import { AuthModal } from './components/AuthModal';
import { Logo } from './components/Logo';
import { LegalPage, LEGAL_ROUTES } from './components/LegalPage';
import { ApplyDialog } from './components/ApplyDialog';
import { ListingPage } from './components/ListingPage';
import { CompanyPage } from './components/CompanyPage';
import { AdminClaimsView } from './components/AdminClaimsView';
import { listingSlug, idPrefixFromSlug } from './lib/slug';
import confetti from 'canvas-confetti';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  /**
   * Yasal sayfalar için hafif yol tabanlı geçiş. Uygulama tek sayfa olduğu için
   * tam bir router eklemek yerine yalnızca bu üç yol ayrıştırılıyor; Cloudflare
   * Pages tarafında public/_redirects ile bilinmeyen yollar index.html'e düşüyor.
   */
  const [path, setPath] = React.useState<string>(
    typeof window === 'undefined' ? '/' : window.location.pathname
  );

  React.useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  };

  const goHome = () => navigate('/');

  // Global State
  /** Supabase oturumu. null = ziyaretçi. */
  const [session, setSession] = useState<AuthResult | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  /** Giriş yapmış öğrencinin gerçek profili. */
  const [student, setStudent] = useState<StudentProfile | null>(null);
  // İlanlar artık Supabase'den geliyor. Boş başlıyor; yükleme durumu aşağıda.
  const [allListings, setAllListings] = useState<InternshipListing[]>([]);
  const [listingsStatus, setListingsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [listingsError, setListingsError] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchPublishedListings()
      .then((rows) => {
        if (cancelled) return;
        setAllListings(rows);
        setListingsStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Hatayı yutma: kullanıcı boş liste ile "ilan yok" sanmasın.
        setListingsError(error instanceof Error ? error.message : 'Bilinmeyen hata');
        setListingsStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [quizzes] = useState<SkillQuiz[]>(SKILL_QUIZZES);

  /*
    Şirket hesapları.

    Eskiden uydurma üç şirketle başlıyordu ve arayüzde gerçek hesap gibi
    görünüyorlardı — biri seçili bile geliyordu. Artık boş başlıyor: gerçek
    şirket kaydı akışı kurulana kadar (Faz 2.5) burada hesap olmayacak.
    `activeCompany` bu yüzden tanımsız olabilir; portal öyleyse çizilmiyor.
  */
  const [allCompanies, setAllCompanies] = useState<CompanyAccount[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('');
  const activeCompany: CompanyAccount | undefined =
    allCompanies.find((c) => c.id === activeCompanyId) ?? allCompanies[0];

  const handleSelectCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    const comp = allCompanies.find((c) => c.id === companyId);
    if (comp) {
      showToast(`${comp.name} şirket hesabına geçiş yapıldı.`);
    }
  };

  const handleUpdateCompany = (updated: Partial<CompanyAccount>) => {
    if (!activeCompany) return;
    setAllCompanies((prev) =>
      prev.map((c) => (c.id === activeCompany.id ? { ...c, ...updated } : c))
    );
    showToast('Şirket profili başarıyla güncellendi!');
  };

  const handleCreateCompany = (newComp: CompanyAccount) => {
    setAllCompanies((prev) => [newComp, ...prev]);
    setActiveCompanyId(newComp.id);
    showToast(`"${newComp.name}" kurumsal şirket hesabı oluşturuldu!`);
  };

  /*
    Yonetici mi?

    Rol istemcide tutulan bir bayrakla degil, veritabanindaki is_admin()
    fonksiyonuna sorularak belirleniyor. Istemcideki bir degeri degistirmek
    kimseye yetki vermez -- onay ve ret islemleri zaten sunucuda ayni
    fonksiyonla korunuyor. Buradaki bayrak yalnizca menuyu gostermek icin.
  */
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    let iptal = false;
    fetchIsAdmin()
      .then((sonuc) => {
        if (!iptal) setIsAdmin(sonuc);
      })
      .catch(() => {
        if (!iptal) setIsAdmin(false);
      });
    return () => {
      iptal = true;
    };
  }, [session]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<
    'internships' | 'badges' | 'applications' | 'profile' | 'company-portal'
  >('internships');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
  const [userRole, setUserRole] = useState<'student' | 'company'>('student');

  const handleTabChange = (
    newTab: 'internships' | 'badges' | 'applications' | 'profile' | 'company-portal'
  ) => {
    setActiveTab(newTab);
    setActiveSubTab('all');
  };

  // Modal States
  const [selectedListingDetail, setSelectedListingDetail] = useState<{
    listing: InternshipListing;
    match: MatchBreakdown;
  } | null>(null);

  const [activeQuiz, setActiveQuiz] = useState<SkillQuiz | null>(null);
  /** StajımVar üzerinden başvuru diyaloğu. */
  const [applyTarget, setApplyTarget] = useState<{
    listing: InternshipListing;
    matchScore: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authentication State
  /** Oturumdan türüyor; ayrı bir bayrak tutmak ikisini ayrı düşürebilirdi. */
  const isLoggedIn = Boolean(session);

  /** Öğrenci kaydı/girişi artık gerçek Supabase oturumuna bağlı. */
  const AUTH_ENABLED = true;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // Oturum sunucuda zaten düşmüş olabilir; yerel durumu yine de temizle.
    }
    setSession(null);
    setStudent(null);
    setApplications([]);
    setActiveTab('internships');
    showToast('Hesabınızdan güvenle çıkış yapıldı.');
  };

  const handleAuthSuccess = (role: 'student' | 'company', name: string) => {
    // Oturumun kendisi onAuthChange üzerinden geliyor; burada yalnızca
    // arayüzü kullanıcının rolüne göre konumlandırıyoruz.
    setUserRole(role);
    if (role === 'student') {
      setActiveTab('internships');
      showToast(`Hoş geldiniz, ${name}!`);
    } else {
      setActiveTab('company-portal');
      showToast(`Hoş geldiniz, ${name} Şirket Portalı aktif.`);
    }
  };

  /*
    Karanlık tema kaldırıldı; site tek temalı.

    Özelliği kullanmış olanların tarayıcısında `stajimvar_theme` anahtarı ve
    kökte `dark` sınıfı kalmış olabiliyor. İkisini de temizliyoruz: sınıf
    kalırsa artık hiçbir kural onunla eşleşmediği için görünürde bir şey
    olmaz, ama çerez politikasında "saklamıyoruz" yazarken veriyi kullanıcının
    tarayıcısında bırakmak doğru olmaz.
  */
  React.useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('stajimvar_theme');
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // --- Oturum ---------------------------------------------------------
  /**
   * Sayfa açıldığında mevcut oturumu okur, sonra değişiklikleri dinler.
   * Dinleyici başka sekmede yapılan çıkışı da yakalar.
   */
  React.useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setSession(user);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });

    const unsubscribe = onAuthChange((user) => {
      setSession(user);
      setSessionReady(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  /** Oturum değiştikçe gerçek profili ve başvuruları çeker. */
  React.useEffect(() => {
    if (!session || session.role !== 'student') {
      setStudent(null);
      setApplications([]);
      return;
    }
    let cancelled = false;

    fetchStudentProfile(session.userId)
      .then((profile) => {
        if (!cancelled) setStudent(profile);
      })
      .catch(() => {
        if (!cancelled) setStudent(null);
      });

    fetchStudentApplications(session.userId)
      .then((rows) => {
        if (!cancelled) setApplications(rows);
      })
      .catch(() => {
        if (!cancelled) setApplications([]);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const activeStudent = student;

  /**
   * Profil güncelleme. Önce ekranda gösterir, sonra Supabase'e yazar.
   *
   * Eskiden yalnızca yerel state'i değiştiriyordu; kullanıcı fotoğraf ekleyip
   * sayfayı yenileyince her şey kayboluyordu. Yazma başarısız olursa değişiklik
   * geri alınıyor — "kaydedildi" deyip kaybetmek en kötüsü.
   */
  const handleUpdateProfile = async (updated: Partial<StudentProfile>) => {
    if (!session || !activeStudent) return;
    const onceki = activeStudent;

    setStudent((prev) =>
      prev
        ? {
            ...prev,
            ...updated,
            skills: updated.skills || prev.skills,
            preferences: updated.preferences
              ? { ...prev.preferences, ...updated.preferences }
              : prev.preferences,
          }
        : prev
    );

    try {
      await saveStudentProfile(session.userId, updated);
      showToast('Profil kaydedildi.');
    } catch (error) {
      setStudent(onceki);
      showToast(
        error instanceof Error ? `Kaydedilemedi: ${error.message}` : 'Profil kaydedilemedi.'
      );
    }
  };

  // Handler: Earn Badge from Quiz
  const handleEarnBadge = (badgeId: string, skillName: string) => {
    const currentBadges = activeStudent.earnedBadges || [];
    if (!currentBadges.includes(badgeId)) {
      const updatedBadges = [...currentBadges, badgeId];
      // Also mark the corresponding skill as verified
      const updatedSkills = activeStudent.skills.map((sk) => {
        if (sk.name.toLowerCase() === skillName.toLowerCase()) {
          return { ...sk, verified: true };
        }
        return sk;
      });

      handleUpdateProfile({
        earnedBadges: updatedBadges,
        skills: updatedSkills,
      });
    }
  };

  /**
   * Başvuru akışı. Giriş yoksa önce kayıt/giriş açılır — başvuruyu kime
   * yazacağımızı bilmeden kaydetmenin anlamı yok.
   */
  const handleApplyToJob = (listing: InternshipListing, matchScore: number) => {
    if (!session || !activeStudent) {
      setAuthModalMode('register');
      setIsAuthModalOpen(true);
      showToast('Başvurmak için önce hesap açman gerekiyor.');
      return;
    }
    setApplyTarget({ listing, matchScore });
  };

  const submitApplication = async (consent: boolean) => {
    if (!applyTarget || !activeStudent) return;

    const created = await createApplication({
      listingId: applyTarget.listing.id,
      studentId: activeStudent.id,
      matchScore: applyTarget.matchScore,
      applicationMethod: applyTarget.listing.applicationMethod,
      contactShareConsent: consent,
      consentVersion: KVKK_VERSION,
    });

    setApplications((prev) => [created, ...prev]);
    setApplyTarget(null);

    confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });

    // Dış ilanlarda başvuru şirkete iletilmedi; mesaj bunu gizlememeli.
    showToast(
      applyTarget.listing.applicationMethod === 'external'
        ? 'Başvurun kaydedildi. Şirkete ulaşıp başvuru kanalını doğrulamalarını isteyeceğiz.'
        : `${applyTarget.listing.companyName} başvurun iletildi.`
    );
  };

  // Handler: Add New Listing (Company portal)
  const handleAddNewListing = (listing: InternshipListing) => {
    setAllListings((prev) => [listing, ...prev]);
    showToast(`"${listing.title}" staj ilanı başarıyla yayınlandı ve adaylarla eşleştirildi.`);
  };

  // Handler: Delete Listing
  const handleDeleteListing = (listingId: string) => {
    setAllListings((prev) => prev.filter((l) => l.id !== listingId));
    showToast('Staj ilanı kaldırıldı.');
  };

  // Handler: Update Application Status & Notes (Company portal)
  const handleUpdateApplicationStatus = (
    applicationId: string,
    newStatus: ApplicationRecord['status'],
    feedback?: string,
    interviewDate?: string
  ) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            status: newStatus,
            ...(feedback !== undefined ? { companyFeedback: feedback } : {}),
            ...(interviewDate !== undefined ? { interviewDate } : {}),
          };
        }
        return app;
      })
    );
    showToast('Aday başvuru durumu başarıyla güncellendi.');
  };

  /**
   * Savunma katmanı: giriş yapılmamışken öğrenciye özel sekmeler açılamaz.
   * Sekmeleri Header'da gizlemek yeterli değil — durum başka bir yoldan da
   * (eski state, geri tuşu) o değere düşebilir ve ziyaretçi kendisine aitmiş
   * gibi görünen örnek verileri görür.
   */
  const safeTab = !isLoggedIn && activeTab !== 'internships' ? 'internships' : activeTab;

  const temizYol = path.replace(/\/+$/, '') || '/';

  const legalSlug = LEGAL_ROUTES[temizYol];
  if (legalSlug) {
    return <LegalPage slug={legalSlug} onBack={goHome} />;
  }

  /* /ilan/frontend-stajyeri-3f2a1b9c */
  if (temizYol.startsWith('/ilan/')) {
    const onek = idPrefixFromSlug(temizYol.slice('/ilan/'.length));
    if (onek) {
      return (
        <ListingPage
          idPrefix={onek}
          onBack={goHome}
          onNavigate={navigate}
          onApply={(ilan) => handleApplyToJob(ilan, 0)}
        />
      );
    }
  }

  /*
    /yonetim/talepler

    Ayri bir yol, sekme degil: yonetici ekrani gunluk kullanimda degil ve
    ogrenci menusunde yer kaplamamali. Yetkisiz biri adresi bilse bile
    listeyi goremiyor -- RLS yalnizca admin'e satirlari veriyor, kuyruk
    bos gorunur ve onay fonksiyonu hata dondurur.
  */
  if (temizYol === '/yonetim/talepler') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] font-sans text-[#111827] p-4 sm:p-8">
        <button
          type="button"
          onClick={goHome}
          className="mb-4 text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Siteye don
        </button>
        {isAdmin ? (
          <AdminClaimsView onToast={showToast} />
        ) : (
          <p className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
            Bu sayfa yalnizca yoneticiye acik.
          </p>
        )}
      </div>
    );
  }

  /* /sirket/vertigo-games */
  if (temizYol.startsWith('/sirket/')) {
    const sirketSlug = temizYol.slice('/sirket/'.length);
    if (sirketSlug) {
      return (
        <CompanyPage
          slug={sirketSlug}
          onBack={goHome}
          onNavigate={navigate}
          userId={session?.userId ?? null}
          userEmail={student?.email}
          onRequireLogin={handleOpenLogin}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-[#111827] flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-gray-800 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        activeTab={safeTab}
        setActiveTab={handleTabChange}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        userRole={userRole}
        setUserRole={setUserRole}
        activeStudent={activeStudent}
        activeCompany={activeCompany}
        allCompanies={allCompanies}
        onSelectCompany={handleSelectCompany}
        applicationsCount={applications.length}
        isLoggedIn={isLoggedIn}
        onOpenLogin={AUTH_ENABLED ? handleOpenLogin : undefined}
        onOpenRegister={AUTH_ENABLED ? handleOpenRegister : undefined}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1536px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 pb-24 lg:pb-8">
        {(userRole === 'company' || safeTab === 'company-portal') && !activeCompany ? (
          /*
            Şirket hesabı yokken portalı çizmek, uydurma bir şirketin panelini
            göstermek demekti. Gerçek kayıt akışı kurulana kadar durumu
            olduğu gibi söylüyoruz.
          */
          <div className="max-w-xl mx-auto my-16 bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Şirket hesabı henüz yok</h2>
            <p className="text-sm text-gray-600">
              Şirket kaydı ve ilan girişi üzerinde çalışıyoruz. Şirketinizin ilanının
              StajımVar'da olduğunu gördüyseniz ve sahiplenmek istiyorsanız
              iletişim sayfasından bize yazın.
            </p>
            <button
              type="button"
              onClick={() => {
                setUserRole('student');
                setActiveTab('internships');
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              İlanlara dön
            </button>
          </div>
        ) : userRole === 'company' || safeTab === 'company-portal' ? (
          <CompanyPortalView
            allListings={allListings}
            allStudents={[]}
            applications={applications}
            onUpdateApplicationStatus={handleUpdateApplicationStatus}
            subTab={activeSubTab}
            onSubTabChange={setActiveSubTab}
            onAddNewListing={handleAddNewListing}
            onDeleteListing={handleDeleteListing}
            activeCompany={activeCompany}
            allCompanies={allCompanies}
            onSelectCompany={handleSelectCompany}
            onUpdateCompany={handleUpdateCompany}
            onCreateCompany={handleCreateCompany}
          />
        ) : (
          <>
            {safeTab === 'internships' && listingsStatus === 'loading' && (
              <div className="w-full space-y-4 py-10" role="status" aria-live="polite">
                <div className="h-40 rounded-3xl bg-gray-100 animate-pulse"/>
                <div className="h-28 rounded-2xl bg-gray-100 animate-pulse"/>
                <div className="h-28 rounded-2xl bg-gray-100 animate-pulse"/>
                <p className="text-center text-xs text-gray-500">
                  İlanlar yükleniyor…
                </p>
              </div>
            )}

            {safeTab === 'internships' && listingsStatus === 'error' && (
              <div className="w-full my-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
                <p className="font-bold text-red-800">
                  İlanlar yüklenemedi
                </p>
                <p className="text-xs text-red-700 max-w-lg mx-auto">
                  {listingsError}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Tekrar dene
                </button>
              </div>
            )}

            {safeTab === 'internships' && listingsStatus === 'ready' && (
              <MatchedInternshipsView
                student={isLoggedIn ? activeStudent : null}
                allListings={allListings}
                applications={applications}
                subTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
                onViewDetails={(listing) => navigate(`/ilan/${listingSlug(listing)}`)}
                onQuickApply={(listing, match) =>
                  handleApplyToJob(listing, match.overallScore)
                }
                onGoToProfile={() => setActiveTab('profile')}
              />
            )}

            {safeTab === 'badges' && activeStudent && (
              <SkillQuizzesView
                quizzes={quizzes}
                student={activeStudent}
                subTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
                onStartQuiz={(quiz) => setActiveQuiz(quiz)}
              />
            )}

            {safeTab === 'applications' && activeStudent && (
              <ApplicationsTrackerView
                applications={applications}
                allListings={allListings}
                subTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
                onExploreInternships={() => handleTabChange('internships')}
              />
            )}

            {safeTab === 'profile' && activeStudent && (
              <StudentProfileView
                student={activeStudent}
                subTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
                onUpdateProfile={handleUpdateProfile}
                onOpenQuiz={(skillName) => {
                  const matchedQ =
                    quizzes.find(
                      (q) => q.skillName.toLowerCase() === skillName.toLowerCase()
                    );
                  /*
                    Eskiden eşleşme yoksa quizzes[0]'a düşüyordu: Rusça
                    doğrulamak isteyen kullanıcıya React sorusu geliyordu.
                    Olmayan sınavı uydurmak yerine durumu söylüyoruz.
                  */
                  if (!matchedQ) {
                    showToast(`${skillName} için henüz doğrulama sınavı yok.`);
                    return;
                  }
                  setActiveQuiz(matchedQ);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {selectedListingDetail && (
        <InternshipDetailModal
          listing={selectedListingDetail.listing}
          match={selectedListingDetail.match}
          student={activeStudent}
          hasApplied={applications.some(
            (a) => a.listingId === selectedListingDetail.listing.id
          )}
          onClose={() => setSelectedListingDetail(null)}
          onApply={() => {
            handleApplyToJob(
              selectedListingDetail.listing,
              selectedListingDetail.match.overallScore
            );
            setSelectedListingDetail(null);
          }}
        />
      )}

      {applyTarget && (
        <ApplyDialog
          listing={applyTarget.listing}
          alreadyApplied={applications.some((a) => a.listingId === applyTarget.listing.id)}
          onClose={() => setApplyTarget(null)}
          onSubmit={submitApplication}
        />
      )}

      {activeQuiz && activeStudent && (
        <SkillAssessmentModal
          quiz={activeQuiz}
          student={activeStudent}
          onClose={() => setActiveQuiz(null)}
          onEarnBadge={handleEarnBadge}
        />
      )}

      {/* Authentication Modal (Giriş Yap / Kayıt Ol) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        allCompanies={allCompanies}
        activeCompanyId={activeCompanyId}
        onSelectCompany={handleSelectCompany}
        onCreateCompany={handleCreateCompany}
        onSuccess={handleAuthSuccess}
      />

      {/*
        Alt bilgi.

        Önceki hali sekiz bağlantıyı tek satırda, BÜYÜK HARF ve geniş harf
        aralığıyla yan yana diziyordu. Telefonda satır ekrana sığmıyor, kök
        taşma koruması yüzünden de kaydırılamıyordu: kenardaki bağlantılar
        kırpılıp tıklanamaz hale geliyordu — ekran görüntüsünde "LETİŞİM" ve
        "ÇE" diye yarım görünen kısım buydu. KVKK aydınlatma metnine mobilden
        ulaşılamıyor olması yalnızca çirkin değil, yasal olarak da sorun.

        Artık bağlantılar sarabiliyor ve iki gruba ayrıldı: sitenin sayfaları
        ve yasal metinler. Büyük harf ve geniş aralık kalktı; ikisi de satırı
        gereksiz uzatıp okumayı zorlaştırıyordu.
      */}
      <footer className="border-t border-gray-200 bg-white mt-auto py-8 text-xs text-gray-500 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <nav className="flex flex-col sm:flex-row sm:justify-center gap-3 sm:gap-8">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {[
                { yol: '/hakkimizda', etiket: 'Hakkımızda' },
                { yol: '/iletisim', etiket: 'İletişim' },
                { yol: '/ilan-kurallari', etiket: 'İlan kuralları' },
                { yol: '/ilan-bildir', etiket: 'İlan bildir' },
              ].map((bag) => (
                <a
                  key={bag.yol}
                  href={bag.yol}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(bag.yol);
                  }}
                  className="font-semibold text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {bag.etiket}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {[
                { yol: '/kvkk-aydinlatma-metni', etiket: 'KVKK aydınlatma metni' },
                { yol: '/gizlilik', etiket: 'Gizlilik' },
                { yol: '/cerez-politikasi', etiket: 'Çerezler' },
                { yol: '/kullanim-kosullari', etiket: 'Kullanım koşulları' },
              ].map((bag) => (
                <a
                  key={bag.yol}
                  href={bag.yol}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(bag.yol);
                  }}
                  className="font-semibold text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {bag.etiket}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-4 border-t border-gray-100">
            <Logo
              size="sm"
              showTagline={false}
              onClick={() => {
                setUserRole('student');
                setActiveTab('internships');
              }}
            />
            {/*
              "Yetenek Odaklı İş & Stajyer Eşleştirme Platformu" satırı
              kaldırıldı: anasayfanın tepesinden aynı gerekçeyle çıkardığımız
              cümlenin ikizi.
            */}
            <span className="text-[11px] text-gray-400">
              &copy; 2026 StajımVar
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
