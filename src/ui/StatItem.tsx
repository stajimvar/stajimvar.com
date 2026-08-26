import React from 'react';
import { GECIS, KOSE } from './tokens';

/**
 * Sayı + etiket.
 *
 * TIKLANABİLİRSE GERÇEKTEN GİDİYOR
 * --------------------------------
 * Sayılar bir şeyi sayıyor ve o şeyin bir listesi var. Sayıya basınca o
 * listeye gitmiyorsa sayı bir süs; gittiği yerde aynı sayıyı göremiyorsa
 * sayı yanlış.
 */
export const StatItem: React.FC<{
  deger: number | string;
  etiket: string;
  onClick?: () => void;
}> = ({ deger, etiket, onClick }) => {
  const icerik = (
    <>
      <span className="block text-xl font-extrabold leading-tight tabular-nums text-gray-900">
        {deger}
      </span>
      <span className="mt-0.5 block text-[11px] leading-tight text-gray-600">{etiket}</span>
    </>
  );

  if (!onClick) return <span className="block min-w-0 text-center">{icerik}</span>;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block min-h-11 min-w-0 flex-1 ${KOSE.kontrol} px-1 text-center ${GECIS} cursor-pointer hover:bg-gray-50`}
    >
      {icerik}
    </button>
  );
};
