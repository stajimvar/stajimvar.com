import test from 'node:test';
import assert from 'node:assert/strict';
import {
  niyetYaz,
  niyetOku,
  niyetSil,
  guvenliYol,
  guvenliDisAdres,
  OMUR_MS,
} from '../src/lib/basvuru-niyeti.mjs';

/*
  BU TEST NEYİ KORUYOR

  Misafir "Başvurmak için giriş yap"a basıyor, Google'a gidiyor, dönüyor ve
  ANA SAYFADA buluyordu kendini: dönüş yolu React durumunda tutuluyordu ve
  OAuth tam sayfa yönlendirmesi o durumu siliyordu. İlanı yeniden aramak
  zorunda kalıyordu.

  İkinci koruma açık yönlendirme: niyet kaydı sessionStorage'da duruyor ve
  oraya yazılan her şey kullanıcı tarafından değiştirilebilir. Doğrulanmadan
  okunursa "//evil.com" ya da "javascript:…" bir yönlendirmeye dönüşür.
*/

/** sessionStorage yerine geçen basit depo. */
function sahteDepo(baslangic = {}) {
  const veri = { ...baslangic };
  return {
    getItem: (k) => (k in veri ? veri[k] : null),
    setItem: (k, v) => {
      veri[k] = String(v);
    },
    removeItem: (k) => {
      delete veri[k];
    },
    _veri: veri,
  };
}

const disNiyet = {
  tur: 'dis',
  ilanId: 'abc-123',
  yol: '/ilan/grafik-tasarim-stajyeri-abc123',
  disAdres: 'https://kuzeyden.hrpanda.co/grafik-tasarim-stajyeri',
};

test('dış başvuru niyeti yazılıp okunuyor', () => {
  const d = sahteDepo();
  assert.equal(niyetYaz(d, disNiyet), true);
  const okunan = niyetOku(d);
  assert.equal(okunan.tur, 'dis');
  assert.equal(okunan.ilanId, 'abc-123');
  assert.equal(okunan.yol, disNiyet.yol);
  assert.equal(okunan.disAdres, disNiyet.disAdres);
});

test('platform içi niyet dış adres istemiyor', () => {
  const d = sahteDepo();
  assert.equal(niyetYaz(d, { tur: 'ic', ilanId: 'x1', yol: '/ilan/x1' }), true);
  const okunan = niyetOku(d);
  assert.equal(okunan.tur, 'ic');
  assert.equal(okunan.disAdres, undefined);
});

test('AÇIK YÖNLENDİRME: site dışı yol reddediliyor', () => {
  for (const kotu of [
    '//evil.example',
    'https://evil.example/ilan',
    'javascript:alert(1)',
    'ilan/x',
    '',
    null,
  ]) {
    assert.equal(guvenliYol(kotu), null, `${JSON.stringify(kotu)} yol olarak kabul edilmemeli`);
    const d = sahteDepo();
    assert.equal(niyetYaz(d, { ...disNiyet, yol: kotu }), false);
    assert.equal(niyetOku(d), null);
  }
  assert.equal(guvenliYol('/ilan/x'), '/ilan/x');
});

test('GÜVENSİZ ŞEMA: yalnızca http ve https', () => {
  for (const kotu of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://example.com',
    'evil.example',
    '',
  ])
    assert.equal(guvenliDisAdres(kotu), null, `${kotu} dış adres olarak kabul edilmemeli`);

  assert.equal(guvenliDisAdres('https://a.example/x'), 'https://a.example/x');
  assert.equal(guvenliDisAdres('http://a.example/x'), 'http://a.example/x');
});

test('kurcalanmış kayıt okunmuyor ve siliniyor', () => {
  /* Kullanıcı sessionStorage'ı elle değiştirebiliyor. */
  const d = sahteDepo({
    'stajimvar:basvuru-niyeti': JSON.stringify({
      tur: 'dis',
      ilanId: 'x',
      yol: '//evil.example',
      disAdres: 'https://ok.example',
      yazildi: Date.now(),
    }),
  });
  assert.equal(niyetOku(d), null);
  assert.equal(d.getItem('stajimvar:basvuru-niyeti'), null, 'bozuk kayıt silinmeli');
});

test('javascript: şemalı dış adres okunmuyor', () => {
  const d = sahteDepo({
    'stajimvar:basvuru-niyeti': JSON.stringify({
      tur: 'dis',
      ilanId: 'x',
      yol: '/ilan/x',
      disAdres: 'javascript:alert(1)',
      yazildi: Date.now(),
    }),
  });
  assert.equal(niyetOku(d), null);
});

test('bozuk JSON çökertmiyor', () => {
  const d = sahteDepo({ 'stajimvar:basvuru-niyeti': '{bozuk' });
  assert.equal(niyetOku(d), null);
  assert.equal(d.getItem('stajimvar:basvuru-niyeti'), null);
});

test('süresi geçmiş niyet tetiklenmiyor', () => {
  const d = sahteDepo();
  const t0 = 1_000_000;
  niyetYaz(d, disNiyet, t0);
  assert.ok(niyetOku(d, t0 + OMUR_MS - 1), 'süre içinde okunmalı');
  assert.equal(niyetOku(d, t0 + OMUR_MS + 1), null, 'süre dolunca okunmamalı');
});

test('gelecek zamanlı kayıt reddediliyor', () => {
  const d = sahteDepo();
  niyetYaz(d, disNiyet, 5_000_000);
  assert.equal(niyetOku(d, 1_000_000), null, 'saat oynanmışsa güvenilmiyor');
});

test('niyet silinebiliyor', () => {
  const d = sahteDepo();
  niyetYaz(d, disNiyet);
  niyetSil(d);
  assert.equal(niyetOku(d), null);
});

test('depolama kapalıysa giriş akışı çökmüyor', () => {
  const kapali = {
    getItem() {
      throw new Error('kapalı');
    },
    setItem() {
      throw new Error('kapalı');
    },
    removeItem() {
      throw new Error('kapalı');
    },
  };
  assert.equal(niyetYaz(kapali, disNiyet), false);
  assert.equal(niyetOku(kapali), null);
  assert.doesNotThrow(() => niyetSil(kapali));
});
