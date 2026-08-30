import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMigrationList, splitLocalOnly } from '../scripts/supabase-history-gate.mjs';

/*
  Bu kapı `db push`'un önünde duruyor: yanlış davranışının iki ayrı ve
  zıt bedeli var. Fazla gevşek olursa üretime atlanmış bir göçle
  gidilir; fazla sıkı olursa hiçbir göç hiç uygulanamaz — 22 Ağustos'tan
  30 Ağustos'a kadar olan tam olarak buydu.
*/

const satir = (yerel, uzak) => `\`${yerel || ' '}\` | \`${uzak || ' '}\` | \`x\``;

test('uzakta olup yerelde olmayanı ayrışma sayıyor', () => {
  const r = parseMigrationList(satir('0022', '') + '\n' + satir('', '20260815205310'));
  assert.deepEqual(r.remoteOnly, ['20260815205310']);
  assert.deepEqual(r.localOnly, ['0022']);
});

test('uzaktaki tüm sürümler toplanıyor (eşleşenler dahil)', () => {
  /* Bekleyen göçü eksikten ayırmak "uzaktaki en yeni sürüm"e bakıyor;
     o sayı yalnızca remoteOnly'den okunamaz. */
  const r = parseMigrationList(
    satir('20260901010000', '20260901010000') + '\n' + satir('', '20260902010000')
  );
  assert.deepEqual(r.remoteAll, ['20260901010000', '20260902010000']);
});

test('UZAKTAKİ EN YENİDEN SONRAKİ YEREL DOSYA BEKLEYENDİR, AYRIŞMA DEĞİL', () => {
  /*
    Yeni yazılmış bir göç tam olarak "yerelde var, uzakta yok" görünür.
    Bunu ayrışma sayan kapı, uygulanmayı bekleyen her göçü engeller ve
    db push adımına hiç sıra gelmez.
  */
  const r = parseMigrationList(
    satir('20260904020000', '20260904020000') + '\n' + satir('20260905010000', '')
  );
  const { bekleyen, eksik } = splitLocalOnly(r);
  assert.deepEqual(bekleyen, ['20260905010000']);
  assert.deepEqual(eksik, []);
});

test('UZAKTAKİ EN YENİDEN ÖNCEKİ YEREL DOSYA GERÇEK EKSİKTİR', () => {
  /*
    Sırası geçmiş bir dosya uzakta yoksa atlanmış ya da geriye dönük
    eklenmiş demektir; sessizce push etmek sırayı bozar.
  */
  const r = parseMigrationList(
    satir('20260901010000', '') + '\n' + satir('20260904020000', '20260904020000')
  );
  const { bekleyen, eksik } = splitLocalOnly(r);
  assert.deepEqual(eksik, ['20260901010000']);
  assert.deepEqual(bekleyen, []);
});

test('uzak geçmiş boşsa hepsi bekleyen', () => {
  const r = parseMigrationList(satir('0001', '') + '\n' + satir('0002', ''));
  const { bekleyen, eksik } = splitLocalOnly(r);
  assert.deepEqual(bekleyen, ['0001', '0002']);
  assert.deepEqual(eksik, []);
});

test('numaralı taban ile damgalı sürüm karışıkken sıra doğru', () => {
  /* '0022' < '20260901010000' dizgi karşılaştırmasında da doğru. */
  const r = parseMigrationList(
    satir('0022', '') + '\n' + satir('20260901010000', '20260901010000')
  );
  const { eksik } = splitLocalOnly(r);
  assert.deepEqual(eksik, ['0022'], 'eski numaralı taban dosyası eksik sayılmalı');
});
