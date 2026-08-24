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
import { opportunityAmount, opportunityDaysLeft } from '../lib/firsat-degerlendirme.mjs';
import { ListingLogo } from './ListingLogo';

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

  React.useEffect(() => {
    if (!item) return;
    document.title = `${item.title} | StajımVar`;
    const d =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement('meta'), { name: 'description' });
    d.setAttribute('content', item.shortDescription);
    document.head.appendChild(d);
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
  const kalan = opportunityDaysLeft(item);
  const yer = [...item.cities, ...item.countries];

  return (
    <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-7 pb-[calc(110px+env(safe-area-inset-bottom))] space-y-5">
      <button
        onClick={onBack}
        className="inline-flex gap-1 items-center text-sm font-bold text-gray-600 hover:text-gray-950 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Fırsatlara dön
      </button>

      <article className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <ListingLogo name={item.organizationName} logoUrl={item.organizationLogoUrl} />
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-blue-700 uppercase">
                  {opportunityTypeLabel(item.opportunityType)}
                </span>
                <span
                  className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                    durum === 'acik'
                      ? 'bg-emerald-50 text-emerald-700'
                      : durum === 'kapali'
                        ? 'bg-gray-100 text-gray-600'
                        : durum === 'yakinda'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {OPPORTUNITY_STATUS_LABELS[durum]}
                </span>
                {item.verifiedAt && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Resmî kaynak
                  </span>
                )}
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-950 leading-tight">{item.title}</h1>
              <p className="mt-2 text-gray-600 font-semibold">{item.organizationName}</p>
            </div>
          </div>
          <button
            aria-label={saved ? 'Takibi bırak' : 'Takip et'}
            onClick={toggle}
            className={`self-start rounded-xl px-3 py-2 text-sm font-bold inline-flex gap-2 cursor-pointer ${
              saved ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Takipte' : 'Takip et'}
          </button>
        </div>

        {/* TUTAR VE TARİH: kararı belirleyen iki bilgi en üstte. */}
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Destek tutarı</p>
            {tutar.bilinmiyor ? (
              <p className="mt-0.5 text-sm text-gray-600">
                Resmî kaynakta açıklanmadı
                {tutar.geriOdeme && <span className="font-semibold text-gray-800"> · {tutar.geriOdeme}</span>}
              </p>
            ) : (
              <>
                <p className="mt-0.5 text-lg font-extrabold text-gray-900 leading-tight">
                  {tutar.metin}
                  {tutar.geriOdeme && <span className="text-sm font-semibold text-gray-600"> · {tutar.geriOdeme}</span>}
                </p>
                {tutar.donem && <p className="text-[11px] text-gray-500">{tutar.donem}</p>}
              </>
            )}
          </div>

          <div
            className={`rounded-xl px-4 py-3 ${
              durum === 'acik' ? 'bg-rose-50' : durum === 'yakinda' ? 'bg-blue-50' : durum === 'kapali' ? 'bg-gray-50' : 'bg-amber-50'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Başvuru</p>
            {durum === 'acik' && (
              <p className="mt-0.5 text-lg font-extrabold text-rose-700 leading-tight">
                {kalan === 0 ? 'Bugün son gün' : kalan === 1 ? 'Yarın sona eriyor' : `${uzunTarih(item.applicationDeadline)}`}
              </p>
            )}
            {durum === 'yakinda' && (
              <p className="mt-0.5 text-sm font-extrabold text-blue-800 leading-snug">
                {uzunTarih(item.applicationStartAt)} tarihinde açılıyor
              </p>
            )}
            {durum === 'kapali' && <p className="mt-0.5 text-sm font-bold text-gray-500">Süresi doldu</p>}
            {durum === 'takvim_bekleniyor' && (
              <p className="mt-0.5 text-sm font-semibold text-amber-800 leading-snug">
                Kurum bu dönemin takvimini açıklamadı.
              </p>
            )}
            {durum === 'acik' && kalan != null && kalan > 1 && (
              <p className="text-[11px] text-gray-600">{kalan} gün kaldı</p>
            )}
          </div>
        </div>

        <p className="mt-6 text-gray-700 leading-relaxed whitespace-pre-line">
          {item.description || item.shortDescription}
        </p>

        <div className="mt-7 grid sm:grid-cols-2 gap-3 text-sm">
          <Bilgi baslik="Kimler başvurabilir?">
            {item.eligibility || item.educationLevels.join(', ') || 'Resmî kaynakta belirtilir.'}
          </Bilgi>
          <Bilgi baslik="Şehir / ülke">{yer.join(', ') || 'Belirtilmemiş'}</Bilgi>
          <Bilgi baslik="Başvuru tarihleri">
            {`${uzunTarih(item.applicationStartAt) || 'Başlangıç belirtilmemiş'} — ${
              uzunTarih(item.applicationDeadline) || 'Son tarih belirtilmemiş'
            }`}
          </Bilgi>
          <Bilgi baslik="Gerekli belgeler">
            {item.requiredDocuments.join(', ') || 'Resmî kaynakta belirtilir.'}
          </Bilgi>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          {cta && (
            <a
              href={cta.adres}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
                cta.birincil ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-800'
              }`}
            >
              {cta.birincil ? null : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {cta.etiket} <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/*
          GÜNCELLİK NOTU

          Sayfanın söylediği şey "böyledir" değil, "en son şu tarihte
          şuradan doğruladık". Burs koşulları ve tutarları yıldan yıla
          değişiyor; kaynağı ve tarihi göstermeden yazılan her rakam bir
          süre sonra sessizce yanlış oluyor.
        */}
        <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-500 leading-relaxed">
          {item.lastCheckedAt
            ? `Bu kaydı en son ${uzunTarih(item.lastCheckedAt)} tarihinde resmî kaynağından kontrol ettik.`
            : 'Bu kaydın kaynağı doğrulandı.'}
          {tutar.donem ? ` Tutar ${tutar.donem} için geçerli.` : ''} Koşullar ve tarihler kurum tarafından
          değiştirilebilir; başvurmadan önce resmî kaynağı kontrol et.
        </p>
      </article>

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
    </main>
  );
};
