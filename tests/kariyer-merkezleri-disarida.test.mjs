import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* Kurum talebiyle listeden çıkarılan okullar yeniden eklenmesin (27 Kasım 2026). */
const KOK = path.resolve(import.meta.dirname, '..');
const liste = readFileSync(path.join(KOK, 'src/data/kariyerMerkezleri.ts'), 'utf8');

test('Üsküdar Üniversitesi kariyer merkezleri listesinde yok', () => {
  assert.doesNotMatch(liste, /universite: 'Üsküdar Üniversitesi'/);
  assert.doesNotMatch(liste, /uskudar\.edu\.tr/);
});
