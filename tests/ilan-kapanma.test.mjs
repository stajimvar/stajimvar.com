import test from 'node:test';
import assert from 'node:assert/strict';
import { kapanmaSebebi, acikKaniti, ilanaOzguKapanma, etkinBasvuruDugmesi } from '../src/lib/ilan-kapanma.mjs';

/*
  İLAN KAPANMA KARARI — DAVRANIŞ TESTLERİ (13 Ekim 2026)

  Kararlar artık saf işlev (src/lib/ilan-kapanma.mjs); bağlantı kontrolü
  (scripts/ilan-baglanti-kontrol.mjs) bunları çağırıp kapanan ilanı
  status='closed' yapıyor. Bu testler iki yönü de sabitliyor:

    · KAPANMIŞ ilan kapalı sayılıyor — yeni: "Application Closed" ve
      "closed for applications" (Connectinno, recruspace, ölçüldü).
    · AÇIK ilan YANLIŞLIKLA kapatılmıyor — yanlış kapatma sessiz bir hata:
      ilan listeden düşer, kimse fark etmez. Aşağıdaki "kapatmamalı"
      örneklerinin her biri gerçek bir yanlış pozitif kalıbı.

  Sayfa örnekleri kısa ve elle yazıldı; gerçek sayfaların kopyası değil.
*/

const OK = (url = 'https://ornek.com/ilan/123456') => ({ status: 200, url });
const JSONLD = (ek = '') =>
  `<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"AI Product Intern"${ek}}</script>`;

/* Connectinno (recruspace) biçimi: kendi JobPosting verisi, h1 ilan, kapanma metni, düğme yok. */
const KAPALI_RECRUSPACE =
  `<html><head>${JSONLD(',"validThrough":"2026-09-25"')}</head><body>` +
  '<a href="/jobs">All Jobs</a><h1>AI Product Intern</h1><p>Intern · Remote / İstanbul, Türkiye</p>' +
  '<div class="durum">Application Closed</div><p>This job posting is closed for applications. Please check out our other openings.</p>' +
  '</body></html>';

test('KAPALI: "Application Closed / closed for applications" ilanın kendi sayfasında', () => {
  const sebep = kapanmaSebebi(OK(), KAPALI_RECRUSPACE, { baslik: 'Yapay Zekâ Ürün Stajyeri', adres: 'https://app.recruspace.com/applications/abc123def' });
  assert.match(sebep, /^sayfa metni: "(closed for applications|application closed)"$/);
});

test('KAPALI: Türkçe kapanma ifadeleri ilanın kendi sayfasında', () => {
  for (const ifade of ['Bu ilan başvurulara kapatıldı.', 'Başvurular kapandı.', 'İlan başvurulara kapalı']) {
    const govde = `<html><body><h1>Pazarlama Stajyeri</h1><p>${ifade}</p></body></html>`;
    assert.ok(kapanmaSebebi(OK(), govde, { baslik: 'Pazarlama Stajyeri', adres: 'https://ornek.com/ilan/123456' }), ifade);
  }
});

test('KAPALI (değişmedi): 404, 410, Workday invalid-url ve genel kapanma metinleri', () => {
  assert.equal(kapanmaSebebi({ status: 404, url: 'https://x.com/a' }, ''), 'HTTP 404');
  assert.equal(kapanmaSebebi({ status: 410, url: 'https://x.com/a' }, ''), 'HTTP 410');
  assert.match(kapanmaSebebi({ status: 200, url: 'https://x.wd5.myworkdayjobs.com/invalid-url' }, ''), /invalid-url/);
  assert.match(kapanmaSebebi(OK(), '<p>We are no longer accepting applications for this role.</p>'), /no longer accepting applications/);
});

/* ------------------------------------------------ YANLIŞ KAPATMA YOK */

test('KAPATMAMALI: "Application Closed" başka ilanın etiketi (sayfa bu ilan değil)', () => {
  /* Genel kariyer sayfası: kendi JobPosting'i yok, h1 farklı, canonical farklı. */
  const govde =
    '<html><head><link rel="canonical" href="https://ornek.com/careers"></head><body><h1>Careers at Örnek</h1>' +
    '<ul><li>Data Intern — Application Closed</li><li>Marketing Intern — Apply now</li></ul></body></html>';
  assert.equal(kapanmaSebebi(OK('https://ornek.com/careers'), govde, { baslik: 'Yapay Zekâ Ürün Stajyeri', adres: 'https://ornek.com/ilan/998877' }), null);
});

test('KAPATMAMALI: ifade koşul cümlesinin içinde', () => {
  for (const cumle of [
    'Applications are reviewed on a rolling basis until the application is closed.',
    'We will contact you once applications are closed.',
    'Başvurular kapandı ilan edilene kadar değerlendirme sürüyor.',
  ]) {
    const govde = `<html><head>${JSONLD()}</head><body><h1>AI Product Intern</h1><p>${cumle}</p></body></html>`;
    assert.equal(ilanaOzguKapanma(govde, { baslik: 'AI Product Intern' }), null, cumle);
  }
});

test('KAPATMAMALI: sayfada etkin başvuru düğmesi varsa açıklık kazanır', () => {
  const govde =
    `<html><head>${JSONLD()}</head><body><h1>AI Product Intern</h1>` +
    '<p>Applications closed for the 2025 cohort. The 2026 cohort is now open.</p>' +
    '<a class="btn" href="/apply">Apply now</a></body></html>';
  assert.equal(etkinBasvuruDugmesi(govde), true);
  assert.equal(kapanmaSebebi(OK(), govde, { baslik: 'AI Product Intern' }), null);
  /* Devre dışı düğme açıklık kanıtı sayılmıyor. */
  const devreDisi = govde.replace('<a class="btn" href="/apply">Apply now</a>', '<button disabled>Apply now</button>');
  assert.equal(etkinBasvuruDugmesi(devreDisi), false);
});

test('KAPATMAMALI: "closes" (gelecek tarih) ve benzer kelimeler', () => {
  for (const cumle of ['Application closes on 30 November 2026.', 'Application closing date: 30.11.2026', 'Enclosed application form', 'Applicationsclosed']) {
    const govde = `<html><head>${JSONLD()}</head><body><h1>AI Product Intern</h1><p>${cumle}</p></body></html>`;
    assert.equal(kapanmaSebebi(OK(), govde, { baslik: 'AI Product Intern' }), null, cumle);
  }
});

test('KAPATMAMALI: gömülü JavaScript sözlüğündeki hata metinleri (hrpanda, Jibe — ölçülmüş yanlış pozitifler)', () => {
  const govde =
    `<html><head>${JSONLD()}</head><body><h1>AI Product Intern</h1>` +
    '<script>window.__i18n={"booking.errors.slotUnavailable":"This time is no longer available","NO_JOBS_404":"this job may be no longer available","x":"Application Closed"}</script>' +
    '<p>Ekibimize katıl.</p></body></html>';
  assert.equal(kapanmaSebebi(OK(), govde, { baslik: 'AI Product Intern' }), null);
});

test('KAPATMAMALI: geçici hatalar (403, 429, 5xx) metinden bağımsız olarak kapanma değil', () => {
  for (const status of [403, 429, 500, 502, 503]) {
    assert.equal(kapanmaSebebi({ status, url: 'https://x.com/a' }, KAPALI_RECRUSPACE, { baslik: 'AI Product Intern' }), null, String(status));
  }
});

test('açık ilan: kapanma yok ve açıklık kanıtı var', () => {
  const govde = `<html><head>${JSONLD()}</head><body><h1>AI Product Intern</h1><p>Join us.</p><a href="/apply">Apply</a></body></html>`;
  assert.equal(kapanmaSebebi(OK(), govde, { baslik: 'AI Product Intern' }), null);
  assert.ok(acikKaniti(govde, 'AI Product Intern', 'https://ornek.com/ilan/123456'));
});
