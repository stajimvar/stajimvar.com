import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { tarihMetni, kisaTarihMetni, tarihSaatMetni } from '../src/lib/tarih.mjs';

/*
  TARİH BİÇİMİ — İKİ AYRI HATA

  1. Ham ISO sızıyordu: ilan kartında "Son: 2026-09-06" yazıyordu.
  2. Saatsiz tarihlerde GÜN KAYIYORDU. `new Date('2026-09-06')` UTC gece
     yarısı; yerel saate çevrilince UTC'nin batısındaki okuyucu 5 Eylül
     görüyordu. Son başvuru tarihinde bu bir gün kaybettirir.

  İkincisi bu dosyanın asıl konusu: aynı testi başka bir saat diliminde
  ayrı bir süreçte çalıştırıyoruz, çünkü Intl saat dilimini süreç
  başlarken okuyor.
*/

test('saatsiz tarih Türkçe uzun biçimde yazılıyor', () => {
  assert.equal(tarihMetni('2026-09-06'), '6 Eylül 2026');
  assert.equal(tarihMetni('2026-01-01'), '1 Ocak 2026');
  assert.equal(tarihMetni('2026-12-31'), '31 Aralık 2026');
});

test('dar kartlar için yıl atılabiliyor', () => {
  assert.equal(tarihMetni('2026-09-06', { yil: false }), '6 Eylül');
  assert.equal(kisaTarihMetni('2026-09-06', { yil: false }), '6 Eyl');
});

test('BASILMAYACAK DEĞERLER null dönüyor, "Invalid Date" değil', () => {
  for (const bos of [null, undefined, '', '   ', '-', '—', 'null', 'undefined', 'bozuk']) {
    assert.equal(tarihMetni(bos), null, JSON.stringify(bos));
    assert.equal(kisaTarihMetni(bos), null, JSON.stringify(bos));
    assert.equal(tarihSaatMetni(bos), null, JSON.stringify(bos));
  }
});

test('ham YYYY-MM-DD hiçbir koşulda geri dönmüyor', () => {
  assert.doesNotMatch(String(tarihMetni('2026-09-06')), /\d{4}-\d{2}-\d{2}/);
});

test('SAATSİZ TARİHTE GÜN KAYMIYOR — UTC batısında da 6 Eylül', () => {
  /*
    Ayrı süreç: Intl saat dilimini süreç başlarken okuduğu için aynı
    süreçte TZ değiştirmek güvenilir sonuç vermiyor.
  */
  const kod =
    "import('./src/lib/tarih.mjs').then(m => " +
    "process.stdout.write(m.tarihMetni('2026-09-06')))";
  for (const dilim of ['America/Los_Angeles', 'Pacific/Kiritimati', 'Asia/Tokyo', 'UTC']) {
    const cikti = execFileSync(process.execPath, ['--input-type=module', '-e', kod], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, TZ: dilim },
      encoding: 'utf8',
    });
    assert.equal(cikti, '6 Eylül 2026', `${dilim} dilimi günü kaydırdı`);
  }
});

test('SAATLİ değer okuyucunun kendi diliminde — o gerçekten bir an', () => {
  /* Saatsiz olanın aksine timestamp yereldir; UTC'ye sabitlenmemeli. */
  const kod =
    "import('./src/lib/tarih.mjs').then(m => " +
    "process.stdout.write(m.tarihSaatMetni('2026-09-06T21:00:00Z')))";
  const oku = (dilim) =>
    execFileSync(process.execPath, ['--input-type=module', '-e', kod], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, TZ: dilim },
      encoding: 'utf8',
    });
  assert.notEqual(oku('Asia/Tokyo'), oku('America/Los_Angeles'));
});

test('Date nesnesi de kabul ediliyor', () => {
  assert.equal(tarihMetni(new Date(Date.UTC(2026, 8, 6, 12))), '6 Eylül 2026');
  assert.equal(tarihMetni(new Date('bozuk')), null);
});
