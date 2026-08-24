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
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700',
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
        /* Oran için: gerçek ölçüyü className veriyor, boyut yerleşim kaymasını önlüyor. */
        width={96}
        height={96}
        alt={`${name} profil fotoğrafı`}
        onError={() => setBasarisiz(true)}
        className={`object-cover bg-gray-100 ${className}`}
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
