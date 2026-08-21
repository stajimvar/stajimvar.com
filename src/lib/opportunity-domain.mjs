export const OPPORTUNITY_TYPES = ['scholarship', 'kyk', 'international', 'competition', 'education', 'student_support', 'youth_program'];

export function isSafeHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
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

export function getOpportunityOverview(items, now = new Date()) {
  const openItems = Array.isArray(items) ? items.filter((item) => item && !isExpiredOpportunity(item, now)) : [];
  const timedItems = openItems
    .filter((item) => deadlineSortValue(item.applicationDeadline) != null)
    .sort((left, right) => deadlineSortValue(left.applicationDeadline) - deadlineSortValue(right.applicationDeadline));
  const nearest = timedItems[0] ?? null;

  return {
    openCount: openItems.length,
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
