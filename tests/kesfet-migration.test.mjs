import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let sql = '';
try {
  sql = await readFile(new URL('../supabase/migrations/20260827010000_kesfet_events.sql', import.meta.url), 'utf8');
} catch {}

test('Keşfet migration public okumayı yayındaki aktif etkinliklerle sınırlar', () => {
  assert.match(sql, /create table public\.discover_events/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /status = 'published'.*ends_at >= now\(\)/is);
});

test('Keşfet yazma ve silme işlemleri admin RPC sınırındadır', () => {
  assert.match(sql, /revoke insert, update, delete on public\.discover_events from anon, authenticated/i);
  assert.match(sql, /admin_create_discover_event/i);
  assert.match(sql, /admin_update_discover_event/i);
  assert.match(sql, /admin_delete_discover_event/i);
  assert.match(sql, /if not public\.is_admin\(\)/i);
});
