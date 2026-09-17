import { useSayfaAramasiKaydet } from '../lib/sayfa-aramasi';
import { cvCagrisiKapatildiMi, cvCagrisiniKapat, cvVarMi, profilDolulugu } from '../lib/cv-hazirlik.mjs';
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
  Home,
  BookOpen,
} from 'lucide-react';
import { InternshipListing, StudentProfile, MatchBreakdown, ApplicationRecord } from '../types';
import { calculateInternshipMatch } from '../utils/matchingEngine';
import { InternshipCard } from './InternshipCard';
import { fetchOpportunities, fetchSavedListingIds, toggleSavedListing } from '../lib/opportunities';
import { SonucYok, type AktifSuzgec } from './SonucYok';
import { SonrakiAdim } from './SonrakiAdim';
import { BasvuruSablonu } from './BasvuruSablonu';
import { ilBul } from '../lib/sehir';
import { COGRAFYA, ilanCografyasi } from '../lib/ilan-cografyasi.mjs';
import { fetchBugunDogrulananIlanSayisi } from '../lib/queries';
import { BolumCipleri } from './BolumCipleri';
import { alanSayilari, bolumeGoreSirala } from '../lib/bolum-eslestirme.mjs';
/*
  TEK ESLESME GERCEGI

  Arama metni, ulke/Remote, sehir, calisma bicimi ve ucret kosullari bu
  modulden geliyor; gunluk ozet iscisi de AYNI dosyayi cagiriyor. Iki
  ayri uygulama yazmak, listede gorunen ilanin e-postada gorunmemesi
  (ya da tersi) demekti ve ayrismayi kimse fark etmezdi.
*/
import {
  adresTenFiltreler,
  aramaEslesiyorMu,
  filtreleriDogrula,
  ilaniNormalize,
} from '../lib/kayitli-arama.mjs';
import { AramayiKaydet } from './AramayiKaydet';
/*
  Boş sonuçta gösterilecek işverenler MEVCUT dizinden (`stajProgramlari`);
  ikinci bir şirket dizini kurulmuyor ve kart başına sorgu yok.
*/
import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { dizini, uygunIsverenler } from '../lib/isveren-dizini.mjs';
import { useIsverenDizini } from '../lib/isveren-olcum';
import { SirketSeridi, type IlanBolgesi } from './SirketSeridi';
import { donukKure, kureDokunusu, kureSayisi } from '../lib/kure-donusu.mjs';
import { ILAN_KAYNAGI_PARCALI } from '../lib/urun-metni';
import { ListingCountrySelector } from './ListingCountrySelector';
import { gosterilecekIlanSayisi } from '../lib/ilan-sayisi.mjs';
import { guvenSatiri } from '../lib/guven-satiri.mjs';
import { LISTE_BASLIGI, LISTE_BASLIGI_NOTU, LISTE_BASLIGI_YAZISI, LISTE_BLOGU, YUZEY } from '../ui/tokens';

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
    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">{baslik}</h3>
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
      <span className="text-xs text-gray-600 tabular-nums shrink-0">{adet}</span>
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
  /* Görüntüleyenin üyesi olduğu şirket; kendi ilanında başvuru çizilmiyor. */
  kendiSirketId?: string | null;
  /** Profil sekmesine geçiş. Verilmezse profil çubuğu bir şey yapmaz. */
  onGoToProfile?: () => void;
  /** CV oluşturma akışını açar (App'teki `CvOlusturucu`). */
  onCvOlustur?: () => void;
  /** Giriş penceresini açar; misafirin kaydet düğmesi buraya bağlanıyor. */
  /*
    Niyet parametresi isteğe bağlı: kaydet düğmesi niyetsiz çağırıyor,
    başvuru düğmesi hangi ilandan başlandığını taşıyor (lib/basvuru-niyeti).
  */
  onRequireLogin?: (niyet?: {
    tur: 'dis' | 'ic';
    ilanId: string;
    yol: string;
    disAdres?: string;
    baslik?: string;
  }) => void;
  /**
   * Disaridan gelen arama terimi.
   *
   * Bolum sayfalari ("Makine muhendisligi staj ilanlarina bak") kisiyi
   * listeye o bolumun kelimesiyle getiriyor. Yoksa bos listeye dusuyor ve
   * okudugu seyin karsiligini goremiyor.
   */
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /** Sıfır sonuç ekranındaki yönlendirmeler için; verilmezse o düğmeler çizilmiyor. */
  onNavigate?: (yol: string) => void;
  countrySelection?: string;
  countryFacets?: Array<{code:string;count:number}>;
  onCountryChange?: (country:string)=>void;
  /* "Bu aramayı kaydet" için: toast ve giriş kapısı çağıranda. */
  onToast?: (mesaj: string) => void;
  onAramaKaydetGirisi?: () => void;
  catalogTotal?: number;
  /*
    Sunucudan gelen şirket ve şehir toplamları. İstemci bunları
    hesaplayamıyor: elinde yalnız yüklenmiş sayfa var (bkz. sağ sütun).
  */
  catalogCompanyTotal?: number;
  catalogCityTotal?: number;
  catalogVerifiedTotal?: number;
  catalogLastVerifiedAt?: string | null;
  hasMoreCountriesPage?: boolean;
  onLoadMoreCountriesPage?: ()=>void;
}

export const MatchedInternshipsView: React.FC<MatchedInternshipsViewProps> = ({
  student,
  allListings,
  applications,
  subTab = 'all',
  onSubTabChange,
  onViewDetails,
  onQuickApply,
  kendiSirketId,
  onGoToProfile,
  onCvOlustur,
  onRequireLogin,
  searchQuery,
  onSearchChange,
  onNavigate,
  countrySelection='all',
  countryFacets=[],
  onCountryChange,
  onToast,
  onAramaKaydetGirisi,
  catalogTotal,
  catalogCompanyTotal,
  catalogCityTotal,
  catalogVerifiedTotal,
  catalogLastVerifiedAt,
  hasMoreCountriesPage=false,
  onLoadMoreCountriesPage,
}) => {

  /*
    KAYDEDİLEN İLANLAR

    "Kaydet" ile "Başvurdum" ayrı tutuluyor: biri ilgi, diğeri tamamlanmış
    bir eylem. Kayıtlar sunucuda (saved_listings), çünkü öğrenci telefonda
    kaydedip bilgisayarda bakabilmeli.

    Giriş yapılmamışsa düğme hiç çizilmiyor — kaydedilen bir şeyin kaybolması
    kaydetmemekten kötü.
  */
  /*
    İŞVEREN ÖLÇÜMÜ — TEK TOPLU İSTEK, PAYLAŞILAN ÖNBELLEK

    Boş sonuç ekranı ancak filtre hiçbir ilana uymadığında çiziliyor,
    ama kanca burada koşuyor: liste dolu da olsa istek bir kez çıkıyor
    ve önbellek dizin sayfasıyla paylaşılıyor.
  */
  const isverenDizini = useIsverenDizini();
  const [kayitliIlanlar, setKayitliIlanlar] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!student?.id) {
      setKayitliIlanlar(new Set());
      return;
    }
    let iptal = false;
    void fetchSavedListingIds(student.id)
      .then((idler) => {
        if (!iptal) setKayitliIlanlar(new Set(idler));
      })
      .catch(() => {
        /* Kayıt listesi okunamazsa liste yine çalışsın; düğme boş durumda kalır. */
      });
    return () => {
      iptal = true;
    };
  }, [student?.id]);

  const kaydiDegistir = React.useCallback(
    (ilanId: string) => {
      if (!student?.id) return;
      const kayitliydi = kayitliIlanlar.has(ilanId);

      /* Önce arayüz: tıklama anında geri bildirim olsun, ağ beklenmesin. */
      setKayitliIlanlar((onceki) => {
        const yeni = new Set(onceki);
        if (kayitliydi) yeni.delete(ilanId);
        else yeni.add(ilanId);
        return yeni;
      });

      void toggleSavedListing(student.id, ilanId, kayitliydi).catch(() => {
        /* Sunucu kabul etmediyse arayüz gerçeğe dönsün. */
        setKayitliIlanlar((onceki) => {
          const yeni = new Set(onceki);
          if (kayitliydi) yeni.add(ilanId);
          else yeni.delete(ilanId);
          return yeni;
        });
      });
    },
    [student?.id, kayitliIlanlar],
  );

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

  /*
    YURTDIŞI — ÜLKESİ BİLİNEN VE TÜRKİYE OLMAYAN İLANLAR

    Sunucu kataloğu ülke kodu (`TR`, `DE`…), `all` ya da `remote` ile
    seçiliyor; "Türkiye dışı" diye bir seçenek yok. Küre şeridindeki
    Yurtdışı bu yüzden `all` kataloğunu istiyor ve listede ülkesi bilinen,
    `TR` olmayan ilanları bırakıyor. Ülkesi BOŞ olan ilan buraya da
    Türkiye'ye de girmiyor: tahmin edilmiyor.
  */
  /*
    SEÇİM ADRESTE (`?bolge=yurtdisi`), BİLEŞENDE DEĞİL

    Katalog ülkesi değişince liste yeniden yükleniyor ve bu görünüm
    yeniden kuruluyor; yalnız bileşen durumunda tutulan seçim o anda
    kayboluyordu (ölçüldü: Yurtdışı'na basınca "Tümü" seçili kalıyordu).
    Adreste durunca yeniden kurulumda okunuyor, paylaşılan bağlantıda ve
    geri tuşunda da doğru bölge açılıyor.
  */
  const yurtdisiAdreste = () =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('bolge') === 'yurtdisi';
  const [yurtdisiSecili, setYurtdisiDurumu] = useState(yurtdisiAdreste);
  const setYurtdisiSecili = (acik: boolean) => {
    const params = new URLSearchParams(window.location.search);
    if (acik) params.set('bolge', 'yurtdisi');
    else params.delete('bolge');
    const sorgu = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${sorgu ? `?${sorgu}` : ''}`);
    setYurtdisiDurumu(acik);
  };
  useEffect(() => {
    const oku = () => setYurtdisiDurumu(yurtdisiAdreste());
    window.addEventListener('popstate', oku);
    return () => window.removeEventListener('popstate', oku);
  }, []);

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
    /*
      Kaydettiklerim yalnızca giriş yapılmışsa görünüyor: kaydetme sunucuda
      tutuluyor ve giriş yapılmadan zaten kaydedilemiyor. Boş bir sekme
      göstermek, çalışmayan bir özellik göstermek olurdu.
    */
    ...(student?.id ? [{ id: 'kaydettiklerim', label: 'Kaydettiklerim' }] : []),
    { id: 'high_match', label: 'Sana En Uygun (%80+)' },
    { id: 'public_sector', label: 'Kamu Stajları' },
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
      case 'kaydettiklerim':
        return kayitliIlanlar.has(listing.id);
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
  }, [matchedData, subTab, kayitliIlanlar]);

  /*
    SÜZME TEK YERDE, "BİR FİLTREYİ ATLA" SEÇENEĞİYLE

    Aynı koşullar iki yerde lazım: listeyi süzerken ve "şu filtre kaç ilanı
    gizliyor" hesabını yaparken. İkinci bir kopya yazmak, ikisinin zamanla
    ayrışması ve kullanıcıya yanlış sayı gösterilmesi demekti. `atla`
    parametresi yalnız o filtreyi gevşetiyor, geri kalan aynen uygulanıyor.
  */
  type SuzgecAdi =
    | 'arama'
    | 'sehir'
    | 'bicim'
    | 'sirket'
    | 'tarih'
    | 'zorunlu'
    | 'ucretli'
    | 'uyum'
    | 'bolum';

  /*
    KANONIK FILTRE NESNESI

    Listenin durumundan uretiliyor ve "Bu aramayi kaydet" ile gunluk
    ozet iscisinin kullandigi sozlesmenin ta kendisi. Sehir icin
    `diger` ozel degeri kanonik sozlesmede yok -- o secim listeye ozel
    kaliyor (asagida ayri ele aliniyor).
  */
  /*
    AÇIK BÖLÜM FİLTRESİ — ADRESTEN, ELEME OLARAK

    İki ayrı şey vardı ve biri hiç çalışmıyordu:
      `bolumAlani` (çipler)  SIRALAMA sinyali — hiçbir ilanı elemiyor
      `?bolum=<slug>`        AÇIK FİLTRE — eleme yapmalı

    İkincisi kanonik nesnede YOKTU: bölüm sayfasından gelen bağlantı
    parametreyi taşıyor ama liste onu okumuyordu. `adresTenFiltreler`
    ayrıştırıyordu, kimse uygulamıyordu.

    Adresten okunuyor ve geri/ileri ile birlikte çalışıyor: `popstate`
    dinleniyor, yani tarayıcı geçmişinde gezinmek filtreyi doğru
    değiştiriyor.
  */
  const [acikBolumler, setAcikBolumler] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : adresTenFiltreler(window.location.search).departments
  );
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const oku = () => setAcikBolumler(adresTenFiltreler(window.location.search).departments);
    window.addEventListener('popstate', oku);
    return () => window.removeEventListener('popstate', oku);
  }, []);

  const kanonikFiltreler = React.useMemo(
    () =>
      filtreleriDogrula({
        q: searchQuery,
        country: countrySelection,
        /* Yurtdışı görünümü kayıtlı aramada da korunuyor (lib/ilan-cografyasi). */
        bolge: yurtdisiSecili ? 'yurtdisi' : null,
        city: selectedCity === 'diger' ? 'all' : selectedCity,
        workTypes,
        /* Şirket ve tarih aralığı artık KAYDEDİLİYOR: ikisinin de
           kalıcı arama anlamı var ve listede uygulanıyorlar. */
        companies: selectedCompanies,
        /* Açık bölüm filtresi: eleme. Çipler ayrı ve yalnız sıralıyor. */
        departments: acikBolumler,
        postedWithinDays: dateRange === 'all' ? null : Number(dateRange),
        pay: onlyPaid ? 'paid' : 'all',
        mandatory: onlyMandatory,
      }),
    [
      searchQuery,
      countrySelection,
      yurtdisiSecili,
      selectedCity,
      workTypes,
      selectedCompanies,
      acikBolumler,
      dateRange,
      onlyPaid,
      onlyMandatory,
    ]
  );

  const gecer = React.useCallback(
    (listing: InternshipListing, match: MatchBreakdown, atla?: SuzgecAdi): boolean => {
      if (!matchesCategory(listing, match, subTab)) return false;

      /*
        PAYLASILAN KOSULLAR KANONIK MODULDE

        `atla` bir suzgeci gevsetiyor: o durumda ilgili alan kanonik
        nesneden CIKARILIYOR, ayri bir kopya kural yazilmiyor.
      */
      const paylasilan = filtreleriDogrula({
        ...kanonikFiltreler,
        ...(atla === 'arama' ? { q: '' } : {}),
        ...(atla === 'sehir' ? { city: 'all' } : {}),
        ...(atla === 'bicim' ? { workTypes: [] } : {}),
        ...(atla === 'ucretli' ? { pay: 'all' } : {}),
        ...(atla === 'zorunlu' ? { mandatory: false } : {}),
        ...(atla === 'sirket' ? { companies: [] } : {}),
        ...(atla === 'tarih' ? { postedWithinDays: null } : {}),
        ...(atla === 'bolum' ? { departments: [] } : {}),
      });
      if (!aramaEslesiyorMu(ilaniNormalize(listing), paylasilan)) return false;

      /*
        SEHIR `diger` LISTEYE OZEL

        Kanonik sozlesmede "tanimli il listesinin disinda kalanlar"
        diye bir deger yok ve olmamali: kayitli arama somut bir sehir
        (ya da hepsi) tutuyor. Bu secim yalnizca listedeki gorunum.
      */
      if (atla !== 'sehir' && selectedCity === 'diger' && ilBul(listing.city) !== null) {
        return false;
      }

      /* Şirket ve tarih aralığı YUKARIDA kanonik modülde. */

      /*
        Yurtdışı görünümü kanonik filtrede (`bolge`) uygulanıyor — tek kural
        lib/ilan-cografyasi.mjs. Konumu belirsiz ilan yurtdışı SAYILMIYOR;
        "Tüm ilanlar"da duruyor.
      */

      /* Zorunlu staj ve ucret kosullari YUKARIDA kanonik modulde. */
      if (atla !== 'uyum' && match.overallScore < minMatchScore) return false;

      return true;
    },
    [
      kanonikFiltreler,
      subTab,
      searchQuery,
      selectedCity,
      workTypes,
      selectedCompanies,
      dateRange,
      onlyMandatory,
      onlyPaid,
      minMatchScore,
      kayitliIlanlar,
      yurtdisiSecili,
    ],
  );

  /*
    BÖLÜM TERCİHİ

    Süzgeç DEĞİL, sıralama girdisi: seçim hiçbir ilanı listeden çıkarmıyor
    (bkz. BolumCipleri). Bu yüzden `gecer` içine değil, sıralamanın en
    sonuna uygulanıyor — kullanıcının seçtiği sıralama korunuyor, alanına
    uyanlar o sıra içinde öne alınıyor.
  */
  const [bolumAlani, setBolumAlani] = useState<string | null>(null);

  // Filter & sort
  const filteredListings = useMemo(() => {
    const sirali = matchedData
      .filter(({ listing, match }) => gecer(listing, match))
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
    /*
      AĞIRLIKLI BÖLÜM SIRALAMASI — FİLTRELEMEZ

      `alanaGoreSirala` ikili çalışıyordu ve `department_tags`ı HİÇ
      okumuyordu: ilanın kendi bölüm etiketi — en güçlü sinyal — hesaba
      girmiyordu. Ağırlıklar: etiket 3, başlık 2, açıklama 1.

      ŞİRKET ADI HÂLÂ DIŞARIDA: "invent.ai" içindeki "ai", "İnsan
      Kaynakları Stajyeri" ilanını Yazılım alanına sokuyordu (tarayıcıda
      görüldü). `bolumSkoru` başlık ve açıklamaya bakıyor, şirket adına
      bakmıyor.

      BU SATIR FİLTRELENMİŞ KÜMENİN TAMAMI ÜZERİNDE koşuyor; sayfalama
      aşağıda, `gosterilecekIlanSayisi` ile yapılıyor. Yalnız görünen
      sayfayı sıralamak, "daha fazla göster"e basınca sıranın değişmesi
      demekti.
    */
    return bolumeGoreSirala(sirali, bolumAlani, (x: { listing: InternshipListing }) => x.listing);
  }, [matchedData, gecer, sortBy, bolumAlani]);

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
  /*
    ŞEHRİ BİLİNMEYEN İLAN BİR ŞEHİR DEĞİL

    Boş `city` değeri kümede tek bir giriş açıyor ve şehir sayısını bir
    artırıyordu. Ölçüldü (canlı, country=remote): sunucu 1 şehir sayarken
    ekranda 2 yazıyordu — fazladan sayılan şey şehirsiz iki ilandı.
    Sunucu tarafı da (`nullif(btrim(city),'')`) aynı kuralı uyguluyor,
    yani iki sayım artık aynı şeyi ölçüyor.
  */
  const cityCount = new Set(
    filteredListings
      .map((item) => ilBul(item.listing.city) ?? item.listing.city)
      .filter((sehir): sehir is string => typeof sehir === 'string' && sehir.trim().length > 0)
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
  /*
    DOLULUK PROFİL EKRANIYLA AYNI KAYNAKTAN (lib/cv-hazirlik.mjs)

    Burada ayrı bir liste vardı (not ortalaması dahil, CV hariç) ve aynı
    profil iki ekranda iki farklı yüzde gösteriyordu.
  */
  const doluluk = student ? profilDolulugu(student) : null;
  const profileChecks: boolean[] = doluluk ? doluluk.adimlar.map((a) => a.tamam) : [];
  const profileCompletion = doluluk ? doluluk.oran : 0;

  /*
    KÜÇÜK CV ÇAĞRISI — YALNIZ CV'Sİ OLMAYAN VE KAPATMAMIŞ ÖĞRENCİYE

    Doluluk çubuğunun yerinde, aynı ölçüde tek satır; yeni bir banner değil.
    Kapatma bu hesap için saklanıyor (`cvCagrisiniKapat`).
  */
  const [cvCagrisiKapali, setCvCagrisiKapali] = useState<boolean>(() => {
    if (!student) return true;
    try {
      return cvCagrisiKapatildiMi(window.localStorage, student.id);
    } catch {
      return false;
    }
  });
  const cvCagrisiGoster = Boolean(student && onCvOlustur && !cvVarMi(student) && !cvCagrisiKapali);

  /** İlan veren farklı şirket sayısı. Profil yokken uyum yerine bu gösteriliyor. */
  /* Çip sayıları TÜM eşleşen ilanlardan; seçim listeyi daraltmadığı için
     sayı da seçime göre değişmiyor. */
  const bolumSayilari = useMemo(
    () =>
      alanSayilari(matchedData, (x: { listing: InternshipListing }) => [x.listing.title]),
    [matchedData],
  );

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
  }, [matchedData, subTab, kayitliIlanlar]);

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
  }, [matchedData, subTab, kayitliIlanlar]);

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
  }, [matchedData, subTab, kayitliIlanlar]);

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

  /*
    BAŞLIKTAKİ VE ŞERİTTEKİ SAYI

    Liste 24'lük sayfalar hâlinde yükleniyor ("Daha fazla ilan göster" ile
    devamı geliyor). Başlıkta yüklenmiş kayıt sayısını yazmak kullanıcıya
    "ilan bitti" dedirtiyordu — ölçülen örnek: katalogda 62 ilan varken
    başlıkta "(24)" yazıyor, kişi 24 ilan kaldığını sanıyordu.

    Daraltma varken toplamı gösteremeyiz: süzme İSTEMCİDE ve yalnız yüklenmiş
    kayıtlar üzerinde çalışıyor, sunucunun toplamı o seçime göre süzülmüş
    değil. O durumda doğru olan yüklenmiş eşleşme sayısı.

    "Daraltma" için yeni bir bayrak yok, ekranda zaten olan üç sinyal
    toplanıyor: süzgeç rozetindeki `acikSuzgecSayisi` (suzgecleriTemizle'nin
    sıfırladığı şehir/çalışma tercihi/tarih/şirket/ilan özellikleri/uyum),
    arama kutusu ve kategori sekmesi. Bölüm çipleri (`bolumAlani`) BİLEREK
    dışarıda: alanaGoreSirala listeyi sıralıyor, hiçbir ilanı elemiyor.
  */
  /* Yurtdışı da daraltma: sayı sunucu toplamından değil süzülmüş listeden gelir. */
  const daraltmaVar = acikSuzgecSayisi > 0 || searchQuery.trim().length > 0 || subTab !== 'all' || yurtdisiSecili;

  /*
    KÜRE ŞERİDİNDE HANGİ BÖLGE SEÇİLİ

    Durumun kendisinden türetiliyor, ayrı bir kopyası tutulmuyor: süzgeç
    panelindeki ülke seçicisi de aynı `countrySelection`ı değiştiriyor ve
    iki yer ayrışamıyor. Panelden belirli bir ülke (ör. Almanya)
    seçildiyse dört küreden hiçbiri seçili görünmüyor.
  */
  /*
    TÜRKİYE / YURTDIŞI / TÜM İLANLAR (17 Eylül 2026)

    Üç kapı, hepsi mevcut durumdan türüyor:
      Türkiye     → sunucu kataloğu `country=TR`
      Yurtdışı    → `country=all` + `?bolge=yurtdisi` (sınıflandırma istemcide,
                    kataloğun tamamı yükleniyor) ya da panelden seçilen
                    TR dışı bir ülke kodu
      Tüm ilanlar → `country=all`; konumu belirsiz ilanlar dahil katalogun tamamı
    "Uzaktan" bir kapı değil, çalışma biçimi süzgeci (panel).
  */
  const ulkeKoduSecili = /^[A-Z]{2}$/.test(countrySelection);
  const seciliBolge: IlanBolgesi | null =
    yurtdisiSecili || (ulkeKoduSecili && countrySelection !== 'TR')
      ? 'yurtdisi'
      : countrySelection === 'TR'
        ? 'turkiye'
        : countrySelection === 'all'
          ? 'tumu'
          : null;

  const bolgeSec = (bolge: IlanBolgesi) => {
    setYurtdisiSecili(bolge === 'yurtdisi');
    if (bolge === 'tumu') setSelectedCompanies([]);
    /* Kapı değişince geçersiz kalan şehir seçimi temizleniyor. */
    if (bolge !== 'turkiye') setSelectedCity('all');
    const ulke = bolge === 'turkiye' ? 'TR' : 'all';
    if (ulke !== countrySelection) onCountryChange?.(ulke);
  };

  /* Panelden ülke değişirse Yurtdışı bayrağı düşüyor (ülke kodu zaten yurtdışını söylüyor). */
  const ulkeDegistir = (ulke: string) => {
    if (ulke === 'yurtdisi') {
      bolgeSec('yurtdisi');
      return;
    }
    setYurtdisiSecili(false);
    if (ulke !== 'TR') setSelectedCity('all');
    onCountryChange?.(ulke);
  };

  /*
    KONTROL NABZI — gerçek kayıttan

    Bugün (Europe/Istanbul) kaynağında açık olduğu doğrulanan yayındaki ilan
    sayısı: `source_verified_at` bağlantı kontrolünün BAŞARILI sonucunda
    yazılıyor (scripts/ilan-baglanti-kontrol.mjs). `updated_at` kullanılmıyor.
    Sayı alınamazsa ya da sıfırsa satır çizilmiyor.
  */
  const [bugunDogrulanan, setBugunDogrulanan] = useState<number | null>(null);
  useEffect(() => {
    let iptal = false;
    fetchBugunDogrulananIlanSayisi()
      .then((adet) => !iptal && setBugunDogrulanan(adet))
      .catch(() => !iptal && setBugunDogrulanan(null));
    return () => {
      iptal = true;
    };
  }, []);

  /* Yurtdışı görünümünden mevcut rehberlere bağlantı — yalnız gerçekten var olanlar. */
  const [yurtdisiRehberleri, setYurtdisiRehberleri] = useState<Array<{ slug: string; baslik: string }>>([]);
  useEffect(() => {
    if (seciliBolge !== 'yurtdisi' || yurtdisiRehberleri.length > 0) return;
    let iptal = false;
    import('../data/rehberler')
      .then(({ REHBERLER }) => {
        if (iptal) return;
        setYurtdisiRehberleri(
          REHBERLER.filter((r) => r.kategori === 'ogrenci' && r.konu === 'yurtdisi')
            .slice(0, 3)
            .map((r) => ({ slug: r.slug, baslik: r.baslik })),
        );
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [seciliBolge, yurtdisiRehberleri.length]);

  /*
    YURTDIŞI SEÇİLİYKEN KATALOĞUN TAMAMI YÜKLENİYOR

    `all` kataloğu 24'erli sayfalarla geliyor ve ilk sayfada yurtdışı ilanı
    az olabiliyor; sayfalar tamamlanmadan liste yarım ve sayı eksik kalırdı.
    Her yeni sayfa geldiğinde bir sonraki isteniyor — aynı anda tek istek
    (son istenen uzunluk tutuluyor), sayfa bitince duruyor.
  */
  /*
    KÜRE DÖNÜŞÜ — FİLTREDEN AYRI DURUM

    Seçili küreye tekrar dokunuş filtreyi değiştirmiyor, yalnız küreyi
    çeviriyor (kurallar lib/kure-donusu.mjs). Durum açıldığı andaki filtre
    imzasıyla saklanıyor; filtre değişince imza tutmuyor ve küre ön yüzüne
    dönüyor.
  */
  const filtreImzasi = JSON.stringify([kanonikFiltreler, yurtdisiSecili, subTab, selectedCity, minMatchScore]);
  const [kureDurumu, setKureDurumu] = useState<{ anahtar: string; imza: string } | null>(null);
  const donukAnahtar = donukKure(kureDurumu, filtreImzasi);
  const kureCevir = (anahtar: string) =>
    setKureDurumu((durum) => kureDokunusu(durum, { anahtar, secili: true, imza: filtreImzasi }).durum);

  /*
    DÖNEN KÜRENİN SAYISI

    Daraltma yoksa sunucu toplamı kesin. Yurtdışında sunucunun ülke
    dağılımı (`facets.countries`) kullanılıyor: TR dışındaki ülkelerin
    toplamı. Ülkesi boş ilanlar o dağılımda yok, yani Türkiye ya da
    Yurtdışı diye varsayılmıyor. Şirket küresinde ve daraltma varken sayı
    ancak bütün sayfalar yüklenince kesin; o sırada "…".
  */
  const tumuYuklendi = !hasMoreCountriesPage;
  const digerDaraltma = acikSuzgecSayisi > 0 || searchQuery.trim().length > 0 || subTab !== 'all';
  const donukSayi = (() => {
    if (!donukAnahtar) return null;
    const suzulmusSirketler = filteredListings.map((x) => x.listing.companyName?.trim() ?? '');
    if (donukAnahtar.startsWith('sirket:')) {
      return kureSayisi({
        sirketAdi: donukAnahtar.slice('sirket:'.length),
        daraltmaVar: true,
        catalogTotal,
        tumuYuklendi,
        suzulmusSirketler,
      });
    }
    if (donukAnahtar === 'bolge:yurtdisi') {
      const yurtdisiToplami = countryFacets
        .filter((f) => f.code !== 'TR')
        .reduce((toplam, f) => toplam + f.count, 0);
      return kureSayisi({
        daraltmaVar: digerDaraltma || countrySelection !== 'all',
        catalogTotal: yurtdisiToplami,
        tumuYuklendi,
        suzulmusSirketler,
      });
    }
    return kureSayisi({ daraltmaVar, catalogTotal, tumuYuklendi, suzulmusSirketler });
  })();

  const yurtdisiIstenenUzunluk = useRef(-1);
  /* Dönen kürenin sayısı bilinmiyorsa da kalan sayfalar yükleniyor. */
  const sayiIcinYukle = donukAnahtar !== null && donukSayi === null;
  useEffect(() => {
    if (!hasMoreCountriesPage) return;
    /* Kaydettiklerim de kataloğun tamamını istiyor: kayıtlı ilan ilk sayfada olmayabilir. */
    const kayitlilarAcik = subTab === 'kaydettiklerim';
    if (!sayiIcinYukle && !kayitlilarAcik && (!yurtdisiSecili || countrySelection !== 'all')) return;
    if (yurtdisiIstenenUzunluk.current === allListings.length) return;
    yurtdisiIstenenUzunluk.current = allListings.length;
    onLoadMoreCountriesPage?.();
  }, [yurtdisiSecili, sayiIcinYukle, subTab, countrySelection, hasMoreCountriesPage, allListings.length, onLoadMoreCountriesPage]);

  const gosterilecekToplam = gosterilecekIlanSayisi({
    catalogTotal,
    suzulmusAdet: filteredListings.length,
    daraltmaVar,
  });

  /*
    SAĞ SÜTUN SAYAÇLARI — AYNI KURAL, AYNI KAYNAK

    Üçü de `gosterilecekIlanSayisi` kuralından geçiyor: daraltma yokken
    sunucudan gelen toplam, daraltma varken ekrandaki süzülmüş sayı.
    Böylece liste başlığındaki "(62)" ile sağdaki "62" aynı yerden
    geliyor ve ayrışamıyorlar.

    Önce üçü de `filteredListings` üzerinden hesaplanıyordu ve o dizi
    yalnız yüklenmiş ilk sayfayı taşıyor. Ölçüldü (canlı, 1440px,
    country=TR): ekranda 24 / 23 / 4 yazarken gerçek değerler 62 / 51 / 6
    idi — "24" sayfa boyunun kendisiydi.
  */
  const gosterilecekSirket = gosterilecekIlanSayisi({
    catalogTotal: catalogCompanyTotal,
    suzulmusAdet: companyCount,
    daraltmaVar,
  });
  const gosterilecekSehir = gosterilecekIlanSayisi({
    catalogTotal: catalogCityTotal,
    suzulmusAdet: cityCount,
    daraltmaVar,
  });

  /*
    GÜVEN SATIRI — başlığın hemen altında, tek satır.

    Cümlenin kendisi lib/guven-satiri.mjs içinde kuruluyor ve verisi
    sayaçlarla AYNI sorgudan geliyor. Doğrulama yoksa o kısım hiç
    yazılmıyor: ölçüldü, Fransa listesindeki 48 ilanın hiçbirinin
    kaynağı doğrulanmamış ve sabit bir cümle orada yalan olurdu.

    Daraltma varken doğrulama kısmı gösterilmiyor: sunucudan gelen sayı
    süzülmüş kümeyi değil, ülkenin tamamını anlatıyor.
  */
  const guven = guvenSatiri({
    toplam: gosterilecekToplam,
    dogrulanan: daraltmaVar ? 0 : catalogVerifiedTotal,
    sonDogrulama: catalogLastVerifiedAt ?? null,
  });

  /*
    SIFIR SONUÇ EKRANININ VERİSİ

    Üç şey hesaplanıyor: aynı kelimeyle eşleşen fırsat sayısı, açık
    filtrelerin listesi ve her filtrenin kaç ilanı gizlediği. Üçü de
    ölçülüyor — "belki şu filtre yüzündendir" demek yerine kaldırıldığında
    kaç ilan açıldığı sayılıyor.
  */
  const [firsatSayisi, setFirsatSayisi] = React.useState<number | null>(null);
  const [sablonAcik, setSablonAcik] = React.useState(false);

  const sonucYok = filteredListings.length === 0;

  React.useEffect(() => {
    if (!sonucYok) {
      setFirsatSayisi(null);
      return;
    }
    let iptal = false;
    void fetchOpportunities()
      .then((hepsi) => {
        if (iptal) return;
        /*
          STAJ ARAMA METNİ FIRSAT VERİSİNE UYGULANMIYOR

          Önce `searchQuery` fırsatların başlık/kurum/özetinde
          aranıyordu ve sonuç "eşleşen N öğrenci fırsatı" diye
          sunuluyordu. İki sorun: staj araması ("yazılım stajyeri")
          burs verisinde anlamlı bir eşleşme üretmiyor, ve ürettiğinde
          de o eşleşme tesadüfi — kullanıcı burs aramamıştı.

          Sayılan tek şey: sistemde AÇIK fırsat var mı. Varsa en altta
          küçük bir bağlantı çıkıyor, yoksa hiç çıkmıyor.
        */
        setFirsatSayisi(hepsi.length);
      })
      .catch(() => {
        /* Fırsatlar okunamazsa ekran diğer önerilerle çalışmaya devam etsin. */
        if (!iptal) setFirsatSayisi(null);
      });
    return () => {
      iptal = true;
    };
    /* `searchQuery` bağımlılıktan çıktı: terim artık kullanılmıyor. */
  }, [sonucYok]);

  /*
    Bir filtre kaldırılsa kaç ilan görünürdü? Diğer bütün filtreler açık
    bırakılıp yalnız o filtre gevşetiliyor; fark, o filtrenin gizlediği
    ilan sayısı.
  */
  const suzgecKazanci = React.useCallback(
    (ad: SuzgecAdi) => {
      let sayi = 0;
      for (const { listing, match } of matchedData) {
        if (gecer(listing, match, ad)) sayi++;
      }
      return Math.max(0, sayi - filteredListings.length);
    },
    [matchedData, gecer, filteredListings.length],
  );

  const aktifSuzgecler: AktifSuzgec[] = React.useMemo(() => {
    const liste: AktifSuzgec[] = [];
    const ekle = (kosul: boolean, etiket: string, ad: SuzgecAdi, kaldir: () => void) => {
      if (kosul) liste.push({ etiket, kaldir, kazanc: suzgecKazanci(ad) });
    };

    ekle(selectedCity !== 'all', `Şehir: ${selectedCity === 'diger' ? 'Diğer' : selectedCity}`, 'sehir', () =>
      setSelectedCity('all'),
    );
    ekle(workTypes.length > 0, `Çalışma biçimi (${workTypes.length})`, 'bicim', () => setWorkTypes([]));
    ekle(dateRange !== 'all', 'Eklenme tarihi', 'tarih', () => setDateRange('all'));
    ekle(selectedCompanies.length > 0, `Şirket (${selectedCompanies.length})`, 'sirket', () =>
      setSelectedCompanies([]),
    );
    ekle(onlyMandatory, 'Zorunlu staj kabul', 'zorunlu', () => setOnlyMandatory(false));
    ekle(onlyPaid, 'Ücretli', 'ucretli', () => setOnlyPaid(false));
    ekle(minMatchScore > 0, `En az %${minMatchScore} uyum`, 'uyum', () => setMinMatchScore(0));

    return liste;
  }, [
    selectedCity,
    workTypes,
    dateRange,
    selectedCompanies,
    onlyMandatory,
    onlyPaid,
    minMatchScore,
    suzgecKazanci,
  ]);

  /* Arama ve süzgeç tutamağı üst çubuğa; bkz. lib/sayfa-aramasi. */
  const aramaDegisti = React.useCallback((deger: string) => setSearchQuery(deger), []);
  const suzgecAcKapa = React.useCallback(() => setFiltreAcik((o) => !o), []);
  useSayfaAramasiKaydet({
    yerTutucu: 'Pozisyon veya şirket ara',
    onDegisti: aramaDegisti,
    onSuzgec: suzgecAcKapa,
    acikSuzgec: aktifSuzgecler.length,
    suzgecAcik: filtreAcik,
  });

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
      /* Şehir menüsü yalnız Türkiye görünümünde: Paris/Berlin Türkiye şehri gibi sunulmuyor. */
      if (ilanCografyasi(listing) !== COGRAFYA.TURKIYE) continue;
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
  }, [matchedData, subTab, kayitliIlanlar]);

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

      {/*
        Telefonda satır boşluğu SIFIR: başlık `sr-only` olunca ızgaranın
        ilk satırı boş kalıyor ve `gap-4` onu 16 piksellik bir bant
        olarak gösteriyordu. `sm:` üstünde boşluk duruyor — orada iki
        sütun yan yana ve aralarında nefes payı gerekiyor.
      */}
      <div className={`grid grid-cols-1 items-start gap-0 sm:gap-6 lg:grid-cols-12 ${YUZEY.kolon}`}>

        {/*
          SOL SÜTUN TELEFONDA YER KAPLAMIYOR.

          Başlık `sr-only` olunca ve süzgeç paneli kapalıyken bu sütunun
          içinde çizilecek bir şey kalmıyor; ama sütun yine de 34 piksel
          yer tutuyor ve panelin kabı 2 piksellik bir çizgi bırakıyordu
          (ölçüldü: üst çubuk 61'de bitiyor, liste 118'de başlıyordu).

          `contents` kabı düzenden çıkarıyor: çocuklar doğrudan ızgaraya
          giriyor, `sr-only` başlık yer tutmuyor ve panel açılmadıkça
          hiçbir kutu çizilmiyor. `lg:block` ile geniş ekranda sütun
          eskisi gibi geri geliyor.
        */}
        <div className="contents lg:block lg:col-span-3 lg:space-y-4 lg:sticky lg:top-4">
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
          {/*
            Başlık telefonda GÖRSELDEN kalktı, metinden kalkmadı:
            `sr-only` öğeyi ekrandan çıkarıyor ama DOM'da ve
            erişilebilirlik ağacında bırakıyor — ön render edilen `h1`
            yerinde. Geniş ekranda eskisi gibi görünüyor.
          */}
          {/*
            ONAYLANAN TASARIM: ÜST ETİKET + KISA BAŞLIK

            Başlık telefonda `sr-only` idi (dikey yer ilanın hakkı diye).
            Onaylanan tasarımda sayfanın adı telefonda da GÖRÜNÜYOR: kişi
            alt menüden "İlanlar"a bastığında nereye geldiğini okuyor.

            Üst etiket ("STAJ İLANLARI") gerçek metin, süs değil: arama
            niyetinin kelimesi ön render edilen HTML'de kalıyor — başlığın
            kendisi artık o kelimeyi taşımıyor.
          */}
          {/*
            BAŞLIK GÖRSELDEN KALKTI, METİNDEN KALKMADI (onaylanan tasarım)

            Onaylanan düzende üst çubuğun hemen altında küre şeridi var ve
            ilanlar doğrudan başlıyor. `sr-only` başlığı DOM'da ve
            erişilebilirlik ağacında tutuyor; ön render edilen `h1` de yerinde.
          */}
          <h1 className="sr-only">İlk adımın burada.</h1>

          {/*
            GÜVEN SATIRI

            Başlık ne yaptığımızı söylüyor, bu satır onu KANITLIYOR: kaç
            ilan var ve kaynakları en son ne zaman kontrol edildi.

            İkisi de gerçek sorgudan; sabit ya da tahmini sayı yok. Veri
            yoksa satır hiç çizilmiyor — boş bir güven cümlesi, cümlesizlikten
            daha kötü.
          */}
          {/*
            TELEFONDA GİZLİ: sayı zaten hemen altında, listenin kendi
            başlığında yazıyor ("SANA UYGUN STAJ İLANLARI (105)"). Aynı
            rakamı iki satır arayla iki kez yazmak, ilanın başlamasını
            geciktirmekten başka bir şey yapmıyordu. Geniş ekranda satır
            duruyor: orada başlık sol sütunda ve liste başlığı sağda,
            ikisi yan yana okunmuyor.
          */}
          {guven && (
            /*
              GÖRÜNÜMDEN KALKTI (kullanıcı isteği, 17 Eylül 2026): filtre
              paneli ve küre şeridi aynı hizadan başlasın — Fırsatlar ve
              Rehber'le tek tip. Cümle ekran okuyucuda duruyor.
            */
            <p className="sr-only">
              {guven.ilan}
              {guven.dogrulama && (
                <>
                  <span aria-hidden className="mx-1.5 text-gray-300">·</span>
                  <span className="font-medium">{guven.dogrulama}</span>
                </>
              )}
            </p>
          )}
          {/*
            ÜLKE SEÇİCİ VE "TOPLAM N AÇIK İLAN" BURADAN KALKTI

            Seçici filtre panelinin "Konum" bloğuna taşındı: listeyi daraltan
            bir kontrolün diğer süzgeçlerden ayrı, başlığın altında tek başına
            durması için bir sebep yoktu. Ülke şehirden geniş kapsam, o yüzden
            şehir seçicisinin de üstünde.

            "Toplam N açık ilan" satırı tekrar çizilmiyor: listenin başlığı
            artık gerçek toplamı gösteriyor ("AÇIK STAJ İLANLARI (62)"), aynı
            sayıyı sayfada iki yerde söylemek gereksiz.
          */}

          {/*
            Mobildeki "13 açık ilan · 10 şirket · 4 şehir" satırı kaldırıldı.

            Şirket şeridi eklenince aynı bilgiyi zaten söylüyor: ilk daire
            "Tümü — 13 ilan" yazıyor ve şirket sayısı daire sayısı kadar.
            Telefonda dikey yer ilanın hakkı; aynı sayıyı iki kez göstermek
            için harcanmamalı.

            Geniş ekrandaki sayaç kartı duruyor: sağ sütunda kendi yeri var
            ve şeridin göstermediği "şehir" sayısını da veriyor.
          */}

          {/*
            İÇİ BOŞALMIŞ SARMALAYICI KALDIRILDI

            Burada `space-y-3` bir kap ve içinde `mt-4` taşıyan bir satır
            vardı. Satırın içindeki her şey — arama kutusu, süzgeç düğmesi,
            şehir seçici — başka yerlere taşındı (arama ve süzgeç üst
            çubuğa, şehir süzgeç paneline) ve geriye yalnız iki boş kutu
            kaldı.

            Boş olmalarına rağmen ÇİZİLİYORLARDI: `mt-4` telefonda
            ızgaranın ilk satırını 16 piksel yapıyor ve orta sütunu o kadar
            aşağı itiyordu. Yani üst çubukla liste başlığı arasındaki
            boşluk bir tasarım kararı değil, bir artıktı — Rehber'de aynı
            artık olmadığı için orada başlık üst çubuğa yapışıyordu.

            Boşluk kaybolmadı, KAYNAĞI DEĞİŞTİ: başlık satırının kendi
            `pt-4` değeri (ui/tokens · LISTE_BASLIGI) ve üç sayfada da aynı.
          */}

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
          {cvCagrisiGoster && (
            <div className="flex w-full items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 py-1.5 pl-3 pr-1.5">
              <p className="min-w-0 flex-1 text-xs font-semibold text-blue-900 sm:text-sm">
                Başvurularında kullanabileceğin CV’ni oluştur.
              </p>
              <button
                type="button"
                onClick={onCvOlustur}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:text-sm"
              >
                CV’mi oluştur
              </button>
              <button
                type="button"
                onClick={() => {
                  setCvCagrisiKapali(true);
                  try {
                    cvCagrisiniKapat(window.localStorage, student!.id);
                  } catch {
                    /* Depo kapalı: bu oturumda kapalı kalıyor. */
                  }
                }}
                aria-label="CV çağrısını kapat"
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-blue-800/70 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
          )}
          {student && !cvCagrisiGoster && profileCompletion < 100 && (
            <button
              type="button"
              onClick={onGoToProfile}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-blue-100 bg-blue-50/70 text-left cursor-pointer hover:bg-blue-100/70 transition-colors"
            >
              {/*
                Yüzde tek başına ne yapılacağını söylemiyor. Kalan adım
                sayısı eyleme dönük: "iki alan doldur" ile "%70" aynı bilgi
                değil.
              */}
              <span className="shrink-0 text-xs font-bold text-blue-700 tabular-nums">
                %{profileCompletion}
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-blue-700/80">
                {profileChecks.filter((tamam) => !tamam).length} adım kaldı
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
      {/*
        Kap telefonda yalnız panel AÇIKKEN çiziliyor; kapalıyken kenarlığı
        ince bir çizgi olarak görünüyordu.
      */}
      <div className={`${filtreAcik ? 'block' : 'hidden'} lg:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden`}>

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
          "BU ARAMAYI KAYDET" — FİLTRE VARKEN

          Süzgeç başlığının hemen altında: kullanıcı filtreyi kurduğu
          yerde kaydediyor. Boş filtrede bileşen kendini hiç çizmiyor
          (bkz. `filtreBosMu`) — "bütün ilanlar"ı kaydetmek her gün her
          ilanı e-postalamak olurdu.
        */}
        {onToast && (
          <div className="px-3 pb-3">
            <AramayiKaydet
              filtreler={kanonikFiltreler}
              studentId={student?.id ?? null}
              onToast={onToast}
              onGirisGerekli={() => onAramaKaydetGirisi?.()}
            />
          </div>
        )}

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

        {/*
          ---- bölüm ----

          İlk ziyarette sorulan "Bölümün ne?" sorusu listenin üstündeydi.
          Onaylanan düzende küre şeridinden sonra doğrudan ilanlar geliyor;
          soru panelin başına taşındı ve burada her zaman erişilebilir.
          Bileşen panel kapalıyken de bağlı (panel CSS ile gizleniyor), yani
          kayıtlı bölüm tercihi açılışta yine uygulanıyor.
        */}
        <BolumCipleri
          panelde
          secili={bolumAlani}
          onSec={setBolumAlani}
          sayilar={bolumSayilari as Record<string, number>}
        />

        {/* ---- konum ---- */}
        <FiltreBlogu baslik="Konum">
          {/*
            Ülke şehrin ÜSTÜNDE: kapsamı geniş olan önce geliyor. Kişi önce
            hangi ülkenin ilanlarına baktığını seçiyor, sonra o ülkenin
            içinden şehir daraltıyor.

            `onCountryChange` verilmemişse seçici hiç çizilmiyor: değiştirmesi
            bir işe yaramayan bir kutu göstermek yanıltıcı olur.
          */}
          {onCountryChange && seciliBolge !== 'turkiye' && (
            <ListingCountrySelector
              value={yurtdisiSecili ? 'yurtdisi' : countrySelection}
              countries={seciliBolge === 'yurtdisi' ? countryFacets.filter((u) => u.code !== 'TR') : countryFacets}
              yurtdisi={seciliBolge === 'yurtdisi'}
              onChange={ulkeDegistir}
            />
          )}
          {seciliBolge === 'turkiye' && (
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
          )}
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
                <p className="text-xs text-gray-600 py-1">Eşleşen şirket yok.</p>
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
            {/*
              Başlık, şerit "Tümü" ve bu düğme aynı sayıyı söylemek zorunda.
              Burada yüklenmiş adet yazılınca (24) başlıktaki gerçek toplam
              (62) yalanlanıyor ve kişi listenin bittiğini sanıyordu — düzeltilen
              hatanın aynısı, sadece başka bir yerde. Tek kaynak:
              gosterilecekToplam, ikinci bir hesap yok.
            */}
            {gosterilecekToplam} ilanı göster
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

        <div className="min-w-0 lg:col-span-6">
          {/*
            BAŞLIK VE ŞERİTLER KENDİ RİTMİNDE

            Sütunun tamamı `space-y-4` idi ve liste de o ritmin bir
            üyesiydi: ilk karta 16 piksel üst boşluk düşüyordu, sonraki
            kartların arasında ise boşluk değil 1 pikselik çizgi vardı.
            Ölçüldü (375 px): şerit alt çizgisinden ilk kartın kurum
            satırına 43 piksel, sonrakilerde 27.

            Boşluk `space-y` ile MARGIN olarak veriliyordu; listeye
            `padding-top: 0` demek onu götürmüyor. Bu yüzden ritim
            bölündü: başlık ve şeritler kendi `space-y-4` kabında,
            liste onun dışında ve kendi üst boşluğunu açıkça veriyor
            (ui/tokens · LISTE_BLOGU). Negatif kenar boşluğu yok;
            listeye düşen bir margin de yok.
          */}
          {/*
            TELEFONDA ŞERİT ÜST ÇUBUĞA YASLI

            Onaylanan düzende üst çubuğun çizgisinin hemen altında küre
            şeridi başlıyor. Başlık satırı telefonda görünür bir şey
            taşımıyordu (başlık `sr-only`, not `sm:` üstünde) ama `pt-4` ve
            `space-y-4` ile 32 piksellik boş bir bant bırakıyordu; o satır
            telefonda gizli ve ritim `sm:` üstünde başlıyor. Ekran okuyucu
            için liste başlığı satırın DIŞINDA, her genişlikte erişilebilir.
          */}
          <div className="space-y-0 sm:space-y-4">
          <h2 className={`${LISTE_BASLIGI_YAZISI} sr-only`}>
            İlanları keşfet ({gosterilecekToplam})
          </h2>
          <div className={`${LISTE_BASLIGI} sr-only`}>
            {/*
              Profili olmayan ziyaretçiye "sana uygun" ve "eşleşme puanına göre
              sıralı" demek yanlış: ortada kişiselleştirme yok.
            */}
            {/*
              ONAYLANAN TASARIM: "İlanları keşfet"

              Başlık "Sana Uygun Staj İlanları (108)" idi ve sayfanın
              kendi h1'i ("İlk adımın burada.") ile arka arkaya iki başlık
              gibi okunuyordu. Sayı kaybolmadı: listenin gerçek toplamı
              başlığın yanında duruyor.

              "Sana uygun" ibaresi profili olan kullanıcıda korunuyor —
              sıralamanın gerçekten eşleşmeye göre yapıldığı tek durum o;
              ziyaretçide bunu yazmak kişiselleştirme iddiası olurdu.
            */}
            {/*
              LİSTE BAŞLIĞI GÖRSELDEN KALKTI, METİNDEN KALKMADI

              Sayfanın kendi başlığı ("İlk adımın burada.") hemen üstünde
              duruyordu; ikisi arka arkaya iki başlık gibi okunuyor ve
              ilanları aşağı itiyordu (onaylanan tasarımda üstü çizili).

              `sr-only`: öğe ekrandan çıkıyor ama DOM'da ve erişilebilirlik
              ağacında kalıyor — ekran okuyucu listenin neyin listesi
              olduğunu ve kaç ilan olduğunu duymaya devam ediyor. Görünen
              sayı da kaybolmadı: şirket şeridindeki "Tümü — N ilan".
            */}
            {/*
              Açıklama metni mobilde gizli.

              Telefonda başlıkla yan yana sıkışıp ikisi de iki satıra
              bölünüyordu: solda "SANA UYGUN STAJ / İLANLARI (11)", sağda
              "Gerçek zamanlı eşleşme puanına / göre sıralı". Dört satırlık bir
              blok, hiçbiri okunmuyor.

              Bilgi olarak da ikincil: sıralamanın neye göre olduğunu bilmek
              hoş ama telefonda yeri ilan göstermek.
            */}
            <span className={LISTE_BASLIGI_NOTU}>
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
          {/*
            KAYDETTİKLERİM AÇIKKEN GÖRÜNÜR ÇIKIŞ

            Kategori çipleri kalktığı için bu görünüm profildeki
            "Kaydedilenler" kutusundan açılıyor ve başka hiçbir yerde
            yazmıyordu; kullanıcı listenin neden daraldığını göremez ve
            geri dönemezdi.
          */}
          {subTab === 'kaydettiklerim' && (
            <div className="-mx-4 flex items-center justify-between gap-3 border-b border-gray-200 bg-blue-50 px-4 py-2.5 sm:mx-0 sm:rounded-2xl sm:border">
              <p className="text-sm font-bold text-blue-900">
                Kaydettiğin ilanlar
                {hasMoreCountriesPage ? '' : ` · ${filteredListings.length}`}
              </p>
              <button
                type="button"
                onClick={() => onSubTabChange?.('all')}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                Tüm ilanlara dön
              </button>
            </div>
          )}
          <SirketSeridi
            sirketler={seritSirketleri}
            secili={selectedCompanies}
            toplam={gosterilecekToplam}
            onSec={sirketSec}
            bolge={seciliBolge}
            onBolge={bolgeSec}
            donuk={donukAnahtar}
            donukSayi={donukSayi}
            onCevir={kureCevir}
          />

          {/*
            YURTDIŞI GÖRÜNÜMÜNDE MEVCUT REHBERLER — yalnız sitede gerçekten
            bulunan, konusu "yurtdışı" olan öğrenci rehberleri. Burs/fırsat
            listeleri buraya karışmıyor.
          */}
          {seciliBolge === 'yurtdisi' && yurtdisiRehberleri.length > 0 && (
            <nav aria-label="Yurtdışında staj rehberleri" className="-mx-4 border-b border-gray-200 bg-white px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Yurtdışına başvurmadan önce</p>
              <ul className="mt-1.5 space-y-1">
                {yurtdisiRehberleri.map((r) => (
                  <li key={r.slug}>
                    <a
                      href={`/rehber/${r.slug}`}
                      onClick={(e) => {
                        if (!onNavigate || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                        e.preventDefault();
                        onNavigate(`/rehber/${r.slug}`);
                      }}
                      className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                      {r.baslik}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          </div>

          {/*
            LİSTE, SÜTUNUN `space-y-4` RİTMİNDEN ÇIKIYOR

            Kartlar o ritmin bir üyesiydi ve ilk karta 16 piksel üst boşluk
            düşüyordu; sonraki kartların arasında ise boşluk değil 1
            pikselik çizgi var. Ölçüldü (375 px): şerit alt çizgisinden ilk
            kartın kurum satırına 43 piksel, sonrakilerde 27.

            Şeridin alt çizgisi zaten ilk kartın ayırıcısı. Blok kendi üst
            boşluğunu telefonda sıfır, geniş ekranda 16 piksel olarak
            veriyor (ui/tokens · LISTE_BLOGU).
          */}
          <div className={LISTE_BLOGU}>
          {filteredListings.length === 0 ? (
            /*
              Sıfır sonuç bir çıkmaz sokak değil: aynı kelimeyle eşleşen
              burslar, hangi filtrenin listeyi daralttığı ve ilan açmamış
              şirkete yazma yolu burada gösteriliyor.
            */
            <SonucYok
              aramaTerimi={searchQuery.trim()}
              suzgecler={aktifSuzgecler}
              /*
                Seçili ÜLKE VE BÖLÜME gerçekten uyanlar. Uyan yoksa boş
                dizi gidiyor ve blok hiç çizilmiyor.
              */
              /*
                ORTAK MODÜL — İKİNCİ LİSTE YOK

                Eskiden `lib/bos-sonuc-isverenler.mjs` çağrılıyordu: o
                modül kendi şirket listesini süzüyor VE durumu her
                kayıtta sabit 'bilinmiyor' yazıyordu. Yani boş sonuç
                ekranı, dizin sayfasından farklı bir durum hesabı
                gösteriyordu. Şimdi ikisi de `isveren-dizini.mjs`
                kullanıyor ve durum ölçümden geliyor.

                `isverenDizini` gelmemişse (ön render, ağ hatası)
                editoryal kayıtlar ölçümsüz birleştiriliyor: şirketler
                yine listelenir, durum satırı çizilmez.
              */
              isverenler={uygunIsverenler(
                isverenDizini ?? dizini(STAJ_PROGRAMLARI, []),
                kanonikFiltreler
              )}
              firsatSayisi={firsatSayisi}
              /*
                Adres de terimsiz: staj aramasını fırsat sayfasına
                taşımak, kullanıcıyı aramadığı bir sonuç kümesine
                göndermek olurdu.
              */
              onFirsatlaraGit={() => onNavigate?.('/firsatlar')}
              onTumunuTemizle={() => {
                setSearchQuery('');
                suzgecleriTemizle();
              }}
              onIsverenlereGit={() => onNavigate?.('/staj-programlari')}
              onRehbereGit={() => onNavigate?.('/rehber/staj-basvuru-epostasi')}
              onSablonAc={() => setSablonAcik(true)}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {/*
                KARTLAR TELEFONDA EKRANIN İKİ KENARINA YASLI

                Sayfanın `main` alanı `px-4` taşıyor — formlar ve hesap
                eylemleri ekranın kenarına yapışmamalı. Liste o boşluğu
                `-mx-4` ile geri alıyor ve kartlar yüzey oluyor; aralarında
                boşluk değil 1 pikselik çizgi var (kartın kendi alt
                kenarlığı, bkz. YUZEY.kabuk).

                Aşağıdaki "daha fazla" düğmesi ve yönlendirme bloğu bu
                kabın DIŞINDA: onlar kutu, kenara yaslanmamalı.
              */}
              {/*
                Onaylanan tasarımda kartlar ekranın iki kenarına kadar uzanıyor
                (`YUZEY.kap` = telefonda `-mx-4`) ve her kartın kendi ince
                çerçevesi var; aralarında 1 piksellik çizgi değil küçük boşluk.
              */}
              <div className={`flex flex-col gap-1.5 sm:gap-3 ${YUZEY.kap}`}>
                {filteredListings.map(({ listing, match, hasApplied }, index) => (
                <React.Fragment key={listing.id}>
                  {/* Internship Card */}
                  <InternshipCard
                    listing={listing}
                    match={match}
                    hasApplied={hasApplied}
                    onViewDetails={() => onViewDetails(listing, match)}
                    onQuickApply={() => onQuickApply(listing, match)}
                    kayitli={kayitliIlanlar.has(listing.id)}
                    onToggleKayit={
                      student?.id ? () => kaydiDegistir(listing.id) : onRequireLogin
                    }
                    girisGerekli={!student?.id}
                    onGirisGerekli={onRequireLogin}
                    kendiIlanim={Boolean(kendiSirketId && listing.companyId === kendiSirketId)}
                    yuzey
                    cografyaEtiketi={seciliBolge === 'tumu'}
                  />

                  {/*
                    AKIŞ İÇİ REKLAM KALDIRILDI

                    Ana sayfanın içeriği şirketlerin ilanları; bizim
                    yazdığımız metin değil. Başkasının içeriğinin arasına
                    reklam koymak, düşük değerli yüzeyden gelir üretmeye
                    en yakın duran şey. Reklam artık yalnız editoryal
                    değer kapısını geçen rehberlerde
                    (src/lib/reklam-kapisi.mjs).
                  */}
                </React.Fragment>
                ))}
              </div>
              {hasMoreCountriesPage && <button type="button" onClick={onLoadMoreCountriesPage} className="min-h-11 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700">Daha fazla ilan göster</button>}

              {/*
                CV REHBERİ KUTUSU — ONAYLANAN TASARIM

                Listenin altında: ilanlara bakıp "başvuracak neyim var?"
                sorusuna gelen kişiyi karşılıyor. Gerçek rehbere gidiyor
                (`/rehber/staj-cv-nasil-yazilir`).
              */}
              <a
                href="/rehber/staj-cv-nasil-yazilir"
                onClick={(olay) => {
                  if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.button !== 0) return;
                  olay.preventDefault();
                  onNavigate?.('/rehber/staj-cv-nasil-yazilir');
                }}
                className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 transition-colors hover:border-blue-300"
              >
                <BookOpen aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                    Daha iyi bir başvuru için
                  </span>
                  <span className="mt-0.5 block text-base font-extrabold text-gray-900">
                    Başvuruya hazır mısın?
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-gray-600">
                    Staj sürecinde öne çıkmana yardımcı olacak ipuçları, örnekler ve
                    profesyonel öneriler.
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                    CV rehberine göz at →
                  </span>
                </span>
              </a>

              {/*
                LİSTENİN SONU ÇIKMAZ DEĞİL

                Açık ilan sayısı düşük olduğunda liste bitiyor ve sayfa da
                bitiyordu. Sıfır sonuçta zaten SonucYok devreye giriyor;
                eksik olan, ilan BULUNAN ama az olan durumdu. Dört yol da
                gerçek veriden sayısını okuyor.
              */}
              <SonrakiAdim
                onNavigate={(yol) => onNavigate?.(yol)}
                onSablonAc={() => setSablonAcik(true)}
              />
            </div>
          )}
          </div>
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
              { etiket: 'Açık ilan', deger: String(gosterilecekToplam) },
              { etiket: 'Şirket', deger: String(gosterilecekSirket) },
              { etiket: 'Şehir', deger: String(gosterilecekSehir) },
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
          {typeof bugunDogrulanan === 'number' && bugunDogrulanan > 0 && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              Bugün {bugunDogrulanan} ilan kaynağından yeniden kontrol edildi.
            </p>
          )}
          <aside className="bg-white rounded-2xl p-5 border border-gray-200 space-y-4">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              İlanlar nereden geliyor
            </span>

            {/*
              Metin ./lib/urun-metni dosyasından geliyor.

              Burada elle yazılıyken "her ilanda şirketin kendi başvuru
              bağlantısı var" diyordu. Şirketler artık ilanlarını doğrudan
              burada açıyor ve o ilanlarda başvuru siteden çıkmıyor — yani
              cümle canlıda yanlış bir iddiaya dönüşmüştü. Aynı cümlenin
              bölüm sayfalarında da bir kopyası vardı; ikisi tek kaynağa
              bağlandı.
            */}
            <p className="text-sm text-gray-600 leading-relaxed">
              {ILAN_KAYNAGI_PARCALI.once}
              <strong className="text-gray-900">{ILAN_KAYNAGI_PARCALI.vurgu}</strong>
              {ILAN_KAYNAGI_PARCALI.sonra}
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
        </div>
      </div>

      {/*
        Şablon üretici sıfır sonuç ekranından açılıyor ama görünümün
        tepesinde duruyor: modal, listenin içinde çizilirse liste
        kaydırıldığında altında kalıyor.
      */}
      <BasvuruSablonu
        acik={sablonAcik}
        onKapat={() => setSablonAcik(false)}
        ogrenci={student}
      />
    </div>
  );
};
