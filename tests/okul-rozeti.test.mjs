import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { rozetYazisi, paletSirasi, PALET } from '../src/lib/okul-rozeti.mjs';

/*
  OKUL ROZETI

  Okulunu girmis ogrencinin profilinde, okul adinin yaninda duran kucuk
  bir rozet. Testler iki seyi koruyor: hakki belirsiz gorsel basilmamasi
  ve rozetin okul adinin YERINE gecmemesi.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const BILESEN = oku('src/components/OkulRozeti.tsx');
const BASLIK = oku('src/components/ProfilBasligi.tsx');

test('uzun okul adi kisaltiliyor', () => {
  assert.equal(rozetYazisi('Mimar Sinan Güzel Sanatlar Üniversitesi'), 'MSGSÜ');
  assert.equal(rozetYazisi('İstanbul Beykent Üniversitesi'), 'İBÜ');
});

test('bos okulda rozet yazisi yok', () => {
  assert.equal(rozetYazisi(''), '');
  assert.equal(rozetYazisi(null), '');
  assert.equal(rozetYazisi(undefined), '');
});

test('rozet yazisi dar kutuya sigacak kadar kisa', () => {
  for (const okul of [
    'Anadolu Üniversitesi',
    'Haliç Üniversitesi',
    'İstanbul Üniversitesi',
    'Üsküdar Üniversitesi',
    'Orta Doğu Teknik Üniversitesi',
    'İstanbul Teknik Üniversitesi',
  ]) {
    const y = rozetYazisi(okul);
    assert.ok(y.length > 0, okul + ' icin yazi uretilmeli');
    assert.ok(y.length <= 5, okul + ' -> "' + y + '" cok uzun, kutuyu tasirir');
  }
});

test('ayni okul her zaman ayni rengi aliyor', () => {
  /* Rastgele olsaydi ayni ogrenci her yenilemede baska renk gorurdu. */
  const a = paletSirasi('Anadolu Üniversitesi');
  const b = paletSirasi('Anadolu Üniversitesi');
  assert.equal(a, b);
  assert.ok(a >= 0 && a < PALET.length);
});

test('hakki belirsiz logo basilmiyor', () => {
  /*
    Universite logolari tescilli marka. Bu depoda yerlesik ilke: sirket
    gorsellerinde hakki belirsiz olanlar disarida birakildi (#119). Ayni
    cizgi burada da gecerli -- bilesen dis bir logo ADRESI GOMMUYOR,
    yalnizca cagiran verirse ciziyor.
  */
  assert.ok(!/https?:\/\//.test(BILESEN), 'bilesende gomulu dis adres olmamali');
  assert.ok(BILESEN.includes('logoAdresi'), 'logo alani hazir olmali');
  assert.ok(BILESEN.includes('setDustu'), 'logo yuklenemezse monograma dusmeli');
});

test('rozet okul adinin YERINE gecmiyor', () => {
  /*
    Rozet kisaltma tasiyor ("MSGSÜ") ve tek basina hangi okul oldugunu
    soylemiyor. Ad metin olarak yaninda kalmali.
  */
  assert.ok(BASLIK.includes('<OkulRozeti okul={okul} />'));
  assert.ok(
    BASLIK.includes("{okul || 'Okulun eksik'}"),
    'okul adi metin olarak kalmali',
  );
});

test('okul girilmemisse rozet cizilmiyor', () => {
  /* Olmayan bir kimligi cizmek, satirin kendisini yalan yapardi. */
  assert.ok(BASLIK.includes('{okul && <OkulRozeti'));
  assert.ok(BILESEN.includes('if (!okul || !yazi) return null;'));
});

test('rozet ekran okuyucuya tekrar okunmuyor', () => {
  /* Ad zaten metin olarak yaziyor; kisaltmayi ikinci kez okutmak tekrar olurdu. */
  assert.ok(BILESEN.includes('aria-hidden'));
});

test('kazanilan rozetlerle karistirilmiyor', () => {
  /*
    Profilde ayrica earnedBadges var -- onlar KAZANILAN seyler. Bu ise bir
    kimlik isareti. Ayri bilesen, ayri bicim.
  */
  assert.ok(!BILESEN.includes('earnedBadges'));
  assert.ok(BILESEN.includes('rounded-lg'), 'kare-yuvarlak kutu, madalya degil');
});

test('uzun kisaltma kutuya sigiyor', () => {
  /*
    OLCULDU (Chromium, 390 ve 1000 piksel): sabit 28x28 kutuda "MSGSÜ"
    tasiyor, harfler yanindaki okul adina giriyordu. Kutu artik en az kare
    ama gerekirse genisliyor; iki harfli kisaltma hala kare duruyor.
  */
  assert.ok(BILESEN.includes('min-w-7'), 'kucuk rozet en az kare olmali');
  assert.ok(BILESEN.includes('px-1.5'), 'uzun kisaltma icin yatay dolgu olmali');
  assert.ok(!/h-7 w-7 text-/.test(BILESEN), 'monogram kutusu sabit genislikte kalmamali');
});
