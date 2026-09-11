import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { type SosyalPaylasim } from '../../lib/queries/sosyal';
import { DUGME, PaylasimGovdesi } from './PaylasimGovdesi';
import { useGenisEkran } from './useGenisEkran';

/**
 * PAYLAŞIM AYRINTISI — İKİ SUNUM, TEK GÖVDE
 *
 * Karta basınca açılan katman. Ayrı bir ROTA değil, çünkü paylaşımın
 * kalıcı adresi yok: `/paylasim/:id` gibi bir yol ne App'te tanımlı ne
 * de sunucuda karşılığı var. Olmayan bir adrese `<a href>` yazmak, orta
 * tuşla açıldığında 404 veren bir bağlantı üretirdi; bu yüzden kartın
 * kendisi `<button>` ve ayrıntı bir `dialog`.
 *
 * lg VE ÜSTÜ — DİYALOG
 *   Tıklanan TEK gönderi, iki panel (solda 4:5 şerit, sağda metin).
 *
 * lg ALTI — DİKEY AKIŞ
 *   Telefonda tek gönderilik bir diyalog, ızgaradan her gönderi için
 *   "aç, kapat, sonrakine dokun" döngüsü demekti (mobil ekran
 *   görüntüsüyle bildirildi). Instagram'ın yaptığı gibi tam ekran bir
 *   akış açılıyor: dokunulan gönderi en üstte, altında ızgaradaki AYNI
 *   listenin sonraki gönderileri. Liste ızgaranın elindeki liste; ikinci
 *   bir sorgu yok.
 *
 * İkisi de `PaylasimGovdesi`ni çiziyor; şerit, beğeni, kaydetme ve arşiv
 * mantığı orada, burada yalnız kap, açılış/kapanış ve odak var. Hangi
 * sunumun çizileceğine `matchMedia` karar veriyor (`useGenisEkran`);
 * `hidden lg:flex` ile iki kopya bırakmak her gönderinin görselini iki
 * kez indirmek ve odak tuzağını görünmeyen kopyaya da kurmak olurdu —
 * `ProfilAyarMenusu` ile aynı gerekçe.
 *
 * TARAYICI GERİ TUŞU BAĞLI DEĞİL
 * ------------------------------
 * Depoda `history.pushState` ile kapanan tek katman `AccountPanel`; sosyal
 * katmanların hiçbiri (dişli menüsü, bu katman) o kalıbı kullanmıyor ve
 * o kalıp StrictMode'un mount → cleanup → mount sırasında temizlikteki
 * `history.back()` ile ikinci mount'un `pushState`ini üst üste bindiriyor
 * (bu dosyada ölçülmedi; akıl yürütme). Kapanış burada geri düğmesi ve
 * Escape; App'in `popstate` dinleyicisine ikinci bir kayıt düşülmüyor.
 */

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
  Akış başlığındaki geri düğmesi: 44 px kare, kenarlıksız — başlık
  şeridinde `DUGME`nin çerçevesi ikinci bir kutu gibi dururdu. Odak
  halkası ve geçiş aynı belirteçlerden.
*/
const GERI_DUGMESI = `inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-900 hover:bg-gray-50 ${RENK_GECISI} ${ODAK_HALKASI}`;

interface DetayProps {
  /** Izgaradaki liste; akış bunu dokunulan gönderiden itibaren çiziyor. */
  liste: SosyalPaylasim[];
  /** Dokunulan gönderi; diyalogda tek çizilen, akışta en üstteki. */
  baslangicId: string;
  /** Sahip dalı ile ziyaretçi dalı AYRI yetki durumu; arşiv yalnız sahibinde. */
  sahibiMi: boolean;
  /**
   * Katmanı açan kart.
   *
   * Odak kapanışta buraya dönüyor. Referans olmasaydı odak belgenin
   * köküne düşer ve klavye kullanıcısı ızgaranın başına savrulurdu —
   * ProfilAyarMenusu'nda ölçülen davranışın aynısı.
   */
  tetikleyici: HTMLElement | null;
  onKapat: () => void;
  /** Arşivleme başarılı olduğunda listeyi tazeleyen çağrı. */
  onArsivlendi?: () => void;
  /**
   * Akış başlığında "@ad" olarak yazılan kullanıcı adı. Listedeki
   * gönderiler tek bir profile aitse çağıran veriyor; Beğendiklerim gibi
   * karışık listelerde verilmiyor ve başlık yalnız "Gönderi" kalıyor —
   * yazar adı gönderi satırında gelmiyor, uydurulmuyor.
   */
  kullaniciAdi?: string | null;
}

export const PaylasimDetayi: React.FC<DetayProps> = ({
  liste,
  baslangicId,
  sahibiMi,
  tetikleyici,
  onKapat,
  onArsivlendi,
  kullaniciAdi = null,
}) => {
  const genisEkran = useGenisEkran();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const kapatDugmesiRef = React.useRef<HTMLButtonElement>(null);
  const akisRef = React.useRef<HTMLDivElement>(null);
  const baslangicRef = React.useRef<HTMLElement>(null);

  /*
    AKIŞTA ARŞİVLENEN BLOK LİSTEDEN DÜŞÜYOR, AKIŞ KALIYOR

    `onArsivlendi` listeyi sunucudan yeniden çekiyor; o yanıt gelene kadar
    ızgaranın listesi eski. Kaldırılan kimlikler burada tutuluyor ki
    arşivlenen gönderi yanıtı beklerken ekranda durmasın. Sunucu kabul
    etmeden buraya hiçbir şey yazılmıyor — iyimser gizleme yok.
  */
  const [gizlenenler, setGizlenenler] = React.useState<ReadonlySet<string>>(() => new Set());
  const gorunenler = React.useMemo(
    () => liste.filter((paylasim) => !gizlenenler.has(paylasim.id)),
    [liste, gizlenenler],
  );
  const baslangic = gorunenler.find((paylasim) => paylasim.id === baslangicId) ?? null;

  /*
    KAPANIŞTA ÖNCE ODAK, SONRA KAPATMA

    ÖLÇÜLDÜ (1440x900, gerçek oturum): kart odaklanıp tıklandı, katman
    açıldı (odak "Kapat" düğmesinde), Escape'e basıldı. Escape sonrası
    `document.activeElement === document.body` = true; açan kart hâlâ
    DOM'daydı ama odak ona dönmedi.

    Sebep sıralama: odak kapanış anında katmanın İÇİNDEYDİ. Durum
    değişimi önce koşunca katman sökülüyor, odaklı düğüm belgeden
    kalkıyor ve tarayıcı odağı `body`'ye alıyor; bu sıfırlama
    sökülmeden SONRA planlanmış bir çağrıdan bağımsız gerçekleşiyor.
    Katman açılışı düzeltilmeden önce odak zaten kartta kalıyordu, o
    yüzden dönüş de görünürde çalışıyordu.

    ÇÖZÜM: odak, kaldırılacak ağacın DIŞINA `onKapat`'tan ÖNCE
    taşınıyor. Sökme anında odaklı düğüm kartın kendisi oluyor, yani
    tarayıcının sıfırlayacağı bir odak kalmıyor. Çağrı senkron: araya
    kare ya da zamanlayıcı girmediği için StrictMode'un
    mount → cleanup → mount sırası da onu düşüremiyor — açılış odağında
    ölçülen tuzağın aynısı burada da kapanıyor.
  */
  const kapat = React.useCallback(() => {
    tetikleyici?.focus();
    onKapat();
  }, [onKapat, tetikleyici]);

  React.useEffect(() => {
    const tusaBas = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') {
        olay.preventDefault();
        kapat();
        return;
      }
      if (olay.key !== 'Tab') return;

      /*
        ODAK TUZAĞI

        Katman `aria-modal`: arkasındaki sayfa erişilebilir değil. Tuzak
        olmasaydı Tab odağı katmanın altındaki ızgaraya taşır ve klavye
        kullanıcısı görmediği bir yerde gezerdi. Kalıp
        ProfilAyarMenusu'ndaki ile aynı; ikinci bir tuzak yazılmadı.
        Akışta da aynı tuzak: kap tam ekran ve kaydırılabilir, `sr-only`
        oklar dahil bütün düğmeler `getClientRects` ile sayılıyor.
      */
      const panel = panelRef.current;
      if (!panel) return;
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
    return () => document.removeEventListener('keydown', tusaBas);
  }, [kapat]);

  /*
    AÇILIŞTA ODAK KATMANIN İÇİNE ALINIYOR

    ÖLÇÜLDÜ (gerçek oturum, katman açıldıktan hemen sonra):
    `panel.contains(document.activeElement)` = false — odak katmanı açan
    paylaşım kartında kalıyordu. `aria-modal` bir katmanda odak içeri
    alınmazsa Tab arka plandaki ızgaraya kaçar ve klavye kullanıcısı
    katmanın açıldığını hiç fark etmez.

    NEDEN rAF DEĞİL: odak bir süre `requestAnimationFrame` içinde
    veriliyordu ve gerçek tarayıcıda HİÇ taşınmadı. ÖLÇÜLDÜ (1440x900,
    gerçek oturum): katman açıldıktan sonra 16 ms aralıkla 1,5 sn boyunca
    `document.activeElement` izlendi, tek kayıt kartın kendisi; kapatma
    düğmesi hiç odak almadı. Uygulama StrictMode ile çalışıyor, etki
    mount → cleanup → mount sırasıyla iki kez koşuyor ve cleanup'taki
    `cancelAnimationFrame` planlanan kareyi düşürüyor. İptali olmayan tek
    bir çağrı bu sıradan etkilenmiyor.

    NEDEN `useLayoutEffect`: portalın çocukları da DOM'a işlendikten
    SONRA, tarayıcı boyamadan ÖNCE koşuyor — `kapatDugmesiRef.current`
    dolu oluyor ve araya bir kare girmediği için odak gecikmiyor.
    `focus()` aynı öğeye ikinci kez uygulandığında bir şey değiştirmiyor;
    StrictMode'un çift çağrısı zararsız. `autoFocus` yerine bu seçildi:
    açılışın tek seferlik olduğu bağımlılık dizisinden okunuyor ve seride
    gezinirken düğme odağı geri istemiyor.

    HEDEF KAPATMA DÜĞMESİ: katmandan çıkışın klavyedeki karşılığı
    (Escape) görünür bir düğme olarak da ilk sırada eline geliyor.
    Diyalogda "Kapat", akışta başlıktaki geri oku — aynı ref, iki sunumda
    tek düğüm çiziliyor.

    YALNIZ AÇILIŞTA (boş bağımlılık dizisi): seride gezinirken ya da
    arşiv sorusu açılırken odak kullanıcının bulunduğu yerden çalınmıyor.
  */
  React.useLayoutEffect(() => {
    kapatDugmesiRef.current?.focus();
  }, []);

  /*
    AKIŞ DOKUNULAN GÖNDERİDEN AÇILIYOR

    Kaydırma da aynı anda, boyamadan önce ve senkron: kullanıcı önce
    listenin başını görüp sonra bloğun kaydığını görmüyor. `scrollTop`
    doğrudan yazılıyor, `scrollIntoView` değil: o çağrı bütün kaydırılabilir
    ataları dolaşıyor ve kabın altındaki sayfayı da hizalamaya
    kalkabiliyor; kap sabit (`fixed`) olduğu için sayfanın kayması ekranda
    hiçbir şeyi değiştirmez ama kapanınca kullanıcıyı ızgaranın başka bir
    yerine bırakırdı. `offsetTop` kaydırma kabına göre — kap `relative`.
    Kare zamanlayıcısı yok; odak etkisindeki gerekçe burada da geçerli.
  */
  React.useLayoutEffect(() => {
    const kap = akisRef.current;
    const blok = baslangicRef.current;
    if (!kap || !blok) return;
    kap.scrollTop = blok.offsetTop;
  }, []);

  /*
    ARŞİV SONRASI İKİ SUNUMDA İKİ FARKLI DEVAM

    Diyalog tek gönderi çiziyordu, gönderi gitti, katman kapanıyor
    (eskisi gibi). Akışta yalnız o blok düşüyor; son blok da düşerse
    akışın çizecek şeyi kalmıyor ve o zaman kapanıyor. Blok kalkmadan önce
    odak başlığa alınıyor: odak sökülen bloğun "Evet, arşivle" düğmesinde
    kalsaydı tarayıcı onu `body`ye düşürürdü — kapanıştaki ölçümün aynısı.
  */
  const diyalogdaArsivlendi = () => {
    onArsivlendi?.();
    kapat();
  };

  const akistaArsivlendi = (paylasimId: string) => {
    onArsivlendi?.();
    const kalan = gorunenler.filter((paylasim) => paylasim.id !== paylasimId);
    if (kalan.length === 0) {
      kapat();
      return;
    }
    kapatDugmesiRef.current?.focus();
    setGizlenenler((onceki) => {
      const yeni = new Set(onceki);
      yeni.add(paylasimId);
      return yeni;
    });
  };

  if (genisEkran) {
    /*
      Diyalogun çizeceği gönderi listeden kalkmışsa (dış bir tazeleme
      sırasında) çizilecek bir şey yok; Escape yine kapatıyor.
    */
    if (!baslangic) return null;

    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <button
          type="button"
          aria-label="Paylaşımı kapat"
          onClick={kapat}
          className="fixed inset-0 h-full w-full cursor-default touch-none bg-slate-950/60"
        />
        {/*
          İKİ PANEL: SOLDA FOTOĞRAF, SAĞDA METİN

          Kap `90vh` yükseklikte ve genişliği İÇERİKTEN türüyor (`w-auto`,
          üst sınır `min(100%, 72rem)`). Sol panel yüksekliğin tamamı ve
          4:5 oranında (genişlik = yükseklik × 4/5; 900 px yüksek ekranda
          ≈ 648×810), sağ panel sabit 26rem ve YALNIZ o panel kayıyor —
          fotoğraf kaydırmayla birlikte gitmiyor. Sol panel önceden kabın
          %60'ıydı; oran serbest kalınca masaüstünde kare görünüyordu,
          Instagram gibi görselin oranı paneli taşımalı. Panel sınıfları
          gövdede (`PaylasimGovdesi`, 'diyalog' yerleşimi).

          Yatay kaydırma hiçbir dalda açılmıyor: uzun açıklama `break-words`
          ile sarıyor, görsel kendi panelinin içinde `object-cover` ile
          kırpılıyor.

          Bu dal yalnız lg ve üstünde çiziliyor; dar ekran sınıfları
          (`flex-col`, `rounded-t`) bu yüzden kalktı — akış onların yerine
          geçti.
        */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Paylaşım ayrıntısı"
          tabIndex={-1}
          className="relative flex h-[90vh] max-h-[90vh] w-auto max-w-[min(100%,72rem)] flex-row overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_-20px_50px_rgba(15,23,42,0.24)]"
        >
          {/* Kapat kabın sağ üst köşesine bindirilmiş; başlık sağında ona yer bırakıyor. */}
          <div className="absolute right-2 top-2 z-20">
            <button type="button" ref={kapatDugmesiRef} onClick={kapat} className={DUGME}>
              <X aria-hidden className="h-4 w-4" />
              Kapat
            </button>
          </div>

          <PaylasimGovdesi
            paylasim={baslangic}
            sahibiMi={sahibiMi}
            yerlesim="diyalog"
            aktif
            onArsivlendi={diyalogdaArsivlendi}
          />
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    /*
      AKIŞ: TAM EKRAN, DİKEY KAYAN

      Kap `fixed inset-0`; başlık sabit, altındaki alan kayıyor
      (`overflow-y-auto`, kaydırma sona gelince sayfaya zincirlenmesin
      diye `overscroll-contain`). Arka plan perdesi yok: kap zaten ekranın
      tamamı. Kaydırma alanı `relative`, blokların `offsetTop`u için
      (yukarıdaki açılış kaydırması).
    */
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Paylaşım akışı"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-white"
    >
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-gray-100 px-2">
        <button type="button" ref={kapatDugmesiRef} onClick={kapat} className={GERI_DUGMESI}>
          <ArrowLeft aria-hidden className="h-5 w-5" />
          <span className="sr-only">Geri</span>
        </button>
        <div className="min-w-0 flex-1">
          {kullaniciAdi && (
            <p className="truncate text-xs font-semibold text-gray-600">@{kullaniciAdi}</p>
          )}
          <h2 className="truncate text-sm font-bold text-gray-900">Gönderi</h2>
        </div>
      </div>

      <div ref={akisRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {gorunenler.map((paylasim) => (
          <AkisBlogu
            key={paylasim.id}
            paylasim={paylasim}
            sahibiMi={sahibiMi}
            kok={akisRef}
            blokRef={paylasim.id === baslangicId ? baslangicRef : null}
            onArsivlendi={akistaArsivlendi}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
};

interface BlokProps {
  paylasim: SosyalPaylasim;
  sahibiMi: boolean;
  /** Kaydırma kabı; gözlemcinin kökü bu, pencere değil. */
  kok: React.RefObject<HTMLDivElement | null>;
  /** Dokunulan gönderiyse açılış kaydırması bu ref üzerinden. */
  blokRef: React.RefObject<HTMLElement | null> | null;
  onArsivlendi: (paylasimId: string) => void;
}

/*
  BLOK GÖRÜNÜME YAKLAŞINCA AKTİF

  `IntersectionObserver` kökü kaydırma kabı: kök pencere olsaydı
  `rootMargin` pencereye uygulanır, kabın kırptığı bloklar kabın dışına
  çıktığı anda "görünmüyor" sayılır ve önden yükleme hiç olmazdı. Kenar
  payı dikeyde bir ekran boyu (`100% 0px`): kullanıcı bloğa gelmeden
  görseli inmeye başlıyor. Bir kez aktif olan blok aktif kalıyor
  (`disconnect`): geri kaydırınca yeniden indirme yok, kancadaki
  adresler zaten bellekte.

  Gözlemci yoksa (eski tarayıcı) blok hemen aktif: tembel yükleme bir
  iyileştirme, içeriğin ön koşulu değil.
*/
const AkisBlogu: React.FC<BlokProps> = ({ paylasim, sahibiMi, kok, blokRef, onArsivlendi }) => {
  const yerelRef = React.useRef<HTMLElement>(null);
  const [aktif, setAktif] = React.useState(false);

  React.useEffect(() => {
    const blok = yerelRef.current;
    if (!blok) return;
    if (typeof IntersectionObserver === 'undefined') {
      setAktif(true);
      return;
    }
    const gozlemci = new IntersectionObserver(
      (kayitlar) => {
        if (!kayitlar.some((kayit) => kayit.isIntersecting)) return;
        setAktif(true);
        gozlemci.disconnect();
      },
      { root: kok.current, rootMargin: '100% 0px' },
    );
    gozlemci.observe(blok);
    return () => gozlemci.disconnect();
  }, [kok]);

  return (
    <article
      ref={(oge) => {
        yerelRef.current = oge;
        if (blokRef) blokRef.current = oge;
      }}
      className="flex flex-col border-b border-gray-100"
    >
      <PaylasimGovdesi
        paylasim={paylasim}
        sahibiMi={sahibiMi}
        yerlesim="akis"
        aktif={aktif}
        onArsivlendi={onArsivlendi}
      />
    </article>
  );
};
