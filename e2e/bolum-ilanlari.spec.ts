import { expect, test, type Page } from '@playwright/test';

/*
  BÖLÜM SAYFASINDA GÜNCEL STAJ İLANLARI — TELEFON VE MASAÜSTÜ (14 Ekim 2026)

  Supabase yanıtları sahte (route): üretim verisine istek gitmiyor. Her
  projede (375/390/430 telefon, 1280 masaüstü) aynı sınamalar koşuyor:
  ilgili ilanlar görünüyor, ilgisiz ve kapanmış ilan yok, logo 80×80,
  sayfa yatay taşmıyor, uygun ilan yoksa /staj-ilanlari'ya yol var.
*/

const SEKTORLER = [
  { id: 'aaaaaaaa-0000-4000-8000-000000000001', slug: 'bilisim-yazilim', ad: 'Bilişim ve Yazılım' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', slug: 'ticaret-pazarlama-eticaret', ad: 'Ticaret, Pazarlama ve E-ticaret' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000003', slug: 'makine-imalat', ad: 'Makine ve İmalat' },
];
const satir = (id: string, title: string, alan: string, ek: Record<string, unknown> = {}) => ({
  id,
  title,
  city: 'İstanbul',
  country_code: 'TR',
  work_type: 'On-site',
  application_deadline: null,
  alan_idleri: [alan],
  companies: { name: `Şirket ${id.slice(0, 2)}`, logo_url: null },
  ...ek,
});
const ILANLAR = [
  satir('11111111-1111-4111-8111-111111111111', 'Yazılım Geliştirme Stajyeri', SEKTORLER[0].id),
  satir('22222222-2222-4222-8222-222222222222', 'Pazarlama Stajyeri', SEKTORLER[1].id),
  satir('33333333-3333-4333-8333-333333333333', 'Backend Developer Intern', SEKTORLER[0].id, { application_deadline: '2020-01-01' }),
  satir('44444444-4444-4444-8444-444444444444', 'Uzun Bir Başlık: Yapay Zekâ ve Veri Analizi Alanında Yazılım Geliştirme Stajyeri (Uzun Dönem)', SEKTORLER[0].id, { country_code: 'FR', city: 'Paris' }),
];

async function hazirla(page: Page) {
  await page.addInitScript(() => localStorage.clear());
  await page.addLocatorHandler(page.getByRole('button', { name: 'Reddet', exact: true }), async (b) => b.click());
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/rest/v1/listings')) return route.fulfill({ json: ILANLAR });
    if (url.pathname.endsWith('/rest/v1/sectors')) return route.fulfill({ json: SEKTORLER });
    return route.fulfill({ json: [] });
  });
}

const tasmiyor = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test('ilgili ilanlar kartlarıyla görünüyor; ilgisiz ve kapanmış ilan yok', async ({ page }) => {
  await hazirla(page);
  await page.goto('/bolum/yazilim-muhendisligi');
  const blok = page.locator('section[aria-labelledby="bolum-ilanlari-baslik"]');
  await expect(blok.getByRole('heading', { name: 'Bilişim ve Yazılım alanında açık staj ilanları' })).toBeVisible();
  const kartlar = blok.locator('li');
  await expect(kartlar).toHaveCount(2);
  /* Türkiye ilanı önce. */
  await expect(kartlar.nth(0)).toContainText('Yazılım Geliştirme Stajyeri');
  await expect(kartlar.nth(1)).toContainText('Yapay Zekâ ve Veri Analizi');
  await expect(blok).not.toContainText('Pazarlama Stajyeri');
  await expect(blok).not.toContainText('Backend Developer Intern');
  /* Taranabilir bağlantı ve tüm ilanlara yol. */
  await expect(kartlar.nth(0).getByRole('link', { name: 'Yazılım Geliştirme Stajyeri', exact: true })).toHaveAttribute(
    'href',
    /^\/ilan\/yazilim-gelistirme-stajyeri-11111111$/,
  );
  await expect(blok.getByRole('link', { name: 'Tüm staj ilanları →' })).toHaveAttribute('href', '/staj-ilanlari');

  /* Logo yeterince büyük ve kare; kart ve sayfa taşmıyor; düğme kartın içinde. */
  for (let i = 0; i < 2; i++) {
    const kart = kartlar.nth(i);
    await kart.scrollIntoViewIfNeeded();
    const logo = await kart.locator('div[title] > *').first().boundingBox();
    expect(Math.round(logo!.width)).toBe(80);
    expect(Math.round(logo!.height)).toBe(80);
    const kutu = (await kart.boundingBox())!;
    const dugme = (await kart.getByRole('link', { name: /ilanını incele$/ }).boundingBox())!;
    expect(dugme.x + dugme.width).toBeLessThanOrEqual(kutu.x + kutu.width + 0.5);
    expect(dugme.height).toBeGreaterThanOrEqual(44);
  }
  await tasmiyor(page);
  /* Rehber içeriği yerinde: blok sayfanın sonuna eklendi, içerik kalkmadı. */
  await expect(page.getByRole('heading', { level: 1, name: /Yazılım Mühendisliği stajı/ })).toBeVisible();
});

test('uygun ilan yoksa uydurma kart yok, /staj-ilanlari bağlantısı var', async ({ page }) => {
  await hazirla(page);
  await page.goto('/bolum/makine-muhendisligi');
  const blok = page.locator('section[aria-labelledby="bolum-ilanlari-baslik"]');
  await expect(blok.getByRole('heading', { name: 'Makine ve İmalat alanında açık staj ilanları' })).toBeVisible();
  await expect(blok.locator('li')).toHaveCount(0);
  await expect(blok).toContainText('Şu anda bu alanda açık staj ilanı yok.');
  await expect(blok.getByRole('link', { name: 'Tüm staj ilanlarına göz at →' })).toHaveAttribute('href', '/staj-ilanlari');
  await tasmiyor(page);
});

test('sağlık bölümünde ilan bloğu yok', async ({ page }) => {
  await hazirla(page);
  await page.goto('/bolum/hemsirelik');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="bolum-ilanlari-baslik"]')).toHaveCount(0);
});
