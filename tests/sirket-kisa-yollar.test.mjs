import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const kurallar = oku('public/_redirects')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('#'))
  .map((s) => s.split(/\s+/));

test('çıplak /sirket panele; sahiplenme sayfasına yönlendirme yok', () => {
  assert.deepEqual(kurallar.find((k) => k[0] === '/sirket'), ['/sirket', '/sirket/ilanlar', '301']);
  assert.ok(!kurallar.some((k) => k[0] === '/sirket' && k[1] === '/isveren/ilan-ver'));
});

test('/sirket/mesajlar ortak mesajlar ekranına gidiyor (404 yok)', () => {
  assert.deepEqual(kurallar.find((k) => k[0] === '/sirket/mesajlar'), ['/sirket/mesajlar', '/mesajlar', '301']);
});

test('şirket hesabı /isveren/ilan-ver ve /sirket/mesajlar adreslerinden doğru ekrana alınıyor', () => {
  const app = oku('src/App.tsx');
  assert.match(app, /temizYol === '\/' \|\| temizYol === '\/sirket' \|\| temizYol === '\/isveren\/ilan-ver'\) \{\s+navigate\('\/sirket\/ilanlar'/);
  assert.match(app, /navigate\(temizYol\.replace\('\/sirket\/mesajlar', '\/mesajlar'\)/);
});
