import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PLANLI_KAPANIS_SEBEBI,
  planliKapanisTarihi,
  planliKapanisGeldiMi,
  planliKapandiMi,
} from '../src/lib/planli-kapanis.mjs';

/*
  PLANLI KAPANIŞ (25 Kasım 2026)

  Workday 429 yüzünden elle eklenen ilanlar `raw.planli_kapanis` gününde
  kapanıyor; tarih "Son başvuru" alanına yazılmıyor.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

test('tarih raw.planli_kapanis alanından okunuyor; bozuk değer yok sayılıyor', () => {
  assert.equal(planliKapanisTarihi({ raw: { planli_kapanis: '2026-12-31' } }), '2026-12-31');
  assert.equal(planliKapanisTarihi({ raw: { planli_kapanis: '31.12.2026' } }), null);
  assert.equal(planliKapanisTarihi({ raw: null }), null);
  assert.equal(planliKapanisTarihi({}), null);
});

test('kapanış günü ve sonrasında kapanıyor, öncesinde açık', () => {
  const ilan = { raw: { planli_kapanis: '2026-12-31' } };
  assert.equal(planliKapanisGeldiMi(ilan, '2026-12-30'), false);
  assert.equal(planliKapanisGeldiMi(ilan, '2026-12-31'), true);
  assert.equal(planliKapanisGeldiMi(ilan, '2027-01-02'), true);
  assert.equal(planliKapanisGeldiMi({ raw: {} }, '2030-01-01'), false);
});

test('planlı kapanan ilan yeniden açılmıyor; günlük kontrol kapanışı bağlantı kontrolünden önce yapıyor', () => {
  assert.equal(planliKapandiMi({ closure_reason: PLANLI_KAPANIS_SEBEBI }), true);
  assert.equal(planliKapandiMi({ closure_reason: 'http_404' }), false);
  const betik = oku('scripts/ilan-baglanti-kontrol.mjs');
  assert.match(betik, /\.not\('raw->>planli_kapanis', 'is', null\)/);
  assert.match(betik, /closure_reason: PLANLI_KAPANIS_SEBEBI/);
  assert.match(betik, /const ilanlar = ilanlarHam\.filter\(\(x\) => !planliKapandiMi\(x\)\);/);
  assert.ok(betik.indexOf('PLANLI KAPANIŞ  ') < betik.indexOf('const ilanlar = ilanlarHam'));
});

test('Workday göçü: tarih son başvuru alanında değil, raw.planli_kapanis içinde; kanonik adres korumalı', () => {
  const goc = oku('supabase/migrations/20270123010000_workday_ilanlari_planli_kapanis.sql');
  const ekler = goc.split('insert into public.listings').slice(1);
  assert.equal(ekler.length, 3);
  for (const e of ekler) {
    assert.doesNotMatch(e.split('select')[0], /application_deadline/);
    assert.match(e, /"planli_kapanis": "2026-12-31"/);
    assert.match(e, /where not exists \(select 1 from public\.listings where canonical_url = '/);
  }
});
