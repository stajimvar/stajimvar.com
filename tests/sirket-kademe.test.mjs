import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('HİÇBİR ilan yayında başlamıyor: kurumsal mail de yetmiyor', () => {
  /*
    İKİ BAYPAS KALDIRILDI

    Bu testler eskiden 'published' bekliyordu: doğrulanmış şirket ve
    alan adı eşleşmesi insan incelemesini tamamen atlıyordu. Alan adı
    eşleşmesi "bu kişi bu şirkette çalışıyor" için makul bir sinyal ama
    ilanın İÇERİĞİ hakkında hiçbir şey söylemiyor — ücret/teminat
    isteyen bir ilan da kurumsal bir e-postadan açılabilir.
  */
  assert.equal(
    ilanBaslangicDurumu({ kademe: KADEME.ILAN_VEREN, siteUrl: 'https://aselsan.com', eposta: 'ik@aselsan.com' }),
    'draft'
  );
  assert.equal(
    ilanBaslangicDurumu({ kademe: KADEME.ILAN_VEREN, siteUrl: 'https://aselsan.com', eposta: 'ik@gmail.com' }),
    'draft'
  );
  assert.equal(
    ilanBaslangicDurumu({ kademe: KADEME.DOGRULANMIS, siteUrl: '', eposta: 'ik@gmail.com' }),
    'draft'
  );
  /* Parametresiz de çalışıyor: karar artık kademeden başka şeye bakmıyor. */
  assert.equal(ilanBaslangicDurumu({ kademe: KADEME.DOGRULANMIS }), 'draft');
});

test('aynı kural veritabanında da zorlanıyor', () => {
  /*
    Arayüz kuralı tek başına yeterli değil: isteği elle düzenleyen biri
    `status: 'published'` gönderebilir. Tetikleyici kademe baypaslarını
    artık tanımıyor.
  */
  const GOC = readFileSync(
    new URL('../supabase/migrations/20261008010000_ilan_yayini_yonetici_onayina_bagli.sql', import.meta.url),
    'utf8'
  );
  assert.match(GOC, /create or replace function public\.guard_listing_publish/);
  assert.match(GOC, /raise exception 'Ilan yayina ancak yonetici onayiyla alinir'/);
  /* `verified` ve alan adı dalları GİTMİŞ olmalı. */
  const govde = GOC.slice(GOC.indexOf('create or replace function public.guard_listing_publish'));
  /*
    YORUMSUZ GÖVDE: göç dosyası kaldırılan dalları AÇIKLIYOR ve düz
    arama o açıklamayı da yakalıyordu (bu denetim bir kez o yüzden
    kırmızı döndü). SQL blok ve satır yorumları atılıyor.
  */
  const fn = govde
    .slice(0, govde.indexOf('$function$;'))
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*--.*$/gm, ' ');
  assert.ok(!/s\.verified/.test(fn), 'verified baypası kalmamalı');
  assert.ok(!/alan_adi_eslesiyor/.test(fn), 'alan adı baypası kalmamalı');
  /* Otomasyon muafiyeti KORUNUYOR: derlenen ilanlar kırılmasın. */
  assert.match(fn, /rol = 'service_role'/);
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
