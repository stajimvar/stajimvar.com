const trDay = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));

export function isDiscoverEventVisible(event, now = new Date()) {
  return event?.status === 'published' && Boolean(event?.endsAt) && new Date(event.endsAt) >= now;
}

export function matchesDiscoverDateFilter(event, filter, now = new Date()) {
  if (!filter) return true;
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return false;
  const today = trDay(now);
  const target = trDay(start);
  if (filter === 'today') return target === today;
  const diff = Math.floor((new Date(`${target}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000);
  if (filter === 'week') return diff >= 0 && diff <= 7;
  if (filter === 'month') return target.slice(0, 7) === today.slice(0, 7);
  return true;
}

export function slugifyDiscoverEvent(value = '') {
  return value.toLocaleLowerCase('tr-TR').replaceAll('ı', 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const safeHttps = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname);
  } catch { return false; }
};

export function validateDiscoverDraft(draft = {}) {
  const errors = {};
  if (!String(draft.title || '').trim()) errors.title = 'Başlık zorunludur.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(draft.slug || ''))) errors.slug = 'Slug küçük harf, sayı ve tire içermelidir.';
  if (!String(draft.category || '').trim()) errors.category = 'Kategori zorunludur.';
  if (!draft.startsAt) errors.startsAt = 'Başlangıç tarihi zorunludur.';
  if (!draft.endsAt) errors.endsAt = 'Bitiş tarihi zorunludur.';
  if (!safeHttps(draft.sourceUrl)) errors.sourceUrl = 'Güvenli bir HTTPS resmî kaynak girin.';
  for (const key of ['imageUrl', 'ticketUrl', 'directionsUrl']) if (!safeHttps(draft[key])) errors[key] = 'Güvenli bir HTTPS adresi girin.';
  if (draft.startsAt && draft.endsAt && new Date(draft.endsAt) < new Date(draft.startsAt)) errors.endsAt = 'Bitiş başlangıçtan önce olamaz.';
  return errors;
}

const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export function calculateStudentFitScore(event = {}, context = {}) {
  const now = context.now || new Date();
  const entries = [];
  if (event.isFree || event.regularPrice != null || event.studentPrice != null) {
    const regular = Number(event.regularPrice || 0);
    const student = Number(event.studentPrice || 0);
    const saving = event.isFree ? 100 : regular > 0 ? ((regular - student) / regular) * 100 : student <= 100 ? 75 : 20;
    entries.push(['price', clamp(saving), 25]);
  }
  if (Array.isArray(event.targetAudiences) || Array.isArray(event.interestTags)) {
    const audiences = event.targetAudiences || [];
    const studentAudience = audiences.includes('student') || audiences.includes('university');
    const interests = context.interests || [];
    const overlap = interests.length ? (event.interestTags || []).filter((x) => interests.includes(x)).length / interests.length : 0;
    entries.push(['interest', clamp((studentAudience ? 75 : 30) + overlap * 25), 25]);
  }
  if (event.sourceTrustScore != null) {
    const ageHours = event.lastVerifiedAt ? Math.max(0, (now - new Date(event.lastVerifiedAt)) / 3600000) : 720;
    const freshness = ageHours <= 24 ? 100 : ageHours <= 168 ? 80 : ageHours <= 720 ? 55 : 25;
    entries.push(['trust', clamp(Number(event.sourceTrustScore) * .7 + freshness * .3), 20]);
  }
  if (event.proximityScore != null) entries.push(['proximity', clamp(event.proximityScore), 15]);
  if (event.popularityScore != null) entries.push(['popularity', clamp(event.popularityScore), 10]);
  if (event.diversityScore != null) entries.push(['diversity', clamp(event.diversityScore), 5]);
  const weight = entries.reduce((sum, [, , w]) => sum + w, 0);
  const components = Object.fromEntries(entries.map(([key, score]) => [key, Math.round(score)]));
  const total = weight ? Math.round(entries.reduce((sum, [, score, w]) => sum + score * w, 0) / weight) : 0;
  return { total, components };
}

export function buildDiscoverCollections(events = [], now = new Date()) {
  const sorted = (predicate) => events.filter(predicate).sort((a, b) => (b.studentFitScore || 0) - (a.studentFitScore || 0)).slice(0, 10);
  const today = trDay(now);
  const day = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', weekday: 'short' }).format(now) === 'Sun' ? 0 : new Date(`${today}T12:00:00Z`).getUTCDay());
  const untilWeekend = day === 0 ? 0 : day === 6 ? 0 : 6 - day;
  const weekendStart = new Date(now.getTime() + untilWeekend * 86400000);
  const weekendEnd = new Date(weekendStart.getTime() + (day === 6 ? 2 : 1) * 86400000);
  const definitions = [
    ['tonight', 'Bu akşam ne yapsam?', (e) => trDay(e.startsAt) === today && new Date(e.startsAt).getHours() >= 17],
    ['free-weekend', 'Hafta sonu 0 TL planları', (e) => e.isFree && new Date(e.startsAt) >= weekendStart && new Date(e.startsAt) <= weekendEnd],
    ['student-discount', 'Öğrenci indirimli', (e) => e.hasStudentDiscount],
    ['under-100', "100 TL'nin altında", (e) => e.isFree || (e.studentPrice != null && Number(e.studentPrice) <= 100)],
    ['closing', 'Kayıtları kapanıyor', (e) => e.applicationDeadline && new Date(e.applicationDeadline) >= now && new Date(e.applicationDeadline) <= new Date(now.getTime() + 7 * 86400000)],
    ['career', 'Kariyerine katkı sağlayacaklar', (e) => (e.interestTags || []).some((x) => ['career','technology','networking','entrepreneurship'].includes(x))],
    ['try-new', 'Yeni bir şey dene', (e) => Number(e.diversityScore || 0) >= 70],
    ['editors-picks', "StajımVar'ın seçtikleri", (e) => Number(e.studentFitScore || 0) >= 80 && e.verificationStatus === 'verified'],
  ];
  return definitions.map(([id, title, predicate]) => ({ id, title, events: sorted(predicate) })).filter((x) => x.events.length > 0);
}
