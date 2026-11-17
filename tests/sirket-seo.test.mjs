import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sirketSayfaBasligi, sirketYedekAciklamasi } from '../src/lib/seo/sirket-seo.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('şirket sayfası başlığı "staj başvurusu" aramasını karşılıyor', () => {
  assert.equal(sirketSayfaBasligi('Bosch'), 'Bosch Staj İlanları ve Staj Başvurusu | StajımVar');
  const a = sirketYedekAciklamasi({ ad: 'Bosch', adet: 7, sehirler: ['İstanbul', 'Bursa', 'Kusterdingen', 'Ankara'] });
  assert.match(a, /^Bosch staj başvurusu: yayındaki 7 staj ilanı \(İstanbul, Bursa, Kusterdingen\)\./);
  assert.ok(a.length <= 155, a.length);
  /* Sayı bilinmiyorsa uydurulmuyor (tarayıcı tarafı). */
  assert.match(sirketYedekAciklamasi({ ad: 'Bosch' }), /^Bosch staj başvurusu: yayındaki staj ilanları\./);
  /* İşverenin doğrudan açtığı ilanda başvuru sitede: "doğrudan şirkete" denmiyor. */
  assert.doesNotMatch(a, /doğrudan şirkete/);
});

test('tarayıcı ve ön render aynı başlığı kullanıyor', () => {
  const o = oku('scripts/onrender.mjs');
  assert.match(o, /const baslik = sirketSayfaBasligi\(s\.name\);/);
  assert.match(o, /sirketYedekAciklamasi\(\{ ad: s\.name, adet, sehirler \}\)/);
  assert.match(oku('src/components/CompanyPage.tsx'), /baslik: sirketSayfaBasligi\(veri\.company\.name\),/);
});
