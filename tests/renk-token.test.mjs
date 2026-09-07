import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  SEMANTİK RENK VE ODAK HALKASI

  İki ölçülmüş hata bu dosyanın konusu:

  1. /isveren halka açık sayfası öğrenci başlığını taşırken ana eylemi
     #25D366 (WhatsApp yeşili) zeminliydi — tek ekranda iki ayrı ürün.
  2. Birincil düğmenin klavye odak halkası BEYAZDI (beyaz sayfada 1:1),
     yani görünmüyordu. Sebebi `transition-colors`: Tailwind o kısayolda
     `outline-color`'ı da geçişe alıyor ve odak dışındaki değer
     `currentColor` — mavi düğmede beyaz.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => readFileSync(path.join(KOK, p), 'utf8');

const token = oku('src/lib/renk-token.ts');
const landing = oku('src/components/IsverenLanding.tsx');
const sirketRenk = oku('src/sirket/renk.ts');

test('BİRİNCİL EYLEM MARKA MAVİSİ', () => {
  assert.match(token, /zemin: 'bg-blue-600'/);
  assert.match(token, /zeminHover: 'hover:bg-blue-700'/);
  /* Birincil düğme yeşil olamaz: yeşil "oldu" demek, "buraya bas" değil. */
  const primary = token.slice(
    token.indexOf('export const RENK_PRIMARY'),
    token.indexOf('export const RENK_BASARI')
  );
  assert.doesNotMatch(primary, /emerald|teal|#25D366/i);
});

test('İŞVEREN LANDING ARTIK PANEL YEŞİLİYLE EYLEM ÇİZMİYOR', () => {
  assert.match(landing, /className=\{BIRINCIL_EYLEM\}/);
  /* birincilStil = panelin yeşil düğmesi; landing artık onu almıyor. */
  assert.doesNotMatch(landing, /birincilStil/);
  assert.doesNotMatch(landing, /SIRKET_VURGU_HOVER/);
  /* Yumuşak yeşil rozet kaldı: eylem değil, alan işareti. */
  assert.match(landing, /SIRKET_ROZET/);
});

test('PANELİN KENDİ ALT TEMASI KORUNDU', () => {
  /*
    Yeşil bir kaza değil, belgelenmiş bir alt marka; giriş yapmış
    işveren panelinde kendi kabuğuyla birlikte duruyor. Bu test onun
    silinmediğini garanti ediyor.
  */
  assert.match(sirketRenk, /SIRKET_VURGU = '#25D366'/);
  assert.match(sirketRenk, /export const birincilStil/);
});

test('YEŞİL BAŞARI VE DOĞRULAMA İÇİN AYRILDI', () => {
  assert.match(token, /RENK_BASARI/);
  assert.match(token, /emerald/);
  assert.match(token, /başarı|doğrulama/i);
});

test('ODAK HALKASI RENGİ GEÇİŞE GİRMİYOR', () => {
  /*
    Ölçüldü (canlı, gerçek Tab, /isveren): `transition-colors` varken
    halka #FFFFFF kalıyordu — beyaz sayfada 1:1. Geçiş listesi elle
    yazılınca #155DFC oldu: beyaz üzerinde 5.25:1, WCAG'ın metin dışı
    öğeler için istediği 3:1'in üstünde.
  */
  assert.match(token, /RENK_GECISI/);
  assert.match(token, /transition-\[background-color,border-color,color\]/);
  const kalip = token.slice(token.indexOf('export const BIRINCIL_EYLEM'));
  assert.doesNotMatch(kalip, /transition-colors/, 'outline-color yine geçişe girer');
  assert.match(kalip, /ODAK_HALKASI/);
});

test('ODAKLANABİLİR ÖĞELERİN HALKASI VAR', () => {
  /*
    /isveren'de odaklanabilir 12 öğenin 11'inde hiç odak stili yoktu ve
    tarayıcı varsayılanına düşüyorlardı: 0.8px #E59700, sayfa zemininde
    2.29:1 — 3:1 eşiğinin altında.
  */
  assert.match(landing, /<summary[\s\S]{0,200}\$\{ODAK_HALKASI\}/);
  const halkaSayisi = (landing.match(/ODAK_HALKASI/g) || []).length;
  assert.ok(halkaSayisi >= 3, `en az üç yerde odak halkası bekleniyordu, ${halkaSayisi} bulundu`);
});

test('KULLANILMAYAN VURGU RENKLERİ BELGELENDİ', () => {
  /*
    teal/indigo değerleri PredictiveInput içindeki varyantlardan geliyor
    ve hiçbir çağrı yeri onları seçmiyor (hepsi accentColor="blue").
    Otomatik dönüştürme yapılmadı; durum belgelendi.
  */
  assert.match(token, /teal|indigo/);
  assert.match(token, /ölü kod|kullanılmayan/i);
});
