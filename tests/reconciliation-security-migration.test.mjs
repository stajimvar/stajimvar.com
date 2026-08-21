import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('reconciliation migration hardens source URLs and removes direct publish-guard grants', () => {
  const files = fs.readdirSync('supabase/migrations');
  const name = files.find((file) => file.endsWith('_reconcile_opportunity_source_security.sql'));
  assert.ok(name, 'timestamp reconciliation migration is required');
  const sql = fs.readFileSync(`supabase/migrations/${name}`, 'utf8');
  assert.match(sql, /auto_publish_enabled boolean not null default false/i);
  assert.match(sql, /revoke all on function public\.guard_listing_publish\(\) from public, anon, authenticated/i);
  assert.match(sql, /create or replace function public\.is_safe_opportunity_source_url/i);
  assert.match(sql, /inet/i);
});
