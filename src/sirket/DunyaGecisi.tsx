import React from 'react';

/**
 * Öğrenci → Şirket eşiği.
 *
 * NEDEN VAR
 * ---------
 * İki dünya tek hesapta yaşıyor ve temaları taban tabana zıt: öğrenci
 * tarafı açık ve kâğıt gibi, şirket tarafı koyu. Geçiş anında hiçbir şey
 * olmazsa kullanıcı bir an "yanlış siteye mi düştüm" diye duraksıyor.
 * Kısa bir eşik, o duraksamayı "başka bir moda geçtim" bilgisine
 * çeviriyor.
 *
 * GIMMICK DEĞİL
 * -------------
 * 700–900 ms, oturumda BİR KEZ. Her sayfa yenilemesinde tekrar eden bir
 * animasyon üçüncü seferde engel olur. Yeşil kod yağmuru, üç saniyelik
 * giriş, stadyum yok: yalnızca bir tarama çizgisi, ızgara kayması ve tek
 * kare invert.
 *
 * ERİŞİLEBİLİRLİK
 * ---------------
 * `prefers-reduced-motion` açıksa hareket hiç çalışmıyor; yerine 150 ms
 * sönümleme var. Hareket duyarlılığı olan kullanıcı için tarama çizgisi
 * hoş bir detay değil, baş dönmesi sebebi.
 */

const SURE = 800;
const KISA_SURE = 150;

export const hareketKisitli = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export const DunyaGecisi: React.FC<{
  /** 'sirkete' koyuya geçiş, 'ogrenciye' geri dönüş (daha kısa). */
  yon: 'sirkete' | 'ogrenciye';
  onBitti: () => void;
}> = ({ yon, onBitti }) => {
  const kisitli = React.useMemo(hareketKisitli, []);
  const sure = kisitli ? KISA_SURE : yon === 'sirkete' ? SURE : SURE * 0.6;

  React.useEffect(() => {
    const z = window.setTimeout(onBitti, sure);
    return () => window.clearTimeout(z);
  }, [onBitti, sure]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200]"
      style={{ background: yon === 'sirkete' ? '#0E1116' : '#F9FAFB' }}
    >
      <style>{`
        @keyframes sv-esik-son { from { opacity: 1 } to { opacity: 0 } }
        @keyframes sv-tarama {
          0%   { transform: translateY(-100%); opacity: 0 }
          15%  { opacity: 1 }
          85%  { opacity: 1 }
          100% { transform: translateY(100%); opacity: 0 }
        }
        @keyframes sv-izgara {
          from { transform: translateY(-12px); opacity: 0 }
          40%  { opacity: .35 }
          to   { transform: translateY(0); opacity: 0 }
        }
      `}</style>

      {/* Perde sonda sönüyor; altındaki yeni dünya böylece ortaya çıkıyor. */}
      <div
        className="absolute inset-0"
        style={{
          background: yon === 'sirkete' ? '#0E1116' : '#F9FAFB',
          animation: `sv-esik-son ${sure}ms ease-in forwards`,
        }}
      />

      {!kisitli && (
        <>
          {/* Izgara kayması: bir kare, sonra yok. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(245,165,36,.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,165,36,.25) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              animation: `sv-izgara ${sure}ms ease-out forwards`,
            }}
          />
          {/* Tarama çizgisi. */}
          <div
            className="absolute inset-x-0 h-24"
            style={{
              background:
                'linear-gradient(to bottom, transparent, rgba(245,165,36,.18), transparent)',
              animation: `sv-tarama ${sure}ms ease-in-out forwards`,
            }}
          />
        </>
      )}
    </div>
  );
};
