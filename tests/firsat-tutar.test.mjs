import test from 'node:test';
import assert from 'node:assert/strict';
import { opportunityAmount } from '../src/lib/firsat-degerlendirme.mjs';

/*
  Tutar gösterimi iki şeyi aynı anda korumalı:

  1. Doğrulanmamış tutar hiç görünmez.
  2. Görünen sayı NE OLDUĞU belli bir sayıdır — "2.250 ₺" tek başına
     aylık mı tek seferlik mi söylemiyor ve aradaki fark on iki kat.
*/

const DAMGA = '2026-08-30T00:00:00Z';

test('doğrulanmamış tutar gösterilmiyor', () => {
  const o = opportunityAmount({ amountMin: 2250, paymentPeriod: 'monthly', currency: 'TRY' });
  assert.equal(o.bilinmiyor, true);
  assert.equal(o.metin, null);
});

test('sıklık varsa sayı etiketiyle birlikte gösteriliyor', () => {
  const o = opportunityAmount({
    amountVerifiedAt: DAMGA, amountMin: 2250, amountMax: 2250,
    currency: 'TRY', paymentPeriod: 'monthly',
  });
  assert.match(o.metin, /^Aylık /);
  assert.match(o.metin, /2\.250/);
});

test('SIKLIK YOKSA ÇIPLAK SAYI YAZILMIYOR', () => {
  const o = opportunityAmount({
    amountVerifiedAt: DAMGA, amountMin: 2250, amountMax: 2250, currency: 'TRY',
  });
  assert.equal(o.metin, null);
  assert.equal(o.bilinmiyor, true);
});

test('sıklık yoksa kaynak ifadesi açıklamadan gösteriliyor', () => {
  const o = opportunityAmount({
    amountVerifiedAt: DAMGA, amountMin: 20000, currency: 'TRY',
    amountNote: 'Toplam 20.000 TL',
  });
  assert.equal(o.metin, 'Toplam 20.000 TL');
  assert.equal(o.bilinmiyor, false);
});

test('aralık ve sıklık birlikte', () => {
  const o = opportunityAmount({
    amountVerifiedAt: DAMGA, amountMin: 1000, amountMax: 3000,
    currency: 'TRY', paymentPeriod: 'yearly',
  });
  assert.match(o.metin, /^Yıllık /);
  assert.match(o.metin, /–/);
});
