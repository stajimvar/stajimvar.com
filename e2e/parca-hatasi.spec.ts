import { expect, test, type Page } from '@playwright/test';

/*
  GECİKMELİ PARÇA YÜKLENEMEZSE SAYFA BOŞALMIYOR (17 Ekim 2026)

  16 Ekim'de canlıda: rehber parçası 404 dönünce `/rehber/burs-cakisma`
  tamamen boşalıyordu (#root 0 karakter, H1 yok). Parça hatası sınırı
  (src/lib/parca-hatasi.tsx) ve tek seferlik kurtarma (index.html) sonrası:
    - normal yükleme değişmedi (H1 ve metin görünür),
    - parça yüklenemezse #root boş değil (geliştirme sunucusunda ön render
      yok; sınırın "Sayfa yüklenemedi / Sayfayı yenile" yedeği görünüyor),
    - sayfa en fazla BİR KEZ yenileniyor.
  Ön render kopyasının gösterildiği derlenmiş durum (dist) ayrıca
  tarayıcıda doğrulandı; geliştirme sunucusu ön render taşımıyor.
*/

const PARCA = /\/src\/components\/GuidePages\.tsx/;

async function ac(page: Page, yol: string) {
  const yenilemeler: string[] = [];
  page.on('framenavigated', (cerceve) => {
    if (cerceve === page.mainFrame()) yenilemeler.push(cerceve.url());
  });
  await page.goto(yol, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  return yenilemeler;
}

test('normal yükleme: rehber sayfası H1 ve metniyle görünüyor', async ({ page }) => {
  await ac(page, '/rehber/burs-cakisma');
  await expect(page.locator('h1').first()).toBeVisible();
  const metin = await page.locator('#root').innerText();
  expect(metin.length).toBeGreaterThan(500);
  await expect(page.getByText('Sayfa yüklenemedi.')).toHaveCount(0);
});

test('rehber parçası 404: sayfa boş kalmıyor, en fazla bir yenileme', async ({ page }) => {
  await page.route(PARCA, (r) => r.fulfill({ status: 404, contentType: 'text/html', body: 'yok' }));
  const hatalar: string[] = [];
  page.on('pageerror', (e) => hatalar.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  const yenilemeler = await ac(page, '/rehber/burs-cakisma');

  const root = page.locator('#root');
  expect((await root.innerHTML()).length).toBeGreaterThan(0);
  await expect(page.getByText('Sayfa yüklenemedi.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sayfayı yenile' })).toHaveAttribute('href', /^\/rehber\/burs-cakisma/);

  /* İlk yükleme + en fazla bir `?sv=` yenilemesi; sonsuz döngü yok. */
  const svYenileme = yenilemeler.filter((u) => /[?&]sv=\d+/.test(u));
  expect(svYenileme.length).toBeLessThanOrEqual(1);
  expect(yenilemeler.length).toBeLessThanOrEqual(2);
  /* Hata gizlenmiyor: konsolda kayıt var. */
  expect(hatalar.some((h) => /parca-hatasi|dynamically imported module/i.test(h))).toBe(true);
});

test('ana sayfa etkilenmiyor (gecikmeli rehber parçası engelli olsa bile)', async ({ page }) => {
  await page.route(PARCA, (r) => r.fulfill({ status: 404, contentType: 'text/html', body: 'yok' }));
  await ac(page, '/');
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.getByText('Sayfa yüklenemedi.')).toHaveCount(0);
});
