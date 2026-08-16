import React, { useEffect, useState } from 'react';

/**
 * Kullanıcı avatarı, güvenli yedekle.
 *
 * Doğrudan `<img src={avatarUrl}>` kullanmak, adres boş veya kırık olduğunda
 * tarayıcının kırık görsel ikonunu ve taşan `alt` metnini gösteriyordu. Artık
 * yüklenemeyen fotoğraf yerine kullanıcının baş harfleri çiziliyor.
 *
 * `key` yerine `useEffect` ile sıfırlanıyor: kullanıcı yeni fotoğraf yükleyince
 * adres değişir ve önceki başarısızlık durumu temizlenmelidir.
 */

const PALET = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
];

function basHarfler(ad: string): string {
  const kelimeler = ad
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (kelimeler.length === 0) return '?';
  if (kelimeler.length === 1) return kelimeler[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (kelimeler[0][0] + kelimeler[kelimeler.length - 1][0]).toLocaleUpperCase('tr-TR');
}

function renkIndeksi(ad: string): number {
  let toplam = 0;
  for (const ch of ad) toplam = (toplam + ch.codePointAt(0)!) % 991;
  return toplam % PALET.length;
}

interface AvatarProps {
  name: string;
  url?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, url, className = '' }) => {
  const [basarisiz, setBasarisiz] = useState(false);

  useEffect(() => {
    setBasarisiz(false);
  }, [url]);

  if (url && !basarisiz) {
    return (
      <img
        src={url}
        alt={`${name} profil fotoğrafı`}
        onError={() => setBasarisiz(true)}
        className={`object-cover bg-gray-100 dark:bg-slate-800 ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} baş harfleri`}
      className={`flex items-center justify-center font-bold select-none leading-none ${
        PALET[renkIndeksi(name)]
      } ${className}`}
    >
      {basHarfler(name)}
    </div>
  );
};
