import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaylarCsv, hucre } from '../src/lib/aday-csv.mjs';

test('hücre: formül enjeksiyonu önleniyor, ayraç ve tırnak kaçıyor', () => {
  assert.equal(hucre('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(hucre('@x'), "'@x");
  assert.equal(hucre('a;b'), '"a;b"');
  assert.equal(hucre('dedi "x"'), '"dedi ""x"""');
});

test('CSV: BOM + ; ayraç; önyargısız kipte ad yok; iletişim sütunu yok', () => {
  const csv = adaylarCsv([{ gizli: true, ad: null, durum: 'rejected', tarih: '2026-11-01T09:00:00Z' }]);
  assert.ok(csv.startsWith('﻿Ad;Okul;'));
  assert.match(csv, /Gizli \(önyargısız inceleme\)/);
  assert.match(csv, /2026-11-01/);
  assert.doesNotMatch(csv.split('\r\n')[0], /E-posta|Telefon/);
});

test('Başvuranlar: düğme ekrandaki (gosterilen) listeyi indiriyor', () => {
  const s = readFileSync(new URL('../src/sirket/AdayIzgarasi.tsx', import.meta.url), 'utf8');
  assert.match(s, /adaylarCsv\(gosterilen\)/);
  assert.match(s, /CSV indir \(\{gosterilen\.length\}\)/);
});
