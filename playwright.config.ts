import { defineConfig } from '@playwright/test';

const mobileViewports = [
  { name: '375x812', viewport: { width: 375, height: 812 } },
  { name: '390x844', viewport: { width: 390, height: 844 } },
  { name: '430x932', viewport: { width: 430, height: 932 } },
];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    ...mobileViewports.map(({ name, viewport }) => ({
      name: `mobile-${name}-chromium`,
      use: {
        browserName: 'chromium' as const,
        viewport,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    })),
    ...mobileViewports.map(({ name, viewport }) => ({
      name: `mobile-${name}-webkit`,
      use: {
        browserName: 'webkit' as const,
        viewport,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    })),
    {
      name: 'desktop-chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'desktop-webkit',
      use: { browserName: 'webkit', viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
