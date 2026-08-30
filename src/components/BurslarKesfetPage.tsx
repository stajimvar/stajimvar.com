import React from 'react';
import { ChevronDown, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import type { StudentProfile } from '../types';
import { GoogleAdBanner } from './GoogleAdBanner';
import { ScholarshipDiscoveryCard } from './ScholarshipDiscoveryCard';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import {
  fetchOpportunities,
  fetchSavedOpportunityIds,
  toggleSavedOpportunity,
  type Opportunity,
} from '../lib/opportunities';
import {
  BOS_SUZGEC,
  TURKIYE_GENELI,
  bursBolumleri,
  bursSonuclari,
  bursSuzgecSecenekleri,
  suzgecAktifMi,
} from '../lib/burs-kesif.mjs';
import { isExpiredOpportunity, opportunityStatus } from '../lib/opportunity-domain.mjs';

/**
 * Bursları Keşfet.
 *
 * NEDEN ÜÇ SÜTUN KALKTI
 * ---------------------
 * Sayfa solda kalıcı süzgeç paneli, ortada uzun yatay ilan listesi, sağda
 * kategori kutusu olan bir yönetim paneli görünümündeydi. Üç sütunun
 * ikisi her ekranda aynı şeyi tekrarlıyordu (aynı süzgeç solda açılır
 * kutu, sağda kategori düğmesi, ortada çip olarak üç kez vardı) ve
 * ortadaki liste bir vitrin değil bir tabloydu.
 *
 * Burs arayan öğrenci "hangi filtreyi seçeyim" diye başlamıyor; "bana ne
 * var, ne kaçıyor" diye başlıyor. Sayfa artık Keşfet ile aynı tasarım
 * ailesinde bir vitrin: bölümler hazır seçkiler, süzgeçler tek yatay
 * satırda, arama yapılınca vitrin kapanıp tek ızgara açılıyor.
 *
 * SAYAÇLAR ROZET OLDU
 * -------------------
 * "21 açık / 17 yakında / 4 takipte" üç büyük tıklanabilir gösterge
 * hâlindeydi ve sayfanın en dikkat çeken öğesiydi. Kaç burs olduğu bir
 * karar değiştirmiyor; başlığın altında küçük bilgi rozetleri yetiyor.
 */

const BASLIK = 'Eğitimine destek olacak bursları keşfet';
const ALT_BASLIK =
  'Doğrulanmış bursları, eğitim desteklerini ve yurt dışı fırsatlarını tek yerde incele; tarihlerini kaçırma.';

type Suzgec = typeof BOS_SUZGEC;

export const BurslarKesfetPage: React.FC<{
  userId: string | null;
  student: StudentProfile | null;
  onNavigate: (path: string) => void;
  onRequireLogin: () => void;
}> = ({ userId, student, onNavigate, onRequireLogin }) => {
  const [items, setItems] = React.useState<Opportunity[]>([]);
  const [saved, setSaved] = React.useState<string[]>([]);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [suzgec, setSuzgec] = React.useState<Suzgec>(BOS_SUZGEC);
  const [panelAcik, setPanelAcik] = React.useState(false);
  const [kayitHatasi, setKayitHatasi] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.title = 'Bursları keşfet | StajımVar';
    const canonical =
      document.querySelector('link[rel="canonical"]') ||
      Object.assign(document.createElement('link'), { rel: 'canonical' });
    canonical.setAttribute('href', `${window.location.origin}/burslar`);
    document.head.appendChild(canonical);
  }, []);

  const yukle = React.useCallback(() => {
    setDurum('yukleniyor');
    let iptal = false;
    Promise.all([
      fetchOpportunities(),
      userId ? fetchSavedOpportunityIds(userId) : Promise.resolve([]),
    ])
      .then(([satirlar, idler]) => {
        if (iptal) return;
        setItems(satirlar);
        setSaved(idler);
        setDurum('hazir');
      })
      .catch(() => {
        if (!iptal) setDurum('hata');
      });
    return () => {
      iptal = true;
    };
  }, [userId]);

  React.useEffect(() => yukle(), [yukle]);

  const secenekler = React.useMemo(() => bursSuzgecSecenekleri(items), [items]);
  const aramaModu = suzgecAktifMi(suzgec);

  const bolumler = React.useMemo(
    () => (aramaModu ? [] : bursBolumleri(items, { student })),
    [items, student, aramaModu]
  );
  const sonuclar = React.useMemo(
    () => (aramaModu ? bursSonuclari(items, suzgec) : []),
    [items, suzgec, aramaModu]
  );

  /* Rozetler: sayaç değil, tek satırlık bilgi. */
  const rozetler = React.useMemo(() => {
    const canli = items.filter((i) => !isExpiredOpportunity(i));
    return {
      acik: canli.filter((i) => opportunityStatus(i) === 'acik').length,
      yakinda: canli.filter((i) => opportunityStatus(i) === 'yakinda').length,
      takipte: saved.length,
    };
  }, [items, saved]);

  const kaydet = async (item: Opportunity) => {
    if (!userId) return onRequireLogin();
    const kayitli = saved.includes(item.id);
    /* İyimser güncelleme; hata olursa geri alınıyor ve söyleniyor. */
    setSaved((o) => (kayitli ? o.filter((id) => id !== item.id) : [...o, item.id]));
    setKayitHatasi(null);
    try {
      await toggleSavedOpportunity(userId, item.id, kayitli);
    } catch {
      setSaved((o) => (kayitli ? [...o, item.id] : o.filter((id) => id !== item.id)));
      setKayitHatasi('Kaydedilemedi. Bağlantını kontrol edip tekrar dene.');
    }
  };

  const set = (yama: Partial<Suzgec>) => setSuzgec((o) => ({ ...o, ...yama }));
  const temizle = () => setSuzgec(BOS_SUZGEC);

  /* Kaldırılabilir çipler: hangi süzgeç neyi kısıtlıyor, tek bakışta. */
  const aktifCipler: [keyof Suzgec, string][] = [];
  if (suzgec.q) aktifCipler.push(['q', `"${suzgec.q}"`]);
  if (suzgec.seviye) aktifCipler.push(['seviye', suzgec.seviye]);
  if (suzgec.bolum) aktifCipler.push(['bolum', suzgec.bolum]);
  if (suzgec.tur)
    aktifCipler.push(['tur', secenekler.turler.find(([k]: [string]) => k === suzgec.tur)?.[1] ?? suzgec.tur]);
  if (suzgec.durum)
    aktifCipler.push([
      'durum',
      secenekler.durumlar.find(([k]: [string]) => k === suzgec.durum)?.[1] ?? suzgec.durum,
    ]);
  if (suzgec.yer)
    aktifCipler.push(['yer', suzgec.yer === TURKIYE_GENELI ? 'Türkiye geneli' : suzgec.yer]);

  const suzgecAlanlari = (
    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
      {/*
        Seçeneği olmayan süzgeç ÇİZİLMİYOR. Ölçüldü: 68 kaydın 11'inde
        eğitim seviyesi dolu, bölüm alanı hiçbirinde dolu değil. Boş bir
        açılır kutu, olmayan bir süzme sözü verirdi.
      */}
      <Secim
        etiket="Eğitim seviyesi"
        deger={suzgec.seviye}
        secenekler={secenekler.seviyeler}
        onSec={(v) => set({ seviye: v })}
      />
      <Secim
        etiket="Bölüm / alan"
        deger={suzgec.bolum}
        secenekler={secenekler.bolumler}
        onSec={(v) => set({ bolum: v })}
      />
      <Secim
        etiket="Burs türü"
        deger={suzgec.tur}
        secenekler={secenekler.turler}
        onSec={(v) => set({ tur: v })}
      />
      <Secim
        etiket="Başvuru durumu"
        deger={suzgec.durum}
        secenekler={secenekler.durumlar}
        onSec={(v) => set({ durum: v })}
      />
      <Secim
        etiket="Şehir"
        deger={suzgec.yer}
        secenekler={secenekler.yerler}
        onSec={(v) => set({ yer: v })}
      />
    </div>
  );

  return (
    <main
      className={`w-full ${SAYFA_GENISLIGI} mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-12 space-y-5 sm:space-y-7`}
    >
      <header className="space-y-2.5">
        <p className="text-sm font-bold text-blue-600">Burslar</p>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">{BASLIK}</h1>
        <p className="max-w-3xl text-gray-600">{ALT_BASLIK}</p>

        {durum === 'hazir' && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Rozet>{rozetler.acik} burs başvuruya açık</Rozet>
            {rozetler.yakinda > 0 && <Rozet>{rozetler.yakinda} tanesi yakında açılıyor</Rozet>}
            {rozetler.takipte > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('/kaydedilen-firsatlar')}
                className="cursor-pointer rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
              >
                {rozetler.takipte} burs takibinde
              </button>
            )}
          </div>
        )}
      </header>

      {/* --------------------------------------------------- arama + süzgeç */}
      <section aria-label="Burs arama ve filtreler" className="space-y-2.5">
        <div className="flex items-center gap-2">
          <label className="relative block flex-1">
            <span className="sr-only">Burs ara</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={suzgec.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Burs, kurum veya program ara"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={() => setPanelAcik(true)}
            aria-expanded={panelAcik}
            className="shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-700 shadow-sm lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            Filtrele
            {aktifCipler.length > 0 && (
              <span className="rounded-full bg-blue-600 px-1.5 text-[11px] text-white">
                {aktifCipler.length}
              </span>
            )}
          </button>
        </div>

        {/* Masaüstünde kompakt yatay kontrol satırı. */}
        <div className="hidden lg:block">{suzgecAlanlari}</div>

        {aktifCipler.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Seçili filtreler">
            {aktifCipler.map(([anahtar, etiket]) => (
              <li key={anahtar}>
                <button
                  type="button"
                  onClick={() => set({ [anahtar]: '' } as Partial<Suzgec>)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 hover:bg-blue-100"
                >
                  {etiket}
                  <X className="h-3 w-3" aria-hidden />
                  <span className="sr-only">filtresini kaldır</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={temizle}
                className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-gray-500 hover:text-gray-900 hover:underline"
              >
                Tümünü temizle
              </button>
            </li>
          </ul>
        )}
      </section>

      {kayitHatasi && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {kayitHatasi}
        </p>
      )}

      {/* --------------------------------------------------------- durumlar */}
      {durum === 'yukleniyor' && <Iskelet />}

      {durum === 'hata' && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
          <p className="font-bold text-rose-800">Burslar yüklenemedi.</p>
          <p className="mt-1 text-sm text-gray-600">Bağlantını kontrol edip tekrar dene.</p>
          <button
            type="button"
            onClick={() => yukle()}
            className="mt-4 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* ------------------------------------------------ arama: tek ızgara */}
      {durum === 'hazir' && aramaModu && (
        <section aria-labelledby="burs-sonuclari" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="burs-sonuclari" className="text-xl font-black text-gray-900">
              Sonuçlar
            </h2>
            <p aria-live="polite" className="text-sm text-gray-600">
              {sonuclar.length} burs
            </p>
          </div>

          {sonuclar.length > 0 ? (
            <Izgara>
              {sonuclar.map((item: Opportunity) => (
                <li key={item.id}>
                  <ScholarshipDiscoveryCard
                    item={item}
                    saved={saved.includes(item.id)}
                    onSave={() => void kaydet(item)}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </Izgara>
          ) : (
            <Bos
              baslik="Bu filtrelere uyan burs bulunamadı"
              govde={`Sitede ${items.length} doğrulanmış kayıt var; seçtiğin filtrelere uymuyor.`}
              eylem="Filtreleri temizle"
              onClick={temizle}
            />
          )}
        </section>
      )}

      {/* ----------------------------------------------- vitrin: bölümler */}
      {durum === 'hazir' && !aramaModu && bolumler.length > 0 && (
        <div className="space-y-7">
          {bolumler.map(
            (
              bolum: { id: string; baslik: string; kisisel: boolean; items: Opportunity[] },
              sira: number
            ) => (
              <React.Fragment key={bolum.id}>
                <section aria-labelledby={`bolum-${bolum.id}`} className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id={`bolum-${bolum.id}`} className="text-xl font-black text-gray-900">
                      {bolum.baslik}
                    </h2>
                    {/*
                      "Tümünü gör" bölümü bir süzgece çeviriyor: mobilde
                      şerit yalnızca ilk kartları gösteriyor, geri kalanı
                      görmenin bir yolu olmalı.
                    */}
                    <button
                      type="button"
                      onClick={() => bolumuAc(bolum.id, set)}
                      className="cursor-pointer text-sm font-bold text-blue-700 hover:underline"
                    >
                      Tümünü gör →
                    </button>
                  </div>

                  {bolum.kisisel && (
                    <p className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs leading-relaxed text-blue-900">
                      Profilindeki eğitim seviyesine <b>açıkça uymayanlar</b> çıkarıldı. Bu bir
                      uygunluk garantisi değil; koşulları resmî kaynaktan kontrol et.
                    </p>
                  )}

                  {/*
                    Mobilde kontrollü yatay kaydırma: bir sonraki kartın
                    ucu görünüyor (w-[78vw]), böylece kaydırılabildiği
                    anlaşılıyor. sm'den itibaren ızgara.
                  */}
                  <ul className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-4">
                    {bolum.items.map((item) => (
                      <li key={item.id} className="snap-start">
                        <ScholarshipDiscoveryCard
                          item={item}
                          saved={saved.includes(item.id)}
                          onSave={() => void kaydet(item)}
                          onNavigate={onNavigate}
                          serit
                        />
                      </li>
                    ))}
                  </ul>
                </section>

                {/*
                  Reklam kart gibi değil, TAM SATIR ve açık etiketli.
                  Yayıncı kimliği yoksa GoogleAdBanner üretimde hiçbir şey
                  çizmiyor — sarmalayıcı da o zaman sıfır yükseklik
                  kaplasın diye boşluk sınıfı yok, `:empty` ile kapanıyor.
                */}
                {sira === 1 && (
                  <div className="empty:hidden">
                    <GoogleAdBanner format="in-feed" />
                  </div>
                )}
              </React.Fragment>
            )
          )}
        </div>
      )}

      {durum === 'hazir' && !aramaModu && bolumler.length === 0 && (
        <Bos
          baslik="Şu anda listelenecek burs bulunmuyor"
          govde="Bursları resmî kaynağından doğrulayarak yayımlıyoruz; doğrulayamadığımız hiçbir kaydı listeye almıyoruz."
          eylem="Staj ilanlarına bak"
          onClick={() => onNavigate('/')}
        />
      )}

      {/* ------------------------------------------------------ güven notu */}
      {durum === 'hazir' && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Fırsatları nasıl seçiyoruz?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
            Her kaydın resmî kaynağı doğrulanıyor; kurumun kendi sayfasında görmediğimiz hiçbir
            bursu listeye almıyoruz. Tutar ve son başvuru tarihi her yıl değiştiği için
            uydurmuyoruz — yalnızca resmî kaynakta açıkça yazan tutarı, ait olduğu dönemle
            birlikte gösteriyoruz. Başvurular kurumun kendi sayfasında yapılıyor; StajımVar
            başvuru almıyor.
          </p>
        </section>
      )}

      {/* ------------------------------------------------ mobil süzgeç paneli */}
      {panelAcik && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
          onClick={() => setPanelAcik(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtreler"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-4"
            style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-900">Filtreler</h2>
              <button
                type="button"
                onClick={() => setPanelAcik(false)}
                aria-label="Filtreleri kapat"
                className="cursor-pointer rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {suzgecAlanlari}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={temizle}
                className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={() => setPanelAcik(false)}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white"
              >
                {suzgecAktifMi(suzgec) ? `${sonuclar.length} bursu göster` : 'Kapat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

/* ------------------------------------------------------------------ */

/** Bölüm başlığındaki "Tümünü gör" — bölümü karşılık gelen süzgece çevirir. */
function bolumuAc(id: string, set: (yama: Partial<Suzgec>) => void) {
  if (id === 'son-gunler' || id === 'basvurusu-acik' || id === 'one-cikanlar' || id === 'sana-uygun')
    set({ durum: 'acik' });
  else if (id === 'yakinda') set({ durum: 'yakinda' });
  else if (id === 'turkiye-geneli') set({ yer: TURKIYE_GENELI });
  else if (id === 'yurtdisi-egitim') set({ tur: 'international' });
}

const Rozet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
    {children}
  </span>
);

const Izgara: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</ul>
);

const Secim: React.FC<{
  etiket: string;
  deger: string;
  /* .mjs kaynağından geliyor: tip çıkarımı `string[][]` veriyor. */
  secenekler: string[][];
  onSec: (deger: string) => void;
}> = ({ etiket, deger, secenekler, onSec }) => {
  if (!secenekler || secenekler.length === 0) return null;
  return (
    <label className="relative block lg:w-auto">
      <span className="sr-only">{etiket}</span>
      <select
        value={deger}
        onChange={(e) => onSec(e.target.value)}
        className={`w-full cursor-pointer appearance-none rounded-xl border bg-white py-2.5 pl-3 pr-8 text-sm font-semibold shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 lg:w-auto ${
          deger ? 'border-blue-300 text-blue-800' : 'border-gray-200 text-gray-700'
        }`}
      >
        <option value="">{etiket}</option>
        {secenekler.map(([kod, ad]) => (
          <option key={kod} value={kod}>
            {ad}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </label>
  );
};

const Iskelet: React.FC = () => (
  <div role="status" aria-label="Burslar yükleniyor" className="space-y-7">
    {[0, 1].map((bolum) => (
      <div key={bolum} className="space-y-3">
        <div className="h-6 w-44 animate-pulse rounded-lg bg-gray-100" />
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <li key={k} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="aspect-video animate-pulse bg-gray-100" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

const Bos: React.FC<{
  baslik: string;
  govde: string;
  eylem?: string;
  onClick?: () => void;
}> = ({ baslik, govde, eylem, onClick }) => (
  <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
    <Sparkles className="mx-auto h-8 w-8 text-blue-500" />
    <h2 className="mt-3 font-extrabold text-gray-900">{baslik}</h2>
    <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">{govde}</p>
    {eylem && (
      <button
        type="button"
        onClick={onClick}
        className="mt-4 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
      >
        {eylem}
      </button>
    )}
  </section>
);
