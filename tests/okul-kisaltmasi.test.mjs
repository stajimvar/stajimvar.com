import test from 'node:test';
import assert from 'node:assert/strict';
import { okulKisaltmasi as kisalt } from '../src/lib/ad-kisaltma.mjs';

/*
  Profil satırında okul ve bölüm tek satıra sığmalı; uzun üniversite adı
  kısaltılıyor. Kural dar tutuldu ve dar kalmalı: iki kelimeli adlarda
  baş harf almak kimsenin kullanmadığı bir kısaltma üretiyor ("Boğaziçi
  Üniversitesi" için "BÜ" — herkes "Boğaziçi" der).

  KURAL ARTIK KOPYALANMIYOR

  Fonksiyon `ad.ts` içindeydi ve Node bir `.ts` dosyasını çalıştıramadığı
  için kural burada birebir kopyalanıyor, eşikler de dosyadan metin olarak
  okunuyordu. Kopya, asıl fonksiyon değişince sessizce ayrışabilir bir
  ikinci gerçek demekti.

  Okul rozeti (`lib/okul-rozeti.mjs`) da aynı kısaltmayı kullanıyor ve bir
  `.mjs` modülü `.ts`'ten içe aktaramıyor; fonksiyon bu yüzden
  `ad-kisaltma.mjs`e taşındı ve `ad.ts` onu yeniden dışa veriyor. Test
  artık ASIL fonksiyonu çağırıyor — eşik kayarsa davranış testleri kırılır.
*/

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

test('ad.ts aynı fonksiyonu yeniden dışa veriyor', async () => {
  /*
    Çağıran taraf (`adYazimi` ile aynı dosyadan içe aktaran bileşenler)
    değişmedi; dışa verme kalkarsa TypeScript tarafı kırılır, bu satır da
    onu söyler.
  */
  const fs = await import('node:fs');
  const path = await import('node:path');
  const kaynak = fs.readFileSync(
    path.resolve(import.meta.dirname, '..', 'src', 'lib', 'ad.ts'),
    'utf8',
  );
  assert.match(kaynak, /export \{ okulKisaltmasi \} from '\.\/ad-kisaltma\.mjs';/);
});
