import test from 'node:test';
import assert from 'node:assert/strict';
import { satirNeti, toplamNet } from '../src/lib/net-hesap.mjs';

/*
  BU TEST NEYİ KORUYOR

  Doğru ile yanlış toplamı soru sayısını aşınca satır "hatalı" diye
  işaretleniyor ama neti YİNE toplama ekleniyordu. Araç aynı anda hem "bu
  satır yanlış" diyor hem o satırın netini sonuca katıyordu; uyarıyı
  okumayan öğrenci olmayan bir neti kendi neti sanıyordu.
*/

test('geçerli satır: dört yanlış bir doğruyu götürüyor', () => {
  const s = satirNeti(40, '20', '8');
  assert.equal(s.gecerli, true);
  assert.equal(s.net, 18); // 20 - 8/4
});

test('boş satır geçerli ve net sıfır', () => {
  const s = satirNeti(40, '', '');
  assert.equal(s.gecerli, true);
  assert.equal(s.bos, true);
  assert.equal(s.net, 0);
});

test('TOPLAM AŞIMI: satır geçersiz, net üretilmiyor', () => {
  const s = satirNeti(40, '35', '10'); // 45 > 40
  assert.equal(s.gecerli, false);
  assert.equal(s.net, null, 'aşan satırda net olmamalı');
  assert.match(s.hata, /aşıyor/);
});

test('sınırda kalan satır geçerli', () => {
  const s = satirNeti(40, '30', '10'); // tam 40
  assert.equal(s.gecerli, true);
  assert.equal(s.net, 27.5);
});

test('negatif, ondalık ve harf reddediliyor', () => {
  for (const [d, y, neden] of [
    ['-5', '0', 'negatif doğru'],
    ['0', '-5', 'negatif yanlış'],
    ['10,5', '0', 'ondalık doğru'],
    ['10.5', '0', 'ondalık nokta'],
    ['abc', '0', 'harf'],
    ['5a', '0', 'sayı + harf'],
  ]) {
    const s = satirNeti(40, d, y);
    assert.equal(s.gecerli, false, `${neden} reddedilmeliydi`);
    assert.equal(s.net, null);
    assert.ok(s.hata);
  }
});

test('GEÇERSİZ SATIR TOPLAMA KATILMIYOR', () => {
  const satirlar = [
    satirNeti(40, '20', '8'), // net 18
    satirNeti(40, '35', '10'), // geçersiz
    satirNeti(20, '10', '4'), // net 9
  ];
  const t = toplamNet(satirlar);
  assert.equal(t.gecerli, false, 'bir satır geçersizken toplam üretilmemeli');
  assert.equal(t.toplam, null);
  assert.equal(t.gecersizSayisi, 1);
});

test('hepsi geçerliyse toplam çıkıyor', () => {
  const t = toplamNet([satirNeti(40, '20', '8'), satirNeti(20, '10', '4')]);
  assert.equal(t.gecerli, true);
  assert.equal(t.toplam, 27); // 18 + 9
});

test('yanlış doğrudan çoksa net negatife düşmüyor', () => {
  assert.equal(satirNeti(40, '0', '20').net, 0);
});
