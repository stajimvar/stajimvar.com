import test from 'node:test';
import assert from 'node:assert/strict';
import { guvenSatiri } from '../src/lib/guven-satiri.mjs';

/*
  GÜVEN SATIRI DOĞRULANMAMIŞ İDDİA ÜRETMEMELİ

  Ölçülen üretim değerleri (7 Eylül 2026) bu testlerin girdisi. Sabit bir
  cümle yazılsaydı Fransa listesinde yalan olurdu; testler o dalın sessiz
  kaldığını sabitliyor.
*/

const SIMDI = new Date('2026-09-07T09:00:00+03:00');

test('TÜRKİYE: hepsi doğrulanmış, tarih olduğu gibi yazılıyor', () => {
  const s = guvenSatiri({
    toplam: 62,
    dogrulanan: 62,
    sonDogrulama: '2026-09-06T04:50:09.961+00:00',
    simdi: SIMDI,
  });
  assert.equal(s.ilan, '62 açık ilan');
  assert.equal(s.dogrulama, 'Kaynaklar 6 Eylül 2026 kontrol edildi');
});

test('FRANSA: HİÇ DOĞRULAMA YOKSA CÜMLE KURULMUYOR', () => {
  /* En kolay yalan burada olurdu: 48 ilanın hiçbiri kontrol edilmemiş. */
  const s = guvenSatiri({ toplam: 48, dogrulanan: 0, sonDogrulama: null, simdi: SIMDI });
  assert.equal(s.ilan, '48 açık ilan');
  assert.equal(s.dogrulama, null, 'doğrulanmamış listede kontrol iddiası yazılmamalı');
});

test('KARMA LİSTE: kaçının doğrulandığı açıkça söyleniyor', () => {
  const s = guvenSatiri({
    toplam: 114,
    dogrulanan: 66,
    sonDogrulama: '2026-09-06T04:50:09.961+00:00',
    simdi: SIMDI,
  });
  assert.equal(s.dogrulama, '66 ilanın kaynağı 6 Eylül 2026 kontrol edildi');
  assert.doesNotMatch(s.dogrulama, /^Kaynaklar /, 'kısmi doğrulama "hepsi" gibi okunmamalı');
});

test('"BUGÜN" YALNIZ GERÇEKTEN BUGÜNSE', () => {
  const bugun = guvenSatiri({
    toplam: 62,
    dogrulanan: 62,
    sonDogrulama: '2026-09-07T06:00:00+03:00',
    simdi: SIMDI,
  });
  assert.equal(bugun.dogrulama, 'Kaynaklar bugün kontrol edildi');

  /* Bir gün öncesi "bugün" değil. */
  const dun = guvenSatiri({
    toplam: 62,
    dogrulanan: 62,
    sonDogrulama: '2026-09-06T23:59:00+03:00',
    simdi: SIMDI,
  });
  assert.match(dun.dogrulama, /6 Eylül 2026/);
  assert.doesNotMatch(dun.dogrulama, /bugün/);
});

test('BOZUK VEYA EKSİK VERİDE UYDURMA YOK', () => {
  for (const bozuk of [null, undefined, '', 'yok', '—']) {
    const s = guvenSatiri({ toplam: 10, dogrulanan: 10, sonDogrulama: bozuk, simdi: SIMDI });
    assert.equal(s.dogrulama, null, JSON.stringify(bozuk));
  }
  /* Doğrulama sayısı yoksa da cümle yok. */
  assert.equal(
    guvenSatiri({ toplam: 10, sonDogrulama: '2026-09-06T00:00:00Z', simdi: SIMDI }).dogrulama,
    null
  );
});

test('İLAN YOKSA SATIRIN TAMAMI ÇİZİLMİYOR', () => {
  /* "0 açık ilan · Kaynaklar kontrol edildi" bir güven satırı değil. */
  for (const yok of [0, -1, null, undefined, NaN]) {
    assert.equal(guvenSatiri({ toplam: yok, dogrulanan: 5 }), null, String(yok));
  }
});

test('sayı ile cümle AYNI kaynaktan: ilan sayısı olduğu gibi yazılıyor', () => {
  /* Yuvarlama, "60+" gibi yaklaşık ifade ya da sabit sayı yok. */
  for (const n of [1, 7, 48, 62, 114, 1234]) {
    assert.equal(guvenSatiri({ toplam: n, dogrulanan: 0 }).ilan, `${n} açık ilan`);
  }
});
