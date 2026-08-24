import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  User,
  Building2,
  CheckCircle2,
  Compass,
  FileText,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Send,
  UserCheck,
  Settings,
  BookOpen,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Mail,
  Users,
  Columns,
  Plus,
  Inbox,
  Search,
} from 'lucide-react';
import { StudentProfile, CompanyAccount } from '../types';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { SAYFA_GENISLIGI } from '../lib/duzen';

interface HeaderProps {
  activeTab: 'internships' | 'badges' | 'applications' | 'profile' | 'company-portal';
  setActiveTab: (
    tab: 'internships' | 'badges' | 'applications' | 'profile' | 'company-portal'
  ) => void;
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  userRole: 'student' | 'company';
  setUserRole: (role: 'student' | 'company') => void;
  /** Giriş yapılmamışsa null. */
  activeStudent: StudentProfile | null;
  activeCompany?: CompanyAccount;
  allCompanies?: CompanyAccount[];
  onSelectCompany?: (companyId: string) => void;
  applicationsCount: number;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onLogout?: () => void;
  /** Rehber merkezine geçiş. */
  onOpenGuides?: () => void;
  /** Öğrenci fırsatları merkezi. */
  onOpenOpportunities?: () => void;
  /** İşveren kapısı: şirket sayfasını sahiplenme akışı. */
  onOpenEmployer?: () => void;
  /**
   * Bulunulan adres.
   *
   * Alt menü hangi sekmenin seçili olduğunu `activeTab`'e bakarak
   * belirliyordu. Ama rehber ve bölüm sayfaları sekme değil ADRES: /rehber
   * açıkken activeTab hâlâ 'internships' kalıyor ve alt menüde "İlanlar"
   * mavi duruyordu — kullanıcı rehberdeyken ilanlarda görünüyordu.
   *
   * Verilmezse eski davranış sürüyor (yalnızca sekmeye bakılıyor).
   */
  bulunulanYol?: string;
  /**
   * İlan araması.
   *
   * Kutu eskiden sol sütundaydı; başlık çubuğunun ortası ise boştu. Arama
   * sitenin en çok kullanılan işi olduğu için oraya taşındı — Kariyer.net'te
   * de arama üst çubukta duruyor.
   *
   * Durum App'te; burası yalnızca çiziyor. Verilmezse kutu hiç çizilmiyor,
   * yani ilan listesi dışındaki sayfalarda üst çubuk eskisi gibi kalıyor.
   */
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  /*
    Yönetici menüsü. Bu bayrak yalnızca MENÜYÜ gösteriyor — yetkinin kendisi
    veritabanında. Tarayıcıda değerini değiştiren biri menüyü görebilir ama
    sayfayı açtığında boş kalır: veriyi getiren sorgular ve onay fonksiyonları
    is_admin() kontrolünden geçiyor.
  */
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeSubTab,
  setActiveSubTab,
  userRole,
  setUserRole,
  activeStudent,
  activeCompany,
  allCompanies = [],
  onSelectCompany,
  applicationsCount,
  isLoggedIn = true,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onOpenGuides,
  onOpenOpportunities,
  onOpenEmployer,
  bulunulanYol = '/',
  searchQuery,
  onSearchChange,
  isAdmin = false,
  onOpenAdmin,
}) => {
  /*
    YÜZEN ÇUBUK AŞAĞI KAYDIRIRKEN ÇEKİLİYOR

    Çubuk ekranın dibinde duruyor ve okunan içeriğin üstünden geçiyor —
    yüzen tasarımın doğası bu. Sayfanın SONUNDA sorun yok (içeriğe çubuk
    kadar alt boşluk verildi) ama ortasında, örneğin başvuru listesinin
    süzgeç sekmeleri tam çubuğun arkasına denk geldiğinde, kullanıcı
    okumak için ileri geri kaydırmak zorunda kalıyordu.

    Aşağı kaydırmak "okumaya devam ediyorum" demek: çubuk çekiliyor.
    Yukarı kaydırmak "bir şey arıyorum" demek: geri geliyor. Gezinme
    her an bir parmak hareketi uzakta, ama okurken ekranı yemiyor.

    Eşik 8 piksel: eşiksiz kurulumda küçük dokunmatik titremeler çubuğu
    açıp kapatıyordu.
  */
  const [altMenuGorunur, setAltMenuGorunur] = useState(true);
  useEffect(() => {
    let sonY = window.scrollY;
    const kaydir = () => {
      const y = window.scrollY;
      const fark = y - sonY;
      if (Math.abs(fark) < 8) return;
      /* Sayfanın en tepesinde her zaman görünsün. */
      setAltMenuGorunur(fark < 0 || y < 80);
      sonY = y;
    };
    window.addEventListener('scroll', kaydir, { passive: true });
    return () => window.removeEventListener('scroll', kaydir);
  }, []);

  const altMenuClass =
    'lg:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-full bg-white/90 backdrop-blur-xl border border-gray-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.16)] px-1.5 py-1.5 flex items-center justify-around gap-0.5 transition-transform duration-200';

  /*
    Kayma değeri Tailwind sınıfıyla değil, satır içi biçemle veriliyor.
    `translate-y-[160%]` derlenen CSS'e HİÇ girmedi (canlıda doğrulandı:
    sınıf öğenin üzerindeydi ama computed `translate` 0% kalıyordu) —
    tarayıcı tarafında sessizce hiçbir şey yapmayan bir sınıf, çalışmayan
    bir özellik demek. Satır içi biçem tarama adımına bağlı değil.
  */
  const altMenuStil: React.CSSProperties = {
    transform: altMenuGorunur ? 'none' : 'translateY(160%)',
  };

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const subMenuScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  // Check scroll position to show/hide left-right helper buttons
  const checkScrollState = () => {
    const el = subMenuScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    checkScrollState();
    window.addEventListener('resize', checkScrollState);
    return () => window.removeEventListener('resize', checkScrollState);
  }, [activeTab]);

  // Mouse wheel handler to convert vertical mouse wheel to horizontal scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = subMenuScrollRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      checkScrollState();
    }
  };

  // Drag-to-scroll with mouse
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = subMenuScrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftPos(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = subMenuScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeftPos - walk;
    checkScrollState();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Arrow buttons scrolling
  const scrollByAmount = (amount: number) => {
    const el = subMenuScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScrollState, 250);
  };

  // Define dynamic contextual sub-menus for student tabs only (company has high-prominence top bar)
  const getSubMenuItems = () => {
    if (userRole === 'company' || activeTab === 'company-portal') {
      return [];
    }

    switch (activeTab) {
      case 'internships':
        // Embedded directly in the MatchedInternshipsView filter bar
        return [];
      case 'applications':
        // Embedded directly in the ApplicationsTrackerView banner
        return [];
      case 'badges':
        /*
          Kaldırıldı: sayfadaki gruplar zaten "Teknik yetenekler / Sosyal
          beceriler / Yabancı diller" başlıklarıyla ve test sayılarıyla
          duruyor. Şerit bunların birebir kopyasıydı — aynı seçimi iki
          ayrı yerde sunmak, ikisinin farklı şeyler olduğunu düşündürüyor.
        */
        return [];
      case 'profile':
        /*
          Kaldırıldı ve ARTIK ÇALIŞMIYORDU. Profil sayfası açılır bölümlere
          çevrildiğinde bu şeridin bağlandığı yapı ortadan kalktı;
          StudentProfileView `subTab` değerini hiç okumuyor. Yani sekmelere
          basmak görünüşte bir şey seçiyor ama sayfada hiçbir şey olmuyordu.
        */
        return [];
      default:
        return [];
    }
  };

  const subMenuItems = getSubMenuItems();

  /*
    İçerik sayfaları: rehber merkezi, tek rehber, bölümler, tek bölüm,
    hesaplama araçları ve işveren rehberi. Hepsi alt menüde "Rehber"
    altında toplanıyor — kullanıcı için hepsi aynı yerin parçası.
  */
  const rehberdeMi = /^\/(rehber|bolum|bolumler|araclar|isveren)(\/|$)/.test(bulunulanYol);
  const firsatlardaMi = /^\/(firsatlar|burslar|kyk|yurtdisi-firsatlari|yarismalar|firsat-takvimi|bana-uygun|kaydedilen-firsatlar)(\/|$)/.test(bulunulanYol);

  /*
    Kurumsal ve yasal sayfalar üçünden hiçbiri değil.

    Gizlilik ya da Hakkımızda açıkken alt menüde "İlanlar" yanıyordu; oysa
    kullanıcı ilanlarda değil. Hiçbiri seçili olmaması doğru bilgi.
  */
  const kurumsalSayfada = /^\/(hakkimizda|iletisim|gizlilik|cerez-politikasi|kvkk-aydinlatma-metni|kullanim-kosullari|ilan-kurallari|ilan-bildir)$/.test(
    bulunulanYol
  );

  /* İşveren tarafı: rehber ve sahiplenme sayfaları. */
  const isverendeMi = /^\/isveren(\/|$)/.test(bulunulanYol);
  const ilanlardaMi = !rehberdeMi && !firsatlardaMi && !kurumsalSayfada && activeTab === 'internships';
  const profildeMi = !rehberdeMi && !kurumsalSayfada && activeTab === 'profile';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs transition-colors duration-200">
        <div className={`${SAYFA_GENISLIGI} mx-auto px-2.5 sm:px-6 lg:px-8 xl:px-10`}>
        {/* Main Nav Bar */}
        <div className="flex items-center justify-between h-15 sm:h-18 gap-2 sm:gap-4">
          {/* Left: Brand Logo & Segmented Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-6 shrink-0 min-w-0">
            <div className="shrink-0">
              <Logo
                onClick={() => {
                  setUserRole('student');
                  setActiveTab('internships');
                }}
              />
            </div>

            {/* Desktop Student Navigation Bar */}
            {userRole === 'student' && activeTab !== 'company-portal' && (
              <nav className="hidden lg:flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200/90 shadow-2xs transition-all gap-0.5 shrink-0">
                {/*
                  1. İş & Staj İlanları

                  Seçili görünme koşulu yalnızca `activeTab` idi. Rehber ya da
                  burs sayfasına geçildiğinde o durum değişmediği için sekme
                  ilanlarda takılı kalıyordu: kullanıcı rehberi okurken üstte
                  hâlâ "İş & Staj İlanları" yanıyordu. Artık bulunulan yol da
                  hesaba katılıyor (ilanlardaMi).
                */}
                <button
                  id="nav-tab-internships"
                  onClick={() => {
                    setActiveTab('internships');
                    setActiveSubTab('all');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    ilanlardaMi
                      ?'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold'
                      :'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Briefcase
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      ilanlardaMi ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <span className="hidden xl:inline">İş & Staj İlanları</span>
                  <span className="inline xl:hidden">İlanlar</span>
                  {ilanlardaMi && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"/>
                  )}
                </button>

                {/*
                  BURS VE REHBER SEKMELERİ HERKESE AÇIK

                  Bu iki sekme `isLoggedIn` koşulunun içindeydi. Koşul, artık
                  var olmayan "Başvurularım" ve "Yetenek Doğrulama" sekmeleri
                  için konmuştu (ziyaretçi kendisine ait sanacağı örnek veri
                  görüyordu); onlar kaldırılınca koşul geride kaldı.

                  Sonuç: gizli sekmede açan bir ziyaretçi yalnızca "İş & Staj
                  İlanları"nı görüyordu — burs listesi ve rehber, sitenin
                  arama motorundan gelen ziyaretçiye açılan iki kapısı olduğu
                  hâlde menüde yoktu. İkisi de giriş istemeyen genel içerik.
                */}
                <>
                {/*
                  "Yetenek Doğrulama" sekmesi kaldırıldı.

                  Test çözmek ayrı bir iş değil, profil doldurmanın parçası:
                  kişi yeteneğini yazıyor, sonra o yeteneği doğruluyor. İkisini
                  ayrı sekmelere bölmek aynı işi iki yere dağıtıyordu — kullanıcı
                  yeteneğini profile ekliyor, doğrulamak için başka sekmeye
                  gidiyordu.

                  Testler artık Özgeçmiş & Profil sayfasının içinde, eklenen
                  yeteneklerin hemen altında.
                */}

                {/*
                  Burs ilanları sekmesi. Rehberden ÖNCE geliyor: burs ve kredi
                  başvurusu takvime bağlı, kaçırılınca bir yıl bekleniyor.
                  Rehber ise her zaman orada duruyor.

                  Sekmenin adı "Fırsatlar"dan "Burs İlanları"na çevrildi;
                  "fırsat" ne olduğunu söylemeyen bir kelimeydi. Listede
                  yarışma ve yurt dışı programı da var, yani ad tam kapsamıyor
                  — ama on bir kaydın dokuzu burs ve kredi, ve öğrenci
                  aradığında "burs" yazıyor.
                */}
                <button
                  id="nav-tab-opportunities"
                  onClick={() => onOpenOpportunities?.()}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    firsatlardaMi ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${firsatlardaMi ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>Burs İlanları</span>
                  {firsatlardaMi && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"/>}
                </button>

                {/*
                  Rehber sekmesi. Boşalan yere içerik geldi: staj sürecinin
                  bilinmeyen kısımları (belge, sigorta, CV, mülakat). Aynı
                  zamanda sitenin keşif kanalı — davet e-postası
                  gönderemediğimiz için hem öğrenci hem işveren bize arama
                  motorundan, bu sayfalar üzerinden geliyor.
                */}
                <button
                  id="nav-tab-guides"
                  onClick={() => onOpenGuides?.()}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    rehberdeMi && !isverendeMi ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <BookOpen
                    className={`w-3.5 h-3.5 shrink-0 ${
                      rehberdeMi && !isverendeMi ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <span>Rehber</span>
                  {/*
                    İşveren sayfası alt menüde "Rehber" altında toplansa da orada
                    seçili görünmemeli: kullanıcı rehber okumuyor, şirket tarafında.
                    Zemin rengi düzeltilmişti, simge ve nokta geride kalmıştı.
                  */}
                  {rehberdeMi && !isverendeMi && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  )}
                </button>

                {/*
                  "Başvurularım" sekmesi kaldırıldı.

                  Aynı gerekçe "Yetenek Doğrulama"da olduğu gibi: başvuru takibi
                  ayrı bir iş değil, kişinin kendi dosyasının parçası. Kullanıcı
                  profilini dolduruyor, başvuruyor, sonra ne olduğuna bakıyor —
                  bunlar tek bir yerde olmalı. Üç sekme arasında gidip gelmek
                  aynı işi bölüyordu.

                  Başvurular artık Özgeçmiş & Profil sayfasının en üstünde;
                  sayaç da o sekmenin üstünde duruyor.
                */}

                {/*
                  "Özgeçmiş & Profil" SEKMESİ KALDIRILDI.

                  Sağdaki avatar düğmesi zaten aynı yere götürüyordu: aynı
                  hedefe iki ayrı düğme, üstelik yan yana. Kullanıcı hangisine
                  bastığını değil, ikisinin farklı bir şey yapmasını bekliyor.

                  Başvuru sayacı kaybolmadı — avatarın üstüne taşındı. Sekmeyi
                  silip sayacı da silmek, düğmeyi kaldırmakla kalmayıp bilgiyi
                  de kaldırmak olurdu.
                */}

                </>

              </nav>
            )}

            {/* Desktop Company Navigation Bar - Simple & Clean matching Student Navbar */}
            {(userRole === 'company' || activeTab === 'company-portal') && (
              <nav className="hidden lg:flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200/90 shadow-2xs transition-all gap-0.5 shrink-0">
                {/* 1. İlana Başvuranlar */}
                <button
                  id="nav-company-applicants"
                  onClick={() => {
                    setActiveTab('company-portal');
                    setActiveSubTab('applicants');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeSubTab === 'applicants'
                      ?'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold'
                      :'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Inbox
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeSubTab === 'applicants'
                        ?'text-blue-600'
                        :'text-gray-400'
                    }`}
                  />
                  <span className="hidden xl:inline">İlana Başvuranlar</span>
                  <span className="inline xl:hidden">Başvuranlar</span>
                  {activeSubTab === 'applicants' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"/>
                  )}
                </button>

                {/* 2. Eşleşen Aday Havuzu */}
                <button
                  id="nav-company-candidates"
                  onClick={() => {
                    setActiveTab('company-portal');
                    setActiveSubTab('all_candidates');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeSubTab === 'all_candidates' || activeSubTab === 'all'
                      ?'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold'
                      :'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Users
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeSubTab === 'all_candidates' || activeSubTab === 'all'
                        ?'text-blue-600'
                        :'text-gray-400'
                    }`}
                  />
                  <span className="hidden xl:inline">Eşleşen Aday Havuzu</span>
                  <span className="inline xl:hidden">Aday Havuzu</span>
                  {(activeSubTab === 'all_candidates' || activeSubTab === 'all') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"/>
                  )}
                </button>

                {/* 3. Kanban Panosu */}
                <button
                  id="nav-company-kanban"
                  onClick={() => {
                    setActiveTab('company-portal');
                    setActiveSubTab('kanban');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeSubTab === 'kanban'
                      ?'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold'
                      :'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Columns
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeSubTab === 'kanban'
                        ?'text-purple-600'
                        :'text-gray-400'
                    }`}
                  />
                  <span className="hidden xl:inline">Kanban Süreç Panosu</span>
                  <span className="inline xl:hidden">Kanban Panosu</span>
                  {activeSubTab === 'kanban' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"/>
                  )}
                </button>

                {/* 4. Yeni İlan Yayınla */}
                <button
                  id="nav-company-post-new"
                  onClick={() => {
                    setActiveTab('company-portal');
                    setActiveSubTab('post_new');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeSubTab === 'post_new'
                      ?'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold'
                      :'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Plus
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeSubTab === 'post_new'
                        ?'text-blue-600'
                        :'text-gray-400'
                    }`}
                  />
                  <span className="hidden xl:inline">+ Yeni İlan Yayınla</span>
                  <span className="inline xl:hidden">+ Yeni İlan</span>
                  {activeSubTab === 'post_new' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"/>
                  )}
                </button>
              </nav>
            )}
          </div>

          {/*
            Orta: arama kutusu.

            `flex-1` ile logo/sekmeler ile profil arasındaki tüm boşluğu
            alıyor; ekran genişledikçe kutu da genişliyor, boşluk kalmıyor.
            Yalnızca lg ve üstü: mobilde burada yer yok, orada kutu ilan
            listesinin başında duruyor.
          */}
          {onSearchChange && userRole === 'student' && activeTab !== 'company-portal' && (
            <div className="hidden lg:block flex-1 min-w-0 max-w-xl mx-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => {
                    // Arama yapan kişi ilan listesini görmek istiyor.
                    if (activeTab !== 'internships') setActiveTab('internships');
                  }}
                  placeholder="Pozisyon, şirket veya burs ara"
                  aria-label="İlan veya burs ara"
                  className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/80 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* Sağ taraf: rol değiştirici ve profil */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
            {/*
              Auth Buttons or User Profile / Logout
              onOpenLogin/onOpenRegister verilmediyse kayıt akışı henüz hazır
              değil demektir; çalışmayan düğme göstermek yerine hiç çizmiyoruz.
            */}
            {!isLoggedIn ? (
              onOpenLogin || onOpenRegister ? (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/*
                  İŞVEREN KAPISI

                  Şirket tarafına giden tek bağlantı alt bilginin en altındaydı;
                  "şirketim nasıl profil açar" sorusunun cevabı üst menüde hiç
                  görünmüyordu. Burada duruyor ve gerçek akışın adıyla:
                  sayfa şirket sayfasını sahiplenmeyi anlatıyor.
                */}
                <button
                  id="header-employer-btn"
                  onClick={() => onOpenEmployer?.()}
                  className="hidden sm:inline-flex px-2.5 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:text-blue-700 hover:bg-gray-100 transition-all cursor-pointer whitespace-nowrap"
                >
                  İşveren misiniz?
                </button>
                <button
                  id="header-login-btn"
                  onClick={onOpenLogin}
                  className="px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-bold text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all cursor-pointer whitespace-nowrap"
                >
                  Giriş Yap
                </button>
                <button
                  id="header-register-btn"
                  onClick={onOpenRegister}
                  className="px-3 sm:px-4.5 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  Kayıt Ol
                </button>
              </div>
              ) : null
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Messages / Notifications Envelope Icon */}
                <button
                  id="header-messages-btn"
                  type="button"
                  onClick={() => {
                    if (userRole === 'student') {
                      setActiveTab('applications');
                      setActiveSubTab('all');
                    } else {
                      setActiveTab('company-portal');
                      setActiveSubTab('all_candidates');
                    }
                  }}
                  title="Mesajlar ve Bildirimler"
                  className="p-1.5 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer rounded-lg hover:bg-gray-100"
                >
                  <Mail className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                </button>

                {/*
                  GÜVENLİK AĞI: profil herhangi bir sebeple yüklenemezse
                  (ağ hatası, eksik satır, rol değişikliği) kullanıcı giriş
                  yapmış halde kilitli kalmasın diye tek başına bir çıkış
                  düğmesi çiziliyor. Bu bir kez gerçekten yaşandı: hesap
                  yönetici yapılınca öğrenci profili yüklenmedi ve menüyle
                  birlikte çıkış düğmesi de kayboldu.
                */}
                {userRole === 'student' && !activeStudent && onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                    title="Çıkış yap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Çıkış</span>
                  </button>
                )}

                {/* User Profile Navigation & Account Menu (Student) */}
                {userRole === 'student' && activeStudent && (
                  <div className="relative shrink-0">
                    <button
                      id="user-profile-menu-btn"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-2 sm:gap-2.5 py-1.5 px-2 sm:px-3 rounded-2xl text-gray-800 hover:bg-gray-50 border border-gray-200 transition-all text-left cursor-pointer select-none shadow-2xs"
                      title="Hesap Menüsü"
                    >
                      {/*
                        Başvuru sayacı buraya taşındı. Eskiden "Özgeçmiş &
                        Profil" sekmesinin üstündeydi; o sekme kaldırılınca
                        masaüstünde sayaç görünecek hiçbir yer kalmıyordu.
                        Mobil alt menüde zaten avatarın üstünde duruyor.
                      */}
                      <span className="relative shrink-0">
                        <Avatar
                          name={activeStudent.fullName}
                          url={activeStudent.avatarUrl || undefined}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full ring-1 ring-gray-200 text-xs"
                        />
                        {applicationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-2xs">
                            {applicationsCount}
                          </span>
                        )}
                      </span>
                      {/*
                        İki satır: ad ve altında okul. Düğmeye hacim vermek için
                        boşluk büyütmek yerine bilgi eklendi — kullanıcı hangi
                        hesapla girdiğini tek bakışta görüyor. Dar ekranda
                        yalnızca avatar kalıyor.
                      */}
                      <span className="hidden md:flex flex-col min-w-0 max-w-[11rem] leading-tight">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {activeStudent.fullName}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate">
                          {activeStudent.university || 'Öğrenci'}
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-600 transition-transform duration-150 shrink-0 ${
                          profileDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200/90 py-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* Top Profile Header */}
                        <div className="px-4 pb-3 flex items-center gap-3">
                          <Avatar
                            name={activeStudent.fullName}
                            url={activeStudent.avatarUrl || undefined}
                            className="w-11 h-11 rounded-full shrink-0 ring-1 ring-blue-500/30 text-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-gray-900 truncate leading-tight">
                              {activeStudent.fullName}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {activeStudent.university}
                            </p>
                            <span className="inline-block text-[10px] font-bold text-blue-600 mt-0.5">
                              {activeStudent.department}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-1"/>

                        {/* Menu Options */}
                        <div className="py-1 text-xs text-gray-800 font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('profile');
                              setActiveSubTab('all');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>Öğrenci Profilim & CV</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('applications');
                              setActiveSubTab('all');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Send className="w-3.5 h-3.5 text-gray-400" />
                            <span>Başvurularım ({applicationsCount})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('badges');
                              setActiveSubTab('all');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Award className="w-3.5 h-3.5 text-gray-400" />
                            <span>Rozetlerim & Testler</span>
                          </button>
                        </div>

                        {isAdmin && onOpenAdmin && (
                          <>
                            <div className="border-t border-gray-100 my-1"/>
                            <div className="px-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenAdmin();
                                  setProfileDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                              >
                                <Settings className="w-3.5 h-3.5" />
                                <span>Yönetim paneli</span>
                              </button>
                            </div>
                          </>
                        )}

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-1"/>

                        {/* Logout Option */}
                        <div className="px-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              onLogout?.();
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Çıkış Yap</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Company Account Menu */}
                {userRole === 'company' && activeCompany && (
                  <div className="relative shrink-0">
                    <button
                      id="company-account-menu-btn"
                      onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                      className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded-xl text-gray-800 hover:bg-gray-100/80 border border-gray-200/80 transition-all text-left cursor-pointer select-none shadow-2xs"
                      title="Şirket Hesabı Menüsü"
                    >
                      <img
                        src={activeCompany.logo}
                        alt={activeCompany.name}
                        className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-gray-200 bg-white"
                      />
                      <div className="hidden md:block min-w-0 max-w-[140px] leading-tight">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-gray-900 truncate">
                            {activeCompany.name}
                          </span>
                          {activeCompany.verified && (
                            <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0"/>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 truncate block">
                          {activeCompany.recruiterName.split(' ')[0]} (İK)
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-150 shrink-0 ${
                          companyDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {companyDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200/90 py-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* Top Active Company Card */}
                        <div className="px-4 pb-3 flex items-center gap-3">
                          <img
                            src={activeCompany.logo}
                            alt={activeCompany.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-gray-200 bg-white shadow-2xs"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-extrabold text-gray-900 truncate">
                                {activeCompany.name}
                              </p>
                              {activeCompany.verified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0"/>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">
                              {activeCompany.industry}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md mt-1">
                              {activeCompany.recruiterName} • {activeCompany.recruiterRole}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-2"/>

                        {/* Company Portal Navigation Links */}
                        <div className="py-1 text-xs text-gray-800 font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('company-portal');
                              setActiveSubTab('applicants');
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Inbox className="w-3.5 h-3.5 text-blue-600"/>
                            <span>İlana Başvuranlar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('company-portal');
                              setActiveSubTab('all_candidates');
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span>Aday Havuzu & Eşleşmeler</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('company-portal');
                              setActiveSubTab('kanban');
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Columns className="w-3.5 h-3.5 text-gray-400" />
                            <span>Kanban Süreç Panosu</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('company-portal');
                              setActiveSubTab('post_new');
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2 text-blue-600 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5 text-blue-600"/>
                            <span>+ Yeni İlan Yayınla</span>
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-2"/>

                        {/* Logout Option */}
                        <div className="px-2">
                          <button
                            type="button"
                            onClick={() => {
                              onLogout?.();
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Şirket Portalından Çıkış Yap</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Contextual Sub-Menu Bar (for Student views) */}
        {subMenuItems.length > 0 && (
          <div className="relative border-t border-gray-100 flex items-center py-2 group/subnav">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-2 hidden sm:inline">
              {/* Şu an hiçbir sekme alt menü üretmiyor; şerit de çizilmiyor. */}
            </span>

            {/* Left Scroll Arrow */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollByAmount(-220)}
                className="absolute left-0 z-10 p-1.5 rounded-full bg-white/95 shadow-md border border-gray-200 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-all cursor-pointer"
                title="Sola Kaydır"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Horizontal Scrollable container with overflow-x: auto and touch-action: pan-x */}
            <div
              ref={subMenuScrollRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onScroll={checkScrollState}
              /*
                min-w-0 şart: flex öğelerinin varsayılan min-width'i `auto`,
                yani içerikten daha dar olmayı reddediyorlar. Bu yüzden
                overflow-x-auto olmasına rağmen kutu içerik kadar genişliyor,
                taşma dışarı vuruyor ve mobil tarayıcı tüm sayfayı
                küçültüyordu. (375px ekranda belge 500px oluyordu.)
              */
              className={`flex items-center gap-2 overflow-x-auto py-1 no-scrollbar select-none cursor-grab active:cursor-grabbing w-full min-w-0 ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
              style={{
                touchAction: 'pan-x',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
              }}
            >
              {subMenuItems.map((item) => {
                const isActive = activeSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`submenu-tab-${item.id}`}
                    onClick={() => setActiveSubTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        :'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Arrow */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollByAmount(220)}
                className="absolute right-0 z-10 p-1.5 rounded-full bg-white/95 shadow-md border border-gray-200 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-all cursor-pointer"
                title="Sağa Kaydır"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>

    {/*
      ALT MENÜDE SEÇİLİ ÖĞE

      Adres sekmeden önce geliyor: /rehber, /bolum/... ve /araclar birer
      sayfa, sekme değil. Bunlara girildiğinde activeTab hâlâ 'internships'
      kalıyordu ve alt menüde "İlanlar" mavi duruyordu — kullanıcı
      rehberdeyken ilanlarda görünüyordu.

      Profil ve ilanlar hâlâ sekmeyle belirleniyor; onlar gerçekten sekme.
    */}
    {/*
      ALT MENÜ: YÜZEN KAPSÜL

      Ekranın dibine yapışık şerit yerine kenarlardan boşluklu, tam yuvarlak
      köşeli bir çubuk. Seçili öğe açık mavi bir hapın içinde duruyor.

      YAZI YALNIZ SEÇİLİ ÖĞEDE
      Her öğede yazı dururken beş sekme 375 piksellik ekranda sıkışıyordu.
      Seçili olanın yazısı görünüyor, diğerleri yalnız ikon — hangi sayfada
      olduğun zaten seçili olanda yazılı.
    */}
    {/* Mobile Bottom Navigation Bar (Rendered outside header to avoid backdrop-filter containing block issues) */}
    {userRole === 'student' ? (
      <nav
        aria-label="Mobil Alt Navigasyon"
        className={altMenuClass}
        style={altMenuStil}
      >
        {/* 1. İlanlar */}
        <button
          onClick={() => {
            setActiveTab('internships');
            setActiveSubTab('all');
          }}
          className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full transition-all cursor-pointer relative ${
            ilanlardaMi ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <Briefcase className="w-5 h-5" />
            {ilanlardaMi && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-600"/>
            )}
          </div>
          {ilanlardaMi && <span className="text-[11px] font-bold truncate">İlanlar</span>}
        </button>

        {/*
          MOBİL ALT BAR = MASAÜSTÜ SEKMELERİ

          Eskiden burada dört sekme vardı: İlanlar, Yetenekler, Başvurularım,
          Profil. Masaüstünde ise Yetenekler profile taşınmış, Başvurularım da
          öyle. İki taraf ayrı yapıdaydı; aynı sitede telefonla ve bilgisayarla
          gezen kişi farklı bir uygulama görüyordu.

          Artık ikisi de aynı: İlanlar · Burs · Rehber · (Profil / İşveren).
        */}

        {/* 2. Burs — masaüstündeki "Burs İlanları" sekmesinin karşılığı */}
        <button
          onClick={() => onOpenOpportunities?.()}
          className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full transition-all cursor-pointer relative ${
            firsatlardaMi ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <Sparkles className="w-5 h-5" />
            {firsatlardaMi && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-600" />
            )}
          </div>
          {firsatlardaMi && <span className="text-[11px] font-bold truncate">Burs</span>}
        </button>

        {/*
          3. Rehber — giriş şartı yok, herkese açık.

          `!isverendeMi`: işveren rehberi masaüstünde "Rehber" başlığının
          altında sayılıyor, ama alt barda İşveren'in kendi öğesi var. İkisi
          birden yanarsa hangisinde olunduğu belirsiz kalıyor.
        */}
        <button
          onClick={() => onOpenGuides?.()}
          className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full transition-all cursor-pointer relative ${
            rehberdeMi && !isverendeMi ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <BookOpen className="w-5 h-5" />
            {rehberdeMi && !isverendeMi && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-600" />
            )}
          </div>
          {rehberdeMi && !isverendeMi && <span className="text-[11px] font-bold truncate">Rehber</span>}
        </button>

        {/*
          İŞVEREN KAPISI (yalnızca giriş yapılmamışken)

          Telefonda şirket tarafına giden tek bağlantı alt bilginin dibindeydi.
          Üst çubuktaki "İşveren misiniz?" düğmesi dar ekranda gizli olduğu
          için mobil ziyaretçi hiç göremiyordu. Giriş yapılınca yerini Profil
          alıyor: alt barda dörtten fazla öğe sıkışık duruyor.
        */}
        {!isLoggedIn && (
          <button
            id="mobil-isveren-btn"
            onClick={() => onOpenEmployer?.()}
            className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full transition-all cursor-pointer relative ${
              isverendeMi ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className="relative">
              <Building2 className="w-5 h-5" />
              {isverendeMi && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-600" />
              )}
            </div>
            {isverendeMi && <span className="text-[11px] font-bold truncate">İşveren</span>}
          </button>
        )}

        {isLoggedIn && (
          <>
        {/* 4. Profil — başvuru sayacı burada */}
        <button
          onClick={() => {
            setActiveTab('profile');
            setActiveSubTab('all');
          }}
          className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full transition-all cursor-pointer relative ${
            profildeMi
              ? 'bg-blue-50 text-blue-700 font-bold'
              :'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <UserCheck className="w-5 h-5" />
            {applicationsCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 bg-teal-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full leading-none shadow-xs">
                {applicationsCount}
              </span>
            ) : (
              profildeMi && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-500" />
              )
            )}
          </div>
          {profildeMi && <span className="text-[11px] font-bold truncate">Profil</span>}
        </button>
          </>
        )}

      </nav>
    ) : (
      /* Mobile Bottom Navigation for Company */
      <nav
        aria-label="Mobil Alt Şirket Navigasyon"
        className={altMenuClass}
        style={altMenuStil}
      >
        <button
          onClick={() => {
            setActiveTab('company-portal');
            setActiveSubTab('all_candidates');
          }}
          className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full transition-all cursor-pointer relative ${
            activeSubTab === 'all_candidates' || activeSubTab === 'all'
              ? 'bg-blue-50 text-blue-700 font-bold'
              :'text-gray-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px] font-bold truncate">Adaylar</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('company-portal');
            setActiveSubTab('top_matches');
          }}
          className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full transition-all cursor-pointer relative ${
            activeSubTab === 'top_matches'
              ?'text-orange-600 font-bold'
              :'text-gray-500'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[11px] font-bold truncate">%80+ Uyum</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('company-portal');
            setActiveSubTab('kanban');
          }}
          className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full transition-all cursor-pointer relative ${
            activeSubTab === 'kanban'
              ?'text-purple-600 font-bold'
              :'text-gray-500'
          }`}
        >
          <Columns className="w-5 h-5" />
          <span className="text-[11px] font-bold truncate">Kanban</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('company-portal');
            setActiveSubTab('post_new');
          }}
          className="flex items-center justify-center gap-1.5 flex-1 min-w-0 h-11 px-2 rounded-full bg-blue-50 text-blue-700 font-bold cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[11px] font-bold truncate">İlan Ekle</span>
        </button>
      </nav>
    )}
  </>
  );
};
