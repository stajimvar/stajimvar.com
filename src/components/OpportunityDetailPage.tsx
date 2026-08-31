import React from 'react';
import { ArrowLeft, Bookmark, Check, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
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
import { opportunityAmount } from '../lib/firsat-degerlendirme.mjs';
import { bursTarihDurumu, turkiyeGeneliMi } from '../lib/burs-kesif.mjs';
import { ZamanTupu } from './ZamanTupu';
import { ScholarshipCover } from './ScholarshipCover';
import { sayfaMetaAyarla } from '../lib/sayfa-meta';

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

const uzunTarih = (value?: string) =>
  value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(value)) : null;

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
  const tarihDurumu = bursTarihDurumu(item);
  const yer = [...item.cities, ...item.countries];
  const seviyeVeBolum = [...item.educationLevels, ...item.eligibleDepartments];

  /*
    ANA EYLEM: RESMÎ BAŞVURUYA GİT

    Başvuru kurumun kendi sayfasında yapılıyor. Sayfanın en görünür
    düğmesi bu olmalı ve nereye gittiğini söylemeli — "Başvur" yazan bir
    düğme, başvurunun burada alındığını ima ederdi.
  */
  const anaEylem = cta && (
    <a
      href={cta.adres}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:w-auto"
    >
      {cta.etiket === 'Başvur' ? 'Resmî Başvuruya Git' : cta.etiket}
      <ExternalLink className="h-4 w-4" />
    </a>
  );

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-[calc(150px+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-12 sm:pt-7">
      <button
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1 text-sm font-bold text-gray-600 hover:text-gray-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Burslara dön
      </button>

      {/* ------------------------------------------------------------ üst */}
      <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="relative">
          <ScholarshipCover
            coverImageUrl={item.coverImageUrl}
            logoUrl={item.organizationLogoUrl}
            organizationName={item.organizationName}
            title={item.title}
          />
          <button
            aria-label={saved ? 'Takibi bırak' : 'Takip et'}
            aria-pressed={saved}
            onClick={toggle}
            className={`absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full backdrop-blur transition-colors ${
              saved ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'
            }`}
          >
            <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
          </button>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Bilgi baslik="Kimler başvurabilir?">
          {item.eligibility || 'Koşullar resmî kaynakta belirtiliyor.'}
        </Bilgi>
        <Bilgi baslik="Eğitim seviyesi ve bölümler">
          {seviyeVeBolum.length ? seviyeVeBolum.join(', ') : 'Resmî kaynakta belirtiliyor.'}
        </Bilgi>
        <Bilgi baslik="Şehir şartı">
          {/*
            "Türkiye geneli" ancak DOĞRULANMIŞSA söyleniyor.

            Boş şehir listesi iki zıt şey demek olabiliyordu: kaynak
            okundu ve şart yok, ya da kaynak hiç okunmadı. İkincisine
            "Türkiye geneli" demek, Ankara'da oturma şartı olabilecek bir
            bursu İzmir'deki öğrenciye olgu diye sunmaktı. Doğrulanmamışsa
            bunu açıkça söyleyip kaynağa yönlendiriyoruz.
          */}
          {yer.length
            ? yer.join(', ')
            : turkiyeGeneliMi(item)
              ? 'Şehir şartı yok; Türkiye geneli.'
              : 'Şehir şartını resmî kaynaktan kontrol edin.'}
        </Bilgi>
        <Bilgi baslik="Burs miktarı ve ödeme süresi">
          {/*
            Tutar YALNIZCA resmî kaynaktan doğrulanmışsa yazılıyor.
            Bilinmiyorsa burada sade biçimde söyleniyor — kartlarda bu
            satır hiç çizilmiyor, çünkü her kartta tekrar eden ve hiçbir
            şey söylemeyen bir alandı.
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
              {tutar.donem && <span className="block text-xs text-gray-500">{tutar.donem}</span>}
            </>
          )}
        </Bilgi>
        <Bilgi baslik="Gerekli belgeler">
          {item.requiredDocuments.length
            ? item.requiredDocuments.join(', ')
            : 'Resmî kaynakta belirtiliyor.'}
        </Bilgi>
        <Bilgi baslik="Önemli tarihler">
          {`${uzunTarih(item.applicationStartAt) || 'Açılış belirtilmemiş'} — ${
            uzunTarih(item.applicationDeadline) || 'Son tarih belirtilmemiş'
          }`}
        </Bilgi>
      </div>

      {/* ------------------------------------------- kaynak ve doğrulama */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-extrabold text-gray-900">Resmî kaynak</h2>
        {cta ? (
          <a
            href={cta.adres}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-1.5 inline-flex items-center gap-1.5 break-all text-sm font-bold text-blue-700 hover:underline"
          >
            {cta.adres}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        ) : (
          <p className="mt-1.5 text-sm text-gray-600">Kaynak bağlantısı kayıtta yok.</p>
        )}
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">
          {item.lastCheckedAt
            ? `Bu kaydı en son ${uzunTarih(item.lastCheckedAt)} tarihinde resmî kaynağından kontrol ettik.`
            : 'Bu kaydın kaynağı doğrulandı.'}
          {tutar.donem ? ` Tutar ${tutar.donem} için geçerli.` : ''} Koşullar ve tarihler kurum
          tarafından değiştirilebilir; başvurmadan önce resmî kaynağı kontrol et.
        </p>
      </section>

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
    </main>
  );
};
