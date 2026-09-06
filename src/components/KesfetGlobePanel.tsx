import React, { Suspense } from 'react';
import { ChevronDown } from 'lucide-react';

const KesfetGlobe = React.lazy(() => import('./KesfetGlobe'));

/**
 * KÜRE ALANI
 *
 * KÜRE KAPALI BAŞLIYOR
 * --------------------
 * NEDEN: canlıda görüldü, küre sol sütunu domine ediyor ve sayfanın asıl
 * işi olan filtre + liste aşağı itiliyordu. Özellik kaldırılmadı, bir tık
 * arkasına alındı: "Dünya haritasında keşfet" düğmesi küreyi bugünkü
 * hâliyle geri getiriyor. Açık/kapalı bu panelin kendi iç durumu; dışarıya
 * verdiği arayüz aynı kaldı.
 *
 * KAPALIYKEN HİÇBİR ŞEY İNMİYOR
 * -----------------------------
 * NEDEN: küre bileşeni kapalıyken hiç render edilmiyor, dolayısıyla ayrı
 * paketi de sınır (topojson) verisi de ilk boyamada ağdan inmiyor. Görsel
 * kazancın yanında ölçülebilir bir yükleme kazancı da bu.
 *
 * ÜLKE ÇİPLERİ KÜREYE BAĞLI DEĞİL
 * -------------------------------
 * NEDEN: ülke seçmenin klavyeyle ve ekran okuyucuyla çalışan yolu bu liste.
 * Küre kapalıyken de, hiç inemediğinde de çipler yerinde duruyor; küreyi
 * gizlemek seçim yeteneğini kaldırmıyor.
 */
export const KesfetGlobePanel: React.FC<{
  phase: 'idle' | 'loading' | 'ready' | 'error';
  countries: { code: string; name: string; count: number }[];
  selectedCountry: string | null;
  onSelect: (code: string) => void;
  onReload: () => void;
}> = ({ phase, countries, selectedCountry, onSelect, onReload }) => {
  const [acik, setAcik] = React.useState(false);
  const kureId = React.useId();

  return (
    <section aria-label="Dünya üzerinde keşfet" className="rounded-2xl border border-gray-200 bg-white p-3">
      {phase === 'error' ? (
        <div role="alert" className="py-6 text-center">
          <p className="text-sm font-bold text-gray-900">Harita verisi yüklenemedi.</p>
          <button type="button" onClick={onReload} className="mt-2 min-h-11 cursor-pointer text-sm font-bold text-blue-700 hover:underline">
            Tekrar dene
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setAcik((onceki) => !onceki)}
            aria-expanded={acik}
            aria-controls={kureId}
            className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-1 text-sm font-bold text-gray-900 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Dünya haritasında keşfet
            <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${acik ? 'rotate-180' : ''}`} />
          </button>
          <div id={kureId} className={acik ? 'mx-auto mt-2 w-full max-w-[220px] sm:max-w-[300px]' : undefined}>
            {acik &&
              (phase !== 'ready' ? (
                <div role="status" aria-label="Ülke sayıları yükleniyor" className="aspect-square w-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
              ) : (
                <Suspense
                  fallback={<div role="status" aria-label="Küre yükleniyor" className="aspect-square w-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />}
                >
                  <KesfetGlobe countries={countries} selectedCountry={selectedCountry} onSelect={onSelect} />
                </Suspense>
              ))}
          </div>
        </>
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
};
