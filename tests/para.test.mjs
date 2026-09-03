import test from 'node:test';
import assert from 'node:assert/strict';
import { paraCoz, yuzdeKurus, kurusBicim } from '../src/lib/para.mjs';

/*
  BU TEST NEYİ KORUYOR

  Staj ücreti aracı tutarı `Number(metin.replace(/[^\d]/g, ''))` ile
  okuyordu. Ondalık ayırıcı da silindiği için "28075,50" → 2807550 oluyor,
  yüzde 15'i 421.132,50 TL çıkıyordu: doğrusunun tam yüz katı. Araç
  öğrenciye "işveren sana en az 421 bin lira ödemeli" diyordu.

  Aşağıdaki tablo o hatanın geri gelmesini imkânsız kılıyor.
*/

const beklenen = [
  ['28.075,50', 2_807_550],
  ['28075,50', 2_807_550],
  ['28075.50', 2_807_550],
  ['28.075', 2_807_500],
  ['28075', 2_807_500],
];

test('para ayrıştırma: istenen beş biçim', () => {
  for (const [girdi, kurus] of beklenen) {
    const s = paraCoz(girdi);
    assert.equal(s.gecerli, true, `${girdi} geçerli olmalı (${s.hata})`);
    assert.equal(s.kurus, kurus, `${girdi} → ${kurus} kuruş bekleniyordu`);
  }
});

test('yüzde 15 sonucu kuruşta doğru', () => {
  /* Şartnamedeki iki sonuç. */
  assert.equal(kurusBicim(yuzdeKurus(paraCoz('28075,50').kurus, 15)), '4.211,33');
  assert.equal(kurusBicim(yuzdeKurus(paraCoz('28075').kurus, 15)), '4.211,25');
});

test('100 KAT HATASI: hiçbir biçim 421.132,50 üretmiyor', () => {
  for (const [girdi] of beklenen) {
    const c = kurusBicim(yuzdeKurus(paraCoz(girdi).kurus, 15));
    assert.notEqual(c, '421.132,50', `${girdi} yüz kat şişmiş sonuç verdi`);
  }
});

test('binlik ve ondalık birlikte', () => {
  assert.equal(paraCoz('1.234.567,89').kurus, 123_456_789);
  assert.equal(paraCoz('1,234,567.89').kurus, 123_456_789);
  /* Boşluk da binlik ayırıcı olabiliyor. */
  assert.equal(paraCoz('28 075,50').kurus, 2_807_550);
});

test('geçersiz girdide sonuç yok', () => {
  const gecersiz = [
    ['', 'boş'],
    ['   ', 'yalnızca boşluk'],
    ['abc', 'harf'],
    ['28075abc', 'sayı + harf'],
    ['-500', 'negatif'],
    ['0', 'sıfır'],
    ['0,00', 'sıfır kuruş'],
    ['28.07.5', 'bozuk binlik'],
    ['28,075,5', 'bozuk gruplama'],
    ['1,2,3', 'çoklu ayırıcı'],
    ['28075,505', 'üç haneli kuruş'],
    ['99999999999', 'gerçek dışı yüksek'],
    ['28075,', 'eksik ondalık'],
  ];
  for (const [girdi, neden] of gecersiz) {
    const s = paraCoz(girdi);
    assert.equal(s.gecerli, false, `${JSON.stringify(girdi)} (${neden}) reddedilmeliydi`);
    assert.equal(s.kurus, null);
    assert.ok(s.hata, 'hata metni olmalı');
  }
});

test('yüzde 30 ve yuvarlama', () => {
  /* 28075,50 × %30 = 8422,65 — kuruşta tam. */
  assert.equal(kurusBicim(yuzdeKurus(paraCoz('28075,50').kurus, 30)), '8.422,65');
  /* Yarım kuruş yukarı yuvarlanıyor: 1,00 TL'nin %15'i 0,15 TL. */
  assert.equal(yuzdeKurus(100, 15), 15);
  /* 0,01 TL'nin %15'i 0,0015 → 0 kuruşa yuvarlanıyor, negatife düşmüyor. */
  assert.equal(yuzdeKurus(1, 15), 0);
});

test('kayan nokta sapması yok', () => {
  /*
    Ondalıkla yapılsaydı 1470,15 × 0,15 = 220.52249999999998 çıkıyor ve
    iki haneye kırpınca 220,52 yerine 220,52 görünse de birikimli hesapta
    sapıyor. Tam sayıda böyle bir aralık yok.
  */
  assert.equal(yuzdeKurus(147_015, 15), 22_052);
  assert.equal(Number.isInteger(yuzdeKurus(2_807_550, 15)), true);
});
