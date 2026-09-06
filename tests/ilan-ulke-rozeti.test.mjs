import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

import { ulkeRozetiGerekli } from '../src/lib/ulke-rozeti.mjs';
import { ulkeAdi } from '../src/lib/ulke-adi.ts';

const rozet = readFileSync('src/components/UlkeRozeti.tsx', 'utf8');
const kart = readFileSync('src/components/InternshipCard.tsx', 'utf8');
const detay = readFileSync('src/components/ListingPage.tsx', 'utf8');

/* ------------------------------------------------------------- rozet kuralı */

test('yurt içi ilanlarda rozet çizilmiyor', () => {
  // Yayındaki ilanların büyük çoğunluğu Türkiye; her karta "Türkiye" basmak
  // bilgi değil gürültü olurdu. Rozetin işi istisnayı işaretlemek.
  assert.equal(ulkeRozetiGerekli('TR'), null);
  assert.equal(ulkeRozetiGerekli('tr'), null);
  assert.equal(ulkeRozetiGerekli(' TR '), null);
});

test('ülke kodu yoksa ya da boşsa rozet çizilmiyor', () => {
  assert.equal(ulkeRozetiGerekli(undefined), null);
  assert.equal(ulkeRozetiGerekli(null), null);
  assert.equal(ulkeRozetiGerekli(''), null);
  assert.equal(ulkeRozetiGerekli('   '), null);
});

test('yurt dışı ilanlarda rozet normalize kodu döndürüyor', () => {
  assert.equal(ulkeRozetiGerekli('FR'), 'FR');
  assert.equal(ulkeRozetiGerekli('fr'), 'FR');
  assert.equal(ulkeRozetiGerekli('DE'), 'DE');
});

test('ülke olmayan kodlar rozete dönüşmüyor', () => {
  // 'ZZ' Intl tablosunda "Bilinmeyen Bölge" olarak karşılık buluyor; rozette
  // böyle bir kutu çıkmasın diye kod geçerliliği ülke seçicinin kuralıyla
  // ölçülüyor.
  assert.equal(ulkeRozetiGerekli('ZZ'), null);
  assert.equal(ulkeRozetiGerekli('EU'), null);
  assert.equal(ulkeRozetiGerekli('FRANSA'), null);
  assert.equal(ulkeRozetiGerekli(42), null);
});

/* ---------------------------------------------------------------- ülke adı */

test('ülke kodu Türkçe adıyla yazılıyor', () => {
  assert.equal(ulkeAdi('FR'), 'Fransa');
  assert.equal(ulkeAdi('fr'), 'Fransa');
  assert.equal(ulkeAdi('DE'), 'Almanya');
});

test('ulkeAdi geçersiz kodda uydurma ad üretmiyor', () => {
  assert.equal(ulkeAdi('FRANSA'), 'FRANSA');
  assert.equal(ulkeAdi('1'), '1');
  assert.equal(ulkeAdi(''), '');
});

/* ------------------------------------------------------- arayüz sözleşmesi */

test('rozet bayrak emojisi kullanmıyor', () => {
  // Bölge göstergesi harf çiftleri Windows'ta bayrak olarak çizilmiyor, iki
  // büyük harf olarak görünüyor.
  assert.equal(/[\u{1F1E6}-\u{1F1FF}]/u.test(rozet), false);
  assert.equal(/[\u{1F1E6}-\u{1F1FF}]/u.test(kart), false);
  assert.equal(/[\u{1F1E6}-\u{1F1FF}]/u.test(detay), false);
});

test('rozet kararı tek kurala, ad tek çözücüye bağlı', () => {
  assert.match(rozet, /ulkeRozetiGerekli\(countryCode\)/);
  assert.match(rozet, /from '\.\.\/lib\/ulke-adi'/);
  // İkinci bir Intl.DisplayNames örneği ya da elle yazılmış ülke tablosu yok.
  assert.equal(rozet.includes('Intl.DisplayNames'), false);
});

test('rozet ekran okuyucuda konumdan ayrı okunuyor', () => {
  assert.match(rozet, /sr-only[^>]*>Ülke:/);
});

test('kart ve ilan detayı aynı rozeti ilanın ülke koduyla çiziyor', () => {
  assert.match(kart, /<UlkeRozeti countryCode=\{listing\.countryCode\}/);
  assert.match(detay, /<UlkeRozeti countryCode=\{listing\.countryCode\}/);
});
