import React, { useEffect, useState } from 'react';
import { ArrowLeft, Globe, MapPin, ShieldCheck, BadgeCheck } from 'lucide-react';
import type { InternshipListing } from '../types';
import { fetchCompanyPage } from '../lib/queries';
import { CompanyLogo } from './CompanyLogo';
import { Logo } from './Logo';
import { listingSlug } from '../lib/slug';

/**
 * Şirket sayfası.
 *
 * İki işi var: öğrenciye şirketin tüm açık ilanlarını tek yerde göstermek, ve
 * şirkete "platformda böyle görünüyorsunuz" diye gösterilebilecek bir adres
 * vermek. İkincisi davet akışının temeli.
 *
 * Şirket bilgileri şu an toplanan ilanlardan geliyor, yani eksik olabilir.
 * Eksik alanı uydurmuyoruz; sahiplenme akışıyla şirket kendisi dolduracak.
 */

interface CompanyPageProps {
  slug: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

type Durum = 'yukleniyor' | 'hazir' | 'yok' | 'hata';
type Veri = Awaited<ReturnType<typeof fetchCompanyPage>>;

export const CompanyPage: React.FC<CompanyPageProps> = ({ slug, onBack, onNavigate }) => {
  const [veri, setVeri] = useState<Veri>(null);
  const [durum, setDurum] = useState<Durum>('yukleniyor');

  useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    fetchCompanyPage(slug)
      .then((d) => {
        if (iptal) return;
        setVeri(d);
        setDurum(d ? 'hazir' : 'yok');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!veri) return;
    const onceki = document.title;
    document.title = `${veri.company.name} staj ilanları | StajımVar`;
    return () => {
      document.title = onceki;
    };
  }, [veri]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B0F17] text-gray-900 dark:text-slate-100">
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label="Ana sayfa">
            <Logo />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tüm ilanlar
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {durum === 'yukleniyor' && (
          <div className="h-40 rounded-3xl bg-gray-100 dark:bg-slate-900 animate-pulse" />
        )}

        {durum === 'yok' && (
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
            <p className="font-bold">Bu şirket bulunamadı</p>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              İlanlara dön
            </button>
          </div>
        )}

        {durum === 'hata' && (
          <p className="text-sm text-red-700 dark:text-red-400">Şirket bilgisi yüklenemedi.</p>
        )}

        {durum === 'hazir' && veri && (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-5 sm:p-7 space-y-4">
              <div className="flex items-start gap-4">
                <CompanyLogo
                  name={veri.company.name}
                  logoUrl={veri.company.logoUrl}
                  className="w-16 h-16 rounded-2xl shrink-0 p-2 text-xl"
                />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold">{veri.company.name}</h1>
                    {veri.company.verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Doğrulanmış
                      </span>
                    ) : (
                      /*
                        Doğrulanmamış olmak kötü bir şey değil, sadece henüz
                        şirketin kendisi sahiplenmemiş demek. Bunu gizlemek
                        yerine açıkça yazıyoruz.
                      */
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                        Henüz sahiplenilmemiş
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
                    {veri.company.industry && <span>{veri.company.industry}</span>}
                    {veri.company.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {veri.company.location}
                      </span>
                    )}
                    {veri.company.websiteUrl && (
                      <a
                        href={veri.company.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Web sitesi
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {veri.company.description && (
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed pt-3 border-t border-gray-100 dark:border-slate-800">
                  {veri.company.description}
                </p>
              )}

              {!veri.company.verified && (
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  Bu sayfadaki ilanlar {veri.company.name} şirketinin kendi kariyer
                  sisteminden derlendi. Şirket yetkilisiyseniz sayfayı sahiplenmek veya
                  ilanların kaldırılmasını istemek için{' '}
                  <a
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    href="mailto:iletisim@stajimvar.com"
                  >
                    iletisim@stajimvar.com
                  </a>{' '}
                  adresine yazabilirsiniz.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest px-1">
                Açık ilanlar ({veri.listings.length})
              </h2>

              {veri.listings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 text-center">
                  Şu anda açık ilanı yok. Kaynağı saatlik kontrol ediyoruz; yeni ilan
                  açıldığında burada görünür.
                </p>
              ) : (
                veri.listings.map((ilan: InternshipListing) => (
                  <button
                    key={ilan.id}
                    type="button"
                    onClick={() => onNavigate(`/ilan/${listingSlug(ilan)}`)}
                    className="w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors p-4 space-y-1.5"
                  >
                    <p className="font-bold text-gray-900 dark:text-white">{ilan.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {ilan.city || 'Belirtilmemiş'} ({ilan.workType})
                      </span>
                      {ilan.stipend.isPaid && (
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">Ücretli</span>
                      )}
                      {ilan.mandatoryStajAccepted && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Zorunlu staj
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
