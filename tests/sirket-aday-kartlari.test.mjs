import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  ADAY KARTLARI BASVURANLAR SAYFASINDA

  Once tek bir "Ogrencileri kesfet" baglantisi vardi ve iki listeyi
  (is arayan / staj arayan) ancak actiktan sonra goruyordunuz. Iki arayis
  ayni sey degil; secim sayfaya girmeden yapilabilmeli.

  Ayrica aday ekrani yesil kalmisti ve panelin geri kalani maviyken tema
  disi duruyordu (kullanici bildirdi, 27 Eylul 2026).
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const PANEL = oku('src/sirket/SirketPaneli.tsx');
const ADAYLAR = oku('src/sirket/SirketAdaylar.tsx');

test('basvuranlar sayfasinda iki ESIT kart var', () => {
  /* Biri buyuk olsaydi otekini ikincil secenek gibi gosterirdi. */
  assert.ok(PANEL.includes('grid grid-cols-2 gap-2'), 'iki esit sutun olmali');
  assert.ok(PANEL.includes('Staj arayanlar'), 'staj karti olmali');
  assert.ok(PANEL.includes('İş arayanlar'), 'is karti olmali');
});

test('her kart kendi listesini aciyor', () => {
  assert.ok(PANEL.includes('/sirket/adaylar?tur=${tur}'), 'kart turu adrese yazmali');
  assert.ok(ADAYLAR.includes("get('tur') === 'is' ? 'is' : 'staj'"),
            'ekran baslangic sekmesini adresten okumali');
});

/* Yorumlar cikarilmis kaynak: gecmisi anlatan yorum metni test etmiyoruz. */
const yorumsuz = (metin) =>
  metin.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

test('eski tek baglanti kalmadi', () => {
  assert.ok(
    !yorumsuz(PANEL).includes('Öğrencileri keşfet'),
    'tek baglanti kaldirilmali (yorumdaki gecmis anlatimi sayilmaz)',
  );
});

test('aday ekrani panelin mavi temasinda', () => {
  /* SIRKET_VURGU = #2563EB; panel mavi, ekran yesil kalmisti. */
  assert.ok(!ADAYLAR.includes('emerald'), 'yesil sinif kalmamali');
  assert.ok(ADAYLAR.includes('bg-blue-600'), 'birincil dugme mavi olmali');
});

test('kartlar panelin kendi renk belirteclerini kullaniyor', () => {
  /* Elle hex yazmak, tema degisince bu kartlari geride birakirdi. */
  const blok = PANEL.slice(PANEL.indexOf('const ogrencileriKesfet'));
  const kart = blok.slice(0, blok.indexOf('</section>'));
  assert.ok(kart.includes('SIRKET_ROZET'), 'rozet zemini belirtecten');
  assert.ok(kart.includes('SIRKET_VURGU_KOYU'), 'vurgu rengi belirtecten');
  assert.ok(!/#[0-9A-Fa-f]{6}/.test(kart), 'kartta elle hex renk olmamali');
});

test('aday kartlari basligin hemen altinda', () => {
  /*
    Once sayfanin SONUNDAYDI. Basvurusu olmayan sirkette sayfa "Henuz
    basvuru yok" ile basliyor ve aday aramak tam da o sirketin isine
    yarayan sey; en altta kalmasi onu gorunmez kiliyordu (kullanici
    bildirdi, 27 Eylul 2026). Uc dalda da basligin hemen altinda.
  */
  const dallar = PANEL.split('{baslik}');
  assert.equal(dallar.length, 4, 'uc dalda da baslik cizilmeli');
  for (let i = 1; i < dallar.length; i += 1) {
    const ilk120 = dallar[i].slice(0, 120);
    assert.ok(
      ilk120.includes('{ogrencileriKesfet}'),
      'dal ' + i + ': kartlar basligin hemen ardinda olmali',
    );
  }
});

test('aday ekraninda iki sekme satiri dolduruyor', () => {
  /*
    Icerik genisligindeyken sagda genis bir bosluk kaliyordu ve iki esit
    kutu olmasi gereken sey iki kucuk dugme gibi duruyordu.
  */
  const ADAYLAR2 = oku('src/sirket/SirketAdaylar.tsx');
  /*
    Yalniz SEKME satirina bakiyoruz. Karttaki rol etiketleri (hedefRoller)
    sarmali akista kalmali; onlar etiket, sekme degil.
  */
  const i = ADAYLAR2.indexOf('aria-label="Arayış türü"');
  assert.ok(i > 0, 'sekme satiri bulunmali');
  const satir = ADAYLAR2.slice(i - 200, i + 60);
  assert.ok(satir.includes('grid grid-cols-2 gap-2'), 'sekmeler esit iki sutun olmali');
  assert.ok(!satir.includes('flex flex-wrap'), 'sekmeler icerik genisliginde kalmamali');
  assert.ok(ADAYLAR2.includes('w-full cursor-pointer items-center justify-center'),
            'sekme dugmesi hucreyi doldurmali');
});

test('sayfa basligi ekranda yok ama DOM da duruyor', () => {
  /*
    Alt gezinme zaten "Basvurular" diyor; ayni sozcugu ekranin en ustunde
    tekrar yazmak yeri harciyordu (kullanici bildirdi, 27 Eylul 2026).

    Silmek yerine gorunmez yapildi: sayfanin tek basligi buydu ve tamamen
    kaldirmak, ekran okuyucuyla baslikta gezen kullaniciya basliksiz bir
    sayfa birakirdi. Gezinme etiketi baslik degildir.
  */
  assert.ok(PANEL.includes('<h1 className="sr-only">Başvurular</h1>'),
            'baslik sr-only olarak durmali');
  assert.ok(!PANEL.includes('İlanlarınıza gelen başvuruları buradan yönetin'),
            'aciklama cumlesi kaldirilmali');
});

test('toplam basvuru sayisi kaybolmadi', () => {
  /*
    Kaldirilan aciklama cumlesi toplam sayiyi gosteren TEK yerdi
    ("Ilanlariniza gelen 3 basvuru."). Sayi izgaranin kendi satirina
    tasindi ve artik yalniz suzulunce degil HER ZAMAN yaziliyor --
    yoksa suzgecsiz acan kisi kac basvurusu oldugunu goremezdi.
  */
  const IZGARA = oku('src/sirket/AdayIzgarasi.tsx');
  const i = IZGARA.indexOf('{basliksiz ? (');
  assert.ok(i > 0, 'basliksiz dali bulunmali');
  const dal = IZGARA.slice(i, i + 1400);
  assert.ok(dal.includes('${kartlar.length} aday'), 'toplam sayi yazilmali');
  assert.ok(!dal.includes('suzulmus.length !== kartlar.length &&'),
            'sayi yalniz suzulunce degil her zaman gorunmeli');
});
