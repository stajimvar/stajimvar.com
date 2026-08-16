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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Send,
  Building2,
  Calendar,
  Users,
  X,
} from 'lucide-react';
import { InternshipListing, StudentProfile, MatchBreakdown, ApplicationRecord } from '../types';
import { calculateInternshipMatch } from '../utils/matchingEngine';
import { InternshipCard } from './InternshipCard';
import { ilBul } from '../lib/sehir';
import { GoogleAdBanner } from './GoogleAdBanner';

interface MatchedInternshipsViewProps {
  /** Giriş yapılmamışsa null; o durumda uyum hesaplanmaz. */
  student: StudentProfile | null;
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
  const [selectedCity, setSelectedCity] = useState<string>('all');
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

  const allListingCategories = [
    { id: 'all', label: 'Tüm İlanlar & Eşleşmeler' },
    { id: 'high_match', label: 'Bana Özel En Yüksek Uyum (%80+)' },
    { id: 'public_sector', label: 'Kamu Stajları (Ulusal Staj / Bakanlıklar) ⭐' },
    { id: 'global', label: 'Yurtdışı / Global Stajlar (Erasmus+ / Remote Global) ⭐' },
    { id: 'mandatory_sgk', label: 'Zorunlu Staj (SGK Onaylı)' },
    { id: 'remote_hybrid', label: 'Uzaktan & Hibrit' },
    { id: 'paid', label: 'Maaşlı / Burslu' },
  ];

  /**
   * Kategori filtresi. Hem listeyi süzmek hem de her sekmenin kaç ilan
   * içerdiğini saymak için kullanılıyor — ikisi ayrı yazılsaydı sayı ile
   * sonuç birbirini tutmayabilirdi.
   */
  function matchesCategory(
    listing: InternshipListing,
    match: MatchBreakdown,
    categoryId?: string
  ): boolean {
    switch (categoryId) {
      case 'high_match':
        return match.overallScore >= 80;
      case 'public_sector':
        return (
          listing.category === 'public_sector' ||
          listing.companyIndustry.toLowerCase().includes('kamu') ||
          listing.companyIndustry.toLowerCase().includes('ulusal') ||
          listing.companyIndustry.toLowerCase().includes('bakanlık') ||
          listing.title.toLowerCase().includes('ulusal staj') ||
          listing.companyName.toLowerCase().includes('bakanlığı') ||
          listing.companyName.toLowerCase().includes('cumhurbaşkanlığı')
        );
      case 'global':
        return (
          listing.category === 'global' ||
          listing.companyIndustry.toLowerCase().includes('erasmus') ||
          listing.companyIndustry.toLowerCase().includes('global') ||
          listing.title.toLowerCase().includes('erasmus') ||
          listing.title.toLowerCase().includes('global') ||
          listing.city.toLowerCase().includes('almanya') ||
          listing.city.toLowerCase().includes('berlin')
        );
      case 'mandatory_sgk':
        return listing.mandatoryStajAccepted;
      case 'remote_hybrid':
        return listing.workType === 'Remote' || listing.workType === 'Hybrid';
      case 'paid':
        return listing.stipend.isPaid;
      default:
        return true;
    }
  }

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

  /**
   * Sekmeleri sayılarıyla göster ve boş olanları gizle.
   *
   * Tıklayınca boş sonuç veren bir sekme, az ilan görmekten daha çok güven
   * kaybettirir. Kaynak sayısı arttıkça bu sekmeler kendiliğinden geri gelir.
   * Seçili sekme boşalsa bile gizlenmiyor — yoksa kullanıcı filtreyi
   * temizleyemeden sekme kaybolurdu.
   */
  const listingCategories = useMemo(() => {
    return allListingCategories
      .map((cat) => ({
        ...cat,
        count:
          cat.id === 'all'
            ? matchedData.length
            : matchedData.filter(({ listing, match }) => matchesCategory(listing, match, cat.id))
                .length,
      }))
      .filter((cat) => cat.id === 'all' || cat.count > 0 || cat.id === subTab);
  }, [matchedData, subTab]);

  // Filter & sort
  const filteredListings = useMemo(() => {
    return matchedData
      .filter(({ listing, match }) => {
        // Contextual Sub-Menu Filter from Top Header
        if (!matchesCategory(listing, match, subTab)) return false;

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

        /*
          Şehir filtresi il düzeyinde çalışıyor. Ham konum metniyle
          karşılaştırmak "İstanbul" seçen kullanıcıya Şişli'deki ilanı
          göstermezdi — bkz. lib/sehir.ts.
        */
        if (selectedCity !== 'all') {
          const il = ilBul(listing.city);
          if (selectedCity === 'diger' ? il !== null : il !== selectedCity) {
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
    selectedCity,
    selectedWorkType,
    onlyMandatory,
    onlyPaid,
    minMatchScore,
    sortBy,
  ]);

  const topMatch = matchedData.sort((a, b) => b.match.overallScore - a.match.overallScore)[0];

  /**
   * Sayaç şeridindeki üçüncü kutu.
   *
   * Burada "Zorunlu staj: 0/11" yazıyordu ve bu YANLIŞ BİR İDDİAYDI.
   * `mandatoryStajAccepted` alanı, şirketin kariyer sayfasından toplanan
   * ilanlarda hiçbir zaman doldurulmuyor; varsayılan değeri false kalıyor.
   * Yani "0/11", "hiçbiri zorunlu staj kabul etmiyor" demek değil,
   * "hiçbirinde bu bilgi yok" demekti — ekranda ise birincisi okunuyordu.
   *
   * Yerine gerçekten bildiğimiz bir sayı var: ilan bulunan il sayısı. Yeni
   * şehir seçicisiyle de aynı şeyi ölçüyor.
   */
  const cityCount = new Set(
    filteredListings.map((item) => ilBul(item.listing.city) ?? item.listing.city)
  ).size;

  /*
    Bir filtre hiçbir ilanı getirmiyorsa gösterilmiyor.

    Kategori sekmeleri için zaten uygulanan kural: tıklayınca boş sonuç veren
    bir filtre, az ilan görmekten daha çok güven kaybettiriyor. Zorunlu staj
    ve ücret bilgisi toplanan ilanlarda çoğu zaman bulunmadığı için bu iki
    kutucuk şu an her seferinde boş liste üretiyordu.

    Kullanıcı kutucuğu işaretlemişse gizlenmiyor — yoksa filtreyi
    kapatamadan seçenek ekrandan kaybolurdu.
  */
  const mandatoryCount = matchedData.filter((item) => item.listing.mandatoryStajAccepted).length;
  const paidCount = matchedData.filter((item) => item.listing.stipend.isPaid).length;

  /**
   * Profil doldurma oranı. Eskiden sabit "%85" yazıyordu; artık gerçekten
   * dolu olan alanlardan hesaplanıyor, yoksa öğrenci hiç dokunmadığı bir
   * profil için "neredeyse bitti" mesajı görüyordu.
   */
  const profileChecks: boolean[] = student
    ? [
        Boolean(student.university),
        Boolean(student.department),
        Boolean(student.bio),
        Boolean(student.gpa),
        student.skills.length > 0,
        (student.languages?.length ?? 0) > 0,
        student.projects.length > 0,
        student.targetRoles.length > 0,
        student.preferences.cities.length > 0,
        Boolean(student.phone),
      ]
    : [];
  const profileCompletion = profileChecks.length
    ? Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100)
    : 0;

  /** İlan veren farklı şirket sayısı. Profil yokken uyum yerine bu gösteriliyor. */
  const companyCount = new Set(filteredListings.map((item) => item.listing.companyName)).size;

  /**
   * Şehir menüsü.
   *
   * Seçenekler sabit 81 il listesinden değil, elimizdeki ilanlardan üretiliyor:
   * ilanı olmayan bir ili menüye koymak, seçildiğinde boş sonuç veren bir
   * seçenek demek. Sayılar da gösteriliyor ki kullanıcı seçmeden önce ne
   * bulacağını bilsin.
   *
   * DİKKAT: sayım şehir filtresi UYGULANMADAN yapılıyor. `filteredListings`
   * üzerinden sayılsaydı bir şehir seçildiği anda diğer şehirler 0 görünür ve
   * kullanıcı geri dönemezdi.
   */
  const cityOptions = useMemo(() => {
    const sayim = new Map<string, number>();
    let bilinmeyen = 0;

    for (const { listing, match } of matchedData) {
      if (!matchesCategory(listing, match, subTab)) continue;
      const il = ilBul(listing.city);
      if (il) sayim.set(il, (sayim.get(il) ?? 0) + 1);
      else bilinmeyen += 1;
    }

    const liste = [...sayim.entries()]
      .map(([il, adet]) => ({ id: il, etiket: il, adet }))
      .sort((a, b) => b.adet - a.adet || a.etiket.localeCompare(b.etiket, 'tr'));

    if (bilinmeyen > 0) {
      liste.push({ id: 'diger', etiket: 'Diğer / belirtilmemiş', adet: bilinmeyen });
    }
    return liste;
  }, [matchedData, subTab]);

  return (
    <div className="w-full space-y-4 sm:space-y-8 pb-12">
      {/* Clean Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-stretch">
        {/*
          Left Hero Search Column
          Aday kartı yalnızca giriş yapmış öğrenciye çiziliyor. Sütun genişliği
          sabit 7/12 kalırsa kart olmadığında sağda 5 sütunluk boşluk kalıyor ve
          sayfa sola yaslanmış görünüyor.
        */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4 sm:space-y-6">
          <header className="space-y-3">
            {/*
              Buradaki "Yetenek Odaklı Akıllı Kariyer Platformu" rozeti
              kaldırıldı. Hiçbir şey anlatmayan, herkesin kendi hakkında
              yazabileceği bir cümleydi; siteyi olduğundan iddialı ve amatör
              gösteriyordu. Yerine ne yaptığımızı söyleyen bir başlık var.
            */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-gray-900">
              Staj ilanları, <span className="text-blue-600">şirketin kendi</span> sayfasından.
            </h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-xl leading-relaxed">
              Aracı sitelerde değil, şirketlerin kariyer sayfalarında yayınlanan
              staj ilanlarını topluyoruz. Kapanan ilan listeden düşer.
            </p>

            {/*
              "Eşleşmeleri Bul" düğmesi kaldırıldı: onClick'i boştu, hiçbir şey
              yapmıyordu. Liste zaten yazdıkça anında süzülüyor. Basınca hiçbir
              şey olmayan büyük mavi bir düğme, siteye olan güveni doğrudan
              zedeliyor.
            */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pozisyon, şirket veya yetenek"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Aramayı temizle"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/*
                Şehir seçici. Menüde yalnızca gerçekten ilanı olan iller var;
                seçilince boş sonuç veren bir seçenek göstermiyoruz.
              */}
              <div className="relative sm:w-56 shrink-0">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  aria-label="Şehir seç"
                  className="w-full pl-11 pr-8 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-600 transition-colors appearance-none cursor-pointer"
                >
                  <option value="all">Tüm Türkiye</option>
                  {cityOptions.map((sehir) => (
                    <option key={sehir.id} value={sehir.id}>
                      {sehir.etiket} ({sehir.adet})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </header>

          {/*
            Sayaç şeridi.

            "Zirve Uyum" kaldırıldı: en iyi eşleşmenin yüzdesini turuncu punto
            ile sayfanın tepesine yazmak, %25 gibi düşük bir değerde siteyi
            kötü gösteriyordu — üstelik bu sayı ilanların kalitesini değil,
            profilin ne kadar dolu olduğunu ölçüyor. Yerine sayılabilen ve
            doğrulanabilen üç şey var. Renk vurgusu da kalktı; üç farklı
            renkte kocaman rakam bir gösterge paneli gibi duruyordu.
          */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
            {[
              { etiket: 'Açık ilan', deger: String(filteredListings.length) },
              { etiket: 'Şirket', deger: String(companyCount) },
              { etiket: 'Şehir', deger: String(cityCount) },
            ].map((kutu) => (
              <div
                key={kutu.etiket}
                className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200"
              >
                <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
                  {kutu.deger}
                </p>
                <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                  {kutu.etiket}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/*
          Right column.
          Giriş yapmışsa aday kartı; yapmamışsa sitenin nasıl çalıştığını anlatan
          bilgi paneli. Sütunu boş bırakmak sayfayı sola yaslanmış gösteriyordu.
        */}
        {!student && (
          <aside className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-5">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              İlanlar nereden geliyor
            </span>

            <p className="text-sm text-gray-600 leading-relaxed">
              İlanları aracı sitelerden değil, <strong className="text-gray-900">şirketlerin
              kendi kariyer sistemlerinden</strong> topluyoruz. Başvurunu doğrudan
              şirketin sayfasında yapıyorsun; arada kimse yok.
            </p>

            <div className="space-y-3">
              {/*
                Yalnızca gerçekten okunabilen sayılar. "Takip edilen kaynak"
                satırı vardı ama istemci `sources` tablosunu göremiyor (RLS
                admin'e kapatıyor); sayıyı sabit yazmak uydurma olurdu.
              */}
              {[
                { etiket: 'Açık ilan', deger: String(allListings.length) },
                { etiket: 'İlan veren şirket', deger: String(companyCount) },
              ].map((satir) => (
                <div
                  key={satir.etiket}
                  className="flex items-center justify-between border-b border-gray-100 pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="text-xs text-gray-500 font-semibold">
                    {satir.etiket}
                  </span>
                  <span className="text-lg font-black text-gray-900 tabular-nums">
                    {satir.deger}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Kaynaklar saatlik taranıyor. Kapanan ilanlar listeden düşürülüyor.
            </p>
          </aside>
        )}

        {/*
          Giriş yapmış öğrencinin kartı.

          Eskiden üstünde "CANLI ADAY KARTI" yazan bir rozet, sağ köşesinde de
          `university.split(' ')[0]` vardı — "Mimar Sinan Güzel Sanatlar
          Üniversitesi" okuyan birine köşede tek başına "Mimar" yazıyordu.
          İkisi de kaldırıldı.

          Yetenek listesi "Onaylanmış Yeteneklerin" başlığıyla çiziliyor ve her
          yeteneğin yanına yeşil tik koyuyordu; oysa listede doğrulanmamışlar
          da vardı. Kendi profilinde olmayan bir onayı görmek, dil listesindeki
          uydurma kayıtlarla aynı hata. Artık yalnızca gerçekten doğrulanmış
          olanlar tikli ve yeşil.
        */}
        {student && (
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-7 flex flex-col shadow-xs border border-gray-200 space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Merhaba {student.fullName.split(' ')[0]}
            </h2>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    profileCompletion === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-500 tabular-nums shrink-0">
                %{profileCompletion}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {profileCompletion === 100
                ? 'Profilin tamam. İlanlara başvurabilirsin.'
                : 'Profilin doldukça eşleşmeler isabetlenir.'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">Yeteneklerin</p>
            {student.skills.length === 0 ? (
              <p className="text-xs text-gray-400">
                Henüz yetenek eklemedin. Profil sekmesinden ekleyebilirsin.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {student.skills.slice(0, 6).map((sk) => (
                  <span
                    key={sk.name}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${
                      sk.verified
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    title={sk.verified ? 'Testle doğrulandı' : 'Henüz doğrulanmadı'}
                  >
                    {sk.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {sk.name}
                  </span>
                ))}
                {student.skills.length > 6 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 font-semibold">
                    +{student.skills.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>

          {/*
            "Algoritma Önerisi" başlığı ve turuncu kutu gitti. Turuncu karttaki
            tek sıcak renkti, gözü oraya çekiyordu; oysa orada duran şey
            basitçe listenin en üstündeki ilan.
          */}
          {topMatch && topMatch.match.isScorable && (
            <div className="pt-4 border-t border-gray-100 space-y-1">
              <p className="text-xs font-semibold text-gray-600">Sana en yakın ilan</p>
              <p className="text-sm font-bold text-gray-900">
                {topMatch.listing.title}
              </p>
              <p className="text-xs text-gray-500">
                {topMatch.listing.companyName} · %{topMatch.match.overallScore} uyum
              </p>
            </div>
          )}
        </div>
        )}
      </section>

      {/* Clean Filters & Controls Bar (Unified & Mobile-Optimized) */}
      <div className="bg-white rounded-2xl p-3 sm:p-5 border border-gray-200 shadow-xs space-y-3 sm:space-y-4">
        {/* Row 1: İLAN FİLTRELERİ */}
        <div className="relative flex items-center">
          {/* Left Scroll Button (Desktop only) */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollCategory(-200)}
              className="hidden md:flex absolute -left-2 z-10 p-1.5 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:text-blue-600 transition-all cursor-pointer"
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
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 hidden lg:inline">
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
                      :'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80'
                  }`}
                >
                  {cat.label}
                  <span
                    className={`ml-1.5 tabular-nums ${
                      isActive ?'text-blue-100':'text-gray-400'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button (Desktop only) */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollCategory(200)}
              className="hidden md:flex absolute -right-2 z-10 p-1.5 rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:text-blue-600 transition-all cursor-pointer"
              title="Sağa Kaydır"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100"/>

        {/* Row 2: ÇALIŞMA TÜRÜ + ONAY KUTULARI + SIRALAMA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0.5">
          {/* Work type filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
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
                      :'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
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
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <div className="flex items-center gap-3">
              {(mandatoryCount > 0 || onlyMandatory) && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-gray-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={onlyMandatory}
                    onChange={(e) => setOnlyMandatory(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Zorunlu Staj</span>
                </label>
              )}

              {(paidCount > 0 || onlyPaid) && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-gray-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={onlyPaid}
                    onChange={(e) => setOnlyPaid(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Ücretli</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-gray-400 font-semibold shrink-0 text-xs">Sırala:</span>
              <select
                id="internships-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 sm:flex-initial text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-800 focus:outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
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
            {/*
              Profili olmayan ziyaretçiye "sana uygun" ve "eşleşme puanına göre
              sıralı" demek yanlış: ortada kişiselleştirme yok.
            */}
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {student ? 'Sana Uygun Staj İlanları' : 'Açık Staj İlanları'} (
              {filteredListings.length})
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              {student
                ? 'Gerçek zamanlı eşleşme puanına göre sıralı'
                : 'Şirketlerin kendi kariyer sayfalarından derlendi'}
            </span>
          </div>

          {filteredListings.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm space-y-4">
              <p className="text-base font-bold text-gray-900">
                Seçilen filtrelere uygun staj ilanı bulunamadı.
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
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
                    <GoogleAdBanner format="in-feed" />
                  )}

                  {/* 2nd In-Feed Native Google Ad (After 5th listing if long list) */}
                  {index === 4 && filteredListings.length > 5 && (
                    <GoogleAdBanner format="in-feed" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Sidebar with Google Ad & Career Highlights */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          {/* Main Sidebar Responsive Google Ad */}
          <GoogleAdBanner format="sidebar-rectangle" />

          {/* Erasmus & Global Staj Opportunity Card */}
          <GoogleAdBanner format="sidebar-rectangle" />

          {/*
            Burada "Yetenek Rozetleri ile %80 Daha Hızlı Kabul" yazıyordu ve
            altında şirketlerin rozetli adayları mülakat listesinde öne aldığı
            iddia ediliyordu. İkisi de doğru değil: böyle bir ölçüm yok ve
            platformda şirketlerin sıralama yaptığı bir mekanizma yok.
            Yerine, gerçekten yaptığımız işi anlatan bir kutu kondu.
          */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 rounded-2xl p-4 border border-indigo-100 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>İlanlar doğrudan kaynağından</span>
            </div>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              Her ilan, şirketin kendi kariyer sisteminden alınır ve kaynakta
              kapandığında listeden düşürülür. Başvuru adresi de ilanın kendi
              sayfasıdır; araya kimse girmez.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
