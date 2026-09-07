import React, { useEffect, useRef, useState } from 'react';
import { rizaOku, reklamSerbest } from '../lib/cerez-rizasi.mjs';
import { reklamGosterilebilir } from '../lib/reklam-kapisi.mjs';
import reklamAyari from '../../reklam.json';

/**
 * Gerçek Google AdSense reklam yuvası.
 *
 * Önceki sürüm bir reklam *simülatörüydü*: uydurma sponsor kartları
 * ("Google Kariyer Enstitüsü", "Google Partner" rozeti), AdBlock taklidi ve
 * sahte AdSense kodu gösteren bir inceleme modalı. Tasarım maketinde sayfayı
 * dolu göstermek için mantıklıydı ama canlıya çıkarsa var olmayan bir marka
 * ortaklığını duyurmuş olurduk. Bu yüzden tamamen değiştirildi.
 *
 * Davranış:
 *   - `VITE_ADSENSE_CLIENT` tanımlıysa gerçek AdSense birimi basılır
 *   - tanımlı değilse ÜRETİMDE hiçbir şey görünmez (boş yuva > sahte reklam)
 *   - geliştirmede yerleşimi bozmamak için nötr, açıkça etiketli bir kutu çizilir
 *
 * Kurulum: `.env` dosyasına yayıncı kimliğini ekle, sonra her yuva için
 * AdSense panelinden alınan `adSlotId` değerini geç.
 *
 *     VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
 */

export type AdFormat =
  | 'in-feed'
  | 'sidebar-rectangle'
  | 'sidebar-halfpage'
  | 'top-leaderboard'
  | 'modal-footer';

/** Her biçim için AdSense birim tipi ve yer tutucu yüksekliği. */
const FORMATS: Record<AdFormat, { adFormat: string; minHeight: number; label: string }> = {
  'in-feed': { adFormat: 'fluid', minHeight: 140, label: 'Akış içi' },
  'sidebar-rectangle': { adFormat: 'rectangle', minHeight: 250, label: 'Kenar çubuğu 300×250' },
  'sidebar-halfpage': { adFormat: 'vertical', minHeight: 600, label: 'Kenar çubuğu 300×600' },
  'top-leaderboard': { adFormat: 'horizontal', minHeight: 90, label: 'Üst şerit 728×90' },
  'modal-footer': { adFormat: 'horizontal', minHeight: 100, label: 'Modal altı' },
};

interface GoogleAdBannerProps {
  format?: AdFormat;
  /** AdSense panelinden alınan reklam birimi kimliği. */
  adSlotId?: string;
  className?: string;
}

/*
  Yapilandirma reklam.json'dan geliyor, ortam degiskeninden DEGIL.

  Once VITE_ADSENSE_CLIENT ile .env'den okunuyordu. Dagitim CI'ya
  tasininca .env orada olmadigi icin deger bosaldi ve CI'nin ilk
  dagitimi reklam yapilandirmasini sessizce sildi (olculdu: ads.txt
  kayboldu, pakette yayinci kimligi kalmadi).

  Bu degerler gizli degil - sayfa kaynaginda zaten aciktan goruluyor.
  Depoya yazilinca her ortamda ayni ve kaybolmuyor.
*/
const ADSENSE_CLIENT: string | undefined = reklamAyari.yayinciKimligi || undefined;

/**
 * Yuva kimlikleri ortam değişkeninden.
 *
 * Her çağrı yerine elle kimlik yazmak yerine biçime göre okunuyor: AdSense
 * onayı geldiğinde yalnızca `.env` doldurulacak, tek satır kod
 * değişmeyecek. Tanımlı olmayan biçim sessizce boş kalıyor.
 */
const SLOT_ENV: Partial<Record<AdFormat, string | undefined>> =
  (reklamAyari.yuvalar ?? {}) as Partial<Record<AdFormat, string>>;

/** AdSense betiği sayfa başına bir kez yüklenir. */
let scriptRequested = false;

/**
 * Betiği yükler — RIZA YOKSA HİÇ.
 *
 * Kapı burada, çağıranlarda değil: iki ayrı çağrı yeri var (açılış ve
 * reklam yuvası çizimi) ve kapıyı çağıranlara koymak, birini unutunca
 * sessizce sızdırıyordu. Ölçüldü: açılıştaki çağrı kaldırıldığı hâlde
 * yuva çizilirken betik yine yükleniyordu.
 *
 * Kural isteğin BAŞLAMAMASI; betiği yükleyip görünmez yapmak yetmiyor.
 */
function ensureAdsenseScript(client: string): void {
  if (scriptRequested || typeof document === 'undefined') return;
  if (!reklamSerbest(rizaOku(window.localStorage))) return;
  /*
    İKİNCİ KAPI: YOL.

    Rıza tek başına yetmiyor. Betik izinden sonra her sayfada
    yükleniyordu — ana sayfa, ilanlar, boş süzgeç ekranı, 404. Auto Ads
    açılırsa Google oralara reklam koyabilir; boş ve hata ekranında reklam
    göstermek yayıncı politikasına aykırı.

    Bu bileşen zaten yalnızca uygun rehber sayfalarında çiziliyor, ama
    kapıyı buraya da koymak "bir gün başka bir yerden çağrılırsa" riskini
    kapatıyor.
  */
  if (!reklamGosterilebilir(window.location.pathname, true)) return;
  scriptRequested = true;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src =
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
    encodeURIComponent(client);
  document.head.appendChild(script);
}

/**
 * AdSense betiğini uygulama açılışında yükler.
 *
 * NEDEN AYRI BİR GİRİŞ NOKTASI
 * ----------------------------
 * Betik önce yalnızca bir reklam yuvası çizilirken yükleniyordu; yuva
 * çizilmesi için de HEM yayıncı kimliği HEM yuva kimliği gerekiyordu.
 *
 * Ama AdSense'in site doğrulaması tam tersini istiyor: hesap henüz
 * onaylanmadığı için ortada hiç yuva kimliği yok, Google ise sayfayı açıp
 * betiği arıyor. Betik yüklenmediği için doğrulama sonsuza kadar
 * başarısız oluyordu.
 *
 * Artık yayıncı kimliği tanımlıysa betik açılışta yükleniyor — yuva olsun
 * olmasın. Kimlik yoksa hiçbir şey yapılmıyor; boşuna istek atılmıyor.
 */
export function adsenseBetiginiBaslat(): void {
  if (!ADSENSE_CLIENT) return;
  ensureAdsenseScript(ADSENSE_CLIENT);
}

export const GoogleAdBanner: React.FC<GoogleAdBannerProps> = ({
  format = 'in-feed',
  adSlotId,
  className = '',
}) => {
  const spec = FORMATS[format];
  const pushed = useRef(false);
  const insRef = useRef<HTMLModElement | null>(null);
  const slot = adSlotId ?? SLOT_ENV[format];
  const configured = Boolean(ADSENSE_CLIENT && slot);

  /*
    DOLMAYAN REKLAM HİÇ YER KAPLAMASIN

    Önce yuva her zaman çiziliyordu: "Reklam" etiketi ve minHeight kadar
    boş bir kutu, reklam gelirse dolsun diye. `data-ad-status="unfilled"`
    yazıldığında kutu kapanıyordu — ama bu öznitelik YALNIZCA betik
    çalıştığında yazılıyor.

    Ölçüldü (canlı, 390px, çerez rızası verilmemiş):
      data-ad-status = null · <ins> yüksekliği 140px · kap 159px
    Yani rıza verilmeyen her ziyaretçide sayfada 159 piksellik, üstünde
    "Reklam" yazan boş bir kutu duruyordu ve hiçbir zaman kapanmıyordu.

    Kural tersine çevrildi: yuva DOLDUĞU KANITLANANA kadar görünmüyor.
    `<ins>` DOM'da kalmak zorunda — AdSense betiği onu bulup dolduruyor —
    ama sıfır yükseklikte ve akıştan çıkarılmış hâlde duruyor, yani
    yerleşimde delik açmıyor. Doldu bilgisi gelince açılıyor.
  */
  const [doldu, setDoldu] = useState(false);

  useEffect(() => {
    const ins = insRef.current;
    if (!configured || !ins) return;
    const oku = () => setDoldu(ins.getAttribute('data-ad-status') === 'filled');
    oku();
    const gozlemci = new MutationObserver(oku);
    gozlemci.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => gozlemci.disconnect();
  }, [configured]);

  useEffect(() => {
    if (!configured || pushed.current) return;
    ensureAdsenseScript(ADSENSE_CLIENT as string);
    try {
      // AdSense betiği global bir kuyruk kullanıyor; birim başına bir kez itilir.
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // Reklam yüklenememesi sayfayı bozmamalı; sessizce geç.
    }
  }, [configured]);

  /*
    YAPILANDIRILMAMIŞ YUVA HİÇBİR ŞEY ÇİZMEZ — GELİŞTİRMEDE DE

    Burada geliştirmede kesikli çerçeveli bir yer tutucu çiziliyordu.
    Faydasından çok zararı vardı: geliştirici üretimde olmayan bir boşluğa
    göre yerleşim ayarlıyordu. Artık iki ortam da aynı şeyi gösteriyor —
    hiçbir şey.
  */
  if (!configured) return null;

  return (
    <div
      className={doldu ? className : undefined}
      /*
        Dolmadan önce: sıfır yükseklik, akış dışı görünüm. `<ins>` DOM'da
        kalıyor çünkü AdSense betiği onu arıyor; ama hiçbir piksel yer
        kaplamıyor ve dolduğunda yerleşim kaymasın diye sınıf da o anda
        uygulanıyor.
      */
      style={doldu ? undefined : { height: 0, overflow: 'hidden' }}
      aria-hidden={doldu ? undefined : true}
    >
      {/* Reklam olduğu görsel olarak da belli olmalı; Google'ın politikası da bunu ister. */}
      {doldu && (
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Reklam</div>
      )}
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: doldu ? spec.minHeight : 0 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={spec.adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
};
