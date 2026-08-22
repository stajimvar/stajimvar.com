import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseDisposableDbUrl } from '../scripts/assert-disposable-db-url.mjs';

test('runs disposable SQL files with local psql and always cleans up', () => {
  const workflow = fs.readFileSync('.github/workflows/supabase-disposable-security-tests.yml', 'utf8');
  assert.match(workflow, /supabase db reset --local --no-seed/);
  assert.match(workflow, /psql -v ON_ERROR_STOP=1 -f scripts\/sql\/disposable-security-tests\.sql/);
  assert.doesNotMatch(workflow, /supabase db query/);
  assert.match(workflow, /if: always\(\)/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_PROJECT_REF/);
});

test('accepts only parsed loopback local Supabase URLs without exposing credentials', () => {
  assert.deepEqual(parseDisposableDbUrl('DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable"\n'), { scheme: 'postgresql:', host: '127.0.0.1', port: '54322', database: 'postgres' });
  assert.deepEqual(parseDisposableDbUrl('DB_URL=postgres://postgres:postgres@[::1]:54322/postgres\n'), { scheme: 'postgres:', host: '::1', port: '54322', database: 'postgres' });
  for (const value of ['postgresql://user:pass@gdumgdgwlfnohkaucfow.supabase.co:5432/postgres', 'postgresql://user:pass@10.0.0.1:54322/postgres', 'postgresql://user:pass@localhost:6543/other']) assert.throws(() => parseDisposableDbUrl(`DB_URL=${value}\n`));
});
