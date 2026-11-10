import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('/sirket/mesajlar ara katmanda 404 değil; uygulama herkesi /mesajlar a alıyor', () => {
  for (const p of ['functions/_middleware.ts', 'src/App.tsx']) {
    assert.match(oku(p), /const SIRKET_PANEL_YOLLARI = \[[^\]]*'\/sirket\/mesajlar'\]/);
  }
  const app = oku('src/App.tsx');
  assert.match(app, /if \(temizYol === '\/sirket\/mesajlar' \|\| temizYol\.startsWith\('\/sirket\/mesajlar\/'\)\) \{\s+navigate\(temizYol\.replace\('\/sirket\/mesajlar', '\/mesajlar'\)/);
});

test('şirket hesabı /sirket ve /isveren/ilan-ver adreslerinden paneline alınıyor', () => {
  const app = oku('src/App.tsx');
  assert.match(app, /temizYol === '\/' \|\| temizYol === '\/sirket' \|\| temizYol === '\/isveren\/ilan-ver'\) \{\s+navigate\('\/sirket\/ilanlar'/);
});
