import test from 'node:test';
import assert from 'node:assert/strict';
import {
  opportunityStatus,
  opportunityStatusLabel,
  opportunityTypeLabel,
  getOpportunityOverview,
} from '../src/lib/opportunity-domain.mjs';

const simdi = new Date('2026-08-23T12:00:00.000Z');

test('Açık yalnızca doğrulanmış aktif dönem varken kullanılıyor', () => {
  assert.equal(opportunityStatus({ applicationDeadline: '2026-09-01' }, simdi), 'acik');
  assert.equal(opportunityStatus({ applicationDeadline: '2026-08-23' }, simdi), 'acik');
});

test('tarih bilinmiyorsa Takvim bekleniyor', () => {
  assert.equal(opportunityStatus({}, simdi), 'takvim_bekleniyor');
  assert.equal(opportunityStatus({ applicationDeadline: null }, simdi), 'takvim_bekleniyor');
  // Yalnızca geçmiş döneme ait başlangıç bilgisi var, son tarih yok.
  assert.equal(opportunityStatus({ applicationStartAt: '2025-01-01' }, simdi), 'takvim_bekleniyor');
});

test('başlangıcı gelecekte olan fırsat Yakında', () => {
  assert.equal(
    opportunityStatus({ applicationStartAt: '2026-09-05', applicationDeadline: '2026-10-01' }, simdi),
    'yakinda'
  );
});

test('süresi dolan fırsat Kapalı', () => {
  assert.equal(opportunityStatus({ applicationDeadline: '2026-08-01' }, simdi), 'kapali');
});

test('etiketler Türkçe ve ham enum sızmıyor', () => {
  assert.equal(opportunityStatusLabel({ applicationDeadline: '2026-09-01' }, simdi), 'Açık');
  assert.equal(opportunityStatusLabel({}, simdi), 'Takvim bekleniyor');
  assert.equal(opportunityTypeLabel('scholarship'), 'Burs');
  assert.equal(opportunityTypeLabel('kyk'), 'KYK');
  assert.equal(opportunityTypeLabel('bilinmeyen'), 'Fırsat');
});

test('"Başvurusu devam eden" sayacı takvimi belirsiz kayıtları saymıyor', () => {
  const kayitlar = [
    { applicationDeadline: '2026-09-01' }, // açık
    { applicationDeadline: '2026-12-31' }, // açık
    {}, // takvim bekleniyor
    { applicationStartAt: '2026-09-05', applicationDeadline: '2026-10-01' }, // yakında
    { applicationDeadline: '2026-08-01' }, // kapalı
  ];
  assert.equal(getOpportunityOverview(kayitlar, simdi).openCount, 2);
});
