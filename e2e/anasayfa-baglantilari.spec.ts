import { expect, test, type Page } from '@playwright/test';

/*
  ANA SAYFA: FIRSAT ŞERİDİ, BÖLÜM BAĞLANTILARI, KART KONUMU (14 Ekim 2026)

  Supabase yanıtları sahte (route); üretim verisine istek gitmiyor. Telefon
  (375/390/430) ve masaüstü (1280) projelerinde: şerit yalnız dizine açık
  fırsatı gerçek bağlantıyla gösteriyor, bölüm bağlantıları sarıyor ve
  taşmıyor, şehir alanında yalnız ülke adı olan ilan "Türkiye" diyor.
*/

const company = { name: 'Insider One', slug: 'insider-one', logo_url: null, industry: 'Teknoloji', size: '', location: '', description: '', rating: 0 };
const ilan = {
  id: '5805e24e-1111-4222-8333-944444444444', company_id: '99999999-9999-4999-8999-999999999999', title: 'IT Support / IT Operations Intern', source_title: null,
  department: null, work_type: 'On-site', city: 'Turkey', il: null, ilce: null, uzaktan: null, country_code: 'TR', original_language: null, international_applicants: null,
  visa_sponsorship: null, mandatory_staj_accepted: false, voluntary_staj_accepted: true, is_paid: false, stipend_text: null, duration: null, term: 'All Year',
  application_deadline: null, min_grade_level: null, required_skills: [], preferred_skills: [], description: 'Test', responsibilities: [], perks: [],
  category: 'general', featured: false, status: 'published', applicants_count: 0, posted_at: '2026-10-05T10:00:00Z', last_seen_at: null,
  source_verified_at: null, source_status: null, created_at: '2026-10-05T10:00:00Z', updated_at: '2026-10-05T10:00:00Z', origin: 'scraped', source_id: null,
  source_url: 'https://example.com', canonical_url: 'https://example.com', apply_url: 'https://example.com', application_method: 'external',
  application_channel_id: null, insurance_note: null, alan_idleri: [], ilan_tipi: 'staj', companies: company,
};
const firsat = (slug: string, title: string, ek: Record<string, unknown> = {}) => ({
  id: `id-${slug}`, slug, title, organization_name: 'Kurum', organization_logo_url: null, opportunity_type: 'scholarship', short_description: 'Kısa',
  description: 'Ayrıntılı açıklama', eligibility: '', status: 'published', application_deadline: '2099-01-01', countries: [], ...ek,
});
const FIRSATLAR = [
  firsat('ince-burs', 'İnce Burs', { description: '', eligibility: '' }),
  firsat('gercek-burs', 'Gerçek Burs'),
];

async function hazirla(page: Page) {
  await page.addInitScript(() => localStorage.clear());
  await page.addLocatorHandler(page.getByRole('button', { name: 'Reddet', exact: true }), async (b) => b.click());
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url());
    if (/\/rpc\/get_published_listings_catalog_v\d$/.test(url.pathname)) {
      return route.fulfill({ json: { listings: [ilan], total: 1, companyTotal: 1, cityTotal: 0, verifiedTotal: 0, lastVerifiedAt: null, facets: { countries: [{ code: 'TR', count: 1 }] }, hasMore: false, nextCursor: null, snapshot: '2026-10-14T09:00:00Z' } });
    }
    if (url.pathname.endsWith('/rest/v1/opportunities')) return route.fulfill({ json: FIRSATLAR });
    if (url.pathname.endsWith('/api/visitor-context')) return route.fulfill({ json: { countryCode: 'TR' } });
    return route.fulfill({ json: [] });
  });
}

test('şerit yalnız dizine açık fırsat; bölüm bağlantıları; kartta ülke adı Türkçe', async ({ page }) => {
  await hazirla(page);
  await page.goto('/');

  const serit = page.locator('section[aria-labelledby="firsat-seridi"]');
  await expect(serit.getByRole('link', { name: /Gerçek Burs/ })).toHaveAttribute('href', '/firsatlar/gercek-burs');
  await expect(serit).not.toContainText('İnce Burs');
  await expect(serit.getByRole('link', { name: /Tümünü gör/ })).toHaveAttribute('href', '/firsatlar');

  const nav = page.locator('nav[aria-labelledby="bolum-baglantilari"]');
  await nav.scrollIntoViewIfNeeded();
  await expect(nav.getByRole('heading', { name: 'Bölüme göre staj' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Yazılım Mühendisliği' })).toHaveAttribute('href', '/bolum/yazilim-muhendisligi');
  await expect(nav.getByRole('link', { name: 'Makine Mühendisliği' })).toHaveAttribute('href', '/bolum/makine-muhendisligi');
  await expect(nav.getByRole('link', { name: 'Tüm bölümler →' })).toHaveAttribute('href', '/bolumler');
  await expect(nav.getByRole('link')).toHaveCount(11);
  for (const kutu of await nav.getByRole('link').all()) {
    const b = (await kutu.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(24);
  }
  const navKutu = (await nav.boundingBox())!;
  expect(navKutu.x + navKutu.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  const kart = page.locator('#internship-card-5805e24e-1111-4222-8333-944444444444');
  await expect(kart).toContainText('Türkiye');
  await expect(kart).not.toContainText('Turkey');
});
