const trDay = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

const istanbulMidnight = (day) => new Date(`${day}T00:00:00+03:00`);

const addCalendarDays = (day, amount) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + amount))
    .toISOString()
    .slice(0, 10);
};

const monthBoundary = (day, offset) => {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1))
    .toISOString()
    .slice(0, 10);
};

export function isDiscoverEventVisible(event, now = new Date()) {
  return (
    event?.status === "published" &&
    Boolean(event?.endsAt) &&
    new Date(event.endsAt) >= now
  );
}

export function matchesDiscoverDateFilter(event, filter, now = new Date()) {
  if (!filter) return true;
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return false;
  const today = trDay(now);
  const end = event.endsAt ? new Date(event.endsAt) : start;
  if (Number.isNaN(end.getTime())) return false;
  let rangeStart;
  let rangeEnd;
  if (filter === "today") {
    rangeStart = istanbulMidnight(today);
    rangeEnd = istanbulMidnight(addCalendarDays(today, 1));
  } else if (filter === "week") {
    rangeStart = istanbulMidnight(today);
    rangeEnd = istanbulMidnight(addCalendarDays(today, 8));
  } else if (filter === "month") {
    rangeStart = istanbulMidnight(monthBoundary(today, 0));
    rangeEnd = istanbulMidnight(monthBoundary(today, 1));
  } else {
    return true;
  }
  return start < rangeEnd && end >= rangeStart;
}

export function formatDiscoverDate(event) {
  const precision = event?.timePrecision || "exact";
  const startsAt = new Date(event?.startsAt);
  if (Number.isNaN(startsAt.getTime())) return "Tarih bilinmiyor";
  const includeTime = precision === "exact";
  const text = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
    timeZone: "Europe/Istanbul",
  }).format(startsAt);
  if (precision === "ongoing") return `${text} · Devam ediyor`;
  if (precision === "recurring") return `${text} · Tekrarlanan etkinlik`;
  return text;
}

export function slugifyDiscoverEvent(value = "") {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const safeHttps = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(
        url.hostname,
      )
    );
  } catch {
    return false;
  }
};

export function validateDiscoverDraft(draft = {}) {
  const errors = {};
  if (!String(draft.title || "").trim()) errors.title = "Başlık zorunludur.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(draft.slug || "")))
    errors.slug = "Slug küçük harf, sayı ve tire içermelidir.";
  if (!String(draft.category || "").trim())
    errors.category = "Kategori zorunludur.";
  if (!draft.startsAt) errors.startsAt = "Başlangıç tarihi zorunludur.";
  if (!draft.endsAt) errors.endsAt = "Bitiş tarihi zorunludur.";
  if (!safeHttps(draft.sourceUrl))
    errors.sourceUrl = "Güvenli bir HTTPS resmî kaynak girin.";
  for (const key of ["imageUrl", "ticketUrl", "directionsUrl"])
    if (!safeHttps(draft[key])) errors[key] = "Güvenli bir HTTPS adresi girin.";
  if (
    draft.startsAt &&
    draft.endsAt &&
    new Date(draft.endsAt) < new Date(draft.startsAt)
  )
    errors.endsAt = "Bitiş başlangıçtan önce olamaz.";
  return errors;
}

const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export function calculateStudentFitScore(event = {}, context = {}) {
  const now = context.now || new Date();
  const entries = [];
  if (
    event.isFree ||
    event.regularPrice != null ||
    event.studentPrice != null
  ) {
    const regular = Number(event.regularPrice || 0);
    const student = Number(event.studentPrice || 0);
    const saving = event.isFree
      ? 100
      : regular > 0
        ? ((regular - student) / regular) * 100
        : student <= 100
          ? 75
          : 20;
    entries.push(["price", clamp(saving), 25]);
  }
  if (
    Array.isArray(event.targetAudiences) ||
    Array.isArray(event.interestTags)
  ) {
    const audiences = event.targetAudiences || [];
    const studentAudience =
      audiences.includes("student") || audiences.includes("university");
    const interests = context.interests || [];
    const overlap = interests.length
      ? (event.interestTags || []).filter((x) => interests.includes(x)).length /
        interests.length
      : 0;
    entries.push([
      "interest",
      clamp((studentAudience ? 75 : 30) + overlap * 25),
      25,
    ]);
  }
  if (event.sourceTrustScore != null) {
    const ageHours = event.lastVerifiedAt
      ? Math.max(0, (now - new Date(event.lastVerifiedAt)) / 3600000)
      : 720;
    const freshness =
      ageHours <= 24 ? 100 : ageHours <= 168 ? 80 : ageHours <= 720 ? 55 : 25;
    entries.push([
      "trust",
      clamp(Number(event.sourceTrustScore) * 0.7 + freshness * 0.3),
      20,
    ]);
  }
  if (event.proximityScore != null)
    entries.push(["proximity", clamp(event.proximityScore), 15]);
  if (event.popularityScore != null)
    entries.push(["popularity", clamp(event.popularityScore), 10]);
  if (event.diversityScore != null)
    entries.push(["diversity", clamp(event.diversityScore), 5]);
  const weight = entries.reduce((sum, [, , w]) => sum + w, 0);
  const components = Object.fromEntries(
    entries.map(([key, score]) => [key, Math.round(score)]),
  );
  const total = weight
    ? Math.round(
        entries.reduce((sum, [, score, w]) => sum + score * w, 0) / weight,
      )
    : 0;
  return { total, components };
}

export function buildDiscoverCollections(events = [], context = {}) {
  const now = context instanceof Date ? context : context.now || new Date();
  const city = context instanceof Date ? "" : context.city || "";
  const careerTags = ["career", "technology", "networking", "entrepreneurship"];
  const cultureCategories = [
    "exhibition",
    "museum",
    "festival",
    "theatre",
    "concert",
    "workshop",
  ];
  const definitions = [
    ["this-week", "Bu Hafta", (e) => matchesDiscoverDateFilter(e, "week", now)],
    ["nearby", "Şehrindekiler", (e) => city && e.city === city],
    ["free", "Ücretsiz", (e) => e.isFree],
    [
      "career",
      "Kariyer",
      (e) =>
        e.category === "fair" ||
        e.category === "university" ||
        (e.interestTags || []).some((tag) => careerTags.includes(tag)),
    ],
    ["culture-art", "Kültür-Sanat", (e) => cultureCategories.includes(e.category)],
  ];
  const used = new Set();
  return definitions
    .map(([id, title, predicate]) => {
      const selected = events
        .filter((event) => !used.has(event.id) && predicate(event))
        .sort(
          (a, b) =>
            (b.studentFitScore || 0) - (a.studentFitScore || 0) ||
            new Date(a.startsAt) - new Date(b.startsAt),
        )
        .slice(0, 10);
      selected.forEach((event) => used.add(event.id));
      return { id, title, events: selected };
    })
    .filter((collection) => collection.events.length > 0);
}
