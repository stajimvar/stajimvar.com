import React from 'react';
import { DisBaglanti } from '../ui';
import { firsatEylemleri } from '../lib/rehber-eylemleri.mjs';
import { ArrowLeft, Bookmark, Check, CheckCircle2, ExternalLink, Loader2, Share2 } from 'lucide-react';
import {
  fetchOpportunityBySlug,
  fetchOpportunityProgress,
  fetchSavedOpportunityIds,
  saveOpportunityProgress,
  toggleSavedOpportunity,
  type Opportunity,
} from '../lib/opportunities';
import {
  opportunityCta,
  opportunityStatus,
  opportunityTypeLabel,
  OPPORTUNITY_STATUS_LABELS,
} from '../lib/opportunity-domain.mjs';
import { opportunityAmount, ODEME_DONEMI_ETIKETLERI } from '../lib/firsat-degerlendirme.mjs';
import { firsatDurumu } from '../lib/firsat-kategori.mjs';
import { bursTarihDurumu, turkiyeGeneliMi } from '../lib/burs-kesif.mjs';
import { ZamanTupu } from './ZamanTupu';
import { ScholarshipCover } from './ScholarshipCover';
import { BursUyumMiniBlok } from './BursCakismaMatrisi';
import { kurumEslestir } from '../lib/burs-cakisma.mjs';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';
import { tarihMetni } from '../lib/tarih.mjs';

/**
 * Fırsat detay sayfası.
 *
 * KONTROL LİSTESİ NEDEN BURADA
 * ----------------------------
 * Başvuru kurumun kendi sayfasında yapılıyor; StajımVar başvuruyu almıyor
 * ve alıyormuş gibi de yapmıyor. Ama öğrencinin belge toplama süreci
 * hiçbir yerde tutulmuyordu: transkriptini aldı mı, niyet mektubunu yazdı
 * mı — hepsini aklında tutmak zorundaydı. Liste öğrencinin KENDİ süreci
 * için; işaretlemek kuruma hiçbir şey göndermiyor ve bu ekranda yazıyor.
 *
 * GÜNCELLİK
 * ---------
 * Her fırsatta resmî kaynak bağlantısı, son kontrol tarihi, tutarın ait
 * olduğu dönem ve bilginin değişebileceği uyarısı duruyor. Burs koşulları
 * yıldan yıla değişiyor; sitenin söylediği şey her zaman "en son şu tarihte
 * şuradan doğruladık" olmalı, "böyledir" değil.
 */

/* Biçim tek kaynaktan; saatsiz değerde gün kayması `lib/tarih` içinde durduruluyor. */
const uzunTarih = (value?: string) => tarihMetni(value);

/*
  ADIMLAR SABİT VE KISA

  Kurumdan kuruma değişen belge listesi zaten `required_documents`
  alanında; o da aşağıda ayrı gösteriliyor. Buradaki altı adım her burs
  başvurusunda tekrar eden iskelet.
*/
const ADIMLAR: { anahtar: string; etiket: string }[] = [
  { anahtar: 'ogrenci_belgesi', etiket: 'Öğrenci belgesi hazır' },
  { anahtar: 'transkript', etiket: 'Transkript hazır' },
  { anahtar: 'niyet_mektubu', etiket: 'Niyet mektubu hazır' },
  { anahtar: 'referans', etiket: 'Referans belgesi hazır' },
  { anahtar: 'form', etiket: 'Başvuru formu dolduruldu' },
  { anahtar: 'tamamlandi', etiket: 'Başvuru tamamlandı' },
];

const Bilgi: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <div className="rounded-xl border border-gray-200 p-3.5">
    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{baslik}</p>
    <div className="mt-1 text-sm text-gray-800 leading-relaxed">{children}</div>
  </div>
);

export const OpportunityDetailPage: React.FC<{
  slug: string;
  userId: string | null;
  onBack: () => void;
  onRequireLogin: () => void;
}> = ({ slug, userId, onBack, onRequireLogin }) => {
  const [item, setItem] = React.useState<Opportunity | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [state, setState] = React.useState<'loading' | 'ready' | 'missing'>('loading');
  const [adimlar, setAdimlar] = React.useState<string[]>([]);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [listeHatasi, setListeHatasi] = React.useState<string | null>(null);
  const [paylasimDurumu, setPaylasimDurumu] = React.useState<'hazir' | 'kopyalandi'>('hazir');
  /* Fırsat türüne karşılık gelen devam yolları; tür tanınmıyorsa boş. */
  const devamEylemleri = React.useMemo(
    () => firsatEylemleri(item?.opportunityType),
    [item?.opportunityType]
  );

  /*
    ÇAKIŞMA BLOĞU YALNIZCA BURSLARDA

    Eşleştirme başlık ve kurum adından yapılıyor; bir yarışma ilanı da
    "belediye" kelimesini taşıyabildiği için önce ilan TÜRÜNE bakılıyor.
    Tür burs değilse ya da kurum tanınmıyorsa blok hiç çizilmiyor —
    tanımadığımız bir bursu tanıdık bir satıra oturtmak yanlış bilgi olur.
  */
  const uyumKurumu = React.useMemo(
    () =>
      item && (item.opportunityType === 'scholarship' || item.opportunityType === 'kyk')
        ? kurumEslestir(item.title, item.organizationName)
        : null,
    [item]
  );

  React.useEffect(() => {
    let off = false;
    Promise.all([fetchOpportunityBySlug(slug), userId ? fetchSavedOpportunityIds(userId) : Promise.resolve([])])
      .then(([row, ids]) => {
        if (off) return;
        setItem(row);
        setSaved(Boolean(row && ids.includes(row.id)));
        setState(row ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!off) setState('missing');
      });
    return () => {
      off = true;
    };
  }, [slug, userId]);

  /* Kontrol listesi yalnızca giriş yapılmışsa var: sunucuda tutuluyor. */
  React.useEffect(() => {
    let off = false;
    if (!userId || !item) return;
    fetchOpportunityProgress(userId, item.id)
      .then((steps) => {
        if (!off) setAdimlar(steps);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [userId, item]);

  /*
    BAŞLIK DEĞİŞİYORDU AMA PAYLAŞIM ETİKETLERİ DEĞİŞMİYORDU

    Burada yalnızca document.title ve description yazılıyordu; canonical ve
    og:title ana sayfadan kalıyordu. Denetimde ölçüldü: tarayıcı sekmesi
    fırsatın adını gösterirken Open Graph başlığı hâlâ "Öğrenci Fırsatları |
    StajımVar" idi — yani sayfayı paylaşan kişi liste sayfasının kartını
    gönderiyordu.

    sayfaMetaAyarla hepsini birden yazıyor ve sayfadan çıkılınca eskisini
    geri yüklüyor.
  */
  React.useEffect(() => {
    if (!item) return;
    return sayfaMetaAyarla({
      baslik: `${item.title} | StajımVar`,
      aciklama: item.shortDescription,
      yol: `/firsatlar/${item.slug}`,
    });
  }, [item]);

  if (state === 'loading') {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="h-80 rounded-3xl bg-gray-100 animate-pulse" />
      </main>
    );
  }
  if (!item) {
    return (
      <main className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-xl font-bold">Bu fırsat bulunamadı veya artık yayında değil</h1>
        <button onClick={onBack} className="mt-4 text-blue-700 font-bold cursor-pointer">
          Fırsatlara dön
        </button>
      </main>
    );
  }

  /**
   * Paylaşım. Mobilde işletim sisteminin kendi menüsü açılıyor; masaüstünde
   * adres panoya kopyalanıyor. İlan sayfasındaki desenin aynısı — iki
   * sayfada iki farklı paylaşım davranışı olmasın.
   */
  const paylas = async () => {
    const adres = window.location.href;
    const metin = `${item.title} — ${item.organizationName}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: metin, text: `${metin} fırsatına bak:`, url: adres });
        return;
      } catch {
        /* Kullanıcı vazgeçti; kopyalamaya düşüyoruz. */
      }
    }
    try {
      await navigator.clipboard.writeText(adres);
      setPaylasimDurumu('kopyalandi');
      setTimeout(() => setPaylasimDurumu('hazir'), 2500);
    } catch {
      /* Pano izni yoksa yapacak bir şey yok; sessiz kalıyor. */
    }
  };

  const toggle = async () => {
    if (!userId) return onRequireLogin();
    await toggleSavedOpportunity(userId, item.id, saved);
    setSaved(!saved);
  };

  const adimiDegistir = async (anahtar: string) => {
    if (!userId) return onRequireLogin();
    const yeni = adimlar.includes(anahtar) ? adimlar.filter((a) => a !== anahtar) : [...adimlar, anahtar];
    const onceki = adimlar;
    setAdimlar(yeni);
    setListeHatasi(null);
    setKaydediliyor(true);
    try {
      await saveOpportunityProgress(userId, item.id, yeni);
    } catch {
      /* Kaydedilemeyen işaret ekranda kalmasın: kullanıcı kaydettiğini sanmamalı. */
      setAdimlar(onceki);
      setListeHatasi('İşaret kaydedilemedi. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setKaydediliyor(false);
    }
  };

  const cta = opportunityCta(item);
  const durum = opportunityStatus(item);
  const tutar = opportunityAmount(item);
  /*
    SÜRESİ DOLMUŞ KAYITTA BAŞVURU DÜĞMESİ YOK

    Kayıt arşivden ya da paylaşılmış eski bir bağlantıdan açılabiliyor.
    Kapanmış bir döneme "Resmî sitede başvur" düğmesi koymak, öğrenciyi
    kapalı bir forma göndermek demek. Durum saklanan sütundan DEĞİL,
    sütun + son tarihten birlikte hesaplanıyor (firsatDurumu): gece işi
    koşmadan önce tarihi geçmiş kayıt hâlâ 'published' görünüyor.
  */
  const suresiDoldu = firsatDurumu(item.status, item.applicationDeadline) === 'expired';
  const tarihDurumu = bursTarihDurumu(item);
  /*
    "Önemli tarihler" satırı: bilinen taraflardan kuruluyor, hiçbiri
    bilinmiyorsa null — kutu o zaman hiç çizilmiyor.
  */
  const acilisTarihi = uzunTarih(item.applicationStartAt);
  const sonTarih = uzunTarih(item.applicationDeadline);
  const onemliTarihler =
    acilisTarihi && sonTarih
      ? `${acilisTarihi} — ${sonTarih}`
      : sonTarih
        ? `Son başvuru: ${sonTarih}`
        : acilisTarihi
          ? `Başvuru açılışı: ${acilisTarihi}`
          : null;

  const yer = [...item.cities, ...item.countries];
  const seviyeVeBolum = [...item.educationLevels, ...item.eligibleDepartments, ...item.eligibleClassYears];
  const katilimBicimi =
    item.eventMode === 'online'
      ? 'Çevrim içi'
      : item.eventMode === 'hybrid'
        ? 'Karma (yüz yüze + çevrim içi)'
        : item.eventMode === 'in_person'
          ? 'Yüz yüze'
          : null;
  /* Tek taraf biliniyorsa o taraf yazılıyor; yarısı bilinen bir aralık hiç bilinmeyenden fazlasını söylüyor. */
  const yasAraligi =
    item.ageMin != null && item.ageMax != null
      ? `${item.ageMin}–${item.ageMax} yaş`
      : item.ageMin != null
        ? `En az ${item.ageMin} yaş`
        : item.ageMax != null
          ? `En çok ${item.ageMax} yaş`
          : null;
  /* İki damgadan YENİ olanı; ikisi de boşsa null. */
  const sonKontrol = [item.sourceCheckedAt, item.lastCheckedAt]
    .filter(Boolean)
    .sort()
    .pop();
  const odemeDonemi = item.paymentPeriod
    ? ((ODEME_DONEMI_ETIKETLERI as Record<string, string>)[item.paymentPeriod] ?? null)
    : null;

  /*
    ANA EYLEM: NEREYE GİTTİĞİNİ SÖYLÜYOR

    Başvuru kurumun kendi sayfasında yapılıyor. Düğme "Başvur" deseydi
    başvurunun burada alındığını ima ederdi; "Resmî sitede başvur" hem
    eylemi hem de siteden çıkıldığını söylüyor.

    Etiket adrese göre değişiyor: doğrudan başvuru adresi yoksa kullanıcı
    kurumun kaynak sayfasına gidiyor ve orada bir başvuru formu
    olmayabilir. Var olmayan bir forma "başvur" demek yerine "Resmî
    kaynağa git" deniyor (gerekçesi opportunityCta içinde ölçülmüş).

    `DisBaglanti` gerçek bir `<a>` üretiyor: target="_blank" ve
    rel="noopener noreferrer nofollow". Yeni sekme açan bağlantıda
    `noopener` olmadan açılan sayfa `window.opener` üzerinden bu sekmeyi
    yönlendirebiliyor.
  */
  const anaEylem = cta && !suresiDoldu && (
    <DisBaglanti
      href={cta.adres}
      girisGerekli={!userId}
      onGirisGerekli={onRequireLogin}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:w-auto"
    >
      {!userId
        ? 'Başvurmak için giriş yap'
        : item.applicationUrl
          ? 'Resmî sitede başvur'
          : 'Resmî kaynağa git'}
      <ExternalLink className="h-4 w-4" aria-hidden />
    </DisBaglanti>
  );

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-[calc(150px+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-12 sm:pt-7">
      <button
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1 text-sm font-bold text-gray-600 hover:text-gray-950"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Fırsatlara dön
      </button>

      {/*
        Şerit sayfanın EN ÜSTÜNDE: aşağıdaki bütün bilgiler geçmiş bir
        döneme ait ve okuyucu bunu ilk satırda bilmeli.
      */}
      {suresiDoldu && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
          Bu fırsatın süresi doldu. Aşağıdaki bilgiler geçmiş döneme ait; yeni takvim açıklandığında
          kayıt güncelleniyor.
        </p>
      )}

      {/* ------------------------------------------------------------ üst */}
      <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="relative">
          <ScholarshipCover
            coverImageUrl={item.coverImageUrl}
            logoUrl={item.organizationLogoUrl}
            organizationName={item.organizationName}
            title={item.title}
          />
          {/* İki eylem de 44 piksel: telefonda dokunma hedefi altına düşmüyor. */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <button
              type="button"
              aria-label={paylasimDurumu === 'kopyalandi' ? 'Bağlantı kopyalandı' : 'Paylaş'}
              onClick={paylas}
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/90 text-gray-700 backdrop-blur transition-colors hover:bg-white"
            >
              {paylasimDurumu === 'kopyalandi' ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Share2 className="h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              aria-label={saved ? 'Kaydı kaldır' : 'Kaydet'}
              aria-pressed={saved}
              onClick={toggle}
              className={`grid h-11 w-11 cursor-pointer place-items-center rounded-full backdrop-blur transition-colors ${
                saved ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
            >
              <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} aria-hidden />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
              {opportunityTypeLabel(item.opportunityType)}
            </span>
            {/* Kırmızı kalktı: açık bir burs hata gibi görünmemeli. */}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${
                tarihDurumu === 'son-gunler'
                  ? 'bg-amber-50 text-amber-900 ring-amber-200'
                  : tarihDurumu === 'yakin'
                    ? 'bg-green-50 text-green-800 ring-green-200'
                    : durum === 'acik'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : durum === 'yakinda'
                        ? 'bg-blue-50 text-blue-700 ring-blue-100'
                        : 'bg-gray-100 text-gray-600 ring-gray-200'
              }`}
            >
              {OPPORTUNITY_STATUS_LABELS[durum]}
            </span>
            {item.verifiedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resmî kaynaktan doğrulandı
              </span>
            )}
          </div>

          <h1 className="mt-2.5 text-2xl font-extrabold leading-tight text-gray-950 sm:text-3xl">
            {item.title}
          </h1>
          <p className="mt-1.5 font-semibold text-gray-600">{item.organizationName}</p>

          {/*
            Detayda da aynı gösterge: kart ile detay arasında iki farklı
            tarih dili olmasın. Genişliği sınırlı, çünkü burada tüp bir
            yardımcı sinyal — asıl odak başlık ve başvuru düğmesi.
          */}
          <ZamanTupu item={item} className="mt-3 max-w-xs" />

          {/* Masaüstünde burada; mobilde altta yapışkan olarak da duruyor. */}
          <div className="mt-5 hidden sm:block">{anaEylem}</div>
          <p className="mt-2 hidden text-xs text-gray-500 sm:block">
            Başvuru kurumun kendi sayfasında yapılıyor. StajımVar üzerinden başvuru alınmıyor.
          </p>

          {(item.description || item.shortDescription) && (
            <p className="mt-6 whitespace-pre-line leading-relaxed text-gray-700">
              {item.description || item.shortDescription}
            </p>
          )}
        </div>
      </article>

      {/* --------------------------------------------------- bilgi bölümleri */}
      {/*
        KUTU ANCAK VERİ VARSA ÇİZİLİYOR

        "Gerekli belgeler: Resmî kaynakta belirtiliyor." gibi satırlar
        hiçbir şey söylemeyen ama okunmayı bekleyen bloklardı. Alan boşsa
        kutu yok. İki istisna var ve ikisi de bilinçli: "Kimler
        başvurabilir" ve "Şehir şartı" — o iki soruda SUSMAK, öğrencinin
        şartı yok sanmasına yol açıyordu, o yüzden bilmediğimizi açıkça
        söylüyoruz.
      */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Bilgi baslik="Kimler başvurabilir?">
          {item.eligibility || 'Koşullar resmî kaynakta belirtiliyor.'}
        </Bilgi>
        {seviyeVeBolum.length > 0 && (
          <Bilgi baslik="Eğitim seviyesi ve bölümler">{seviyeVeBolum.join(', ')}</Bilgi>
        )}
        {item.academicYear && <Bilgi baslik="Akademik yıl">{item.academicYear}</Bilgi>}
        <Bilgi baslik="Şehir şartı">
          {/*
            "Türkiye geneli" ancak DOĞRULANMIŞSA söyleniyor.

            Boş şehir listesi iki zıt şey demek olabiliyordu: kaynak
            okundu ve şart yok, ya da kaynak hiç okunmadı. İkincisine
            "Türkiye geneli" demek, Ankara'da oturma şartı olabilecek bir
            bursu İzmir'deki öğrenciye olgu diye sunmaktı.
          */}
          {yer.length
            ? yer.join(', ')
            : turkiyeGeneliMi(item)
              ? 'Şehir şartı yok; Türkiye geneli.'
              : 'Şehir şartını resmî kaynaktan kontrol edin.'}
        </Bilgi>
        {/*
          ETKİNLİK BİLGİSİ — KARİYER GÜNÜ VE FUARLARDA

          `event_mode`, `venue_name` ve `starts_at` burs/program
          kayıtlarında NULL; üçü de boşken kutu hiç çizilmiyor.
        */}
        {(katilimBicimi || item.venueName || item.startsAt) && (
          <Bilgi baslik="Etkinlik">
            {[
              katilimBicimi,
              item.venueName,
              item.startsAt ? `${uzunTarih(item.startsAt)} tarihinde` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Bilgi>
        )}
        {item.minimumGpa != null && (
          <Bilgi baslik="En düşük not ortalaması">{item.minimumGpa}</Bilgi>
        )}
        {item.languageRequirements.length > 0 && (
          <Bilgi baslik="Dil şartı">{item.languageRequirements.join(', ')}</Bilgi>
        )}
        {yasAraligi && <Bilgi baslik="Yaş şartı">{yasAraligi}</Bilgi>}
        {item.incomeRequirement && <Bilgi baslik="Gelir şartı">{item.incomeRequirement}</Bilgi>}
        <Bilgi baslik="Tutar ve ödeme">
          {/*
            Tutar YALNIZCA resmî kaynaktan doğrulanmışsa yazılıyor. Geçen
            yılın rakamını bu yılınmış gibi sunmak, hiç göstermemekten
            kötü.
          */}
          {tutar.bilinmiyor ? (
            <>
              Resmî kaynakta açıklanmadı
              {tutar.geriOdeme && <span className="font-semibold"> · {tutar.geriOdeme}</span>}
            </>
          ) : (
            <>
              <span className="font-bold">{tutar.metin}</span>
              {tutar.geriOdeme && <span> · {tutar.geriOdeme}</span>}
              {odemeDonemi && <span> · {odemeDonemi}</span>}
              {tutar.donem && <span className="block text-xs text-gray-500">{tutar.donem}</span>}
            </>
          )}
        </Bilgi>
        {item.requiredDocuments.length > 0 && (
          <Bilgi baslik="Gerekli belgeler">{item.requiredDocuments.join(', ')}</Bilgi>
        )}
        {onemliTarihler && <Bilgi baslik="Önemli tarihler">{onemliTarihler}</Bilgi>}
      </div>

      {/* ------------------------------------------- kaynak ve doğrulama */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-extrabold text-gray-900">Resmî kaynak</h2>
        {cta ? (
          <DisBaglanti
            href={cta.adres}
            girisGerekli={!userId}
            onGirisGerekli={onRequireLogin}
            kapiEtiketi="Kaynağa gitmek için giriş yap"
            className="mt-1.5 inline-flex items-center gap-1.5 break-all text-left text-sm font-bold text-blue-700 hover:underline"
          >
            {!userId ? 'Kaynağa gitmek için giriş yap' : cta.adres}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </DisBaglanti>
        ) : (
          <p className="mt-1.5 text-sm text-gray-600">Kaynak bağlantısı kayıtta yok.</p>
        )}
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">
          {/* Otomatik kaynak kontrolü `source_checked_at`e yazıyor; elle doğrulama
              `last_checked_at`e. Yeni olan hangisiyse o gösteriliyor. */}
          {sonKontrol
            ? `Bu kaydı en son ${uzunTarih(sonKontrol)} tarihinde resmî kaynağından kontrol ettik.`
            : 'Bu kaydın kaynağı doğrulandı.'}
          {tutar.donem ? ` Tutar ${tutar.donem} için geçerli.` : ''} Koşullar ve tarihler kurum
          tarafından değiştirilebilir; başvurmadan önce resmî kaynağı kontrol et.
        </p>
      </section>

      {/*
        BAŞKA BURS ALIYORSAN

        Kaynağı gördükten sonra gelen ikinci soru bu. Metin burada elle
        yazılmıyor: matris sayfasıyla aynı veri katmanından besleniyor, yoksa
        biri güncellenip diğeri eskirdi.
      */}
      <BursUyumMiniBlok kurumId={uyumKurumu} />

      {/* ---------------------------- kontrol listesi ---------------------- */}
      <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-gray-900">Başvuru hazırlığın</h2>
          {kaydediliyor && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
          Bu liste yalnızca senin takibin için. İşaretlemek kuruma hiçbir şey göndermiyor — başvuru
          {cta ? ' resmî sayfada' : ' kurumun kendi sayfasında'} yapılıyor.
        </p>

        {!userId ? (
          <button
            onClick={onRequireLogin}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white cursor-pointer"
          >
            Listeyi kullanmak için giriş yap
          </button>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {ADIMLAR.map((adim) => {
                const tamam = adimlar.includes(adim.anahtar);
                return (
                  <li key={adim.anahtar}>
                    <button
                      onClick={() => adimiDegistir(adim.anahtar)}
                      aria-pressed={tamam}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors cursor-pointer ${
                        tamam
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 font-semibold'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${
                          tamam ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'
                        }`}
                      >
                        {tamam && <Check className="w-3.5 h-3.5" />}
                      </span>
                      {adim.etiket}
                    </button>
                  </li>
                );
              })}
            </ul>
            {listeHatasi && <p className="mt-3 text-xs font-semibold text-rose-600">{listeHatasi}</p>}
            <p className="mt-3 text-xs text-gray-500">
              {adimlar.length} / {ADIMLAR.length} adım tamamlandı.
            </p>
          </>
        )}
      </section>

      {/*
        MOBİLDE YAPIŞKAN BAŞVURU

        Detay sayfası telefonda uzun: kapak, açıklama, altı bilgi kutusu
        ve kontrol listesi. Ana eylem yalnızca en üstte kalınca öğrenci
        sayfayı okuyup başvurmak için başa dönmek zorunda kalıyordu.

        Alt gezinme çubuğunun üstünde duruyor ve güvenli alan payı
        ekliyor; sabit bir değer verilseydi çentikli telefonlarda düğmenin
        bir kısmı ekranın dışında kalırdı.
      */}
      {anaEylem && (
        <div
          className="fixed inset-x-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden"
          style={{ bottom: 'calc(68px + env(safe-area-inset-bottom))' }}
        >
          {anaEylem}
          <p className="mt-1.5 text-center text-[11px] text-gray-500">
            Başvuru kurumun kendi sayfasında yapılıyor.
          </p>
        </div>
      )}

      {/*
        BAĞLAMA GÖRE DEVAM

        Fırsatın KENDİ türüne bakıyor (`opportunity_type`), rastgele üç
        kart değil. Tanımadığı tür için hiçbir şey çizmiyor: alakasız
        bağlantı, hiç bağlantı olmamasından kötü.

        Gerçek <a href>: tarayıcı bu bağlantıları izleyebilsin.
      */}
      {devamEylemleri.length > 0 && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
          <h2 className="text-sm font-extrabold text-gray-900">Buradan devam et</h2>
          <ul className="mt-2.5 space-y-2">
            {devamEylemleri.map((e) => (
              <li key={e.yol}>
                <a
                  href={e.yol}
                  className="block rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <span className="block text-sm font-bold text-gray-900">{e.baslik}</span>
                  <span className="block text-xs leading-relaxed text-gray-500">{e.aciklama}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
};
