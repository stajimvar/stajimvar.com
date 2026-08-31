import React from 'react';
import {
  AlarmClock,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { StudentProfile } from '../types';
import { GoogleAdBanner } from './GoogleAdBanner';
import { ListingLogo } from './ListingLogo';
import { ZamanTupu } from './ZamanTupu';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import {
  fetchOpportunities,
  fetchSavedOpportunityIds,
  toggleSavedOpportunity,
  type Opportunity,
  type OpportunityType,
} from '../lib/opportunities';
import {
  isExpiredOpportunity,
  opportunityCta,
  opportunityStatus,
  opportunityTypeLabel,
  readOpportunityFilters,
  serializeOpportunityFilters,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_TYPE_LABELS,
} from '../lib/opportunity-domain.mjs';
import {
  ACILIYET_SINIFLARI,
  closingSoon,
  closingSoonLabel,
  deadlineTone,
  groupOpportunities,
  opportunityAmount,
  opportunityCalendar,
  opportunityDaysLeft,
  opportunityFit,
  personalizationReadyCount,
} from '../lib/firsat-degerlendirme.mjs';

/**
 * Öğrenci Fırsatları.
 *
 * SAYAÇ İLE LİSTE AYNI ŞEYİ SAYIYOR
 * ---------------------------------
 * Üstte "21 başvurusu devam eden" yazarken listede 68 fırsat
 * gösteriliyordu: iki sayı aynı ekranda birbiriyle çelişiyordu. Sebebi
 * sayacın yalnızca "Açık" olanları, listenin ise süresi dolmamış her şeyi
 * göstermesiydi. Artık ikisi de aynı gruplardan geliyor ve sayaçlar
 * kaçının açık, kaçının yakında olduğunu ayrı ayrı söylüyor.
 *
 * SÜRESİ DOLANLAR VARSAYILANDA YOK
 * --------------------------------
 * Kapanmış bir başvuru öğrencinin yapabileceği bir şey değil. Listeden
 * çıkarıldı ama silinmedi: altta "süresi dolanları göster" bağlantısı
 * duruyor, çünkü geçen yılın takvimi gelecek yılın tahmini için işe
 * yarıyor.
 *
 * MOBİLDE FİLTRELER PANELDE
 * -------------------------
 * Filtre kutusu telefonda neredeyse bütün ekranı kaplıyor, ilk fırsatı
 * ekranın dışına itiyordu. Telefonda yalnızca arama satırı ve "Filtreler"
 * düğmesi duruyor; ayrıntılar alttan açılan panelde. Geniş ekranda yer
 * sorunu yok, orada sol sütunda açık duruyor.
 */

const categoryPath: Record<string, OpportunityType | ''> = {
  '/burslar': 'scholarship',
  '/kyk': 'kyk',
  '/yurtdisi-firsatlari': 'international',
  '/yarismalar': 'competition',
};

const kisaTarih = (value?: string) =>
  value ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(value)) : null;

/*
  Kalan süre metni ortak yardımcıdan geliyor (deadlineLabel). Burada ayrı
  bir kopyası duruyordu ve aynı fırsat kartta "Bugün son gün", üst uyarıda
  "Yarına kadar açık", ana sayfada "Yarın sona eriyor" diyordu.
*/

type Sekme = 'uygun' | 'tumu' | 'takvim';

export const OpportunitiesPage: React.FC<{
  path: string;
  userId: string | null;
  student: StudentProfile | null;
  onNavigate: (path: string) => void;
  onRequireLogin: () => void;
}> = ({ path, userId, student, onNavigate, onRequireLogin }) => {
  const [items, setItems] = React.useState<Opportunity[]>([]);
  const [saved, setSaved] = React.useState<string[]>([]);
  const [state, setState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [panelAcik, setPanelAcik] = React.useState(false);
  /* Süresi dolanlar varsayılanda gizli; isteyen açıyor. Durum adreste. */
  /*
    TAKVİMİ AÇIKLANMAYANLAR DA VARSAYILANDA GİZLİ

    Ölçüldü: 68 fırsatın 21'i açık, 17'si yakında, 30'unun takvimi henüz
    açıklanmamış. Üstteki sayaç "21 açık" derken listenin 68 göstermesi
    bundandı — iki sayı aynı ekranda çelişiyordu.

    Varsayılan liste artık sayaçlarla aynı kümeyi gösteriyor. Takvimi
    açıklanmayanlar silinmiyor: tek satırlık bir bağlantıyla açılıyorlar,
    çünkü "bu kurum burs veriyor mu" sorusunun cevabı onlarda.
  */
  const [filters, setFilters] = React.useState(() => ({
    ...readOpportunityFilters(window.location.search),
    type: categoryPath[path] || readOpportunityFilters(window.location.search).type,
  }));

  /*
    GÖRÜNÜM DURUMLARI DA ADRESTE

    Arşiv ve "takvimi açıklanmayanlar" sayfa içi durumdu: sayfa yenilendiğinde
    kayboluyor ve o görünüm paylaşılamıyordu. Süzgeçlerle aynı yere taşındı.
  */
  const arsivGoster = filters.arsiv;
  const takvimsizGoster = filters.takvimsiz;
  const setArsivGoster = (f: (a: boolean) => boolean) =>
    set({ arsiv: f(filters.arsiv), takvimsiz: false });
  const setTakvimsizGoster = (f: (a: boolean) => boolean) =>
    set({ takvimsiz: f(filters.takvimsiz) });

  /*
    KİŞİSELLEŞTİRMEYE HAZIR KAYIT SAYISI

    "Sana uygun" ancak doğrulanmış kısıtla anlamlı. Sayı sıfırsa ortada
    kişiselleştirme yok; sekmeyi aktif bir süzgeç gibi göstermek olmayan
    bir yetenek sunmak olurdu. Sayı veriye bağlı: doğrulama masasından
    ilk kayıt damgalandığı anda sekme kendiliğinden geri geliyor.
  */
  const hazirSayisi = React.useMemo(() => personalizationReadyCount(items), [items]);

  const savedOnly = path === '/kaydedilen-firsatlar';
  const sekme: Sekme = path === '/bana-uygun' ? 'uygun' : path === '/firsat-takvimi' ? 'takvim' : 'tumu';

  React.useEffect(() => {
    document.title = `${
      sekme === 'uygun' ? 'Sana uygun fırsatlar' : sekme === 'takvim' ? 'Fırsat takvimi' : 'Öğrenci Fırsatları'
    } | StajımVar`;
    const canonical =
      document.querySelector('link[rel="canonical"]') || Object.assign(document.createElement('link'), { rel: 'canonical' });
    canonical.setAttribute('href', `${window.location.origin}${path}`);
    document.head.appendChild(canonical);
  }, [path, sekme]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetchOpportunities(), userId ? fetchSavedOpportunityIds(userId) : Promise.resolve([])])
      .then(([rows, ids]) => {
        if (!cancelled) {
          setItems(rows);
          setSaved(ids);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    /*
      Adres yalnızca /firsatlar için yazılıyordu: kategori sayfalarında ve
      takvimde arama adrese hiç düşmüyor, sayfa yenilenince kayboluyordu.
      Artık bütün fırsat görünümlerinde yazılıyor.
    */
    const query = serializeOpportunityFilters(filters);
    if (window.location.search !== query) {
      window.history.replaceState({}, '', `${path}${query}`);
    }
  }, [filters, path]);

  const set = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...patch }));

  /*
    DURUM SÜZGECİ

    Sayaçların üçü de birer süzgeç: "17 yakında"ya basan kişi o 17'yi
    görmek istiyor. URL'de yalnızca `open=1` tutuluyor (paylaşılan
    bağlantılarla uyumlu kalsın diye); "yakında" seçimi sayfa içi bir
    durum, çünkü kimse "yakında açılacaklar" listesini paylaşmıyor.
  */
  const durumSuzgeci = (filters.durum || '') as '' | 'acik' | 'yakinda';
  const durumSec = (yeni: '' | 'acik' | 'yakinda') =>
    set({ durum: yeni, openOnly: yeni === 'acik' });
  const temizle = () =>
    set({
      query: '',
      type: categoryPath[path] || '',
      level: '',
      place: '',
      openOnly: false,
      durum: '',
      takvimsiz: false,
      arsiv: false,
    });

  /* Aktif filtre sayısı düğmenin üzerinde: panel kapalıyken de görünsün. */
  const aktifSuzgecSayisi =
    (filters.type ? 1 : 0) + (filters.level ? 1 : 0) + (filters.place ? 1 : 0) + (durumSuzgeci ? 1 : 0);

  const gruplar = React.useMemo(() => groupOpportunities(items), [items]);
  const yarinKapananlar = React.useMemo(() => closingSoon(items, 1), [items]);

  /* Metin ve tür süzgeçleri; durum ve profil ayrı aşamada. */
  const metneUyar = React.useCallback(
    (item: Opportunity) => {
      if (savedOnly && !saved.includes(item.id)) return false;
      if (filters.type && item.opportunityType !== filters.type) return false;
      if (durumSuzgeci && opportunityStatus(item) !== durumSuzgeci) return false;
      if (filters.level && !item.educationLevels.includes(filters.level)) return false;
      if (
        filters.place &&
        ![...item.cities, ...item.countries].some((place) =>
          place.toLocaleLowerCase('tr-TR').includes(filters.place.toLocaleLowerCase('tr-TR'))
        )
      )
        return false;
      if (
        filters.query &&
        !`${item.title} ${item.organizationName} ${item.shortDescription}`
          .toLocaleLowerCase('tr-TR')
          .includes(filters.query.toLocaleLowerCase('tr-TR'))
      )
        return false;
      return true;
    },
    [filters, durumSuzgeci, saved, savedOnly]
  );

  const filtered = React.useMemo(() => {
    let liste = items.filter(metneUyar);

    /*
      Süresi dolanlar ayrı. Arşiv açıkken YALNIZCA onlar görünüyor: iki
      kümeyi karıştırmak, "bu hâlâ açık mı" sorusunu her kartta yeniden
      sordururdu.
    */
    liste = arsivGoster
      ? liste.filter((item) => isExpiredOpportunity(item))
      : liste.filter((item) => !isExpiredOpportunity(item));

    /* Takvimi açıklanmayanlar yalnızca istenirse. Arşiv görünümünde bu
       ayrım anlamsız: orada zaten hepsinin tarihi var ve geçmiş. */
    if (!arsivGoster && !takvimsizGoster && !savedOnly) {
      liste = liste.filter((item) => opportunityStatus(item) !== 'takvim_bekleniyor');
    }

    if (sekme === 'uygun' && student) {
      /*
        İZİN LİSTESİ, ELEME LİSTESİ DEĞİL

        Önce "şartı uymayanları çıkar" deniyordu. Bu, kısıtları HİÇ
        doğrulanmamış bir fırsatı da sessizce "sana uygun" sayıyordu —
        68 kaydın tamamı böyleydi, yani sekme aslında bütün listeyi
        gösterip adına kişiselleştirme diyordu.

        Artık yalnızca üç boyutu da doğrulanmış VE öğrenciyle eşleşen
        kayıtlar giriyor. Bilinmeyen bir kayıt burada hiç görünmüyor;
        "Tüm fırsatlar" sekmesinde duruyor.
      */
      liste = liste.filter((item) => {
        const fit = opportunityFit(item, student);
        return fit.durum === 'uygun_olabilir' && fit.kesin;
      });
    }

    return [...liste].sort((a, b) => (a.applicationDeadline || '9999').localeCompare(b.applicationDeadline || '9999'));
  }, [items, metneUyar, arsivGoster, takvimsizGoster, savedOnly, sekme, student]);

  const save = async (item: Opportunity) => {
    if (!userId) return onRequireLogin();
    const isSaved = saved.includes(item.id);
    await toggleSavedOpportunity(userId, item.id, isSaved);
    setSaved((rows) => (isSaved ? rows.filter((id) => id !== item.id) : [...rows, item.id]));
  };

  const heading = savedOnly
    ? 'Takip ettiğin fırsatlar'
    : sekme === 'takvim'
      ? 'Fırsat takvimi'
      : sekme === 'uygun'
        ? 'Sana uygun fırsatlar'
        : 'Öğrenci Fırsatları';

  const kategoriler: [string, string][] = [
    ['/firsatlar', 'Tümü'],
    ['/burslar', 'Burslar'],
    ['/kyk', 'KYK'],
    ['/yurtdisi-firsatlari', 'Yurt dışı'],
    ['/yarismalar', 'Yarışmalar'],
    ['/kaydedilen-firsatlar', 'Takip ettiklerim'],
  ];

  const suzgecler = (
    <Suzgecler filters={filters} set={set} temizle={temizle} />
  );

  return (
    <main
      className={`w-full ${SAYFA_GENISLIGI} mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 sm:pt-3 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-10`}
    >
      <section className="mb-3 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div aria-hidden="true" className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500" />

        <div className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 sm:gap-y-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight text-gray-950">{heading}</h1>
                {/*
                  Açıklama telefonda gizli. Ölçüldü: başlık kartı mobilde
                  351 piksel tutuyordu ve ilk fırsat 646. pikselde
                  başlıyordu — yani ekranın dışında. Açıklama başlığın
                  söylemediği bir şey söylemiyor; asıl bilgi sayaçlarda ve
                  kapanış uyarısında.
                */}
                <p className="hidden sm:block text-xs sm:text-sm text-gray-600 leading-relaxed max-w-2xl">
                  {savedOnly
                    ? 'Sonradan incelemek için takibe aldığın fırsatlar.'
                    : sekme === 'takvim'
                      ? 'Başvuruların açıldığı ve kapandığı günler, ay ay.'
                      : sekme === 'uygun'
                        ? 'Profilindeki bilgilere göre elenmeyen fırsatlar. Koşulları resmî kaynaktan doğrula.'
                        : 'Burs, kredi, eğitim, yurtdışı ve yarışma — hepsi resmî kaynağıyla doğrulanmış.'}
                </p>
              </div>
            </div>

            {/*
              SAYAÇLAR EYLEME DÖNÜK

              Önce "Başvurusu devam eden / Burs ve kredi / Takip ettiğimiz
              fırsat" yazıyordu. İkincisi ve üçüncüsü öğrencinin
              yapabileceği bir şey söylemiyordu — kaç burs olduğunu bilmek
              bir karar değiştirmiyor. Üçü de artık bir sonraki hareketi
              gösteriyor ve üçü de tıklanabilir.
            */}
            {state === 'ready' && !savedOnly && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:shrink-0">
                <Sayac
                  deger={gruplar.acik.length}
                  etiket="açık"
                  aktif={durumSuzgeci === 'acik'}
                  onClick={() => durumSec(durumSuzgeci === 'acik' ? '' : 'acik')}
                />
                <Sayac
                  deger={gruplar.yakinda.length}
                  etiket="yakında"
                  aktif={durumSuzgeci === 'yakinda'}
                  onClick={() => durumSec(durumSuzgeci === 'yakinda' ? '' : 'yakinda')}
                />
                <Sayac deger={saved.length} etiket="takipte" onClick={() => onNavigate('/kaydedilen-firsatlar')} />
              </div>
            )}
          </div>

          {/*
            En yakın kapanış ayrı bir satır: tarih listede kaybolmasın.

            Gül kırmızısıydı ve sayfanın en üstündeki tek renkli şey oydu;
            kartlardaki kırmızı kalkınca tek başına bir hata bandı gibi
            kaldı. Kartlarla aynı sıcak amber ailesine alındı — söylenen
            şey kötü haber değil, "bunlar yakında kapanıyor".
          */}
          {state === 'ready' && yarinKapananlar.length > 0 && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-900">
              <AlarmClock className="w-4 h-4 shrink-0" />
              {yarinKapananlar.length === 1
                ? `${closingSoonLabel(1)} ${yarinKapananlar[0].title}`
                : closingSoonLabel(yarinKapananlar.length)}
            </p>
          )}
        </div>
      </section>

      {/* -------- sekmeler: sana uygun / tümü / takvim -------- */}
      {!savedOnly && (
        <nav aria-label="Fırsat görünümü" className="mb-3 flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs font-bold">
          {(
            [
              /* Hazır kayıt yoksa sekme hiç çizilmiyor — bkz. hazirSayisi. */
              ...((hazirSayisi > 0
                ? [['/bana-uygun', 'Sana uygun', 'uygun']]
                : []) as [string, string, Sekme][]),
              ['/firsatlar', 'Tüm fırsatlar', 'tumu'],
              ['/firsat-takvimi', 'Takvim', 'takvim'],
            ] as [string, string, Sekme][]
          ).map(([yol, etiket, id]) => (
            <button
              key={yol}
              /* Sekme değişince arama ve süzgeçler adresle birlikte taşınıyor. */
              onClick={() => onNavigate(`${yol}${serializeOpportunityFilters(filters)}`)}
              className={`flex-1 rounded-full px-3 py-2 transition-colors cursor-pointer ${
                sekme === id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {etiket}
            </button>
          ))}
        </nav>
      )}

      {/* -------- mobil arama satırı -------- */}
      {sekme !== 'takvim' && !savedOnly && (
        <div className="lg:hidden mb-3 flex items-center gap-2">
          <label className="relative flex-1 block">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              aria-label="Fırsat ara"
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Burs veya fırsat ara"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <button
            onClick={() => setPanelAcik(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-700 cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            Filtreler
            {aktifSuzgecSayisi > 0 && (
              <span className="ml-0.5 rounded-full bg-blue-600 px-1.5 text-[11px] text-white">{aktifSuzgecSayisi}</span>
            )}
          </button>
        </div>
      )}

      {/* -------- hızlı çipler: yalnızca mobil -------- */}
      {/*
        MASAÜSTÜNDE GÖSTERİLMİYOR

        Geniş ekranda bu satır aynı süzgeçleri ÜÇÜNCÜ kez veriyordu: solda
        "Tüm türler", "Tüm eğitim seviyeleri" ve "Yalnızca açık olanlar",
        sağda "Kategoriler" paneli, ortada bu çipler. Üstelik ikisi farklı
        çalışıyor — çip `type` süzgecini değiştiriyor, kategori düğmesi
        başka bir adrese gidiyor — yani aynı görünen iki düğme aynı sonucu
        vermiyordu.

        Mobilde kalıyorlar ve orada gerekliler: sol ve sağ sütunlar dar
        ekranda gizli, geri kalan her süzgeç "Filtreler" panelinin arkasında.
        Tek dokunuşla süzmenin başka yolu yok.
      */}
      {sekme !== 'takvim' && !savedOnly && (
        <div className="lg:hidden mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Cip aktif={durumSuzgeci === 'acik'} onClick={() => durumSec(durumSuzgeci === 'acik' ? '' : 'acik')}>
            Açık
          </Cip>
          <Cip aktif={filters.type === 'scholarship'} onClick={() => set({ type: filters.type === 'scholarship' ? '' : 'scholarship' })}>
            Burs
          </Cip>
          <Cip aktif={filters.type === 'kyk'} onClick={() => set({ type: filters.type === 'kyk' ? '' : 'kyk' })}>
            KYK
          </Cip>
          <Cip
            aktif={filters.type === 'international'}
            onClick={() => set({ type: filters.type === 'international' ? '' : 'international' })}
          >
            Yurtdışı
          </Cip>
          <Cip aktif={filters.level === 'Lisans'} onClick={() => set({ level: filters.level === 'Lisans' ? '' : 'Lisans' })}>
            Lisans
          </Cip>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* ------------- sol: filtreler (yalnızca geniş ekran) ------------- */}
        <div className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          {!savedOnly && sekme !== 'takvim' && suzgecler}
        </div>

        {/* ------------------------------------------- orta: kart akışı --- */}
        <div className="lg:col-span-6 space-y-4 min-w-0">
          {sekme === 'uygun' && student && (
            <p className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs text-blue-900 leading-relaxed">
              Bu liste bir <b>uygunluk garantisi değil</b>. Profiline açıkça uymayan fırsatlar
              çıkarıldı; kalanların koşullarını resmî kaynağından kontrol et.
            </p>
          )}

          {/*
            Giriş yapılmamışken "Sana uygun" sekmesinde liste ÇİZİLMİYOR.
            Önce giriş çağrısının altında 38 fırsat sıralanıyordu: sekmenin
            adı "sana uygun" olduğu için o liste kişiselleştirilmiş
            görünüyordu, oysa hiçbir eleme yapılmamıştı.
          */}
          {sekme === 'uygun' && !student ? (
            <Empty
              icon={<Sparkles />}
              title="Sana uygun fırsatları görmek için giriş yap"
              body="Eleme yalnızca kendi profilindeki bilgilerle yapılıyor. Giriş yapmadan bütün fırsatları “Tüm fırsatlar” sekmesinden görebilirsin."
              action="Giriş yap"
              onClick={onRequireLogin}
            />
          ) : sekme === 'uygun' && state === 'ready' && hazirSayisi === 0 ? (
            /*
              SEKME GİZLİ AMA ADRES AÇIK KALABİLİR

              Kayıtlı bağlantı ya da eski sekme /bana-uygun'a düşürebilir.
              Burada boş liste göstermek "sana uygun hiçbir şey yok" gibi
              okunurdu; oysa doğru cümle "henüz eşleştirebileceğimiz
              kayıt yok". Fırsatların kendisi kaybolmuyor.
            */
            <Empty
              icon={<Sparkles />}
              title="Eşleştirme için yeterli doğrulanmış bilgi yok"
              body="Bir fırsatı sana uygun sayabilmemiz için bölüm, eğitim seviyesi ve şehir şartlarının kurumun kendi sayfasından doğrulanmış olması gerekiyor. Şu an bu üç bilgisi de doğrulanmış kayıt yok, o yüzden uydurma bir eşleştirme göstermiyoruz. Bütün fırsatlar “Tüm fırsatlar” sekmesinde duruyor."
              action="Tüm fırsatlara git"
              onClick={() => onNavigate('/firsatlar')}
            />
          ) : state === 'loading' ? (
            <div role="status" className="space-y-4">
              {[1, 2, 3].map((x) => (
                <div key={x} className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : state === 'error' ? (
            <Empty icon={<Filter />} title="Fırsatlar şu anda yüklenemedi" body="Bağlantını kontrol edip tekrar dene." />
          ) : sekme === 'takvim' ? (
            <Takvim items={items.filter(metneUyar)} onNavigate={onNavigate} />
          ) : filtered.length ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p aria-live="polite" className="text-sm text-gray-600">
                  <b>{filtered.length}</b> fırsat gösteriliyor
                  {arsivGoster && ' (süresi dolanlar)'}
                </p>
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {/*
                    Bu bir anahtar, bir bağlantı değil. Düz metin olarak
                    duruyordu ve tıklanabilir olduğu anlaşılmıyordu;
                    listenin neyi gösterdiğini belirleyen bir kontrolün
                    kendini kontrol gibi göstermesi gerekiyor.
                  */}
                  {gruplar.takvim_bekleniyor.length > 0 && !savedOnly && !arsivGoster && (
                    <button
                      role="switch"
                      aria-checked={takvimsizGoster}
                      onClick={() => setTakvimsizGoster((a) => !a)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                        takvimsizGoster
                          ? 'border-blue-200 bg-blue-50 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`w-8 h-4 rounded-full relative transition-colors ${
                          takvimsizGoster ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                            takvimsizGoster ? 'left-[18px]' : 'left-0.5'
                          }`}
                        />
                      </span>
                      Takvimi belli olmayanları da göster ({gruplar.takvim_bekleniyor.length})
                    </button>
                  )}
                  {gruplar.kapali.length > 0 && !savedOnly && (
                    <button
                      onClick={() => setArsivGoster((a) => !a)}
                      className="text-xs font-bold text-gray-500 hover:text-gray-900 hover:underline cursor-pointer"
                    >
                      {arsivGoster
                        ? 'Açık fırsatlara dön'
                        : `Süresi dolan ${gruplar.kapali.length} fırsatı göster`}
                    </button>
                  )}
                </span>
              </div>
              <div className="space-y-4">
                {filtered.map((item, sira) => (
                  <React.Fragment key={item.id}>
                    <Card
                      item={item}
                      saved={saved.includes(item.id)}
                      onSave={() => save(item)}
                      onNavigate={onNavigate}
                      fit={student ? opportunityFit(item, student) : null}
                    />
                    {/*
                      Akış arası reklam, üçüncü karttan sonra. Yayıncı kimliği
                      tanımlı değilse GoogleAdBanner hiçbir şey çizmiyor.
                    */}
                    {sira === 2 && <GoogleAdBanner format="in-feed" />}
                  </React.Fragment>
                ))}
              </div>
            </>
          ) : savedOnly ? (
            <Empty
              icon={<Sparkles />}
              title="Henüz takip ettiğin fırsat yok"
              body="Fırsat kartlarındaki “Takip et” düğmesine bastıklarında burada birikiyor."
              action="Fırsatlara göz at"
              onClick={() => onNavigate('/firsatlar')}
            />
          ) : items.length ? (
            <Empty
              icon={<Filter />}
              title="Bu filtrelere uyan fırsat yok"
              body={
                gruplar.takvim_bekleniyor.length > 0 && !takvimsizGoster
                  ? `Sitede ${items.length} fırsat var. ${gruplar.takvim_bekleniyor.length} tanesinin takvimi henüz açıklanmadığı için varsayılan listede yok.`
                  : `Sitede ${items.length} fırsat var ama seçtiğin filtrelere uymuyor.`
              }
              action="Filtreleri temizle"
              onClick={temizle}
            />
          ) : (
            <Empty
              icon={<Sparkles />}
              title="Şu anda aktif başvuru dönemi olan fırsat bulunmuyor"
              body="Fırsatları resmî kaynağından doğrulayarak yayımlıyoruz; doğrulayamadığımız hiçbir burs veya yarışmayı listeye almıyoruz."
              action="Staj ilanlarına bak"
              onClick={() => onNavigate('/')}
            />
          )}
        </div>

        {/* ------------------------------------ sağ: kategoriler + reklam --- */}
        <div className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          <nav aria-label="Fırsat kategorileri" className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Kategoriler</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {kategoriler.map(([yol, etiket]) => (
                <button
                  key={yol}
                  onClick={() => onNavigate(yol)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    path === yol ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {etiket}
                </button>
              ))}
            </div>
          </nav>

          <aside className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
            <p className="text-sm font-bold text-gray-900">Fırsatları nasıl seçiyoruz</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Her kaydın resmî kaynağı doğrulanıyor; kurumun kendi sayfasında görmediğimiz hiçbir burs
              veya yarışma listeye girmiyor. Tutar ve son başvuru tarihi her yıl değiştiği için
              uydurmuyoruz — yalnızca resmî kaynakta açıkça yazan tutarı, ait olduğu dönemle birlikte
              gösteriyoruz.
            </p>
          </aside>

          <GoogleAdBanner format="sidebar-rectangle" />
        </div>
      </div>

      {/* -------- mobil filtre paneli -------- */}
      {panelAcik && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setPanelAcik(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtreler"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-900">Filtreler</h2>
              <button
                onClick={() => setPanelAcik(false)}
                aria-label="Kapat"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {suzgecler}
            <button
              onClick={() => setPanelAcik(false)}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white cursor-pointer"
            >
              {filtered.length} fırsatı göster
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

/* ------------------------------------------------------------------ */

/*
  Sayaç iki satırdı: üstte rakam, altında açıklama. "21 açık" tek satırda
  da anlaşılıyor ve mobilde üçü yan yana sığıyor. Üçü de bir SÜZGEÇ:
  rakamın gösterdiği kümeyi listede açıyor, dolayısıyla seçili olduğunda
  bunu göstermesi gerekiyor.
*/
const Sayac: React.FC<{ deger: number; etiket: string; aktif?: boolean; onClick?: () => void }> = ({
  deger,
  etiket,
  aktif = false,
  onClick,
}) => {
  const icerik = (
    <>
      <b className="font-extrabold tabular-nums">{deger}</b> {etiket}
    </>
  );
  const sinif = `rounded-full border px-3 py-1.5 text-xs leading-tight whitespace-nowrap ${
    aktif ? 'bg-blue-600 border-blue-600 text-white' : 'bg-blue-50/70 border-blue-100 text-blue-900'
  }`;
  if (!onClick) return <div className={sinif}>{icerik}</div>;
  return (
    <button onClick={onClick} className={`${sinif} hover:bg-blue-100 hover:text-blue-900 transition-colors cursor-pointer`}>
      {icerik}
    </button>
  );
};

const Cip: React.FC<{ aktif: boolean; onClick: () => void; children: React.ReactNode }> = ({ aktif, onClick, children }) => (
  <button
    onClick={onClick}
    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
      aktif ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
    }`}
  >
    {children}
  </button>
);

const Suzgecler: React.FC<{
  filters: { query: string; type: string; level: string; place: string; openOnly: boolean };
  set: (patch: any) => void;
  temizle: () => void;
}> = ({ filters, set, temizle }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
    <label className="relative block">
      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
      <input
        aria-label="Fırsat ara"
        value={filters.query}
        onChange={(e) => set({ query: e.target.value })}
        placeholder="Burs veya fırsat ara"
        className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
    {/*
      Tür listesi boş çiziliyordu: `Object.entries(LABELS)` çağrılıyordu ama
      LABELS bir FONKSİYONDU, dolayısıyla liste her zaman boş dönüyordu.
      Seçenekler etiket sözlüğünden geliyor.
    */}
    <select
      aria-label="Fırsat türü"
      value={filters.type}
      onChange={(e) => set({ type: e.target.value })}
      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
    >
      <option value="">Tüm türler</option>
      {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label as string}
        </option>
      ))}
    </select>
    <select
      aria-label="Eğitim seviyesi"
      value={filters.level}
      onChange={(e) => set({ level: e.target.value })}
      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
    >
      <option value="">Tüm eğitim seviyeleri</option>
      {['Lise', 'Ön lisans', 'Lisans', 'Yüksek Lisans', 'Doktora'].map((seviye) => (
        <option key={seviye} value={seviye}>
          {seviye}
        </option>
      ))}
    </select>
    <input
      aria-label="Şehir veya ülke"
      value={filters.place}
      onChange={(e) => set({ place: e.target.value })}
      placeholder="Şehir veya ülke"
      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
    />
    <div className="flex flex-wrap gap-2 pt-1">
      <button
        onClick={() => set({ openOnly: !filters.openOnly })}
        className={`rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer ${
          filters.openOnly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        Yalnızca açık olanlar
      </button>
      <button onClick={temizle} className="rounded-full px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer">
        Temizle
      </button>
    </div>
  </section>
);

/*
  FIRSAT KARTI

  Kartın söylemesi gereken sıra: bu ne, kimden, kime, ne kadar, ne zaman.
  Önce tarih dev punto ile kartın ortasındaydı ve tutar tek kelimelik gri
  bir rozetti ("Karşılıksız") — oysa burs seçerken ilk sorulan iki şey
  "kaç para" ve "geri ödeyecek miyim".

  Başlık iki satıra kadar açılıyor: "TÜBİTAK 2250 Lisansüstü Bursları"
  tek satırda kesilince hangi program olduğu okunmuyordu.
*/
const Card: React.FC<{
  item: Opportunity;
  saved: boolean;
  onSave: () => void;
  onNavigate: (p: string) => void;
  fit: { durum: string; not: string | null; kesin: boolean } | null;
}> = ({ item, saved, onSave, onNavigate, fit }) => {
  const cta = opportunityCta(item);
  const durum = opportunityStatus(item);
  const tutar = opportunityAmount(item);
  /* `ton` artık YALNIZCA takvimi açıklanmamış kutuda kullanılıyor; kalan
     durumların rengini zaman tüpü kendi taşıyor. */
  const ton = (ACILIYET_SINIFLARI as any)[deadlineTone(item)] ?? ACILIYET_SINIFLARI.notr;
  const yer = [...item.cities, ...item.countries];
  const seviye = item.educationLevels.length ? item.educationLevels.join(', ') : null;

  return (
    <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm flex flex-col gap-3">
      <div className="flex gap-3">
        <ListingLogo name={item.organizationName} logoUrl={item.organizationLogoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              {opportunityTypeLabel(item.opportunityType)}
            </span>
            {item.verifiedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Resmî kaynak
              </span>
            )}
          </div>
          <h2 className="mt-1 font-extrabold text-gray-950 leading-snug line-clamp-2">{item.title}</h2>
          <p className="text-sm text-gray-600 truncate">{item.organizationName}</p>
        </div>
      </div>

      {/* Kime: seviye ve yer. İkisi de yoksa satır hiç çizilmiyor. */}
      {(seviye || yer.length > 0) && (
        <p className="text-xs text-gray-500">{[seviye, yer.join(', ')].filter(Boolean).join(' · ')}</p>
      )}

      {/*
        NE KADAR

        Tutar yalnızca resmî kaynaktan doğrulanmışsa yazıyor. Doğrulanmamışsa
        susmuyoruz da: "açıklanmadı" demek, boş bırakıp öğrenciyi aramaya
        göndermekten iyi.
      */}
      {/*
        BİLİNMEYEN TUTAR KUTU DEĞİL, SATIR

        Fırsatların çoğunda tutar henüz doğrulanmadı ve her birine gri bir
        kutu çizmek kartları boşuna uzatıyordu — hiçbir şey söylemeyen bir
        alanın en büyük öğelerden biri olması yanlış. Bilinmiyorsa tek
        satır; biliniyorsa vurgulu kutu, çünkü o zaman kararı belirleyen
        bilgi orada.
      */}
      {tutar.bilinmiyor ? (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <span aria-hidden className="font-bold text-gray-400">
            ₺
          </span>
          Tutar açıklanmadı
          {tutar.geriOdeme && <span className="font-semibold text-gray-600">· {tutar.geriOdeme}</span>}
        </p>
      ) : (
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <p className="text-base font-extrabold text-emerald-900 leading-tight">{tutar.metin}</p>
          <p className="text-[11px] text-emerald-800">
            {[tutar.donem, tutar.geriOdeme].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {/*
        NE ZAMAN — ZAMAN TÜPÜ

        Burada renkli bir kutu vardı ve son üç güne giren burs KIRMIZI
        oluyordu. Kırmızı bu üründe hata rengi: açık, başvurulabilir bir
        burs "iptal oldu" gibi okunuyordu. Aynı bilgi artık zaman tüpüyle
        veriliyor — süre azaldıkça dolan bir kapsül ve pozitif renk dili.

        Takvimi açıklanmamış kayıtta tüp çizilmiyor; oradaki cümle ne
        yapılacağını söylediği için olduğu gibi kalıyor.
      */}
      {durum === 'takvim_bekleniyor' ? (
        <div className={`rounded-xl px-3 py-2 ${ton.kutu}`}>
          <p className={`text-[13px] font-semibold leading-snug ${ton.yazi}`}>
            Kurum bu dönemin takvimini açıklamadı; resmî kaynaktan takip et.
          </p>
        </div>
      ) : (
        <ZamanTupu item={item} />
      )}

      {/*
        UYGUNLUK — İDDİA DEĞİL, GEREKÇE

        "%84 uyum" gibi bir puan yazıyordu ve puanın neyden çıktığı
        görünmüyordu. Şart varsa şartın kendisi yazıyor; yoksa en fazla
        "uygun olabilir" deniyor.
      */}
      {fit?.not && (
        <p
          className={`text-xs leading-relaxed ${
            fit.durum === 'sart_uymuyor' ? 'text-amber-800' : 'text-gray-500'
          }`}
        >
          {fit.not}
        </p>
      )}

      {/*
        "SON KONTROL … DEĞİŞTİRİLEBİLİR" SATIRI KARTTAN ÇIKTI

        İki satır yer kaplayan bir GÜVEN notuydu, bir karar bilgisi değil:
        kullanıcı bu cümleye bakıp başvurup başvurmayacağına karar
        vermiyor. Üstelik kartın tepesinde zaten "Resmî kaynak" rozeti
        duruyor ve hemen altında zaman tüpü var — üç ayrı güven/tarih
        sinyali arka arkaya geliyordu.

        Cümlenin tamamı detay sayfasında duruyor: "Bu kaydı en son …
        tarihinde resmî kaynağından kontrol ettik." Aynı seçim keşif
        kartında da yapılmıştı; iki kart artık aynı dili konuşuyor.
      */}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <button
          onClick={() => onNavigate(`/firsatlar/${item.slug}`)}
          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Detayı gör <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onSave}
          aria-label={saved ? 'Takibi bırak' : 'Takip et'}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold border cursor-pointer ${
            saved ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
          {saved ? 'Takipte' : 'Takip et'}
        </button>
        {cta && (
          <a
            href={cta.adres}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            {cta.etiket} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </article>
  );
};

/*
  TAKVİM

  Önce yalnızca son başvuru tarihleri tek uzun liste hâlinde diziliyordu.
  Takvimin işe yaraması için açılış günü de gerekiyor: "ne zaman
  başvurabilirim" sorusu en az "ne zaman kapanıyor" kadar sık.

  Aylara bölünüyor çünkü öğrenci "bu ay ne var" diye bakıyor.
*/
const Takvim: React.FC<{ items: Opportunity[]; onNavigate: (p: string) => void }> = ({ items, onNavigate }) => {
  const aylar = React.useMemo(() => opportunityCalendar(items), [items]);

  if (!aylar.length) {
    return (
      <Empty
        icon={<CalendarDays />}
        title="Takvimde yaklaşan tarih yok"
        body="Kurumlar bu dönemin başvuru takvimini açıkladıkça buraya düşecek."
      />
    );
  }

  return (
    <div className="space-y-4">
      {aylar.map((ay: any) => (
        <section key={ay.anahtar} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <h2 className="px-4 py-2.5 text-sm font-extrabold text-gray-900 bg-gray-50 border-b border-gray-100 capitalize">
            {ay.etiket}
          </h2>
          <div className="divide-y divide-gray-100">
            {ay.olaylar.map((olay: any) => (
              <button
                key={`${olay.item.id}-${olay.tur}`}
                onClick={() => onNavigate(`/firsatlar/${olay.item.slug}`)}
                className="w-full text-left p-3 sm:p-4 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
              >
                <time className="w-14 shrink-0 text-sm font-extrabold text-gray-900">
                  {kisaTarih(olay.tur === 'acilis' ? olay.item.applicationStartAt : olay.item.applicationDeadline)}
                </time>
                <span className="min-w-0 flex-1">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                      /* Takvimdeki "Son başvuru" işareti de kartlarla aynı amber ailede. */
                      olay.tur === 'acilis' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-900'
                    }`}
                  >
                    {olay.tur === 'acilis' ? 'Başvuru açılıyor' : 'Son başvuru'}
                  </span>
                  <b className="mt-0.5 block text-sm text-gray-900 line-clamp-2 leading-snug">{olay.item.title}</b>
                  <span className="text-xs text-gray-500">{olay.item.organizationName}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const Empty: React.FC<{ icon: React.ReactNode; title: string; body: string; action?: string; onClick?: () => void }> = ({
  icon,
  title,
  body,
  action,
  onClick,
}) => (
  <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
    <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gray-100 text-gray-500">{icon}</div>
    <h2 className="font-extrabold text-gray-900">{title}</h2>
    <p className="mt-1 text-sm text-gray-600">{body}</p>
    {action && (
      <button onClick={onClick} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white cursor-pointer">
        {action}
      </button>
    )}
  </section>
);
