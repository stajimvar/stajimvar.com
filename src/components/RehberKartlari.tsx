import React from 'react';
import { Bookmark, ChevronRight, Clock } from 'lucide-react';
import { konuEtiketi, rehberOkumaDakika, type Rehber } from '../data/rehberler';
import { tarihMetni } from '../lib/tarih.mjs';
import { YUZEY } from '../ui/tokens';

/**
 * Rehber kartı ve iskeleti.
 *
 * NEDEN KART DEĞİŞTİ
 * ------------------
 * Önceki kart `aspect-square` bir fotoğraftı ve başlık görselin ÜSTÜNE
 * biniyordu. İki sonucu vardı:
 *
 *   1. Kart çok uzundu. Masaüstünde ilk ekranda tek bir rehber başlığı
 *      görünmüyordu; kullanıcı kaydırmadan ne olduğunu anlamıyordu.
 *   2. Başlık dışında hiçbir şey yoktu. Özet, tarih, kaydetme yoktu;
 *      okuyucu "bu yazı ne anlatıyor" sorusunu kartta cevaplayamıyordu.
 *
 * Yeni kart: sabit oranlı ve alçak bir kapak, altında kategori, başlık,
 * iki satır özet, okuma süresi, tarih ve eylemler. Görsel artık bilgiyi
 * taşımıyor, yalnızca kartı tanıtıyor — bu yüzden küçültülebiliyor.
 *
 * KARTIN TAMAMI TIKLANABİLİR
 * --------------------------
 * Dış öğe bir `<a href>`: tarayıcı adresi gösteriyor, orta tuş ve
 * "yeni sekmede aç" çalışıyor, arama motoru iç bağlantıyı görüyor.
 * Kaydet düğmesi kartın İÇİNDE ayrı bir düğme olduğu için tıklaması
 * bağlantıya taşmasın diye olayı durduruyor — iç içe iki eylemi olan
 * kartlarda en sık yapılan hata bu.
 */

/*
  Tarih biçimi tek kaynaktan: `lib/tarih`. Buradaki kopya saat dilimi
  vermiyordu ve `guncelleme` saatsiz bir gün ('2026-09-06'); UTC'nin
  batısındaki okuyucuda bir gün geri kayıyordu.
*/

export interface KartProps {
  rehber: Rehber;
  onNavigate?: (yol: string) => void;
  /** Kaydetme yalnızca destekleniyorsa çiziliyor; süs düğme yok. */
  kayitli?: boolean;
  onKaydet?: (slug: string) => void;
  /** Giriş gerekiyorsa düğme kaydetmiyor, giriş ekranını açıyor. */
  kaydetmeEtiketi?: string;
}

export const RehberKarti: React.FC<KartProps> = ({
  rehber,
  onNavigate,
  kayitli = false,
  onKaydet,
  kaydetmeEtiketi,
}) => {
  const tarih = tarihMetni(rehber.guncelleme);

  return (
    <a
      href={`/rehber/${rehber.slug}`}
      onClick={(e) => {
        if (!onNavigate) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate(`/rehber/${rehber.slug}`);
      }}
      /*
        TELEFONDA KABUK YOK

        Kart yuvarlatılmış, çerçeveli ve gölgeliydi; iki sütun arasında
        10 piksel boşluk vardı. Üç ayrı kenar işareti (çerçeve, gölge,
        boşluk) aynı şeyi söylüyordu: "kart burada bitiyor". Telefonda
        üçü de kalktı — hücreleri ayıran tek şey ızgaranın 1 pikselik
        arası (RehberIzgarasi). `sm:` üstünde kart aynen geri geliyor.
      */
      className="group flex h-full flex-col overflow-hidden bg-white transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-xs sm:hover:-translate-y-0.5 sm:hover:border-blue-300 sm:hover:shadow-md"
    >
      {/*
        KAPAK TELEFONDA ORANLI, GENİŞ EKRANDA SABİT YÜKSEKLİKTE

        Telefonda 96 piksel sabitti ve hücre genişliği 187 piksel: kapak
        neredeyse 2:1 bir şeride dönüşüyor, fotoğrafın konusu kırpılıp
        gidiyordu. Oran (4:3) hücre ne kadar genişse kapağı o kadar
        yüksek yapıyor; kapak hücrenin tam genişliğini kaplıyor ve iki
        yanında boşluk kalmıyor.

        `sm:` üstünde sabit yükseklik KALIYOR: orada sütun genişledikçe
        oranlı kapak da büyüyor ve 1280x720'de kartın tamamı ekrana
        sığmıyordu (ölçülmüştü: kart 386 piksel).

        Her iki durumda da kutu yüksekliği görselden bağımsız, yani
        görsel inerken ızgara zıplamıyor.
      */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gray-100 sm:aspect-auto sm:h-36">
        <picture>
          <source
            srcSet={`/rehber-gorselleri/${rehber.slug}.avif?v=rehber-fotograf-20260907-tam`}
            type="image/avif"
          />
          <img
            src={`/rehber-gorselleri/${rehber.slug}.webp?v=rehber-fotograf-20260907-tam`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            width={720}
            height={405}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </picture>
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-700 shadow-xs sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-[10px]">
          {konuEtiketi(rehber.konu)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-3.5">
        <h3 className="text-[13px] font-bold leading-snug text-gray-900 line-clamp-2 sm:text-base">
          {rehber.baslik}
        </h3>
        <p className="hidden text-xs leading-relaxed text-gray-600 line-clamp-2 sm:block">{rehber.ozet}</p>

        {/*
          "REHBERİ AÇ" SATIRI KALKTI

          Kartın tamamı zaten rehbere giden bir bağlantı; altındaki
          "Rehberi aç →" ikinci bir "aynı yere git" satırıydı ve kendi
          ayıracıyla birlikte kartın altına 32 piksel ekliyordu. Telefonda
          iki sütunlu ızgarada bu, ekrana sığan kart sayısını düşüren en
          büyük tek kalemdi.

          Geriye okuma süresi ve kaydet kaldı; ikisi aynı satırda, karşı
          karşıya. Tarih yalnızca geniş ekranda: dar hücrede okuma
          süresiyle aynı satıra sığmıyor ve alta inip bir satır daha
          açıyordu.
        */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-gray-600">
          <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {rehberOkumaDakika(rehber)} dk
            </span>
            {tarih && (
              <>
                <span aria-hidden className="hidden text-gray-300 sm:inline">
                  ·
                </span>
                <span className="hidden sm:inline">{tarih}</span>
              </>
            )}
          </span>

          {onKaydet && (
            <button
              type="button"
              aria-pressed={kaydetmeEtiketi ? undefined : kayitli}
              aria-label={kaydetmeEtiketi ?? (kayitli ? 'Kaydı kaldır' : 'Rehberi kaydet')}
              title={kaydetmeEtiketi ?? (kayitli ? 'Kaydı kaldır' : 'Rehberi kaydet')}
              onClick={(e) => {
                /*
                  Kart bir bağlantı; iç düğmenin tıklaması ona ULAŞMAMALI.
                  Yoksa "kaydet"e basan kişi rehbere gidiyordu.
                */
                e.preventDefault();
                e.stopPropagation();
                onKaydet(rehber.slug);
              }}
              /*
                Dokunma alanı 44 piksel: mobilde küçük ikon hedefi
                ıskalanıyor. Negatif kenar boşluğu düğmeyi satırın
                dışına taşırıyor — hedef 44 kalıyor ama kartın altına
                fazladan yükseklik eklemiyor.
              */
              className={`-my-2.5 -mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                kayitli ? 'text-blue-700 hover:bg-blue-50' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${kayitli ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </a>
  );
};

/**
 * Yükleme iskeleti.
 *
 * Ölçüleri gerçek kartla aynı: içerik gelince ızgara zıplamıyor. Boş bir
 * dönen çark yerine bunu göstermek, sayfanın neye benzeyeceğini önceden
 * anlatıyor.
 */
export const RehberKartiIskeleti: React.FC = () => (
  <div aria-hidden className="flex h-full flex-col overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-gray-200">
    <div className="aspect-[4/3] w-full animate-pulse bg-gray-100 sm:aspect-auto sm:h-36" />
    <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-3.5">
      <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
      <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-gray-100" />
      <div className="mt-auto h-3 w-24 animate-pulse rounded bg-gray-100" />
    </div>
  </div>
);

/**
 * KART IZGARASI — TELEFONDA DA İKİ SÜTUN
 *
 * Tek sütundu: kart 375 pikselde tam genişlik, görselle birlikte ~430
 * piksel boyunda oluyordu ve ekrana bir buçuk kart sığıyordu. Yetmiş bir
 * yazılık bir listede bu, listenin gezilemez olması demek — kullanıcı
 * ikinci başlığı görmek için kaydırmak zorunda.
 *
 * İki sütunda kart ~165 piksele iniyor ve ekrana dört kart giriyor.
 * Karşılığı görselin küçülmesi; başlık ve özet için `line-clamp` zaten
 * vardı, dar sütunda punto ve boşluk da bir kademe küçülüyor.
 *
 * AYIRICI: 1 PİKSEL, BOŞLUK DEĞİL
 * -------------------------------
 * Sütunlar arası 10 pikselik boşluktu ve ızgara sayfanın 16 pikselik
 * yan boşluğunun içindeydi; 375 piksellik ekranda hücreye 172 piksel
 * kalıyordu. Izgara artık ekranın iki kenarına yaslı ve hücreleri
 * ayıran şey 1 piksel.
 *
 * O 1 piksel bir kenarlık DEĞİL: ızgaranın zemini gri, araları
 * `gap-px`, hücreler beyaz — çizgi zeminin göründüğü yer. Kenarlıkla
 * yapılsaydı komşu hücrelerin kenarlıkları üst üste binip 2 piksel
 * olurdu ve son sütunun sağında tek başına bir çizgi kalırdı.
 *
 * `sm:` üstünde zemin saydamlaşıyor ve boşluk geri geliyor: orada
 * kartlar gri zeminde yüzen kutular.
 */
export const RehberIzgarasi: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className={`grid grid-cols-2 gap-px bg-gray-200 sm:gap-4 sm:bg-transparent lg:grid-cols-3 ${YUZEY.kap}`}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ *
 * REHBER MERKEZİ DÜZENİ (onaylanan tasarım, 16 Eylül 2026)
 *
 * Merkez sayfası artık ızgara değil: en üstte büyük bir ÖNE ÇIKAN rehber,
 * altında konu bölümleri ve her bölümde kapaklı SATIRLAR. Aşağıdaki
 * parçalar yalnız o sayfanın; tek rehber sayfasındaki "ilgili rehberler"
 * ve arama sonuçları yukarıdaki `RehberKarti`/`RehberIzgarasi` ile
 * çizilmeye devam ediyor.
 *
 * TIKLAMA: kartın tamamı başlık bağlantısının `after:` örtüsüyle rehbere
 * gidiyor; kaydet düğmesi örtünün üstünde (`relative z-10`). Bağlantının
 * içine düğme koymak geçersiz HTML olurdu.
 * ------------------------------------------------------------------ */

/** Rehber kapağı — kartla AYNI sürümlü dosyalar. */
export const RehberKapagi: React.FC<{ slug: string; oncelikli?: boolean }> = ({ slug, oncelikli = false }) => (
  <picture>
    <source
      srcSet={`/rehber-gorselleri/${slug}.avif?v=rehber-fotograf-20260907-tam`}
      type="image/avif"
    />
    <img
      src={`/rehber-gorselleri/${slug}.webp?v=rehber-fotograf-20260907-tam`}
      alt=""
      aria-hidden="true"
      loading={oncelikli ? 'eager' : 'lazy'}
      decoding="async"
      width={720}
      height={405}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  </picture>
);

const baglantiTiklamasi =
  (yol: string, onNavigate?: (yol: string) => void) =>
  (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(yol);
  };

const KaydetDugmesi: React.FC<{
  rehber: Rehber;
  kayitli: boolean;
  onKaydet: (slug: string) => void;
  kaydetmeEtiketi?: string;
  className?: string;
}> = ({ rehber, kayitli, onKaydet, kaydetmeEtiketi, className = '' }) => (
  <button
    type="button"
    aria-pressed={kaydetmeEtiketi ? undefined : kayitli}
    aria-label={kaydetmeEtiketi ?? (kayitli ? 'Kaydı kaldır' : 'Rehberi kaydet')}
    title={kaydetmeEtiketi ?? (kayitli ? 'Kaydı kaldır' : 'Rehberi kaydet')}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onKaydet(rehber.slug);
    }}
    className={`relative z-10 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors ${
      kayitli ? 'text-blue-700 hover:bg-blue-50' : 'text-slate-700 hover:bg-gray-100'
    } ${className}`}
  >
    <Bookmark aria-hidden className={`h-6 w-6 ${kayitli ? 'fill-current' : ''}`} strokeWidth={1.75} />
  </button>
);

/** Büyük öne çıkan rehber: tam genişlik kapak, konu etiketi, özet. */
export const OneCikanRehberKarti: React.FC<KartProps> = ({
  rehber,
  onNavigate,
  kayitli = false,
  onKaydet,
  kaydetmeEtiketi,
}) => {
  const yol = `/rehber/${rehber.slug}`;
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:border-gray-300">
      <div className="relative aspect-[12/5] w-full overflow-hidden bg-gray-100">
        <RehberKapagi slug={rehber.slug} oncelikli />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-800 shadow-sm">
          {konuEtiketi(rehber.konu)}
        </span>
      </div>
      <div className="px-3.5 pb-1.5 pt-2.5 sm:px-4">
        <h3 className="text-[17px] font-bold leading-snug text-slate-900 sm:text-lg">
          <a
            href={yol}
            onClick={baglantiTiklamasi(yol, onNavigate)}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline group-hover:text-blue-700"
          >
            {rehber.baslik}
          </a>
        </h3>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-slate-500">{rehber.ozet}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <Clock aria-hidden className="h-4 w-4" />
            {rehberOkumaDakika(rehber)} dk
          </span>
          {onKaydet && (
            <KaydetDugmesi
              rehber={rehber}
              kayitli={kayitli}
              onKaydet={onKaydet}
              kaydetmeEtiketi={kaydetmeEtiketi}
              className="-mr-2"
            />
          )}
        </div>
      </div>
    </article>
  );
};

/** Konu bölümündeki satır: solda kapak, ortada başlık/özet/süre, sağda kaydet. */
export const RehberSatiri: React.FC<KartProps> = ({
  rehber,
  onNavigate,
  kayitli = false,
  onKaydet,
  kaydetmeEtiketi,
}) => {
  const yol = `/rehber/${rehber.slug}`;
  return (
    <article className="group relative flex gap-3 py-3">
      <div className="relative h-[72px] w-[96px] shrink-0 overflow-hidden rounded-lg bg-gray-100 min-[400px]:w-[104px]">
        <RehberKapagi slug={rehber.slug} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-slate-900">
          <a
            href={yol}
            onClick={baglantiTiklamasi(yol, onNavigate)}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline group-hover:text-blue-700"
          >
            {rehber.baslik}
          </a>
        </h3>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-500">{rehber.ozet}</p>
        <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-slate-600">
          <Clock aria-hidden className="h-4 w-4" />
          {rehberOkumaDakika(rehber)} dk
        </span>
      </div>
      {onKaydet && (
        <KaydetDugmesi
          rehber={rehber}
          kayitli={kayitli}
          onKaydet={onKaydet}
          kaydetmeEtiketi={kaydetmeEtiketi}
          className="-mr-2 self-end"
        />
      )}
    </article>
  );
};

/** Başlıklı satır bölümü; "Tümünü gör" yalnız gösterilmeyen rehber varsa. */
export const RehberBolumu: React.FC<{
  baslik: string;
  onTumunuGor?: () => void;
  tumunuGorEtiketi?: string;
  children: React.ReactNode;
}> = ({ baslik, onTumunuGor, tumunuGorEtiketi, children }) => (
  <section>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[21px] font-extrabold tracking-tight text-slate-900">{baslik}</h2>
      {onTumunuGor && (
        <button
          type="button"
          onClick={onTumunuGor}
          aria-label={tumunuGorEtiketi ?? `${baslik}: tümünü gör`}
          className="-mr-1 inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-0.5 px-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Tümünü gör
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      )}
    </div>
    <div className="divide-y divide-gray-200">{children}</div>
  </section>
);
