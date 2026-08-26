import React from 'react';
import { ArrowRight, Building2, CalendarDays, Calculator, GraduationCap, MapPin, TrendingUp, Wallet } from 'lucide-react';
import { BOLUMLER } from '../data/bolumler';
import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { KARIYER_MERKEZLERI } from '../data/kariyerMerkezleri';
import { profilBolumu, profilMerkezi } from '../lib/rehber-arama.mjs';
import type { StudentProfile } from '../types';

/**
 * Staj yol haritası — rehber girişinin ana bölümü.
 *
 * NEDEN DEĞİŞTİ
 * -------------
 * Burada "Keşfet" başlığı altında dört eşit kutu vardı: bölümler,
 * araçlar, işverenler, kariyer merkezleri. Dördü de aynı büyüklükte ve
 * aynı biçimde olduğu için "bunlar sıradan bağlantı" hissi veriyordu.
 * Oysa arkalarında 34 bölüm rehberi, 46 doğrulanmış işveren, 22 kariyer
 * merkezi ve 4 araç duruyor. Sorun içerik eksikliği değildi; içeriğin
 * görünmemesiydi.
 *
 * Şimdi önem sırası var ve her kart içinden ne çıkacağını gösteriyor:
 * bölüm kartı en büyüğü, işveren ve üniversite kartları gerçek logo
 * önizlemesi taşıyor, araçlar küçük satırlara indi.
 *
 * LOGOLAR SÜS DEĞİL, KANIT
 * ------------------------
 * Kartta "46 doğrulanmış işveren" yazmak bir iddia; altında Aselsan,
 * Bosch, Turkcell amblemlerini görmek o iddianın kanıtı. Logolar
 * kurumların kendi sitelerinden indirildi (scripts/marka-logolari.mjs) ve
 * ortaklık anlamına gelmiyor — bunu yazan satır işveren dizininin
 * başında duruyor.
 */

/* Logosu indirilebilmiş, tanınırlığı yüksek işverenler önizlemede. */
const ONIZLEME_ISVERENLER = [
  'aselsan',
  'tusas',
  'turkcell',
  'tupras',
  'bosch-turkiye',
  'arcelik',
  'turk-telekom',
  'is-bankasi',
];

const ONIZLEME_UNIVERSITELER: [string, string][] = [
  ['bogazici-universitesi', 'Boğaziçi Üniversitesi'],
  ['yildiz-teknik-universitesi', 'Yıldız Teknik Üniversitesi'],
  ['hacettepe-universitesi', 'Hacettepe Üniversitesi'],
  ['ege-universitesi', 'Ege Üniversitesi'],
  ['marmara-universitesi', 'Marmara Üniversitesi'],
  ['sabanci-universitesi', 'Sabancı Üniversitesi'],
];

const ARAC_IKONLARI: Record<string, React.ReactNode> = {
  'staj-ucreti-hesaplama': <Wallet className="h-4 w-4" />,
  'staj-gunu-hesaplama': <CalendarDays className="h-4 w-4" />,
  'net-hesaplama': <Calculator className="h-4 w-4" />,
  'siralama-tahmini': <TrendingUp className="h-4 w-4" />,
};

const ARAC_EYLEMLERI: Record<string, string> = {
  'staj-ucreti-hesaplama': 'Staj ücretini hesapla',
  'staj-gunu-hesaplama': 'Bitiş tarihini bul',
  'net-hesaplama': 'Netini hesapla',
  'siralama-tahmini': 'Sıralamanı tahmin et',
};

/**
 * Logo şeridi.
 *
 * Logo dosyası yoksa öğe hiç çizilmiyor: harfli bir yer tutucu koymak,
 * "logo var" izlenimi verip aslında olmadığını göstermek olurdu.
 */
const LogoSeridi: React.FC<{ klasor: string; kodlar: string[]; adlar: string[] }> = ({
  klasor,
  kodlar,
  adlar,
}) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {kodlar.map((kod, i) => (
      <span
        key={kod}
        title={adlar[i]}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white p-1"
      >
        <img
          src={`/${klasor}/${kod}.png`}
          alt={adlar[i]}
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const kap = e.currentTarget.parentElement;
            if (kap) kap.style.display = 'none';
          }}
          className="h-7 w-7 object-contain"
        />
      </span>
    ))}
  </div>
);

export const YolHaritasi: React.FC<{
  onNavigate: (yol: string) => void;
  ogrenci?: StudentProfile | null;
}> = ({ onNavigate, ogrenci = null }) => {
  const bolum = profilBolumu(ogrenci?.department, BOLUMLER) as { slug: string; ad: string } | null;
  const merkez = profilMerkezi(ogrenci?.university, KARIYER_MERKEZLERI) as
    | { universite: string; sehir: string; url: string }
    | null;

  const isverenAdlari = React.useMemo(
    () =>
      ONIZLEME_ISVERENLER.map(
        (kod) => STAJ_PROGRAMLARI.find((p) => p.slug === kod)?.isveren ?? kod
      ),
    []
  );

  const araclar = React.useMemo(
    () => Object.keys(ARAC_EYLEMLERI).filter((s) => ARAC_IKONLARI[s]),
    []
  );

  return (
    <section className="space-y-4">
      {/*
        SAYFANIN H1'İ

        Üstündeki karşılama bloğu kaldırıldı ve o bloğun h1'i onunla gitti.
        Sayfanın başlıksız kalması hem arama motoru hem ekran okuyucu için
        kayıp; bu bölüm artık ilk başlık, dolayısıyla h1.
      */}
      <div className="space-y-1">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          Staj yol haritan burada
        </h1>
        <p className="text-sm leading-relaxed text-gray-600">
          Bölümünü ve okulunu seç; sana uygun ilanları, işverenleri, belgeleri ve araçları tek
          yerde gör.
        </p>
      </div>

      {/*
        BÖLÜM KARTI EN BÜYÜĞÜ

        Rehberin ana özelliği bu ve boyutu bunu söylemeli. Profilde bölüm
        varsa kart onun adını taşıyor; yoksa genel listeye götürüyor.
        Uydurma bir bölüm adı yazılmıyor — eşleşme bulunamazsa kart
        "Bölümünü seç" diyor.
      */}
      <button
        type="button"
        onClick={() => onNavigate(bolum ? `/bolum/${bolum.slug}` : '/bolumler')}
        className="group flex w-full cursor-pointer flex-col gap-3 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white p-5 text-left transition-colors hover:border-blue-400 sm:flex-row sm:items-center sm:gap-5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <GraduationCap className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-blue-700">
            Bölümüne göre staj yol haritası
          </span>
          <span className="mt-0.5 block text-lg font-extrabold leading-snug text-gray-900">
            {bolum ? `${bolum.ad} yol haritanı aç` : 'Bölümünü seç, yol haritanı aç'}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-gray-600">
            Nerede staj yapılır, stajyer ne yapar, hangi beceriler gerekir, hangi işverenler bu
            bölümden öğrenci alır — {BOLUMLER.length} bölüm için ayrı ayrı.
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-blue-700 transition-transform group-hover:translate-x-0.5" />
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* İŞVERENLER */}
        <button
          type="button"
          onClick={() => onNavigate('/staj-programlari')}
          className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-gray-900">Büyük işverenler</span>
              <span className="block text-xs font-semibold text-indigo-700">
                {STAJ_PROGRAMLARI.length} doğrulanmış işveren
              </span>
            </span>
          </span>

          <LogoSeridi klasor="isveren-logolari" kodlar={ONIZLEME_ISVERENLER} adlar={isverenAdlari} />

          <span className="text-xs leading-relaxed text-gray-600">
            Başvurular şirketin kendi kariyer sayfasından alınıyor; adresleri biz doğruladık.
          </span>
        </button>

        {/* KARİYER MERKEZLERİ */}
        <button
          type="button"
          onClick={() => onNavigate('/universite-kariyer-merkezleri')}
          className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-gray-900">Kariyer merkezleri</span>
              <span className="block text-xs font-semibold text-amber-700">
                {merkez ? merkez.universite : `${KARIYER_MERKEZLERI.length} üniversite`}
              </span>
            </span>
          </span>

          <LogoSeridi
            klasor="universite-logolari"
            kodlar={ONIZLEME_UNIVERSITELER.map((u) => u[0])}
            adlar={ONIZLEME_UNIVERSITELER.map((u) => u[1])}
          />

          <span className="text-xs leading-relaxed text-gray-600">
            {merkez
              ? 'Kariyer merkezine, staj yönergesine ve gerekli belgelere buradan ulaş.'
              : 'Üniversiteni bul: staj formu, sigorta yazısı ve onay imzası oradan geçiyor.'}
          </span>
        </button>
      </div>

      {/*
        ARAÇLAR KÜÇÜLDÜ

        Dört dev kutu, dört küçük eyleme indi. Buradaki metin aracın adı
        değil ne yaptığı: "Staj ücreti hesaplama" bir raf etiketi,
        "Staj ücretini hesapla" ise kullanıcının yapmak istediği şey.
      */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {araclar.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => onNavigate(`/araclar/${slug}`)}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-300"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              {ARAC_IKONLARI[slug]}
            </span>
            <span className="min-w-0 truncate text-xs font-bold text-gray-900">
              {ARAC_EYLEMLERI[slug]}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
