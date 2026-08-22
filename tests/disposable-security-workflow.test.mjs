import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('runs disposable SQL files with local psql and always cleans up', () => {
  const workflow = fs.readFileSync('.github/workflows/supabase-disposable-security-tests.yml', 'utf8');
  assert.match(workflow, /supabase db reset --local --no-seed/);
  assert.match(workflow, /psql -v ON_ERROR_STOP=1 -f scripts\/sql\/disposable-security-tests\.sql/);
  assert.doesNotMatch(workflow, /supabase db query/);
  assert.match(workflow, /if: always\(\)/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_PROJECT_REF/);
});
