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
