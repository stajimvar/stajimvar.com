import React from 'react';
import { Globe, Laptop, Layers, MapPin } from 'lucide-react';

/**
 * İlanlar sayfasının küre şeridi: Tümü → Türkiye → Yurtdışı → Uzaktan →
 * şirketler, tek satırda ve yatay kaydırılabilir.
 *
 * NEDEN TEK SATIR
 * ---------------
 * Onaylanan tasarımda başlığın hemen altında tek bir şerit var ve ilanlar
 * doğrudan onun altından başlıyor. Bölge seçenekleri ile şirketler aynı
 * satırı paylaşıyor; ikinci satıra geçmek ilanları aşağı iterdi.
 *
 * BÖLGELER GERÇEK VERİYE BAĞLI
 * ----------------------------
 * Türkiye ve Uzaktan sunucudaki katalog seçimini kullanıyor (`TR`,
 * `remote`). Yurtdışı ülkesi BİLİNEN ve Türkiye olmayan ilanlar; ülkesi
 * boş olan ilan iki gruba da girmiyor — tahmin edilmiyor. Seçimin nasıl
 * uygulandığı çağıranda (MatchedInternshipsView).
 *
 * ŞİRKET HALKASI
 * --------------
 * Renkli halka "son 24 saatte ilan eklendi" demek (Instagram'daki
 * okunmamış hikâye halkasının karşılığı). Pencere neden 24 saat: yedi
 * günde yayındaki şirketlerin neredeyse hepsi "yeni" çıkıyordu ve halka
 * hiçbir şeyi ayırt etmiyordu.
 *
 * FIRSATLAR SAYFASI ETKİLENMİYOR
 * ------------------------------
 * Ortak `KesifDairesi` fırsat şeritlerinde de kullanılıyor; bu şeridin
 * küreleri bu dosyada, o bileşene dokunulmadan çiziliyor.
 */

export interface SeritSirketi {
  ad: string;
  logo?: string;
  adet: number;
  /** Son 24 saat içinde eklenmiş ilanı var mı. */
  yeni: boolean;
}

export type IlanBolgesi = 'tumu' | 'turkiye' | 'yurtdisi' | 'uzaktan';

/** Logo yoksa baş harfler. */
function basHarfler(ad: string): string {
  const k = ad.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (k.length === 0) return '?';
  if (k.length === 1) return k[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (k[0][0] + k[1][0]).toLocaleUpperCase('tr-TR');
}

const IKON = 'h-[26px] w-[26px]';

/**
 * Logo yüklenemezse baş harfler — React durumuyla.
 *
 * Eskiden kırık görselin yerine `insertAdjacentHTML` ile işaretleme
 * yazılıyordu; ad metni HTML'e dönüşen bir yoldan geçmesin diye durum
 * bileşenin kendisinde tutuluyor.
 */
const KureLogosu: React.FC<{ ad: string; logo?: string }> = ({ ad, logo }) => {
  const [kirik, setKirik] = React.useState(false);
  if (!logo || kirik) {
    return <span className="text-sm font-bold text-slate-600">{basHarfler(ad)}</span>;
  }
  return (
    <img
      src={logo}
      alt=""
      className="h-full w-full object-contain p-1.5"
      loading="lazy"
      onError={() => setKirik(true)}
    />
  );
};

const BOLGELER: Array<{ id: IlanBolgesi; etiket: string; ikon: React.ReactNode }> = [
  { id: 'tumu', etiket: 'Tümü', ikon: <Layers aria-hidden className={IKON} strokeWidth={1.75} /> },
  { id: 'turkiye', etiket: 'Türkiye', ikon: <MapPin aria-hidden className={IKON} strokeWidth={1.75} /> },
  { id: 'yurtdisi', etiket: 'Yurtdışı', ikon: <Globe aria-hidden className={IKON} strokeWidth={1.75} /> },
  { id: 'uzaktan', etiket: 'Uzaktan', ikon: <Laptop aria-hidden className={IKON} strokeWidth={1.75} /> },
];

/*
  KÜRE ÖLÇÜSÜ EKRANLA KÜÇÜLÜYOR, AVATARA DÖNMÜYOR

  360 pikselde 58, 400 ve üstünde 64 piksel. Etiket kürenin altında ve
  tek satır; uzun şirket adı kırpılıyor, satır atlamıyor (şerit
  yüksekliği her kürede aynı kalsın).
*/
const KURE = 'h-[clamp(58px,16vw,64px)] w-[clamp(58px,16vw,64px)]';
const OGE = 'flex w-[clamp(68px,19vw,78px)] shrink-0 cursor-pointer flex-col items-center gap-1.5';

function etiketSinifi(secili: boolean) {
  return `block w-full truncate text-center text-[13px] leading-tight ${
    secili ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
  }`;
}

export const SirketSeridi: React.FC<{
  sirketler: SeritSirketi[];
  secili: string[];
  toplam: number;
  onSec: (ad: string) => void;
  /** Şu an seçili bölge; bir ülke süzgeç panelinden seçildiyse `null`. */
  bolge: IlanBolgesi | null;
  onBolge: (bolge: IlanBolgesi) => void;
}> = ({ sirketler, secili, toplam, onSec, bolge, onBolge }) => (
  /*
    Telefonda ekranın iki kenarına yaslı bant; altındaki ince çizgi
    ilanların başladığı yeri gösteriyor. Geniş ekranda sütunun içinde
    kenarlıklı bir kutu.
  */
  <nav
    aria-label="İlanları daralt"
    className="-mx-4 border-b border-gray-200 bg-white sm:mx-0 sm:rounded-2xl sm:border"
  >
    <div className="overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-2.5">
        {BOLGELER.map((b) => {
          /* "Tümü" bir şirket seçiliyken seçili sayılmıyor: liste daralmış. */
          const aktif = bolge === b.id && (b.id !== 'tumu' || secili.length === 0);
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onBolge(b.id)}
                aria-pressed={aktif}
                aria-label={b.id === 'tumu' ? `Tümü, ${toplam} ilan` : b.etiket}
                className={OGE}
              >
                <span
                  aria-hidden
                  className={`${KURE} flex items-center justify-center rounded-full border-2 transition-colors ${
                    aktif
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-800 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {b.ikon}
                </span>
                <span aria-hidden className={etiketSinifi(aktif)}>
                  {b.etiket}
                </span>
              </button>
            </li>
          );
        })}

        {sirketler.map((s) => {
          const aktif = secili.includes(s.ad);
          return (
            <li key={s.ad}>
              <button
                type="button"
                onClick={() => onSec(s.ad)}
                aria-pressed={aktif}
                aria-label={`${s.ad}, ${s.yeni ? 'yeni ilan' : `${s.adet} ilan`}`}
                title={s.ad}
                className={OGE}
              >
                <span
                  aria-hidden
                  className={`${KURE} block rounded-full p-[2.5px]`}
                  style={{
                    background: aktif
                      ? '#0f172a'
                      : s.yeni
                        ? 'linear-gradient(135deg,#2563eb,#10b981)'
                        : '#e5e7eb',
                  }}
                >
                  <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                    <KureLogosu ad={s.ad} logo={s.logo} />
                  </span>
                </span>
                <span aria-hidden className={etiketSinifi(aktif)}>
                  {s.ad}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  </nav>
);
