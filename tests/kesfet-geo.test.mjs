import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DUNYA_KODU,
  buildGeoTree,
  countryCounts,
  filterEventsByGeo,
  findGeoNode,
  flattenGeoTree,
  geoBreadcrumb,
  geoNodeCenter,
  hasVerifiedPin,
  pinnableEvents,
  resolveGeoBreadcrumb,
  resolveGeoNode,
} from '../src/lib/kesfet-geo.mjs';
import {
  discoverPeriodRange,
  isActiveDiscoverEvent,
  matchesDiscoverFilters,
  normalizeDiscoverSearch,
  sortDiscoverEvents,
} from '../src/lib/kesfet-geo-filtre.mjs';

const ULKE_ADLARI = { TR: 'Türkiye', DE: 'Almanya' };
const countryName = (code) => ULKE_ADLARI[code] ?? code;

const etkinlik = (over) => ({
  status: 'published',
  title: 'Etkinlik',
  organizer: 'Kurum',
  venueName: 'Mekân',
  category: 'concert',
  isFree: false,
  hasStudentDiscount: false,
  startsAt: '2026-09-10T18:00:00Z',
  endsAt: '2026-09-10T21:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  ...over,
});

/*
  Beş kayıt: iki ülke, üç şehir, dört ilçe. Biri açık adresten çözülmüş
  (pin çizilir), biri ilçe merkezinden (pin ÇİZİLMEZ), biri koordinatsız.
*/
const ETKINLIKLER = [
  etkinlik({
    id: 'e1', city: 'İstanbul', district: 'Zeytinburnu', title: 'Kıyı Konseri',
    latitude: 40.9944, longitude: 28.9033, geocodePrecision: 'address',
  }),
  etkinlik({
    id: 'e2', city: 'İstanbul', district: 'Kadıköy', category: 'exhibition',
    title: 'Deniz Sergisi', isFree: true, createdAt: '2026-09-02T00:00:00Z',
  }),
  etkinlik({
    id: 'e3', city: 'İzmir', district: 'Konak', title: 'Liman Konseri',
    latitude: 38.4189, longitude: 27.1287, geocodePrecision: 'admin2',
    createdAt: '2026-09-03T00:00:00Z',
  }),
  etkinlik({
    id: 'e4', city: 'Ankara', district: 'Çankaya', category: 'workshop',
    title: 'Tasarım Atölyesi', createdAt: '2026-09-04T00:00:00Z',
  }),
  etkinlik({
    id: 'e5', countryCode: 'DE', city: 'Berlin', district: 'Mitte',
    category: 'festival', title: 'Bahar Festivali', createdAt: '2026-09-05T00:00:00Z',
  }),
];

const agac = () => buildGeoTree(ETKINLIKLER, { countryName });

test('ülke kolonu yokken bile ağaç kuruluyor; varsayılan tek yerde veriliyor', () => {
  const tree = agac();
  const kodlar = countryCounts(tree).map((ulke) => ulke.code).sort();
  assert.deepEqual(kodlar, ['DE', 'TR']);
  assert.equal(findGeoNode(tree, 'TR').count, 4);
  assert.equal(findGeoNode(tree, 'TR').name, 'Türkiye');
  assert.equal(findGeoNode(tree, 'DE').count, 1);
});

test('etkinliği olmayan ülke ağaçta yok: seçilemez ve sayı taşımaz', () => {
  const tree = agac();
  assert.equal(findGeoNode(tree, 'FR'), null);
  assert.deepEqual(filterEventsByGeo(ETKINLIKLER, tree, 'FR'), []);
  for (const ulke of countryCounts(tree)) assert.ok(ulke.count > 0);
});

test('ülke, şehir ve ilçe seçimi kartları süzüyor; ilçede yalnız o ilçe kalıyor', () => {
  const tree = agac();
  assert.deepEqual(
    filterEventsByGeo(ETKINLIKLER, tree, 'TR').map((event) => event.id),
    ['e1', 'e2', 'e3', 'e4'],
  );
  const istanbul = findGeoNode(tree, 'TR.istanbul');
  assert.deepEqual(
    filterEventsByGeo(ETKINLIKLER, tree, istanbul.code).map((event) => event.id),
    ['e1', 'e2'],
  );
  const zeytinburnu = findGeoNode(tree, 'TR.istanbul.zeytinburnu');
  assert.deepEqual(
    filterEventsByGeo(ETKINLIKLER, tree, zeytinburnu.code).map((event) => event.id),
    ['e1'],
  );
});

test('seçilen düğümün tüm alt bölgeleri kapsanıyor: sabit şehir adıyla koşul yok', () => {
  const ekli = [...ETKINLIKLER, etkinlik({ id: 'e6', city: 'İstanbul', district: 'Beşiktaş' })];
  const tree = buildGeoTree(ekli, { countryName });
  assert.equal(findGeoNode(tree, 'TR.istanbul').count, 3);
  assert.equal(findGeoNode(tree, 'TR.istanbul').children.length, 3);
  assert.equal(filterEventsByGeo(ekli, tree, 'TR.istanbul').length, 3);
});

test('breadcrumb gerçek yer adlarından kuruluyor, seviye etiketinden değil', () => {
  const tree = agac();
  const yol = geoBreadcrumb(tree, 'TR.istanbul.zeytinburnu').map((node) => node.name);
  assert.deepEqual(yol, ['Dünya', 'Türkiye', 'İstanbul', 'Zeytinburnu']);
  assert.deepEqual(geoBreadcrumb(tree, null).map((node) => node.name), ['Dünya']);
  assert.deepEqual(geoBreadcrumb(tree, DUNYA_KODU).map((node) => node.name), ['Dünya']);
});

test('breadcrumb ile üst seviyeye dönünce kapsam genişliyor', () => {
  const tree = agac();
  const yol = geoBreadcrumb(tree, 'TR.istanbul.zeytinburnu');
  const ustSeviye = yol[yol.length - 2];
  assert.equal(ustSeviye.name, 'İstanbul');
  assert.deepEqual(
    filterEventsByGeo(ETKINLIKLER, tree, ustSeviye.code).map((event) => event.id),
    ['e1', 'e2'],
  );
  assert.equal(filterEventsByGeo(ETKINLIKLER, tree, yol[0].code).length, ETKINLIKLER.length);
});

test('haritadaki her sayı, o düğümün kart listesiyle birebir aynı', () => {
  const tree = agac();
  for (const node of flattenGeoTree(tree).values()) {
    assert.equal(
      filterEventsByGeo(ETKINLIKLER, tree, node.code).length,
      node.count,
      `${node.name} sayısı listeyle uyuşmuyor`,
    );
  }
});

test('filtre uygulanınca hem sayılar hem liste birlikte daralıyor', () => {
  const suzulmus = ETKINLIKLER.filter((event) =>
    matchesDiscoverFilters(event, { category: 'concert', query: '' }));
  const tree = buildGeoTree(suzulmus, { countryName });
  assert.equal(findGeoNode(tree, 'TR').count, 2);
  assert.equal(findGeoNode(tree, 'DE'), null);
  assert.equal(filterEventsByGeo(suzulmus, tree, 'TR').length, 2);
  assert.equal(filterEventsByGeo(suzulmus, tree, 'TR.istanbul').length, 1);
});

test('yalnızca açık adresten çözülmüş kayıt pin oluyor; bölge koordinatı olmuyor', () => {
  assert.equal(hasVerifiedPin(ETKINLIKLER[0]), true);
  assert.equal(hasVerifiedPin(ETKINLIKLER[2]), false, 'ilçe merkezi pin olarak çizilemez');
  assert.deepEqual(pinnableEvents(ETKINLIKLER).map((event) => event.id), ['e1']);
});

test('koordinatsız etkinlik listede kalıyor, yalnızca pini olmuyor', () => {
  const tree = agac();
  const liste = filterEventsByGeo(ETKINLIKLER, tree, 'TR.istanbul');
  assert.deepEqual(liste.map((event) => event.id), ['e1', 'e2']);
  assert.deepEqual(pinnableEvents(liste).map((event) => event.id), ['e1']);
  assert.equal(liste.length - pinnableEvents(liste).length, 1);
});

test('koordinat uydurulmuyor: pin yoksa merkez de yok', () => {
  const tree = agac();
  assert.equal(geoNodeCenter(ETKINLIKLER, tree, 'TR.ankara'), null);
  assert.equal(geoNodeCenter(ETKINLIKLER, tree, 'TR.izmir'), null, 'bölge koordinatı kamera merkezi sayılmıyor');
  assert.deepEqual(geoNodeCenter(ETKINLIKLER, tree, 'TR.istanbul.zeytinburnu'), {
    latitude: 40.9944,
    longitude: 28.9033,
  });
});

test('filtre bölgeyi boşaltınca yer adı ve üst seviyeye dönüş korunuyor', () => {
  const adAgaci = agac();
  const filtreli = ETKINLIKLER.filter((event) =>
    matchesDiscoverFilters(event, { category: 'workshop', query: '' }));
  const sayiAgaci = buildGeoTree(filtreli, { countryName });

  assert.equal(findGeoNode(sayiAgaci, 'TR.izmir'), null, 'sayı ağacında boş bölge yok');

  const dugum = resolveGeoNode(sayiAgaci, adAgaci, 'TR.izmir');
  assert.equal(dugum.name, 'İzmir');
  assert.equal(dugum.count, 0);
  assert.deepEqual(dugum.children, []);

  const yol = resolveGeoBreadcrumb(sayiAgaci, adAgaci, 'TR.izmir').map((node) => node.name);
  assert.deepEqual(yol, ['Dünya', 'Türkiye', 'İzmir'], 'üst seviyeye tıklanabilir kalıyor');

  assert.equal(resolveGeoNode(sayiAgaci, adAgaci, 'XX.olmayan'), null, 'uydurma kod çözülmüyor');
  assert.deepEqual(
    resolveGeoBreadcrumb(sayiAgaci, adAgaci, 'XX.olmayan').map((node) => node.name),
    ['Dünya'],
  );
});

test('boş sonuçta ağaç boş kalıyor, breadcrumb Dünya\'da duruyor', () => {
  const tree = buildGeoTree([], { countryName });
  assert.deepEqual(countryCounts(tree), []);
  assert.equal(tree.count, 0);
  assert.deepEqual(geoBreadcrumb(tree, 'TR').map((node) => node.name), ['Dünya']);
  assert.deepEqual(filterEventsByGeo([], tree, 'TR'), []);
});

test('geo_nodes dolduğunda ağaç satırlardan kuruluyor; arayüz için çıktı aynı biçimde', () => {
  const nodes = [
    { id: 'n1', parentId: null, level: 'country', name: 'Turkey', code: 'TR' },
    { id: 'n2', parentId: 'n1', level: 'admin1', name: 'İstanbul', code: 'TR-34' },
    { id: 'n3', parentId: 'n2', level: 'admin2', name: 'Zeytinburnu', code: 'TR-34/zeytinburnu' },
  ];
  const events = [
    etkinlik({ id: 'g1', city: 'İstanbul', district: 'Zeytinburnu', geoNodeId: 'n3' }),
    etkinlik({ id: 'g2', city: 'İstanbul', district: 'Kadıköy', geoNodeId: 'n2' }),
  ];
  const tree = buildGeoTree(events, { nodes, countryName });
  assert.equal(findGeoNode(tree, 'TR').name, 'Türkiye', 'ülke adı yerelleştiriliyor');
  assert.equal(findGeoNode(tree, 'TR-34').count, 2);
  assert.equal(findGeoNode(tree, 'TR-34/zeytinburnu').count, 1);
  assert.deepEqual(
    filterEventsByGeo(events, tree, 'TR-34').map((event) => event.id),
    ['g1', 'g2'],
  );
  assert.deepEqual(geoBreadcrumb(tree, 'TR-34/zeytinburnu').map((node) => node.name), [
    'Dünya', 'Türkiye', 'İstanbul', 'Zeytinburnu',
  ]);
});

test('arama normalizasyonu sunucudaki normalize_discover_search ile aynı sonucu veriyor', () => {
  assert.equal(normalizeDiscoverSearch('İstanbul'), 'istanbul');
  assert.equal(normalizeDiscoverSearch('ISTANBUL'), 'istanbul');
  assert.equal(normalizeDiscoverSearch('Işık Çağdaş Öğrenci Şûrası'), 'isik cagdas ogrenci surasi');
  assert.equal(
    matchesDiscoverFilters(ETKINLIKLER[0], { query: 'zeytİnburnu' }),
    true,
    'ilçe adı arama metnine giriyor',
  );
  assert.equal(matchesDiscoverFilters(ETKINLIKLER[0], { query: 'berlin' }), false);
});

test('tarih aralığı Europe/Istanbul gün sınırlarından hesaplanıyor', () => {
  const simdi = new Date('2026-09-15T21:30:00Z');
  assert.equal(discoverPeriodRange('all', simdi), null);
  assert.equal(discoverPeriodRange('today', simdi).start.toISOString(), '2026-09-15T21:00:00.000Z');
  assert.equal(discoverPeriodRange('today', simdi).end.toISOString(), '2026-09-16T21:00:00.000Z');
  assert.equal(discoverPeriodRange('week', simdi).end.toISOString(), '2026-09-23T21:00:00.000Z');
  assert.equal(discoverPeriodRange('month', simdi).start.toISOString(), '2026-08-31T21:00:00.000Z');
  assert.equal(discoverPeriodRange('month', simdi).end.toISOString(), '2026-09-30T21:00:00.000Z');
});

test('yalnızca yayında ve bitmemiş etkinlikler sayılıyor', () => {
  const simdi = new Date('2026-09-10T19:00:00Z');
  assert.equal(isActiveDiscoverEvent(ETKINLIKLER[0], simdi), true, 'devam eden etkinlik sayılıyor');
  assert.equal(
    isActiveDiscoverEvent(etkinlik({ id: 'x', endsAt: '2026-09-01T10:00:00Z' }), simdi),
    false,
  );
  assert.equal(
    isActiveDiscoverEvent(etkinlik({ id: 'x', status: 'draft' }), simdi),
    false,
  );
});

test('sıralama katalogla aynı: en yeni eklenen ve tarihi yaklaşan', () => {
  const yeni = sortDiscoverEvents(ETKINLIKLER, 'newest').map((event) => event.id);
  assert.deepEqual(yeni, ['e5', 'e4', 'e3', 'e2', 'e1']);
  const yaklasan = sortDiscoverEvents(
    [etkinlik({ id: 'b', startsAt: '2026-10-01T10:00:00Z' }), etkinlik({ id: 'a', startsAt: '2026-09-20T10:00:00Z' })],
    'upcoming',
  ).map((event) => event.id);
  assert.deepEqual(yaklasan, ['a', 'b']);
});
