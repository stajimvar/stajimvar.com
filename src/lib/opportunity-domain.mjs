import { yerelKonakMi } from './guvenli-url.mjs';

export const OPPORTUNITY_TYPES = ['scholarship', 'kyk', 'international', 'competition', 'education', 'student_support', 'youth_program'];

export function isSafeHttpsUrl(value) {
  try {
    const url = new URL(value);
    // Yerel ve özel ağ adresleri: bağlantı ziyaretçiye bir işe yaramaz,
    // sunucu tarafında çağrılırsa iç ağ taranabilir hale gelir.
    return url.protocol === 'https:' && !yerelKonakMi(url.hostname);
  } catch {
    return false;
  }
}

/*
  DIŞ BAĞLANTININ ETİKETİ GERÇEĞE UYSUN

  Kartlarda mavi "Başvur" düğmesi vardı ve adres olarak applicationUrl yoksa
  KURUMUN ANA SAYFASI kullanılıyordu. "Başvur" deyip ziyaretçiyi kurumun ana
  sayfasına bırakmak, olmayan bir başvuru sayfası vaat etmek demek.

  Kural: "Başvur" yalnızca doğrudan başvuru adresi VARSA ve dönem açıkken.
  Adres var ama dönem açık değilse sayfaya götürüyoruz, ama "başvur"
  demiyoruz. Yalnızca kaynak adresi varsa etiket "Resmî kaynak".
*/
export function opportunityCta(item, now = new Date()) {
  const basvuru = isSafeHttpsUrl(item?.applicationUrl || '') ? item.applicationUrl : null;
  const kaynak = isSafeHttpsUrl(item?.sourceUrl || '') ? item.sourceUrl : null;

  if (basvuru && opportunityStatus(item, now) === 'acik') {
    return { adres: basvuru, etiket: 'Başvur', birincil: true };
  }
  if (basvuru) {
    return { adres: basvuru, etiket: 'Resmî başvuru sayfası', birincil: false };
  }
  if (kaynak) {
    return { adres: kaynak, etiket: 'Resmî kaynak', birincil: false };
  }
  return null;
}

export function isExpiredOpportunity(opportunity, now = new Date()) {
  if (!opportunity.applicationDeadline) return false;
  if (isDateOnly(opportunity.applicationDeadline)) {
    const deadlineDay = calendarDay(opportunity.applicationDeadline);
    const currentDay = calendarDay(now);
    return deadlineDay != null && currentDay != null && deadlineDay < currentDay;
  }
  const deadline = new Date(opportunity.applicationDeadline);
  return Number.isFinite(deadline.getTime()) && deadline.getTime() < now.getTime();
}

/*
  DURUM MODELİ

  Kartlarda "Son başvuru: Dönemsel" gibi ifadeler vardı ve tarihi bilinmeyen
  her fırsat "açık" sayılıyordu: sayaçta "Başvurusu devam eden" yazan sayı,
  takvimi hiç açıklanmamış kurumları da içeriyordu. Öğrenci başvurabileceğini
  sanıp resmî sayfaya gidince kapalı buluyordu.

  Dört durum var ve "Açık" yalnızca DOĞRULANMIŞ aktif dönem bilgisi varken
  kullanılıyor: son başvuru tarihi biliniyor ve geçmemiş. Tarih yoksa ya da
  yalnızca geçmiş döneme ait bilgi varsa "Takvim bekleniyor" deniyor —
  bilmediğimizi söylemek, yanlış söylemekten iyi.
*/
export const OPPORTUNITY_STATUS_LABELS = {
  acik: 'Açık',
  yakinda: 'Yakında',
  takvim_bekleniyor: 'Takvim bekleniyor',
  kapali: 'Kapalı',
};

export function opportunityStatus(item, now = new Date()) {
  if (!item) return 'takvim_bekleniyor';

  if (item.applicationDeadline && isExpiredOpportunity(item, now)) return 'kapali';

  const baslangic = calendarDay(item.applicationStartAt);
  const bugun = calendarDay(now);
  if (baslangic != null && bugun != null && baslangic > bugun) return 'yakinda';

  if (item.applicationDeadline) return 'acik';

  return 'takvim_bekleniyor';
}

export function opportunityStatusLabel(item, now = new Date()) {
  return OPPORTUNITY_STATUS_LABELS[opportunityStatus(item, now)];
}

/* Kullanıcıya ham enum ("scholarship") gösterilmesin diye Türkçe karşılıklar. */
export const OPPORTUNITY_TYPE_LABELS = {
  scholarship: 'Burs',
  kyk: 'KYK',
  international: 'Yurtdışı',
  competition: 'Yarışma',
  education: 'Eğitim',
  student_support: 'Öğrenci desteği',
  youth_program: 'Gençlik programı',
};

export function opportunityTypeLabel(type) {
  return OPPORTUNITY_TYPE_LABELS[type] ?? 'Fırsat';
}

export function getOpportunityOverview(items, now = new Date()) {
  const openItems = Array.isArray(items) ? items.filter((item) => item && !isExpiredOpportunity(item, now)) : [];
  const timedItems = openItems
    .filter((item) => deadlineSortValue(item.applicationDeadline) != null)
    .sort((left, right) => deadlineSortValue(left.applicationDeadline) - deadlineSortValue(right.applicationDeadline));
  const nearest = timedItems[0] ?? null;

  return {
    /*
      "Başvurusu devam eden" sayacı yalnızca durumu Açık olanları sayıyor.
      Önce süresi dolmamış her kayıt sayılıyordu; takvimi açıklanmamış
      kurumlar da bu sayıya giriyor, sayaç olduğundan büyük görünüyordu.
    */
    openCount: openItems.filter((item) => opportunityStatus(item, now) === 'acik').length,
    scholarshipAndCreditCount: openItems.filter((item) => item.opportunityType === 'scholarship' || item.opportunityType === 'kyk').length,
    nearest,
    daysLeft: nearest ? daysUntilDeadline(nearest.applicationDeadline, now) : null,
  };
}

function isDateOnly(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function calendarDay(value) {
  if (isDateOnly(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const normalized = new Date(Date.UTC(year, month - 1, day));
    return normalized.getUTCFullYear() === year && normalized.getUTCMonth() === month - 1 && normalized.getUTCDate() === day ? normalized.getTime() : null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return Date.UTC(values.year, values.month - 1, values.day);
}

function deadlineSortValue(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (isDateOnly(value)) return calendarDay(value);
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

function daysUntilDeadline(value, now) {
  const deadlineDay = calendarDay(value);
  const currentDay = calendarDay(now);
  return deadlineDay == null || currentDay == null ? null : Math.max(0, Math.round((deadlineDay - currentDay) / 86400000));
}

export function readOpportunityFilters(search) {
  const params = new URLSearchParams(search);
  return {
    query: params.get('q') || '',
    type: OPPORTUNITY_TYPES.includes(params.get('type')) ? params.get('type') : '',
    level: params.get('level') || '',
    place: params.get('place') || '',
    openOnly: params.get('open') === '1',
  };
}

export function serializeOpportunityFilters(filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.type) params.set('type', filters.type);
  if (filters.level) params.set('level', filters.level);
  if (filters.place) params.set('place', filters.place);
  if (filters.openOnly) params.set('open', '1');
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function matchOpportunity(opportunity, profile) {
  const missingProfileFields = [];
  const requirements = [
    ['educationLevel', opportunity.educationLevels?.length, profile.educationLevel],
    ['department', opportunity.eligibleDepartments?.length, profile.department],
    ['gradeLevel', opportunity.eligibleClassYears?.length, profile.gradeLevel],
    ['city', opportunity.cities?.length, profile.city],
    ['gpa', opportunity.minimumGpa != null, profile.gpa],
    ['languages', opportunity.languageRequirements?.length, profile.languages?.length],
  ];
  for (const [field, needed, value] of requirements) if (needed && (value == null || value === '' || value === 0)) missingProfileFields.push(field);
  if (missingProfileFields.length) return { isScorable: false, score: null, missingProfileFields };

  const checks = [];
  if (opportunity.educationLevels?.length) checks.push(opportunity.educationLevels.includes(profile.educationLevel));
  if (opportunity.eligibleDepartments?.length) checks.push(opportunity.eligibleDepartments.some((d) => d.localeCompare(profile.department, 'tr', { sensitivity: 'base' }) === 0));
  if (opportunity.eligibleClassYears?.length) checks.push(opportunity.eligibleClassYears.includes(profile.gradeLevel));
  if (opportunity.cities?.length) checks.push(opportunity.cities.some((city) => city.localeCompare(profile.city, 'tr', { sensitivity: 'base' }) === 0));
  if (opportunity.minimumGpa != null) checks.push(Number(profile.gpa) >= Number(opportunity.minimumGpa));
  if (opportunity.languageRequirements?.length) checks.push(opportunity.languageRequirements.every((r) => profile.languages.some((l) => l.toLocaleLowerCase('tr-TR') === r.toLocaleLowerCase('tr-TR'))));
  return { isScorable: checks.length > 0, score: checks.length ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : null, missingProfileFields: [] };
}
