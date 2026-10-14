import { expect, test, type Page } from '@playwright/test';

/*
  /staj-ilanlari/istanbul — TELEFON VE MASAÜSTÜ (14 Ekim 2026)

  Supabase yanıtları sahte (route); üretim verisine istek gitmiyor.
  65 İstanbul + Ankara + süresi geçmiş + taslak ilan: yalnız 65 İstanbul
  ilanı, 30'arlı 3 sayfa. Logo 80×80, sayfalama hedefleri ≥44 px, yatay
  taşma yok, konsol hatası yok.
*/

const satir = (n: number, ek: Record<string, unknown> = {}) => ({
  id: `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`,
  title: `İstanbul Stajyeri ${n}`,
  city: 'Istanbul',
  il: 'İstanbul',
  ilce: null,
  country_code: 'TR',
  work_type: n % 3 === 0 ? 'Hybrid' : 'On-site',
  posted_at: `2026-10-${String(28 - (n % 27)).padStart(2, '0')}T${String(n % 24).padStart(2, '0')}:00:00Z`,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-10-10T10:00:00Z',
  application_deadline: null,
  status: 'published',
  companies: { name: `Şirket ${n}`, logo_url: null },
  ...ek,
});
const ILANLAR = [
  ...Array.from({ length: 65 }, (_, i) => satir(i + 1)),
  satir(900, { title: 'Ankara Stajyeri', city: 'Ankara', il: 'Ankara' }),
  satir(901, { title: 'Süresi Geçmiş Stajyer', application_deadline: '2020-01-01' }),
  satir(902, { title: 'Yalnız Ülke Stajyeri', city: 'Turkey', il: null }),
];

async function hazirla(page: Page) {
  const hatalar: string[] = [];
  page.on('console', (m) => {
    /* Kaynak hataları adresiyle birlikte aşağıda toplanıyor. */
    if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) hatalar.push(m.text());
  });
  page.on('response', (r) => {
    /*
      /api/olay bir Pages Function: Vite geliştirme sunucusunda yok, burada
      404 dönüyor (Cloudflare önizlemesinde 204). Yalnız o adres hariç;
      gerçek ortamdaki 4xx ve konsol denetimi önizlemede ayrıca yapılıyor.
    */
    const yol = new URL(r.url()).pathname;
    if (r.status() >= 400 && yol !== '/api/olay') hatalar.push(`${r.status()} ${yol}`);
  });
  await page.addInitScript(() => localStorage.clear());
  await page.addLocatorHandler(page.getByRole('button', { name: 'Reddet', exact: true }), async (b) => b.click());
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/rest/v1/listings')) return route.fulfill({ json: ILANLAR });
    return route.fulfill({ json: [] });
  });
  return hatalar;
}

const tasmiyor = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test('üç sayfa, yalnız İstanbul ilanları, sayfalama ve kart ölçüleri', async ({ page }) => {
  const hatalar = await hazirla(page);
  const sayilar: number[] = [];
  const gorulen = new Set<string>();
  for (const [yol, n] of [['/staj-ilanlari/istanbul', 1], ['/staj-ilanlari/istanbul/sayfa/2', 2], ['/staj-ilanlari/istanbul/sayfa/3', 3]] as const) {
    await page.goto(yol);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(n === 1 ? 'İstanbul Staj İlanları' : 'İstanbul staj ilanları');
    await expect(page.getByText(`İstanbul'daki 65 açık staj ilanı`)).toBeVisible();
    const kartlar = page.locator('main li').filter({ has: page.getByRole('link', { name: /ilanını incele$/ }) });
    await expect(kartlar.first()).toBeVisible();
    sayilar.push(await kartlar.count());
    for (const b of await kartlar.locator('a[href^="/ilan/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) gorulen.add(b);
    await expect(page.locator('main')).not.toContainText('Ankara Stajyeri');
    await expect(page.locator('main')).not.toContainText('Süresi Geçmiş Stajyer');
    await expect(page.locator('main')).not.toContainText('Yalnız Ülke Stajyeri');
    /* Logo 80×80; "İlanı incele" kartın içinde ve ≥44 px. */
    const ilk = kartlar.first();
    const logo = (await ilk.locator('div[title] > *').first().boundingBox())!;
    expect([Math.round(logo.width), Math.round(logo.height)]).toEqual([80, 80]);
    const kutu = (await ilk.boundingBox())!;
    const dugme = (await ilk.getByRole('link', { name: /ilanını incele$/ }).boundingBox())!;
    expect(dugme.x + dugme.width).toBeLessThanOrEqual(kutu.x + kutu.width + 0.5);
    expect(dugme.height).toBeGreaterThanOrEqual(44);
    /* Sayfalama: bulunulan sayfa işaretli, diğerleri gerçek bağlantı, ≥44 px; /sayfa/1 yok. */
    const nav = page.getByRole('navigation', { name: 'Sayfalar' });
    await expect(nav.locator('[aria-current="page"]')).toHaveText(String(n));
    for (const a of await nav.getByRole('link').all()) {
      expect(await a.getAttribute('href')).not.toMatch(/\/sayfa\/1$/);
      expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await tasmiyor(page);
  }
  expect(sayilar).toEqual([30, 30, 5]);
  expect(gorulen.size).toBe(65);
  expect(hatalar).toEqual([]);
});

test('aralık dışı sayfa: "Bu sayfa yok" ve ilk sayfaya yol', async ({ page }) => {
  await hazirla(page);
  await page.goto('/staj-ilanlari/istanbul/sayfa/9');
  await expect(page.getByText('Bu sayfa yok.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'İlk sayfaya dön' })).toHaveAttribute('href', '/staj-ilanlari/istanbul');
  await tasmiyor(page);
});
