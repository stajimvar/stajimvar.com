import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Star,
  Award,
  Zap,
  ChevronLeft,
  ChevronRight,
  Send,
  Building2,
  Calendar,
  Users,
} from 'lucide-react';
import { InternshipListing, StudentProfile, MatchBreakdown, ApplicationRecord } from '../types';
import { calculateInternshipMatch } from '../utils/matchingEngine';
import { InternshipCard } from './InternshipCard';
import { GoogleAdBanner } from './GoogleAdBanner';

interface MatchedInternshipsViewProps {
  student: StudentProfile;
  allListings: InternshipListing[];
  applications: ApplicationRecord[];
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onViewDetails: (listing: InternshipListing, match: MatchBreakdown) => void;
  onQuickApply: (listing: InternshipListing, match: MatchBreakdown) => void;
}

export const MatchedInternshipsView: React.FC<MatchedInternshipsViewProps> = ({
  student,
  allListings,
  applications,
  subTab = 'all',
  onSubTabChange,
  onViewDetails,
  onQuickApply,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('all');
  const [onlyMandatory, setOnlyMandatory] = useState<boolean>(false);
  const [onlyPaid, setOnlyPaid] = useState<boolean>(false);
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<
    | 'match'
    | 'core_skills'
    | 'applicants_asc'
    | 'applicants_desc'
    | 'deadline_asc'
    | 'rating_desc'
    | 'paid_first'
    | 'company_asc'
    | 'company_desc'
    | 'city_asc'
  >('match');

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const listingCategories = [
    { id: 'all', label: 'Tüm İlanlar & Eşleşmeler' },
    { id: 'high_match', label: 'Bana Özel En Yüksek Uyum (%80+)' },
    { id: 'public_sector', label: 'Kamu Stajları (Ulusal Staj / Bakanlıklar) ⭐' },
    { id: 'global', label: 'Yurtdışı / Global Stajlar (Erasmus+ / Remote Global) ⭐' },
    { id: 'mandatory_sgk', label: 'Zorunlu Staj (SGK Onaylı)' },
    { id: 'remote_hybrid', label: 'Uzaktan & Hibrit' },
    { id: 'paid', label: 'Maaşlı / Burslu' },
  ];

  const checkCategoryScroll = () => {
    const el = categoryScrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  useEffect(() => {
    checkCategoryScroll();
    window.addEventListener('resize', checkCategoryScroll);
    return () => window.removeEventListener('resize', checkCategoryScroll);
  }, []);

  const scrollCategory = (amount: number) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkCategoryScroll, 200);
    }
  };

  // Compute all matches
  const matchedData = useMemo(() => {
    return allListings.map((listing) => {
      const match = calculateInternshipMatch(student, listing);
      const hasApplied = applications.some((app) => app.listingId === listing.id);
      return {
        listing,
        match,
        hasApplied,
      };
    });
  }, [student, allListings, applications]);

  // Filter & sort
  const filteredListings = useMemo(() => {
    return matchedData
      .filter(({ listing, match }) => {
        // Contextual Sub-Menu Filter from Top Header
        if (subTab === 'high_match' && match.overallScore < 80) {
          return false;
        }
        if (subTab === 'public_sector') {
          const isPublic =
            listing.category === 'public_sector' ||
            listing.companyIndustry.toLowerCase().includes('kamu') ||
            listing.companyIndustry.toLowerCase().includes('ulusal') ||
            listing.companyIndustry.toLowerCase().includes('bakanlık') ||
            listing.title.toLowerCase().includes('ulusal staj') ||
            listing.companyName.toLowerCase().includes('bakanlığı') ||
            listing.companyName.toLowerCase().includes('cumhurbaşkanlığı');
          if (!isPublic) return false;
        }
        if (subTab === 'global') {
          const isGlobal =
            listing.category === 'global' ||
            listing.companyIndustry.toLowerCase().includes('erasmus') ||
            listing.companyIndustry.toLowerCase().includes('global') ||
            listing.title.toLowerCase().includes('erasmus') ||
            listing.title.toLowerCase().includes('global') ||
            listing.city.toLowerCase().includes('almanya') ||
            listing.city.toLowerCase().includes('berlin');
          if (!isGlobal) return false;
        }
        if (subTab === 'mandatory_sgk' && !listing.mandatoryStajAccepted) {
          return false;
        }
        if (subTab === 'remote_hybrid' && listing.workType !== 'Remote' && listing.workType !== 'Hybrid') {
          return false;
        }
        if (subTab === 'paid' && !listing.stipend.isPaid) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = listing.title.toLowerCase().includes(q);
          const matchCompany = listing.companyName.toLowerCase().includes(q);
          const matchCity = listing.city.toLowerCase().includes(q);
          const matchSkills = listing.requiredSkills.some((s) => s.toLowerCase().includes(q));
          if (!matchTitle && !matchCompany && !matchCity && !matchSkills) {
            return false;
          }
        }

        // Work type
        if (selectedWorkType !== 'all' && listing.workType !== selectedWorkType) {
          return false;
        }

        // Mandatory
        if (onlyMandatory && !listing.mandatoryStajAccepted) {
          return false;
        }

        // Paid
        if (onlyPaid && !listing.stipend.isPaid) {
          return false;
        }

        // Min match score
        if (match.overallScore < minMatchScore) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match') {
          return b.match.overallScore - a.match.overallScore;
        }
        if (sortBy === 'core_skills') {
          return b.match.coreSkillsMatchScore - a.match.coreSkillsMatchScore;
        }
        if (sortBy === 'applicants_asc') {
          return a.listing.applicantsCount - b.listing.applicantsCount;
        }
        if (sortBy === 'applicants_desc') {
          return b.listing.applicantsCount - a.listing.applicantsCount;
        }
        if (sortBy === 'deadline_asc') {
          return new Date(a.listing.applicationDeadline).getTime() - new Date(b.listing.applicationDeadline).getTime();
        }
        if (sortBy === 'rating_desc') {
          return b.listing.companyRating - a.listing.companyRating;
        }
        if (sortBy === 'paid_first') {
          const aPaid = a.listing.stipend.isPaid ? 1 : 0;
          const bPaid = b.listing.stipend.isPaid ? 1 : 0;
          if (bPaid !== aPaid) return bPaid - aPaid;
          return b.match.overallScore - a.match.overallScore;
        }
        if (sortBy === 'company_asc') {
          return a.listing.companyName.localeCompare(b.listing.companyName, 'tr');
        }
        if (sortBy === 'company_desc') {
          return b.listing.companyName.localeCompare(a.listing.companyName, 'tr');
        }
        if (sortBy === 'city_asc') {
          return a.listing.city.localeCompare(b.listing.city, 'tr');
        }
        return 0;
      });
  }, [
    matchedData,
    searchQuery,
    selectedWorkType,
    onlyMandatory,
    onlyPaid,
    minMatchScore,
    sortBy,
  ]);

  const topMatch = matchedData.sort((a, b) => b.match.overallScore - a.match.overallScore)[0];

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Clean Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Hero Search Column */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <header className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
              <span>Yetenek Odaklı Akıllı Kariyer Platformu</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
              Geleceğine giden en kısa yol <span className="text-blue-600 dark:text-blue-400">yeteneklerinde</span>{' '}
              <span className="text-gray-900 dark:text-white">gizli.</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Yeteneklerini listele, algoritma seni en uygun staj ve iş pozisyonlarıyla eşleştirsin. Sadece başvuru yapma, doğrudan şirketlerden mülakat daveti al.
            </p>

            {/* Clean Blue/White Search Input Box */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2 p-2 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 focus-within:border-blue-600 dark:focus-within:border-blue-500 rounded-2xl shadow-xs transition-colors">
              <div className="flex-1 flex items-center px-3 gap-2.5">
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Yeteneklerin veya şirket: Python, React, İstanbul..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full outline-none text-xs sm:text-sm font-medium bg-transparent text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 font-semibold"
                  >
                    Temizle
                  </button>
                )}
              </div>
              <button
                onClick={() => {}}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Eşleşmeleri Bul</span>
              </button>
            </div>
          </header>

          {/* Quick Metrics Bar (Semantic Colors: Blue count, Orange match score %, Green SGK) */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/90 dark:border-slate-800 shadow-xs">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                Eşleşen İlan
              </p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {filteredListings.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/90 dark:border-slate-800 shadow-xs">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                Zirve Uyum
              </p>
              <p className="text-2xl font-black text-orange-500 dark:text-orange-400 mt-0.5">
                %{topMatch ? topMatch.match.overallScore : 98}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/90 dark:border-slate-800 shadow-xs">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                Zorunlu Staj
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                %100 SGK
              </p>
            </div>
          </div>
        </div>

        {/* Right Candidate Card (Clean White & Slate Theme) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 text-gray-900 dark:text-slate-100 relative overflow-hidden flex flex-col justify-between shadow-xs border border-gray-200 dark:border-slate-800">
          <div className="relative z-10 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full">
                  Canlı Aday Kartı
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
                  {student.university.split(' ')[0]}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mt-2 mb-1 text-gray-900 dark:text-white">
                Hoş geldin, {student.fullName.split(' ')[0]}!
              </h2>
              <p className="text-gray-600 dark:text-slate-300 text-xs sm:text-sm">
                Profilin şu an <strong className="text-emerald-600 dark:text-emerald-400 font-bold">%85 tamamlanmış</strong> durumda.
              </p>
            </div>

            {/* Approved Skills (Emerald Green for verified skills) */}
            <div>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-widest font-bold mb-2.5">
                Onaylanmış Yeteneklerin
              </p>
              <div className="flex flex-wrap gap-2">
                {student.skills.slice(0, 4).map((sk) => (
                  <span
                    key={sk.name}
                    className="bg-emerald-50 dark:bg-emerald-950/40 text-xs px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{sk.name}</span>
                  </span>
                ))}
                <span className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded-xl font-bold text-white transition-colors cursor-default shadow-xs">
                  +{student.skills.length > 4 ? student.skills.length - 4 : 'Ekle'}
                </span>
              </div>
            </div>

            {/* Incoming Status / Best Match Insight (Orange for match metrics) */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
              <p className="text-[10px] text-orange-700 dark:text-orange-400 uppercase tracking-widest font-bold mb-2">
                Algoritma Önerisi
              </p>
              <div className="bg-orange-50/70 dark:bg-orange-950/30 rounded-2xl p-4 border border-orange-200/80 dark:border-orange-800/40">
                {topMatch ? (
                  <>
                    <p className="text-xs font-bold text-gray-900 dark:text-slate-100 flex items-center justify-between">
                      <span className="truncate pr-2">{topMatch.listing.companyName} • {topMatch.listing.title}</span>
                      <span className="text-orange-600 dark:text-orange-400 font-black shrink-0">%{topMatch.match.overallScore}</span>
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {topMatch.match.summaryInsight || 'Yetenekleriniz pozisyonla yüksek oranda örtüşüyor.'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    Becerilerinize göre gerçek zamanlı staj eşleştirmeleri listeleniyor.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Filters & Controls Bar (Unified & Mobile-Optimized) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-5 border border-gray-200 dark:border-slate-800 shadow-xs space-y-3 sm:space-y-4">
        {/* Row 1: İLAN FİLTRELERİ */}
        <div className="relative flex items-center">
          {/* Left Scroll Button (Desktop only) */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollCategory(-200)}
              className="hidden md:flex absolute -left-2 z-10 p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:text-blue-600 transition-all cursor-pointer"
              title="Sola Kaydır"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Categories Horizontal Scroll with smooth touch panning */}
          <div
            ref={categoryScrollRef}
            onScroll={checkCategoryScroll}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 w-full select-none overscroll-x-contain"
            style={{
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
            }}
          >
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden lg:inline">
              İlan Filtreleri:
            </span>
            {listingCategories.map((cat) => {
              const isActive = (subTab || 'all') === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSubTabChange?.(cat.id)}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold ring-1 ring-blue-600'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/80 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button (Desktop only) */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollCategory(200)}
              className="hidden md:flex absolute -right-2 z-10 p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:text-blue-600 transition-all cursor-pointer"
              title="Sağa Kaydır"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-slate-800" />

        {/* Row 2: ÇALIŞMA TÜRÜ + ONAY KUTULARI + SIRALAMA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0.5">
          {/* Work type filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Çalışma:
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {['all', 'Remote', 'Hybrid', 'On-site'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedWorkType(type)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedWorkType === type
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200/80 dark:hover:bg-slate-700'
                  }`}
                >
                  {type === 'all'
                    ? 'Tümü'
                    : type === 'Remote'
                    ? 'Uzaktan'
                    : type === 'Hybrid'
                    ? 'Hibrit'
                    : 'Ofis'}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes & Sort Container */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={onlyMandatory}
                  onChange={(e) => setOnlyMandatory(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Zorunlu Staj</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={onlyPaid}
                  onChange={(e) => setOnlyPaid(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Ücretli</span>
              </label>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-gray-400 dark:text-slate-400 font-semibold shrink-0 text-xs">Sırala:</span>
              <select
                id="internships-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 sm:flex-initial text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
              >
                <option value="match">En Yüksek Uyum</option>
                <option value="deadline_asc">Son Başvuru Tarihi</option>
                <option value="applicants_desc">En Çok Başvuran</option>
                <option value="rating_desc">Şirket Puanı</option>
                <option value="company_asc">Şirket Adı (A - Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Listings Layout (Geniş Liste) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Listings & In-Feed Native Ads */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">
              Sana Uygun Staj İlanları ({filteredListings.length})
            </h2>
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Gerçek zamanlı eşleşme puanına göre sıralı
            </span>
          </div>

          {filteredListings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <p className="text-base font-bold text-gray-900 dark:text-white">
                Seçilen filtrelere uygun staj ilanı bulunamadı.
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                Filtreleri sıfırlayarak veya arama teriminizi değiştirerek tüm fırsatları görebilirsiniz.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedWorkType('all');
                  setOnlyMandatory(false);
                  setOnlyPaid(false);
                }}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredListings.map(({ listing, match, hasApplied }, index) => (
                <React.Fragment key={listing.id}>
                  {/* Internship Card */}
                  <InternshipCard
                    listing={listing}
                    match={match}
                    hasApplied={hasApplied}
                    onViewDetails={() => onViewDetails(listing, match)}
                    onQuickApply={() => onQuickApply(listing, match)}
                  />

                  {/* 1st In-Feed Native Google Ad (After 2nd listing) */}
                  {index === 1 && (
                    <GoogleAdBanner
                      format="in-feed"
                      adIndex={0}
                      adCategory="education"
                      showInspectorButton={true}
                    />
                  )}

                  {/* 2nd In-Feed Native Google Ad (After 5th listing if long list) */}
                  {index === 4 && filteredListings.length > 5 && (
                    <GoogleAdBanner
                      format="in-feed"
                      adIndex={1}
                      adCategory="language"
                      showInspectorButton={true}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Sidebar with Google Ad & Career Highlights */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          {/* Main Sidebar Responsive Google Ad */}
          <GoogleAdBanner
            format="sidebar-rectangle"
            adIndex={2}
            adCategory="tech"
            showInspectorButton={true}
          />

          {/* Erasmus & Global Staj Opportunity Card */}
          <GoogleAdBanner
            format="sidebar-rectangle"
            adIndex={3}
            adCategory="career"
            showInspectorButton={true}
          />

          {/* Quick Helper Badge Box */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-4 border border-indigo-100 dark:border-slate-700 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Yetenek Rozetleri ile %80 Daha Hızlı Kabul</span>
            </div>
            <p className="text-gray-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Şirketler, doğrulanmış yetenek rozetine sahip adayların başvurularını mülakat listesinde en üste alır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
