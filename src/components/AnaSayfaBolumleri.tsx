import React from 'react';
import { ANASAYFA_BOLUMLERI, anaSayfaSehirBaglantisi } from '../lib/anasayfa-baglantilari.mjs';

/**
 * ANA SAYFA: TÜM İLANLAR VE ŞEHİR SAYFASI (15 Ekim 2026)
 *
 * Ön render ilk kartların altında "Tüm staj ilanları →" ve yanında şehir
 * sayfasını veriyor; uygulamada bu satır yoktu. Aynı iki bağlantı, aynı
 * yerde: MatchedInternshipsView onu ilk ANASAYFA_ILK_KART kartın ardına
 * koyuyor. Şehir bağlantısı ortak modülden (lib/anasayfa-baglantilari).
 */
export const AnaSayfaIlanBaglantilari: React.FC<{ onNavigate: (yol: string) => void }> = ({ onNavigate }) => {
  const sehir = anaSayfaSehirBaglantisi();
  const git = (yol: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(yol);
  };
  const sinif = 'inline-flex min-h-6 items-center text-blue-700 hover:underline';
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1.5 py-1.5 text-sm font-bold leading-6">
      <a href="/staj-ilanlari" onClick={git('/staj-ilanlari')} className={sinif}>
        Tüm staj ilanları →
      </a>
      {sehir && (
        <a href={sehir.yol} onClick={git(sehir.yol)} className={sinif}>
          {sehir.metin} →
        </a>
      )}
    </p>
  );
};

/**
 * ANA SAYFADAN BÖLÜM SAYFALARINA (14 Ekim 2026)
 *
 * Ana sayfa yalnız /bolumler'e bağlanıyordu. Liste ön render'la ortak
 * (lib/anasayfa-baglantilari); burada yalnız sade bir bağlantı satırı:
 * çip değil, süzgeç değil — bölüm sayfasına giden düz bağlantılar.
 */
export const AnaSayfaBolumleri: React.FC<{ onNavigate: (yol: string) => void }> = ({ onNavigate }) => {
  const git = (yol: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(yol);
  };
  return (
    <nav aria-labelledby="bolum-baglantilari" className="mt-5">
      <h2 id="bolum-baglantilari" className="text-base font-extrabold text-gray-950">
        Bölüme göre staj
      </h2>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-semibold leading-6">
        {ANASAYFA_BOLUMLERI.map(([slug, ad]) => (
          <li key={slug}>
            <a href={`/bolum/${slug}`} onClick={git(`/bolum/${slug}`)} className="inline-flex min-h-6 items-center text-blue-700 hover:underline">
              {ad}
            </a>
          </li>
        ))}
        <li>
          <a href="/bolumler" onClick={git('/bolumler')} className="inline-flex min-h-6 items-center text-blue-700 hover:underline">
            Tüm bölümler →
          </a>
        </li>
      </ul>
    </nav>
  );
};
