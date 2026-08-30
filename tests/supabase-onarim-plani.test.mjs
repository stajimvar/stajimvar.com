import test from 'node:test';
import assert from 'node:assert/strict';
import { listeOku, onarimPlani } from '../scripts/supabase-onarim-plani.mjs';

/*
  Onarım planı iki yönde de yanılmamalı.

  Fazla iş çıkarırsa adım doksan küsur ağ çağrısına geri döner: yavaş ve
  kırılgan. Eksik iş çıkarırsa defter onarılmadan kapıya varılır ve
  `db push` sessizce kilitlenir — 22 Ağustos'tan 30 Ağustos'a kadar olan
  buydu.
*/

const rapor = (uzak) => ({ remoteAll: uzak });

test('yorum ve boş satırlar atlanıyor, ilk sütun alınıyor', () => {
  const liste = listeOku('# başlık\n\n0001\n20260822160000  ad_da_olabilir\n  \n');
  assert.deepEqual(liste, ['0001', '20260822160000']);
});

test('UZAKTA OLAN SÜRÜM İÇİN TEKRAR "applied" ÇAĞRILMIYOR', () => {
  const plan = onarimPlani(rapor(['0001', '0002']), ['0001', '0002'], []);
  assert.deepEqual(plan.applied, [], 'defter zaten doğruyken iş çıkarılmamalı');
});

test('uzakta olmayan sürüm için "applied" çağrılıyor', () => {
  const plan = onarimPlani(rapor(['0001']), ['0001', '0002'], []);
  assert.deepEqual(plan.applied, ['0002']);
});

test('UZAKTA OLMAYAN SÜRÜM İÇİN "reverted" ÇAĞRILMIYOR', () => {
  const plan = onarimPlani(rapor(['0001']), [], ['20260815205310']);
  assert.deepEqual(plan.reverted, [], 'zaten düşülmüş kayıt yeniden düşülmemeli');
});

test('uzakta duran eski soy kaydı düşülüyor', () => {
  const plan = onarimPlani(rapor(['0001', '20260815205310']), [], ['20260815205310']);
  assert.deepEqual(plan.reverted, ['20260815205310']);
});

test('uzlaştırma tamamlandıktan sonra plan tamamen boş', () => {
  /* Kararlı durum: iki liste de hiçbir iş üretmiyor, adım anında bitiyor. */
  const plan = onarimPlani(rapor(['0001', '0002']), ['0001', '0002'], ['20260815205310']);
  assert.deepEqual(plan, { applied: [], reverted: [] });
});

test('uzak geçmiş boşsa hepsi uygulanacak, hiçbiri düşülmeyecek', () => {
  const plan = onarimPlani(rapor([]), ['0001'], ['20260815205310']);
  assert.deepEqual(plan.applied, ['0001']);
  assert.deepEqual(plan.reverted, []);
});
