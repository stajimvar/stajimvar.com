import React from 'react';
import { Building2, CalendarDays, Calculator, MapPin, TrendingUp, Wallet } from 'lucide-react';
import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { KARIYER_MERKEZLERI } from '../data/kariyerMerkezleri';
import { profilMerkezi } from '../lib/rehber-arama.mjs';
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
 * işveren ve üniversite kartları gerçek logo önizlemesi taşıyor, araçlar
 * küçük satırlara indi.
 *
 * Bir ara en üstte tam genişlikte bir bölüm kartı da vardı; ilk ekranı tek
 * başına doldurduğu için kaldırıldı. Bölümlere giden yol sayfanın altındaki
 * "Bölüme göre staj" bölümünde ve altbilgide duruyor.
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

        KALIP DÖRT SEKMEDE ORTAK

        "Staj yol haritan burada" idi. Diğer üç sekme aynı cümleyi kuruyor:
        "<ne var>, tek listede." — İş & Staj'da staj ilanları, Fırsatlar'da
        burslar, Keşfet'te etkinlikler. Rehber tek başına başka bir kalıpla
        konuşuyordu; sekmeler arasında gezerken sayfanın kendini tanıtma
        biçimi her seferinde değişiyordu.

        Vurgu "tek listede"de ve mavi: cümlenin verdiği söz orada — dağınık
        kaynakları tek yerde toplamak. Üç sayfada da aynı kelime aynı renkte.

        Ölçü de kardeşlerinkiyle aynı `clamp`; sabit `text-xl sm:text-2xl`
        375 pikselde 20'ye denk geliyordu ama kırılma noktaları farklıydı,
        yani aradaki genişliklerde başlık sekmeden sekmeye zıplıyordu.
      */}
      <div className="space-y-1">
        <h1 className="min-w-0 text-center lg:text-left [font-size:clamp(1.25rem,2.4vw,1.75rem)] font-extrabold leading-tight tracking-tight text-gray-950">
          Öğrencilikte bilmen gerekenler,{' '}
          <span className="text-blue-600">tek listede</span>.
        </h1>
        {/*
          Cümle "Bölümünü ve okulunu seç; sana uygun ilanları, işverenleri,
          belgeleri ve araçları tek yerde gör." idi. "Bölümünü seç"in
          karşılığı hemen altındaki bölüm kartıydı; kart kalkınca cümle
          olmayan bir şeye işaret ediyordu. Şimdi altında gerçekten duran
          üç şeyi sayıyor.
        */}
        <p className="text-center text-sm leading-relaxed text-gray-600 lg:text-left">
          Doğrulanmış işverenler, üniversitelerin kariyer merkezleri ve hesaplama araçları — hepsi
          burada.
        </p>
      </div>

      {/*
        BÖLÜM KARTI KALDIRILDI

        Sayfanın en büyük kartıydı: mavi gradyanlı, tam genişlikte, "34
        bölüm için ayrı ayrı" diyen bir blok. Rehberin ilk ekranını tek
        başına yiyordu ve asıl liste — öne çıkan rehberler — onun altına
        düşüyordu.

        DİKKAT: BU SAYFADAN /bolumler'E ARTIK YOL YOK

        Ölçüldü — kart kalkınca /rehber üzerinde /bolumler ya da /bolum/<slug>
        adresine giden tek bir bağlantı kalmıyor. "Bölüme göre staj" listesi
        `RehberBaglantilari` içinde ve o bileşen TEK REHBER sayfasının
        (/rehber/<slug>) altında çiziliyor, bu merkez sayfasında değil.
        Altbilgi de bu sayfada render edilmiyor.

        Tarayıcı tarafında bir kayıp yok: kart bir <button> idi, `href`
        taşımadığı için ön render çıktısına zaten hiç girmiyordu
        (dist/rehber.html içinde /bolum/ geçmiyor).

        Yani kaybolan şey kullanıcının bu sayfadan bölüm rehberlerine geçme
        yolu. Kart bilerek kaldırıldı; yolun geri istenmesi hâlinde küçük bir
        bağlantı yeter, aynı boyda bir kart değil.
      */}
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
