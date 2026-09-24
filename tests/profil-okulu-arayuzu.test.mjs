import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ogrenciKimligiGorunurMu } from '../src/lib/sosyal-profil-kimligi.mjs';

/*
  PROFİL OKULU — ARAYÜZ

  Kullanıcı kararı (24 Eylül 2026): başka öğrencinin okulu, bağlantı şartı
  olmadan, profili görebilen herkese görünüyor. Veri tarafı
  `profil-okulu.test.mjs`de (göç 20261106010000: `sosyal_okullari()`,
  profilin kendi görünürlük kapısı, resmî hesap dışarıda). Bu dosya
  arayüzün o veriyi doğru kullandığını ölçüyor:

    1. Bağlantılar sayfası okulları TEK çağrıda topluyor; satır başına
       istek yok.
    2. Okullar alınamazsa (`null`) liste yine çiziliyor, yalnız okul yok.
    3. Profilin meta satırında okul var.
    4. Resmî hesapta okul ne soruluyor ne çiziliyor.

  Yokluk iddiaları yorumsuz kaynakta: gerekçe yorumları bir şeyin neden
  OLMADIĞINI anlatırken adını anmak zorunda.
*/

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');
function yorumsuz(kaynak) {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*/gm, '$1');
}

const baglantilar = oku('src/components/sosyal/BaglantilarSayfasi.tsx');
const gorunum = oku('src/components/sosyal/SosyalProfilGorunumu.tsx');
const sayfa = oku('src/components/sosyal/SosyalProfilSayfasi.tsx');
const cvKarti = oku('src/components/ProfilBasligi.tsx');

test('bağlantılar sayfası okulları tek çağrıda topluyor; döngüde istek yok', () => {
  const kod = yorumsuz(baglantilar);
  /* Tam bir çağrı, dosyanın tamamında. */
  assert.equal((kod.match(/sosyalOkullariniGetir\(/g) ?? []).length, 1);
  /* Kimlikler listeden toplanıyor ve çağrı o dizi ile yapılıyor. */
  assert.match(
    kod,
    /const kimlikler = veri\.kabul\.filter\(\(kisi\) => kisi\.profil\)\.map\(\(kisi\) => kisi\.kisiId\);[\s\S]{0,80}sosyalOkullariniGetir\(kimlikler\)/,
  );
  /* Satır bileşeni sorgu yapmıyor: okul prop olarak geliyor. */
  const satir = kod.slice(kod.indexOf('const BaglantiSatiri'), kod.indexOf('const Bolum'));
  assert.ok(satir.length > 0);
  assert.doesNotMatch(satir, /sosyalOkullariniGetir|useEffect/);
  assert.match(kod, /okul=\{okullar\?\.get\(kisi\.kisiId\) \?\? null\}/);
  /* `satirCiz` ve `.map` içinde çağrı yok. */
  const ciz = kod.slice(kod.indexOf('satirCiz={'));
  assert.doesNotMatch(ciz, /sosyalOkullariniGetir/);
});

test('okullar alınamazsa (null) satır çiziliyor, okul yazılmıyor, liste düşmüyor', () => {
  const kod = yorumsuz(baglantilar);
  /* Liste 'hazir'a okul çağrısından ÖNCE geçiyor. */
  const hazir = kod.indexOf("setDurum('hazir');");
  const cagri = kod.indexOf('sosyalOkullariniGetir(kimlikler)');
  assert.ok(hazir > 0 && hazir < cagri, 'liste okulu beklememeli');
  /* Okul çağrısının hata dalı listeyi 'hata'ya çekmiyor; yalnız okulu boşaltıyor. */
  const okulZinciri = kod.slice(cagri, kod.indexOf('})', kod.indexOf('.catch(', cagri)) + 2);
  assert.match(okulZinciri, /\.catch\(\(\) => \{\s*if \(!iptal\) setOkullar\(null\);\s*\}\)/);
  assert.doesNotMatch(okulZinciri, /setDurum/);
  /* Alt satır okul olmadan da kuruluyor: yalnız alan, ya da hiç. */
  assert.match(kod, /const altSatir = \[okul, alan\]\.filter\(Boolean\)\.join\(' · '\) \|\| null;/);
  assert.match(kod, /\{altSatir && <p className="truncate text-xs text-gray-600">\{altSatir\}<\/p>\}/);
  /* Satırın kendisi okuldan bağımsız: ad, fotoğraf ve eylemler koşulsuz. */
  assert.match(kod, /okul: string \| null;/);
});

test('profilin meta satırında okul var; veri sayfa katmanından tek kimlikle', () => {
  assert.match(gorunum, /okul\?: string \| null;/);
  assert.match(
    gorunum,
    /\{ogrenciKimligiGorunur && okul && \(\s*<MetaOgesi ikon=\{GraduationCap\} etiket="Okul">\s*\{okul\}/,
  );
  /* Sayfa tek kimlikle soruyor ve prop olarak veriyor. */
  assert.match(sayfa, /sosyalOkullariniGetir\(\[okulSorulacakKimlik\]\)/);
  assert.equal((yorumsuz(sayfa).match(/sosyalOkullariniGetir\(/g) ?? []).length, 1);
  assert.match(sayfa, /okul=\{ziyaretciOkulu\}/);
  /* Hata profili düşürmüyor. */
  assert.match(sayfa, /\.catch\(\(\) => \{\s*if \(!iptal\) setZiyaretciOkulu\(null\);\s*\}\)/);
  /* `/cv` kartı okulu kendi satırından okuyor; yeni çağrı orada yok. */
  assert.doesNotMatch(cvKarti, /sosyalOkullariniGetir/);
});

test('resmî hesapta okul ne soruluyor ne çiziliyor', () => {
  /* Yardımcı resmî hesapta öğrenci kimliğini kapatıyor. */
  assert.equal(ogrenciKimligiGorunurMu(true), false);
  assert.equal(ogrenciKimligiGorunurMu(false), true);
  /* Sayfa resmî hesap ve şirket satırı için kimlik üretmiyor → çağrı yok. */
  assert.match(
    sayfa,
    /const okulSorulacakKimlik =\s*ziyaretciProfili && !ziyaretciProfili\.sirketId && ogrenciKimligiGorunurMu\(ziyaretciProfili\.resmiMi\)\s*\? ziyaretciProfili\.profilId\s*: null;/,
  );
  assert.match(sayfa, /if \(!okulSorulacakKimlik\) return;/);
  /* Görünüm de kapıyı ikinci kez çekiyor: prop dolu gelse bile çizilmiyor. */
  const okulOgesi = gorunum.slice(gorunum.indexOf('etiket="Okul"') - 120, gorunum.indexOf('etiket="Okul"'));
  assert.match(okulOgesi, /ogrenciKimligiGorunur && okul && \(/);
});
