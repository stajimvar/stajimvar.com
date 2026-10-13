import React, { useEffect, useState } from 'react';
import { SayfaKabugu } from './SayfaKabugu';
import { supabase } from '../lib/supabase';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';
import { konumEtiketi, calismaEtiketi } from '../lib/sehir';
import { ilanYolu } from '../lib/seo/metin.mjs';
import {
  ARSIV_SAYFA_BOYU,
  acikIlanMi,
  arsivSirasi,
  arsivYolu,
  arsivSayfaBasligi,
  arsivSayfaNumaralari,
} from '../lib/seo/ilan-arsivi.mjs';

/**
 * /staj-ilanlari/sayfa/<n> — açık ilanların sayfalı tam listesi.
 *
 * Ön render (scripts/onrender.mjs) aynı sırayı ve süzgeci
 * `lib/seo/ilan-arsivi.mjs`ten kullanıyor; React açılınca liste canlı
 * veriden yeniden çiziliyor. Sayfa düz bir bağlantı listesi: tarayıcı ve
 * JavaScript'siz ziyaretçi her ilana buradan ulaşabiliyor.
 */
interface ArsivIlani {
  id: string;
  title: string;
  city: string | null;
  work_type: string | null;
  posted_at: string | null;
  created_at: string | null;
  application_deadline: string | null;
  companies: { name: string | null } | null;
}

export const StajIlanlariArsivi: React.FC<{
  sayfa: number;
  onBack: () => void;
  onNavigate: (yol: string) => void;
}> = ({ sayfa, onBack, onNavigate }) => {
  const [ilanlar, setIlanlar] = useState<ArsivIlani[] | null>(null);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    let iptal = false;
    setIlanlar(null);
    setHata(false);
    supabase
      .from('listings')
      .select('id,title,city,work_type,posted_at,created_at,application_deadline,companies(name)')
      .eq('status', 'published')
      .then(({ data, error }) => {
        if (iptal) return;
        if (error) {
          setHata(true);
          return;
        }
        const satirlar = ((data ?? []) as unknown as ArsivIlani[]).filter((i) => acikIlanMi(i)).sort(arsivSirasi);
        setIlanlar(satirlar);
      });
    return () => {
      iptal = true;
    };
  }, []);

  const toplamSayfa = ilanlar ? Math.max(1, Math.ceil(ilanlar.length / ARSIV_SAYFA_BOYU)) : null;
  const gecerli = toplamSayfa !== null && sayfa >= 1 && sayfa <= toplamSayfa;
  const bu = ilanlar && gecerli ? ilanlar.slice((sayfa - 1) * ARSIV_SAYFA_BOYU, sayfa * ARSIV_SAYFA_BOYU) : [];

  useEffect(() => {
    if (!toplamSayfa || !gecerli) return;
    return sayfaMetaAyarla({
      baslik: arsivSayfaBasligi(sayfa, toplamSayfa),
      aciklama: `Açık staj ilanlarının tamamı, en yeniden eskiye: sayfa ${sayfa}/${toplamSayfa}.`,
      yol: arsivYolu(sayfa),
    });
  }, [sayfa, toplamSayfa, gecerli]);

  const git = (olay: React.MouseEvent<HTMLAnchorElement>, yol: string) => {
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
    olay.preventDefault();
    onNavigate(yol);
  };

  return (
    <SayfaKabugu onBack={onBack}>
      <div className="space-y-5">
        <nav aria-label="Sayfa yolu" className="text-sm text-gray-600">
          <a href="/staj-ilanlari" onClick={(e) => git(e, '/staj-ilanlari')} className="font-semibold hover:text-blue-700">
            Staj ilanları
          </a>
          {' › '}Tüm açık ilanlar
        </nav>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Tüm staj ilanları</h1>
        {hata && <p className="text-sm text-gray-600">İlanlar şu an yüklenemedi. Sayfayı yenilemeyi dene.</p>}
        {!hata && ilanlar === null && (
          <p className="text-sm text-gray-500" role="status">Yükleniyor…</p>
        )}
        {ilanlar && !gecerli && (
          <p className="text-sm text-gray-600">
            Bu sayfa yok.{' '}
            <a href={arsivYolu(1)} onClick={(e) => git(e, arsivYolu(1))} className="font-bold text-blue-700">
              İlk sayfaya dön
            </a>
          </p>
        )}
        {gecerli && (
          <>
            <p className="text-sm text-gray-600">
              {ilanlar!.length} açık ilan, en yeniden eskiye · sayfa {sayfa}/{toplamSayfa}
            </p>
            <ul className="space-y-2">
              {bu.map((ilan) => {
                const yol = ilanYolu(ilan);
                const alt = [
                  ilan.companies?.name,
                  ilan.city ? konumEtiketi(ilan.city) : null,
                  ilan.work_type ? calismaEtiketi(ilan.work_type) : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={ilan.id}>
                    <a
                      href={yol}
                      onClick={(e) => git(e, yol)}
                      className="block rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-500"
                    >
                      <span className="block text-[15px] font-bold text-gray-900">{ilan.title}</span>
                      {alt && <span className="mt-0.5 block text-sm text-gray-600">{alt}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
            <nav aria-label="Sayfalar" className="flex flex-wrap items-center gap-3 text-sm font-bold">
              {sayfa > 1 && (
                <a href={arsivYolu(sayfa - 1)} onClick={(e) => git(e, arsivYolu(sayfa - 1))} className="text-blue-700 hover:underline">
                  ← Önceki sayfa
                </a>
              )}
              {/*
                NUMARALI SAYFALAR (13 Ekim 2026): yalnız önceki/sonraki
                varken son sayfa 7 tık derindeydi. Liste ön render ile aynı
                yardımcıdan geliyor (`arsivSayfaNumaralari`); `null` iki
                numara arasındaki atlanan aralık. Bulunulan sayfa bağlantı
                değil — kendine bağlantı tarayıcıya yeni bir yol vermiyor.
                Her hedef en az 44 piksel (`min-h-11 min-w-11`).
              */}
              {arsivSayfaNumaralari(sayfa, toplamSayfa!).map((k, i) =>
                k === null ? (
                  <span key={`bosluk-${i}`} aria-hidden="true" className="text-gray-500">
                    …
                  </span>
                ) : k === sayfa ? (
                  <span
                    key={k}
                    aria-current="page"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-gray-900"
                  >
                    {k}
                  </span>
                ) : (
                  <a
                    key={k}
                    href={arsivYolu(k)}
                    onClick={(e) => git(e, arsivYolu(k))}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-blue-700 hover:underline"
                  >
                    {k}
                  </a>
                ),
              )}
              {sayfa < toplamSayfa! && (
                <a href={arsivYolu(sayfa + 1)} onClick={(e) => git(e, arsivYolu(sayfa + 1))} className="text-blue-700 hover:underline">
                  Sonraki sayfa →
                </a>
              )}
            </nav>
          </>
        )}
      </div>
    </SayfaKabugu>
  );
};
