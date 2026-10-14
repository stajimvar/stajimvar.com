import React from 'react';
import { MapPin } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { listingSlug } from '../lib/slug';
import { calismaEtiketi, ilanKonumEtiketi } from '../lib/sehir';
import { KART_EYLEMI } from '../lib/kart-cta';

/**
 * SADE İLAN KARTI — bölüm bloğu ve şehir sayfası (14 Ekim 2026)
 *
 * InternshipCard'ın iskeleti (80×80 logo, başlık, şirket, şehir · çalışma
 * şekli, "İlanı incele"); ön render'daki `.sv-kart` aynı ölçülerle yazılı
 * (src/lib/seo/ilan-karti-html.mjs). Kaydet düğmesi yok: bu kartlar liste
 * ekranı değil, yönlendirme. Konum önce normalize il/ilçeden (lib/sehir).
 */
export interface SadeIlan {
  id: string;
  title: string;
  city: string | null;
  il?: string | null;
  ilce?: string | null;
  work_type: string | null;
  companies: { name: string | null; logo_url: string | null } | null;
}

export const SadeIlanKarti: React.FC<{ ilan: SadeIlan; onNavigate: (yol: string) => void }> = ({ ilan, onNavigate }) => {
  const yol = `/ilan/${listingSlug(ilan)}`;
  const git = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(yol);
  };
  const sirket = ilan.companies?.name ?? '';
  const konum = [ilan.il || ilan.city ? ilanKonumEtiketi(ilan) : '', ilan.work_type ? calismaEtiketi(ilan.work_type) : '']
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="shrink-0" title={sirket}>
        <CompanyLogo name={sirket} logoUrl={ilan.companies?.logo_url ?? ''} className="!h-20 !w-20 !rounded-xl !p-2 !text-2xl" />
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={yol}
          onClick={git}
          className="break-words text-base font-semibold leading-[22px] text-slate-900 hover:text-blue-700"
        >
          {ilan.title}
        </a>
        {sirket && <p className="mt-0.5 break-words text-sm leading-5 text-gray-700">{sirket}</p>}
        <div className="mt-1 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
          <p className="flex min-w-0 flex-1 basis-28 items-start gap-1.5 text-sm leading-5 text-gray-600">
            {konum && (
              <>
                <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0 break-words">{konum}</span>
              </>
            )}
          </p>
          <a
            href={yol}
            onClick={git}
            aria-label={`${ilan.title} ilanını incele`}
            className={`ml-auto shrink-0 ${KART_EYLEMI.kenar}`}
          >
            İlanı incele
          </a>
        </div>
      </div>
    </li>
  );
};
