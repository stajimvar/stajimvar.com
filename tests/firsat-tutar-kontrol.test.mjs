import test from 'node:test';
import assert from 'node:assert/strict';
import {
  guncelDonem,
  htmlMetni,
  ogretimYili,
  pdfMetni,
  tutarKarari,
} from '../scripts/firsat-tutar-kontrol.mjs';

/*
  TUTAR KONTROL BETİĞİ — KARAR KAYNAĞA BAĞLI

  Betik kurumun kendi sayfasını okuyup tutar durumunu belirliyor. Bu
  testler betiğin SAF parçalarını sabitliyor: ağ yok, veritabanı yok.

  Asıl korunan şey ihtiyat: betik emin olmadığında `belirsiz` demeli,
  tahmin etmemeli. Arayüz `belirsiz`de satırı hiç çizmiyor, yani
  betiğin kararsızlığı ekranda bir iddiaya dönüşmüyor.
*/

const EYLUL = new Date('2026-09-13T00:00:00Z');
const MART = new Date('2026-03-01T00:00:00Z');
const dolgu = 'x'.repeat(200);

test('öğretim yılı eylülde dönüyor, ocakta değil', () => {
  assert.equal(ogretimYili(EYLUL), 2026);
  assert.equal(ogretimYili(MART), 2025);
});

test('ESKİ DÖNEM RAKAMI TAŞINMIYOR: geçen öğretim yılı reddediliyor', () => {
  /*
    Ölçüldü (Güney Eğitim Vakfı, 13 Eylül 2026): "yıllık burs miktarı
    2025-2026 dönemi için toplam 22.500 TL". O öğretim yılı yazın bitti;
    rakamı bu yıl göstermek eski dönemi güncele taşımak olurdu.

    Aralık reddedildikten sonra tek yıl taraması içindeki "2026"yı
    yakalayıp aynı dönemi güncel ilan ediyordu — aralıklar metinden
    çıkarılıyor.
  */
  assert.equal(guncelDonem('2025-2026 dönemi için toplam 22.500 TL', EYLUL), null);
  assert.equal(guncelDonem('2026–2027 akademik yılı için aylık 7.000 TL', EYLUL), '2026–2027');
  /* Mart'ta hâlâ 2025-2026 güncel: öğretim yılı yazın başlamıyor. */
  assert.equal(guncelDonem('2025-2026 dönemi', MART), '2025-2026');
});

test('güncel rakam: tutar + sıklık + dönem üçü birden', () => {
  const k = tutarKarari(
    `${dolgu} 2026–2027 akademik yılı için aylık burs miktarı 7.000 TL olarak belirlenmiştir.`,
    { bugun: EYLUL },
  );
  assert.equal(k.durum, 'kesin');
  assert.equal(k.siklik, 'monthly');
  assert.equal(k.donem, '2026–2027');
  assert.match(k.kanit, /7\.000 TL/);
});

test('sıklığı olan ama dönemsiz rakam kuyruğa gidiyor, tahmin edilmiyor', () => {
  /*
    Sayfa bir tutar söylüyor ama hangi yıla ait olduğu okunamıyor.
    "Belirtilmemiş" demek yanlış olurdu — sayfa bir rakam söylüyor;
    "kesin" demek de yanlış — tarihleyemiyoruz. Doğrusu: insan baksın.
  */
  const k = tutarKarari(`${dolgu} The monthly fellowship amount is €3,000 plus benefits.`, {
    bugun: EYLUL,
  });
  assert.equal(k.durum, 'belirsiz');
  assert.equal(k.sebep, 'dönemsiz rakam');
});

test('"açıklanacak" öznesi tutar olmalı: aday listesi tutar sanılmıyor', () => {
  /*
    Ölçüldü (Erciyes Organ Nakli Vakfı): "Bursiyer aday listesi 03 EKİM
    2026 tarihinde vakıf web sitesinde açıklanacaktır." Orada açıklanacak
    olan aday listesi, tutar değil.
  */
  const yanlis = tutarKarari(
    `${dolgu} Bursiyer aday listesi 03 EKİM 2026 tarihinde vakıf web sitesinde açıklanacaktır.`,
    { bugun: EYLUL },
  );
  assert.notEqual(yanlis.durum, 'aciklanacak');

  const dogru = tutarKarari(`${dolgu} Burs tutarı ilerleyen günlerde açıklanacaktır.`, {
    bugun: EYLUL,
  });
  assert.equal(dogru.durum, 'aciklanacak');
});

test('miktarı değişen destek programı: mali_destek', () => {
  const k = tutarKarari(
    `${dolgu} Gidilen eyalete göre bursiyerlere yapılan aylık burs ödemesi miktarı değişmektedir. Burs, sağlık sigortası ve konaklama desteğini kapsamaktadır.`,
    { bugun: EYLUL },
  );
  assert.equal(k.durum, 'mali_destek');
});

test('ücretsizlik en önce okunuyor', () => {
  const k = tutarKarari(`${dolgu} Etkinliğe katılım tamamen ücretsizdir.`, { bugun: EYLUL });
  assert.equal(k.durum, 'ucretsiz');
});

test('çelişkili sayfa karar vermiyor', () => {
  const k = tutarKarari(
    `${dolgu} Burs tutarı daha sonra açıklanacaktır. Destek miktarı programa göre değişmektedir ve konaklama giderini kapsar.`,
    { bugun: EYLUL },
  );
  assert.equal(k.durum, 'belirsiz');
  assert.equal(k.sebep, 'çelişkili ifade');
});

test('okunan ama tutardan söz etmeyen sayfa: belirtilmemis', () => {
  const k = tutarKarari(
    `${dolgu} Başvuru koşulları: öğrenci belgesi, transkript ve ikametgâh belgesi gereklidir.`,
    { bugun: EYLUL },
  );
  assert.equal(k.durum, 'belirtilmemis');
});

test('çok kısa metinden karar çıkmıyor', () => {
  /* Çerez duvarı ya da boş kabuk sayfası: okunan bir şey yok. */
  assert.equal(tutarKarari('Yükleniyor...').durum, 'belirsiz');
});

test('HTML metni: betik, biçem ve etiketler atılıyor', () => {
  const metin = htmlMetni(
    '<html><head><style>a{}</style><script>var x=1</script></head><body><h1>Burs</h1><p>Aylık 5.000&nbsp;TL</p></body></html>',
  );
  assert.match(metin, /Burs/);
  assert.match(metin, /Aylık 5\.000 TL/);
  assert.doesNotMatch(metin, /var x/);
  assert.doesNotMatch(metin, /</);
});

test('PDF metni: okunamayan PDF boş dönüyor, uydurmuyor', () => {
  /*
    Taranmış ya da gömülü fontla kodlanmış PDF'ten metin çıkmıyor. Boş
    metin `tutarKarari` tarafından "metin çok kısa" sayılıp `belirsiz`
    oluyor — okuyamadığımız sayfadan karar üretmiyoruz.
  */
  assert.equal(pdfMetni(Buffer.from('%PDF-1.4\nbozuk içerik')), '');
  assert.equal(tutarKarari(pdfMetni(Buffer.from('%PDF-1.4'))).durum, 'belirsiz');
});
