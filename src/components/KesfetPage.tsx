import React, { useEffect } from 'react';
import { CalendarDays, MapPin, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { FiltreBlogu, SecenekSatiri } from '../ui';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { DISCOVER_CATEGORIES, type DiscoverEvent } from '../lib/kesfet';
import { formatDiscoverDate, formatDiscoverLocation } from '../lib/kesfet-domain.mjs';
import { EventCover } from './EventCover';
import { SehirSeridi } from './SehirSeridi';
import { useDiscoverCatalog } from './useDiscoverCatalog';
import { useKesfetGeo } from './useKesfetGeo';
import { KesfetGlobePanel } from './KesfetGlobePanel';
import { KesfetGeoPanel } from './KesfetGeoPanel';
import { gorunenKartlar } from './kesfet-geo-state.mjs';
import { KESFET_GEO_ACIK } from '../lib/kesfet-geo-ayari.mjs';

const verificationText = (event: DiscoverEvent) => {
  if (event.verificationStatus === 'verified' && event.sourceKind === 'official') return 'Resmî kaynaktan doğrulandı';
  if (!event.lastVerifiedAt) return null;
  const hours = Math.max(1, Math.round((Date.now() - new Date(event.lastVerifiedAt).getTime()) / 3600000));
  return hours < 24 ? `${hours} saat önce kontrol edildi` : `${Math.round(hours / 24)} gün önce kontrol edildi`;
};

const EventCard: React.FC<{ event: DiscoverEvent; onNavigate: (path: string) => void }> = ({ event, onNavigate }) => {
  const path = `/kesfet/${event.slug}`;
  const verified = verificationText(event);
  return (
    <article className="group relative flex min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-blue-400 focus-within:border-blue-600 sm:flex-col">
      <div className="relative w-[104px] shrink-0 sm:aspect-video sm:w-full">
        <EventCover
          src={event.cardImageUrl || event.imageUrl}
          srcDetail={event.detailImageUrl}
          sizes="(min-width: 1280px) 310px, (min-width: 1024px) 24vw, (min-width: 640px) 46vw, 104px"
          category={event.category}
          title={event.title}
          coverKind={event.coverKind}
          className="absolute inset-0 h-full w-full sm:relative sm:h-auto"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold sm:text-[11px]">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{DISCOVER_CATEGORIES[event.category]}</span>
          {(event.isFree || event.hasStudentDiscount) && (
            <span className={`rounded-full px-2 py-0.5 ${event.isFree ? 'bg-emerald-50 text-emerald-800' : 'bg-violet-50 text-violet-800'}`}>
              {event.isFree ? 'Ücretsiz' : 'Öğrenci indirimli'}
            </span>
          )}
        </div>
        <h3 className="text-[15px] font-extrabold leading-snug text-gray-900 sm:text-lg">
          <a
            href={path}
            onClick={(click) => {
              if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey || click.button !== 0) return;
              click.preventDefault();
              onNavigate(path);
            }}
            className="line-clamp-2 rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 group-hover:text-blue-700"
          >{event.title}</a>
        </h3>
        <p className="flex items-start gap-1.5 text-xs text-gray-600 sm:text-sm">
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
          <span>{formatDiscoverDate(event)}</span>
        </p>
        <p className="flex items-start gap-1.5 text-xs text-gray-600 sm:text-sm">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
          <span className="line-clamp-1 sm:line-clamp-2">{formatDiscoverLocation(event)}</span>
        </p>
        {event.studentPrice != null && <p className="text-xs font-bold text-gray-900">Öğrenci: {event.studentPrice.toLocaleString('tr-TR')} TL</p>}
        {verified && (
          <p className="mt-auto flex items-start gap-1 text-[10px] font-semibold leading-snug text-emerald-700 sm:pt-1 sm:text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />{verified}
          </p>
        )}
      </div>
    </article>
  );
};

const PERIODS = { all: 'Tümü', today: 'Bugün', week: 'Bu hafta', month: 'Bu ay' } as const;

export const KesfetPage: React.FC<{
  onNavigate: (path: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}> = ({ onNavigate, searchQuery = '', onSearchChange }) => {
  const catalog = useDiscoverCatalog(searchQuery, onSearchChange);
  const { filters, setFilters, filtersOpen, setFiltersOpen, data, phase, loadingMore, moreError } = catalog;
  const setFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => setFilters((current) => ({ ...current, [key]: value }));
  /*
    COĞRAFİ KEŞİF FİLTRELERİN YERİNE GEÇMİYOR

    Aynı filtreler ve aynı arama terimi coğrafi sayıma da giriyor; küre,
    harita ve kart listesi tek kümeyi gösteriyor. Sayım katalog ilk yanıtını
    verdikten sonra isteniyor: kartlar ekrana ikinci bir isteği beklemeden
    çıkıyor.
  */
  /*
    ASKIDAYKEN VERİ DE ÇEKİLMİYOR: hook'un "etkin mi" argümanı bayrakla
    birlikte kapanıyor, böylece görünmeyen bir arayüz için sayım isteği
    atılmıyor. İmza değişmediği için bayrak açıldığında eski davranış
    olduğu gibi geri geliyor.
  */
  const geo = useKesfetGeo(filters, catalog.query, KESFET_GEO_ACIK && phase !== 'loading');
  /*
    Bayrak kapalıyken coğrafi seçim ADRESTEN de etkinleşmiyor. Yalnız panel
    gizlenseydi `?yer=TR` haritayı yine açar, kullanıcı erişemediği bir
    seçimin içinde kalırdı; ilk satırı harita aldığı için kart sayısı da
    sessizce 24'ten 21'e düşerdi.
  */
  const geoActive = KESFET_GEO_ACIK && geo.layout.mapOpen;
  const geoPhase = geo.phase === 'ready' ? 'ready' : geo.phase === 'error' ? 'error' : 'loading';
  const listPhase = geoActive ? geoPhase : phase;
  const listEvents = geoActive ? geo.visibleEvents : data?.events ?? [];
  const listTotal = geoActive ? geo.events.length : data?.total ?? 0;
  const listHasMore = geoActive ? geo.hasMore : Boolean(data?.hasMore);
  /*
    Harita ilk kart satırının YERİNE geçiyor: seçim varken o satırın üç
    kartı ızgaradan düşüyor. Kesme yalnızca burada, çizim listesinde;
    `listEvents` ve `listTotal` tam kümeyi tutmaya devam ettiği için
    sayfalama ve toplam sayı etkilenmiyor, "Dünya" seçilince de üç kart
    aynı karede geri geliyor. Özellik askıdayken (`geoActive` false) düzen
    hiç okunmuyor: ilk üç kart yerinde kalıyor ve sayaç askıya alınmadan
    önceki hâlini gösteriyor.
  */
  const gridEvents = gorunenKartlar(listEvents, geoActive ? geo.layout : null) as DiscoverEvent[];
  const selectedCountry = geo.breadcrumb.find((node) => node.level === 'country')?.code ?? null;
  const cities = [...new Set([...(data?.facets.cities ?? []), ...(filters.city ? [filters.city] : [])])];
  const activeFilters = [
    filters.city,
    filters.period !== 'all' ? PERIODS[filters.period] : '',
    filters.category ? DISCOVER_CATEGORIES[filters.category] : '',
    filters.free ? 'Ücretsiz' : '',
    filters.discount ? 'Öğrenci indirimli' : '',
  ].filter(Boolean);
  const hasFilters = activeFilters.length > 0 || Boolean(searchQuery.trim());
  const hasNarrowing = hasFilters || geoActive;

  useEffect(() => {
    document.title = 'Öğrenci etkinlikleri ve fırsatları | StajımVar';
    const canonical = document.querySelector('link[rel="canonical"]') || Object.assign(document.createElement('link'), { rel: 'canonical' });
    canonical.setAttribute('href', `${window.location.origin}/kesfet`);
    document.head.appendChild(canonical);
  }, []);

  return (
    <main className={`w-full ${SAYFA_GENISLIGI} mx-auto px-4 pb-[calc(120px+env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pt-3 lg:px-8 lg:pb-10 xl:px-10`}>
      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-12">
        {/*
          Sol sütun küre eklendiği için ekran boyundan uzun olabiliyor.
          Yapışkan sütun kendi içinde kaydırılabilir: aksi hâlde filtre
          panelinin alt yarısı geniş ekranda hiç erişilemez hâle gelirdi.
        */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:col-span-3 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          <h1 className="min-w-0 text-center text-[clamp(1.25rem,2.4vw,1.75rem)] font-extrabold leading-tight tracking-tight text-gray-950 lg:text-left">
            Şehrindeki etkinlikler, <span className="text-blue-600">tek listede</span>.
          </h1>
          <div className="flex items-center gap-2 lg:hidden">
            {onSearchChange && (
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="search" aria-label="Etkinlik ara" value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Etkinlik, şehir veya mekân ara"
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-600 focus:outline-none"
                />
              </div>
            )}
            <button
              type="button" onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen} aria-controls="kesfet-filters"
              aria-label={activeFilters.length ? `Filtreler (${activeFilters.length} açık)` : 'Filtreler'}
              className={`relative flex min-h-12 w-[52px] shrink-0 cursor-pointer items-center justify-center self-stretch rounded-2xl border ${filtersOpen || activeFilters.length ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
              {activeFilters.length > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-extrabold text-white">{activeFilters.length}</span>}
            </button>
          </div>

          {/*
            ŞEHİR ŞERİDİ — KÜRENİN DURDUĞU YERDE

            Arama satırının hemen altında, filtre panelinin üstünde: göz
            önce "nerede" sorusuna bakıyor, ayrıntılı süzgeçler ondan sonra
            geliyor. Küre askıya alındığı için burası boştu.

            Şerit bayraktan BAĞIMSIZ: küre gibi bir dünya haritası değil,
            katalog yanıtındaki sayıları okuyan düz bir düğme dizisi. Bayrak
            kapalıyken de görünüyor.

            Kendi durumu YOK, `filters.city`'yi okuyup yazıyor. Ayrı bir
            durum tutulsaydı filtre panelindeki "Şehir" menüsüyle ayrışırdı:
            menüden İzmir seçildiğinde şeritte hâlâ "Tümü" yanıyor olurdu.
            İki arayüz tek seçimi paylaşıyor, ikisi de çalışmaya devam ediyor.
          */}
          <SehirSeridi
            sayilar={data?.facets.cityCounts}
            secili={filters.city}
            onSec={(city) => setFilter('city', city)}
            onTumu={() => setFilter('city', '')}
          />

          {/*
            Küre başlık ile filtre panelinin arasında; panel kaldırılmadı,
            aşağı indi. Şu an ASKIDA: bayrak kapalıyken hiç çizilmiyor.
            Çağrı bilerek duruyor, böylece geri açmak tek satırlık değişiklik.
          */}
          {KESFET_GEO_ACIK && (
            <KesfetGlobePanel
              phase={geo.phase}
              countries={geo.countries}
              selectedCountry={selectedCountry}
              onSelect={geo.select}
              onReload={geo.reload}
            />
          )}

          <div id="kesfet-filters" className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
                <SlidersHorizontal className="h-4 w-4 text-gray-500" aria-hidden />
                <span className="text-sm font-bold text-gray-900">Filtreler</span>
                {/*
                  YENİLEME DÜĞMESİ BURAYA TAŞINDI

                  Katalog başlığı şeridi kaldırıldığı için düğmenin eski yeri
                  yok. "Temizle" ile aynı sarmalayıcıda ve sağ uçta: ikisi
                  birden görünürken satır dar ekranda sarıyor, taşmıyor.
                  Davranış aynı — katalog ve coğrafi sayım birlikte yenileniyor.
                */}
                <div className="ml-auto flex items-center gap-2">
                  {hasFilters && <button type="button" onClick={catalog.clearFilters} className="min-h-8 cursor-pointer text-xs font-bold text-blue-600 hover:underline">Temizle</button>}
                  <button type="button" aria-label="Listeyi yenile" title="Listeyi yenile" onClick={() => { catalog.refresh(); geo.reload(); }} disabled={listPhase === 'loading'} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-blue-400 disabled:opacity-50">
                    <RefreshCw className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {/*
                  SIRALAMA EN ÜSTTE

                  Süzgeç değil: listeden hiçbir şey elemiyor, tamamının
                  sırasını değiştiriyor. Bu yüzden daraltan blokların önünde
                  duruyor. Kendi durumu yok, `filters.sort` okunup yazılıyor;
                  ayrı bir durum tutulsaydı adresten geri dönen seçimle
                  ayrışırdı.
                */}
                <FiltreBlogu baslik="Sıralama">
                  <div className="space-y-0.5">
                    <SecenekSatiri tip="radio" etiket="En yeni eklenenler" secili={filters.sort === 'newest'} onChange={() => setFilter('sort', 'newest')} />
                    <SecenekSatiri tip="radio" etiket="Tarihi yaklaşanlar" secili={filters.sort === 'upcoming'} onChange={() => setFilter('sort', 'upcoming')} />
                  </div>
                </FiltreBlogu>
                <FiltreBlogu baslik="Konum">
                  <select aria-label="Şehir" value={filters.city} onChange={(event) => setFilter('city', event.target.value)} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none">
                    <option value="">Tüm şehirler</option>
                    {cities.map((city) => <option key={city}>{city}</option>)}
                  </select>
                </FiltreBlogu>
                <FiltreBlogu baslik="Tarih">
                  <div className="space-y-0.5">
                    {Object.entries(PERIODS).map(([value, label]) => <SecenekSatiri key={value} tip="radio" etiket={label} secili={filters.period === value} onChange={() => setFilter('period', value as typeof filters.period)} />)}
                  </div>
                </FiltreBlogu>
                <FiltreBlogu baslik="Kategori">
                  <div className="space-y-0.5">
                    <SecenekSatiri tip="radio" etiket="Tüm kategoriler" secili={!filters.category} onChange={() => setFilter('category', '')} />
                    {Object.entries(DISCOVER_CATEGORIES).map(([value, label]) => {
                      const total = data?.facets.categories[value] ?? 0;
                      if (!total && filters.category !== value) return null;
                      return <SecenekSatiri key={value} tip="radio" etiket={label} adet={total} secili={filters.category === value} onChange={() => setFilter('category', value)} />;
                    })}
                  </div>
                </FiltreBlogu>
                {(Boolean(data?.facets.free || data?.facets.discount) || filters.free || filters.discount) && (
                  <FiltreBlogu baslik="Ücret">
                    <div className="space-y-0.5">
                      {(Boolean(data?.facets.free) || filters.free) && <SecenekSatiri tip="checkbox" etiket="Ücretsiz" adet={data?.facets.free ?? 0} secili={filters.free} onChange={() => setFilter('free', !filters.free)} />}
                      {(Boolean(data?.facets.discount) || filters.discount) && <SecenekSatiri tip="checkbox" etiket="Öğrenci indirimli" adet={data?.facets.discount ?? 0} secili={filters.discount} onChange={() => setFilter('discount', !filters.discount)} />}
                    </div>
                  </FiltreBlogu>
                )}
              </div>
            </section>
          </div>
          {!filtersOpen && <div aria-hidden className="h-0.5 rounded-2xl border border-gray-200 bg-white shadow-xs lg:hidden" />}
        </div>

        <section aria-label="Etkinlik kataloğu" className="min-w-0 space-y-4 lg:col-span-9">
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {activeFilters.map((filter) => <span key={filter} className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{filter}</span>)}
              {searchQuery.trim() && <span className="max-w-full break-words rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">Arama: {searchQuery.trim()}</span>}
              <button type="button" onClick={catalog.clearFilters} className="min-h-9 cursor-pointer font-bold text-blue-700 hover:underline">Filtreleri temizle</button>
            </div>
          )}
          {/*
            HARİTA, İLK KART SATIRININ YERİNDE

            Sütunun tam genişliği geniş ekranda tam olarak üç kart eder;
            harita o satırı ALIYOR, ilk satırın kartları ızgaradan geçici
            olarak düşüyor (bkz. `gridEvents`), altındakiler yerinde kalıyor.
            Seçim yokken bu blok hiç çizilmiyor ve ilk üç kart geri geliyor.
            Özellik askıdayken `geoActive` zaten false: harita da küreyle
            AYNI bayrağa bağlı, ikisi ayrı ayrı açılıp kapanamıyor.
          */}
          {geoActive && (
            <KesfetGeoPanel
              breadcrumb={geo.breadcrumb}
              node={geo.node}
              regions={geo.regions}
              pins={geo.pins}
              unpinnedCount={geo.unpinnedCount}
              center={geo.center}
              onSelect={geo.select}
              onOpenEvent={(slug) => catalog.navigateToDetail(`/kesfet/${slug}`, onNavigate)}
            />
          )}
          {listPhase === 'loading' && (
            <div role="status" aria-label="Etkinlikler yükleniyor" className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((key) => <div key={key} aria-hidden className="h-44 animate-pulse rounded-2xl bg-gray-100 motion-reduce:animate-none sm:h-72" />)}
            </div>
          )}
          {listPhase === 'error' && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
              <p className="font-bold text-rose-800">Etkinlikler yüklenemedi.</p>
              <button type="button" onClick={() => { catalog.refresh(); geo.reload(); }} className="mt-3 min-h-11 cursor-pointer font-bold text-blue-700">Tekrar dene</button>
            </div>
          )}
          {listPhase === 'ready' && <>
            {/*
              "Sonuç yok" kararı KESİLMEMİŞ listeye bakıyor. Seçimde üç ya da
              daha az etkinlik varsa hepsi haritanın aldığı satırdadır ve
              ızgara boş kalır; orada "bulunamadı" demek doğru olmazdı.
            */}
            {listEvents.length > 0 ? (
              gridEvents.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {gridEvents.map((event) => <EventCard key={event.id} event={event} onNavigate={(path) => catalog.navigateToDetail(path, onNavigate)} />)}
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-blue-500" aria-hidden />
                <h2 className="mt-3 font-bold text-gray-900">{hasNarrowing ? 'Bu filtrelere uygun etkinlik bulunamadı' : 'Henüz yayında etkinlik bulunmuyor'}</h2>
                <p className="mt-2 text-sm text-gray-600">
                  {geoActive ? 'Haritada üst seviyeye çıkarak ya da filtreleri değiştirerek yeniden deneyebilirsin.'
                    : hasFilters ? 'Filtreleri değiştirerek yeniden deneyebilirsin.'
                    : 'Yeni etkinlikler eklendiğinde burada görünecek.'}
                </p>
                {geoActive && <button type="button" onClick={geo.reset} className="mt-3 min-h-11 cursor-pointer font-bold text-blue-700 hover:underline">Tüm dünyayı göster</button>}
              </div>
            )}
            {!geoActive && moreError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm">
              <p className="text-rose-800">Sonraki etkinlikler yüklenemedi. Açık etkinlikler yerinde duruyor.</p>
              <button type="button" onClick={catalog.loadMore} className="mt-2 min-h-11 cursor-pointer font-bold text-blue-700">Yeniden yükle</button>
            </div>}
            {listHasMore && (geoActive || !moreError) && <div className="pt-2 text-center">
              <button type="button" disabled={!geoActive && loadingMore} onClick={geoActive ? geo.showMore : catalog.loadMore} className="min-h-12 w-full cursor-pointer rounded-xl border border-blue-200 bg-white px-8 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
                {!geoActive && loadingMore ? 'Yükleniyor…' : 'Daha fazla göster'}
              </button>
              {!geoActive && loadingMore && <span role="status" className="sr-only">Sonraki etkinlikler yükleniyor</span>}
            </div>}
          </>}
          {/*
            SAYAÇ GÖRÜNMÜYOR AMA SUSMUYOR

            Başlık şeridiyle birlikte sayacın GÖRÜNEN hâli kalktı; canlı bölge
            kalmak zorunda: "yükleniyor / hazır / yüklenemedi" durumunu
            duyuran tek yer burasıydı, silinseydi ekran okuyucu kullanıcısı
            liste her değiştiğinde sessizlikle karşılaşırdı. `data-testid`
            de aynı sebeple duruyor; katalog testleri bu bölgeyi okuyor.

            Bölümün SONUNDA, çünkü `space-y-4` ilk çocuğun ardındaki her
            kardeşe üst boşluk veriyor: `sr-only` akış dışı olsa da başa
            konsaydı altındaki içeriği 16 piksel aşağı iterdi. Sonda dururken
            kimseye boşluk eklemiyor.
          */}
          <p data-testid="catalog-count" aria-live="polite" aria-atomic="true" className="sr-only">
            {/*
              "gösteriliyor" ÇİZİLEN kartı sayıyor: harita ilk satırı
              aldığında o üç kart ekranda olmadığı için sayıya da girmiyor.
              Toplam ise `listTotal`: coğrafi seçim ve filtrelerin tam
              sonucu, kesmeden etkilenmiyor.
            */}
            {listPhase === 'ready' ? `${listTotal} etkinlik · ${gridEvents.length} gösteriliyor` : listPhase === 'loading' ? 'Etkinlikler yükleniyor…' : 'Liste yüklenemedi'}
          </p>
        </section>
      </div>
    </main>
  );
};
