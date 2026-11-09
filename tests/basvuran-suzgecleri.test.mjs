import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { secenekler, sirala, suzgeceUyar } from '../src/lib/basvuran-suzgecleri.mjs';

/* BAŞVURANLAR SÜZGEÇLERİ (9 Kasım 2026, rakip analizi #3). */
const KOK = path.resolve(import.meta.dirname, '..');

const K = [
  { id: 1, ad: 'Zeynep', bolum: 'İktisat', universite: 'ODTÜ', sinif: '3. Sınıf', sehir: 'Ankara', tarih: '2026-11-01' },
  { id: 2, ad: 'Ahmet', bolum: 'Moda Tasarımı', universite: 'MSGSÜ', sinif: '2. Sınıf', sehir: 'İstanbul', tarih: '2026-11-08' },
  { id: 3, ad: 'Çağla', bolum: 'İktisat', universite: 'MSGSÜ', sinif: '', sehir: 'İstanbul', tarih: null },
];

test('seçenekler benzersiz, boş yok, Türkçe sırada', () => {
  assert.deepEqual(secenekler(K, 'bolum'), ['İktisat', 'Moda Tasarımı']);
  assert.deepEqual(secenekler(K, 'sinif'), ['2. Sınıf', '3. Sınıf']);
});

test('süzgeç: boş hepsi, dolu tam eşleşme, birden çok alan VE', () => {
  assert.equal(K.filter((k) => suzgeceUyar(k, {})).length, 3);
  assert.deepEqual(K.filter((k) => suzgeceUyar(k, { bolum: 'İktisat' })).map((k) => k.id), [1, 3]);
  assert.deepEqual(K.filter((k) => suzgeceUyar(k, { bolum: 'İktisat', sehir: 'İstanbul' })).map((k) => k.id), [3]);
});

test('sıralama: yeni/eski tarihe göre (tarihsiz sonda), ad Türkçe; girdi değişmiyor', () => {
  assert.deepEqual(sirala(K, 'yeni').map((k) => k.id), [2, 1, 3]);
  assert.deepEqual(sirala(K, 'eski').map((k) => k.id), [1, 2, 3]);
  assert.deepEqual(sirala(K, 'ad').map((k) => k.id), [2, 3, 1]);
  assert.deepEqual(K.map((k) => k.id), [1, 2, 3]);
});

test('arayüz: açılır listeler, çip satırı yok; temizle hepsini sıfırlıyor', () => {
  const s = readFileSync(path.join(KOK, 'src/sirket/AdayIzgarasi.tsx'), 'utf8');
  assert.match(s, /if \(!suzgeceUyar\(k, alanSuzgeci\)\) return false;/);
  assert.match(s, /sirala\(durumHaricSuzulmus\.filter/);
  assert.match(s, /setAlanSuzgeci\(\{ bolum: '', universite: '', sinif: '', sehir: '' \}\);\s*setSiralama\('yeni'\);/);
});
