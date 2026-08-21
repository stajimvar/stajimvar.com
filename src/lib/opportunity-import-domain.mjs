const PRIVATE_HOST = /^(localhost|.+\.localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|\[::1\]|\[(fc|fd|fe80))/i;

export function isSafeImportUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !PRIVATE_HOST.test(url.hostname); } catch { return false; }
}
export function canonicalSourceUrl(value) {
  if (!isSafeImportUrl(value)) throw new Error('Güvenli HTTPS kaynak URL’si gerekli.');
  const url = new URL(value); url.hostname = url.hostname.toLowerCase(); url.hash = ''; for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key); url.pathname = url.pathname.replace(/\/+$/, '') || '/'; return url.toString().replace(/\/$/, '');
}
export function academicYearFor(date = new Date()) { const year = date.getUTCFullYear(); const start = date.getUTCMonth() >= 8 ? year : year - 1; return `${start}-${start + 1}`; }
export function nextRetryAt(now, failures) { return new Date(now.getTime() + Math.min(24 * 60, 15 * 2 ** Math.max(0, failures - 1)) * 60_000); }
