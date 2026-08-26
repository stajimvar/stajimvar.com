import { expect, test, type Page, type TestInfo } from '@playwright/test';

const FIXTURE_PATH = '/account-sheet-test.html?source=e2e';

const isMobileProject = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile-');

async function openFixture(page: Page, path = FIXTURE_PATH) {
  await page.goto(path);
  await expect(page.locator('#user-profile-menu-btn')).toBeVisible();
}

async function openSheet(page: Page) {
  await page.locator('#user-profile-menu-btn').click();
  await expect(page.getByTestId('account-sheet-panel')).toBeVisible();
}

async function expectSheetContents(page: Page) {
  const sheet = page.getByTestId('account-sheet-panel');
  await expect(sheet.getByText('Geliştirme Test Öğrencisi', { exact: true })).toBeVisible();
  await expect(sheet.getByText('Öğrenci hesabı', { exact: true })).toBeVisible();
  await expect(sheet.getByTestId('account-sheet-profile')).toHaveText(/Profilim ve CV/);
  await expect(sheet.getByTestId('account-sheet-applications')).toHaveText(/Başvurularım/);
  await expect(sheet.getByTestId('account-sheet-badges')).toHaveText(/Rozetler ve testler/);
  await expect(sheet.getByTestId('account-sheet-admin')).toHaveText(/Yönetim paneli/);
  await expect(sheet.getByTestId('account-sheet-admin-badge')).toHaveText('Yönetici');
  await expect(sheet.getByTestId('account-sheet-logout')).toHaveText(/Çıkış yap/);

  const [applicationsRow, applicationsBadge] = await Promise.all([
    sheet.getByTestId('account-sheet-applications').boundingBox(),
    sheet.getByTestId('account-sheet-applications-badge').boundingBox(),
  ]);
  expect(applicationsRow).not.toBeNull();
  expect(applicationsBadge).not.toBeNull();
  expect(applicationsBadge!.x).toBeGreaterThan(applicationsRow!.x + applicationsRow!.width / 2);
  await expect(sheet.getByTestId('account-sheet-applications-badge')).toHaveText('3');
}

test('mobil hesap sayfası her istenen viewport ve kaydırma konumunda viewportu kaplar', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo), 'Yalnızca mobil projeler için geçerli.');
  await openFixture(page);

  const scrollPositions = await page.evaluate(() => ({
    top: 0,
    middle: Math.round((document.documentElement.scrollHeight - window.innerHeight) / 2),
    bottom: document.documentElement.scrollHeight - window.innerHeight,
  }));

  for (const [label, scrollY] of Object.entries(scrollPositions)) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollY, 1);

    await openSheet(page);
    await expectSheetContents(page);
    expect(
      await page.getByTestId('account-sheet-portal').evaluate((portal) => portal.parentElement === document.body)
    ).toBe(true);

    const [panel, viewport, coverage] = await Promise.all([
      page.getByTestId('account-sheet-panel').boundingBox(),
      page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
      page.evaluate(() => {
        const isPortalLayer = (element: Element | null) =>
          Boolean(element?.closest('[data-testid="account-sheet-portal"]'));
        return {
          headerCovered: isPortalLayer(document.elementFromPoint(window.innerWidth - 8, 8)),
          bottomNavigationCovered: isPortalLayer(
            document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 8)
          ),
        };
      }),
    ]);
    expect(panel).not.toBeNull();
    expect(panel!.x).toBeCloseTo(0, 1);
    expect(panel!.width).toBeCloseTo(viewport.width, 1);
    expect(panel!.y + panel!.height).toBeCloseTo(viewport.height, 1);
    expect(coverage.headerCovered).toBe(true);
    expect(coverage.bottomNavigationCovered).toBe(true);

    const scrollBeforeWheel = await page.evaluate(() => window.scrollY);
    if (testInfo.project.name.endsWith('-webkit')) {
      /* Mobile WebKit engine'i Playwright'ta gerçek mouse wheel API'si sunmuyor. */
      const wheelWasPrevented = await page.evaluate(() => {
        const backdrop = document.querySelector('[data-testid="account-sheet-backdrop"]');
        const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 720 });
        return backdrop?.dispatchEvent(wheel) === false;
      });
      expect(wheelWasPrevented).toBe(true);
    } else {
      await page.mouse.wheel(0, 720);
    }
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBeforeWheel, 1);

    await page.screenshot({ path: testInfo.outputPath(`account-sheet-${label}.png`) });
    await page.mouse.click(8, 8);
    await expect(page.getByTestId('account-sheet-panel')).toBeHidden();
    await expect(page.locator('#user-profile-menu-btn')).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBeforeWheel, 1);
  }
});

test('mobil sheet odağı hapseder, Escape ve dışarı tıklama ile kapanır, arka sayfaya tıklama geçmez', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo), 'Yalnızca mobil projeler için geçerli.');
  await openFixture(page);
  await openSheet(page);

  await expect(page.getByTestId('account-sheet-profile')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('account-sheet-logout')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('account-sheet-profile')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('account-sheet-panel')).toBeHidden();
  await expect(page.locator('#user-profile-menu-btn')).toBeFocused();

  await openSheet(page);
  const backgroundButton = page.getByTestId('fixture-background-button');
  const buttonBox = await backgroundButton.boundingBox();
  expect(buttonBox).not.toBeNull();
  await page.mouse.click(buttonBox!.x + 8, buttonBox!.y + 8);
  await expect(page.getByTestId('fixture-background-click-count')).toHaveText('0');
  await expect(page.getByTestId('account-sheet-panel')).toBeHidden();
});

test('mobil sheet geçmiş işaretçisini tek sefer kullanır ve tekrar aç/kapat döngüsünde ikinci geri tuşunu yutmaz', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo), 'Yalnızca mobil projeler için geçerli.');
  await openFixture(page);
  await page.evaluate(() => {
    window.history.pushState({ fixture: 'base' }, '', '/account-sheet-test.html?source=e2e&step=base');
  });
  const baseUrl = page.url();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await openSheet(page);
    expect(await page.evaluate(() => typeof window.history.state?.__stajimvarAccountSheet === 'string')).toBe(true);
    await page.goBack();
    await expect(page.getByTestId('account-sheet-panel')).toBeHidden();
    await expect(page).toHaveURL(baseUrl);
    expect(await page.evaluate(() => window.history.state?.__stajimvarAccountSheet)).toBeUndefined();
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/account-sheet-test\.html\?source=e2e$/);
});

test('mobil menü eylemi history girdisini temizleyip hedef eylemi çalıştırır', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo), 'Yalnızca mobil projeler için geçerli.');
  await openFixture(page);
  await openSheet(page);
  await page.getByTestId('account-sheet-profile').click();
  await expect(page.getByTestId('account-sheet-panel')).toBeHidden();
  await expect(page.getByTestId('fixture-active-tab')).toHaveText('profile');
});

test('masaüstü 320px profil popoverı korunur ve mobil sheet oluşturmaz', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), 'Yalnızca masaüstü projeler için geçerli.');
  await openFixture(page);
  await page.locator('#user-profile-menu-btn').click();
  const popover = page.getByTestId('desktop-profile-menu');
  await expect(popover).toBeVisible();
  const box = await popover.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeCloseTo(256, 2);
  await expect(page.getByTestId('account-sheet-panel')).toHaveCount(0);
  await popover.getByTestId('desktop-profile-menu-profile').click();
  await expect(page.getByTestId('fixture-active-tab')).toHaveText('profile');
});
