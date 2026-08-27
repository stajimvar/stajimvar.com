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
