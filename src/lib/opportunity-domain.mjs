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
  const deadline = new Date(opportunity.applicationDeadline);
  return Number.isFinite(deadline.getTime()) && deadline.getTime() < now.getTime();
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
