import { visitorCountryResponse } from '../../src/lib/visitor-context.mjs';

export const onRequestGet: PagesFunction = async ({ request }) =>
  visitorCountryResponse(request.cf);
