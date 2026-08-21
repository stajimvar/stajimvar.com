import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin migration defines protected audit and RPC write boundary', async () => {
  const sql = await readFile(new URL('../supabase/migrations/0019_opportunity_admin_panel.sql', import.meta.url), 'utf8');
  for (const requirement of ['opportunity_admin_events', 'enable row level security', 'revoke insert, update, delete on public.opportunities from anon, authenticated', 'security definer', 'admin_create_opportunity', 'admin_update_opportunity', 'admin_set_opportunity_status', 'on delete restrict']) assert.match(sql, new RegExp(requirement, 'i'));
});
