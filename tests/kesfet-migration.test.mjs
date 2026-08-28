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
      readFile(
        new URL(
          "../supabase/migrations/20260828020000_discover_event_occurrences.sql",
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

test("occurrence migration seans kimliği, kesinlik ve yaşam döngüsünü tanımlar", () => {
  assert.match(sql, /create table public\.discover_event_occurrences/i);
  assert.match(sql, /time_precision[^;]+date_only[^;]+recurring[^;]+ongoing/is);
  assert.match(sql, /status[^;]+scheduled[^;]+cancelled[^;]+postponed[^;]+archived/is);
  assert.match(sql, /consecutive_missing_runs integer not null default 0/i);
  assert.match(sql, /unique[^;]+event_id[^;]+source_occurrence_id/is);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke insert, update, delete on public\.discover_event_occurrences from anon, authenticated/i);
});

test("public occurrence sorgusu aralık kesişimiyle etkinlik başına tek aktif seans seçer", () => {
  assert.match(sql, /list_active_discover_events/i);
  assert.match(sql, /o\.starts_at < p_end/is);
  assert.match(sql, /coalesce\(o\.ends_at,\s*o\.starts_at\) >= p_start/is);
  assert.match(sql, /row_number\(\) over\s*\(\s*partition by o\.event_id/is);
  assert.match(sql, /o\.status = 'scheduled'/i);
  assert.match(sql, /e\.status = 'published'/i);
});

test("detay RPC geçmiş etkinliği occurrence alanlarıyla erişilebilir tutar", () => {
  assert.match(sql, /get_discover_event_by_slug/i);
  assert.match(sql, /occurrence_id/i);
  assert.match(sql, /time_precision/i);
  assert.match(sql, /occurrence_status/i);
});
