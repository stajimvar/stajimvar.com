import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ŞİRKETİN KENDİ İLAN KARTI DA LOGOLU

  Şirket kendi ilanını panelinde logosuz, çıplak bir başlık olarak
  görüyordu; aynı ilan herkese açık listede logolu kartla duruyordu.
  Kullanıcı isteği (28 Eylül 2026): "ilan listesindeki gibi gözüksün,
  logom falan."

  Bu testler üç şeyi koruyor: logo standardının TEK YERDE kalması,
  ad ve logonun uydurulmaması, çalışma biçiminin varsayılmaması.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

/* Yokluk iddiaları gerekçe yorumlarına takılmasın; bkz. paylasim-sayfasi. */
const kodu = (metin) =>
  metin
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

const kart = oku('src/sirket/IlanKarti.tsx');
const kartKodu = kodu(kart);
const acikKart = oku('src/components/InternshipCard.tsx');

test('logo ORTAK bileşenden, elle çizilmiyor', () => {
  /*
    Ölçü `ListingLogo` içinde tek yerde duruyor ve o dosya neden tek
    olduğunu uzun uzun yazıyor: ölçü her sayfada ayrı yazılmıştı ve aynı
    şirketin logosu sayfadan sayfaya büyüyüp küçülüyordu. Burada elle bir
    `<img>` çizilseydi o standart yeniden ikiye bölünürdü.
  */
  assert.match(kart, /import \{ ListingLogo \} from '\.\.\/components\/ListingLogo';/);
  assert.match(kartKodu, /<ListingLogo/);

  /*
    İddia SOL BÖLÜME dar: karttaki öteki `<img>` aday avatar şeridi ve
    onun logoyla ilgisi yok. Genel bir "hiç img olmasın" kuralı o şeridi
    de yasaklardı -- doğru kodu kıran bir test.
  */
  const sol = kartKodu.slice(kartKodu.indexOf('<div className="flex min-w-0 items-start gap-3'),
                             kartKodu.indexOf('orta'));
  assert.ok(sol.length > 0, 'sol bölüm bulunamadı');
  assert.doesNotMatch(sol, /<img/);
});

test('geometri herkese açık ilan kartıyla BİREBİR', () => {
  /*
    "İlan listesindeki gibi" ölçülebilir bir iddia: iki kart aynı ölçü
    sınıflarını geçiyor. Biri değişip öteki kalırsa aynı ilan iki ekranda
    iki farklı boyutta görünür.
  */
  const olcu = '!h-20 !w-20 !rounded-xl !p-2 !text-2xl';
  assert.ok(acikKart.includes(olcu), 'herkese açık kart bu ölçüyü kullanmalı');
  assert.ok(kart.includes(olcu), 'şirket kartı aynı ölçüyü kullanmalı');
});

test('ad ve logo BAĞLAMDAN geliyor, uydurulmuyor', () => {
  /*
    Her kart aynı şirketin ilanı; satırda şirket adı diye bir alan yok ve
    olsaydı da ilan satırından okunması gerekirdi. Değerler şirket
    okumasının kendisinden (`baglam`) geçiyor — ikinci sorgu yok.
  */
  const genel = oku('src/sirket/GenelBakis.tsx');
  assert.match(genel, /sirketAdi=\{baglam\.ad\}/);
  assert.match(genel, /logoUrl=\{baglam\.logoUrl\}/);
  /* Yer tutucu bir ad yazılmıyor. */
  assert.doesNotMatch(kodu(genel), /sirketAdi="/);
});

test('ad yoksa logo bloğu HİÇ çizilmiyor', () => {
  /*
    `ListingLogo` adsız çağrılırsa baş harf üretemez ve kartta boş bir
    kutu kalırdı. Ad yoksa hem logo hem ad satırı düşüyor; fikstürdeki
    "şirket kaydı yok" senaryosu bu dalı geziyor.
  */
  assert.match(kartKodu, /\{sirketAdi && \(\s*<div className="shrink-0"/);
  assert.match(kartKodu, /\{sirketAdi && \(\s*<p/);
});

test('ÇALIŞMA BİÇİMİ VARSAYILMIYOR', () => {
  /*
    Herkese açık kartta da aynı kural yazılı: biçim bilinmiyorsa
    yazılmıyor. `calismaEtiketi` boş girdide null döndürüyor ve konum
    metnine katılmıyor.
  */
  assert.match(kart, /calismaEtiketi\(ilan\.work_type/);
  assert.match(kart, /\[konumEtiketi\(sehir\), calisma\]\.filter\(Boolean\)/);

  /*
    Kolon gerçekten OKUNUYOR mu: okunmazsa `ilan.work_type` hep undefined
    olur ve satır sessizce eksik kalırdı — kart doğru, veri yok.
  */
  const veri = oku('src/lib/sirket-veri.ts');
  const liste = veri.slice(veri.indexOf("from('listings')"));
  assert.ok(liste.slice(0, 1200).includes('work_type'), 'panel okuması work_type içermeli');
});

test('şehir boşsa konum satırı yok', () => {
  /*
    `konumEtiketi('')` "Konum belirtilmemiş" döndürüyor. Şirketin kendi
    panelinde bunu yazmak, girmediği bir alanı doldurulmuş göstermek
    olurdu; satırın tamamı şehre bağlı.
  */
  assert.match(kartKodu, /\{sehir && \(\s*<p/);
});
