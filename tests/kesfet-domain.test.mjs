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

test('öğrenci uygunluk puanı fiyat ve güvenilir kaynağı yüksek etkinliği öne çıkarır', () => {
  assert.equal(typeof domain.calculateStudentFitScore, 'function');
  const freeOfficial = domain.calculateStudentFitScore({ isFree: true, sourceTrustScore: 95, lastVerifiedAt: '2026-08-27T08:00:00Z', targetAudiences: ['student'], diversityScore: 70 }, { now: new Date('2026-08-27T09:00:00Z') });
  const expensiveUnknown = domain.calculateStudentFitScore({ regularPrice: 1500, studentPrice: 1500, sourceTrustScore: 20, targetAudiences: ['general'], diversityScore: 20 }, { now: new Date('2026-08-27T09:00:00Z') });
  assert.ok(freeOfficial.total > expensiveUnknown.total);
  assert.ok(freeOfficial.total <= 100);
});

test('eksik puan sinyalleri mevcut ağırlıkları kendi içinde normalize eder', () => {
  const score = domain.calculateStudentFitScore({ isFree: true });
  assert.equal(score.total, 100);
  assert.deepEqual(Object.keys(score.components), ['price']);
});

test('yalnızca dolu koleksiyonlar üretilir ve seçkiler puana göre sıralanır', () => {
  assert.equal(typeof domain.buildDiscoverCollections, 'function');
  const now = new Date('2026-08-27T12:00:00+03:00');
  const events = [
    { id:'a', startsAt:'2026-08-27T19:00:00+03:00', endsAt:'2026-08-27T22:00:00+03:00', isFree:true, studentFitScore:92, verificationStatus:'verified' },
    { id:'b', startsAt:'2026-08-27T20:00:00+03:00', endsAt:'2026-08-27T22:00:00+03:00', studentPrice:80, studentFitScore:70 },
  ];
  const collections = domain.buildDiscoverCollections(events, now);
  assert.ok(collections.length > 0);
  assert.equal(collections.some((x) => x.events.length === 0), false);
  assert.equal(collections.find((x) => x.id === 'tonight').events[0].id, 'a');
});
