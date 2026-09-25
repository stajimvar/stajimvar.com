import React from 'react';
import { YatayKaydirma } from './YatayKaydirma';
import { X } from 'lucide-react';
import { HapFiltre, HAP_SERIDI } from '../ui/HapFiltre';

/**
 * İlanlar sayfasının filtre şeridi: bölge hapları (Tüm ilanlar → Türkiye →
 * Yurtdışı) ve ayrı satırda şirket hapları; ikisi de yatay kaydırılabilir.
 * (Aşağıdaki "NEDEN TEK SATIR" notu 25 Eylül 2026'ya kadar geçerliydi;
 * güncel düzen `HAP FİLTRELER` notunda.)
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

export type IlanBolgesi = 'tumu' | 'turkiye' | 'yurtdisi';

/** Logo yoksa baş harfler. */
function basHarfler(ad: string): string {
  const k = ad.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (k.length === 0) return '?';
  if (k.length === 1) return k[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (k[0][0] + k[1][0]).toLocaleUpperCase('tr-TR');
}

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
    return <span className="text-[9px] font-bold text-slate-600">{basHarfler(ad)}</span>;
  }
  return (
    <img
      src={logo}
      alt=""
      className="h-full w-full object-contain p-0.5"
      loading="lazy"
      onError={() => setKirik(true)}
    />
  );
};

function sayiMetni(sayi: number | null): string {
  return sayi === null ? '…' : sayi.toLocaleString('tr-TR');
}

/*
  HAP FİLTRELER (mobil sadeleştirme, 25 Eylül 2026)

  Büyük ikonlu küreler hap filtrelere döndü. İki satır:
    1. BÖLGE — Tüm ilanlar · Türkiye · Yurtdışı, tek grup.
    2. ŞİRKET — ayrı satır; logo dairede kalıyor.
  Şirketin etrafındaki renkli halka ("son 24 saatte ilan") kalktı: halka
  Instagram'da hikâye demek ve burada gerçek bir hikâye yok. "Yeni" bilgisi
  erişilebilir adda duruyor.

  DÖNÜŞ SAYISI KORUNDU: seçili hapa tekrar dokununca filtre değişmiyor,
  hapın yazısı kesin ilan sayısını gösteriyor (kurallar
  lib/kure-donusu.mjs). Eskiden küre dönüyordu; şimdi yalnız yazı değişiyor.
*/
const BOLGELER: Array<{ id: IlanBolgesi; etiket: string; tamAd: string }> = [
  { id: 'tumu', etiket: 'Tüm ilanlar', tamAd: 'Tüm ilanlar' },
  { id: 'turkiye', etiket: 'Türkiye', tamAd: "Türkiye'de staj" },
  { id: 'yurtdisi', etiket: 'Yurtdışı', tamAd: 'Yurtdışında staj' },
];

const SATIR = 'overflow-x-auto px-4 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden';

export const SirketSeridi: React.FC<{
  sirketler: SeritSirketi[];
  secili: string[];
  toplam: number;
  onSec: (ad: string) => void;
  /** Şu an seçili bölge; bir ülke süzgeç panelinden seçildiyse `null`. */
  bolge: IlanBolgesi | null;
  onBolge: (bolge: IlanBolgesi) => void;
  /** Sayısı gösterilen hapın anahtarı (`bolge:turkiye`, `sirket:FedEx`). */
  donuk?: string | null;
  /** O hapın kesin ilan sayısı; bilinmiyorsa `null` ("…"). */
  donukSayi?: number | null;
  /** Seçili hapa tekrar dokunuş: filtre değişmiyor, yalnız sayı görünüyor. */
  onCevir?: (anahtar: string) => void;
}> = ({ sirketler, secili, toplam, onSec, bolge, onBolge, donuk = null, donukSayi = null, onCevir }) => (
  /*
    Telefonda ekranın iki kenarına yaslı bant; altındaki ince çizgi
    ilanların başladığı yeri gösteriyor. Geniş ekranda sütunun içinde
    kenarlıklı bir kutu.
  */
  <nav
    aria-label="İlanları daralt"
    className="-mx-4 border-b border-gray-200 bg-white py-1 sm:mx-0 sm:rounded-2xl sm:border"
  >
    <YatayKaydirma className={SATIR}>
      <ul aria-label="Bölge" className={HAP_SERIDI}>
        {BOLGELER.map((b) => {
          /* "Tüm ilanlar" bir şirket seçiliyken seçili sayılmıyor: liste daralmış. */
          const aktif = bolge === b.id && (b.id !== 'tumu' || secili.length === 0);
          const anahtar = `bolge:${b.id}`;
          const donukMu = aktif && donuk === anahtar;
          /*
            Sayı yalnız "Tüm ilanlar" seçiliyken erişilebilir adda: `toplam`
            o anki görünümün toplamı; Türkiye görünümündeyken "Tüm ilanlar,
            109 ilan" demek tüm kataloğu olduğundan az gösteriyordu.
          */
          const ad = donukMu
            ? `${b.tamAd}, ${donukSayi === null ? 'ilan sayısı yükleniyor' : `${donukSayi} ilan`}`
            : b.id === 'tumu' && bolge === 'tumu'
              ? `Tüm ilanlar, ${toplam} ilan`
              : b.tamAd;
          return (
            <li key={b.id}>
              <HapFiltre
                secili={aktif}
                onClick={() => (aktif && onCevir ? onCevir(anahtar) : onBolge(b.id))}
                ariaLabel={ad}
              >
                {donukMu ? `${b.etiket} · ${sayiMetni(donukSayi)}` : b.etiket}
              </HapFiltre>
            </li>
          );
        })}
      </ul>
    </YatayKaydirma>

    {(sirketler.length > 0 || secili.length > 0) && (
      <YatayKaydirma className={SATIR}>
        <ul aria-label="Şirket" className={HAP_SERIDI}>
          {/*
            TEMİZLE — seçili şirket varken satırın başında. Seçim eskiden
            yalnız hapların rengiyle anlaşılıyordu; tek dokunuşla hepsi
            kalkıyor (her seçili şirket için aynı `onSec`, yeni durum yok).
          */}
          {secili.length > 0 && (
            <li>
              <button
                type="button"
                onClick={() => secili.forEach((ad) => onSec(ad))}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <X aria-hidden className="h-4 w-4" />
                {secili.length === 1 ? 'Şirketi temizle' : `${secili.length} şirketi temizle`}
              </button>
            </li>
          )}
          {sirketler.map((s) => {
            const aktif = secili.includes(s.ad);
            const anahtar = `sirket:${s.ad}`;
            const donukMu = aktif && donuk === anahtar;
            return (
              <li key={s.ad}>
                <HapFiltre
                  secili={aktif}
                  onClick={() => (aktif && onCevir ? onCevir(anahtar) : onSec(s.ad))}
                  ariaLabel={
                    donukMu
                      ? `${s.ad}, ${donukSayi === null ? 'ilan sayısı yükleniyor' : `${donukSayi} ilan`}`
                      : `${s.ad}, ${s.yeni ? 'yeni ilan' : `${s.adet} ilan`}`
                  }
                  title={s.ad}
                  onEk={
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white">
                      <KureLogosu ad={s.ad} logo={s.logo} />
                    </span>
                  }
                >
                  {donukMu ? `${s.ad} · ${sayiMetni(donukSayi)}` : s.ad}
                </HapFiltre>
              </li>
            );
          })}
        </ul>
      </YatayKaydirma>
    )}
    {/* Gösterilen sayı ekran okuyucuya da söyleniyor. */}
    <span className="sr-only" aria-live="polite">
      {donuk ? (donukSayi === null ? 'İlan sayısı yükleniyor' : `${donukSayi} ilan`) : ''}
    </span>
  </nav>
);
