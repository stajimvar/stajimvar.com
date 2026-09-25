import React from 'react';

/**
 * HAP FİLTRE — İlanlar, Fırsatlar ve Rehber'in ortak seçim düğmesi
 * (mobil sadeleştirme, 25 Eylül 2026).
 *
 * Büyük ikonlu kategori daireleri yerine yatay haplar: görünen hap 36 px,
 * dokunma alanı 44 px (düğme dikeyde 4'er piksel taşıyor, hap ortada).
 * Seçili hap lacivert zemin + beyaz yazı; seçili olmayan beyaz zemin +
 * ince çerçeve. Durum `aria-pressed` ile de söyleniyor.
 *
 * Yalnız görünüm: hangi hapın seçili olduğu ve dokununca ne olacağı
 * çağıranda — filtre mantığı bu bileşene taşınmadı.
 */
export const HAP_SERIDI = 'flex min-w-max items-center gap-2';

export const HapFiltre: React.FC<{
  secili: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Görünen yazı kısaysa erişilebilir tam ad. */
  ariaLabel?: string;
  title?: string;
  /** Solda küçük ikon ya da logo (24 px'e kadar). */
  onEk?: React.ReactNode;
}> = ({ secili, onClick, children, ariaLabel, title, onEk }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={secili}
    aria-label={ariaLabel}
    title={title}
    className="group/hap inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none"
  >
    <span
      className={`inline-flex h-9 max-w-[16rem] items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors group-focus-visible/hap:ring-2 group-focus-visible/hap:ring-blue-600 group-focus-visible/hap:ring-offset-2 ${
        onEk ? 'pl-1.5' : ''
      } ${
        secili
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-gray-200 bg-white text-slate-800 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {onEk}
      <span className="truncate">{children}</span>
    </span>
  </button>
);
