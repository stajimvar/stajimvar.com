import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  KEŞFET KAPANDI (11 Eylül 2026) — bu dosyadaki etkinlik kartı iddiaları
  sayfayla birlikte gitti; ölçüm notu tarihçe olarak duruyor. Kalan
  iddialar rehber ve fırsat kartını sabitliyor.

  ETKİNLİK KARTI REHBER KARTIYLA AYNI ÖLÇÜDE (tarihçe)

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

test('REHBER IZGARASI ORTAK ÖLÇÜDE', () => {
  const izgara = /grid-cols-2 gap-2\.5 sm:gap-4 lg:grid-cols-3/;
  assert.match(rehber, izgara, 'RehberIzgarasi değişmiş');
});

test('KAPAK SABİT YÜKSEKLİKTE, ORANLI DEĞİL', () => {
  /*
    Oranlı kapak sütun genişledikçe büyüyordu; üç sütuna çıkılamamasının
    sebebi buydu ("üç poster 200 pikselin altına düşer" notu poster kapak
    içindi).
  */
  assert.match(rehber, /h-24 w-full shrink-0 overflow-hidden/);
  assert.match(rehber, /sm:h-36/);
});

test('TİPOGRAFİ VE İÇ BOŞLUK AYNI', () => {
  assert.match(rehber, /text-\[13px\] font-bold leading-snug text-gray-900 line-clamp-2 sm:text-base/);
  assert.match(rehber, /gap-1\.5 p-2\.5 sm:gap-2 sm:p-3\.5/);
});

/* ------------------------------------------------- fırsat kartı */

const firsat = oku('src/components/OpportunitiesPage.tsx');
const tup = oku('src/components/ZamanTupu.tsx');

test('FIRSAT KARTI DA AYNI IZGARADA', () => {
  /*
    Kartlar tek sütunda alt alta diziliyordu. Ölçüldü (390px): kart
    358x246 ve ekrana iki kart giriyordu; rehber aynı ekranda dört kart
    gösteriyordu.

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

/* --------------------------------------- liste başlığı üç sayfada da */

test('ŞERİDİN ÜSTÜNDE LİSTE BAŞLIĞI VAR', () => {
  /*
    Rehberde "TÜM REHBERLER (71)", ilanlarda "AÇIK STAJ İLANLARI (62)"
    varken fırsatlarda şerit başlıksız duruyordu: göz doğrudan dairelere
    düşüyor, neyin listelendiği yazmıyordu.

    Hepsi aynı tipografi: 12px, büyük harf, seyrek harf aralığı; solda
    "ne ve kaç tane", sağda listenin nereden geldiğini söyleyen ikincil
    satır (telefonda gizli).
  */
  const bicim = /text-xs font-bold uppercase tracking-widest text-gray-600/;
  assert.match(firsat, bicim, 'fırsat listesinde başlık yok');
  assert.match(firsat, /Kurumların resmî sayfalarından derlendi/);
  assert.match(firsat, /hidden text-xs font-medium text-gray-500 sm:block/);
});

test('BAŞLIKTAKİ SAYI DARALTMAYA GÖRE DEĞİŞİYOR', () => {
  /*
    Ölçüldü (canlı): daraltma yokken "Güncel fırsatlar (32)", tür
    seçilince "Filtrelenen fırsatlar (27)", Tümü'ye dönünce yine 32.
  */
  /* Arşiv üçüncü bir başlık: "Süresi dolan fırsatlar". Üçü de aynı ifadede. */
  assert.match(firsat, /'Süresi dolan fırsatlar'/);
  assert.match(firsat, /'Filtrelenen fırsatlar'\s*:\s*'Güncel fırsatlar'/);
  assert.match(firsat, /listeDaraldi \? filtered\.length : sayimTabani\.length/);
  /*
    Daraltma ölçüsü tek yerde: açık süzgeç listesi (aktifFirsatSuzgecleri).
    Arama da o listenin bir üyesi, ayrıca sayılmıyor.
  */
  assert.match(firsat, /const listeDaraldi = aktifSuzgecSayisi > 0/);
});

test('BAŞLIK ŞERİDİN ÜSTÜNDE, LİSTENİN DEĞİL', () => {
  /* Başlık şeridi tanıtıyor; şeritten sonra gelseydi hangi bloğa ait olduğu belirsiz kalırdı. */
  const baslikYeri = firsat.indexOf("'Filtrelenen fırsatlar'");
  const seritYeri = firsat.indexOf('<KonuSeridi');
  assert.ok(baslikYeri > 0 && seritYeri > baslikYeri, 'başlık şeritten sonra geliyor');
});
