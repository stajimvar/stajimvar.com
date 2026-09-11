import React from 'react';
import { createPortal } from 'react-dom';
import { Archive, Bookmark, Camera, Eye, EyeOff, Heart, Link2, Pencil, Settings, Trash2 } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';

/**
 * PROFİL DİŞLİSİ — YALNIZ SAHİBİNE
 *
 * Bileşen ziyaretçi için hiç çağrılmıyor: `sahibiMi` yanlışsa çağıran
 * taraf bunu ağaca HİÇ koymuyor. Menüyü CSS ile gizlemek yetmezdi —
 * gizlenmiş bir menü DOM içinde durur, klavyeyle ve okuyucu araçlarıyla
 * bulunur ve sahibe özel eylemlerin adlarını sızdırır.
 *
 * NEDEN İKİ AYRI SUNUM
 * --------------------
 * Masaüstünde açılır menü tetikleyicinin yanında duruyor; telefonda aynı
 * kutu ekranın sağ üstünde kalır ve başparmakla ulaşılmaz. Mobilde alttan
 * açılan panel kullanılıyor — depoda zaten var olan kalıp (AccountSheet).
 *
 * İkisi AYNI ANDA ÇİZİLMİYOR. `hidden lg:block` ile iki kopya bırakmak,
 * aynı eylemleri iki kez tanımlamak ve alttan açılan panelin odak
 * tuzağını masaüstünde de kurmak olurdu (odak, görünmeyen panele kaçardı).
 * Bu yüzden hangi sunumun çizileceğine `matchMedia` karar veriyor.
 *
 * MENÜDE NE VAR, NE YOK
 * ---------------------
 * Çizilen satırlar:
 *   Profil bağlantısını paylaş  istemci tarafı; altyapı gerektirmiyor
 *   Profil fotoğrafını değiştir / ekle  ayrı bir ekran açıyor; etiket
 *                    duruma göre değişiyor, fotoğrafı olmayan kullanıcı
 *                    "değiştir" diye bir eylem görmüyor
 *   Profil fotoğrafını kaldır  YALNIZ fotoğraf varken; `avatar_path`i
 *                    null'a çeken gerçek bir sorgu
 *   Profili gizle / Profili herkese aç  tek kolonu (`yayinda_mi`) yazan
 *                    gerçek bir sorgu; çift yönlü olduğu için menüde
 *                    duruyor ve başka girişi yok.
 *
 * GÖRÜNÜRLÜK SATIRI ÜYELİK DEĞİL
 * ------------------------------
 * Satırın etiketi "Topluluğa katıl / Topluluktan ayrıl" idi ve o zaman
 * doğruydu: `yayinda_mi` üyeliği de anlatıyordu. 20260926040000 üç
 * kavramı ayırdı — kolon artık yalnız "profilim giriş yapmış herkese açık
 * mı" demek, üyelik ise `community_members` tablosunda ve kendi ekranında
 * (`/topluluklar`). Eski etiket kalsaydı, profilini gizlemek isteyen
 * kullanıcı topluluğundan çıktığını sanırdı; oysa üyeliğine bu satır hiç
 * dokunmuyor. Katıl/ayrıl eylemi de bu yüzden menüden KALKTI, ikinci bir
 * giriş olarak bırakılmadı.
 *
 * FOTOĞRAF EYLEMLERİ NEDEN BURAYA TAŞINDI
 * ---------------------------------------
 * "Fotoğrafı değiştir" profil başlığında AYRI bir düğmeydi ve başlıkta
 * zaten üç düğme (paylaşım, düzenleme, fotoğraf) alt alta duruyordu;
 * telefonda üst blok bunlarla dolup ızgarayı ekranın dışına itiyordu.
 * Düğme başlıktan KALDIRILDI, kopyalanmadı: aynı eylemin iki girişi
 * olsaydı biri değiştiğinde öteki geride kalır ve hangisinin ne yaptığı
 * sorulurdu. Masaüstü ve telefon aynı `ogeler` dizisinden besleniyor,
 * yani "tek yer" iki sunumda da tek kod yolu.
 *
 * Satırların eklenmesi yapıyı değiştirmedi: açılır menü / alttan panel,
 * odak tuzağı, Esc ve odağın tetikleyiciye dönmesi aynı kalıp.
 *
 *   Beğendiklerim / Kaydedilenler / Arşiv  üçü de OTURUM SAHİBİNİN kendi
 *                    listesi ve üçünün de arka ucu artık tam: beğen ve
 *                    kaydet düğmeleri paylaşımın ayrıntı katmanında,
 *                    arşivden geri yükleme ise arşiv ekranında. Satırlar
 *                    yalnız çağıran taraf eylemi VERDİĞİNDE diziye
 *                    giriyor; menü de yalnız `sahibiMi` dalında ağaca
 *                    giriyor
 *
 *   Sosyal profili düzenle  KOŞULLU ve yalnız birleşik ekranda (`/cv`)
 *                    veriliyor. Bir süre menüde HİÇ yoktu çünkü eylem
 *                    profil sunumunun üst bloğundaki ana düğmedeydi ve
 *                    aynı işin iki girişi, hangisinin ne yaptığı
 *                    sorusunu doğuruyordu. Birleşik ekranda o üst blok
 *                    çizilmiyor (kimlik alanları sol sütunda) — düğme
 *                    menüye TAŞINDI, kopyalanmadı: `SosyalProfilGorunumu`
 *                    eylemi vermiyor, satır orada diziye hiç girmiyor
 *
 * Çizilmeyenler ve sebepleri:
 *   Öne çıkanlar     `highlights` tablosu YOK (göçte açıkça ertelendi)
 *   Bağlantılar      bağlantı akışı bu aşamada yok
 */

/*
  `disabled:` dalı depodaki kalıpla aynı (opacity-60): kilitli öğe hem
  görünüyor hem tıklanamadığı belli oluyor. Öğeyi tamamen kaldırmak, işlem
  sürerken menünün satır sayısını değiştirir ve odağı kaydırırdı.
*/
const MENU_OGESI = `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-default disabled:opacity-60 ${RENK_GECISI} ${ODAK_HALKASI}`;

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ProfilAyarMenusuProps {
  onPaylas: () => void;
  /**
   * `yayinda_mi` — PROFİL GÖRÜNÜRLÜĞÜ, topluluk üyeliği DEĞİL.
   *
   * Satırın yönünü belirliyor: profil açıksa gizleme, kapalıysa açma.
   * Kolonun anlamı 20260926040000 ile daraldı; üyelik `community_members`
   * tablosunda ve `/topluluklar` ekranında.
   */
  yayindaMi: boolean;
  onGorunurluk: () => void;
  /** 'gonderiliyor' iken satır kilitli; çift tıklama ikinci istek atmıyor. */
  gorunurlukDurumu?: 'bekliyor' | 'gonderiliyor';
  /** Fotoğraf ekranını açıyor. Verilmezse satır DOM'a hiç girmiyor. */
  onFotografDegistir?: () => void;
  /**
   * Şu anda fotoğraf var mı — `social_profiles.avatar_path` dolu mu.
   *
   * Hem "değiştir/ekle" etiketini hem KALDIRMA satırının varlığını
   * belirliyor: olmayan bir fotoğrafı kaldırmayı öneren satır, her
   * basışta hiçbir şey yapmayan bir eylem olurdu.
   */
  avatarVarMi?: boolean;
  onFotografKaldir?: () => void;
  /** 'gonderiliyor' iken kaldırma satırı kilitli. */
  fotografDurumu?: 'bekliyor' | 'gonderiliyor';
  /**
   * Oturum sahibinin KENDİ listeleri.
   *
   * Üçü de yalnız sahip dalında veriliyor; verilmeyen satır diziye HİÇ
   * girmiyor. `disabled` bırakılsaydı, hiçbir zaman çalışmayacak bir
   * eylemin adı ekranda kalırdı — üstelik bu adlar bir yetki durumunu
   * ("burada bir arşiv var") anlatıyor.
   */
  onBegendiklerim?: () => void;
  onKaydedilenler?: () => void;
  onArsiv?: () => void;
  /**
   * Sosyal profil düzenleme ekranı.
   *
   * Bu satır menüde BİLEREK YOKTU: eylem profil sunumunun üst bloğunda
   * ayrı bir düğmeydi ve aynı işin iki girişi olsaydı biri değiştiğinde
   * öteki geride kalırdı. Birleşik ekranda (`/cv`) o üst blok hiç
   * çizilmiyor — kimlik alanları sol sütundaki profil kartında duruyor —
   * yani düğmenin evi kalmadı. Satır bu yüzden KOŞULLU: eylemi veren
   * çağıran (birleşik ekran) görüyor, üst bloğu çizen çağıran
   * (`SosyalProfilGorunumu`) vermiyor ve satır diziye hiç girmiyor.
   */
  onDuzenle?: () => void;
}

interface Oge {
  anahtar: string;
  etiket: string;
  ikon: React.ReactNode;
  calistir: () => void;
  /** Kilitli öğe `disabled`; odak sırasından da kendiliğinden çıkıyor. */
  pasif?: boolean;
}

/**
 * Geniş ekran mı?
 *
 * Varsayılan `false`: ilk çizimde mobil sunum seçiliyor. Tersi olsaydı
 * telefonda önce açılır menü çizilip hemen panele dönerdi.
 */
function useGenisEkran(): boolean {
  const [genis, setGenis] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    /* Tailwind `lg` kırılımı 1024px; sunum kararı da aynı yerden. */
    const sorgu = window.matchMedia('(min-width: 1024px)');
    const uygula = () => setGenis(sorgu.matches);
    uygula();
    sorgu.addEventListener('change', uygula);
    return () => sorgu.removeEventListener('change', uygula);
  }, []);

  return genis;
}

export const ProfilAyarMenusu: React.FC<ProfilAyarMenusuProps> = ({
  onPaylas,
  yayindaMi,
  onGorunurluk,
  gorunurlukDurumu = 'bekliyor',
  onFotografDegistir,
  avatarVarMi = false,
  onFotografKaldir,
  fotografDurumu = 'bekliyor',
  onBegendiklerim,
  onKaydedilenler,
  onArsiv,
  onDuzenle,
}) => {
  const [acik, setAcik] = React.useState(false);
  const [monte, setMonte] = React.useState(false);
  const genisEkran = useGenisEkran();
  const tetikRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMonte(true);
  }, []);

  /*
    ETİKET DURUMU OLDUĞU GİBİ SÖYLÜYOR

    Açık profilde "Profili herkese aç" yazsaydı satır, olmayan bir durumu
    anlatırdı. Gönderim sırasındaki metin de ayrı: kilitli bir düğmenin
    neden tıklanmadığını yalnız görsel solukluk anlatamaz.

    ETİKET ÜYELİĞİ DEĞİL GÖRÜNÜRLÜĞÜ SÖYLÜYOR: "Topluluğa katıl /
    Topluluktan ayrıl" yazıyordu ve o cümle bugün yanlış — satır
    `yayinda_mi` kolonunu yazıyor, o kolon da 20260926040000'den beri
    yalnız profilin herkese açık olup olmadığını anlatıyor.

    Gönderim etiketleri KISA: menü kutusu `w-64` sabit genişlikte ve daha
    uzun bir cümle ikinci satıra düşerdi.
  */
  const gorunurlukGonderiliyor = gorunurlukDurumu === 'gonderiliyor';
  const gorunurlukEtiketi = yayindaMi
    ? gorunurlukGonderiliyor
      ? 'Gizleniyor…'
      : 'Profili gizle'
    : gorunurlukGonderiliyor
      ? 'Açılıyor…'
      : 'Profili herkese aç';

  /*
    KALDIRMA SATIRI DA DURUMU OLDUĞU GİBİ SÖYLÜYOR

    Gönderim sırasında etiket değişiyor ve satır kilitli: `avatar_path`
    null'a çekilene kadar fotoğraf hâlâ duruyor ve menü bunun tersini
    ima etmemeli.
  */
  const fotografGonderiliyor = fotografDurumu === 'gonderiliyor';

  const ogeler: Oge[] = [
    {
      anahtar: 'paylas',
      etiket: 'Profil bağlantısını paylaş',
      ikon: <Link2 aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />,
      calistir: onPaylas,
    },
    /*
      Düzenleme satırı da koşullu ve fotoğraf satırlarının ÜSTÜNDE:
      ikisi de profilin kendisini değiştiriyor, aynı işin yakınlığına
      göre yan yana duruyorlar.
    */
    ...(onDuzenle
      ? [
          {
            anahtar: 'duzenle',
            etiket: 'Sosyal profili düzenle',
            ikon: <Pencil aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />,
            calistir: onDuzenle,
          },
        ]
      : []),
    /*
      Fotoğraf satırları koşullu: eylem verilmediğinde ya da fotoğraf
      olmadığında DİZİYE HİÇ GİRMİYORLAR. `disabled` bırakmak, kullanıcıya
      hiçbir zaman çalışmayacak bir eylemin adını göstermek olurdu.
    */
    ...(onFotografDegistir
      ? [
          {
            anahtar: 'fotograf',
            etiket: avatarVarMi ? 'Profil fotoğrafını değiştir' : 'Profil fotoğrafı ekle',
            ikon: <Camera aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />,
            calistir: onFotografDegistir,
          },
        ]
      : []),
    ...(avatarVarMi && onFotografKaldir
      ? [
          {
            anahtar: 'fotograf-kaldir',
            /*
              Gönderim etiketi kısa: menü kutusu `w-64` sabit genişlikte
              ve daha uzun bir cümle ikinci satıra düşerdi — satır boyu
              değiştiğinde altındaki öğeler de kayar.
            */
            etiket: fotografGonderiliyor ? 'Kaldırılıyor…' : 'Profil fotoğrafını kaldır',
            ikon: <Trash2 aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />,
            calistir: onFotografKaldir,
            pasif: fotografGonderiliyor,
          },
        ]
      : []),
    /*
      KENDİ LİSTELERİ — ÜÇÜ DE KOŞULLU

      Satır ancak eylem verildiğinde çiziliyor ve eylem yalnız sahip
      dalında veriliyor. Sıra kullanım sıklığına göre değil, aynı işin
      yakınlığına göre: iki etkileşim listesi yan yana, arşiv en sonda —
      arşiv paylaşımın kendi durumunu değiştiren tek liste.
    */
    ...(onBegendiklerim
      ? [
          {
            anahtar: 'begendiklerim',
            etiket: 'Beğendiklerim',
            ikon: <Heart aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />,
            calistir: onBegendiklerim,
          },
        ]
      : []),
    ...(onKaydedilenler
      ? [
          {
            anahtar: 'kaydedilenler',
            etiket: 'Kaydedilenler',
            ikon: <Bookmark aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />,
            calistir: onKaydedilenler,
          },
        ]
      : []),
    ...(onArsiv
      ? [
          {
            anahtar: 'arsiv',
            etiket: 'Arşiv',
            ikon: <Archive aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />,
            calistir: onArsiv,
          },
        ]
      : []),
    {
      anahtar: 'gorunurluk',
      etiket: gorunurlukEtiketi,
      /* İkon tek başına bilgi taşımıyor: yanındaki metin durumu yazıyor. */
      ikon: yayindaMi ? (
        <EyeOff aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />
      ) : (
        <Eye aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />
      ),
      calistir: onGorunurluk,
      pasif: gorunurlukGonderiliyor,
    },
  ];

  const kapat = React.useCallback(() => {
    setAcik(false);
    /* Odak tetikleyiciye dönüyor: klavye kullanıcısı sayfanın başına düşmesin. */
    window.requestAnimationFrame(() => tetikRef.current?.focus());
  }, []);

  React.useEffect(() => {
    if (!acik) return;

    const tusaBas = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') {
        olay.preventDefault();
        kapat();
        return;
      }
      if (olay.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      /*
        ODAK TUZAĞI

        Alttan açılan panel `aria-modal`: arkasındaki sayfa erişilebilir
        değil. Tuzak olmasaydı Tab odağı panelin altındaki sayfaya
        taşırdı ve klavye kullanıcısı görmediği bir yerde gezerdi. Aynı
        davranış masaüstü menüsünde de geçerli: menü açıkken Tab menüyü
        dolaşıyor, arkasındaki sayfayı değil.
      */
      const odaklanabilirler = Array.from(
        panel.querySelectorAll<HTMLElement>(ODAKLANABILIR),
      ).filter((oge) => oge.getClientRects().length > 0);
      if (odaklanabilirler.length === 0) return;

      const ilk = odaklanabilirler[0];
      const son = odaklanabilirler[odaklanabilirler.length - 1];
      const aktif = document.activeElement as HTMLElement | null;

      if (olay.shiftKey && (aktif === ilk || !panel.contains(aktif))) {
        olay.preventDefault();
        son.focus();
      } else if (!olay.shiftKey && (aktif === son || !panel.contains(aktif))) {
        olay.preventDefault();
        ilk.focus();
      }
    };

    document.addEventListener('keydown', tusaBas);
    const kare = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(ODAKLANABILIR)?.focus();
    });

    return () => {
      document.removeEventListener('keydown', tusaBas);
      window.cancelAnimationFrame(kare);
    };
  }, [acik, kapat]);

  /* Masaüstünde dışarı tıklama kapatıyor; mobilde bu işi perde yapıyor. */
  React.useEffect(() => {
    if (!acik || !genisEkran) return;
    const disariTikla = (olay: MouseEvent) => {
      const hedef = olay.target as Node;
      if (panelRef.current?.contains(hedef)) return;
      if (tetikRef.current?.contains(hedef)) return;
      setAcik(false);
    };
    document.addEventListener('mousedown', disariTikla);
    return () => document.removeEventListener('mousedown', disariTikla);
  }, [acik, genisEkran]);

  const ogeyeBas = (oge: Oge) => {
    /* `disabled` zaten tıklamayı kesiyor; bu ikinci kapı sunumlar ayrışırsa diye. */
    if (oge.pasif) return;
    /*
      KAPANIŞ `kapat()` ÜZERİNDEN: ODAK BODY'YE DÜŞMÜYOR

      Burada `setAcik(false)` çağrılıyordu. Menü kapanıyordu ama odak
      hiçbir yere bağlanmadığı için tarayıcı onu belgenin köküne
      bırakıyordu: yerelde ölçüldü, öğeye tıklandıktan sonra
      `document.activeElement` BODY oldu. Klavye ve okuyucu kullanıcısı
      sayfanın başına düşüyor, bastığı eylemin `role="status"`
      bildirimini bulamıyordu. Escape yolu aynı hataya düşmüyordu çünkü
      o zaten `kapat()` çağırıyor — fark tam olarak bu satırdaydı.

      AccountSheet'in effect-cleanup kalıbı DEĞİL, doğrudan `kapat()`
      seçildi: cleanup her kapanma yolunu kapsar, dışarı tıklamayı da.
      Fareyle menünün dışına tıklayan kullanıcının odağını geri dişliye
      çekmek, onun tıkladığı yerden odağı çalmak olurdu. Odağın dönmesi
      gereken iki yol Escape ve öğeye basma; ikisi de artık aynı
      fonksiyondan geçiyor. Masaüstü açılır menüsü ile alttan panel de
      aynı `ogeyeBas`ı çağırıyor, yani ikinci bir kod yolu açılmadı.

      Sıra önemli: `kapat()` odağı bir sonraki kareye bırakıyor,
      `oge.calistir()` ise görünürlük durumunu değiştirip yeniden çizim
      tetikliyor. Odak çizimden sonraki karede uygulandığı için
      tetikleyici düğme yerinde bulunuyor.
    */
    kapat();
    oge.calistir();
  };

  const acilirMenu = (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Profil ayarları"
      data-testid="profil-ayar-menu"
      className="absolute right-0 top-12 z-30 w-64 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg"
    >
      {ogeler.map((oge) => (
        <button
          key={oge.anahtar}
          type="button"
          role="menuitem"
          onClick={() => ogeyeBas(oge)}
          disabled={oge.pasif}
          className={MENU_OGESI}
        >
          {oge.ikon}
          <span>{oge.etiket}</span>
        </button>
      ))}
    </div>
  );

  const altPanel = monte
    ? createPortal(
        <div data-testid="profil-ayar-panel" className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Profil ayarlarını kapat"
            onClick={kapat}
            className="fixed inset-0 h-full w-full cursor-default touch-none bg-slate-950/45"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Profil ayarları"
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 rounded-t-[2rem] border-x border-t border-gray-200 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-20px_50px_rgba(15,23,42,0.24)]"
          >
            <div className="flex justify-center pb-2 pt-3">
              <span aria-hidden className="h-1.5 w-11 rounded-full bg-gray-200" />
            </div>
            <div className="px-3 pb-2">
              {ogeler.map((oge) => (
                <button
                  key={oge.anahtar}
                  type="button"
                  onClick={() => ogeyeBas(oge)}
                  disabled={oge.pasif}
                  className={`${MENU_OGESI} py-3`}
                >
                  {oge.ikon}
                  <span>{oge.etiket}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={tetikRef}
        type="button"
        data-testid="profil-ayar-tetik"
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label="Profil ayarları"
        onClick={() => setAcik((onceki) => !onceki)}
        className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 ${RENK_GECISI} ${ODAK_HALKASI}`}
      >
        <Settings aria-hidden className="h-5 w-5" />
      </button>
      {acik && (genisEkran ? acilirMenu : altPanel)}
    </div>
  );
};
