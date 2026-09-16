import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ODAK_HALKASI } from '../lib/renk-token';

/**
 * "Ayarlar ve hareketler" — Instagram'daki ☰ sayfasının StajımVar karşılığı
 * (kullanıcı isteği, 17 Eylül 2026).
 *
 * Profil kartında dağınık duran kişisel eylemler (profil durumu, yetkinlik
 * testleri, kaydedilenler, başvurular, dişli menüsünün satırları, yönetim
 * paneli, çıkış) tek bir listede toplanıyor. Kart yalnız kimliği ve iki ana
 * eylemi (CV, profili düzenle) taşıyor.
 *
 * Tam ekran, sayfanın üstünde; geri oku ve Escape kapatıyor.
 */

export interface AyarOgesi {
  anahtar: string;
  etiket: string;
  ikon: React.ReactNode;
  /** Satırın sağındaki kısa bilgi (sayı, durum). */
  sag?: React.ReactNode;
  onClick: () => void;
  pasif?: boolean;
  /** Kırmızı metin (çıkış). */
  tehlike?: boolean;
}

export interface AyarBolumu {
  baslik?: string;
  ogeler: AyarOgesi[];
}

export const ProfilAyarlarSayfasi: React.FC<{
  acik: boolean;
  onKapat: () => void;
  bolumler: AyarBolumu[];
}> = ({ acik, onKapat, bolumler }) => {
  const panel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!acik) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onKapat();
    };
    document.addEventListener('keydown', tus);
    const eskiTasma = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const kare = window.requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('button')?.focus());
    return () => {
      document.removeEventListener('keydown', tus);
      document.body.style.overflow = eskiTasma;
      window.cancelAnimationFrame(kare);
    };
  }, [acik, onKapat]);

  if (!acik || typeof document === 'undefined') return null;

  const dolu = bolumler.filter((b) => b.ogeler.length > 0);

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profil-ayarlar-baslik"
      className="fixed inset-0 z-[100] overflow-y-auto bg-white"
    >
      <div className="mx-auto w-full max-w-xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 flex h-15 items-center bg-white px-2.5">
          <button
            type="button"
            onClick={onKapat}
            aria-label="Geri"
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-xs hover:bg-gray-50 ${ODAK_HALKASI}`}
          >
            <ChevronLeft aria-hidden className="h-6 w-6" />
          </button>
          <h2 id="profil-ayarlar-baslik" className="flex-1 pr-11 text-center text-[17px] font-bold text-gray-900">
            Ayarlar ve hareketler
          </h2>
        </div>

        {dolu.map((bolum, sira) => (
          <section key={bolum.baslik ?? sira} className={sira > 0 ? 'border-t-8 border-gray-100' : ''}>
            {bolum.baslik && (
              <h3 className="px-4 pb-1 pt-4 text-sm font-semibold text-gray-500">{bolum.baslik}</h3>
            )}
            <ul>
              {bolum.ogeler.map((oge) => (
                <li key={oge.anahtar}>
                  <button
                    type="button"
                    onClick={oge.onClick}
                    disabled={oge.pasif}
                    className={`flex min-h-14 w-full cursor-pointer items-center gap-3.5 px-4 text-left hover:bg-gray-50 disabled:cursor-default disabled:opacity-50 ${ODAK_HALKASI}`}
                  >
                    <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center ${oge.tehlike ? 'text-rose-600' : 'text-gray-900'}`}>
                      {oge.ikon}
                    </span>
                    <span className={`min-w-0 flex-1 text-[16px] ${oge.tehlike ? 'font-semibold text-rose-600' : 'text-gray-900'}`}>
                      {oge.etiket}
                    </span>
                    {oge.sag !== undefined && <span className="shrink-0 text-[15px] text-gray-500">{oge.sag}</span>}
                    {!oge.tehlike && <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>,
    document.body,
  );
};
