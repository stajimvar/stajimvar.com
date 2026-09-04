import { normalizeCountryCode } from './global-preferences.mjs';

export function visitorCountryResponse(cf = {}) {
  return new Response(JSON.stringify({ countryCode: normalizeCountryCode(cf?.country) }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
