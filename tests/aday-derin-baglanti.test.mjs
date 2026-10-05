import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ADAY_PARAMETRESI,
  BULUNAMADI_CUMLESI,
  adayliAdres,
  adrestekiAday,
  derinBaglantiKarari,
} from '../src/lib/aday-derin-baglanti.mjs';

/*
  /sirket/basvuranlar?aday=<başvuruId> — adres ↔ açık başvuru kararı.
  Saf modülün davranışı; tarayıcı akışı ayrıca gerçek uygulamada ölçüldü
  (rapor).
*/

const ID = '5b1c6a0e-0000-4000-8000-000000000001';

test('adresteki kimlik okunuyor; yoksa ya da boşsa null', () => {
  assert.equal(adrestekiAday(`?aday=${ID}`), ID);
  assert.equal(adrestekiAday(`?ilan=x&aday=${ID}`), ID);
  assert.equal(adrestekiAday('?ilan=x'), null);
  assert.equal(adrestekiAday('?aday='), null);
  assert.equal(adrestekiAday('?aday=%20%20'), null);
  assert.equal(adrestekiAday(''), null);
  assert.equal(adrestekiAday(undefined), null);
  /* Aşırı uzun değer durumu şişirmiyor. */
  assert.equal(adrestekiAday(`?aday=${'a'.repeat(101)}`), null);
});

test('adres yazımı öteki parametreleri koruyor', () => {
  assert.equal(adayliAdres('/sirket/basvuranlar', '?ilan=abc', ID), `/sirket/basvuranlar?ilan=abc&aday=${ID}`);
  assert.equal(adayliAdres('/sirket/basvuranlar', `?ilan=abc&aday=${ID}`, null), '/sirket/basvuranlar?ilan=abc');
  assert.equal(adayliAdres('/sirket/basvuranlar', `?aday=${ID}`, null), '/sirket/basvuranlar');
  assert.equal(adayliAdres('/sirket/basvuranlar', '', 'yeni'), '/sirket/basvuranlar?aday=yeni');
  /* Var olan kimlik yerinde değişiyor, ikinci bir parametre eklenmiyor. */
  const iki = adayliAdres('/sirket/basvuranlar', '?aday=eski', 'yeni');
  assert.equal(new URLSearchParams(iki.split('?')[1]).getAll(ADAY_PARAMETRESI).length, 1);
});

test('liste yüklenmeden ya da okunamamışken karar yok', () => {
  assert.equal(derinBaglantiKarari({ adresId: ID, durum: 'yukleniyor', kimlikler: [] }), 'bekle');
  /* Okuma hatası "bulunamadı" değil: bilinmiyor. */
  assert.equal(derinBaglantiKarari({ adresId: ID, durum: 'hata', kimlikler: [] }), 'bekle');
});

test('listede varsa aç, yoksa bulunamadı; adreste yoksa yok', () => {
  assert.equal(derinBaglantiKarari({ adresId: ID, durum: 'hazir', kimlikler: ['x', ID] }), 'ac');
  assert.equal(derinBaglantiKarari({ adresId: ID, durum: 'hazir', kimlikler: ['x'] }), 'bulunamadi');
  assert.equal(derinBaglantiKarari({ adresId: null, durum: 'hazir', kimlikler: [ID] }), 'yok');
  /* Doğrulanmamış şirkette liste boş: aynı sonuç. */
  assert.equal(derinBaglantiKarari({ adresId: ID, durum: 'hazir', kimlikler: [] }), 'bulunamadi');
  /* Biçimi bozuk kimlik ayrı bir sonuç almıyor. */
  assert.equal(derinBaglantiKarari({ adresId: 'bozuk', durum: 'hazir', kimlikler: [ID] }), 'bulunamadi');
});

test('başka şirketin başvurusu sızdırılmıyor: tek cümle', () => {
  assert.equal(BULUNAMADI_CUMLESI, 'Bu başvuru bulunamadı ya da görüntüleme yetkin yok.');
  const panel = readFileSync(new URL('../src/sirket/SirketPaneli.tsx', import.meta.url), 'utf8');
  assert.equal((panel.match(/BULUNAMADI_CUMLESI/g) ?? []).length, 2, 'içe aktarma + tek kullanım');
});

test('bildirim hedefi aynı adres biçimini kullanıyor', () => {
  const goc = readFileSync(new URL('../supabase/migrations/20261117010000_basvuru_bildirimi_canli.sql', import.meta.url), 'utf8');
  assert.match(goc, /\/sirket\/basvuranlar\?aday=/);
});
