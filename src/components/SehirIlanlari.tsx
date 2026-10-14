import React, { useEffect, useState } from 'react';
import { SayfaKabugu } from './SayfaKabugu';
import { SadeIlanKarti, type SadeIlan } from './SadeIlanKarti';
import { supabase } from '../lib/supabase';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';
import { ARSIV_SAYFA_BOYU, arsivSayfaNumaralari } from '../lib/seo/ilan-arsivi.mjs';
import { SEHIR_ILAN_SECIMI, SEHIR_SAYFALARI, sehirIlanlari, sehirYolu } from '../lib/seo/sehir-ilanlari.mjs';

/**
 * /staj-ilanlari/<şehir>(/sayfa/<n>) — yalnız İstanbul (14 Ekim 2026).
 *
 * Seçim ön render ve kenar çizimiyle ORTAK (lib/seo/sehir-ilanlari):
 * yayındaki ilanların tamamı tek sorguda okunuyor (24'lük katalog sayfası
 * değil), ilanIli ile süzülüyor, 30'arlı sayfalanıyor.
 */
export const SehirIlanlari: React.FC<{
  slug: string;
  sayfa: number;
  onBack: () => void;
  onNavigate: (yol: string) => void;
}> = ({ slug, sayfa, onBack, onNavigate }) => {
  const tanim = (SEHIR_SAYFALARI as Record<string, { il: string; bulunma: string }>)[slug];
  const [ilanlar, setIlanlar] = useState<SadeIlan[] | null>(null);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    let iptal = false;
    setIlanlar(null);
    setHata(false);
    supabase
      .from('listings')
      .select(SEHIR_ILAN_SECIMI)
      .eq('status', 'published')
      .then(({ data, error }) => {
        if (iptal) return;
        if (error) {
          setHata(true);
          return;
        }
        setIlanlar(sehirIlanlari((data ?? []) as unknown[], tanim?.il) as SadeIlan[]);
      });
    return () => {
      iptal = true;
    };
  }, [slug, tanim?.il]);

  const toplamSayfa = ilanlar ? Math.max(1, Math.ceil(ilanlar.length / ARSIV_SAYFA_BOYU)) : null;
  const gecerli = toplamSayfa !== null && sayfa >= 1 && sayfa <= toplamSayfa;
  const bu = ilanlar && gecerli ? ilanlar.slice((sayfa - 1) * ARSIV_SAYFA_BOYU, sayfa * ARSIV_SAYFA_BOYU) : [];

  useEffect(() => {
    if (!tanim || !toplamSayfa || !gecerli || !ilanlar) return;
    return sayfaMetaAyarla({
      baslik: sayfa === 1 ? `${tanim.il} Staj İlanları | StajımVar` : `${tanim.il} staj ilanları — sayfa ${sayfa}/${toplamSayfa} | StajımVar`,
      aciklama: `${tanim.bulunma} ${ilanlar.length} açık staj ilanı, en yeniden eskiye.`,
      yol: sehirYolu(slug, sayfa),
    });
  }, [slug, sayfa, toplamSayfa, gecerli, ilanlar, tanim]);

  const git = (e: React.MouseEvent<HTMLAnchorElement>, yol: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(yol);
  };

  if (!tanim) return null;
  return (
    <SayfaKabugu onBack={onBack}>
      <div className="space-y-5">
        <nav aria-label="Sayfa yolu" className="text-sm text-gray-600">
          <a href="/staj-ilanlari" onClick={(e) => git(e, '/staj-ilanlari')} className="font-semibold hover:text-blue-700">
            Staj ilanları
          </a>
          {' › '}
          {tanim.il}
        </nav>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
          {tanim.il} {sayfa === 1 ? 'Staj İlanları' : 'staj ilanları'}
        </h1>
        {hata && <p className="text-sm text-gray-600">İlanlar şu an yüklenemedi. Sayfayı yenilemeyi dene.</p>}
        {!hata && ilanlar === null && (
          <p className="text-sm text-gray-500" role="status">Yükleniyor…</p>
        )}
        {ilanlar && !gecerli && (
          <p className="text-sm text-gray-600">
            Bu sayfa yok.{' '}
            <a href={sehirYolu(slug)} onClick={(e) => git(e, sehirYolu(slug))} className="font-bold text-blue-700">
              İlk sayfaya dön
            </a>
          </p>
        )}
        {gecerli && (
          <>
            <p className="text-sm text-gray-600">
              {tanim.bulunma} {ilanlar!.length} açık staj ilanı, en yeniden eskiye
              {toplamSayfa! > 1 ? ` · sayfa ${sayfa}/${toplamSayfa}` : ''}
            </p>
            <ul className="space-y-1.5 sm:space-y-3">
              {bu.map((ilan) => (
                <SadeIlanKarti key={ilan.id} ilan={ilan} onNavigate={onNavigate} />
              ))}
            </ul>
            {toplamSayfa! > 1 && (
              <nav aria-label="Sayfalar" className="flex flex-wrap items-center gap-3 text-sm font-bold">
                {sayfa > 1 && (
                  <a href={sehirYolu(slug, sayfa - 1)} onClick={(e) => git(e, sehirYolu(slug, sayfa - 1))} className="inline-flex min-h-11 items-center text-blue-700 hover:underline">
                    ← Önceki sayfa
                  </a>
                )}
                {arsivSayfaNumaralari(sayfa, toplamSayfa!).map((k, i) =>
                  k === null ? (
                    <span key={`b-${i}`} aria-hidden="true" className="text-gray-500">…</span>
                  ) : k === sayfa ? (
                    <span key={k} aria-current="page" className="inline-flex min-h-11 min-w-11 items-center justify-center text-gray-900">{k}</span>
                  ) : (
                    <a key={k} href={sehirYolu(slug, k)} onClick={(e) => git(e, sehirYolu(slug, k))} className="inline-flex min-h-11 min-w-11 items-center justify-center text-blue-700 hover:underline">
                      {k}
                    </a>
                  ),
                )}
                {sayfa < toplamSayfa! && (
                  <a href={sehirYolu(slug, sayfa + 1)} onClick={(e) => git(e, sehirYolu(slug, sayfa + 1))} className="inline-flex min-h-11 items-center text-blue-700 hover:underline">
                    Sonraki sayfa →
                  </a>
                )}
              </nav>
            )}
            <p>
              <a href="/staj-ilanlari" onClick={(e) => git(e, '/staj-ilanlari')} className="text-sm font-bold text-blue-700 hover:underline">
                Türkiye'deki tüm staj ilanları →
              </a>
            </p>
          </>
        )}
      </div>
    </SayfaKabugu>
  );
};
