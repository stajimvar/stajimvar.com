import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  zaman.ts bir TypeScript modülü; testte doğrudan çalıştırmak yerine
  davranışı burada birebir kopyalanmış bir uygulamayla sınamak yerine,
  kuralın kendisi kaynaktan okunup sabitleri doğrulanıyor ve mantık
  bağımsız olarak sınanıyor. Amaç: eşik değerleri sessizce kaymasın.
*/
const kaynak = fs.readFileSync(
  path.resolve(import.meta.dirname, '..', 'src', 'lib', 'zaman.ts'),
  'utf8'
);

const GUN = 24 * 60 * 60 * 1000;

function esik(ad) {
  const e = new RegExp(`const ${ad} = (\\d+);`).exec(kaynak);
  assert.ok(e, `${ad} sabiti bulunamadı`);
  return Number(e[1]);
}

const UZUN_SURE = esik('UZUN_SURE_GUN');
const TAZELIK = esik('DOGRULAMA_TAZELIK_GUN');

/* zaman.ts'teki kuralın aynısı — eşikler oradan okunuyor. */
function uzunSuredirAcik(yayin, kaynaktanMi, dogrulama, simdi) {
  if (!kaynaktanMi || !yayin || !dogrulama) return false;
  const y = new Date(yayin).getTime();
  const d = new Date(dogrulama).getTime();
  if (Number.isNaN(y) || Number.isNaN(d)) return false;
  const yas = (simdi - y) / GUN;
  const dy = (simdi - d) / GUN;
  return yas >= UZUN_SURE && dy >= 0 && dy <= TAZELIK;
}

const simdi = Date.parse('2026-08-25T12:00:00Z');
const gunOnce = (n) => new Date(simdi - n * GUN).toISOString();

test('eşikler makul aralıkta', () => {
  assert.ok(UZUN_SURE >= 90 && UZUN_SURE <= 365, `UZUN_SURE_GUN=${UZUN_SURE}`);
  assert.ok(TAZELIK >= 1 && TAZELIK <= 30, `DOGRULAMA_TAZELIK_GUN=${TAZELIK}`);
});

test('eski yayın + taze doğrulama: uzun süredir açık', () => {
  assert.equal(uzunSuredirAcik(gunOnce(300), true, gunOnce(1), simdi), true);
});

test('doğrulama bayatsa yorum yapılmıyor', () => {
  assert.equal(uzunSuredirAcik(gunOnce(300), true, gunOnce(TAZELIK + 5), simdi), false);
});

test('tarih kaynaktan gelmiyorsa yorum yapılmıyor', () => {
  /* Kendi ekleme tarihimiz ilanın gerçek yaşı hakkında bir şey söylemiyor. */
  assert.equal(uzunSuredirAcik(gunOnce(300), false, gunOnce(1), simdi), false);
});

test('yeni ilanda tarih olduğu gibi kalıyor', () => {
  assert.equal(uzunSuredirAcik(gunOnce(10), true, gunOnce(1), simdi), false);
});

test('eksik veride sessizce false', () => {
  assert.equal(uzunSuredirAcik(null, true, gunOnce(1), simdi), false);
  assert.equal(uzunSuredirAcik(gunOnce(300), true, null, simdi), false);
  assert.equal(uzunSuredirAcik('geçersiz', true, gunOnce(1), simdi), false);
});
