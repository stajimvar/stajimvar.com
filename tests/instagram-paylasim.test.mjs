import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACIKLAMA_SINIRI,
  ETIKETLER,
  ETIKET_SINIRI,
  aciklamaKur,
  etiketleriBul,
  gorselGecerliMi,
  gorselKapsayiciAdresi,
  karuselKapsayiciAdresi,
  paylasimSorunlari,
  yayinlaAdresi,
} from '../src/lib/instagram-paylasim.mjs';

const ORTAM = {
  INSTAGRAM_USER_ID: '17841402055888171',
  INSTAGRAM_ACCESS_TOKEN: 'jeton-degeri',
};

const GORSELLER = [
  'https://stajimvar.com/paylasim/01-kapak.jpg',
  'https://stajimvar.com/paylasim/02-nasil-derliyoruz.jpg',
  'https://stajimvar.com/paylasim/03-takip.jpg',
];

test('etiketler metnin sonunda ayrı blokta duruyor', () => {
  const metin = aciklamaKur('İlk cümle.');
  assert.match(metin, /^İlk cümle\.\n\n#/);
  assert.equal(etiketleriBul(metin).length, ETIKETLER.length);
  assert.ok(etiketleriBul(metin).length <= ETIKET_SINIRI);
});

test('etiket listesi konuya yakın ve az tutuluyor', () => {
  assert.ok(ETIKETLER.length <= 12, 'otuz etiket erişim değil spam sinyali');
  assert.ok(ETIKETLER.every((e) => e.startsWith('#')));
  assert.deepEqual([...new Set(ETIKETLER)], ETIKETLER, 'etiketler tekrar etmemeli');
});

test('yalnızca kendi alan adımızdaki HTTPS jpg kabul ediliyor', () => {
  assert.equal(gorselGecerliMi('https://stajimvar.com/paylasim/01-kapak.jpg'), true);
  assert.equal(gorselGecerliMi('https://www.stajimvar.com/paylasim/01-kapak.jpeg'), true);

  assert.equal(gorselGecerliMi('http://stajimvar.com/paylasim/01-kapak.jpg'), false);
  assert.equal(gorselGecerliMi('https://baskasite.com/x.jpg'), false);
  assert.equal(gorselGecerliMi('https://stajimvar.com/logo.png'), false);
  assert.equal(gorselGecerliMi('javascript:alert(1)'), false);
  assert.equal(gorselGecerliMi(''), false);
});

test('geçerli istekte sorun listesi boş', () => {
  assert.deepEqual(paylasimSorunlari({ gorseller: GORSELLER, aciklama: aciklamaKur('Metin.') }), []);
});

test('eksik ve aşırı girdiler yakalanıyor', () => {
  assert.match(paylasimSorunlari({ gorseller: [], aciklama: 'x' }).join(' '), /En az bir görsel/);
  assert.match(paylasimSorunlari({ gorseller: GORSELLER, aciklama: '  ' }).join(' '), /metni boş/);

  const uzun = 'a'.repeat(ACIKLAMA_SINIRI + 1);
  assert.match(paylasimSorunlari({ gorseller: GORSELLER, aciklama: uzun }).join(' '), /karakteri aşıyor/);

  const cokGorsel = Array.from({ length: 11 }, (_, i) => `https://stajimvar.com/paylasim/${i}.jpg`);
  assert.match(paylasimSorunlari({ gorseller: cokGorsel, aciklama: 'x' }).join(' '), /en fazla 10 görsel/);

  const cokEtiket = Array.from({ length: 31 }, (_, i) => `#etiket${i}`).join(' ');
  assert.match(paylasimSorunlari({ gorseller: GORSELLER, aciklama: cokEtiket }).join(' '), /Etiket sayısı/);
});

test('başka sunucudaki görsel reddediliyor', () => {
  const sorunlar = paylasimSorunlari({
    gorseller: ['https://ornek.com/x.jpg', ...GORSELLER],
    aciklama: 'Metin',
  });
  assert.match(sorunlar.join(' '), /1 adres uymuyor/);
});

test('karusel parçasında caption yok, is_carousel_item var', () => {
  const adres = gorselKapsayiciAdresi(ORTAM, GORSELLER[0], { karuselParcasi: true, aciklama: 'Metin' });
  assert.match(adres, /^https:\/\/graph\.instagram\.com\//);
  assert.match(adres, /17841402055888171\/media\?/);
  assert.match(adres, /is_carousel_item=true/);
  assert.equal(/caption=/.test(adres), false);
});

test('tek görselli gönderide caption var, is_carousel_item yok', () => {
  const adres = gorselKapsayiciAdresi(ORTAM, GORSELLER[0], { aciklama: 'Metin' });
  assert.match(adres, /caption=Metin/);
  assert.equal(/is_carousel_item/.test(adres), false);
});

test('karusel kapsayıcısı çocukları virgülle taşıyor', () => {
  const adres = karuselKapsayiciAdresi(ORTAM, ['1', '2', '3'], 'Metin');
  assert.match(adres, /media_type=CAROUSEL/);
  assert.match(adres, /children=1%2C2%2C3/);
  assert.match(adres, /caption=Metin/);
});

test('yayınlama adresi kapsayıcı kimliğini taşıyor', () => {
  assert.match(yayinlaAdresi(ORTAM, '178412345'), /media_publish\?creation_id=178412345/);
});

test('jeton adreste var ama başka hiçbir yere sızmıyor', () => {
  // Jeton sorgu dizesinde olmak zorunda (Meta böyle istiyor); sorun
  // listesi ve doğrulama çıktıları onu taşımamalı.
  const sorunlar = paylasimSorunlari({ gorseller: ['https://ornek.com/x.jpg'], aciklama: 'Metin' });
  assert.equal(sorunlar.join(' ').includes(ORTAM.INSTAGRAM_ACCESS_TOKEN), false);
});
