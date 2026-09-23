import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  KAYITTA NE İÇİN GELDİĞİ SORULUYOR (kullanıcı kararı, 23 Eylül 2026)

  Kayıt formunun dili HANGİ KAPIDAN gelindiğine bağlıydı: işveren
  sayfasından gelen "Yetkili adı soyadı" ve "Kurumsal e-posta" görüyor,
  ana sayfadan gelen öğrenci formunu görüyordu. Giriş tek kapıya inince
  (bkz. tek-giris-kapisi) o bağlam görünmez bir şeye dönüştü: aynı
  pencerede "Kayıt Ol" sekmesine geçen kişi neye kaydolduğunu
  seçemiyordu.

  Hesap hâlâ TEK TİP. Seçim metni ve kayıttan sonra nereye gidileceğini
  belirliyor, veritabanındaki rolü değil — rol istemciden gelemez.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

const PENCERE = oku('src/components/AuthModal.tsx');
const UYGULAMA = oku('src/App.tsx');

test('kayitta iki secenek soruluyor', () => {
  assert.match(PENCERE, /role="radiogroup" aria-label="Ne için hesap açıyorsun"/);
  assert.ok(PENCERE.includes("'Öğrenciyim'"));
  assert.ok(PENCERE.includes("'İşverenim'"));
});

test('secim yalniz kayitta cikiyor', () => {
  /* Girişte form zaten herkes için aynı; orada sormak fazladan bir adım olurdu. */
  assert.match(PENCERE, /\{mode === 'register' && role !== 'company' && \(\s*<div className="mb-4" role="radiogroup"/);
});

test('geldigi kapi secimi on isaretliyor', () => {
  /*
    İşveren sayfasındaki düğmeden gelen kişi zaten niyetini söylemiş;
    sıfırdan seçtirmek o adımı tekrar ettirirdi. Değiştirilebiliyor.
  */
  assert.match(PENCERE, /useState<'ogrenci' \| 'isveren'>\(\s*baglam === 'isveren' \? 'isveren' : 'ogrenci',\s*\)/);
  assert.match(PENCERE, /if \(isOpen\) setKayitTuru\(baglam === 'isveren' \? 'isveren' : 'ogrenci'\)/);
});

test('form dili kapiya degil secime bakiyor', () => {
  assert.match(
    PENCERE,
    /role !== 'company' && \(mode === 'register' \? kayitTuru === 'isveren' : baglam === 'isveren'\)/,
  );
});

test('isveren secen sahiplenmeye gidiyor', () => {
  /*
    Kayıt düğmesi "Devam Et — Şirketini Bul" diyor. Eskiden bu yalnız
    işveren SAYFASINDAN gelene oluyordu; ana sayfadan kaydolan işveren
    öğrenci akışında kalıyordu.
  */
  assert.match(PENCERE, /onSuccess\('student', result\.displayName, result\.userId, kayitTuru\)/);
  assert.match(UYGULAMA, /if \(niyet === 'isveren' && !sirketeUye\) \{/);
  assert.match(UYGULAMA, /navigate\('\/isveren\/ilan-ver'\)/);
});

test('sirketi olan hesap yine panele gidiyor', () => {
  /* Niyet dalı üyeliğin önüne geçmiyor: şirketi olan doğrudan panele. */
  const bas = UYGULAMA.indexOf("if (niyet === 'isveren' && !sirketeUye)");
  assert.ok(bas > 0);
  assert.ok(UYGULAMA.indexOf('let sirketeUye = role') < bas, 'uyelik once hesaplanmali');
});

test('secim veritabanindaki rolu degistirmiyor', () => {
  /*
    Rol istemciden gelseydi kendini şirket ilan eden herkes öğrenci
    profillerini okuyabilirdi; bu kapı bilerek kapalı. Kayıt yine
    signUpStudent ile açılıyor.
  */
  assert.ok(!PENCERE.includes("role: kayitTuru"));
  assert.match(PENCERE, /const result = await signUpStudent\(\{/);
});
