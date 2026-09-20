import React from 'react';
import { Award, Bookmark, Check, FileText, LogOut, MapPin, Pencil, Settings } from 'lucide-react';
import { adYazimi } from '../lib/ad';
import { ProfilFotografi } from './sosyal/ProfilFotografi';
import { profilAyarOgeleri } from './sosyal/ProfilAyarMenusu';
import { ProfilAyarlarSayfasi, type AyarBolumu } from './ProfilAyarlarSayfasi';
import type { PortfolyoSatiri } from './sosyal/SosyalProfilSayfasi';
import { profilYolu } from '../lib/sosyal-kullanici-adi.mjs';
import { ODAK_HALKASI, RENK_GECISI, RENK_PRIMARY } from '../lib/renk-token';
import { Card, ProfileSectionGroup, ProfileSectionRow, Skeleton } from '../ui';

/*
  DÜĞME KALIBI ŞİRKET PROFİLİNDEN (kullanıcı kararı, 20 Eylül 2026:
  "tüm profil görüntüleri şirket gibi olsun").

  Dizeler `src/sirket/SirketProfilGorunumu.tsx` ve
  `src/components/sosyal/SosyalProfilGorunumu.tsx` ile BİREBİR aynı;
  `tests/sosyal-profil-arayuzu` üçünü karşılaştırıyor, biri ayrışırsa
  test düşüyor.

  NEDEN `Button` (src/ui) DEĞİL: ortak düğme ikincil türde
  `border-gray-200` kullanıyor, şirket kalıbı `border-gray-300`; ayrıca
  etiketi `truncate` ile kesiyor, kalıptaki düğmeler ise metni sarıyor.
  İki fark da "birebir aynı" olma şartını bozuyordu. Ortak bileşen
  DEĞİŞTİRİLMEDİ: onu başka ekranlar kendi ölçüsünde kullanıyor.

  Üç kopya tek yere (renk-token) taşınmadı çünkü kaynak dosya şirket
  profili ve bu işte ona dokunulmuyor; birleştirme ayrı bir adım.
*/
const BIRINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${RENK_PRIMARY.zemin} ${RENK_PRIMARY.zeminHover} ${RENK_PRIMARY.yazi} ${RENK_GECISI} ${ODAK_HALKASI}`;
const IKINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-900 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

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
 * Sosyal hücrenin iskeleti: sayı satırı + etiket satırı.
 *
 * ÖLÇÜLER GERÇEK HÜCREYLE BİREBİR OLMAK ZORUNDA — sayı gelince satır
 * zıplamamalı. Değerler 20 Eylül 2026'da yeniden ölçüldü çünkü hücrenin
 * tipografisi şirket profilininkiyle eşitlendi ve `lg` basamağı kalktı:
 * sayı `text-2xl leading-tight` → satır kutusu 30 piksel, etiket
 * `text-sm` → 20 piksel, aralarında `mt-0.5` (2) ve kapta `py-1` (8).
 * Toplam 60 piksel — şirket ve ziyaretçi profilindeki hücreyle aynı
 * sayı (üçü de Chromium'da ölçüldü).
 *
 * ETİKETTEN `leading-tight` KALDIRILDI: onunla hücre 58 piksel
 * oluyordu, öteki iki ekranda 60. Aynı kalıbın üç ekranda 2 piksel
 * farkla çizilmesi, kullanıcı ekranlar arasında geçerken satırın
 * oynaması demekti.
 *
 * İSKELET İLE DOLU HÜCRE AYNI KUTUDA: ölçüldü (375/390/1440), sayılar
 * gelince düğme satırı 0 piksel kayıyor.
 */
const SayacIskeleti: React.FC = () => (
  <span aria-hidden className="block min-w-0 py-1">
    <Skeleton className="mx-auto h-[30px] w-10" />
    <Skeleton className="mx-auto mt-0.5 h-5 w-16" />
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
      KİMLİK KARTI ŞİRKET PROFİLİNİN KALIBINDA (kullanıcı kararı,
      20 Eylül 2026: "tüm profil görüntüleri şirket gibi olsun, onu
      beğendim daha özgün")

      Üç profil ekranı artık aynı sırayı kuruyor — şirket
      (`SirketProfilGorunumu`), ziyaretçiye görünen öğrenci profili
      (`SosyalProfilGorunumu`) ve burası, sahibin kendi `/cv` ekranı:

        ortalanmış kimlik bandı (daire → ad → @ad → kimlik satırları)
        ince ayırıcı
        sayaç satırı (üç eşit sütun)
        eylem satırı

      ÖNCEKİ DÜZEN VE NEDEN KALKTI: telefonda "fotoğraf | üç sayaç" ilk
      satırı, altında kimlik, altında düğmeler (19 Eylül 2026 Instagram
      sırası); lg'de solda kimlik, sağda `lg:w-[440px]` ayrı bir sütunda
      sayaç+düğme ve aralarında `lg:border-l`. Şirket ekranında ne o
      ızgara ne o sütun vardı: aynı kişi kendi şirket sayfasıyla kendi
      `/cv`si arasında geçerken sayaçların ve düğmelerin yeri
      değişiyordu.

      BİR ERİŞİLEBİLİRLİK BORCU DA KAPANDI: eski ızgarada sekme sırası
      göz sırasıyla uyuşmuyordu (390'da ölçülmüştü: @kullanıcıadı y=216 →
      sayaçlar y=102 → düğmeler y=299, yani odak bir kez yukarı
      sıçrıyordu). Tek sütunda DOM sırası ile görsel sıra aynı; sıçrama
      kalmadı.

      KARTTAN KALKANLAR, KAYBOLMADI:
        - Staj tercihi satırı ve eksik adım kutusu: tercihler ve eksik
          bölümler "Profili düzenle" ekranında; tamamlanma yüzdesi ayar
          menüsünün ilk satırında ve fotoğraf halkasında duruyor.

      Her değer çağıranın verdiği GERÇEK veriden: ad, okul, bölüm, sınıf ve
      il `student_profiles`tan; kullanıcı adı ve sayılar sosyal panelin
      satırından (`portfolyo.satir`). Veri yoksa satır çizilmiyor.

      YAN BOŞLUK KARTIN KENDİSİNDE DEĞİL, İÇİNDEKİ İKİ BLOKTA — şirketteki
      ve ziyaretçi profilindeki kalıbın aynısı. Kartın kendi dolgusu
      (`px-4 py-5 sm:p-6 lg:px-8 lg:py-7`) bu yüzden kalktı: ayırıcı
      çizginin iki blok arasında, kenardan kenara değil, dolgunun içinde
      durması gerekiyor.

      DİŞLİ YERİNDE: "Ayarlar ve hareketler" kartın sağ üstünde
      (`absolute`), telefonda üst çubukta. Şirket kalıbında böyle bir
      düğme yok ama bu `/cv`nin kendi yeteneği — şirkette yok diye
      silinmiyor.
    */
    <Card mobilYuzey className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setMenuAcik(true)}
        aria-label="Ayarlar ve hareketler"
        aria-haspopup="dialog"
        className={`absolute right-3 top-3 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 lg:inline-flex ${ODAK_HALKASI}`}
      >
        <Settings aria-hidden className="h-6 w-6" strokeWidth={1.75} />
      </button>

      <ProfilAyarlarSayfasi acik={menuAcik} onKapat={menuKapat} bolumler={ayarBolumleri} />

      {/* ------------------------------------------- kimlik bandı */}
      <div className="px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
        {/*
          Ortalanmış sütun `max-w-2xl` ile sınırlı — şirketteki ve
          ziyaretçi profilindeki ölçünün aynısı. Sınır olmasaydı okul
          adı gibi uzun satırlar 1440'ta bandın bir ucundan ötekine
          uzanır ve ortalı metinde okunmazdı.
        */}
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          {/*
            HALKA ŞİRKETTE YOK, BURADA KALIYOR: profilin tamamlanma
            oranını anlatan tek görsel gösterge bu (yüzde sayısı karttan
            kalkmıştı). Şirkette karşılığı olmaması onu silmek için
            sebep değil — "şirkette olmayanı sil" değil, "şirkette
            olmayanı UYDURMA" kuralı geçerli.
          */}
          <Halka oran={oran}>
            {/*
              BÜYÜTME (kullanıcı isteği, 17 Eylül 2026): fotoğrafa dokununca
              Instagram gibi tam ekran açılıyor. Paylaş eylemi sosyal
              panelin satırındaki var olan `onPaylas`; kopyalanacak adres
              yalnız profil YAYINDAYKEN veriliyor (yayında değilse
              paylaşılacak adres yok, düğme de yok). Fotoğraf yoksa
              (baş harf) `ProfilFotografi` düğme çizmiyor.
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

          {/*
            ROZET YOK — UYDURULMADI: şirket kalıbında adın yanında
            "Şirket hesabı" rozeti var. Öğrencinin karşılığı doğrulanmış
            hesap tiki (`ResmiTik`) olurdu ama bu kart `resmi_mi`yi
            GÖRMÜYOR: panel satırı (`PortfolyoSatiri`) o alanı taşımıyor.
            Olmayan veriyle rozet çizmek yerine rozet çizilmiyor.

            `mt-3`: şirketteki daire-ad boşluğunun aynısı.
          */}
          <h1 className="mt-3 min-w-0 max-w-full break-words text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl">
            {adYazimi(ad)}
          </h1>

          {/*
            KULLANICI ADI İSKELETİ GERÇEK SATIRLA AYNI KUTUDA

            Ölçüldü (Chromium, 20 Eylül 2026): gerçek satır `mt-0.5` +
            20 piksel (sm üstünde 24), iskelet ise `mt-1.5` + 16 piksel.
            Telefonda ikisi de 22 piksel tutuyordu ama 1440'ta iskelet 22,
            gerçeği 26 piksel — satır gelince altındaki her şey 4 piksel
            aşağı kayıyordu. İskelet artık aynı kutuyu çiziyor.
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
            KİMLİK SATIRLARI: şirkette sektör ve konum, burada okul ve
            bölüm · sınıf. Aynı yer, aynı punto, içerik öğrencinin kendi
            gerçeği. "Okulun eksik" bir yer tutucu değil, eksik alanın
            adı — girilmemiş bir okulu uydurmak yerine eksik olduğunu
            söylüyor.
          */}
          <div className="mt-1.5 max-w-full space-y-0.5 text-sm leading-snug text-gray-500 sm:mt-2 sm:text-base">
            <p className="min-w-0 break-words">{okul || 'Okulun eksik'}</p>
            {(bolum || sinif) && (
              <p className="min-w-0 break-words">{[bolum, sinif].filter(Boolean).join(' · ')}</p>
            )}
          </div>

          {konum && (
            /* İkon tek başına bilgi taşımıyor: `aria-hidden` + `sr-only` etiket. */
            <p className="mt-1.5 flex max-w-full min-w-0 items-center justify-center gap-1.5 text-sm text-gray-700 sm:mt-2.5">
              <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-500" />
              <span className="sr-only">Konum: </span>
              <span className="min-w-0 truncate">{konum}</span>
            </p>
          )}
        </div>
      </div>

      {/*
        BANDIN ALTI: SAYAÇLAR VE EYLEMLER — şirketteki ayrımın aynısı.
        Kimlik bandı kendi bloğunda, sayaç ve düğmeler ayrı bir blokta,
        aralarında ince bir çizgi. Üst boşluğu bandın `pb`si veriyor.
      */}
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">

        {/*
          ÜÇ SAYAÇ, ARADA ÇİZGİ YOK (karar: 18 Eylül 2026). "takip"
          öğrencinin takip ettiği şirket sayısı (`sosyal_sayaclar.takip`);
          aynı RPC satırından geliyor, ikinci bir çağrı yok. Üçüncü hücre
          gelince iki dikey ayraç şeridi parçalıyordu; şirket sayfasının
          sayaç şeridiyle aynı kural: eşit sütunlar, ayraç yok.

          "TAKİP" ARTIK BİR BAĞLANTI (19 Eylül 2026). Eskiden düz bir
          `<span>`di ve o doğruydu: gidilecek liste ekranı yoktu,
          liste yalnız Ağım'ın içinde bir bölümdü. Kullanıcı sayıya
          basıp hiçbir şey olmadığını bildirdi; liste artık kendi
          adresinde (/takip, `TakipEttiklerimSayfasi`) ve sayaç
          "bağlantı" ile BİREBİR aynı `Sayac` yolundan geçiyor —
          gerçek `<a href>`, orta tuş ve yeni sekme çalışıyor.
          "paylaşım" düz `<span>` kalıyor: paylaşımlar bu ekranın
          kendi alt bölümünde, ayrı bir adresleri yok.

          ŞERİDİN YERİ VE ÇİZGİSİ DEĞİŞTİ (20 Eylül 2026): şerit
          fotoğrafın yanındaki dar sütundan çıkıp tam genişliğe, kimlik
          bandının altına indi. Ayırıcı da şirketteki dizenin aynısı:
          `border-t border-gray-100 pt-3`. Çizgi ÜÇ DURUMDA da aynı
          yerde (iskelet / sayılar / alınamadı), yani sayı gelince satır
          zıplamıyor.

          DÖRDÜNCÜ SAYAÇ UYDURULMADI: şirkette "aktif ilan" var,
          öğrencide ilan kavramı yok; `sosyal_sayaclar.takipci` de
          öğrenci satırında hep sıfır olurdu (hedef hep şirket).
        */}
        <div
          className="grid min-w-0 grid-cols-3 border-t border-gray-100 pt-3"
          aria-busy={sosyalHucre === 'yukleniyor' || undefined}
        >
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
            /* Sıfır ya da tire yazılmıyor: "sunucu vermedi" gerçek sıfır gibi okunurdu. */
            <p className="col-span-3 self-center px-1 text-center text-sm leading-tight text-gray-600">
              Paylaşım, bağlantı ve takip sayısı alınamadı
            </p>
          )}
        </div>

        {/*
          EYLEM SATIRI — ŞİRKETTEKİ IZGARANIN AYNISI

          Kap sınıfları şirketle ve ziyaretçi profiliyle BİREBİR:
          telefonda `grid grid-cols-2 gap-3`, `sm:` üstünde `flex
          flex-wrap justify-center`.

          İKİSİ DE `col-span-2`: şirkette iki BİRİNCİL eylem ilk satırı
          paylaşıyor, üçüncüsü tam satır kaplıyor. Burada birincil eylem
          tek ("CV'ni görüntüle"); yarım hücrede bırakılsaydı yanında
          boş bir hücre kalırdı. Telefonda ikisi alt alta tam
          genişlikte, `sm:` üstünde satır flex olduğu için `col-span`
          etkisiz ve ikisi yan yana ortada.

          "CV'Nİ GÖRÜNTÜLE" YOKSA HÜCRE DE YOK: eskiden yerine
          `<span aria-hidden />` konuyordu çünkü iki sütunlu ızgarada
          "Profili düzenle" sağ hücreye kayardı. Tam genişlikte
          düğmelerde böyle bir hizalama sorunu yok; boş bir düğüm
          çizmemek daha dürüst.

          "FOTOĞRAF PAYLAŞ" BURAYA KONMADI: şirket kalıbında eylem
          satırında duruyor ama `/cv`de o giriş zaten VAR ve başka
          yerde — üst çubuktaki paylaşım simgesi ve ızgaranın başlık
          satırındaki düğme. Buraya üçüncü bir kopyasını koymak aynı işi
          yapan iki düğme demekti; o karar 17 Eylül 2026'da alınmış ve
          testle kilitlenmiş (`sosyal-profil-arayuzu`: kartta "Paylaş"
          yok).
        */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
          {onCv && (
            <button type="button" onClick={onCv} className={`${BIRINCIL} col-span-2 sm:min-w-52`}>
              CV'ni görüntüle
            </button>
          )}
          <button
            type="button"
            onClick={onDuzenle}
            className={`${IKINCIL} col-span-2 sm:min-w-52`}
          >
            <Pencil aria-hidden className="h-4 w-4 shrink-0" />
            Profili düzenle
          </button>
        </div>
      </div>
    </Card>
  );
};

/*
  KARTIN SAYACI

  `StatItem`in (src/ui) aynısı, yalnız daha büyük tipografide: bu kartta
  sayılar başlık ölçüsünde okunuyor. Ortak bileşen değiştirilmedi, çünkü
  başka ekranlar onu küçük ölçüde kullanıyor. Bağlantı gerçek `<a>`: orta
  tuş ve yeni sekme çalışıyor, sol tık uygulama içi gezinme.
*/
const Sayac: React.FC<{
  deger: number;
  etiket: string;
  href?: string;
  onNavigate?: (yol: string) => void;
}> = ({ deger, etiket, href, onNavigate }) => {
  const icerik = (
    <>
      {/*
        ÖLÇÜ TEK, ŞİRKET PROFİLİYLE AYNI (kullanıcı kararı, 20 Eylül
        2026: "tüm profil görüntüleri şirket gibi olsun").

        Önce iki kırılım vardı: telefonda `text-xl`, lg'de `text-[28px]`
        — çünkü şerit telefonda fotoğrafın yanındaki dar sütundaydı ve 28
        piksellik sayı üç hücreye sığmıyordu. Şerit artık tam genişlikte
        ve ortada (şirketteki gibi), dar sütun diye bir şey kalmadı;
        `text-2xl` üç kırılımda da sığıyor. Ölçüldü (Chromium): hücre
        genişliği 375'te 114, 390'da 119, 1440'ta 437 piksel.
      */}
      <span className="block text-2xl font-extrabold leading-tight tabular-nums text-gray-900">
        {deger}
      </span>
      <span className="mt-0.5 block text-sm text-gray-600">{etiket}</span>
    </>
  );
  if (!href) return <span className="block min-w-0 py-1 text-center">{icerik}</span>;
  return (
    <a
      href={href}
      onClick={(olay) => {
        if (!onNavigate) return;
        if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
        olay.preventDefault();
        onNavigate(href);
      }}
      className={`mx-2 block min-h-11 min-w-0 rounded-xl py-1 text-center transition-colors hover:bg-gray-50 ${ODAK_HALKASI}`}
    >
      {icerik}
    </a>
  );
};
