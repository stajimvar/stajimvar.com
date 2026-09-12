import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

/**
 * `src/data/veri-sayilari.ts` ELLE yazılmış üç sayı tutuyor ve
 * `SonrakiAdim` bunları anasayfada gösteriyor.
 *
 * Neden elle: o üç sayıyı `BOLUMLER.length` ile okumak `bolumler.ts`
 * (205 KB) ve `stajProgramlari.ts` (21 KB) dosyalarını ana JavaScript
 * paketine taşıyordu — anasayfayı açan herkes bütün bölüm rehberlerini
 * indiriyordu.
 *
 * Elle yazılmış sayı zamanla veriden kopar ve kullanıcıya yanlış bilgi
 * verir. Bu test kopmayı yayına çıkmadan yakalıyor: veri dosyasına bir
 * satır eklenip sabit güncellenmezse kırmızı yanıyor.
 */

const oku = (yol) => readFileSync(yol, 'utf8');

/** Üst düzey dizi girdilerini sayar: her kayıt iki boşlukla açılan bir `{`. */
const kayitSayisi = (kaynak) =>
  kaynak.split('\n').filter((satir) => /^ {2}\{/.test(satir)).length;

/** `export const AD = 42;` satırından sayıyı çeker. */
const sabit = (kaynak, ad) => {
  const eslesme = kaynak.match(new RegExp(`export const ${ad} = ([0-9]+);`));
  assert.ok(eslesme, `${ad} sabiti bulunamadı`);
  return Number(eslesme[1]);
};

const sayilar = oku('src/data/veri-sayilari.ts');

test('bölüm sayısı veriyle aynı', () => {
  assert.equal(sabit(sayilar, 'BOLUM_SAYISI'), kayitSayisi(oku('src/data/bolumler.ts')));
});

test('staj programı sayısı veriyle aynı', () => {
  assert.equal(
    sabit(sayilar, 'STAJ_PROGRAMI_SAYISI'),
    kayitSayisi(oku('src/data/stajProgramlari.ts')),
  );
});

test('kariyer merkezi sayısı veriyle aynı', () => {
  assert.equal(
    sabit(sayilar, 'KARIYER_MERKEZI_SAYISI'),
    kayitSayisi(oku('src/data/kariyerMerkezleri.ts')),
  );
});

test('SonrakiAdim ağır veri dosyalarını import etmiyor', () => {
  // Asıl korunan şey sayı değil, paketin büyüklüğü: bu import geri
  // gelirse anasayfa yeniden 226 KB fazladan JavaScript indirir.
  const govde = oku('src/components/SonrakiAdim.tsx');
  assert.ok(!/from '\.\.\/data\/bolumler'/.test(govde));
  assert.ok(!/from '\.\.\/data\/stajProgramlari'/.test(govde));
  assert.ok(!/from '\.\.\/data\/kariyerMerkezleri'/.test(govde));
});
