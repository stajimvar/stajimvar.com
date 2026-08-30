import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
  Öneri dosyası ile doğrulama masası arasındaki sözleşme.

  Masa bu JSON'u içe aktarıp `kayitlar[id].oneriler` üzerinden çiziyor.
  Alan adlarından biri değişirse ekran hata vermez — SESSİZCE öneri
  göstermez ve yönetici 22 hazır kararı hiç görmez. Bu testler o sessiz
  kaybı yakalıyor.
*/

const veri = JSON.parse(readFileSync(new URL('../src/data/burs-onerileri.json', import.meta.url)));

const ALANLAR = ['alan', 'mevcut', 'onerilen', 'kanit', 'gerekce', 'kaynak'];

test('dosya beklenen üst yapıda', () => {
  assert.ok(veri.olusturuldu, 'üretim zamanı yok');
  assert.equal(typeof veri.kayitlar, 'object');
  assert.ok(Object.keys(veri.kayitlar).length > 0, 'hiç kayıt yok');
});

test('her kayıt sınıf, http ve öneri listesi taşıyor', () => {
  for (const [id, kayit] of Object.entries(veri.kayitlar)) {
    assert.match(id, /^[0-9a-f-]{36}$/, `kimlik uuid değil: ${id}`);
    assert.match(kayit.sinif, /^[A-F]$/, `sınıf beklenmedik: ${kayit.sinif}`);
    assert.ok(Array.isArray(kayit.oneriler), `${id}: öneri listesi dizi değil`);
    assert.ok(Array.isArray(kayit.notlar), `${id}: not listesi dizi değil`);
  }
});

test('her öneri masanın okuduğu alanların hepsini taşıyor', () => {
  for (const [id, kayit] of Object.entries(veri.kayitlar)) {
    for (const oneri of kayit.oneriler) {
      for (const alan of ALANLAR) {
        assert.ok(alan in oneri, `${id}: öneride "${alan}" yok`);
      }
      assert.ok(Array.isArray(oneri.mevcut) || oneri.mevcut === null || typeof oneri.mevcut === 'string');
      assert.match(oneri.kaynak, /^https?:\/\//, `${id}: kaynak bağlantısı geçersiz`);
    }
  }
});

test('KANIT OKUNABİLİR — HTML kaçış dizisi taşımıyor', () => {
  /*
    Yönetici kanıta bakıp karar veriyor. "Lisans&uuml;st&uuml;" okunmuyor
    ve okunamayan kanıt karar verdirmiyor.
  */
  for (const [id, kayit] of Object.entries(veri.kayitlar)) {
    for (const oneri of kayit.oneriler) {
      assert.doesNotMatch(oneri.kanit, /&[a-z]+;|&#\d+;/i, `${id}: kanıtta HTML varlığı var`);
      assert.doesNotMatch(oneri.kanit, /<[a-z/]/i, `${id}: kanıtta etiket var`);
    }
  }
});

test('kanıt telif sınırında kısa kalıyor', () => {
  for (const [id, kayit] of Object.entries(veri.kayitlar)) {
    for (const oneri of kayit.oneriler) {
      assert.ok(oneri.kanit.length <= 220, `${id}: kanıt çok uzun (${oneri.kanit.length})`);
    }
  }
});

test('yalnızca bilinen alanlar için öneri var', () => {
  const izinli = new Set([
    'education_levels', 'eligible_departments', 'cities',
    'amount_min', 'payment_period', 'application_deadline',
  ]);
  for (const [id, kayit] of Object.entries(veri.kayitlar)) {
    for (const oneri of kayit.oneriler) {
      assert.ok(izinli.has(oneri.alan), `${id}: bilinmeyen alan "${oneri.alan}"`);
    }
  }
});
