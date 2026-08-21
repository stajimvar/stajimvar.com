import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOpportunityAdminDraft, slugifyOpportunity, normalizeStringList } from '../src/lib/opportunity-admin-domain.mjs';

test('rejects dangerous source URLs and dates in the wrong order', () => {
  const errors = validateOpportunityAdminDraft({ title: 'Burs', organizationName: 'Kurum', opportunityType: 'scholarship', description: 'Açıklama', sourceUrl: 'https://localhost/admin', applicationStartAt: '2026-09-02T00:00:00Z', applicationDeadline: '2026-09-01T00:00:00Z' });
  assert.match(errors.sourceUrl, /güvenli bir HTTPS/i);
  assert.match(errors.applicationStartAt, /son tarih/i);
});

test('normalizes arrays and produces stable Turkish slugs', () => {
  assert.deepEqual(normalizeStringList([' Ankara ', 'ankara', '', ' İzmir ']), ['Ankara', 'İzmir']);
  assert.equal(slugifyOpportunity('İŞĞÜŞÖÇ: Yaz Stajı 2026'), 'isgusoc-yaz-staji-2026');
});
