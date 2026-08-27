# Keşfet Gerçek Etkinlik İçe Aktarma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resmî kaynaklardan güncel etkinlikleri idempotent biçimde alan, gerçek kapakları işleyen, eksik kayıtları incelemeye gönderen ve Keşfet arayüzünü gerçek verilerle dolduran production sistemi kurmak.

**Architecture:** Mevcut Python otomasyonuna kaynak adaptörleri, ortak normalizasyon ve görsel hattı eklenir; Supabase migration yaşam döngüsü, import telemetrisi ve Storage sınırlarını sağlar. Vite/React istemcisi yeni alanları mevcut Keşfet ve admin yüzeylerinde kullanır; GitHub Actions zamanlanmış importu ve mevcut Cloudflare Pages dağıtımını çalıştırır.

**Tech Stack:** Python 3.12, requests, BeautifulSoup, Pillow, Supabase Postgres/Storage/RLS, React 19, TypeScript 5.8, Vite 6, Node test runner, pytest, Playwright, GitHub Actions, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-08-27-kesfet-event-import-design.md`

## Global Constraints

- Mevcut `discover_events`, `/kesfet`, `/kesfet/:slug` ve `/yonetim/kesfet` korunur.
- Uydurma etkinlik, tarih, fiyat, indirim veya kapak kullanılmaz; bilinmeyen alan `null` kalır.
- Yalnız resmî ve doğrulanabilir HTTPS kaynakları etkinleştirilir.
- `public/paylasim/setler.json` ve kapsam dışı kullanıcı değişiklikleri korunur.
- Anonim istemci yazamaz; import service-role, yönetim işlemleri mevcut admin sınırından yapılır.
- Geçmiş kayıtlar silinmez; arşivlenir ve genel listeden çıkarılır.
- Yeni bir frontend framework'ü veya Next.js eklenmez.

---

### Task 1: Etkinlik veri modeli, import telemetrisi ve Storage güvenliği

**Files:**
- Create: `supabase/migrations/20260827030000_kesfet_import_pipeline.sql`
- Modify: `src/lib/database.types.ts`
- Test: `tests/kesfet-import-migration.test.mjs`

**Interfaces:**
- Consumes: mevcut `public.discover_events`, `public.is_admin()` ve dokunma trigger'ı
- Produces: `discover_event_sources`, `discover_event_import_runs`, genişletilmiş etkinlik alanları, `event-covers` bucket ve admin kapak RPC'si

- [ ] **Step 1: Write the failing migration contract test**

```js
test('import migration yaşam döngüsü, telemetri ve storage sınırlarını kurar', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /discover_event_sources/i);
  assert.match(sql, /discover_event_import_runs/i);
  assert.match(sql, /original_image_url/i);
  assert.match(sql, /cover_kind/i);
  assert.match(sql, /event-covers/i);
  assert.match(sql, /archived|cancelled|postponed/i);
  assert.match(sql, /revoke insert, update, delete/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/kesfet-import-migration.test.mjs`
Expected: FAIL because `20260827030000_kesfet_import_pipeline.sql` is absent.

- [ ] **Step 3: Implement the migration and generated TypeScript types**

Add lifecycle/status checks, canonical source identity, original/stored image fields, online mode, last-seen timestamps, review metadata, source catalog, per-run counters, unique indexes, public-read RLS and admin-only cover mutation. Create public-read/private-write `event-covers` policies without exposing service credentials.

- [ ] **Step 4: Run the migration contract and existing migration tests**

Run: `node --test tests/kesfet-import-migration.test.mjs tests/kesfet-migration.test.mjs`
Expected: PASS with zero failures.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260827030000_kesfet_import_pipeline.sql src/lib/database.types.ts tests/kesfet-import-migration.test.mjs
git commit -m "Add Kesfet import data model"
```

### Task 2: Normalizasyon, duplicate ve yaşam döngüsü motoru

**Files:**
- Create: `automation/event_import/__init__.py`
- Create: `automation/event_import/domain.py`
- Test: `automation/tests/test_event_import_domain.py`

**Interfaces:**
- Produces: `normalize_event(candidate, source, checked_at) -> NormalizedEvent`, `event_fingerprint(event) -> str`, `lifecycle_for(event, now) -> str`, `merge_event(existing, incoming) -> dict`

- [ ] **Step 1: Write failing domain tests**

```python
def test_same_title_venue_and_start_share_fingerprint():
    assert event_fingerprint(event("İnovasyon Atölyesi")) == event_fingerprint(event("  inovasyon atölyesi "))

def test_unknown_values_remain_none():
    normalized = normalize_event(minimal_candidate(), official_source(), NOW)
    assert normalized.student_price is None
    assert normalized.ends_at is None

def test_finished_event_archives_without_delete():
    assert lifecycle_for(event_with_end("2026-08-26T20:00:00+03:00"), NOW) == "archived"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest automation/tests/test_event_import_domain.py -q`
Expected: FAIL because `automation.event_import.domain` is absent.

- [ ] **Step 3: Implement immutable normalized records and merge rules**

Normalize Turkish whitespace/case, URLs and timezone-aware dates. Prefer source IDs, then canonical URLs, then title/venue/start fingerprints. Preserve existing non-null facts when the incoming source omits them; update explicit cancellation, postponement and date changes.

- [ ] **Step 4: Run domain tests**

Run: `python -m pytest automation/tests/test_event_import_domain.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add automation/event_import automation/tests/test_event_import_domain.py
git commit -m "Add event import domain rules"
```

### Task 3: Resmî kaynak adaptörleri ve kaynak kataloğu

**Files:**
- Create: `automation/event_import/sources.json`
- Create: `automation/event_import/adapters.py`
- Create: `automation/event_import/http.py`
- Test: `automation/tests/fixtures/events/`
- Test: `automation/tests/test_event_source_adapters.py`

**Interfaces:**
- Consumes: source entries with `id`, `name`, `base_url`, `adapter`, `cities`, `official_domains`
- Produces: `fetch_source(config, session) -> list[EventCandidate]`

- [ ] **Step 1: Add saved official-page fixtures and failing parser tests**

```python
def test_json_ld_adapter_extracts_real_fields_without_guessing(load_fixture):
    events = parse_json_ld(load_fixture("json-ld-event.html"), SOURCE_URL)
    assert events[0].title == "Kariyer Fuarı"
    assert events[0].image_url == "https://official.example/cover.jpg"
    assert events[0].student_price is None
```

- [ ] **Step 2: Run adapter tests to verify they fail**

Run: `python -m pytest automation/tests/test_event_source_adapters.py -q`
Expected: FAIL because adapters are absent.

- [ ] **Step 3: Implement JSON-LD, WordPress/event-list and curated-table adapters**

Use bounded timeouts, a StajımVar user agent, robots checks, canonical URL resolution and official-domain allowlists. Add initial source entries for the eight priority cities and national TOBB/Kültür Yolu sources only when the current official page format is verified.

- [ ] **Step 4: Run adapter tests**

Run: `python -m pytest automation/tests/test_event_source_adapters.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add automation/event_import/sources.json automation/event_import/adapters.py automation/event_import/http.py automation/tests/fixtures/events automation/tests/test_event_source_adapters.py
git commit -m "Add official event source adapters"
```

### Task 4: Kapak doğrulama, dönüştürme ve Storage yükleme

**Files:**
- Create: `automation/event_import/images.py`
- Create: `public/kesfet-kapaklari/*.svg`
- Test: `automation/tests/fixtures/images/`
- Test: `automation/tests/test_event_images.py`

**Interfaces:**
- Produces: `select_image(html, page_url) -> str | None`, `validate_image(bytes, content_type) -> ImageInfo`, `render_variants(bytes) -> dict[str, bytes]`, `upload_variants(storage, fingerprint, variants) -> CoverResult`

- [ ] **Step 1: Write failing image-selection and corruption tests**

```python
def test_rejects_tracking_pixel_and_site_logo():
    assert validate_image(TRACKING_PIXEL, "image/gif").accepted is False
    assert choose_candidate([logo_candidate(), event_candidate()]).url.endswith("event.jpg")

def test_outputs_webp_card_and_detail_variants():
    variants = render_variants(VALID_JPEG)
    assert set(variants) == {"card.webp", "detail.webp"}
```

- [ ] **Step 2: Run image tests to verify they fail**

Run: `python -m pytest automation/tests/test_event_images.py -q`
Expected: FAIL because image functions are absent.

- [ ] **Step 3: Implement safe image handling and seven labelled category covers**

Reject non-image MIME, decode errors, dimensions below 320x180, one-pixel assets and known logo/favicon patterns. Produce bounded WebP variants with Pillow, upload by content hash, and return category-cover paths when no real cover passes.

- [ ] **Step 4: Run image tests**

Run: `python -m pytest automation/tests/test_event_images.py -q`
Expected: PASS including broken-image fixtures.

- [ ] **Step 5: Commit**

```bash
git add automation/event_import/images.py automation/tests/test_event_images.py automation/tests/fixtures/images public/kesfet-kapaklari
git commit -m "Add verified Kesfet cover pipeline"
```

### Task 5: İdempotent import komutu ve zamanlanmış çalışma

**Files:**
- Create: `automation/event_import/repository.py`
- Create: `automation/event_import/run.py`
- Create: `.github/workflows/kesfet-import.yml`
- Modify: `automation/requirements.txt`
- Test: `automation/tests/test_event_import_run.py`

**Interfaces:**
- Consumes: Task 1 tables, Task 2 normalized events, Task 3 candidates, Task 4 covers
- Produces: `python -m event_import.run [--dry-run] [--source ID]`, run metrics and idempotent database upserts

- [ ] **Step 1: Write failing orchestration tests with an in-memory repository**

```python
def test_second_run_updates_without_duplicate(fake_repo, source):
    first = run_source(source, fake_repo)
    second = run_source(source, fake_repo)
    assert first.inserted == 1
    assert second.inserted == 0
    assert second.unchanged == 1
    assert len(fake_repo.events) == 1
```

- [ ] **Step 2: Run orchestration tests to verify they fail**

Run: `python -m pytest automation/tests/test_event_import_run.py -q`
Expected: FAIL because runner and repository are absent.

- [ ] **Step 3: Implement repository, metrics and scheduled workflow**

Use service-role only in GitHub Actions, support dry-run without writes, archive only records whose end time is past, and log per-source success/error/found/inserted/updated/unchanged/review counts. Schedule a daily run and allow manual source-scoped dispatch.

- [ ] **Step 4: Run importer tests and a network-bounded dry run**

Run: `python -m pytest automation/tests/test_event_import_run.py automation/tests/test_event_source_adapters.py automation/tests/test_event_images.py -q`
Run: `python -m event_import.run --dry-run --source kultur-istanbul`
Expected: tests PASS; dry-run reports counts and performs zero database writes.

- [ ] **Step 5: Commit**

```bash
git add automation/event_import/repository.py automation/event_import/run.py automation/requirements.txt automation/tests/test_event_import_run.py .github/workflows/kesfet-import.yml
git commit -m "Add scheduled Kesfet importer"
```

### Task 6: Keşfet kartları, koleksiyon tekilleştirme ve admin incelemesi

**Files:**
- Create: `src/components/EventCover.tsx`
- Modify: `src/lib/kesfet.ts`
- Modify: `src/lib/kesfet-domain.mjs`
- Modify: `src/components/KesfetPage.tsx`
- Modify: `src/components/KesfetDetailPage.tsx`
- Modify: `src/components/AdminDiscoverView.tsx`
- Test: `tests/kesfet-domain.test.mjs`
- Test: `e2e/kesfet.spec.ts`

**Interfaces:**
- Consumes: stored cover fields, lifecycle, online mode, import review metadata
- Produces: `EventCover`, duplicate-free `buildDiscoverCollections(events, context)`, admin cover/review controls

- [ ] **Step 1: Write failing collection and fallback tests**

```js
test('bir etkinlik koleksiyonlarda yalnızca bir kez görünür', () => {
  const collections = buildDiscoverCollections([freeCareerEvent], { city: 'İstanbul', now: NOW });
  assert.equal(collections.flatMap((x) => x.events).filter((x) => x.id === freeCareerEvent.id).length, 1);
});
```

Add Playwright assertions that a broken remote cover switches to its category cover and each card keeps a 16:9 cover box.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `node --test tests/kesfet-domain.test.mjs`
Run: `npx playwright test e2e/kesfet.spec.ts --project=chromium`
Expected: duplicate and fallback assertions FAIL.

- [ ] **Step 3: Implement UI and admin changes**

Add loading skeleton, `onError` category fallback, 16:9 responsive cover, visible price state, online location, import review badges and cover override controls. Build collections in `Bu Hafta`, `Şehrindekiler`, `Ücretsiz`, `Kariyer`, `Kültür-Sanat` order while consuming each event at most once.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `node --test tests/kesfet-domain.test.mjs`
Run: `npx playwright test e2e/kesfet.spec.ts --project=chromium`
Run: `npx tsc --noEmit`
Expected: PASS with zero failures.

- [ ] **Step 5: Commit**

```bash
git add src/components/EventCover.tsx src/components/KesfetPage.tsx src/components/KesfetDetailPage.tsx src/components/AdminDiscoverView.tsx src/lib/kesfet.ts src/lib/kesfet-domain.mjs tests/kesfet-domain.test.mjs e2e/kesfet.spec.ts
git commit -m "Upgrade Kesfet event cards and review UI"
```

### Task 7: Production import, responsive doğrulama ve dağıtım

**Files:**
- Modify only if generated by existing scripts: `public/sitemap.xml`

**Interfaces:**
- Consumes: completed migrations, GitHub secrets, import workflow and Cloudflare Pages deploy workflow
- Produces: live imported events, image coverage counts and deployment evidence

- [ ] **Step 1: Run full relevant verification**

Run: `python -m pytest automation/tests -q`
Run: `npm test`
Run: `npx tsc --noEmit`
Run: `npm run build`
Expected: all commands exit 0; report unrelated pre-existing failures separately if present.

- [ ] **Step 2: Apply migration with the existing production Supabase workflow**

Trigger `.github/workflows/supabase-production.yml` from the committed branch and wait for terminal success. Verify the new columns, tables, policies and `event-covers` bucket with read-only SQL.

- [ ] **Step 3: Run the real importer**

Trigger `.github/workflows/kesfet-import.yml` without `dry_run`. Record total imported, updated, review, real-cover and category-cover counts. Run it a second time and verify inserted count is zero for unchanged sources.

- [ ] **Step 4: Deploy through the existing workflow**

Push the integrated commits to `main`, trigger `.github/workflows/dagit.yml`, wait for Cloudflare Pages upload success and record the deployment URL/commit.

- [ ] **Step 5: Verify live responsive behavior**

Open `/kesfet` at widths 375, 768 and 1440; verify collection uniqueness, cover aspect ratio, skeleton/fallback behavior, filters and at least one detail route. Check image requests for non-2xx responses.

- [ ] **Step 6: Report only the requested headings**

Use exactly: `STATUS`, `EVENTS IMPORTED`, `IMAGE COVERAGE`, `SOURCES`, `IMPLEMENTED`, `VALIDATION`, `DEPLOY`, `BLOCKERS`.
