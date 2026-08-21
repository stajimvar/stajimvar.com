# Öğrenci Fırsatları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a truthful, secure, standalone opportunities tracker without changing internship behavior.

**Architecture:** Supabase stores controlled opportunity records and private saves; a shared React module queries and renders each route. URL-driven filters and profile matching are pure client functions over RLS-filtered published rows.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, Supabase/Postgres, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-08-21-ogrenci-firsatlari-design.md`

## Global Constraints

- No seed/demo opportunities, fabricated organizations, amounts, statistics, or empty-state cards.
- Preserve existing listings, applications, profiles, filters, and home behavior.
- Accept only HTTPS source/application URLs; keep keys and service-role access off the client.
- Deploy only after typecheck, tests, and production build pass.

### Task 1: Database contract and access layer

**Files:**
- Create: `supabase/migrations/0018_student_opportunities.sql`
- Modify: `src/lib/database.types.ts`, `src/types.ts`, `src/lib/queries/index.ts`
- Test: `tests/opportunity-domain.test.mjs`

- [ ] Write a failing domain test for HTTPS links, expiry classification, filter query serialization, and conservative profile matching.
- [ ] Run `node --test tests/opportunity-domain.test.mjs` and confirm the missing module failure.
- [ ] Implement the pure domain module and Supabase query/save functions.
- [ ] Run the domain test again and confirm it passes.

### Task 2: Shared opportunity UI and routing

**Files:**
- Create: `src/components/OpportunitiesPage.tsx`, `src/components/OpportunityDetailPage.tsx`
- Modify: `src/App.tsx`, `src/components/Header.tsx`, `scripts/onrender.mjs`, `automation/sitemap.py`
- Test: `tests/opportunity-domain.test.mjs`

- [ ] Route all requested paths through shared data/UI components.
- [ ] Add responsive cards, truthful empty/loading/error states, accessible controls, HTTPS external CTA, and document metadata.
- [ ] Render compact active opportunities on the home page only if query data exists.
- [ ] Run typecheck and production build.

### Task 3: Verification and release

**Files:**
- Modify only files identified by validation failures.

- [ ] Run typecheck, domain tests, and production build.
- [ ] Inspect migration SQL for RLS, uniqueness, URL guards, and no anonymous write path.
- [ ] Commit only feature files, then deploy only when the existing deployment credentials and method are available.
