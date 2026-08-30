import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KARAR,
  ayniKurumMu,
  dogrulamaMesaji,
  epostaAlanAdi,
  kayitliAlanAdi,
  siteAlanAdi,
  sirketDogrulamaKarari,
} from '../src/lib/sirket-dogrulama.mjs';

/*
  Bu testler bir güvenlik sınırını koruyor: geçen her vaka bir şirket
  hesabının İNSAN ONAYI OLMADAN açılması demek. Gevşetmeden önce
  saldırgan tarafından nasıl kullanılacağını düşün.
*/

const onay = (siteUrl, eposta) => sirketDogrulamaKarari({ siteUrl, eposta }).karar;

/* --------------------------------------------------------- ayrıştırma */

test('e-posta alan adı okunuyor, son "@" esas alınıyor', () => {
  assert.equal(epostaAlanAdi('ik@acme.com'), 'acme.com');
  assert.equal(epostaAlanAdi('  IK@ACME.COM  '), 'acme.com');
  assert.equal(epostaAlanAdi('ad.soyad@acme.com.tr'), 'acme.com.tr');
  assert.equal(epostaAlanAdi('a@b@acme.com'), 'acme.com');
});

test('bozuk e-posta null dönüyor', () => {
  for (const bozuk of ['', null, undefined, 'acme.com', 'ik@', '@acme.com', 'ik@acme', 'ik@ 1']) {
    assert.equal(epostaAlanAdi(bozuk), null, `${bozuk} kabul edildi`);
  }
});

test('site adresinden makine adı çıkarılıyor', () => {
  const beklenen = 'acme.com';
  for (const girdi of [
    'acme.com',
    'www.acme.com',
    'http://acme.com',
    'https://acme.com',
    'https://www.acme.com',
    'https://www.acme.com/',
    'https://www.acme.com/kariyer/staj?x=1#b',
    'HTTPS://WWW.ACME.COM',
    'https://acme.com:443/kariyer',
    'https://acme.com.',
  ]) {
    assert.equal(siteAlanAdi(girdi), beklenen, `${girdi} → ${siteAlanAdi(girdi)}`);
  }
});

test('http(s) dışındaki şemalar ve IP adresleri reddediliyor', () => {
  assert.equal(siteAlanAdi('javascript:alert(1)'), null);
  assert.equal(siteAlanAdi('file:///etc/passwd'), null);
  assert.equal(siteAlanAdi('https://192.168.1.1'), null);
  assert.equal(siteAlanAdi('https://127.0.0.1/kariyer'), null);
  assert.equal(siteAlanAdi(''), null);
  assert.equal(siteAlanAdi(null), null);
});

/* ----------------------------------------------------- kayıtlı alan adı */

test('kayıtlı alan adı genel son ekin bir üstü', () => {
  assert.equal(kayitliAlanAdi('acme.com'), 'acme.com');
  assert.equal(kayitliAlanAdi('careers.acme.com'), 'acme.com');
  assert.equal(kayitliAlanAdi('a.b.c.acme.com'), 'acme.com');
  assert.equal(kayitliAlanAdi('acme.com.tr'), 'acme.com.tr');
  assert.equal(kayitliAlanAdi('kariyer.acme.com.tr'), 'acme.com.tr');
  assert.equal(kayitliAlanAdi('acme.co.uk'), 'acme.co.uk');
});

test('tek başına genel son ek kayıtlı alan adı değil', () => {
  assert.equal(kayitliAlanAdi('com.tr'), null);
  assert.equal(kayitliAlanAdi('co.uk'), null);
  assert.equal(kayitliAlanAdi('com'), null);
});

/* ----------------------------------------------- EŞLEŞMESİ GEREKENLER */

test('aynı kurum: temel eşleşmeler', () => {
  assert.equal(onay('acme.com', 'ik@acme.com'), KARAR.OTOMATIK_ONAY);
  assert.equal(onay('www.acme.com', 'ik@acme.com'), KARAR.OTOMATIK_ONAY);
  assert.equal(onay('https://careers.acme.com', 'ik@acme.com'), KARAR.OTOMATIK_ONAY);
  assert.equal(onay('acme.com.tr', 'ik@acme.com.tr'), KARAR.OTOMATIK_ONAY);
  assert.equal(onay('https://kariyer.acme.com.tr/', 'insankaynaklari@acme.com.tr'), KARAR.OTOMATIK_ONAY);
});

test('büyük-küçük harf, protokol, www ve sondaki eğik çizgi önemsiz', () => {
  assert.equal(onay('HTTPS://WWW.ACME.COM/', 'IK@ACME.COM'), KARAR.OTOMATIK_ONAY);
  assert.equal(onay('http://acme.com', 'ik@Acme.Com'), KARAR.OTOMATIK_ONAY);
});

test('e-posta alt alan adında olabilir', () => {
  /* posta.acme.com kurumsal bir alt alan adı; kurum aynı. */
  assert.equal(onay('acme.com', 'ik@posta.acme.com'), KARAR.OTOMATIK_ONAY);
});

/* ------------------------------------------ EŞLEŞMEMESİ GEREKENLER */

test('SALDIRI: site alan adını içeren yabancı alan adı onaylanmıyor', () => {
  assert.equal(onay('acme.com', 'ik@acme.com.evil.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.com.evil.com', 'ik@acme.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.com', 'ik@evil-acme.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.com', 'ik@acme.com.co'), KARAR.ELLE_INCELE);
});

test('benzeyen ama farklı alan adları onaylanmıyor', () => {
  assert.equal(onay('acme.com', 'ik@acme-careers.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.com', 'ik@notacme.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.com', 'ik@acme.net'), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.com', 'ik@acme.com.tr'), KARAR.ELLE_INCELE);
});

test('aynı genel son eki paylaşmak yetmiyor', () => {
  /* ".com.tr" ortak son ek; iki ayrı kurum. */
  assert.equal(onay('acme.com.tr', 'ik@baska.com.tr'), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.co.uk', 'ik@baska.co.uk'), KARAR.ELLE_INCELE);
  assert.equal(ayniKurumMu('acme.com.tr', 'baska.com.tr'), false);
});

test('serbest e-posta sağlayıcıları otomatik onay almıyor', () => {
  for (const alan of ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'hotmail.com', 'yandex.com.tr']) {
    assert.equal(onay('acme.com', `acme@${alan}`), KARAR.ELLE_INCELE, alan);
  }
  /* Kendi alan adı gmail.com olan bir "şirket" de olmaz. */
  assert.equal(onay('gmail.com', 'acme@gmail.com'), KARAR.ELLE_INCELE);
});

test('tek kullanımlık posta otomatik onay almıyor', () => {
  assert.equal(onay('acme.com', 'ik@mailinator.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('mailinator.com', 'ik@mailinator.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.com', 'ik@yopmail.com'), KARAR.ELLE_INCELE);
});

test('yerel ve test alan adları otomatik onay almıyor', () => {
  assert.equal(onay('localhost', 'ik@localhost'), KARAR.ELLE_INCELE);
  assert.equal(onay('example.com', 'ik@example.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('test.com', 'ik@test.com'), KARAR.ELLE_INCELE);
  assert.equal(onay('https://127.0.0.1', 'ik@acme.com'), KARAR.ELLE_INCELE);
});

test('site adresi yoksa otomatik onay verilmiyor', () => {
  assert.equal(onay('', 'ik@acme.com'), KARAR.ELLE_INCELE);
  assert.equal(onay(null, 'ik@acme.com'), KARAR.ELLE_INCELE);
  assert.equal(sirketDogrulamaKarari({ eposta: 'ik@acme.com' }).gerekce, 'SIRKET_SITESI_YOK');
});

test('e-posta okunamazsa otomatik onay verilmiyor', () => {
  assert.equal(onay('acme.com', ''), KARAR.ELLE_INCELE);
  assert.equal(onay('acme.com', 'bozuk'), KARAR.ELLE_INCELE);
  assert.equal(sirketDogrulamaKarari({ siteUrl: 'acme.com' }).gerekce, 'EPOSTA_OKUNAMADI');
});

/* --------------------------------------------------------- gerekçeler */

test('gerekçe makine tarafından okunabilir ve karara uyuyor', () => {
  const eslesen = sirketDogrulamaKarari({ siteUrl: 'acme.com', eposta: 'ik@acme.com' });
  assert.equal(eslesen.gerekce, 'KURUMSAL_ALAN_ADI_SITEYLE_ESLESTI');
  assert.ok(eslesen.sinyaller.includes('ALAN_ADI_ESLESTI'));

  const serbest = sirketDogrulamaKarari({ siteUrl: 'acme.com', eposta: 'a@gmail.com' });
  assert.equal(serbest.gerekce, 'KURUMSAL_EPOSTA_DEGIL');

  const uyusmaz = sirketDogrulamaKarari({ siteUrl: 'acme.com', eposta: 'ik@baska.com' });
  assert.equal(uyusmaz.gerekce, 'ALAN_ADI_SITEYLE_ESLESMIYOR');
});

test('hiçbir girdi otomatik REDDEDİLMİYOR', () => {
  /*
    Gerçek bir şirketi sessizce kapıda bırakmak, yanlış onaydan daha az
    görünür ama daha kalıcı bir hata. Riskli olan her şey insana gidiyor.
  */
  const girdiler = [
    ['acme.com', 'ik@acme.com'],
    ['', ''],
    ['javascript:alert(1)', 'ik@mailinator.com'],
    ['acme.com', 'a@gmail.com'],
  ];
  for (const [site, posta] of girdiler) {
    const k = sirketDogrulamaKarari({ siteUrl: site, eposta: posta }).karar;
    assert.ok(k === KARAR.OTOMATIK_ONAY || k === KARAR.ELLE_INCELE, `beklenmeyen karar: ${k}`);
  }
});

test('kullanıcı mesajı süre garantisi vermiyor', () => {
  assert.equal(dogrulamaMesaji(KARAR.OTOMATIK_ONAY), 'Şirket hesabınız doğrulandı.');
  assert.equal(dogrulamaMesaji(KARAR.ELLE_INCELE), 'Bilgilerinizi kontrol ediyoruz.');
  for (const k of Object.values(KARAR)) {
    assert.ok(!/saat|gün|24|48/i.test(dogrulamaMesaji(k)), 'mesaj süre vaat ediyor');
  }
});
