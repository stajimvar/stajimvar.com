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

/**
 * İlanın listeye eklenme zamanı (ms).
 *
 * `postedAt`, veritabanında `posted_at ?? created_at` olarak eşleniyor:
 * şirket kendi ilanını girdiyse yayın tarihi, biz topladıysak sisteme
 * eklendiği an. Bilinmeyen veya bozuk tarihler sıralamanın sonuna düşsün
 * diye 0 dönüyor — NaN ile karşılaştırma sıralamayı tamamen bozardı.
 */
function eklenmeZamani(deger: string | null | undefined): number {
  if (!deger) return 0;
  const ms = new Date(deger).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

interface MatchedInternshipsViewProps {
  /** Giriş yapılmamışsa null; o durumda uyum hesaplanmaz. */
  student: StudentProfile | null;
  allListings: InternshipListing[];
  applications: ApplicationRecord[];
  subTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onViewDetails: (listing: InternshipListing, match: MatchBreakdown) => void;
  onQuickApply: (listing: InternshipListing, match: MatchBreakdown) => void;
  /** Profil sekmesine geçiş. Verilmezse profil çubuğu bir şey yapmaz. */
  onGoToProfile?: () => void;
}

export const MatchedInternshipsView: React.FC<MatchedInternshipsViewProps> = ({
  student,
  allListings,
  applications,
  subTab = 'all',
  onSubTabChange,
  onViewDetails,
  onQuickApply,
  onGoToProfile,
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
    | 'newest'
    | 'oldest'
  >('match');

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /*
    Kategori sekmeleri.

    Üç sekme buradan çıkarıldı çünkü hemen altlarındaki denetimlerin birebir
    kopyasıydılar:

      "Uzaktan & Hibrit"    →  ÇALIŞMA satırı (Uzaktan / Hibrit / Ofis)
      "Zorunlu Staj (SGK)"  →  Zorunlu Staj kutucuğu
      "Maaşlı / Burslu"     →  Ücretli kutucuğu

    Aynı filtreyi iki ayrı yerde sunmak kullanıcıya ikisinin farklı şeyler
    olduğunu düşündürüyor; üstelik ÇALIŞMA satırı daha hassas (Uzaktan ile
    Hibrit'i ayırabiliyor). Kalanlar gerçekten başka bir şey süzüyor.
  */
  const allListingCategories = [
    { id: 'all', label: 'Tüm İlanlar' },
    { id: 'high_match', label: 'Sana En Uygun (%80+)' },
    { id: 'public_sector', label: 'Kamu Stajları' },
    { id: 'global', label: 'Yurtdışı / Global' },
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
      default:
        /*
          Bilinmeyen bir sekme değeri geldiğinde süzme yapılmıyor. `subTab`
          sekmeler arasında ortak bir durum: kullanıcı Yetenekler sekmesinde
          bir kategori seçip İlanlar'a dönerse buraya oradaki değer geliyor.
          Böyle bir durumda listeyi boşaltmak yerine hepsini göstermek doğru.
        */
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
        if (sortBy === 'newest' || sortBy === 'oldest') {
          const at = eklenmeZamani(a.listing.postedAt);
          const bt = eklenmeZamani(b.listing.postedAt);
          return sortBy === 'newest' ? bt - at : at - bt;
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

  /* Sıralama menüsü için aynı kural: verisi olmayan ölçüte göre sıralatma. */
  const applicantsKnown = matchedData.some((item) => item.listing.applicantsCount > 0);
  const deadlineKnown = matchedData.some((item) => Boolean(item.listing.applicationDeadline));
  const ratingKnown = matchedData.some((item) => item.listing.companyRating > 0);

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
    <div className="w-full pb-12">
      {/*
        İKİ SÜTUNLU DÜZEN (yalnızca lg ve üstü)

        Önce tek sütundu: başlık, arama, sayaçlar ve filtreler tam genişlik
        kaplıyor, ilanlar ancak 900 piksel aşağıda başlıyordu. Geniş ekranda
        açılışta görünen tek şey bir arama kutusuydu — oysa sitenin işi ilan
        göstermek.

        Artık solda arama ve filtreler (kaydırınca yapışık kalıyor), sağda
        ilanlar sayfanın en üstünden başlıyor. Mobilde hiçbir şey değişmiyor:
        sütunlar alt alta diziliyor ve sıra aynen korunuyor.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          <header className="space-y-3">
            {/*
              Başlık öğrenciye ne kazandığını söylüyor, bize ne yaptığımızı
              değil.

              Önceki hali "Staj ilanları, şirketin kendi sayfasından." idi:
              doğru ama bizim yöntemimizi anlatıyordu. Staj arayan biri ilk
              saniyede "burada iş var mı" sorusunun cevabını arıyor; nereden
              topladığımız onun için ikinci sıradaki bilgi — o yüzden alt
              satıra, kanıt olarak indi.
            */}
            <h1 className="text-2xl sm:text-4xl lg:text-3xl font-extrabold leading-tight tracking-tight text-gray-900">
              Şirketlerin staj ilanları, <span className="text-blue-600">tek listede</span>.
            </h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-xl leading-relaxed">
              Sekiz ayrı kariyer sayfasını tek tek gezme. İlanları aracı
              sitelerden değil, şirketlerin kendi kariyer sayfalarından
              derliyoruz; her ilanda şirketin kendi başvuru bağlantısı var.
            </p>

            {/*
              "Eşleşmeleri Bul" düğmesi kaldırıldı: onClick'i boştu, hiçbir şey
              yapmıyordu. Liste zaten yazdıkça anında süzülüyor. Basınca hiçbir
              şey olmayan büyük mavi bir düğme, siteye olan güveni doğrudan
              zedeliyor.
            */}
            <div className="mt-4 flex flex-col sm:flex-row lg:flex-col gap-2">
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
              <div className="relative sm:w-56 lg:w-full shrink-0">
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
          <div className="grid grid-cols-3 gap-2 pt-2">
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

          {/*
            Profil eksikse tek satırlık uyarı.

            Burada eskiden büyük bir "Merhaba Mustafa" kartı vardı: selamlama,
            doluluk çubuğu, "yetenek eklemedin" satırı ve "sana en yakın ilan"
            kutusu. Dördü de ya bilgi taşımıyordu ya da zaten ekranda olan bir
            şeyi tekrar ediyordu — en yakın ilan, hemen altındaki listenin ilk
            kartının aynısıydı. Üstelik "profilini doldur" diyip profile
            gitmenin bir yolunu sunmuyordu.

            Kalan tek gerçek bilgi şu: profil boşken eşleşme puanları anlamsız
            çıkıyor ve kullanıcı nedenini bilmiyor. O yüzden yalnızca profil
            eksikken, tek satır ve dokununca profili açan bir çubuk kaldı.
            Profil tamamlandığında hiçbir şey gösterilmiyor.
          */}
          {student && profileCompletion < 100 && (
            <button
              type="button"
              onClick={onGoToProfile}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-blue-100 bg-blue-50/70 text-left cursor-pointer hover:bg-blue-100/70 transition-colors"
            >
              <span className="shrink-0 text-xs font-bold text-blue-700 tabular-nums">
                %{profileCompletion}
              </span>
              <span className="flex-1 h-1.5 rounded-full bg-blue-200/70 overflow-hidden">
                <span
                  className="block h-full rounded-full bg-blue-600"
                  style={{ width: `${profileCompletion}%` }}
                />
              </span>
              <span className="shrink-0 text-xs font-semibold text-blue-800">
                Profilini tamamla →
              </span>
            </button>
          )}
      <div className="bg-white rounded-2xl p-3 sm:p-5 border border-gray-200 shadow-xs space-y-3 sm:space-y-4">
        {/*
          Tek seçenek kaldıysa şerit çizilmiyor: içinde yalnızca "Tüm İlanlar"
          olan bir filtre satırı hiçbir şey süzmüyor, sadece yer kaplıyor.
          Kaynaklar çoğalıp kamu veya yurtdışı ilanları geldiğinde kendiliğinden
          geri geliyor.
        */}
        {listingCategories.length > 1 && (
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
        )}

        {/* Ayraç yalnızca üstünde bir şerit varsa anlamlı. */}
        {listingCategories.length > 1 && <div className="border-t border-gray-100" />}

        {/* Row 2: ÇALIŞMA TÜRÜ + ONAY KUTULARI + SIRALAMA */}
        <div className="flex flex-col gap-3 pt-0.5">
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
                {/*
                  Menüde yalnızca gerçekten işleyen sıralamalar var.

                  "Son Başvuru Tarihi" ve "Şirket Puanı" kaldırıldı: canlıda
                  11 ilanın 11'inde de son başvuru tarihi boş, şirket puanı 0.
                  Hepsi aynı değere sahip bir alana göre sıralamak, kullanıcıya
                  rastgele bir dizilim verip "sıralama bozuk" dedirtiyordu.
                  Bu alanlar dolmaya başlarsa seçenekler geri gelir.
                */}
                <option value="match">En Yüksek Uyum</option>
                <option value="newest">Önce Yeni Eklenenler</option>
                <option value="oldest">Önce Eski Eklenenler</option>
                {applicantsKnown && <option value="applicants_desc">En Çok Başvuran</option>}
                {deadlineKnown && <option value="deadline_asc">Son Başvuru Tarihi</option>}
                {ratingKnown && <option value="rating_desc">Şirket Puanı</option>}
                <option value="company_asc">Şirket Adı (A - Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
        {/*
          Bu kutu yalnizca genis ekranda. Mobilde sol sutun ilanlarin ustune
          diziliyor ve kutu ilanlari 380 piksel asagi itiyordu -- oysa
          telefonda once ilan gorunmeli. Genis ekranda sol sutunda zaten bos
          yer var, orada bir maliyeti yok.
        */}
        {!student && (
          <aside className="hidden lg:block bg-white rounded-3xl p-6 shadow-xs border border-gray-200 space-y-5">
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

            {/*
              DİKKAT: burada "kapanan ilanlar listeden düşürülüyor" yazıyordu
              ama otomatik pasifleştirme şalteri (ALLOW_DEACTIVATION) hâlâ
              kapalı — ilk sağlıklı taramaların geçmişi birikmeden açılırsa
              her ilanı "kaybolmuş" sayar. Şalter açılana kadar bunu olmuş bir
              şey gibi yazmıyoruz.
            */}
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Her ilanın başvuru adresi, şirketin kendi sayfasıdır.
            </p>
          </aside>
        )}
        </div>

        <div className="lg:col-span-8 space-y-4 min-w-0">
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
      </div>
    </div>
  );
};
