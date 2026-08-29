import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KADEME,
  adayGorebilir,
  alanAdiEslesiyor,
  ilanAsabilir,
  ilanBaslangicDurumu,
  ilanBayraklari,
  kademeHesapla,
  platformdanBasvuru,
  serbestEpostaMi,
  vknGecerli,
} from '../src/lib/sirket-kademe.mjs';

/*
  "İlan vermek ≠ öğrenci görmek" bu ürünün dokunulmaz kuralı ve tamamı
  Kademe 1 ile 2 arasındaki farkta duruyor. Yetki hesabındaki bir hata
  ekranda görünmez ama öğrenci verisine dokunur; bu yüzden kural saf
  işlev ve burada sınanıyor.

  Asıl kapı veritabanında (RLS): applications SELECT politikası şirketin
  doğrulanmış olmasını da soruyor. Buradaki testler arayüzün o kapıyla
  aynı şeyi söylediğini garanti ediyor.
*/

test('kademeler doğru hesaplanıyor', () => {
  assert.equal(kademeHesapla({}), KADEME.ZIYARETCI);
  assert.equal(kademeHesapla({ uyeMi: true }), KADEME.ILAN_VEREN);
  assert.equal(kademeHesapla({ uyeMi: true, dogrulanmisMi: true }), KADEME.DOGRULANMIS);
  assert.equal(kademeHesapla({ yoneticiMi: true }), KADEME.YONETICI);
});

test('doğrulanmamış üye üyelikten kademe 2 kazanmıyor', () => {
  /* Şirket doğrulanmadan üye olmak yalnızca ilan asma hakkı veriyor. */
  assert.equal(kademeHesapla({ uyeMi: true, dogrulanmisMi: false }), KADEME.ILAN_VEREN);
});

test('KADEME 1 ADAY GÖREMEZ', () => {
  assert.equal(adayGorebilir(KADEME.ZIYARETCI), false);
  assert.equal(adayGorebilir(KADEME.ILAN_VEREN), false);
  assert.equal(adayGorebilir(KADEME.DOGRULANMIS), true);
  assert.equal(adayGorebilir(KADEME.YONETICI), true);
});

test('ilan asma kademe 1 ile açılıyor', () => {
  assert.equal(ilanAsabilir(KADEME.ZIYARETCI), false);
  assert.equal(ilanAsabilir(KADEME.ILAN_VEREN), true);
});

test('platformdan başvuru yalnızca doğrulanmış şirkette', () => {
  assert.equal(platformdanBasvuru(KADEME.ILAN_VEREN), false);
  assert.equal(platformdanBasvuru(KADEME.DOGRULANMIS), true);
});

/* ------------------------------------------------------------ e-posta */

test('serbest sağlayıcılar tanınıyor', () => {
  assert.equal(serbestEpostaMi('ik@gmail.com'), true);
  assert.equal(serbestEpostaMi('ik@outlook.com'), true);
  assert.equal(serbestEpostaMi('ik@aselsan.com'), false);
  assert.equal(serbestEpostaMi(''), false);
});

test('alan adı eşleşmesi alt alan adlarını da kabul ediyor', () => {
  assert.equal(alanAdiEslesiyor('https://www.aselsan.com', 'ik@aselsan.com'), true);
  assert.equal(alanAdiEslesiyor('https://kariyer.aselsan.com/staj', 'ik@aselsan.com'), true);
  assert.equal(alanAdiEslesiyor('aselsan.com', 'ik@gmail.com'), false);
  assert.equal(alanAdiEslesiyor('', 'ik@aselsan.com'), false);
  assert.equal(alanAdiEslesiyor('aselsan.com', ''), false);
});

/* --------------------------------------------------------------- ilan */

test('kurumsal mail ile ilan anında yayında', () => {
  assert.equal(
    ilanBaslangicDurumu({ kademe: KADEME.ILAN_VEREN, siteUrl: 'https://aselsan.com', eposta: 'ik@aselsan.com' }),
    'published'
  );
});

test('serbest mail ile ilan taslakta bekliyor', () => {
  assert.equal(
    ilanBaslangicDurumu({ kademe: KADEME.ILAN_VEREN, siteUrl: 'https://aselsan.com', eposta: 'ik@gmail.com' }),
    'draft'
  );
});

test('doğrulanmış şirkette mail alan adına bakılmıyor', () => {
  assert.equal(
    ilanBaslangicDurumu({ kademe: KADEME.DOGRULANMIS, siteUrl: '', eposta: 'ik@gmail.com' }),
    'published'
  );
});

test('ziyaretçi ilan açamıyor', () => {
  assert.equal(ilanBaslangicDurumu({ kademe: KADEME.ZIYARETCI, siteUrl: 'x.com', eposta: 'a@x.com' }), null);
});

test('bayraklar metinde gerçekten geçen şeyleri işaretliyor', () => {
  assert.deepEqual(ilanBayraklari('Başvuru için 500 TL katılım payı talep edilmektedir.'), [
    'Ücret isteniyor olabilir',
  ]);
  assert.ok(ilanBayraklari('Başvurular WhatsApp üzerinden alınır').includes('Başvuru WhatsApp/Telegram üzerinden'));
  assert.deepEqual(ilanBayraklari('Yazılım stajyeri arıyoruz. React bilgisi tercih sebebi.'), []);
});

/* ---------------------------------------------------------------- VKN */

test('VKN checksum çalışıyor', () => {
  /* Dokuz basamaktan kontrol basamağı üretilip doğrulanıyor. */
  const kontrolUret = (dokuz) => {
    let toplam = 0;
    for (let i = 0; i < 9; i += 1) {
      const g = (Number(dokuz[i]) + 10 - (i + 1)) % 10;
      toplam += g === 9 ? g : (g * 2 ** (9 - i)) % 9;
    }
    return (10 - (toplam % 10)) % 10;
  };
  for (const dokuz of ['123456789', '987654321', '111111111', '456789012']) {
    const gecerli = dokuz + kontrolUret(dokuz);
    assert.equal(vknGecerli(gecerli), true, `kabul edilmeliydi: ${gecerli}`);
    const bozuk = dokuz + ((kontrolUret(dokuz) + 1) % 10);
    assert.equal(vknGecerli(bozuk), false, `reddedilmeliydi: ${bozuk}`);
  }
});

test('VKN biçimi 10 hane', () => {
  assert.equal(vknGecerli('12345'), false);
  assert.equal(vknGecerli('12345678901'), false);
  assert.equal(vknGecerli('abcdefghij'), false);
  assert.equal(vknGecerli(''), false);
  assert.equal(vknGecerli(null), false);
});
