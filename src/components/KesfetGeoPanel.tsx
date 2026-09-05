import React, { Suspense, useMemo } from 'react';
import { MapPin, X } from 'lucide-react';
import type { DiscoverEvent } from '../lib/kesfet';
import { haritaAyari, webglVarMi } from '../lib/harita-ayarlari';
import { KesfetGeoBreadcrumb } from './KesfetGeoBreadcrumb';
import type { GeoNode } from './useKesfetGeo';

const KesfetGeoMap = React.lazy(() => import('./KesfetGeoMap'));

/* Yakınlaşma seviyesi düğümün derinliğinden geliyor, ülkeye gömülü değil. */
const YAKINLIK: Record<string, number> = { country: 4.6, admin1: 8.4, admin2: 10.8, locality: 12, venue: 14 };

const azHareket = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * HARİTA ALANI
 *
 * Katalog ızgarasının ilk satırını kaplıyor; sayfanın tamamını değil.
 * Altındaki kartlar yerinde kalıyor ve buradaki sayılarla aynı kümeyi
 * gösteriyor.
 *
 * HARİTA ÇİZİLEMEDİĞİNDE DE ÇALIŞIYOR
 * -----------------------------------
 * WebGL yoksa ya da stil ağdan inmezse bölge listesi tek başına tam
 * işlevli: adlar, sayılar ve alt seviyeye inme aynı yerde. Harita bu
 * ekranın süsü değil, listenin görsel karşılığı.
 */
export const KesfetGeoPanel: React.FC<{
  breadcrumb: GeoNode[];
  node: GeoNode | null;
  regions: GeoNode[];
  pins: DiscoverEvent[];
  unpinnedCount: number;
  center: { latitude: number; longitude: number } | null;
  onSelect: (code: string | null) => void;
  onOpenEvent: (slug: string) => void;
}> = ({ breadcrumb, node, regions, pins, unpinnedCount, center, onSelect, onOpenEvent }) => {
  const ayar = useMemo(() => haritaAyari(), []);
  const webgl = useMemo(() => webglVarMi(), []);
  const cizilebilir = ayar.hazir && webgl;
  const toplam = node?.count ?? 0;

  return (
    <section
      aria-label="Harita ile keşif"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2.5 sm:px-4">
        <KesfetGeoBreadcrumb path={breadcrumb} onSelect={onSelect} />
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="ml-auto flex min-h-9 cursor-pointer items-center gap-1 rounded-xl border border-gray-200 px-2.5 text-xs font-bold text-gray-700 hover:border-blue-400 hover:text-blue-700"
        >
          <X className="h-3.5 w-3.5" aria-hidden />Haritayı kapat
        </button>
      </div>

      {/*
        Harita çizilemiyorsa boş bir kutu AYRILMIYOR: bölge listesi tüm
        genişliği alıyor ve alan kadar yer kaplıyor. Çalışmayan bir şey
        için yer tutmak, ekranın o kadarını boşa harcamak olurdu.
      */}
      <div className={cizilebilir ? 'grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]' : ''}>
        {cizilebilir ? (
          <div className="relative order-2 h-[220px] w-full bg-gray-50 sm:h-[300px] lg:order-1 lg:h-[340px]">
            <Suspense fallback={<p role="status" className="flex h-full items-center justify-center text-sm text-gray-500">Harita yükleniyor…</p>}>
              <KesfetGeoMap
                styleUrl={ayar.styleUrl}
                center={center}
                zoom={YAKINLIK[node?.level ?? 'country'] ?? 4.6}
                pins={pins}
                onSelectPin={onOpenEvent}
                reducedMotion={azHareket()}
              />
            </Suspense>
            <p className="pointer-events-none absolute left-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-700">
              {pins.length > 0
                ? `${pins.length} etkinliğin adresi haritada`
                : 'Adresi doğrulanmış etkinlik yok'}
            </p>
          </div>
        ) : (
          <p className="flex items-start gap-2 border-b border-gray-100 px-3 py-2 text-xs text-gray-600 sm:px-4">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <span>
              <span className="font-bold text-gray-900">
                {ayar.hazir ? 'Bu tarayıcı harita çizimini desteklemiyor.' : ayar.gerekce}
              </span>{' '}
              Aşağıdaki liste aynı sonuçları veriyor: bölgeye inmek için adına dokun.
            </span>
          </p>
        )}

        <div className={`min-w-0 p-3 ${cizilebilir ? 'order-1 border-b border-gray-100 lg:order-2 lg:border-b-0 lg:border-l' : ''}`}>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {node ? `${node.name} içinde` : 'Bölgeler'}
          </h3>
          {regions.length > 0 ? (
            <ul className={`mt-2 flex flex-wrap gap-1.5 ${cizilebilir ? 'max-h-[120px] overflow-y-auto lg:max-h-[280px] lg:flex-col lg:flex-nowrap' : ''}`}>
              {regions.map((bolge) => (
                <li key={bolge.code} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelect(bolge.code)}
                    className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-gray-800 hover:border-blue-400 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <span className="truncate">{bolge.name}</span>
                    <span className="ml-auto shrink-0 rounded-full bg-blue-50 px-1.5 text-[11px] font-extrabold tabular-nums text-blue-800">{bolge.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-gray-600">
              {toplam > 0
                ? 'Bu seviyenin altında ayrı bir bölge kaydı yok.'
                : 'Bu filtrelerle burada etkinlik bulunamadı.'}
            </p>
          )}
          {unpinnedCount > 0 && (
            <p className="mt-3 border-t border-gray-100 pt-2 text-[11px] leading-snug text-gray-500">
              {unpinnedCount} etkinliğin adresi doğrulanmadığı için haritada nokta olarak
              gösterilmiyor. Hepsi aşağıdaki listede duruyor.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
