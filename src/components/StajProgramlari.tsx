import React, { useEffect } from 'react';
import { Bookmark, Building2, ExternalLink, ShieldCheck } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { STAJ_PROGRAMLARI, type StajProgrami } from '../data/stajProgramlari';
import { BOLUMLER, bolumBul } from '../data/bolumler';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { sadelestir } from '../lib/rehber-arama.mjs';
import { kaydedilenIsverenler, isverenKaydiDegistir } from '../lib/rehber-veri';
import type { StudentProfile } from '../types';

/**
 * /staj-programlari — büyük işverenlerin resmi staj sayfaları dizini.
 *
 * Neden dizin, neden ilan değil: src/data/stajProgramlari.ts başında.
 *
 * NE DEĞİŞTİ
 * ----------
 * Sayfa sektöre göre gruplanmış 44 metin kartıydı. "Moda Tasarımı" okuyan
 * biri kendine uygun işvereni bulmak için 44 kartın hepsini okumak
 * zorundaydı; kartta logo yoktu, kurumun tanınırlığı hiç işe yaramıyordu
 * ve adresin doğrulandığı hiçbir yerde yazmıyordu.
 *
 * Şimdi: logo, bölüm ve sektör süzgeci, son kontrol tarihi ve kaydetme.
 *
 * "BAŞVURULAR AÇIK" ETİKETİ YOK
 * -----------------------------
 * Kariyer sayfasının ayakta olması başvuru alındığı anlamına gelmiyor.
 * Doğrulayabildiğimiz şey adresin çalıştığı; kart da tam olarak onu
 * söylüyor. Doğrulayamadığımızı yazmamak bu dizinin kurucu kuralı.
 *
 * TEK KAYNAK
 * ----------
 * `ProgramListesi` hem tarayıcıda hem ön render tarafında çiziliyor. Ön
 * render ayrı bir özet üretseydi iki metin zamanla ayrışır, fark gizleme
 * (cloaking) sayılırdı. Bu yüzden süzgeç ve kaydetme ayrı bir bileşende:
 * ön render onları hiç çizmiyor, listeyi olduğu gibi yazıyor.
 */

const tarihYaz = (deger?: string) => {
  if (!deger) return null;
  const zaman = new Date(deger).getTime();
  if (Number.isNaN(zaman)) return null;
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(zaman)
  );
};

/**
 * Dış bağlantı kartı.
 *
 * `rel="nofollow"` YOK, `noopener` VAR.
 *
 * Bunlar işverenin gerçek kariyer sayfaları; editoryal olarak seçip
 * yönlendirdiğimiz, güvendiğimiz adresler. nofollow koymak "bu bağlantıya
 * kefil değiliz" demek olurdu ve dizinin bütün anlamı tam tersi. noopener
 * ise güvenlik: yeni sekmede açılan sayfa bizim sekmemize erişemesin.
 */
export const Kart: React.FC<{
  program: StajProgrami;
  onNavigate?: (p: string) => void;
  kayitli?: boolean;
  onKaydet?: (slug: string) => void;
  kaydetmeEtiketi?: string;
}> = ({ program, onNavigate, kayitli = false, onKaydet, kaydetmeEtiketi }) => {
  const kontrol = tarihYaz(program.sonKontrol);

  return (
    <div id={program.slug} className="flex h-full flex-col gap-2.5 rounded-2xl border border-gray-200 bg-white p-5 scroll-mt-24">
      <div className="flex items-start gap-3">
        {/*
          Logo kurumun kendi sayfasından indirildi. Dosya yoksa kutu
          gizleniyor — harfli yer tutucu koymak "logo var" izlenimi
          verirdi.
        */}
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-1">
          <img
            src={`/isveren-logolari/${program.slug}.png`}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const kap = e.currentTarget.parentElement;
              if (kap) kap.style.display = 'none';
            }}
            className="h-9 w-9 object-contain"
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug text-gray-900">{program.isveren}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
            {program.sektor}
          </p>
        </div>

        {onKaydet && (
          <button
            type="button"
            aria-pressed={kaydetmeEtiketi ? undefined : kayitli}
            aria-label={kaydetmeEtiketi ?? (kayitli ? 'Kaydı kaldır' : 'İşvereni kaydet')}
            title={kaydetmeEtiketi ?? (kayitli ? 'Kaydı kaldır' : 'İşvereni kaydet')}
            onClick={() => onKaydet(program.slug)}
            className={`-mr-1.5 -mt-1.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors ${
              kayitli ? 'text-blue-700 hover:bg-blue-50' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${kayitli ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      <p className="text-sm leading-relaxed text-gray-600">{program.ozet}</p>

      {/*
        Bölüm bağlantıları: dizini otuz dört bölüm sayfasına bağlıyor.
        Kişi "makine mühendisliği stajı" sayfasından buraya, buradan da
        işverenin kendi sayfasına gidebiliyor.
      */}
      {program.bolumler.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {program.bolumler.map((slug) => {
            const bolum = bolumBul(slug);
            if (!bolum) return null;
            return (
              <a
                key={slug}
                href={`/bolum/${slug}`}
                onClick={(e) => {
                  if (!onNavigate) return;
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  onNavigate(`/bolum/${slug}`);
                }}
                className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-700"
              >
                {bolum.ad}
              </a>
            );
          })}
        </div>
      )}

      {/*
        SON KONTROL — "başvurular açık" DEĞİL

        Söylediğimiz tek şey: bu adresi çağırdık ve çalışıyordu. Kariyer
        sayfasının ayakta olması başvuru alındığı anlamına gelmiyor.
      */}
      {kontrol && (
        <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
          <ShieldCheck className="h-3 w-3" />
          Adres çalışıyor · Son kontrol: {kontrol}
        </p>
      )}

      {/*
        İKİ EYLEM, İKİ FARKLI İŞ

        Birincil: kurumun StajımVar sayfası — ilgili bölümler, kaynak son
        kontrol ve başvuru hazırlığı orada. İkincil: resmî kariyer
        sayfası, doğrudan dışarı.

        Resmî bağlantı KALDIRILMADI: kullanıcıyı bir tıklama daha
        yürütmeye zorlamak, gitmek istediği yeri gizlemek olurdu.
      */}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3">
        <a
          href={`/sirket/${program.slug}`}
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate(`/sirket/${program.slug}`);
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
        >
          Şirketi incele
        </a>
        <a
          href={program.kariyerUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:underline"
        >
          Resmî başvuru sayfası
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};

/** Sektöre göre gruplanmış dizin. Ön render de bu ağacı çiziyor. */
export const ProgramListesi: React.FC<{ onNavigate?: (p: string) => void }> = ({ onNavigate }) => {
  const sektorler = [...new Set(STAJ_PROGRAMLARI.map((p) => p.sektor))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );

  if (STAJ_PROGRAMLARI.length === 0) return null;

  return (
    <>
      {sektorler.map((sektor) => {
        const liste = STAJ_PROGRAMLARI.filter((p) => p.sektor === sektor);
        return (
          <section key={sektor} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold text-gray-900">{sektor}</h2>
              <span className="text-sm text-gray-600">{liste.length} işveren</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liste.map((p) => (
                <Kart key={p.slug} program={p} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ sayfa */

export const StajProgramlariSayfasi: React.FC<{
  onBack: () => void;
  onNavigate: (p: string) => void;
  ogrenci?: StudentProfile | null;
  onGirisGerekli?: () => void;
}> = ({ onBack, onNavigate, ogrenci = null, onGirisGerekli }) => {
  useEffect(() => {
    document.title = 'Büyük işverenlerde staj başvurusu | StajımVar';
  }, []);

  const [bolumSuzgeci, setBolumSuzgeci] = React.useState('');
  const [sektorSuzgeci, setSektorSuzgeci] = React.useState('');
  const [arama, setArama] = React.useState('');
  const [kayitlilar, setKayitlilar] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!ogrenci?.id) return;
    let iptal = false;
    kaydedilenIsverenler(ogrenci.id)
      .then((liste) => {
        if (!iptal) setKayitlilar(new Set(liste));
      })
      .catch(() => {
        /* kaydedilenler okunamazsa sayfa çalışmaya devam etsin */
      });
    return () => {
      iptal = true;
    };
  }, [ogrenci?.id]);

  const kaydet = async (slug: string) => {
    if (!ogrenci?.id) {
      onGirisGerekli?.();
      return;
    }
    const kayitliydi = kayitlilar.has(slug);
    setKayitlilar((o) => {
      const y = new Set(o);
      if (kayitliydi) y.delete(slug);
      else y.add(slug);
      return y;
    });
    try {
      await isverenKaydiDegistir(ogrenci.id, slug, kayitliydi);
    } catch {
      setKayitlilar((o) => {
        const y = new Set(o);
        if (kayitliydi) y.add(slug);
        else y.delete(slug);
        return y;
      });
    }
  };

  const sektorler = React.useMemo(
    () => [...new Set(STAJ_PROGRAMLARI.map((p) => p.sektor))].sort((a, b) => a.localeCompare(b, 'tr')),
    []
  );

  /* Yalnızca EN AZ BİR işvereni olan bölümler süzgeçte: boş seçenek, çalışmayan seçenek. */
  const suzgecBolumleri = React.useMemo(() => {
    const kullanilan = new Set(STAJ_PROGRAMLARI.flatMap((p) => p.bolumler));
    return BOLUMLER.filter((b) => kullanilan.has(b.slug));
  }, []);

  const sonuclar = React.useMemo(() => {
    const terim = sadelestir(arama.trim());
    return STAJ_PROGRAMLARI.filter((p) => {
      if (bolumSuzgeci && !p.bolumler.includes(bolumSuzgeci)) return false;
      if (sektorSuzgeci && p.sektor !== sektorSuzgeci) return false;
      if (terim && !sadelestir(`${p.isveren} ${p.sektor} ${p.ozet}`).includes(terim)) return false;
      return true;
    });
  }, [bolumSuzgeci, sektorSuzgeci, arama]);

  const suzuluyor = Boolean(bolumSuzgeci || sektorSuzgeci || arama.trim());
  const secimSinifi =
    'min-h-11 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600';

  return (
    <SayfaKabugu onBack={onBack} icerikGenisligi={SAYFA_GENISLIGI}>
      <div className="space-y-6">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Büyük işverenlerde staj
          </h1>
          <p className="text-base leading-relaxed text-gray-600 sm:text-lg">
            Türkiye'nin büyük işverenlerinin çoğu staj başvurusunu ilan sitelerinden değil, kendi
            kariyer sayfasından alıyor. Aşağıdakiler o sayfaların doğrulanmış adresleri — başvuru
            doğrudan işverene yapılıyor.
          </p>
        </div>

        {/*
          SÜZGEÇLER

          44 işverenin tamamında kaybolmamak için. "Moda Tasarımı" seçen
          kişi kendine uygun şirketleri görüyor; bölüm eşleşmesi bizim
          editoryal eşleştirmemiz ve veri dosyasında yazıyor.

          ŞEHİR SÜZGECİ YOK: işverenlerin çoğu birden çok şehirde ve
          verimizde şehir alanı yok. Uydurmak yerine koymuyoruz.
        */}
        <section className="grid gap-2.5 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-gray-700">İşveren ara</span>
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Şirket adı veya sektör"
              className={secimSinifi}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-gray-700">Bölüm</span>
            <select
              value={bolumSuzgeci}
              onChange={(e) => setBolumSuzgeci(e.target.value)}
              className={secimSinifi}
            >
              <option value="">Tüm bölümler</option>
              {suzgecBolumleri.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.ad}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-gray-700">Sektör</span>
            <select
              value={sektorSuzgeci}
              onChange={(e) => setSektorSuzgeci(e.target.value)}
              className={secimSinifi}
            >
              <option value="">Tüm sektörler</option>
              {sektorler.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </section>

        {suzuluyor ? (
          sonuclar.length === 0 ? (
            <section className="space-y-3 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-bold text-gray-900">Bu süzgeçlere uyan işveren yok</p>
              <p className="text-sm text-gray-600">
                Dizinde {STAJ_PROGRAMLARI.length} işveren var; süzgeçleri kaldırıp hepsine
                bakabilirsin.
              </p>
              <button
                type="button"
                onClick={() => {
                  setArama('');
                  setBolumSuzgeci('');
                  setSektorSuzgeci('');
                }}
                className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
              >
                Filtreleri temizle
              </button>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold text-gray-900">
                  {bolumSuzgeci ? bolumBul(bolumSuzgeci)?.ad : sektorSuzgeci || 'Sonuçlar'}
                </h2>
                <span className="text-sm text-gray-600">{sonuclar.length} işveren</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sonuclar.map((p) => (
                  <Kart
                    key={p.slug}
                    program={p}
                    onNavigate={onNavigate}
                    kayitli={kayitlilar.has(p.slug)}
                    onKaydet={ogrenci?.id || onGirisGerekli ? kaydet : undefined}
                    kaydetmeEtiketi={ogrenci?.id ? undefined : 'Kaydetmek için giriş yap'}
                  />
                ))}
              </div>
            </section>
          )
        ) : (
          <div className="space-y-8">
            {sektorler.map((sektor) => {
              const liste = STAJ_PROGRAMLARI.filter((p) => p.sektor === sektor);
              return (
                <section key={sektor} className="space-y-4">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-xl font-bold text-gray-900">{sektor}</h2>
                    <span className="text-sm text-gray-600">{liste.length} işveren</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {liste.map((p) => (
                      <Kart
                        key={p.slug}
                        program={p}
                        onNavigate={onNavigate}
                        kayitli={kayitlilar.has(p.slug)}
                        onKaydet={ogrenci?.id || onGirisGerekli ? kaydet : undefined}
                        kaydetmeEtiketi={ogrenci?.id ? undefined : 'Kaydetmek için giriş yap'}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/*
          BAĞIMSIZLIK AÇIKLAMASI

          Logolar kurumu TANITMAK için; ortaklık iddiası taşımıyor. Bunu
          yazmamak, logoların yan yana dizildiği bir sayfada "bu şirketler
          StajımVar'la çalışıyor" izlenimi bırakırdı.
        */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <p className="text-xs leading-relaxed text-gray-600">
            StajımVar bağımsız bir dizindir; gösterilen kurumlarla ortaklık anlamına gelmez.
            Logolar ve marka adları sahiplerine aittir ve yalnızca kurumu tanıtmak için
            kullanılmaktadır. Buradaki kayıtlar StajımVar ilanı değil, işverenin kendi başvuru
            sayfasına yönlendirmedir; başvuru koşulları, takvim ve kontenjan işverenin sayfasında
            yazıyor.
          </p>
        </div>
      </div>
    </SayfaKabugu>
  );
};
