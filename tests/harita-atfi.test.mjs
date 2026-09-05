import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HARITA_STIL_ADRESI, haritaAyari } from '../src/lib/harita-ayarlari.ts';

/*
 * HARİTA ARTIK ANAHTAR İSTEMİYOR
 *
 * Eskiden stil ücretli bir sağlayıcıdan geliyordu ve ortamda anahtar yoksa
 * harita hiç kurulmuyordu. Buradaki testler iki şeyi birden tutuyor:
 * kurulumun anahtarsız çalıştığını ve bunun bedeli olan lisans atfının
 * ekranda gerçekten durduğunu. İkisi ayrılırsa atıf sessizce düşebilir.
 */
const ayarKaynagi = readFileSync(new URL('../src/lib/harita-ayarlari.ts', import.meta.url), 'utf8');
const haritaKaynagi = readFileSync(new URL('../src/components/KesfetGeoMap.tsx', import.meta.url), 'utf8');

test('haritaAyari() ortam değişkeni olmadan hazır ve OpenFreeMap stilini veriyor', () => {
  const ayar = haritaAyari();
  assert.equal(ayar.hazir, true, 'yapılandırma kaynaklı "harita yok" durumu kalmadı');
  assert.equal(ayar.styleUrl, 'https://tiles.openfreemap.org/styles/liberty');
  assert.equal(ayar.gerekce, '', 'hazırken gösterilecek gerekçe olmuyor');
  assert.equal(HARITA_STIL_ADRESI, ayar.styleUrl, 'stil adresi tek sabitten geliyor');
});

test('stil adresi istemciye anahtar sızdırmıyor', () => {
  const adres = new URL(haritaAyari().styleUrl);
  assert.equal(adres.protocol, 'https:');
  assert.equal([...adres.searchParams.keys()].length, 0, 'adreste hiçbir sorgu parametresi yok');
  for (const yasak of ['token', 'key', 'apikey', 'access']) {
    assert.ok(
      !adres.toString().toLowerCase().includes(yasak),
      `stil adresinde "${yasak}" geçmemeli: tarayıcıya gizli değer gitmiyor`,
    );
  }
});

test('ayar dosyasında ortam değişkeni okuması kalmadı', () => {
  for (const iz of ['VITE_MAPBOX_TOKEN', 'VITE_MAP_STYLE_URL', 'import.meta.env', 'access_token']) {
    assert.ok(!ayarKaynagi.includes(iz), `harita-ayarlari.ts içinde "${iz}" kalmamalı`);
  }
});

test('atıf haritanın altında görünür duruyor: iki bağlantı da gerçek', () => {
  assert.ok(
    haritaKaynagi.includes('© OpenStreetMap katkıcıları'),
    'OpenStreetMap atfı metin olarak ekranda',
  );
  assert.ok(/>\s*OpenFreeMap\s*<\/a>/.test(haritaKaynagi), 'OpenFreeMap atfı metin olarak ekranda');
  assert.ok(
    />\s*© OpenMapTiles\s*<\/a>/.test(haritaKaynagi),
    'sağlayıcının TileJSON\'ında istediği OpenMapTiles atfı da yerinde',
  );

  /* Bağlantılar gerçek <a>: metnin yanında duran süs değil, tıklanabilir. */
  const baglantilar = haritaKaynagi.match(/<a\b[\s\S]*?<\/a>/g) ?? [];
  for (const adres of [
    'https://www.openstreetmap.org/copyright',
    'https://www.openmaptiles.org/',
    'https://openfreemap.org/',
  ]) {
    const bag = baglantilar.find((parca) => parca.includes(`href="${adres}"`));
    assert.ok(bag, `${adres} için bir <a> bağlantısı var`);
    assert.ok(
      bag.includes('rel="noopener noreferrer"'),
      `${adres} bağlantısı rel="noopener noreferrer" taşıyor`,
    );
  }
});

test('atıf açılır kutuya saklanmıyor', () => {
  assert.ok(
    !/attributionControl:\s*\{[^}]*compact:\s*true/.test(haritaKaynagi),
    'yerleşik compact atıf kutusu kullanılmıyor',
  );
  assert.ok(
    /attributionControl:\s*false/.test(haritaKaynagi),
    'atıf maplibre yerine kalıcı satırla veriliyor',
  );
});
