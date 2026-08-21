import test from 'node:test';
import assert from 'node:assert/strict';
import { academicYearFor, canonicalSourceUrl, isSafeImportUrl, nextRetryAt } from '../src/lib/opportunity-import-domain.mjs';

test('derives the academic year across the September boundary', () => {
  assert.equal(academicYearFor(new Date('2026-08-31T12:00:00Z')), '2025-2026');
  assert.equal(academicYearFor(new Date('2026-09-01T12:00:00Z')), '2026-2027');
});

test('canonicalizes tracking URLs without accepting internal or unsafe hosts', () => {
  assert.equal(canonicalSourceUrl('https://Example.org/burs/?utm_source=x#top'), 'https://example.org/burs');
  for (const value of ['http://example.org', 'https://localhost/x', 'https://127.0.0.1/x', 'https://10.0.0.1/x', 'https://169.254.169.254/latest', 'javascript:alert(1)']) assert.equal(isSafeImportUrl(value), false);
});

test('uses bounded exponential retry backoff', () => {
  assert.equal(nextRetryAt(new Date('2026-08-21T00:00:00Z'), 1).toISOString(), '2026-08-21T00:15:00.000Z');
  assert.equal(nextRetryAt(new Date('2026-08-21T00:00:00Z'), 20).toISOString(), '2026-08-22T00:00:00.000Z');
});
