import React, { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import {
  DISCOVER_CATEGORIES,
  fetchDiscoverEventBySlug,
  type DiscoverEvent,
} from "../lib/kesfet";
import { EventCover } from "./EventCover";
import { formatDiscoverDate } from "../lib/kesfet-domain.mjs";
const dateText = (v: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(v));
export const KesfetDetailPage: React.FC<{
  slug: string;
  onBack: () => void;
}> = ({ slug, onBack }) => {
  const [e, setE] = useState<DiscoverEvent | null | undefined>();
  useEffect(() => {
    fetchDiscoverEventBySlug(slug)
      .then(setE)
      .catch(() => setE(null));
  }, [slug]);
  if (e === undefined)
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="h-80 bg-gray-100 animate-pulse rounded-2xl" />
      </main>
    );
  if (!e)
    return (
      <main className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="font-black text-2xl">Etkinlik bulunamadı</h1>
        <button onClick={onBack} className="mt-4 text-blue-700 font-bold">
          Keşfet'e dön
        </button>
      </main>
    );
  const now = new Date();
  const occurrences = e.occurrences || [];
  const ended = occurrences.length
    ? !occurrences.some(
        (occurrence) =>
          occurrence.status === "scheduled" &&
          new Date(occurrence.endsAt || occurrence.startsAt) >= now,
      )
    : Boolean(e.endsAt && new Date(e.endsAt) < now);
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex gap-2 text-sm font-bold text-gray-600"
      >
        <ArrowLeft className="w-4 h-4" />
        Keşfet'e dön
      </button>
      <article className="mt-5 overflow-hidden bg-white border border-gray-200 rounded-3xl">
        <EventCover
          src={e.detailImageUrl || e.imageUrl}
          category={e.category}
          title={e.title}
          coverKind={e.coverKind}
        />
        <div className="p-6 sm:p-8 space-y-5">
          {ended && (
            <p className="rounded-xl bg-amber-50 text-amber-800 font-bold p-3">
              Etkinlik sona erdi
            </p>
          )}
          <span className="text-sm font-bold text-blue-700">
            {DISCOVER_CATEGORIES[e.category]}
          </span>
          <h1 className="text-3xl font-black text-gray-900">{e.title}</h1>
          <p className="text-lg text-gray-600">{e.shortDescription}</p>
          {(e.verificationStatus === "verified" || e.lastVerifiedAt) && (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 font-semibold p-3">
              <ShieldCheck className="w-5 h-5" />
              {e.verificationStatus === "verified" &&
              e.sourceKind === "official"
                ? "Resmî kaynaktan doğrulandı"
                : `Son kontrol: ${new Date(e.lastVerifiedAt!).toLocaleDateString("tr-TR")}`}
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p className="flex gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              {formatDiscoverDate(e)}
              {e.endsAt && e.timePrecision === "exact"
                ? ` – ${dateText(e.endsAt)}`
                : !e.endsAt && e.timePrecision === "exact"
                  ? " · Bitiş saati bilinmiyor"
                  : ""}
            </p>
            <p className="flex gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              {e.venueName}, {e.district}/{e.city}
              <br />
              {e.address}
            </p>
          </div>
          {occurrences.length > 1 && (
            <div className="rounded-2xl border border-gray-200 p-4">
              <h2 className="font-black text-gray-900">Etkinlik tarihleri</h2>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {occurrences.map((occurrence) => (
                  <li key={occurrence.id} className="flex items-center justify-between gap-3">
                    <span>{formatDiscoverDate(occurrence)}</span>
                    {occurrence.status !== "scheduled" && (
                      <span className="text-xs font-bold text-amber-700">
                        {occurrence.status === "cancelled"
                          ? "İptal edildi"
                          : occurrence.status === "postponed"
                            ? "Ertelendi"
                            : "Arşivlendi"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="prose max-w-none whitespace-pre-wrap">
            {e.description}
          </div>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-bold">Fiyat</dt>
              <dd>
                {e.isFree
                  ? "Ücretsiz"
                  : `Normal: ${e.regularPrice ?? "—"} TL · Öğrenci: ${e.studentPrice ?? "—"} TL`}
              </dd>
            </div>
            <div>
              <dt className="font-bold">Katılım</dt>
              <dd>{e.eventMode === "online" ? "Çevrimiçi" : e.eventMode === "hybrid" ? "Hibrit" : "Fiziksel"}</dd>
            </div>
            <div>
              <dt className="font-bold">Organizatör</dt>
              <dd>{e.organizer}</dd>
            </div>
            {e.discountTerms && (
              <div>
                <dt className="font-bold">İndirim koşulu</dt>
                <dd>{e.discountTerms}</dd>
              </div>
            )}
            {e.ageLimit && (
              <div>
                <dt className="font-bold">Yaş sınırı</dt>
                <dd>{e.ageLimit}</dd>
              </div>
            )}
            <div>
              <dt className="font-bold">Kayıt</dt>
              <dd>
                {e.registrationRequired
                  ? "Kayıt gerekiyor"
                  : "Kayıt bilgisi belirtilmedi"}
              </dd>
            </div>
            {e.applicationDeadline && (
              <div>
                <dt className="font-bold">Son kayıt</dt>
                <dd>{dateText(e.applicationDeadline)}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            <a
              href={e.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
            >
              Resmî kaynak
            </a>
            {e.ticketUrl && (
              <a
                href={e.ticketUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl border font-bold"
              >
                Bilet / başvuru
              </a>
            )}
            {e.directionsUrl && (
              <a
                href={e.directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl border font-bold"
              >
                Yol tarifi
              </a>
            )}
          </div>
        </div>
      </article>
    </main>
  );
};
