import React from 'react';
import { GECIS, KOSE } from './tokens';

/**
 * Düğme — dört tür, başka tür yok.
 *
 * primary     tek ana eylem. Bir ekranda birden fazla olmaz.
 * secondary   ana eylemin yanındaki gerçek seçenek. Kenarlıklı ve BEYAZ.
 * tertiary    metin düğmesi; zemini yok.
 * destructive geri alınamayan silme/çıkarma.
 *
 * NEDEN SECONDARY GRİ DEĞİL
 * -------------------------
 * "Profili düzenle" düz gri bir kutuydu ve tıklanabilir görünmüyordu —
 * arayüzde gri dolgu genelde DEVRE DIŞI demek. İkincil düğme artık beyaz
 * zeminli ve kenarlıklı: hem tıklanabilir görünüyor hem de birincil
 * düğmenin önüne geçmiyor.
 *
 * YÜKSEKLİK
 * ---------
 * Mobilde 48 piksel (`md`), yoğun yerlerde 44 (`sm`). Dokunma alanının
 * altına inen bir düğme, ıskalanan bir düğme.
 */

type Tur = 'primary' | 'secondary' | 'tertiary' | 'destructive';
type Boy = 'sm' | 'md' | 'lg';

const TUR_SINIFI: Record<Tur, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary:
    'bg-white text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:text-gray-400',
  tertiary: 'bg-transparent text-blue-700 hover:bg-blue-50 disabled:text-gray-400',
  destructive: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
};

const BOY_SINIFI: Record<Boy, string> = {
  sm: 'min-h-11 px-3.5 text-sm',
  md: 'min-h-12 px-4 text-sm',
  lg: 'min-h-[52px] px-5 text-base',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tur?: Tur;
  boy?: Boy;
  /** Satırı tamamen kaplasın. */
  tamGenislik?: boolean;
  /** Metnin solundaki ikon. Sağa ikon konmuyor — ok işareti bağlantıya ait. */
  ikon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  tur = 'primary',
  boy = 'md',
  tamGenislik = false,
  ikon,
  className = '',
  children,
  ...kalan
}) => (
  <button
    type="button"
    {...kalan}
    className={`inline-flex items-center justify-center gap-2 ${KOSE.kontrol} font-bold ${GECIS} cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
      TUR_SINIFI[tur]
    } ${BOY_SINIFI[boy]} ${tamGenislik ? 'w-full' : ''} ${className}`}
  >
    {ikon}
    {/* min-w-0 + truncate: uzun etiket dar ekranda düğmeyi taşırmasın. */}
    <span className="min-w-0 truncate">{children}</span>
  </button>
);

/**
 * Yalnızca ikon taşıyan düğme.
 *
 * `aria-label` ZORUNLU: etiketsiz bir ikon ekran okuyucuda yalnızca
 * "düğme" diye okunuyor ve ne yaptığı bilinmiyor.
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  tur?: 'secondary' | 'tertiary' | 'destructive';
}

export const IconButton: React.FC<IconButtonProps> = ({
  tur = 'tertiary',
  className = '',
  children,
  ...kalan
}) => (
  <button
    type="button"
    {...kalan}
    /* 44×44: dokunma alanının alt sınırı. */
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center ${KOSE.kontrol} ${GECIS} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
      tur === 'secondary'
        ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        : tur === 'destructive'
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-gray-600 hover:bg-gray-100'
    } ${className}`}
  >
    {children}
  </button>
);
