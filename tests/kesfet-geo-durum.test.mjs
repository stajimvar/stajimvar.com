import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GEO_PARAM,
  ILK_SATIR_KART_SAYISI,
  geoAdresi,
  geoLayout,
  geoReducer,
  gorunenKartlar,
  initialGeoState,
  readGeoCode,
} from '../src/components/kesfet-geo-state.mjs';
import {
  DUNYA_KODU,
  buildGeoTree,
  filterEventsByGeo,
  findGeoNode,
  geoBreadcrumb,
} from '../src/lib/kesfet-geo.mjs';
import {
  discoverPeriodRange,
  matchesDiscoverFilters,
  sortDiscoverEvents,
} from '../src/lib/kesfet-geo-filtre.mjs';

const etkinlik = (over) => ({
  status: 'published',
  title: 'Etkinlik',
  organizer: 'Kurum',
  venueName: 'Mekân',
  category: 'concert',
  isFree: false,
  hasStudentDiscount: false,
  startsAt: '2026-09-16T18:00:00Z',
  endsAt: '2026-09-16T21:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  ...over,
});

const ETKINLIKLER = [
  etkinlik({ id: 'e1', city: 'İstanbul', district: 'Zeytinburnu' }),
  etkinlik({ id: 'e2', city: 'İstanbul', district: 'Kadıköy', createdAt: '2026-09-02T00:00:00Z' }),
  etkinlik({ id: 'e3', city: 'İzmir', district: 'Konak', createdAt: '2026-09-03T00:00:00Z' }),
  etkinlik({ id: 'e4', city: 'Ankara', district: 'Çankaya', category: 'workshop', createdAt: '2026-09-04T00:00:00Z' }),
  etkinlik({ id: 'e5', city: 'Ankara', district: 'Keçiören', category: 'workshop', createdAt: '2026-09-05T00:00:00Z', startsAt: '2026-11-02T18:00:00Z', endsAt: '2026-11-02T20:00:00Z' }),
];

const agac = () => buildGeoTree(ETKINLIKLER, { countryName: (code) => (code === 'TR' ? 'Türkiye' : code) });

const kesfetSayfasi = readFileSync(new URL('../src/components/KesfetPage.tsx', import.meta.url), 'utf8');

test('ilk açılışta küre görünür, harita kapalı ve ilk üç kart yerinde', () => {
  const durum = initialGeoState(null);
  const duzen = geoLayout(durum);
  assert.equal(duzen.globeVisible, true);
  assert.equal(duzen.mapOpen, false);
  assert.equal(duzen.mapColumnSpan, 0);
  assert.equal(duzen.leadingCards, ILK_SATIR_KART_SAYISI);

  const liste = sortDiscoverEvents(filterEventsByGeo(ETKINLIKLER, agac(), durum.code), 'newest');
  assert.equal(liste.length, ETKINLIKLER.length);
  assert.deepEqual(liste.slice(0, 3).map((event) => event.id), ['e5', 'e4', 'e3']);
  assert.deepEqual(gorunenKartlar(liste, duzen), liste, 'seçim yokken ilk üç kart ızgarada duruyor');
});

test('ülke seçilince ilk üç kartın satırını harita alıyor: o kartlar ızgaradan düşüyor', () => {
  const durum = geoReducer(initialGeoState(null), { type: 'select', code: 'TR' });
  const duzen = geoLayout(durum);
  assert.equal(duzen.mapOpen, true);
  assert.equal(duzen.mapColumnSpan, ILK_SATIR_KART_SAYISI);
  assert.equal(duzen.leadingCards, 0);

  const liste = sortDiscoverEvents(filterEventsByGeo(ETKINLIKLER, agac(), durum.code), 'newest');
  const ilkSatir = liste.slice(0, ILK_SATIR_KART_SAYISI).map((event) => event.id);
  const kartlar = gorunenKartlar(liste, duzen);

  /* Harita bu üç kaydın YERİNE geçiyor; ikisi üst üste binmiyor. */
  assert.equal(kartlar.length, liste.length - ILK_SATIR_KART_SAYISI);
  assert.deepEqual(
    kartlar.map((event) => event.id).filter((id) => ilkSatir.includes(id)),
    [],
    'ilk satırın kartları ızgarada çizilmiyor',
  );
  assert.deepEqual(kartlar.map((event) => event.id), liste.slice(ILK_SATIR_KART_SAYISI).map((event) => event.id));

  /*
    Kesme YALNIZCA çizimde: toplam sayı, sayfalama ve haritadaki sayılar
    aynı tam kümeyi saymaya devam ediyor. Kullanıcı 5 etkinlik varken
    "2 etkinlik" görmemeli.
  */
  assert.equal(liste.length, ETKINLIKLER.length, 'liste kısalmıyor');
  assert.equal(liste.length, findGeoNode(agac(), 'TR').count, 'haritadaki sayı listeyle aynı');

  /* "Dünya" seçilir seçilmez üç kart aynı karede geri geliyor. */
  const dunya = geoReducer(durum, { type: 'select', code: DUNYA_KODU });
  assert.equal(geoLayout(dunya).mapOpen, false);
  assert.deepEqual(gorunenKartlar(liste, geoLayout(dunya)).map((event) => event.id), liste.map((event) => event.id));
});

test('sayaçtaki "gösteriliyor" çizilen kartı sayıyor, toplam kesmeden etkilenmiyor', () => {
  /*
    Sayaç ile ızgara AYNI listeden besleniyor. Ayrışırlarsa ekranda 21 kart
    varken "24 gösteriliyor" yazan eski tutarsızlık geri gelir; bu yüzden
    iki tüketicinin de `gridEvents` okuduğu kaynakta sabitleniyor.
  */
  assert.match(kesfetSayfasi, /\$\{listTotal\} etkinlik · \$\{gridEvents\.length\} gösteriliyor/);
  assert.match(kesfetSayfasi, /\{gridEvents\.map\(\(event\) => <EventCard/);
  assert.doesNotMatch(kesfetSayfasi, /\$\{listEvents\.length\} gösteriliyor/);
  /* Toplam kesilmiş listeden okunmuyor: o, seçim + filtre sonucunun tamamı. */
  assert.doesNotMatch(kesfetSayfasi, /\$\{gridEvents\.length\} etkinlik/);

  const durum = geoReducer(initialGeoState(null), { type: 'select', code: 'TR' });
  const liste = sortDiscoverEvents(filterEventsByGeo(ETKINLIKLER, agac(), durum.code), 'newest');
  const kartlar = gorunenKartlar(liste, geoLayout(durum));

  assert.equal(kartlar.length, liste.length - ILK_SATIR_KART_SAYISI, '"gösteriliyor" ızgaradaki kart kadar');
  assert.equal(liste.length, findGeoNode(agac(), 'TR').count, 'toplam tam kümeyi gösteriyor');
  assert.notEqual(kartlar.length, liste.length, 'seçim varken iki sayı bilerek ayrışıyor');
});

test('"Dünya" seçilince harita kapanıyor ve kartlar geri geliyor', () => {
  const secili = geoReducer(initialGeoState(null), { type: 'select', code: 'TR.istanbul' });
  assert.equal(geoLayout(secili).mapOpen, true);

  const tree = agac();
  const kok = geoBreadcrumb(tree, secili.code)[0];
  assert.equal(kok.code, DUNYA_KODU);

  const dunya = geoReducer(secili, { type: 'select', code: kok.code });
  assert.equal(dunya.code, null);
  assert.equal(geoLayout(dunya).mapOpen, false);
  assert.equal(geoLayout(dunya).leadingCards, ILK_SATIR_KART_SAYISI);
  assert.equal(filterEventsByGeo(ETKINLIKLER, tree, dunya.code).length, ETKINLIKLER.length);
});

test('breadcrumb ile bir üst seviyeye dönüş durumu da geri alıyor', () => {
  const tree = agac();
  const derin = geoReducer(initialGeoState(null), { type: 'select', code: 'TR.istanbul.kadikoy' });
  assert.deepEqual(filterEventsByGeo(ETKINLIKLER, tree, derin.code).map((event) => event.id), ['e2']);

  const yol = geoBreadcrumb(tree, derin.code);
  const ust = geoReducer(derin, { type: 'select', code: yol[yol.length - 2].code });
  assert.equal(ust.code, 'TR.istanbul');
  assert.deepEqual(filterEventsByGeo(ETKINLIKLER, tree, ust.code).map((event) => event.id), ['e1', 'e2']);
});

test('seçim adres çubuğunda taşınıyor: geri tuşu aynı geçmişi geziyor', () => {
  assert.equal(readGeoCode('?q=konser'), null);
  assert.equal(readGeoCode(`?${GEO_PARAM}=TR.istanbul`), 'TR.istanbul');
  assert.equal(readGeoCode(`?${GEO_PARAM}=${DUNYA_KODU}`), null, 'Dünya varsayılan, adrese yazılmıyor');

  const secili = geoAdresi('/kesfet', '?q=konser', 'TR.istanbul');
  assert.equal(secili, `/kesfet?q=konser&${GEO_PARAM}=TR.istanbul`);
  assert.equal(readGeoCode(secili.split('?')[1]), 'TR.istanbul');

  const temiz = geoAdresi('/kesfet', `?q=konser&${GEO_PARAM}=TR.istanbul`, null);
  assert.equal(temiz, '/kesfet?q=konser', 'boş parametre bırakılmıyor');
  assert.equal(geoAdresi('/kesfet', `?${GEO_PARAM}=TR`, null), '/kesfet');

  const geri = geoReducer({ code: 'TR.istanbul' }, { type: 'sync', code: readGeoCode('') });
  assert.equal(geri.code, null);
});

test('tarih ve kategori filtreleri coğrafi seçimle birlikte çalışıyor', () => {
  const simdi = new Date('2026-09-15T09:00:00Z');
  const aralik = discoverPeriodRange('week', simdi);
  /* Tarihi sunucu süzüyor; burada aynı aralık istemcide taklit ediliyor. */
  const tarihte = ETKINLIKLER.filter((event) =>
    new Date(event.startsAt) < aralik.end && new Date(event.endsAt) >= aralik.start);
  assert.deepEqual(tarihte.map((event) => event.id), ['e1', 'e2', 'e3', 'e4']);

  const filtreli = tarihte.filter((event) => matchesDiscoverFilters(event, { category: 'workshop', query: '' }));
  const tree = buildGeoTree(filtreli, { countryName: (code) => code });

  assert.equal(findGeoNode(tree, 'TR').count, 1);
  assert.equal(findGeoNode(tree, 'TR.istanbul'), null, 'kategori dışı şehir haritadan da düşüyor');

  const secim = geoReducer(initialGeoState(null), { type: 'select', code: 'TR.ankara' });
  const liste = filterEventsByGeo(filtreli, tree, secim.code);
  assert.deepEqual(liste.map((event) => event.id), ['e4']);
  assert.equal(liste.length, findGeoNode(tree, 'TR.ankara').count);
});

test('coğrafi seçim mevcut konum filtresinin yerine geçmiyor, üstüne biniyor', () => {
  const filtreli = ETKINLIKLER.filter((event) => matchesDiscoverFilters(event, { city: 'Ankara', query: '' }));
  const tree = buildGeoTree(filtreli, { countryName: (code) => code });
  assert.equal(findGeoNode(tree, 'TR').count, 2);
  assert.deepEqual(
    filterEventsByGeo(filtreli, tree, 'TR.ankara.kecioren').map((event) => event.id),
    ['e5'],
  );
  assert.deepEqual(filterEventsByGeo(filtreli, tree, 'TR.istanbul'), []);
});

test('geçersiz seçim ve bilinmeyen eylem durumu bozmuyor', () => {
  assert.deepEqual(geoReducer({ code: 'TR' }, { type: 'reset' }), { code: null });
  assert.deepEqual(geoReducer({ code: 'TR' }, { type: 'bilinmeyen' }), { code: 'TR' });
  assert.deepEqual(initialGeoState(DUNYA_KODU), { code: null });
  assert.deepEqual(initialGeoState(''), { code: null });
  assert.equal(readGeoCode(null), null);
});
