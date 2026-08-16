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
  Moon,
  Sun,
  Settings,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Mail,
  Users,
  Columns,
  Plus,
  Inbox,
} from 'lucide-react';
import { StudentProfile, CompanyAccount } from '../types';
import { Logo } from './Logo';

interface HeaderProps {
  activeTab: 'internships' | 'badges' | 'applications' | 'profile' | 'company-portal';
  setActiveTab: (
    tab: 'internships' | 'badges' | 'applications' | 'profile' | 'company-portal'
  ) => void;
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  userRole: 'student' | 'company';
  setUserRole: (role: 'student' | 'company') => void;
  activeStudent: StudentProfile;
  allStudents?: StudentProfile[];
  onSelectStudent?: (student: StudentProfile) => void;
  activeCompany?: CompanyAccount;
  allCompanies?: CompanyAccount[];
  onSelectCompany?: (companyId: string) => void;
  applicationsCount: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeSubTab,
  setActiveSubTab,
  userRole,
  setUserRole,
  activeStudent,
  allStudents,
  onSelectStudent,
  activeCompany,
  allCompanies = [],
  onSelectCompany,
  applicationsCount,
  isDarkMode = false,
  onToggleDarkMode,
  isLoggedIn = true,
  onOpenLogin,
  onOpenRegister,
  onLogout,
}) => {
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
        return [
          { id: 'all', label: 'Tüm Yetenek Testleri' },
          { id: 'hard_skills', label: '🛠️ Teknik & Mesleki Yetenekler' },
          { id: 'soft_skills', label: '🤝 Sosyal & Kişisel Beceriler' },
          { id: 'languages', label: '🌐 Yabancı Diller' },
          { id: 'earned', label: `Kazanılan Rozetler (${activeStudent?.earnedBadges?.length || 0})` },
        ];
      case 'profile':
        return [
          { id: 'all', label: 'Genel Bakış' },
          { id: 'skills', label: 'Yeteneklerim & Beceriler' },
          { id: 'projects', label: 'Projelerim & Portfolyo' },
          { id: 'preferences', label: 'Staj Tercihlerim & SGK' },
          { id: 'badges', label: 'Doğrulanmış Rozetler' },
        ];
      default:
        return [];
    }
  };

  const subMenuItems = getSubMenuItems();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
        <div className="max-w-[1536px] mx-auto px-2.5 sm:px-6 lg:px-8 xl:px-10">
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
              <nav className="hidden lg:flex items-center p-1 bg-gray-100/90 dark:bg-slate-800/80 rounded-2xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xs transition-all gap-0.5 shrink-0">
                {/* 1. İş & Staj İlanları */}
                <button
                  id="nav-tab-internships"
                  onClick={() => {
                    setActiveTab('internships');
                    setActiveSubTab('all');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeTab === 'internships'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-500/30 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Briefcase
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeTab === 'internships' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline">İş & Staj İlanları</span>
                  <span className="inline xl:hidden">İlanlar</span>
                  {activeTab === 'internships' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                  )}
                </button>

                {/*
                  Öğrenciye özel sekmeler yalnızca giriş yapılmışken çizilir.
                  Aksi halde ziyaretçi "Başvurularım" sekmesinde kendisine ait
                  sanacağı örnek verileri görüyordu.
                */}
                {isLoggedIn && (
                  <>
                {/* 2. Yetenek Doğrulama */}
                <button
                  id="nav-tab-badges"
                  onClick={() => {
                    setActiveTab('badges');
                    setActiveSubTab('all');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeTab === 'badges'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-500/30 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Award
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeTab === 'badges' ? 'text-amber-500' : 'text-gray-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline">Yetenek Doğrulama</span>
                  <span className="inline xl:hidden">Yetenekler</span>
                  {activeTab === 'badges' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  )}
                </button>

                {/* 3. Başvurularım */}
                <button
                  id="nav-tab-applications"
                  onClick={() => {
                    setActiveTab('applications');
                    setActiveSubTab('all');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeTab === 'applications'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-500/30 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Send
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeTab === 'applications' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400'
                    }`}
                  />
                  <span>Başvurularım</span>
                  {applicationsCount > 0 && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full transition-all shrink-0 leading-none ${
                        activeTab === 'applications'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300'
                      }`}
                    >
                      {applicationsCount}
                    </span>
                  )}
                  {activeTab === 'applications' && applicationsCount === 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                  )}
                </button>

                {/* 4. Özgeçmiş & Profil */}
                <button
                  id="nav-tab-profile"
                  onClick={() => {
                    setActiveTab('profile');
                    setActiveSubTab('all');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeTab === 'profile'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-500/30 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <UserCheck
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeTab === 'profile' ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline">Özgeçmiş & Profil</span>
                  <span className="inline xl:hidden">Profil</span>
                  {activeTab === 'profile' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                  )}
                </button>
                  </>
                )}

              </nav>
            )}

            {/* Desktop Company Navigation Bar - Simple & Clean matching Student Navbar */}
            {(userRole === 'company' || activeTab === 'company-portal') && (
              <nav className="hidden lg:flex items-center p-1 bg-gray-100/90 dark:bg-slate-800/80 rounded-2xl border border-gray-200/90 dark:border-slate-700/80 shadow-2xs transition-all gap-0.5 shrink-0">
                {/* 1. İlana Başvuranlar */}
                <button
                  id="nav-company-applicants"
                  onClick={() => {
                    setActiveTab('company-portal');
                    setActiveSubTab('applicants');
                  }}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    activeSubTab === 'applicants'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-500/30 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Inbox
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeSubTab === 'applicants'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline">İlana Başvuranlar</span>
                  <span className="inline xl:hidden">Başvuranlar</span>
                  {activeSubTab === 'applicants' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
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
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-500/30 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Users
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeSubTab === 'all_candidates' || activeSubTab === 'all'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline">Eşleşen Aday Havuzu</span>
                  <span className="inline xl:hidden">Aday Havuzu</span>
                  {(activeSubTab === 'all_candidates' || activeSubTab === 'all') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
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
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-500/30 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Columns
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeSubTab === 'kanban'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline">Kanban Süreç Panosu</span>
                  <span className="inline xl:hidden">Kanban Panosu</span>
                  {activeSubTab === 'kanban' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 shrink-0" />
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
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-500/30 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Plus
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      activeSubTab === 'post_new'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden xl:inline">+ Yeni İlan Yayınla</span>
                  <span className="inline xl:hidden">+ Yeni İlan</span>
                  {activeSubTab === 'post_new' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                  )}
                </button>
              </nav>
            )}
          </div>

          {/* Right Action Controls: Role Switcher + Dark Theme Toggle + Profile Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
            {/* Dark Mode Toggle Button */}
            {onToggleDarkMode && (
              <button
                id="theme-toggle-btn"
                type="button"
                onClick={onToggleDarkMode}
                aria-label={isDarkMode ? 'Açık Temaya Geç' : 'Karanlık Temaya Geç'}
                title={isDarkMode ? 'Açık Tema (Clean Light)' : 'Karanlık Tema (Clean Dark)'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer shrink-0"
              >
                {isDarkMode ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-in spin-in-180 duration-200" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 animate-in spin-in-180 duration-200" />
                )}
              </button>
            )}

            {/*
              Auth Buttons or User Profile / Logout
              onOpenLogin/onOpenRegister verilmediyse kayıt akışı henüz hazır
              değil demektir; çalışmayan düğme göstermek yerine hiç çizmiyoruz.
            */}
            {!isLoggedIn ? (
              onOpenLogin || onOpenRegister ? (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  id="header-login-btn"
                  onClick={onOpenLogin}
                  className="px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-bold text-gray-700 dark:text-slate-200 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer whitespace-nowrap"
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
                  className="p-1.5 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <Mail className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                </button>

                {/* User Profile Navigation & Account Menu (Student) */}
                {userRole === 'student' && activeStudent && (
                  <div className="relative shrink-0">
                    <button
                      id="user-profile-menu-btn"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded-xl text-gray-800 dark:text-slate-100 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700/80 transition-all text-left cursor-pointer select-none shadow-2xs"
                      title="Hesap Menüsü"
                    >
                      <img
                        src={activeStudent.avatarUrl}
                        alt={activeStudent.fullName}
                        className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-slate-700"
                      />
                      <span className="hidden md:inline text-xs font-bold text-gray-900 dark:text-white truncate">
                        {activeStudent.fullName}
                      </span>
                      <ChevronDown
                        className={`w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-600 dark:text-slate-300 transition-transform duration-150 shrink-0 ${
                          profileDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200/90 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* Top Profile Header */}
                        <div className="px-4 pb-3 flex items-center gap-3">
                          <img
                            src={activeStudent.avatarUrl}
                            alt={activeStudent.fullName}
                            className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-blue-500/30"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100 truncate leading-tight">
                              {activeStudent.fullName}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                              {activeStudent.university}
                            </p>
                            <span className="inline-block text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                              {activeStudent.department}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 dark:border-slate-800 my-1" />

                        {/* Menu Options */}
                        <div className="py-1 text-xs text-gray-800 dark:text-slate-200 font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('profile');
                              setActiveSubTab('all');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center gap-2"
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
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center gap-2"
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
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Award className="w-3.5 h-3.5 text-gray-400" />
                            <span>Rozetlerim & Testler</span>
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 dark:border-slate-800 my-1" />

                        {/* Logout Option */}
                        <div className="px-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              onLogout?.();
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
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
                      className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded-xl text-gray-800 dark:text-slate-100 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700/80 transition-all text-left cursor-pointer select-none shadow-2xs"
                      title="Şirket Hesabı Menüsü"
                    >
                      <img
                        src={activeCompany.logo}
                        alt={activeCompany.name}
                        className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-gray-200 dark:ring-slate-700 bg-white"
                      />
                      <div className="hidden md:block min-w-0 max-w-[140px] leading-tight">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {activeCompany.name}
                          </span>
                          {activeCompany.verified && (
                            <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate block">
                          {activeCompany.recruiterName.split(' ')[0]} (İK)
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-gray-600 dark:text-slate-300 transition-transform duration-150 shrink-0 ${
                          companyDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {companyDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/90 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* Top Active Company Card */}
                        <div className="px-4 pb-3 flex items-center gap-3">
                          <img
                            src={activeCompany.logo}
                            alt={activeCompany.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-gray-200 dark:ring-slate-700 bg-white shadow-2xs"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100 truncate">
                                {activeCompany.name}
                              </p>
                              {activeCompany.verified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                              {activeCompany.industry}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md mt-1">
                              {activeCompany.recruiterName} • {activeCompany.recruiterRole}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 dark:border-slate-800 my-2" />

                        {/* Company Portal Navigation Links */}
                        <div className="py-1 text-xs text-gray-800 dark:text-slate-200 font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('company-portal');
                              setActiveSubTab('applicants');
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Inbox className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>İlana Başvuranlar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('company-portal');
                              setActiveSubTab('all_candidates');
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center gap-2"
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
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center gap-2"
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
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>+ Yeni İlan Yayınla</span>
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 dark:border-slate-800 my-2" />

                        {/* Logout Option */}
                        <div className="px-2">
                          <button
                            type="button"
                            onClick={() => {
                              onLogout?.();
                              setCompanyDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
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
          <div className="relative border-t border-gray-100 dark:border-slate-800 flex items-center py-2 group/subnav">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-2 hidden sm:inline">
              {activeTab === 'internships' && 'İlan Filtreleri:'}
              {activeTab === 'applications' && 'Başvuru Durumu:'}
              {activeTab === 'badges' && 'Kategori:'}
              {activeTab === 'profile' && 'Profil Bölümü:'}
            </span>

            {/* Left Scroll Arrow */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollByAmount(-220)}
                className="absolute left-0 z-10 p-1.5 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
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
              className={`flex items-center gap-2 overflow-x-auto py-1 no-scrollbar select-none cursor-grab active:cursor-grabbing w-full ${
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
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/80 dark:hover:bg-slate-700'
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
                className="absolute right-0 z-10 p-1.5 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                title="Sağa Kaydır"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>

    {/* Mobile Bottom Navigation Bar (Rendered outside header to avoid backdrop-filter containing block issues) */}
    {userRole === 'student' ? (
      <nav
        aria-label="Mobil Alt Navigasyon"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border-t border-gray-200/90 dark:border-slate-800 shadow-2xl px-2 py-1.5 flex items-center justify-around"
      >
        {/* 1. İlanlar */}
        <button
          onClick={() => {
            setActiveTab('internships');
            setActiveSubTab('all');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'internships'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <Briefcase className="w-5 h-5" />
            {activeTab === 'internships' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-semibold">İlanlar</span>
        </button>

        {/* Öğrenciye özel mobil sekmeler de giriş şartına bağlı. */}
        {isLoggedIn && (
          <>
        {/* 2. Yetenekler */}
        <button
          onClick={() => {
            setActiveTab('badges');
            setActiveSubTab('all');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'badges'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <Award className="w-5 h-5" />
            {activeTab === 'badges' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-semibold">Yetenekler</span>
        </button>

        {/* 3. Başvurularım */}
        <button
          onClick={() => {
            setActiveTab('applications');
            setActiveSubTab('all');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'applications'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <Send className="w-5 h-5" />
            {applicationsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full leading-none shadow-xs">
                {applicationsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-semibold">Başvurularım</span>
        </button>

        {/* 4. Profil */}
        <button
          onClick={() => {
            setActiveTab('profile');
            setActiveSubTab('all');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'profile'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <UserCheck className="w-5 h-5" />
            {activeTab === 'profile' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-500" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-semibold">Profil</span>
        </button>
          </>
        )}

      </nav>
    ) : (
      /* Mobile Bottom Navigation for Company */
      <nav
        aria-label="Mobil Alt Şirket Navigasyon"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border-t border-gray-200/90 dark:border-slate-800 shadow-2xl px-2 py-1.5 flex items-center justify-around"
      >
        <button
          onClick={() => {
            setActiveTab('company-portal');
            setActiveSubTab('all_candidates');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeSubTab === 'all_candidates' || activeSubTab === 'all'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-semibold">Adaylar</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('company-portal');
            setActiveSubTab('top_matches');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeSubTab === 'top_matches'
              ? 'text-orange-600 dark:text-orange-400 font-bold'
              : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-semibold">%80+ Uyum</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('company-portal');
            setActiveSubTab('kanban');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeSubTab === 'kanban'
              ? 'text-purple-600 dark:text-purple-400 font-bold'
              : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <Columns className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-semibold">Kanban</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('company-portal');
            setActiveSubTab('post_new');
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-blue-600 dark:text-blue-400 font-bold cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-semibold">İlan Ekle</span>
        </button>
      </nav>
    )}
  </>
  );
};

