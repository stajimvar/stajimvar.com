import { expect, test, type Page } from '@playwright/test';

/*
  GECİKMELİ PARÇA YÜKLENEMEZSE SAYFA BOŞALMIYOR (17 Ekim 2026)

  16 Ekim'de canlıda: rehber parçası 404 dönünce `/rehber/burs-cakisma`
  tamamen boşalıyordu (#root 0 karakter, H1 yok). Parça hatası sınırı
  (src/lib/parca-hatasi.tsx) ve tek seferlik kurtarma (index.html) sonrası:
    - normal yükleme değişmedi (H1 ve metin görünür),
    - parça yüklenemezse #root boş değil (geliştirme sunucusunda ön render
      yok; sınırın "Sayfa yüklenemedi / Sayfayı yenile" yedeği görünüyor),
    - sayfa TAM OLARAK BİR KEZ (`?sv=`) yenileniyor, normal yüklemede hiç.
  Ön render kopyasının korunduğu derlenmiş durum (dist):
  e2e-dist/parca-hatasi.spec.ts (playwright.dist.config.ts, CI'da koşuyor).
*/

const PARCA = /\/src\/components\/GuidePages\.tsx/;

/*
  Yenileme = ana çerçevenin BELGE isteği (`request` + isNavigationRequest).
  `framenavigated` history API gezinmelerini de saydığı için kanıt olarak zayıf.
*/
async function ac(page: Page, yol: string) {
  const yenilemeler: string[] = [];
  page.on('request', (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) {
      const u = new URL(r.url());
      yenilemeler.push(u.pathname + u.search);
    }
  });
  await page.goto(yol, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  return yenilemeler;
}

test('normal yükleme: rehber sayfası H1 ve metniyle görünüyor, yenileme yok', async ({ page }) => {
  const yenilemeler = await ac(page, '/rehber/burs-cakisma');
  expect(yenilemeler).toEqual(['/rehber/burs-cakisma']);
  await expect(page.locator('h1').first()).toBeVisible();
  const metin = await page.locator('#root').innerText();
  expect(metin.length).toBeGreaterThan(500);
  await expect(page.getByText('Sayfa yüklenemedi.')).toHaveCount(0);
});

test('rehber parçası 404: sayfa boş kalmıyor, tam olarak bir ?sv= yenilemesi', async ({ page }) => {
  await page.route(PARCA, (r) => r.fulfill({ status: 404, contentType: 'text/html', body: 'yok' }));
  const hatalar: string[] = [];
  page.on('pageerror', (e) => hatalar.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  const yenilemeler = await ac(page, '/rehber/burs-cakisma');

  const root = page.locator('#root');
  expect((await root.innerHTML()).length).toBeGreaterThan(0);
  await expect(page.getByText('Sayfa yüklenemedi.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sayfayı yenile' })).toHaveAttribute('href', /^\/rehber\/burs-cakisma/);

  /* İlk yükleme + TAM OLARAK bir `?sv=` yenilemesi; ikincisi yok. */
  expect(yenilemeler).toHaveLength(2);
  expect(yenilemeler[0]).toBe('/rehber/burs-cakisma');
  expect(yenilemeler[1]).toMatch(/^\/rehber\/burs-cakisma\?sv=\d+$/);
  /* Hata gizlenmiyor: konsolda kayıt var. */
  expect(hatalar.some((h) => /parca-hatasi|dynamically imported module/i.test(h))).toBe(true);
});

test('ana sayfa etkilenmiyor (gecikmeli rehber parçası engelli olsa bile)', async ({ page }) => {
  await page.route(PARCA, (r) => r.fulfill({ status: 404, contentType: 'text/html', body: 'yok' }));
  const yenilemeler = await ac(page, '/');
  expect(yenilemeler).toEqual(['/']);
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.getByText('Sayfa yüklenemedi.')).toHaveCount(0);
});
