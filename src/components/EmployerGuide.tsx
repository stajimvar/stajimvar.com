import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, GraduationCap, Info } from 'lucide-react';
import { BelgeCizimi } from './RehberGorseller';
import { SayfaKabugu } from './SayfaKabugu';
import { fetchTalentPoolStats, type TalentPoolStat } from '../lib/queries';
import { ODAK_HALKASI } from '../lib/renk-token';
import { SAYFA_GENISLIGI } from '../lib/duzen';

/**
 * İşveren rehberi — /stajyer-nasil-alinir.
 *
 * NEDEN BU SAYFA VAR
 * ------------------
 * Ölçtük: kazımanın Türkiye'de tavanı var. Workable'ın tüm Türkiye
 * indeksinde 13 erken kariyer ilanı bulunuyor ve büyük işverenlerin
 * hiçbiri okunabilir bir ATS API'si açmıyor. Yani ilan sayısı daha fazla
 * yazılımla artmıyor — şirketin ilan AÇMASIYLA artıyor.
 *
 * Şirketlerin ilan açmama sebebi çoğu zaman isteksizlik değil, bilgisizlik:
 * sigortayı kim yapar, ücret ödemek zorunlu mu, üniversiteyle hangi evrak
 * imzalanır bilinmiyor. Bilinmediği için araştırılmıyor, araştırılmadığı
 * için hiç başlanmıyor.
 *
 * Bu sayfa aynı zamanda şirketin bizi bulmasının tek yolu: davet e-postası
 * gönderemiyoruz (ticari elektronik ileti, İYS kaydı gerekiyor). Bir işveren
 * "stajyer nasıl alınır" diye aradığında karşısına çıkmamız gerekiyor.
 *
 * İÇERİK KURALI
 * -------------
 * Yıldan yıla değişen oranlar ve tutarlar BURAYA YAZILMIYOR. Asgari ücrete
 * endeksli ödemeler, devlet katkısı payları ve prim oranları her yıl
 * güncelleniyor; sayfada sabit bir rakam bırakmak, bir süre sonra işvereni
 * yanlış yönlendirmek demek. Mekanizma anlatılıyor, güncel rakam için resmî
 * kaynağa yönlendiriliyor.
 *
 * GÖRSEL ANLATIMLI PİLOT (27 Eylül 2026)
 * -------------------------------------
 * Sayfa uzun paragraflardan oluşuyordu. Artık işveren kaydırırken süreci
 * görüyor: giriş fotoğrafı ve bölüm şeridi → kim ne yapar (üç kart) →
 * dört adım (fotoğraf, bir cümlelik özet, açılır ayrıntı) → başlamadan
 * önce listesi → sık sorulanlar (açılır) → hesap durumuna göre sonraki adım.
 *
 * MASAÜSTÜ SİTE GENİŞLİĞİNDE (kullanıcı kararı, 27 Eylül 2026): rehber
 * `max-w-3xl` dar sütundaydı ve geniş ekranda iki yanı boş kalıyordu. Artık
 * üst çubukla aynı genişlik (`SAYFA_GENISLIGI`, aynı kenar boşlukları) ve
 * `lg` üstünde yerleşim yayılıyor: giriş iki sütun (solda başlık ve şerit,
 * sağda fotoğraf), dört adım iki sütun, "Başlamadan önce" ile "Sık
 * sorulanlar" yan yana. Telefonda sıra ve ölçüler değişmedi (alt alta).
 *
 * BİLGİ SİLİNMEDİ, İLK BAKIŞTA GÖRÜNEN METİN AZALDI: eski sayfadaki her
 * cümle (sorumluluk notları, zorunlu/gönüllü ayrımı, sigorta ve ücret
 * koşulları, kazanç kartları, sık sorulanlar, hukuki uyarı) ya kısa özette
 * ya da `<details>` içinde duruyor. Yeni hukuki iddia ya da tutar yok.
 * "Sigortayı her zaman okul yapar" gibi koşulsuz ifade kullanılmıyor:
 * kaynak metin "zorunlu stajda genellikle" diyordu, burada da öyle.
 *
 * FOTOĞRAFLAR TEMSİLİ: tasarım taslağındaki fotoğraflar ayrı dosya olarak
 * üretilmemişti; taslağın kendisi (üstünde slogan ve yazı olan tek resim)
 * KULLANILMADI. Sayfadaki sekiz fotoğraf rehber merkezinin mevcut, lisans
 * kaydı olan dosyaları (`public/rehber-gorselleri`, kaynak.json'da
 * "ai-photorealistic"); AVIF + WebP, 720×405, aynı sürüm eki. Hiçbiri
 * gerçek bir şirketi ya da kişiyi göstermiyor ve sayfa bunu söylüyor.
 */

interface EmployerGuideProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
  /**
   * Oturumdaki kişi bir şirketin üyesi mi (`company_members`, App →
   * `sirketUyesi`). Üyeyse şirket zaten sahiplenilmiş: sonraki adım
   * "Şirketini bul ve sahiplen" değil, "İlan oluştur".
   */
  sirketUyesi?: boolean;
}

const SURUM = 'rehber-fotograf-20260907-tam';

/** Temsili fotoğraf: AVIF + WebP, sabit 16:9 kutu (görsel inerken sayfa zıplamıyor). */
const Fotograf: React.FC<{ ad: string; alt: string; oncelikli?: boolean; className?: string }> = ({
  ad,
  alt,
  oncelikli = false,
  className = '',
}) => (
  <picture className={`block overflow-hidden bg-gray-100 ${className}`}>
    <source srcSet={`/rehber-gorselleri/${ad}.avif?v=${SURUM}`} type="image/avif" />
    <img
      src={`/rehber-gorselleri/${ad}.webp?v=${SURUM}`}
      alt={alt}
      width={720}
      height={405}
      loading={oncelikli ? 'eager' : 'lazy'}
      decoding="async"
      className="aspect-video h-auto w-full object-cover"
    />
  </picture>
);

/** Açılır ayrıntı — yerel `<details>`: klavye (Enter/Boşluk) ve ekran okuyucu kendiliğinden. */
const Ayrinti: React.FC<{ ozet: string; children: React.ReactNode }> = ({ ozet, children }) => (
  <details className="group rounded-xl border border-gray-200 bg-white">
    <summary
      className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-[15px] font-bold text-blue-700 hover:bg-blue-50/60 [&::-webkit-details-marker]:hidden ${ODAK_HALKASI}`}
    >
      <span>{ozet}</span>
      <ChevronDown aria-hidden className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-2 px-4 pb-4 text-[15px] leading-relaxed text-gray-700">{children}</div>
  </details>
);

const BOLUMLER = [
  { no: 1, kisa: 'İş', id: 'is' },
  { no: 2, kisa: 'Belge', id: 'belge' },
  { no: 3, kisa: 'Sigorta', id: 'sigorta' },
  { no: 4, kisa: 'Ücret', id: 'ucret' },
] as const;

/** Başlamadan önce listesi — maddenin kısa adı ve eski listedeki tam hâli. */
const HAZIRLIK = [
  { id: 'belge', ad: 'Staj belgesi', ayrinti: 'Okulun hazırladığı, sizin imzaladığınız staj formu.' },
  { id: 'sigorta', ad: 'Sigorta teyidi', ayrinti: 'Sigortanın kimde olduğuna dair okuldan yazılı teyit.' },
  { id: 'tarih', ad: 'Başlangıç ve bitiş tarihleri', ayrinti: 'Öğrencinin başlangıç ve bitiş tarihleri, haftalık gün sayısı.' },
  { id: 'sorumlu', ad: 'Sorumlu kişi', ayrinti: 'İşletmede öğrencinin soru soracağı tek bir sorumlu kişi.' },
  { id: 'odeme', ad: 'Ödeme planı', ayrinti: 'Öğrenciye ödenecek aylık tutar ve ödeme günü.' },
] as const;

const HAZIRLIK_ANAHTARI = 'stajimvar:isveren-hazirlik:v1';

function hazirlikOku(): Record<string, boolean> {
  try {
    const ham = window.localStorage.getItem(HAZIRLIK_ANAHTARI);
    return ham ? (JSON.parse(ham) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

const BIRINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[15px] font-bold text-white hover:bg-blue-700 ${ODAK_HALKASI}`;
const IKINCIL = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-[15px] font-semibold text-gray-800 hover:bg-gray-50 ${ODAK_HALKASI}`;

export const EmployerGuide: React.FC<EmployerGuideProps> = ({ onBack, onNavigate, sirketUyesi = false }) => {
  const [havuz, setHavuz] = useState<TalentPoolStat | null>(null);
  /*
    HAZIRLIK İŞARETLERİ YALNIZ BU TARAYICIDA: kişisel takip, resmî bir
    onay değil. Sunucuya yazılmıyor; depo kapalıysa (gizli sekme) işaretler
    yalnız sayfa açıkken kalıyor.
  */
  const [isaretler, setIsaretler] = useState<Record<string, boolean>>(hazirlikOku);

  useEffect(() => {
    const eskiBaslik = document.title;
    document.title = 'Stajyer nasıl alınır? İşveren rehberi | StajımVar';
    let iptal = false;
    fetchTalentPoolStats()
      .then((s) => {
        if (!iptal) setHavuz(s);
      })
      .catch(() => {
        /* İstatistik gösterilemezse sayfa yine de işini görür. */
      });
    return () => {
      iptal = true;
      /* Başlık geri yükleniyor: SPA'da sonraki sayfa bu adı taşımasın. */
      document.title = eskiBaslik;
    };
  }, []);

  const isaretle = (id: string, deger: boolean) => {
    setIsaretler((onceki) => {
      const yeni = { ...onceki, [id]: deger };
      try {
        window.localStorage.setItem(HAZIRLIK_ANAHTARI, JSON.stringify(yeni));
      } catch {
        /* Depo kapalı: işaret yalnız bu oturumda. */
      }
      return yeni;
    });
  };

  const git = (yol: string) => (olay: React.MouseEvent<HTMLAnchorElement>) => {
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
    olay.preventDefault();
    onNavigate(yol);
  };

  return (
    <SayfaKabugu onBack={onBack} icerikGenisligi={SAYFA_GENISLIGI}>
      <article className="space-y-12">
        {/* ------------------------------------------------------- 1. giriş */}
        {/* Telefonda başlık → fotoğraf → şerit; lg üstünde başlık ve şerit solda, fotoğraf sağda. */}
        <header className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12 lg:gap-y-6">
          <div className="space-y-1.5 lg:col-start-1 lg:row-start-1 lg:self-end">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-4xl xl:text-5xl">
              İlk stajyeriniz için yol haritası
            </h1>
            <p className="text-base text-gray-600 sm:text-lg">Ne yapacağınızı dört adımda görün.</p>
          </div>
          <figure className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Fotograf
              ad="stajyerin-gorev-ve-sorumluluklari"
              alt="Ofiste bilgisayar başındaki bir stajyere işi gösteren deneyimli bir çalışan"
              oncelikli
              className="rounded-2xl"
            />
            <figcaption className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
              Temsili görsel
            </figcaption>
          </figure>
          {/*
            BÖLÜM ŞERİDİ: dört adımın çapası. Gerçek bağlantı (`#is` …) —
            klavyeyle gezilir, "bağlantıyı kopyala" çalışır.
          */}
          <nav aria-label="Dört adım" className="lg:col-start-1 lg:row-start-2 lg:self-start">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {BOLUMLER.map((b) => (
                <li key={b.id}>
                  <a
                    href={`#${b.id}`}
                    className={`flex min-h-12 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 text-[15px] font-semibold text-gray-800 hover:border-blue-300 hover:bg-gray-50 hover:text-blue-900 ${ODAK_HALKASI}`}
                  >
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
                    >
                      {b.no}
                    </span>
                    {b.kisa}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </header>

        {/* ------------------------------------------------ 2. kim ne yapar */}
        <section aria-labelledby="kim-ne-yapar" className="space-y-4">
          <h2 id="kim-ne-yapar" className="text-xl font-extrabold text-gray-900 sm:text-2xl">
            Kim ne yapar?
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {[
              {
                ad: 'Okul',
                gorsel: 'universite-staj-birimi',
                alt: 'Üniversitenin staj biriminde bir öğrenciye belge uzatan görevli',
                isler: [
                  { is: 'Staj belgesini hazırlar.', not: 'Stajın müfredat kapsamında olduğunu gösteren form.' },
                  {
                    is: 'Zorunlu stajda iş kazası ve meslek hastalığı sigortasını genellikle yapar.',
                    not: 'Primi de okul öder. İşverenlerin en çok yanıldığı nokta burası; gönüllü stajda değişebilir.',
                  },
                ],
              },
              {
                ad: 'Öğrenci',
                gorsel: 'staj-basvurusu-gerekli-belgeler',
                alt: 'Masada staj belgelerini inceleyen bir öğrenci',
                isler: [
                  {
                    is: 'Belgeyi işletmeye getirir ve imzalatır.',
                    not: 'Staja başlamadan önce. İmzasız form geçerli değil.',
                  },
                  { is: 'Staj defterini doldurur.', not: 'İşletmedeki sorumlusuna imzalatarak.' },
                ],
              },
              {
                ad: 'Şirket',
                gorsel: 'iyi-staj-ilani-nasil-yazilir',
                alt: 'Ofiste dizüstü bilgisayarla çalışan bir insan kaynakları çalışanı',
                isler: [
                  {
                    is: 'Öğrenciye bir iş ve bir sorumlu tanımlar.',
                    not: 'Kime soracağını bilmeyen stajyer, üç hafta boş oturuyor.',
                  },
                  {
                    is: 'Ücreti öder.',
                    not: '3308 kapsamındaki stajlarda zorunlu. Bir kısmı için devlet katkısı var.',
                  },
                  {
                    is: 'Staj sonu değerlendirme formunu doldurur.',
                    not: 'Öğrencinin notu buna bağlı; kapalı zarfta teslim ediliyor.',
                  },
                ],
              },
            ].map((taraf) => (
              <li key={taraf.ad} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <Fotograf ad={taraf.gorsel} alt={taraf.alt} />
                <div className="space-y-2 p-4">
                  <h3 className="text-lg font-extrabold text-gray-900">{taraf.ad}</h3>
                  <ul className="space-y-2.5">
                    {taraf.isler.map((x) => (
                      <li key={x.is} className="text-[15px] leading-snug">
                        <span className="font-semibold text-gray-900">{x.is}</span>{' '}
                        <span className="text-gray-600">{x.not}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>

          {/*
            Talep kanıtı — yalnız doğrulanmış toplam; alınamazsa blok hiç
            çizilmiyor. Bölüm/şehir dağılımı yok: RPC sayısını vermiyor
            (bkz. fetchTalentPoolStats).
          */}
          {havuz && havuz.toplam > 0 && (
            <div className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
              <p className="flex items-center gap-2 font-bold text-blue-900">
                <GraduationCap aria-hidden className="h-5 w-5 text-blue-600" />
                Şu anda staj arayan öğrenciler
              </p>
              <p className="text-3xl font-black tabular-nums text-blue-900">
                {havuz.toplam}
                <span className="text-base font-bold text-blue-700"> öğrenci</span>
              </p>
              <p className="text-sm text-blue-800">
                Profilini tamamlamış ve staj arayan kayıtlı öğrenciler. Sayı gerçek, tahmin değil.
              </p>
            </div>
          )}
        </section>

        {/* ------------------------------------------------- 3. dört adım */}
        <section aria-labelledby="dort-adim" className="space-y-4">
          <h2 id="dort-adim" className="text-xl font-extrabold text-gray-900 sm:text-2xl">
            Dört adımda hazırlanın
          </h2>

          {/*
            ZORUNLU / GÖNÜLLÜ AYRIMI ADIMLARDAN ÖNCE: sigorta ve ücret iki
            durumda farklı işliyor ve adımlar zorunlu staja göre anlatılıyor.
            Kısası görünür, tam metni açılır.
          */}
          <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="flex max-w-4xl gap-2.5 text-[15px] leading-relaxed text-blue-950">
              <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <span>
                <strong>Zorunlu ve gönüllü stajda süreç farklı işleyebilir.</strong>{' '}
                Aşağıdaki adımlar zorunlu staja göre anlatılıyor; küçük işletmelerin karşılaştığı durum
                çoğunlukla bu.
              </span>
            </p>
            <Ayrinti ozet="Zorunlu staj ile gönüllü staj farkı">
              <p>
                <strong className="text-gray-900">Zorunlu staj</strong>, öğrencinin mezun olabilmek için müfredat
                gereği yapmak zorunda olduğu stajdır. Öğrenci okulundan bir <em>zorunlu staj belgesi</em> getirir.
                Meslek yüksekokulu ve mühendislik bölümlerinde yaygındır.
              </p>
              <p>
                <strong className="text-gray-900">Gönüllü (isteğe bağlı) staj</strong>, müfredatın parçası değildir;
                öğrenci deneyim kazanmak için yapar.
              </p>
              <p>
                Bu ayrım önemli, çünkü{' '}
                <strong className="text-gray-900">sigorta ve ücret yükümlülükleri iki durumda farklı işliyor.</strong>
              </p>
            </Ayrinti>
          </div>

          <ol className="grid gap-4 lg:grid-cols-2">
            {[
              {
                id: 'is',
                baslik: 'İşi netleştirin',
                ozet: 'Stajyerin yapacağı işi tek cümleyle yazın ve ona bir sorumlu atayın.',
                gorsel: 'staj-nasil-bulunur',
                alt: 'Yapışkan notlarla dolu bir planlama panosunun önünde çalışan iki kişi',
                ayrinti: (
                  <>
                    <p>
                      Stajyerin yapacağı işi bir cümleyle yazabiliyorsanız hazırsınız. Belirsiz bir "yardımcı olsun"
                      tanımı hem sizi hem öğrenciyi zorlar.
                    </p>
                    <p>Öğrenciye bir iş ve bir sorumlu tanımlayın: kime soracağını bilmeyen stajyer, üç hafta boş oturuyor.</p>
                    <p>
                      <a
                        href="/rehber/iyi-staj-ilani-nasil-yazilir"
                        onClick={git('/rehber/iyi-staj-ilani-nasil-yazilir')}
                        className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                      >
                        İyi bir staj ilanı nasıl yazılır?
                      </a>
                    </p>
                  </>
                ),
              },
              {
                id: 'belge',
                baslik: 'Belgeyi isteyin',
                ozet: 'Zorunlu stajda öğrencinin okulundan gelen staj formunu imzalamadan başlatmayın.',
                gorsel: 'zorunlu-staj-isverenin-yukumlulukleri',
                alt: 'Masada staj formunu birlikte inceleyip imzalayan iki çalışan',
                ayrinti: (
                  <>
                    <p>
                      Zorunlu stajda öğrenci, okulunun hazırladığı staj formunu getirir. Bu belge stajın müfredat
                      kapsamında olduğunu ve okulun süreçte taraf olduğunu gösterir. Formu imzalamadan staja
                      başlatmayın; imzasız form geçerli değil.
                    </p>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                      <BelgeCizimi />
                    </div>
                  </>
                ),
              },
              {
                id: 'sigorta',
                baslik: 'Sigortayı teyit edin',
                ozet: 'Sigortanın kimde olduğunu okulun staj biriminden yazılı olarak teyit edin.',
                gorsel: 'staj-sigortasi-kim-yapar',
                alt: 'Masa başında belgeler üzerinde konuşan bir öğrenci ve iki yetkili',
                ayrinti: (
                  <p>
                    Zorunlu stajda iş kazası ve meslek hastalığı sigortası genellikle okul tarafından yapılır ve primi
                    okul öder — "stajyer alırsam SGK maliyeti çıkar" endişesi çoğu durumda yersiz. Ama gönüllü stajda ve
                    bazı program türlerinde değişiyor. Okulun staj biriminden tek bir e-postayla teyit alın.
                  </p>
                ),
              },
              {
                id: 'ucret',
                baslik: 'Ücreti netleştirin',
                ozet: 'Ücret yükümlülüğünüzü staj türüne göre kontrol edin ve ödeme planını belirleyin.',
                gorsel: 'staj-ucreti-nasil-hesaplanir',
                alt: 'Hesap makinesi ve belgelerle masada konuşan bir öğrenci ve bir yetkili',
                ayrinti: (
                  <>
                    <p>
                      3308 sayılı Mesleki Eğitim Kanunu kapsamındaki stajlarda ücret ödenmesi zorunlu. Tutar asgari
                      ücrete endeksli ve işletmedeki personel sayısına göre değişiyor; belirli bir kısmı için devlet
                      katkısı var. Rakamlar her yıl güncellendiği için burada yazmıyoruz.
                    </p>
                    <p>
                      <a
                        href="/araclar/staj-ucreti-hesaplama"
                        onClick={git('/araclar/staj-ucreti-hesaplama')}
                        className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                      >
                        Staj ücreti hesaplama aracı
                      </a>{' '}
                      ile hesaplayabilir ya da okulun staj birimine sorabilirsiniz.
                    </p>
                  </>
                ),
              },
            ].map((adim, i) => (
              <li
                key={adim.id}
                id={adim.id}
                /* Şerit bağlantısı sabit üst çubuğun altında kalmasın. */
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white sm:grid sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
              >
                <Fotograf ad={adim.gorsel} alt={adim.alt} className="sm:h-full [&_img]:sm:h-full" />
                <div className="space-y-3 p-4 sm:p-5">
                  <p className="text-sm font-extrabold tabular-nums text-blue-700">{String(i + 1).padStart(2, '0')}</p>
                  <h3 className="-mt-2 text-lg font-extrabold text-gray-900 sm:text-xl">{adim.baslik}</h3>
                  <p className="text-[15px] leading-relaxed text-gray-700">{adim.ozet}</p>
                  <Ayrinti ozet="Ayrıntıyı aç">{adim.ayrinti}</Ayrinti>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* --------------------------------------------- 4. başlamadan önce */}
        {/* lg üstünde hazırlık listesi ve sık sorulanlar yan yana. */}
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="baslamadan-once" className="space-y-3">
          <h2 id="baslamadan-once" className="text-xl font-extrabold text-gray-900 sm:text-2xl">
            Başlamadan önce
          </h2>
          <p className="text-[15px] text-gray-600">
            Kendi hazırlığınızı takip etmek için işaretleyin. İşaretler yalnız bu tarayıcıda kalır; resmî bir onay ya
            da tamamlanmış bir işlem anlamına gelmez.
          </p>
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {HAZIRLIK.map((m) => {
              const secili = Boolean(isaretler[m.id]);
              return (
                <li key={m.id}>
                  <label className="flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={secili}
                      onChange={(olay) => isaretle(m.id, olay.target.checked)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-gray-300 bg-white text-white peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600"
                    >
                      {secili && <Check className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-gray-900">{m.ad}</span>
                      <span className="block text-sm text-gray-600">{m.ayrinti}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ------------------------------------------------ 5. sık sorulanlar */}
        <section aria-labelledby="sik-sorulanlar" className="space-y-3">
          <h2 id="sik-sorulanlar" className="text-xl font-extrabold text-gray-900 sm:text-2xl">
            Sık sorulanlar
          </h2>
          <div className="space-y-2">
            <Ayrinti ozet="Staj kaç gün sürer?">
              <p>
                Süreyi okul belirler; bölüme göre değişir ve genellikle iş günü olarak sayılır. Öğrencinin getireceği
                belgede yazar.
              </p>
            </Ayrinti>
            <Ayrinti ozet="Stajyeri işe almak zorunda mıyım?">
              <p>
                Hayır. Staj bir işe alım taahhüdü değildir. Uygun bulursanız teklif yapabilirsiniz, bu tarafların
                isteğine bağlıdır.
              </p>
            </Ayrinti>
            <Ayrinti ozet="Tek bir stajyer için de bu süreç işler mi?">
              <p>
                Evet. Süreç işletme büyüklüğünden bağımsızdır; ücret yükümlülüğünün oranı personel sayısına göre
                değişir, süreç değişmez.
              </p>
            </Ayrinti>
            <Ayrinti ozet="İlan vermek ücretli mi?">
              <p>StajımVar'da ilan yayınlamak ücretsizdir ve adaydan da hiçbir şekilde ücret talep edilmez.</p>
            </Ayrinti>
            <Ayrinti ozet="Stajyer almak işletmeye ne kazandırır?">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-gray-900">Denenmiş eleman.</strong> İşe alım kararını özgeçmişe bakarak değil,
                  birlikte çalışarak veriyorsunuz. Yanlış işe alımın maliyeti düşünüldüğünde bu tek başına değerli.
                </li>
                <li>
                  <strong className="text-gray-900">Taze bakış.</strong> Alışkanlık hâline gelmiş işleri ilk kez gören
                  biri "bu neden böyle yapılıyor?" diye soruyor. Cevabı olmayan sorular iyileştirme fırsatı.
                </li>
                <li>
                  <strong className="text-gray-900">Görünürlük.</strong> Stajyer okuluna döndüğünde sizi anlatıyor.
                  Küçük ve orta ölçekli işletmeler için bu, reklamla satın alınamayacak bir tanınırlık.
                </li>
                <li>
                  <strong className="text-gray-900">Ekibe iyi geliyor.</strong> Birine iş öğretmek, öğretenin de işi
                  netleştirmesini gerektiriyor. Kıdemli çalışan kendi bildiğini toparlamak zorunda kalıyor.
                </li>
              </ul>
            </Ayrinti>
          </div>
        </section>
        </div>

        {/* ------------------------------------------------ 6. sonraki adım */}
        <section aria-labelledby="sonraki-adim" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 id="sonraki-adim" className="text-lg font-extrabold text-gray-900">
            {sirketUyesi ? 'Hazırsanız ilanınızı açın' : 'Hazırsanız ilanınızı yayınlayalım'}
          </h2>
          {/*
            HESAP DURUMUNA GÖRE TEK YOL: şirketi zaten sahiplenmiş (şirket
            üyesi) kullanıcıya sahiplenme çağrısı tekrar gösterilmiyor; onun
            işi ilan açmak. Ötekiler için akış sahiplenme onayından geçiyor —
            doğrudan ilan yayınlama yok, düğmenin adı bunu söylüyor.
          */}
          {sirketUyesi ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <a href="/sirket/ilan/yeni" onClick={git('/sirket/ilan/yeni')} className={BIRINCIL}>
                İlan oluştur
                <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
              <a href="/sirket/ilanlar" onClick={git('/sirket/ilanlar')} className={IKINCIL}>
                İlanlarım
              </a>
            </div>
          ) : (
            <>
              <p className="max-w-3xl text-[15px] text-gray-600">
                Şirketinizin StajımVar'da bir sayfası zaten olabilir — ilanlarınızı kariyer sayfanızdan derliyoruz.
                Sayfanızı sahiplenip ilan girmeye başlayabilirsiniz.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a href="/isveren/ilan-ver" onClick={git('/isveren/ilan-ver')} className={BIRINCIL}>
                  Şirketini bul ve sahiplen
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </a>
                <a href="/iletisim" onClick={git('/iletisim')} className={IKINCIL}>
                  Bize yazın
                </a>
              </div>
              <p className="text-sm text-gray-500">İlan girişi, sahiplenme onaylandıktan sonra açılıyor.</p>
            </>
          )}
        </section>

        {/* Yasal uyarı ve görsel notu: içerik doğrulanana kadar dürüst kalalım. */}
        <footer className="space-y-2 border-t border-gray-200 pt-4 text-sm leading-relaxed text-gray-600 [&>p]:max-w-4xl">
          <p>
            <strong className="text-gray-800">Bu sayfa hukuki danışmanlık değildir.</strong> Mevzuat ve tutarlar
            değişebilir. Bağlayıcı bilgi için SGK, MEB, İŞKUR ve öğrencinin okulunun staj birimini esas alın. Sayfada
            eksik veya hatalı gördüğünüz bir bilgi varsa bize yazın, düzeltelim.
          </p>
          <p>Sayfadaki fotoğraflar temsilidir; gerçek bir şirketi ya da kişiyi göstermez.</p>
        </footer>
      </article>
    </SayfaKabugu>
  );
};
