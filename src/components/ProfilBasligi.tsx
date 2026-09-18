import React from 'react';
import { Award, Bookmark, Check, FileText, LogOut, MapPin, Pencil, Settings } from 'lucide-react';
import { adYazimi } from '../lib/ad';
import { ProfilFotografi } from './sosyal/ProfilFotografi';
import { profilAyarOgeleri } from './sosyal/ProfilAyarMenusu';
import { ProfilAyarlarSayfasi, type AyarBolumu } from './ProfilAyarlarSayfasi';
import type { PortfolyoSatiri } from './sosyal/SosyalProfilSayfasi';
import { profilYolu } from '../lib/sosyal-kullanici-adi.mjs';
import { ODAK_HALKASI } from '../lib/renk-token';
import { Button, Card, ProfileSectionGroup, ProfileSectionRow, Skeleton } from '../ui';

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

/** Doluluk halkası. Konik degrade ile çiziliyor; ek bir kütüphane yok. */
const Halka: React.FC<{ oran: number; children: React.ReactNode }> = ({ oran, children }) => {
  const renk = oran === 100 ? '#10b981' : '#2563eb';
  return (
    <div
      className="rounded-full p-[3px] shrink-0"
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
 * Sosyal hücrenin iskeleti: `StatItem` ölçüsünde (sayı satırı + etiket
 * satırı) ki satır gelince şerit zıplamasın.
 */
const SayacIskeleti: React.FC = () => (
  <span aria-hidden className="block min-w-0 py-0.5">
    <Skeleton className="mx-auto h-6 w-8" />
    <Skeleton className="mx-auto mt-1.5 h-3 w-12" />
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
      YATAY PROFİL KARTI (17 Eylül 2026 tasarımı)

      Kart artık sayfanın üstünde TAM GENİŞLİKTE: solda fotoğraf, yanında
      ad, kullanıcı adı, okul, bölüm · sınıf ve il; sağda ince bir çizgiyle
      ayrılmış iki sayaç ve altlarında iki düğme. Dişli (ayarlar ve
      hareketler) kartın sağ üstünde.

      KARTTAN KALKANLAR, KAYBOLMADI:
        - Staj tercihi satırı ve eksik adım kutusu: tercihler ve eksik
          bölümler "Profili düzenle" ekranında; tamamlanma yüzdesi ayar
          menüsünün ilk satırında ve fotoğraf halkasında duruyor.
        - Üçüncü sayaç yok: yalnız Paylaşım ve Bağlantı. Takipçi ya da
          başka bir sayı uydurulmuyor.

      Her değer çağıranın verdiği GERÇEK veriden: ad, okul, bölüm, sınıf ve
      il `student_profiles`tan; kullanıcı adı ve sayılar sosyal panelin
      satırından (`portfolyo.satir`). Veri yoksa satır çizilmiyor.

      TELEFONDA alt alta: fotoğraf ve kimlik bir satırda, sayaçlar ve
      düğmeler altında tam genişlikte. Dişli telefonda üst çubukta
      (Header `stajimvar:profil-menusu`).
    */
    <Card mobilYuzey className={`relative px-4 py-5 sm:p-6 lg:px-8 lg:py-7 ${className}`}>
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

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
        {/* ---------------- Fotoğraf ve kimlik ---------------- */}
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
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

          <div className="min-w-0 flex-1">
            {/* `break-words`: uzun ad kırpılmıyor, sarılıyor. */}
            <h1 className="min-w-0 break-words text-xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-2xl lg:text-[28px]">
              {adYazimi(ad)}
            </h1>

            {portfolyo && portfolyo.satir === undefined && <Skeleton className="mt-1.5 h-4 w-32" />}
            {satir?.kullaniciAdi && (
              <a
                href={profilYolu(satir.kullaniciAdi)}
                onClick={(olay) => {
                  if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
                    return;
                  olay.preventDefault();
                  satir.onNavigate(profilYolu(satir.kullaniciAdi as string));
                }}
                className={`mt-0.5 block min-w-0 truncate text-sm text-gray-600 hover:underline sm:text-base ${ODAK_HALKASI}`}
              >
                <span className="select-none">@</span>
                {satir.kullaniciAdi}
              </a>
            )}

            <div className="mt-1.5 space-y-0.5 text-sm leading-snug text-gray-500 sm:mt-2 sm:text-base">
              <p className="min-w-0 break-words">{okul || 'Okulun eksik'}</p>
              {(bolum || sinif) && (
                <p className="min-w-0 break-words">{[bolum, sinif].filter(Boolean).join(' · ')}</p>
              )}
            </div>

            {konum && (
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-gray-700 sm:mt-2.5">
                <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="sr-only">Konum: </span>
                <span className="min-w-0 truncate">{konum}</span>
              </p>
            )}
          </div>
        </div>

        {/* ---------------- Sayaçlar ve eylemler ---------------- */}
        <div className="space-y-4 lg:w-[440px] lg:shrink-0 lg:self-stretch lg:border-l lg:border-gray-200 lg:pl-8 lg:flex lg:flex-col lg:justify-center">
          {/*
            ÜÇ SAYAÇ, ARADA ÇİZGİ YOK (karar: 18 Eylül 2026). "takip"
            öğrencinin takip ettiği şirket sayısı (`sosyal_sayaclar.takip`);
            aynı RPC satırından geliyor, ikinci bir çağrı yok. Üçüncü hücre
            gelince iki dikey ayraç şeridi parçalıyordu; şirket sayfasının
            sayaç şeridiyle aynı kural: eşit sütunlar, ayraç yok. Sayaç
            bağlantı DEĞİL: takip edilen şirketlerin listesi Ağım'da ve
            bu sayıya basınca gidilecek ayrı bir liste ekranı yok.
          */}
          <div
            className="grid grid-cols-3 border-y border-gray-100 py-2 lg:border-y-0 lg:py-0"
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
                <Sayac deger={satir.sayaclar.takip} etiket="takip" />
              </>
            )}
            {sosyalHucre === 'alinamadi' && (
              /* Sıfır ya da tire yazılmıyor: "sunucu vermedi" gerçek sıfır gibi okunurdu. */
              <p className="col-span-3 self-center px-1 text-center text-xs leading-tight text-gray-600">
                Paylaşım, bağlantı ve takip sayısı alınamadı
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {onCv ? (
              <Button onClick={onCv} tamGenislik>
                CV'ni görüntüle
              </Button>
            ) : (
              <span aria-hidden />
            )}
            <Button
              tur="secondary"
              onClick={onDuzenle}
              tamGenislik
              ikon={<Pencil aria-hidden className="h-4 w-4 shrink-0" />}
            >
              Profili düzenle
            </Button>
          </div>
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
      <span className="block text-2xl font-extrabold leading-tight tabular-nums text-gray-900 sm:text-[28px]">
        {deger}
      </span>
      <span className="mt-0.5 block text-sm leading-tight text-gray-600">{etiket}</span>
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
