import React, { Suspense } from 'react';

const KesfetGlobe = React.lazy(() => import('./KesfetGlobe'));

/**
 * KÜRE ALANI
 *
 * Küre ilk açılışta görünüyor ama paketi ana pakete girmiyor: bileşen de
 * sınır verisi de ayrı dosyalar hâlinde geliyor. Küre inmeden ya da hiç
 * inemezse ülke listesi tek başına çalışıyor — seçim yapmanın klavyeyle
 * ve ekran okuyucuyla çalışan yolu bu liste.
 */
export const KesfetGlobePanel: React.FC<{
  phase: 'idle' | 'loading' | 'ready' | 'error';
  countries: { code: string; name: string; count: number }[];
  selectedCountry: string | null;
  onSelect: (code: string) => void;
  onReload: () => void;
}> = ({ phase, countries, selectedCountry, onSelect, onReload }) => (
  <section aria-label="Dünya üzerinde keşfet" className="rounded-2xl border border-gray-200 bg-white p-3">
    {phase === 'error' ? (
      <div role="alert" className="py-6 text-center">
        <p className="text-sm font-bold text-gray-900">Harita verisi yüklenemedi.</p>
        <button type="button" onClick={onReload} className="mt-2 min-h-11 cursor-pointer text-sm font-bold text-blue-700 hover:underline">
          Tekrar dene
        </button>
      </div>
    ) : phase !== 'ready' ? (
      <div role="status" aria-label="Ülke sayıları yükleniyor" className="mx-auto aspect-square w-full max-w-[220px] sm:max-w-[300px] animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
    ) : (
      <div className="mx-auto w-full max-w-[220px] sm:max-w-[300px]">
        <Suspense
          fallback={<div role="status" aria-label="Küre yükleniyor" className="aspect-square w-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />}
        >
          <KesfetGlobe countries={countries} selectedCountry={selectedCountry} onSelect={onSelect} />
        </Suspense>
      </div>
    )}
    {phase === 'ready' && (
      <div className="mt-3">
        {countries.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {countries.map((ulke) => {
              const secili = ulke.code === selectedCountry;
              const durumStili = secili
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-gray-200 bg-white text-gray-800 hover:border-blue-400';
              return (
                <li key={ulke.code}>
                  <button
                    type="button"
                    onClick={() => onSelect(ulke.code)}
                    aria-pressed={secili}
                    className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${durumStili}`}
                  >
                    {ulke.name}
                    <span className="rounded-full bg-blue-50 px-1.5 text-[11px] font-extrabold tabular-nums text-blue-800">{ulke.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-gray-600">Bu filtrelerle hiçbir ülkede etkinlik yok.</p>
        )}
      </div>
    )}
  </section>
);
