import React from 'react';
import {
  Award,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  FileText,
  GraduationCap,
  LogOut,
  MapPin,
  Settings,
} from 'lucide-react';
import { OkulRozeti } from './OkulRozeti';
import { universiteLogosu } from '../lib/universite-logosu.mjs';
import { adYazimi } from '../lib/ad';
import { ProfilFotografi } from './sosyal/ProfilFotografi';
import { KapakFotografi } from './sosyal/KapakFotografi';
import {
  AVATAR_SATIRI,
  BIYOGRAFI,
  HAP,
  HAP_BIRINCIL,
  HAP_SIRASI,
  IKON_HAP,
  KIMLIK_BANDI,
  META_SATIRI,
  MetaOgesi,
  SAYAC_ETIKETI,
  SAYAC_OGESI,
  SAYAC_SATIRI,
  SAYAC_SAYISI,
} from './sosyal/ProfilKimlikKalibi';
import { katilmaMetni } from '../lib/tarih.mjs';
import { profilAyarOgeleri } from './sosyal/ProfilAyarMenusu';
import { ProfilAyarlarSayfasi, type AyarBolumu } from './ProfilAyarlarSayfasi';
import type { PortfolyoSatiri } from './sosyal/SosyalProfilSayfasi';
import { profilYolu } from '../lib/sosyal-kullanici-adi.mjs';
import { ODAK_HALKASI } from '../lib/renk-token';
import { Card, ProfileSectionGroup, ProfileSectionRow, Skeleton } from '../ui';

/*
  DÜĞME VE DÜZEN DİZELERİ `sosyal/ProfilKimlikKalibi`nden (X web profili
  kalıbı, 24 Eylül 2026). Üç profil ekranı aynı modülü içe aktarıyor;
  `tests/sosyal-profil-arayuzu` üçünün de oradan okuduğunu doğruluyor.
*/

/**
 * Profil başlığı — öğrencinin kişisel kontrol paneli.
 *
 * NEDEN "KİMLİK KARTI" DEĞİL
 * --------------------------
 * Başlık uzun süre bir kimlik kartıydı: fotoğraf, ad, okul, birkaç sayı.
 * Bilgi doğruydu ama öğrenciye BUGÜN ne yapması gerektiğini söylemiyordu.
 * Artık üç şeyi birden söylüyor: kim olduğunu, sürecinin nerede olduğunu
 * (kaydedilen / başvuru / mülakat) ve sıradaki eksik adımı.
 *
 * SAYILAR TEK KAYNAKTAN
 * ---------------------
 * Üstte "13 beceri" yazarken alttaki şeritte "Beceriler · 8 tane"
 * yazıyordu: üstteki üçünün toplamıydı (program + beceri + dil), alttaki
 * yalnızca sosyal becerilerdi. Aynı kelime, iki sayı. Aynı kelimeyi iki
 * farklı şey için kullanmak, sayının kendisinden daha kötü bir hata.
 *
 * "Beceri" sayısı üstten tamamen kalktı. Yerine öğrencinin sürecini
 * anlatan üçlü geldi; her biri TEK bir kaynaktan sayılıyor ve her biri
 * kendi listesine gidiyor. Sayıya basınca gittiği yerde aynı sayıyı
 * göremiyorsa, sayı yanlıştır.
 *
 * DOLULUK HALKASI
 * ---------------
 * Yüzde hem halkada hem sayılarda duruyordu — aynı bilgi iki kez. Halkada
 * kaldı (Instagram'daki gibi bir DURUMU anlatıyor: profil ne kadar dolu),
 * sayılardan çıktı. Yüzdenin kendisi de artık tıklanabilir bir cümle:
 * yüzde tek başına ne yapılacağını söylemiyor, eksik adımın adı söylüyor.
 */

/**
 * Doluluk halkası. Konik degrade ile çiziliyor; ek bir kütüphane yok.
 *
 * `className` dışarıdan veriliyor: telefonda kart bir ızgara ve halka
 * kendi hücresine açıkça yerleşiyor (bkz. kartın yerleşim yorumu).
 * Yerleşimi bileşenin içine yazmak, halkayı tek bir kartın ızgarasına
 * bağlardı.
 */
const Halka: React.FC<{ oran: number; className?: string; children: React.ReactNode }> = ({
  oran,
  className = '',
  children,
}) => {
  const renk = oran === 100 ? '#10b981' : '#2563eb';
  return (
    <div
      className={`rounded-full p-[3px] shrink-0 ${className}`}
      style={{
        background: `conic-gradient(${renk} ${oran * 3.6}deg, #e5e7eb ${oran * 3.6}deg)`,
      }}
    >
      {/* Beyaz ara halka: dolu kısmın nerede bittiğini gözle ayırıyor. */}
      <div className="rounded-full bg-white p-[3px]">{children}</div>
    </div>
  );
};

export interface OneCikan {
  id: string;
  etiket: string;
  /** Bölümde içerik var mı. Yoksa kesik çizgili çember ve "+" çiziliyor. */
  dolu: boolean;
  /**
   * Etiketin altındaki kısa satır: dolu bölümde sayı ("8 beceri"), boş
   * bölümde ne olacağı ("teste başla"). Başka bir yerde zaten yazan
   * sayılar için boş bırakılıyor.
   */
  alt?: string;
  ikon: React.ReactNode;
  /**
   * Boşken çizilecek ikon. Verilmezse "+" çiziliyor.
   *
   * "+" bir şey EKLEYECEĞİNİ söyler. Testler bölümünde ekleyecek bir şey
   * yok — orada çözülecek hazır testler var; "+" kullanıcıya test
   * oluşturacakmış gibi görünüyordu.
   */
  bosIkon?: React.ReactNode;
  onClick: () => void;
}

/** Eksik bir adım: adı ve gittiği yer. */
export interface EksikAdim {
  etiket: string;
  onClick: () => void;
}

/**
 * Profil bilgileri — tek grup kartı, satırlar arasında ince ayraç.
 *
 * NEDEN AYRI KARTLAR DEĞİL
 * ------------------------
 * Beş bölüm beş ayrı karttı ve her biri ~105 piksel yer kaplıyordu;
 * ekran gereğinden fazla uzuyordu. Beş ayrı kutu ayrıca beş ayrı şeymiş
 * izlenimi veriyordu — oysa hepsi tek bir şeyin parçaları.
 *
 * Şimdi tek kart, 80 piksellik satırlar ve 1 piksel ayraçlar. Kart
 * başlığı nerede durulduğunu da söylüyor: "3/5 tamamlandı".
 *
 * NEDEN DIŞARI AÇILDI
 * -------------------
 * Kart `ProfilBasligi`nin içinde çiziliyordu, yani /cv'nin ANA
 * görünümünde. Ana görünümün konusu artık iki şey: solda kim olduğun,
 * sağda portfolyon. Doldurulacak alanların listesi düzenleme ekranının
 * gezinmesi — orada bir işe yarıyor, ana görünümde yalnız yer kaplıyordu.
 * Kopyalanmadı, TAŞINDI: iki liste olsaydı biri değiştiğinde öteki geride
 * kalır ve aynı bölüm iki farklı yerde iki farklı sırayla dururdu.
 */
export const ProfilBolumListesi: React.FC<{ ogeler: OneCikan[]; secili?: string }> = ({
  ogeler,
  secili,
}) => {
  const dolu = ogeler.filter((o) => o.dolu).length;
  return (
    <ProfileSectionGroup
      baslik="Profil bilgileri"
      sagBilgi={`${dolu}/${ogeler.length} tamamlandı`}
    >
      {ogeler.map((o) => (
        <ProfileSectionRow
          key={o.id}
          ikon={o.dolu ? o.ikon : o.bosIkon || o.ikon}
          baslik={o.etiket}
          bilgi={o.alt}
          secili={o.id === secili}
          onClick={o.onClick}
        />
      ))}
    </ProfileSectionGroup>
  );
};

export interface OneCikan {
  id: string;
  etiket: string;
  /** Bölümde içerik var mı. Yoksa kesik çizgili çember ve "+" çiziliyor. */
  dolu: boolean;
  /**
   * Etiketin altındaki kısa satır: dolu bölümde sayı ("8 beceri"), boş
   * bölümde ne olacağı ("teste başla"). Başka bir yerde zaten yazan
   * sayılar için boş bırakılıyor.
   */
  alt?: string;
  ikon: React.ReactNode;
  /**
   * Boşken çizilecek ikon. Verilmezse "+" çiziliyor.
   *
   * "+" bir şey EKLEYECEĞİNİ söyler. Testler bölümünde ekleyecek bir şey
   * yok — orada çözülecek hazır testler var; "+" kullanıcıya test
   * oluşturacakmış gibi görünüyordu.
   */
  bosIkon?: React.ReactNode;
  onClick: () => void;
}

/** Eksik bir adım: adı ve gittiği yer. */
export interface EksikAdim {
  etiket: string;
  onClick: () => void;
}

interface Props {
  /**
   * Kabın dış boşluğu — çağıran veriyor.
   *
   * `/cv` telefonda bu bloğu ekranın iki kenarına yaslıyor
   * (`-mx-4 sm:mx-0`). Değer bileşenin içine yazılmadı: bleed miktarı
   * çağıranın kendi yan boşluğuna bağlı ve burada bilinmiyor.
   */
  className?: string;
  ad: string;
  /**
   * `student_profiles.avatar_url` — ARTIK YALNIZ YEDEK.
   *
   * Bu kolona yazan tek yer buradaki kamera düğmesiydi ve o düğme
   * kalktı: kullanıcının tek fotoğrafı var, kaynağı
   * `social_profiles.avatar_path` ve tek yükleme yeri düzenleme
   * ekranının sosyal bloğu. Kolon SİLİNMEDİ, okunmaya devam ediyor —
   * eskiden buradan fotoğraf yüklemiş kullanıcı fotoğrafsız kalmamalı.
   */
  avatarUrl?: string;
  /**
   * `social_profiles.avatar_path`.
   *
   * `undefined` = sosyal satır henüz okunmadı. Değer `/cv` ekranının
   * sağ sütunundaki portfolyo panelinden geliyor; kart kendi sorgusunu
   * atsaydı aynı satır aynı ekranda iki kez okunur ve yeni yüklenen
   * fotoğraf bir sütunda eski kalırdı.
   */
  sosyalAvatarYolu?: string | null;
  okul: string;
  bolum?: string;
  sinif: string;
  /** Oturduğu il; boşsa konum satırı çizilmiyor. */
  konum?: string;
  /**
   * Ne aradığı — tercihlerinden üretilen iki satır.
   *
   * `basSatir` zamanı söylüyor ("2026 yaz stajına açığım"), `altSatir`
   * koşulları ("İstanbul · Hibrit"). İkisi de boşsa tercih girilmemiştir
   * ve yerine kısa bir çağrı çiziliyor.
   */
  durum: { basSatir: string | null; altSatir: string | null };
  onEtiketDuzenle: () => void;
  oran: number;
  eksikler: EksikAdim[];
  kaydedilenSayisi: number;
  basvuruSayisi: number;
  mulakatSayisi: number;
  /*
    `oneCikanlar` ve `secili` BU BİLEŞENDEN KALKTI: bölüm listesi artık
    `ProfilBolumListesi` olarak dışarıdan çiziliyor ve yalnız düzenleme
    ekranında duruyor. Props'ta bırakılsalardı, hiçbir şeyi çizmeyen iki
    değer her çağrıda taşınır ve sonradan okuyan onların bir yerde
    göründüğünü sanırdı.
  */
  /*
    `avatarYukleniyor` ve `onFotografSec` BU BİLEŞENDEN KALKTI.

    Fotoğraf yükleme iki yerde vardı (buradaki kamera düğmesi ve sosyal
    profilin düzenleme bloğu) ve ikisi AYRI kolona yazıyordu: aynı
    kullanıcı iki ekranda iki farklı fotoğrafla görünebiliyordu. Tek
    kaynak `social_profiles.avatar_path` seçildi, yükleme de tek yerde
    kaldı. Props'ta bırakılsalardı hiçbir şey yapmayan iki değer her
    çağrıda taşınır ve sonradan okuyan buradan fotoğraf değiştirilebildiğini
    sanırdı.
  */
  onDuzenle: () => void;
  onCv?: () => void;
  onKaydedilenlere?: () => void;
  /** Yönetim paneli — yalnız yöneticide verilir. "Ayarlar ve hareketler"de. */
  onYonetim?: () => void;
  /** Çıkış — "Ayarlar ve hareketler"in en altında. */
  onCikis?: () => void;
  onBasvurulara?: () => void;
  onMulakatlara?: () => void;
  /**
   * SOSYAL PORTFOLYO SATIRI — İKİ SAYAÇ, "PAYLAŞ" VE DİŞLİ
   *
   * Sayaçlar ("Paylaşım", "Bağlantı"), "Paylaş" (ikincil) ve dişli menüsü
   * `/cv` ekranının SAĞ sütununun üstünde duruyordu; artık bu kartın
   * içinde. Veri ve eylemler yine sağ sütundaki portfolyo panelinden
   * geliyor — kart sosyal veriyi kendisi çekmiyor ve sahiplik kararını
   * kendisi vermiyor; nesne ancak panelin sahip dalından geçince
   * doluyor. Kalıp `sosyalAvatarYolu` ile aynı.
   *
   * Dış prop VERİLMEZSE (panel yok) sosyal hücreler ve eylemler HİÇ
   * çizilmiyor: olmayan bir özelliğe boş hücre ayırmak, onu varmış gibi
   * göstermek olurdu. Verilirse iç değerin üç hâli var:
   *   `undefined`  satır henüz okunmadı → iki hücre iskelet
   *   `null`       satır gelmedi → hücrede kısa durum metni; düğme yok
   *   nesne        sayılar ve eylemler
   *
   * Sıfır UYDURULMUYOR: sayaç RPC'si satır döndürmediyse (`sayaclar`
   * null ya da `sayacDurumu` 'hata') sayı çizilmiyor, yerine durum metni
   * geçiyor — sağ sütunda dün "Sayaçlar şu anda alınamadı." ne idiyse
   * burada o.
   */
  portfolyo?: { satir: PortfolyoSatiri | null | undefined };
  /**
   * TESTLERE GİRİŞ — KARTIN İÇİNDE TEK SATIR
   *
   * "Yetkinlik testleri" kartı `/cv` ana görünümünden kalktı ve hesap
   * menüsü de yok; testler bölümüne (`id="rozet"`, düzenleme dalında)
   * giden başka bir yol kalmamıştı. Giriş bu yüzden kimlik kartında:
   * `rozetSayisi` kazanılmış rozet sayısı (`earnedBadges.length`, sayı
   * uydurulmuyor), `onTestlere` çağıranın `bolumeGit('rozet')` eylemi.
   * İkisi de zorunlu: eylemi olmayan bir satır, basınca hiçbir şey
   * yapmayan bir satır olurdu.
   */
  rozetSayisi: number;
  onTestlere: () => void;
  /**
   * FOTOĞRAF GÖRÜNTÜLEYİCİDEKİ KALEM — var olan değiştirme akışına
   *
   * Avatara dokununca açılan tam ekran görüntüleyicide (Instagram
   * kalıbı) sahibin fotoğrafının sağ altında kalem var; bu eylem onu
   * düzenleme ekranındaki fotoğraf akışına götürüyor. Kart akışı
   * kendisi bilmiyor — yükleme tek yerde (`ProfilFotografiYukleme`,
   * düzenleme dalı) ve buradan ikinci bir kapı açılmıyor. Verilmezse
   * kalem çizilmiyor.
   */
  onFotografDegistir?: () => void;
}

/**
 * Sayacın iskeleti: satır içi sayacın aynı kutusu (`SAYAC_OGESI`, 44
 * piksel), içinde sayı ve etiket genişliğinde iki gri şerit. Sayılar
 * gelince satır zıplamıyor çünkü kutunun yüksekliği metinden değil
 * `min-h-11`den geliyor.
 */
const SayacIskeleti: React.FC = () => (
  <span aria-hidden className={SAYAC_OGESI}>
    <Skeleton className="h-4 w-5" />
    <Skeleton className="h-4 w-14" />
  </span>
);

export const ProfilBasligi: React.FC<Props> = ({
  className = '',
  ad,
  avatarUrl,
  sosyalAvatarYolu,
  okul,
  bolum,
  sinif,
  konum,
  oran,
  eksikler,
  kaydedilenSayisi,
  basvuruSayisi,
  mulakatSayisi,
  onDuzenle,
  onCv,
  onKaydedilenlere,
  onYonetim,
  onCikis,
  onBasvurulara,
  onMulakatlara,
  portfolyo,
  rozetSayisi,
  onTestlere,
  onFotografDegistir,
}) => {
  /*
    Sosyal hücrelerin dört hâli tek yerde karara bağlanıyor; JSX'te iç
    içe üçlü koşul yerine tek bir ad okunuyor.

    'yok'        panel verilmemiş — hücre de düğme de yok
    'yukleniyor' satır ya da sayaç RPC'si henüz dönmedi — iskelet
    'hazir'      iki sayı
    'alinamadi'  satır gelmedi ya da RPC boş/hatalı — durum cümlesi
  */
  const sosyalHucre: 'yok' | 'yukleniyor' | 'hazir' | 'alinamadi' = !portfolyo
    ? 'yok'
    : portfolyo.satir === undefined || portfolyo.satir?.sayacDurumu === 'yukleniyor'
      ? 'yukleniyor'
      : portfolyo.satir?.sayacDurumu === 'hazir' && portfolyo.satir.sayaclar
        ? 'hazir'
        : 'alinamadi';
  const satir = portfolyo?.satir ?? null;

  /*
    KAPAK YOLUNUN ÜÇ HÂLİ — `sosyalAvatarYolu` ile aynı sözleşme

      undefined  panel satırı HENÜZ OKUNMADI → iskelet bant
      null       panel yok, satır gelmedi ya da kapak yok → nötr bant
      yol        kapağın kendisi

    Panel hiç verilmediyse (`portfolyo` yok) kapak bilinemiyor; iskelet
    sonsuza kadar yanıp sönerdi. O durumda nötr bant — "bilinmiyor"u
    "yükleniyor" gibi göstermiyoruz.
  */
  const kapakYolu: string | null | undefined = !portfolyo
    ? null
    : portfolyo.satir === undefined
      ? undefined
      : (portfolyo.satir?.kapakFotografiYolu ?? null);
  /* Tarih okunamadıysa satır YOK; uydurulmuş bir ay yazılmıyor. */
  const katilma = katilmaMetni(satir?.katilmaAni ?? null);

  /*
    "AYARLAR VE HAREKETLER" (☰) — kullanıcı isteği, 17 Eylül 2026

    Profil durumu, yetkinlik testleri, kaydedilenler, başvurular, dişli
    menüsünün satırları, yönetim paneli ve çıkış karttan kalktı; hepsi
    Instagram'daki gibi tek bir tam ekran listede. Telefonda üst çubuğun
    sağındaki ☰ açıyor (Header `stajimvar:profil-menusu` olayı), geniş
    ekranda kartın sağ üstündeki ☰.
  */
  const [menuAcik, setMenuAcik] = React.useState(false);
  const menuKapat = React.useCallback(() => setMenuAcik(false), []);
  React.useEffect(() => {
    const ac = () => setMenuAcik(true);
    window.addEventListener('stajimvar:profil-menusu', ac);
    return () => window.removeEventListener('stajimvar:profil-menusu', ac);
  }, []);
  const menudenGit = (eylem?: () => void) => () => {
    setMenuAcik(false);
    eylem?.();
  };
  const ikon = 'h-6 w-6';
  const sosyalOgeler = satir ? profilAyarOgeleri(satir.menu) : [];
  const ayarBolumleri: AyarBolumu[] = [
    {
      baslik: 'Hesabın',
      ogeler: [
        {
          anahtar: 'profil-durumu',
          etiket: eksikler.length === 0 ? 'Profilin tamamlandı' : `Profilin %${oran} tamamlandı`,
          ikon: <Check className={ikon} strokeWidth={1.75} />,
          sag: eksikler.length > 0 ? `${eksikler.length} adım` : undefined,
          onClick: menudenGit(onDuzenle),
        },
        ...(onCv
          ? [{ anahtar: 'cv', etiket: "CV'ni görüntüle", ikon: <FileText className={ikon} strokeWidth={1.75} />, onClick: menudenGit(onCv) }]
          : []),
        ...sosyalOgeler.map((o) => ({
          anahtar: `sosyal-${o.anahtar}`,
          etiket: o.anahtar === 'kaydedilenler' ? 'Kaydedilen paylaşımlar' : o.etiket,
          ikon: o.ikon,
          pasif: o.pasif,
          onClick: menudenGit(o.calistir),
        })),
      ],
    },
    {
      baslik: "StajımVar'ı nasıl kullanıyorsun?",
      ogeler: [
        {
          anahtar: 'kaydedilen-ilanlar',
          etiket: 'Kaydedilen ilanlar',
          ikon: <Bookmark className={ikon} strokeWidth={1.75} />,
          sag: kaydedilenSayisi,
          onClick: menudenGit(onKaydedilenlere),
          pasif: !onKaydedilenlere,
        },
        {
          anahtar: 'basvurular',
          etiket: 'Başvurular',
          ikon: <FileText className={ikon} strokeWidth={1.75} />,
          sag: basvuruSayisi,
          onClick: menudenGit(onBasvurulara),
          pasif: !onBasvurulara,
        },
        {
          anahtar: 'testler',
          etiket: 'Yetkinlik testleri',
          ikon: <Award className={ikon} strokeWidth={1.75} />,
          sag: rozetSayisi > 0 ? `${rozetSayisi} rozet` : undefined,
          onClick: menudenGit(onTestlere),
        },
      ],
    },
    ...(onYonetim
      ? [{ baslik: 'Yönetim', ogeler: [{ anahtar: 'yonetim', etiket: 'Yönetim paneli', ikon: <Settings className={ikon} strokeWidth={1.75} />, onClick: menudenGit(onYonetim) }] }]
      : []),
    ...(onCikis
      ? [{ ogeler: [{ anahtar: 'cikis', etiket: 'Çıkış yap', ikon: <LogOut className={ikon} strokeWidth={1.75} />, onClick: menudenGit(onCikis), tehlike: true }] }]
      : []),
  ];

  return (
    /*
      KİMLİK KARTI X WEB PROFİLİNİN KALIBINDA (kullanıcı kararı, 24 Eylül
      2026: "stajımvar web profili x in profille girince olan web
      arayuzune uyarla")

      Üç profil ekranı aynı kalıbı paylaşıyor (20 Eylül kararı); kalıbın
      referansı şirket profiliydi, artık X. Sıra ve gerekçeler
      `ProfilKimlikKalibi` başlığında: kapak → avatar + sağda hap sırası
      → ad, @ad → biyografi → meta satırı → satır içi sayaçlar. Her şey
      kartın sol dolgusundan başlıyor; `mx-auto max-w-2xl` ortalaması
      kalktı, yalnız biyografi paragrafı okunabilirlik için sınırlı.

      DİŞLİ HAP SIRASINDA: "Ayarlar ve hareketler" kartın sağ üstünde
      `absolute` duruyordu ve kapağın üstüne düşüyordu; X'teki "…" gibi
      artık hap sırasında yuvarlak bir ikon düğmesi. Yalnız `lg`de
      görünüyor — telefonda ve tablette aynı menüyü üst çubuktaki ☰ açıyor
      (Header `stajimvar:profil-menusu` olayı, yukarıdaki effect).

      KARTTAN KALKANLAR, KAYBOLMADI: staj tercihi ve eksik adımlar
      "Profili düzenle" ekranında; tamamlanma yüzdesi ayar menüsünün ilk
      satırında ve fotoğraf halkasında.

      Her değer çağıranın verdiği GERÇEK veriden; veri yoksa öğe
      çizilmiyor.
    */
    <Card mobilYuzey className={className}>
      <ProfilAyarlarSayfasi acik={menuAcik} onKapat={menuKapat} bolumler={ayarBolumleri} />

      {/*
        KAPAK BANDI — kartın en üstünde, 3:1 (lg'de 5:1; oran kararı
        `KapakFotografi` içinde). Telefonda kart `-mx-4` ile kenardan
        kenara; `sm:` üstünde kartın köşesi 20, kenarı 1 piksel, bandın üst
        köşesi 19. Kartın kendisine `overflow-hidden` verilmedi: ayar
        sayfası ve fotoğraf görüntüleyici kartın içinden açılıyor.
      */}
      <KapakFotografi ad={adYazimi(ad)} yol={kapakYolu} kip="bant" className="w-full sm:rounded-t-[19px]" />

      {/* ------------------------------------------- kimlik bandı */}
      <div className={KIMLIK_BANDI}>
        <div className={AVATAR_SATIRI}>
          {/*
            FOTOĞRAF KAPAĞA YARI YARIYA BİNİYOR. Doluluk halkası daireye
            2×6 piksel ekliyor (92 / 124 / 156), bu yüzden ortak
            `AVATAR_BINMESI` (40 / 56 / 72) değil, halkalı dairenin yarısı:
            46 / 62 / 78. İçteki `relative` kap okul rozetinin konum kabı
            (rozet testinde kilitli) ve kapağın ÜSTÜNDE çizilmeyi de o
            sağlıyor (konumlu öğe, konumsuz kapak görselinin üstüne
            boyanıyor). `ring-4 ring-white` fotoğrafı kapaktan ayırıyor.

            HALKA ŞİRKETTE YOK, BURADA KALIYOR: profilin tamamlanma
            oranını anlatan tek görsel gösterge. "Şirkette olmayanı sil"
            değil, "olmayanı UYDURMA" kuralı geçerli.

            OKUL ROZETİ — okulunu girenlerde, fotoğrafın sağ alt köşesinde.
            Amblemi olan okullarda üniversitenin KENDİ logosu
            (`public/universite-logolari`); listede olmayan okulda
            kısaltma. Okul girilmemişse rozet hiç çizilmiyor. Köşe konumu:
            80 piksellik fotoğrafta köşe zaten 45 dereceye denk düşüyor;
            112 ve 144'te rozet birkaç piksel içeri alınıyor.
          */}
          <div className="shrink-0 self-start -mt-[46px] sm:-mt-[62px] lg:-mt-[78px]">
          <div className="relative">
          <Halka oran={oran} className="ring-4 ring-white">
            {/*
              BÜYÜTME (kullanıcı isteği, 17 Eylül 2026): fotoğrafa dokununca
              tam ekran açılıyor. Kopyalanacak adres yalnız profil
              YAYINDAYKEN; fotoğraf yoksa (baş harf) düğme çizilmiyor.
            */}
            <ProfilFotografi
              ad={ad}
              yol={sosyalAvatarYolu}
              yedekAdres={avatarUrl}
              className="h-20 w-20 rounded-full text-2xl sm:h-28 sm:w-28 sm:text-3xl lg:h-36 lg:w-36 lg:text-4xl"
              buyutme={{
                onPaylas: satir?.menu.onPaylas,
                kullaniciAdi: satir?.menu.yayindaMi ? satir.kullaniciAdi : null,
                onFotografDegistir,
              }}
            />
          </Halka>
            {okul && (
              <span className="absolute bottom-0 right-0 sm:bottom-0.5 sm:right-0.5 lg:bottom-1.5 lg:right-1.5">
                <OkulRozeti okul={okul} logoAdresi={universiteLogosu(okul) ?? undefined} />
              </span>
            )}
          </div>
          </div>

          {/*
            HAP SIRASI — X'teki "Edit profile" yeri: avatar satırının sağı,
            alt hiza. Sıra: ⚙ (yalnız lg) → CV'ni görüntüle → Profili
            düzenle; düzenleme X'teki gibi en sağda.

            "CV'NI GÖRÜNTÜLE" TELEFONDA YALNIZ İKON. Ölçüldü (Chromium,
            yerleşim genişliği 360): halkalı avatarın (92) yanında 224
            piksel kalıyor; metinli iki hap 157.7 + 128.7 + 6 = 292.4
            piksel tutuyor. İkon hâli 48 piksel, sıra 182.7 piksel ve tek
            satır. Metin `sr-only` ile erişilebilir adda kalıyor, `sm:`
            üstünde görünür.

            "FOTOĞRAF PAYLAŞ" BURAYA KONMADI: `/cv`de o giriş zaten VAR —
            üst çubuktaki paylaşım simgesi ve ızgaranın başlık satırı. 17
            Eylül 2026 kararı, testle kilitli (`sosyal-profil-arayuzu`:
            kartta "Paylaş" yok).
          */}
          <div className={HAP_SIRASI}>
            {/*
              GİZLEME SARMALAYICIDA, DÜĞMEDE DEĞİL: `IKON_HAP` `inline-flex`
              taşıyor; aynı dizeye `hidden` eklemek, hangisinin kazanacağını
              üretilen CSS'in sırasına bırakıyordu. Ölçüldü (Chromium, 375
              piksel): `inline-flex` kazandı ve dişli telefonda göründü.
            */}
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={() => setMenuAcik(true)}
                aria-label="Ayarlar ve hareketler"
                aria-haspopup="dialog"
                className={IKON_HAP}
              >
                <Settings aria-hidden className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            {onCv && (
              <button type="button" onClick={onCv} aria-label="CV'ni görüntüle" className={HAP_BIRINCIL}>
                <FileText aria-hidden className="h-4 w-4 shrink-0" />
                <span className="sr-only sm:not-sr-only">CV'ni görüntüle</span>
              </button>
            )}
            <button type="button" onClick={onDuzenle} className={HAP}>
              Profili düzenle
            </button>
          </div>
        </div>

        {/*
          ROZET YOK — UYDURULMADI: bu kart `resmi_mi`yi görmüyor (panel
          satırı taşımıyor); olmayan veriyle tik çizilmiyor.
        */}
        <h1 className="mt-3 min-w-0 max-w-full break-words text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
          {adYazimi(ad)}
        </h1>

        {/*
          KULLANICI ADI İSKELETİ GERÇEK SATIRLA AYNI KUTUDA: `mt-0.5` + 20
          piksel (sm üstünde 24); satır gelince altı kaymıyor.
        */}
        {portfolyo && portfolyo.satir === undefined && (
          <Skeleton className="mt-0.5 h-5 w-32 sm:h-6" />
        )}
        {satir?.kullaniciAdi && (
          <a
            href={profilYolu(satir.kullaniciAdi)}
            onClick={(olay) => {
              if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
                return;
              olay.preventDefault();
              satir.onNavigate(profilYolu(satir.kullaniciAdi as string));
            }}
            className={`mt-0.5 block min-w-0 max-w-full truncate text-sm text-gray-600 hover:underline sm:text-base ${ODAK_HALKASI}`}
          >
            <span className="select-none">@</span>
            {satir.kullaniciAdi}
          </a>
        )}

        {/*
          BİYOGRAFİ — X sırası: ad bloğunun altında, meta satırının üstünde.
          Kısaltma yok (tam metne giden başka yol yok); `whitespace-pre-line`
          satır sonlarını, `break-words` uzun bağlantıları koruyor. Tek
          genişlik sınırı burada (`BIYOGRAFI` içinde `max-w-2xl`).
        */}
        {satir?.biyografi && <p className={BIYOGRAFI}>{satir.biyografi}</p>}

        {/*
          META SATIRI — okul, bölüm · sınıf, konum, katılma; ikonlu, sarıyor.

          "OKULUN EKSİK" YER TUTUCUSU KALKTI: satır okul girilmemişken
          eksik alanın adını yazıyordu. X kalıbında meta satırı yalnız VAR
          olanı gösteriyor ve eksik adım zaten iki yerde anlatılıyor: ayar
          menüsünün ilk satırı ("Profilin %N tamamlandı · N adım") ve
          fotoğrafın doluluk halkası. Üçüncü kez, üstelik bir bilgi
          satırının içinde söylemek gereksizdi.

          Katılma: satır okunmadıysa aynı yerde iskelet, okunamadıysa HİÇ.
        */}
        {(okul || bolum || sinif || konum || katilma || (portfolyo && portfolyo.satir === undefined)) && (
          <div className={META_SATIRI}>
            {okul && <MetaOgesi ikon={GraduationCap} etiket="Okul">{okul}</MetaOgesi>}
            {(bolum || sinif) && (
              <MetaOgesi ikon={BookOpen} etiket="Bölüm">
                {[bolum, sinif].filter(Boolean).join(' · ')}
              </MetaOgesi>
            )}
            {konum && <MetaOgesi ikon={MapPin} etiket="Konum">{konum}</MetaOgesi>}
            {portfolyo && portfolyo.satir === undefined && <Skeleton className="h-5 w-36" />}
            {katilma && <MetaOgesi ikon={CalendarDays} etiket="Katılma">{katilma}</MetaOgesi>}
          </div>
        )}

        {/*
          SAYAÇ SATIRI — tek satır, satır içi: "6 paylaşım  3 bağlantı
          1 takip", sayı kalın. Sayılar `sosyal_sayaclar`ın tek satırından;
          "bağlantı" ve "takip" gerçek `<a href>` (orta tuş, yeni sekme).
          "paylaşım" düz metin: paylaşımlar bu ekranın kendi alt bölümünde,
          ayrı bir adresleri yok.

          DÖRT HÂL: panel yoksa satır hiç yok; yüklenirken satır içi
          iskelet; alınamadıysa cümle (sıfır ya da tire UYDURULMUYOR);
          hazırsa üç sayı. DÖRDÜNCÜ SAYAÇ YOK: `takipci` öğrencide hep
          sıfır olurdu (hedef hep şirket).
        */}
        {sosyalHucre !== 'yok' && (
          <div className={SAYAC_SATIRI} aria-busy={sosyalHucre === 'yukleniyor' || undefined}>
            {sosyalHucre === 'yukleniyor' && (
              <>
                <SayacIskeleti />
                <SayacIskeleti />
                <SayacIskeleti />
              </>
            )}
            {sosyalHucre === 'hazir' && satir?.sayaclar && (
              <>
                <Sayac deger={satir.sayaclar.paylasim} etiket="paylaşım" />
                <Sayac
                  deger={satir.sayaclar.baglanti}
                  etiket="bağlantı"
                  href="/baglantilar"
                  onNavigate={satir.onNavigate}
                />
                <Sayac
                  deger={satir.sayaclar.takip}
                  etiket="takip"
                  href="/takip"
                  onNavigate={satir.onNavigate}
                />
              </>
            )}
            {sosyalHucre === 'alinamadi' && (
              <p className={`${SAYAC_OGESI} ${SAYAC_ETIKETI}`}>Paylaşım, bağlantı ve takip sayısı alınamadı</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

/*
  KARTIN SAYACI — satır içi: kalın sayı + gri etiket (X kalıbı).

  Bağlantı gerçek `<a>`: orta tuş ve yeni sekme çalışıyor, sol tık
  uygulama içi gezinme. Kutu `SAYAC_OGESI` (`min-h-11`): bağlantılı
  sayacın dokunma hedefi 44 piksel, bağlantısız olan da aynı yükseklikte.
*/
const Sayac: React.FC<{
  deger: number;
  etiket: string;
  href?: string;
  onNavigate?: (yol: string) => void;
}> = ({ deger, etiket, href, onNavigate }) => {
  const icerik = (
    <>
      <span className={SAYAC_SAYISI}>{deger}</span>
      <span className={SAYAC_ETIKETI}>{etiket}</span>
    </>
  );
  if (!href) return <span className={SAYAC_OGESI}>{icerik}</span>;
  return (
    <a
      href={href}
      onClick={(olay) => {
        if (!onNavigate) return;
        if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
        olay.preventDefault();
        onNavigate(href);
      }}
      className={`${SAYAC_OGESI} hover:underline ${ODAK_HALKASI}`}
    >
      {icerik}
    </a>
  );
};
