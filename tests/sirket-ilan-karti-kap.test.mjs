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

  O hatayı yaratan yatay satır 25 Kasım 2026'da kalktı (aşağıda). Bu
  testler metin sütununun alt sınırını ve dikey ızgara kartının
  kurallarını koruyor.
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

/*
  25 KASIM 2026: KART DİKEY, LİSTE IZGARA

  Yatay üç bölümlü satır kalktı; kart her genişlikte dikey (kimlik → not
  → stat → eylemler) ve GenelBakis'te 1/2 sütunlu ızgaranın hücresi. Kap
  sorgusu (@container) da kalktı: dizilişi kap genişliğine bağlı bir
  satır yok, ve li'ye getirdiği düzen sınırlaması taşma menüsünün
  `fixed inset-0` katmanını kartın içine hapsediyordu. Aşağıdaki iddialar
  4 Ekim'deki "metin sütunu 0 px" hatasının geri dönmesini yakalamaya
  devam ediyor: metin sütununun 12 rem alt sınırı ve sarma kuralı duruyor.
*/

test('kart ızgara hücresi: eşit boy, eylemler dipte; kap sorgusu yok', () => {
  assert.match(ilanKarti, /<li className="flex h-full min-w-0 flex-col /);
  assert.ok(!ilanKarti.includes('@container'), 'li düzen sınırlaması menüyü hapsediyor');
  assert.match(ilanKarti, /<div className="mt-auto flex flex-wrap items-center gap-2 pt-3">/);
});

test('başlık kesilmiyor; bilgi üç noktaya kalmıyor', () => {
  assert.ok(!/<h3[^>]*truncate/.test(ilanKarti), 'başlık truncate olmamalı');
  assert.match(ilanKarti, /<h3 className="break-words /);
});

test('metin sütunu 12 rem altına inmiyor, sığmazsa logonun altına sarıyor', () => {
  assert.match(ilanKarti, /<div className="flex min-w-0 items-start gap-3 flex-wrap">/);
  assert.match(ilanKarti, /<div className="min-w-48 flex-1">/);
});

test("liste ızgarası telefonda tek, xl'de iki sütun; menü eylem satırının sağında", () => {
  const genel = kodu(oku('src/sirket/GenelBakis.tsx'));
  assert.match(genel, /<ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">/);
  assert.match(genel, /<div className="relative ml-auto">/);
});
