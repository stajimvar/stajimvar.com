import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* TOPLU İŞLEM (9 Kasım 2026, rakip analizi #4). */
const KOK = path.resolve(import.meta.dirname, '..');
const s = readFileSync(path.join(KOK, 'src/sirket/AdayIzgarasi.tsx'), 'utf8');

test('yalnız yazabilen üyede ve geri çekilmemiş başvuruda seçim', () => {
  assert.match(s, /const topluAcik = Boolean\(onDurum\) && !saltOkunur;/);
  /* 27 Kasım 2026: kutular yalnız seçim kipinde ("Seç" düğmesi). */
  assert.match(s, /\{topluAcik && secimKipi && k\.durum !== 'withdrawn' && \(/);
  assert.match(s, /const \[secimKipi, setSecimKipi\] = React\.useState\(false\);/);
  /* Kip kapanınca seçim temizleniyor. */
  assert.match(s, /if \(a\) setToplu\(new Set\(\)\);/);
});

test('her başvuru aynı onDurum yolundan; olumsuzda onay; hata sayılıp yazılıyor', () => {
  assert.match(s, /for \(const id of toplu\) \{\s*try \{\s*await onDurum\(id, durum\);/);
  assert.match(s, /durum === 'rejected' &&\s*!window\.confirm\(/);
  assert.match(s, /başvuru güncellenemedi/);
});

test('araç satırı tek: Seç ve CSV aynı satırda, CSV için ayrı satır yok', () => {
  const satir = s.slice(s.indexOf('TEK ARAÇ SATIRI'), s.indexOf('{filtrelerAcik && ('));
  assert.match(satir, /onClick=\{secimKipiniDegistir\}/);
  assert.match(satir, /CSV indir \(\{gosterilen\.length\}\)/);
  assert.equal((s.match(/CSV indir \(/g) || []).length, 1);
  assert.doesNotMatch(s, /<div className="flex justify-end">\s*<button/);
});
