/**
 * HARİTA SAYILARI İLE KART LİSTESİ AYNI SONUCU TEMSİL ETMEK ZORUNDA
 *
 * Kart listesi sunucuda süzülüyor (`get_discover_catalog`). Küre ve harita
 * ise TOPLAM sayı gösteriyor; sunucuda coğrafi toplama yapan bir RPC
 * olmadığı için bu sayılar istemcide hesaplanıyor. İki taraf aynı sonucu
 * göstermezse kullanıcı haritada "5" görüp listede 3 kart bulur.
 *
 * Buradaki fonksiyonlar bu yüzden `get_discover_catalog` içindeki
 * yüklemlerin BİREBİR karşılığı:
 *
 *   - Tarih aralığı istemcide tekrar hesaplanmıyor; `discoverPeriodRange`
 *     SQL'in `day_start` hesabını üretiyor ve aynı aralık aynı
 *     `list_active_discover_events(p_start, p_end)` çağrısına veriliyor.
 *     Tarih süzmesini yine sunucu yapıyor.
 *   - Arama normalizasyonu `public.normalize_discover_search` ile aynı
 *     dönüşüm zinciri: önce 'I'→'ı' / 'İ'→'i', sonra küçültme, sonra
 *     'çğıöşüâîû' → 'cgiosuaiu'.
 *   - Şehir/kategori/ücret yüklemleri düz eşitlik.
 *
 * Kalan tek fark SQL'deki `created_at <= watermark` anlık görüntüsü; o da
 * yalnızca sorgu sürerken eklenen kayıtlar için geçerli.
 */

/* SQL'deki CASE bloğunun aynısı: arama metnine kategori etiketi de giriyor. */
const KATEGORI_ETIKETLERI = {
  exhibition: 'Sergi',
  museum: 'Müze',
  festival: 'Festival',
  fair: 'Fuar',
  theatre: 'Tiyatro',
  concert: 'Konser',
  workshop: 'Atölye',
  university: 'Üniversite etkinliği',
  city_route: 'Şehir rotası',
  day_trip: 'Günübirlik gezi',
};

const KAYNAK = 'çğıöşüâîû';
const HEDEF = 'cgiosuaiu';

/** `public.normalize_discover_search` karşılığı. */
export function normalizeDiscoverSearch(value) {
  const onIsleme = String(value ?? '').replace(/I/g, 'ı').replace(/İ/g, 'i');
  return onIsleme
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (harf) => HEDEF[KAYNAK.indexOf(harf)]);
}

const istanbulGunu = (value) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

/* Türkiye 2016'dan beri yıl boyu UTC+3; sabit ofset burada güvenli. */
const istanbulGeceYarisi = (gun) => new Date(gun + 'T00:00:00+03:00');

const gunEkle = (gun, adet) => {
  const [yil, ay, tarih] = gun.split('-').map(Number);
  return new Date(Date.UTC(yil, ay - 1, tarih + adet)).toISOString().slice(0, 10);
};

const aySiniri = (gun, kayma) => {
  const [yil, ay] = gun.split('-').map(Number);
  return new Date(Date.UTC(yil, ay - 1 + kayma, 1)).toISOString().slice(0, 10);
};

/**
 * `get_discover_catalog` içindeki range_start/range_end hesabının aynısı.
 * @returns {{ start: Date, end: Date } | null} 'all' için null (sunucu sınır uygulamıyor).
 */
export function discoverPeriodRange(period, now = new Date()) {
  const bugun = istanbulGunu(now);
  if (period === 'today') {
    return { start: istanbulGeceYarisi(bugun), end: istanbulGeceYarisi(gunEkle(bugun, 1)) };
  }
  if (period === 'week') {
    return { start: istanbulGeceYarisi(bugun), end: istanbulGeceYarisi(gunEkle(bugun, 8)) };
  }
  if (period === 'month') {
    return {
      start: istanbulGeceYarisi(aySiniri(bugun, 0)),
      end: istanbulGeceYarisi(aySiniri(bugun, 1)),
    };
  }
  return null;
}

/**
 * "Yayında + bitmemiş" — `list_active_discover_events` içindeki
 * `e.status = 'published' and coalesce(o.ends_at, o.starts_at) >= now()`
 * yükleminin istemci karşılığı. RPC bunu zaten uyguluyor; burada testler
 * ve savunma amaçlı ikinci bir süzgeç olarak duruyor.
 */
export function isActiveDiscoverEvent(event, now = new Date()) {
  if (event?.status && event.status !== 'published') return false;
  const bitis = new Date(event?.endsAt || event?.startsAt);
  if (Number.isNaN(bitis.getTime())) return false;
  return bitis >= now;
}

const aramaMetni = (event) =>
  [
    event?.title,
    event?.city,
    event?.district,
    event?.venueName,
    event?.organizer,
    KATEGORI_ETIKETLERI[event?.category] || event?.category,
  ]
    .filter((parca) => parca != null && parca !== '')
    .join(' ');

export function matchesDiscoverQuery(event, query) {
  const igne = normalizeDiscoverSearch(String(query ?? '').trim().slice(0, 200));
  if (!igne) return true;
  return normalizeDiscoverSearch(aramaMetni(event)).includes(igne);
}

/** Tarih dışındaki tüm katalog yüklemleri (tarihi sunucu süzüyor). */
export function matchesDiscoverFilters(event, filters = {}) {
  if (filters.city && event?.city !== filters.city) return false;
  if (filters.category && event?.category !== filters.category) return false;
  if (filters.free && !event?.isFree) return false;
  if (filters.discount && !event?.hasStudentDiscount) return false;
  return matchesDiscoverQuery(event, filters.query);
}

const zaman = (value) => {
  const anlik = new Date(value ?? '').getTime();
  return Number.isNaN(anlik) ? 0 : anlik;
};

/** `get_discover_catalog` sıralamasının aynısı: (sort_value, id). */
export function sortDiscoverEvents(events = [], sort = 'newest') {
  const kopya = [...events];
  if (sort === 'upcoming') {
    return kopya.sort(
      (a, b) => zaman(a.startsAt) - zaman(b.startsAt) || String(a.id).localeCompare(String(b.id)),
    );
  }
  return kopya.sort(
    (a, b) =>
      zaman(b.createdAt || b.updatedAt) - zaman(a.createdAt || a.updatedAt) ||
      String(b.id).localeCompare(String(a.id)),
  );
}
