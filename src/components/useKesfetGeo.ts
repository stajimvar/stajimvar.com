import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { fetchDiscoverGeoEvents, type DiscoverEvent } from '../lib/kesfet';
import {
  discoverPeriodRange,
  matchesDiscoverFilters,
  sortDiscoverEvents,
} from '../lib/kesfet-geo-filtre.mjs';
import {
  DUNYA_KODU,
  buildGeoTree,
  countryCounts,
  filterEventsByGeo,
  findGeoNode,
  geoNodeCenter,
  pinnableEvents,
  resolveGeoBreadcrumb,
  resolveGeoNode,
} from '../lib/kesfet-geo.mjs';
import { ulkeAdi } from '../lib/ulke-adi';
import { geoAdresi, geoLayout, geoReducer, initialGeoState, readGeoCode } from './kesfet-geo-state.mjs';

export interface KesfetGeoFilters {
  city: string;
  period: 'all' | 'today' | 'week' | 'month';
  category: string;
  free: boolean;
  discount: boolean;
  sort: 'newest' | 'upcoming';
}

export interface GeoNode {
  code: string;
  name: string;
  level: 'world' | 'country' | 'admin1' | 'admin2' | 'locality' | 'venue';
  parentCode: string | null;
  count: number;
  children: GeoNode[];
  latitude?: number;
  longitude?: number;
}

/* Coğrafi listede de sayfa 24'lük: katalogla aynı ritim. */
const SAYFA = 24;

/**
 * COĞRAFİ KEŞİF DURUMU
 *
 * Küre ülke sayılarını, harita bölge sayılarını, kart listesi de aynı
 * kümenin kendisini gösteriyor. Üçü de bu hook'tan çıkıyor; ayrı ayrı
 * hesaplansalardı bir gün birbirini tutmazlardı.
 *
 * VERİ NEREDEN
 * ------------
 * Katalog RPC'si sayfalı çalıştığı için toplam sayıyı veremiyor. Sayım,
 * katalogla AYNI kaynak fonksiyondan (`list_active_discover_events`) aynı
 * tarih aralığıyla okunan kümenin üzerinde yapılıyor. Tarihi sunucu,
 * kalan yüklemleri `kesfet-geo-filtre.mjs` süzüyor.
 */
export function useKesfetGeo(filters: KesfetGeoFilters, query: string, enabled: boolean) {
  const [state, dispatch] = useReducer(
    geoReducer,
    typeof window === 'undefined' ? null : readGeoCode(window.location.search),
    initialGeoState,
  );
  const [events, setEvents] = useState<DiscoverEvent[] | null>(null);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [visible, setVisible] = useState(SAYFA);
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);
  const [revision, setRevision] = useState(0);

  const code: string | null = state.code;

  /*
    `enabled` yalnızca BAŞLATMA koşulu: katalog ilk yanıtını verdikten
    sonra sayım isteniyor. Sonradan kapanmasına bakılmıyor — arama
    kutusuna her harf yazıldığında katalog yeniden "yükleniyor"a
    döndüğü için, bakılsaydı aynı liste her tuşta yeniden indirilirdi.
  */
  const [acildi, setAcildi] = useState(enabled);
  useEffect(() => { if (enabled) setAcildi(true); }, [enabled]);

  /* Geri/ileri tuşu seçim geçmişini gezsin: durum adresten okunuyor. */
  useEffect(() => {
    const onPop = () => dispatch({ type: 'sync', code: readGeoCode(window.location.search) });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!acildi) return;
    const request = ++version.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setPhase('loading');
    fetchDiscoverGeoEvents(discoverPeriodRange(filters.period), abort.signal)
      .then((result) => {
        if (request !== version.current || abort.signal.aborted) return;
        setEvents(result);
        setPhase('ready');
      })
      .catch(() => {
        if (request === version.current && !abort.signal.aborted) setPhase('error');
      });
    return () => abort.abort();
  }, [acildi, filters.period, revision]);

  useEffect(() => () => { controller.current?.abort(); }, []);

  /* Coğrafi seçim filtrelerin YERİNE geçmiyor; sayım da onlara uyuyor. */
  const matched = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => matchesDiscoverFilters(event, { ...filters, query }));
  }, [events, filters.city, filters.category, filters.free, filters.discount, query]);

  const tree = useMemo(
    () => buildGeoTree(matched, { countryName: ulkeAdi }) as GeoNode,
    [matched],
  );

  /*
    AD AĞACI FİLTRELERDEN BAĞIMSIZ

    Sayı ağacı filtrelenmiş kümeden kuruluyor; bir filtre İzmir'i
    boşaltırsa İzmir o ağaçta hiç yok. Breadcrumb yalnızca ona baksaydı
    kullanıcı "İzmir'de bu filtrelerle sonuç yok" yerine bulunduğu yerin
    adını tümden kaybederdi ve bir üst seviyeye tıklayamazdı. Yer adları
    bu yüzden süzülmemiş kümeden okunuyor; sayılar yine süzülmüşten.
  */
  const adAgaci = useMemo(
    () => buildGeoTree(events ?? [], { countryName: ulkeAdi }) as GeoNode,
    [events],
  );

  const node = useMemo(
    () => resolveGeoNode(tree, adAgaci, code) as GeoNode | null,
    [tree, adAgaci, code],
  );

  const breadcrumb = useMemo(
    () => resolveGeoBreadcrumb(tree, adAgaci, code) as GeoNode[],
    [tree, adAgaci, code],
  );

  /* Adres çubuğundaki kod hiçbir ağaçta yoksa seçim geçersiz: Dünya'ya dön. */
  useEffect(() => {
    if (phase !== 'ready' || !code) return;
    if (!findGeoNode(adAgaci, code)) dispatch({ type: 'reset' });
  }, [phase, code, adAgaci]);

  const countries = useMemo(() => countryCounts(tree) as { code: string; name: string; count: number }[], [tree]);

  const selectedEvents = useMemo(
    () => sortDiscoverEvents(filterEventsByGeo(matched, tree, code), filters.sort) as DiscoverEvent[],
    [matched, tree, code, filters.sort],
  );

  const pins = useMemo(() => pinnableEvents(selectedEvents) as DiscoverEvent[], [selectedEvents]);
  const center = useMemo(
    () => geoNodeCenter(matched, tree, code) as { latitude: number; longitude: number } | null,
    [matched, tree, code],
  );

  const key = `${code ?? ''}|${filters.city}|${filters.category}|${filters.period}|${filters.free}|${filters.discount}|${filters.sort}|${query}`;
  useEffect(() => { setVisible(SAYFA); }, [key]);

  const select = useCallback((next: string | null) => {
    const hedef = !next || next === DUNYA_KODU ? null : next;
    dispatch({ type: 'select', code: hedef });
    if (typeof window === 'undefined') return;
    if (readGeoCode(window.location.search) === hedef) return;
    const adres = geoAdresi(window.location.pathname, window.location.search, hedef);
    window.history.pushState({ ...window.history.state }, '', adres);
  }, []);

  return {
    phase,
    code,
    node,
    tree,
    countries,
    breadcrumb,
    /** Seçili düğümün altındaki, etkinliği olan bölgeler. */
    regions: (node?.children ?? tree.children ?? []).filter((child) => child.count > 0),
    events: selectedEvents,
    visibleEvents: selectedEvents.slice(0, visible),
    hasMore: selectedEvents.length > visible,
    showMore: () => setVisible((current) => current + SAYFA),
    pins,
    /** Konumu doğrulanmadığı için pini olmayan, ama listede duran etkinlikler. */
    unpinnedCount: selectedEvents.length - pins.length,
    center,
    layout: geoLayout(state) as { globeVisible: boolean; mapOpen: boolean; mapColumnSpan: number; leadingCards: number },
    select,
    reset: () => select(null),
    reload: () => setRevision((value) => value + 1),
  };
}
