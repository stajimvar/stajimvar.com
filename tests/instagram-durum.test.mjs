import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GEREKLI_AYARLAR,
  YAYIN_IZNI,
  eksikAyarlar,
  grafAdresleri,
  grafHatasi,
  durumOzeti,
} from '../src/lib/instagram-durum.mjs';

const SIMDI = new Date('2026-08-23T12:00:00.000Z');
const ORTAM = {
  INSTAGRAM_APP_ID: '1234567890',
  INSTAGRAM_APP_SECRET: 'sir',
  INSTAGRAM_ACCESS_TOKEN: 'jeton-degeri',
  INSTAGRAM_USER_ID: '17841400000000000',
};

const saglikliDogrulama = (ustuneYaz = {}) => ({
  data: {
    app_id: ORTAM.INSTAGRAM_APP_ID,
    is_valid: true,
    expires_at: Math.floor(new Date('2026-10-23T12:00:00.000Z').getTime() / 1000),
    scopes: ['instagram_basic', YAYIN_IZNI, 'pages_show_list'],
    ...ustuneYaz,
  },
});

const saglikliHesap = { id: ORTAM.INSTAGRAM_USER_ID, username: 'stajimvar', name: 'StajımVar' };
const saglikliKota = { data: [{ quota_usage: 3, config: { quota_total: 50 } }] };

test('eksik ayarlar yalnızca adlarıyla bildiriliyor', () => {
  assert.deepEqual(eksikAyarlar(ORTAM), []);
  assert.deepEqual(eksikAyarlar({ ...ORTAM, INSTAGRAM_APP_SECRET: '' }), ['INSTAGRAM_APP_SECRET']);
  assert.deepEqual(eksikAyarlar({}), GEREKLI_AYARLAR);
});

test('adresler uygulama jetonunu app_id|app_secret biçiminde kuruyor', () => {
  const adresler = grafAdresleri(ORTAM);
  assert.match(adresler.dogrulama, /debug_token\?input_token=jeton-degeri/);
  assert.match(adresler.dogrulama, /access_token=1234567890%7Csir/);
  assert.match(adresler.hesap, /17841400000000000\?fields=id,username,name/);
  assert.match(adresler.kota, /content_publishing_limit/);
});

test('sağlıklı kurulumda bağlantı kurulmuş sayılıyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama(),
    hesap: saglikliHesap,
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  assert.equal(ozet.bagli, true);
  assert.deepEqual(ozet.sorunlar, []);
  assert.equal(ozet.hesap.kullaniciAdi, 'stajimvar');
  assert.equal(ozet.jeton.yayinYetkisi, true);
  assert.equal(ozet.jeton.gunKaldi, 61);
  assert.deepEqual(ozet.yayinKotasi, { kullanilan: 3, sinir: 50 });
});

test('geçersiz jeton bağlantıyı düşürüyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama({ is_valid: false, error: { message: 'Session has expired' } }),
    hesap: saglikliHesap,
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  assert.equal(ozet.bagli, false);
  assert.match(ozet.sorunlar.join(' '), /Jeton geçersiz/);
});

test('süresi dolmuş jeton ayrıca bildiriliyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama({
      expires_at: Math.floor(new Date('2026-08-01T12:00:00.000Z').getTime() / 1000),
    }),
    hesap: saglikliHesap,
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  assert.equal(ozet.bagli, false);
  assert.match(ozet.sorunlar.join(' '), /süresi dolmuş/);
});

test('yaklaşan bitiş uyarı veriyor ama hesap bilgisi yine dönüyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama({
      expires_at: Math.floor(new Date('2026-08-27T12:00:00.000Z').getTime() / 1000),
    }),
    hesap: saglikliHesap,
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  assert.equal(ozet.bagli, false);
  assert.match(ozet.sorunlar.join(' '), /4 gün içinde doluyor/);
  assert.equal(ozet.hesap.id, ORTAM.INSTAGRAM_USER_ID);
});

test('süresiz jeton (expires_at = 0) süresi dolmuş sayılmıyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama({ expires_at: 0 }),
    hesap: saglikliHesap,
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  assert.equal(ozet.bagli, true);
  assert.equal(ozet.jeton.suresiz, true);
  assert.equal(ozet.jeton.biterTarih, null);
});

test('paylaşım izni yoksa bağlantı hazır sayılmıyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama({ scopes: ['instagram_basic'] }),
    hesap: saglikliHesap,
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  assert.equal(ozet.bagli, false);
  assert.equal(ozet.jeton.yayinYetkisi, false);
  assert.match(ozet.sorunlar.join(' '), /Paylaşım izni yok/);
});

test('başka bir hesabın jetonu fark ediliyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama(),
    hesap: { ...saglikliHesap, id: '17841499999999999' },
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  assert.equal(ozet.bagli, false);
  assert.match(ozet.sorunlar.join(' '), /INSTAGRAM_USER_ID ile aynı değil/);
});

test('Meta hata gövdesi okunabilir tek satıra çevriliyor', () => {
  assert.equal(grafHatasi(null), null);
  assert.equal(grafHatasi({ id: '1' }), null);
  assert.equal(
    grafHatasi({ error: { message: 'Invalid OAuth access token', type: 'OAuthException', code: 190 } }),
    'Invalid OAuth access token — OAuthException — kod 190'
  );
});

test('hesap ucu hata dönerse özet bunu taşıyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama(),
    hesap: { error: { message: 'Unsupported get request', code: 100 } },
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  assert.equal(ozet.bagli, false);
  assert.equal(ozet.hesap, null);
  assert.match(ozet.sorunlar.join(' '), /Hesap okunamadı/);
});

test('özet hiçbir koşulda jetonu ya da sırrı taşımıyor', () => {
  const ozet = durumOzeti({
    dogrulama: saglikliDogrulama(),
    hesap: saglikliHesap,
    kota: saglikliKota,
    beklenenKullaniciId: ORTAM.INSTAGRAM_USER_ID,
    simdi: SIMDI,
  });

  const metin = JSON.stringify(ozet);
  assert.equal(metin.includes(ORTAM.INSTAGRAM_ACCESS_TOKEN), false);
  assert.equal(metin.includes(ORTAM.INSTAGRAM_APP_SECRET), false);
});
