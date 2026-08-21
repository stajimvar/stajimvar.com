import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMigrationList } from '../scripts/supabase-history-gate.mjs';

test('identifies remote migration versions that have no local counterpart', () => {
  const report = parseMigrationList('`0022` | ` ` | `0022`\n` ` | `20260815205310` | `2026-08-15`');
  assert.deepEqual(report.remoteOnly, ['20260815205310']);
  assert.deepEqual(report.localOnly, ['0022']);
});
