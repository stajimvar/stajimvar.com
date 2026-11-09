import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ilanFormDegeri, ilanSatiri, ilanSorunlari, onElemeSorulariTemizle } from '../src/lib/ilan-formu.mjs';
import { kartVerisi } from '../src/lib/aday-kart.mjs';

/* ÖN ELEME SORULARI (9 Kasım 2026, rakip analizi #5). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

test('form: boşlar atılıyor, en çok 3; kısa soru hata; boş liste null gidiyor', () => {
  assert.deepEqual(onElemeSorulariTemizle([' a?b ', '', 'c', 'd', 'e']), ['a?b', 'c', 'd']);
  assert.ok(ilanSorunlari({ onElemeSorulari: ['ab'] }).onElemeSorulari);
  assert.equal(ilanSorunlari({ onElemeSorulari: ['Haftada kaç gün?'] }).onElemeSorulari, undefined);
  assert.equal(ilanSatiri({ onElemeSorulari: [] }, { companyId: 'x', durum: 'draft' }).on_eleme_sorulari, null);
  assert.deepEqual(ilanSatiri({ onElemeSorulari: ['Soru bir'] }, { companyId: 'x', durum: 'draft' }).on_eleme_sorulari, ['Soru bir']);
  assert.deepEqual(ilanFormDegeri({ on_eleme_sorulari: ['S1'] }).onElemeSorulari, ['S1']);
});

test('kart: cevaplar soru ile birlikte; bozuk satır atılıyor', () => {
  const k = kartVerisi({ id: 'a', on_eleme_cevaplari: [{ soru: 'S?', cevap: ' C ' }, { cevap: 'sorusuz' }, null] });
  assert.deepEqual(k.onElemeCevaplari, [{ soru: 'S?', cevap: 'C' }]);
});

test('veritabanı: 1–3 soru 3–200 karakter; cevap dizisi sınırlı; içerik denetimine katılmıyor', () => {
  const g = oku('supabase/migrations/20270105010000_on_eleme_sorulari.sql').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(g, /cardinality\(s\) between 1 and 3/);
  assert.match(g, /char_length\(btrim\(x\)\) not between 3 and 200/);
  assert.match(g, /jsonb_array_length\(on_eleme_cevaplari\) between 1 and 3/);
  assert.doesNotMatch(g, /ilan_icerik_alanlari/);
});

test('başvuru: sorular yalnız teslim edilen başvuruda; hepsi cevaplanmadan gönderilmiyor', () => {
  const d = oku('src/components/ApplyDialog.tsx');
  assert.match(d, /const sorular = rizaGerekli \? \(listing\.onElemeSorulari \?\? \[\]\)\.slice\(0, 3\) : \[\];/);
  assert.match(d, /const cevaplarTamam = sorular\.every/);
  const q = oku('src/lib/queries/index.ts');
  assert.match(q, /on_eleme_cevaplari: \(yol\.teslimEdiliyor && params\.onElemeCevaplari\?\.length/);
  assert.match(oku('src/sirket/AdayCekmecesi.tsx'), /Ön eleme cevapları/);
});
