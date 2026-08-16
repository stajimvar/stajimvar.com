import React, { useState } from 'react';

/**
 * Şirket logosu, güvenli yedekle.
 *
 * Toplanan şirketlerin bir kısmında logo yok, bir kısmında da adres sonradan
 * kırılabiliyor. `<img src="">` tarayıcıda kırık görsel ikonu çiziyordu; artık
 * logo yoksa veya yüklenemezse şirketin baş harfleri gösteriliyor.
 *
 * Renk şirket adından türetiliyor: aynı şirket her yerde aynı rengi alsın,
 * ama rastgele değil de deterministik olsun diye.
 */

const PALETTE = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
];

function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (words[0][0] + words[1][0]).toLocaleUpperCase('tr-TR');
}

function paletteIndex(name: string): number {
  let sum = 0;
  for (const ch of name) sum = (sum + ch.codePointAt(0)!) % 997;
  return sum % PALETTE.length;
}

interface CompanyLogoProps {
  name: string;
  logoUrl?: string;
  className?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({ name, logoUrl, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;

  if (showImage) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logosu`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-contain bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-800 ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} logosu yok`}
      className={`flex items-center justify-center font-black select-none border border-gray-200 dark:border-slate-800 ${
        PALETTE[paletteIndex(name)]
      } ${className}`}
    >
      {initials(name)}
    </div>
  );
};
