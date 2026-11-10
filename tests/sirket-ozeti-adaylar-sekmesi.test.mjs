import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sirketOzeti } from '../src/lib/sirket-ozeti.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('özet: yayındaki ilan, toplam başvuru, 7 gün ziyaret, dönüşüm, en çok başvuru', () => {
  const o = sirketOzeti(
    [
      { id: 'a', title: 'Grafik', status: 'published' },
      { id: 'b', title: 'Tekstil', status: 'published' },
      { id: 'c', title: 'Eski', status: 'closed', applicants_count: 2 },
    ],
    {
      a: { goruntulenme: 3, sonYediGun: 3, kaydeden: 0, basvuru: 0 },
      b: { goruntulenme: 5, sonYediGun: 5, kaydeden: 0, basvuru: 1 },
    },
  );
  assert.equal(o.yayinda, 2);
  assert.equal(o.basvuru, 3);
  assert.equal(o.sonYediGun, 8);
  assert.equal(o.donusum, 37.5);
  assert.deepEqual(o.enCok, { id: 'c', baslik: 'Eski', basvuru: 2 });
});

test('istatistik okunamazsa ziyaret ve dönüşüm uydurulmuyor; başvurusuz ilanda "en çok" yok', () => {
  const o = sirketOzeti([{ id: 'a', status: 'published' }, { id: 'b', status: 'draft' }], {});
  assert.equal(o.sonYediGun, null);
  assert.equal(o.donusum, null);
  assert.equal(o.enCok, null);
});

test('İlanlarım özeti iki ve daha fazla ilanda; Adaylar üst ve alt menüde kendi sekmesi', () => {
  assert.match(oku('src/sirket/GenelBakis.tsx'), /ilanlar\.length > 1 && \(\(\) => \{\s+const o = sirketOzeti\(ilanlar, istatistik\)/);
  const h = oku('src/components/Header.tsx');
  assert.match(h, /id="nav-tab-sirket-adaylar"/);
  assert.match(h, /aria-label="Adaylar"/);
  assert.ok(h.includes('const sirketAdaylardaMi = /^\\/sirket\\/(adaylar|aday)('));
  assert.ok(h.includes('const sirketProfilindeMi = /^\\/sirket\\/profil('));
});
