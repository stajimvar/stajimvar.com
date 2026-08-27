import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL(
  "../supabase/migrations/20260827030000_kesfet_import_pipeline.sql",
  import.meta.url,
);

let sql = "";
try {
  sql = await readFile(migrationUrl, "utf8");
} catch {}

test("import migration yaşam döngüsü ve kaynak telemetrisini kurar", () => {
  assert.match(sql, /create table public\.discover_event_sources/i);
  assert.match(sql, /create table public\.discover_event_import_runs/i);
  assert.match(sql, /original_image_url/i);
  assert.match(sql, /cover_kind/i);
  assert.match(sql, /canonical_source_url/i);
  assert.match(sql, /cancelled/i);
  assert.match(sql, /postponed/i);
  assert.match(sql, /archived/i);
});

test("event-covers herkese okunur ama yalnız yönetici veya service role yazabilir", () => {
  assert.match(sql, /event-covers/i);
  assert.match(sql, /bucket_id\s*=\s*'event-covers'/i);
  assert.match(sql, /for select/i);
  assert.match(sql, /public\.is_admin\(\)/i);
  assert.match(sql, /revoke insert, update, delete on public\.discover_event_sources from anon, authenticated/i);
});

test("genel Keşfet okuması yalnız aktif yayındaki kayıtları bırakır", () => {
  assert.match(
    sql,
    /drop policy(?: if exists)? "yayindaki aktif kesfet etkinlikleri herkese acik"/i,
  );
  assert.match(sql, /status = 'published'/i);
  assert.match(sql, /ends_at >= now\(\)/i);
});
