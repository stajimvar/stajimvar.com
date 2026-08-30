import React from 'react';

/**
 * Burs kartının 16:9 kapağı.
 *
 * ÜÇ BASAMAKLI ÜRETİM
 * -------------------
 *   1. Kurumun kendi sayfasından doğrulanmış görsel (cover_image_url)
 *   2. Yoksa: kurum logosu + kurumdan türetilen vurgu rengi + sade geometri
 *   3. Logo da yoksa: baş harfler
 *
 * NE KULLANILMIYOR
 * ----------------
 * Rastgele stok fotoğraf, yapay zekâyla üretilmiş insan fotoğrafı ve
 * bursla ilgisi olmayan görsel yok. Böyle bir kapak kartı doldurur ama
 * bilgiyi bozar: gülümseyen bir öğrenci fotoğrafı, o bursun o öğrenciye
 * verildiğini ima eder.
 *
 * LOGO KIRPILMIYOR
 * ----------------
 * `object-contain`. Kurum logoları çok farklı oranlarda geliyor (uzun
 * yatay ünvan yazıları, kare armalar); `cover` kullanılsaydı yarısı
 * kesilir, kurum tanınmaz hâle gelirdi.
 *
 * RENK DETERMİNİSTİK
 * ------------------
 * Vurgu rengi kurum adından türetiliyor: aynı kurum sayfanın her yerinde
 * aynı rengi alıyor. Rastgele olsaydı aynı kurum iki kartta iki farklı
 * kimlikte görünürdü.
 */

/* Marka kapağı paleti. Hepsi öğrenci tarafının mavi-beyaz ailesiyle uyumlu. */
const PALET = [
  { zemin: '#EFF6FF', sekil: '#BFDBFE', yazi: '#1D4ED8' },
  { zemin: '#ECFDF5', sekil: '#A7F3D0', yazi: '#047857' },
  { zemin: '#EEF2FF', sekil: '#C7D2FE', yazi: '#4338CA' },
  { zemin: '#FEF3C7', sekil: '#FDE68A', yazi: '#B45309' },
  { zemin: '#FDF2F8', sekil: '#FBCFE8', yazi: '#BE185D' },
  { zemin: '#ECFEFF', sekil: '#A5F3FC', yazi: '#0E7490' },
];

function paletSec(ad: string) {
  let toplam = 0;
  for (const harf of ad) toplam = (toplam + (harf.codePointAt(0) ?? 0)) % 997;
  return PALET[toplam % PALET.length];
}

function basHarfler(ad: string): string {
  const kelimeler = String(ad)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (kelimeler.length === 0) return '?';
  if (kelimeler.length === 1) return kelimeler[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (kelimeler[0][0] + kelimeler[1][0]).toLocaleUpperCase('tr-TR');
}

export const ScholarshipCover: React.FC<{
  coverImageUrl?: string;
  logoUrl?: string;
  organizationName: string;
  title: string;
  className?: string;
}> = ({ coverImageUrl, logoUrl, organizationName, title, className = '' }) => {
  const palet = paletSec(organizationName || title);
  const [kapakBozuk, setKapakBozuk] = React.useState(false);
  const [logoBozuk, setLogoBozuk] = React.useState(false);

  React.useEffect(() => {
    setKapakBozuk(false);
    setLogoBozuk(false);
  }, [coverImageUrl, logoUrl]);

  /* 1. Doğrulanmış resmî görsel. */
  if (coverImageUrl && !kapakBozuk) {
    return (
      <div className={`relative aspect-video overflow-hidden bg-gray-100 ${className}`}>
        <img
          src={coverImageUrl}
          alt={`${title} görseli`}
          loading="lazy"
          onError={() => setKapakBozuk(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const logoVar = Boolean(logoUrl) && !logoBozuk;

  /* 2 ve 3. Marka kapağı: geometri + logo ya da baş harfler. */
  return (
    <div
      className={`relative aspect-video overflow-hidden ${className}`}
      style={{ background: palet.zemin }}
    >
      {/*
        Geometri sade ve sabit: iki daire, bir eğik şerit. Amaç kapağı
        boş bırakmamak, dikkat çekmek değil — kartın asıl bilgisi altında.
      */}
      <svg
        aria-hidden="true"
        viewBox="0 0 320 180"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <circle cx="292" cy="26" r="52" fill={palet.sekil} opacity="0.55" />
        <circle cx="34" cy="158" r="38" fill={palet.sekil} opacity="0.45" />
        <path d="M0 132 L320 74 L320 108 L0 180 Z" fill={palet.sekil} opacity="0.35" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center p-5">
        {logoVar ? (
          <img
            src={logoUrl}
            alt={`${organizationName} logosu`}
            loading="lazy"
            onError={() => setLogoBozuk(true)}
            /* object-contain: geniş ünvan logoları kırpılmıyor. */
            className="max-h-[62%] max-w-[72%] object-contain drop-shadow-sm"
          />
        ) : (
          <span
            role="img"
            aria-label={`${organizationName} logosu yok`}
            className="select-none rounded-2xl bg-white/80 px-5 py-3 text-3xl font-black tracking-tight shadow-sm"
            style={{ color: palet.yazi }}
          >
            {basHarfler(organizationName || title)}
          </span>
        )}
      </div>
    </div>
  );
};
