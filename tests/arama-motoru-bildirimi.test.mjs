import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { bildirimPlani } from '../scripts/arama-motoru-bildirimi.mjs';

/* ARAMA MOTORU BİLDİRİMİ (28 Kasım 2026) */
const KOK = path.resolve(import.meta.dirname, '..');

test('plan: yeni açık ilan bildirilir, bildirilmiş açık tekrar gitmez, kümeden çıkan kapanış olur', () => {
  const acik = new Set(['https://stajimvar.com/ilan/a', 'https://stajimvar.com/ilan/b']);
  const kayitlar = [
    { url: 'https://stajimvar.com/ilan/a', durum: 'acik', google_at: '2026-11-28T00:00:00Z' },
    { url: 'https://stajimvar.com/ilan/c', durum: 'acik', google_at: '2026-11-20T00:00:00Z' },
    { url: 'https://stajimvar.com/ilan/d', durum: 'kapali', google_at: '2026-11-20T00:00:00Z' },
  ];
  const { acilan, kapanan } = bildirimPlani(acik, kayitlar);
  assert.deepEqual(acilan, ['https://stajimvar.com/ilan/b']);
  assert.deepEqual(kapanan, ['https://stajimvar.com/ilan/c']);
});

test('Google gitmemiş açık kayıt yeniden denenir', () => {
  const acik = new Set(['https://stajimvar.com/ilan/a']);
  const { acilan } = bildirimPlani(acik, [{ url: 'https://stajimvar.com/ilan/a', durum: 'acik', google_at: null }]);
  assert.deepEqual(acilan, ['https://stajimvar.com/ilan/a']);
});

test('IndexNow anahtar dosyası yayında; Google anahtarı yalnız adım ortamında; boş harita toplu kapanışı durduruyor', () => {
  const betik = readFileSync(path.join(KOK, 'scripts/arama-motoru-bildirimi.mjs'), 'utf8');
  const anahtar = betik.match(/INDEXNOW_ANAHTARI = '([0-9a-f]{32})'/)[1];
  const dosya = path.join(KOK, 'public', `${anahtar}.txt`);
  assert.ok(existsSync(dosya));
  assert.equal(readFileSync(dosya, 'utf8').trim(), anahtar);
  assert.match(betik, /if \(acik\.size === 0\) throw/);
  const is = readFileSync(path.join(KOK, '.github/workflows/ilan-baglanti-kontrolu.yml'), 'utf8');
  assert.match(is, /- name: Arama motorlarına ilan bildirimi\n        if: always\(\)\n        env:\n          GOOGLE_INDEXING_SA_JSON: \$\{\{ secrets\.GOOGLE_INDEXING_SA_JSON \}\}/);
  assert.doesNotMatch(is.split('- name: Arama motorlarına ilan bildirimi')[0], /GOOGLE_INDEXING_SA_JSON/);
});
