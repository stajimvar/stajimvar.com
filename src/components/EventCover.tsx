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
  category: DiscoverCategory;
  title: string;
  coverKind?: DiscoverCoverKind;
  className?: string;
}> = ({ src, category, title, coverKind = "category", className = "" }) => {
  const fallback = CATEGORY_COVERS[category];
  const [current, setCurrent] = useState(src || fallback);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setCurrent(src || fallback);
    setLoading(true);
  }, [src, fallback]);
  const general = !src || current === fallback || coverKind === "category";
  return (
    <div className={`relative aspect-video overflow-hidden bg-blue-50 ${className}`}>
      {loading && <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden="true" />}
      <img
        src={current}
        alt={general ? `${title} için genel kategori kapağı` : `${title} etkinlik kapağı`}
        onLoad={() => setLoading(false)}
        onError={() => {
          if (current !== fallback) setCurrent(fallback);
          else setLoading(false);
        }}
        className="h-full w-full object-cover"
      />
      {general && (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-white">
          Genel kapak
        </span>
      )}
    </div>
  );
};
