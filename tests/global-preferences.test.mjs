import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countryFromLocale,
  normalizeCountryCode,
  normalizeLanguageCode,
  readCountryQuery,
  resolveListingCountry,
  writeCountryQuery,
} from '../src/lib/global-preferences.mjs';

test('ulke secimi URL sonra tarayici sonra hesap sonra locale sonra Cloudflare onceligini korur', () => {
  const common = { browserCountry: 'DE', accountCountries: ['TR'], locale: 'en-US', cloudflareCountry: 'GB' };
  assert.equal(resolveListingCountry({ ...common, urlCountry: 'FR' }), 'FR');
  assert.equal(resolveListingCountry({ ...common, urlCountry: null }), 'DE');
  assert.equal(resolveListingCountry({ ...common, urlCountry: null, browserCountry: null }), 'TR');
  assert.equal(resolveListingCountry({ ...common, urlCountry: null, browserCountry: null, accountCountries: [] }), 'US');
  assert.equal(resolveListingCountry({ ...common, urlCountry: null, browserCountry: null, accountCountries: [], locale: 'fr' }), 'GB');
  assert.equal(resolveListingCountry({ urlCountry: null, browserCountry: null, accountCountries: [], locale: 'fr', cloudflareCountry: null }), 'TR');
});

test('all ve remote gecerli secimlerdir ama gecersiz kodlar degildir', () => {
  assert.equal(normalizeCountryCode('fr'), 'FR');
  assert.equal(normalizeCountryCode('all', { allowSpecial: true }), 'all');
  assert.equal(normalizeCountryCode('remote', { allowSpecial: true }), 'remote');
  assert.equal(normalizeCountryCode('ZZ'), null);
  assert.equal(normalizeCountryCode('EU'), null);
});

test('locale yalniz acik bolge tasiyorsa ulkeye donusur', () => {
  assert.equal(countryFromLocale('fr-FR'), 'FR');
  assert.equal(countryFromLocale('tr_TR'), 'TR');
  assert.equal(countryFromLocale('fr'), null);
});

test('arayuz dili ulke seciminden bagimsiz ISO dil kodudur', () => {
  assert.equal(normalizeLanguageCode('TR'), 'tr');
  assert.equal(normalizeLanguageCode('fr-FR'), 'fr');
  assert.equal(normalizeLanguageCode('turkish'), null);
  assert.equal(resolveListingCountry({ urlCountry: 'FR', browserCountry: null, accountCountries: [], locale: 'tr-TR', cloudflareCountry: 'TR' }), 'FR');
});

test('country sorgusu diger parametreleri korur ve yenilemede okunur', () => {
  assert.equal(readCountryQuery('?q=yazilim&country=fr'), 'FR');
  assert.equal(readCountryQuery('?country=remote'), 'remote');
  assert.equal(readCountryQuery('?country=ZZ'), null);
  assert.equal(writeCountryQuery('/', '?q=yazilim', 'FR'), '/?q=yazilim&country=FR');
  assert.equal(writeCountryQuery('/', '?q=yazilim&country=TR', 'all'), '/?q=yazilim&country=all');
});

/*
  BAŞLANGIÇ SENARYOLARININ TAMAMI

  Aşağıdaki durumlar 7 Eylül 2026'da tek tek çalıştırıldı ve hepsi
  beklenen sonucu verdi; testler o ölçümü sabitliyor. Kapsanmayan üç
  durum eklendi: hesap tercihi basamağı, açık kullanıcı seçiminin
  korunması ve geçersiz parametrenin sıradaki basamağa düşmesi.
*/

test('ILK KEZ GELEN TURKIYE KULLANICISI Turkiye ilanlarini goruyor', () => {
  /* Tarayıcı dili bölge taşıyorsa oradan; taşımıyorsa Cloudflare'den. */
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: null, accountCountries: [], locale: 'tr-TR', cloudflareCountry: null }),
    'TR'
  );
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: null, accountCountries: [], locale: 'tr', cloudflareCountry: 'TR' }),
    'TR'
  );
  /* Hiçbir sinyal yoksa güvenli varsayılan yine Türkiye. */
  assert.equal(resolveListingCountry({}), 'TR');
});

test('ILK KEZ GELEN YABANCI KULLANICI kendi ulkesini goruyor', () => {
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: null, accountCountries: [], locale: 'fr-FR', cloudflareCountry: 'FR' }),
    'FR'
  );
  /* Dil bölgesizse Cloudflare basamağı devreye giriyor. */
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: null, accountCountries: [], locale: 'de', cloudflareCountry: 'DE' }),
    'DE'
  );
});

test('ACIK KULLANICI SECIMI EZILMIYOR', () => {
  /*
    Bu en kolay bozulan davranış: kullanıcı Fransa'yı seçtikten sonra
    tarayıcı dili, hesap tercihi ve Cloudflare hepsi Türkiye diyor.
    Seçim yine de kazanmalı.
  */
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: 'FR', accountCountries: ['TR'], locale: 'tr-TR', cloudflareCountry: 'TR' }),
    'FR'
  );
  /* Kaydedilen seçim 'remote' ya da 'all' da olabilir. */
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: 'remote', accountCountries: ['TR'], locale: 'tr-TR', cloudflareCountry: 'TR' }),
    'remote'
  );
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: 'all', accountCountries: ['TR'], locale: 'tr-TR', cloudflareCountry: 'TR' }),
    'all'
  );
});

test('HESAP TERCIHI tarayici dilinin onunde geliyor', () => {
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: null, accountCountries: ['DE', 'NL'], locale: 'tr-TR', cloudflareCountry: 'TR' }),
    'DE'
  );
  /* Hesapta geçersiz kod varsa atlanıyor, ilk GEÇERLİ tercih alınıyor. */
  assert.equal(
    resolveListingCountry({ urlCountry: null, browserCountry: null, accountCountries: ['ZZ', 'NL'], locale: 'tr-TR', cloudflareCountry: 'TR' }),
    'NL'
  );
});

test('GECERSIZ ULKE PARAMETRESI sessizce siradaki basamaga dusuyor', () => {
  /*
    Hata sayfası değil, düşüş: adres çubuğuna yanlış bir kod yazan
    kullanıcı boş ekran değil kendi ülkesinin ilanlarını görüyor.
    Sunucu tarafı (RPC) geçersiz kodu zaten reddediyor, yani bu düşüş
    olmasa istek hata döndürürdü.
  */
  for (const bozuk of ['XX', 'ZZ', 'turkiye', 'EU', 'T', 'TRR', '', '  ', '99']) {
    assert.equal(
      resolveListingCountry({ urlCountry: bozuk, browserCountry: null, accountCountries: [], locale: 'tr-TR', cloudflareCountry: null }),
      'TR',
      `geçersiz "${bozuk}" düşmedi`
    );
    assert.equal(readCountryQuery(`?country=${encodeURIComponent(bozuk)}`), null, bozuk);
  }
  /* Her basamak geçersizse güvenli varsayılana kadar düşüyor. */
  assert.equal(
    resolveListingCountry({ urlCountry: 'ZZ', browserCountry: '??', accountCountries: ['xx'], locale: 'qq', cloudflareCountry: '99' }),
    'TR'
  );
});

test('all ve remote buyuk kucuk harf farketmeksizin okunuyor', () => {
  for (const [girdi, beklenen] of [['all', 'all'], ['ALL', 'all'], ['remote', 'remote'], ['Remote', 'remote']]) {
    assert.equal(readCountryQuery(`?country=${girdi}`), beklenen, girdi);
  }
});

test('gecersiz secim adres cubugunda birakilmiyor', () => {
  /* Yazılamayan bir değer parametreyi siliyor; çözümleme yeniden çalışıyor. */
  assert.equal(writeCountryQuery('/ilanlar', '?country=TR', 'XX'), '/ilanlar');
  assert.equal(writeCountryQuery('/ilanlar', '?q=staj', 'remote'), '/ilanlar?q=staj&country=remote');
});
