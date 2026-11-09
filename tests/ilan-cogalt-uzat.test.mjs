import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { uzatilmisTarih } from '../src/lib/ilan-uzatma.mjs';

/* İLANI ÇOĞALT + SON BAŞVURUYU UZAT (9 Kasım 2026, rakip analizi #6). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');
const simdi = new Date('2026-11-09T10:00:00Z');

test('uzatma: ileri tarihe +30, geçmiş tarihe bugünden +30, tarihsiz yok', () => {
  assert.equal(uzatilmisTarih('2026-12-01', simdi), '2026-12-31');
  assert.equal(uzatilmisTarih('2026-10-01', simdi), '2026-12-09');
  assert.equal(uzatilmisTarih(null, simdi), null);
  assert.equal(uzatilmisTarih('', simdi), null);
});

test('menü her ilanda: Çoğalt ve uzat; kaldırma yalnız kaldırılabilirde', () => {
  const g = oku('src/sirket/GenelBakis.tsx');
  assert.match(g, /onNavigate\(`\/sirket\/ilan\/yeni\?kopya=\$\{encodeURIComponent\(id\)\}`\)/);
  assert.match(g, /Son başvuruyu 30 gün uzat/);
  assert.match(g, /\{onKaldir && eylem\.kaldirilabilir && \(\s*<button/);
  assert.match(oku('src/sirket/SirketPaneli.tsx'), /await ilanGuncelle\(id, \{ application_deadline: tarih \}\);/);
});

test('kopya formu: yalnız yeni ilanda, son başvuru boş, kaydedilene kadar yazılmıyor', () => {
  const f = oku('src/sirket/IlanFormu.tsx');
  assert.match(f, /if \(duzenlenenId \|\| typeof window === 'undefined'\) return;/);
  assert.match(f, /setDeger\(\{ \.\.\.ilanFormDegeri\(satir\), sonBasvuru: '' \}\);/);
});
