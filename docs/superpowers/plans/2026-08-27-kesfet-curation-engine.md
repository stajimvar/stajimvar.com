# Keşfet Curation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keşfet etkinliklerini doğrulanmış kaynak, öğrenci uygunluk puanı ve boş olmayan dinamik koleksiyonlarla sıralamak.

**Architecture:** Mevcut `discover_events` tablosu güvenli bir ek migration ile genişletilir. Puanlama ve koleksiyon seçimi saf domain fonksiyonlarında tutulur; public sayfa bu sonuçları kullanır, yönetim formu doğrulama alanlarını mevcut admin RPC sınırından yazar.

**Tech Stack:** React 18, TypeScript, Supabase/PostgreSQL, Node test runner, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-08-27-kesfet-student-curation-design.md`

## Global Constraints

- Gerçek veya uydurma etkinlik ekleme.
- Yeni npm paketi ekleme.
- Ziyaretçi yalnızca yayındaki ve aktif etkinlikleri görsün.
- Yazma işlemleri `is_admin()` kontrollü security-definer RPC sınırında kalsın.
- `public/paylasim/setler.json` kullanıcı değişikliğine dokunma.

---

### Task 1: Puanlama ve koleksiyon domain'i

**Files:**
- Modify: `src/lib/kesfet-domain.mjs`
- Modify: `tests/kesfet-domain.test.mjs`

**Interfaces:**
- Produces: `calculateStudentFitScore(event, context?) -> { total, components }`
- Produces: `buildDiscoverCollections(events, now?) -> Array<{ id, title, events }>`

- [ ] **Step 1: Write failing tests** for weighted score ordering, missing-signal normalization and empty collection omission.
- [ ] **Step 2: Run** `node --test tests/kesfet-domain.test.mjs` and confirm failures.
- [ ] **Step 3: Implement** price/interest/trust/proximity/popularity/diversity scoring and the eight collection predicates from the spec.
- [ ] **Step 4: Run** the domain test and confirm all cases pass.
- [ ] **Step 5: Commit** domain and test files.

### Task 2: Safe database expansion

**Files:**
- Create: `supabase/migrations/20260827020000_kesfet_curation.sql`
- Modify: `tests/kesfet-migration.test.mjs`

**Interfaces:**
- Produces: new curation columns on `public.discover_events`
- Produces: `public.discover_event_fingerprint(text,text,timestamptz)`
- Produces: updated admin create/update RPCs accepting the added JSON fields

- [ ] **Step 1: Write failing migration assertions** for verification fields, score constraints, fingerprint unique index and admin-only writes.
- [ ] **Step 2: Run** `node --test tests/kesfet-migration.test.mjs` and confirm failures.
- [ ] **Step 3: Add an idempotent migration** with nullable/defaulted fields, checks, generated fingerprint trigger, unique index and RPC replacements.
- [ ] **Step 4: Run** migration tests and confirm pass.
- [ ] **Step 5: Commit** migration and tests.

### Task 3: Public collections and trust signals

**Files:**
- Modify: `src/lib/kesfet.ts`
- Modify: `src/components/KesfetPage.tsx`
- Modify: `src/components/KesfetDetailPage.tsx`

**Interfaces:**
- Consumes: score and collection domain functions from Task 1
- Consumes: curation database fields from Task 2
- Produces: score-ordered list, non-empty collection rows and verification labels

- [ ] **Step 1: Extend TypeScript mapping** with verification, audience, pricing and score fields.
- [ ] **Step 2: Render only non-empty collections** above the main results grid, reusing the existing event card.
- [ ] **Step 3: Add official-source/last-checked text** to cards and detail without exposing internal review data.
- [ ] **Step 4: Run** `npm run lint` and fix only related type errors.
- [ ] **Step 5: Commit** public UI files.

### Task 4: Admin curation fields

**Files:**
- Modify: `src/components/AdminDiscoverView.tsx`

**Interfaces:**
- Consumes: extended `DiscoverEvent` and existing admin RPC clients
- Produces: editable source type, trust, verification, deadline, terms, age, registration, audience and interest fields

- [ ] **Step 1: Add form controls** for all new fields and map them to snake_case RPC payload keys.
- [ ] **Step 2: Show score and verification state** in the admin list.
- [ ] **Step 3: Run** `npm run lint` and the two Keşfet test files.
- [ ] **Step 4: Commit** the admin UI.

### Task 5: Production verification and release

**Files:**
- No new source files expected.

- [ ] **Step 1: Run** `node --test tests/kesfet-domain.test.mjs tests/kesfet-migration.test.mjs`.
- [ ] **Step 2: Run** `npm run lint` and `npm run build` with the existing production-secret workflow.
- [ ] **Step 3: Push `main`** while preserving the unrelated user change.
- [ ] **Step 4: Apply only** `20260827020000_kesfet_curation.sql` in the production Supabase SQL Editor.
- [ ] **Step 5: Verify** table columns/policies/functions with a read-only query and confirm live `/kesfet` returns HTTP 200 with the collections code deployed.
