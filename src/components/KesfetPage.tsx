import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { FiltreBlogu, SecenekSatiri, Serit } from "../ui";
import { SAYFA_GENISLIGI } from "../lib/duzen";
import { EventCover } from "./EventCover";
import {
  DISCOVER_CATEGORIES,
  fetchDiscoverEvents,
  type DiscoverEvent,
} from "../lib/kesfet";
import {
  buildDiscoverCollections,
  formatDiscoverDate,
  formatDiscoverLocation,
  matchesDiscoverDateFilter,
  matchesDiscoverSearch,
} from "../lib/kesfet-domain.mjs";

const verificationText = (event: DiscoverEvent) => {
  if (
    event.verificationStatus === "verified" &&
    event.sourceKind === "official"
  )
    return "Resmî kaynaktan doğrulandı";
  if (!event.lastVerifiedAt) return null;
  const hours = Math.max(
    1,
    Math.round(
      (Date.now() - new Date(event.lastVerifiedAt).getTime()) / 3600000,
    ),
  );
  return hours < 24
    ? `${hours} saat önce kontrol edildi`
    : `${Math.round(hours / 24)} gün önce kontrol edildi`;
};

/**
 * Şeritteki kart genişliği; kapak `sizes` değeri bununla aynı kalmalı.
 *
 * Kap 1440'a, şerit de sağdaki 9 sütuna oturunca dörtlü düzende kart
 * ~250 piksele geliyor; `sizes` bunu yansıtmazsa tarayıcı gereğinden
 * küçük varyantı seçip kapağı yumuşatır.
 */
const KART_SIZES =
  "(min-width: 1024px) 250px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 78vw";

/*
  KART TÜMÜYLE BİR BAĞLANTI

  Eskiden kartın tek tıklanabilir yeri altındaki "Detayları gör →" yazısıydı.
  Şeritte kart büyüdükçe bu daha da tuhaflaşıyordu: 340×400 piksellik bir
  görselin yalnızca alt köşesindeki yazı iş görüyordu, afişin kendisine
  basmak hiçbir şey yapmıyordu.

  Çözüm ScholarshipDiscoveryCard'daki desenin aynısı: başlıktaki gerçek
  <a>, `after:absolute after:inset-0` ile kartın tamamına yayılıyor. Tek
  bağlantı, tek erişilebilir ad — kartı bir <a> ile sarmak başlık, tarih ve
  konumu tek bir devasa bağlantı adına çevirirdi.

  Gerçek href: orta tuşla yeni sekmede açma ve "bağlantıyı kopyala"
  çalışıyor, arama motoru da geçişi görüyor.
*/
const EventCard: React.FC<{
  event: DiscoverEvent;
  onNavigate: (path: string) => void;
}> = ({ event: e, onNavigate }) => {
  const yol = `/kesfet/${e.slug}`;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-200 hover:border-blue-400 focus-within:border-blue-600">
      <EventCover
        src={e.cardImageUrl || e.imageUrl}
        srcDetail={e.detailImageUrl}
        sizes={KART_SIZES}
        category={e.category}
        title={e.title}
        coverKind={e.coverKind}
      />
      {/*
        ÜCRETSİZ / İNDİRİMLİ KAPAĞIN ÜSTÜNDE

        Öğrencinin şeritte göz gezdirirken aradığı tek sinyal bu. Gövdede,
        diğer üç etiketin arasında dururken kayboluyordu; kapağın köşesinde
        kart açılmadan okunuyor. Kategori aşağıda kalıyor — o bir tarama
        sinyali değil, bir sınıflandırma.
      */}
      {(e.isFree || e.hasStudentDiscount) && (
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${
            e.isFree ? "bg-emerald-600 text-white" : "bg-white text-violet-700"
          }`}
        >
          {e.isFree ? "Ücretsiz" : "Öğrenci indirimli"}
        </span>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/*
          Başlık kartın en üstünde ve en güçlü öğesi. Kategori etiketi
          başlığın ÜSTÜNDEYDİ; orada bir üst-başlık gibi okunuyor ve asıl
          başlığın önüne geçiyordu. Aşağıda, ait olduğu yerde: künye.
        */}
        <h3 className="text-lg font-black leading-snug text-gray-900">
          <a
            href={yol}
            onClick={(ev) => {
              if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
              ev.preventDefault();
              onNavigate(yol);
            }}
            className="line-clamp-2 rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 group-hover:text-blue-700"
          >
            {e.title}
          </a>
        </h3>

        <p className="flex items-start gap-2 text-sm text-gray-600">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span>{formatDiscoverDate(e)}</span>
        </p>
        <p className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span className="line-clamp-2">{formatDiscoverLocation(e)}</span>
        </p>

        {/*
          `mt-auto`: künye kartın dibine yapışıyor. Şeritte kartlar eşit
          yükseklikte ve başlıkları bir ya da iki satır olabiliyor; bu
          olmadan doğrulama satırı her kartta farklı hizada duruyordu.
        */}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
            {DISCOVER_CATEGORIES[e.category]}
          </span>
          {e.studentPrice != null && (
            <span className="text-[13px] font-bold text-gray-900 tabular-nums">
              Öğrenci: {e.studentPrice.toLocaleString("tr-TR")} TL
            </span>
          )}
        </div>
        {verificationText(e) && (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            {verificationText(e)}
          </p>
        )}
      </div>
    </article>
  );
};

/*
  SÜZGEÇ PANELİ — İLAN VE FIRSAT SAYFALARIYLA AYNI

  Denetimler yatay bir hap şeridiydi ve başlık kartının içinde duruyordu.
  Şerit seçenekleri ve sayıları gizliyor: "kaç ücretsiz etkinlik var"
  sorusunun cevabı ancak deneyerek öğreniliyordu.

  Panel artık sol sütunda, kardeş sayfalardaki bölümlü yapıda. Bölüm
  başlıkları ve satır ölçüleri paylaşılan bileşenlerden (`src/ui/Filtre`),
  yani üç sayfa tek kaynaktan besleniyor.
*/
const Suzgecler: React.FC<{
  cities: string[];
  city: string;
  setCity: (v: string) => void;
  period: string;
  setPeriod: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  free: boolean;
  setFree: (v: boolean) => void;
  discount: boolean;
  setDiscount: (v: boolean) => void;
  /*
    Sayımlar ekranda çizilecek kart sayısı (bkz. `sayimlar` memo'su);
    sıfır olan seçenek, seçili değilse hiç çizilmiyor.
  */
  sayimlar: { kategori: Record<string, number>; ucretsiz: number; indirimli: number };
  acikSuzgecSayisi: number;
  temizle: () => void;
}> = ({
  cities,
  city,
  setCity,
  period,
  setPeriod,
  category,
  setCategory,
  free,
  setFree,
  discount,
  setDiscount,
  sayimlar,
  acikSuzgecSayisi,
  temizle,
}) => (
  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
      <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-500" />
      <span className="text-sm font-bold text-gray-900">Filtreler</span>
      {acikSuzgecSayisi > 0 && (
        <>
          <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">
            {acikSuzgecSayisi}
          </span>
          <button
            type="button"
            onClick={temizle}
            className="ml-auto shrink-0 cursor-pointer text-xs font-bold text-blue-600 hover:underline"
          >
            Temizle
          </button>
        </>
      )}
    </div>

    <div className="divide-y divide-gray-100">
      <FiltreBlogu baslik="Konum">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            aria-label="Şehir"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
          >
            <option value="">Tüm şehirler</option>
            {cities.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
      </FiltreBlogu>

      <FiltreBlogu baslik="Tarih">
        <div className="space-y-0.5">
          {[
            ["all", "Tümü"],
            ["today", "Bugün"],
            ["week", "Bu hafta"],
            ["month", "Bu ay"],
          ].map(([deger, etiket]) => (
            <SecenekSatiri
              key={deger}
              tip="radio"
              etiket={etiket}
              secili={period === deger}
              onChange={() => setPeriod(deger)}
            />
          ))}
        </div>
      </FiltreBlogu>

      <FiltreBlogu baslik="Kategori">
        <div className="space-y-0.5">
          <SecenekSatiri
            tip="radio"
            etiket="Tüm kategoriler"
            secili={category === ""}
            onChange={() => setCategory("")}
          />
          {Object.entries(DISCOVER_CATEGORIES).map(([deger, etiket]) => {
            const adet = sayimlar.kategori[deger] ?? 0;
            if (adet === 0 && category !== deger) return null;
            return (
              <SecenekSatiri
                key={deger}
                tip="radio"
                etiket={etiket}
                adet={adet}
                secili={category === deger}
                onChange={() => setCategory(deger)}
              />
            );
          })}
        </div>
      </FiltreBlogu>

      {(sayimlar.ucretsiz > 0 || sayimlar.indirimli > 0) && (
        <FiltreBlogu baslik="Ücret">
          <div className="space-y-0.5">
            {sayimlar.ucretsiz > 0 && (
              <SecenekSatiri
                tip="checkbox"
                etiket="Ücretsiz"
                adet={sayimlar.ucretsiz}
                secili={free}
                onChange={() => setFree(!free)}
              />
            )}
            {sayimlar.indirimli > 0 && (
              <SecenekSatiri
                tip="checkbox"
                etiket="Öğrenci indirimli"
                adet={sayimlar.indirimli}
                secili={discount}
                onChange={() => setDiscount(!discount)}
              />
            )}
          </div>
        </FiltreBlogu>
      )}
    </div>
  </section>
);

export const KesfetPage: React.FC<{
  onNavigate: (p: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}> = ({ onNavigate, searchQuery = "", onSearchChange }) => {
  const [rows, setRows] = useState<DiscoverEvent[]>([]),
    [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [city, setCity] = useState(""),
    [period, setPeriod] = useState("all"),
    [category, setCategory] = useState(""),
    [free, setFree] = useState(false),
    [discount, setDiscount] = useState(false);

  /*
    `filtersOpen`: YALNIZCA DAR EKRAN İÇİN

    Bir ara silinmişti; o sırada denetimler tek satırlık yatay bir hap
    şeridiydi ve gizlenecek kadar yer kaplamıyordu. Panel artık bölümlü
    ve uzun: konum, tarih, kategori ve ücret alt alta. Telefonda açık
    dursa ilk etkinlik kartı ekranın çok altına düşerdi.

    Geniş ekranda bu durum hiç okunmuyor — panel `lg:block` ile her
    zaman açık; durum yalnızca `lg` altındaki görünürlüğü yönetiyor.
  */
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* Aynı anda hepsini varsayılana döndürüyor; "Filtreleri temizle" buna bağlı. */
  const filtreleriTemizle = () => {
    setCity("");
    setPeriod("all");
    setCategory("");
    setFree(false);
    setDiscount(false);
  };

  /*
    SAYFA BAŞLIĞI VE CANONICAL

    Keşfet uygulama içinde gezilirken belge değişmiyor ve başlık ana
    sayfanınki olarak kalıyordu: sekmede "StajımVar - Staj Bulmanın En
    Akıllı Yolu" yazıyor, paylaşılan bağlantı da öyle görünüyordu.
    Fırsatlar sayfası bunu zaten yapıyor; iki sayfa aynı davranıyor.
  */
  useEffect(() => {
    document.title = 'Öğrenci etkinlikleri ve fırsatları | StajımVar';
    const canonical =
      document.querySelector('link[rel="canonical"]') ||
      Object.assign(document.createElement('link'), { rel: 'canonical' });
    canonical.setAttribute('href', `${window.location.origin}/kesfet`);
    document.head.appendChild(canonical);
  }, []);

  useEffect(() => {
    fetchDiscoverEvents()
      .then((x) => {
        setRows(x);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);
  const cities = useMemo(
    () =>
      [...new Set(rows.map((x) => x.city))].sort((a, b) =>
        a.localeCompare(b, "tr"),
      ),
    [rows],
  );
  /*
    SÜZGEÇ SAYILARI EKRANDAKİ KARTI SAYIYOR

    Ham `rows` üzerinden saymak yanlış sonuç verir: `buildDiscoverCollections`
    her bölüme en fazla 10 kayıt koyuyor, bölümleri tekilleştiriyor ve beş
    tanımın hiçbirine girmeyen bir etkinliği hiç çizmiyor. Yani süzgeci geçen
    kayıt sayısı ekrandaki kart sayısından fazla olabilir — panelde "12" yazıp
    tıklayınca 9 kart çıkardı.

    Bu yüzden her sayı, o seçenek açıkken listenin izleyeceği yolun aynısından
    geçiriliyor: aynı süzgeçler, aynı koleksiyon üreticisi. Sayı neyse tıklayınca
    görülen kart sayısı o.
  */
  const sayimlar = useMemo(() => {
    const gorunenSayi = (secim: {
      category: string;
      free: boolean;
      discount: boolean;
    }) => {
      const liste = rows.filter(
        (x) =>
          (!city || x.city === city) &&
          (!secim.category || x.category === secim.category) &&
          (!secim.free || x.isFree) &&
          (!secim.discount || x.hasStudentDiscount) &&
          matchesDiscoverSearch(x, searchQuery) &&
          (period === "all" || matchesDiscoverDateFilter(x, period)),
      );
      return buildDiscoverCollections(liste, { city }).reduce(
        (toplam: number, k: { events: unknown[] }) => toplam + k.events.length,
        0,
      );
    };
    const kategori: Record<string, number> = {};
    for (const anahtar of Object.keys(DISCOVER_CATEGORIES))
      kategori[anahtar] = gorunenSayi({ category: anahtar, free, discount });
    return {
      kategori,
      ucretsiz: gorunenSayi({ category, free: true, discount }),
      indirimli: gorunenSayi({ category, free, discount: true }),
    };
  }, [rows, city, period, searchQuery, category, free, discount]);

  const shown = useMemo(
    () =>
      rows.filter(
        (x) =>
          (!city || x.city === city) &&
          (!category || x.category === category) &&
          (!free || x.isFree) &&
          (!discount || x.hasStudentDiscount) &&
          matchesDiscoverSearch(x, searchQuery) &&
          (period === "all" || matchesDiscoverDateFilter(x, period)),
      ),
    [rows, city, category, free, discount, period, searchQuery],
  );
  const collections = useMemo(
    () => buildDiscoverCollections(shown, { city }),
    [shown, city],
  );
  /*
    SAYFA GENELİ SAYAÇ KALDIRILDI

    Üstte tek bir "20 etkinlik" satırı vardı. Sayı artık her bölümün kendi
    başlığında ve o bölüme ait: "Bu Hafta · 10 etkinlik". Hem daha çok şey
    söylüyor hem sayfadan bir satır siliyor.

    Not: sayfa geneli toplam yazılacaksa `shown.length` KULLANILMAMALI —
    koleksiyon üreticisi her gruba en fazla 10 kayıt koyup grupları
    tekilleştirdiği için süzgeci geçen kayıt ekrandaki karttan fazla
    olabiliyor (lib/kesfet-domain.mjs → buildDiscoverCollections).
  */
  const activeFilters = [
    city,
    period !== "all" ? { today: "Bugün", week: "Bu hafta", month: "Bu ay" }[period] : "",
    category ? DISCOVER_CATEGORIES[category] : "",
    free ? "Ücretsiz" : "",
    discount ? "Öğrenci indirimli" : "",
  ].filter(Boolean) as string[];
  return (
    <main
      /*
        KAP ARTIK SİTENİN ORTAK GENİŞLİĞİ

        Burada `max-w-7xl` (1280) ve `px-6` vardı; üst menü ise
        SAYFA_GENISLIGI (1440) ve `xl:px-10` kullanıyor. Ölçüldü: 1440
        piksellik ekranda Keşfet içeriği menüden her iki yandan 73 piksel
        içeride kalıyordu — sayfa menünün altına hizalanmıyor, ortada dar
        bir sütun gibi duruyordu.

        Ölçü artık tek yerden (lib/duzen.ts) geliyor; o dosyanın kendi
        açıklaması da neden 1440 olduğunu anlatıyor.
      */
      className={`w-full ${SAYFA_GENISLIGI} mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 sm:pt-3 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-10`}
    >
      {/*
        SOL SÜTUN: BAŞLIK + SÜZGEÇ PANELİ

        Kardeş sayfaların düzeni. Önce başlık ve filtreler tam genişlikte,
        mavi gradyanlı bir kartın içindeydi; denetimler yatay bir hap
        şeridiydi. Şerit seçenekleri ve sayıları gizliyordu.

        Kart kalktı: kardeş sayfalarda başlık sol sütunun içinde, sade
        duruyor ve içerik sayfanın tepesinden başlıyor. Aynı yapı burada
        da kuruldu — üç sayfa artık aynı iskelet.
      */}
      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-3 lg:sticky lg:top-4">
          {/*
            BAŞLIK ÖLÇÜSÜ KARDEŞ SAYFALARDAN

            Sabit `26px / lg:32px` idi. Ölçüldü: 375 pikselde ilan sayfasının
            başlığı 18,8, fırsatlarınki 20, buradaki 26 pikseldi — üç sekme
            arasında geçiş yapınca başlık zıplıyordu. Altındaki her şey de
            onunla birlikte kayıyordu: arama satırı 15 piksel aşağıdaydı,
            dolayısıyla ayırıcı çizgi de.

            Aynı `clamp` fırsatlar sayfasından alındı; satır yüksekliği ve
            harf aralığı da oradaki kuralın aynısı (`leading-tight`,
            `tracking-tight`) — sabit piksel yazmak o kuralı üçüncü kez ve
            biraz farklı uygulamak olurdu.

            Not: başlık metni farklı sayıda satıra sarıyorsa çizgi de o
            kadar yukarıda durur. Bu hizasızlık değil, metnin uzunluğu.
          */}
          <h1 className="min-w-0 text-center lg:text-left [font-size:clamp(1.25rem,2.4vw,1.75rem)] font-extrabold leading-tight tracking-tight text-gray-950">
            Şehrindeki etkinlikler,{' '}
            <span className="text-blue-600">tek listede</span>.
          </h1>

          {/*
            Arama ve süzgeç düğmesi yan yana — ilan sayfasındaki satırın
            aynısı. Düğme yalnızca dar ekranda: geniş ekranda panel zaten
            altta açık duruyor.
          */}
          {onSearchChange && (
            <div className="flex items-center gap-2 lg:hidden">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  aria-label="Etkinlik ara"
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Etkinlik, şehir veya mekân ara"
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 transition-colors focus:border-blue-600 focus:outline-none"
                />
              </div>
              {/*
                PANEL DAR EKRANDA KAPALI BAŞLIYOR

                Bölümlü panel şeritten çok daha uzun: konum, tarih,
                kategori ve ücret alt alta. Telefonda açık bırakılsa ilk
                etkinlik ekranın çok altına düşerdi — kardeş sayfalarda da
                bu yüzden bir düğmenin arkasında.
              */}
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                aria-controls="kesfet-filters"
                aria-label={
                  activeFilters.length > 0
                    ? `Filtreler (${activeFilters.length} açık)`
                    : 'Filtreler'
                }
                className={`relative flex w-[52px] shrink-0 cursor-pointer items-center justify-center self-stretch rounded-2xl border transition-colors ${
                  filtersOpen || activeFilters.length > 0
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeFilters.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-extrabold text-white">
                    {activeFilters.length}
                  </span>
                )}
              </button>
            </div>
          )}

          <div id="kesfet-filters" className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
            <Suzgecler
              cities={cities}
              city={city}
              setCity={setCity}
              period={period}
              setPeriod={setPeriod}
              category={category}
              setCategory={setCategory}
              free={free}
              setFree={setFree}
              discount={discount}
              setDiscount={setDiscount}
              sayimlar={sayimlar}
              acikSuzgecSayisi={activeFilters.length}
              temizle={filtreleriTemizle}
            />
          </div>

          {/*
            AYIRICI — KARDEŞ SAYFALARDAKİNİN AYNISI

            İlan ve fırsat sayfalarında arama satırının altında yumuşak bir
            çizgi var; burada yoktu ve başlıkla ilk şerit arası boşlukta
            asılı kalıyordu. Ölçüsü oralardan alındı: 2 piksel yükseklik,
            16 piksel yuvarlatma, beyaz zemin, 1 piksel kenarlık ve
            `shadow-xs`. Yumuşaklığı yuvarlatmadan ve gölgeden geliyor,
            çizginin kalınlığından değil.

            İlan sayfasında bu şekil kasıtlı çizilmiş bir ayırıcı DEĞİL —
            kapalı filtre panelinin iki piksele çökmüş kabı. Görüntü
            beğenildiği için fırsatlar sayfasında da, burada da açıkça bir
            ayırıcı olarak yazıldı; kaza eseri oluşan bir biçime bel
            bağlamamak için.

            HİZA
            Arama kutusunun altıyla arası 16 piksel ve bunu sütunun kendi
            `space-y-4`ü veriyor — buraya ayrıca `mt` yazmak o sistemi
            ikinci kez uygulamak olurdu; fırsatlar sayfasında tam olarak bu
            hata ölçülüp (29 piksel) düzeltilmişti.

            `box-sizing: border-box` sayesinde `h-0.5` kenarlıklarla
            birlikte tam 2 piksel kalıyor.

            Panel AÇIKKEN çizilmiyor: o durumda ayırdığı iki şey arasında
            değil, açılan panelin altında kalıyor ve panelin bir parçası
            gibi okunuyor.
          */}
          {!filtersOpen && (
            <div
              aria-hidden
              className="h-0.5 rounded-2xl border border-gray-200 bg-white shadow-xs lg:hidden"
            />
          )}
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-9">

      {state === "loading" && (
        <div role="status" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((x) => (
            <div
              key={x}
              className="h-72 rounded-2xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      )}
      {state === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-white p-8 text-center"
        >
          <p className="font-bold text-rose-800">Etkinlikler yüklenemedi.</p>
          <button
            onClick={() => location.reload()}
            className="mt-3 text-blue-700 font-bold"
          >
            Tekrar dene
          </button>
        </div>
      )}
      {/*
        KOLEKSİYONLARIN KENDİ RİTMİ

        Bölümler arası mesafe `main`'in `space-y` değerinden geliyordu ve
        20 pikseldi — ölçüldü. O değer aynı zamanda başlık kabı ile ilk
        bölüm arasını da belirlediği için tek başına ayarlanamıyordu:
        bölümleri ayırmak için büyütmek, başlığı da içerikten koparıyordu.

        Koleksiyonlar kendi kabına alındı. Bölüm arası 28 + şeridin alt
        boşluğu 8 = 36 piksel; başlık kabı ile ilk bölüm arası `main`'in
        kendi ölçüsünde kalıyor.
      */}
      {state === "ready" && collections.length > 0 && (
        <div className="space-y-7">
          {collections.map(
          (collection: {
            id: string;
            title: string;
            events: DiscoverEvent[];
          }) => (
            <Serit
              key={collection.id}
              id={collection.id}
              baslik={collection.title}
              ogeler={collection.events}
              anahtar={(event) => event.id}
              /*
                Sayı BU bölüme ait ve gerçek: koleksiyonun kendi kart
                sayısı. Sayfa geneline ait tek bir toplam yerine her
                başlığın kendi künyesi — hangi rafta ne kadar var,
                başlığa bakınca görülüyor.
              */
              yanBilgi={
                <span className="shrink-0 text-[13px] font-medium text-gray-500 tabular-nums">
                  {collection.events.length} etkinlik
                </span>
              }
              ciz={(event) => <EventCard event={event} onNavigate={onNavigate} />}
            />
          ),
          )}
        </div>
      )}
      {state === "ready" && shown.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <Sparkles className="mx-auto w-8 h-8 text-blue-500" />
          <h2 className="mt-3 font-bold text-gray-900">
            Bu filtrelere uygun etkinlik bulunamadı
          </h2>
          <p className="text-sm text-gray-600">
            Filtreleri değiştirerek yeniden deneyebilirsin.
          </p>
        </div>
      )}
      {state === "ready" && shown.length > 0 && collections.length === 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((e) => <EventCard key={e.id} event={e} onNavigate={onNavigate} />)}
        </div>
      )}
        </div>
      </div>
    </main>
  );
};
