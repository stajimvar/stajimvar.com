import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/*
  FIRSAT KAPILARI İLK HTML'DE LİSTE TAŞIYOR

  ÖLÇÜLDÜ (canlı, 14 Eylül 2026):

    sayfa          ilk HTML metni   fırsat bağlantısı
    /burslar             69 karakter        0
    /firsatlar           88 karakter        0
    /yarismalar          90 karakter        0
    /kyk                 62 karakter        0

  Yani 113 fırsat sayfasının tarama kapıları bomboştu: tarayıcı oradan
  tek bir fırsata bile geçemiyordu. Aynı durum /rehber ve /bolumler için
  daha önce düzeltilmişti.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

const govde = (ad) => {
  const dosya = path.join(KOK, 'dist', `${ad}.html`);
  if (!existsSync(dosya)) return null;
  const h = readFileSync(dosya, 'utf8');
  return h.slice(h.indexOf('<div id="root">'), h.indexOf('</body>'));
};

test('kategori kapıları gerçek kayıtlara bağlanıyor', () => {
  /* Derleme yapılmadan koşan testte dosyalar yok; sessizce geçiliyor. */
  if (!govde('burslar')) return;

  for (const [ad, enAz] of [
    ['firsatlar', 40],
    ['burslar', 20],
    ['kyk', 1],
    ['yarismalar', 1],
  ]) {
    const g = govde(ad);
    const bag = (g.match(/href="\/firsatlar\//g) || []).length;
    assert.ok(bag >= enAz, `/${ad}: ${bag} bağlantı, en az ${enAz} beklenir`);
    const metin = g.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    assert.ok(metin.length > 200, `/${ad}: ilk HTML metni kısa (${metin.length})`);
  }
});

test('TARİH VE TUTAR UYDURULMUYOR', () => {
  /*
    113 kaydın yalnız 30'unda son başvuru tarihi dolu; 90'ında tutar
    durumu "belirtilmemis". Tarih uydurmak öğrenciyi olmayan bir son
    güne göre plan yaptırmak, tutar uydurmak kararını yanlış bir sayıya
    dayandırmak olurdu.
  */
  const betik = oku('scripts/onrender.mjs');
  /*
    "TAKVİM AÇIKLANMADI" BİR ÇIKARIMDI

    Boş `applicationDeadline`, kurumun takvimi açıklamadığını
    KANITLAMIYOR: kayıt derlenmemiş, kaynak okunamamış ya da tarih
    başka bir alanda olabilir. Doğrulanmamış bir olumsuzlamayı kuruma
    atfetmek yerine okuyucu resmî kaynağa gönderiliyor.
  */
  assert.match(betik, /'Başvuru takvimi için resmî kaynağı kontrol edin'/);
  /*
    Eski ifade yalnız GEREKÇE YORUMLARINDA geçiyor (neden bırakıldığını
    anlatıyor); çizilen metinde geçmiyor. Aranan şey kod.
  */
  const kod = betik.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  assert.doesNotMatch(kod, /Takvim açıklanmadı/);
  assert.match(betik, /f\.amount_status === 'kesin' && \(f\.amount_text \|\| ''\)\.trim\(\)/);

  /* "Karşılıksız" ETİKETİ YOK: `repayable` 113 kaydın 104'ünde NULL. */
  const liste = betik.slice(betik.indexOf('const firsatListesi'), betik.indexOf('const sabitler'));
  assert.doesNotMatch(liste, /karşılıksız/i);
  assert.doesNotMatch(liste, /repayable/);
});

test('kategori kuralı PAYLAŞILAN modülden; ikinci tablo yok', () => {
  /*
    Arayüzün süzgeci de `firsatKategorisi` tablosundan besleniyor. Ön
    render ayrı bir tablo tutsaydı, arama motoruna sayfada olmayan bir
    kayıt gösterebilirdi.
  */
  const betik = oku('scripts/onrender.mjs');
  assert.match(betik, /const \{ firsatKategorisi \} = await icerikDerle\(/);
  assert.match(betik, /'firsat-kategori'/);
  /* /kyk'nin tür süzgeci arayüzdekiyle aynı alanı karşılaştırıyor. */
  assert.match(betik, /f\.opportunity_type === tur/);

  /*
    SEÇİM `opportunity_type` TAŞIMAK ZORUNDA

    Taşımıyordu ve kategori kapıları bu yüzden boş çiziliyordu:
    `firsatKategorisi(undefined)` bilinmeyen türü 'programlar'a
    düşürüyor, yani hiçbir kayıt 'burslar' süzgecine uymuyordu.
  */
  assert.match(betik, /'opportunity_type,amount_status,amount_text'/);
});
