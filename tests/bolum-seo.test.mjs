import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bolumSeo, BOLUM_LISTESI_BASLIGI } from '../src/lib/seo/bolum-seo.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('bölüm sayfası: başlık ve H1 aranan sözcükleri taşıyor', () => {
  const s = bolumSeo({ ad: 'Bilgisayar Mühendisliği', aciklama: 'x' });
  assert.equal(s.baslik, 'Bilgisayar Mühendisliği Staj Yerleri ve İlanları | StajımVar');
  assert.equal(s.h1, 'Bilgisayar Mühendisliği staj yerleri ve ilanları');
  assert.match(s.aciklama, /^Güncel bilgisayar mühendisliği staj ilanları ve staj yerleri:/);
  assert.ok(s.aciklama.length <= 160, s.aciklama.length);
  /* Türkçe küçük harf: İ → i, I → ı */
  assert.match(bolumSeo({ ad: 'İç Mimarlık' }).aciklama, /iç mimarlık staj ilanları/);
  assert.match(bolumSeo({ ad: 'Iğdır' }).aciklama, /ığdır/);
});

test('sağlık bölümünde "staj ilanları" vaadi yok', () => {
  const s = bolumSeo({ ad: 'Hemşirelik', aciklama: 'Klinik uygulama.' }, { okulYerlestirir: true });
  assert.doesNotMatch(s.baslik + s.h1 + s.aciklama, /ilan/i);
  assert.equal(s.h1, 'Hemşirelik stajı');
  assert.equal(s.aciklama, 'Klinik uygulama.');
});

test('tarayıcı ve ön render aynı fonksiyonu kullanıyor', () => {
  const o = oku('scripts/onrender.mjs');
  assert.match(o, /seo: bolumSeo\(b, \{ okulYerlestirir: OKUL_YERLESTIRIR\.includes\(b\.grup\) \}\)/);
  assert.match(o, /baslik: b\.seo\.baslik,/);
  assert.match(o, /headline: b\.seo\.h1,/);
  assert.match(o, /\['\/bolumler', BOLUM_LISTESI_BASLIGI,/);
  const p = oku('src/components/BolumPages.tsx');
  assert.match(p, /bolumSeo\(bolum, \{ okulYerlestirir: OKUL_YERLESTIRIR\.includes\(bolum\.grup\) \}\)/);
  assert.match(p, /\{seo\.h1\}/);
  assert.match(p, /document\.title = BOLUM_LISTESI_BASLIGI;/);
  assert.match(BOLUM_LISTESI_BASLIGI, /Staj Yerleri ve İlanları/);
});
