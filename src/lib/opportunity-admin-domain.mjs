const PRIVATE_HOST = /^(localhost|.+\.localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|\[::1\]|\[(fc|fd|fe80))/i;

export function isSafeAdminHttpsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && !url.username && !url.password && !PRIVATE_HOST.test(url.hostname);
  } catch { return false; }
}

export function normalizeStringList(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : []).map((value) => String(value).trim()).filter((value) => {
    const key = value.toLocaleLowerCase('tr-TR');
    if (!value || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function slugifyOpportunity(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110);
}

export function validateOpportunityAdminDraft(draft) {
  const errors = {};
  if (!String(draft.title || '').trim()) errors.title = 'Başlık zorunludur.';
  if (!String(draft.organizationName || '').trim()) errors.organizationName = 'Kurum adı zorunludur.';
  if (!String(draft.opportunityType || '').trim()) errors.opportunityType = 'Fırsat türü zorunludur.';
  if (String(draft.description || '').trim().length < 10) errors.description = 'Açıklama en az 10 karakter olmalıdır.';
  if (!isSafeAdminHttpsUrl(draft.sourceUrl)) errors.sourceUrl = 'Resmî kaynak güvenli bir HTTPS adresi olmalıdır.';
  if (draft.applicationUrl && !isSafeAdminHttpsUrl(draft.applicationUrl)) errors.applicationUrl = 'Başvuru bağlantısı güvenli bir HTTPS adresi olmalıdır.';
  if (draft.applicationStartAt && draft.applicationDeadline && new Date(draft.applicationStartAt) > new Date(draft.applicationDeadline)) errors.applicationStartAt = 'Başlangıç tarihi son tarihten sonra olamaz.';
  const gpa = draft.minimumGpa === '' || draft.minimumGpa == null ? null : Number(draft.minimumGpa);
  if (gpa != null && (!Number.isFinite(gpa) || gpa < 0 || gpa > 4)) errors.minimumGpa = 'GPA 0 ile 4 arasında olmalıdır.';
  return errors;
}
