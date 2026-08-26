import React from 'react';
import { GECIS } from './tokens';

/**
 * Sekmeler — sitedeki TEK sekme bileşeni.
 *
 * NEDEN TEK
 * ---------
 * Aynı işi yapan üç ayrı sekme biçimi vardı: kapsül içinde beyaz hap,
 * altı çizgili sekme ve yuvarlak çipler. Üçü de "şu an buradasın" diyordu
 * ama üçü de farklı görünüyordu; kullanıcı her ekranda kontrolü yeniden
 * öğreniyordu.
 *
 * Bir biçim var: gri kapsül içinde beyaz hap. Dar ekranda yatay kayıyor
 * ve kaydırma çubuğu gizli.
 */
export interface TabItem {
  id: string;
  etiket: string;
  /** Yanında sayı gösterilecekse. */
  sayi?: number;
}

export const Tabs: React.FC<{
  ogeler: TabItem[];
  secili: string;
  onSec: (id: string) => void;
  etiket: string;
  className?: string;
}> = ({ ogeler, secili, onSec, etiket, className = '' }) => (
  <nav
    aria-label={etiket}
    className={`flex items-center gap-1 overflow-x-auto rounded-full bg-gray-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
  >
    {ogeler.map((o) => {
      const acik = o.id === secili;
      return (
        <button
          key={o.id}
          type="button"
          onClick={() => onSec(o.id)}
          aria-current={acik ? 'page' : undefined}
          /* min-h-11: dokunma alanı. shrink-0: dar ekranda ezilmesin. */
          className={`min-h-11 shrink-0 rounded-full px-3.5 text-xs font-bold ${GECIS} cursor-pointer ${
            acik ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {o.etiket}
          {typeof o.sayi === 'number' && (
            <span className={acik ? 'text-blue-700/70' : 'text-gray-500'}> ({o.sayi})</span>
          )}
        </button>
      );
    })}
  </nav>
);
