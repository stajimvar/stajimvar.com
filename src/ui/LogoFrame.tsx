import React from 'react';
import { BadgeCheck } from 'lucide-react';

/**
 * Kurum logosu çerçevesi.
 *
 * NEDEN ÇERÇEVE
 * -------------
 * Logolar doğrudan ekrana atılınca sayfanın dengesi kurumdan kuruma
 * bozuluyor: birinin amblemi kare ve koyu, ötekininki geniş ve açık
 * zeminli, bir başkasınınki şeffaf kenarlı. Yan yana dizildiklerinde
 * hiçbiri diğeriyle aynı ağırlıkta görünmüyor.
 *
 * Çerçeve hepsini aynı kutuya oturtuyor: sabit ölçü, nötr zemin, sabit iç
 * boşluk, `object-contain` (kırpma yok, oran bozulmuyor) ve aynı köşe
 * yapısı. Koç'un logosu da küçük bir işletmenin logosu da eklendiğinde
 * sayfa aynı kalıyor.
 *
 * LOGO YOKSA UYDURULMUYOR
 * -----------------------
 * Baş harflerden bir yer tutucu çiziliyor. Rastgele bir renk değil,
 * kurum adından türetilen kararlı bir renk: aynı kurum her yerde aynı
 * görünüyor, sayfa her açılışta değişmiyor.
 */

const OLCU = {
  sm: { kutu: 'h-10 w-10', ic: 'h-7 w-7', yazi: 'text-xs' },
  md: { kutu: 'h-12 w-12', ic: 'h-9 w-9', yazi: 'text-sm' },
  lg: { kutu: 'h-14 w-14', ic: 'h-10 w-10', yazi: 'text-base' },
} as const;

/* Kurum adından kararlı renk. FNV-1a: kısa, hızlı ve her yerde aynı. */
const ZEMINLER = [
  'bg-blue-50 text-blue-700',
  'bg-violet-50 text-violet-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-800',
  'bg-cyan-50 text-cyan-700',
  'bg-rose-50 text-rose-700',
];

function zeminSec(ad: string): string {
  let h = 2166136261;
  for (let i = 0; i < ad.length; i += 1) {
    h ^= ad.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ZEMINLER[Math.abs(h) % ZEMINLER.length];
}

function basHarfler(ad: string): string {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  if (!parcalar.length) return '?';
  const harf = (s: string) => s[0]?.toLocaleUpperCase('tr-TR') ?? '';
  return parcalar.length === 1 ? harf(parcalar[0]) : harf(parcalar[0]) + harf(parcalar[1]);
}

export const LogoFrame: React.FC<{
  ad: string;
  logoUrl?: string | null;
  boy?: keyof typeof OLCU;
  /** Doğrulanmış kurum rozeti — yalnızca gerçekten doğrulanmışsa. */
  dogrulandi?: boolean;
  className?: string;
}> = ({ ad, logoUrl, boy = 'md', dogrulandi = false, className = '' }) => {
  const [hata, setHata] = React.useState(false);
  const olcu = OLCU[boy];
  const gosterilecekLogo = logoUrl && !hata;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        className={`inline-flex items-center justify-center rounded-xl border border-gray-200 ${
          olcu.kutu
        } ${gosterilecekLogo ? 'bg-white p-1.5' : zeminSec(ad)}`}
      >
        {gosterilecekLogo ? (
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onError={() => setHata(true)}
            className={`${olcu.ic} object-contain`}
          />
        ) : (
          <span className={`font-black leading-none ${olcu.yazi}`}>{basHarfler(ad)}</span>
        )}
      </span>

      {/*
        Doğrulama rozeti YEŞİL ve yalnızca doğrulanmışta.
        Yeşil bu üründe tek bir şey söylüyor: doğrulandı.
      */}
      {dogrulandi && (
        <span
          title="Doğrulanmış kurum"
          className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-white"
        >
          <BadgeCheck className="h-4 w-4 text-emerald-600" />
        </span>
      )}
    </span>
  );
};
