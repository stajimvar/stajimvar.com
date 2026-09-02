import React, { useEffect, useState } from "react";
import type { DiscoverCategory, DiscoverCoverKind } from "../lib/kesfet";

const CATEGORY_COVERS: Record<DiscoverCategory, string> = {
  exhibition: "/kesfet-kapaklari/kultur-sanat.svg",
  museum: "/kesfet-kapaklari/kultur-sanat.svg",
  festival: "/kesfet-kapaklari/festival.svg",
  fair: "/kesfet-kapaklari/kariyer-fuar.svg",
  theatre: "/kesfet-kapaklari/kultur-sanat.svg",
  concert: "/kesfet-kapaklari/festival.svg",
  workshop: "/kesfet-kapaklari/atolye-egitim.svg",
  university: "/kesfet-kapaklari/kampus-kulup.svg",
  city_route: "/kesfet-kapaklari/gezi.svg",
  day_trip: "/kesfet-kapaklari/gezi.svg",
};

export const EventCover: React.FC<{
  src?: string;
  /*
    Aynı kapağın 1280×720 varyantı (detail.webp).

    Kart şeride taşınınca genişliği 300–340 piksele çıktı ve retina
    ekranda bu 680 fiziksel piksel demek: 640'lık `card.webp` tam da
    okunaklı kalması gereken afiş yazısında yumuşuyordu. İki varyantı
    `srcSet` ile verip seçimi tarayıcıya bırakıyoruz — küçük ekran yine
    640'ı indiriyor, kimse gereksiz veri harcamıyor.

    Not: iki varyant da içe aktarma hattında `ImageOps.fit` ile ortadan
    KIRPILARAK üretiliyor (automation/event_import/images.py). Yani bu
    prop netliği düzeltiyor, kırpmayı değil; kırpma kaynağında çözülmeli.
  */
  srcDetail?: string;
  category: DiscoverCategory;
  title: string;
  coverKind?: DiscoverCoverKind;
  className?: string;
  /** Şeritteki kartlar için tarayıcıya çizim genişliğini bildiriyor. */
  sizes?: string;
}> = ({
  src,
  srcDetail,
  category,
  title,
  coverKind = "category",
  className = "",
  sizes,
}) => {
  const fallback = CATEGORY_COVERS[category];
  const [current, setCurrent] = useState(src || fallback);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setCurrent(src || fallback);
    setLoading(true);
  }, [src, fallback]);
  const general = !src || current === fallback || coverKind === "category";
  /*
    Yedek kapak bir SVG: ölçekten bağımsız, ikinci varyantı yok. srcSet
    yalnızca gerçek fotoğraf gösterilirken kuruluyor.
  */
  const cokluCozunurluk =
    !general && srcDetail && srcDetail !== current
      ? `${current} 640w, ${srcDetail} 1280w`
      : undefined;
  return (
    <div className={`relative aspect-video overflow-hidden bg-blue-50 ${className}`}>
      {loading && <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden="true" />}
      <img
        src={current}
        srcSet={cokluCozunurluk}
        sizes={cokluCozunurluk ? sizes : undefined}
        alt={general ? `${title} için genel kategori kapağı` : `${title} etkinlik kapağı`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoading(false)}
        onError={() => {
          if (current !== fallback) setCurrent(fallback);
          else setLoading(false);
        }}
        /*
          `group-hover` kartın üstünde: şeritte hangi kartın üzerinde
          olduğun okunuyor. Ölçek küçük (1.03) — kapak kırpması zaten
          dar, büyük ölçek afişin kenarını daha da yiyor.
        */
        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      {general && (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-white">
          Genel kapak
        </span>
      )}
    </div>
  );
};
