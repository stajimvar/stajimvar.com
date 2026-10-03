import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET İLAN KARTI KAP GENİŞLİĞİNE GÖRE DİZİLİYOR

  Canlıda (4 Ekim 2026, 1919 px ekran, /sirket/profil) kart üç sütunlu
  sayfanın ~750 px'lik orta sütunundaydı; `sm:flex-row` ekrana baktığı
  için üç bölüm yan yana dizildi ve metin sütunu 0 px'e indi: başlık
  görünmedi, şirket adı harf harf alt alta yazıldı. Fikstürde 750 px
  kapta aynı tablo ölçüldü.

  Bu testler yerleşimin EKRAN kırılımına geri dönmesini ve metin
  sütununun alt sınırının kaybolmasını yakalıyor. Eşiğin sayısı
  (60 rem) gerekçesiyle birlikte bileşenin yorumunda.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
const kodu = (metin) =>
  metin
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

const kart = kodu(oku('src/sirket/IlanKarti.tsx'));
/* Yalnız `IlanKarti`; altındaki `YeniIlanKarti` bu yerleşimin parçası değil. */
const ilanKarti = kart.slice(kart.indexOf('export const IlanKarti'), kart.indexOf('export const YeniIlanKarti'));

test('kartın kabı container; satır kap kırılımıyla yan yana iniyor', () => {
  assert.match(ilanKarti, /<li className="@container /);
  assert.match(
    ilanKarti,
    /<div className="flex flex-col gap-3 @min-\[60rem\]:flex-row @min-\[60rem\]:items-center @min-\[60rem\]:gap-4">/,
  );
});

test('satırın yerleşim sınıflarında EKRAN kırılımı kalmadı', () => {
  /*
    Kartın kendi dolgusu (`sm:p-5`) ekrana bakabilir; dizilişi belirleyen
    sınıflar bakamaz. Kart dar bir sütunda dururken ekran geniş olabiliyor.
  */
  for (const sinif of ['sm:flex-row', 'sm:flex-1', 'sm:w-56', 'sm:shrink-0', 'sm:min-w-[232px]', 'sm:justify-end']) {
    assert.ok(!ilanKarti.includes(sinif), `${sinif} kap kırılımına çevrilmeli`);
  }
  assert.match(ilanKarti, /@min-\[60rem\]:w-56 @min-\[60rem\]:shrink-0/);
  assert.match(ilanKarti, /@min-\[60rem\]:min-w-\[232px\] @min-\[60rem\]:shrink-0 @min-\[60rem\]:justify-end/);
});

test('metin sütunu 12 rem altına inmiyor, sığmazsa logonun altına sarıyor', () => {
  assert.match(ilanKarti, /<div className="flex min-w-0 items-start gap-3 flex-wrap @min-\[60rem\]:flex-1">/);
  assert.match(ilanKarti, /<div className="min-w-48 flex-1">/);
});
