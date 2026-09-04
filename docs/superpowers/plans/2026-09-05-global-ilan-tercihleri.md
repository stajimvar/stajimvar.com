# StajımVar Global İlan ve Dil Tercihleri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** StajımVar ilanlarını doğrulanmış ISO ülke verisi, bağımsız dil/ülke tercihleri, paylaşılabilir ülke filtresi ve ölçeklenebilir sunucu sorgusuyla global kullanıma hazırlamak.

**Architecture:** Additive Supabase migration mevcut profil ve ilan tablolarını genişletir; ortak saf normalizasyon ve tercih çözücüleri doğruluğu merkezi tutar. Cloudflare Pages Function yalnız ülke tahmini verir; React ülke seçici URL/tarayıcı/hesap önceliğini uygular, profil kaydı ise bundan bağımsızdır. Mevcut mapper, detay ve başvuru yolları korunur.

**Tech Stack:** React 19, TypeScript, Vite, Supabase/PostgreSQL, Cloudflare Pages Functions, Python importer, Node test runner, PGlite, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-05-global-ilan-tercihleri-design.md`

## Global Constraints

- Branch `codex/global-hazirlik`, base `552966b`; etkinlik-yolu dosyaları kapsam dışıdır.
- `city` ve `work_type` yeniden oluşturulmaz; `country=remote` yalnız `work_type='Remote'` kullanır.
- `country_code is null` Remote veya herhangi bir ülke değildir.
- Ülke önceliği kesin olarak URL → tarayıcı kaydı → hesap tercihleri → locale → Cloudflare → TR'dir.
- Bilinmeyen ülke, dil, vize ve uluslararası başvuru değeri `NULL` kalır.
- Facet ve sayılar yalnız gerçek yayınlanmış ilanlardan gelir.
- Ülke seçicide gezinmek kalıcı profili değiştirmez.
- Mevcut RLS, ilan detayı, kaydetme ve başvuru akışları korunur.
- Yeni bağımlılık veya ücretli çeviri servisi eklenmez.

---

### Task 1: Ortak ISO doğrulama, ülke çıkarımı ve tercih çözümü

**Files:**
- Create: `src/lib/global-preferences.mjs`
- Create: `tests/global-preferences.test.mjs`
- Create: `automation/country_normalization.py`
- Create: `automation/tests/test_country_normalization.py`

**Interfaces:**
- Produces JS: `normalizeCountryCode`, `normalizeLanguageCode`, `countryFromLocale`, `resolveListingCountry`, `readCountryQuery`, `writeCountryQuery`.
- Produces Python: `infer_country_code(structured_country=None, location=None, title=None) -> str | None`.
- Allowed selection values are ISO alpha-2 codes plus lowercase `all|remote`.

- [ ] Write Node tests with literal expectations for URL/storage/account/locale/Cloudflare precedence, invalid values, `all`, `remote`, and language independence.
- [ ] Run `node --test tests/global-preferences.test.mjs`; verify RED because the module is absent.
- [ ] Implement the minimal JS validators/resolver and URL helpers; rerun to GREEN.
- [ ] Write Python tests for Istanbul/Ankara→TR, Berlin→DE, Paris→FR, explicit ISO, conflicting strong signals, Remote/Global/blank, and title-only weak signals.
- [ ] Run `python -m unittest automation.tests.test_country_normalization`; verify RED, implement the shared pure normalizer, rerun GREEN.
- [ ] Commit only these four files with `Global tercih ve ülke normalizasyonunu ekle`.

### Task 2: Additive schema, safe backfill, RLS and scalable catalog

**Files:**
- Create: `supabase/migrations/20260919010000_global_listing_preferences.sql`
- Create: `tests/global-listings-sql.test.mjs`
- Modify: `scripts/sql/disposable-security-tests.sql`
- Modify: `tests/ilan-kolon-yetkileri.test.mjs`

**Interfaces:**
- Adds `profiles.interface_language`, `profiles.content_language`, `profiles.home_country`.
- Adds `student_profiles.preferred_job_countries`.
- Adds nullable `listings.country_code`, `original_language`, `international_applicants`, `visa_sponsorship`.
- Produces RPC `get_published_listings_catalog(p_country text,p_cursor_posted_at timestamptz,p_cursor_id uuid,p_snapshot timestamptz)` returning `{listings,facets,hasMore,nextCursor,snapshot}` with 24+1 keyset paging.

- [ ] Write PGlite tests that apply existing schema then expect the new columns/RPC; verify RED.
- [ ] Add range/format constraints, duplicate-free preferred-country constraint, column grants, partial `(country_code,posted_at desc,id)` published index, and keep existing RLS policies unchanged.
- [ ] Implement SQL backfill only for unambiguous existing location values using explicit normalized city/location mappings; never read title, never assign Remote/Global/unknown.
- [ ] Implement catalog filters: ISO exact country, `all`, and `remote` as exact `work_type='Remote'`; assert a NULL on-site row never enters Remote.
- [ ] Insert 1,237 fixtures and page to completion; assert no hard cap/duplicates and facets count only published non-null countries.
- [ ] Extend disposable role tests so each user updates only their own preference columns and cannot change role/another row; anon cannot update.
- [ ] Run `node --test tests/global-listings-sql.test.mjs tests/ilan-kolon-yetkileri.test.mjs`; verify GREEN and unchanged listing grants.
- [ ] Commit scoped SQL/tests with `Global ilan semasini ve katalog sorgusunu ekle`.

### Task 3: Importer and application data boundary

**Files:**
- Modify: `automation/scraper.py`
- Modify: `automation/repository.py`
- Modify: `automation/promote.py`
- Modify: `automation/kariyer_html_kosu.py`
- Modify: `automation/tests/test_scraper.py`
- Modify: `automation/tests/test_kariyer_html.py`
- Modify: `src/types.ts`
- Modify: `src/lib/database.types.ts`
- Modify: `src/lib/queries/mappers.ts`
- Modify: `src/lib/queries/index.ts`
- Create: `tests/global-listings-client.test.mjs`

**Interfaces:**
- `Job` retains structured country/location evidence without guessing.
- Promotion and direct importer call `infer_country_code` and write nullable `country_code`.
- `InternshipListing` adds nullable `countryCode`, `originalLanguage`, `internationalApplicants`, `visaSponsorship`.
- `fetchPublishedListingsCatalog(country,cursor,snapshot)` calls the new RPC; existing detail fetch remains ID-based.

- [ ] Add failing importer tests proving promotion/direct import use the shared normalizer and preserve NULL for Remote/ambiguous input.
- [ ] Extend importer payloads minimally; run Python tests GREEN.
- [ ] Add failing mapper/client tests for nullable fields, exact RPC parameters, cursor precision, malformed response rejection, and no full-list fallback.
- [ ] Update generated-compatible DB types manually for the migration, readable column whitelist, mapper and catalog function; keep `fetchListingByIdPrefix` behavior unchanged.
- [ ] Run focused Node/Python tests and `npm run lint`; commit with `Global ilan verisini istemci ve importera bagla`.

### Task 4: Cloudflare visitor context and preference state

**Files:**
- Create: `functions/api/visitor-context.ts`
- Create: `tests/visitor-context.test.mjs`
- Create: `src/components/useGlobalListingPreferences.ts`
- Create: `tests/global-listing-state.test.mjs`

**Interfaces:**
- Pages Function GET returns `{countryCode:string|null}` and never returns/logs IP.
- Hook returns `{country,interfaceLanguage,setCountry,catalogPhase,listings,facets,loadMore,retry}`.
- Storage key is versioned and stores only a validated country selection.

- [ ] Write failing function tests for FR/TR/invalid/missing `request.cf.country`, JSON headers, and absence of IP-derived fields.
- [ ] Implement the stateless Pages Function; verify GREEN.
- [ ] Write failing pure coordinator tests for exact precedence, initial async Cloudflare fallback, stale request abort, URL refresh/popstate, and preserving browser selection on profile failure.
- [ ] Implement hook around Task 1 resolver and Task 3 catalog boundary; use `replaceState` for canonicalization and do not update profile.
- [ ] Run focused tests/lint; commit with `Ziyaretci ulkesi ve global filtre durumunu ekle`.

### Task 5: Country selector and listing-page integration

**Files:**
- Create: `src/components/ListingCountrySelector.tsx`
- Modify: `src/components/MatchedInternshipsView.tsx`
- Modify: `src/App.tsx`
- Modify: `e2e/ilan-global-filtre.spec.ts`
- Modify: `tests/header-active-route.test.mjs` only if route assertions require it.

**Interfaces:**
- Selector consumes only current selection and server facets; emits a temporary country selection.
- Removes text-based `global` category matching; no title/city heuristic remains.

- [ ] Write failing E2E at 375px and desktop for dynamic country options, FR selection, `all`, exact Remote behavior, NULL exclusion, URL refresh/back and Turkish UI with FR country.
- [ ] Implement selector with 44px target, accessible label and real facet counts; current selection remains visible even with zero results.
- [ ] Replace full-list load on the listing surface with the global hook/catalog pages while retaining detail/apply callbacks and truthful error states.
- [ ] Remove the old “Yurtdışı / Global” category and its Berlin/Almanya/title heuristics.
- [ ] Run focused Chromium/WebKit mobile plus desktop E2E and lint; commit with `Ilanlara global ulke seciciyi bagla`.

### Task 6: Profile language and ordered multi-country preferences

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/queries/mappers.ts`
- Modify: `src/lib/queries/index.ts`
- Modify: `src/components/StudentProfileView.tsx`
- Modify: `src/components/ProfilTamamla.tsx` only if its optional completion surface can accept the controls without changing required completion.
- Create: `tests/global-profile-preferences.test.mjs`
- Modify: `e2e/ilan-global-filtre.spec.ts`

**Interfaces:**
- `StudentProfile` exposes `interfaceLanguage`, `contentLanguage`, `homeCountry`, and ordered `preferredJobCountries` without merging them into browsing state.
- Existing `updateStudentProfile` splits profile/student columns and writes only authenticated user's row.

- [ ] Write failing mapper/split-update tests for nullable language/home values, ordered countries, ISO validation, duplicates, and unchanged existing preference fields.
- [ ] Update mapper/query types and implement minimal validation; verify GREEN.
- [ ] Add optional accessible Language and Internship Countries controls to the existing preference section; order follows selection order and removal preserves remaining order.
- [ ] Assert E2E that saving profile preferences does not change the current URL country and browsing does not call profile update.
- [ ] Run focused tests/lint; commit with `Profile global dil ve ulke tercihlerini ekle`.

### Task 7: Regression, responsive and completion verification

**Files:**
- Modify only files from Tasks 1–6 when a failing acceptance test proves a defect.

**Interfaces:** No new interfaces.

- [ ] Run importer suites: `python -m unittest automation.tests.test_country_normalization automation.tests.test_scraper automation.tests.test_kariyer_html`.
- [ ] Run focused Node/SQL suites including global preferences, catalog, mapper, URL, column grants, and application flow tests.
- [ ] Run Playwright at 375px Chromium/WebKit and desktop Chromium; inspect screenshots and assert no horizontal overflow.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`; on Windows prepend `C:\Program Files\Git\bin` only for tests requiring `bash`.
- [ ] Compare `552966b...HEAD`; verify no event-roadmap files, generated social images, `.env`, or unrelated changes.
- [ ] Use `superpowers:verification-before-completion`, then `superpowers:finishing-a-development-branch`; report implementation without deploying because production release was not requested.
