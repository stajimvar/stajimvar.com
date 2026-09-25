import React from 'react';
import { YatayKaydirma } from './YatayKaydirma';
import { SERIT } from '../ui/tokens';
import { HapFiltre, HAP_SERIDI } from '../ui/HapFiltre';
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

  /*
    HAP FİLTRE (mobil sadeleştirme, 25 Eylül 2026): büyük ikonlu daireler
    yatay haplara döndü (`ui/HapFiltre`). Sayı erişilebilir adda; seçili
    hapa tekrar dokununca (eski "dönen daire") hapın yazısında görünüyor.
    `ikonlar` / `varsayilanIkon` props'u çağıranlar değişmesin diye
    duruyor; hapta ikon çizilmiyor.
  */
  void ikonlar;
  void VarsayilanIkon;
  const sayiliEtiket = (etiket: string, sayi: number) => `${etiket} · ${sayi.toLocaleString('tr-TR')}`;

  return (
    <div className={SERIT.kabuk}>
      {/*
        `relative` GÖRÜNÜM İÇİN DEĞİL, YATAY TAŞMAYI DURDURMAK İÇİN
        (SehirSeridi.tsx'teki uzun not). Hapların sr-only düğümü yok ama
        kap aynı kalıpta.
      */}
      <YatayKaydirma className={SERIT.ic}>
        <div className={HAP_SERIDI}>
          {/* İlk hap "Tümü": konu seçiliyken çıkış yolu. */}
          <HapFiltre
            secili={secili === ''}
            ariaLabel={`${tumuEtiketi}, ${toplam} ${birim}`}
            title={`Tümü — ${toplam} ${birim}`}
            onClick={() => (secili === '' && onCevir ? onCevir('') : onTumu())}
          >
            {secili === '' && donuk === '' ? sayiliEtiket('Tümü', donukSayi ?? toplam) : 'Tümü'}
          </HapFiltre>
          {konular.map((konu) => {
            const etiket = kisaEtiketler[konu.id] ?? konu.etiket;
            const donukMu = secili === konu.id && donuk === konu.id;
            return (
              <HapFiltre
                key={konu.id}
                secili={secili === konu.id}
                ariaLabel={`${konu.etiket}, ${konu.adet} ${birim}`}
                title={`${konu.etiket} — ${konu.adet} ${birim}`}
                onClick={() => (secili === konu.id && onCevir ? onCevir(konu.id) : onSec(konu.id))}
              >
                {donukMu ? sayiliEtiket(etiket, donukSayi ?? konu.adet) : etiket}
              </HapFiltre>
            );
          })}
        </div>
      </YatayKaydirma>
      {/* Gösterilen sayı ekran okuyucuya da söyleniyor. */}
      <span className="sr-only" aria-live="polite">
        {donuk !== null && donuk === secili
          ? `${donukSayi ?? (donuk === '' ? toplam : (konular.find((k) => k.id === donuk)?.adet ?? 0))} ${birim}`
          : ''}
      </span>
    </div>
  );
};
