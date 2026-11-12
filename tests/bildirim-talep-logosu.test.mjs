import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { talepAnahtari, talepGorselHaritasi } from '../src/lib/bildirim-talep-logosu.mjs';

const T = '13456d10-4e64-45cb-af7c-5ba765db22d2';

test('olay kimliğinden talep türü; bozuk kimlik yok sayılıyor', () => {
  assert.deepEqual(talepAnahtari(`yonetici-sirket-talebi:${T}`), { tur: 'talep', id: T });
  assert.deepEqual(talepAnahtari(`yonetici-sirket-otomatik:${T}`), { tur: 'talep', id: T });
  assert.deepEqual(talepAnahtari(`yonetici-sahiplenme:${T}`), { tur: 'sahiplenme', id: T });
  assert.equal(talepAnahtari('takip:a:b'), null);
  assert.equal(talepAnahtari('yonetici-sirket-talebi:bozuk'), null);
  assert.equal(talepAnahtari(null), null);
});

test('logo: talebinki, yoksa şirketinki; hiçbiri yoksa ya da https değilse satır yok', () => {
  const h = talepGorselHaritasi(
    [
      { id: 'a', sirket_adi: 'Modmere', logo_url: 'https://x/logo.png' },
      { id: 'b', sirket_adi: 'Onayli', logo_url: null, sirket: { logo_url: 'https://y/l.png' } },
      { id: 'c', sirket_adi: 'Modilce', logo_url: null },
      { id: 'd', sirket_adi: 'Kotu', logo_url: 'javascript:alert(1)' },
    ],
    [{ id: 'e', sirket: { name: 'Bosch', logo_url: 'https://z/b.svg' } }],
  );
  assert.equal(h.get('talep:a').logo, 'https://x/logo.png');
  assert.equal(h.get('talep:b').logo, 'https://y/l.png');
  assert.equal(h.has('talep:c'), false);
  assert.equal(h.has('talep:d'), false);
  assert.deepEqual(h.get('sahiplenme:e'), { sirketAdi: 'Bosch', logo: 'https://z/b.svg' });
});

test('App: yalnız yöneticide ve panel açıkken soruluyor; logo şirket görseli olarak çiziliyor', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /bildirim\.acik && isAdmin\s+\? Array\.from/);
  assert.match(app, /tip: 'sirket' as const, sirketAdi: g\.sirketAdi, logo: g\.logo, ilanAdi: null/);
});
