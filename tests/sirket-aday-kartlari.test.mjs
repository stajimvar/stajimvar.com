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
