import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

let sql = "";
try {
  sql = (
    await Promise.all([
      readFile(
        new URL(
          "../supabase/migrations/20260827010000_kesfet_events.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../supabase/migrations/20260827020000_kesfet_curation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    ])
  ).join("\n");
} catch {}

test("Keşfet migration public okumayı yayındaki aktif etkinliklerle sınırlar", () => {
  assert.match(sql, /create table public\.discover_events/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /status = 'published'.*ends_at >= now\(\)/is);
});

test("curation migration doğrulama, puan ve öğrenci hedefleme alanlarını ekler", () => {
  for (const column of [
    "last_verified_at",
    "source_trust_score",
    "verification_status",
    "target_audiences",
    "interest_tags",
    "student_fit_score",
    "application_deadline",
    "discount_terms",
    "age_limit",
    "registration_required",
  ]) {
    assert.match(sql, new RegExp(column, "i"));
  }
  assert.match(sql, /student_fit_score[^;]+between 0 and 100/is);
});

test("curation migration mükerrerleri parmak iziyle engeller ve puanı sunucuda hesaplar", () => {
  assert.match(sql, /discover_event_fingerprint/i);
  assert.match(sql, /unique[^;]+source_fingerprint/is);
  assert.match(sql, /calculate_discover_event_score/i);
  assert.match(sql, /before insert or update/i);
});

test("Keşfet yazma ve silme işlemleri admin RPC sınırındadır", () => {
  assert.match(
    sql,
    /revoke insert, update, delete on public\.discover_events from anon, authenticated/i,
  );
  assert.match(sql, /admin_create_discover_event/i);
  assert.match(sql, /admin_update_discover_event/i);
  assert.match(sql, /admin_delete_discover_event/i);
  assert.match(sql, /if not public\.is_admin\(\)/i);
});
