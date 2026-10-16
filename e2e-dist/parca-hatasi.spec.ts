import { expect, test, type Page, type Route } from '@playwright/test';

/*
  DERLENMİŞ SİTEDE PARÇA 404 (17 Ekim 2026)

  16 Ekim'de canlıda yeniden üretilen hata: gecikmeli rehber parçası 404
  dönünce `/rehber/burs-cakisma` tamamen boşalıyordu (#root 0 karakter, H1
  yok) ve `?sv=` kurtarması işe yaramıyordu. Bu testler aynı durumu
  derlenmiş sitede (gerçek ön render HTML'i, hash'li parçalar, Pages ara
  katmanı ve kenar önbelleği) kuruyor ve sonucu tarayıcının gerçek
  DOM'undan ölçüyor:
    - parça 404'te #root boşalmıyor; ön render metni ve H1 görünür kalıyor,
    - kurtarma TAM OLARAK BİR KEZ `?sv=` ile yeniliyor, ikincisi yok,
    - depolama kullanılamıyorsa hiç yenilemiyor, içerik yine görünür,
    - normal yüklemede yenileme yok; ana sayfa etkilenmiyor,
    - uygulama içi gezinmeden sonra parça hatası da boş ekran bırakmıyor.

  Belge (sayfa) istekleri `request` olayıyla sayılıyor: `framenavigated`
  history API gezinmelerini de saydığı için yenileme kanıtı olarak zayıf.
*/

const REHBER = '/rehber/burs-cakisma';
/* Rehber sayfasının gecikmeli parçaları (vite: assets/GuidePages-<hash>.js vb.). */
const REHBER_PARCALARI = /\/assets\/(GuidePages|rehber)[^/]*\.js(\?|$)/;
const ANLAMLI_METIN = 2000;

const yok = (r: Route) => r.fulfill({ status: 404, contentType: 'text/html; charset=utf-8', body: 'yok' });

/** Ham HTML'deki (sunucunun gönderdiği) H1 metni. */
async function hamH1(page: Page, yol: string) {
  const html = await (await page.request.get(yol)).text();
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  return (m?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&').trim();
}

/** Ana çerçevenin belge istekleri: ilk yükleme + her tam sayfa yenilemesi. */
function belgeSayaci(page: Page) {
  const belgeler: string[] = [];
  page.on('request', (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) belgeler.push(new URL(r.url()).pathname + new URL(r.url()).search);
  });
  return belgeler;
}

/**
 * Ana paket (assets/index-<hash>.js) her belgede 200 ile indi mi? İnmediyse
 * React hiç çalışmamıştır ve ekrandaki metin yalnız ham HTML'dir — o
 * durumda "içerik görünüyor" demek sınırı değil, bayat bir sayfayı ölçmek
 * olur. Her test bunu ayrıca doğruluyor.
 */
function anaPaketSayaci(page: Page) {
  const durumlar: number[] = [];
  page.on('response', (r) => {
    if (/\/assets\/index-[^/]+\.js(\?|$)/.test(r.url())) durumlar.push(r.status());
  });
  return durumlar;
}

/** Sayfa yerleşene kadar bekle: belge sayısı 3 sn değişmesin. */
async function yerles(page: Page, belgeler: string[]) {
  await page.waitForLoadState('load');
  let onceki = -1;
  for (let i = 0; i < 20 && onceki !== belgeler.length; i++) {
    onceki = belgeler.length;
    await page.waitForTimeout(3000);
    await page.waitForLoadState('load');
  }
}

async function rootOlc(page: Page) {
  return page.evaluate(() => {
    const r = document.getElementById('root');
    const h1 = document.querySelector('#root h1') as HTMLElement | null;
    return {
      metin: (r?.innerText || '').trim().length,
      h1: h1?.innerText.trim() ?? null,
      h1Gorunur: !!h1 && h1.getBoundingClientRect().height > 0 && getComputedStyle(h1).visibility !== 'hidden' && getComputedStyle(h1).display !== 'none',
      yuklenemedi: /Sayfa yüklenemedi\./.test(document.body.innerText),
    };
  });
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test('normal yükleme: H1 ve metin görünür, hiç yenileme yok', async ({ page }) => {
  const beklenenH1 = await hamH1(page, REHBER);
  expect(beklenenH1.length).toBeGreaterThan(5);
  const belgeler = belgeSayaci(page);
  const anaPaket = anaPaketSayaci(page);
  await page.goto(REHBER);
  await yerles(page, belgeler);
  const d = await rootOlc(page);
  expect(d.h1).toBe(beklenenH1);
  expect(d.h1Gorunur).toBe(true);
  expect(d.metin).toBeGreaterThan(ANLAMLI_METIN);
  expect(belgeler).toEqual([REHBER]);
  expect(anaPaket.length, 'ana paket her belgede indirilmeli').toBe(belgeler.length);
  expect(anaPaket.every((x) => x === 200), `ana paket durumları: ${anaPaket}`).toBe(true);
});

test('rehber parçası 404: ön render metni ve H1 kalıyor, tam olarak bir ?sv= yenilemesi', async ({ page, context }) => {
  const beklenenH1 = await hamH1(page, REHBER);
  const engellenen: string[] = [];
  await context.route(REHBER_PARCALARI, (r) => { engellenen.push(r.request().url()); return yok(r); });
  const sinirKaydi: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && /\[parca-hatasi\]/.test(m.text())) sinirKaydi.push(m.text()); });
  const belgeler = belgeSayaci(page);
  const anaPaket = anaPaketSayaci(page);

  await page.goto(REHBER);
  await yerles(page, belgeler);

  expect(engellenen.length, 'test kurgusu: gerçek bir parça isteği engellenmeli').toBeGreaterThan(0);
  const d = await rootOlc(page);
  expect(d.metin, '#root boşaldı').toBeGreaterThan(ANLAMLI_METIN);
  expect(d.h1).toBe(beklenenH1);
  expect(d.h1Gorunur).toBe(true);
  expect(d.yuklenemedi).toBe(false);
  /* İlk yükleme + TAM OLARAK bir kurtarma yenilemesi. */
  expect(belgeler).toHaveLength(2);
  expect(belgeler[0]).toBe(REHBER);
  expect(belgeler[1]).toMatch(new RegExp(`^${REHBER}\\?sv=\\d+$`));
  /* Hata gizlenmedi: sınır konsola yazdı. */
  expect(sinirKaydi.length).toBeGreaterThan(0);
  expect(anaPaket.length, 'ana paket her belgede indirilmeli').toBe(belgeler.length);
  expect(anaPaket.every((x) => x === 200), `ana paket durumları: ${anaPaket}`).toBe(true);
});

test('birden fazla hata: ikinci bir yenileme yok', async ({ page, context }) => {
  await context.route(REHBER_PARCALARI, yok);
  const belgeler = belgeSayaci(page);
  const anaPaket = anaPaketSayaci(page);
  await page.goto(REHBER);
  await yerles(page, belgeler);
  expect(belgeler).toHaveLength(2);

  /* Aynı oturumda üç yol daha tetikleniyor: hiçbiri yenilemiyor. */
  await page.evaluate(() => {
    window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    (window as unknown as { svVarlikKurtar?: () => void }).svVarlikKurtar?.();
    const s = document.createElement('script');
    s.src = '/assets/olmayan-parca-xyz.js';
    document.head.appendChild(s);
  });
  await yerles(page, belgeler);
  expect(belgeler).toHaveLength(2);
  const d = await rootOlc(page);
  expect(d.metin).toBeGreaterThan(ANLAMLI_METIN);
  expect(d.h1Gorunur).toBe(true);
  expect(anaPaket.length, 'ana paket her belgede indirilmeli').toBe(belgeler.length);
  expect(anaPaket.every((x) => x === 200), `ana paket durumları: ${anaPaket}`).toBe(true);
});

test('depolama kullanılamıyor: hiç yenileme yok, içerik yine görünür', async ({ page, context }) => {
  /* Gizli sekme davranışı: okuma boş, yazma hata veriyor. */
  await context.addInitScript(() => {
    Storage.prototype.getItem = function () { return null; };
    Storage.prototype.setItem = function () { throw new DOMException('kota', 'QuotaExceededError'); };
  });
  const beklenenH1 = await hamH1(page, REHBER);
  await context.route(REHBER_PARCALARI, yok);
  const belgeler = belgeSayaci(page);
  const anaPaket = anaPaketSayaci(page);
  await page.goto(REHBER);
  await yerles(page, belgeler);
  expect(belgeler).toEqual([REHBER]);
  const d = await rootOlc(page);
  expect(d.metin).toBeGreaterThan(ANLAMLI_METIN);
  expect(d.h1).toBe(beklenenH1);
  expect(d.h1Gorunur).toBe(true);
  expect(anaPaket.length, 'ana paket her belgede indirilmeli').toBe(belgeler.length);
  expect(anaPaket.every((x) => x === 200), `ana paket durumları: ${anaPaket}`).toBe(true);
});

test('ana sayfa etkilenmiyor (rehber parçaları engelli olsa bile)', async ({ page, context }) => {
  const beklenenH1 = await hamH1(page, '/');
  await context.route(REHBER_PARCALARI, yok);
  const belgeler = belgeSayaci(page);
  const anaPaket = anaPaketSayaci(page);
  await page.goto('/');
  await yerles(page, belgeler);
  expect(belgeler).toEqual(['/']);
  const d = await rootOlc(page);
  expect(d.h1).toBe(beklenenH1);
  expect(d.h1Gorunur).toBe(true);
  expect(d.yuklenemedi).toBe(false);
  expect(anaPaket.length, 'ana paket her belgede indirilmeli').toBe(belgeler.length);
  expect(anaPaket.every((x) => x === 200), `ana paket durumları: ${anaPaket}`).toBe(true);
});

test('uygulama içi gezinme sonrası parça 404: boş ekran yok, bir yenilemeyle rehber metni geliyor', async ({ page, context }) => {
  await context.route(REHBER_PARCALARI, yok);
  const belgeler = belgeSayaci(page);
  const anaPaket = anaPaketSayaci(page);
  await page.goto('/');
  await yerles(page, belgeler);
  expect(belgeler).toEqual(['/']);

  /* Uygulamanın kendi gezinmesi: üst menüdeki "Rehber" bağlantısı (gerçek <a>, düz tıklama). */
  const rehber = page.locator('header a[href="/rehber"]').first();
  await expect(rehber).toBeVisible();
  await rehber.click();
  await yerles(page, belgeler);

  /*
    /rehber de gecikmeli parça (GuidePages): yüklenemiyor. Kopya bu adres için
    değil (alındığı adres "/"), sınır kurtarmayı çağırıyor: tam olarak bir
    `?sv=` yenilemesi. Yeni belge /rehber'in kendi ön render'ını taşıyor;
    parça yine engelli olduğu için sınır o kopyayı gösteriyor.
  */
  expect(belgeler).toHaveLength(2);
  expect(belgeler[1]).toMatch(/^\/rehber\?sv=\d+$/);
  const d = await rootOlc(page);
  expect(d.metin).toBeGreaterThan(500);
  expect(d.h1Gorunur).toBe(true);
  expect(d.yuklenemedi).toBe(false);
  expect(anaPaket.length, 'ana paket her belgede indirilmeli').toBe(belgeler.length);
  expect(anaPaket.every((x) => x === 200), `ana paket durumları: ${anaPaket}`).toBe(true);
});
