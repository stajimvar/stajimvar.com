import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAJIMVAR_LOGOSU, sistemBildirimiMi } from '../src/lib/sistem-bildirimi.mjs';

test('şirkete sistemden giden türler StajımVar logosu alıyor; kişi/başvuru bildirimleri almıyor', () => {
  for (const t of ['sirket_onaylandi', 'sahiplenme_onaylandi', 'ilan_yayinda', 'ilan_yonetici_ret', 'sirket_dogrulandi', 'ilan_suresi_doluyor']) {
    assert.equal(sistemBildirimiMi(t), true, t);
  }
  for (const t of ['yeni_basvuru', 'takip', 'takip_ilan', 'baglanti_istegi', 'basvuru_goruntulendi', 'yonetici_sirket_talebi', '', null]) {
    assert.equal(sistemBildirimiMi(t), false, String(t));
  }
  assert.equal(STAJIMVAR_LOGOSU, '/logo.png');
});

test('App: önce başvuru ve talep görseli, sonra StajımVar logosu', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const g = app.slice(app.indexOf('const bildirimBasvuruBilgisi = React.useCallback('));
  assert.ok(g.indexOf('basvuruGorseli(') < g.indexOf('talepGorselleri.get(') && g.indexOf('talepGorselleri.get(') < g.indexOf('sistemBildirimiMi(b.tur)'));
  assert.match(g, /sirketAdi: 'StajımVar', logo: STAJIMVAR_LOGOSU/);
});
