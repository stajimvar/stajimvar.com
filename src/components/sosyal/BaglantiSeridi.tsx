import React from 'react';
import { Layers, Users } from 'lucide-react';
import type { BaglantiKisisi } from '../../lib/queries/sosyal';
import { ProfilFotografi } from './ProfilFotografi';

/**
 * Ağım'ın bağlantı şeridi — İlanlar ve Fırsatlar küreleriyle TEK TİP.
 *
 * Tümü → bağlantılar (profil fotoğrafı) → Bağlantılar sayfası. Kürelerin
 * altında kişinin adı tek satır, İlanlar'daki şirket küreleri gibi
 * (kullanıcı isteği, 16 Eylül 2026).
 *
 * DOKUNUŞLAR (İlanlar şeridiyle aynı kural, lib/kure-donusu.mjs)
 *   1. dokunuş: akış o kişinin paylaşımlarına süzülüyor.
 *   2. dokunuş: küre dönüyor, arka yüzde kişinin adı.
 *   3. dokunuş: ön yüze dönüyor; süzme yerinde kalıyor.
 * "Tümü" süzmeyi kaldırıyor.
 *
 * AD UYDURULMUYOR: profili RLS'e takılan bağlantı şeritte çizilmiyor
 * (`profil === null`), baş harfleri ProfilFotografi'nin kendisi veriyor.
 */

const KURE = 'h-[clamp(58px,16vw,64px)] w-[clamp(58px,16vw,64px)]';
const YUZ = 'absolute inset-0 flex items-center justify-center overflow-hidden rounded-full [backface-visibility:hidden]';

export function kisiAdi(kisi: BaglantiKisisi): string {
  return kisi.profil?.gorunenAd?.trim() || kisi.profil?.kullaniciAdi || '';
}

const DonenKure: React.FC<{
  aktif: boolean;
  donuk: boolean;
  arka?: React.ReactNode;
  children: React.ReactNode;
}> = ({ aktif, donuk, arka, children }) => (
  <span
    aria-hidden
    className={`${KURE} block rounded-full p-[2.5px]`}
    style={{ background: aktif ? '#0f172a' : '#e5e7eb' }}
  >
    <span className="block h-full w-full [perspective:600px]">
      <span
        className={`relative block h-full w-full transition-transform duration-[350ms] ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
          donuk ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <span className={`${YUZ} bg-white`}>{children}</span>
        {arka && (
          <span className={`${YUZ} bg-slate-900 px-1 text-white [transform:rotateY(180deg)]`}>{arka}</span>
        )}
      </span>
    </span>
  </span>
);

const OGE = 'flex w-[clamp(68px,19vw,78px)] shrink-0 cursor-pointer flex-col items-center gap-1.5';

export const BaglantiSeridi: React.FC<{
  kisiler: BaglantiKisisi[];
  /** Akışı süzülen kişinin id'si; `null` = Tümü. */
  secili: string | null;
  /** Arka yüzü açık kürenin id'si. */
  donuk: string | null;
  onSec: (kisiId: string | null) => void;
  onCevir: (kisiId: string) => void;
  bekleyenIstek: number;
  onBaglantilar: () => void;
}> = ({ kisiler, secili, donuk, onSec, onCevir, bekleyenIstek, onBaglantilar }) => {
  const gorunen = kisiler.filter((k) => k.profil !== null);
  const donukKisi = gorunen.find((k) => k.kisiId === donuk && k.kisiId === secili) ?? null;

  return (
    <nav aria-label="Bağlantılarım" className="-mx-4 border-b border-gray-200 bg-white sm:mx-0 sm:rounded-2xl sm:border">
      <div className="overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max gap-2.5">
          <li>
            <button
              type="button"
              onClick={() => onSec(null)}
              aria-pressed={secili === null}
              aria-label="Tüm akış"
              className={OGE}
            >
              <span
                aria-hidden
                className={`${KURE} flex items-center justify-center rounded-full border-2 transition-colors ${
                  secili === null
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Layers className="h-[26px] w-[26px]" strokeWidth={1.75} />
              </span>
              <span
                aria-hidden
                className={`block w-full truncate text-center text-[13px] leading-tight ${
                  secili === null ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                }`}
              >
                Tümü
              </span>
            </button>
          </li>

          {gorunen.map((kisi) => {
            const ad = kisiAdi(kisi);
            const aktif = secili === kisi.kisiId;
            const donukMu = aktif && donuk === kisi.kisiId;
            return (
              <li key={kisi.kisiId}>
                <button
                  type="button"
                  onClick={() => (aktif ? onCevir(kisi.kisiId) : onSec(kisi.kisiId))}
                  aria-pressed={aktif}
                  aria-label={ad || 'Bağlantı'}
                  className={OGE}
                >
                  <DonenKure
                    aktif={aktif}
                    donuk={donukMu}
                    arka={
                      aktif ? (
                        <span className="line-clamp-2 break-words text-center text-[11px] font-bold leading-tight">
                          {ad}
                        </span>
                      ) : undefined
                    }
                  >
                    <ProfilFotografi
                      ad={ad || '?'}
                      yol={kisi.profil?.avatarYolu ?? null}
                      className="h-full w-full rounded-full"
                    />
                  </DonenKure>
                  <span
                    aria-hidden
                    className={`block w-full truncate text-center text-[13px] leading-tight ${
                      aktif ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                    }`}
                  >
                    {ad}
                  </span>
                </button>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              onClick={onBaglantilar}
              aria-label={bekleyenIstek > 0 ? `Bağlantılar, ${bekleyenIstek} bekleyen istek` : 'Bağlantılar'}
              className={OGE}
            >
              <span
                aria-hidden
                className={`${KURE} relative flex items-center justify-center rounded-full border-2 border-slate-800 bg-white text-slate-800 hover:bg-slate-50`}
              >
                <Users className="h-[26px] w-[26px]" strokeWidth={1.75} />
                {/* Rozet GERÇEK sayı; sıfırken hiç çizilmiyor. */}
                {bekleyenIstek > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {bekleyenIstek > 9 ? '9+' : bekleyenIstek}
                  </span>
                )}
              </span>
              <span aria-hidden className="block w-full truncate text-center text-[13px] font-medium leading-tight text-slate-700">
                Bağlantılar
              </span>
            </button>
          </li>
        </ul>
      </div>
      {/* Dönen kürenin adı ekran okuyucuya da söyleniyor. */}
      <span className="sr-only" aria-live="polite">
        {donukKisi ? kisiAdi(donukKisi) : ''}
      </span>
    </nav>
  );
};
