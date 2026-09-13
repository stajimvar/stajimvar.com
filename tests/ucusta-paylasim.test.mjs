import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ucustaPaylas, ucustaSifirla } from '../src/lib/ucusta-paylas.mjs';

/*
  AYNI ANDA İSTENEN AYNI ŞEY

  Ölçüldü (canlı, 13 Eylül 2026, /agim, tek açılış): aynı avatar
  dosyası BEŞ kez indi, kendi sosyal profilin İKİ kez soruldu. Avatarı
  çizen bileşenler (üst çubuk, sağ sütun kartı, üç paylaşım başlığı)
  aynı commit'te bağlanıyor, yani beş istek aynı tikte açılıyordu.

  Bu davranış ÇALIŞTIRILARAK ölçülüyor: kaynak metnine bakan bir test,
  eşzamanlılıkla ilgili bir hatayı yakalayamazdı.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

test('aynı anda gelen çağrılar tek isteğe bağlanıyor', async () => {
  ucustaSifirla();
  let cagri = 0;
  let coz;
  const bekleyen = new Promise((r) => {
    coz = r;
  });
  const uret = () => {
    cagri += 1;
    return bekleyen;
  };

  const hepsi = Promise.all([
    ucustaPaylas('a', uret),
    ucustaPaylas('a', uret),
    ucustaPaylas('a', uret),
    ucustaPaylas('a', uret),
    ucustaPaylas('a', uret),
  ]);
  assert.equal(cagri, 1, 'beş çağıran tek istek açmalı');

  coz('sonuç');
  const sonuclar = await hepsi;
  /* Hepsi AYNI sonucu alıyor: ikinci bir okuma yapılmadı. */
  assert.deepEqual(sonuclar, ['sonuç', 'sonuç', 'sonuç', 'sonuç', 'sonuç']);
});

test('BİR ÖNBELLEK DEĞİL: istek bitince yeniden soruluyor', async () => {
  /*
    Ayrım bu depoda kritik: özel kovadaki dosya her indirmede okuma
    politikasından yeniden geçiyor (imzalı adres tam bu yüzden
    kaldırılmıştı). Sonucu saklayan bir önbellek o kararı dondururdu.
  */
  ucustaSifirla();
  let cagri = 0;
  const uret = async () => {
    cagri += 1;
    return cagri;
  };

  assert.equal(await ucustaPaylas('b', uret), 1);
  assert.equal(await ucustaPaylas('b', uret), 2, 'biten istek haritada kalmamalı');
  assert.equal(cagri, 2);
});

test('hata da haritayı temizliyor', async () => {
  /*
    Başarısız bir istek haritada kalsaydı, sonraki bütün çağıranlar hep
    aynı hataya bağlanırdı — geçici bir kesinti kalıcı bir arızaya
    dönerdi.
  */
  ucustaSifirla();
  let cagri = 0;
  const uret = async () => {
    cagri += 1;
    if (cagri === 1) throw new Error('ağ');
    return 'ikinci deneme';
  };

  await assert.rejects(() => ucustaPaylas('c', uret), /ağ/);
  assert.equal(await ucustaPaylas('c', uret), 'ikinci deneme');
});

test('farklı anahtarlar birbirine karışmıyor', async () => {
  ucustaSifirla();
  const [x, y] = await Promise.all([
    ucustaPaylas('x', async () => 'X'),
    ucustaPaylas('y', async () => 'Y'),
  ]);
  assert.equal(x, 'X');
  assert.equal(y, 'Y');
});

test('avatar indirmesi ve kendi profilin bu paylaşımdan geçiyor', () => {
  const sosyal = oku('src/lib/queries/sosyal.ts');
  /* Anahtar kovayı da taşıyor: iki kovadaki aynı ad çakışmasın. */
  assert.match(sosyal, /ucustaPaylas\(`gorsel:\$\{kova\}:\$\{yol\}`/);
  assert.match(sosyal, /ucustaPaylas\(`kendiSosyalProfil:\$\{kullaniciId\}`/);

  /*
    Dönen Blob paylaşılıyor ama her çağıran KENDİ object URL'ini
    üretiyor; temizlik yine çağıranda ve tek tek.
  */
  const kanca = oku('src/components/sosyal/useGorselAdresleri.ts');
  assert.match(kanca, /const adres = URL\.createObjectURL\(blob\);/);
  assert.match(kanca, /for \(const adres of uretilen\) URL\.revokeObjectURL\(adres\);/);
});
