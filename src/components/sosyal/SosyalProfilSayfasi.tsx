import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SayfaKabugu } from '../SayfaKabugu';
import { SAYFA_GENISLIGI } from '../../lib/duzen';
import { BIRINCIL_EYLEM, ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import {
  kendiSosyalProfiliGetir,
  paylasimlariGetir,
  profilFotografiKaldir,
  sosyalProfilGorunurluguAyarla,
  sosyalProfilKimligiGetir,
  sosyalProfiliGetir,
  sosyalSayaclariGetir,
  type SosyalBolum,
  type SosyalPaylasim,
  type SosyalProfil,
  type SosyalSayaclar,
} from '../../lib/queries/sosyal';
import { kullaniciAdiNormalize, profilYolu } from '../../lib/sosyal-kullanici-adi.mjs';
import { BolumTalebi, type TalepKipi } from './BolumTalebi';
import { PaylasimIzgarasi } from './PaylasimIzgarasi';
import { PaylasimOlustur } from './PaylasimOlustur';
import { PortfolyoUstSatiri } from './PortfolyoUstSatiri';
import { ProfilFotografiYukleme } from './ProfilFotografiYukleme';
import { SahipListesi } from './SahipListesi';
import { SosyalProfilDuzenleme } from './SosyalProfilDuzenleme';
import { SosyalProfilGorunumu } from './SosyalProfilGorunumu';
import { SosyalProfilKurulum } from './SosyalProfilKurulum';
import { TopluluktaDegilUyarisi } from './TopluluktaDegilUyarisi';

/**
 * SOSYAL PROFİL ROTASI — VERİ YÜKLEME VE YETKİ
 *
 * Bu bileşen görünüm çizmiyor, DURUM belirliyor: kim bakıyor, veri geldi
 * mi, sahibi mi. Ziyaretçi sunumu `SosyalProfilGorunumu` içinde, sahibin
 * birleşik ekrandaki portfolyosu ise `PortfolyoUstSatiri` + sade ızgara.
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
 *   boş          kurulum ekranı (profil yok) ya da dürüst boş ızgara
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
type Gorunum =
  | 'profil'
  | 'duzenle'
  | 'paylasimOlustur'
  | 'fotograf'
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
   *   2. Sahip görünümü `SosyalProfilGorunumu` yerine portfolyo üst
   *      satırı + sade ızgara: kimlik alanları (fotoğraf, ad, alan,
   *      biyografi) sol sütundaki profil kartında zaten duruyor.
   *   3. Adreste kullanıcı adı YOK. Sahiplik zaten adresten değil,
   *      `profile_id = auth.uid()` karşılaştırmasından okunuyordu;
   *      gömülü kipte adres karşılaştırması tamamen düşüyor.
   */
  gomulu?: boolean;
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
 * Üst blok + ızgara ölçüsünde iskelet: içerik gelince sayfa zıplamıyor.
 *
 * `sade` gömülü kip için: orada kimlik alanları (fotoğraf, ad, alan)
 * SOL sütunda çiziliyor ve sağ sütunda onların iskeletini göstermek,
 * gelmeyecek bir bloğun yerini ayırmak olurdu — içerik gelince panel
 * yukarı zıplardı.
 */
const ProfilIskeleti: React.FC<{ sade?: boolean }> = ({ sade = false }) =>
  sade ? (
    <div aria-busy="true" className="space-y-3">
      <div className="flex gap-5">
        <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-gray-100" />
        <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-gray-100" />
      </div>
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
}) => {
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
    TALEP EKRANI KURULUMUN İÇİNDE DEĞİL, ONUN YERİNE ÇİZİLİYOR

    Kullanıcının "bölümüm listede yok" ya da "bölümümün alanı tanımlı
    değil" durumunda yapacağı iş formu doldurmak değil, talep açmak.
    Kurulum formunun altına ikinci bir form koymak, iki farklı gönderimi
    aynı ekranda yan yana getirirdi.
  */
  const [talep, setTalep] = React.useState<{ kip: TalepKipi; bolum: SosyalBolum | null } | null>(
    null,
  );

  /* Ziyaretçi yolu: rotadaki ad başkasına aitse bu durumlar kullanılıyor. */
  const [ziyaretciProfili, setZiyaretciProfili] = React.useState<SosyalProfil | null>(null);
  const [ziyaretciDurumu, setZiyaretciDurumu] = React.useState<
    'yukleniyor' | 'hazir' | 'hata' | 'yok'
  >('yukleniyor');

  const rotaAdi = rotaKullaniciAdi ? kullaniciAdiNormalize(rotaKullaniciAdi) : null;

  /* Kendi profili: oturum kimliği ile satırın sahibi eşleşiyor mu. */
  const profilTamMi = Boolean(profil?.kullaniciAdi && profil?.sektorId);
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

  React.useEffect(() => {
    if (!gosterilenProfil) return;
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
  }, [gosterilenProfil, profilDeneme, sayacDeneme]);

  React.useEffect(() => {
    if (!gosterilenProfil) return;
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
  }, [gosterilenProfil, paylasimDeneme]);

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
      setBildirim(yeniDeger ? 'Alan topluluğuna katıldın.' : 'Alan topluluğundan ayrıldın.');
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

  // ------------------------------------------------------------- Çizim

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
    arşiv, düzenleme) kendi adresi yok, geri dönmenin tek yolu bu satır.
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
    return kabuk(<ProfilIskeleti sade={gomulu} />);
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
    return kabuk(<ProfilIskeleti sade={gomulu} />);
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

  /* KURULMAMIŞ: `/profil` kurulum ekranını ya da talep ekranını açıyor. */
  if (!profilTamMi) {
    /*
      GÖMÜLÜ KİPTE KURULUM BURADA DEĞİL, KENDİ ADRESİNDE

      Sağ sütuna çizilen şey gerçek kurulum akışına giden bir GİRİŞ:
      bağlantı `/profil` adresine gidiyor ve orada `SosyalProfilKurulum`
      açılıyor. "Yakında" kutusu ya da çalışmayan bir düğme değil.

      Form buraya gömülmedi çünkü kurulum bölüm seçimi, alan uygunluğu ve
      gerektiğinde bölüm talebi ekranını da içeriyor; hepsini 8 sütunluk
      bir panele sıkıştırmak, aynı formu iki farklı genişlikte iki kez
      tasarlamak olurdu.

      Gerçek `<a href>`: orta tuş ve "yeni sekmede aç" çalışıyor.
    */
    if (gomulu) {
      return kabuk(
        <div className={`${KART} space-y-3`}>
          <h2 className="text-base font-extrabold text-gray-900">Sosyal profilin yok</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Fotoğraf paylaşmak ve aynı alandaki öğrencilerle bağlantı kurmak için önce kullanıcı
            adını ve bölümünü seçmen gerekiyor.
          </p>
          <a
            href="/profil"
            onClick={(olay) => {
              if (
                olay.metaKey ||
                olay.ctrlKey ||
                olay.shiftKey ||
                olay.altKey ||
                olay.button !== 0
              )
                return;
              olay.preventDefault();
              onNavigate('/profil');
            }}
            className={BIRINCIL_EYLEM}
          >
            Sosyal profil oluştur
          </a>
        </div>,
      );
    }
    if (rotaAdi === null) {
      if (talep) {
        return kabuk(
          <BolumTalebi
            kip={talep.kip}
            kullaniciId={kullaniciId}
            bolum={talep.bolum}
            onGeri={() => setTalep(null)}
          />,
          () => setTalep(null),
        );
      }
      return kabuk(
        <SosyalProfilKurulum
            onTalepGerekli={(kip, bolum) => setTalep({ kip, bolum })}
            /* Kullanıcı adı ARTIK KULLANILMIYOR: hedef her durumda `/cv`. */
            onTamamlandi={() => {
              /*
                Kurulumdan sonra profil YENİDEN OKUNUYOR: ekranda gösterilen
                değerler formdakiler değil, veritabanının kabul ettikleri
                olmalı.
              */
              setProfilDeneme((sayi) => sayi + 1);
              /*
                Kurulum ekranı geçmişte BIRAKILMIYOR: profil kurulduktan
                sonra geri tuşuyla ona dönmenin bir karşılığı yok, dönen
                kullanıcı da anında ileri yönlendirilirdi.

                Hedef `ad` DEĞİL, birleşik ekran: kurulumu bitiren kişi
                sahibin kendisi ve sahibin tek ekranı orası. Kalıcı
                `/profil/<ad>` adresine gitseydi o adres de anında `/cv`ye
                yönlendirir, yani iki kere yönlendirme yapardık.
              */
              onNavigate(BIRLESIK_EKRAN, { degistir: true });
            }}
        />,
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
    PAYLAŞIM OLUŞTURMA — SAHİP DALININ İÇİNDE

    Bu dal, yukarıdaki `if (!sahibiMi) return <GuvenliEkran/>` satırından
    SONRA geliyor: ziyaretçi bu koda hiç ulaşmıyor ve ekran DOM'a hiç
    girmiyor. Görünürlüğü bir bayrakla gizlemek yetmezdi — gizlenmiş bir
    ekran klavyeyle ve adres durumuyla bulunur.
  */
  if (gorunum === 'paylasimOlustur') {
    return kabuk(
      <PaylasimOlustur
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
    PROFİL FOTOĞRAFI — AYNI SAHİP DALININ İÇİNDE

    Paylaşım oluşturma gibi, bu dal da `if (!sahibiMi) return
    <GuvenliEkran/>` satırından SONRA geliyor: başkasının profilinde
    ekran DOM'a hiç girmiyor. Sunucu tarafı da aynı sınırı ikinci kez
    çiziyor (`avatar_yolu_kilidi`, 20260924040000); arayüzde gizlemek
    tek başına bir güvenlik sınırı olmazdı.
  */
  if (gorunum === 'fotograf') {
    return kabuk(
      <ProfilFotografiYukleme
          kullaniciId={kullaniciId}
          ad={profil!.gorunenAd ?? `@${profil!.kullaniciAdi}`}
          mevcutYol={profil!.avatarYolu}
          onVazgec={() => setGorunum('profil')}
          onKaydedildi={(yeniYol) => {
            /*
              Yerel durum ancak sunucu `avatar_path`i yazdıktan sonra
              güncelleniyor; geri çağrı da yalnız o dalda çalışıyor.
              İyimser bir güncelleme, kaydedilmemiş bir fotoğrafı
              profilde göstermek olurdu.
            */
            setProfil((onceki) => (onceki ? { ...onceki, avatarYolu: yeniYol } : onceki));
            /*
              Başarısız bir KALDIRMA denemesinin cümlesi burada
              siliniyor: yeni fotoğraf kaydedildikten sonra "fotoğrafın
              duruyor" satırı artık başka bir fotoğrafı anlatırdı.
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

  if (gorunum === 'duzenle') {
    return kabuk(
      <SosyalProfilDuzenleme
          kullaniciId={kullaniciId}
          profil={profil as SosyalProfil}
          onVazgec={() => setGorunum('profil')}
          onKaydedildi={(girdi) => {
            setProfil((onceki) => (onceki ? { ...onceki, ...girdi } : onceki));
            setGorunum('profil');
          }}
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

    SIRA: sayaçlar + eylemler, sonra (gerekiyorsa) topluluk uyarısı, sonra
    hata cümleleri ve bildirim, en sonda ızgara. Uyarı ızgaranın ÜSTÜNDE
    çünkü "Paylaş" düğmesinin neden olmadığını o anlatıyor; altta kalsaydı
    boş ızgaranın arkasına düşerdi.

    Izgara `gorunum="sade"`: hücre çıplak kare fotoğraf. Açıklama ve tarih
    ayrıntı katmanında (`PaylasimDetayi`) duruyor ve o katman ızgaranın
    kendi içinden açılıyor — beğeni, kaydetme ve arşivleme orada zaten
    çalışıyor.
  */
  return kabuk(
    <section aria-labelledby="portfolyo-basligi" className="space-y-3">
      {/*
        Bölümün adı ekranda YAZILI DEĞİL: sağ sütunda sayaçların üstünde
        bir başlık, sol sütundaki kartla aynı hizada durmuyordu ve iki
        sütunlu düzende ikinci bir "başlık" gibi okunuyordu. Ad ekran
        okuyucu için duruyor — bölümün nerede başladığı klavye ve okuyucu
        araçlarında hâlâ belli.
      */}
      <h2 id="portfolyo-basligi" className="sr-only">
        Fotoğraf portfolyon
      </h2>

      <PortfolyoUstSatiri
        sayaclar={sayaclar}
        sayacDurumu={sayacDurumu}
        yayindaMi={profil!.yayindaMi}
        avatarVarMi={Boolean(profil!.avatarYolu)}
        onPaylasimOlustur={() => setGorunum('paylasimOlustur')}
        onProfilBaglantisiPaylas={paylas}
        onGorunurluk={() => gorunurlukDegistir(!profil!.yayindaMi)}
        gorunurlukDurumu={gorunurlukDurumu === 'gonderiliyor' ? 'gonderiliyor' : 'bekliyor'}
        onDuzenle={() => setGorunum('duzenle')}
        onFotografDegistir={() => setGorunum('fotograf')}
        onFotografKaldir={fotografiKaldir}
        fotografDurumu={fotografKaldirmaDurumu === 'gonderiliyor' ? 'gonderiliyor' : 'bekliyor'}
        onBegendiklerim={() => setGorunum('begendiklerim')}
        onKaydedilenler={() => setGorunum('kaydedilenler')}
        onArsiv={() => setGorunum('arsiv')}
        onNavigate={onNavigate}
      />

      {!profil!.yayindaMi && (
        <TopluluktaDegilUyarisi
          onYayimla={() => gorunurlukDegistir(true)}
          durum={gorunurlukDurumu}
        />
      )}

      {/*
        TOPLULUKTAN AYRILMA HATASI AYRI BİR CÜMLE

        Katılma hatasını yukarıdaki kutu anlatıyor ama o kutu kullanıcı
        TOPLULUKTAYKEN hiç çizilmiyor. Cümle olmasaydı başarısız bir
        "Topluluktan ayrıl" hiçbir iz bırakmaz, kullanıcı olmamış bir işi
        olmuş sanardı — sessiz başarısızlık başarı gibi okunur.
      */}
      {profil!.yayindaMi && gorunurlukDurumu === 'hata' && (
        <p role="alert" className="text-xs font-semibold leading-relaxed text-rose-700">
          Alan topluluğundan ayrılamadın; hâlâ topluluktasın. Yeniden deneyebilirsin.
        </p>
      )}

      {/* Menü tıklandığı anda kapanıyor; kaldırma hatası bu yüzden burada. */}
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

      <PaylasimIzgarasi
        paylasimlar={paylasimlar}
        durum={paylasimDurumu}
        onYenidenDene={() => setPaylasimDeneme((sayi) => sayi + 1)}
        sahibiMi
        onArsivlendi={paylasimlariTazele}
        gorunum="sade"
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
