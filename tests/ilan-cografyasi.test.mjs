import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { COGRAFYA, ilanCografyasi, yabanciYerMi } from '../src/lib/ilan-cografyasi.mjs';
import { aramaEslesiyorMu, adresTenFiltreler, aramaAdresine, filtreleriDogrula } from '../src/lib/kayitli-arama.mjs';

const ilan = (alanlar) => ({
  id: 'x', title: 'Stajyer', companyName: 'Şirket', city: '', workType: 'On-site', requiredSkills: [],
  status: 'published', ...alanlar,
});

test('İstanbul + hibrit → Türkiye', () => {
  assert.equal(ilanCografyasi(ilan({ countryCode: 'TR', city: 'İstanbul', workType: 'Hybrid' })), COGRAFYA.TURKIYE);
});

test('Tuzla (ülke kodu yok) → Türkiye; ülkesi TR olan Tuzla da Türkiye', () => {
  assert.equal(ilanCografyasi({ countryCode: null, city: 'Tuzla' }), COGRAFYA.TURKIYE);
  assert.equal(ilanCografyasi({ countryCode: 'TR', city: 'Tuzla' }), COGRAFYA.TURKIYE);
});

test('Paris → Yurtdışı', () => {
  assert.equal(ilanCografyasi({ countryCode: 'FR', city: 'Paris' }), COGRAFYA.YURTDISI);
  assert.equal(ilanCografyasi({ countryCode: null, city: 'Paris' }), COGRAFYA.YURTDISI);
});

test('Tübingen + Praktikum başlığı → Yurtdışı; kayıt değişmiyor', () => {
  const kayit = Object.freeze({ countryCode: 'DE', city: 'Tübingen', title: 'Praktikum Marketing (m/w/d)', status: 'published' });
  assert.equal(ilanCografyasi(kayit), COGRAFYA.YURTDISI);
  assert.equal(kayit.status, 'published');
});

test('açıkça Türkiye\'den uzaktan → Türkiye', () => {
  assert.equal(ilanCografyasi({ countryCode: 'TR', city: '', workType: 'Remote' }), COGRAFYA.TURKIYE);
});

test('ülkesi bilinmeyen remote → Belirlenemedi ve Tüm ilanlar aramasında bulunur', () => {
  const remote = ilan({ countryCode: null, city: '', workType: 'Remote' });
  assert.equal(ilanCografyasi(remote), COGRAFYA.BELIRSIZ);
  assert.equal(aramaEslesiyorMu(remote, filtreleriDogrula({ country: 'all' })), true);
  assert.equal(aramaEslesiyorMu(remote, filtreleriDogrula({ country: 'all', bolge: 'yurtdisi' })), false);
  assert.equal(aramaEslesiyorMu(remote, filtreleriDogrula({ country: 'TR' })), false);
});

test('şirket merkezi TR, pozisyon Paris → Yurtdışı (şirket ülkesi okunmuyor)', () => {
  assert.equal(
    ilanCografyasi({ countryCode: 'FR', city: 'Paris', companyCountry: 'TR', companyHeadquarters: 'İstanbul' }),
    COGRAFYA.YURTDISI,
  );
});

test('ülke/şehir çelişkisi → Belirlenemedi', () => {
  assert.equal(ilanCografyasi({ countryCode: 'TR', city: 'Paris' }), COGRAFYA.BELIRSIZ);
  assert.equal(ilanCografyasi({ countryCode: 'DE', city: 'İstanbul' }), COGRAFYA.BELIRSIZ);
  assert.equal(ilanCografyasi({ countryCode: null, city: 'Istanbul / Berlin' }), COGRAFYA.BELIRSIZ);
});

test('çok konumlu ilan: Türkiye seçeneği varsa Türkiye; konumlar korunur', () => {
  const konumlar = [
    { countryCode: 'DE', city: 'Berlin' },
    { countryCode: 'TR', city: 'İstanbul' },
  ];
  const kayit = { konumlar };
  assert.equal(ilanCografyasi(kayit), COGRAFYA.TURKIYE);
  assert.equal(kayit.konumlar.length, 2);
  assert.deepEqual(kayit.konumlar[0], { countryCode: 'DE', city: 'Berlin' });
  assert.equal(ilanCografyasi({ konumlar: [{ countryCode: 'DE', city: 'Berlin' }, { countryCode: 'FR', city: 'Paris' }] }), COGRAFYA.YURTDISI);
});

test('MT / unpaid / yabancı başlık coğrafya dışında hiçbir şey değiştirmiyor', () => {
  for (const title of ['Management Trainee (MT)', 'Unpaid Internship', 'Stagiaire Marketing', 'Praktikant*in (m/w/d)']) {
    assert.equal(ilanCografyasi({ countryCode: 'TR', city: 'Ankara', title }), COGRAFYA.TURKIYE);
    assert.equal(aramaEslesiyorMu(ilan({ title, countryCode: 'TR', city: 'Ankara' }), filtreleriDogrula({})), true);
  }
});

test('sınıflandırma hiçbir kaydı değiştirmiyor (yayın durumu dahil)', () => {
  const kayitlar = [
    { countryCode: 'TR', city: 'İzmir', status: 'published' },
    { countryCode: 'FR', city: 'Paris', status: 'published' },
    { countryCode: null, city: null, status: 'published' },
  ];
  const once = JSON.stringify(kayitlar);
  kayitlar.forEach(ilanCografyasi);
  assert.equal(JSON.stringify(kayitlar), once);
});

test('yabancı yer adı listesi Türkiye illerini yakalamıyor', () => {
  for (const il of ['İstanbul', 'Ankara', 'Van', 'Kars', 'Batman', 'Ordu']) assert.equal(yabanciYerMi(il), false, il);
  for (const yer of ['Berlin, DE | Germany (REMOTE)', 'Köln de', 'Neuilly-sur-Seine']) assert.equal(yabanciYerMi(yer), true, yer);
});

test('kayıtlı arama yurtdışı seçimini adres ve kayıtta koruyor', () => {
  const f = filtreleriDogrula({ country: 'all', bolge: 'yurtdisi' });
  assert.equal(f.bolge, 'yurtdisi');
  const adres = aramaAdresine(f);
  assert.match(adres, /bolge=yurtdisi/);
  assert.equal(adresTenFiltreler(adres.split('?')[1]).bolge, 'yurtdisi');
  assert.equal(filtreleriDogrula({ bolge: 'uydurma' }).bolge, null);
  assert.equal(aramaEslesiyorMu(ilan({ countryCode: 'DE', city: 'Berlin' }), f), true);
  assert.equal(aramaEslesiyorMu(ilan({ countryCode: 'TR', city: 'İstanbul' }), f), false);
});
