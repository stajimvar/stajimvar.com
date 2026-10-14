import React from 'react';
import { MapPin } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { listingSlug } from '../lib/slug';
import { calismaEtiketi, konumEtiketi } from '../lib/sehir';
import { KART_EYLEMI } from '../lib/kart-cta';
import { bolumIlanAlani, bolumIlanlari } from '../lib/bolum-ilanlari.mjs';
/*
  YALNIZ TİP: `lib/queries` gövdesi Supabase istemcisini kuruyor; ön render
  Node'da çalıştığı için gerçek import efektin içinde (RehberdeIlanlar ile
  aynı gerekçe).
*/
import type { BolumIlanSatiri } from '../lib/queries';

/**
 * BÖLÜM SAYFASINDA GÜNCEL STAJ İLANLARI (14 Ekim 2026)
 *
 * Seçim `lib/bolum-ilanlari.mjs`te ve ön render'la ORTAK: bölümün alanına
 * birincil alanıyla uyan, süresi geçmemiş, tekrarsız en çok altı ilan;
 * Türkiye ilanları önce. Eşleşen yoksa dolgu ilan YOK — tek cümle ve
 * /staj-ilanlari bağlantısı. Haritada olmayan bölümde (sağlık) blok yok.
 *
 * Kart InternshipCard'ın iskeleti (80×80 logo, başlık, şirket, şehir ·
 * çalışma şekli, "İlanı incele"); ön render'daki `.sv-kart` aynı ölçülerle
 * yazılı. Kaydet düğmesi yok: bu blok bir liste ekranı değil, yönlendirme.
 */
type Durum =
  | { tur: 'yukleniyor' }
  | { tur: 'hazir'; alanAdi: string | null; ilanlar: BolumIlanSatiri[] }
  | { tur: 'hata' };

export const BolumIlanlari: React.FC<{
  bolumSlug: string;
  onNavigate: (yol: string) => void;
}> = ({ bolumSlug, onNavigate }) => {
  const [durum, setDurum] = React.useState<Durum>({ tur: 'yukleniyor' });
  const uygun = bolumIlanAlani(bolumSlug) !== null;

  React.useEffect(() => {
    if (!uygun) return;
    let iptal = false;
    setDurum({ tur: 'yukleniyor' });
    void (async () => {
      try {
        const { fetchBolumIlanVerisi } = await import('../lib/queries');
        const { ilanlar, sektorler } = await fetchBolumIlanVerisi();
        if (iptal) return;
        const sonuc = bolumIlanlari({ bolumSlug, ilanlar, sektorler });
        setDurum({ tur: 'hazir', alanAdi: sonuc.alan?.ad ?? null, ilanlar: sonuc.ilanlar as BolumIlanSatiri[] });
      } catch {
        if (!iptal) setDurum({ tur: 'hata' });
      }
    })();
    return () => {
      iptal = true;
    };
  }, [bolumSlug, uygun]);

  if (!uygun || durum.tur === 'yukleniyor') return null;

  const git = (yol: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(yol);
  };
  const tumIlanlar = (metin: string) => (
    <a
      href="/staj-ilanlari"
      onClick={git('/staj-ilanlari')}
      className="text-sm font-bold text-blue-700 hover:underline"
    >
      {metin}
    </a>
  );

  /* Okuma düşerse "ilan yok" denmiyor: yalnız tüm ilanlara giden yol. */
  if (durum.tur === 'hata') {
    return <p className="mt-8">{tumIlanlar('Tüm staj ilanları →')}</p>;
  }

  const baslik = durum.alanAdi ? `${durum.alanAdi} alanında açık staj ilanları` : 'Açık staj ilanları';

  return (
    <section className="mt-8" aria-labelledby="bolum-ilanlari-baslik">
      <h2 id="bolum-ilanlari-baslik" className="text-lg font-bold text-gray-900">
        {baslik}
      </h2>
      {durum.ilanlar.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Şu anda bu alanda açık staj ilanı yok. {tumIlanlar('Tüm staj ilanlarına göz at →')}
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5 sm:space-y-3">
            {durum.ilanlar.map((ilan) => {
              const yol = `/ilan/${listingSlug(ilan)}`;
              const sirket = ilan.companies?.name ?? '';
              const konum = [ilan.city ? konumEtiketi(ilan.city) : '', ilan.work_type ? calismaEtiketi(ilan.work_type) : '']
                .filter(Boolean)
                .join(' · ');
              return (
                <li
                  key={ilan.id}
                  className="flex min-w-0 items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="shrink-0" title={sirket}>
                    <CompanyLogo
                      name={sirket}
                      logoUrl={ilan.companies?.logo_url ?? ''}
                      className="!h-20 !w-20 !rounded-xl !p-2 !text-2xl"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={yol}
                      onClick={git(yol)}
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
                        onClick={git(yol)}
                        aria-label={`${ilan.title} ilanını incele`}
                        className={`ml-auto shrink-0 ${KART_EYLEMI.kenar}`}
                      >
                        İlanı incele
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3">{tumIlanlar('Tüm staj ilanları →')}</p>
        </>
      )}
    </section>
  );
};
