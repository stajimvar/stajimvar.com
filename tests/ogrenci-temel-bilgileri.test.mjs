import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { temelBilgiHatalari, temelBilgilerEksik } from '../src/lib/ogrenci-temel-bilgileri.mjs';

const oku = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('okul, bölüm ve şehir zorunlu; boşluk dolu sayılmıyor', () => {
  assert.equal(temelBilgilerEksik({ university: 'Boğaziçi Üniversitesi', department: 'Psikoloji', city: 'İstanbul' }), false);
  assert.deepEqual(Object.keys(temelBilgiHatalari({ university: '  ', department: '', city: undefined })).sort(), ['city', 'department', 'university']);
  assert.equal(temelBilgilerEksik({ university: 'ODTÜ', department: 'Fizik', city: '' }), true);
  assert.equal(temelBilgilerEksik(null), true);
});

test('pencere kapatılamıyor, tek çıkış oturumu kapatmak; App öğrenciye bağlıyor', () => {
  const p = oku('src/components/OgrenciTemelBilgileri.tsx');
  assert.doesNotMatch(p, /onKapat/);
  assert.match(p, /onClick=\{onCikis\}/);
  assert.match(p, /options=\{secenekler\}/);
  for (const v of ['TR_UNIVERSITIES', 'TR_DEPARTMENTS', 'TR_CITIES']) assert.ok(p.includes(v), v);
  const a = oku('src/App.tsx');
  assert.match(a, /session\?\.role === 'student' &&\s+activeStudent &&\s+activeStudent\.id === session\.userId &&\s+!adSoruluyor &&\s+temelBilgilerEksik\(/);
  assert.match(a, /await saveStudentProfile\(activeStudent\.id, bilgi\);/);
  assert.match(a, /\{adSorusu\}\s+\{temelBilgiSorusu\}/);
});
