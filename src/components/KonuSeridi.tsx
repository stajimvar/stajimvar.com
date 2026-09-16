import React from 'react';
import { SERIT } from '../ui/tokens';
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

/*
  DÖNEN DAİRE (Fırsatlar)

  Seçili daireye tekrar dokununca daire Y ekseninde 180 derece dönüyor ve
  arka yüzde büyük sayı ile birimi ("fırsat") gösteriyor; bir dokunuş daha
  ön yüze döndürüyor. Süzgeç değişmiyor — durum çağıranda, kuralları
  lib/kure-donusu.mjs içinde (İlanlar şeridiyle aynı). Altındaki ad
  sabit kalıyor.
*/
const YUZ = 'absolute inset-0 flex items-center justify-center rounded-full [backface-visibility:hidden]';

const Daire: React.FC<{
  etiket: string;
  adet: number;
  /** "rehber", "fırsat" — sayının yanında ve ipucunda geçen ad. */
  birim: string;
  okunan: string;
  secili: boolean;
  onClick: () => void;
  /** Arka yüz açık mı (yalnız seçili dairede anlamlı). */
  donuk?: boolean;
  /** Arka yüzdeki sayı; verilmezse `adet`. */
  arkaSayi?: number;
  children: React.ReactNode;
}> = ({ etiket, adet, birim, okunan, secili, onClick, donuk = false, arkaSayi = adet, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={secili}
    title={`${etiket} — ${adet} ${birim}`}
    /*
      İLANLAR ŞERİDİYLE TEK TİP (SirketSeridi)

      Aynı küre ölçüsü (360 pikselde 58, 400 ve üstünde 64), aynı kalın
      koyu kenar, seçilince koyu dolgu; ad kürenin altında tek satır ve
      13 punto. Sayı satırı yok: sayı dönen kürenin arka yüzünde.
    */
    className="group flex w-[clamp(68px,19vw,78px)] shrink-0 cursor-pointer flex-col items-center gap-1.5"
  >
    <span aria-hidden className="block h-[clamp(58px,16vw,64px)] w-[clamp(58px,16vw,64px)] [perspective:600px]">
      <span
        className={`relative block h-full w-full transition-transform duration-[350ms] ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
          donuk ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <span
          className={`${YUZ} border-2 transition-colors ${
            secili
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-800 bg-white text-slate-800 group-hover:bg-slate-50'
          }`}
        >
          {children}
        </span>
        {secili && (
          <span className={`${YUZ} flex-col bg-slate-900 text-white [transform:rotateY(180deg)]`}>
            <span
              className={`font-extrabold leading-none tabular-nums ${
                String(arkaSayi).length > 3 ? 'text-[15px]' : 'text-[19px]'
              }`}
            >
              {arkaSayi.toLocaleString('tr-TR')}
            </span>
            <span className="mt-0.5 text-[10px] font-medium leading-none">{birim}</span>
          </span>
        )}
      </span>
    </span>
    <span
      aria-hidden
      className={`block w-full truncate text-center text-[13px] leading-tight ${
        secili ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
      }`}
    >
      {etiket}
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
  /**
   * Kürenin altındaki kısa ad (ör. "CV ve başvuru" → "CV"). Tam ad ekran
   * okuyucuda ve ipucunda kalıyor.
   */
  kisaEtiketler?: Record<string, string>;
  /** Arka yüzü açık dairenin id'si ("" = Tümü); `null` = hiçbiri. */
  donuk?: string | null;
  /** Seçili daireye tekrar dokunuş: süzgeç değişmiyor, daire dönüyor. */
  onCevir?: (id: string) => void;
  /**
   * Dönen dairenin sayısı: listenin o anki gerçek toplamı. Burslar'da
   * kaynak alt süzgeci (KYK) açıkken daire altındaki kategori sayısından
   * az olabiliyor.
   */
  donukSayi?: number;
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
  kisaEtiketler = {},
  donuk = null,
  onCevir,
  donukSayi,
}) => {
  /* Konu yoksa şerit çizilmiyor — SehirSeridi ve SirketSeridi kalıbı. */
  if (konular.length === 0) return null;

  return (
    <div className={SERIT.kabuk}>
      {/*
        `relative` GÖRÜNÜM İÇİN DEĞİL, YATAY TAŞMAYI DURDURMAK İÇİN.
        Her dairede `position: absolute` olan bir `sr-only` düğümü var;
        sarmalayıcı konumlandırılmazsa bu kutuların kapsayıcı bloğu en dışa
        düşüyor ve `overflow-x-auto` onları kırpamıyor — belge 375 yerine
        700 pikselin üstüne çıkıyor. Aynı hata Keşfet'te ölçülmüştü;
        SehirSeridi.tsx içindeki uzun not sebebi anlatıyor.
      */}
      <div className={SERIT.ic}>
        <div className="flex min-w-max gap-2.5 py-1 sm:py-0">
          {/* İlk daire "Tümü": konu seçiliyken çıkış yolu. */}
          <Daire
            etiket="Tümü"
            adet={toplam}
            birim={birim}
            okunan={`${tumuEtiketi}, ${toplam} ${birim}`}
            secili={secili === ''}
            donuk={secili === '' && donuk === ''}
            arkaSayi={donukSayi ?? toplam}
            onClick={() => (secili === '' && onCevir ? onCevir('') : onTumu())}
          >
            <VarsayilanIkon className="h-[26px] w-[26px]" />
          </Daire>
          {konular.map((konu) => {
            const Ikon = ikonlar[konu.id] ?? VarsayilanIkon;
            return (
              <Daire
                key={konu.id}
                etiket={kisaEtiketler[konu.id] ?? konu.etiket}
                adet={konu.adet}
                birim={birim}
                okunan={`${konu.etiket}, ${konu.adet} ${birim}`}
                secili={secili === konu.id}
                donuk={secili === konu.id && donuk === konu.id}
                arkaSayi={donukSayi ?? konu.adet}
                onClick={() => (secili === konu.id && onCevir ? onCevir(konu.id) : onSec(konu.id))}
              >
                <Ikon className="h-[26px] w-[26px]" />
              </Daire>
            );
          })}
        </div>
      </div>
      {/* Dönen dairenin sayısı ekran okuyucuya da söyleniyor. */}
      <span className="sr-only" aria-live="polite">
        {donuk !== null && donuk === secili
          ? `${donukSayi ?? (donuk === '' ? toplam : (konular.find((k) => k.id === donuk)?.adet ?? 0))} ${birim}`
          : ''}
      </span>
    </div>
  );
};
