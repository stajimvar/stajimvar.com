import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* TOPLU İŞLEM (9 Kasım 2026, rakip analizi #4). */
const KOK = path.resolve(import.meta.dirname, '..');
const s = readFileSync(path.join(KOK, 'src/sirket/AdayIzgarasi.tsx'), 'utf8');

test('yalnız yazabilen üyede ve geri çekilmemiş başvuruda seçim', () => {
  assert.match(s, /const topluAcik = Boolean\(onDurum\) && !saltOkunur;/);
  assert.match(s, /\{topluAcik && k\.durum !== 'withdrawn' && \(/);
});

test('her başvuru aynı onDurum yolundan; olumsuzda onay; hata sayılıp yazılıyor', () => {
  assert.match(s, /for \(const id of toplu\) \{\s*try \{\s*await onDurum\(id, durum\);/);
  assert.match(s, /durum === 'rejected' &&\s*!window\.confirm\(/);
  assert.match(s, /başvuru güncellenemedi/);
});
