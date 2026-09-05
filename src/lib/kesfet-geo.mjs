/**
 * COĞRAFİ AĞAÇ — TEK TÜRETME NOKTASI
 *
 * NEDEN BURADA
 * ------------
 * Küre, düz harita, breadcrumb ve kart listesi aynı hiyerarşiyi kullanmak
 * zorunda. Dördü ayrı ayrı "şehirden ilçeye" mantığı yazsaydı sayılar bir
 * gün kaçınılmaz olarak birbirini tutmazdı: harita "5" derken listede 3
 * kart görünürdü. Ağaç bu yüzden tek bir yerde kuruluyor ve dört tüketici
 * de aynı düğümleri okuyor.
 *
 * İKİ KAYNAK, TEK ÇIKTI
 * ---------------------
 * Bugün hiyerarşi `city`/`district` düz metinlerinden TÜRETİLİYOR, çünkü
 * `geo_nodes` tablosu henüz boş (migration üretime uygulanmadı).
 * `buildGeoTree` ikinci bir yol daha taşıyor: `nodes` verilirse ağaç
 * doğrudan `geo_nodes` satırlarından kuruluyor. Böylece tablo dolduğunda
 * değişecek tek şey bu fonksiyona verilen argüman; arayüzde tek satır
 * değişmiyor.
 *
 * SEVİYE ADLARI KULLANICIYA GÖSTERİLMİYOR
 * ---------------------------------------
 * 'admin1' teknik bir etiket. Düğüm kendi adını taşıyor ("İstanbul"),
 * breadcrumb da bu adlardan kuruluyor.
 */
import { slugifyDiscoverEvent } from './kesfet-domain.mjs';

export const DUNYA_KODU = 'dunya';
export const DUNYA_ADI = 'Dünya';

/*
  ÜLKE VARSAYILANI — TEK YER

  Üretimdeki kayıtların hepsi Türkiye kaynaklı ve `country_code` kolonu
  henüz yok. Varsayılan yalnızca burada veriliyor; ağacın, sayımın ve
  eşleşmenin geri kalanı ülkeden habersiz. Kolon geldiğinde bu satır
  kendiliğinden devre dışı kalıyor, başka hiçbir yeri değiştirmek
  gerekmiyor.
*/
export const VARSAYILAN_ULKE_KODU = 'TR';

const metin = (value) => String(value ?? '').trim();

export const eventCountryCode = (event) =>
  metin(event?.countryCode).toUpperCase() || VARSAYILAN_ULKE_KODU;

/**
 * Nokta pini kuralı.
 *
 * `geocode_precision` yalnızca 'address' olduğunda koordinat gerçek bir
 * BİNAYI gösteriyor. 'locality'/'admin2'/'admin1' bir BÖLGE merkezidir;
 * onu pin olarak çizmek kullanıcıyı yanlış adrese yollar. Hassasiyet
 * bilinmiyorsa da pin çizilmiyor: doğrulanmamış konumu doğrulanmış gibi
 * göstermek, hiç göstermemekten kötüdür.
 */
export const hasVerifiedPin = (event) => {
  if (event?.geocodePrecision !== 'address') return false;
  const lat = Number(event?.latitude);
  const lon = Number(event?.longitude);
  return (
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  );
};

export const pinnableEvents = (events = []) => events.filter(hasVerifiedPin);

const yeniDugum = (code, name, level, parentCode, matcher) => ({
  code, name, level, parentCode, matcher, count: 0, children: [],
});

const kokDugum = () => yeniDugum(DUNYA_KODU, DUNYA_ADI, 'world', null, { kind: 'world' });

const cocukEkle = (parent, code, name, level, matcher) => {
  let child = parent.children.find((node) => node.code === code);
  if (!child) {
    child = yeniDugum(code, name, level, parent.code, matcher);
    parent.children.push(child);
  }
  return child;
};

const siralaDerin = (node) => {
  node.children.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'));
  node.children.forEach(siralaDerin);
  return node;
};

/*
  TÜRETİLMİŞ KOD

  `geo_nodes` gelene kadar düğüm kimliği ad'dan üretiliyor. Kod adres
  çubuğuna yazıldığı için okunur ve kararlı olmalı; iki farklı ad aynı
  slug'a düşerse ayrım önce ebeveyn kodundan, kalırsa sıra numarasından
  geliyor.
*/
const turetilmisKod = (parent, name) => {
  const taban = slugifyDiscoverEvent(name) || 'bilinmeyen';
  const aday = parent.code + '.' + taban;
  const mevcut = parent.children.find((node) => node.code === aday);
  if (!mevcut || mevcut.name === name) return aday;
  let sira = 2;
  while (parent.children.some((node) => node.code === aday + '-' + sira && node.name !== name)) sira += 1;
  return aday + '-' + sira;
};

const agactanTuret = (events, countryName) => {
  const kok = kokDugum();
  for (const event of events) {
    const ulkeKodu = eventCountryCode(event);
    const ulke = cocukEkle(
      kok, ulkeKodu, countryName(ulkeKodu) || ulkeKodu, 'country',
      { kind: 'derived', countryCode: ulkeKodu },
    );
    kok.count += 1;
    ulke.count += 1;

    const sehir = metin(event?.city);
    if (!sehir) continue;
    const admin1 = cocukEkle(
      ulke, turetilmisKod(ulke, sehir), sehir, 'admin1',
      { kind: 'derived', countryCode: ulkeKodu, city: sehir },
    );
    admin1.count += 1;

    const ilce = metin(event?.district);
    if (!ilce) continue;
    const admin2 = cocukEkle(
      admin1, turetilmisKod(admin1, ilce), ilce, 'admin2',
      { kind: 'derived', countryCode: ulkeKodu, city: sehir, district: ilce },
    );
    admin2.count += 1;
  }
  return siralaDerin(kok);
};

const altKimlikler = (node) =>
  node.children.flatMap((child) => [child.id, ...altKimlikler(child)]).filter(Boolean);

/*
  `geo_nodes` YOLU

  Tablo dolduğunda ağaç adlardan değil satırlardan kuruluyor: derinlik
  veriden geliyor, kolon adından değil. Eşleşme de ad karşılaştırmasıyla
  değil düğüm kimliğiyle yapılıyor — bir ilçenin adı değişse bile seçim
  bozulmuyor.
*/
const agaciSatirlardanKur = (events, nodes, countryName) => {
  const kok = kokDugum();
  const dugumler = new Map();
  for (const row of nodes) {
    if (!row?.id) continue;
    const ad = row.level === 'country'
      ? (countryName(metin(row.code)) || metin(row.name))
      : metin(row.name);
    dugumler.set(row.id, {
      ...yeniDugum(metin(row.code) || row.id, ad, row.level, null, { kind: 'nodes', ids: [row.id] }),
      id: row.id,
      parentId: row.parentId ?? null,
      latitude: row.latitude == null ? undefined : Number(row.latitude),
      longitude: row.longitude == null ? undefined : Number(row.longitude),
    });
  }
  for (const node of dugumler.values()) {
    const parent = node.parentId ? dugumler.get(node.parentId) : null;
    if (parent) {
      node.parentCode = parent.code;
      parent.children.push(node);
    } else {
      node.parentCode = kok.code;
      kok.children.push(node);
    }
  }
  const atalar = (id) => {
    const zincir = [];
    const gorulen = new Set();
    let current = dugumler.get(id);
    while (current && !gorulen.has(current.id)) {
      gorulen.add(current.id);
      zincir.push(current);
      current = current.parentId ? dugumler.get(current.parentId) : null;
    }
    return zincir;
  };
  for (const event of events) {
    const zincir = event?.geoNodeId ? atalar(event.geoNodeId) : [];
    if (!zincir.length) continue;
    kok.count += 1;
    for (const node of zincir) node.count += 1;
  }
  for (const node of dugumler.values()) {
    node.matcher = { kind: 'nodes', ids: [node.id, ...altKimlikler(node)] };
  }
  return siralaDerin(kok);
};

/**
 * @param {Array} events Yayında ve bitmemiş etkinlikler (kaynak RPC bunu garanti ediyor).
 * @param {{ nodes?: Array|null, countryName?: (code: string) => string }} [options]
 */
export function buildGeoTree(events = [], options = {}) {
  const countryName = options.countryName || ((code) => code);
  const nodes = options.nodes;
  if (Array.isArray(nodes) && nodes.length) return agaciSatirlardanKur(events, nodes, countryName);
  return agactanTuret(events, countryName);
}

export function flattenGeoTree(tree) {
  const harita = new Map();
  const gez = (node) => {
    if (!node) return;
    harita.set(node.code, node);
    node.children.forEach(gez);
  };
  gez(tree);
  return harita;
}

export const findGeoNode = (tree, code) => (code ? flattenGeoTree(tree).get(code) || null : null);

/** Dünya'dan seçili düğüme kadar gerçek yer adları; seviye etiketi değil. */
export function geoBreadcrumb(tree, code) {
  if (!tree) return [];
  const yol = [];
  const ara = (node, zincir) => {
    const sonraki = [...zincir, node];
    if (node.code === code) {
      yol.push(...sonraki);
      return true;
    }
    return node.children.some((child) => ara(child, sonraki));
  };
  if (!code || code === DUNYA_KODU || !ara(tree, [])) return [tree];
  return yol;
}

/**
 * İKİ AĞAÇ, TEK ÇÖZÜM
 *
 * `countTree` filtrelenmiş kümeden kuruluyor ve sayıları o taşıyor.
 * Bir filtre bir bölgeyi tümüyle boşaltırsa bölge o ağaçtan düşüyor —
 * ama kullanıcı hâlâ oradadır. Yer ADI bu yüzden süzülmemiş `nameTree`
 * üzerinden çözülüyor: "İzmir'de bu filtrelerle sonuç yok" diyebilmek
 * için önce orada olduğumuzu söyleyebilmek gerekiyor.
 */
export function resolveGeoNode(countTree, nameTree, code) {
  if (!code) return null;
  const sayili = findGeoNode(countTree, code);
  if (sayili) return sayili;
  const adli = findGeoNode(nameTree, code);
  return adli ? { ...adli, count: 0, children: [] } : null;
}

export function resolveGeoBreadcrumb(countTree, nameTree, code) {
  const sayili = geoBreadcrumb(countTree, code);
  if (!code || sayili.length > 1) return sayili;
  const adli = geoBreadcrumb(nameTree, code);
  return adli.length > 1 ? adli.map((node) => ({ ...node, count: 0 })) : sayili;
}

/** Seçilen düğümün TÜM alt bölgeleri kapsanır; sabit şehir adı yok. */
export function matchesGeoSelection(event, node) {
  if (!node || node.level === 'world') return true;
  const matcher = node.matcher;
  if (!matcher) return false;
  if (matcher.kind === 'nodes') return Boolean(event?.geoNodeId) && matcher.ids.includes(event.geoNodeId);
  if (matcher.countryCode && eventCountryCode(event) !== matcher.countryCode) return false;
  if (matcher.city && metin(event?.city) !== matcher.city) return false;
  if (matcher.district && metin(event?.district) !== matcher.district) return false;
  return true;
}

export function filterEventsByGeo(events = [], tree, code) {
  if (!code || code === DUNYA_KODU) return [...events];
  const node = findGeoNode(tree, code);
  if (!node) return [];
  return events.filter((event) => matchesGeoSelection(event, node));
}

/**
 * Harita kamerası için merkez.
 *
 * YALNIZCA doğrulanmış adres pinlerinin (ya da `geo_nodes` kendi
 * koordinatının) ortalaması kullanılıyor. Bölge merkezi uydurulmuyor: pin
 * yoksa merkez de yok ve harita kamerayı ülke sınırının kendi ağırlık
 * merkezine bırakıyor.
 */
export function geoNodeCenter(events = [], tree, code) {
  const node = findGeoNode(tree, code);
  if (node && Number.isFinite(node.latitude) && Number.isFinite(node.longitude)) {
    return { latitude: node.latitude, longitude: node.longitude };
  }
  const pinler = pinnableEvents(filterEventsByGeo(events, tree, code));
  if (!pinler.length) return null;
  const toplam = pinler.reduce(
    (acc, event) => ({ lat: acc.lat + Number(event.latitude), lon: acc.lon + Number(event.longitude) }),
    { lat: 0, lon: 0 },
  );
  return { latitude: toplam.lat / pinler.length, longitude: toplam.lon / pinler.length };
}

/** Küre için: yalnızca etkinliği olan ülkeler tıklanabilir. */
export function countryCounts(tree) {
  const ulkeler = tree?.level === 'world' ? tree.children : [];
  return ulkeler
    .filter((node) => node.count > 0)
    .map((node) => ({ code: node.code, name: node.name, count: node.count }));
}
