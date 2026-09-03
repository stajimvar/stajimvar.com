import React from 'react';
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Filter,
  MapPin,
  SlidersHorizontal,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { StudentProfile } from '../types';
import { ListingLogo } from './ListingLogo';
import { ZamanTupu } from './ZamanTupu';
import { DisBaglanti, FiltreBlogu, SecenekSatiri } from '../ui';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import {
  fetchOpportunities,
  fetchSavedOpportunityIds,
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

/*
  `Nokta` ve `SayacSatiri` silindi: tek kullanıcıları olan ince sayaç
  satırı sağ sütundaki karta dönüştü. Kullanılmayan bileşen bırakmak,
  sonradan bakanı "bir yerde çiziliyor" diye aratır.
*/

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
  /*
    `setArsivGoster` kaldırıldı: tek kullanıcısı olan "Süresi dolanlar"
    düğmesi süzgeç paneline taşındı ve panel `set({ arsiv, takvimsiz })`
    ile doğrudan yazıyor. Aynı kural orada da geçerli — arşiv açılınca
    takvimsiz kapanıyor.
  */
  /*
    `setTakvimsizGoster` kaldırıldı: anahtar süzgeç paneline taşınınca
    panel `set({ takvimsiz })` ile doğrudan yazıyor. Okunmayan bir
    yardımcıyı bırakmak, sonradan bakanı "başka bir yerden de
    değiştiriliyor" diye yanıltır.
  */

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

  /*
    SEKME VURGUSU ADRESE BAKIYOR, `sekme` DEĞİŞKENİNE DEĞİL

    `sekme` yalnızca üç değer alıyor ve /yurtdisi-firsatlari onun için
    'tumu' — o yüzden yurtdışı sekmesi kendi sayfasındayken sönük
    kalırdı. Vurgu artık doğrudan adresi karşılaştırıyor.

    Sekmesi olmayan kategori adresleri (/burslar, /kyk, /yarismalar) için
    "Tüm fırsatlar" yanıyor: kullanıcı hâlâ o listenin bir alt kümesinde
    ve hiçbir sekmenin yanmaması "buradan çıktın" hissi verirdi.
  */
  const SEKME_YOLLARI = ['/bana-uygun', '/yurtdisi-firsatlari', '/firsat-takvimi'];
  const sekmeAktif = (yol: string) =>
    path === yol || (yol === '/firsatlar' && !SEKME_YOLLARI.includes(path));

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
    KATEGORİ ADRESİ TÜR SÜZGECİNİ SÜRÜYOR

    `filters.type` yalnızca `useState` başlatıcısında adresten okunuyordu
    (bkz. categoryPath kullanımı). Başlatıcı bir kez çalışıyor; sayfa içi
    geçişte adres değişiyor ama süzgeç yerinde kalıyordu.

    Sonuç ölçüldü: /yurtdisi-firsatlari adresine geçince adres ve sekme
    vurgusu değişiyor, LİSTE DEĞİŞMİYORDU — 33 kayıt olduğu gibi
    kalıyordu. Aynı kırık davranış sağ sütundaki kategori düğmelerinde de
    vardı (/burslar, /kyk, /yarismalar), yalnızca kimse fark etmemişti
    çünkü oraya tam sayfa yenilemeyle de gidilebiliyor.

    İlk render atlanıyor: başlatıcı adres ve arama dizesini zaten doğru
    okudu; burada tekrar yazmak /firsatlar?type=scholarship gibi
    paylaşılmış bir bağlantının süzgecini silerdi.
  */
  const ilkRender = React.useRef(true);
  React.useEffect(() => {
    if (ilkRender.current) {
      ilkRender.current = false;
      return;
    }
    const kategoriTuru = categoryPath[path] || '';
    if (filters.type !== kategoriTuru) set({ type: kategoriTuru });
    /* Yalnızca adres değişiminde: süzgeç değişimi bu etkiyi tetiklememeli. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

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

  /*
    SEÇENEK SAYIMLARI — LİSTEYLE AYNI TABANDAN

    Panel her seçeneğin yanında kaç kayıt olduğunu yazıyor.

    TABAN `items` DEĞİL. İlk yazımda öyleydi ve ölçüldü: panel "KYK 2"
    diyordu, tıklayınca liste 0 kart gösteriyordu — çünkü o iki kaydın
    takvimi açıklanmamış ve varsayılan liste onları gizliyor. Sayının
    tıklanınca tutmadığı bir süzgeç, kullanıcıya olmayan içerik vaat eder;
    bu projede aynı hata bir kez de sayaç/liste arasında yaşanmış.

    Taban artık listenin kendi tabanı: süresi dolanlar ve (istenmedikçe)
    takvimi açıklanmayanlar dışarıda. Görünürlük anahtarları açılırsa
    sayılar da kendiliğinden büyüyor.

    Sayımlar DİĞER süzgeçlerden bağımsız: "Lisans 11" yazısı, tür süzgeci
    açıkken de 11 kalıyor. Kesişimli sayım seçenekleri birbirine
    söndürürdü ve kullanıcı neyi neden kaybettiğini anlayamazdı.
  */
  const sayimTabani = React.useMemo(() => {
    let liste = arsivGoster
      ? items.filter((item) => isExpiredOpportunity(item))
      : items.filter((item) => !isExpiredOpportunity(item));
    if (!arsivGoster && !takvimsizGoster && !savedOnly) {
      liste = liste.filter((item) => opportunityStatus(item) !== 'takvim_bekleniyor');
    }
    return liste;
  }, [items, arsivGoster, takvimsizGoster, savedOnly]);

  const sayimlar = React.useMemo(() => {
    const tur: Record<string, number> = {};
    const seviye: Record<string, number> = {};
    for (const item of sayimTabani) {
      if (item.opportunityType) tur[item.opportunityType] = (tur[item.opportunityType] || 0) + 1;
      for (const s of item.educationLevels || []) seviye[s] = (seviye[s] || 0) + 1;
    }
    return {
      tur,
      seviye,
      acik: sayimTabani.filter((i) => opportunityStatus(i) === 'acik').length,
      yakinda: sayimTabani.filter((i) => opportunityStatus(i) === 'yakinda').length,
    };
  }, [sayimTabani]);
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

  /*
    TAKİP ETME İŞLEVİ BURADAN KALKTI

    Kartta takip düğmesi kalmadığı için bu sayfada takibi değiştiren bir
    yol da yok. `saved` listesi duruyor: üstteki "takipte" sayacı ve
    /kaydedilen-firsatlar süzgeci onu okuyor. Takibi açıp kapatmak detay
    sayfasının işi (OpportunityDetailPage · kapaktaki yer imi düğmesi).
  */

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
    <Suzgecler
      filters={filters}
      set={set}
      temizle={temizle}
      takvimsizSayisi={gruplar.takvim_bekleniyor.length}
      kapaliSayisi={gruplar.kapali.length}
      sayimlar={sayimlar}
      durumSuzgeci={durumSuzgeci}
      durumSec={durumSec}
      acikSuzgecSayisi={aktifSuzgecSayisi}
    />
  );

  return (
    <main
      className={`w-full ${SAYFA_GENISLIGI} mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 sm:pt-3 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-10`}
    >
      {/*
        ÜST ALAN — İKİ SATIR

        Dört katman vardı: başlık, sayaç satırı, uyarı satırı ve altında
        tam bir satır kaplayan sekme kapsülü. Boşluklar küçültülerek
        toparlanmaya çalışıldı ama sorun boşluk değil DÜZENDİ — dört
        yatay şerit alt alta durdukça blok ne kadar sıkılırsa sıkılsın
        "boşluk bırakılmış taslak" gibi okunuyordu.

        Düzen değişti. Artık iki satır:

          1.  Öğrenci Fırsatları            [Tüm fırsatlar | Takvim]
          2.  22 açık · 13 yakında · ⏰ 2'si bugün/yarın kapanıyor

        Sekme kapsülü kendi şeridini bıraktı ve başlığın karşısına geçti;
        modern ürün başlıklarındaki görünüm seçici tam olarak orada
        duruyor. Uyarı da kendi satırından çıkıp meta zincirinin son
        halkası oldu.

        Ölçüldü (390 px): eski blok 123 px, yeni blok 54 px.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/*
          SOL SÜTUN: BAŞLIK + GÖRÜNÜM + SAYAÇLAR + SÜZGEÇLER

          İş & Staj İlanları sayfasının düzeni. Orada başlık tam genişlik bir
          bant değil, sol sütunun içinde duruyor ve ilanlar sayfanın en
          tepesinden başlıyor. Burada başlık, sekme kapsülü ve sayaçlar üstte
          ayrı bir bant kaplıyor, kartlar o bandın altından başlıyordu.

          Sütun artık dar ekranda da görünüyor ("hidden lg:block" kalktı):
          başlığı buraya taşıyabilmenin şartı buydu. Mobil arama ve çipler de
          ızgaranın üstünden buraya indi, böylece dar ekranda sıra bozulmuyor:
          başlık → arama → çipler → kartlar.

          ÖNE ÇIKAN BURSLAR ŞERİDİ KALDIRILDI

          Vitrin ile alttaki "Başvuru açık" şeridi aynı beş bursu aynı
          sırayla gösteriyordu — ölçüldü, birebir aynıydı. Şeridin varlık
          gerekçesi "alttaki liste sıkıcı, davet etmiyor" idi; liste kapak
          görselli şeritlere dönünce o gerekçe ortadan kalktı ve geriye
          yalnızca sayfanın kendini tekrar etmesi kaldı.

          Masaüstü süzgeç paneli kendi "hidden lg:block" sarmalayıcısını aldı;
          sütun görünür olunca panel mobilde de çizilecekti ve oradaki
          "Filtreler" paneliyle aynı süzgeçleri ikinci kez verecekti.
        */}
        {/*
          Mobilde başlık grubunun altında ince bir ayırıcı — ilan
          sayfasında da arama satırıyla liste arasında aynı çizgi var ve
          "kontroller bitti, liste başlıyor" demesini sağlıyor. Geniş
          ekranda çizgi yok: orada ayrımı sütunlar zaten yapıyor.
        */}
        {/*
          `pb-4` KALDIRILDI — ÇİZGİ HİZASI

          Ölçüldü: ilan sayfasında arama kutusuyla çizgi arası 16 piksel,
          burada 33'tü. Sebep iki boşluğun üst üste binmesi: Tailwind v4'te
          `space-y-4` son OLMAYAN çocuğa `margin-bottom` veriyor ve arama
          satırı son çocuk değil (altında masaüstü süzgeç paneli var), yani
          zaten 16 alıyordu; `pb-4` bunun üstüne 16 daha ekliyordu.

          Alt boşluğu artık tek kaynak veriyor.
        */}
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          <header>
            {/*
          Mobilde başlık ve sekmeler ortalı (ilan sayfasındaki gibi), geniş
          ekranda başlık solda ve sekmeler karşısında.
        */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 lg:justify-between">
              {/*
                Satır yüksekliği 1 (leading-none): başlığın altındaki ve
                üstündeki tipografik boşluk, meta satırıyla arasında görünmez
                bir aralık üretiyordu.
              */}
              {/*
                BAŞLIK İŞ & STAJ İLANLARI SAYFASININ DİLİNDE

                Orada başlık bir etiket değil bir CÜMLE ve son parçası marka
                mavisiyle vurgulanıyor ("Şirketlerin staj ilanları, tek
                listede."). Burada ise yalnızca "Öğrenci Fırsatları" yazan bir
                etiket vardı; iki kardeş sayfa aynı üründen çıkmış gibi
                durmuyordu.

                Punto sabit değil, genişlikle ölçekleniyor — kardeş sayfadaki
                `clamp` yaklaşımının aynısı. Sabit puntoda cümle dar ekranda
                üç satıra bölünüyor, geniş ekranda ise satırın yarısını boş
                bırakıyordu.

                Cümle YALNIZCA varsayılan görünümde. "Takvim", "Sana uygun" ve
                "Takip ettiklerin" görünümlerinde başlık o görünümün adını
                söylemek zorunda; oraya pazarlama cümlesi koymak kullanıcının
                nerede olduğunu gizlerdi.
              */}
              <h1 className="min-w-0 text-center lg:text-left [font-size:clamp(1.25rem,2.4vw,1.75rem)] font-extrabold leading-tight tracking-tight text-gray-950">
                {/*
              BAŞLIK GÖRÜNÜME GÖRE DEĞİŞMİYOR

              Koşul `sekme === 'tumu'` idi: takvime geçince başlık "Fırsat
              takvimi"ne dönüyor ve sayfa kimliğini değiştiriyordu. Sekme,
              arama ve sütunlar aynı kalırken başlığın değişmesi "başka bir
              sayfaya geldim" hissi veren son parçaydı.

              Hangi görünümde olunduğunu aktif sekme zaten söylüyor; başlık
              sayfanın kendisini söylüyor. Belge başlığı (document.title)
              görünüme göre değişmeye devam ediyor — paylaşılan bağlantı ve
              sekme adı için orası doğru yer.
            */}
            {!savedOnly ? (
                  <>
                    Burslar ve öğrenci fırsatları,{' '}
                    <span className="text-blue-600">tek listede</span>.
                  </>
                ) : (
                  heading
                )}
              </h1>

              {/*
                SEGMENT KONTROLÜ — BAŞLIĞIN KARŞISINDA

                Kendi satırında dururken 40 piksellik bir yastık gibi
                görünüyordu ve üstündeki metin satırlarıyla ilgisiz duruyordu.
                Başlıkla aynı hizaya gelince hem o şerit tamamen kalktı hem de
                "görünüm seçici" olduğu anlaşılıyor.

                Kapsül 36 px (düğme 32) — iOS segment kontrolüyle aynı boy.
                Seçilideki ağır beyaz hap yerine çok hafif bir gölge var.
              */}
              {/*
                GÖRÜNÜM SEÇİCİ AŞAĞI TAŞINDI

                Başlığın karşısındaydı ve mobilde başlıkla arama kutusunun
                arasına giriyordu. Yeri artık listenin hemen üstü —
                "süresi dolanlar" anahtarıyla aynı satırda, çünkü üçü de
                aynı işi yapıyor: AŞAĞIDAKİ LİSTENİN ne göstereceğini
                seçiyorlar. Başlığın yanında dururken bir sayfa başlığı
                süsü veriyorlardı.
              */}
            </div>

            {/*
              SAYAÇ SATIRI SAĞ SÜTUNA, KART OLARAK TAŞINDI

              Burada ince gri bir sayaç satırı vardı. İlan sayfasında aynı
              bilgi sağ sütunun tepesinde büyük rakamlı bir kart; iki sayfa
              aynı şeyi iki ayrı ağırlıkta söylüyordu.

              Sayaçlar TIKLANABİLİR kaldı — onlar aynı zamanda durum
              süzgeci. İlan sayfasındaki kart yalnızca gösteriyor; burada
              basınca liste süzülüyor, o yüzden düğme olarak yazıldılar.
            */}
          </header>
          {/* -------- mobil arama satırı -------- */}
          {/*
            TAKVİMDE DE ÇİZİLİYOR

            `sekme !== 'takvim'` koşulu vardı ve takvime geçince arama
            kutusu kayboluyordu; sekme kapsülü de o sırada liste dalının
            içinde kaldığı için birlikte yok oluyordu. Sonuç: takvim
            "aynı sayfanın başka görünümü" değil, BAŞKA BİR SAYFA gibi
            açılıyordu — geri dönecek sekme bile ekranda değildi.

            Takvim zaten metne göre süzülüyor (`items.filter(metneUyar)`),
            yani kutunun orada bir işi var. Ayrıntılı süzgeç paneli hâlâ
            gizli: Takvim yalnızca metin süzgecini okuyor, tür/seviye/şehir
            seçimlerini yok sayıyor — çalışmayan denetim göstermemek için.
          */}
          {!savedOnly && (
            /*
              ARAMA SATIRI İLAN SAYFASIYLA AYNI ÖLÇÜDE

              Kutu `py-2.5 rounded-xl` idi, ilan sayfasındaki ise
              `py-3.5 rounded-2xl` — yan yana konunca buradaki gözle
              görülür biçimde bastırılmış duruyordu. İkon da 3 piksel
              içerideydi (`left-3` / `left-4`).

              Düğme yüksekliği SABİT DEĞİL, kutudan geliyor (`self-stretch`).
              İlan sayfasındaki yorumda gerekçesi yazılı: sabit piksel
              verilince kutu bir piksel farklı çıkıyor ve yan yana iki
              çerçevenin alt kenarı kayıyor.

              `mb-3` KALKTI — ÇİZGİ HİZASI İÇİN

              Ölçüldü: ilan sayfasında arama kutusunun altıyla çizgi arası
              16 piksel, burada 29'du. Fark bu `mb-3`ten (12) geliyordu;
              sütunun kendi `pb-4`ü (16) zaten alttaki boşluğu veriyor ve
              ikisi üst üste biniyordu.

              Kardeşler arası boşluğu sütunun `space-y-4`ü veriyor; buraya
              ayrıca margin yazmak o sistemi ikinci kez uygulamak olur.
            */
            <div className="lg:hidden flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  aria-label="Fırsat ara"
                  value={filters.query}
                  onChange={(e) => set({ query: e.target.value })}
                  placeholder="Burs veya fırsat ara"
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-11 pr-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-600 focus:outline-none"
                />
                {filters.query && (
                  <button
                    type="button"
                    onClick={() => set({ query: '' })}
                    aria-label="Aramayı temizle"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/*
                DÜĞME İKON, YAZI DEĞİL

                "Filtreler" yazısı arama kutusundan yer çalıyordu: ilan
                sayfasında aynı yerde yalnızca ikon var ve arama kutusu
                satırın tamamına yakınını alıyor. Erişilebilir ad
                `aria-label`de duruyor, yani yazının kalkması ekran
                okuyucuda bir şey kaybettirmiyor.

                Açık süzgeç sayısı rozet olarak köşede kalıyor — düğme
                ikona dönünce "kaç süzgeç açık" bilgisi kaybolmasın diye.
              */}
              <button
                type="button"
                onClick={() => setPanelAcik(true)}
                aria-label={
                  aktifSuzgecSayisi > 0
                    ? `Filtreler (${aktifSuzgecSayisi} açık)`
                    : 'Filtreler'
                }
                /*
                  Yükseklik `self-stretch` ile arama kutusundan geliyor,
                  sabit piksel DEĞİL — ilan sayfasında bunun gerekçesi
                  ölçülerek yazılmış: sabit değerde iki çerçevenin alt
                  kenarı bir piksel kayıyor.

                  İkon huni değil kaydırıcı: ilan sayfasında da öyle ve
                  huni "sonuçları ele" derken kaydırıcı "ayarları aç"
                  diyor — buradaki düğme bir panel açıyor.
                */
                className={`relative flex w-[52px] shrink-0 cursor-pointer items-center justify-center self-stretch rounded-2xl border transition-colors ${
                  aktifSuzgecSayisi > 0
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                {aktifSuzgecSayisi > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-extrabold text-white">
                    {aktifSuzgecSayisi}
                  </span>
                )}
              </button>
            </div>
          )}
          {/*
            HIZLI ÇİP SATIRI KALDIRILDI

            "Burs", "KYK", "Lisans" gitti; "Yurtdışı" ise üstteki sekme
            grubuna taşındı. Çipler tür/seviye süzgeciydi ve karşılıkları
            zaten "Filtreler" panelinde duruyor ("Tüm türler", "Tüm eğitim
            seviyeleri"). Aynı süzgeci hem panelde hem satırda vermek,
            mobilde başlıkla liste arasına üçüncü bir şerit koyuyordu.

            Yurtdışı ayrı tutuldu çünkü kendi adresi var
            (/yurtdisi-firsatlari); o bir süzgeç değil, paylaşılabilir bir
            görünüm — yeri sekme grubu.
          */}

          <div className="hidden lg:block">
            {!savedOnly && sekme !== 'takvim' && suzgecler}
          </div>

          {/*
            AYIRICI — İLAN SAYFASINDAKİNİN AYNISI

            Önce sütunun `border-b`siydi: düz, 1 piksellik bir hairline.
            İlan sayfasındaki ise farklı ve daha yumuşak duruyor; ölçüldü:
            2 piksel yüksekliğinde, 16 piksel yuvarlatılmış, beyaz zeminli,
            1 piksel kenarlı ve `shadow-xs` gölgeli bir kapsül. Yumuşaklığı
            yuvarlatmadan ve gölgeden geliyor, çizginin kendisinden değil.

            Orada bu şekil kasıtlı çizilmiş bir ayırıcı DEĞİL — kapalı
            filtre panelinin iki piksele çökmüş kabı. Görsel sonuç
            beğenildiği için burada bilerek ve açıkça bir ayırıcı olarak
            yazıldı; kaza eseri oluşan bir biçime bel bağlamamak için.

            `box-sizing: border-box` sayesinde `h-0.5` kenarlıklarla
            birlikte tam 2 piksel kalıyor.
          */}
          <div
            aria-hidden
            className="h-0.5 rounded-2xl border border-gray-200 bg-white shadow-xs lg:hidden"
          />
        </div>

        {/* ------------------------------------------- orta: kart akışı --- */}
        {/*
          FEED 6 SÜTUNDAN 9'A ÇIKTI

          Liste yatay şeritlere dönünce 6 sütun (660 px) yetmiyordu:
          340 piksellik karttan yalnızca 1,85 tanesi sığıyor, yani şerit
          "büyük kartlar" değil "sıkışmış iki kart" gibi duruyordu
          (ölçüldü). 9 sütunda şerit ~985 piksele çıkıyor ve üç kart
          rahatça giriyor.

          Sağdaki kategori sütunu kaybolmadı, şeritlerin altına indi —
          yardımcı içerik, kararın kendisi değil.
        */}
        {/*
          FEED 6 SÜTUN — İŞ & STAJ İLANLARIYLA AYNI

          Şerit düzenindeyken 9 sütuna çıkarılmıştı: 340 piksellik kapak
          kartından 6 sütuna yalnızca 1,85 tanesi sığıyordu. Liste dikey
          satır kartlarına dönünce o gerekçe kalktı ve sağdaki kategori
          sütunu yeniden yanına gelebildi — ilan sayfasındaki üç kolonlu
          düzenin aynısı.
        */}
        <div className="lg:col-span-6 space-y-4 min-w-0">
          {/*
            LİSTE KONTROL SATIRI

            Üç denetim tek yerde: görünüm seçici (Tüm fırsatlar /
            Takvim / Sana uygun) ve "süresi dolanlar" anahtarı. Üçü de
            aynı soruyu cevaplıyor — AŞAĞIDA NE LİSTELENSİN. Önce
            sekmeler sayfa başlığının yanındaydı, "süresi dolanlar" ise
            ayrı bir satırdaydı; ikisi ilgisiz görünüyordu.

            Sekmeler solda, anahtar sağda: biri asıl görünümü seçiyor,
            diğeri o görünüme bir ekleme yapıyor. `justify-between`
            ikisini ayırıyor, `flex-wrap` dar ekranda alt alta indiriyor.
          */}
          {/*
            Kapsül YALNIZCA seçilecek birden çok görünüm varken çiziliyor.
            "Yurtdışı" ve "Takvim" çıkınca geriye tek düğme kalabiliyor
            ("Sana uygun" yalnızca doğrulanmış eşleşme varken ekleniyor);
            tek seçenekli bir görünüm seçici, seçim varmış izlenimi veren
            boş bir kontroldür.
          */}
          {!savedOnly && hazirSayisi > 0 && (
              <nav
                aria-label="Fırsat görünümü"
                className="flex max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-full bg-gray-100 p-0.5 text-[12px] font-bold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {(
                  [
                    /* Hazır kayıt yoksa sekme hiç çizilmiyor — bkz. hazirSayisi. */
                    ...((hazirSayisi > 0
                      ? [['/bana-uygun', 'Sana uygun']]
                      : []) as [string, string][]),
                    ['/firsatlar', 'Tüm fırsatlar'],
                    /*
                      "Yurtdışı" SEKMEDEN KALDIRILDI

                      Süzgeç paneli bölümlere ayrılınca aynı seçim orada
                      "Tür → Yurtdışı" olarak, üstelik kaç kayıt olduğu
                      yazılı biçimde belirdi. Sekme onun kopyasıydı.

                      Adres kaybolmadı: /yurtdisi-firsatlari hâlâ
                      çalışıyor ve sağ sütundaki kategori düğmesi oraya
                      gidiyor — yalnızca sekme kapsülünden çıktı.
                    */
                    /*
                      "Takvim" SEKMEDEN KALDIRILDI

                      Takvimin listeye göre tek fazlası açılış tarihleriydi
                      ("4 Eyl · BAŞVURU AÇILIYOR"); o bilgi artık kartın
                      içinde. Geriye aynı 33 kaydı başka biçimde çizen bir
                      ikinci görünüm kalıyordu.

                      ROTA SİLİNMEDİ. /firsat-takvimi üç rehber yazısından
                      bağlantı alıyor ("açılış ve son başvuru günleri ay ay
                      duruyor") ve onrender.mjs tarafından ön-render edilen,
                      yani indekslenmiş bir sayfa. Rotayı kaldırmak o
                      bağlantıları 404 yapardı; sayfa duruyor, yalnızca
                      sekme kapsülünden çıktı.
                    */
                  ] as [string, string][]
                ).map(([yol, etiket]) => (
                  <button
                    key={yol}
                    /* Sekme değişince arama ve süzgeçler adresle birlikte taşınıyor. */
                    onClick={() => onNavigate(`${yol}${serializeOpportunityFilters(filters)}`)}
                    className={`flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-3 transition-colors cursor-pointer ${
                      sekmeAktif(yol)
                        ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)]'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {etiket}
                  </button>
                ))}
              </nav>
          )}
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
              {/*
                LİSTE ÖNÜ SATIRI — İKİ BLOK DEĞİL BİR SATIR

                "35 fırsat gösteriliyor" tam genişlikte bir satırdı; altına
                da anahtarlı, çerçeveli, 42 piksellik bir düğme geliyordu.
                İkisi birlikte liste başlamadan önce üçüncü bir kontrol
                bloğu kuruyordu.

                Artık tek satır: solda sayı (küçük meta), sağda kontroller
                (küçük metin düğmeleri). Anahtarın görsel yalancı-switch'i
                kalktı — `aria-pressed` durumu zaten taşıyor ve seçiliyken
                düğme koyulaşıyor, yani durum renk+kalınlıkla görünüyor.
              */}
              {/*
                SAYI BURADAN KALKTI — AŞAĞIDAKİ BÖLÜM ETİKETİNDE ZATEN VAR

                Bu satır "33 fırsat" diyordu, hemen altındaki bölüm etiketi
                de "FIRSATLAR (33)". Aynı sayı iki satır arayla iki kez
                yazılıyordu (ekran görüntüsünde yan yana görülüyor).
                Geriye yalnızca görünüm anahtarları kaldı; onlar sağa değil
                sola yaslanıyor artık, çünkü solda dengeleyecek bir şey yok.
              */}
              {/*
                "Takvimsizler (30)" buradan kaldırıldı — süzgeç panelindeki
                "Takvimi açıklanmayanlar" anahtarına taşındı. Bir süzgeci
                liste başlığının yanına iliştirmek, onu diğer süzgeçlerden
                ayrı bir şeymiş gibi gösteriyordu.

                Geriye tek anahtar kaldı ve satır ARTIK KOŞULLU: süresi
                dolan kayıt yokken sarmalayıcı boş çiziliyor ve üstündeki
                `space-y-4` yüzünden 16 piksel ölü boşluk bırakıyordu
                (ölçüldü — şu an kapalı kayıt yok ve satır boştu).
              */}
              {/*
                DİKEY LİSTE — İŞ & STAJ İLANLARIYLA AYNI DÜZEN

                Bir ara kapak görselli yatay şeritlere çevrilmişti. Şerit
                keşif için iyi ama burs KARŞILAŞTIRILAN bir şey: tutar, son
                başvuru tarihi ve şartlar yan yana okunuyor. Yatay şeritte
                iki bursu aynı anda görmek mümkün değildi ve 27 kayda
                ulaşmak on ok tıklaması sürüyordu.

                İlan listesiyle aynı düzen: tek kolon, alt alta satır
                kartları. Bölüm etiketi de oradaki biçimde — küçük, büyük
                harfli, sayıyı parantez içinde veriyor.

                DURUM GRUPLAMASI KALKTI
                Aynı ayrım sol sütundaki sayaçlarda zaten var ve orada
                TIKLANABİLİR süzgeç: "27 açık" yazısına basınca liste ona
                düşüyor. Aynı ayrımı ikinci kez başlıklara bölmek, tek
                listeyi üçe kesip karşılaştırmayı yeniden zorlaştırırdı.
              */}
              {/*
                "FIRSATLAR (33)" ETİKETİ KALDIRILDI

                Sayı zaten iki yerde daha duruyordu: sol sütundaki
                sayaçlarda ("27 açık · 6 yakında") ve listenin kendisinde.
                Üstelik hemen üstündeki kontrol satırıyla birlikte iki
                ayrı şerit oluşturuyor, kartları aşağı itiyordu.

                "Kurumların kendi sayfalarından derlendi" notu da onunla
                gitti: aynı bilgi her kartın üstünde "Resmî kaynak"
                rozetiyle ve zaten daha güçlü biçimde söyleniyor.
              */}
              <div className="space-y-3">
                {filtered.map((item: Opportunity) => (
                  <Card
                    girisGerekli={!student}
                    onRequireLogin={onRequireLogin}
                    key={item.id}
                    item={item}
                    onNavigate={onNavigate}
                    fit={student ? opportunityFit(item, student) : null}
                  />
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
        {/*
          Feed 9 sütuna çıkınca bu blok yan tarafta değil ALTTA duruyor:
          `col-start-4` ile şeritlerin hizasına oturuyor. `sticky` kalktı —
          kendi satırında yapışacak bir şey yok.
        */}
        {/*
          Sağ sütun feed'in ALTINDA değil YANINDA. Şerit düzeni 9 sütun
          isteyince buraya inmişti; liste 6 sütuna dönünce yerine çıktı.
          İlan sayfasındaki gibi kaydırırken yapışık kalıyor.
        */}
        <div className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          {/*
            SAYAÇ KARTI — İLAN SAYFASINDAKİYLE AYNI

            Kart biçimi oradan birebir alındı: `grid-cols-3`, aynı kap
            (`rounded-2xl border border-gray-200 bg-white px-4 py-3.5`),
            rakam `text-2xl font-black tabular-nums`, etiket `text-[11px]`.
            Bu bilgi burada ince gri bir metin satırıydı; iki sayfa aynı
            şeyi iki ayrı ağırlıkta söylüyordu.

            FARK: buradaki kutular DÜĞME. İlan sayfasındakiler yalnızca
            gösteriyor, buradakiler aynı zamanda durum süzgeci — "27 açık"a
            basınca liste ona düşüyor. Görünüm aynı, işlev fazladan.

            Üçüncü kutu "Takvimsiz": ilan sayfasındaki üçüncü kutunun
            (Şehir) buradaki karşılığı yok, ama takvimi açıklanmamış kayıt
            sayısı gerçek ve varsayılan listede görünmediği için söylenmeye
            değer. Sıfırsa kutu hiç çizilmiyor.
          */}
          {state === 'ready' && !savedOnly && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
                {[
                  {
                    etiket: 'Açık',
                    deger: gruplar.acik.length,
                    aktif: durumSuzgeci === 'acik',
                    onClick: () => durumSec(durumSuzgeci === 'acik' ? '' : 'acik'),
                  },
                  {
                    etiket: 'Yakında',
                    deger: gruplar.yakinda.length,
                    aktif: durumSuzgeci === 'yakinda',
                    onClick: () => durumSec(durumSuzgeci === 'yakinda' ? '' : 'yakinda'),
                  },
                  {
                    etiket: 'Takvimsiz',
                    deger: gruplar.takvim_bekleniyor.length,
                    aktif: takvimsizGoster,
                    onClick: () => set({ takvimsiz: !takvimsizGoster }),
                  },
                ]
                  .filter((kutu) => kutu.deger > 0)
                  .map((kutu) => (
                    <button
                      key={kutu.etiket}
                      type="button"
                      onClick={kutu.onClick}
                      aria-pressed={kutu.aktif}
                      className="min-w-0 cursor-pointer rounded-lg py-0.5 text-center transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span
                        className={`block text-2xl font-black leading-none tabular-nums ${
                          kutu.aktif ? 'text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        {kutu.deger}
                      </span>
                      <span
                        className={`mt-1 block truncate text-[11px] font-semibold ${
                          kutu.aktif ? 'text-blue-700' : 'text-gray-500'
                        }`}
                      >
                        {kutu.etiket}
                      </span>
                    </button>
                  ))}
              </div>

              {/*
                Kapanış uyarısı kartın DIŞINDA: bir sayaç değil, zamana
                bağlı bir uyarı. Kartın içine üçüncü bir kutu gibi
                girseydi "kaç tane var" sorusunun cevabı sanılırdı.
              */}
              {yarinKapananlar.length > 0 && (
                <p className="flex items-center gap-1.5 px-1 text-[12px] font-semibold text-amber-800">
                  <AlarmClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {closingSoonLabel(yarinKapananlar.length)}
                </p>
              )}
            </div>
          )}

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
  SAYAÇ ROZETTEN SATIRA İNDİ

  Üç dolgulu mavi rozetti ve başlık kartının içinde ikinci bir görsel
  ağırlık kuruyordu. Rakam ve etiket aynı bilgiyi taşıyor; kutu taşımıyor.
  Artık satır içi bir düğme: seçiliyken altı çiziliyor ve rengi koyuluyor,
  seçili değilken sıradan metin gibi duruyor.

  İŞLEVİ AYNI: ikisi de bir SÜZGEÇ — rakamın gösterdiği kümeyi listede
  açıyor. Rozetin gitmesi süzgeci götürmedi.
*/
/*
  `Cip` bileşeni silindi: tek kullanıcısı olan hızlı çip satırı kaldırıldı.
  Kullanılmayan bir bileşeni bırakmak, sonradan bakanı "bir yerde çiziliyor"
  diye aratır.
*/

const Suzgecler: React.FC<{
  filters: {
    query: string;
    type: string;
    level: string;
    place: string;
    openOnly: boolean;
    takvimsiz: boolean;
    arsiv: boolean;
  };
  set: (patch: any) => void;
  temizle: () => void;
  /** Takvimi açıklanmamış kayıt sayısı; sıfırsa o anahtar hiç çizilmiyor. */
  takvimsizSayisi: number;
  /** Süresi dolmuş kayıt sayısı; sıfırsa o anahtar hiç çizilmiyor. */
  kapaliSayisi: number;
  /*
    GERÇEK SAYIMLAR

    Her seçeneğin yanındaki sayı `items` üzerinden hesaplanıyor (bkz.
    parent'taki `sayimlar`). Sıfır olan seçenek — seçili değilse —
    hiç çizilmiyor: sonucu boş olduğu baştan belli bir süzgeci sunmak,
    kullanıcıya olmayan bir içerik vaat etmek olur.
  */
  sayimlar: {
    tur: Record<string, number>;
    seviye: Record<string, number>;
    acik: number;
    yakinda: number;
  };
  durumSuzgeci: '' | 'acik' | 'yakinda';
  durumSec: (yeni: '' | 'acik' | 'yakinda') => void;
  acikSuzgecSayisi: number;
}> = ({
  filters,
  set,
  temizle,
  takvimsizSayisi,
  kapaliSayisi,
  sayimlar,
  durumSuzgeci,
  durumSec,
  acikSuzgecSayisi,
}) => (
  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    {/*
      Başlık satırı ilan sayfasındaki gibi: ikon + "Filtreler", sağda açık
      süzgeç sayısı ve temizleme. Panel geniş ekranda hep açık olduğu için
      burada açma-kapama oku yok.
    */}
    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
      <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-500" />
      <span className="text-sm font-bold text-gray-900">Filtreler</span>
      {acikSuzgecSayisi > 0 && (
        <>
          <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">
            {acikSuzgecSayisi}
          </span>
          <button
            type="button"
            onClick={temizle}
            className="ml-auto shrink-0 cursor-pointer text-xs font-bold text-blue-600 hover:underline"
          >
            Temizle
          </button>
        </>
      )}
    </div>

    <div className="divide-y divide-gray-100">
      <FiltreBlogu baslik="Ara">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            aria-label="Fırsat ara"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Burs veya fırsat ara"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </FiltreBlogu>

      {/*
        DURUM

        "Yalnızca açık olanlar" tek bir anahtardı ve "yakında açılacaklar"
        seçilemiyordu — o küme yalnızca sayaçtan süzülebiliyordu. Üçü aynı
        soruyu cevapladığı için tek bir seçenek grubu oldu.
      */}
      <FiltreBlogu baslik="Durum">
        <div className="space-y-0.5">
          <SecenekSatiri
            tip="radio"
            etiket="Tümü"
            secili={durumSuzgeci === ''}
            onChange={() => durumSec('')}
          />
          <SecenekSatiri
            tip="radio"
            etiket="Başvuru açık"
            adet={sayimlar.acik}
            secili={durumSuzgeci === 'acik'}
            onChange={() => durumSec('acik')}
          />
          <SecenekSatiri
            tip="radio"
            etiket="Yakında açılıyor"
            adet={sayimlar.yakinda}
            secili={durumSuzgeci === 'yakinda'}
            onChange={() => durumSec('yakinda')}
          />
        </div>
      </FiltreBlogu>

      <FiltreBlogu baslik="Tür">
        <div className="space-y-0.5">
          <SecenekSatiri
            tip="radio"
            etiket="Tüm türler"
            secili={filters.type === ''}
            onChange={() => set({ type: '' })}
          />
          {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([value, label]) => {
            const adet = sayimlar.tur[value] ?? 0;
            if (adet === 0 && filters.type !== value) return null;
            return (
              <SecenekSatiri
                key={value}
                tip="radio"
                etiket={label as string}
                adet={adet}
                secili={filters.type === value}
                onChange={() => set({ type: value })}
              />
            );
          })}
        </div>
      </FiltreBlogu>

      <FiltreBlogu baslik="Eğitim seviyesi">
        <div className="space-y-0.5">
          <SecenekSatiri
            tip="radio"
            etiket="Tüm seviyeler"
            secili={filters.level === ''}
            onChange={() => set({ level: '' })}
          />
          {['Lise', 'Ön lisans', 'Lisans', 'Yüksek Lisans', 'Doktora'].map((seviye) => {
            const adet = sayimlar.seviye[seviye] ?? 0;
            if (adet === 0 && filters.level !== seviye) return null;
            return (
              <SecenekSatiri
                key={seviye}
                tip="radio"
                etiket={seviye}
                adet={adet}
                secili={filters.level === seviye}
                onChange={() => set({ level: seviye })}
              />
            );
          })}
        </div>
      </FiltreBlogu>

      <FiltreBlogu baslik="Şehir veya ülke">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            aria-label="Şehir veya ülke"
            value={filters.place}
            onChange={(e) => set({ place: e.target.value })}
            placeholder="Şehir veya ülke"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </FiltreBlogu>

      {/*
        TAKVİMİ AÇIKLANMAYANLAR

        Varsayılan liste bu kayıtları gizliyor ve panelde karşılığı yoktu;
        anahtar liste başlığının yanında ayrı bir satırdaydı. Yeri burası —
        diğer süzgeçlerin yanı. Sayı sıfırken çizilmiyor.
      */}
      {(takvimsizSayisi > 0 || kapaliSayisi > 0) && (
        <FiltreBlogu baslik="Ayrıca göster">
          <div className="space-y-0.5">
            {takvimsizSayisi > 0 && (
              <SecenekSatiri
                tip="checkbox"
                etiket="Takvimi açıklanmayanlar"
                adet={takvimsizSayisi}
                secili={filters.takvimsiz}
                onChange={() => set({ takvimsiz: !filters.takvimsiz })}
              />
            )}
            {/*
              SÜRESİ DOLANLAR — LİSTE ÜSTÜNDEN BURAYA

              Liste başlığının yanında ayrı bir düğmeydi. Süzgeç paneli
              bölümlere ayrılınca oranın tek kalan sakini oldu; yeri
              zaten burası, diğer görünürlük anahtarının yanı.

              İki anahtar birbirini dışlıyor: arşiv açılınca takvimsiz
              kapanıyor (`setArsivGoster`'daki kural). Süresi dolmuş
              kayıtların hepsinin tarihi zaten var, "takvimi
              açıklanmayan" ayrımı orada anlamsız.
            */}
            {kapaliSayisi > 0 && (
              <SecenekSatiri
                tip="checkbox"
                etiket="Süresi dolanlar"
                adet={kapaliSayisi}
                secili={filters.arsiv}
                onChange={() => set({ arsiv: !filters.arsiv, takvimsiz: false })}
              />
            )}
          </div>
        </FiltreBlogu>
      )}
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
/**
 * Fırsat listesi kartı.
 *
 * `export` YALNIZCA geliştirme fikstürü için: kart uzun başlık, uzun
 * resmî kaynak etiketi, tarihsiz kayıt gibi durumlarda tarayıcıda hiç
 * görülmeden değişiyordu ve üretimde bu varyasyonların hepsi aynı anda
 * bulunmuyor. Üretim yolunda yalnızca bu dosya kullanıyor.
 */
export const Card: React.FC<{
  item: Opportunity;
  onNavigate: (p: string) => void;
  fit: { durum: string; not: string | null; kesin: boolean } | null;
  /*
    `saved` / `onSave` KALDIRILDI

    Takip düğmesi karttan çıkınca bu iki özellik de gereksiz kaldı.
    Kullanılmayan bir özelliği bırakmak, sonradan okuyanı "kart takibi
    biliyor ama göstermiyor" diye yanıltır. Takip detay sayfasında.
  */
  /*
    Dış başvuru bağlantısı misafirde giriş penceresini açıyor; kartın geri
    kalanı açık kalıyor (bkz. ui/DisBaglanti).
  */
  girisGerekli: boolean;
  onRequireLogin: () => void;
}> = ({ item, onNavigate, fit, girisGerekli, onRequireLogin }) => {
  const cta = opportunityCta(item);
  const durum = opportunityStatus(item);
  const tutar = opportunityAmount(item);
  /* `ton` artık YALNIZCA takvimi açıklanmamış kutuda kullanılıyor; kalan
     durumların rengini zaman tüpü kendi taşıyor. */
  const ton = (ACILIYET_SINIFLARI as any)[deadlineTone(item)] ?? ACILIYET_SINIFLARI.notr;
  const yer = [...item.cities, ...item.countries];
  const seviye = item.educationLevels.length ? item.educationLevels.join(', ') : null;

  /*
    Açılış tarihi yalnızca GELECEKTEYSE gösteriliyor — takvimin kendi
    kuralı (opportunityCalendar). Gün karşılaştırması yerel saatten
    etkilenmesin diye tarihler güne yuvarlanıyor.
  */
  const acilisTarihi = (() => {
    if (!item.applicationStartAt) return null;
    const acilis = new Date(item.applicationStartAt);
    if (Number.isNaN(acilis.getTime())) return null;
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    return acilis >= bugun ? kisaTarih(item.applicationStartAt) : null;
  })();

  /*
    BOŞLUK BİR KADEME DARALDI

    Öğeler arası 12 px'ti ve kart yedi ayrı bloktan oluşuyor; her
    aralıkta bir kademe fazlalık toplanınca kart gereksiz uzuyordu.
    10 px hâlâ nefes alıyor ama blokları birbirine yaklaştırıyor.
  */
  return (
    /*
      KART İŞ & STAJ İLAN KARTIYLA AYNI

      Kök sınıflar, iç boşluk, logo ölçüsü ve tipografi InternshipCard'dan
      birebir alındı: aynı `rounded-2xl`, aynı `p-3.5 sm:p-4.5`, aynı
      `hover:border-blue-500`, aynı `gap-3 sm:gap-3.5`. İki liste sayfası
      farklı iç boşluk ve farklı kart gölgesi kullanıyordu; aynı üründe
      iki ayrı kart dili oluyordu.

      Sıra da oradaki gibi: önce kurum adı (mavi, küçük), sonra asıl
      başlık (büyük, koyu). Burada tersiydi — üstte tür etiketi, altta
      başlık, en altta kurum. İlan kartında gözün ilk gördüğü şey kimin
      ilanı olduğu; burs kartında da öyle olmalı.
    */
    <article className="group flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 transition-all duration-150 hover:border-blue-500 hover:shadow-xs sm:gap-3.5 sm:p-4.5">
      <div className="flex w-full min-w-0 flex-1 items-start gap-3 sm:gap-3.5">
        {/*
          Logo ölçüsü ListingLogo'dan geliyor (56×56, dairesel). İlan
          kartındaki halka burada yok: halka uyum puanını gösteriyor,
          bursta öyle bir puan hesaplanmıyor. Boş bir halka çizmek
          olmayan bir ölçümü varmış gibi gösterirdi.
        */}
        <div className="shrink-0">
          <ListingLogo name={item.organizationName} logoUrl={item.organizationLogoUrl} />
        </div>
        <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-bold text-blue-600 sm:text-base">
              {item.organizationName}
            </span>
            {item.verifiedAt && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3 h-3" />
                Resmî kaynak
              </span>
            )}
          </div>
          <h2 className="line-clamp-2 text-base font-bold leading-snug text-gray-900 sm:text-lg">
            {item.title}
          </h2>
          <span className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-700">
            {opportunityTypeLabel(item.opportunityType)}
          </span>
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
        <>
          {/*
            BAŞVURU AÇILIŞ TARİHİ — TAKVİMDEN KARTA

            Bu bilgi yalnızca takvim görünümünde vardı ("4 Eyl · BAŞVURU
            AÇILIYOR"). Liste yalnızca son başvuruyu gösteriyordu, yani
            kartına bakan öğrenci "yakında" yazısını görüyor ama NE ZAMAN
            açılacağını göremiyordu — cevap ayrı bir sayfadaydı.

            Yalnızca GELECEKTEKİ açılışta çiziliyor; takvimdeki kuralın
            aynısı (lib/firsat-degerlendirme.mjs → opportunityCalendar).
            Geçmiş bir açılış tarihi öğrencinin yapabileceği bir şey
            söylemiyor, üstelik "açık" kartında kafa karıştırırdı.
          */}
          {acilisTarihi && (
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-blue-800">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {acilisTarihi} tarihinde başvuruya açılıyor
            </p>
          )}
          <ZamanTupu item={item} />
        </>
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

      {/*
        İKİ AKSİYON, ÜÇ DEĞİL

        Alt satırda "Detayı gör", "Takip et" ve "Resmî kaynak" birlikte
        duruyordu; üçü 390 pikselde satıra sığmayıp alt alta düşüyor ve
        kartı uzatıyordu. Daha kötüsü karar dağılıyordu: kullanıcı hangi
        düğmenin ana yol olduğunu seçmek zorunda kalıyordu.

        "Takip et" karttan kalktı — SİLİNMEDİ: detay sayfasında kapak
        görselinin üstündeki yer imi düğmesi olarak duruyor ve
        /kaydedilen-firsatlar sayfası aynen çalışıyor. Kartın işi karar
        vermek değil, içeri davet etmek.

        AYIRICI ÇİZGİ
        Zaman tüpü de yatay bir çubuk; hemen altına düğmeler gelince iki
        yatay öğe birbirine karışıyordu. Çok açık gri tek piksellik bir
        çizgi ikisini ayırıyor — tablo çizgisi gibi değil, yalnızca
        boşluğu düzenleyen bir eşik.
      */}
      <div className="mt-auto border-t border-gray-100 pt-3">
        <div className={`grid gap-2 ${cta ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            onClick={() => onNavigate(`/firsatlar/${item.slug}`)}
            className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer"
          >
            <span className="truncate">Detayı gör</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
          {cta && (
            <DisBaglanti
              href={cta.adres}
              girisGerekli={girisGerekli}
              onGirisGerekli={onRequireLogin}
              kapiEtiketi="Başvurmak için giriş yap"
              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              {/* Kartta kısa etiket: uzun hâli düğmeyi iki satıra bölüyordu. */}
              <span className="truncate">
                {girisGerekli ? 'Giriş yap' : (cta.kisaEtiket ?? cta.etiket)}
              </span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </DisBaglanti>
          )}
        </div>
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
