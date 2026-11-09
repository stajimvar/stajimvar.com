import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* EKİP İÇİ DEĞERLENDİRME (9 Kasım 2026, rakip analizi #7). */
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

test('aday kartında ekip değerlendirmesi: salt okunur üye yazamıyor, adaya gitmiyor', () => {
  const c = oku('src/sirket/AdayCekmecesi.tsx');
  assert.match(c, /<DegerlendirmeFormu\s*basvuruId=\{String\(kart\.id\)\}\s*olcutler=\{degerlendirmeOlcutleri\}\s*yazabilir=\{!saltOkunur\}/);
  assert.match(c, /Yalnız ekibin görür; adaya gitmez\./);
  assert.match(oku('src/sirket/AdayIzgarasi.tsx'), /degerlendirmeOlcutleri=\{degerlendirmeOlcutleri\}/);
});

test('ölçütleri yalnız sahip yönetiyor; öneriler tıklanınca ekleniyor, dayatılmıyor', () => {
  const e = oku('src/sirket/SirketEkibi.tsx');
  assert.match(e, /\{sahipMi && \(\s*<section className=\{KUTU\} style=\{kutuStil\} aria-labelledby="olcut-baslik">/);
  assert.match(e, /onClick=\{\(\) => void olcutEkleTikla\(ad\)\}/);
  const v = oku('src/lib/sirket-veri.ts');
  assert.match(v, /db\.rpc\('olcut_kaydet'/);
  assert.match(v, /db\.rpc\('olcut_kaldir'/);
});
