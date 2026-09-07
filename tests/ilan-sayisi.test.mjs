import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

import { gosterilecekIlanSayisi } from '../src/lib/ilan-sayisi.mjs';

const gorunum = readFileSync('src/components/MatchedInternshipsView.tsx', 'utf8');

/* ----------------------------------------------------- başlıktaki sayı */

test('daraltma yokken sunucudan gelen toplam gösteriliyor', () => {
  // Asıl hata buydu: sayfa 24'lük sayfalar hâlinde yüklerken başlıkta "(24)"
  // yazıyordu, katalogda 62 ilan varken. Kullanıcı 24 ilan kaldığını sandı.
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: 62, suzulmusAdet: 24, daraltmaVar: false }),
    62,
  );
});

test('daraltma varken yüklenmiş eşleşme sayısı gösteriliyor', () => {
  // Süzme istemcide ve yalnız yüklenmiş kayıtlar üzerinde çalışıyor; sunucunun
  // 62'si o seçime göre süzülmüş değil, başlığa yazılamaz.
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: 62, suzulmusAdet: 7, daraltmaVar: true }),
    7,
  );
});

test('daraltma varken sonuç boşsa sıfır yazılıyor', () => {
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: 62, suzulmusAdet: 0, daraltmaVar: true }),
    0,
  );
});

/* --------------------------------------------------------- sınır durumlar */

test('toplam tanımsızken yüklenmiş sayıya düşülüyor', () => {
  // `catalogTotal` opsiyonel bir prop; ilk yüklemede tanımsız gelebiliyor.
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: undefined, suzulmusAdet: 24, daraltmaVar: false }),
    24,
  );
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: null, suzulmusAdet: 24, daraltmaVar: false }),
    24,
  );
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: NaN, suzulmusAdet: 24, daraltmaVar: false }),
    24,
  );
});

test('toplam sıfır geçerli bir cevap, yüklenmiş sayıya kaçılmıyor', () => {
  // 0, "veri yok" değil "hiç ilan yok" demek. Doğruluk kontrolü yapılsaydı
  // buradan yanlışlıkla süzülmüş adede düşülürdü.
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: 0, suzulmusAdet: 0, daraltmaVar: false }),
    0,
  );
});

test('yüklenmiş sayı toplamdan büyükse ekrandaki kart sayısı yalanlanmıyor', () => {
  // Kullanıcı kartları sayabiliyor: 30 kart çizilirken başlığa "(12)" yazmak
  // ekranda görünenle çelişir.
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: 12, suzulmusAdet: 30, daraltmaVar: false }),
    30,
  );
});

test('anlamsız toplam değerleri sayıya karışmıyor', () => {
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: -5, suzulmusAdet: 24, daraltmaVar: false }),
    24,
  );
  assert.equal(
    gosterilecekIlanSayisi({ catalogTotal: '62', suzulmusAdet: 24, daraltmaVar: false }),
    24,
  );
});

/* ------------------------------------------------------ arayüz sözleşmesi */

test('başlık, şirket şeridi ve filtre düğmesi aynı türetilmiş sayıyı kullanıyor', () => {
  // Aynı sayının üç yerde ayrı hesaplanması, üçünün zamanla ayrışması
  // demekti. Tek kaynak: gosterilecekToplam.
  assert.match(gorunum, /\{gosterilecekToplam\}\)/);
  assert.match(gorunum, /toplam=\{gosterilecekToplam\}/);
  assert.match(gorunum, /\{gosterilecekToplam\} ilanı göster/);
  assert.match(gorunum, /gosterilecekIlanSayisi\(\{/);

  /*
    ÜÇ SAYAÇ DA AYNI YARDIMCIDAN GEÇİYOR

    Önce burada "yardımcı tam bir kez çağrılıyor" yazıyordu. Kural o
    değildi; kural şu: gösterilen hiçbir sayı ham yüklenmiş adede
    bağlanmasın. Sağ sütundaki üç sayaç (ilan / şirket / şehir) tam da
    o hatayı yapıyordu — ölçüldü (canlı, country=TR): ekranda 24/23/4
    yazarken gerçek değerler 62/51/6 idi.

    Üçü de artık aynı yardımcıdan geçiyor, yani daraltma kuralı üçünde
    de aynı; ayrışamıyorlar.
  */
  const cagri = gorunum.split('gosterilecekIlanSayisi({').length - 1;
  assert.equal(cagri, 3, 'ilan, şirket ve şehir sayaçları aynı yardımcıdan geçmeli');
  for (const ad of ['gosterilecekToplam', 'gosterilecekSirket', 'gosterilecekSehir']) {
    assert.match(gorunum, new RegExp(`const ${ad} = gosterilecekIlanSayisi\\(`), ad);
  }
  /* Sayaç kutuları ham dizi uzunluğuna geri dönmemeli. */
  assert.doesNotMatch(gorunum, /etiket: 'Açık ilan', deger: String\(filteredListings\.length\)/);
});

test('mobil filtre düğmesi yüklenmiş adedi yazmıyor', () => {
  // Hiç filtre açık değilken paneli açan kişi düğmede "24 ilanı göster",
  // başlıkta "(62)" görüyordu; düğme listenin bittiğini söylüyordu.
  assert.equal(/\{filteredListings\.length\} ilanı göster/.test(gorunum), false);
});

test('daraltma bayrağı mevcut sinyallerden türetiliyor, bölüm çipinden değil', () => {
  const satir = gorunum.match(/const daraltmaVar = .+;/);
  assert.ok(satir, 'daraltmaVar tanımı bulunamadı');
  assert.match(satir[0], /acikSuzgecSayisi > 0/);
  assert.match(satir[0], /searchQuery/);
  assert.match(satir[0], /subTab !== 'all'/);
  // Bölüm çipleri listeyi SIRALIYOR (alanaGoreSirala), filtrelemiyor.
  assert.equal(satir[0].includes('bolumAlani'), false);
});

test('ülke seçici filtre panelinin Konum bloğunda ve şehrin üstünde', () => {
  const bas = gorunum.indexOf('<FiltreBlogu baslik="Konum">');
  assert.notEqual(bas, -1, 'Konum bloğu bulunamadı');
  const son = gorunum.indexOf('</FiltreBlogu>', bas);
  assert.notEqual(son, -1);
  const blok = gorunum.slice(bas, son);

  assert.ok(blok.includes('<ListingCountrySelector'), 'ülke seçici Konum bloğunda değil');
  // Ülke şehirden geniş kapsam; sırası da öyle olmalı.
  assert.ok(
    blok.indexOf('<ListingCountrySelector') < blok.indexOf('aria-label="Şehir seç"'),
    'ülke seçici şehir seçicisinin üstünde değil',
  );
  // Seçici sayfada tek kopya: başlığın altındaki eski yer kaldırıldı.
  assert.equal(gorunum.split('<ListingCountrySelector').length - 1, 1);
});

test('onCountryChange yoksa ülke seçici çizilmiyor', () => {
  assert.match(gorunum, /\{onCountryChange && \(\s*<ListingCountrySelector/);
});

test('"Toplam N açık ilan" satırı tekrar çizilmiyor', () => {
  // Başlık zaten gerçek toplamı gösteriyor; aynı sayıyı iki yerde söylemek
  // gereksiz.
  assert.equal(/Toplam \{catalogTotal\}/.test(gorunum), false);
});
