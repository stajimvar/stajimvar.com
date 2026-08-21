import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyChangedPaths } from '../scripts/detect-deploy-changes.mjs';

test('classifies an Opportunities UI-only change without requiring Supabase deployment', () => {
  assert.deepEqual(classifyChangedPaths(['src/components/OpportunitiesPage.tsx']), {
    supabaseChanged: false,
    appChanged: true,
  });
});

test('requires Supabase deployment for migrations and Edge Functions', () => {
  assert.equal(classifyChangedPaths(['supabase/migrations/20260822000000_add.sql']).supabaseChanged, true);
  assert.equal(classifyChangedPaths(['supabase/functions/opportunity-source-check/index.ts']).supabaseChanged, true);
  assert.equal(classifyChangedPaths(['supabase/config.toml']).supabaseChanged, true);
  assert.equal(classifyChangedPaths(['.github/workflows/supabase-production.yml']).supabaseChanged, true);
});

test('keeps Cloudflare fail-closed while permitting a skipped Supabase job for UI-only changes', () => {
  const workflow = fs.readFileSync('.github/workflows/supabase-production.yml', 'utf8');
  assert.match(workflow, /changes:\s/);
  assert.match(workflow, /supabase_changed/);
  assert.match(workflow, /app_changed/);
  assert.match(workflow, /needs\.changes\.outputs\.supabase_changed == 'true'/);
  assert.match(workflow, /needs\.validate_app\.result == 'success'/);
  assert.match(workflow, /needs\.migrate_and_functions\.result == 'success'/);
  assert.match(workflow, /always\(\)/);
});
