# Keşfet Occurrences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keşfet etkinliklerini ayrı seanslarla modellemek, tarih filtrelerini aralık kesişimiyle düzeltmek ve kaynakta geçici kaybolan seansları üç başarılı tarama boyunca güvenle korumak.

**Architecture:** `discover_events` ortak içeriği korur; yeni `discover_event_occurrences` her seansı ve yaşam döngüsünü taşır. Public RPC etkinlik başına geçerli/sonraki tek seansı döndürür; importer ana etkinlik ve occurrence kayıtlarını ayrı upsert eder.

**Tech Stack:** PostgreSQL/Supabase RLS ve RPC, Python importer, React/TypeScript, Node test runner, pytest.

**Spec:** `docs/superpowers/specs/2026-08-28-kesfet-occurrences-design.md`

## Global Constraints

- Mevcut `discover_events` kayıtları ve admin CRUD akışı korunacak.
- Migration idempotent olacak ve mevcut etkinlik başına duplicate olmayan bir occurrence oluşturacak.
- Tarih sınırları `Europe/Istanbul` takviminde hesaplanacak.
- Anon kullanıcı occurrence tablosuna yazamayacak.
- Başarısız veya kısmi tarama kayıp sayısını artırmayacak.
- `public/paylasim/setler.json` dahil kullanıcı değişikliklerine dokunulmayacak.
- Yeni paket eklenmeyecek.

---

### Task 1: Tarih aralığı kesişim mantığı

**Files:**
- Modify: `src/lib/kesfet-domain.mjs`
- Modify: `tests/kesfet-domain.test.mjs`

**Interfaces:**
- Produces: `discoverFilterRange(filter: string, now: Date): { start: Date, end: Date } | null`
- Produces: `matchesDiscoverDateFilter(event, filter, now)` using interval overlap.

- [ ] **Step 1: Write failing overlap tests**

Add cases proving an event started earlier but ending today matches `today`, and a prior-month event extending into the current month matches `month`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/kesfet-domain.test.mjs`
Expected: continuing-event assertions fail.

- [ ] **Step 3: Implement Istanbul filter ranges and overlap**

Use exclusive filter end and inclusive event end:

```js
return start < range.end && (end || start) >= range.start;
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test tests/kesfet-domain.test.mjs`
Commit: `Fix Kesfet date range overlap`

### Task 2: Occurrence migration and public RPC

**Files:**
- Create: `supabase/migrations/20260828020000_discover_event_occurrences.sql`
- Modify: `tests/kesfet-migration.test.mjs`

**Interfaces:**
- Produces table: `public.discover_event_occurrences`
- Produces RPC: `public.list_active_discover_events(p_start timestamptz default null, p_end timestamptz default null)`
- Produces RPC: updated `public.get_discover_event_by_slug(p_slug text)` with occurrence fields.

- [ ] **Step 1: Add failing migration assertions**

Assert occurrence statuses, time precision constraint, unique source identity, public overlap predicate, RLS, missing-run fields, and active occurrence selection.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/kesfet-migration.test.mjs`
Expected: new migration file/table/RPC assertions fail.

- [ ] **Step 3: Create idempotent migration**

Create the occurrence table, indexes and RLS. Backfill with `insert ... select ... on conflict do nothing`; infer `date_only` for midnight timestamps and `exact` otherwise. Define a security-invoker public list function that returns only published events with scheduled overlapping occurrences, choosing `row_number() over (partition by event_id order by currently_active desc, starts_at)`.

- [ ] **Step 4: Keep detail history available**

Update detail RPC so expired events remain readable while occurrences include `time_precision` and status.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/kesfet-migration.test.mjs`
Commit: `Add Kesfet occurrence data model`

### Task 3: Frontend occurrence mapping and clock precision

**Files:**
- Modify: `src/lib/kesfet.ts`
- Modify: `src/components/KesfetPage.tsx`
- Modify: `src/components/KesfetDetailPage.tsx`
- Create: `tests/kesfet-time-precision.test.mjs`

**Interfaces:**
- Extends `DiscoverEvent`: `occurrenceId?: string`, `timePrecision: "exact" | "date_only" | "recurring" | "ongoing"`.
- Produces: `formatDiscoverDate(event): string` exported from `kesfet-domain.mjs` or a focused formatter module.

- [ ] **Step 1: Write failing formatting tests**

Assert `date_only` output lacks `00:00`, `exact` includes time, and `ongoing` includes “Devam ediyor”.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/kesfet-time-precision.test.mjs`

- [ ] **Step 3: Switch public fetch to RPC and map occurrence fields**

Call `list_active_discover_events` with nullable range parameters; preserve admin table reads.

- [ ] **Step 4: Use the precision-aware formatter in cards and detail**

Do not render fabricated midnight times.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test tests/kesfet-time-precision.test.mjs && npx tsc --noEmit`
Commit: `Show Kesfet occurrence dates accurately`

### Task 4: Importer occurrence domain and upsert

**Files:**
- Modify: `automation/event_import/domain.py`
- Modify: `automation/event_import/repository.py`
- Modify: `automation/event_import/run.py`
- Modify: `automation/tests/test_event_import_domain.py`
- Modify: `automation/tests/test_event_import_run.py`

**Interfaces:**
- Produces dataclass: `EventOccurrence(source_occurrence_id, starts_at, ends_at, time_precision, explicit_status)`.
- Produces repository method: `upsert_occurrence(event_id, occurrence, checked_at) -> str`.
- Produces repository method: `reconcile_missing_occurrences(source, seen_ids, run_complete) -> int`.

- [ ] **Step 1: Write failing normalization and upsert tests**

Cover stable occurrence fingerprint, `date_only` inference, one event with multiple sessions, and unchanged second run.

- [ ] **Step 2: Verify RED**

Run: `python -m pytest automation/tests/test_event_import_domain.py automation/tests/test_event_import_run.py -q`

- [ ] **Step 3: Add occurrence domain without breaking single-date adapters**

Existing `starts_at/ends_at` candidates are converted to a one-item occurrence tuple.

- [ ] **Step 4: Upsert event then occurrences**

Return the event id from the event upsert; occurrence identity uses source occurrence id when available and deterministic normalized dates otherwise.

- [ ] **Step 5: Verify GREEN and commit**

Run the focused pytest command.
Commit: `Import Kesfet event occurrences`

### Task 5: Three-run missing lifecycle

**Files:**
- Modify: `automation/event_import/repository.py`
- Modify: `automation/event_import/run.py`
- Modify: `automation/tests/test_event_import_run.py`

**Interfaces:**
- Consumes: occurrence identities seen during a successful run.
- Produces: missing count transitions `0 -> 1 -> 2 -> archived` and immediate explicit cancellation.

- [ ] **Step 1: Write failing lifecycle tests**

Test first and second misses preserve `scheduled`; third successful miss archives; failed/partial runs do not increment; explicit cancellation is immediate.

- [ ] **Step 2: Verify RED**

Run: `python -m pytest automation/tests/test_event_import_run.py -q`

- [ ] **Step 3: Implement reconciliation after complete source runs only**

Archive expired occurrences independently of missing-source reconciliation. Update run metrics with missing and archived occurrence counts.

- [ ] **Step 4: Verify GREEN and commit**

Run focused importer tests.
Commit: `Harden Kesfet missing occurrence lifecycle`

### Task 6: Integrated validation, migration and deployment

**Files:**
- Modify only files required by failures discovered in this task.

**Interfaces:**
- Consumes all previous deliverables.
- Produces deployed schema/application and live evidence.

- [ ] **Step 1: Run complete local verification**

Run:

```powershell
npm test
npx tsc --noEmit
python -m pytest automation/tests -q
git diff --check
```

- [ ] **Step 2: Commit any targeted fixes and push `main`**

Preserve `public/paylasim/setler.json`.

- [ ] **Step 3: Apply migration using the existing production release path**

Do not expose Supabase secrets. Confirm the migration version and resulting table/RPC read-only before claiming success.

- [ ] **Step 4: Run the KÜLTÜR.İSTANBUL importer twice**

First run verifies backfill/upsert; second proves zero duplicate occurrences and unchanged metrics.

- [ ] **Step 5: Verify live behavior**

At 375, 768 and 1440 pixels verify: continuing events match relevant filters, expired cards are absent, `date_only` shows no `00:00`, one event is not duplicated across its sessions, and detail history remains accessible.

- [ ] **Step 6: Report evidence and blockers**

Separate tested, deployed and live-verified facts. Do not claim future source connectors were implemented.
