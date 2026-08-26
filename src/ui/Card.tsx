import React from 'react';
import { ChevronRight } from 'lucide-react';
import { GECIS, IKON_KUTUSU, IKON_TONU, KOSE } from './tokens';

/**
 * Kart — 20 piksel köşe, ince sınır, gölge yok.
 *
 * Gölge kaldırıldı: aynı ekranda kart, sekme, kapsül, daire ve gölge bir
 * arada olunca biçim sayısı artıyor ve hiçbiri diğerinden ayrılmıyor.
 * Yükseklik hissi gerektiğinde `yukseltilmis` ile veriliyor, varsayılan
 * değil.
 *
 * SINIR AÇILDI
 * ------------
 * Kenarlık gray-200'dü ve yan yana duran kartlarda ızgara çizgisi gibi
 * görünüyordu; vurgu kenarlıktan geliyordu. Asıl vurgu yazı hiyerarşisi
 * ve boşluk düzeninden gelmeli — kenarlık yalnızca kartın nerede
 * bittiğini söylemeli.
 */
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  yukseltilmis?: boolean;
  vurgulu?: boolean;
}> = ({ children, className = '', yukseltilmis = false, vurgulu = false }) => (
  <div
    className={`${KOSE.kart} border bg-white ${
      vurgulu ? 'border-blue-200' : 'border-gray-100'
    } ${yukseltilmis ? 'shadow-sm' : ''} ${className}`}
  >
    {children}
  </div>
);

/**
 * Profil bölümü satırı.
 *
 * NEDEN AYRI KART DEĞİL, SATIR
 * ----------------------------
 * Beş bölüm beş ayrı karttı ve her biri ~105 piksel yer kaplıyordu;
 * ekran gereğinden fazla uzuyordu. Beş ayrı kutu ayrıca beş ayrı şeymiş
 * izlenimi veriyordu — oysa hepsi tek bir şeyin parçaları: profil
 * bilgileri.
 *
 * Artık tek grup kartının içinde, aralarında 1 piksel ayraç olan
 * satırlar. Satır yüksekliği 80 piksel: dokunma alanının iki katından
 * fazla, ama beş satır artık bir ekrana sığıyor.
 *
 * Bütün satırlar AYNI yapıda: ikon, başlık, ikincil bilgi, chevron.
 * Satırdan satıra değişen tek şey içerik.
 */
export const ProfileSectionRow: React.FC<{
  ikon: React.ReactNode;
  baslik: string;
  /** İkincil satır: "8 beceri", "MSGSÜ · Giyim Üretim Teknolojisi". */
  bilgi?: string;
  secili?: boolean;
  onClick: () => void;
}> = ({ ikon, baslik, bilgi, secili = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={secili ? 'true' : undefined}
    className={`flex min-h-[80px] w-full items-center gap-3 px-4 py-3 text-left ${GECIS} cursor-pointer ${
      secili ? 'bg-blue-50/60' : 'bg-white hover:bg-gray-50'
    }`}
  >
    <span className={`${IKON_KUTUSU} ${secili ? 'bg-blue-600 text-white' : IKON_TONU}`}>{ikon}</span>

    <span className="min-w-0 flex-1">
      <span className={`block truncate text-sm font-bold ${secili ? 'text-blue-800' : 'text-gray-900'}`}>
        {baslik}
      </span>
      {bilgi && <span className="mt-0.5 block truncate text-xs text-gray-600">{bilgi}</span>}
    </span>

    <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
  </button>
);

/**
 * Satırları saran grup kartı.
 *
 * Başlık ve sağdaki sayaç kartın İÇİNDE: "Profil bilgileri · 5/5
 * tamamlandı" satırların ne olduğunu ve nerede durulduğunu tek bakışta
 * söylüyor. Ayraçlar 1 piksel ve gray-100 — satırları ayırıyor ama
 * ızgara çizmiyor.
 */
export const ProfileSectionGroup: React.FC<{
  baslik: string;
  sagBilgi?: string;
  children: React.ReactNode;
}> = ({ baslik, sagBilgi, children }) => (
  <Card className="overflow-hidden">
    <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-4">
      <h2 className="text-sm font-bold text-gray-900">{baslik}</h2>
      {sagBilgi && <span className="shrink-0 text-xs text-gray-600">{sagBilgi}</span>}
    </div>
    <div className="divide-y divide-gray-100 border-t border-gray-100">{children}</div>
  </Card>
);
