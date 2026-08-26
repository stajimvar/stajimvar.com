import React from 'react';

/**
 * Yükleme iskeleti.
 *
 * Ölçüler gerçek içerikle aynı tutulmalı: içerik gelince sayfa
 * zıplamıyor. Dönen çark yerine iskelet, sayfanın neye benzeyeceğini
 * önceden anlatıyor.
 *
 * `aria-hidden`: ekran okuyucuya boş kutular okutmanın anlamı yok;
 * yükleme durumu ayrıca `aria-busy` ile bildiriliyor.
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span aria-hidden className={`block animate-pulse rounded-lg bg-gray-100 ${className}`} />
);

/** Sık kullanılan üçlü: başlık + iki satır metin. */
export const SkeletonMetin: React.FC<{ satir?: number }> = ({ satir = 3 }) => (
  <span aria-hidden className="block space-y-2">
    <Skeleton className="h-4 w-2/5" />
    {Array.from({ length: satir - 1 }, (_, i) => (
      <Skeleton key={i} className={i === satir - 2 ? 'h-3 w-3/5' : 'h-3 w-full'} />
    ))}
  </span>
);
