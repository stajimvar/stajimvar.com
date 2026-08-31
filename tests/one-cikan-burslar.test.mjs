import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONE_CIKAN_EN_AZ,
  ONE_CIKAN_EN_FAZLA,
  ONE_CIKAN_UFUK_GUN,
  oneCikabilir,
  oneCikanBurslar,
  oneCikanPuani,
} from '../src/lib/one-cikan-burslar.mjs';

/*
  ÖNE ÇIKAN BURSLAR

  Şerit bir vitrin ve vitrine ne konduğunun açıklanabilir olması gerekiyor:
  "öne çıkan" deyip listenin ilk sekiz kaydını koymak, olmayan bir seçki
  vaat etmek olurdu.

  Bu testler seçimin veriden çıktığını ve uydurma bir sinyal (popülerlik,
  editör seçimi) girmediğini bağlıyor.
*/

const gun = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const firsat = (n, ek = {}) => ({ id: `f${n}`, applicationDeadline: gun(n), ...ek });

/* ------------------------------------------------------------ uygunluk */

test('süresi geçmiş kayıt şeride girmiyor', () => {
  assert.equal(oneCikabilir(firsat(-1)), false);
});

test('takvimi açıklanmamış kayıt şeride girmiyor', () => {
  /*
    Şeridin taşıdığı tek güçlü sinyal zaman. "Kaçırma" diyen bir vitrine
    "ne zaman olduğunu bilmiyoruz" diyen kart konmaz.
  */
  assert.equal(oneCikabilir({ id: 'x' }), false);
  assert.equal(oneCikabilir({ id: 'x', applicationDeadline: null }), false);
});

test('ufuktan uzak kayıt şeride girmiyor', () => {
  assert.equal(oneCikabilir(firsat(ONE_CIKAN_UFUK_GUN)), true);
  assert.equal(oneCikabilir(firsat(ONE_CIKAN_UFUK_GUN + 5)), false);
});

test('henüz açılmamış kayıt şeride girmiyor', () => {
  assert.equal(oneCikabilir({ id: 'x', applicationStartAt: gun(10), applicationDeadline: gun(30) }), false);
});

/* --------------------------------------------------------------- puan */

test('son tarihi yakın olan daha yüksek puan alıyor', () => {
  assert.ok(oneCikanPuani(firsat(2)) > oneCikanPuani(firsat(10)));
  assert.ok(oneCikanPuani(firsat(10)) > oneCikanPuani(firsat(40)));
});

test('doğrulanmış tutar puanı yükseltiyor', () => {
  const tutarsiz = firsat(10);
  const tutarli = firsat(10, {
    amountMin: 3000,
    currency: 'TRY',
    paymentPeriod: 'monthly',
    amountVerifiedAt: '2026-08-01T00:00:00Z',
  });
  assert.ok(oneCikanPuani(tutarli) > oneCikanPuani(tutarsiz));
});

test('DOĞRULANMAMIŞ tutar puanı yükseltmiyor', () => {
  /*
    Damgasız tutar doğrulanmış sayılmıyor (bkz. burs-uygunluk modeli).
    Puan da onu doğrulanmış gibi ödüllendirmemeli.
  */
  const damgasiz = firsat(10, { amountMin: 3000, currency: 'TRY', paymentPeriod: 'monthly' });
  assert.equal(oneCikanPuani(damgasiz), oneCikanPuani(firsat(10)));
});

test('doğrulanmış kaynak ve görsel puanı yükseltiyor', () => {
  assert.ok(oneCikanPuani(firsat(10, { verifiedAt: 'x' })) > oneCikanPuani(firsat(10)));
  assert.ok(
    oneCikanPuani(firsat(10, { coverImageUrl: 'k' })) >
      oneCikanPuani(firsat(10, { organizationLogoUrl: 'l' })),
  );
  assert.ok(oneCikanPuani(firsat(10, { organizationLogoUrl: 'l' })) > oneCikanPuani(firsat(10)));
});

/* ------------------------------------------------------------- seçki */

test('üçten az uygun kayıt varsa şerit boş', () => {
  /* Tek ya da iki kartlık vitrin, kaydırma vaat edip kaydıracak şey vermiyor. */
  assert.deepEqual(oneCikanBurslar([firsat(2), firsat(4)]), []);
  assert.equal(oneCikanBurslar(Array.from({ length: ONE_CIKAN_EN_AZ }, (_, i) => firsat(i + 1))).length, ONE_CIKAN_EN_AZ);
});

test('en fazla belirlenen sayıda kart dönüyor', () => {
  const cok = Array.from({ length: 20 }, (_, i) => firsat(i + 1));
  assert.equal(oneCikanBurslar(cok).length, ONE_CIKAN_EN_FAZLA);
});

test('sıralama puana göre; eşitlikte önce kapanan önde', () => {
  const liste = [firsat(30), firsat(1), firsat(12)];
  assert.deepEqual(
    oneCikanBurslar(liste).map((x) => x.id),
    ['f1', 'f12', 'f30'],
  );
});

test('aynı girdi her çağrıda aynı sırayı veriyor', () => {
  /* Rastgelelik yok: her yüklemede değişen bir vitrin güven vermiyor. */
  const liste = [firsat(5), firsat(5, { verifiedAt: 'x' }), firsat(6), firsat(7)];
  const ilk = oneCikanBurslar(liste).map((x) => x.id);
  const ikinci = oneCikanBurslar(liste).map((x) => x.id);
  assert.deepEqual(ilk, ikinci);
});

test('girdi dizisi değiştirilmiyor', () => {
  const liste = [firsat(9), firsat(2), firsat(5)];
  const kopya = liste.map((x) => x.id);
  oneCikanBurslar(liste);
  assert.deepEqual(liste.map((x) => x.id), kopya);
});

test('uygun olmayan kayıtlar seçkiye hiç girmiyor', () => {
  const liste = [
    firsat(2),
    firsat(3),
    firsat(4),
    firsat(-5),
    { id: 'tarihsiz' },
    firsat(ONE_CIKAN_UFUK_GUN + 10),
  ];
  const secilen = oneCikanBurslar(liste).map((x) => x.id);
  assert.ok(!secilen.includes('tarihsiz'));
  assert.ok(!secilen.includes('f-5'));
  assert.ok(!secilen.includes(`f${ONE_CIKAN_UFUK_GUN + 10}`));
});

test('boş liste güvenli', () => {
  assert.deepEqual(oneCikanBurslar([]), []);
  assert.deepEqual(oneCikanBurslar(), []);
});
