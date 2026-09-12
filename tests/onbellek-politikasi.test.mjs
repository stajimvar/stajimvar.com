import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import fs from 'node:fs';

import {
  BELGE_ONBELLEGI,
  OZEL_ONBELLEK,
  belgeSayfasiMi,
  kenardaTutulabilirMi,
  kopyaKarari,
  onbellekAnahtariAdresi,
  onbellekBasligi,
  oturumCereziVarMi,
  uygulamaBolumuMu,
} from '../src/lib/onbellek-politikasi.mjs';

const HTML = 'text/html; charset=utf-8';

/* ------------------------------------------------------- bölüm ayrımı */

test('belge sayfaları: anasayfa, ilan, bölüm, rehber', () => {
  for (const yol of ['/', '/ilan', '/ilan/hukuk-stajyeri-68db1e18', '/bolum', '/bolum/mimarlik', '/rehber', '/rehber/cv-nasil-yazilir']) {
    assert.equal(belgeSayfasiMi(yol), true, yol);
  }
});

test('uygulama bölümleri belge sayılmıyor', () => {
  for (const yol of ['/profil', '/profil/ogulcan', '/isveren', '/isveren/ilan-ver', '/yonetim', '/yonetim/ilanlar', '/cv', '/baglantilar']) {
    assert.equal(uygulamaBolumuMu(yol), true, yol);
    assert.equal(belgeSayfasiMi(yol), false, yol);
  }
});

test('sondaki eğik çizgi kararı değiştirmiyor', () => {
  // Aynı sayfanın iki yazımı farklı önbellek kuralı alsaydı, biri
  // kenarda tutulur öteki tutulmazdı; hangi cevabı aldığı çizgiye kalırdı.
  assert.equal(belgeSayfasiMi('/bolum/mimarlik/'), true);
  assert.equal(uygulamaBolumuMu('/profil/'), true);
});

test('adı benzeyen ama başka olan adresler kapsanmıyor', () => {
  // `/profiller` diye bir bölüm açılırsa `/profil` kuralına düşmemeli.
  assert.equal(uygulamaBolumuMu('/profiller'), false);
  assert.equal(belgeSayfasiMi('/bolumler'), false);
});

/* ------------------------------------------------------------ başlık */

test('belge sayfası kenarda 60 saniye tutuluyor', () => {
  assert.equal(onbellekBasligi({ yol: '/', contentType: HTML, cerez: null }), BELGE_ONBELLEGI);
  assert.match(BELGE_ONBELLEGI, /s-maxage=60/);
  assert.match(BELGE_ONBELLEGI, /stale-while-revalidate=/);
  // Tarayıcı kendi kopyasını tutmuyor: kullanıcı bayat sayfa görmüyor.
  assert.match(BELGE_ONBELLEGI, /max-age=0/);
});

test('uygulama bölümü hiç önbelleğe girmiyor', () => {
  assert.equal(onbellekBasligi({ yol: '/yonetim', contentType: HTML, cerez: null }), OZEL_ONBELLEK);
  assert.equal(onbellekBasligi({ yol: '/profil/ogulcan', contentType: HTML, cerez: null }), OZEL_ONBELLEK);
});

test('oturum çerezi taşıyan istek belge sayfasında bile önbelleğe girmiyor', () => {
  // Asıl korunan şey bu: giriş yapmış bir ziyaretçinin cevabı kenarda
  // tutulup başkasına verilemez.
  const cerez = 'sb-gdumgdgwlfnohkaucfow-auth-token=abc; baska=1';
  assert.equal(oturumCereziVarMi(cerez), true);
  assert.equal(onbellekBasligi({ yol: '/', contentType: HTML, cerez }), OZEL_ONBELLEK);
});

test('oturumsuz çerez belge önbelleğini engellemiyor', () => {
  const cerez = 'cerez_rizasi=kabul; dil=tr';
  assert.equal(oturumCereziVarMi(cerez), false);
  assert.equal(onbellekBasligi({ yol: '/', contentType: HTML, cerez }), BELGE_ONBELLEGI);
});

test('HTML olmayan cevaplara dokunulmuyor', () => {
  // API yanıtları kendi başlıklarını yazıyor; buradan üzerine yazmak
  // kişiye özel bir JSON'u kenarda tutulabilir hâle getirirdi.
  assert.equal(onbellekBasligi({ yol: '/api/visitor-context', contentType: 'application/json', cerez: null }), null);
  assert.equal(onbellekBasligi({ yol: '/assets/index-abc.js', contentType: 'text/javascript', cerez: null }), null);
  assert.equal(onbellekBasligi({ yol: '/', contentType: null, cerez: null }), null);
});

test('kapsam dışı bir HTML adresine önbellek kararı yazılmıyor', () => {
  // Ne belge ne uygulama: karar verilmiyor, cevap olduğu gibi geçiyor.
  assert.equal(onbellekBasligi({ yol: '/firsatlar/abc', contentType: HTML, cerez: null }), null);
});

/* ------------------------------------------------ kenar önbelleği kapısı */

test('anonim belge isteği kenarda tutulabiliyor', () => {
  assert.equal(kenardaTutulabilirMi({ yontem: 'GET', yol: '/', cerez: null }), true);
  assert.equal(kenardaTutulabilirMi({ yontem: 'GET', yol: '/bolum/mimarlik', cerez: null }), true);
});

test('oturum çerezli istek önbelleğe hiç bakmıyor', () => {
  /*
    Asıl güvence bu. `Vary: Cookie` yerine burası korur: çerezli istek
    önbelleği ne okuyor ne yazıyor, yani kenarda duran anonim kopya
    oturumlu bir isteğe hiç verilmiyor.
  */
  assert.equal(
    kenardaTutulabilirMi({ yontem: 'GET', yol: '/', cerez: 'sb-abc-auth-token=x' }),
    false,
  );
});

test('oturumsuz çerez kapıyı kapatmıyor', () => {
  // Rıza ve ölçüm çerezleri HTML'i değiştirmiyor; bunlar için ayrı kopya
  // tutmak önbelleği neredeyse hiç isabet etmez hâle getirirdi.
  assert.equal(
    kenardaTutulabilirMi({ yontem: 'GET', yol: '/', cerez: 'cerez_rizasi=kabul; _ga=GA1.1.x' }),
    true,
  );
});

test('uygulama bölümü ve GET olmayan istek kenarda tutulmuyor', () => {
  assert.equal(kenardaTutulabilirMi({ yontem: 'GET', yol: '/yonetim', cerez: null }), false);
  assert.equal(kenardaTutulabilirMi({ yontem: 'POST', yol: '/', cerez: null }), false);
});

test('önbellek anahtarı sorgu dizesini yok sayıyor', () => {
  /*
    Ön render her yol için TEK dosya yazıyor; `?utm_source=...` aynı
    HTML'i döndürüyor. Sorgu anahtara girseydi her pazarlama bağlantısı
    ayrı bir kopya üretirdi.
  */
  assert.equal(onbellekAnahtariAdresi('https://stajimvar.com/rehber?utm_source=ig'), 'https://stajimvar.com/rehber');
  assert.equal(onbellekAnahtariAdresi('https://stajimvar.com/?ulke=DE'), 'https://stajimvar.com/');
});

test('Vary başlığı yazılmıyor', () => {
  // Ara katman `Vary: Cookie` yazmayı bıraktı; geri gelirse çerez değeri
  // önbellek anahtarına karışır ve isabet oranı çöker.
  const araKatman = fs.readFileSync('functions/_middleware.ts', 'utf8');
  assert.ok(!/append\('vary'/i.test(araKatman), 'ara katman yine Vary yazıyor');
});

test('ara katman önbelleği açıkça yönetiyor', () => {
  /*
    Ölçüldü: Cloudflare varsayılan davranışında HTML'e `cf-cache-status:
    DYNAMIC` diyor, yani `s-maxage` başlığı tek başına hiçbir şey
    yapmıyor. Önbellek Cache API ile açıkça yapılıyor; bu satırlar
    kalkarsa başlık kalır ama önbellek kalmaz.
  */
  const araKatman = fs.readFileSync('functions/_middleware.ts', 'utf8');
  assert.match(araKatman, /caches[\s\S]{0,40}\.default/);
  assert.match(araKatman, /x-onbellek/);
});

/* --------------------------------------------------------- tazelik kararı */

test('kopya yaşına göre taze / bayat / yok', () => {
  /*
    Ölçüldü: `cache.put` ile yazılan kopya `s-maxage=60` başlığına rağmen
    75 saniye sonra hâlâ dönüyordu — Cache API süreyi uygulamıyor. Karar
    bu yüzden burada veriliyor; ortama göre değişen bir tazelik ne test
    edilebilir ne güvenilir olurdu.
  */
  assert.equal(kopyaKarari(0), 'taze');
  assert.equal(kopyaKarari(60), 'taze');
  assert.equal(kopyaKarari(61), 'bayat');
  assert.equal(kopyaKarari(360), 'bayat');
  assert.equal(kopyaKarari(361), 'yok');
});

test('yaşı okunamayan kopya kullanılmıyor', () => {
  // Damgasız bir kopya ne kadar eski olduğunu söyleyemiyor; sunmak
  // bilinmeyen yaşta bir sayfayı sunmak olurdu.
  assert.equal(kopyaKarari(Number.NaN), 'yok');
  assert.equal(kopyaKarari(-1), 'yok');
});

test('bayat kopya arkada tazeleniyor', () => {
  const araKatman = fs.readFileSync('functions/_middleware.ts', 'utf8');
  assert.match(araKatman, /HIT-BAYAT/);
  assert.match(araKatman, /async function tazele/);
});
