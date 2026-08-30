import React from 'react';
import { AlertTriangle, Check, ExternalLink, Loader2 } from 'lucide-react';
import { BOLUMLER } from '../data/bolumler';
import oneriVerisi from '../data/burs-onerileri.json';
import {
  DURUM,
  DURUM_ETIKETI,
  incelemeSirasi,
  kapsamaOzeti,
  kisitDurumu,
} from '../lib/burs-uygunluk.mjs';
import { adminSetOpportunityEligibility, fetchAdminOpportunities } from '../lib/opportunity-admin';

/**
 * Burs doğrulama masası.
 *
 * NE ÇÖZÜYOR
 * ----------
 * 68 bursun uygunluk kısıtları elle, kaynak okunarak doğrulanmak
 * zorunda. Bunu düzenleme formunda yapmak kayıt başına birkaç sayfa
 * gezinme demekti. Burada tek ekranda kaynak bağlantısı, mevcut değer,
 * denetim aracının önerisi ve üç seçenekli karar var.
 *
 * ÜÇ SEÇENEK, İKİ DEĞİL
 * ---------------------
 * "Doğrulanmadı" ile "kısıt yok" ayrı iki karar. Boş bırakmak bir cevap
 * değil; kısıtın olmadığını GÖRDÜĞÜNÜ söylemek bir cevap. Bu ayrım
 * olmadan kısıtları bilinmeyen bir burs "herkese açık" sanılıyordu.
 *
 * ALAN BAZLI
 * ----------
 * Bölümü doğrulamak seviyeyi doğrulamıyor. Her boyutun kendi düğmesi ve
 * kendi zaman damgası var.
 *
 * KARAR SUNUCUDA YAZILIYOR
 * ------------------------
 * Düğmeler `admin_set_opportunity_eligibility` çağırıyor; o fonksiyon
 * security definer ve `is_admin()` soruyor. Bu ekranı görmek yetki
 * vermiyor.
 */

type Boyut = 'departments' | 'education_levels' | 'cities';
type Karar = 'unverified' | 'unrestricted' | 'restricted';

const SEVIYELER = ['Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora'];

const BOYUT_BILGISI: {
  boyut: Boyut;
  anahtar: 'bolum' | 'seviye' | 'sehir';
  etiket: string;
  kisitYokEtiketi: string;
  secenekler: string[] | null;
  alan: string;
}[] = [
  {
    boyut: 'departments',
    anahtar: 'bolum',
    etiket: 'Bölüm / alan',
    kisitYokEtiketi: 'Bölüm kısıtı yok',
    secenekler: BOLUMLER.map((b) => b.ad),
    alan: 'eligible_departments',
  },
  {
    boyut: 'education_levels',
    anahtar: 'seviye',
    etiket: 'Eğitim seviyesi',
    kisitYokEtiketi: 'Seviye kısıtı yok',
    secenekler: SEVIYELER,
    alan: 'education_levels',
  },
  {
    boyut: 'cities',
    anahtar: 'sehir',
    etiket: 'Şehir / ikamet',
    /* "Türkiye geneli" şehirleri tek tek yazarak değil, KISIT YOK ile ifade ediliyor. */
    kisitYokEtiketi: 'Türkiye geneli (şehir şartı yok)',
    secenekler: null,
    alan: 'cities',
  },
];

/** Veritabanı satırını uygunluk yardımcısının beklediği biçime çevirir. */
const uygunlukGorunumu = (r: any) => ({
  id: r.id,
  title: r.title,
  applicationDeadline: r.application_deadline,
  eligibleDepartments: r.eligible_departments ?? [],
  educationLevels: r.education_levels ?? [],
  cities: r.cities ?? [],
  departmentsVerifiedAt: r.departments_verified_at,
  educationLevelsVerifiedAt: r.education_levels_verified_at,
  citiesVerifiedAt: r.cities_verified_at,
  amountVerifiedAt: r.amount_verified_at,
});

const ONERILER = (oneriVerisi as any).kayitlar ?? {};

export const BursDogrulamaMasasi: React.FC<{ onNavigate: (p: string) => void }> = ({
  onNavigate,
}) => {
  const [rows, setRows] = React.useState<any[]>([]);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [hata, setHata] = React.useState('');
  const [acikId, setAcikId] = React.useState<string | null>(null);

  const yukle = React.useCallback(async () => {
    setDurum('yukleniyor');
    try {
      const r = await fetchAdminOpportunities(0, '');
      setRows(r.rows as any[]);
      setDurum('hazir');
    } catch (e: any) {
      setHata(e.message);
      setDurum('hata');
    }
  }, []);

  React.useEffect(() => {
    void yukle();
  }, [yukle]);

  const gorunum = React.useMemo(() => rows.map(uygunlukGorunumu), [rows]);
  const ozet = React.useMemo(() => kapsamaOzeti(gorunum), [gorunum]);
  const oneriSayisi = React.useMemo(() => {
    const s: Record<string, number> = {};
    for (const [id, k] of Object.entries(ONERILER)) s[id] = (k as any).oneriler?.length ?? 0;
    return s;
  }, []);
  const sirali = React.useMemo(
    () => incelemeSirasi(gorunum, oneriSayisi).map((g: any) => rows.find((r) => r.id === g.id)),
    [gorunum, oneriSayisi, rows]
  );

  if (durum === 'yukleniyor')
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      </main>
    );
  if (durum === 'hata')
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">
          {hata}
        </p>
      </main>
    );

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
      <button onClick={() => onNavigate('/yonetim/firsatlar')} className="text-sm font-bold text-blue-700">
        ← Fırsat listesine dön
      </button>

      <header className="space-y-2">
        <h1 className="text-2xl font-extrabold text-gray-900">Burs doğrulama masası</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-600">
          Her boyut için kaynağı açıp üç karardan birini ver. <b>Boş bırakmak bir cevap
          değil</b>: kısıt olmadığını görmek ayrı bir karar ve o bursu her öğrenciye açıyor.
          Emin değilsen "Doğrulanmadı" bırak.
        </p>
      </header>

      {/* --------------------------------------------------- ilerleme */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Bölüm', ozet.bolumDogrulandi],
          ['Eğitim seviyesi', ozet.seviyeDogrulandi],
          ['Şehir', ozet.sehirDogrulandi],
          ['Tutar', ozet.tutarDogrulandi],
        ].map(([etiket, sayi]) => (
          <div key={String(etiket)} className="rounded-2xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{etiket}</p>
            <p className="text-xl font-black text-gray-900">
              {sayi} <span className="text-sm font-bold text-gray-400">/ {ozet.toplam}</span>
            </p>
          </div>
        ))}
      </section>
      <p className="text-sm text-gray-600">
        <b>{ozet.ucBoyutTamam}</b> burs üç boyutta da doğrulandı ve kişiselleştirmeye
        girebilir. <b>{ozet.hicDokunulmamis}</b> kayda hiç dokunulmadı.
      </p>

      {/* ------------------------------------------------------ liste */}
      <ul className="space-y-2">
        {sirali.filter(Boolean).map((r: any) => (
          <BursSatiri
            key={r.id}
            kayit={r}
            acik={acikId === r.id}
            onAc={() => setAcikId(acikId === r.id ? null : r.id)}
            onKaydedildi={yukle}
          />
        ))}
      </ul>
    </main>
  );
};

/* ------------------------------------------------------------ tek satır */

const BursSatiri: React.FC<{
  kayit: any;
  acik: boolean;
  onAc: () => void;
  onKaydedildi: () => void;
}> = ({ kayit, acik, onAc, onKaydedildi }) => {
  const gorunum = uygunlukGorunumu(kayit);
  const oneri = ONERILER[kayit.id];
  const kaynakSorunu = oneri && ['C', 'D', 'E', 'F'].includes(oneri.sinif);

  return (
    <li className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onAc}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-gray-900">{kayit.title}</span>
          <span className="block truncate text-xs text-gray-500">{kayit.organization_name}</span>
        </span>

        {kaynakSorunu && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            Kaynak sorunu
          </span>
        )}
        {oneri?.oneriler?.length > 0 && (
          <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
            {oneri.oneriler.length} öneri
          </span>
        )}

        {BOYUT_BILGISI.map((b) => {
          const d = kisitDurumu(gorunum, b.anahtar);
          return (
            <span
              key={b.boyut}
              title={`${b.etiket}: ${DURUM_ETIKETI[d]}`}
              className={`hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block ${
                d === DURUM.DOGRULANMADI
                  ? 'bg-gray-300'
                  : d === DURUM.KISIT_YOK
                    ? 'bg-emerald-500'
                    : 'bg-blue-600'
              }`}
            />
          );
        })}
      </button>

      {acik && (
        <div className="space-y-4 border-t border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <a
              href={kayit.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
            >
              Resmî kaynağı aç <ExternalLink className="h-3 w-3" />
            </a>
            {kayit.application_url && (
              <a
                href={kayit.application_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
              >
                Başvuru sayfası <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <span className="text-gray-600">
              Son başvuru: {kayit.application_deadline?.slice(0, 10) || '—'}
            </span>
            <span className="text-gray-600">
              Tutar: {kayit.amount_verified_at ? `${kayit.amount_min ?? '?'} (doğrulandı)` : '—'}
            </span>
          </div>

          {kaynakSorunu && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              <b>Kaynak sorunu ({oneri.sinif}, HTTP {String(oneri.http)}).</b>{' '}
              {oneri.notlar?.join(' · ')} — kaydı otomatik arşivlemedik. Kaynağın yeni
              adresini bulup düzenleme formundan güncelle ya da kaydı arşivle.
            </p>
          )}

          {BOYUT_BILGISI.map((b) => (
            <BoyutKarari
              key={b.boyut}
              bilgi={b}
              kayit={kayit}
              gorunum={gorunum}
              oneri={oneri}
              onKaydedildi={onKaydedildi}
            />
          ))}
        </div>
      )}
    </li>
  );
};

/* --------------------------------------------------------- boyut kararı */

const BoyutKarari: React.FC<{
  bilgi: (typeof BOYUT_BILGISI)[number];
  kayit: any;
  gorunum: any;
  oneri: any;
  onKaydedildi: () => void;
}> = ({ bilgi, kayit, gorunum, oneri, onKaydedildi }) => {
  const mevcutDurum = kisitDurumu(gorunum, bilgi.anahtar);
  const mevcutListe: string[] = kayit[bilgi.alan] ?? [];
  const [secim, setSecim] = React.useState<string[]>(mevcutListe);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [hata, setHata] = React.useState('');

  const alanOnerisi = oneri?.oneriler?.find(
    (o: any) => o.alan === (bilgi.boyut === 'departments' ? 'eligible_departments' : bilgi.alan)
  );

  const kaydet = async (karar: Karar, degerler: string[] = []) => {
    setKaydediliyor(true);
    setHata('');
    try {
      await adminSetOpportunityEligibility(kayit.id, kayit.updated_at, bilgi.boyut, karar, degerler);
      onKaydedildi();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-900">{bilgi.etiket}</span>
        <span
          className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
            mevcutDurum === DURUM.DOGRULANMADI
              ? 'bg-gray-100 text-gray-600'
              : mevcutDurum === DURUM.KISIT_YOK
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-blue-50 text-blue-700'
          }`}
        >
          {DURUM_ETIKETI[mevcutDurum]}
          {mevcutDurum === DURUM.KISITLI ? `: ${mevcutListe.join(', ')}` : ''}
        </span>
        {kaydediliyor && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      </div>

      {/* Denetim aracının önerisi — kanıtıyla birlikte. */}
      {alanOnerisi && (
        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
          <p className="text-[11px] font-bold text-blue-900">
            Denetim önerisi: {JSON.stringify(alanOnerisi.onerilen)}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-blue-800">{alanOnerisi.kanit}</p>
          <button
            type="button"
            disabled={kaydediliyor}
            onClick={() =>
              void kaydet(
                'restricted',
                Array.isArray(alanOnerisi.onerilen) ? alanOnerisi.onerilen : [alanOnerisi.onerilen]
              )
            }
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
            Kaynağı gördüm, kabul et
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={kaydediliyor}
          onClick={() => void kaydet('unverified')}
          className="cursor-pointer rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-700 disabled:opacity-50"
        >
          Doğrulanmadı
        </button>
        <button
          type="button"
          disabled={kaydediliyor}
          onClick={() => void kaydet('unrestricted')}
          className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 disabled:opacity-50"
        >
          {bilgi.kisitYokEtiketi}
        </button>
      </div>

      {/* Belirli değerler: taksonomiden seçim, serbest metin yok. */}
      {bilgi.secenekler ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-bold text-gray-600">
            Belirli {bilgi.etiket.toLocaleLowerCase('tr-TR')} seç
          </summary>
          <div className="mt-2 flex flex-wrap gap-1">
            {bilgi.secenekler.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setSecim((o) => (o.includes(s) ? o.filter((x) => x !== s) : [...o, s]))
                }
                className={`cursor-pointer rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  secim.includes(s) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={kaydediliyor || secim.length === 0}
            onClick={() => void kaydet('restricted', secim)}
            className="mt-2 cursor-pointer rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-40"
          >
            Seçilenleri kısıt olarak kaydet
          </button>
          {/*
            Taksonomi yetmiyorsa uyarı: "Mühendislik Fakültesi öğrencileri"
            ifadesini on beş bölüm seçerek temsil etmek, olmayan bir kısıtı
            varmış gibi kaydetmek olur.
          */}
          {bilgi.boyut === 'departments' && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800">
              Kaynak "Mühendislik Fakültesi" gibi bir FAKÜLTE diyorsa bölümleri tek tek
              seçme — hangi bölümlerin o fakültede olduğu okula göre değişiyor. Böyle bir
              kayıt "Doğrulanmadı" kalmalı.
            </p>
          )}
        </details>
      ) : (
        <p className="mt-1.5 text-[11px] text-gray-500">
          Belirli şehir kısıtı varsa düzenleme formundan gir; burada yalnızca "kısıt yok"
          kararı veriliyor.
        </p>
      )}

      {hata && <p className="mt-2 text-[11px] font-semibold text-rose-700">{hata}</p>}
    </div>
  );
};
