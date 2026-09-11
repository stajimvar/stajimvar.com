import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SayfaKabugu } from '../SayfaKabugu';
import { SAYFA_GENISLIGI } from '../../lib/duzen';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  SosyalHata,
  kendiSosyalProfiliGetir,
  paylasimlariGetir,
  profilFotografiKaldir,
  sosyalKullaniciAdiCoz,
  sosyalProfilGorunurluguAyarla,
  sosyalProfilKimligiGetir,
  sosyalProfiliGetir,
  sosyalProfilimiTamamla,
  sosyalSayaclariGetir,
  type SosyalPaylasim,
  type SosyalProfil,
  type SosyalSayaclar,
} from '../../lib/queries/sosyal';
import { profilFotografi } from '../../lib/profil-fotografi';
import { kullaniciAdiNormalize, profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';
import { BolumTalebi, type TalepKipi } from './BolumTalebi';
import { PaylasimIzgarasi } from './PaylasimIzgarasi';
import { PaylasimOlustur } from './PaylasimOlustur';
import type { ProfilAyarMenusuProps } from './ProfilAyarMenusu';
import { ProfilFotografi } from './ProfilFotografi';
import { ProfilFotografiYukleme } from './ProfilFotografiYukleme';
import { SahipListesi } from './SahipListesi';
import { SosyalProfilDuzenleme } from './SosyalProfilDuzenleme';
import { SosyalProfilGorunumu } from './SosyalProfilGorunumu';

/**
 * SOSYAL PROFİL ROTASI — VERİ YÜKLEME VE YETKİ
 *
 * Bu bileşen görünüm çizmiyor, DURUM belirliyor: kim bakıyor, veri geldi
 * mi, sahibi mi. Ziyaretçi sunumu `SosyalProfilGorunumu` içinde, sahibin
 * birleşik ekrandaki portfolyosu ise sade ızgara; sayaçları ve eylemleri
 * `PortfolyoSatiri` nesnesiyle çevreleyen ekranın sol sütununa gidiyor.
 * Sınır bilerek buradan geçiyor; yetki dalları tek dosyada.
 *
 * İKİ KİP, TEK DOSYA
 * ------------------
 * Ayrı adreste (`/profil`, `/profil/<kullaniciadi>`) sayfa; birleşik
 * ekranın (`/cv`) sağ sütununda panel. Ayrımı `gomulu` prop'u yapıyor ve
 * gerekçesi orada yazılı: ikinci bir kopya, sahibe özel dalların iki
 * yerde tutulması demek olurdu.
 *
 * ROTADAKİ KULLANICI ADINA GÜVENİLMİYOR
 * -------------------------------------
 * Sorgu `profile_id = auth.uid()` ile yapılıyor; adresteki ad yalnız
 * KARŞILAŞTIRMADA kullanılıyor. Kullanıcı adıyla sorgulasaydık, adres
 * çubuğuna başkasının adını yazan kişi "böyle bir profil var mı"
 * sorusunun cevabını sorgunun boş dönüp dönmemesinden okurdu.
 *
 * VAR/YOK AYRIMI SIZMIYOR
 * -----------------------
 * Başkasının adına gidildiğinde tek bir güvenli ekran çıkıyor ve bu ekran
 * hedefe göre HİÇ DEĞİŞMİYOR — var olmayan bir ad da, var olan bir
 * başkasının adı da aynı cümleyi gösteriyor. İkisi farklı olsaydı adres
 * çubuğu bir kullanıcı adı sözlüğüne dönerdi.
 *
 * DÖRT DURUMUN DÖRDÜ DE ÇİZİLİYOR
 * -------------------------------
 *   yükleniyor   iskelet
 *   boş          dürüst boş ızgara; satır hiç yoksa "hazırlanamadı" kutusu
 *   hata         "alınamadı" + yeniden dene; boş listeyle karıştırılmıyor
 *   yetkisiz     oturum yoksa giriş kapısı, başkasının adıysa güvenli ekran
 */

type Durum = 'yukleniyor' | 'hazir' | 'hata';
/*
  Üçüncü bir 'arsiv' görünümü VARDI ve kaldırıldı: paylaşım oluşturma
  akışı olmadığı için arşiv asla dolamıyor, yani o görünüm her zaman boş
  bir ekrandı.

  ARTIK ÜÇ YENİ GÖRÜNÜM VAR: 20260925010000 sahibin kendi arşivini
  okumasını açtı ve `archived_at` kolonu zaten yazılabilirdi — "Profilde
  yeniden göster" gerçek bir eylem, ekran da artık dolu olabiliyor. Beğeni
  ve kayıt listeleri de aynı şekilde: beğen/kaydet düğmeleri paylaşımın
  ayrıntı katmanında çalışıyor.

  Üçü de `if (!sahibiMi) return <GuvenliEkran/>` satırından SONRA
  çiziliyor; ziyaretçi bu koda hiç ulaşmıyor.
*/
/*
  'duzenle' GÖRÜNÜMÜ KALDIRILDI

  Sosyal alanların düzenlenmesi sağ sütunda AYRI bir ekran açıyordu ve
  dişli menüsünden giriliyordu. Aynı kullanıcının öğrenci alanları
  (okul, CV, program, beceri, dil, proje) ise `/cv` ekranının kendi
  düzenleme dalındaydı: tek bir profili düzenlemek için iki ayrı ekran
  ve iki ayrı giriş vardı. İkisi artık aynı düzenleme ekranında, iki
  ayrı bölüm olarak duruyor (`gomuluKip="duzenleme"`), dolayısıyla
  buradaki görünüm durumuna gerek kalmadı. Bırakılsaydı aynı formun
  ikinci bir çizim yolu olurdu.
*/
type Gorunum =
  | 'profil'
  | 'paylasimOlustur'
  | 'fotograf'
  /*
    Bölüm/alan talebi AYRI bir görünüm, formun içinde bir blok değil:
    `BolumTalebi` kendi `<form>`unu taşıyor ve düzenleme bölümünün formu
    da kendi `<form>`u — iç içe form geçersiz HTML olurdu ve tarayıcı
    içteki gönderimi dıştakine bağlardı.
  */
  | 'talep'
  | 'begendiklerim'
  | 'kaydedilenler'
  | 'arsiv';

interface SayfaProps {
  /** `/profil` için null, `/profil/:kullaniciadi` için adresteki ad. */
  rotaKullaniciAdi: string | null;
  kullaniciId: string | null;
  /** Oturum okunmadan "giriş yapmamış" kararı verilmiyor. */
  oturumHazir: boolean;
  /** `degistir` geçmişe kayıt eklemeden adresi değiştiriyor; bkz. App.tsx. */
  onNavigate: (yol: string, secenek?: { degistir?: boolean }) => void;
  onGirisGerekli?: () => void;
  /**
   * GÖMÜLÜ KİP — BİRLEŞİK EKRANIN (`/cv`) SAĞ SÜTUNU
   *
   * Sahibin sosyal portfolyosu artık kendi adresinde değil, profil/CV
   * ekranının sağında duruyor. Bu bileşenin İKİNCİ BİR KOPYASI
   * yazılmadı: veri yükleme, dört durum, sahiplik kararı ve sahibe özel
   * bütün alt ekranlar (paylaşım oluşturma, fotoğraf, düzenleme,
   * Beğendiklerim / Kaydedilenler / Arşiv) burada zaten kurulu. İki
   * kopya olsaydı biri değiştiğinde öteki geride kalır ve sahibe özel
   * bir ekran yanlış dalda çizilebilirdi — yetki hatası, biçim hatası
   * değil.
   *
   * Gömülü kipte DEĞİŞEN üç şey var:
   *   1. Sayfa kabuğu yok — çevreleyen ekran kendi `main`ini çiziyor.
   *   2. Sahip görünümü `SosyalProfilGorunumu` yerine sade ızgara:
   *      kimlik alanları (fotoğraf, ad, alan, biyografi) sol sütundaki
   *      profil kartında zaten duruyor; sayaçlar ile "Paylaş" ve dişli
   *      de o karta gidiyor (`onPortfolyoSatiri`), sağ sütun doğrudan
   *      ızgarayla başlıyor.
   *   3. Adreste kullanıcı adı YOK. Sahiplik zaten adresten değil,
   *      `profile_id = auth.uid()` karşılaştırmasından okunuyordu;
   *      gömülü kipte adres karşılaştırması tamamen düşüyor.
   */
  gomulu?: boolean;
  /**
   * GÖMÜLÜ KİPİN İKİ YÜZÜ
   *
   * `/cv` ekranının iki hâli var: ana görünüm ve düzenleme. Sağ sütunda
   * ana görünümde PORTFOLYO duruyor (sayaçlar, dişli, ızgara), düzenleme
   * dalında ise profilin SOSYAL yarısının formu.
   *
   * İkisi aynı bileşenden çiziliyor çünkü ikisi de aynı satırı okuyor
   * (`kendiSosyalProfiliGetir`) ve aynı sahiplik kararına tabi. Ayrı bir
   * bileşen yazsaydık yükleme, hata ve "satır gelmedi" dallarının ikinci
   * bir kopyası olurdu — yetki dalının kopyalanması bir biçim hatası
   * değil, güvenlik hatası.
   *
   * Aynı anda yalnız biri ağaçta: `/cv` düzenlemeye geçerken portfolyoyu
   * söküyor. Bu yüzden düzenleme kipinde sayaç ve paylaşım sorguları hiç
   * atılmıyor — çizilmeyecek bir sayı için istek atmak olurdu.
   */
  gomuluKip?: 'portfolyo' | 'duzenleme';
  /**
   * ÖĞRENCİ KAYDINDAKİ ESKİ FOTOĞRAF — YALNIZ YEDEK
   *
   * Kullanıcının tek fotoğrafı var ve kaynağı `social_profiles.avatar_path`.
   * `student_profiles.avatar_url` ise eskiden sol sütundaki kamera
   * düğmesinden yazılıyordu; o düğme kalktı ama kolon SİLİNMEDİ. Yolu
   * olmayan kullanıcı bu adrese düşüyor, yani değişiklikle kimse
   * fotoğrafsız kalmıyor. Karar `profilFotografi` içinde, tek yerde.
   *
   * YALNIZ SAHİBİN KENDİ EKRANINDA DOLU: ziyaretçi dalına geçilmiyor,
   * çünkü başkasının `student_profiles` satırı bu ekrandan okunmuyor.
   */
  ogrenciAvatarAdresi?: string | null;
  /**
   * Sosyal satırdaki fotoğraf yolunu ÇEVRELEYEN EKRANA bildiriyor.
   *
   * `/cv` ekranının sol sütunundaki kimlik kartı da aynı fotoğrafı
   * çiziyor ve tek kaynak `avatar_path`. Kart kendi sorgusunu atsaydı
   * aynı satır aynı ekranda iki kez okunur, ikisi ayrı zamanlarda
   * tazelenir ve yeni yüklenen fotoğraf bir yerde eski kalırdı.
   *
   * Yalnız gömülü kipte veriliyor; ziyaretçi görünümünde çağrılmıyor.
   */
  onAvatarYolu?: (yol: string | null) => void;
  /**
   * SAHİBİN PORTFOLYO SATIRINI ÇEVRELEYEN EKRANA VERİYOR
   *
   * Sayaçlar, "Paylaş" ve dişli menüsü birleşik ekranda sağ sütunun
   * üstünde duruyordu; artık sol sütundaki kimlik kartının içinde
   * çiziliyorlar. Kalıp `onAvatarYolu` ile aynı: veri ve eylemler yine
   * BURADA doğuyor, ikinci bir sorgu yolu ya da ikinci bir sahiplik dalı
   * yazılmadı. Kart yalnız verilen nesneyi çiziyor.
   *
   * Üç değer, üç anlam:
   *   `undefined`  satır henüz okunmadı (kart iskelet çiziyor)
   *   `null`       satır gelmedi ya da sahibi değil — kart ne sayı ne
   *                eylem çiziyor; sağ sütundaki hata kutusu duruyor
   *   nesne        sahip, satır hazır
   *
   * Yalnız gömülü portfolyo kipinde çağrılıyor; düzenleme kipinde ve
   * ziyaretçi görünümünde hiç.
   */
  onPortfolyoSatiri?: (satir: PortfolyoSatiri | null | undefined) => void;
}

/**
 * SAHİBİN PORTFOLYO SATIRI — SOL SÜTUNA GİDEN VERİ + EYLEM
 *
 * NEDEN HAZIR BİR DÜĞÜM (ReactNode) DEĞİL
 * ---------------------------------------
 * Kimlik kartı beş sayacı tek şeritte, tek tipografiyle çiziyor (üç
 * öğrenci sayacı + paylaşım + bağlantı). Sosyal sayaçlar buradan hazır
 * bir düğüm olarak gitseydi kartın içinde ikinci bir sayaç biçimi
 * yaşar, "Paylaş" ile dişli için de ayrı bir yuva gerekirdi: biçim iki
 * yere dağılırdı. Veri gidince biçim tek yerde (kartta), yetki tek
 * yerde (burada, `sahibiMi` kapısının arkasında).
 *
 * "PAYLAŞ" EYLEMİ VARSA DÜĞME VAR
 * -------------------------------
 * `sosyal_paylasim_baslat` (20260924030000) taslağı ancak `yayinda_mi`
 * VE `sector_id is not null` iken açıyor. İki koşul da burada ölçülüyor
 * ve sağlanmıyorsa `onPaylasimOlustur` nesneye HİÇ konmuyor — kart
 * "çizeyim mi" diye ikinci kez bakmıyor, eylemi olmayan düğmeyi çizmiyor.
 * Eksikliğin sebebi sağ sütunda yazıyor (`paylasimEngeli`).
 *
 * DİŞLİ MENÜSÜNÜN SATIRLARI DEĞİŞMEDİ
 * -----------------------------------
 * `menu` doğrudan `ProfilAyarMenusu`nun props'u; `Pick` ile yalnız
 * portfolyoya ait satırlar geçiyor. Düzenleme ve fotoğraf satırları bu
 * tipe giremiyor — onlar düzenleme ekranında, ikinci kapı açılmıyor.
 */
export interface PortfolyoSatiri {
  /**
   * Kartın ad satırının altına `@ad` olarak iniyor. Sunucudan gelen
   * satırda ad henüz seçilmemiş olabilir (`null`); o zaman kart satırı
   * HİÇ çizmiyor — uydurma ya da yer tutucu ad yok. Sayaçlarla aynı
   * nesnede gidiyor ki kart ikinci bir profil sorgusu açmasın.
   */
  kullaniciAdi: string | null;
  sayaclar: SosyalSayaclar | null;
  sayacDurumu: 'yukleniyor' | 'hazir' | 'hata';
  /** Yalnız iki sunucu önkoşulu sağlanınca var; yoksa kart düğme çizmiyor. */
  onPaylasimOlustur?: () => void;
  /**
   * Uygulama içi gezinme — bağlantı sayacının gerçek `<a href>`i için.
   * Kimliği sabit: çağıranın her çizimde yenilenen fonksiyonunu ref'ten
   * okuyor (bkz. `sabitEylemler`).
   */
  onNavigate: (yol: string) => void;
  menu: Pick<
    ProfilAyarMenusuProps,
    | 'onPaylas'
    | 'yayindaMi'
    | 'onGorunurluk'
    | 'gorunurlukDurumu'
    | 'onBegendiklerim'
    | 'onKaydedilenler'
    | 'onArsiv'
  >;
}

/**
 * Sahibin tek ekranının adresi.
 *
 * Yol dört yerde geçiyor (kısa yol yönlendirmesi, kanonik yönlendirme,
 * kurulum sonrası ve güvenli ekranın alt bağlantısı) ve tek yerde
 * yazılıyor: dört kopya olsaydı biri değiştiğinde öteki üçü sessizce
 * eski adrese giderdi.
 */
const BIRLESIK_EKRAN = '/cv';

const KART = 'rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5';
/**
 * Gömülü kipteki geri satırı.
 *
 * Ölçüsü `SayfaKabugu`nun geri düğmesiyle birebir aynı: aynı üründe iki
 * farklı "Geri" görünümü olmasın. Kopya olmasının sebebi kabuğun kendisi:
 * gömülü kipte `SayfaKabugu` hiç çizilmiyor (ikinci bir `main` olurdu),
 * içindeki satır da onunla birlikte düşüyor.
 */
const GERI_SATIRI = `inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 ${ODAK_HALKASI}`;

const IKINCIL = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

/**
 * SOSYAL PROFİL SATIRI GELMEDİ — KURULUM DEĞİL, ARIZA
 *
 * Burada eskiden `SosyalProfilKurulum` vardı: kullanıcıya kendi sosyal
 * profilini kurdurup `sosyal_profil_kur` RPC'sini çağırıyordu. O ekranın
 * sorduğu sorunun artık bir karşılığı yok — 20260926050000 öğrenci kaydı
 * tamamlandığında sosyal profili ve kullanıcı adını SUNUCUDA açıyor.
 * Kullanıcının vereceği bir bilgi kalmamıştı: ad kayıttan, bölüm öğrenci
 * profilinden geliyor.
 *
 * Dolayısıyla satırın olmaması normal bir yol değil, bir ARIZA. Arızaya
 * kurulum formu göstermek, kullanıcıyı sistemin kendi işini elle
 * yapmaya çağırmak olurdu; ikinci bir satır açma denemesi de sunucunun
 * zaten yaptığı işi tekrar etmek olurdu.
 *
 * SEBEP UYDURULMUYOR. Arayüz satırın neden gelmediğini bilmiyor
 * (yetki mi, ağ mı, tetikleyici mi) ve bilmediğini yazıyor.
 *
 * "YENİDEN DENE" ARTIK SUNUCUYA İŞ VERİYOR
 * ----------------------------------------
 * Düğme uzun süre yalnız OKUMAYI tekrarlıyordu ve satır gerçekten hiç
 * açılmadıysa okumayı yüz kez tekrarlamak da satır üretmiyordu:
 * kullanıcının elinde hiçbir zaman çalışmayacak bir düğme kalıyordu.
 * 20260926090000 dar bir kapı açtı — `sosyal_profilimi_tamamla()`
 * argüman almıyor, hedefi `auth.uid()`, idempotent ve topluluğa
 * katmıyor. Düğme önce onu çağırıyor, SONRA okumayı tazeliyor.
 *
 * BU HÂLÂ BİR KURULUM FORMU DEĞİL: kullanıcı hiçbir bilgi girmiyor, ad
 * kayıttan, bölüm öğrenci profilinden geliyor. Sorulacak bir soru
 * olmadığı için form da yok.
 *
 * ÇİFT TIKLAMA KİLİTLİ. RPC idempotent olduğu için ikinci çağrı veriyi
 * bozmazdı ama iki isteğin sonucu kullanıcıya iki ayrı cümle olarak
 * dönerdi; ikincisi birincinin cevabının üstüne yazardı.
 *
 * BAŞARISIZLIKTA SEBEP UYDURULMUYOR: cümle `SosyalHata`dan geliyor ve o
 * da RPC'nin `detail` kodundan seçilmiş. Kod tanınmıyorsa ham
 * veritabanı metni EKRANA ÇIKMIYOR, yalnız ne yapılabileceği yazılıyor.
 */
const SosyalProfilHazirDegil: React.FC<{
  /** Birleşik ekranda sayfanın `h1`i sol sütundaki ada ait; burada `h2`. */
  altBaslik?: boolean;
  /** YALNIZ tamamlama isteği kabul edildikten sonra çağrılıyor: okumayı tazeliyor. */
  onTamamlandi: () => void;
}> = ({ altBaslik = false, onTamamlandi }) => {
  const Baslik = altBaslik ? 'h2' : 'h1';
  const [durum, setDurum] = React.useState<'bekliyor' | 'gonderiliyor' | 'hata'>('bekliyor');
  const [hataMesaji, setHataMesaji] = React.useState<string | null>(null);

  const dene = async () => {
    if (durum === 'gonderiliyor') return;
    setDurum('gonderiliyor');
    setHataMesaji(null);
    try {
      await sosyalProfilimiTamamla();
      /*
        Okuma ancak sunucu isteği KABUL ettikten sonra tazeleniyor. Hata
        dalında tazeleme yok: aynı boş sonucu yeniden çizmek, başarısız
        bir denemeyi "bir şey oldu" gibi gösterirdi.
      */
      onTamamlandi();
      setDurum('bekliyor');
    } catch (sorun) {
      setHataMesaji(
        sorun instanceof SosyalHata
          ? sorun.message
          : 'Sosyal profilin tamamlanamadı. Bağlantını kontrol edip yeniden dene.',
      );
      setDurum('hata');
    }
  };

  return (
    <div className={`${KART} space-y-3`} role="alert">
      <Baslik className="text-base font-extrabold text-gray-900">
        Sosyal profilin hazırlanamadı
      </Baslik>
      <p className="text-sm leading-relaxed text-gray-600">
        Sosyal profil satırın sunucudan gelmedi ve sebebini buradan göremiyoruz.
        "Yeniden dene" sunucudan profilini tamamlamasını ister; senden bir bilgi
        istenmiyor, kayıtlı bilgilerinden başkası kullanılmıyor.
      </p>
      <button
        type="button"
        onClick={dene}
        disabled={durum === 'gonderiliyor'}
        className={`${IKINCIL} disabled:opacity-40`}
      >
        {durum === 'gonderiliyor' ? 'Deneniyor…' : 'Yeniden dene'}
      </button>
      {/*
        Hata satırı denemenin YANINDA: kutunun kendisi zaten bir hata
        kutusu ve ikisi farklı şeyler anlatıyor — biri satırın gelmediğini,
        öteki tamamlama isteğinin de olmadığını.
      */}
      {hataMesaji && (
        <p role="status" className="text-xs font-semibold leading-relaxed text-rose-700">
          {hataMesaji}
        </p>
      )}
    </div>
  );
};

/**
 * İskelet üç kipte: içerik gelince sayfa zıplamıyor.
 *
 * 'panel' gömülü portfolyo için: orada kimlik alanları (fotoğraf, ad,
 * alan) ve sayaçlar SOL sütunda çiziliyor; sağ sütunda onların
 * iskeletini göstermek, gelmeyecek bir bloğun yerini ayırmak olurdu —
 * içerik gelince panel yukarı zıplardı. Sayaç iskeletini kimlik kartı
 * kendi şeridinde çiziyor; burada yalnız ızgara.
 *
 * 'form' düzenleme kipi için: orada gelecek şey ızgara değil, üç kart
 * dolusu giriş kutusu. Aynı iskeleti kullansaydık kullanıcı bir kare
 * boyunca gelmeyecek bir kare ızgara görürdü.
 */
const ProfilIskeleti: React.FC<{ kip?: 'sayfa' | 'panel' | 'form' }> = ({ kip = 'sayfa' }) =>
  kip === 'form' ? (
    <div aria-busy="true" className="space-y-4">
      {[0, 1, 2].map((sira) => (
        <div key={sira} className={`${KART} space-y-2.5`}>
          <div aria-hidden className="h-4 w-28 animate-pulse rounded bg-gray-100" />
          <div aria-hidden className="h-10 w-full animate-pulse rounded-xl bg-gray-100" />
        </div>
      ))}
    </div>
  ) : kip === 'panel' ? (
    <div aria-busy="true">
      <PaylasimIzgarasi paylasimlar={[]} durum="yukleniyor" gorunum="sade" />
    </div>
  ) : (
  <div aria-busy="true" className="space-y-4">
    <div className={`${KART} space-y-3`}>
      <div className="flex items-start gap-3">
        <div aria-hidden className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-gray-100 sm:h-20 sm:w-20" />
        <div className="flex-1 space-y-2">
          <div aria-hidden className="h-5 w-40 animate-pulse rounded bg-gray-100" />
          <div aria-hidden className="h-4 w-24 animate-pulse rounded bg-gray-100" />
          <div aria-hidden className="h-5 w-32 animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="flex gap-5">
        <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-gray-100" />
        <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
    <PaylasimIzgarasi paylasimlar={[]} durum="yukleniyor" />
  </div>
  );

export const SosyalProfilSayfasi: React.FC<SayfaProps> = ({
  rotaKullaniciAdi,
  kullaniciId,
  oturumHazir,
  onNavigate,
  onGirisGerekli,
  gomulu = false,
  gomuluKip = 'portfolyo',
  ogrenciAvatarAdresi = null,
  onAvatarYolu,
  onPortfolyoSatiri,
}) => {
  /*
    Kip yalnız gömülü halde anlamlı: ayrı adreste (`/profil`) düzenleme
    diye bir ekran yok, sahip zaten `/cv`ye yönlendiriliyor. Koşulu
    burada bir kez kurup aşağıda tek isimle kullanmak, `gomulu &&
    gomuluKip === ...` karşılaştırmasının beş ayrı dalda tekrarlanmasını
    önlüyor — biri unutulsaydı portfolyo ile form aynı anda çizilirdi.
  */
  const duzenlemeKipi = gomulu && gomuluKip === 'duzenleme';
  const [profil, setProfil] = React.useState<SosyalProfil | null>(null);
  const [profilDurumu, setProfilDurumu] = React.useState<Durum>('yukleniyor');
  const [profilDeneme, setProfilDeneme] = React.useState(0);

  const [sayaclar, setSayaclar] = React.useState<SosyalSayaclar | null>(null);
  const [sayacDurumu, setSayacDurumu] = React.useState<Durum>('yukleniyor');
  /*
    Sayaç tazelemesi profil tazelemesinden AYRI.

    Paylaşım eklendiğinde ya da arşivlendiğinde "Paylaşım" sayısı
    değişiyor; `profilDeneme`yi artırmak da işe yarardı ama o, profil
    sorgusunu 'yukleniyor'a çekip bütün sayfayı iskelete döndürürdü.
    Kullanıcı az önce baktığı profilin kaybolduğunu görürdü.
  */
  const [sayacDeneme, setSayacDeneme] = React.useState(0);

  const [paylasimlar, setPaylasimlar] = React.useState<SosyalPaylasim[]>([]);
  const [paylasimDurumu, setPaylasimDurumu] = React.useState<Durum>('yukleniyor');
  const [paylasimDeneme, setPaylasimDeneme] = React.useState(0);

  /* Tek durum, iki yön: yayımlama ve yayından kaldırma aynı isteği atıyor. */
  const [gorunurlukDurumu, setGorunurlukDurumu] = React.useState<
    'bekliyor' | 'gonderiliyor' | 'hata'
  >('bekliyor');

  /* Fotoğraf kaldırma; yükleme ekranının kendi durumundan AYRI. */
  const [fotografKaldirmaDurumu, setFotografKaldirmaDurumu] = React.useState<
    'bekliyor' | 'gonderiliyor' | 'hata'
  >('bekliyor');

  const [gorunum, setGorunum] = React.useState<Gorunum>('profil');
  const [bildirim, setBildirim] = React.useState<string | null>(null);

  /*
    BÖLÜM TALEBİNİN GİRİŞİ ARTIK DÜZENLEME EKRANINDA

    `BolumTalebi` bir süre hiçbir yerden açılamıyordu: tek girişi kurulum
    formuydu ve o form kalktı. Yeni giriş eksikliğin YAZILI OLDUĞU yerde
    — düzenlemedeki "Sosyal profilin" bölümünün kilitli bölüm/alan
    kartında. Başka bir ekrana konsaydı kullanıcı eksikliği bir yerde
    okuyup çözümü başka yerde arardı.

    Görünüm burada tutuluyor (`gorunum === 'talep'`) çünkü ekran sahibe
    özel dalın İÇİNDE çiziliyor: `if (!sahibiMi) return <GuvenliEkran/>`
    satırından sonra. Ziyaretçi bu koda hiç ulaşmıyor, talep ekranı DOM'a
    hiç girmiyor.
  */

  /* Ziyaretçi yolu: rotadaki ad başkasına aitse bu durumlar kullanılıyor. */
  const [ziyaretciProfili, setZiyaretciProfili] = React.useState<SosyalProfil | null>(null);
  const [ziyaretciDurumu, setZiyaretciDurumu] = React.useState<
    'yukleniyor' | 'hazir' | 'hata' | 'yok'
  >('yukleniyor');

  const rotaAdi = rotaKullaniciAdi ? kullaniciAdiNormalize(rotaKullaniciAdi) : null;

  /*
    PROFİL "TAM" SAYILMAK İÇİN ARTIK YALNIZ KULLANICI ADI İSTİYOR

    Koşul `kullaniciAdi && sektorId` idi. O ikinci şart eski modelden
    kalmaydı: alan aynı zamanda topluluk üyeliği demekti ve alansız
    profil kimseye görünmüyordu. 20260926040000 üçünü ayırdı ve
    `yayin_icin_kimlik_sart` kısıtı da yalnız `username is not null`
    istiyor. Bölümü katalogla eşleşmeyen kullanıcının `sector_id`si NULL
    kalıyor (20260926050000) ama profili AÇILIYOR; eski koşul o kişiyi
    kendi profilinden çıkarıp kurulum ekranına düşürürdü.

    Eksiklik saklanmıyor: alanı olmayan kullanıcı bunu düzenleme
    ekranında ve `/topluluklar` sayfasında olduğu gibi görüyor.
  */
  const profilTamMi = Boolean(profil?.kullaniciAdi);
  /*
    Paylaşım açmanın SUNUCUDAKİ önkoşulu: `sosyal_paylasim_baslat`
    (20260924030000) `yayinda_mi` VE `sector_id is not null` arıyor.
    Alanı olmayan kullanıcıya "Paylaş" düğmesi çizmek, her basışta
    reddedilen bir eylem sunmak olurdu.
  */
  const alaniVarMi = Boolean(profil?.sektorId);
  /* İkinci önkoşul; kimlik kartına giden satır ve dişli menüsü aynı değeri okuyor. */
  const yayindaMi = Boolean(profil?.yayindaMi);
  /*
    TALEBİN İKİ SEBEBİ, İKİ AYRI KİP

    `null` = yapılacak iş yok: bölüm katalogla eşleşmiş VE alana
    bağlanmış. O kullanıcıya talep satırı hiç çizilmiyor; çizilseydi
    olmayan bir eksiklik varmış gibi görünürdü.

    Ayrım `bolumAdi`ndan: `departments` birleşimi doluysa katalog satırı
    var, yönetimin işi eşleme eklemek. Boşsa bölüm hiç eşleşmemiş
    (20260926050000 `department_id`yi NULL bırakıyor) ve yönetimin işi
    kataloğa bölüm eklemek. Tek kipe indirmek, yöneticiye de kullanıcıya
    da yanlış işi anlattırırdı.
  */
  const talepKipi: TalepKipi | null = !profil
    ? null
    : profil.sektorId
      ? null
      : profil.bolumAdi
        ? 'alan-tanimsiz'
        : 'bolum-yok';
  /*
    "PAYLAŞ" YOKSA SEBEBİ YAZILIYOR

    Düğme iki önkoşuldan biri eksikken çizilmiyor. Sebep yazılmasaydı
    kullanıcı, başkasında duran bir düğmenin kendisinde neden olmadığını
    hiçbir yerden okuyamazdı — sessizce eksilen bir eylem, bozuk bir
    ekrandan ayırt edilemez.

    ÜÇ CÜMLE, ÜÇ FARKLI DURUM. "Alanın yok" tek cümle olsaydı, bölümü
    hiç eşleşmemiş kullanıcıyla bölümü eşleşmiş ama alana bağlanmamış
    kullanıcı aynı şeyi okur ve ikisi de yapabileceği bir şey olduğunu
    sanırdı. Elinde iş olan yalnız birincisi: `bolum_girilince_tamamla`
    (20260926050000) öğrenci profilindeki bölüm girildiğinde
    `department_id` ve `sector_id` alanlarını SUNUCUDA dolduruyor.
    Kullanıcıya bir bölüm ADI ÖNERİLMİYOR, uydurma bir alan da
    yazılmıyor; ikincisinde yapılacak bir iş yok ve cümle bunu iddia
    etmiyor.
  */
  const paylasimEngeli: string | null = !profil
    ? null
    : !profil.sektorId
      ? profil.bolumAdi
        ? `Bölümün (${profil.bolumAdi}) henüz bir alana bağlanmadı; bu yüzden paylaşım açamıyorsun.`
        : 'Bölümün kataloğumuzla eşleşmediği için alanın belirlenmedi; bu yüzden paylaşım açamıyorsun. Öğrenci profilindeki bölümünü girdiğinde alanın kendiliğinden tamamlanıyor.'
      : !profil.yayindaMi
        ? 'Profilin şu anda yalnızca sana görünüyor; paylaşım açmak için dişli menüsünden profilini herkese açman gerekiyor.'
        : null;
  /*
    Gömülü kipte ADRES KARŞILAŞTIRMASI DÜŞÜYOR

    Adres karşılaştırması bir yetki kanıtı değildi, bir ROTA kanıtıydı:
    "bu sayfada gösterilmesi gereken profil benimki mi". Yetkiyi zaten
    `profil.profilId === kullaniciId` veriyor ve o satır her iki kipte de
    aynı. Gömülü kipte gösterilecek profil rotadan gelmiyor — çevreleyen
    ekran oturum sahibinin kendi ekranı — bu yüzden karşılaştıracak bir
    ad da yok.
  */
  const sahibiMi = Boolean(
    kullaniciId &&
      profil &&
      profil.profilId === kullaniciId &&
      profilTamMi &&
      (gomulu || (rotaAdi !== null && rotaAdi === profil.kullaniciAdi)),
  );

  /*
    ZİYARETÇİ YOLU NE ZAMAN AÇILIYOR

    Kendi profili yüklendikten SONRA ve adresteki ad kendi adı değilse.
    Önce beklemeseydik, kendi profiline giden kullanıcı bir kare boyunca
    ziyaretçi sorgusu atardı — kendi kimliğini kendi adından çözmeye
    çalışan gereksiz bir istek.
  */
  const ziyaretciYolu = Boolean(
    !gomulu && kullaniciId && rotaAdi !== null && profilDurumu === 'hazir' && !sahibiMi,
  );

  /* Görüntülenen profil: sahip dalında kendi satırı, ziyaretçi dalında öteki. */
  const gosterilenProfil = sahibiMi ? profil : ziyaretciProfili;

  /* Oturum yoksa mevcut giriş akışı açılıyor; sayfa da kapıyı çiziyor. */
  React.useEffect(() => {
    if (!oturumHazir || kullaniciId) return;
    onGirisGerekli?.();
    /*
      `onGirisGerekli` bağımlılığa konmuyor: App her render'da yeni bir
      fonksiyon üretiyor ve modal her render'da yeniden açılırdı.
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturumHazir, kullaniciId]);

  React.useEffect(() => {
    if (!kullaniciId) return;
    let iptal = false;
    setProfilDurumu('yukleniyor');
    kendiSosyalProfiliGetir(kullaniciId)
      .then((satir) => {
        if (iptal) return;
        setProfil(satir);
        setProfilDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setProfilDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [kullaniciId, profilDeneme]);

  /*
    FOTOĞRAF YOLU ÇEVRELEYEN EKRANA BİLDİRİLİYOR

    `/cv` sol sütunundaki kimlik kartı da aynı fotoğrafı çiziyor. İkinci
    bir sorgu atmak yerine burada okunan değer yukarı veriliyor: aynı
    satırın iki ayrı okuması, yeni yüklenen fotoğrafın bir sütunda eski
    kalması demek olurdu.

    HATA DALINDA DA BİLDİRİLİYOR — SEBEBİ İSKELET

    "Bilinmiyor" durumu kimlik kartında bir iskelet daire çizdiriyor
    (fotoğrafı olan kullanıcıda baş harflerin yanıp sönmemesi için).
    Sorgu hata verdiğinde haber verilmeseydi o daire SONSUZA KADAR
    atardı: hiç bitmeyen bir yükleme, bitmiş bir hatadan daha kötü bir
    yalan olurdu. Hata dalında `null` gidiyor ve kart eski `avatar_url`
    yedeğine, o da yoksa baş harflere düşüyor — `ProfilFotografi`nin
    "dosya inemedi" dalıyla aynı karar.
  */
  React.useEffect(() => {
    if (!onAvatarYolu || profilDurumu === 'yukleniyor') return;
    onAvatarYolu(profilDurumu === 'hazir' ? (profil?.avatarYolu ?? null) : null);
  }, [onAvatarYolu, profilDurumu, profil?.avatarYolu]);

  /*
    SAHİBİN KANONİK ADRESİ ARTIK `/cv`

    Profili kurulu olan kullanıcı `/profil` ya da `/profil/<kendi adı>`
    adresine gittiğinde birleşik ekrana yönlendiriliyor. Sebep: sahip için
    TEK ekran var. İki ayrı sahip ekranı olsaydı — biri CV'li, öteki
    portfolyolu — kullanıcı hangisinde ne yapabileceğini adres çubuğundan
    tahmin etmek zorunda kalır, iki ekranın eylemleri de zamanla
    birbirinden ayrılırdı.

    `/profil/<başkasının adı>` YÖNLENDİRİLMİYOR: orası ziyaretçi görünümü
    ve kendi kalıcı adresi. Koşul bu yüzden `sahibiMi`ye bakıyor, yalnız
    `profilTamMi`ye değil.

    `degistir: true` geçmişe kayıt EKLEMİYOR; push edilseydi geri tuşu
    kullanıcıyı yeniden yönlendirilecek adrese düşürür ve geri tuşu hiç
    çalışmaz hâle gelirdi.

    Yönlendirme çizim sırasında değil effect içinde — çizim sırasında
    gezinmek React'te durum güncellemesini çizime karıştırır.
  */
  React.useEffect(() => {
    if (gomulu || profilDurumu !== 'hazir' || !profilTamMi) return;
    if (rotaAdi !== null && !sahibiMi) return;
    onNavigate(BIRLESIK_EKRAN, { degistir: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gomulu, profilDurumu, profilTamMi, rotaAdi, sahibiMi]);

  /*
    ZİYARETÇİ PROFİLİ — İKİ ADIM, İKİSİ DE RLS'E TABİ

    Önce kullanıcı adı kimliğe çevriliyor, sonra profil o kimlikle
    okunuyor. İkisi de görünmeyen bir hedef için boş dönüyor ve iki boş
    sonuç AYNI ekrana çıkıyor: "yok". Böylece "böyle bir ad yok" ile "bu
    profil sana kapalı" arasındaki fark arayüzden okunamıyor.
  */
  React.useEffect(() => {
    if (!ziyaretciYolu || !rotaAdi) return;
    let iptal = false;
    setZiyaretciDurumu('yukleniyor');
    (async () => {
      const kimlik = await sosyalProfilKimligiGetir(rotaAdi);
      if (iptal) return;
      /*
        İki boş sonuç da 'yok': ad çözülmediyse de, satır okunamadıysa da.
        Ayrı durumlar olsaydı ikisi ayrı ekrana çıkar ve fark "bu ad var
        mı" sorusunu cevaplardı.
      */
      if (!kimlik) {
        /*
          ESKİ ADRES YENİSİNE ÇÖZÜLÜYOR

          Kullanıcı adı değiştirilebiliyor (20260926020000) ve bırakılan
          ad kalıcı olarak rezerve ediliyor. Paylaşılmış eski bağlantıya
          tıklayan kişiyi güvenli ekrana düşürmek, çalışan bir adresi
          kırık göstermek olurdu.

          `degistir: true` geçmişe kayıt EKLEMİYOR: push edilseydi geri
          tuşu kullanıcıyı yeniden yönlendirilecek eski adrese düşürür ve
          geri tuşu hiç çalışmaz hâle gelirdi.

          Çözüm bulunamazsa MEVCUT güvenli ekran aynen kalıyor. Fonksiyon
          da bir varlık kehaneti değil: yalnız çağıranın zaten
          görebileceği bir profile çözüm veriyor ve bulamadığında sıfır
          satır dönüyor.
        */
        const guncel = await sosyalKullaniciAdiCoz(rotaAdi);
        if (iptal) return;
        if (guncel && guncel !== rotaAdi) {
          onNavigate(profilYolu(guncel), { degistir: true });
          return;
        }
        setZiyaretciDurumu('yok');
        return;
      }
      const satir = await sosyalProfiliGetir(kimlik);
      if (iptal) return;
      if (!satir) {
        setZiyaretciDurumu('yok');
        return;
      }
      setZiyaretciProfili(satir);
      setZiyaretciDurumu('hazir');
    })().catch(() => {
      if (!iptal) setZiyaretciDurumu('hata');
    });
    return () => {
      iptal = true;
    };
  }, [ziyaretciYolu, rotaAdi]);

  /*
    Düzenleme kipinde sayaç ve ızgara ÇİZİLMİYOR; sorguları da atılmıyor.
    Bayrağı yalnız çizim tarafına koysaydık kullanıcı her düzenlemeye
    girişinde sonucu hiçbir yerde görünmeyen iki istek atardı.
  */
  React.useEffect(() => {
    if (!gosterilenProfil || duzenlemeKipi) return;
    let iptal = false;
    setSayacDurumu('yukleniyor');
    sosyalSayaclariGetir(gosterilenProfil.profilId)
      .then((deger) => {
        if (iptal) return;
        setSayaclar(deger);
        setSayacDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setSayacDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [gosterilenProfil, duzenlemeKipi, profilDeneme, sayacDeneme]);

  React.useEffect(() => {
    if (!gosterilenProfil || duzenlemeKipi) return;
    let iptal = false;
    setPaylasimDurumu('yukleniyor');
    paylasimlariGetir(gosterilenProfil.profilId)
      .then((liste) => {
        if (iptal) return;
        setPaylasimlar(liste);
        setPaylasimDurumu('hazir');
      })
      .catch(() => {
        if (!iptal) setPaylasimDurumu('hata');
      });
    return () => {
      iptal = true;
    };
  }, [gosterilenProfil, duzenlemeKipi, paylasimDeneme]);

  /**
   * Profil görünürlüğünü değiştir — iki yön, tek fonksiyon.
   *
   * Uyarı kutusundaki "Şimdi yayımla" ile dişli menüsündeki görünürlük
   * satırı AYNI buradan besleniyor. İki ayrı fonksiyon olsaydı biri
   * değiştiğinde öteki geride kalır ve aynı kolonu iki farklı kural
   * yazardı.
   *
   * Kimlik OTURUMDAN geçiliyor (`kullaniciId`), ekrandaki satırdan ya da
   * adresten değil: eylem tanım gereği "kendi profilimin görünürlüğü".
   *
   * İYİMSER GÜNCELLEME YOK
   * ----------------------
   * Yerel `profil` durumu ve başarı bildirimi ancak sunucu yazmayı kabul
   * ettikten sonra yazılıyor. Tersi olsaydı, yazma başarısızken uyarı
   * kutusu ekrandan kaybolur ve kullanıcı profilinin yayımlandığını
   * sanırdı — yani yalan bir başarı. Hata dalında ne `setProfil` var ne
   * bildirim; orada durum 'hata' oluyor ve ekran bunu açıkça yazıyor.
   */
  const gorunurlukDegistir = async (yeniDeger: boolean) => {
    if (!kullaniciId || gorunurlukDurumu === 'gonderiliyor') return;
    setGorunurlukDurumu('gonderiliyor');
    try {
      await sosyalProfilGorunurluguAyarla(kullaniciId, yeniDeger);
      setProfil((onceki) => (onceki ? { ...onceki, yayindaMi: yeniDeger } : onceki));
      setGorunurlukDurumu('bekliyor');
      /* Bildirim kanalı yeni değil: bağlantı kopyalamanın kullandığı satır. */
      /*
        CÜMLE ARTIK ÜYELİĞİ DEĞİL GÖRÜNÜRLÜĞÜ ANLATIYOR

        `yayinda_mi` bir zamanlar topluluk üyeliği demekti; 20260926040000
        anlamı daralttı ve üyelik `community_members`e taşındı. Eski cümle
        kalsaydı kullanıcı profilini gizlerken topluluğundan çıktığını
        sanırdı — oysa üyeliğine hiç dokunulmuyor.
      */
      setBildirim(
        yeniDeger
          ? 'Profilin artık giriş yapmış herkese açık.'
          : 'Profilin artık yalnızca sana görünüyor.',
      );
      window.setTimeout(() => setBildirim(null), 2500);
    } catch {
      setGorunurlukDurumu('hata');
    }
  };

  /**
   * Paylaşım listesi ve sayaç birlikte tazeleniyor.
   *
   * Yeni paylaşım da arşivleme de "Paylaşım" sayısını değiştiriyor.
   * Yalnız ızgara tazelenseydi sayaç eski değerde kalır ve aynı ekranda
   * iki farklı sayı görünürdü — hangisinin doğru olduğu kullanıcıdan
   * saklanmış olurdu.
   *
   * İYİMSER GÜNCELLEME YOK: sayı istemcide artırılmıyor, sunucudan
   * yeniden okunuyor. `sosyal_sayaclar` kendi kitle kapısından geçiyor
   * ve tek doğru kaynak o.
   */
  const paylasimlariTazele = () => {
    setPaylasimDeneme((sayi) => sayi + 1);
    setSayacDeneme((sayi) => sayi + 1);
  };

  /**
   * Profil bağlantısını paylaş.
   *
   * Kalıp `ListingPage` ile aynı: mobilde işletim sisteminin paylaşım
   * menüsü, masaüstünde panoya kopyalama. Kopyalama da başarısız olursa
   * "kopyalandı" DENMİYOR — olmayan bir başarıyı bildirmek, kullanıcıyı
   * boş bir panoyla yapıştırmaya gönderirdi.
   */
  const paylas = async () => {
    if (!profil?.kullaniciAdi) return;
    const adres = `${window.location.origin}${profilYolu(profil.kullaniciAdi)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `@${profil.kullaniciAdi}`, url: adres });
        return;
      } catch {
        /* Kullanıcı vazgeçti ya da paylaşım reddedildi; kopyalamaya düşülüyor. */
      }
    }
    try {
      await navigator.clipboard.writeText(adres);
      setBildirim('Profil bağlantısı panoya kopyalandı.');
    } catch {
      setBildirim('Bağlantı kopyalanamadı. Adres çubuğundan kopyalayabilirsin.');
    }
    window.setTimeout(() => setBildirim(null), 2500);
  };

  /**
   * Profil fotoğrafını kaldır — `avatar_path` → null.
   *
   * SIRA SORGUNUN İÇİNDE, BURADA DEĞİL
   * ----------------------------------
   * ÖNCE satır güncelleniyor, dosya ANCAK ondan sonra siliniyor
   * (`profilFotografiKaldir`). Tersi olsaydı satır güncellemesinin
   * başarısız olduğu durumda profilde var olmayan bir dosyanın yolu
   * kalırdı: ekranda fotoğraf "duruyor" ama her indirme 400 dönüyor.
   *
   * YEREL DURUM YALNIZ SUNUCU KABUL ETTİKTEN SONRA
   * ----------------------------------------------
   * `avatarYolu` iyimser olarak null'a çekilmiyor. Hata dalında
   * kullanıcının fotoğrafı ekranda DURUYOR ve cümlesi de bunu söylüyor;
   * iyimser bir güncelleme, kaldırılmamış bir fotoğrafı kalkmış
   * göstermek olurdu.
   */
  const fotografiKaldir = async () => {
    if (!kullaniciId || fotografKaldirmaDurumu === 'gonderiliyor') return;
    setFotografKaldirmaDurumu('gonderiliyor');
    try {
      await profilFotografiKaldir(kullaniciId);
      setProfil((onceki) => (onceki ? { ...onceki, avatarYolu: null } : onceki));
      setFotografKaldirmaDurumu('bekliyor');
      setBildirim('Profil fotoğrafın kaldırıldı.');
      window.setTimeout(() => setBildirim(null), 2500);
    } catch {
      setFotografKaldirmaDurumu('hata');
    }
  };

  /*
    EYLEMLERİN KİMLİĞİ SABİT, İÇERİĞİ GÜNCEL

    Portfolyo satırı çevreleyen ekranda bir state'e yazılıyor. `paylas`,
    `gorunurlukDegistir` ve `onNavigate` her çizimde yeniden üretiliyor;
    aşağıdaki effect'in bağımlılığına girselerdi her çizim yeni bir nesne
    gönderir, nesne çevreleyen ekranı yeniden çizdirir, o çizim bu
    bileşeni de çizer ve döngü hiç durmazdı. Bu yüzden son hâlleri bir
    ref'te tutuluyor (ref her commit'ten sonra tazeleniyor); dışarı giden
    fonksiyonlar ise BİR KEZ kuruluyor ve çağrıldıkları anda ref'ten
    okuyor. Tıklama her zaman commit'ten sonra geldiği için ref güncel.
  */
  const guncel = React.useRef({ paylas, gorunurlukDegistir, onNavigate, yayindaMi });
  React.useEffect(() => {
    guncel.current = { paylas, gorunurlukDegistir, onNavigate, yayindaMi };
  });
  const sabitEylemler = React.useMemo(
    () => ({
      paylasimOlustur: () => setGorunum('paylasimOlustur'),
      profilBaglantisiPaylas: () => {
        void guncel.current.paylas();
      },
      gorunurluk: () => {
        void guncel.current.gorunurlukDegistir(!guncel.current.yayindaMi);
      },
      begendiklerim: () => setGorunum('begendiklerim'),
      kaydedilenler: () => setGorunum('kaydedilenler'),
      arsiv: () => setGorunum('arsiv'),
      navigate: (yol: string) => guncel.current.onNavigate(yol),
    }),
    [],
  );

  /*
    PORTFOLYO SATIRI ÇEVRELEYEN EKRANA — SAHİP KAPISININ ARKASINDAN

    Aşağıdaki çizim dalları `if (!sahibiMi) return <GuvenliEkran/>` ile
    kesiliyor; effect'ler o satırdan ÖNCE çalışmak zorunda (koşullu hook
    olmaz). Kapı bu yüzden effect'in içinde ikinci kez, aynı `sahibiMi`
    değeriyle çekiliyor: sahibi olmayan (ya da satırı gelmeyen) durumda
    dışarı `null` gidiyor ve kart ne sayı ne eylem çiziyor. Sayı da
    eylem de bu nesneden başka bir yoldan karta ulaşmıyor.

    Yükleme sırasında `undefined`: yeniden deneme profil sorgusunu
    'yukleniyor'a çekiyor ve o aralıkta eski sayı kartta kalsaydı,
    tazelenmekte olan bir değer kesinmiş gibi dururdu.

    "Paylaş" eylemi yalnız iki sunucu önkoşulu sağlanınca nesneye
    giriyor; kart eylemi olmayan düğmeyi çizmiyor.
  */
  React.useEffect(() => {
    if (!onPortfolyoSatiri || !gomulu || duzenlemeKipi) return;
    if (profilDurumu === 'yukleniyor') {
      onPortfolyoSatiri(undefined);
      return;
    }
    if (!sahibiMi) {
      onPortfolyoSatiri(null);
      return;
    }
    onPortfolyoSatiri({
      kullaniciAdi: profil?.kullaniciAdi ?? null,
      sayaclar,
      sayacDurumu,
      onPaylasimOlustur: yayindaMi && alaniVarMi ? sabitEylemler.paylasimOlustur : undefined,
      onNavigate: sabitEylemler.navigate,
      menu: {
        onPaylas: sabitEylemler.profilBaglantisiPaylas,
        yayindaMi,
        onGorunurluk: sabitEylemler.gorunurluk,
        gorunurlukDurumu: gorunurlukDurumu === 'gonderiliyor' ? 'gonderiliyor' : 'bekliyor',
        onBegendiklerim: sabitEylemler.begendiklerim,
        onKaydedilenler: sabitEylemler.kaydedilenler,
        onArsiv: sabitEylemler.arsiv,
      },
    });
  }, [
    onPortfolyoSatiri,
    gomulu,
    duzenlemeKipi,
    profilDurumu,
    sahibiMi,
    profil?.kullaniciAdi,
    sayaclar,
    sayacDurumu,
    yayindaMi,
    alaniVarMi,
    gorunurlukDurumu,
    sabitEylemler,
  ]);

  /*
    SÖKÜLÜNCE SATIR GERİ ALINIYOR

    `/cv` düzenlemeye geçerken bu paneli söküyor. Çevreleyen ekrandaki
    state temizlenmeseydi, düzenlemeden dönüşte kurulan yeni panel
    satırını gönderene kadar kart ESKİ nesneyi çizerdi: eski sayı ve
    artık var olmayan bir bileşenin `setGorunum`una bağlı, basınca hiçbir
    şey yapmayan bir "Paylaş". `undefined` gidiyor, `null` değil — sökülen
    panel bir hata değil, henüz bilinmeyen bir sonraki yükleme.
  */
  React.useEffect(() => {
    if (!onPortfolyoSatiri || !gomulu || duzenlemeKipi) return;
    return () => onPortfolyoSatiri(undefined);
    /*
      Yalnız sökülürken: bağımlılık verilseydi yukarıdaki effect'in her
      tetiklenişinde önce `undefined` sonra yeni nesne giderdi — aynı
      sonuç için iki yazma.
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------- Çizim

  /*
    Yükleme iskeleti gelecek içeriğin ölçüsünde: düzenleme kipinde form,
    gömülü portfolyoda ızgara, ayrı adreste tam sayfa.
  */
  const iskeletKipi: 'sayfa' | 'panel' | 'form' = duzenlemeKipi
    ? 'form'
    : gomulu
      ? 'panel'
      : 'sayfa';

  /*
    KABUK: SAYFA MI, PANEL Mİ

    Ayrı adreste bu bileşen kendi `main`ini (`SayfaKabugu`) çiziyor.
    Gömülü kipte çevreleyen ekranın `main`i zaten var; ikinci bir `main`
    aynı belgede iki ana bölge demek olurdu ve ekran okuyucu hangisinin
    sayfanın içeriği olduğunu söyleyemezdi.

    Bu bir BİLEŞEN DEĞİL, düz bir fonksiyon: bileşen olsaydı her çizimde
    yeni bir tip üretilir, React ağacı söker ve alt ekranlardaki form
    girdileri her tuşta sıfırlanırdı.

    Geri satırı gömülü kipte de var: alt ekranların (paylaşım oluşturma,
    fotoğraf yükleme, arşiv) kendi adresi yok, geri dönmenin tek yolu bu
    satır.

    Düzenleme kipinin FORMU bu satırı almıyor: oraya `/cv` düzenleme
    dalından giriliyor ve dönüş bağlantısı ("Profilime dön") o ekranın
    sol sütununda zaten duruyor — ikinci bir geri satırı, aynı ekranda
    iki farklı "geri" demek olurdu. Fotoğraf yükleme ekranı formun
    ÜSTÜNE açıldığı için satırı alıyor: oradan dönülecek yer sayfa
    değil, bir üstteki form.
  */
  const kabuk = (icerik: React.ReactNode, onBack?: () => void) =>
    gomulu ? (
      <div className="min-w-0 space-y-3">
        {onBack && (
          <button type="button" onClick={onBack} className={GERI_SATIRI}>
            <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
            Geri
          </button>
        )}
        {icerik}
      </div>
    ) : (
      <SayfaKabugu onBack={onBack}>{icerik}</SayfaKabugu>
    );

  if (!oturumHazir) {
    return kabuk(<ProfilIskeleti kip={iskeletKipi} />);
  }

  /* YETKİSİZ (1): oturum yok. Sosyal profil giriş yapmış kullanıcıya açık. */
  if (!kullaniciId) {
    return kabuk(
      <div className={`${KART} space-y-3 text-center`}>
          <h1 className="text-lg font-extrabold text-gray-900">Sosyal profil için giriş gerekiyor</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Profiller yalnızca giriş yapmış kullanıcılara açık.
          </p>
        {onGirisGerekli && (
          <button type="button" onClick={onGirisGerekli} className={BIRINCIL_EYLEM}>
            Giriş yap
          </button>
        )}
      </div>,
    );
  }

  if (profilDurumu === 'yukleniyor') {
    return kabuk(<ProfilIskeleti kip={iskeletKipi} />);
  }

  /* HATA: boş durumla karıştırılmıyor. */
  if (profilDurumu === 'hata') {
    return kabuk(
      <div className={`${KART} space-y-3 text-center`} role="alert">
        {/*
          Gömülü kipte de `h2` değil `h1` değil — başlık düzeyi sayfanın
          değil bloğun işi. Birleşik ekranda sayfanın `h1`i sol sütundaki
          ada ait; burada `p` yeterli olurdu ama hata bloğunun kendi adı
          okunabilsin diye başlık korunuyor ve gömülü kipte `h2`ye
          iniyor.
        */}
        {gomulu ? (
          <h2 className="text-base font-extrabold text-gray-900">Portfolyon alınamadı</h2>
        ) : (
          <h1 className="text-lg font-extrabold text-gray-900">Profil bilgileri alınamadı</h1>
        )}
        <p className="text-sm leading-relaxed text-gray-600">
          Sunucudan cevap alınamadı. Profilinde bir değişiklik olmadı.
        </p>
        <button
          type="button"
          onClick={() => setProfilDeneme((sayi) => sayi + 1)}
          className={IKINCIL}
        >
          Yeniden dene
        </button>
      </div>,
    );
  }

  /*
    ZİYARETÇİ DALI

    Adresteki ad bu oturuma ait değil. Dört durumun dördü de burada:
    yükleniyor / hazır / hata / yok. "yok" üç ayrı sebebi kapsıyor —
    böyle bir ad yok, profil sana kapalı, farklı alandasınız — ve üçü de
    AYNI güvenli ekrana çıkıyor. Ayrı cümleler adres çubuğunu bir kullanıcı
    adı sözlüğüne çevirirdi.
  */
  if (ziyaretciYolu) {
    if (ziyaretciDurumu === 'yukleniyor') {
      /*
        İSKELET DE HAZIR DURUMLA AYNI GENİŞLİKTE

        İskeletin kendi gerekçesi "içerik gelince sayfa zıplamıyor".
        Aşağıdaki hazır dal `SAYFA_GENISLIGI`ne çıkınca bu iddia genişlik
        ekseninde yanlış hale geldi: iskelet varsayılan `max-w-3xl`te
        çiziliyor, profil gelince kap bir anda site genişliğine atlıyordu.
        İskeletin işi tam olarak gelecek yerleşimin yerini tutmak; değer de
        bu yüzden aynı yerden, `src/lib/duzen`den geliyor.

        Hata kartı bilerek bunun dışında: orada yerini tutacak bir ızgara
        yok, ortalanmış tek bir kart geniş kapta gereksiz yayılırdı.
      */
      return (
        <SayfaKabugu icerikGenisligi={SAYFA_GENISLIGI}>
          <ProfilIskeleti />
        </SayfaKabugu>
      );
    }
    if (ziyaretciDurumu === 'hata') {
      return (
        <SayfaKabugu>
          <div className={`${KART} space-y-3 text-center`} role="alert">
            <h1 className="text-lg font-extrabold text-gray-900">Profil bilgileri alınamadı</h1>
            <p className="text-sm leading-relaxed text-gray-600">
              Sunucudan cevap alınamadı. Yeniden deneyebilirsin.
            </p>
          </div>
        </SayfaKabugu>
      );
    }
    if (ziyaretciDurumu === 'yok') {
      return <GuvenliEkran onNavigate={onNavigate} kendiAdi={profil?.kullaniciAdi ?? null} />;
    }
    if (ziyaretciDurumu === 'hazir' && ziyaretciProfili) {
      return (
        /*
          ZİYARETÇİ PROFİLİ SİTE GENİŞLİĞİNDE

          `SayfaKabugu`nun varsayılanı `max-w-3xl`: uzun metin okuma
          genişliği. Bu ekran metin değil, solda kimlik kartı sağda kare
          ızgara. 3xl'de ölçülen: sol kart ~219 piksel, ızgara hücresi
          ~143 piksel; ad ve rozet truncate oluyordu.

          Sahibin kendi ekranı App'in ana alanında çiziliyor ve orası zaten
          `SAYFA_GENISLIGI`. Aynı tasarımın iki yüzü aynı genişlikte durmak
          zorunda; değer de dosya dosya değil, `src/lib/duzen`de tek yerde.
        */
        <SayfaKabugu icerikGenisligi={SAYFA_GENISLIGI}>
          <SosyalProfilGorunumu
            profil={ziyaretciProfili}
            sahibiMi={false}
            bakanId={kullaniciId}
            onNavigate={onNavigate}
            sayaclar={sayaclar}
            sayacDurumu={sayacDurumu}
            paylasimlar={paylasimlar}
            paylasimDurumu={paylasimDurumu}
            onPaylasimlariYenile={() => setPaylasimDeneme((sayi) => sayi + 1)}
          />
        </SayfaKabugu>
      );
    }
    /* Beklenmeyen ara durum da aynı güvenli ekrana çıkıyor: boş bir sayfa
       ya da farklı bir cümle, hedefe göre değişen bir cevap olurdu. */
    return <GuvenliEkran onNavigate={onNavigate} kendiAdi={profil?.kullaniciAdi ?? null} />;
  }

  /*
    SATIR YOK: KURULUM DEĞİL, DÜRÜST HATA

    Burada `SosyalProfilKurulum` çiziliyordu ve kullanıcı kendi sosyal
    profilini elle kuruyordu. O ekranın sorduğu sorunun karşılığı kalmadı:
    20260926050000 öğrenci kaydı tamamlanınca sosyal profili ve kullanıcı
    adını SUNUCUDA açıyor — ad kayıtta, bölüm öğrenci profilinde.

    Buraya düşmek artık normal bir yol değil, bir ARIZA. İki kip de AYNI
    kutuyu çiziyor (`SosyalProfilHazirDegil`) ve kutu tek yerde tanımlı:
    iki kopya olsaydı biri değiştiğinde aynı arıza iki ekranda iki farklı
    cümleyle okunurdu. Başlık düzeyi farklı çünkü gömülü kipte sayfanın
    `h1`i sol sütundaki ada ait.
  */
  if (!profilTamMi) {
    if (gomulu) {
      return kabuk(
        <SosyalProfilHazirDegil
          altBaslik
          onTamamlandi={() => setProfilDeneme((sayi) => sayi + 1)}
        />,
      );
    }
    if (rotaAdi === null) {
      return kabuk(
        <SosyalProfilHazirDegil onTamamlandi={() => setProfilDeneme((sayi) => sayi + 1)} />,
      );
    }
    /* Profili olmayan kullanıcı başkasının adresine gitmişse: güvenli ekran. */
    return <GuvenliEkran onNavigate={onNavigate} />;
  }

  /*
    YÖNLENDİRME UÇUŞTA — O KARE İÇİN İSKELET

    Ayrı adresteki sahip (hem `/profil` hem `/profil/<kendi adı>`)
    birleşik ekrana gidiyor ve yönlendirme effect içinde. Aradaki tek
    karede iskelet çiziliyor; profil görünümünü çizip hemen kaldırmak,
    kullanıcıya bir kare için görünüp kaybolan bir ekran gösterirdi.

    Gömülü kipte yönlendirme YOK: koşul `!gomulu` ile başlıyor.
  */
  if (!gomulu) {
    return kabuk(<ProfilIskeleti />);
  }

  /*
    YETKİSİZ (2): adresteki ad bu oturuma ait değil.

    Bu satıra artık yalnız gömülü kip ulaşıyor; ayrı adreste sahip
    yukarıda yönlendiriliyor, sahip olmayan da ziyaretçi dalında
    karşılanıyor. Koşul yine de duruyor: `sahibiMi` false iken aşağıdaki
    sahibe özel ekranların hiçbiri DOM'a girmemeli ve bunu bir yorumla
    değil, gerçek bir dalla garanti ediyoruz.
  */
  if (!sahibiMi) {
    return <GuvenliEkran onNavigate={onNavigate} kendiAdi={profil?.kullaniciAdi ?? null} />;
  }

  /*
    DÜZENLEME KİPİ — TEK EKRANIN SOSYAL BÖLÜMÜ

    `/cv` düzenlemeye geçtiğinde sağ sütun bu dalı çiziyor: öğrenci
    bölümlerinin altında, kendi başlıkları ve kendi kaydetme eylemleriyle.

    KAYIT ATOMİK DEĞİL VE ÖYLE GÖSTERİLMİYOR. Öğrenci alanları
    `student_profiles`e, buradaki alanlar `social_profiles`a yazılıyor;
    kullanıcı adı ve fotoğraf ise kendi yazmaları. Tek bir "Kaydet"
    düğmesi tek bir başarı cümlesi iddia ederdi ve yarısı başarılı bir
    gönderimde o cümle YALAN olurdu. Bu yüzden her bloğun kendi
    gönderimi, kendi durumu ve kendi hata satırı var; ortak bir hata
    şeridi yok.

    FOTOĞRAF DA BURADA. Değiştirme ve kaldırma dişli menüsündeydi; ikisi
    de profilin kendisini değiştiriyor, yani düzenlemenin işi. Menüde
    kalsaydı aynı işin iki kapısı olurdu.

    Dal `if (!sahibiMi) return <GuvenliEkran/>` satırından SONRA geliyor:
    başkasının profilinde bu form DOM'a hiç girmiyor. Sunucu tarafı da
    aynı sınırı ikinci kez çiziyor (`avatar_yolu_kilidi`, 20260924040000);
    arayüzde gizlemek tek başına bir güvenlik sınırı olmazdı.
  */
  if (duzenlemeKipi) {
    /*
      Yükleme ekranı kırpma tuvaliyle birlikte geliyor ve formun yanına
      sığmıyor; kendi katmanında açılıyor. Geri satırı burada VAR çünkü
      dönülecek yer sayfanın kendisi değil, bir üstteki form.
    */
    if (gorunum === 'fotograf') {
      return kabuk(
        <ProfilFotografiYukleme
          kullaniciId={kullaniciId}
          ad={profil!.gorunenAd ?? `@${profil!.kullaniciAdi}`}
          mevcutYol={profil!.avatarYolu}
          yedekAdres={ogrenciAvatarAdresi}
          onVazgec={() => setGorunum('profil')}
          onKaydedildi={(yeniYol) => {
            /*
              Yerel durum ancak sunucu `avatar_path`i yazdıktan sonra
              güncelleniyor. İyimser bir güncelleme, kaydedilmemiş bir
              fotoğrafı profilde göstermek olurdu.
            */
            setProfil((onceki) => (onceki ? { ...onceki, avatarYolu: yeniYol } : onceki));
            /*
              Başarısız bir KALDIRMA denemesinin cümlesi burada siliniyor:
              yeni fotoğraf kaydedildikten sonra "fotoğrafın duruyor"
              satırı artık başka bir fotoğrafı anlatırdı.
            */
            setFotografKaldirmaDurumu('bekliyor');
            setGorunum('profil');
            setBildirim('Profil fotoğrafın güncellendi.');
            window.setTimeout(() => setBildirim(null), 2500);
          }}
        />,
        () => setGorunum('profil'),
      );
    }

    /*
      BÖLÜM / ALAN TALEBİ — FORMUN ÜSTÜNDE, KENDİ KATMANINDA

      Formun içine gömülemezdi: `BolumTalebi` kendi `<form>`unu taşıyor ve
      iç içe form geçersiz HTML. Geri satırı VAR çünkü dönülecek yer
      sayfanın kendisi değil, bir üstteki düzenleme formu — fotoğraf
      yükleme ekranıyla aynı kalıp.

      `talepKipi` null'a düştüyse (bölüm ya da alan sunucuda tamamlandı)
      ekran açılmıyor: yapılacak işi kalmamış kullanıcıya talep formu
      göstermek, olmayan bir eksikliği varmış gibi göstermek olurdu.
    */
    if (gorunum === 'talep' && talepKipi) {
      return kabuk(
        <BolumTalebi
          kip={talepKipi}
          kullaniciId={kullaniciId}
          /*
            Kimlik yalnız `alan-tanimsiz` kipinde anlamlı: orada katalog
            satırı VAR ve yönetimin işi ona alan eşlemek. `bolum-yok`
            kipinde eşleşen satır olmadığı için uydurulmuyor.
          */
          bolum={
            talepKipi === 'alan-tanimsiz' && profil!.bolumId && profil!.bolumAdi
              ? { id: profil!.bolumId, ad: profil!.bolumAdi }
              : null
          }
          onGeri={() => setGorunum('profil')}
        />,
        () => setGorunum('profil'),
      );
    }

    return (
      <div className="min-w-0 space-y-4">
        <section aria-labelledby="sosyal-fotograf-basligi" className={`${KART} space-y-3`}>
          {/* Sayfanın `h1`i `/cv` ekranında; bölüm başlıkları `h2`. */}
          <h2
            id="sosyal-fotograf-basligi"
            className="text-base font-extrabold tracking-tight text-gray-900"
          >
            Profil fotoğrafın
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {/*
              Fotoğrafın kendisi çiziliyor, yer tutucu bir daire değil:
              `ProfilFotografi` yol yokken baş harfleri gösteriyor ve
              "fotoğrafın yok" bilgisi de gerçek.
            */}
            <ProfilFotografi
              ad={profil!.gorunenAd ?? `@${profil!.kullaniciAdi}`}
              yol={profil!.avatarYolu}
              /*
                Eski kamera düğmesiyle yüklenmiş fotoğraf yedek: bu blok
                tek yükleme yeri olduğu için, yolu olmayan kullanıcıya
                "fotoğrafın yok" demek YANLIŞ olurdu — fotoğrafı var,
                başka kolonda duruyor.
              */
              yedekAdres={ogrenciAvatarAdresi}
              className="h-16 w-16 shrink-0 rounded-full"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setGorunum('fotograf')} className={IKINCIL}>
                {/*
                  Etiket EKRANDA GÖRÜNENE göre: yedek adresten bir fotoğraf
                  çiziliyorsa yapılacak iş "ekle" değil "değiştir".
                */}
                {profilFotografi(profil!.avatarYolu, ogrenciAvatarAdresi).tur === 'yok'
                  ? 'Fotoğraf ekle'
                  : 'Fotoğrafı değiştir'}
              </button>
              {/*
                Kaldırma yalnız `avatar_path` VARKEN çiziliyor: olmayan bir
                dosyayı silen bir düğme, hiçbir zaman çalışmayacak bir
                eylem sunmak olurdu.

                YEDEK ADRES BU DÜĞMEYİ AÇMIYOR. Kaldırma yalnız
                `avatar_path`i null'a çekiyor; ekranda görünen fotoğraf
                `student_profiles.avatar_url`den geliyorsa düğme hiçbir
                şeyi kaldırmaz ve kullanıcı kaldırılmamış bir fotoğrafı
                kaldırdığını sanırdı.
              */}
              {profil!.avatarYolu && (
                <button
                  type="button"
                  onClick={fotografiKaldir}
                  disabled={fotografKaldirmaDurumu === 'gonderiliyor'}
                  className={`${IKINCIL} disabled:opacity-40`}
                >
                  {fotografKaldirmaDurumu === 'gonderiliyor' ? 'Kaldırılıyor…' : 'Fotoğrafı kaldır'}
                </button>
              )}
            </div>
          </div>

          {/*
            Hata ve bildirim bu bloğun İÇİNDE: fotoğraf yazması ayrı bir
            yazma ve sonucu, aşağıdaki form alanlarının sonucuyla
            karıştırılmamalı.
          */}
          {fotografKaldirmaDurumu === 'hata' && (
            <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
              Profil fotoğrafın kaldırılamadı; fotoğrafın duruyor. Yeniden deneyebilirsin.
            </p>
          )}
          {bildirim && (
            <p role="status" className="text-sm font-semibold text-gray-700">
              {bildirim}
            </p>
          )}
        </section>

        <SosyalProfilDuzenleme
          kullaniciId={kullaniciId}
          profil={profil as SosyalProfil}
          /*
            Kaydettikten sonra ekran KAPANMIYOR: kullanıcı aynı düzenleme
            ekranında, öğrenci bölümlerinin altında duruyor. Yerel satır
            yalnız sunucu kabul ettikten sonra güncelleniyor.
          */
          onKaydedildi={(girdi) =>
            setProfil((onceki) => (onceki ? { ...onceki, ...girdi } : onceki))
          }
          /*
            Ad ayrı bir geri çağrı çünkü ayrı bir yazma:
            `sosyalProfilGuncelle` değil kendi RPC'si. İkisini tek geri
            çağrıda toplamak, hangi yazmanın başarılı olduğunu
            belirsizleştirirdi.
          */
          onKullaniciAdiDegisti={(yeniAd) =>
            setProfil((onceki) => (onceki ? { ...onceki, kullaniciAdi: yeniAd } : onceki))
          }
          /*
            Talep satırı yalnız eksiklik varken çiziliyor; `null` geçince
            bölüm/alan kartında hiçbir ek satır DOM'a girmiyor.
          */
          talepKipi={talepKipi}
          onTalepAc={() => setGorunum('talep')}
        />
      </div>
    );
  }

  /*
    PAYLAŞIM OLUŞTURMA — SAHİP DALININ İÇİNDE

    Bu dal, yukarıdaki `if (!sahibiMi) return <GuvenliEkran/>` satırından
    SONRA geliyor: ziyaretçi bu koda hiç ulaşmıyor ve ekran DOM'a hiç
    girmiyor. Görünürlüğü bir bayrakla gizlemek yetmezdi — gizlenmiş bir
    ekran klavyeyle ve adres durumuyla bulunur.
  */
  if (gorunum === 'paylasimOlustur') {
    return kabuk(
      <PaylasimOlustur
          /*
            Ekran, üyeliği olmayan kullanıcıya "Alan topluluğum" kitlesini
            açmıyor ve sebebini yazarken `/topluluklar` bağlantısı veriyor.
            Gezinme burada zaten var; ikinci bir gezinme kanalı açmak
            yerine aynı fonksiyon geçiyor.
          */
          onNavigate={onNavigate}
          onVazgec={() => setGorunum('profil')}
          onTamamlandi={() => {
            /*
              Bu geri çağrı YALNIZ `sosyal_paylasim_tamamla` döndükten
              sonra çalışıyor; bildirim de o yüzden burada. Daha erken
              bir "paylaşıldı" cümlesi, henüz kimseye görünmeyen bir
              taslağı yayımlanmış göstermek olurdu.
            */
            paylasimlariTazele();
            setGorunum('profil');
            /*
              Cümle "yayımlandı" DEMİYOR: bu üründe "yayın" sözcüğü
              profilin topluluk üyeliğini anlatıyor ve paylaşımın
              eklenmesiyle karıştırılmamalı. Ekran metinleri bu ayrımı
              baştan beri koruyor.
            */
            setBildirim('Paylaşımın eklendi.');
            window.setTimeout(() => setBildirim(null), 2500);
          }}
      />,
      () => setGorunum('profil'),
    );
  }

  /*
    KENDİ LİSTELERİ — ÜÇÜ DE SAHİP DALININ İÇİNDE

    Fotoğraf ve paylaşım ekranlarıyla aynı yerde: `if (!sahibiMi) return
    <GuvenliEkran/>` satırından SONRA. Ekran DOM'a hiç girmiyor, bir
    bayrakla gizlenmiyor. Sunucu tarafı da aynı sınırı ikinci kez
    çiziyor: `post_saves` yalnız satırın sahibine açık, arşiv satırı
    yalnız `author_id = auth.uid()` dalından dönüyor.

    Geri dönüş `onBack` ile profile: geçmişe kayıt eklenmiyor çünkü bu
    ekranların kendi adresi yok — olmayan bir adrese geçmiş yazmak, geri
    tuşunu boş bir sayfaya götürürdü.
  */
  if (gorunum === 'begendiklerim' || gorunum === 'kaydedilenler' || gorunum === 'arsiv') {
    return kabuk(
      <SahipListesi
          kip={
            gorunum === 'begendiklerim' ? 'begeni' : gorunum === 'kaydedilenler' ? 'kayit' : 'arsiv'
          }
          /* Kimlik OTURUMDAN; adresteki kullanıcı adından değil. */
          kullaniciId={kullaniciId}
          /*
            Geri yükleme profil ızgarasını ve "Paylaşım" sayacını
            değiştiriyor. İki sayının aynı ekranda ayrışmaması için ikisi
            de sunucudan yeniden okunuyor; istemcide artırılmıyor.
          */
          onGeriYuklendi={paylasimlariTazele}
      />,
      () => setGorunum('profil'),
    );
  }

  /*
    SAHİBİN PORTFOLYOSU — BİRLEŞİK EKRANIN SAĞ SÜTUNU

    `SosyalProfilGorunumu` burada ÇİZİLMİYOR. O bileşen kimlik alanlarını
    (fotoğraf, ad, kullanıcı adı, alan rozeti, bölüm, biyografi) da
    çiziyor ve birleşik ekranda o bilgilerin hepsi SOL sütunda, profil
    kartında duruyor — ikisini birden çizmek aynı kimliği aynı ekranda iki
    kez göstermek olurdu. Ziyaretçi görünümü (`/profil/<kullaniciadi>`)
    o bileşeni kullanmaya devam ediyor ve kendi sol sütununu KENDİ
    içinde kuruyor: orada kimlik kartı herkese açık alanlardan oluşuyor,
    burada ise sol sütun CV/profil kartı — iki farklı içerik, aynı
    iskelet.

    SAYAÇLAR VE EYLEMLER BURADA DEĞİL

    Sağ sütunun üstünde "N Paylaşım · N Bağlantı", "Paylaş" ve dişli
    menüsü duruyordu (`PortfolyoUstSatiri`). Sol sütundaki kimlik kartı
    zaten üç sayaç ve bir eylem satırı çiziyor; aynı ekranda iki ayrı
    sayaç şeridi ve iki ayrı eylem bölgesi vardı. İkisi tek şeride ve tek
    eylem alanına indi — kartın içine. Veri buradan gidiyor
    (`onPortfolyoSatiri`); sağ sütun doğrudan ızgarayla başlıyor.

    SIRA: (gerekiyorsa) eksik eylemin açıklaması, hata cümleleri ve
    bildirim, sonra ızgara. Açıklama ızgaranın ÜSTÜNDE çünkü "Paylaş"
    düğmesinin neden olmadığını o anlatıyor; altta kalsaydı boş ızgaranın
    arkasına düşerdi.

    Izgara `gorunum="sade"`: hücre çıplak kare fotoğraf. Açıklama ve tarih
    ayrıntı katmanında (`PaylasimDetayi`) duruyor ve o katman ızgaranın
    kendi içinden açılıyor — beğeni, kaydetme ve arşivleme orada zaten
    çalışıyor.
  */
  return kabuk(
    <section aria-labelledby="portfolyo-basligi" className="min-w-0 space-y-3">
      {/*
        Bölümün adı ekranda YAZILI DEĞİL: sağ sütunda ızgaranın üstünde
        bir başlık, sol sütundaki kartla aynı hizada durmuyordu ve iki
        sütunlu düzende ikinci bir "başlık" gibi okunuyordu. Ad ekran
        okuyucu için duruyor — bölümün nerede başladığı klavye ve okuyucu
        araçlarında hâlâ belli.
      */}
      <h2 id="portfolyo-basligi" className="sr-only">
        Fotoğraf portfolyon
      </h2>

      {/*
        "TOPLULUĞA KATILMADIN" UYARISI KALDIRILDI

        Kutu `yayinda_mi` false iken çiziliyor ve "Alan topluluğuna henüz
        katılmadın" diyordu. O cümle artık YANLIŞ: aynı kolon bugün yalnız
        profil görünürlüğünü anlatıyor (20260926040000) ve üyelik ayrı bir
        tabloda. Katılma eyleminin yeri de değişti — kendi ekranı var
        (`/topluluklar`). Kutuyu "profilin kapalı" diye yeniden yazmak,
        kullanıcının kendi açtığı bir ayarı her açılışta uyarıya
        çevirirdi; durum zaten dişli menüsündeki satırın etiketinde
        yazıyor.

        GÖRÜNÜRLÜK HATASI TEK CÜMLEYE İNDİ

        Eskiden iki dal vardı: katılma hatasını kutu, ayrılma hatasını
        aşağıdaki satır anlatıyordu. Kutu kalkınca iki yön de tek yerden
        bildiriliyor — sessiz başarısızlık başarı gibi okunurdu.
      */}
      {gorunurlukDurumu === 'hata' && (
        <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
          Profilinin görünürlüğü değiştirilemedi; eski ayarın duruyor. Yeniden deneyebilirsin.
        </p>
      )}

      {/*
        Cümle bir UYARI değil, eksik bir eylemin açıklaması: `role="alert"`
        yerine `role="status"` ve nötr ton. Kırmızı bu üründe hata ve
        reddedilme demek; kendi profilinde eksik bir alanı olan kullanıcı
        bir şeyi yanlış yapmış değil.
      */}
      {paylasimEngeli && (
        <p role="status" className={`${KART} text-sm leading-relaxed text-gray-600`}>
          {paylasimEngeli}
        </p>
      )}

      {bildirim && (
        <p role="status" className="text-sm font-semibold text-gray-700">
          {bildirim}
        </p>
      )}

      <PaylasimIzgarasi
        paylasimlar={paylasimlar}
        durum={paylasimDurumu}
        onYenidenDene={() => setPaylasimDeneme((sayi) => sayi + 1)}
        sahibiMi
        onArsivlendi={paylasimlariTazele}
        gorunum="sade"
        kullaniciAdi={profil?.kullaniciAdi ?? null}
      />
    </section>,
  );
};

/**
 * GÜVENLİ EKRAN
 *
 * Hedefe göre DEĞİŞMİYOR: var olmayan bir kullanıcı adı da, var olan
 * başka birinin adı da bu ekranı gösteriyor. Metin "böyle bir kullanıcı
 * yok" demiyor — o cümle, adres çubuğunu kullanıcı adı sözlüğüne
 * çevirirdi.
 *
 * Alt bağlantı yalnız BAKAN kişiye ait bilgiye dayanıyor (kendi profili
 * kurulu mu), hedefe değil; dolayısıyla bir şey sızdırmıyor.
 */
const GuvenliEkran: React.FC<{
  /** `degistir` geçmişe kayıt eklemeden adresi değiştiriyor; bkz. App.tsx. */
  onNavigate: (yol: string, secenek?: { degistir?: boolean }) => void;
  kendiAdi?: string | null;
}> = ({ onNavigate, kendiAdi }) => {
  /*
    Kendi profili KURULUYSA hedef birleşik ekran, değilse kurulum kısa
    yolu. `profilYolu(kendiAdi)` de aynı yere çıkardı ama bir yönlendirme
    daha üzerinden: sahip için `/profil/<ad>` artık `/cv`ye replace ile
    gidiyor.
  */
  const hedef = kendiAdi ? BIRLESIK_EKRAN : '/profil';
  return (
    <SayfaKabugu>
      <div className={`${KART} space-y-3 text-center`}>
        <h1 className="text-lg font-extrabold text-gray-900">Bu profil şu anda görüntülenemiyor</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Adres yanlış olabilir ya da bu profil sana kapalı olabilir.
        </p>
        <a
          href={hedef}
          onClick={(olay) => {
            if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
              return;
            olay.preventDefault();
            onNavigate(hedef);
          }}
          className={IKINCIL}
        >
          Kendi profiline git
        </a>
      </div>
    </SayfaKabugu>
  );
};
