import React from 'react';

/**
 * Durum rozeti.
 *
 * NEDEN SINIRLI RENK
 * ------------------
 * Renk bu üründe anlam taşıyor: yeşil YALNIZCA başarı ve doğrulama,
 * kırmızı YALNIZCA hata, tehlike ve reddedilme. Dekoratif amaçla
 * kullanıldıklarında kullanıcı gerçek bir uyarıyı süsten ayıramıyor.
 *
 * Nötr durumlar (beklemede, taslak) gri; süreçte devam eden şeyler mavi;
 * dikkat isteyen ama hata olmayan şeyler amber.
 */
type Ton = 'notr' | 'marka' | 'basari' | 'uyari' | 'hata';

const TON: Record<Ton, string> = {
  notr: 'bg-gray-100 text-gray-700 border-gray-200',
  marka: 'bg-blue-50 text-blue-700 border-blue-200',
  basari: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  uyari: 'bg-amber-50 text-amber-800 border-amber-200',
  hata: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const StatusBadge: React.FC<{
  ton?: Ton;
  ikon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ ton = 'notr', ikon, children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold ${TON[ton]} ${className}`}
  >
    {ikon}
    {children}
  </span>
);
