import React from 'react';
import { GECIS, KOSE } from './tokens';

/**
 * Menü satırı — hesap panelinin ve benzeri listelerin tek satır biçimi.
 *
 * NEDEN BİLEŞEN
 * -------------
 * Hesap menüsündeki satırlar elle yazılmıştı: 3.5 piksellik ikonlar (site
 * genelinde 20), 8 piksel dikey dolgu (dokunma alanının çok altında) ve
 * satır içine sıkıştırılmış sayılar — "Başvurularım (4)". Menü, yeni
 * profil ekranının yanında başka bir üründen alınmış gibi duruyordu.
 *
 * SAYILAR METNİN İÇİNDE DEĞİL
 * ---------------------------
 * "(4)" parantezi cümlenin parçası gibi okunuyor ve gözle taranmıyor.
 * Sayı sağda ayrı bir rozet: satırları alt alta tarayan göz sayıları da
 * tek sütunda görüyor.
 */
export const MenuItem: React.FC<{
  ikon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  /** Sağdaki rozet: sayı ya da "Yönetici" gibi kısa etiket. */
  rozet?: React.ReactNode;
  /**
   * Yıkıcı eylem (çıkış).
   *
   * YALNIZCA ikon ve metin kırmızı; satırın tamamı boyanmıyor. Dolu
   * kırmızı bir satır, kullanıcı daha okumadan bir hata olduğunu
   * düşündürüyor.
   */
  yikici?: boolean;
}> = ({ ikon, children, onClick, rozet, yikici = false }) => (
  <button
    type="button"
    onClick={onClick}
    /* 52 piksel yükseklik; dokunma alanının (44) rahat üstünde. */
    className={`flex min-h-[52px] w-full items-center gap-3 ${KOSE.kontrol} px-3 text-left text-sm font-semibold ${GECIS} cursor-pointer ${
      yikici ? 'text-rose-600 hover:bg-rose-50' : 'text-gray-800 hover:bg-gray-50'
    }`}
  >
    <span className={`shrink-0 ${yikici ? 'text-rose-600' : 'text-gray-500'}`}>{ikon}</span>
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {rozet && <span className="shrink-0">{rozet}</span>}
  </button>
);
