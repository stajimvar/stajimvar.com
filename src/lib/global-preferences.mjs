const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
const NON_COUNTRY_REGIONS = new Set(['EU', 'EZ', 'UN']);

export function normalizeCountryCode(value, { allowSpecial = false } = {}) {
  const raw = String(value ?? '').trim();
  const special = raw.toLocaleLowerCase('en-US');
  if (allowSpecial && (special === 'all' || special === 'remote')) return special;
  const code = raw.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || NON_COUNTRY_REGIONS.has(code)) return null;
  const name = regionNames.of(code);
  if (!name || name === code || name === 'Unknown Region') return null;
  return code;
}

export function normalizeLanguageCode(value) {
  const raw = String(value ?? '').trim().replace('_', '-');
  const code = raw.split('-')[0].toLocaleLowerCase('en-US');
  if (!/^[a-z]{2}$/.test(code)) return null;
  const name = languageNames.of(code);
  return !name || name === code ? null : code;
}

export function countryFromLocale(locale) {
  const match = String(locale ?? '').trim().replace('_', '-').match(/^[a-z]{2,3}-([a-z]{2})\b/i);
  return match ? normalizeCountryCode(match[1]) : null;
}

export function resolveListingCountry({
  urlCountry,
  browserCountry,
  accountCountries = [],
  locale,
  cloudflareCountry,
}) {
  return normalizeCountryCode(urlCountry, { allowSpecial: true })
    ?? normalizeCountryCode(browserCountry, { allowSpecial: true })
    ?? accountCountries.map((value) => normalizeCountryCode(value)).find(Boolean)
    ?? countryFromLocale(locale)
    ?? normalizeCountryCode(cloudflareCountry)
    ?? 'TR';
}

export function readCountryQuery(search) {
  return normalizeCountryCode(new URLSearchParams(search).get('country'), { allowSpecial: true });
}

export function writeCountryQuery(pathname, search, country) {
  const normalized = normalizeCountryCode(country, { allowSpecial: true });
  const params = new URLSearchParams(search);
  if (normalized) params.set('country', normalized);
  else params.delete('country');
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}
