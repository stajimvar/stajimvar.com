import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { GeoNode } from './useKesfetGeo';

/**
 * BREADCRUMB GERÇEK YER ADLARINDAN KURULUYOR
 *
 * "Dünya › Türkiye › İstanbul › Zeytinburnu". Kullanıcıya 'admin1' gibi
 * teknik seviye adları gösterilmiyor; onlar yalnızca ağacın kendi iç
 * sıralaması. Son eleman bulunulan yer, bu yüzden düğme değil
 * `aria-current` taşıyan metin.
 */
export const KesfetGeoBreadcrumb: React.FC<{
  path: GeoNode[];
  onSelect: (code: string | null) => void;
}> = ({ path, onSelect }) => (
  <nav aria-label="Coğrafi konum" className="min-w-0">
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs font-semibold sm:text-sm">
      {path.map((node, sira) => {
        const sonuncu = sira === path.length - 1;
        return (
          <li key={node.code} className="flex min-w-0 items-center gap-1">
            {sira > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />}
            {sonuncu ? (
              <span aria-current="location" className="truncate text-gray-900">{node.name}</span>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(sira === 0 ? null : node.code)}
                className="min-h-8 cursor-pointer truncate rounded-sm text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >{node.name}</button>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);
