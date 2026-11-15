import React from 'react';
import { ShieldOff, User } from 'lucide-react';
import { useGorselAdresleri } from '../components/sosyal/useGorselAdresleri';
import { ProfilFotografiGoruntuleyici } from '../components/sosyal/ProfilFotografiGoruntuleyici';
import { SOSYAL_AVATAR_KOVASI } from '../lib/queries/sosyal';
import { monogram } from '../lib/aday-kart.mjs';
import { SIRKET_KENAR_VURGU, SIRKET_ODAK, SIRKET_ROZET, SIRKET_VURGU_KOYU } from './renk';

/**
 * BAŞVURANIN FOTOĞRAFI — ŞİRKET PANELİNİN TEK BİLEŞENİ (15 Kasım 2026)
 *
 * Fotoğrafın tek kaynağı `social_profiles.avatar_path` (private kova).
 * Şirket yolu `sirket_aday_foto_yollari`ndan alıyor ve dosyayı kendi
 * oturumuyla indiriyor; kova kapısı (20270113010000) yalnız paylaşım
 * açıkken, şirket doğrulanmışken ve engel yokken izin veriyor. Yol yoksa
 * başvuru kopyasındaki eski adres (`fotoUrl`) yedek.
 *
 * Önceden kartta, panoda, şeritte ve inceleme ekranında dört ayrı
 * `<img src={fotoUrl}>` vardı ve dördü de yalnız eski alanı okuyordu;
 * fotoğraf yüklemiş aday şirkete fotoğrafsız görünüyordu.
 *
 * DURUMLAR
 *   gizli          önyargısız inceleme: kalkan simgesi, fotoğraf yok
 *   iniyor         nötr daire (baş harf yanıp sönmesin)
 *   fotoğraf       indirilen dosya ya da yedek adres
 *   yok / inemedi  baş harfler; ad yoksa nötr kişi simgesi
 */

const YOL_YOK: string[] = [];

/** Kart, pano ve inceleme ekranının ortak çözümü; CV önizlemesi de kullanıyor. */
export function useAdayFotoAdresi(
  fotoYolu: string | null | undefined,
  fotoUrl: string | null | undefined,
  gizli = false,
): { adres: string | null; yukleniyor: boolean } {
  const yol = !gizli && fotoYolu ? fotoYolu : null;
  const yollar = React.useMemo(() => (yol ? [yol] : YOL_YOK), [yol]);
  const { durum, adresler } = useGorselAdresleri(SOSYAL_AVATAR_KOVASI, yollar);
  if (gizli) return { adres: null, yukleniyor: false };
  if (yol) {
    if (durum === 'yukleniyor') return { adres: null, yukleniyor: true };
    const indirilen = adresler.get(yol);
    if (indirilen) return { adres: indirilen, yukleniyor: false };
  }
  return { adres: fotoUrl || null, yukleniyor: false };
}

export const AdayFotografi: React.FC<{
  ad: string | null;
  fotoYolu?: string | null;
  fotoUrl?: string | null;
  gizli?: boolean;
  /** Ölçü, yazı boyu ve halka çağırandan: kartta küçük, başlıkta büyük. */
  className?: string;
  /** Fotoğraf varsa dokununca tam ekran açılsın (inceleme ekranı başlığı). */
  buyutulebilir?: boolean;
}> = ({ ad, fotoYolu, fotoUrl, gizli = false, className = 'h-12 w-12 text-sm', buyutulebilir = false }) => {
  const { adres, yukleniyor } = useAdayFotoAdresi(fotoYolu, fotoUrl, gizli);
  const [hata, setHata] = React.useState(false);
  const [acik, setAcik] = React.useState(false);
  const dugme = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => setHata(false), [adres]);

  const daire = `shrink-0 rounded-full ${className}`;

  if (yukleniyor) return <span aria-hidden className={`block animate-pulse bg-gray-100 ${daire}`} />;

  if (adres && !hata) {
    const gorsel = (
      <img src={adres} alt={ad ? `${ad} profil fotoğrafı` : 'Aday fotoğrafı'} onError={() => setHata(true)} className={`object-cover ${daire}`} />
    );
    if (!buyutulebilir) return gorsel;
    return (
      <>
        <button
          ref={dugme}
          type="button"
          onClick={() => setAcik(true)}
          aria-haspopup="dialog"
          className={`block shrink-0 cursor-zoom-in rounded-full ${SIRKET_ODAK}`}
        >
          {gorsel}
          <span className="sr-only">Fotoğrafı büyüt</span>
        </button>
        {acik && (
          <ProfilFotografiGoruntuleyici
            adres={adres}
            ad={ad ?? 'Aday'}
            tetikleyici={dugme.current}
            onKapat={() => setAcik(false)}
          />
        )}
      </>
    );
  }

  return (
    <span
      aria-hidden
      className={`flex items-center justify-center font-black ${daire}`}
      style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU, boxShadow: `inset 0 0 0 1px ${SIRKET_KENAR_VURGU}` }}
    >
      {gizli ? (
        <ShieldOff className="h-[40%] w-[40%]" />
      ) : ad ? (
        monogram(ad)
      ) : (
        /* Ad paylaşılmamışsa (rıza yok) harf uydurulmuyor. */
        <User className="h-[45%] w-[45%]" />
      )}
    </span>
  );
};
