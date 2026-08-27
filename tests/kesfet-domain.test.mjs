import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let domain = {};
try {
  domain = await import('../src/lib/kesfet-domain.mjs');
} catch {}

test('yayındaki gelecek etkinlik görünür, biten etkinlik listeden elenir', () => {
  assert.equal(typeof domain.isDiscoverEventVisible, 'function');
  const now = new Date('2026-08-27T09:00:00+03:00');
  assert.equal(domain.isDiscoverEventVisible({ status: 'published', endsAt: '2026-08-27T12:00:00+03:00' }, now), true);
  assert.equal(domain.isDiscoverEventVisible({ status: 'published', endsAt: '2026-08-27T08:00:00+03:00' }, now), false);
  assert.equal(domain.isDiscoverEventVisible({ status: 'draft', endsAt: '2026-08-28T12:00:00+03:00' }, now), false);
});

test('bugün, hafta ve ay filtreleri Türkiye takvimine göre çalışır', () => {
  assert.equal(typeof domain.matchesDiscoverDateFilter, 'function');
  const now = new Date('2026-08-27T09:00:00+03:00');
  const today = { startsAt: '2026-08-27T20:00:00+03:00' };
  const nextWeek = { startsAt: '2026-09-02T20:00:00+03:00' };
  assert.equal(domain.matchesDiscoverDateFilter(today, 'today', now), true);
  assert.equal(domain.matchesDiscoverDateFilter(nextWeek, 'week', now), true);
  assert.equal(domain.matchesDiscoverDateFilter(nextWeek, 'month', now), false);
});

test('yönetim formu zorunlu alanları ve güvenli HTTPS adreslerini doğrular', () => {
  assert.equal(typeof domain.validateDiscoverDraft, 'function');
  const errors = domain.validateDiscoverDraft({ title: '', slug: 'Bozuk Slug', sourceUrl: 'http://localhost/a' });
  assert.ok(errors.title);
  assert.ok(errors.slug);
  assert.ok(errors.sourceUrl);
});

test('Keşfet liste ve detay adresleri production yönlendirmesine kayıtlıdır', async () => {
  const [onrender, middleware] = await Promise.all([
    readFile(new URL('../scripts/onrender.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../functions/_middleware.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(onrender, /\['\/kesfet',\s*'Öğrenci Rotası/);
  assert.match(middleware, /['"]\/kesfet\/['"]/);
});
