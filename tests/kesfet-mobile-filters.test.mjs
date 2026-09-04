import test from 'node:test';
import assert from 'node:assert/strict';

// Mobile interactions are exercised in e2e/kesfet-catalog.spec.ts.
// These tests protect the catalog's real page merging and transient return state.
let state = {};
try { state = await import('../src/components/kesfet-catalog-state.mjs'); } catch {}

test('overlapping pages produce one card per event while retaining server order', () => {
  assert.equal(typeof state.mergeCatalogEvents, 'function');
  const result = state.mergeCatalogEvents(
    [{ id: 'a', title: 'First' }, { id: 'b', title: 'Second' }],
    [{ id: 'b', title: 'Repeated second' }, { id: 'c', title: 'Third' }, { id: 'c', title: 'Repeated third' }],
  );
  assert.deepEqual(result.map((row) => row.id), ['a', 'b', 'c']);
  assert.equal(result[1].title, 'Second');
});

test('detail return restores filters, loaded pages and scroll only to the originating history entry', () => {
  assert.equal(typeof state.saveCatalogReturn, 'function');
  const entry = { filters: { city: 'Ankara' }, events: [{ id: 'a' }], scrollY: 1750 };
  state.saveCatalogReturn('catalog-a', entry, 1000);
  assert.deepEqual(state.readCatalogReturn('catalog-a', 2000), entry);
  assert.equal(state.readCatalogReturn('unrelated-entry', 2000), null);
  assert.equal(state.readCatalogReturn(undefined, 2000), null);
});

test('expired detail state is re-fetched instead of hiding new records indefinitely', () => {
  assert.equal(typeof state.saveCatalogReturn, 'function');
  state.saveCatalogReturn('catalog-a', { events: [{ id: 'old' }] }, 1000);
  assert.equal(state.readCatalogReturn('catalog-a', 302000), null);
  state.saveCatalogReturn('catalog-b', { events: [{ id: 'new' }] }, 303000);
  assert.equal(state.readCatalogReturn('catalog-a', 303001), null);
  assert.deepEqual(state.readCatalogReturn('catalog-b', 303001), { events: [{ id: 'new' }] });
});
