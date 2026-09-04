import { expect, test, type Page } from '@playwright/test';

// Controlled transport fixtures only: these never enter production data or UI fallbacks.
const records = Array.from({ length: 137 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  slug: `catalog-test-${index + 1}`,
  title: `Katalog test etkinliği ${index + 1}`,
  short_description: 'Yalnızca otomatik test kaydı', description: 'Yalnızca otomatik test kaydı',
  category: index % 2 === 0 ? 'concert' : 'exhibition',
  city: index < 100 ? 'Konya' : 'Ankara', district: '', venue_name: 'Test mekânı', address: '',
  starts_at: '2027-09-10T15:00:00Z', ends_at: '2027-09-10T17:00:00Z',
  time_precision: 'exact', status: 'published', occurrence_status: 'scheduled',
  created_at: new Date(Date.UTC(2026, 8, 4, 12, 0, -index)).toISOString(),
  updated_at: '2026-09-04T12:00:00Z', is_free: index % 3 === 0,
  has_student_discount: index % 4 === 0, organizer: 'Test düzenleyicisi',
  source_url: 'https://example.invalid/official-test', source_kind: 'official',
  registration_required: false, target_audiences: [], interest_tags: [],
  verification_status: 'verified', cover_kind: 'category', event_mode: 'physical',
  review_required: false, student_fit_score: 0,
}));

type Controls = { failFirst?: boolean; failMore?: boolean; extra?: boolean; delayedQuery?: string; delayedMore?: boolean };
async function catalogTransport(page: Page, controls: Controls = {}) {
  await page.addLocatorHandler(page.getByRole('button', { name: 'Reddet', exact: true }), async (button) => {
    await button.click();
  });
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/rpc/get_discover_catalog')) {
      const args = route.request().postDataJSON();
      if (controls.failFirst && !args.p_cursor_id) {
        await route.fulfill({ status: 503, json: { message: 'Test network failure' } });
        return;
      }
      if (controls.failMore && args.p_cursor_id) {
        await route.fulfill({ status: 503, json: { message: 'Test next page failure' } });
        return;
      }
      let matching = controls.extra ? [{ ...records[0], id: 'new-arrival', slug: 'new-arrival', title: 'Yeni gelen test etkinliği', created_at: '2026-09-05T12:00:00Z' }, ...records] : records;
      if (args.p_query) matching = matching.filter((row) => row.title.toLocaleLowerCase('tr').includes(args.p_query.toLocaleLowerCase('tr')));
      if (args.p_city) matching = matching.filter((row) => row.city === args.p_city);
      if (args.p_category) matching = matching.filter((row) => row.category === args.p_category);
      if (args.p_free) matching = matching.filter((row) => row.is_free);
      if (args.p_discount) matching = matching.filter((row) => row.has_student_discount);
      if (args.p_period === 'today') matching = [];
      if (args.p_sort === 'upcoming') matching = [...matching].reverse();
      const offset = args.p_cursor_id ? matching.findIndex((row) => row.id === args.p_cursor_id) + 1 : 0;
      const events = matching.slice(offset, offset + 24);
      const hasMore = offset + events.length < matching.length;
      const last = events.at(-1);
      if (controls.delayedQuery === args.p_query) await new Promise((resolve) => setTimeout(resolve, 800));
      if (controls.delayedMore && args.p_cursor_id) await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({ json: {
        events, total: matching.length, hasMore,
        nextCursor: hasMore && last ? { value: last.created_at, id: last.id } : null,
        snapshot: args.p_snapshot || '2026-09-04T15:00:00Z',
        facets: { cities: ['Ankara', 'Konya'], categories: { concert: 69, exhibition: 68 }, free: 46, discount: 35 },
      } });
      return;
    }
    if (url.pathname.endsWith('/rpc/list_active_discover_events')) {
      await route.fulfill({ json: records });
      return;
    }
    if (url.pathname.endsWith('/rpc/get_discover_event_by_slug')) {
      const args = route.request().postDataJSON();
      await route.fulfill({ json: records.filter((row) => row.slug === args.p_slug) });
      return;
    }
    // No test contacts production, analytics, auth, or an external asset host.
    await route.fulfill({ json: [] });
  });
}

const cards = (page: Page) => page.locator('main article');
const count = (page: Page) => page.getByTestId('catalog-count');
async function openFilters(page: Page) {
  const toggle = page.getByRole('button', { name: /^Filtreler/ });
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
}

test('all 137 events are reachable once through bounded pages, including beyond the former cap', async ({ page }) => {
  await catalogTransport(page);
  await page.goto('/kesfet');
  await expect(count(page)).toHaveText('137 etkinlik · 24 gösteriliyor');
  await expect(cards(page)).toHaveCount(24);
  for (const shown of [48, 72, 96, 120, 137]) {
    await page.getByRole('button', { name: 'Daha fazla göster', exact: true }).click();
    await expect(cards(page)).toHaveCount(shown);
  }
  await expect(page.getByRole('link', { name: 'Katalog test etkinliği 137', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Daha fazla göster', exact: true })).toBeHidden();
  await expect(count(page)).toHaveText('137 etkinlik · 137 gösteriliyor');
});

test('next page retry retains existing results and appends the requested page', async ({ page }) => {
  const controls = { failMore: true };
  await catalogTransport(page, controls);
  await page.goto('/kesfet');
  await expect(cards(page)).toHaveCount(24);
  await page.getByRole('button', { name: 'Daha fazla göster', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sonraki etkinlikler yüklenemedi');
  await expect(cards(page)).toHaveCount(24);
  controls.failMore = false;
  await page.getByRole('button', { name: 'Yeniden yükle' }).click();
  await expect(cards(page)).toHaveCount(48);
});

test('city filtering searches the complete dataset and resets pagination', async ({ page }) => {
  await catalogTransport(page);
  await page.goto('/kesfet');
  await expect(cards(page)).toHaveCount(24);
  await page.getByRole('button', { name: 'Daha fazla göster', exact: true }).click();
  await expect(cards(page)).toHaveCount(48);
  await openFilters(page);
  await page.getByRole('combobox', { name: 'Şehir', exact: true }).selectOption('Ankara');
  await expect(count(page)).toHaveText('37 etkinlik · 24 gösteriliyor');
  await expect(cards(page)).toHaveCount(24);
  await expect(cards(page).first()).toContainText('Katalog test etkinliği 101');
  await expect(cards(page).filter({ hasText: 'Konya' })).toHaveCount(0);
});

test('sort, empty state, reset and initial-error retry use current server results', async ({ page }) => {
  const controls = { failFirst: true };
  await catalogTransport(page, controls);
  await page.goto('/kesfet');
  await expect(page.getByRole('alert')).toContainText('Etkinlikler yüklenemedi');
  controls.failFirst = false;
  await page.getByRole('button', { name: 'Tekrar dene', exact: true }).click();
  await expect(cards(page)).toHaveCount(24);
  await page.getByRole('combobox', { name: 'Sıralama' }).selectOption('upcoming');
  await expect(cards(page).first()).toContainText('Katalog test etkinliği 137');
  await openFilters(page);
  await page.getByRole('radio', { name: 'Bugün', exact: true }).check();
  await expect(count(page)).toHaveText('0 etkinlik · 0 gösteriliyor');
  await expect(page.getByRole('heading', { name: 'Bu filtrelere uygun etkinlik bulunamadı' })).toBeVisible();
  await page.getByRole('button', { name: 'Filtreleri temizle', exact: true }).click();
  await expect(cards(page)).toHaveCount(24);
});

test('browser back restores filters, loaded pages and scroll; refresh sees a new arrival', async ({ page }) => {
  const controls = { extra: false };
  await catalogTransport(page, controls);
  await page.goto('/kesfet');
  await expect(cards(page)).toHaveCount(24);
  await openFilters(page);
  await page.getByRole('combobox', { name: 'Şehir', exact: true }).selectOption('Ankara');
  await expect(count(page)).toHaveText('37 etkinlik · 24 gösteriliyor');
  await page.getByRole('button', { name: 'Daha fazla göster', exact: true }).click();
  await expect(cards(page)).toHaveCount(37);
  const target = page.getByRole('link', { name: 'Katalog test etkinliği 125', exact: true });
  await target.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await target.click();
  await expect(page).toHaveURL(/\/kesfet\/catalog-test-125$/);
  await page.goBack();
  await expect(cards(page)).toHaveCount(37);
  await expect(page.getByRole('combobox', { name: 'Şehir', exact: true })).toHaveValue('Ankara');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBefore, -1);
  await target.click();
  await page.getByRole('button', { name: "Keşfet'e dön", exact: true }).click();
  await expect(cards(page)).toHaveCount(37);
  await expect(page.getByRole('combobox', { name: 'Şehir', exact: true })).toHaveValue('Ankara');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBefore, -1);
  controls.extra = true;
  await page.getByRole('button', { name: 'Filtreleri temizle', exact: true }).click();
  await page.getByRole('button', { name: 'Listeyi yenile' }).click();
  await expect(count(page)).toHaveText('138 etkinlik · 24 gösteriliyor');
  await expect(cards(page).first()).toContainText('Yeni gelen test etkinliği');
});

test('mobile filters stay accessible and compact catalog never overflows horizontally', async ({ page }, testInfo) => {
  await catalogTransport(page);
  await page.goto('/kesfet');
  await expect(cards(page)).toHaveCount(24);
  if (testInfo.project.name.startsWith('mobile-')) {
    const toggle = page.getByRole('button', { name: 'Filtreler', exact: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#kesfet-filters')).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('combobox', { name: 'Şehir', exact: true })).toBeVisible();
    await toggle.click();
    const first = await cards(page).first().boundingBox();
    expect(first!.height).toBeLessThan(260);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('kesfet-catalog.png'), fullPage: false });
});

test('late search response cannot overwrite the latest query', async ({ page }) => {
  await catalogTransport(page, { delayedQuery: 'etkinliği 1' });
  await page.goto('/kesfet');
  await expect(cards(page)).toHaveCount(24);
  const search = page.getByRole('searchbox').filter({ visible: true }).first();
  await search.fill('etkinliği 1');
  await expect(cards(page)).toHaveCount(0, { timeout: 150 });
  await page.waitForRequest((request) => request.url().endsWith('/rpc/get_discover_catalog') && request.postDataJSON().p_query === 'etkinliği 1');
  await search.fill('etkinliği 137');
  await expect(count(page)).toHaveText('1 etkinlik · 1 gösteriliyor');
  await page.waitForTimeout(950);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText('Katalog test etkinliği 137');
});

test('late next-page response cannot append old-city results after changing filters', async ({ page }) => {
  await catalogTransport(page, { delayedMore: true });
  await page.goto('/kesfet');
  await expect(cards(page)).toHaveCount(24);
  await Promise.all([
    page.waitForRequest((request) => request.url().endsWith('/rpc/get_discover_catalog') && Boolean(request.postDataJSON().p_cursor_id)),
    page.getByRole('button', { name: 'Daha fazla göster', exact: true }).click(),
  ]);
  await openFilters(page);
  await page.getByRole('combobox', { name: 'Şehir', exact: true }).selectOption('Ankara');
  await expect(count(page)).toHaveText('37 etkinlik · 24 gösteriliyor');
  await page.waitForTimeout(950);
  await expect(cards(page)).toHaveCount(24);
  await expect(cards(page).filter({ hasText: 'Konya' })).toHaveCount(0);
  await expect(cards(page).first()).toContainText('Katalog test etkinliği 101');
});
