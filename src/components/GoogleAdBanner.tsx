import React, { useEffect, useRef } from 'react';

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

const ADSENSE_CLIENT: string | undefined = import.meta.env.VITE_ADSENSE_CLIENT;

/**
 * Yuva kimlikleri ortam değişkeninden.
 *
 * Her çağrı yerine elle kimlik yazmak yerine biçime göre okunuyor: AdSense
 * onayı geldiğinde yalnızca `.env` doldurulacak, tek satır kod
 * değişmeyecek. Tanımlı olmayan biçim sessizce boş kalıyor.
 */
const SLOT_ENV: Partial<Record<AdFormat, string | undefined>> = {
  'in-feed': import.meta.env.VITE_AD_SLOT_FEED,
  'sidebar-rectangle': import.meta.env.VITE_AD_SLOT_SIDEBAR,
  'sidebar-halfpage': import.meta.env.VITE_AD_SLOT_SIDEBAR_TALL,
  'top-leaderboard': import.meta.env.VITE_AD_SLOT_TOP,
  'modal-footer': import.meta.env.VITE_AD_SLOT_MODAL,
};

/** AdSense betiği sayfa başına bir kez yüklenir. */
let scriptRequested = false;

function ensureAdsenseScript(client: string): void {
  if (scriptRequested || typeof document === 'undefined') return;
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
  const slot = adSlotId ?? SLOT_ENV[format];
  const configured = Boolean(ADSENSE_CLIENT && slot);

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

  if (!configured) {
    // Üretimde yayıncı kimliği yoksa hiçbir şey basma. Boş bir alan,
    // sahte bir reklamdan iyidir.
    if (!import.meta.env.DEV) return null;

    return (
      <div
        className={`rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 flex flex-col items-center justify-center gap-1 text-center px-4 ${className}`}
        style={{ minHeight: spec.minHeight }}
        aria-hidden="true"
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Reklam yuvası
        </span>
        <span className="text-[11px] text-gray-400">
          {spec.label} · reklam anahtarı tanımlı değil
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Reklam olduğu görsel olarak da belli olmalı; Google'ın politikası da bunu ister. */}
      <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
        Reklam
      </div>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: spec.minHeight }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={spec.adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
};
