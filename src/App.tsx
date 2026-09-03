import React, { useState, useRef } from 'react';
import {
  fetchPublishedListings,
  fetchStudentProfile,
  fetchStudentApplications,
  createApplication,
  withdrawApplication,
  respondToOffer,
  respondToInterview,
  fetchApplicationContact,
  saveStudentProfile,
  fetchIsAdmin,
  fetchQuizzes,
} from './lib/queries';
import { adrestekiOAuthHatasi, getCurrentUser, oauthProfiliTamamla, onAuthChange, signOut, KVKK_VERSION, type AuthResult } from './lib/auth';
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
import { InternshipDetailModal } from './components/InternshipDetailModal';
import { Logo } from './components/Logo';
import { LegalPage, LEGAL_ROUTES } from './components/LegalPage';
import { ApplyDialog } from './components/ApplyDialog';
import { niyetYaz, niyetOku, niyetSil } from './lib/basvuru-niyeti.mjs';
import { CerezBandi } from './components/CerezBandi';
import { adsenseBetiginiBaslat } from './components/GoogleAdBanner';
import { rizaOku, reklamSerbest } from './lib/cerez-rizasi.mjs';
import { ListingPage } from './components/ListingPage';
import { GuideHub, GuidePage } from './components/GuidePages';
import { BasvuruSablonu } from './components/BasvuruSablonu';
import { SifreYenile } from './components/SifreYenile';
import { ProfilTamamla } from './components/ProfilTamamla';
import { BolumHub, BolumPage } from './components/BolumPages';
import { StajProgramlariSayfasi } from './components/StajProgramlari';
import { IsverenGirisi } from './components/IsverenGirisi';
import { SirketPaneli } from './sirket/SirketPaneli';
import { BildirimMerkezi } from './components/BildirimMerkezi';
import { useBildirimler } from './lib/useBildirimler';
import { DunyaGecisi } from './sirket/DunyaGecisi';
import { SIRKET_VURGU_KOYU } from './sirket/renk';

/*
  Panel yollari. Herkese acik sirket sayfasi (/sirket/<slug>) ile
  karismamalari icin acikca sayiliyorlar.
*/
const SIRKET_PANEL_YOLLARI = ['/sirket/ilanlar', '/sirket/basvuranlar', '/sirket/profil', '/sirket/ilan'];
import { KariyerMerkezleriSayfasi } from './components/KariyerMerkezleri';
import { OpportunitiesPage } from './components/OpportunitiesPage';
import { BurslarKesfetPage } from './components/BurslarKesfetPage';
import { IsverenLanding } from './components/IsverenLanding';
import { OpportunityDetailPage } from './components/OpportunityDetailPage';
import { OpportunitiesHomeSection } from './components/OpportunitiesHomeSection';
import { basvuruSonucMesaji } from './lib/basvuru-yolu.mjs';
import { basvuruKopyasi } from './lib/basvuru-kopyasi.mjs';
import { aramaTeriminiOku, aramaAdresi } from './lib/arama-url.mjs';
import { AdminOpportunitiesView, AdminOpportunityCreate } from './components/AdminOpportunitiesView';
import { BursDogrulamaMasasi } from './components/BursDogrulamaMasasi';
import { AdminInstagramView } from './components/AdminInstagramView';
import { KesfetPage } from './components/KesfetPage';
import { KesfetDetailPage } from './components/KesfetDetailPage';
import { AdminDiscoverForm, AdminDiscoverView } from './components/AdminDiscoverView';
/*
  Bu ikisi bilerek gecikmeli DEĞİL: /araclar, /araclar/* ve /isveren
  ön render edilen adresler. React kabı temizlediği için gecikmeli
  yüklemede parça inene kadar ekran boş kalıyor — yani ön render'ın
  kazandırdığı şeyi geri vermiş oluyoruz.
*/
import { EmployerGuide } from './components/EmployerGuide';
import {
  AracHub,
  NetHesaplama,
  SiralamaTahmini,
  StajUcretiHesaplama,
  StajGunuHesaplama,
} from './components/Araclar';
import { listingSlug, idPrefixFromSlug } from './lib/slug';
import confetti from 'canvas-confetti';
import { CheckCircle2 } from 'lucide-react';
import { SAYFA_GENISLIGI } from './lib/duzen';

/*
  GECİKMELİ YÜKLEME

  Ölçüldü: uygulama kodu tek bir dosyada 770 KB (sıkıştırılmış 211 KB) ve
  ilk açılışta tamamı iniyordu. Oysa bu ekranların çoğu ilk boyamada hiç
  gerekmiyor: şirket portalı, yönetim ekranları, profil, hesaplama araçları,
  giriş penceresi.

  Ön render sayesinde metin zaten JavaScript'ten önce görünüyor. Buradaki
  kazanç sayfanın ETKİLEŞİMLİ olma süresinde — mobil bağlantıda hissedilen
  fark bu.

  Ana sayfanın ilan listesi (MatchedInternshipsView), üst çubuk, rehber ve
  bölüm sayfaları bilerek gecikmeli DEĞİL: onlar zaten ilk ekranda.
*/
const StudentProfileView = React.lazy(() =>
  import('./components/StudentProfileView').then((m) => ({ default: m.StudentProfileView }))
);
const CompanyPortalView = React.lazy(() =>
  import('./components/CompanyPortalView').then((m) => ({ default: m.CompanyPortalView }))
);
const SkillQuizzesView = React.lazy(() =>
  import('./components/SkillQuizzesView').then((m) => ({ default: m.SkillQuizzesView }))
);
const ApplicationsTrackerView = React.lazy(() =>
  import('./components/ApplicationsTrackerView').then((m) => ({
    default: m.ApplicationsTrackerView,
  }))
);
const SkillAssessmentModal = React.lazy(() =>
  import('./components/SkillAssessmentModal').then((m) => ({ default: m.SkillAssessmentModal }))
);
const AuthModal = React.lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const CvPage = React.lazy(() =>
  import('./components/CvPage').then((m) => ({ default: m.CvPage }))
);
const CompanyPage = React.lazy(() =>
  import('./components/CompanyPage').then((m) => ({ default: m.CompanyPage }))
);
const AdminClaimsView = React.lazy(() =>
  import('./components/AdminClaimsView').then((m) => ({ default: m.AdminClaimsView }))
);
const AdminListingsQueue = React.lazy(() =>
  import('./components/AdminListingsQueue').then((m) => ({ default: m.AdminListingsQueue }))
);
const AdminDashboard = React.lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

const AdminRouteGate: React.FC<{ authenticated: boolean; isAdmin: boolean; onLogin: () => void; children: React.ReactNode }> = ({ authenticated, isAdmin, onLogin, children }) => {
  React.useEffect(() => { if (!authenticated) onLogin(); }, [authenticated, onLogin]);
  if (!authenticated) return <main className="min-h-screen grid place-items-center p-6"><p className="rounded-2xl border bg-white p-6 text-center">Yönetim paneli için giriş yapmanız gerekiyor.</p></main>;
  if (!isAdmin) return <main className="min-h-screen grid place-items-center p-6"><p className="rounded-2xl border bg-white p-6 text-center">403 — Bu alan yalnızca yöneticilere açıktır.</p></main>;
  return <>{children}</>;
};

/**
 * Adres bulunamadı sayfası.
 *
 * İki iş yapıyor: kullanıcıya çıkış yolu gösteriyor ve tarayıcıya bu adresi
 * dizine almamasını söylüyor. `noindex` etiketi bileşen ekrandayken ekleniyor,
 * ayrılırken kaldırılıyor — kalıcı bırakılsaydı uygulama içinde bu sayfadan
 * geçen bir kullanıcı sonraki gerçek sayfayı da dizin dışı bırakırdı.
 */
const BulunamadiSayfasi: React.FC<{
  yol: string;
  ustCubuk: React.ReactNode;
  onNavigate: (p: string) => void;
}> = ({ yol, ustCubuk, onNavigate }) => {
  React.useEffect(() => {
    const eskiBaslik = document.title;
    document.title = 'Sayfa bulunamadı | StajımVar';

    const etiket = document.createElement('meta');
    etiket.name = 'robots';
    etiket.content = 'noindex, follow';
    document.head.appendChild(etiket);

    return () => {
      document.title = eskiBaslik;
      etiket.remove();
    };
  }, []);

  const yollar: [string, string][] = [
    ['/', 'Staj ilanları'],
    ['/rehber', 'Staj rehberi'],
    ['/bolumler', 'Bölüme göre staj'],
    ['/staj-programlari', 'Büyük işverenlerde staj'],
    ['/universite-kariyer-merkezleri', 'Üniversite kariyer merkezleri'],
    ['/isveren/ilan-ver', 'Şirketini sahiplen, ilan gir'],
    ['/araclar', 'Hesaplama araçları'],
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      {ustCubuk}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-16 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-16 space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Bu sayfa bulunamadı
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Aradığın adres yok ya da taşınmış olabilir. Adres:{' '}
            <span className="font-mono text-sm text-gray-500 break-all">{yol}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {yollar.map(([y, etiket]) => (
            <a
              key={y}
              href={y}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(y);
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 cursor-pointer"
            >
              {etiket}
            </a>
          ))}
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          Kırık bir bağlantı bulduysan{' '}
          <a
            href="/iletisim"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/iletisim');
            }}
            className="text-blue-600 hover:underline font-semibold"
          >
            iletişim sayfasından
          </a>{' '}
          bize yazabilirsin.
        </p>
      </main>
    </div>
  );
};

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

  /*
    ESKİ ADRES: /ilanlar

    İlan listesi ana sayfada; /ilanlar diye bir sayfa hiç olmadı. Sunucu
    tarafında kalıcı yönlendirme public/_redirects'te duruyor. Burası
    uygulama içinden (geri tuşu, eski bağlantı) o yola düşen durumu
    karşılıyor: 404 yerine ana sayfa, adres de düzeltilmiş oluyor.
  */
  React.useEffect(() => {
    if (path.replace(/\/+$/, '') === '/ilanlar') {
      window.history.replaceState({}, '', `/${window.location.search}`);
      setPath('/');
    }
  }, [path]);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    /*
      Adres çubuğuna tamamı yazılıyor ama rota durumuna YALNIZCA yol
      konuyor. Sorgu dizesi de duruma girseydi "/firsatlar?q=yazılım"
      hiçbir rotayla eşleşmez ve sayfa bulunamadı ekranına düşerdi;
      sayfalar sorguyu zaten window.location.search üzerinden okuyor.
    */
    setPath(to.split('?')[0].split('#')[0] || '/');
    window.scrollTo(0, 0);
  };

  /**
   * İlan araması.
   *
   * Durum burada, çünkü kutu iki yerde çiziliyor: geniş ekranda üst çubukta
   * (Header), mobilde ilan listesinin başında. İkisi de aynı değeri yazıp
   * okuyor. Bölüm sayfalarındaki "ilanlara bak" düğmesi de buraya yazıyor.
   *
   * Terim adres çubuğunda `?q=` olarak tutuluyor: `stajimvar.com/?q=yazılım`
   * bağlantısını açan kişi aramanın uygulanmış hâlini görüyor, sayfa
   * yenilendiğinde terim kaybolmuyor ve arama paylaşılabiliyor. Yazarken
   * `replaceState` kullanılıyor — her harf için geçmişe kayıt düşmesi geri
   * tuşunu kullanılamaz hale getirirdi.
   */
  const [aramaTerimi, setAramaTerimi] = React.useState(() =>
    typeof window === 'undefined' ? '' : aramaTeriminiOku(window.location.search)
  );

  React.useEffect(() => {
    const yeniAdres = aramaAdresi(window.location.pathname, window.location.search, aramaTerimi);
    if (yeniAdres !== window.location.pathname + window.location.search) {
      window.history.replaceState({}, '', yeniAdres);
    }
  }, [aramaTerimi]);

  const goHome = () => navigate('/');

  /** Bolum sayfasindan ilan listesine gecis. */
  const bolumdenAra = (terim: string) => {
    setAramaTerimi(terim);
    navigate('/');
  };

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

  /*
    BİLDİRİMDEN GELEN BAŞVURU

    Bildirime tıklayan kullanıcıyı genel bir sayfaya atıp aratmıyoruz:
    ilgili başvurunun kimliği ekrana geçiyor ve o kartın paneli
    kendiliğinden açılıyor. Adres satırındaki sorgu parametresine
    güvenilmiyor — `/profil` yolu ana sayfaya çevriliyor ve sorgu
    orada kayboluyordu.
  */
  const [acilacakBasvuru, setAcilacakBasvuru] = useState<string | null>(null);
  const [acilacakAday, setAcilacakAday] = useState<string | null>(null);

  /*
    Bildirim durumu TEK yerde: aynı kullanıcı işveren paneline geçince
    aynı kayıtları görüyor, çünkü bildirim kullanıcıya ait, dünyaya
    değil. İki kabuk da bu durumu okuyor.
  */
  const bildirim = useBildirimler(session?.userId ?? null);

  /*
    BİLDİRİME TIKLAMA

    Hedef adres hangi DÜNYAYA gideceğini söylüyor; hangi kaydın
    açılacağını ise bildirimin taşıdığı başvuru kimliği. Kimliği
    adresten ayrıştırmak yerine kolondan okumak, adres biçimi
    değiştiğinde bağlantıyı kırmıyor.
  */
  const bildirimAc = React.useCallback(
    (b: { hedef: string | null; basvuruId: string | null; id: string; okunduMu: boolean }) => {
      void bildirim.okunduYap(b as never);
      bildirim.kapat();
      if (b.hedef?.startsWith('/sirket')) {
        setAcilacakAday(b.basvuruId);
        navigate('/sirket/basvuranlar');
      } else {
        setAcilacakBasvuru(b.basvuruId);
        setActiveTab('profile');
        navigate('/');
      }
    },
    [bildirim, navigate],
  );
  /*
    Testler veritabanindan geliyor. Eskiden uygulamayla birlikte gonderilen
    duragan bir dosyadan okunuyordu ve o dosyada DOGRU CEVAPLAR vardi --
    paketi acan herkes hepsini gorebiliyordu. Sorular artik cevapsiz
    gorunumden aliniyor, puanlama sunucuda yapiliyor.
  */
  const [quizzes, setQuizzes] = useState<SkillQuiz[]>([]);

  React.useEffect(() => {
    let iptal = false;
    fetchQuizzes()
      .then((v) => {
        if (!iptal) setQuizzes(v);
      })
      .catch(() => {
        // Testler yuklenemezse sekme bos kalir; site geri kalani calisir.
      });
    return () => {
      iptal = true;
    };
  }, []);

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
  /*
    Arayüz rolü yalnızca iki durum tanıyor: öğrenci görünümü ya da şirket
    portalı. Yönetici öğrenci görünümünü kullanıyor, fazladan menüsü
    `isAdmin` ile geliyor.
  */
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

  /*
    KAYIT BAĞLAMI

    İki şey taşınıyor:

      baglam  → pencerede hangi metinlerin görüneceği. Arkadaki hesap
                aynı; ölçüldü, şirket sayfasındaki "Giriş yap" düğmesi
                "Öğrenci Hesabınıza Giriş Yapın" başlığını açıyordu ve
                işveren orada akışın yanlış yerde olduğunu düşünüyordu.

      donusYolu → girişten sonra nereye dönüleceği. Insider One sayfasından
                gelen kişi giriş yapınca ana sayfaya atılıyordu ve
                sahiplenme talebini bir daha bulamıyordu.
  */
  const [authBaglam, setAuthBaglam] = useState<'ogrenci' | 'isveren'>('ogrenci');
  /* OAuth dönüşünde ad gelmediyse bir kez soruluyor; "Sonra" diyene tekrar sorulmuyor. */
  const [adSoruluyor, setAdSoruluyor] = useState(false);

  /*
    DUNYA GECISI

    Iki dunya tek hesapta yasiyor ve temalari taban tabana zit. Gecis
    aninda hicbir sey olmazsa kullanici bir an "yanlis siteye mi dustum"
    diye duraksiyor. Esik oturumda BIR KEZ calisiyor: her sayfa
    yenilemesinde tekrar eden bir animasyon ucuncu seferde engel olur.
  */
  const [dunyaGecisi, setDunyaGecisi] = useState<'sirkete' | 'ogrenciye' | null>(null);
  const dunyaEsigiGosterildi = useRef(false);

  /*
    SIRKET UYELIGI

    Isveren sayfasindaki ana dugmenin ne diyecegini bu belirliyor: uye
    olmayana "sirket hesabi olustur", uyeye "panele git". Yetki kapisi
    DEGIL -- asil kapi RLS'te; burasi yalnizca dogru dugmeyi cizmek icin.
  */
  const [sirketUyesi, setSirketUyesi] = useState(false);
  /*
    Hangi şirketin üyesi olduğu da gerekiyor: öğrenci görünümünde kendi
    şirketinin ilanına "Başvur" düğmesi çizilmemeli.
  */
  const [kendiSirketId, setKendiSirketId] = useState<string | null>(null);
  React.useEffect(() => {
    const kullanici = session?.userId;
    if (!kullanici) {
      setSirketUyesi(false);
      setKendiSirketId(null);
      return;
    }
    let iptal = false;
    import('./lib/sirket-veri')
      .then((m) => m.sirketBaglami(kullanici, false))
      .then((b) => {
        if (iptal) return;
        setSirketUyesi(Boolean(b.companyId));
        setKendiSirketId(b.companyId);
      })
      .catch(() => {
        /* Okunamazsa uye degil sayiliyor; kapi zaten arkada. */
      });
    return () => {
      iptal = true;
    };
  }, [session?.userId]);

  const sirketDunyasinaGec = () => {
    if (!dunyaEsigiGosterildi.current) {
      dunyaEsigiGosterildi.current = true;
      setDunyaGecisi('sirkete');
    }
    navigate('/sirket/ilanlar');
  };

  /*
    OAuth sağlayıcıdan hatayla dönüldüyse (iptal, izin reddi) adres
    çubuğunda geliyor. Okunmazsa kullanıcı hiçbir şey olmamış gibi giriş
    ekranına bakıyor ve neden giremediğini anlamıyor.
  */
  React.useEffect(() => {
    const hata = adrestekiOAuthHatasi();
    if (hata) showToast(hata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [authDonusYolu, setAuthDonusYolu] = useState<string | null>(null);

  /**
   * Giriş penceresini açar.
   *
   * BAŞVURUDAN GELİYORSA NİYET YAZILIYOR
   *
   * `authDonusYolu` React durumu ve e-posta girişinde yetiyor: modal aynı
   * sayfada açılıp kapanıyor. OAuth'ta yetmiyor — Google'a gidiş tam sayfa
   * yönlendirmesi, dönüşte uygulama sıfırdan kuruluyor ve durum silinmiş
   * oluyor. Misafir başvuru düğmesine basıp Google'dan dönünce ana sayfada
   * buluyordu kendini.
   *
   * Niyet sessionStorage'a yazılıyor; dönüşte okunup işlem sürdürülüyor.
   * `donusYolu` da veriliyor ki OAuth kullanıcıyı doğrudan ilanın sayfasına
   * getirsin — böylece dönüş anında zaten doğru sayfadayız.
   */
  const handleOpenLogin = (niyet?: {
    tur: 'dis' | 'ic';
    ilanId: string;
    yol: string;
    disAdres?: string;
    baslik?: string;
  }) => {
    setAuthBaglam('ogrenci');
    if (niyet && niyetYaz(window.sessionStorage, niyet)) {
      setAuthDonusYolu(niyet.yol);
      /* Kayıt modu: başvurmak isteyen misafirin çoğu henüz üye değil. */
      setAuthModalMode('register');
      setIsAuthModalOpen(true);
      return;
    }
    setAuthDonusYolu(null);
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthBaglam('ogrenci');
    setAuthDonusYolu(null);
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  /**
   * İşveren tarafından açılan giriş/kayıt.
   *
   * @param kip      'login' ya da 'register'
   * @param donusYolu giriş bitince dönülecek adres; verilmezse bulunulan sayfa
   */
  const isverenGirisiAc = (kip: 'login' | 'register' = 'login', donusYolu?: string) => {
    setAuthBaglam('isveren');
    setAuthDonusYolu(donusYolu ?? window.location.pathname);
    setAuthModalMode(kip);
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

  const handleAuthSuccess = (role: 'student' | 'company' | 'admin', name: string) => {
    // Oturumun kendisi onAuthChange üzerinden geliyor; burada yalnızca
    // arayüzü kullanıcının rolüne göre konumlandırıyoruz.
    // Yönetici de öğrenci görünümünü kullanıyor.
    /*
      `userRole` ARTIK HER ZAMAN 'student'

      Bu alan bir yetki değil, hangi kabuğun çizileceğini seçen bir görünüm
      anahtarıydı: 'company' olunca eski mavi Şirket Portalı ve ona ait üst
      çubuk çiziliyordu. İşveren dünyası artık /sirket altında kendi
      kabuğuyla duruyor ve erişimi company_members belirliyor — yani gerçek
      sinyal. İki kabuk aynı anda yaşayınca iki farklı sözlük ortaya
      çıkıyordu ("İncelemede" / "İnceleniyor").

      Oturum, profiles.role ve şirket üyeliği DEĞİŞMİYOR; yalnızca şirket
      hesabı giriş yapınca öğrenci kabuğu yerine işveren paneline gidiyor.
    */
    setUserRole('student');

    /*
      GELDİĞİ YERE GERİ DÖN

      Sahiplenme akışı buna bağlı: "Insider One'ı sahiplen" → giriş →
      formun başına dön. Dönüş yolu yoksa eski davranış sürüyor.
    */
    if (authDonusYolu) {
      const hedef = authDonusYolu;
      setAuthDonusYolu(null);
      setAuthBaglam('ogrenci');
      if (hedef !== window.location.pathname) navigate(hedef);
      showToast(`Hoş geldiniz, ${name}!`);
      return;
    }

    setActiveTab('internships');
    if (role !== 'company') {
      showToast(`Hoş geldiniz, ${name}!`);
    } else {
      /* Şirket hesabı doğrudan işveren paneline gidiyor; eski portal yok. */
      navigate('/sirket/ilanlar');
      showToast(`Hoş geldiniz, ${name}. İşveren paneli açık.`);
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

      /*
        OAUTH DÖNÜŞÜ

        Google/Microsoft ile gelen kullanıcının adı sağlayıcıdan geliyorsa
        profile yazılıyor; gelmiyorsa bir kez soruluyor. Bazı kurumsal
        kiracılar profil alanlarını paylaşıma kapatıyor ve o durumda kişi
        sitede kendi adı yerine boşluk görüyordu.

        Ad üretmiyoruz (e-postanın baş kısmı gibi): kişi profilinde kendi
        adını görmez ve düzeltebileceğini de bilmez.
      */
      if (user) {
        void oauthProfiliTamamla()
          .then(({ eksikAd }) => {
            if (eksikAd) setAdSoruluyor(true);
          })
          .catch(() => {
            /* tamamlama başarısızsa site çalışmaya devam etsin */
          });
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  /** Oturum değiştikçe gerçek profili ve başvuruları çeker. */
  React.useEffect(() => {
    /*
      Şirket hesabı dışındaki herkesin öğrenci profili yüklenir.

      Eskiden koşul `session.role !== 'student'` idi. Hesabı yönetici
      yapınca kendi profilim de yüklenmez oldu: avatar, profil menüsü ve
      ONUN İÇİNDEKİ ÇIKIŞ DÜĞMESİ kayboldu. Kullanıcı giriş yapmış halde
      kilitli kalıyordu.
    */
    if (!session || session.role === 'company') {
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

  /*
    REKLAM BETİĞİ RIZAYA BAĞLI

    Betik main.tsx'te koşulsuz yükleniyordu: ziyaretçi hiçbir şey seçmeden
    pagead2.googlesyndication.com isteği başlıyordu. Artık yalnızca kayıtlı
    rıza "reklam: true" ise yükleniyor. `rizaSayaci` band karar verince
    artıyor ve etki yeniden çalışıyor.
  */
  const [rizaSayaci, setRizaSayaci] = useState(0);
  const [tercihlerAcik, setTercihlerAcik] = useState(false);

  React.useEffect(() => {
    if (reklamSerbest(rizaOku(window.localStorage))) adsenseBetiginiBaslat();
  }, [rizaSayaci]);

  const activeStudent = student;

  /*
    NİYETİ SÜRDÜR — GİRİŞTEN SONRA BAŞVURUYA DEVAM

    Kullanıcı başvuru düğmesinden giriş yaptıysa sessionStorage'da bir niyet
    duruyor. Oturum kurulunca burada okunup işlem tamamlanıyor: kullanıcı
    ilanı yeniden aramak ya da düğmeye ikinci kez basmak zorunda kalmıyor.

    `sessionReady` bekleniyor: oturum daha okunmadan niyeti çalıştırmak,
    girişi başarısız olmuş kullanıcıyı da dış siteye gönderirdi.

    Yol kontrolü: niyet yalnızca kendi ilanının sayfasındayken çalışıyor.
    OAuth `redirectTo` zaten oraya getiriyor; başka bir sayfadaysak kullanıcı
    arada gezinmiş demektir ve onu habersiz yönlendirmek sürpriz olur.
  */
  React.useEffect(() => {
    if (!sessionReady || !session) return;
    const niyet = niyetOku(window.sessionStorage);
    if (!niyet) return;
    if (niyet.yol !== window.location.pathname) return;

    niyetSil(window.sessionStorage);

    if (niyet.tur === 'dis' && niyet.disAdres) {
      /*
        Yeni sekmede açılıyor: kullanıcıyı siteden atmadan başvuruya
        götürüyor. Açılır pencere engelleyicisi `null` döndürürse zorlamıyoruz
        — düğme artık girişli kullanıcı için çalışan bir bağlantı, tek
        dokunuş kaldı. Sessizce hiçbir şey yapmamaktansa bunu söylüyoruz.
      */
      const pencere = window.open(niyet.disAdres, '_blank', 'noopener,noreferrer');
      showToast(
        pencere
          ? 'Giriş tamam. Resmî başvuru sayfası yeni sekmede açıldı.'
          : 'Giriş tamam. Başvuru sayfasını açmak için düğmeye dokun.',
      );
      return;
    }

    /*
      Platform içi ilan: başvuru formu burada açılıyor, dışarı çıkılmıyor.
      İlan listede yoksa (henüz yüklenmediyse) sessizce geçiliyor; kullanıcı
      zaten ilanın sayfasında ve düğme çalışır durumda.
    */
    const ilan = allListings.find((l) => l.id === niyet.ilanId);
    if (ilan) {
      setApplyTarget({ listing: ilan, matchScore: 0 });
      showToast('Giriş tamam. Başvurunu tamamlayabilirsin.');
    }
  }, [sessionReady, session, allListings]);


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

    /*
      CV KOPYASI BAŞVURUDAN ÖNCE ÇIKARILIYOR

      Profildeki dosyanın yolunu kopyalamak yetmez: öğrenci CV'sini
      değiştirdiğinde şirketin gördüğü belge de sessizce değişirdi.
      Burada dosyanın AYRI bir kopyası çıkarılıyor ve başvuru o kopyaya
      bağlanıyor (lib/cv.ts).

      Kopya çıkarılamazsa başvuru YİNE DE gönderiliyor: CV zorunlu değil
      ve öğrenciyi bir dosya hatası yüzünden ilandan mahrum bırakmak
      orantısız olurdu. Ama sessizce yutulmuyor — sonda bilgi veriliyor.
    */
    let cvSnapshotPath: string | null = null;
    let cvEklenemedi = false;
    if (activeStudent.cvPath) {
      try {
        const { cvBasvuruKopyasiCikar } = await import('./lib/cv');
        cvSnapshotPath = await cvBasvuruKopyasiCikar(activeStudent.id, activeStudent.cvPath);
      } catch {
        cvEklenemedi = true;
      }
    }

    const created = await createApplication({
      cvSnapshotPath,
      listingId: applyTarget.listing.id,
      studentId: activeStudent.id,
      matchScore: applyTarget.matchScore,
      applicationMethod: applyTarget.listing.applicationMethod,
      applicationChannelId: applyTarget.listing.applicationChannelId,
      contactShareConsent: consent,
      consentVersion: KVKK_VERSION,
      /*
        Şirket öğrencinin `profiles` satırını okuyamıyor; başvuran
        kartındaki ad, okul ve bölüm yalnızca bu kopyadan geliyor. Kopya
        rıza verilmediyse queries katmanında yazılmıyor.
      */
      profileSnapshot: basvuruKopyasi(activeStudent),
    });

    setApplications((prev) => [created, ...prev]);
    setApplyTarget(null);

    confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });

    /*
      Mesaj, gerçekte ne olduğunu söylüyor. Önce dış ilanlarda "şirkete
      ulaşıp başvuru kanalını doğrulamalarını isteyeceğiz" deniyordu —
      böyle çalışan bir süreç yok. Kaydın şirkete gitmediğini söylemek,
      öğrencinin resmî sayfadan başvurmasını sağlayan tek şey.
    */
    showToast(
      cvEklenemedi
        ? 'Başvurun kaydedildi ama CV eklenemedi. Profilinden CV dosyanı kontrol edip tekrar deneyebilirsin.'
        : basvuruSonucMesaji(applyTarget.listing, applyTarget.listing.companyName)
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
  /*
    "Başvurularım" sekmesi profile taşındı. Eski bağlantılar ve kayıtlı durum
    kırılmasın diye 'applications' burada 'profile'a çevriliyor.
  */
  const istenenTab = activeTab === 'applications' ? 'profile' : activeTab;
  const safeTab = !isLoggedIn && istenenTab !== 'internships' ? 'internships' : istenenTab;

  const temizYol = path.replace(/\/+$/, '') || '/';

  /*
    ESKİ ŞİRKET PORTALI ARTIK ÇİZİLMİYOR

    İşveren tarafının iki ayrı yüzü vardı: eski mavi "Şirket Portalı"
    (CompanyPortalView, `company-portal` sekmesi) ve yeni yeşil-beyaz panel
    (/sirket). İkisi aynı işi farklı sözlükle anlatıyordu — eskisinde
    "İncelemede" ve "Ön İncele", yenisinde "İnceleniyor". `profiles.role`
    değeri 'company' olan hesap giriş yapınca eskisine düşüyordu.

    Ölçüldü (üretim, 31 Ağustos 2026): role='company' olan tek bir profil
    var ve o profilin company_members kaydı da var — yani yeni panele
    girebiliyor. Bu yüzden eski portala giden yol yeni panele
    yönlendiriliyor. Bileşen silinmedi; yalnızca kullanıcıya çizilmiyor.
  */
  React.useEffect(() => {
    if (safeTab !== 'company-portal') return;
    setActiveTab('internships');
    if (!temizYol.startsWith('/sirket')) navigate('/sirket/ilanlar');
  }, [safeTab, temizYol]);

  /*
    BİLDİRİM PANELİ ÜST ÇUBUĞUN YANINDA

    P0: zile basılıyor, durum `acik` oluyor, ama PANEL HİÇBİR YERDE
    ÇİZİLMİYORDU. Merkez yalnızca işveren panelinin döndüğü dalda
    bağlanmıştı; öğrenci tarafındaki bütün dallar zili gösteriyor ama
    paneli mount etmiyordu. Yani tetikleyici sağlamdı — ölçüldü: gerçek
    `<button type="button">`, 44×44, `pointer-events: auto`, merkez
    koordinatındaki elementFromPoint düğmenin içinde ve tıklama
    durumu değiştiriyor — kaybolan şey render'dı.

    Panel `ustCubuk` ile aynı ifadeye bağlanıyor: zili çizen her dal
    paneli de çiziyor, ikisi ayrı düşemiyor. Merkez zaten `createPortal`
    ile `document.body` altına gidiyor, dolayısıyla başlık ağacının
    içinde durması yerleşimi etkilemiyor.
  */
  const ogrenciBildirimleri = bildirim.acik ? (
    <BildirimMerkezi
      bildirimler={bildirim.bildirimler}
      okunmamis={bildirim.okunmamis}
      yukleniyor={bildirim.yukleniyor}
      renk="#2563EB"
      onKapat={bildirim.kapat}
      onAc={bildirimAc}
      onTumunuOkundu={() => void bildirim.tumunuOkunduYap()}
    />
  ) : null;

  /*
    CANONICAL HER YOL DEĞİŞİMİNDE GÜNCELLENİYOR

    Sayfalar sunucuda ön render ediliyor ve doğrudan açıldıklarında doğru
    canonical ile geliyor. Ama uygulama içinde gezinildiğinde belge aynı
    kalıyor: ana sayfadan bir ilana tıklandığında yalnızca başlık
    değişiyordu, canonical ve og:url ANA SAYFAYI göstermeye devam ediyordu.
    Ölçüldü ve doğrulandı.

    Burada merkezî yapılıyor çünkü başlık yirmi altı ayrı yerde ayarlanıyor;
    her birine ayrı ayrı canonical eklemek, eklenmeyen bir tanesinin sessizce
    yanlış kalması demekti. Zengin veri taşıyan sayfalar (ilan, şirket)
    ayrıca kendi og:title ve açıklamasını yazıyor.
  */
  React.useEffect(() => {
    const adres = `https://stajimvar.com${temizYol === '/' ? '/' : temizYol}`;

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = adres;

    let ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = adres;
  }, [temizYol]);

  /**
   * ÜST ÇUBUK HER SAYFADA SABİT
   *
   * Önce yalnızca ana sekmelerde vardı: rehber, bölüm, araç, işveren ve
   * yasal sayfalar kendi sade başlığını (geri oku + logo) çiziyordu.
   * Kullanıcı rehbere girdiğinde arama kutusu, sekmeler ve profili
   * kayboluyordu; siteden çıkmış gibi oluyordu ve geri dönmenin tek yolu
   * geri okuydu.
   *
   * Artık aynı çubuk her yerde. Alt sayfalar `SayfaKabugu` ile çiziliyor ve
   * o bileşen kendi başlığını artık çizmiyor — iki başlık üst üste binmesin.
   */
  const ustCubuk = (
    <>
    <Header
      activeTab={safeTab}
      setActiveTab={(sekme) => {
        // Alt sayfadayken sekmeye basılırsa önce ana sayfaya dönülüyor.
        if (temizYol !== '/') navigate('/');
        handleTabChange(sekme);
      }}
      activeSubTab={activeSubTab}
      setActiveSubTab={setActiveSubTab}
      userRole={userRole}
      setUserRole={setUserRole}
      activeStudent={activeStudent}
      activeCompany={activeCompany}
      allCompanies={allCompanies}
      onSelectCompany={handleSelectCompany}
      applicationsCount={applications.length}
      onOpenGuides={() => navigate('/rehber')}
      onOpenOpportunities={() => navigate('/firsatlar')}
      onOpenDiscover={() => navigate('/kesfet')}
      /*
        "Ücretsiz İlan Ver" ilan verme sayfasına götürüyor. Zaten oradaysa
        götürecek yer yok: kayıt penceresini açıyor, yoksa düğme hiçbir şey
        yapmıyormuş gibi görünüyordu.
      */
      /*
        ISVEREN KAPISI TEK YERE BAKIYOR

        Once dogrudan /isveren/ilan-ver'e (sahiplenme formuna) gidiyordu:
        sirketi henuz tanimayan bir IK calisani, ne oldugunu anlamadan bir
        arama kutusuyla karsilasiyordu. Artik once /isveren landing'i
        aciliyor; sahiplenme oradan bir adim sonra.
      */
      onOpenEmployer={() =>
        temizYol === '/isveren/ilan-ver'
          ? isverenGirisiAc('register', '/isveren/ilan-ver')
          : navigate('/isveren')
      }
      onOpenEmployerLogin={AUTH_ENABLED ? (kip) => isverenGirisiAc(kip) : undefined}
      /*
        Şirket yetkisi olmayan kişiye panel değil KAPI gösteriliyor.
        Yetkiyi burada değil veritabanı biliyor; panel açılırken bağlam
        okunuyor ve üyelik yoksa kullanıcı zaten ilan verme sayfasına
        düşüyor. Buradaki yönlendirme yalnızca yolu kısaltıyor.
      */
      onDunyaDegistir={sirketDunyasinaGec}
      okunmamisBildirim={bildirim.okunmamis}
      onBildirimAc={() => void bildirim.ac()}
      sirketUyesiMi={sirketUyesi}
      bulunulanYol={temizYol}
      searchQuery={aramaTerimi}
      onSearchChange={(q) => {
        setAramaTerimi(q);
        /*
          Rehber sayfası aramayı KENDİ yapıyor: terim oraya iniyor ve
          rehberleri süzüyor. Buradan ilan listesine götürmek, rehberde bir
          şey arayan kişiyi rehberden atmak olurdu — sayfanın kendi arama
          kutusunu kaldırdığımız için tek arama yolu bu.
        */
        if (/^\/(rehber|kesfet)(\/|$)/.test(temizYol)) return;
        // Arama ilan listesinde işliyor; başka sayfadayken oraya götürüyor.
        if (q && temizYol !== '/') navigate('/');
      }}
      isAdmin={isAdmin}
      onOpenAdmin={() => navigate('/yonetim')}
      isLoggedIn={isLoggedIn}
      onOpenLogin={AUTH_ENABLED ? handleOpenLogin : undefined}
      onOpenRegister={AUTH_ENABLED ? handleOpenRegister : undefined}
      onLogout={handleLogout}
    />
    {ogrenciBildirimleri}
    </>
  );

  /** İçerik sayfalarını üst çubukla birlikte çizer. */
  /*
    GİRİŞ MODALI İÇERİK SAYFALARINDA DA ÇİZİLMELİ

    Modal yalnızca ana uygulama ağacında duruyordu; içerik sayfaları (fırsat
    detayı, şirket sayfası, hukuki metinler) o ağaca hiç ulaşmadan erken
    `return` ediyor. Sonuç: bu sayfalardaki "Giriş yap" ve "Kaydet"
    düğmeleri durumu değiştiriyor ama ekranda hiçbir şey açılmıyordu —
    ölçüldü, iki sayfada da tıklama sessizce kayboluyordu.
  */
  const girisModali = (
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      initialMode={authModalMode}
      allCompanies={allCompanies}
      activeCompanyId={activeCompanyId}
      onSelectCompany={handleSelectCompany}
      onCreateCompany={handleCreateCompany}
      onSuccess={handleAuthSuccess}
      baglam={authBaglam}
      oauthDonusYolu={authDonusYolu ?? undefined}
    />
  );

  /* Eksik ad penceresi: oturum açık her sayfada çizilebilmeli. */
  const adPenceresi = adSoruluyor ? (
    <ProfilTamamla
      isveren={authBaglam === 'isveren'}
      onKapat={() => setAdSoruluyor(false)}
      onKaydedildi={(ad) => {
        setAdSoruluyor(false);
        setSession((o) => (o ? { ...o, displayName: ad } : o));
        showToast(`Hoş geldin, ${ad}!`);
      }}
    />
  ) : null;

  /*
    ÇEREZ BANDI HER İKİ KABUKTA DA

    Band önce yalnızca ana kabuğun return'ünde duruyordu. İçerik sayfaları
    (`icerikSayfasi`) oraya HİÇ ULAŞMIYOR — erken dönüyorlar. Ölçüldü:
    /rehber/... sayfasında band çıkmıyordu, yani reklamın gösterildiği
    sayfalarda rıza hiç sorulmuyordu.
  */
  const cerezBandi = (
    <CerezBandi
      acikBasla={tercihlerAcik}
      onKapat={() => setTercihlerAcik(false)}
      onKarar={() => setRizaSayaci((n) => n + 1)}
    />
  );

  const icerikSayfasi = (icerik: React.ReactNode) => (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      {ustCubuk}
      {icerik}
      {girisModali}
      {adPenceresi}
      {cerezBandi}
    </div>
  );

  const legalSlug = LEGAL_ROUTES[temizYol];
  if (legalSlug) {
    return icerikSayfasi(<LegalPage slug={legalSlug} onBack={goHome} />);
  }

  /*
    BURSLAR AYRI BİR SAYFA

    /burslar artık üç sütunlu fırsat listesi değil, Keşfet ile aynı
    tasarım ailesinde bir vitrin. Diğer fırsat adresleri (KYK, yurt dışı,
    yarışmalar, takvim, takip listesi) mevcut sayfada kalıyor: onların
    akışı ve SEO yapısı değişmedi.
  */
  if (temizYol === '/burslar') {
    return icerikSayfasi(
      <BurslarKesfetPage
        userId={session?.userId ?? null}
        student={student}
        onNavigate={navigate}
        onRequireLogin={handleOpenLogin}
      />
    );
  }

  const firsatSayfalari = new Set(['/firsatlar', '/kyk', '/yurtdisi-firsatlari', '/yarismalar', '/firsat-takvimi', '/bana-uygun', '/kaydedilen-firsatlar']);
  if (firsatSayfalari.has(temizYol)) {
    return icerikSayfasi(
      <OpportunitiesPage
        path={temizYol}
        userId={session?.userId ?? null}
        student={student}
        onNavigate={(to) => {
          if (to === '/profil') { setActiveTab('profile'); navigate('/'); return; }
          navigate(to);
        }}
        onRequireLogin={handleOpenLogin}
      />
    );
  }
  if (temizYol.startsWith('/firsatlar/')) {
    const slug = temizYol.slice('/firsatlar/'.length);
    if (slug) return icerikSayfasi(<OpportunityDetailPage slug={slug} userId={session?.userId ?? null} onBack={() => navigate('/firsatlar')} onRequireLogin={handleOpenLogin} />);
  }

  if (temizYol === '/kesfet') {
    return icerikSayfasi(
      <KesfetPage
        onNavigate={navigate}
        searchQuery={aramaTerimi}
        onSearchChange={setAramaTerimi}
      />
    );
  }
  if (temizYol.startsWith('/kesfet/')) {
    const slug = temizYol.slice('/kesfet/'.length);
    if (slug)
      return icerikSayfasi(
        <KesfetDetailPage
          slug={slug}
          onBack={() => navigate('/kesfet')}
          girisGerekli={!session}
          onGirisGerekli={AUTH_ENABLED ? handleOpenLogin : undefined}
        />,
      );
  }

  /* Yönetim → Instagram bağlantı durumu. Uç yönetici jetonu istiyor. */
  if (temizYol === '/yonetim/instagram') {
    return <AdminRouteGate authenticated={Boolean(session)} isAdmin={isAdmin} onLogin={handleOpenLogin}>
      <AdminInstagramView onNavigate={navigate} />
    </AdminRouteGate>;
  }

  /*
    Burs dogrulama masasi: 68 kaydin uygunluk kisitlarini kaynak okuyarak
    isaretlemek icin tek ekran. Yetki kapisi sunucuda -- bu ekrani gormek
    yetki vermiyor, karari security definer RPC yaziyor.
  */
  if (temizYol === '/yonetim/firsatlar/dogrulama') {
    return (
      <AdminRouteGate authenticated={isLoggedIn} isAdmin={isAdmin} onLogin={handleOpenLogin}>
        <div className="min-h-screen bg-[#F9FAFB]">
          <BursDogrulamaMasasi onNavigate={navigate} />
        </div>
      </AdminRouteGate>
    );
  }

  if (temizYol === '/yonetim/firsatlar' || temizYol === '/yonetim/firsatlar/yeni' || /^\/yonetim\/firsatlar\/[^/]+\/duzenle$/.test(temizYol)) {
    const editId = /^\/yonetim\/firsatlar\/([^/]+)\/duzenle$/.exec(temizYol)?.[1];
    return <AdminRouteGate authenticated={Boolean(session)} isAdmin={isAdmin} onLogin={handleOpenLogin}>
      {temizYol.endsWith('/yeni') || editId ? <AdminOpportunityCreate onDone={navigate} editId={editId} /> : <AdminOpportunitiesView onNavigate={navigate} />}
    </AdminRouteGate>;
  }

  if (temizYol === '/yonetim/kesfet' || temizYol === '/yonetim/kesfet/yeni' || /^\/yonetim\/kesfet\/[^/]+\/duzenle$/.test(temizYol)) {
    const editId = /^\/yonetim\/kesfet\/([^/]+)\/duzenle$/.exec(temizYol)?.[1];
    return <AdminRouteGate authenticated={Boolean(session)} isAdmin={isAdmin} onLogin={handleOpenLogin}>
      {temizYol.endsWith('/yeni') || editId ? <AdminDiscoverForm onDone={navigate} editId={editId} /> : <AdminDiscoverView onNavigate={navigate} />}
    </AdminRouteGate>;
  }

  /* /ilan/frontend-stajyeri-3f2a1b9c */
  if (temizYol.startsWith('/ilan/')) {
    const onek = idPrefixFromSlug(temizYol.slice('/ilan/'.length));
    if (onek) {
      return (
        <>
          <ListingPage
            idPrefix={onek}
            onBack={goHome}
            onNavigate={navigate}
            onApply={(ilan) => handleApplyToJob(ilan, 0)}
          />
          {girisModali}
          {adPenceresi}
        </>
      );
    }
  }

  /*
    Yazdırılabilir CV. Oturum gerekiyor: sayfa kişinin kendi profilinden
    üretiliyor, başkasının CV'si buradan görüntülenemiyor.
  */
  /*
    BAŞVURU E-POSTASI ŞABLONU KENDİ ADRESİNDE

    Şablon yalnızca sıfır sonuç ekranındaki bir düğmeden açılabiliyordu —
    yani onu görebilmek için önce hiçbir ilan bulamamak gerekiyordu.
    Rehberdeki "Sıradaki adım" buraya bağlanıyor ve adres paylaşılabilir
    oluyor. Kapatınca rehbere dönüyor: kullanıcı buraya oradan geldi.
  */
  /*
    Şifre yenileme sayfası. E-postadaki kurtarma bağlantısı buraya düşüyor;
    bu adres tanımlı olmadığı sürece "şifremi unuttum" akışı e-postada
    bitiyordu.
  */
  if (temizYol === '/sifre-yenile') {
    return icerikSayfasi(<SifreYenile onNavigate={navigate} />);
  }

  if (temizYol === '/basvuru-sablonu') {
    return icerikSayfasi(
      <BasvuruSablonu
        acik
        onKapat={() => navigate('/rehber/staj-basvuru-epostasi')}
        ogrenci={isLoggedIn ? activeStudent : null}
      />
    );
  }

  if (temizYol === '/cv') {
    if (!student) {
      return (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
          <div className="max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <p className="font-bold text-gray-900">CV oluşturmak için giriş yapın</p>
            <p className="text-sm text-gray-600">
              CV, profilindeki bilgilerden oluşturuluyor.
            </p>
            <button
              type="button"
              onClick={goHome}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Ana sayfaya dön
            </button>
          </div>
        </div>
      );
    }
    return <CvPage student={student} onBack={() => navigate('/')} />;
  }

  /* Rehber merkezi ve tek rehber sayfaları. */
  if (temizYol === '/rehber') {
    return icerikSayfasi(
      <GuideHub
        onBack={goHome}
        onNavigate={navigate}
        ogrenci={isLoggedIn ? activeStudent : null}
        arama={aramaTerimi}
        onAramaTemizle={() => setAramaTerimi('')}
        onGirisGerekli={AUTH_ENABLED ? handleOpenLogin : undefined}
      />
    );
  }
  if (temizYol.startsWith('/rehber/')) {
    return icerikSayfasi(
      <GuidePage
        slug={temizYol.slice('/rehber/'.length)}
        onBack={() => navigate('/rehber')}
        onNavigate={navigate}
      />
    );
  }

  /* Bölüme göre staj rehberi. */
  if (temizYol === '/bolumler') {
    return icerikSayfasi(<BolumHub onBack={goHome} onNavigate={navigate} />);
  }
  /*
    Buyuk isverenler dizini.

    Ilan DEGIL: bu sayfa isverenin kendi basvuru sayfasina yonlendiriyor.
    Gerekcesi src/data/stajProgramlari.ts basinda.
  */
  /* Universite kariyer merkezleri — dogrulanmis dis baglanti dizini. */
  if (temizYol === '/universite-kariyer-merkezleri') {
    return icerikSayfasi(<KariyerMerkezleriSayfasi onBack={goHome} ogrenci={isLoggedIn ? activeStudent : null} />);
  }
  if (temizYol === '/staj-programlari') {
    return icerikSayfasi(
      <StajProgramlariSayfasi
        onBack={goHome}
        onNavigate={navigate}
        ogrenci={isLoggedIn ? activeStudent : null}
        onGirisGerekli={AUTH_ENABLED ? handleOpenLogin : undefined}
      />
    );
  }
  if (temizYol.startsWith('/bolum/')) {
    return icerikSayfasi(
      <BolumPage
        slug={temizYol.slice('/bolum/'.length)}
        onBack={() => navigate('/bolumler')}
        onNavigate={navigate}
        onSearch={bolumdenAra}
        ogrenci={isLoggedIn ? activeStudent : null}
        onGirisGerekli={AUTH_ENABLED ? handleOpenLogin : undefined}
      />
    );
  }

  /* Hesaplama araçları. */
  if (temizYol === '/araclar') {
    return icerikSayfasi(<AracHub onBack={goHome} onNavigate={navigate} />);
  }
  if (temizYol === '/araclar/net-hesaplama') {
    return icerikSayfasi(<NetHesaplama onBack={() => navigate('/araclar')} onNavigate={navigate} />);
  }
  if (temizYol === '/araclar/siralama-tahmini') {
    return icerikSayfasi(<SiralamaTahmini onBack={() => navigate('/araclar')} onNavigate={navigate} />);
  }
  if (temizYol === '/araclar/staj-ucreti-hesaplama') {
    return icerikSayfasi(<StajUcretiHesaplama onBack={() => navigate('/araclar')} onNavigate={navigate} />);
  }
  if (temizYol === '/araclar/staj-gunu-hesaplama') {
    return icerikSayfasi(<StajGunuHesaplama onBack={() => navigate('/araclar')} onNavigate={navigate} />);
  }

  /* İşveren rehberi: şirketin bizi bulmasının ana yolu. */
  /*
    Isverenin ilan verme kanalina giris kapisi.

    /isveren'DEN ONCE geliyor: alt yol olmasaydi bile sira onemli, cunku
    yukaridaki kosul tam esitlik ariyor ve bu bloktan sonra kalsaydi
    /isveren/ilan-ver bilinmeyen adrese dusup 404 uretirdi.
  */
  if (temizYol === '/isveren/ilan-ver') {
    return icerikSayfasi(
      <IsverenGirisi
        onBack={goHome}
        onNavigate={navigate}
        userId={session?.userId ?? null}
        onIsverenGirisi={
          AUTH_ENABLED ? (kip) => isverenGirisiAc(kip, '/isveren/ilan-ver') : undefined
        }
      />
    );
  }
  /*
    /isveren ARTIK ÜRÜNÜN KAPISI

    Önce burada "stajyer nasıl alınır" rehberi vardı: içerik iyi ve arama
    motoru için değerli, ama İK çalışanı "ne yapabiliyorum" sorusunun
    cevabını üç ekran aşağıda buluyordu. Rehber /stajyer-nasil-alinir
    adresinde duruyor (adres değişmedi, SEO korundu) ve landing'den
    bağlantılı.
  */
  if (temizYol === '/isveren') {
    return icerikSayfasi(
      <IsverenLanding
        onNavigate={navigate}
        onIsverenGirisi={AUTH_ENABLED ? (kip) => isverenGirisiAc(kip, '/sirket/ilanlar') : undefined}
        sirketUyesiMi={sirketUyesi}
      />
    );
  }
  if (temizYol === '/stajyer-nasil-alinir') {
    return icerikSayfasi(<EmployerGuide onBack={goHome} onNavigate={navigate} />);
  }

  /*
    /yonetim/talepler

    Ayri bir yol, sekme degil: yonetici ekrani gunluk kullanimda degil ve
    ogrenci menusunde yer kaplamamali. Yetkisiz biri adresi bilse bile
    listeyi goremiyor -- RLS yalnizca admin'e satirlari veriyor, kuyruk
    bos gorunur ve onay fonksiyonu hata dondurur.
  */
  if (temizYol === '/yonetim' || temizYol === '/yonetim/talepler') {
    const kuyrukSayfasi = temizYol === '/yonetim/talepler';
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
          <div className="max-w-3xl mx-auto space-y-8">
            {kuyrukSayfasi ? (
              <>
                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-gray-900">Onay bekleyen ilanlar</h2>
                  <AdminListingsQueue onToast={showToast} />
                </section>
                <AdminClaimsView onToast={showToast} />
              </>
            ) : (
              <AdminDashboard onNavigate={navigate} />
            )}
          </div>
        ) : (
          <p className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
            Bu sayfa yalnizca yoneticiye acik.
          </p>
        )}
      </div>
    );
  }

  /* /sirket/vertigo-games */
  /*
    SIRKET PANELI

    /sirket/... koku ikiye bolunuyor: asagidaki dort yol PANEL, geri kalani
    herkese acik sirket sayfasi. Panel yollari once bakiliyor cunku bir
    sirketin slug'i "ilanlar" olsaydi panel erisilemez hale gelirdi.

    KAPI 1: sirket yetkisi olmayan kullanici panele girmiyor,
    /isveren/ilan-ver'e gidiyor. Panelin bos halini gostermek, olmayan bir
    yetkiyi varmis gibi gostermek olurdu.
  */
  /*
    Ciplak /sirket panelin GENEL BAKIS ekrani. Giris yoksa asagidaki
    Kapi 1 yine isveren kapisini gosteriyor -- yol yetkiyi atlamiyor.
  */
  const sirketPanelYolu = temizYol;

  /*
    Çıplak /sirket kanonik adrese gidiyor: aynı bileşeni iki adresten
    çizmek, aynı içeriğe iki public URL vermek demekti. Kenar tarafında
    301 var (public/_redirects); bu satır uygulama içi gezinmeyi de aynı
    yere alıyor.
  */
  if (temizYol === '/sirket') {
    navigate('/isveren/ilan-ver');
    return null;
  }

  if (
    SIRKET_PANEL_YOLLARI.some(
      (p) => sirketPanelYolu === p || sirketPanelYolu.startsWith(`${p}/`)
    )
  ) {
    if (!isLoggedIn) {
      return icerikSayfasi(
        <IsverenGirisi
          onBack={goHome}
          onNavigate={navigate}
          userId={null}
          onIsverenGirisi={
            AUTH_ENABLED ? (kip) => isverenGirisiAc(kip, temizYol) : undefined
          }
        />
      );
    }
    return (
      <>
        <SirketPaneli
          yol={sirketPanelYolu}
          userId={session?.userId ?? null}
          yoneticiMi={isAdmin}
          onNavigate={navigate}
          onOgrenciyeDon={() => {
            setDunyaGecisi('ogrenciye');
            navigate('/');
          }}
          okunmamisBildirim={bildirim.okunmamis}
          onBildirimAc={() => void bildirim.ac()}
          acilacakAday={acilacakAday}
          onAdayAcildi={() => setAcilacakAday(null)}
        />
        {bildirim.acik && (
          <BildirimMerkezi
            bildirimler={bildirim.bildirimler}
            okunmamis={bildirim.okunmamis}
            yukleniyor={bildirim.yukleniyor}
            renk={SIRKET_VURGU_KOYU}
            onKapat={bildirim.kapat}
            onAc={bildirimAc}
            onTumunuOkundu={() => void bildirim.tumunuOkunduYap()}
          />
        )}
        {dunyaGecisi && (
          <DunyaGecisi yon={dunyaGecisi} onBitti={() => setDunyaGecisi(null)} />
        )}
      </>
    );
  }

  if (temizYol.startsWith('/sirket/')) {
    const sirketSlug = temizYol.slice('/sirket/'.length);
    if (sirketSlug) {
      return (
        <>
          <CompanyPage
            slug={sirketSlug}
            onBack={goHome}
            onNavigate={navigate}
            userId={session?.userId ?? null}
            userEmail={student?.email}
            /*
              Şirket sayfasından açılan giriş İŞVEREN metinleriyle geliyor
              ve girişten sonra bu sayfaya dönüyor. Önce öğrenci penceresi
              açılıyordu ve giriş bitince kullanıcı ana sayfaya düşüyordu;
              sahiplenme talebini bir daha bulamıyordu.
            */
            onRequireLogin={() => isverenGirisiAc('login', `/sirket/${sirketSlug}`)}
          />
          {girisModali}
          {adPenceresi}
        </>
      );
    }
  }

  /*
    BİLİNMEYEN ADRES: YUMUŞAK 404 ÜRETMEYİ BIRAK

    Buraya kadar hiçbir kural eşleşmediyse adres yok demektir. Önce bu
    durumda da ana sayfa çiziliyordu ve sonuç şuydu: sitedeki HER hatalı
    adres, HTTP 200 ile ana sayfayı döndürüyordu. Ölçüldü — var olmayan
    "/kullanim-sartlari" adresi 200 ve ana sayfa içeriğiyle cevap veriyordu.

    Google buna yumuşak 404 diyor ve iki zararı var: hatalı bağlantılar
    dizine giriyor, ayrıca aynı içerik onlarca adreste görünüyor.

    Sunucu tarafında gerçek 404 kodu veremiyoruz: Cloudflare Pages'te SPA
    yedeği bütün adresleri 200 ile index.html'e düşürüyor ve bu yedek
    /cv, /profil gibi ön render edilmeyen uygulama adresleri için gerekli.
    Yapılabilecek en doğru şey, sayfanın kendisinin "burada bir şey yok"
    demesi ve dizine girmeyi reddetmesi.
  */
  if (temizYol !== '/') {
    return <BulunamadiSayfasi yol={temizYol} ustCubuk={ustCubuk} onNavigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-[#111827] flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/*
        ÇEREZ BANDI

        Reklam betiği bu banda verilen karara bağlı; band çıkmadan hiçbir
        dış reklam isteği başlamıyor. `tercihlerAcik` altbilgideki
        "Çerez tercihleri" bağlantısıyla açılıyor — kullanıcı kararını
        sonradan değiştirebilsin diye.
      */}
      {cerezBandi}

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-gray-800 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Üst çubuk: içerik sayfalarıyla aynı bileşen, tek yerden. */}
      {ustCubuk}

      {/* Main Content Area */}
      {/*
        Üst boşluk incelendi: başlık çubuğu ile ilk kart arasında 24 piksel
        duruyordu ve sayfanın ilk ekranında boş bir bant gibi görünüyordu.
        Alt boşluğa dokunulmadı; oradaki pay mobil gezinme çubuğu için.
      */}
      <main className={`flex-1 ${SAYFA_GENISLIGI} w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 sm:pt-3 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-8`}>
        {safeTab === 'company-portal' && !activeCompany ? (
          /*
            Şirket hesabı yokken portalı çizmek, uydurma bir şirketin panelini
            göstermek demekti. Gerçek kayıt akışı kurulana kadar durumu
            olduğu gibi söylüyoruz.
          */
          <div className="max-w-xl mx-auto my-16 bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Şirket hesabınız yok</h2>
            <p className="text-sm text-gray-600">
              Şirket kaydı ve ilan girişi artık açık. İşveren sayfasından şirketinizi
              oluşturabilir ya da StajımVar&apos;da zaten görünen şirket sayfanızı
              sahiplenebilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('internships');
                navigate('/isveren');
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              İşveren sayfasına git
            </button>
          </div>
        ) : safeTab === 'company-portal' ? (
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
              <>
              {/*
                FIRSAT ŞERİDİ İLANLARIN ALTINDA

                Bölüm tepedeydi ve ekranın çoğunu kaplıyordu: "İlanlar"
                sekmesindeyken staj ilanları ilk ekranın altında kalıyordu.
                Sekmenin adı neyse ekranın çoğu o olmalı.
              */}
              <MatchedInternshipsView
                student={isLoggedIn ? activeStudent : null}
                allListings={allListings}
                applications={applications}
                subTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
                onViewDetails={(listing) => navigate(`/ilan/${listingSlug(listing)}`)}
                kendiSirketId={kendiSirketId}
                onQuickApply={(listing, match) =>
                  handleApplyToJob(listing, match.overallScore)
                }
                onGoToProfile={() => setActiveTab('profile')}
                searchQuery={aramaTerimi}
                onSearchChange={setAramaTerimi}
                onNavigate={navigate}
                onRequireLogin={handleOpenLogin}
              />
              <OpportunitiesHomeSection
                onNavigate={navigate}
                searchQuery={aramaTerimi}
                ogrenci={isLoggedIn ? activeStudent : null}
              />
              </>
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

            {safeTab === 'profile' && activeStudent && (
              <StudentProfileView
                student={activeStudent}
                subTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
                /*
                  Çıkış ve yönetim paneli üst çubuktaki avatar menüsünden
                  buraya taşındı: o menü mobilde kaldırıldı ve alt gezinme
                  çubuğu artık doğrudan bu sayfaya geliyor. Masaüstündeki
                  avatar menüsü duruyor, yani iki yerden de erişiliyor.
                */
                onLogout={handleLogout}
                isAdmin={isAdmin}
                /* Rota `/yonetim`; `/admin` diye bir adres yok, 404'e düşüyordu. */
                onOpenAdmin={() => navigate('/yonetim')}
                onUpdateProfile={handleUpdateProfile}
                onOpenCv={() => navigate('/cv')}
                basvurular={applications}
                onKaydedilenlere={() => {
                  /*
                    Kaydedilen sayısı ilan listesindeki "Kaydettiklerim"
                    kategorisini açıyor: sayının gittiği yerde aynı sayı
                    duruyor.
                  */
                  setActiveTab('internships');
                  setActiveSubTab('kaydettiklerim');
                }}
                basvuruListesi={
                  <ApplicationsTrackerView
                    applications={applications}
                    allListings={allListings}
                    subTab={activeSubTab}
                    onSubTabChange={setActiveSubTab}
                    onExploreInternships={() => handleTabChange('internships')}
                    /*
                      Geri çekme öğrencinin kendi kararı. Veritabanı
                      politikası da yalnızca bu değeri veriyor; buton
                      onun görünür karşılığı, güvenlik sınırı değil.
                    */
                    onWithdraw={async (id) => {
                      await withdrawApplication(id);
                      setApplications((prev) =>
                        prev.map((a) =>
                          a.id === id
                            ? { ...a, status: 'withdrawn', statusChangedAt: new Date().toISOString() }
                            : a,
                        ),
                      );
                      showToast('Başvurun geri çekildi.');
                    }}
                    /*
                      Kararı SUNUCU veriyor: dönen durum yazılıyor, ekranın
                      tahmini değil. Aynı teklife iki kez yanıt verilirse
                      işlev mevcut sonucu döndürüyor, hata değil.
                    */
                    onRespondToOffer={async (id, kabul) => {
                      const durum = await respondToOffer(id, kabul);
                      setApplications((prev) =>
                        prev.map((a) =>
                          a.id === id
                            ? { ...a, status: durum, statusChangedAt: new Date().toISOString() }
                            : a,
                        ),
                      );
                      showToast(
                        durum === 'offer_accepted'
                          ? 'Teklifi kabul ettin. İletişim bilgileri açıldı.'
                          : 'Teklifi reddettin.',
                      );
                      return durum;
                    }}
                    /*
                      Görüşme yanıtı da sunucudan dönüyor. İkinci yanıt
                      hata değil: işlev mevcut yanıtı döndürüyor.
                    */
                    onRespondToInterview={async (id, katilacak) => {
                      const yanit = await respondToInterview(id, katilacak);
                      setApplications((prev) =>
                        prev.map((a) =>
                          a.id === id
                            ? { ...a, interviewResponse: yanit, interviewRespondedAt: new Date().toISOString() }
                            : a,
                        ),
                      );
                      showToast(
                        yanit === 'accepted'
                          ? 'Görüşmeye katılacağını bildirdin.'
                          : 'Görüşmeye katılamayacağını bildirdin.',
                      );
                      return yanit;
                    }}
                    onFetchContact={(id) => fetchApplicationContact(id)}
                    /*
                      Bildirimden gelindiyse ilgili başvurunun paneli
                      kendiliğinden açılıyor: kullanıcı listeyi tekrar
                      taramak zorunda kalmıyor.
                    */
                    acilacakBasvuru={acilacakBasvuru}
                    onBasvuruAcildi={() => setAcilacakBasvuru(null)}
                  />
                }
                quizzes={quizzes}
                onStartQuiz={(quiz) => setActiveQuiz(quiz)}
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
      {girisModali}
      {adPenceresi}

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
                { yol: '/rehber', etiket: 'Staj rehberi' },
                { yol: '/bolumler', etiket: 'Bölüme göre staj' },
                { yol: '/staj-programlari', etiket: 'Büyük işverenlerde staj' },
                { yol: '/universite-kariyer-merkezleri', etiket: 'Kariyer merkezleri' },
                { yol: '/araclar', etiket: 'Hesaplama araçları' },
                { yol: '/isveren', etiket: 'İşveren rehberi' },
                { yol: '/isveren/ilan-ver', etiket: 'Şirketini sahiplen' },
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
              {/*
                Kullanıcı kararını sonradan değiştirebilmeli: band bir kez
                çıkıp kayboluyor, bu bağlantı onu tercihler açık hâlde geri
                getiriyor.
              */}
              <button
                type="button"
                onClick={() => setTercihlerAcik(true)}
                className="cursor-pointer font-semibold text-gray-600 transition-colors hover:text-blue-600"
              >
                Çerez tercihleri
              </button>
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
            <span className="text-[11px] text-gray-600">
              &copy; 2026 StajımVar
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
