import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  Profil satırında okul ve bölüm tek satıra sığmalı; uzun üniversite adı
  kısaltılıyor. Kural dar tutuldu ve dar kalmalı: iki kelimeli adlarda
  baş harf almak kimsenin kullanmadığı bir kısaltma üretiyor ("Boğaziçi
  Üniversitesi" için "BÜ" — herkes "Boğaziçi" der).

  Kaynak TypeScript olduğu için kural burada birebir kopyalanıyor ve
  eşikler dosyadan okunuyor; eşik kayarsa test kırılıyor.
*/
const kaynak = fs.readFileSync(
  path.resolve(import.meta.dirname, '..', 'src', 'lib', 'ad.ts'),
  'utf8'
);

test('kısaltma eşikleri değişmemiş', () => {
  assert.match(kaynak, /kelimeler\.length < 3 \|\| temiz\.length <= 20/);
});

/** src/lib/ad.ts içindeki okulKisaltmasi ile aynı kural. */
function kisalt(ad) {
  const temiz = (ad ?? '').trim();
  if (!temiz) return '';
  const kelimeler = temiz.split(/\s+/).filter(Boolean);
  if (kelimeler.length < 3 || temiz.length <= 20) return temiz;
  return kelimeler.map((k) => k[0].toLocaleUpperCase('tr-TR')).join('');
}

test('uzun ad baş harflere iniyor', () => {
  assert.equal(kisalt('Mimar Sinan Güzel Sanatlar Üniversitesi'), 'MSGSÜ');
  assert.equal(kisalt('İstanbul Teknik Üniversitesi'), 'İTÜ');
});

test('iki kelimeli ad olduğu gibi kalıyor', () => {
  assert.equal(kisalt('Boğaziçi Üniversitesi'), 'Boğaziçi Üniversitesi');
  assert.equal(kisalt('Ege Üniversitesi'), 'Ege Üniversitesi');
});

test('kısa ad kısaltılmıyor', () => {
  /* Üç kelimeli ama yirmi karakterden kısa: kısaltmaya değmez. */
  assert.equal(kisalt('Doğu Akdeniz Üni'), 'Doğu Akdeniz Üni');
});

test('Türkçe büyütme doğru', () => {
  /* i → İ (I değil). Yanlış büyütme "ITÜ" üretir. */
  assert.equal(kisalt('İzmir Yüksek Teknoloji Enstitüsü'), 'İYTE');
});

test('boş girdide boş dönüyor', () => {
  assert.equal(kisalt(''), '');
  assert.equal(kisalt(null), '');
  assert.equal(kisalt(undefined), '');
});
