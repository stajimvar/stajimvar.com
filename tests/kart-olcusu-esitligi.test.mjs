import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ETKİNLİK KARTI REHBER KARTIYLA AYNI ÖLÇÜDE

  Aynı ürünün iki listesi farklı ölçüdeydi. Ölçüldü (1440px, iki sayfada
  da orta sütun 661 piksel):

              ızgara            kart       kapak      başlık
    Rehber    3 x 209.5px       210x357    208x144    16px
    Keşfet    2 x 322.25px      322x395    320x180    18px   <- poster

  Keşfet ilk ekrana 4 kart alıyordu, Rehber 6. Kapak farkı asıl sebepti:
  Keşfet kapağı ORANLI (`aspect-video`) olduğu için sütun genişledikçe
  büyüyor ve kartı aşağı itiyordu; Rehber kapağı SABİT YÜKSEKLİKTE.

  Düzeltildikten sonra ikisi de: 3 x 209.5px, kapak 208x144, başlık 16px.
  Telefonda (390px) ikisi de 2 x 174px, kapak 172x96, başlık 13px.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

const rehber = oku('src/components/RehberKartlari.tsx');
const kesfet = oku('src/components/KesfetPage.tsx');
const kapak = oku('src/components/EventCover.tsx');

test('IZGARA İKİ SAYFADA DA AYNI', () => {
  const izgara = /grid-cols-2 gap-2\.5 sm:gap-4 lg:grid-cols-3/;
  assert.match(rehber, izgara, 'RehberIzgarasi değişmiş');
  assert.match(kesfet, izgara, 'Keşfet ızgarası rehberle aynı olmalı');
});

test('KAPAK SABİT YÜKSEKLİKTE, ORANLI DEĞİL', () => {
  /*
    Oranlı kapak sütun genişledikçe büyüyordu; üç sütuna çıkılamamasının
    sebebi buydu ("üç poster 200 pikselin altına düşer" notu poster kapak
    içindi).
  */
  for (const [ad, kaynak] of [['rehber', rehber], ['keşfet', kesfet]]) {
    assert.match(kaynak, /h-24 w-full shrink-0 overflow-hidden/, ad);
    assert.match(kaynak, /sm:h-36/, ad);
  }
  /* Yorumlar atılıyor: eski kapağı ANLATAN yorum, kapağın kendisi değil. */
  const kart = kesfet
    .slice(kesfet.indexOf('const EventCard'), kesfet.indexOf('const PERIODS'))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(kart, /aspect-video/, 'etkinlik kartında oranlı kapak kalmamalı');
  assert.doesNotMatch(kart, /w-\[104px\]/, 'telefondaki yatay küçük kapak kalmamalı');
});

test('TİPOGRAFİ VE İÇ BOŞLUK AYNI', () => {
  const kart = kesfet.slice(kesfet.indexOf('const EventCard'), kesfet.indexOf('const PERIODS'));
  assert.match(kart, /text-\[13px\] font-bold leading-snug text-gray-900 sm:text-base/);
  assert.match(kart, /gap-1\.5 p-2\.5 sm:gap-2 sm:p-3\.5/);
  /* Rehber kartı da aynı iki değeri kullanıyor. */
  assert.match(rehber, /text-\[13px\] font-bold leading-snug text-gray-900 line-clamp-2 sm:text-base/);
  assert.match(rehber, /gap-1\.5 p-2\.5 sm:gap-2 sm:p-3\.5/);
});

test('İSKELET GERÇEK KARTLA AYNI IZGARADA', () => {
  /* Farklı ızgarada iskelet, içerik gelince sayfayı zıplatırdı. */
  const iskelet = kesfet.slice(kesfet.indexOf('Etkinlikler yükleniyor'));
  assert.match(iskelet.slice(0, 300), /grid-cols-2 gap-2\.5 sm:gap-4 lg:grid-cols-3/);
});

test('TARİH VE YER DAR KARTTA DA KALIYOR', () => {
  /*
    Etkinlikte "ne zaman" ve "nerede" kartın var oluş sebebi; kırpılabilir
    ama gizlenemez. Gizlenen tek şey öğrenci fiyatı — rozet zaten
    "Ücretsiz / Öğrenci indirimli" diyor.
  */
  const kart = kesfet.slice(kesfet.indexOf('const EventCard'), kesfet.indexOf('const PERIODS'));
  assert.match(kart, /formatDiscoverDate\(event\)/);
  assert.match(kart, /formatDiscoverLocation\(event\)/);
  assert.doesNotMatch(kart, /hidden sm:block[^]{0,80}formatDiscoverDate/);
  assert.match(kart, /hidden text-\[11px\] font-bold text-gray-900 sm:block/);
});

test('ÖNBELLEKTEN GELEN KAPAKTA İSKELET KAPANIYOR', () => {
  /*
    İskelet yalnız `onLoad` ile kapanıyordu; tarayıcı görseli React olay
    dinleyicisini bağlamadan bitirirse o olay hiç gelmiyor. Ölçüldü
    (canlı): dokuz kapağın dokuzu `complete` ve naturalWidth 210 iken
    altısında gri iskelet duruyordu — kart boş görünüyordu.
  */
  assert.match(kapak, /node\?\.complete && node\.naturalWidth > 0/);
  assert.match(kapak, /ref=\{imgRef\}/);
  /* onLoad da yerinde: ikisi birbirinin yedeği. */
  assert.match(kapak, /onLoad=\{\(\) => setLoading\(false\)\}/);
});

/* ------------------------------------------------- fırsat kartı */

const firsat = oku('src/components/OpportunitiesPage.tsx');
const tup = oku('src/components/ZamanTupu.tsx');

test('FIRSAT KARTI DA AYNI IZGARADA', () => {
  /*
    Kartlar tek sütunda alt alta diziliyordu. Ölçüldü (390px): kart
    358x246 ve ekrana iki kart giriyordu; rehber ve Keşfet aynı ekranda
    dört kart gösteriyordu.

    Sonra: 390px'te 2 x 174px (kart 174x233, dört kart görünüyor),
    1440px'te 3 x 209.5px (kart 210x270, altı kart görünüyor).
  */
  assert.match(firsat, /grid grid-cols-2 gap-2\.5 sm:gap-4 lg:grid-cols-3/);
});

test('FIRSAT KARTI TİPOGRAFİSİ DE AYNI', () => {
  const kart = firsat.slice(firsat.indexOf('<article className="group relative flex min-w-0 flex-col'));
  assert.match(kart.slice(0, 400), /gap-1\.5 rounded-2xl[^"]*p-2\.5[^"]*sm:gap-2 sm:p-3\.5/);
  assert.match(kart, /text-\[13px\] font-bold leading-snug text-gray-900 sm:text-base/);
});

test('LOGO DAR KARTA GÖRE KÜÇÜLDÜ', () => {
  /* 56 piksellik logo 174 piksellik kartın üçte birini yiyordu. */
  assert.match(firsat, /!h-9 !w-9[^"]*sm:!h-11 sm:!w-11/);
});

test('ZAMAN TÜPÜ KIRPMIYOR, SARIYOR', () => {
  /*
    Üst satır tek satıra zorlanıyor ve vurgu `truncate` ile kırpılıyordu.
    Ölçüldü (210 piksellik kartta): ekranda "Son 3 gün" yerine "Son…",
    "4 gün kaldı" yerine "4 gü…" yazıyordu — kalan süre okunamıyordu.
  */
  assert.match(tup, /flex flex-wrap items-baseline gap-x-2 gap-y-0\.5/);
  const vurguSatiri = tup.slice(tup.indexOf('{(vurgu || sikisik) && ('), tup.indexOf('{tarih && !sikisik'));
  assert.doesNotMatch(vurguSatiri, /truncate/, 'vurgu kırpılmamalı');
});
