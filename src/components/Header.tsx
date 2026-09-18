import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  UserCheck,
  BookOpen,
  LogOut,
  ArrowRight,
  Users,
  Search,
  SlidersHorizontal,
  X,
  Menu,
  Home,
  UserRound,
} from 'lucide-react';
import { StudentProfile, CompanyAccount } from '../types';
import { SIRKET_KENAR_GUCLU, SIRKET_ROZET, SIRKET_VURGU_KOYU } from '../sirket/renk';
import { Logo } from './Logo';
import { adYazimi } from '../lib/ad';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { ODAK_HALKASI } from '../lib/renk-token';

import { BildirimDugmesi } from './BildirimMerkezi';
import { useSayfaAramasi } from '../lib/sayfa-aramasi';
import { KullaniciAramaSonuclari } from './sosyal/KullaniciArama';
import { FotografPaylasGirisi } from './sosyal/FotografPaylasGirisi';
import { ProfilFotografi } from './sosyal/ProfilFotografi';

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
  /**
   * ARTIK OKUNMUYOR. Sayı hesap menüsündeki "Başvurularım (n)" satırında
   * yazıyordu; menü kalktı, sayı profil ekranının üst istatistiğinde.
   * Prop yalnızca src/dev/AccountSheetDevFixture.tsx hâlâ geçtiği için
   * duruyor (o dosya bu turun kapsamı dışında); fixture temizlenince
   * buradan ve App.tsx'ten silinmeli.
   */
  applicationsCount?: number;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onLogout?: () => void;
  /**
   * "Profilim ve CV" — birleşik profil ekranı (`/cv`).
   *
   * Sekme durumu (`setActiveTab('profile')`) YETMİYOR: kullanıcı bir alt
   * sayfadayken (rehber, ilan ayrıntısı…) sekmeyi değiştirmek adresi
   * değiştirmiyor ve ekranda hiçbir şey olmuyordu. Ekranın kendi adresi
   * olduğu için gezinme App'ten geliyor — üst çubuk rota bilmiyor.
   *
   * Verilmezse satır eski davranışına düşüyor (yalnız sekme): tek bir
   * prop unutulduğunda menü çalışmaz hâle gelmesin.
   */
  onOpenProfilVeCv?: () => void;
  /*
    ÜST ÇUBUKTAKİ AVATAR DA ORTAK KAYNAKTAN

    Buradaki avatar `activeStudent.avatarUrl` okuyordu — yani ESKİ alan
    (`profiles.avatar_url`). Fotoğraf ise sosyal profilde
    (`social_profiles.avatar_path`) duruyor ve tek kaynak o
    (`lib/profil-fotografi`). Sonuç: aynı kullanıcı solda fotoğrafını,
    sağ üstte baş harflerini görüyordu (ölçüldü: @stajimvar'da
    `avatar_url` null, `avatar_path` dolu).

    Yol App'ten geliyor; Header sosyal profili kendisi çekmiyor, çünkü
    üst çubuk her sayfada çiziliyor ve her açılışta fazladan bir sorgu
    açardı.
  */
  sosyalAvatarYolu?: string | null;
  /**
   * Kendi profil sayfasındaki fotoğraf paylaşma düğmesinin ön koşulu.
   *
   * `undefined` = profil henüz okunmadı; düğme o sırada KAPALI. Sunucu
   * paylaşımı `yayinda_mi` + `sector_id` olmadan zaten reddediyor
   * (20260924030000), o yüzden koşul seçimden ÖNCE soruluyor —
   * kullanıcıya fotoğraflarını seçtirip sonra hayır demek olurdu.
   */
  sosyalPaylasabilir?: boolean | undefined;
  /** Rehber merkezine geçiş. */
  onOpenGuides?: () => void;
  /** Öğrenci fırsatları merkezi. */
  onOpenOpportunities?: () => void;
  /** İşveren kapısı: şirket sayfasını sahiplenme akışı. */
  onOpenEmployer?: () => void;
  /** İşveren metinleriyle açılan giriş penceresi. */
  onOpenEmployerLogin?: (kip: 'login' | 'register') => void;
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
  /**
   * Kişi aramasının gezinmesi: sonuç satırı `/profil/<kullaniciadi>`
   * adresine gidiyor. Verilmezse sosyal sayfalarda üst çubuk arama kutusu
   * hiç çizmiyor — gidecek yeri olmayan bir liste çizmek, çalışmayan bir
   * özellik göstermek olurdu.
   */
  onNavigate?: (yol: string, secenek?: { degistir?: boolean }) => void;
  /*
    Yönetici menüsü. Bu bayrak yalnızca MENÜYÜ gösteriyor — yetkinin kendisi
    veritabanında. Tarayıcıda değerini değiştiren biri menüyü görebilir ama
    sayfayı açtığında boş kalır: veriyi getiren sorgular ve onay fonksiyonları
    is_admin() kontrolünden geçiyor.
  */
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  /** Şirket dunyasina gecis; yetki yoksa kapiya goturuyor. */
  onDunyaDegistir?: () => void;
  /*
    BİLDİRİM — kabuk yalnızca düğmeyi çiziyor.

    Liste, okunmamış sayısı ve okundu damgası App'te tek yerde duruyor:
    aynı kullanıcı işveren paneline geçtiğinde de aynı kayıtları görüyor,
    çünkü bildirim kullanıcıya ait, dünyaya değil.
  */
  okunmamisBildirim?: number | null;
  onBildirimAc?: () => void;
  /*
    ŞİRKET ÜYELİĞİ — GERÇEK SİNYAL

    `profiles.role` değil: bir kişi hem öğrenci hem şirket üyesi olabiliyor
    ve öğrenci görünümüne geçmek üyeliği düşürmüyor. Bu bayrak
    `company_members` kaydından geliyor (App.tsx → sirketBaglami).

    Yetki kapısı DEĞİL — asıl kapı RLS'te; burası yalnızca doğru bağlantıyı
    çizmek için. Üyelik çözülene kadar false, yani normal öğrenciye bir an
    bile görünmüyor.
  */
  sirketUyesiMi?: boolean;
  /*
    ŞİRKET KABUĞU (kullanıcı kararı, 18 Eylül 2026)

    `userRole === 'company'` artık eski "Şirket Portalı" sekmelerini
    değil, öğrenciyle AYNI kabuğu çiziyor: aynı üst çubuk, aynı beş
    sekme (İlanlar · Fırsatlar · Ağım · Rehber · Profil). Yalnız İlanlar
    /sirket/ilanlar'a, Profil /sirket/profil'e gidiyor. Bu ad üst
    çubuktaki hesap bağlantısında yazıyor; App şirket bağlamından
    (company_members) veriyor, `profiles.role`dan değil.
  */
  sirketAdi?: string | null;
}

/*
  SEKMELER GERÇEK BAĞLANTI

  Üst gezinme <button> öğelerinden oluşuyordu. Görsel olarak çalışıyordu ama
  tarayıcı bir düğmeyi bağlantı saymıyor: orta tuşla yeni sekmede açma,
  "bağlantı adresini kopyala" ve ekran okuyucunun "bağlantı" demesi
  çalışmıyordu. Arama motoru da bu geçişleri görmüyordu.

  Şimdi gerçek <a href>. Tıklama yakalanıp uygulama içi geçişe çevriliyor,
  yani kullanıcı için hiçbir şey değişmiyor: tam sayfa yenilenmesi yok.
  Değiştirici tuşlar ve orta tuş dokunulmadan geçiyor.

  Aktif sekmede aria-current="page": ekran okuyucu hangi sayfada
  olunduğunu söylüyor; renk tek başına bunu anlatmıyor.
*/
function baglantiTiklamasi(calistir: () => void) {
  return (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    calistir();
  };
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
  isLoggedIn = true,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onOpenProfilVeCv,
  sosyalAvatarYolu = null,
  sosyalPaylasabilir,
  onOpenGuides,
  onOpenOpportunities,
  onOpenEmployer,
  onOpenEmployerLogin,
  bulunulanYol = '/',
  searchQuery,
  onSearchChange,
  onNavigate,
  isAdmin = false,
  onOpenAdmin,
  onDunyaDegistir,
  okunmamisBildirim,
  onBildirimAc,
  sirketUyesiMi,
  sirketAdi = null,
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

  /*
    SEÇİLİ ÖĞE KENDİ GENİŞLİĞİNİ ALIYOR

    Beş öğenin hepsi `flex-1` iken 390 piksellik ekranda seçili öğenin
    yazısı kırpılıyordu: "İlanlar" yerine "İla...", "Fırsatlar" yerine
    "Fır...". Yazıyı yalnız seçilide göstermenin tek amacı hangi sayfada
    olunduğunu söylemek; kırpılınca o amaç boşa gidiyor.

    Seçili öğe artık `shrink-0`, kalanlar boşluğu paylaşıyor. Aynı kural
    işveren panelinde de var (src/ui/BottomNavigation).
  */
  /*
    ALT BAR EKRANIN TAM GENİŞLİĞİNDE

    Kenarlardan 12 piksel boşluklu, tam yuvarlak köşeli, gölgeli YÜZEN
    bir haptı. Beş sekmeye 375 piksellik ekranda 351 piksel kalıyordu,
    yani öğe başına 70 piksel; yazı sığmadığı için yalnız seçili öğede
    yazı vardı ve o öğe genişleyip komşularını itiyordu — sekme
    değiştirirken çubuğun içi oynuyordu.

    Çubuk artık ekranın iki kenarına yaslı, üstünde 1 piksellik bir
    çizgi var, gölgesi yok. Beş öğenin beşi de yazısını taşıyor.

    GÜVENLİ ALAN: alt dolgu `env(safe-area-inset-bottom)` kadar
    büyüyor; iPhone'da ana ekran çubuğu o kadar yer kaplıyor ve hesaba
    katılmazsa son sekmenin yazısı altında kalıyor. Sayfaların alt
    boşluğu (`pb-[calc(120px+env(safe-area-inset-bottom))]`) bu
    çubuktan yüksek: son kartın düğmesi çubuğun üstüne tamamen
    kaydırılabiliyor.
  */
  const altMenuClass =
    'lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] flex items-stretch justify-around gap-0.5 transition-transform duration-200';

  /*
    ÇUBUK ARTIK SAYDAM DEĞİL

    Zemin `bg-white/90` + bulanıklıktı. Yüzen bir çubuk zaten içeriğin
    üstünden geçiyor; yarı saydam olunca arkadaki yazı bulanık şekilde
    görünüyor ve ekran bozuk gibi duruyor — kullanıcı "düğmelerim kalmış"
    diyor. Opak zeminde örtme bir arayüz katmanı gibi okunuyor.

    Ölçüldü: sayfanın en dibinde son kartın düğmeleri 685. pikselde
    bitiyor, çubuğun üst kenarı 742'de — yani 57 piksel boşluk var ve
    hiçbir düğme erişilemez değil. Kaydırırken üstünden geçmesi ise yüzen
    tasarımın kendisi; onun için de aşağı kaydırınca çekiliyor.
  */

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

  /*
    ALT BAR ÖĞESİ — İKON ÜSTTE, YAZI ALTTA, BEŞİNDE DE

    Yazı yalnız seçili öğedeydi ve o öğe `flex-1` yerine `shrink-0`
    olup genişliyordu: sekme değiştikçe beş öğenin genişliği yeniden
    dağılıyordu. Çubuk tam genişliğe inince öğe başına 75 piksel düştü
    ve 10 puntoluk en uzun etiket ("Fırsatlar") 48 piksel — hepsi
    sığıyor.

    Seçili öğeyi ayıran şey artık genişlik değil: renk ve ikonun
    arkasındaki hafif mavi kutu. Öğeler yerinden oynamıyor.
  */
  const altMenuOgesi = (secili: boolean) =>
    `flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
      secili ? 'text-blue-700' : 'text-gray-500 hover:text-gray-900'
    }`;
  const altMenuIkonu = (secili: boolean) =>
    `flex h-7 w-12 items-center justify-center rounded-xl transition-colors ${
      secili ? 'bg-blue-50 text-blue-600' : ''
    }`;
  const altMenuYazisi = (secili: boolean) =>
    `w-full truncate text-center text-[10px] leading-none ${secili ? 'font-bold' : 'font-medium'}`;

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
  /*
    `/cv` = oturum sahibinin kendi profili. Başkasının profili
    `/profil/<kullaniciadi>` adresinde ziyaretçi görünümüyle açılıyor,
    yani orada bu koşul hiçbir zaman doğru olmuyor.
  */
  const kendiProfilimde = bulunulanYol === '/cv';

  const rehberdeMi = /^\/(rehber|bolum|bolumler|araclar|isveren)(\/|$)/.test(bulunulanYol);
  const firsatlardaMi = /^\/(firsatlar|burslar|kyk|yurtdisi-firsatlari|yarismalar|firsat-takvimi|bana-uygun|kaydedilen-firsatlar)(\/|$)/.test(bulunulanYol);
  /*
    AĞIM = /baglantilar

    Sosyal ağın girişi bugün bağlantılar sayfası (bağlantılar, gelen ve
    giden istekler). /profil/* BURAYA GİRMİYOR: başkasının profili bir
    sayfa, sekme değil; Profil de değil (o /cv). Orada hiçbir sekme
    yanmıyor, kurumsal sayfalardaki kuralla aynı.
  */
  const agimdaMi = /^\/(agim|baglantilar)(\/|$)/.test(bulunulanYol);
  /*
    AKIŞIN KENDİ BAŞLIĞI VAR.

    `/agim` telefonda kompakt bir başlık çiziyor (paylaş · Senin için ·
    bağlantılar · bildirimler). Sitenin büyük üst çubuğu da çizilseydi
    ekranın üstünde iki başlık üst üste binerdi ve akışa kalan yer
    azalırdı. Geniş ekranda üst çubuk DURUYOR: orada akış ortalanmış bir
    sütun ve sayfanın gezinmesi hâlâ üstten yapılıyor.

    YALNIZ `/agim`, ALTI DEĞİL

    Kalıp önce `/agim/*` idi ve `/agim/baglantilar` de üst çubuksuz
    kalıyordu — ama o sayfanın kendi başlığı YOK. Sonuç: telefonda
    sayfanın tepesinde hiçbir çubuk, hiçbir geri dönüş yolu
    görünmüyordu (bildirildi, ekran görüntüsüyle). Yalnız akışın kendi
    başlığı var, o yüzden yalnız akış dışlanıyor.
  */
  /*
    `!sirketKabugu`: şirket hesabında /agim akış değil tek bir boş-durum
    kartı ve o kartın kendi başlığı yok. Üst çubuk telefonda gizlenseydi
    şirket o ekranda markasız ve zilsiz kalırdı (fikstürde ölçüldü:
    390 px'te "İşveren" rozeti ve zil yok).
  */
  const akistaMi = bulunulanYol === '/agim' && userRole !== 'company';

  /*
    SAYFA ARAMASI ÜST ÇUBUKTA — TELEFONDA.

    İlanlar, Fırsatlar ve Rehber telefonda sayfanın içinde geniş birer
    arama kutusu çiziyordu; kutular kalktı, yerlerini buradaki iki simge
    aldı (`/agim` başlığındaki düzenle aynı).

    Metin BURADA, yerel durumda: bağlamda tutulsaydı her tuş vuruşu
    uygulamanın kökünü yeniden çizerdi. Sayfa kendi durumunu
    `onDegisti` ile güncellemeye devam ediyor — iki durum değil, tek
    yönlü akış (bkz. lib/sayfa-aramasi).
  */
  const sayfaAramasi = useSayfaAramasi();
  const [aramaAcik, setAramaAcik] = React.useState(false);
  const [aramaMetni, setAramaMetni] = React.useState('');

  /* Sayfa değişince kutu kapanıyor: önceki sayfanın terimi burada kalmasın. */
  React.useEffect(() => {
    setAramaAcik(false);
    setAramaMetni('');
  }, [bulunulanYol]);
  /*
    ARAMA BAĞLAMI

    Üstteki kutu yalnızca STAJ İLANLARINDA arıyor: odaklanınca sekmeyi
    "internships"e çeviriyor. Yer tutucusu "Pozisyon, şirket veya burs
    ara" diyordu — burs yazan biri ilan listesine düşüyor ve hiçbir şey
    bulamıyordu.

    Burslar sayfasının kendi araması var ve o gerçekten bursları arıyor;
    orada üstteki kutu hiç çizilmiyor, yoksa aynı ekranda iki arama
    kutusu farklı şeyleri arardı.
  */
  const burslardaMi = /^\/burslar(\/|$)/.test(bulunulanYol);

  /*
    Kurumsal ve yasal sayfalar üçünden hiçbiri değil.

    Gizlilik ya da Hakkımızda açıkken alt menüde "İlanlar" yanıyordu; oysa
    kullanıcı ilanlarda değil. Hiçbiri seçili olmaması doğru bilgi.
  */
  const kurumsalSayfada = /^\/(hakkimizda|iletisim|gizlilik|cerez-politikasi|kvkk-aydinlatma-metni|kullanim-kosullari|ilan-kurallari|ilan-bildir)$/.test(
    bulunulanYol
  );

  /* İşveren tarafı: rehber ve sahiplenme sayfaları. */
  /*
    İşveren tarafı: /isveren, /isveren/ilan-ver, /stajyer-nasil-alinir
    ve şirket sayfaları. Üst çubuktaki düğmeler bu bayrağa bakıyor.
  */
  const isverendeMi = /^\/(isveren|stajyer-nasil-alinir|sirket)(\/|$)/.test(bulunulanYol);

  /*
    Yalnızca rehber merkezi ve rehber yazıları. `rehberdeMi` bölüm, araç ve
    işveren sayfalarını da kapsıyor; oralarda arama hâlâ ilan listesine
    götürüyor, çünkü o sayfaların arayacak kendi içeriği yok.
  */
  const rehberSayfasindaMi = /^\/rehber(\/|$)/.test(bulunulanYol);
  /*
    SOSYAL SAYFALARDA ÜST ARAMA KİŞİ ARIYOR

    /cv sağ sütununda ayrı bir "Kullanıcı adıyla ara" kutusu vardı ve üst
    çubukta aynı anda "Pozisyon veya şirket ara" duruyordu: aynı ekranda
    iki arama kutusu, ikisi farklı şey arıyor. Burslarda ve rehberde aynı
    sorun aynı yolla çözülmüştü — tek kutu, bulunulan sayfaya göre
    davranıyor. Sosyal sayfalar (birleşik profil, profil sayfaları,
    topluluklar, bağlantılar) da o kalıba girdi.

    Yazılan metin `onSearchChange`e GİTMİYOR: o çağrı App'te ilan
    listesini süzüyor ve boş olmayan her terimde ana sayfaya götürüyor.
    Kişi araması kendi yerel durumunda; /cv'de yazılan ad ilan süzgecini
    kirletmiyor ve kullanıcıyı sayfadan atmıyor.
  */
  /*
    `agim` DE BU KÜMEDE — ALT ÇUBUKTA İKİ SEKME BİRDEN YANIYORDU

    Akışa girildiğinde `activeTab` 'internships' olarak kalıyor ve
    `ilanlardaMi` yalnız bu kümeyi dışlıyor; küme /agim'i saymadığı için
    alt çubukta hem Ağım hem İlanlar yanıyordu. Bulunulan adres sekmeyi
    ezmeli: her an tek sekme.

    Yan etkisi de doğru: üst çubuktaki arama /agim'de de kişi arıyor —
    akışın kendi arama panelinin aradığı şeyle aynı.
  */
  const sosyaldeMi = /^\/(agim|cv|profil|topluluklar|baglantilar)(\/|$)/.test(bulunulanYol);
  /*
    Kişi araması yalnız oturumu olan öğrenci hesabına: `sosyal_kullanici_ara`
    çağıranın görebildiği profilleri tarıyor, oturumsuz çağrı boş döner ve
    boş liste "kimse yok" gibi okunurdu. Yönetici hesabı arayüzde öğrenci
    görünümünü kullanıyor (`userRole` 'student', ayrıca `isAdmin`), yani
    bu koşul onu dışarıda bırakmıyor. Şirket hesabı ve şirket portalı
    sekmesi, ilan araması gibi burada da dışarıda.
  */
  const kisiAramasiCizilsin =
    sosyaldeMi && isLoggedIn && userRole === 'student' && activeTab !== 'company-portal' && Boolean(onNavigate);
  const [kisiSorgusu, setKisiSorgusu] = useState('');
  const [kisiListesiAcik, setKisiListesiAcik] = useState(false);
  const kisiAramaKabi = useRef<HTMLDivElement>(null);
  /* Sayfadan çıkınca sorgu sıfırlanıyor: /cv'de yazılan ad /topluluklar'da liste açmasın. */
  useEffect(() => {
    setKisiSorgusu('');
    setKisiListesiAcik(false);
  }, [bulunulanYol]);
  /*
    Dışarı tıklama listeyi kapatıyor; dişli menüsündeki kalıp
    (`ProfilAyarMenusu`). Kutu ve liste aynı kabın içinde, ikisine
    basmak kapatmıyor.
  */
  useEffect(() => {
    if (!kisiListesiAcik) return;
    const disariTikla = (olay: MouseEvent) => {
      if (kisiAramaKabi.current?.contains(olay.target as Node)) return;
      setKisiListesiAcik(false);
    };
    document.addEventListener('mousedown', disariTikla);
    return () => document.removeEventListener('mousedown', disariTikla);
  }, [kisiListesiAcik]);
  /*
    `sosyaldeMi` de dışlanıyor: /cv'de activeTab hâlâ 'internships'
    kalıyor (sosyal rotalar sekme değil adresle çiziliyor), İlanlar ile
    Profil aynı anda basılı görünüyordu. Alt çubukta her an tek sekme.
  */
  /*
    /staj-ilanlari DA "ilanlar" SEKMESİ

    Sekme artık oraya götürüyor; koşul yalnız `activeTab`e bakınca sayfa
    açıkken hiçbir sekme yanmıyordu — kullanıcı nerede olduğunu üst
    çubuktan okuyamıyordu.
  */
  const stajIlanlarindaMi = bulunulanYol === '/staj-ilanlari';
  const ilanlardaMi =
    stajIlanlarindaMi ||
    (!rehberdeMi && !firsatlardaMi && !kurumsalSayfada && !sosyaldeMi && activeTab === 'internships');
  /*
    Birleşik profil ekranının KENDİ ADRESİ var (/cv, /cv/yazdir). Alt
    menüdeki Profil oraya gidiyor ama seçili vurgusu yalnızca
    `activeTab === 'profile'`e bakıyordu: kullanıcı Profil'e basıp /cv'ye
    gidiyor, alt menüde hiçbir şey yanmıyordu — bastığı düğme sönük
    kalıyordu. Adres de sekme kadar geçerli bir sinyal.
  */
  const cvEkranindaMi = /^\/cv(\/|$)/.test(bulunulanYol);
  /*
    `!agimdaMi`: sekme durumu 'profile' iken /baglantilar'a geçilirse
    activeTab değişmiyor; adres sekmeyi eziyor ki Profil ile Ağım aynı
    anda yanmasın. Alt çubukta her an tek sekme.
  */
  const profildeMi = cvEkranindaMi || (!rehberdeMi && !kurumsalSayfada && !agimdaMi && activeTab === 'profile');

  /*
    ŞİRKET KABUĞUNUN SEKMELERİ ADRESLE YANIYOR

    İlanlar sekmesi /sirket/ilanlar, ikinci görünümü /sirket/basvuranlar
    ve ilan formu /sirket/ilan/*; Profil /sirket/profil. Herkese açık
    şirket sayfası (/sirket/<slug>) BU KÜMEDE DEĞİL: orası bir sayfa,
    sekme değil — öğrenci kabuğundaki kurumsal sayfa kuralıyla aynı.
  */
  const sirketKabugu = userRole === 'company';
  const sirketIlanlarindaMi = /^\/sirket\/(ilanlar|basvuranlar|ilan)(\/|$)/.test(bulunulanYol);
  const sirketProfilindeMi = /^\/sirket\/profil(\/|$)/.test(bulunulanYol);
  /* Şirket ana adresi: marka ve telefon köşesindeki ev simgesi buraya. */
  const anaAdres = sirketKabugu ? '/sirket/ilanlar' : '/';

  /*
    TELEFONDA ARAMA ZİLİN YANINDA

    Marka telefonda ortada. Zil varsa arama sağda zille yan yana,
    diğer simgeler (paylaş, süzgeç) solda; zil yoksa arama da solda.
    Masaüstünde düğme zaten `lg:hidden`.
  */
  const zilVarMi = Boolean(isLoggedIn && onBildirimAc);
  const aramaDugmesi = sayfaAramasi ? (
    <button
      type="button"
      onClick={() => {
        setAramaAcik((a) => {
          if (a) {
            setAramaMetni('');
            sayfaAramasi.onDegisti('');
          }
          return !a;
        });
      }}
      aria-label={aramaAcik ? 'Aramayı kapat' : sayfaAramasi.yerTutucu}
      aria-expanded={aramaAcik}
      className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 lg:hidden"
    >
      {aramaAcik ? <X className="h-6 w-6" /> : <Search className="h-6 w-6" />}
    </button>
  ) : null;

  return (
    <>
      <header
        /* `akistaMi` → telefonda gizli; gerekçesi tanımın yanında. */
        className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs transition-colors duration-200 ${
          akistaMi ? 'hidden lg:block' : ''
        }`}
      >
        <div className={`${SAYFA_GENISLIGI} mx-auto px-2.5 sm:px-6 lg:px-8 xl:px-10`}>
        {/* Main Nav Bar */}
        <div className="relative flex items-center justify-between h-15 sm:h-18 gap-2 sm:gap-4">
          {/*
            TELEFONDA DİZİLİM: SİMGELER · MARKA · SİMGELER

            Marka `/agim` başlığındaki gibi ortada duruyor. Bunun için
            arama ve süzgeç simgeleri sağ kümeden SOLA alındı ve logo
            kabı `flex-1 justify-center` ile aradaki boşluğun ortasına
            oturdu.

            `lg:` üstünde hiçbir şey değişmiyor: simgeler zaten gizli,
            kap `lg:flex-none lg:justify-start` ile eski hizasına
            dönüyor ve masaüstü gezinmesi logonun sağında kalıyor.
          */}
          <div className="flex flex-1 items-center gap-2 sm:gap-3 lg:flex-none lg:gap-6 min-w-0">
            {/*
              MARKA TELEFONDA ORTADA (kullanıcı isteği, 16 Eylül 2026).

              Mutlak konumla çubuğun tam ortasında; simgelerin sayısı
              değişse de kaymıyor. `lg:` üstünde eski hizasına (solda)
              dönüyor. Telefonda yalnız "StajımVar" yazısı çiziliyor.
            */}
            {/*
              Kap yalnız şirket kabuğunda `flex` (rozet markanın yanına
              dizilsin diye); öğrencide sınıf listesi BİREBİR eski hâli —
              önce/sonra DOM karşılaştırmasında tek fark bu satırdı.
            */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shrink-0 lg:static lg:translate-x-0 lg:translate-y-0${
                sirketKabugu ? ' flex items-center gap-2' : ''
              }`}
            >
              <Logo
                href={anaAdres}
                onClick={() => {
                  if (sirketKabugu) {
                    onNavigate?.('/sirket/ilanlar');
                    return;
                  }
                  setUserRole('student');
                  setActiveTab('internships');
                }}
              />
              {/*
                "İŞVEREN" ROZETİ — eski şirket kabuğundan korunan tek işaret.
                Monospace YALNIZCA etikette; gövde metninde kullanmak
                çubuğu terminal taklidine çevirirdi. Kontrast: #1D4ED8 /
                #EFF6FF = 6.16:1 (sirket/renk.ts'de hesaplandı).
              */}
              {sirketKabugu && (
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                >
                  İşveren
                </span>
              )}
            </div>
            {/*
              İŞLEM SİMGELERİ SAĞDA TOPLANIYOR

              Marka sola alınınca bu simgeler onun sağına yapışıyordu;
              `ml-auto` ile aradaki boşluğu alıp sağ kümenin (bildirim,
              hesap) hemen yanına oturuyorlar. Dar ekranda çakışma yok:
              marka `shrink-0`, küme sabit genişlikli düğmelerden oluşuyor.
            */}
            <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
            {/*
              ANA SAYFA DÜĞMESİ — telefonda her başlığın sol köşesinde
              (kullanıcı isteği, 17 Eylül 2026). İlanlar dışındaki bir
              sayfadan İlanlar'a götürüyor; İlanlar'dayken sayfayı yeniliyor.
              Gerçek `<a href="/">`: orta tuş ve yeni sekme çalışıyor.
            */}
            <a
              href={anaAdres}
              aria-label={
                sirketKabugu
                  ? 'Ana sayfa: ilanların'
                  : ilanlardaMi
                    ? 'İlanları yenile'
                    : 'Ana sayfa: staj ilanları'
              }
              onClick={baglantiTiklamasi(() => {
                if (sirketKabugu) {
                  onNavigate?.('/sirket/ilanlar');
                  return;
                }
                if (ilanlardaMi) {
                  window.location.reload();
                  return;
                }
                setUserRole('student');
                setActiveTab('internships');
                setActiveSubTab('all');
              })}
              className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-800 transition-colors hover:bg-gray-100 lg:hidden"
            >
              <Home className="h-6 w-6" />
            </a>
            {/*
              FOTOĞRAF PAYLAŞMA — YALNIZ KENDİ PROFİLİNDE

              Ağım'ın üst çubuğundaki simgenin AYNISI: aynı bileşen,
              aynı seçici, aynı besteci (`FotografPaylasGirisi`). İkinci
              bir kopya yazmak, iki ekranın zamanla ayrışması demekti.

              `/cv` oturum sahibinin KENDİ ekranı; başkasının profili
              `/profil/<kullaniciadi>` adresinde açılıyor ve orada bu
              düğme hiç çizilmiyor. Koşul adrese değil, adresin
              anlamına bakıyor: `/cv` = kendi profilim.

              Ağım'da çizilmiyor: orada sayfanın kendi üst çubuğu var ve
              düğme zaten orada. İkisi birden çizilseydi aynı ekranda iki
              paylaşım düğmesi olurdu.
            */}
            {kendiProfilimde && (
              <FotografPaylasGirisi
                hazirMi={sosyalPaylasabilir !== undefined}
                paylasabilirMi={sosyalPaylasabilir === true}
                /*
                  Ön koşul yoksa kullanıcı zaten kendi profilinde:
                  eksikliği orada, kendi kartında görüyor. Başka bir
                  yere götürmek onu bulunduğu yerden koparırdı.
                */
                onOnKosulEksik={() => {}}
                onNavigate={onNavigate}
                /*
                  Paylaşım bitince akışa gidiliyor: yeni paylaşımın
                  görüneceği yer orası. Profilde kalmak, kullanıcıyı
                  paylaştığı şeyi göremediği bir ekranda bırakırdı.
                */
                onTamamlandi={() => onNavigate('/agim')}
                /*
                  `lg:hidden` YOK — BİLEREK.

                  Yanındaki arama/süzgeç simgeleri telefona özel, çünkü
                  masaüstünde sayfanın kendi arama kutusu var. Paylaşımın
                  öyle bir karşılığı YOK: kaldırılan geniş "Paylaş"
                  düğmesi masaüstünde de görünüyordu ve Ağım'ın kendi üst
                  çubuğu `lg:hidden`. Bu düğme de gizlenseydi masaüstünde
                  fotoğraf paylaşmanın hiçbir yolu kalmazdı (ölçüldü:
                  1280 pikselde düğme DOM'daydı ama görünmüyordu).
                */
                dugmeSinifi="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100"
              />
            )}

            {/*
              ARAMA VE SÜZGEÇ — YALNIZ TELEFONDA VE YALNIZ KAPSAM VARSA.

              `lg:hidden`: geniş ekranda sayfanın kendi arama kutusu
              ve süzgeç paneli yerinde duruyor, masaüstü düzeni
              değişmedi. Kapsam yoksa (örneğin hukuki sayfalar) hiç
              çizilmiyor — çalışmayan bir simge göstermek olmayan
              bir özelliği vaat etmek olurdu.
                */}

            {/*
              SÜZGEÇ SİMGESİ ÜST ÇUBUKTA (onaylanan tasarım)

              Bir süre kaldırılmıştı ve paneli sayfadaki "Filtrele" çipi
              açıyordu. Onaylanan İlanlar tasarımında çip satırı yok: panelin
              tek girişi yine burası. Rozet açık süzgeç sayısını söylüyor.
            */}
            {/*
              YALNIZ İLANLAR'DA. Fırsatlar ve Rehber de süzgeç tutamağı
              kaydediyor; simge onlarda çizilseydi o sayfaların başlığı da
              değişirdi. Onaylanan düzen yalnız İlanlar'ın.
            */}
            {ilanlardaMi && sayfaAramasi?.onSuzgec && (
              <button
                type="button"
                onClick={sayfaAramasi.onSuzgec}
                aria-expanded={sayfaAramasi.suzgecAcik ?? false}
                aria-label={
                  sayfaAramasi.acikSuzgec
                ? `Filtreler (${sayfaAramasi.acikSuzgec} açık)`
                : 'Filtreler'
                }
                className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 lg:hidden"
              >
                <SlidersHorizontal className="h-6 w-6" />
                {/* Rozet GERÇEK sayı; sıfırken hiç çizilmiyor. */}
                {Boolean(sayfaAramasi.acikSuzgec) && (
                  <span className="absolute right-1 top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {sayfaAramasi.acikSuzgec}
                  </span>
                )}
              </button>
                )}

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
                {/*
                  SEKME ARTIK /staj-ilanlari'na GİDİYOR

                  Ölçüldü (Search Console): "staj" içeren sorgularda ana
                  sayfa 137 gösterim alıyor, TEK tıklama yok; tam "staj
                  ilanları" sorgusunda hiç gösterim almıyor. Ana sayfa
                  markayı ve ürünün tamamını anlatıyor — arama motoru onu
                  "StajımVar nedir"e eşliyor.

                  Süzgeçli GERÇEK liste ana sayfada duruyor ve
                  kaybolmadı: /staj-ilanlari'nın en üstünde "Tüm staj
                  ilanlarını filtrele" düğmesi oraya götürüyor. Telefonun
                  alt menüsündeki "İlanlar" sekmesi de ana sayfada kaldı;
                  o uygulamanın kabuğu, arama motorundan gelen
                  ziyaretçinin menüsü değil.
                */}
                <a
                  id="nav-tab-internships"
                  href="/staj-ilanlari"
                  aria-current={ilanlardaMi ? 'page' : undefined}
                  onClick={baglantiTiklamasi(() => {
                    setActiveTab('internships');
                    setActiveSubTab('all');
                  })}
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
                  <span className="hidden xl:inline">Staj İlanları</span>
                  <span className="inline xl:hidden">İlanlar</span>
                </a>

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

                  Ad bir süre "Burs İlanları"ydı: o sırada on bir kaydın
                  dokuzu burs ve krediydi, ad kapsamı doğru anlatıyordu.
                  Şimdi listede 68 kayıt var ve içinde KYK, yarışma, eğitim
                  programı, yurt dışı hareketliliği ve öğrenci desteği de
                  bulunuyor — "burs" artık sayfanın yaptığı işi küçültüyor.
                  Ad "Fırsatlar"a döndü; sayfanın başlığı da öyle.
                */}
                <a
                  id="nav-tab-opportunities"
                  href="/firsatlar"
                  aria-current={firsatlardaMi ? 'page' : undefined}
                  onClick={baglantiTiklamasi(() => onOpenOpportunities?.())}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    firsatlardaMi ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${firsatlardaMi ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>Fırsatlar</span>
                </a>

                {/*
                  3. Ağım — sosyal ağın girişi.

                  Buradaki "Etkinlikler" (Keşfet, /kesfet) sekmesi 11 Eylül
                  2026'da kalktı: sayfadaki 163 kaydın hiçbiri kariyer
                  etkinliği değildi (konser 57, festival 52, sergi 29,
                  tiyatro 19, atölye 5, müze 1 — göç 20260926120000) ve
                  bölüm arşive alındı. Boşalan yere sosyal ağ geldi;
                  adres bugün için bağlantılar sayfası. Akış ayrı bir iş,
                  gelince aynı sekmenin altına girecek.
                */}
                <a
                  id="nav-tab-network"
                  href="/baglantilar"
                  aria-current={agimdaMi ? 'page' : undefined}
                  onClick={onNavigate ? baglantiTiklamasi(() => onNavigate('/agim')) : undefined}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    agimdaMi ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Users className={`w-3.5 h-3.5 shrink-0 ${agimdaMi ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>Ağım</span>
                </a>

                {/*
                  Rehber sekmesi. Boşalan yere içerik geldi: staj sürecinin
                  bilinmeyen kısımları (belge, sigorta, CV, mülakat). Aynı
                  zamanda sitenin keşif kanalı — davet e-postası
                  gönderemediğimiz için hem öğrenci hem işveren bize arama
                  motorundan, bu sayfalar üzerinden geliyor.
                */}
                <a
                  id="nav-tab-guides"
                  href="/rehber"
                  aria-current={rehberdeMi && !isverendeMi ? 'page' : undefined}
                  onClick={baglantiTiklamasi(() => onOpenGuides?.())}
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
                    SEKMELERDEKİ MAVİ NOKTA KALDIRILDI

                    Seçili sekmeyi zaten dolu hap (beyaz zemin + mavi yazı)
                    gösteriyordu; yanındaki nokta ikinci bir işaretti ve
                    bildirim rozeti gibi okunuyordu — "Rehber'de okunmamış
                    bir şey var" sanılıyordu.
                  */}
                </a>

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

            {/*
              MASAÜSTÜ ŞİRKET GEZİNMESİ — ÖĞRENCİYLE AYNI KAPSÜL

              Eski "Şirket Portalı" sekmeleri (Başvuranlar, Aday Havuzu,
              Kanban, Yeni İlan) kalktı; hiçbiri artık bir ekrana
              bağlanmıyordu. Dört sekme öğrenci kapsülüyle birebir aynı
              sınıflarda; yalnız İlanlar şirketin kendi ilanlarına gidiyor.
              Profil sağdaki hesap bağlantısında (öğrencide de öyle).
            */}
            {sirketKabugu && (
              <nav className="hidden lg:flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200/90 shadow-2xs transition-all gap-0.5 shrink-0">
                <a
                  id="nav-tab-sirket-ilanlar"
                  href="/sirket/ilanlar"
                  aria-current={sirketIlanlarindaMi ? 'page' : undefined}
                  onClick={onNavigate ? baglantiTiklamasi(() => onNavigate('/sirket/ilanlar')) : undefined}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    sirketIlanlarindaMi
                      ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Briefcase className={`w-3.5 h-3.5 shrink-0 ${sirketIlanlarindaMi ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>İlanlar</span>
                </a>
                <a
                  id="nav-tab-sirket-firsatlar"
                  href="/firsatlar"
                  aria-current={firsatlardaMi ? 'page' : undefined}
                  onClick={baglantiTiklamasi(() => onOpenOpportunities?.())}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    firsatlardaMi ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${firsatlardaMi ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>Fırsatlar</span>
                </a>
                <a
                  id="nav-tab-sirket-agim"
                  href="/agim"
                  aria-current={agimdaMi ? 'page' : undefined}
                  onClick={onNavigate ? baglantiTiklamasi(() => onNavigate('/agim')) : undefined}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    agimdaMi ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Users className={`w-3.5 h-3.5 shrink-0 ${agimdaMi ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>Ağım</span>
                </a>
                <a
                  id="nav-tab-sirket-rehber"
                  href="/rehber"
                  aria-current={rehberdeMi && !isverendeMi ? 'page' : undefined}
                  onClick={baglantiTiklamasi(() => onOpenGuides?.())}
                  className={`flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                    rehberdeMi && !isverendeMi ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 ring-1 ring-blue-500/10 font-extrabold' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <BookOpen className={`w-3.5 h-3.5 shrink-0 ${rehberdeMi && !isverendeMi ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>Rehber</span>
                </a>
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
          {/*
            Şirket kabuğunda kutu YALNIZ rehberde: orada terim rehberleri
            süzüyor ve sayfanın kendi kutusu yok. Öteki sayfalarda kutu ilan
            listesine götürürdü — şirketin İlanlar sekmesi kendi ilanları,
            oraya "ara" demek yanlış yere götürmek olurdu.
          */}
          {!burslardaMi &&
            (userRole === 'student' || rehberSayfasindaMi) &&
            activeTab !== 'company-portal' &&
            (sosyaldeMi ? kisiAramasiCizilsin : Boolean(onSearchChange)) && (
            <div className="hidden lg:block flex-1 min-w-0 max-w-xl mx-4">
              <div
                ref={kisiAramaKabi}
                className="relative"
                /*
                  Escape listeyi kapatıyor, odak kutuda kalıyor: kullanıcı
                  yazdığını düzeltip devam edebilsin. Odak Tab ile kabın
                  dışındaki bir öğeye geçince de kapanıyor; sonuç satırları
                  kabın içinde olduğundan onlara Tab'lamak kapatmıyor.
                  `relatedTarget` boşken KAPATILMIYOR: Safari bağlantıya
                  basınca ona odak vermiyor ve blur boş hedefle geliyor —
                  burada kapatsaydık satır, tıklama daha işlenmeden
                  ağaçtan kalkardı. O durumu dışarı tıklama dinleyicisi
                  (`mousedown`) karşılıyor.
                */
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && kisiListesiAcik) setKisiListesiAcik(false);
                }}
                onBlur={(e) => {
                  const yeniOdak = e.relatedTarget as Node | null;
                  if (!yeniOdak || kisiAramaKabi.current?.contains(yeniOdak)) return;
                  setKisiListesiAcik(false);
                }}
              >
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {/*
                  ARAMA BULUNULAN SAYFAYA GÖRE DAVRANIYOR

                  Kutu her sayfada ilan listesine götürüyordu: Rehber
                  sayfasında bir şey aramak, kullanıcıyı rehberden atıp ilan
                  listesine düşürüyordu. Rehberin kendi arama kutusu vardı ve
                  aynı ekranda iki arama kutusu "hangisi neyi arıyor"
                  sorusunu doğuruyordu — o kutu kaldırıldı, işi bu üstlendi.

                  Rehberdeyken sekme değiştirilmiyor ve metin de öyle diyor:
                  yazılan şeyin nerede aranacağı yazının kendisinden belli
                  olmalı. Sosyal sayfalarda aynı kutu kişi arıyor; bkz.
                  `sosyaldeMi`.
                */}
                <input
                  type="search"
                  value={sosyaldeMi ? kisiSorgusu : (searchQuery ?? '')}
                  onChange={(e) => {
                    if (sosyaldeMi) {
                      setKisiSorgusu(e.target.value);
                      setKisiListesiAcik(true);
                      return;
                    }
                    onSearchChange?.(e.target.value);
                  }}
                  onFocus={() => {
                    if (sosyaldeMi) {
                      if (kisiSorgusu) setKisiListesiAcik(true);
                      return;
                    }
                    if (rehberSayfasindaMi) return;
                    // Arama yapan kişi ilan listesini görmek istiyor.
                    if (activeTab !== 'internships') setActiveTab('internships');
                  }}
                  autoComplete={sosyaldeMi ? 'off' : undefined}
                  aria-controls={sosyaldeMi ? 'ust-kisi-arama-sonuclari' : undefined}
                  placeholder={
                    sosyaldeMi
                      ? 'Kullanıcı adıyla ara'
                      : rehberSayfasindaMi
                        ? 'Rehberlerde ara'
                        : 'Pozisyon veya şirket ara'
                  }
                  aria-label={
                    sosyaldeMi
                      ? 'Kişi ara'
                      : rehberSayfasindaMi
                        ? 'Rehberlerde ara'
                        : 'Staj ilanlarında ara'
                  }
                  className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/80 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
                {/*
                  Sonuçlar kutunun altında açılır listede. Liste yalnız
                  bir şey yazılmışken açık: boş kutuya odaklanınca "en az 3
                  harf yaz" ipucu belirmesin, o ipucu ilk harften sonra
                  anlamlı. Mantık (geciktirme, dört durum, satırlar)
                  `KullaniciAramaSonuclari`nda; mobildeki kutu da aynı
                  parçayı çiziyor. Kutu sonuca gidince temizleniyor:
                  yeni sayfada eski aramanın listesi asılı kalmasın.
                */}
                {sosyaldeMi && onNavigate && kisiListesiAcik && kisiSorgusu !== '' && (
                  <div
                    id="ust-kisi-arama-sonuclari"
                    role="region"
                    aria-label="Kişi arama sonuçları"
                    className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-lg"
                  >
                    <KullaniciAramaSonuclari
                      sorgu={kisiSorgusu}
                      onNavigate={onNavigate}
                      onSecildi={() => {
                        setKisiSorgusu('');
                        setKisiListesiAcik(false);
                      }}
                    />
                  </div>
                )}
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
                {/*
                  İŞVEREN SAYFASINDA İŞVEREN DÜĞMELERİ

                  Her sayfada aynı üçlü duruyordu: soluk bir "İşveren
                  misiniz?" ve yanında öğrenci akışına ait güçlü "Giriş
                  Yap"/"Kayıt Ol". İşveren tarafındaki bir sayfada en
                  belirgin düğme öğrenci kaydıysa, işveren o düğmeye basıp
                  "Öğrenci Hesabı Oluşturun" penceresiyle karşılaşıyor.

                  İşveren sayfalarında ikili değişiyor: "İşveren Girişi" ve
                  ana düğme olarak "Ücretsiz İlan Ver". Öğrenci kaydı
                  oradan kalkıyor — kaldırılan bir kapı değil, yanlış
                  kapıya konmuş bir tabela.

                  Belirsiz "İşveren misiniz?" ifadesi de gitti: öğrenci
                  tarafında düğme artık ne yapacağını söylüyor.
                */}
                {isverendeMi ? (
                  <>
                    <button
                      id="header-employer-login-btn"
                      onClick={() => onOpenEmployerLogin?.('login')}
                      /* Telefonda gizli: logo ile yan yana sığmıyordu (şirket profilinde ölçüldü, 390 px). */
                      className="hidden sm:inline-flex px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-bold text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all cursor-pointer whitespace-nowrap"
                    >
                      İşveren Girişi
                    </button>
                    <button
                      id="header-employer-post-btn"
                      onClick={() => onOpenEmployer?.()}
                      className="px-3 sm:px-4.5 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {/* Telefonda kısa: ortadaki logoya değmesin. */}
                      <span className="sm:hidden">İlan ver</span>
                      <span className="hidden sm:inline">Ücretsiz ilan ver</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="header-employer-btn"
                      onClick={() => onOpenEmployer?.()}
                      className="hidden sm:inline-flex px-2.5 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:text-blue-700 hover:bg-gray-100 transition-all cursor-pointer whitespace-nowrap"
                    >
                      İşverenler için
                    </button>
                    <button
                      id="header-login-btn"
                      onClick={onOpenLogin}
                      aria-label="Giriş Yap"
                      /*
                        TELEFONDA SİMGE: yazılı düğme (69 px) ile arama simgesi
                        sağda ortadaki markaya çarpıyordu. `sm:` üstünde yazı.
                      */
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-800 hover:bg-gray-100 transition-all cursor-pointer whitespace-nowrap sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-1.5 sm:text-xs sm:font-bold sm:text-gray-700 sm:hover:text-blue-600"
                    >
                      <UserRound aria-hidden className="h-6 w-6 sm:hidden" />
                      <span className="hidden sm:inline">Giriş Yap</span>
                    </button>
                    <button
                      id="header-register-btn"
                      onClick={onOpenRegister}
                      /*
                        "Kayıt Ol" TELEFONDA GİZLİ.

                        Arama ve süzgeç simgeleri üst çubuğa gelince satır
                        360 pikselde 42 piksel taşıyordu (ölçüldü).
                        Kaydolma yolu kapanmıyor: "Giriş Yap"ın açtığı
                        pencerede "Kayıt Ol" sekmesi zaten var, yani eylem
                        bir dokunuş uzakta ve aynı pencerede.
                      */
                      className="hidden sm:inline-flex px-3 sm:px-4.5 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Kayıt Ol
                    </button>
                  </>
                )}
              </div>
              ) : null
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                {/*
                  İŞVEREN PANELİNE DÖNÜŞ

                  Şirket üyesi öğrenci görünümüne geçtiğinde geri dönecek
                  görünür bir yol yoktu: geçiş yalnızca profil menüsünün
                  içindeydi ve kullanıcı çıkış yapmak ya da tarayıcı geri
                  tuşuna basmak zorunda kalıyordu.

                  İkincil eylem: mavi öğrenci CTA'sıyla yarışmıyor, yeşilden
                  yalnızca metin ve kenar rengi kadar ipucu alıyor.

                  DAR EKRANDA DA ÇİZİLİYOR

                  Önce `hidden sm:inline-flex` idi ve mobildeki karşılığı
                  hesap menüsündeki "İşveren paneline geç" satırıydı. Ama o
                  menü yalnızca ÖĞRENCİ PROFİLİ OLAN kullanıcıda çiziliyor
                  (`activeStudent`); şirket hesabının çoğunda öğrenci
                  profili yok ve orada header yalnızca çıkış düğmesini
                  gösteriyor. Sonuç: telefonda şirket paneline dönmenin
                  hiçbir yolu kalmıyordu — bildirilen hata tam olarak buydu.

                  Artık her genişlikte var; dar ekranda yalnızca ikon,
                  dokunma hedefi 44px.
                */}
                {sirketUyesiMi && onDunyaDegistir && (
                  <button
                    type="button"
                    onClick={onDunyaDegistir}
                    data-testid="header-isveren-paneli"
                    title="İşveren paneline dön"
                    aria-label="İşveren paneline dön"
                    className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-bold transition-colors cursor-pointer"
                    style={{ borderColor: SIRKET_KENAR_GUCLU, color: SIRKET_VURGU_KOYU }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = SIRKET_ROZET)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <Building2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">İşveren paneli</span>
                  </button>
                )}

                {/*
                  ZARF GİTTİ, ZİL GELDİ

                  Buradaki ikon bir zarftı ve başlığı "Mesajlar ve
                  Bildirimler" diyordu. Ölçüldü: mesajlaşma diye bir şey
                  YOK ve düğmenin yaptığı tek şey sekme değiştirmekti —
                  öğrenciyi Başvurularım'a, şirketi aday havuzuna
                  götürüyordu. Yani ikon var olmayan bir kutuyu vaat
                  ediyordu.

                  Zil, gerçekten var olan şeyi anlatıyor: okunmamış
                  bildirimler. Rozet yalnız sayı SUNUCUDAN geldiğinde
                  çiziliyor.
                */}
                {onBildirimAc && (
                  <BildirimDugmesi
                    okunmamis={okunmamisBildirim ?? null}
                    renk="#2563EB"
                    onAc={onBildirimAc}
                  />
                )}
                {/*
                  ☰ AYARLAR VE HAREKETLER — yalnız kendi profilinde ve telefonda
                  (Instagram'daki gibi sağ üst köşe). Menünün kendisi
                  ProfilBasligi'nde; buradan olayla açılıyor.
                */}
                {kendiProfilimde && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('stajimvar:profil-menusu'))}
                    aria-label="Ayarlar ve hareketler"
                    aria-haspopup="dialog"
                    className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-800 transition-colors hover:bg-gray-100 lg:hidden"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                )}

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

                {/*
                  HESAP DÜĞMESİ MENÜ AÇMIYOR, DOĞRUDAN /cv'YE GİDİYOR

                  Burada bir açılır menü vardı: "Profilim ve CV",
                  "Başvurularım (n)", "Rozetler ve testler", "Yönetim
                  paneli", "Çıkış Yap". Beş satırın beşinin de karşılığı
                  zaten birleşik profil ekranında (/cv) duruyor: sayfanın
                  kendisi, sol karttaki başvuru sayacı, "Yetkinlik
                  testleri" kartı ve sayfanın altındaki iki düğme
                  (StudentProfileView, yönetim paneli yalnız yöneticide).
                  Menü, her satırı için bir sayfa ileride bir kez daha
                  gösterilen bir ara duraktı.

                  YALNIZCA MASAÜSTÜNDE: alt gezinme çubuğu `lg:hidden`,
                  yani geniş ekranda hiç çizilmiyor. Bu bağlantı oradaki tek
                  profil kapısı; çıkış ve yönetim paneli de o sayfada.
                  Dar ekranda alt çubuktaki "Profil" aynı adrese gidiyor.

                  GERÇEK BAĞLANTI: üst sekmelerle aynı gerekçe — orta tuş,
                  "yeni sekmede aç" ve ekran okuyucunun "bağlantı" demesi
                  bir <button> ile çalışmıyor. Ok simgesi de gitti: aşağı
                  bakan ok "altında bir menü var" der, artık yok.
                */}
                {userRole === 'student' && activeStudent && (
                  <a
                    href="/cv"
                    id="user-profile-menu-btn"
                    data-testid="header-hesap-baglantisi"
                    aria-label={`Profilim ve CV — ${adYazimi(activeStudent.fullName)}, öğrenci hesabı`}
                    aria-current={cvEkranindaMi ? 'page' : undefined}
                    title="Profilim ve CV"
                    onClick={baglantiTiklamasi(() => {
                      if (onOpenProfilVeCv) {
                        onOpenProfilVeCv();
                        return;
                      }
                      /* Prop verilmezse eski sekme davranışı yedekte. */
                      setActiveTab('profile');
                      setActiveSubTab('all');
                    })}
                    className={`hidden min-h-11 shrink-0 select-none items-center gap-2 rounded-2xl border px-2 py-1.5 text-left text-gray-800 transition-all duration-200 sm:gap-2.5 sm:px-3 lg:flex ${ODAK_HALKASI} ${
                      cvEkranindaMi
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/*
                      AVATARDAKİ YEŞİL SAYI KALDIRILDI

                      Orada basvuru sayisi duruyordu ve bildirim rozeti gibi
                      goruunuyordu. Arayuzde avatarin kosesindeki sayi belirli
                      bir sey soyler: "senin gormedigin yeni bir sey var".
                      Başvuru sayısı ogrencinin kendi bildigi, okunacak bir
                      sey olmayan bir sayiydi; her acilista bosuna dikkat
                      cekiyordu.

                      Sayi kaybolmadi: profil ekraninin ust istatistiginde
                      duruyor.
                    */}
                    <ProfilFotografi
                      ad={activeStudent.fullName}
                      yol={sosyalAvatarYolu}
                      yedekAdres={activeStudent.avatarUrl || null}
                      className="h-8 w-8 shrink-0 rounded-full text-xs ring-1 ring-gray-200 sm:h-9 sm:w-9"
                    />
                    <span className="hidden min-w-0 max-w-[11rem] flex-col leading-tight md:flex">
                      <span className="truncate text-sm font-bold text-gray-900">
                        {adYazimi(activeStudent.fullName)}
                      </span>
                      <span className="truncate text-[11px] text-gray-600">Öğrenci hesabı</span>
                    </span>
                  </a>
                )}

                {/*
                  ŞİRKET HESABI BAĞLANTISI — öğrencideki avatar bağlantısının
                  karşılığı. Eski açılır menü (Başvuranlar, Kanban, "Şirket
                  Portalından Çıkış") kalktı; satırlarının hiçbiri bir ekrana
                  bağlanmıyordu. Çıkış Profil sekmesinin sonunda.

                  Ad yoksa (bağlam henüz çözülmedi ya da şirket kaydı yok)
                  "İşveren hesabı" tek başına; ad uydurulmuyor.
                */}
                {sirketKabugu && (
                  <a
                    href="/sirket/profil"
                    data-testid="header-sirket-hesabi"
                    aria-label={`Şirket profili${sirketAdi ? ` — ${sirketAdi}` : ''}, işveren hesabı`}
                    aria-current={sirketProfilindeMi ? 'page' : undefined}
                    onClick={onNavigate ? baglantiTiklamasi(() => onNavigate('/sirket/profil')) : undefined}
                    className={`hidden min-h-11 shrink-0 select-none items-center gap-2 rounded-2xl border px-2 py-1.5 text-left text-gray-800 transition-all duration-200 sm:gap-2.5 sm:px-3 lg:flex ${ODAK_HALKASI} ${
                      sirketProfilindeMi
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9"
                      style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                    >
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="hidden min-w-0 max-w-[11rem] flex-col leading-tight md:flex">
                      {sirketAdi && (
                        <span className="truncate text-sm font-bold text-gray-900">{sirketAdi}</span>
                      )}
                      <span className="truncate text-[11px] text-gray-600">İşveren hesabı</span>
                    </span>
                  </a>
                )}
              </div>
            )}
            {/*
              ARAMA TELEFONDA EN SAĞDA (kullanıcı isteği, 17 Eylül 2026) —
              zilin, ☰'ın ya da giriş simgesinin sağında, her sekmede aynı yer.
            */}
            {aramaDugmesi}
          </div>
        </div>

        {/*
          ARAMA ALANI — simgeye basılınca çubuğun ALTINDA açılıyor.

          Kutuyu doğrudan çubuğa koymak logoyu ve simgeleri sıkıştırırdı;
          bu satır tam genişlik veriyor ve kapalıyken hiç yer kaplamıyor.
        */}
        {aramaAcik && sayfaAramasi && (
          <div className="py-2 lg:hidden">
            <label className="relative block">
              <span className="sr-only">{sayfaAramasi.yerTutucu}</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                autoFocus
                value={aramaMetni}
                onChange={(olay) => {
                  setAramaMetni(olay.target.value);
                  sayfaAramasi.onDegisti(olay.target.value);
                }}
                placeholder={sayfaAramasi.yerTutucu}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-600 focus:outline-none"
              />
            </label>
          </div>
        )}
        {/* Dynamic Contextual Sub-Menu Bar (for Student views) */}
        {subMenuItems.length > 0 && (
          <div className="relative border-t border-gray-100 flex items-center py-2 group/subnav">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider shrink-0 mr-2 hidden sm:inline">
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
        {/*
          ERİŞİLEBİLİR AD HER ZAMAN VAR

          Alt bardaki yazı yalnızca seçili öğede görünüyor; yerden kazanmak
          için böyle. Ama ekran okuyucu ve sesle kontrol için ad yazının
          görünürlüğüne bağlı olamaz — etiketsiz bir ikon "düğme" diye
          okunuyor ve nereye gittiği bilinmiyor. `aria-label` görünürden
          bağımsız olarak adı taşıyor.
        */}
        {/* 1. İlanlar */}
        <a
          href="/"
          aria-label="Staj ilanları"
          aria-current={ilanlardaMi ? 'page' : undefined}
          onClick={baglantiTiklamasi(() => {
            setActiveTab('internships');
            setActiveSubTab('all');
          })}
          className={altMenuOgesi(ilanlardaMi)}
        >
          <span className={altMenuIkonu(ilanlardaMi)}>
            <Briefcase className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(ilanlardaMi)}>İlanlar</span>
        </a>

        {/*
          MOBİL ALT BAR = MASAÜSTÜ SEKMELERİ

          Eskiden burada dört sekme vardı: İlanlar, Yetenekler, Başvurularım,
          Profil. Masaüstünde ise Yetenekler profile taşınmış, Başvurularım da
          öyle. İki taraf ayrı yapıdaydı; aynı sitede telefonla ve bilgisayarla
          gezen kişi farklı bir uygulama görüyordu.

          Artık ikisi de aynı: İlanlar · Fırsatlar · Ağım · Rehber · (Profil / İşveren).
        */}

        {/* 2. Fırsatlar — masaüstündeki sekmenin karşılığı */}
        <a
          href="/firsatlar"
          aria-label="Öğrenci fırsatları"
          aria-current={firsatlardaMi ? 'page' : undefined}
          onClick={baglantiTiklamasi(() => onOpenOpportunities?.())}
          className={altMenuOgesi(firsatlardaMi)}
        >
          <span className={altMenuIkonu(firsatlardaMi)}>
            <Sparkles className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(firsatlardaMi)}>Fırsatlar</span>
        </a>

        {/* 3. Ağım — masaüstündeki sekmenin karşılığı; Keşfet'in yerini aldı (bkz. üstteki not). */}
        <a
          href="/baglantilar"
          aria-label="Ağım"
          aria-current={agimdaMi ? 'page' : undefined}
          onClick={onNavigate ? baglantiTiklamasi(() => onNavigate('/agim')) : undefined}
          className={altMenuOgesi(agimdaMi)}
        >
          <span className={altMenuIkonu(agimdaMi)}>
            <Users className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(agimdaMi)}>Ağım</span>
        </a>

        {/*
          4. Rehber — giriş şartı yok, herkese açık.

          `!isverendeMi`: işveren rehberi masaüstünde "Rehber" başlığının
          altında sayılıyor, ama alt barda İşveren'in kendi öğesi var. İkisi
          birden yanarsa hangisinde olunduğu belirsiz kalıyor.
        */}
        <a
          href="/rehber"
          aria-label="Öğrenci rehberi"
          aria-current={rehberdeMi && !isverendeMi ? 'page' : undefined}
          onClick={baglantiTiklamasi(() => onOpenGuides?.())}
          className={altMenuOgesi(rehberdeMi && !isverendeMi)}
        >
          <span className={altMenuIkonu(rehberdeMi && !isverendeMi)}>
            <BookOpen className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(rehberdeMi && !isverendeMi)}>Rehber</span>
        </a>

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
            aria-label="İşveren tarafı"
            onClick={() => onOpenEmployer?.()}
            className={altMenuOgesi(isverendeMi)}
          >
            <span className={altMenuIkonu(isverendeMi)}>
              <Building2 className="h-5 w-5" />
            </span>
            <span className={altMenuYazisi(isverendeMi)}>İşveren</span>
          </button>
        )}

        {isLoggedIn && (
          <>
        {/*
          PROFİL DOĞRUDAN AÇILIYOR

          Bu düğme `openMobileAccountSheet()` çağırıyordu, yani sağ üstteki
          avatarla BİREBİR aynı şeyi yapıyordu: alttan bir menü açılıyor,
          menüdeki "Profilim ve CV" ise zaten bu sayfaya götürüyordu. İki
          ayrı düğme, aynı hedefe, arada gereksiz bir durak.

          Menüdeki diğer satırlar da profilin kendi bölümleriydi
          ("Başvurularım", "Rozetler ve testler" sayfanın içinde duruyor).
          Geriye yalnızca çıkış ve yönetim paneli kalıyordu; ikisi de
          profil sayfasının en altına indi.
        */}
        <button
          aria-label="Profilim"
          aria-current={profildeMi ? 'page' : undefined}
          onClick={() => {
            /*
              Üst çubuktaki hesap bağlantısıyla AYNI yolu kullanıyor. Alt
              menü `setActiveTab('profile')` yaptığında ekran `/`
              adresinde çiziliyordu; birleşik profil ekranının kendi adresi
              (/cv) olduğu için aynı ekranın iki adresi vardı. İkinci bir
              yol açmamak için aynı prop burada da geçiyor.

              Prop verilmezse eski sekme davranışı yedekte: tek bir prop
              unutulduğunda alt menüdeki Profil ölmesin.
            */
            if (onOpenProfilVeCv) {
              onOpenProfilVeCv();
              return;
            }
            setActiveTab('profile');
            setActiveSubTab('all');
          }}
          className={altMenuOgesi(profildeMi)}
        >
          {/*
            YEŞİL SAYI BURADAN DA KALKTI

            Üst çubuktaki avatarın köşesindeki sayıyla aynı sayıydı ve aynı
            şeyi yanlış söylüyordu: rozet "senin görmediğin yeni bir şey
            var" demek, oysa bu öğrencinin kendi bildiği başvuru sayısı.
            İkisinden birini bırakmak, aynı yanlışı yarım düzeltmek olurdu.

            Sayı kaybolmadı: profil ekranının üst istatistiğinde duruyor.
          */}
          <span className={altMenuIkonu(profildeMi)}>
            <UserCheck className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(profildeMi)}>Profil</span>
        </button>
          </>
        )}

      </nav>
    ) : (
      /*
        ŞİRKET ALT MENÜSÜ — ÖĞRENCİYLE AYNI ÇUBUK, AYNI BEŞ SEKME

        Eski dört öğe (Adaylar, %80+ Uyum, Kanban, İlan Ekle) kalktı;
        turuncu/mor vurgular da onlarla gitti. Aynı `altMenuOgesi`
        sınıfları: seçili öğe mavi kutu, diğerleri gri. Fırsatlar, Ağım
        ve Rehber öğrencininkiyle aynı adrese; İlanlar ve Profil şirketin
        kendi ekranına.
      */
      <nav
        aria-label="Mobil Alt Şirket Navigasyon"
        className={altMenuClass}
        style={altMenuStil}
      >
        <a
          href="/sirket/ilanlar"
          aria-label="İlanların"
          aria-current={sirketIlanlarindaMi ? 'page' : undefined}
          onClick={onNavigate ? baglantiTiklamasi(() => onNavigate('/sirket/ilanlar')) : undefined}
          className={altMenuOgesi(sirketIlanlarindaMi)}
        >
          <span className={altMenuIkonu(sirketIlanlarindaMi)}>
            <Briefcase className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(sirketIlanlarindaMi)}>İlanlar</span>
        </a>

        <a
          href="/firsatlar"
          aria-label="Fırsatlar"
          aria-current={firsatlardaMi ? 'page' : undefined}
          onClick={baglantiTiklamasi(() => onOpenOpportunities?.())}
          className={altMenuOgesi(firsatlardaMi)}
        >
          <span className={altMenuIkonu(firsatlardaMi)}>
            <Sparkles className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(firsatlardaMi)}>Fırsatlar</span>
        </a>

        <a
          href="/agim"
          aria-label="Ağım"
          aria-current={agimdaMi ? 'page' : undefined}
          onClick={onNavigate ? baglantiTiklamasi(() => onNavigate('/agim')) : undefined}
          className={altMenuOgesi(agimdaMi)}
        >
          <span className={altMenuIkonu(agimdaMi)}>
            <Users className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(agimdaMi)}>Ağım</span>
        </a>

        <a
          href="/rehber"
          aria-label="Rehber"
          aria-current={rehberdeMi && !isverendeMi ? 'page' : undefined}
          onClick={baglantiTiklamasi(() => onOpenGuides?.())}
          className={altMenuOgesi(rehberdeMi && !isverendeMi)}
        >
          <span className={altMenuIkonu(rehberdeMi && !isverendeMi)}>
            <BookOpen className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(rehberdeMi && !isverendeMi)}>Rehber</span>
        </a>

        <a
          href="/sirket/profil"
          aria-label="Şirket profili"
          aria-current={sirketProfilindeMi ? 'page' : undefined}
          onClick={onNavigate ? baglantiTiklamasi(() => onNavigate('/sirket/profil')) : undefined}
          className={altMenuOgesi(sirketProfilindeMi)}
        >
          <span className={altMenuIkonu(sirketProfilindeMi)}>
            <Building2 className="h-5 w-5" />
          </span>
          <span className={altMenuYazisi(sirketProfilindeMi)}>Profil</span>
        </a>
      </nav>
    )}
  </>
  );
};
