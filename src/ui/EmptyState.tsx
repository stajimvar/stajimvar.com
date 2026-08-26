import React from 'react';
import { KOSE } from './tokens';
import { Button } from './Button';

/**
 * Boş durum.
 *
 * NEDEN TEK BİLEŞEN
 * -----------------
 * Boş liste ekranları her sayfada ayrı yazılmıştı: kimi yalnızca "kayıt
 * yok" diyordu, kimi hiçbir şey demiyordu. Boş bir ekran, kullanıcıya bir
 * şeyin BOZUK olduğunu düşündürüyor; ne olduğunu ve ne yapılacağını
 * söylemek gerekiyor.
 *
 * Kesik çizgili kenarlık bilinçli ve YALNIZCA burada: "burada içerik
 * olacaktı" demenin bilinen yolu. Çalışan düğmelerde kesik çizgi
 * kullanılmıyor — devre dışıymış gibi görünüyor.
 */
export const EmptyState: React.FC<{
  baslik: string;
  aciklama?: string;
  ikon?: React.ReactNode;
  eylemEtiketi?: string;
  onEylem?: () => void;
}> = ({ baslik, aciklama, ikon, eylemEtiketi, onEylem }) => (
  <div className={`${KOSE.kart} border border-dashed border-gray-300 bg-white p-8 text-center`}>
    {ikon && (
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        {ikon}
      </span>
    )}
    <p className="font-bold text-gray-900">{baslik}</p>
    {aciklama && <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-gray-600">{aciklama}</p>}
    {eylemEtiketi && onEylem && (
      <div className="mt-4 flex justify-center">
        <Button onClick={onEylem}>{eylemEtiketi}</Button>
      </div>
    )}
  </div>
);
