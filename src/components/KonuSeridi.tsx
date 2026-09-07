import React from 'react';
import {
  BookOpen,
  Briefcase,
  FileText,
  GraduationCap,
  Home,
  Plane,
  TrendingUp,
  Wallet,
} from 'lucide-react';

/**
 * Konu şeridi — Keşfet'teki şehir şeridinin (SehirSeridi.tsx) rehber
 * karşılığı. Aynı aile: aynı yuvarlak ölçüsü, aynı yatay kaydırma, aynı
 * kart kabı, dairede simge, altında ad, onun altında adet.
 *
 * NEDEN AÇILIR MENÜ YERİNE ŞERİT
 * ------------------------------
 * Konu süzgeci listenin başlığının yanında bir `<select>` idi. Menü
 * kapalıyken hangi konuların OLDUĞUNU göstermiyor: kullanıcı tıklamadan
 * "burada yurt rehberi var mı" sorusunu cevaplayamıyordu. Şerit yedi
 * konunun hepsini ve her birinde kaç yazı olduğunu tek bakışta veriyor.
 * Menü kaldırılmadı; filtre panelinde duruyor ve aynı durumu paylaşıyor.
 *
 * KENDİ DURUMU YOK
 * ----------------
 * Seçili konu dışarıdan geliyor ve dışarı yazılıyor. Ayrı bir durum
 * tutulsaydı filtre panelindeki seçimle ayrışırdı — şehir şeridinde de
 * aynı sebeple paylaşılan durum kullanılıyor.
 */

/* Konu → ikon. Anahtarlar `KONULAR` içindeki `id` değerleri. */
const IKONLAR: Record<string, React.ComponentType<{ className?: string }>> = {
  staj: Briefcase,
  cv: FileText,
  burs: Wallet,
  yurt: Home,
  universite: GraduationCap,
  yurtdisi: Plane,
  kariyer: TrendingUp,
};

const Daire: React.FC<{
  etiket: string;
  adet: number;
  /** "rehber", "fırsat" — sayının yanında ve ipucunda geçen ad. */
  birim: string;
  okunan: string;
  secili: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ etiket, adet, birim, okunan, secili, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={secili}
    title={`${etiket} — ${adet} ${birim}`}
    /* min-h-11 = 44px dokunma hedefi. */
    className="group flex min-h-11 w-[76px] shrink-0 cursor-pointer flex-col items-center gap-1.5"
  >
    <span
      aria-hidden
      className="rounded-full p-[2.5px] transition-colors"
      style={secili ? { background: '#111827' } : { background: '#e5e7eb' }}
    >
      <span className="block rounded-full bg-white p-[2px]">
        <span
          className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ${
            secili ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600'
          }`}
        >
          {children}
        </span>
      </span>
    </span>
    <span aria-hidden className="w-full text-center">
      <span
        className={`block truncate text-[11px] ${
          secili ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
        }`}
      >
        {etiket}
      </span>
      <span className="block truncate text-[10px] tabular-nums text-gray-600">{adet} {birim}</span>
    </span>
    {/*
      Görünen iki satır `aria-hidden`; ekran okuyucu düğmenin tamamını tek
      cümle olarak duyuyor: "Staj, 18 rehber".
    */}
    <span className="sr-only">{okunan}</span>
  </button>
);

type SimgeBileseni = React.ComponentType<{ className?: string }>;

/**
 * ŞERİT REHBERE ÖZEL DEĞİL
 *
 * Aynı şerit fırsatlar sayfasında da kullanılıyor (tür süzgeci). Beşinci
 * bir kopya yazmak yerine değişen üç şey props'a alındı: sayının yanındaki
 * ad, ikon haritası ve "Tümü" dairesinin ikonu. Varsayılanlar rehberin
 * bugünkü davranışı — rehber tarafında hiçbir çağrı değişmedi.
 */
export const KonuSeridi: React.FC<{
  konular: { id: string; etiket: string; adet: number }[];
  /** Seçili konu; boş dize "tümü" demek. */
  secili: string;
  toplam: number;
  onSec: (konu: string) => void;
  onTumu: () => void;
  /** Sayının yanında geçen ad. Varsayılan: rehber. */
  birim?: string;
  /** `id` → ikon. Verilmezse rehber konularının haritası kullanılıyor. */
  ikonlar?: Record<string, SimgeBileseni>;
  /** "Tümü" dairesinin ikonu ve eşleşmeyen id'ler için yedek. */
  varsayilanIkon?: SimgeBileseni;
  /** "Tümü" dairesinin okunan metni. */
  tumuEtiketi?: string;
}> = ({
  konular,
  secili,
  toplam,
  onSec,
  onTumu,
  birim = 'rehber',
  ikonlar = IKONLAR,
  varsayilanIkon: VarsayilanIkon = BookOpen,
  tumuEtiketi = 'Tüm konular',
}) => {
  /* Konu yoksa şerit çizilmiyor — SehirSeridi ve SirketSeridi kalıbı. */
  if (konular.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white py-3">
      {/*
        `relative` GÖRÜNÜM İÇİN DEĞİL, YATAY TAŞMAYI DURDURMAK İÇİN.
        Her dairede `position: absolute` olan bir `sr-only` düğümü var;
        sarmalayıcı konumlandırılmazsa bu kutuların kapsayıcı bloğu en dışa
        düşüyor ve `overflow-x-auto` onları kırpamıyor — belge 375 yerine
        700 pikselin üstüne çıkıyor. Aynı hata Keşfet'te ölçülmüştü;
        SehirSeridi.tsx içindeki uzun not sebebi anlatıyor.
      */}
      <div className="relative overflow-x-auto px-3">
        <div className="flex min-w-max gap-3">
          {/* İlk daire "Tümü": konu seçiliyken çıkış yolu. */}
          <Daire
            etiket="Tümü"
            adet={toplam}
            birim={birim}
            okunan={`${tumuEtiketi}, ${toplam} ${birim}`}
            secili={secili === ''}
            onClick={onTumu}
          >
            <VarsayilanIkon className="h-6 w-6" />
          </Daire>
          {konular.map((konu) => {
            const Ikon = ikonlar[konu.id] ?? VarsayilanIkon;
            return (
              <Daire
                key={konu.id}
                etiket={konu.etiket}
                adet={konu.adet}
                birim={birim}
                okunan={`${konu.etiket}, ${konu.adet} ${birim}`}
                secili={secili === konu.id}
                onClick={() => onSec(konu.id)}
              >
                <Ikon className="h-6 w-6" />
              </Daire>
            );
          })}
        </div>
      </div>
    </div>
  );
};
