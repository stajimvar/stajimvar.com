import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('Ağım: İlanlar şeridiyle aynı kart, yalnız geniş ekranda; ikinci h1 yok', () => {
  const agim = oku('src/components/sosyal/AgimSayfasi.tsx');
  const ilan = oku('src/components/MatchedInternshipsView.tsx');
  assert.match(agim, /<h2 className="text-\[28px\][^"]*">Topluluğunu burada büyüt\.<\/h2>/);
  assert.match(agim, /className="mb-4 hidden lg:relative lg:block[^"]*lg:from-blue-50/);
  /* Simge kabı İlanlar'dakiyle birebir. */
  const kap = 'relative flex h-20 w-20 rotate-6 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30';
  assert.ok(agim.includes(kap) && ilan.includes(kap));
  assert.equal((agim.match(/<h1[\s>]/g) ?? []).length, 2, 'giriş gerekli ekranı + telefon çubuğu; yeni h1 eklenmedi');
});
