import test from 'node:test';
import assert from 'node:assert/strict';
import { kaynagiOlc, guncellemeyiHesapla } from '../scripts/firsat-kaynak-kontrol.mjs';

/*
  FIRSAT KAYNAK KONTROLÜ — ÜÇ VURUŞ KURALI

  Riskli olan tek şey: geçici hatanın kapanma sayılması. Bir saatlik
  bakım yüzünden geçerli bir burs listeden düşerse kimse fark etmez.
  Aşağıdaki iddialar o sınırı ölçüyor; ağ yok, fetch taklit ediliyor.
*/

const yanit = (status, url = 'https://burs.kurum.edu.tr/2026') => async () => ({ status, ok: status >= 200 && status < 300, url });
const SIMDI = '2026-09-11T10:00:00.000Z';

test('404/410 kapanma, 403/429/5xx ve zaman aşımı geçici', async () => {
  assert.equal((await kaynagiOlc('https://burs.kurum.edu.tr/2026', yanit(404))).durum, 'closed');
  assert.equal((await kaynagiOlc('https://burs.kurum.edu.tr/2026', yanit(410))).durum, 'closed');
  assert.equal((await kaynagiOlc('https://burs.kurum.edu.tr/2026', yanit(403))).durum, 'transient_error');
  assert.equal((await kaynagiOlc('https://burs.kurum.edu.tr/2026', yanit(429))).durum, 'transient_error');
  assert.equal((await kaynagiOlc('https://burs.kurum.edu.tr/2026', yanit(503))).durum, 'transient_error');
  const agHatasi = await kaynagiOlc('https://burs.kurum.edu.tr/2026', async () => { throw new Error('ECONNRESET'); });
  assert.equal(agHatasi.durum, 'transient_error');
});

test('başka alan adına düşen kaynak "taşındı"; www ve alt alan aynı kurum', async () => {
  const tasindi = await kaynagiOlc('https://burs.kurum.edu.tr/2026', yanit(200, 'https://baskasite.com/'));
  assert.equal(tasindi.durum, 'moved');
  const ayniKurum = await kaynagiOlc('https://burs.kurum.edu.tr/2026', yanit(200, 'https://www.kurum.edu.tr/burslar'));
  assert.equal(ayniKurum.durum, 'ok');
});

test('geçici hata sayaca dokunmuyor; kesin kapanma ikide, taşınma üçte düşüyor; ok sıfırlıyor', () => {
  /*
    EŞİK DEĞİŞTİ — TEK 3 YERİNE İKİ AYRI EŞİK

    Bu test "üçüncü art arda kapanmada expired" bekliyordu. Kontrol üç
    günde bir koştuğu için o kural, KESİN kapanmış (404/410) bir fırsatı
    dokuz gün aktif listede tutuyordu; canlıda iki kayıt 404 döndü ve
    ikisi de `published` kaldı.

    İşçi geçici ile kesini zaten ayırıyor (403/429/5xx sayaca hiç
    girmiyor), yani sayaca giren şey baştan kesin bir sinyal:
      closed 2 teyit · moved 3 teyit (yönlendirme geçici olabilir)
  */
  const satir = { status: 'published', source_failure_count: 2 };

  /* GEÇİCİ HATA: ne artırıyor ne sıfırlıyor, kapatmıyor. */
  const gecici = guncellemeyiHesapla(satir, { durum: 'transient_error' }, SIMDI);
  assert.equal(gecici.source_failure_count, undefined, 'GEÇİCİ HATA SAYACA DOKUNMAMALI');
  assert.equal(gecici.status, undefined, 'geçici hata kapatmamalı');

  /* KESİN KAPANMA: ilk vuruş düşürmüyor, ikinci düşürüyor. */
  const ilk = guncellemeyiHesapla({ status: 'published', source_failure_count: 0 }, { durum: 'closed' }, SIMDI);
  assert.equal(ilk.source_failure_count, 1);
  assert.equal(ilk.status, undefined, 'tek 404 düşürmemeli: dağıtım hatası olabilir');

  const ikinci = guncellemeyiHesapla({ status: 'published', source_failure_count: 1 }, { durum: 'closed' }, SIMDI);
  assert.equal(ikinci.source_failure_count, 2);
  assert.equal(ikinci.status, 'expired', 'İKİNCİ TEYİTTE AKTİF LİSTEDEN ÇIKIYOR');

  /* TAŞINMA: yönlendirme geçici olabilir, üç teyit istiyor. */
  const tasindiIki = guncellemeyiHesapla({ status: 'published', source_failure_count: 1 }, { durum: 'moved' }, SIMDI);
  assert.equal(tasindiIki.status, undefined, 'taşınmada iki vuruş yetmiyor');
  const tasindiUc = guncellemeyiHesapla(satir, { durum: 'moved' }, SIMDI);
  assert.equal(tasindiUc.source_failure_count, 3);
  assert.equal(tasindiUc.status, 'expired');

  /* Kaynak toparlanırsa sayaç sıfırlanıyor ve doğrulama damgası düşüyor. */
  const toparlandi = guncellemeyiHesapla(satir, { durum: 'ok' }, SIMDI);
  assert.equal(toparlandi.source_failure_count, 0, 'ok sayacı sıfırlamalı');
  assert.equal(toparlandi.verified_at, SIMDI);
});
