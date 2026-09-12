import React from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe2,
  GraduationCap,
  HandCoins,
  Layers,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type { StudentProfile } from '../types';
import { ListingLogo } from './ListingLogo';
import { ZamanTupu } from './ZamanTupu';
import { DisBaglanti, FiltreBlogu, SecenekSatiri } from '../ui';
import { KonuSeridi } from './KonuSeridi';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { CTA_BIRINCIL, CTA_ORTAK } from '../lib/kart-cta';
import { ODAK_HALKASI } from '../lib/renk-token';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';
import {
  fetchExpiredOpportunities,
  fetchOpportunities,
  fetchSavedOpportunityIds,
  type Opportunity,
} from '../lib/opportunities';
import {
  aktifFirsatSuzgecleri,
  opportunityCta,
  opportunityTypeLabel,
  readOpportunityFilters,
  serializeOpportunityFilters,
  BOS_FIRSAT_SUZGECI,
} from '../lib/opportunity-domain.mjs';
import {
  firsatKategorisi,
  firsatRozetleri,
  FIRSAT_KATEGORILERI,
  KATEGORI_ETIKETLERI,
} from '../lib/firsat-kategori.mjs';
import {
  firsatSirala,
  opportunityAmount,
  opportunityCalendar,
  opportunityFit,
  personalizationReadyCount,
  sehirSartliSayisi,
} from '../lib/firsat-degerlendirme.mjs';
import { kisaTarihMetni } from '../lib/tarih.mjs';

/**
 * Fırsatlar — burs, öğrenci programı, yarışma ve kariyer etkinliği.
 *
 * TÜR DEĞİL KATEGORİ
 * ------------------
 * Süzgeç tek tek TÜR sunuyordu (`scholarship`, `student_support`,
 * `youth_program` …). Göç dört tür daha açınca (hackathon, teknofest,
 * career_day, career_fair) liste on bire çıktı ve hiçbiri öğrencinin
 * kafasındaki soruya karşılık gelmiyordu: kimse "student_support mu
 * youth_program mu" diye aramıyor.
 *
 * Şeritte dört kategori var ve haritası TEK YERDE — lib/firsat-kategori
 * (göçteki `public.firsat_kategori()` ile birebir). KYK beşinci daire
 * değil: bir kurum, bir kategori değil. Burslar seçiliyken "Kaynak: KYK /
 * Diğer kurumlar" süzgeci çıkıyor.
 *
 * ESKİ ADRESLER KOPYA SAYFA DEĞİL
 * -------------------------------
 * /burslar, /kyk, /yurtdisi-firsatlari, /yarismalar, /firsat-takvimi,
 * /bana-uygun ve /kaydedilen-firsatlar hâlâ çalışıyor ve indekslenmiş
 * durumda. Her biri AYNI bileşeni farklı bir başlangıç durumuyla açıyor
 * (`ROTA_BASLANGICI`); ayrı bileşen yazmak aynı hatanın yedi kopyasını
 * üretirdi.
 *
 * SÜRESİ DOLANLAR AYRI SORGUDA
 * ----------------------------
 * Ana liste sunucudan `status=published` + son tarihi geçmemiş olarak
 * geliyor (lib/opportunities). Arşiv `status=expired` ile AYRI çağrılıyor
 * ve yalnızca kullanıcı açtığında; kapanmış bir başvuru, açık listede
 * öğrencinin yapabileceği bir şey değil.
 */

/*
  ESKİ ADRES → BAŞLANGIÇ DURUMU

  Adres bir görünüm, süzgeç bir durum. Bu tablo ikisini bağlıyor: adrese
  girildiğinde süzgeçler o hâle kuruluyor. Yedi ayrı bileşen yazmak aynı
  düzeltmeyi yedi kez yapmayı gerektirirdi.
*/
const ROTA_BASLANGICI: Record<string, Partial<typeof BOS_FIRSAT_SUZGECI>> = {
  '/firsatlar': {},
  '/burslar': { kategori: 'burslar' },
  '/kyk': { kategori: 'burslar', kaynak: 'kyk' },
  '/yurtdisi-firsatlari': { kategori: 'programlar', bolge: 'yurtdisi' },
  '/yarismalar': { kategori: 'yarismalar' },
  '/firsat-takvimi': { takvim: true },
  '/bana-uygun': { banaUygun: true },
  '/kaydedilen-firsatlar': { kaydedilen: true },
};

/* Belge başlığı görünüme göre; paylaşılan bağlantı ve sekme adı için. */
const ROTA_BASLIGI: Record<string, string> = {
  '/burslar': 'Burslar',
  '/kyk': 'KYK bursları ve kredileri',
  '/yurtdisi-firsatlari': 'Yurt dışı öğrenci programları',
  '/yarismalar': 'Öğrenci yarışmaları',
  '/firsat-takvimi': 'Fırsat takvimi',
  '/bana-uygun': 'Sana uygun fırsatlar',
  '/kaydedilen-firsatlar': 'Kaydettiğin fırsatlar',
};

/*
  KATEGORİ → İKON

  Şerit rehberdekiyle aynı bileşen (KonuSeridi); değişen tek şey ikon
  haritası ve sayının yanındaki ad. Anahtarlar `FIRSAT_KATEGORILERI`.
*/
const KATEGORI_IKONLARI: Record<string, React.ComponentType<{ className?: string }>> = {
  burslar: HandCoins,
  programlar: GraduationCap,
  yarismalar: Trophy,
  'kariyer-etkinlikleri': Building2,
};

/*
  Tarih biçimi `lib/tarih` üzerinden. Elle yazılmış biçimlendirici saat
  dilimi vermiyordu: `application_deadline` saatsiz bir takvim günü ve
  `new Date('2026-09-06')` UTC gece yarısı demek — UTC'nin batısındaki
  okuyucuda 5 Eylül görünüyordu. Son başvuruda bu bir gün kaybettirir.
*/
const kisaTarih = (value?: string) => kisaTarihMetni(value, { yil: false });

const kucult = (metin: string) => String(metin ?? '').toLocaleLowerCase('tr-TR');

/**
 * Kayıt yurt dışına mı işaret ediyor?
 *
 * Ölçüt DAR ve açık: ülke alanında Türkiye dışında bir ülke yazıyor mu.
 * "Ülke alanı boş = Türkiye" bir varsayım olurdu; bu yüzden süzgeç boş
 * alanlı kayıtlar hakkında bir iddia taşımıyor, onları yalnızca "Yurt
 * dışı" tarafına KOYMUYOR.
 */
const yurtDisiMi = (item: Opportunity) =>
  (item.countries || []).some((ulke) => {
    const ad = kucult(ulke);
    return ad !== '' && ad !== 'türkiye' && ad !== 'turkey' && ad !== 'tr';
  });

type Suzgec = typeof BOS_FIRSAT_SUZGECI;

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
  /* "Yeniden dene" bunu artırıyor; yükleme etkisi buna bağlı. */
  const [deneme, setDeneme] = React.useState(0);

  /* Arşiv AYRI sorgu ve ayrı durum: ana liste onu beklemeden çiziliyor. */
  const [arsivKayitlari, setArsivKayitlari] = React.useState<Opportunity[]>([]);
  const [arsivDurumu, setArsivDurumu] = React.useState<'kapali' | 'loading' | 'ready' | 'error'>(
    'kapali'
  );
  /* Arşivin kendi "yeniden dene" sayacı: ana listeyi boşuna çekmiyor. */
  const [arsivDenemesi, setArsivDenemesi] = React.useState(0);

  const [filters, setFilters] = React.useState<Suzgec>(() => ({
    ...BOS_FIRSAT_SUZGECI,
    ...readOpportunityFilters(window.location.search),
    ...(ROTA_BASLANGICI[path] ?? {}),
  }));

  const set = (patch: Partial<Suzgec>) => setFilters((mevcut) => ({ ...mevcut, ...patch }));

  /*
    ADRES DEĞİŞİNCE BAŞLANGIÇ DURUMU YENİDEN KURULUYOR

    `useState` başlatıcısı bir kez çalışıyor. Sayfa içi geçişte (/kyk'ye
    tıklamak) adres değişiyordu ama süzgeç yerinde kalıyordu: adres ve
    başlık değişiyor, LİSTE DEĞİŞMİYORDU. İlk render atlanıyor, çünkü
    başlatıcı adresi ve sorgu dizesini zaten doğru okudu — burada yeniden
    yazmak paylaşılmış bir /firsatlar?kategori=burslar bağlantısının
    süzgecini silerdi.
  */
  const ilkRender = React.useRef(true);
  React.useEffect(() => {
    if (ilkRender.current) {
      ilkRender.current = false;
      return;
    }
    setFilters({ ...BOS_FIRSAT_SUZGECI, ...(ROTA_BASLANGICI[path] ?? {}) });
  }, [path]);

  /* Süzgeçlerin tek gerçek kaynağı adres: paylaşılabilir ve yenilemeye dayanıklı. */
  React.useEffect(() => {
    const sorgu = serializeOpportunityFilters(filters);
    if (window.location.search !== sorgu) window.history.replaceState({}, '', `${path}${sorgu}`);
  }, [filters, path]);

  React.useEffect(
    () =>
      sayfaMetaAyarla({
        baslik: `${ROTA_BASLIGI[path] ?? 'Fırsatlar'} | StajımVar`,
        aciklama:
          'Bursları, öğrenci programlarını, yarışmaları ve kariyer etkinliklerini tek listede topluyoruz; her kaydın kaynağı kurumun kendi sayfası.',
        yol: path,
      }),
    [path]
  );

  React.useEffect(() => {
    let iptal = false;
    setState('loading');
    Promise.all([
      fetchOpportunities(),
      userId ? fetchSavedOpportunityIds(userId) : Promise.resolve([]),
    ])
      .then(([kayitlar, kimlikler]) => {
        if (iptal) return;
        setItems(kayitlar);
        setSaved(kimlikler);
        setState('ready');
      })
      .catch(() => {
        if (!iptal) setState('error');
      });
    return () => {
      iptal = true;
    };
  }, [userId, deneme]);

  /*
    ARŞİV YALNIZCA AÇILDIĞINDA ÇEKİLİYOR; kapalıyken ağa hiç çıkılmıyor.

    BAĞIMLILIKTA `arsivDurumu` YOK — ve olmamalı. Etkinin ilk işi durumu
    'loading' yapmaktı; durum bağımlılıkta olduğu için React etkiyi hemen
    söküp yeniden kuruyor, sökerken de temizlik `iptal = true` diyordu.
    İkinci kurulumda `arsivDurumu !== 'kapali'` koşulu erken dönüyor ve
    yeni istek hiç açılmıyordu. Ölçülen sonuç: istek 200 dönüyor, cevap
    `iptal` yüzünden atılıyor, ekran sonsuza kadar iskelette kalıyor —
    "Süresi dolanlar" açıkken kart da boş durum da hiç çizilmiyordu.
    StrictMode'un çift kurulumu aynı kilidi mount anında da üretiyor.
  */
  React.useEffect(() => {
    if (!filters.arsiv) return;
    let iptal = false;
    setArsivDurumu('loading');
    fetchExpiredOpportunities()
      .then((kayitlar) => {
        if (iptal) return;
        setArsivKayitlari(kayitlar);
        setArsivDurumu('ready');
      })
      .catch(() => {
        if (!iptal) setArsivDurumu('error');
      });
    return () => {
      iptal = true;
    };
  }, [filters.arsiv, arsivDenemesi]);

  /*
    KİŞİSELLEŞTİRMEYE HAZIR KAYIT SAYISI

    "Bana uygun" ancak doğrulanmış kısıtla anlamlı. Sayı sıfırsa ortada
    kişiselleştirme yok; süzgeci çizmek olmayan bir yetenek sunmak olur.
    Sayı veriye bağlı: doğrulama masasından ilk kayıt damgalandığı anda
    süzgeç kendiliğinden geri geliyor.
  */
  const hazirSayisi = React.useMemo(() => personalizationReadyCount(items), [items]);

  /*
    PROFİL EKSİKSE ORAN UYDURULMUYOR

    Eşleştirme üç boyut okuyor: bölüm, eğitim seviyesi ve şehir. Bölüm ya
    da sınıf boşsa HİÇBİR kayıt eşleşemiyor (burs-uygunluk.mjs); o durumda
    ekran sebebini söyleyip /cv'ye yönlendiriyor — "%60 uyumlu" gibi
    hesaplanmamış bir sayı üretmiyor.

    ŞEHİR BU ŞARTA DAHİL DEĞİL: ikamet ili isteğe bağlı ve şehir şartı
    OLMAYAN fırsatlar onsuz da eşleşiyor. Şehri buraya koymak, ili
    yazmamış herkesin listesini tümden boşaltırdı. Şehir yalnızca şehir
    şartlı kayıtlarda "belirsiz" üretiyor; onun çağrısı aşağıda, liste
    gerçekten boş kaldığında çiziliyor.
  */
  const profilEksik = !student || !student.department || !student.gradeLevel;

  const taban = filters.arsiv ? arsivKayitlari : items;

  /*
    KATILIM BİÇİMİ SÜZGECİ YALNIZCA VERİ VARKEN

    `event_mode` kariyer etkinliklerinde dolu, burs ve programlarda NULL.
    Listede tek bir dolu kayıt yokken "Yüz yüze / Çevrim içi" seçeneği
    sunmak, hiçbir zaman sonuç vermeyecek bir denetim çizmek olurdu.
  */
  const modVar = React.useMemo(() => taban.some((item) => Boolean(item.eventMode)), [taban]);

  /* Kategori dışındaki bütün süzgeçler. Şerit sayıları bunun üstünde. */
  const kategoriDisiSuzgec = React.useCallback(
    (item: Opportunity) => {
      if (filters.kaydedilen && !saved.includes(item.id)) return false;
      if (filters.sonGun) {
        const gun = gunKaldi(item);
        if (gun == null || gun > Number(filters.sonGun)) return false;
      }
      if (
        filters.sehir &&
        ![...item.cities, ...item.countries].some((yer) =>
          kucult(yer).includes(kucult(filters.sehir))
        )
      )
        return false;
      if (filters.bolge === 'yurtdisi' && !yurtDisiMi(item)) return false;
      if (filters.bolge === 'turkiye' && yurtDisiMi(item)) return false;
      if (
        filters.mod === 'yuz-yuze' &&
        !(item.eventMode === 'in_person' || item.eventMode === 'hybrid')
      )
        return false;
      if (
        filters.mod === 'cevrim-ici' &&
        !(item.eventMode === 'online' || item.eventMode === 'hybrid')
      )
        return false;
      if (filters.banaUygun) {
        if (!student) return false;
        const fit = opportunityFit(item, student);
        if (!(fit.durum === 'uygun_olabilir' && fit.kesin)) return false;
      }
      if (filters.query) {
        const metin = `${item.title} ${item.organizationName} ${item.shortDescription}`;
        if (!kucult(metin).includes(kucult(filters.query))) return false;
      }
      return true;
    },
    [filters, saved, student]
  );

  const sayimTabani = React.useMemo(
    () => taban.filter(kategoriDisiSuzgec),
    [taban, kategoriDisiSuzgec]
  );

  /*
    ŞERİT SAYILARI GERÇEK VE LİSTEYLE AYNI TABANDAN

    Sayının tıklanınca tutmadığı bir süzgeç, kullanıcıya olmayan içerik
    vaat eder; bu projede aynı hata bir kez sayaç/liste arasında
    yaşanmıştı. Taban listenin kendi tabanı: kategori dışındaki bütün
    süzgeçler uygulanmış hâli.

    Kaydı olmayan kategori ÇİZİLMİYOR — tıklayınca boş sonuç veren bir
    daire, az seçenek görmekten daha çok güven kaybettiriyor.
  */
  const kategoriSayimlari = React.useMemo(() => {
    const sayim: Record<string, number> = {};
    for (const item of sayimTabani) {
      const kategori = firsatKategorisi(item.opportunityType);
      sayim[kategori] = (sayim[kategori] || 0) + 1;
    }
    return sayim;
  }, [sayimTabani]);

  const seritKategorileri = React.useMemo(
    () =>
      (FIRSAT_KATEGORILERI as string[])
        .map((id) => ({
          id,
          etiket: KATEGORI_ETIKETLERI[id] as string,
          adet: kategoriSayimlari[id] ?? 0,
        }))
        .filter((kategori) => kategori.adet > 0),
    [kategoriSayimlari]
  );

  /* Kaynak süzgecinin sayıları da gerçek: Burslar kategorisinin içinden. */
  const kaynakSayimlari = React.useMemo(() => {
    const burslar = sayimTabani.filter(
      (item) => firsatKategorisi(item.opportunityType) === 'burslar'
    );
    return {
      kyk: burslar.filter((item) => item.opportunityType === 'kyk').length,
      diger: burslar.filter((item) => item.opportunityType !== 'kyk').length,
    };
  }, [sayimTabani]);

  const filtered = React.useMemo(() => {
    let liste = sayimTabani;
    if (filters.kategori)
      liste = liste.filter((item) => firsatKategorisi(item.opportunityType) === filters.kategori);
    if (filters.kaynak === 'kyk') liste = liste.filter((item) => item.opportunityType === 'kyk');
    if (filters.kaynak === 'diger') liste = liste.filter((item) => item.opportunityType !== 'kyk');
    return firsatSirala(liste, {
      /*
        Uygunluk yalnız VARSAYILAN sırada belirleyici. "Bana uygun"
        açıkken zaten hepsi uygun (kova ayrımı anlamsız), kullanıcı bir
        sıra seçtiyse de onu ezmemesi gerekiyor — yoksa seçim yapıldığı
        hâlde liste değişmemiş görünürdü.
      */
      ogrenci: filters.banaUygun || profilEksik ? null : student,
      /* `Suzgec` .mjs sabitinden türediği için alan `string`; kabul edilen
         üç değer adres okunurken zaten doğrulanıyor (secilen()). */
      mod: filters.siralama as '' | 'son-tarih' | 'yeni',
    });
  }, [
    sayimTabani,
    filters.kategori,
    filters.kaynak,
    filters.siralama,
    filters.banaUygun,
    profilEksik,
    student,
  ]);

  const aktifSuzgecler = React.useMemo(
    () => aktifFirsatSuzgecleri(filters) as { id: string; etiket: string }[],
    [filters]
  );
  /* Arşiv bir daraltma değil, başka bir küme: rozet sayacında yer almıyor. */
  const aktifSuzgecSayisi = aktifSuzgecler.filter((s) => s.id !== 'arsiv').length;
  const listeDaraldi = aktifSuzgecSayisi > 0;

  const temizle = () => setFilters({ ...BOS_FIRSAT_SUZGECI, arsiv: filters.arsiv });

  /*
    'kapali' bir EKRAN durumu değil, "daha sorulmadı" demek: süzgeç yeni
    açıldığı karede istek henüz yola çıkmamış oluyor. Onu 'loading'
    saymazsak o tek karede "Arşivde kayıt yok" yazardı — elimizde cevap
    yokken yokluk iddia etmek, bu ekranın kaçındığı şeyin ta kendisi.
  */
  const listeDurumu = filters.arsiv ? (arsivDurumu === 'kapali' ? 'loading' : arsivDurumu) : state;

  /*
    ARŞİVDE TAKVİM YOK

    `opportunityCalendar` yalnızca BUGÜN VE SONRASINDAKİ açılış/kapanış
    günlerini topluyor; arşiv kümesi ise tanımı gereği süresi dolmuş
    kayıtlar. İkisinin kesişimi her zaman boş, yani arşivde Takvim
    sekmesi hiçbir içerik üretemeyecek bir düğme olurdu. Adres
    `?arsiv=1&takvim=1` ile paylaşılmış olabileceği için süzgeci
    değiştirmiyor, görünümü türetiyoruz.
  */
  const takvimGorunumu = filters.takvim && !filters.arsiv;

  const suzgecler = (
    <Suzgecler
      filters={filters}
      set={set}
      temizle={temizle}
      aktifSuzgecSayisi={aktifSuzgecSayisi}
      kaynakSayimlari={kaynakSayimlari}
      modVar={modVar}
      banaUygunVar={hazirSayisi > 0}
      kaydedilenVar={Boolean(userId)}
    />
  );

  return (
    <main
      className={`w-full ${SAYFA_GENISLIGI} mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 sm:pt-3 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-10`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* --------------------------------- sol: başlık, arama, süzgeçler */}
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          <header className="space-y-1">
            <h1 className="[font-size:clamp(1.25rem,2.4vw,1.75rem)] font-extrabold leading-tight tracking-tight text-gray-950">
              Fırsatlar
            </h1>
            <p className="text-sm leading-relaxed text-gray-600">
              Bursları, öğrenci programlarını, yarışmaları ve kariyer etkinliklerini keşfet.
            </p>
          </header>

          {/* -------- mobil arama satırı + panel düğmesi -------- */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                aria-label="Fırsat ara"
                value={filters.query}
                onChange={(e) => set({ query: e.target.value })}
                placeholder="Burs, program veya yarışma ara"
                className={`w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-11 pr-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-600 focus:outline-none ${ODAK_HALKASI}`}
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={() => set({ query: '' })}
                  aria-label="Aramayı temizle"
                  className={`absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer ${ODAK_HALKASI}`}
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              )}
            </div>
            {/*
              Yükseklik `self-stretch` ile arama kutusundan geliyor, sabit
              piksel DEĞİL — ilan sayfasında gerekçesi ölçülerek yazılmış:
              sabit değerde iki çerçevenin alt kenarı bir piksel kayıyor.
            */}
            <button
              type="button"
              onClick={() => setPanelAcik(true)}
              aria-label={
                aktifSuzgecSayisi > 0 ? `Filtreler (${aktifSuzgecSayisi} açık)` : 'Filtreler'
              }
              className={`relative flex w-[52px] shrink-0 cursor-pointer items-center justify-center self-stretch rounded-2xl border transition-colors ${ODAK_HALKASI} ${
                aktifSuzgecSayisi > 0
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" aria-hidden />
              {aktifSuzgecSayisi > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-extrabold text-white">
                  {aktifSuzgecSayisi}
                </span>
              )}
            </button>
          </div>

          <div className="hidden lg:block">{suzgecler}</div>

          {/* Ayırıcı: "kontroller bitti, liste başlıyor". Geniş ekranda sütunlar yapıyor. */}
          <div
            aria-hidden
            className="h-0.5 rounded-2xl border border-gray-200 bg-white shadow-xs lg:hidden"
          />
        </div>

        {/* ------------------------------------------- orta: kart akışı --- */}
        <div className="lg:col-span-6 space-y-4 min-w-0">
          {/*
            GÖRÜNÜM SEÇİCİ

            Liste ve takvim aynı kaydı iki biçimde gösteriyor: takvimde
            açılış günleri de var ("4 Eyl · Başvuru açılıyor"). Seçici
            listenin hemen üstünde, çünkü seçtiği şey AŞAĞIDAKİ liste.

            Arşivde seçici DOM'A HİÇ GİRMİYOR: takvim yalnız bugünü ve
            sonrasını topluyor (opportunityCalendar), arşiv ise yalnız
            geçmişi tutuyor — tıklanınca kesin boş kalacak bir sekme
            çizmek, olmayan bir görünümü var göstermek olurdu.
          */}
          {!filters.arsiv && (
            <nav
              aria-label="Fırsat görünümü"
              className="flex max-w-full shrink-0 items-center gap-0.5 rounded-full bg-gray-100 p-0.5 text-[12px] font-bold"
            >
              {(
                [
                  [false, 'Liste'],
                  [true, 'Takvim'],
                ] as [boolean, string][]
              ).map(([takvim, etiket]) => (
                <button
                  key={etiket}
                  type="button"
                  aria-pressed={takvimGorunumu === takvim}
                  onClick={() => set({ takvim })}
                  className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 transition-colors cursor-pointer ${ODAK_HALKASI} ${
                    takvimGorunumu === takvim
                      ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)]'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {etiket}
                </button>
              ))}
            </nav>
          )}

          {/*
            ARŞİV ŞERİDİ — TARAFSIZ

            "Kaçırdın" demiyor: geçen yılın takvimi gelecek yılın tahmini
            için işe yarıyor. Kartlarda başvuru düğmesi yok.
          */}
          {filters.arsiv && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-gray-700">
                Süresi dolan fırsatları görüyorsun. Başvuru dönemleri kapandı.
              </p>
              <button
                type="button"
                onClick={() => set({ arsiv: false })}
                className={`shrink-0 cursor-pointer rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:underline ${ODAK_HALKASI}`}
              >
                Açık fırsatlara dön
              </button>
            </div>
          )}

          {!takvimGorunumu && listeDurumu === 'ready' && (
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                {filters.arsiv
                  ? 'Süresi dolan fırsatlar'
                  : listeDaraldi
                    ? 'Filtrelenen fırsatlar'
                    : 'Güncel fırsatlar'}
                {` (${listeDaraldi ? filtered.length : sayimTabani.length})`}
              </h2>
              <span className="hidden text-xs font-medium text-gray-500 sm:block">
                Kurumların resmî sayfalarından derlendi
              </span>
            </div>
          )}

          {!takvimGorunumu && listeDurumu === 'ready' && (
            <KonuSeridi
              konular={seritKategorileri}
              secili={filters.kategori}
              toplam={sayimTabani.length}
              onSec={(kategori) =>
                set({
                  kategori,
                  kaynak: kategori === 'burslar' ? filters.kaynak : '',
                })
              }
              onTumu={() => set({ kategori: '', kaynak: '' })}
              birim="fırsat"
              ikonlar={KATEGORI_IKONLARI}
              varsayilanIkon={Layers}
              tumuEtiketi="Tüm kategoriler"
            />
          )}

          {/* ----------------------------------------------- dört durum --- */}
          {listeDurumu === 'loading' ? (
            <ListeIskeleti />
          ) : listeDurumu === 'error' ? (
            <Empty
              icon={<Sparkles />}
              title="Fırsatlar şu anda yüklenemedi"
              body="Bağlantı kurulamadı. Birkaç saniye sonra yeniden denemek çoğu zaman yetiyor."
              action="Yeniden dene"
              onClick={() =>
                filters.arsiv ? setArsivDenemesi((x) => x + 1) : setDeneme((x) => x + 1)
              }
            />
          ) : filters.kaydedilen && !userId ? (
            /*
              YETKİSİZ İLE BOŞ AYNI CÜMLE DEĞİL

              "Kaydettiğin fırsat yok" demek yanlış olurdu: liste sunucuda
              hesaba bağlı ve misafirken HİÇ sorulmuyor. Söylenen şey
              "göremiyorsun", "yok" değil.
            */
            <Empty
              icon={<Sparkles />}
              title="Kaydettiğin fırsatları görmek için giriş yap"
              body="Kaydetme listesi hesabına bağlı; giriş yapmadan hangi fırsatları kaydettiğini gösteremiyoruz."
              action="Giriş yap"
              onClick={onRequireLogin}
            />
          ) : filters.banaUygun && !student ? (
            <Empty
              icon={<Sparkles />}
              title="Eşleştirme için giriş yapman gerekiyor"
              body="Eleme yalnızca kendi profilindeki bilgilerle yapılıyor. Bütün fırsatları süzgeci kapatarak görebilirsin."
              action="Giriş yap"
              onClick={onRequireLogin}
            />
          ) : filters.banaUygun && profilEksik ? (
            <Empty
              icon={<Sparkles />}
              title="Eşleştirme için profilinde bölüm ve sınıf bilgisi gerekiyor"
              body="Bir fırsatın sana uyup uymadığını ancak bu iki bilgiyle söyleyebiliriz. Tahmini bir uyum oranı üretmiyoruz."
              action="Profilini tamamla"
              onClick={() => onNavigate('/cv')}
            />
          ) : filters.banaUygun && hazirSayisi === 0 ? (
            <Empty
              icon={<Sparkles />}
              title="Eşleştirme için yeterli doğrulanmış bilgi yok"
              body="Bir fırsatı sana uygun sayabilmemiz için bölüm, eğitim seviyesi ve şehir şartlarının kurumun kendi sayfasından doğrulanmış olması gerekiyor. Şu an bu üç bilgisi de doğrulanmış kayıt yok; uydurma bir eşleştirme göstermiyoruz."
              action="Bütün fırsatları gör"
              onClick={temizle}
            />
          ) : takvimGorunumu ? (
            <Takvim items={filtered} onNavigate={onNavigate} />
          ) : filtered.length ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
              {filtered.map((item: Opportunity) => (
                <Card
                  key={item.id}
                  item={item}
                  arsivde={filters.arsiv}
                  girisGerekli={!userId}
                  onRequireLogin={onRequireLogin}
                  onNavigate={onNavigate}
                  fit={student && !profilEksik ? opportunityFit(item, student) : null}
                />
              ))}
            </div>
          ) : filters.banaUygun && student && !student.city && sehirSartliSayisi(taban) > 0 ? (
            /*
              LİSTE BOŞ VE SEBEBİ ŞEHİR

              Şehir şartı doğrulanmış bir kayıtta profilde il yazmıyorsa
              sonuç "uygun değil" değil BELİRSİZ: kayıt eleniyor değil,
              rozet alamıyor. Ama "Bana uygun" açıkken belirsizler zaten
              listeye girmiyor, dolayısıyla ekran boş kalıyor — ve genel
              "süzgeçler daraltıyor" cümlesi buradaki gerçek sebebi
              söylemiyordu.

              Sayı gerçek listeden: şehir şartı doğrulanmış ve dolu kayıt
              yoksa bu cümle hiç çıkmıyor, çünkü il yazmak o ekranda
              hiçbir şeyi değiştirmezdi.
            */
            <Empty
              icon={<Sparkles />}
              title="Şehir şartlı fırsatları eşleştirmek için ilini yazman gerekiyor"
              body={`Bu listede şehir şartı doğrulanmış ${sehirSartliSayisi(taban)} fırsat var; profilinde oturduğun il yazmadığı için bunların sana uyup uymadığını söyleyemiyoruz. İl isteğe bağlı — yazmazsan da şehir şartı olmayan fırsatlar eşleşmeye devam ediyor.`}
              action="Profilini tamamla"
              onClick={() => onNavigate('/cv')}
            />
          ) : taban.length > 0 && aktifSuzgecler.length ? (
            /*
              BOŞ SONUÇ HANGİ SÜZGECİN DARALTTIĞINI SÖYLÜYOR

              "Bu filtrelere uyan fırsat yok" cümlesi hangi süzgecin
              daralttığını söylemiyordu; kullanıcı paneli açıp tek tek
              aramak zorundaydı. Süzgeçler artık adıyla sayılıyor ve her
              biri tek tek kaldırılabiliyor.

              `taban.length > 0` ŞARTI: taban zaten boşsa daraltan bir
              süzgeç yok — "1 süzgeç onu boşaltıyor" demek yanlış olurdu.
              O durumda aşağıdaki "hiç kayıt yok" cümlesi çıkıyor.
            */
            <BosSonuc
              suzgecler={aktifSuzgecler}
              toplam={taban.length}
              onKaldir={(id) => set(bosDeger(id))}
              onTemizle={temizle}
            />
          ) : (
            /*
              SİSTEMDE HİÇ KAYIT YOK. Uydurma sayı, örnek kart ya da
              "yakında" kutusu yok: gerçekten boşsa ekran da boş.
            */
            <Empty
              icon={<Sparkles />}
              title={filters.arsiv ? 'Arşivde kayıt yok' : 'Şu anda yayında olan fırsat bulunmuyor'}
              body="Fırsatları resmî kaynağından doğrulayarak yayımlıyoruz; doğrulayamadığımız hiçbir burs, program veya yarışma listeye girmiyor."
            />
          )}
        </div>

        {/* ------------------------------------------ sağ: yardımcı sütun --- */}
        <div className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          <aside className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
            <p className="text-sm font-bold text-gray-900">Fırsatları nasıl seçiyoruz</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Her kaydın resmî kaynağı doğrulanıyor; kurumun kendi sayfasında görmediğimiz hiçbir
              burs, program veya yarışma listeye girmiyor. Tutar ve son başvuru tarihi her yıl
              değiştiği için uydurmuyoruz — yalnızca resmî kaynakta açıkça yazan tutarı, ait olduğu
              dönemle birlikte gösteriyoruz.
            </p>
          </aside>
        </div>
      </div>

      {/* -------- mobil filtre paneli (alt levha) -------- */}
      {panelAcik && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setPanelAcik(false)}
        >
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
                type="button"
                onClick={() => setPanelAcik(false)}
                aria-label="Kapat"
                className={`grid h-11 w-11 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer ${ODAK_HALKASI}`}
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            {suzgecler}
            <button
              type="button"
              onClick={() => setPanelAcik(false)}
              className={`min-h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white cursor-pointer ${ODAK_HALKASI}`}
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

/** Son başvuruya kalan gün; tarih yoksa null. */
function gunKaldi(item: Opportunity): number | null {
  if (!item.applicationDeadline) return null;
  const son = new Date(item.applicationDeadline);
  if (!Number.isFinite(son.getTime())) return null;
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  return Math.round((son.getTime() - bugun.getTime()) / 86400000);
}

/** Bir süzgecin "kapalı" değeri; boş durumdaki tek tek kaldırma için. */
function bosDeger(id: string): Partial<Suzgec> {
  if (id === 'banaUygun' || id === 'kaydedilen' || id === 'arsiv')
    return { [id]: false } as Partial<Suzgec>;
  /* Kaynak Burslar'ın alt süzgeci: kategori kalkınca o da kalkmalı. */
  if (id === 'kategori') return { kategori: '', kaynak: '' };
  return { [id]: '' } as Partial<Suzgec>;
}

const Suzgecler: React.FC<{
  filters: Suzgec;
  set: (patch: Partial<Suzgec>) => void;
  temizle: () => void;
  aktifSuzgecSayisi: number;
  kaynakSayimlari: { kyk: number; diger: number };
  /** Listede `event_mode` dolu kayıt var mı; yoksa katılım süzgeci çizilmiyor. */
  modVar: boolean;
  /** Doğrulanmış kısıtı olan kayıt var mı; yoksa "Bana uygun" çizilmiyor. */
  banaUygunVar: boolean;
  kaydedilenVar: boolean;
}> = ({
  filters,
  set,
  temizle,
  aktifSuzgecSayisi,
  kaynakSayimlari,
  modVar,
  banaUygunVar,
  kaydedilenVar,
}) => (
  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
      <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
      <span className="text-sm font-bold text-gray-900">Filtreler</span>
      {aktifSuzgecSayisi > 0 && (
        <>
          <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">
            {aktifSuzgecSayisi}
          </span>
          <button
            type="button"
            onClick={temizle}
            className={`ml-auto shrink-0 cursor-pointer rounded-lg px-1 text-xs font-bold text-blue-600 hover:underline ${ODAK_HALKASI}`}
          >
            Temizle
          </button>
        </>
      )}
    </div>

    <div className="divide-y divide-gray-100">
      <FiltreBlogu baslik="Ara">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            aria-label="Fırsat ara"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Burs, program veya yarışma ara"
            className={`w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-600 focus:outline-none ${ODAK_HALKASI}`}
          />
        </div>
      </FiltreBlogu>

      {/*
        KAYNAK YALNIZCA BURSLARDA

        KYK ayrı bir kategori değil, Burslar'ın içindeki bir kurum. Şerit
        Burslar'da değilken bu blok çizilmiyor: yarışmalar listesinde
        "KYK / Diğer kurumlar" seçeneği sunmak anlamsız olurdu.
      */}
      {filters.kategori === 'burslar' && (
        <FiltreBlogu baslik="Kaynak">
          <div className="space-y-0.5">
            <SecenekSatiri
              tip="radio"
              etiket="Tümü"
              secili={filters.kaynak === ''}
              onChange={() => set({ kaynak: '' })}
            />
            {kaynakSayimlari.kyk > 0 && (
              <SecenekSatiri
                tip="radio"
                etiket="KYK"
                adet={kaynakSayimlari.kyk}
                secili={filters.kaynak === 'kyk'}
                onChange={() => set({ kaynak: 'kyk' })}
              />
            )}
            {kaynakSayimlari.diger > 0 && (
              <SecenekSatiri
                tip="radio"
                etiket="Diğer kurumlar"
                adet={kaynakSayimlari.diger}
                secili={filters.kaynak === 'diger'}
                onChange={() => set({ kaynak: 'diger' })}
              />
            )}
          </div>
        </FiltreBlogu>
      )}

      {(banaUygunVar || kaydedilenVar) && (
        <FiltreBlogu baslik="Listem">
          <div className="space-y-0.5">
            {banaUygunVar && (
              <SecenekSatiri
                tip="checkbox"
                etiket="Bana uygun"
                secili={filters.banaUygun}
                onChange={() => set({ banaUygun: !filters.banaUygun })}
              />
            )}
            {kaydedilenVar && (
              <SecenekSatiri
                tip="checkbox"
                etiket="Kaydedilenler"
                secili={filters.kaydedilen}
                onChange={() => set({ kaydedilen: !filters.kaydedilen })}
              />
            )}
          </div>
        </FiltreBlogu>
      )}

      <FiltreBlogu baslik="Son başvuru tarihi">
        <div className="space-y-0.5">
          <SecenekSatiri
            tip="radio"
            etiket="Tümü"
            secili={filters.sonGun === ''}
            onChange={() => set({ sonGun: '' })}
          />
          <SecenekSatiri
            tip="radio"
            etiket="7 gün içinde"
            secili={filters.sonGun === '7'}
            onChange={() => set({ sonGun: '7' })}
          />
          <SecenekSatiri
            tip="radio"
            etiket="30 gün içinde"
            secili={filters.sonGun === '30'}
            onChange={() => set({ sonGun: '30' })}
          />
        </div>
      </FiltreBlogu>

      <FiltreBlogu baslik="Şehir veya ülke">
        <div className="relative">
          <MapPin
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            aria-label="Şehir veya ülke"
            value={filters.sehir}
            onChange={(e) => set({ sehir: e.target.value })}
            placeholder="Şehir veya ülke"
            className={`w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-600 focus:outline-none ${ODAK_HALKASI}`}
          />
        </div>
      </FiltreBlogu>

      <FiltreBlogu baslik="Nerede">
        <div className="space-y-0.5">
          <SecenekSatiri
            tip="radio"
            etiket="Tümü"
            secili={filters.bolge === ''}
            onChange={() => set({ bolge: '' })}
          />
          <SecenekSatiri
            tip="radio"
            etiket="Türkiye"
            secili={filters.bolge === 'turkiye'}
            onChange={() => set({ bolge: 'turkiye' })}
          />
          <SecenekSatiri
            tip="radio"
            etiket="Yurt dışı"
            secili={filters.bolge === 'yurtdisi'}
            onChange={() => set({ bolge: 'yurtdisi' })}
          />
        </div>
      </FiltreBlogu>

      {modVar && (
        <FiltreBlogu baslik="Katılım">
          <div className="space-y-0.5">
            <SecenekSatiri
              tip="radio"
              etiket="Tümü"
              secili={filters.mod === ''}
              onChange={() => set({ mod: '' })}
            />
            <SecenekSatiri
              tip="radio"
              etiket="Yüz yüze"
              secili={filters.mod === 'yuz-yuze'}
              onChange={() => set({ mod: 'yuz-yuze' })}
            />
            <SecenekSatiri
              tip="radio"
              etiket="Çevrim içi"
              secili={filters.mod === 'cevrim-ici'}
              onChange={() => set({ mod: 'cevrim-ici' })}
            />
          </div>
        </FiltreBlogu>
      )}

      <FiltreBlogu baslik="Sıralama">
        <div className="space-y-0.5">
          <SecenekSatiri
            tip="radio"
            etiket="Varsayılan"
            secili={filters.siralama === ''}
            onChange={() => set({ siralama: '' })}
          />
          <SecenekSatiri
            tip="radio"
            etiket="Son başvuru tarihi"
            secili={filters.siralama === 'son-tarih'}
            onChange={() => set({ siralama: 'son-tarih' })}
          />
          <SecenekSatiri
            tip="radio"
            etiket="Yeni eklenen"
            secili={filters.siralama === 'yeni'}
            onChange={() => set({ siralama: 'yeni' })}
          />
        </div>
      </FiltreBlogu>

      <FiltreBlogu baslik="Ayrıca göster">
        <SecenekSatiri
          tip="checkbox"
          etiket="Süresi dolanlar"
          secili={filters.arsiv}
          onChange={() => set({ arsiv: !filters.arsiv })}
        />
      </FiltreBlogu>
    </div>
  </section>
);

/*
  FIRSAT KARTI

  Kartın söyleme sırası: kimden, bu ne, kime, nerede, ne kadar, ne zaman.
  Veri YOKSA satır hiç çizilmiyor — boş bir alan bilgi sanılıp okunuyor ve
  kartı uzatıyor.

  `export` yalnızca geliştirme fikstürü için: kart uzun başlık, tarihsiz
  kayıt, logosuz kurum gibi durumlarda tarayıcıda hiç görülmeden
  değişiyordu ve üretimde bu varyasyonların hepsi aynı anda bulunmuyor.
*/
export const Card: React.FC<{
  item: Opportunity;
  onNavigate: (p: string) => void;
  fit: { durum: string; not: string | null; kesin: boolean } | null;
  /** Arşiv görünümünde başvuru düğmesi çizilmiyor: dönem kapandı. */
  arsivde?: boolean;
  girisGerekli: boolean;
  onRequireLogin: () => void;
}> = ({ item, onNavigate, fit, arsivde = false, girisGerekli, onRequireLogin }) => {
  const cta = arsivde ? null : opportunityCta(item);
  const tutar = opportunityAmount(item);
  const rozetler = firsatRozetleri(item, { fit }) as {
    id: string;
    etiket: string;
  }[];
  const yer = [...item.cities, ...item.countries];
  const seviye = item.educationLevels.length ? item.educationLevels.join(', ') : null;
  const bolumVeSinif = [...item.eligibleDepartments, ...item.eligibleClassYears];
  const katilim =
    item.eventMode === 'online'
      ? 'Çevrim içi'
      : item.eventMode === 'hybrid'
        ? 'Karma'
        : item.eventMode === 'in_person'
          ? 'Yüz yüze'
          : null;

  /*
    Açılış tarihi yalnızca GELECEKTEYSE gösteriliyor — takvimin kuralının
    aynısı (opportunityCalendar). Geçmiş bir açılış, öğrencinin
    yapabileceği bir şey söylemiyor.
  */
  const acilisTarihi = (() => {
    if (!item.applicationStartAt) return null;
    const acilis = new Date(item.applicationStartAt);
    if (Number.isNaN(acilis.getTime())) return null;
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    return acilis >= bugun ? kisaTarih(item.applicationStartAt) : null;
  })();

  return (
    <article className="group relative flex min-w-0 flex-col gap-1.5 rounded-2xl border border-gray-200 bg-white p-2.5 transition-all duration-150 hover:border-blue-500 hover:shadow-xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 sm:gap-2 sm:p-3.5">
      <div className="flex w-full min-w-0 items-start gap-2 sm:gap-2.5">
        {/*
          Logo ilan kartıyla AYNI bileşen (ListingLogo): aynı dairesel
          kutu, aynı iç boşluk ve logosu olmayan kurumda AYNI ÖLÇÜDE baş
          harf kutusu — iki liste arasında göz hizası kaymıyor. Ölçü dar
          kart için bir kademe küçültüldü: 56 piksellik logo 174 piksellik
          kartın üçte birini yiyordu (ölçüldü, 390px).
        */}
        <div className="shrink-0">
          <ListingLogo
            name={item.organizationName}
            logoUrl={item.organizationLogoUrl}
            className="!h-9 !w-9 !p-1 !text-[11px] sm:!h-11 sm:!w-11 sm:!text-xs"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <span className="block min-w-0 truncate text-[11px] font-bold text-blue-600 sm:text-xs">
            {item.organizationName}
          </span>
          {/*
            Gerilmiş bağlantı (`after:inset-0`) kartın tamamını kaplıyor;
            gerçek bir `href` olduğu için orta tuş ve "yeni sekmede aç"
            çalışıyor, arama motoru da bağlantıyı görüyor.
          */}
          <h2 className="line-clamp-2 text-[13px] font-bold leading-snug text-gray-900 sm:text-base">
            <a
              href={`/firsatlar/${item.slug}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onNavigate(`/firsatlar/${item.slug}`);
              }}
              title={item.title}
              className={`rounded-sm outline-none transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-blue-700 ${ODAK_HALKASI}`}
            >
              {item.title}
            </a>
          </h2>
        </div>
      </div>

      {/*
        TÜR ETİKETİ VE ROZETLER

        Rozetlerin üçü de tek bir alandan geliyor: "Yeni" published_at'ten,
        "Son 3 gün" son başvuru tarihinden, "Sana uygun" doğrulanmış
        kısıtlardan (lib/firsat-kategori · firsatRozetleri). Hesaplanmamış
        etiket yok — "Popüler" için bu sitede sayılabilecek bir başvuru
        yok, başvuruyu kurum alıyor.
      */}
      <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold sm:gap-1.5 sm:text-[10px]">
        <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700 sm:px-2">
          {opportunityTypeLabel(item.opportunityType)}
        </span>
        {rozetler.map((rozet) => (
          <span
            key={rozet.id}
            className={`rounded-full px-1.5 py-0.5 sm:px-2 ${
              rozet.id === 'son_gunler'
                ? 'bg-amber-50 text-amber-900'
                : rozet.id === 'uygun'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {rozet.etiket}
          </span>
        ))}
        {item.verifiedAt && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-700 sm:px-2">
            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" aria-hidden />
            Resmî kaynak
          </span>
        )}
      </div>

      {/*
        Kime ve nerede. Hiçbiri yoksa satır çizilmiyor. Dar kartta gizli:
        174 pikselde "Lisans · İstanbul, Ankara, İzmir" üç satıra bölünüp
        kartın en uzun bloğu oluyordu (ölçüldü). Bilgi kaybolmuyor — detay
        sayfasında ve süzgeçte aynen duruyor.
      */}
      {(seviye || bolumVeSinif.length > 0 || yer.length > 0 || katilim) && (
        <p className="hidden text-xs text-gray-500 sm:block">
          {[seviye, bolumVeSinif.slice(0, 2).join(', '), yer.join(', '), katilim]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {/*
        Tutar yalnızca resmî kaynaktan doğrulanmışsa yazıyor.
        Doğrulanmamışsa susmuyoruz da: "açıklanmadı" demek, boş bırakıp
        öğrenciyi aramaya göndermekten iyi.
      */}
      {tutar.bilinmiyor ? (
        <p className="flex items-center gap-1 text-[11px] text-gray-500 sm:gap-1.5 sm:text-xs">
          <span aria-hidden className="font-bold text-gray-400">
            ₺
          </span>
          Tutar açıklanmadı
          {tutar.geriOdeme && (
            <span className="hidden font-semibold text-gray-600 sm:inline">
              · {tutar.geriOdeme}
            </span>
          )}
        </p>
      ) : (
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5 sm:px-3 sm:py-2">
          <p className="text-[13px] font-extrabold leading-tight text-emerald-900 sm:text-base">
            {tutar.metin}
          </p>
          <p className="hidden text-[11px] text-emerald-800 sm:block">
            {[tutar.donem, tutar.geriOdeme].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {acilisTarihi && !arsivde && (
        <p className="flex items-start gap-1 text-[11px] font-semibold leading-snug text-blue-800 sm:gap-1.5 sm:text-[13px]">
          <CalendarDays className="mt-0.5 h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
          <span>{acilisTarihi} tarihinde başvuruya açılıyor</span>
        </p>
      )}

      {/*
        ARŞİVDE TÜP YOK

        Zaman tüpü "ne kadar kaldı" diyor; kapanmış bir dönemde kalan süre
        yok ve dolu bir tüp çizmek yanlış bilgi olurdu. Yerine tarafsız bir
        satır: ne zaman kapandığı.
      */}
      {arsivde ? (
        item.applicationDeadline ? (
          <p className="text-[11px] font-semibold text-gray-500 sm:text-[13px]">
            {kisaTarih(item.applicationDeadline)} tarihinde kapandı
          </p>
        ) : null
      ) : (
        <ZamanTupu item={item} />
      )}

      {fit?.not && (
        <p
          className={`hidden text-xs leading-relaxed sm:block ${
            fit.durum === 'sart_uymuyor' ? 'text-amber-800' : 'text-gray-500'
          }`}
        >
          {fit.not}
        </p>
      )}

      {/*
        `relative z-10`: düğme gerilmiş bağlantının ÜSTÜNDE kalmalı, yoksa
        tıklama karta gidip detay sayfasını açardı.
      */}
      {cta && (
        <div className="relative z-10 mt-auto border-t border-gray-100 pt-2 sm:pt-3">
          <DisBaglanti
            href={cta.adres}
            girisGerekli={girisGerekli}
            onGirisGerekli={onRequireLogin}
            kapiEtiketi="Başvurmak için giriş yap"
            className={`${CTA_ORTAK} ${CTA_BIRINCIL} w-full ${ODAK_HALKASI}`}
          >
            {/* Kartta kısa etiket: uzun hâli düğmeyi iki satıra bölüyordu. */}
            <span className="truncate">
              {girisGerekli ? 'Giriş yap' : (cta.kisaEtiket ?? cta.etiket)}
            </span>
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </DisBaglanti>
        </div>
      )}
    </article>
  );
};

/*
  TAKVİM

  Takvimin listeye göre tek fazlası açılış günleri: "ne zaman
  başvurabilirim" sorusu en az "ne zaman kapanıyor" kadar sık. Aylara
  bölünüyor çünkü öğrenci "bu ay ne var" diye bakıyor.

  Satır gerçek `<a href>`: orta tuş ve "yeni sekmede aç" çalışsın diye.
  Önce `<button>` idi ve ikisi de çalışmıyordu.
*/
const Takvim: React.FC<{
  items: Opportunity[];
  onNavigate: (p: string) => void;
}> = ({ items, onNavigate }) => {
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
        <section
          key={ay.anahtar}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          <h2 className="px-4 py-2.5 text-sm font-extrabold text-gray-900 bg-gray-50 border-b border-gray-100 capitalize">
            {ay.etiket}
          </h2>
          <div className="divide-y divide-gray-100">
            {ay.olaylar.map((olay: any) => (
              <a
                key={`${olay.item.id}-${olay.tur}`}
                href={`/firsatlar/${olay.item.slug}`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  onNavigate(`/firsatlar/${olay.item.slug}`);
                }}
                className={`flex min-h-11 w-full items-center gap-3 p-3 text-left hover:bg-gray-50 sm:p-4 ${ODAK_HALKASI}`}
              >
                <time className="w-14 shrink-0 text-sm font-extrabold text-gray-900">
                  {kisaTarih(
                    olay.tur === 'acilis'
                      ? olay.item.applicationStartAt
                      : olay.item.applicationDeadline
                  )}
                </time>
                <span className="min-w-0 flex-1">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      olay.tur === 'acilis'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-900'
                    }`}
                  >
                    {olay.tur === 'acilis' ? 'Başvuru açılıyor' : 'Son başvuru'}
                  </span>
                  <b className="mt-0.5 block text-sm leading-snug text-gray-900 line-clamp-2">
                    {olay.item.title}
                  </b>
                  <span className="text-xs text-gray-500">{olay.item.organizationName}</span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

/*
  İSKELET LİSTEYLE AYNI IZGARADA

  Tek sütunlu üç gri blok çiziliyordu; liste gelince ızgara iki sütuna
  atlıyor ve sayfa zıplıyordu. İskelet artık kartların oturacağı yere
  oturuyor.
*/
const ListeIskeleti: React.FC = () => (
  <div
    role="status"
    aria-label="Fırsatlar yükleniyor"
    className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3"
  >
    {[1, 2, 3, 4, 5, 6].map((x) => (
      <div key={x} aria-hidden className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
    ))}
  </div>
);

const BosSonuc: React.FC<{
  suzgecler: { id: string; etiket: string }[];
  toplam: number;
  onKaldir: (id: string) => void;
  onTemizle: () => void;
}> = ({ suzgecler, toplam, onKaldir, onTemizle }) => (
  <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center sm:p-10">
    <div
      aria-hidden
      className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gray-100 text-gray-500"
    >
      <Globe2 />
    </div>
    <h2 className="font-extrabold text-gray-900">Bu süzgeçlere uyan fırsat yok</h2>
    <p className="mt-1 text-sm text-gray-600">
      Listede {toplam} fırsat var; {suzgecler.length} süzgeç onu boşaltıyor. Birini kaldırmayı dene.
    </p>
    <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {suzgecler.map((suzgec) => (
        <li key={suzgec.id}>
          <button
            type="button"
            onClick={() => onKaldir(suzgec.id)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-bold text-gray-800 hover:bg-gray-50 cursor-pointer ${ODAK_HALKASI}`}
          >
            {suzgec.etiket}
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="sr-only">süzgecini kaldır</span>
          </button>
        </li>
      ))}
    </ul>
    <button
      type="button"
      onClick={onTemizle}
      className={`mt-4 min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white cursor-pointer ${ODAK_HALKASI}`}
    >
      Temizle
    </button>
  </section>
);

const Empty: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: string;
  onClick?: () => void;
}> = ({ icon, title, body, action, onClick }) => (
  <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center sm:p-10">
    <div
      aria-hidden
      className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gray-100 text-gray-500"
    >
      {icon}
    </div>
    <h2 className="font-extrabold text-gray-900">{title}</h2>
    <p className="mt-1 text-sm text-gray-600">{body}</p>
    {action && (
      <button
        type="button"
        onClick={onClick}
        className={`mt-4 min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white cursor-pointer ${ODAK_HALKASI}`}
      >
        {action}
      </button>
    )}
  </section>
);
