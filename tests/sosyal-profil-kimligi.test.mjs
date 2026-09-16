import test from 'node:test';
import assert from 'node:assert/strict';

import { ogrenciKimligiGorunurMu } from '../src/lib/sosyal-profil-kimligi.mjs';

test('resmi hesapta okul, bolum ve alan kimligi gosterilmez', () => {
  assert.equal(ogrenciKimligiGorunurMu(true), false);
});

test('normal hesapta ogrenci kimligi gosterilmeye devam eder', () => {
  assert.equal(ogrenciKimligiGorunurMu(false), true);
  assert.equal(ogrenciKimligiGorunurMu(null), true);
});
