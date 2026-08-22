import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafeHttpsUrl,
  isExpiredOpportunity,
  getOpportunityOverview,
  readOpportunityFilters,
  serializeOpportunityFilters,
  matchOpportunity,
} from '../src/lib/opportunity-domain.mjs';

test('only accepts absolute HTTPS external URLs', () => {
  assert.equal(isSafeHttpsUrl('https://example.org/apply'), true);
  assert.equal(isSafeHttpsUrl('http://example.org/apply'), false);
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpsUrl('/local-path'), false);
});

test('treats an elapsed deadline as expired', () => {
  assert.equal(isExpiredOpportunity({ applicationDeadline: '2026-08-20T23:59:59.000Z' }, new Date('2026-08-21T00:00:00.000Z')), true);
  assert.equal(isExpiredOpportunity({ applicationDeadline: '2026-08-21T23:59:59.000Z' }, new Date('2026-08-21T00:00:00.000Z')), false);
  assert.equal(isExpiredOpportunity({ applicationDeadline: null }, new Date('2026-08-21T00:00:00.000Z')), false);
});

test('keeps date-only deadlines open through the end of their Turkey day', () => {
  assert.equal(isExpiredOpportunity({ applicationDeadline: '2026-08-21' }, new Date('2026-08-21T18:00:00.000Z')), false);
  assert.equal(isExpiredOpportunity({ applicationDeadline: '2026-08-21' }, new Date('2026-08-21T21:00:00.000Z')), true);
});

/*
  Sayaç kuralı değişti: "Başvurusu devam eden" yalnızca durumu Açık olanları
  sayıyor. Önce süresi dolmamış her kayıt sayılıyordu ve takvimi hiç
  açıklanmamış kurumlar da bu sayıya giriyordu (bkz. tests/firsat-durumu).
*/
test('summarizes only real open opportunities without inventing a deadline', () => {
  const now = new Date('2026-08-21T12:00:00.000Z');
  const overview = getOpportunityOverview([
    { title: 'Süresi geçmiş burs', opportunityType: 'scholarship', applicationDeadline: '2026-08-20' },
    { title: 'Tarihsiz eğitim', opportunityType: 'education', applicationDeadline: null },
    { title: 'KYK', opportunityType: 'kyk', applicationDeadline: '2026-08-23' },
    { title: 'Burs', opportunityType: 'scholarship', applicationDeadline: '2026-08-22' },
  ], now);

  assert.deepEqual(overview, {
    openCount: 2,
    scholarshipAndCreditCount: 2,
    nearest: { title: 'Burs', opportunityType: 'scholarship', applicationDeadline: '2026-08-22' },
    daysLeft: 1,
  });
  assert.deepEqual(getOpportunityOverview([], now), { openCount: 0, scholarshipAndCreditCount: 0, nearest: null, daysLeft: null });
});

test('round-trips public opportunity filters through URL query state', () => {
  const filters = readOpportunityFilters('?q=erasmus&type=international&level=Y%C3%BCksek+Lisans&place=Ankara&open=1');
  assert.deepEqual(filters, { query: 'erasmus', type: 'international', level: 'Yüksek Lisans', place: 'Ankara', openOnly: true });
  assert.equal(serializeOpportunityFilters(filters), '?q=erasmus&type=international&level=Y%C3%BCksek+Lisans&place=Ankara&open=1');
});

test('does not score an opportunity when a required profile fact is missing', () => {
  const result = matchOpportunity(
    { educationLevels: ['Lisans'], eligibleDepartments: ['Bilgisayar Mühendisliği'], eligibleClassYears: ['3. Sınıf'], cities: ['Ankara'], countries: [], minimumGpa: 3, languageRequirements: ['İngilizce'] },
    { educationLevel: 'Lisans', department: '', gradeLevel: '', city: '', gpa: null, languages: [] }
  );
  assert.equal(result.isScorable, false);
  assert.deepEqual(result.missingProfileFields, ['department', 'gradeLevel', 'city', 'gpa', 'languages']);
});
