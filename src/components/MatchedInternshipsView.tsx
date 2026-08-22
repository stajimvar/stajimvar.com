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
import { SirketSeridi } from './SirketSeridi';

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

/**
 * Filtre panelindeki tek bir blok: baslik + icerik.
 *
 * Kariyer.net'in soldaki panelinde her olcut kendi basligiyla ayri bir
 * bolumde duruyor. Ayni yapiyi kuruyoruz: kisi aradigi olcutu basligindan
 * buluyor, secenekleri tek tek okumak zorunda kalmiyor.
 */
const FiltreBlogu: React.FC<{ baslik: string; children: React.ReactNode }> = ({
  baslik,
  children,
}) => (
  <div className="px-4 py-3.5 space-y-2">
    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{baslik}</h3>
    {children}
  </div>
);

/**
 * Filtre secenegi: onay kutusu veya radyo, yaninda ilan sayisi.
 *
 * Sayi bilerek var: "Uzaktan" secenegi tek basina kac ilan oldugunu
 * soylemiyor, "Uzaktan 2" soyluyor. Sifir ilanli secenek zaten cizilmiyor;
 * secince bos liste veren bir dugme kullaniciyi yaniltiyor.
 */
const SecenekSatiri: React.FC<{
  tip: 'checkbox' | 'radio';
  etiket: string;
  adet?: number;
  secili: boolean;
  onChange: () => void;
}> = ({ tip, etiket, adet, secili, onChange }) => (
  <label className="flex items-center gap-2.5 py-1.5 cursor-pointer select-none group">
    <input
      type={tip}
      checked={secili}
      onChange={onChange}
      className={`w-4 h-4 shrink-0 border-gray-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer ${
        tip === 'checkbox' ? 'rounded' : 'rounded-full'
      }`}
    />
    <span
      className={`min-w-0 flex-1 text-sm truncate transition-colors ${
        secili ? 'font-semibold text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
      }`}
      title={etiket}
    >
      {etiket}
    </span>
    {adet !== undefined && (
      <span className="text-xs text-gray-400 tabular-nums shrink-0">{adet}</span>
    )}
  </label>
);

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
  /**
   * Disaridan gelen arama terimi.
   *
   * Bolum sayfalari ("Makine muhendisligi staj ilanlarina bak") kisiyi
   * listeye o bolumun kelimesiyle getiriyor. Yoksa bos listeye dusuyor ve
   * okudugu seyin karsiligini goremiyor.
   */
  searchQuery: string;
  onSearchChange: (q: string) => void;
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
  searchQuery,
  onSearchChange,
}) => {
  /*
    ARAMA KUTUSU ARTIK ÜST ÇUBUKTA

    Kutu bu bileşenin içindeydi ve durumu da burada tutuluyordu. Üst çubuğa
    taşınınca iki yerden yazılabilir hâle geldi (geniş ekranda başlık,
    mobilde sütun), o yüzden durum yukarı — App'e — taşındı. Burası artık
    yalnızca okuyor ve değişikliği yukarı bildiriyor.
  */
  const setSearchQuery = onSearchChange;
  const [selectedCity, setSelectedCity] = useState<string>('all');
  /*
    Calisma tercihi COKLU secim oldu.

    Onceden tek secimli bir sirayd: "Uzaktan" secince ofis ilanlarini
    goremiyordun, ikisini birden gormek icin "Tumu"ne donmen gerekiyordu.
    Oysa "uzaktan VEYA hibrit olsun, ofise gitmeyeyim" gercek bir istek.
    Bos dizi = hicbir sinirlama.
  */
  const [workTypes, setWorkTypes] = useState<string[]>([]);

  /** Tarih araligi: ilanin eklenme zamanina gore. */
  const [dateRange, setDateRange] = useState<'all' | '1' | '3' | '7' | '30'>('all');

  /** Secili sirketler. Bos dizi = hepsi. */
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companySearch, setCompanySearch] = useState('');

  /**
   * Filtre paneli MOBİLDE kapalı başlıyor.
   *
   * Telefonda panel tüm ekranı kaplıyordu: konum, çalışma tercihi, tarih ve
   * sekiz şirket alt alta dizilince ilanlar ancak iki ekran aşağıda
   * başlıyordu. Oysa telefonu açan kişi önce ilan görmek istiyor.
   *
   * Geniş ekranda bu değerin bir etkisi yok: orada panel `lg:block` ile
   * her zaman açık, sol sütunda zaten yeri var.
   */
  const [filtreAcik, setFiltreAcik] = useState(false);
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

        /*
          Arama dört alanda birden çalışıyor: başlık, şirket, şehir, yetenek.

          Kutunun yazısı önce "Pozisyon, şirket veya yetenek" diyordu. İkisi
          birden yanlıştı: taranan şehir yazmıyordu, ve kimse "yetenek aramaya"
          gelmiyor — "Python" yazıyor, o da zaten yetenek eşleşmesine takılıyor.
          Yani özellik duruyor, yalnızca kullanıcıya kendi diliyle anlatılıyor.
        */
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
        if (workTypes.length > 0 && !workTypes.includes(listing.workType)) {
          return false;
        }

        // Mandatory
        if (selectedCompanies.length > 0 && !selectedCompanies.includes(listing.companyName)) {
          return false;
        }

        /*
          Tarih suzgeci. Olcut `postedAt ?? created_at`; yani "ilan ne zaman
          yayinlandi" degil "bizde ne zaman gorundu". Etiketlerde de
          "eklendi" diyoruz, "yayinlandi" demiyoruz.
        */
        if (dateRange !== 'all') {
          const eklenme = eklenmeZamani(listing.postedAt);
          if (!eklenme) return false;
          const gun = Number(dateRange);
          if (Date.now() - eklenme > gun * 86400000) {
            return false;
          }
        }

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
    workTypes,
    dateRange,
    selectedCompanies,
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

  /**
   * Akış içi reklamların hangi ilandan SONRA çıkacağı.
   *
   * İlk reklam 4. ilandan (index 3) sonra, sonrakiler altı ilanda bir,
   * sayfa başına en fazla iki tane. Liste kısaldığında reklam sayısı da
   * kendiliğinden azalıyor: 4 ilanlık bir listede hiç reklam çıkmıyor.
   */
  const reklamYerleri = useMemo(() => {
    const yerler: number[] = [];
    for (let i = 3; i < filteredListings.length - 1 && yerler.length < 2; i += 6) {
      yerler.push(i);
    }
    return yerler;
  }, [filteredListings.length]);

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
  /**
   * Sirket suzgeci secenekleri.
   *
   * Kariyer.net'in "Sektor" ve "Departman" bloklarinin bizdeki karsiligi.
   * Sektor verimiz yok -- ilanlari sirketin kendi kariyer sayfasindan
   * aliyoruz, sektor etiketi gelmiyor. Uydurmak yerine gercekten elimizde
   * olani suzduruyoruz: sirket adi.
   */
  /** Calisma turu basina ilan sayisi; secenegin yaninda gosteriliyor. */
  const workTypeCounts = useMemo(() => {
    const sayim: Record<string, number> = {};
    for (const { listing, match } of matchedData) {
      if (!matchesCategory(listing, match, subTab)) continue;
      const tur = listing.workType;
      if (tur) sayim[tur] = (sayim[tur] ?? 0) + 1;
    }
    return sayim;
  }, [matchedData, subTab]);

  const companyOptions = useMemo(() => {
    const sayim = new Map<string, number>();
    for (const { listing, match } of matchedData) {
      if (!matchesCategory(listing, match, subTab)) continue;
      const ad = listing.companyName?.trim();
      if (ad) sayim.set(ad, (sayim.get(ad) ?? 0) + 1);
    }
    return [...sayim.entries()]
      .map(([ad, adet]) => ({ ad, adet }))
      .sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, 'tr'));
  }, [matchedData, subTab]);

  /*
    ŞERİT VERİSİ

    companyOptions yalnızca ad ve adet tutuyor; şeritte logo ve "yeni ilan
    var mı" bilgisi de lazım. İkisi de mevcut ilan kayıtlarından çıkıyor,
    ek bir sorgu yok.

"Yeni" ölçütü son 24 saat; gerekçesi SirketSeridi.tsx içinde. Kısaca:
    yedi günle denendi ve on şirketin onu da yeni çıktı — hiçbir şey
    ayırt etmeyen bir halka dekordan ibaret olurdu.
  */
  const seritSirketleri = useMemo(() => {
    const YENI_PENCERE = 24 * 60 * 60 * 1000;
    const simdi = Date.now();
    const harita = new Map<string, { logo?: string; adet: number; yeni: boolean }>();

    for (const { listing, match } of matchedData) {
      if (!matchesCategory(listing, match, subTab)) continue;
      const ad = listing.companyName?.trim();
      if (!ad) continue;
      const mevcut = harita.get(ad) ?? { logo: undefined, adet: 0, yeni: false };
      mevcut.adet += 1;
      if (!mevcut.logo && listing.companyLogo) mevcut.logo = listing.companyLogo;
      if (simdi - eklenmeZamani(listing.postedAt) <= YENI_PENCERE) mevcut.yeni = true;
      harita.set(ad, mevcut);
    }

    return [...harita.entries()]
      .map(([ad, v]) => ({ ad, logo: v.logo, adet: v.adet, yeni: v.yeni }))
      /* Yeni ilanı olanlar başta: şeridin başı en çok bakılan yer. */
      .sort((a, b) => Number(b.yeni) - Number(a.yeni) || b.adet - a.adet || a.ad.localeCompare(b.ad, 'tr'));
  }, [matchedData, subTab]);

  /** Arama kutusuyla suzulmus sirket listesi. */
  const gorunenSirketler = useMemo(() => {
    const q = companySearch.trim().toLocaleLowerCase('tr');
    if (!q) return companyOptions;
    return companyOptions.filter((s) => s.ad.toLocaleLowerCase('tr').includes(q));
  }, [companyOptions, companySearch]);

  /** Kac suzgec acik? "Temizle" dugmesini ve sayiyi bununla gosteriyoruz. */
  const acikSuzgecSayisi =
    (selectedCity !== 'all' ? 1 : 0) +
    workTypes.length +
    (dateRange !== 'all' ? 1 : 0) +
    selectedCompanies.length +
    (onlyMandatory ? 1 : 0) +
    (onlyPaid ? 1 : 0) +
    (minMatchScore > 0 ? 1 : 0);

  const suzgecleriTemizle = () => {
    setSelectedCity('all');
    setWorkTypes([]);
    setDateRange('all');
    setSelectedCompanies([]);
    setCompanySearch('');
    setOnlyMandatory(false);
    setOnlyPaid(false);
    setMinMatchScore(0);
  };

  const calismaSec = (tur: string) =>
    setWorkTypes((o) => (o.includes(tur) ? o.filter((x) => x !== tur) : [...o, tur]));

  const sirketSec = (ad: string) =>
    setSelectedCompanies((o) => (o.includes(ad) ? o.filter((x) => x !== ad) : [...o, ad]));

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
      {/*
        BAŞLIK ARTIK IZGARANIN ÜSTÜNDE, TAM GENİŞLİKTE

        Sol sütunun içindeydi. Sütun üç kolona (≈318 piksel) daralınca
        "Şirketlerin staj ilanları, tek listede." üç satıra bölünüyor ve
        sayfanın en tepesindeki cümle kırık görünüyordu.

        Başlık sayfanın tamamına ait: hangi sütunda durduğunun bir anlamı
        yok. Izgaranın dışına, tam genişliğe alındı.
      */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          {/*
            BAŞLIK SOL SÜTUNDA

            Önce ızgaranın üstünde tam genişlikteydi; o satır tek başına bir
            şerit kaplıyor ve ilanları aşağı itiyordu. Sol sütuna alınınca üst
            şerit tamamen kalktı: ilanlar artık sayfanın en tepesinden
            başlıyor.

            Satır kırılması virgülde sabit — dar sütunda tarayıcı bırakılırsa
            "Şirketlerin staj / ilanları, tek / listede." gibi rastgele
            bölüyordu. Cümlenin doğal durağı virgül.
          */}
          {/*
            Punto sütun genişliğiyle ÖLÇEKLENİYOR.

            Sabit bir punto burada işe yaramıyor: sol sütun 1024 pikselde
            218, 1440'ta 318, 1536 ve üstünde ~346 piksel. 24 punto 1440'ta
            satırın yalnızca %84'ünü dolduruyor, 1024'te ise taşırıyordu.

            `1.82vw` sütunla aynı oranda büyüyüp küçülüyor.

            ÜST SINIR ÖNEMLİ: sayfa `max-w-[1536px]` olduğu için sütun o
            noktadan sonra büyümeyi bırakıyor, ama vw büyümeye devam ediyor.
            Sınır konmazsa 1920 piksellik ekranda punto sütunu taşırıp başlığı
            ÜÇ satıra bölüyor — ölçüldü, oluyordu. 1.85rem tam orada duruyor.

            Ölçüm: "Şirketlerin staj ilanları," satırı her genişlikte sütunun
            %88-95'ini dolduruyor ve başlık iki satır kalıyor.

            MOBİLDE TEK SATIR, GENİŞ EKRANDA İKİ SATIR

            İkisi farklı iş yapıyor:

            - Telefonda başlık iki satıra bölününce 60 piksel kaplıyor ve
              ilanları aşağı itiyor. Tek satır 30 piksel; kazanılan yer
              doğrudan ilana gidiyor.
            - Geniş ekranda başlık dar bir sütunun içinde ve orayı DOLDURMASI
              isteniyor; tek satır olsaydı sütunun yarısı boş kalırdı.

            Bu yüzden `<span>`ler mobilde `inline` (aynı satırda akıyor),
            lg'de `block` (virgülden kırılıyor). Punto da mobilde ekran
            genişliğiyle ölçekleniyor: ölçüm, cümlenin 24 puntoda ~405 piksel
            sürdüğünü söylüyor; 375 piksellik telefonda 343 piksel yer var,
            yani punto en fazla ~20 olabiliyor. 5vw tam oraya oturuyor ve
            küçük telefonlarda da orantılı küçülüyor.
          */}
          <h1 className="text-center lg:text-left [font-size:clamp(1rem,5vw,1.5rem)] lg:[font-size:clamp(1.125rem,1.82vw,1.85rem)] font-extrabold leading-tight tracking-tight text-gray-900 break-words">
            <span className="inline lg:block">Şirketlerin staj ilanları, </span>
            <span className="inline lg:block">
              <span className="text-blue-600">tek listede</span>.
            </span>
          </h1>

          {/*
            Mobildeki "13 açık ilan · 10 şirket · 4 şehir" satırı kaldırıldı.

            Şirket şeridi eklenince aynı bilgiyi zaten söylüyor: ilk daire
            "Tümü — 13 ilan" yazıyor ve şirket sayısı daire sayısı kadar.
            Telefonda dikey yer ilanın hakkı; aynı sayıyı iki kez göstermek
            için harcanmamalı.

            Geniş ekrandaki sayaç kartı duruyor: sağ sütunda kendi yeri var
            ve şeridin göstermediği "şehir" sayısını da veriyor.
          */}

          <div className="space-y-3">

            {/*
              "Eşleşmeleri Bul" düğmesi kaldırıldı: onClick'i boştu, hiçbir şey
              yapmıyordu. Liste zaten yazdıkça anında süzülüyor. Basınca hiçbir
              şey olmayan büyük mavi bir düğme, siteye olan güveni doğrudan
              zedeliyor.
            */}
            {/*
              ARAMA VE FİLTRE TEK SATIRDA (mobil)

              Önce alt alta iki ayrı kart vardı: arama kutusu, altında
              "Filtreler" başlıklı bir açılır kart. İkisi de aynı işi yapıyor
              — listeyi daraltmak — ve ikisi birlikte 130 pikselden fazla yer
              kaplıyordu. Telefonda o yer ilanın hakkı.

              Şimdi arama kutusu ve filtre düğmesi yan yana. Düğme açık
              süzgeç sayısını rozetle gösteriyor, basınca panel altında
              açılıyor. Geniş ekranda hiçbir şey değişmedi: orada arama üst
              çubukta, filtre paneli sol sütunda hep açık.
            */}
            <div className="mt-4 flex flex-col sm:flex-row lg:flex-col gap-2">
              <div className="flex items-center gap-2 lg:hidden">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pozisyon, şirket veya şehir"
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
                Filtre düğmesi. Arama kutusuyla aynı yükseklikte ve aynı
                köşe yarıçapında: ikisi tek bir kontrol gibi okunuyor.
              */}
              <button
                type="button"
                onClick={() => setFiltreAcik((o) => !o)}
                aria-expanded={filtreAcik}
                aria-label="Filtreler"
                /*
                  Yükseklik sabit değil, arama kutusundan geliyor (self-stretch).
                  Sabit 52 piksel verilince kutu 53 çıkıyordu ve yan yana iki
                  çerçevenin alt kenarı 1 piksel kayıyordu — ölçüldü.
                */
                className={`relative shrink-0 self-stretch w-[52px] rounded-2xl border flex items-center justify-center cursor-pointer transition-colors ${
                  filtreAcik || acikSuzgecSayisi > 0
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                {acikSuzgecSayisi > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {acikSuzgecSayisi}
                  </span>
                )}
              </button>
              </div>

              {/*
                Şehir seçici buradan kaldırıldı.

                Filtre panelinin "Konum" bloğunda aynısı var ve o her ekran
                boyutunda görünüyor. İki kutu aynı değeri yazıp okuyordu;
                kullanıcı birini değiştirince diğeri de değişiyor, hangisinin
                geçerli olduğu belirsiz kalıyordu.
              */}
            </div>
          </div>

          {/*
            Sayaç şeridi başlığın yanına taşındı; oradaki boşluğu dolduruyor
            ve sol sütun yalnızca filtrelere kaldı.
          */}

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
      {/*
        FİLTRE PANELİ

        Eskiden tek bir kutuydu: çalışma türü hapları, iki onay kutusu ve
        sıralama menüsü yan yana duruyordu. Filtre sayısı arttıkça bu düzen
        tutmuyor — hangi seçeneğin neyi süzdüğü belirsizleşiyor.

        Şimdi her ölçüt kendi başlıklı bloğunda: Konum, Çalışma tercihi,
        Tarih, Şirket, İlan özellikleri. Kişi aradığı ölçütü başlığından
        buluyor.

        Sıralama buradan çıkarıldı; ilan listesinin başına taşındı. Sıralama
        bir süzgeç değil — hiçbir ilanı elemiyor, sadece diziyor. Süzgeçlerin
        arasında durması ikisini aynı şey sanmaya yol açıyordu.
      */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">

        {/*
          ---- başlık: yalnızca geniş ekran ----

          Mobilde açma/kapama düğmesi arama kutusunun yanına taşındı; burada
          bir başlık daha bırakmak aynı kontrolü iki kez göstermek olurdu.
        */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setFiltreAcik((o) => !o)}
            aria-expanded={filtreAcik}
            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer lg:cursor-default"
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-bold text-gray-900">Filtreler</span>
            {acikSuzgecSayisi > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-600 text-white leading-none shrink-0">
                {acikSuzgecSayisi}
              </span>
            )}
            {/* Ok yalnızca mobilde: geniş ekranda panel zaten hep açık. */}
            <ChevronDown
              className={`lg:hidden w-4 h-4 text-gray-400 shrink-0 ml-auto transition-transform ${
                filtreAcik ? 'rotate-180' : ''
              }`}
            />
          </button>
          {acikSuzgecSayisi > 0 && (
            <button
              type="button"
              onClick={suzgecleriTemizle}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer shrink-0"
            >
              Temizle
            </button>
          )}
        </div>

        {/*
          Süzgeçler. Mobilde `filtreAcik` kapalıyken çizilmiyor; geniş ekranda
          `lg:block` her durumda gösteriyor.
        */}
        <div
          className={`${filtreAcik ? 'block' : 'hidden'} lg:block divide-y divide-gray-100 lg:border-t border-gray-100`}
        >

        {/*
          Mobilde "Temizle" panelin içinde: başlık satırı orada olmadığı için
          süzgeçleri sıfırlamanın başka yolu kalmıyordu.
        */}
        {acikSuzgecSayisi > 0 && (
          <div className="lg:hidden flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-semibold text-gray-500">
              {acikSuzgecSayisi} süzgeç açık
            </span>
            <button
              type="button"
              onClick={suzgecleriTemizle}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Temizle
            </button>
          </div>
        )}

        {/* ---- konum ---- */}
        <FiltreBlogu baslik="Konum">
          <div className="relative">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Şehir seç"
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-600 appearance-none cursor-pointer"
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
        </FiltreBlogu>

        {/* ---- çalışma tercihi ---- */}
        <FiltreBlogu baslik="Çalışma tercihi">
          <div className="space-y-0.5">
            {[
              { id: 'On-site', etiket: 'İş yerinde' },
              { id: 'Remote', etiket: 'Uzaktan' },
              { id: 'Hybrid', etiket: 'Hibrit' },
            ].map((tur) => {
              const adet = workTypeCounts[tur.id] ?? 0;
              if (adet === 0 && !workTypes.includes(tur.id)) return null;
              return (
                <SecenekSatiri
                  key={tur.id}
                  tip="checkbox"
                  etiket={tur.etiket}
                  adet={adet}
                  secili={workTypes.includes(tur.id)}
                  onChange={() => calismaSec(tur.id)}
                />
              );
            })}
          </div>
        </FiltreBlogu>

        {/* ---- tarih ---- */}
        <FiltreBlogu baslik="Tarih">
          <div className="space-y-0.5">
            {[
              { id: 'all', etiket: 'Tümü' },
              { id: '1', etiket: 'Son 24 saat' },
              { id: '3', etiket: 'Son 3 gün' },
              { id: '7', etiket: 'Son 7 gün' },
              { id: '30', etiket: 'Son 30 gün' },
            ].map((a) => (
              <SecenekSatiri
                key={a.id}
                tip="radio"
                etiket={a.etiket}
                secili={dateRange === a.id}
                onChange={() => setDateRange(a.id as typeof dateRange)}
              />
            ))}
          </div>
        </FiltreBlogu>

        {/* ---- ilan özellikleri ---- */}
        {(mandatoryCount > 0 || paidCount > 0 || onlyMandatory || onlyPaid) && (
          <FiltreBlogu baslik="İlan özellikleri">
            <div className="space-y-0.5">
              {(mandatoryCount > 0 || onlyMandatory) && (
                <SecenekSatiri
                  tip="checkbox"
                  etiket="Zorunlu staja uygun"
                  adet={mandatoryCount}
                  secili={onlyMandatory}
                  onChange={() => setOnlyMandatory(!onlyMandatory)}
                />
              )}
              {(paidCount > 0 || onlyPaid) && (
                <SecenekSatiri
                  tip="checkbox"
                  etiket="Ücretli"
                  adet={paidCount}
                  secili={onlyPaid}
                  onChange={() => setOnlyPaid(!onlyPaid)}
                />
              )}
            </div>
          </FiltreBlogu>
        )}

        {/* ---- şirket ---- */}
        {companyOptions.length > 1 && (
          <FiltreBlogu baslik="Şirket">
            {/*
              Arama kutusu yalnızca liste uzunsa. Sekiz şirket varken arama
              kutusu koymak, aramaya gerek olmayan bir yere kutu koymak olur.
            */}
            {companyOptions.length > 8 && (
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Şirket ara"
                  aria-label="Şirket ara"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            )}
            <div className="space-y-0.5 max-h-56 overflow-y-auto -mr-1 pr-1">
              {gorunenSirketler.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">Eşleşen şirket yok.</p>
              ) : (
                gorunenSirketler.map((s) => (
                  <SecenekSatiri
                    key={s.ad}
                    tip="checkbox"
                    etiket={s.ad}
                    adet={s.adet}
                    secili={selectedCompanies.includes(s.ad)}
                    onChange={() => sirketSec(s.ad)}
                  />
                ))
              )}
            </div>
          </FiltreBlogu>
        )}

        {/*
          Mobilde paneli kapatan düğme.

          Kişi filtreyi ayarladıktan sonra sonuçları görmek istiyor; paneli
          elle kapatmak için yukarı kaydırmak zorunda kalmasın diye kaç ilan
          kaldığını da söyleyip burada kapatıyoruz.
        */}
        <div className="lg:hidden p-3">
          <button
            type="button"
            onClick={() => setFiltreAcik(false)}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            {filteredListings.length} ilanı göster
          </button>
        </div>
        </div>
      </div>
        {/*
          "İlanlar nereden geliyor" kutusu sağ sütuna taşındı.

          Burada yalnızca giriş yapmamış ziyaretçiye gösteriliyordu; giriş
          yapan kişi aynı bilgiyi hiç görmüyordu. Üstelik başlığın altındaki
          paragraf da aynı şeyi söylüyordu — aynı cümle sayfada iki yerdeydi.
          Tek kopya kaldı ve herkese görünüyor.
        */}
        </div>

        <div className="lg:col-span-6 space-y-4 min-w-0">
          <div className="flex items-center justify-between px-1">
            {/*
              Profili olmayan ziyaretçiye "sana uygun" ve "eşleşme puanına göre
              sıralı" demek yanlış: ortada kişiselleştirme yok.
            */}
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {student ? 'Sana Uygun Staj İlanları' : 'Açık Staj İlanları'} (
              {filteredListings.length})
            </h2>
            {/*
              Açıklama metni mobilde gizli.

              Telefonda başlıkla yan yana sıkışıp ikisi de iki satıra
              bölünüyordu: solda "SANA UYGUN STAJ / İLANLARI (11)", sağda
              "Gerçek zamanlı eşleşme puanına / göre sıralı". Dört satırlık bir
              blok, hiçbiri okunmuyor.

              Bilgi olarak da ikincil: sıralamanın neye göre olduğunu bilmek
              hoş ama telefonda yeri ilan göstermek.
            */}
            <span className="hidden sm:block text-xs text-gray-500 font-medium">
              {student
                ? 'Gerçek zamanlı eşleşme puanına göre sıralı'
                : 'Şirketlerin kendi kariyer sayfalarından derlendi'}
            </span>
          </div>

          {/*
            ŞİRKET ŞERİDİ

            Instagram akışının üstündeki hikâye şeridinin karşılığı. Mevcut
            şirket süzgecini kullanıyor: yeni bir durum eklemedik, var olanı
            bir tık uzağa taşıdık. Süzgeç panelindeki şirket listesi de
            çalışmaya devam ediyor, ikisi aynı seçimi paylaşıyor.
          */}
          <SirketSeridi
            sirketler={seritSirketleri}
            secili={selectedCompanies}
            toplam={filteredListings.length}
            onSec={sirketSec}
            onTumu={() => setSelectedCompanies([])}
          />

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
                  suzgecleriTemizle();
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

                  {/*
                    AKIŞ İÇİ REKLAM KURALI

                    Üç kısıt birden geçerli, üçü de kullanıcıyı boğmamak için:

                    1. İlk reklam 4. ilandan önce çıkmıyor. Ziyaretçi önce
                       gerçek içerik görmeli; ilk ekranda reklamla karşılaşan
                       kullanıcı siteyi bırakıyor.
                    2. Sonrakiler 6 ilanda bir. Kariyer.net'te aralık daha
                       sık ama onların yüzlerce ilanı var; 11 ilanda aynı
                       sıklık listeyi reklam listesine çevirirdi.
                    3. Sayfa başına en fazla 2 tane.

                    Anahtar tanımlı değilken bu yuvalar hiçbir şey çizmiyor,
                    yani boşluk da bırakmıyorlar.
                  */}
                  {reklamYerleri.includes(index) && (
                    <GoogleAdBanner format="in-feed" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/*
          SAĞ SÜTUN — reklam alanı

          Şimdilik yalnızca yer tutuyor: AdSense anahtarı tanımlı değilken
          GoogleAdBanner hiçbir şey çizmiyor, dolayısıyla burada boş bir
          kutu görünmüyor, sütun sessizce daralıyor.

          Neden şimdiden ayrıldı: reklam sonradan araya sıkıştırılınca
          düzen kayıyor ve kullanıcı gördüğü sayfanın değiştiğini fark
          ediyor. Yer baştan ayrılırsa reklam geldiğinde sayfa oynamıyor.

          Yalnızca geniş ekranda. Mobilde sütunlar alt alta dizildiği için
          reklam ilanların arasına düşerdi; orada zaten akış içi reklam var.
        */}
        <div className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          {/*
            Sayaçlar. Başlık sol sütuna inince üst şerit kalktı; sayaçlar da
            sağ sütunun en üstüne, bilgi kutusunun üzerine geçti. Kart görünümü
            korunuyor, altındaki kutuyla aynı genişlikte.
          */}
          <div className="grid grid-cols-3 gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
            {[
              { etiket: 'Açık ilan', deger: String(filteredListings.length) },
              { etiket: 'Şirket', deger: String(companyCount) },
              { etiket: 'Şehir', deger: String(cityCount) },
            ].map((kutu) => (
              <div key={kutu.etiket} className="min-w-0 text-center">
                <p className="text-2xl font-black text-gray-900 tabular-nums leading-none">
                  {kutu.deger}
                </p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1 truncate">
                  {kutu.etiket}
                </p>
              </div>
            ))}
          </div>

          {/*
            Sağ sütunun üstü: sitenin ne yaptığını anlatan kutu.

            Bu metin önce başlığın altında tam genişlikteydi, bir kopyası da
            sol sütunda duruyordu. İkisi de kaldırıldı; tek kopya burada.
          */}
          <aside className="bg-white rounded-2xl p-5 border border-gray-200 space-y-4">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              İlanlar nereden geliyor
            </span>

            <p className="text-sm text-gray-600 leading-relaxed">
              Sekiz ayrı kariyer sayfasını tek tek gezme. İlanları aracı sitelerden değil,{' '}
              <strong className="text-gray-900">şirketlerin kendi kariyer sayfalarından</strong>{' '}
              derliyoruz; her ilanda şirketin kendi başvuru bağlantısı var.
            </p>

            {/*
              Açık ilan ve şirket sayıları buradan kaldırıldı.

              Sayaçlar başlığın yanına taşınınca aynı iki rakam ekranda iki
              yerde göründü — üstelik ikisi de aynı anda görünüyordu, aralarında
              300 piksel vardı. Aynı sayıyı iki yerde göstermek, ikisinin farklı
              şeyleri saydığını düşündürüyor.

              Sayılar başlıkta kaldı; bu kutuya anlatım kaldı.
            */}

            {/*
              Alttaki "Her ilanın başvuru adresi, şirketin kendi sayfasıdır."
              satırı kaldırıldı: üstteki paragraf zaten "her ilanda şirketin
              kendi başvuru bağlantısı var" diyor. Aynı cümle 200 piksellik
              bir kutuda iki kez yazıyordu.

              DİKKAT: burada bir zamanlar "kapanan ilanlar listeden
              düşürülüyor" da yazıyordu; otomatik pasifleştirme şalteri
              (ALLOW_DEACTIVATION) hâlâ kapalı olduğu için geri yazılmamalı.
            */}
          </aside>

          {/* Altı reklam için ayrıldı; anahtar tanımlı değilken boş kalıyor. */}
          <GoogleAdBanner format="sidebar-rectangle" />
        </div>
      </div>
    </div>
  );
};
