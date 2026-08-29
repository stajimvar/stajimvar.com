import React from 'react';
import { SIRKET_VURGU, SIRKET_ZEMIN } from './renk';

/**
 * Öğrenci ↔ Şirket eşiği.
 *
 * NEDEN VAR
 * ---------
 * İki dünya tek hesapta yaşıyor ve renkleri farklı: öğrenci tarafı
 * mavi-beyaz, şirket tarafı turuncu-beyaz. Geçiş anında hiçbir şey
 * olmazsa kullanıcı bir an "yanlış siteye mi düştüm" diye duraksıyor.
 * Kısa bir eşik, o duraksamayı "başka bir moda geçtim" bilgisine
 * çeviriyor.
 *
 * GIMMICK DEĞİL
 * -------------
 * 800 ms, oturumda BİR KEZ. Karanlık invert, yeşil kod yağmuru, üç
 * saniyelik giriş yok: perde mavi-beyazdan turuncu-beyaza dönüyor ve
 * sönüyor. Karartma hiç yok — iki dünya da aydınlık.
 *
 * ERİŞİLEBİLİRLİK
 * ---------------
 * `prefers-reduced-motion` açıksa hareket çalışmıyor; yerine 150 ms
 * sönümleme var.
 */

const SURE = 800;
const KISA_SURE = 150;

/** Öğrenci dünyasının zemini ve mavisi — yalnızca eşiğin başlangıcı için. */
const OGRENCI_ZEMIN = '#F9FAFB';
const OGRENCI_MAVI = '#2563EB';

export const hareketKisitli = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export const DunyaGecisi: React.FC<{
  /** 'sirkete' turuncuya geçiş, 'ogrenciye' maviye dönüş (daha kısa). */
  yon: 'sirkete' | 'ogrenciye';
  onBitti: () => void;
}> = ({ yon, onBitti }) => {
  const kisitli = React.useMemo(hareketKisitli, []);
  const sure = kisitli ? KISA_SURE : yon === 'sirkete' ? SURE : SURE * 0.6;

  const bas = yon === 'sirkete' ? OGRENCI_ZEMIN : SIRKET_ZEMIN;
  const son = yon === 'sirkete' ? SIRKET_ZEMIN : OGRENCI_ZEMIN;
  const cizgi = yon === 'sirkete' ? SIRKET_VURGU : OGRENCI_MAVI;

  React.useEffect(() => {
    const z = window.setTimeout(onBitti, sure);
    return () => window.clearTimeout(z);
  }, [onBitti, sure]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[200]">
      <style>{`
        @keyframes sv-esik-renk { from { background: ${bas} } to { background: ${son} } }
        @keyframes sv-esik-son { 0%, 55% { opacity: 1 } 100% { opacity: 0 } }
        @keyframes sv-tarama {
          0%   { transform: translateY(-100%); opacity: 0 }
          15%  { opacity: 1 }
          85%  { opacity: 1 }
          100% { transform: translateY(100%); opacity: 0 }
        }
      `}</style>

      {/* Perde rengi değişiyor, sonra sönüyor; altındaki yeni dünya çıkıyor. */}
      <div
        className="absolute inset-0"
        style={{
          background: son,
          animation: kisitli
            ? `sv-esik-son ${sure}ms ease-in forwards`
            : `sv-esik-renk ${sure * 0.6}ms ease-in-out forwards, sv-esik-son ${sure}ms ease-in forwards`,
        }}
      />

      {/* Tek tarama çizgisi; gideceğin dünyanın renginde. */}
      {!kisitli && (
        <div
          className="absolute inset-x-0 h-24"
          style={{
            background: `linear-gradient(to bottom, transparent, ${cizgi}2E, transparent)`,
            animation: `sv-tarama ${sure}ms ease-in-out forwards`,
          }}
        />
      )}
    </div>
  );
};
