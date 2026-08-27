import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import {
  DISCOVER_CATEGORIES,
  fetchDiscoverEvents,
  type DiscoverEvent,
} from "../lib/kesfet";
import { buildDiscoverCollections, matchesDiscoverDateFilter } from "../lib/kesfet-domain.mjs";

const dateText = (v: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(v));

const verificationText = (event: DiscoverEvent) => {
  if (event.verificationStatus === "verified" && event.sourceKind === "official") return "Resmî kaynaktan doğrulandı";
  if (!event.lastVerifiedAt) return null;
  const hours = Math.max(1, Math.round((Date.now() - new Date(event.lastVerifiedAt).getTime()) / 3600000));
  return hours < 24 ? `${hours} saat önce kontrol edildi` : `${Math.round(hours / 24)} gün önce kontrol edildi`;
};

const EventCard: React.FC<{ event: DiscoverEvent; onNavigate: (path: string) => void; compact?: boolean }> = ({ event: e, onNavigate, compact }) => (
  <article className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${compact ? "min-w-[270px] w-[270px]" : ""}`}>
    {e.imageUrl ? <img src={e.imageUrl} alt="" className={`w-full object-cover ${compact ? "h-32" : "h-44"}`} /> : <div className={`bg-gradient-to-br from-blue-50 to-indigo-100 grid place-items-center ${compact ? "h-32" : "h-44"}`}><Sparkles className="w-10 h-10 text-blue-500" /></div>}
    <div className="p-4 space-y-2">
      <div className="flex flex-wrap gap-1"><span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">{DISCOVER_CATEGORIES[e.category]}</span>{e.isFree && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Ücretsiz</span>}{e.hasStudentDiscount && <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-1 rounded-full">Öğrenci indirimli</span>}</div>
      <h3 className="text-lg font-black text-gray-900">{e.title}</h3>
      <p className="flex gap-2 text-sm text-gray-600"><CalendarDays className="w-4 h-4 shrink-0" />{dateText(e.startsAt)}</p>
      <p className="flex gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 shrink-0" />{e.city}, {e.district} · {e.venueName}</p>
      {e.studentPrice != null && <p className="font-bold text-gray-900">Öğrenci: {e.studentPrice.toLocaleString("tr-TR")} TL</p>}
      {verificationText(e) && <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck className="w-3.5 h-3.5" />{verificationText(e)}</p>}
      <button onClick={() => onNavigate(`/kesfet/${e.slug}`)} className="text-sm font-bold text-blue-700">Detayları gör →</button>
    </div>
  </article>
);
export const KesfetPage: React.FC<{ onNavigate: (p: string) => void }> = ({
  onNavigate,
}) => {
  const [rows, setRows] = useState<DiscoverEvent[]>([]),
    [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [city, setCity] = useState(""),
    [period, setPeriod] = useState("all"),
    [category, setCategory] = useState(""),
    [free, setFree] = useState(false),
    [discount, setDiscount] = useState(false);
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
  const shown = useMemo(
    () =>
      rows.filter(
        (x) =>
          (!city || x.city === city) &&
          (!category || x.category === category) &&
          (!free || x.isFree) &&
          (!discount || x.hasStudentDiscount) &&
          (period === "all" || matchesDiscoverDateFilter(x, period)),
      ),
    [rows, city, category, free, discount, period],
  );
  const collections = useMemo(() => buildDiscoverCollections(rows), [rows]);
  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <p className="text-sm font-bold text-blue-600">Keşfet</p>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
          Öğrenci Rotası
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Şehrindeki ücretsiz veya öğrenci bütçesine uygun sergileri,
          festivalleri, fuarları, müzeleri ve etkinlikleri keşfet.
        </p>
      </header>
      <section
        aria-label="Etkinlik filtreleri"
        className="bg-white border border-gray-200 rounded-2xl p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <select
          aria-label="Şehir"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2"
        >
          <option value="">Tüm şehirler</option>
          {cities.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Tarih"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2"
        >
          <option value="all">Tüm tarihler</option>
          <option value="today">Bugün</option>
          <option value="week">Bu hafta</option>
          <option value="month">Bu ay</option>
        </select>
        <select
          aria-label="Kategori"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2"
        >
          <option value="">Tüm kategoriler</option>
          {Object.entries(DISCOVER_CATEGORIES).map(([k, v]) => (
            <option value={k} key={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={free}
            onChange={(e) => setFree(e.target.checked)}
          />{" "}
          Ücretsiz
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={discount}
            onChange={(e) => setDiscount(e.target.checked)}
          />{" "}
          Öğrenci indirimli
        </label>
      </section>
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
      {state === "ready" && collections.map((collection: { id: string; title: string; events: DiscoverEvent[] }) => (
        <section key={collection.id} aria-labelledby={`collection-${collection.id}`} className="space-y-3">
          <h2 id={`collection-${collection.id}`} className="text-xl font-black text-gray-900">{collection.title}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">{collection.events.map((event) => <div key={event.id} className="snap-start"><EventCard event={event} onNavigate={onNavigate} compact /></div>)}</div>
        </section>
      ))}
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
      {state === "ready" && shown.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((e) => <EventCard key={e.id} event={e} onNavigate={onNavigate} />)}
        </div>
      )}
    </main>
  );
};
