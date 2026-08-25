import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GORUNURLUK_SAATI,
  paneldeGosterilecekler,
  suresiDoldu,
  temizlenecekler,
} from '../src/lib/instagram-yayin.mjs';

/*
  Saklama kuralının iki tüketicisi var: yönetici paneli (hangi setler
  listelenecek) ve temizlik betiği (hangi dosyalar silinecek). İkisi de
  buradaki işlevleri çağırıyor, çünkü eşik iki yerde ayrı yazılsaydı biri
  değiştiğinde panelden düşmüş ama dosyaları duran setler birikirdi.

  Silmeyle ilgili olduğu için hata payı yok: yanlış tarafa düşen bir karar
  yayınlanmamış bir gönderinin kartlarını siler.
*/

const SAAT = 60 * 60 * 1000;
const simdi = Date.parse('2026-08-25T20:00:00Z');
const saatOnce = (n) => new Date(simdi - n * SAAT).toISOString();

test('görünürlük süresi yirmi dört saat', () => {
  assert.equal(GORUNURLUK_SAATI, 24);
});

test('süre dolmadan silinmiyor', () => {
  assert.equal(suresiDoldu({ yayin_zamani: saatOnce(1) }, simdi), false);
  assert.equal(suresiDoldu({ yayin_zamani: saatOnce(23) }, simdi), false);
});

test('süre dolunca siliniyor', () => {
  assert.equal(suresiDoldu({ yayin_zamani: saatOnce(24) }, simdi), true);
  assert.equal(suresiDoldu({ yayin_zamani: saatOnce(200) }, simdi), true);
});

test('okunamayan tarihte silmeye kalkılmıyor', () => {
  /* Bozuk kayıt yüzünden dosya silmek, birikmiş bir setten pahalı. */
  assert.equal(suresiDoldu({ yayin_zamani: 'geçersiz' }, simdi), false);
  assert.equal(suresiDoldu({}, simdi), false);
  assert.equal(suresiDoldu({ yayin_zamani: null }, simdi), false);
});

test('panel: yayınlanmamış set her zaman listede', () => {
  const setler = [{ kod: 'a' }, { kod: 'b' }];
  assert.deepEqual(paneldeGosterilecekler(setler, [], simdi), setler);
});

test('panel: yeni yayınlanan set yirmi dört saat daha görünüyor', () => {
  const setler = [{ kod: 'a' }, { kod: 'b' }];
  const yayinlar = [{ set_kodu: 'a', yayin_zamani: saatOnce(2) }];
  assert.deepEqual(
    paneldeGosterilecekler(setler, yayinlar, simdi).map((s) => s.kod),
    ['a', 'b']
  );
});

test('panel: süresi dolan set listeden düşüyor', () => {
  const setler = [{ kod: 'a' }, { kod: 'b' }];
  const yayinlar = [{ set_kodu: 'a', yayin_zamani: saatOnce(30) }];
  assert.deepEqual(
    paneldeGosterilecekler(setler, yayinlar, simdi).map((s) => s.kod),
    ['b']
  );
});

test('temizlik: yalnızca süresi dolmuş ve henüz temizlenmemiş kayıtlar', () => {
  const yayinlar = [
    { set_kodu: 'yeni', yayin_zamani: saatOnce(3) },
    { set_kodu: 'eski', yayin_zamani: saatOnce(48) },
    { set_kodu: 'zaten-temiz', yayin_zamani: saatOnce(72), temizlendi_mi: true },
  ];
  assert.deepEqual(
    temizlenecekler(yayinlar, simdi).map((y) => y.set_kodu),
    ['eski']
  );
});

test('boş girdide çökmüyor', () => {
  assert.deepEqual(paneldeGosterilecekler(undefined, undefined, simdi), []);
  assert.deepEqual(temizlenecekler(undefined, simdi), []);
});
