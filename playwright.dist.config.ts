import { rmSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

/*
  DERLENMİŞ SİTE E2E (17 Ekim 2026)

  `playwright.config.ts` geliştirme sunucusunda (vite) koşuyor; orada ön
  render, hash'li parçalar ve Pages ara katmanı yok. Bu yapılandırma
  `npm run build` çıktısını (dist/) projenin kendi önizlemesiyle
  (`npm run preview` = wrangler pages dev: statik dosyalar + functions/
  ara katmanı + kenar önbelleği) sunuyor; üretime en yakın yerel ortam.

  Önce `npm run build` çalışmış olmalı. CI'da pr-dogrulama.yml derleme
  adımından sonra koşuyor.

  TEMİZ DURUM ŞART: wrangler kenar önbelleğini diske yazıyor. Önceki bir
  derlemenin HTML'i önbellekte kalırsa artık olmayan parça adlarını istiyor,
  React hiç açılmıyor ve ham ön render görünür kaldığı için parça testi
  YANLIŞLIKLA geçiyor (ölçüldü: düzeltmesiz derlemede uygulama içi gezinme
  testi bu yüzden geçti). Her koşu kendi, boş durum klasörüyle başlıyor ve
  açık bir sunucu yeniden kullanılmıyor.
*/
const DURUM = '.wrangler/e2e-dist';
/* Yapılandırma işçilerde de yükleniyor; silme yalnız ana süreçte, sunucu başlamadan. */
if (process.env.TEST_WORKER_INDEX === undefined) rmSync(DURUM, { recursive: true, force: true });

export default defineConfig({
  testDir: './e2e-dist',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results/dist',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/dist', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'dist-desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `npm run preview -- --ip 127.0.0.1 --port 4174 --persist-to ${DURUM}`,
    url: 'http://127.0.0.1:4174/robots.txt',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
