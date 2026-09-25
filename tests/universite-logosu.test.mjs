import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { universiteKodu, universiteLogosu, ROZET_LOGOLARI } from '../src/lib/universite-logosu.mjs';

/*
  OKUL ROZETİNDEKİ LOGOLAR

  Rozet önce okulun kısaltmasını yazıyordu ("MSGSÜ"). Artık amblemi olan
  okullarda üniversitenin kendi logosu çiziliyor.

  DOSYALAR NEREDEN GELDİ
  ----------------------
  Her okulun RESMİ alan adındaki başlık logosu (ör. msgsu.edu.tr,
  yildiz.edu.tr, kurumsalkimlik.deu.edu.tr). Depodaki eski dosyalar
  kariyer merkezi ALT alanlarından toplanmıştı ve çoğu okulun logosu
  değildi: kalite güvencesi rozeti, TEKNOFEST afişi, bir e-posta simgesi,
  boş gri daire, bir birimin tanıtım görseli. O dosyalar kariyer
  merkezleri sayfasında da yanlış görünüyordu; hepsi değiştirildi.

  Yatay logolarda (amblem + yazı) yalnız amblem kırpıldı: rozet 28
  piksel, yazı o boyda okunmuyor.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const KLASOR = path.join(KOK, 'public', 'universite-logolari');

test('listedeki her kodun gerçek bir dosyası var', () => {
  /* Liste ile dosyalar ayrışırsa rozet 404 isteyip boşa düşer. */
  for (const kod of ROZET_LOGOLARI) {
    assert.ok(fs.existsSync(path.join(KLASOR, `${kod}.png`)), `${kod}.png yok`);
  }
});

test('her logo dosyası resmi üniversite listesindeki bir ada karşılık geliyor', () => {
  /*
    Dosya adı `universiteKodu` ile üretiliyor. Bir dosya hiçbir okul adına
    denk gelmiyorsa ya ad yanlış yazılmış ya da dosya artık kimsenin
    görmediği bir kalıntı.
  */
  const kaynak = fs.readFileSync(path.join(KOK, 'src', 'data', 'turkeyData.ts'), 'utf8');
  const govde = kaynak.slice(kaynak.indexOf('TR_UNIVERSITIES'), kaynak.indexOf('TR_DEPARTMENTS'));
  const kodlar = new Set([...govde.matchAll(/'([^']+)'/g)].map((m) => universiteKodu(m[1])));
  for (const dosya of fs.readdirSync(KLASOR).filter((d) => d.endsWith('.png'))) {
    assert.ok(kodlar.has(dosya.replace('.png', '')), `${dosya} listede yok`);
  }
});

test('tam ad eşleşiyor', () => {
  assert.equal(
    universiteLogosu('Mimar Sinan Güzel Sanatlar Üniversitesi'),
    '/universite-logolari/mimar-sinan-guzel-sanatlar-universitesi.png',
  );
  /* Büyük/küçük harf ve Türkçe karakter farkı eşleşmeyi bozmamalı. */
  assert.equal(
    universiteLogosu('ege üniversitesi'),
    '/universite-logolari/ege-universitesi.png',
  );
});

test('benzer ad BAŞKA okulun logosunu getirmiyor', () => {
  /*
    Yaklaşık eşleştirme yapılsaydı "İstanbul Teknik" ile "İstanbul"
    karışırdı; öğrencinin rozetinde okumadığı okulun amblemi çıkardı.
  */
  assert.equal(universiteLogosu('İstanbul Teknik Üniversitesi'), null);
  assert.equal(universiteLogosu('İstanbul Gelişim Üniversitesi'), null);
  assert.equal(universiteLogosu('Orta Doğu Teknik Üniversitesi'), null);
});

test('boş girdide null', () => {
  assert.equal(universiteLogosu(''), null);
  assert.equal(universiteLogosu(null), null);
  assert.equal(universiteLogosu(undefined), null);
});

test('28 pikselde okunmayan iki logo rozette kullanılmıyor', () => {
  /*
    Dosyaları duruyor ve kariyer merkezleri sayfası 36 pikselde onları
    çiziyor; rozette yerlerini kısaltma alıyor. Sabancı'nınki yazı
    markası, Muğla'nınki ince çizgili amblem — küçülünce ikisi de boş
    lekeye dönüşüyor.
  */
  assert.equal(universiteLogosu('Sabancı Üniversitesi'), null);
  assert.equal(universiteLogosu('Muğla Sıtkı Koçman Üniversitesi'), null);
  assert.ok(fs.existsSync(path.join(KLASOR, 'sabanci-universitesi.png')));
  assert.ok(fs.existsSync(path.join(KLASOR, 'mugla-sitki-kocman-universitesi.png')));
});

test('kod üretimi tek yerde', () => {
  /*
    Dosya adları bu kuralla üretildi. Kariyer merkezleri bileşeni kendi
    kopyasını tutsaydı biri değişince logolar sessizce kaybolurdu.
  */
  const bilesen = fs.readFileSync(
    path.join(KOK, 'src', 'components', 'KariyerMerkezleri.tsx'),
    'utf8',
  );
  assert.match(bilesen, /export \{ universiteKodu \} from '\.\.\/lib\/universite-logosu\.mjs';/);
  assert.doesNotMatch(bilesen, /function universiteKodu/);
});

test('profil başlığında okul rozeti yok (25 Eylül 2026)', () => {
  /*
    Kullanıcı isteği: fotoğrafın köşesindeki okul amblemi kalktı; okul adı
    meta satırında yazıyor ve Kampüs'e gidiyor. Logolar kariyer merkezi
    kartlarında kullanılmaya devam ediyor.
  */
  const kaynak = fs.readFileSync(
    path.join(KOK, 'src', 'components', 'ProfilBasligi.tsx'),
    'utf8',
  );
  assert.doesNotMatch(kaynak, /<OkulRozeti|universiteLogosu\(/);
});

test('logolar rozet boyutuna uygun kare ve saydam', async () => {
  /*
    128 piksel: rozet 28, kariyer merkezi kartı 36 piksel çiziyor; iki
    katı çözünürlük yüksek yoğunluklu ekranda da net. Kare olmayan dosya
    `object-contain` ile ortalanır ama rozetin içinde küçük kalır.
  */
  const { default: sharp } = await import('sharp');
  for (const kod of ROZET_LOGOLARI) {
    const ust = await sharp(path.join(KLASOR, `${kod}.png`)).metadata();
    assert.equal(ust.width, 128, `${kod} genişlik`);
    assert.equal(ust.height, 128, `${kod} yükseklik`);
    assert.ok(ust.hasAlpha, `${kod} saydam değil`);
  }
});
