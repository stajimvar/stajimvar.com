import React from 'react';
import { ChevronRight } from 'lucide-react';
import { GECIS, IKON_KUTUSU, KOSE } from './tokens';

/**
 * Kart — 20 piksel köşe, ince sınır, gölge yok.
 *
 * Gölge kaldırıldı: aynı ekranda kart, sekme, kapsül, daire ve gölge bir
 * arada olunca biçim sayısı artıyor ve hiçbiri diğerinden ayrılmıyor.
 * Yükseklik hissi gerektiğinde `yukseltilmis` ile veriliyor, varsayılan
 * değil.
 */
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  yukseltilmis?: boolean;
  vurgulu?: boolean;
}> = ({ children, className = '', yukseltilmis = false, vurgulu = false }) => (
  <div
    className={`${KOSE.kart} border bg-white ${
      vurgulu ? 'border-blue-200' : 'border-gray-200'
    } ${yukseltilmis ? 'shadow-sm' : ''} ${className}`}
  >
    {children}
  </div>
);

/**
 * Profil bölümü kartı — yatay satır.
 *
 * NEDEN DÖRT KÜÇÜK DAİRE DEĞİL
 * ----------------------------
 * Okul, program, beceri, dil ve proje dört sütunlu bir daire ızgarasında
 * duruyordu. Mobilde sütun başına ~80 piksel kalıyor ve "Programlar",
 * "Beceriler" gibi başlıklar nefes alamıyordu; daire içindeki ikonun
 * yanında sayı da sıkışıyordu.
 *
 * Yatay kart aynı bilgiyi rahat veriyor: solda 40×40 yuvarlatılmış kare
 * ikon, ortada başlık ve bilgi, sağda ok ya da tamamlandı işareti. Kartın
 * TAMAMI tıklanabilir — küçük bir daireyi hedeflemek gerekmiyor.
 */
export const ProfileSectionCard: React.FC<{
  ikon: React.ReactNode;
  baslik: string;
  /** Tek satırlık bilgi: "8 beceri", "2 dil". Yoksa çağrı metni yazılıyor. */
  bilgi?: string;
  /** Doldurulmuş mu — sağda ok yerine tamamlandı işareti çıkıyor. */
  tamam?: boolean;
  secili?: boolean;
  onClick: () => void;
}> = ({ ikon, baslik, bilgi, tamam = false, secili = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={secili ? 'true' : undefined}
    className={`flex min-h-[60px] w-full items-center gap-3 ${KOSE.kontrol} border p-3 text-left ${GECIS} cursor-pointer ${
      secili
        ? 'border-blue-600 bg-blue-50/60'
        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
    }`}
  >
    <span
      className={`${IKON_KUTUSU} ${
        secili ? 'bg-blue-600 text-white' : tamam ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'
      }`}
    >
      {ikon}
    </span>

    <span className="min-w-0 flex-1">
      <span className={`block truncate text-sm font-bold ${secili ? 'text-blue-800' : 'text-gray-900'}`}>
        {baslik}
      </span>
      {bilgi && <span className="block truncate text-xs text-gray-600">{bilgi}</span>}
    </span>

    <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
  </button>
);
