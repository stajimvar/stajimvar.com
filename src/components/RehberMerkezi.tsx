import React from 'react';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { FiltreBlogu, SecenekSatiri } from '../ui';
import { KonuSeridi } from './KonuSeridi';
import { SayfaKabugu } from './SayfaKabugu';
import { RehberIzgarasi, RehberKarti, RehberKartiIskeleti } from './RehberKartlari';
import { YolHaritasi } from './YolHaritasi';
import { RehberSonuclari } from './RehberSonuclari';
import { StajYollari } from './StajYollari';
import { KullaniciAramaSonuclari } from './sosyal/KullaniciArama';
import { REHBERLER, KONULAR, konuEtiketi, type KonuId, type Rehber } from '../data/rehberler';
import { BOLUMLER } from '../data/bolumler';
import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { KARIYER_MERKEZLERI } from '../data/kariyerMerkezleri';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import {
  enCokOkunanlar,
  kisisellestirilebilir,
  kisiyeGoreSirala,
  okunmaVerisiYeterli,
  sadelestir,
  yeniEklenenler,
} from '../lib/rehber-siralama.mjs';
import { gecmisiOku } from '../lib/rehber-gecmis.mjs';
import { birlesikArama } from '../lib/rehber-arama.mjs';
import { kaydedilenRehberler, okunmaSayilari, rehberKaydiDegistir } from '../lib/rehber-veri';
import type { StudentProfile } from '../types';

/**
 * Rehber merkezi.
 *
 * İSKELET DİĞER İKİ LİSTEYLE AYNI
 * -------------------------------
 * Sayfa tek sütunlu, üst üste yığılmış bölümlerden oluşuyordu. İlanlar ve
 * Keşfet ise 3/6/3 ızgara kullanıyor: solda süzgeçler, ortada başlık +
 * şerit + liste, sağda sayaçlar ve bilgi kutusu. Aynı ürünün üç listesi
 * artık aynı iskelette; kullanıcı sayfa değiştirince yeniden yön aramıyor.
 *
 * Konu süzgeci ayrıca bir ŞERİDE dönüştü (KonuSeridi.tsx) — Keşfet'teki
 * şehir şeridinin karşılığı. Açılır menü kapalıyken hangi konuların
 * olduğunu göstermiyordu; şerit yedi konuyu ve her birindeki yazı
 * sayısını tek bakışta veriyor. Menü kaldırılmadı, filtre panelinde
 * duruyor ve aynı durumu paylaşıyor.
 *
 * ARAMA
 * -----
 * Masaüstünde üst çubuktaki kutu bu sayfadayken rehberleri arıyor; terim
 * `arama` özelliğiyle iniyor ve adreste `?q=` olarak duruyor. Telefonda
 * üst çubukta kutu olmadığı için sol sütun kendi kutusunu çiziyor —
 * ikisi TEK terimi paylaşıyor, iki ayrı arama durumu yok.
 *
 * KİŞİSELLEŞTİRME İDDİA EDİLMİYOR
 * -------------------------------
 * "Sana özel seçilenler" başlığı yalnızca profilde gerçekten sıralamaya
 * yetecek veri varsa çıkıyor; yoksa "Öne çıkan rehberler" yazıyor. Yanlış
 * bir kişiselleştirme iddiası hiç kişiselleştirmemekten kötü — kullanıcı
 * listeye bakıp "beni yanlış tanımışlar" diyor.
 *
 * Kural ve puanlama src/lib/rehber-siralama.mjs içinde ve sınanıyor.
 * Hiçbir okul, bölüm, sınıf ya da kişi adı koda yazılmıyor: eşleşmeler
 * profil ALANLARI üzerinden çalışıyor.
 */

/*
  Filtre düğmesinin iki hâli ayrı dizelerde: tek şablonun içindeyken
  "renkli zeminde gri yazı" gibi okunuyor, oysa gri yazı BEYAZ zeminli
  dalın parçası. Keşfet sayfasında da aynı sebeple ayrılmıştı.
*/
const FILTRE_DUGMESI_ACIK = 'border-blue-600 bg-blue-50 text-blue-700';
const FILTRE_DUGMESI_KAPALI = 'border-gray-200 bg-white text-gray-500 hover:border-gray-300';

type Sekme = 'uygun' | 'tumu' | KonuId;

const Bolum: React.FC<{
  baslik: string;
  aciklama?: string;
  sag?: React.ReactNode;
  children: React.ReactNode;
}> = ({ baslik, aciklama, sag, children }) => (
  <section className="space-y-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="text-lg font-bold text-gray-900">{baslik}</h2>
      {sag}
    </div>
    {aciklama && <p className="-mt-1 text-xs leading-relaxed text-gray-600">{aciklama}</p>}
    {children}
  </section>
);

/* ------------------------------------------------------------------ merkez */

export const RehberMerkezi: React.FC<{
  onNavigate: (path: string) => void;
  ogrenci?: StudentProfile | null;
  /** Üst çubuktaki arama terimi. */
  arama?: string;
  /**
   * Sol sütundaki telefon arama kutusu bunu yazıyor. Keşfet'te de aynı
   * kalıp: masaüstünde arama üst çubukta, telefonda sayfanın kendi
   * kutusunda — ikisi TEK terimi paylaşıyor, ayrı bir durum yok.
   */
  onAramaDegis?: (terim: string) => void;
  /** Boş sonuç ekranındaki "temizle" bunu çağırıyor. */
  onAramaTemizle?: () => void;
  /** Kaydetme giriş istiyor; ziyaretçide giriş ekranını açıyor. */
  onGirisGerekli?: () => void;
}> = ({
  onNavigate,
  ogrenci = null,
  arama = '',
  onAramaDegis,
  onAramaTemizle,
  onGirisGerekli,
}) => {
  React.useEffect(() => {
    document.title = 'Öğrenci rehberi | StajımVar';
  }, []);

  /* Telefonda filtre paneli kapalı başlıyor — Keşfet'teki gibi. */
  const [filtrelerAcik, setFiltrelerAcik] = React.useState(false);

  const kisisel = kisisellestirilebilir(ogrenci);
  const [sekme, setSekme] = React.useState<Sekme>(kisisel ? 'uygun' : 'tumu');

  /*
    Profil sonradan gelebiliyor (oturum çözülünce). Sekme o anda "tumu"da
    kalırsa kişiselleştirme hiç görünmüyor; kullanıcı elle bir sekme
    seçtiyse ona dokunulmuyor.
  */
  const [sekmeyeDokunuldu, setSekmeyeDokunuldu] = React.useState(false);
  React.useEffect(() => {
    if (!sekmeyeDokunuldu) setSekme(kisisel ? 'uygun' : 'tumu');
  }, [kisisel, sekmeyeDokunuldu]);

  const ogrenciRehberleri = React.useMemo(
    () => REHBERLER.filter((r) => r.kategori === 'ogrenci'),
    []
  );

  /* Yalnızca yazısı OLAN konular sekme oluyor: boş sekme, çalışmayan sekme. */
  const doluKonular = React.useMemo(
    () => KONULAR.filter((k) => ogrenciRehberleri.some((r) => r.konu === k.id)),
    [ogrenciRehberleri]
  );

  /* ---------------------------------------------------------- yan veriler */

  const [okunma, setOkunma] = React.useState<Record<string, number>>({});
  const [kayitlilar, setKayitlilar] = React.useState<Set<string>>(new Set());
  const [veriDurumu, setVeriDurumu] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [gecmis, setGecmis] = React.useState<{ slug: string; zaman: number }[]>([]);

  React.useEffect(() => {
    setGecmis(gecmisiOku());
  }, []);

  const veriYukle = React.useCallback(async () => {
    setVeriDurumu('yukleniyor');
    try {
      /*
        İki istek paralel. Kaydedilenler yalnızca giriş yapılmışsa
        isteniyor: ziyaretçi için boş bir sorgu atmanın anlamı yok.
      */
      const [sayilar, kayitli] = await Promise.all([
        okunmaSayilari(),
        ogrenci?.id ? kaydedilenRehberler(ogrenci.id).catch(() => []) : Promise.resolve([]),
      ]);
      setOkunma(sayilar);
      setKayitlilar(new Set(kayitli));
      setVeriDurumu('hazir');
    } catch {
      /* Konsola hata bırakmıyoruz; kullanıcıya görünür bir satır yazıyoruz. */
      setVeriDurumu('hata');
    }
  }, [ogrenci?.id]);

  React.useEffect(() => {
    void veriYukle();
  }, [veriYukle]);

  const kaydetmeDestekli = Boolean(ogrenci?.id) || Boolean(onGirisGerekli);

  const kaydet = React.useCallback(
    async (slug: string) => {
      if (!ogrenci?.id) {
        onGirisGerekli?.();
        return;
      }
      const kayitliydi = kayitlilar.has(slug);

      /* Önce ekranda değiştiriliyor: kaydetme geri bildirimi anında olmalı. */
      setKayitlilar((onceki) => {
        const yeni = new Set(onceki);
        if (kayitliydi) yeni.delete(slug);
        else yeni.add(slug);
        return yeni;
      });

      try {
        await rehberKaydiDegistir(ogrenci.id, slug, kayitliydi);
      } catch {
        /* Yazılamadıysa ekran gerçeğe dönüyor; sahte "kaydedildi" kalmıyor. */
        setKayitlilar((onceki) => {
          const yeni = new Set(onceki);
          if (kayitliydi) yeni.add(slug);
          else yeni.delete(slug);
          return yeni;
        });
      }
    },
    [ogrenci?.id, kayitlilar, onGirisGerekli]
  );

  /* ------------------------------------------------------------- süzgeçler */

  const terim = sadelestir(arama.trim());

  /*
    BİRLEŞİK ARAMA

    Arama yalnızca yazıların içinde geziyordu; "Aselsan" yazan kişi hiçbir
    sonuç alamıyor, "Marmara" yazan kendi okulunun kariyer merkezini
    bulamıyordu. Artık dört kaynakta birden arıyor: rehber yazıları, bölüm
    rehberleri, doğrulanmış işverenler ve kariyer merkezleri.

    Kural src/lib/rehber-arama.mjs içinde ve sınanıyor.
  */
  const aramaSonuclari = React.useMemo(
    () =>
      birlesikArama(arama, {
        rehberler: ogrenciRehberleri.map((r) => ({ ...r, konuAdi: konuEtiketi(r.konu) })),
        bolumler: BOLUMLER,
        isverenler: STAJ_PROGRAMLARI,
        merkezler: KARIYER_MERKEZLERI,
      }) as {
        aktif: boolean;
        toplam: number;
        rehberler: Rehber[];
        bolumler: { slug: string; ad: string; ozet?: string }[];
        isverenler: { slug: string; isveren: string; sektor?: string }[];
        merkezler: { universite: string; sehir?: string; url: string }[];
      },
    [arama, ogrenciRehberleri]
  );

  const sonuclar = React.useMemo(() => {
    if (terim) return aramaSonuclari.rehberler;

    const liste = ogrenciRehberleri;
    if (sekme === 'uygun' && kisisel) return kisiyeGoreSirala(liste, ogrenci) as Rehber[];
    if (sekme !== 'tumu' && sekme !== 'uygun') return liste.filter((r) => r.konu === sekme);
    return liste;
  }, [terim, aramaSonuclari, sekme, kisisel, ogrenci, ogrenciRehberleri]);

  /* Bölümlü görünüm yalnızca varsayılan ekranda; süzgeç varken tek liste. */
  const suzuluyor = Boolean(terim) || (sekme !== 'tumu' && sekme !== 'uygun');

  const seciliOlanlar = React.useMemo(() => {
    if (kisisel) return (kisiyeGoreSirala(ogrenciRehberleri, ogrenci) as Rehber[]).slice(0, 6);
    const oneCikan = ogrenciRehberleri.filter((r) => r.oneCikan);
    return (oneCikan.length ? oneCikan : ogrenciRehberleri).slice(0, 6);
  }, [kisisel, ogrenci, ogrenciRehberleri]);

  /* Geçmiş yalnızca hâlâ var olan yazılara işaret ediyorsa gösteriliyor. */
  const devamEdilecekler = React.useMemo(
    () =>
      gecmis
        .map((k) => ogrenciRehberleri.find((r) => r.slug === k.slug))
        .filter((r): r is Rehber => Boolean(r))
        .slice(0, 3),
    [gecmis, ogrenciRehberleri]
  );

  const populer = React.useMemo(
    () =>
      okunmaVerisiYeterli(okunma)
        ? (enCokOkunanlar(ogrenciRehberleri, okunma, 3) as Rehber[])
        : [],
    [okunma, ogrenciRehberleri]
  );

  const yeniler = React.useMemo(
    () => yeniEklenenler(ogrenciRehberleri, 3) as Rehber[],
    [ogrenciRehberleri]
  );

  /* --------------------------------------------------------------- sekmeler */

  const sekmeSec = (id: Sekme) => {
    setSekmeyeDokunuldu(true);
    setSekme(id);
    if (arama) onAramaTemizle?.();
  };

  /*
    KONU SEÇİCİ LİSTENİN BAŞINDA

    Hızlı işlemler yedi konudan dördünü kapsıyor; yurt, üniversite hayatı
    ve yurtdışı rehberlerine de bir yol gerekiyor. Ekranın üstüne ikinci
    bir düğme satırı koymak yerine tek bir seçici, tam da kullanıldığı
    yerde: listenin başlığının yanında. Seçili konuyu da gösteriyor, yani
    "hangi süzgeç açık" sorusunun cevabı kontrolün kendisinde.
  */
  const KonuSecici = (
    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
      <span className="sr-only">Konuya göre süz</span>
      <select
        value={terim ? '' : sekme === 'uygun' ? 'tumu' : sekme}
        onChange={(e) => sekmeSec((e.target.value || 'tumu') as Sekme)}
        className="min-h-11 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 outline-none focus:border-blue-600"
      >
        <option value="tumu">Tüm konular</option>
        {doluKonular.map((k) => (
          <option key={k.id} value={k.id}>
            {k.etiket}
          </option>
        ))}
      </select>
    </label>
  );

  /* --------------------------------------------------- konu şeridi verisi */

  /*
    Şerit her konuda kaç yazı olduğunu gösteriyor. Sayım seçili konuya
    BAKMIYOR: uygulansaydı bir konu seçilince diğer bütün daireler
    sıfırlanır ve şeritten başka konuya geçilemezdi. Şehir şeridinde de
    aynı kural geçerli.
  */
  const seritKonulari = React.useMemo(
    () =>
      doluKonular
        .map((k) => ({
          id: k.id as string,
          etiket: k.etiket,
          adet: ogrenciRehberleri.filter((r) => r.konu === k.id).length,
        }))
        .sort((a, b) => b.adet - a.adet || a.etiket.localeCompare(b.etiket, 'tr')),
    [doluKonular, ogrenciRehberleri]
  );

  /* Şeritte seçili görünen konu: arama varken ya da "uygun"dayken hiçbiri. */
  const seritSecili = terim || sekme === 'uygun' || sekme === 'tumu' ? '' : (sekme as string);

  const aktifSuzgecler = [
    terim ? `Arama: ${arama.trim()}` : '',
    !terim && sekme !== 'tumu' && sekme !== 'uygun' ? konuEtiketi(sekme as KonuId) : '',
  ].filter(Boolean);

  const kartOzellikleri = (r: Rehber) => ({
    rehber: r,
    onNavigate,
    kayitli: kayitlilar.has(r.slug),
    onKaydet: kaydetmeDestekli ? kaydet : undefined,
    kaydetmeEtiketi: ogrenci?.id ? undefined : 'Kaydetmek için giriş yap',
  });

  return (
    <SayfaKabugu icerikGenisligi={SAYFA_GENISLIGI} ustBosluk="pt-2 sm:pt-3">
      {/*
        İSKELET KEŞFET VE İLANLAR SAYFASIYLA AYNI

        Sayfa tek sütunlu, üst üste yığılmış bölümlerden oluşuyordu; aynı
        ürünün diğer iki listesi (ilanlar ve Keşfet) ise 3/6/3 ızgara
        kullanıyor: solda süzgeçler, ortada başlık + şerit + liste, sağda
        sayaçlar ve bilgi kutusu. Üç liste artık aynı iskelette.
      */}
      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-12">
        {/* ------------------------------------------------- sol: süzgeçler */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:col-span-3">
          <h1 className="min-w-0 text-center [font-size:clamp(1rem,5vw,1.5rem)] font-extrabold leading-tight tracking-tight text-gray-950 break-words lg:text-left lg:[font-size:clamp(1.125rem,1.82vw,1.85rem)]">
            Öğrenci rehberleri, <span className="text-blue-600">tek listede</span>.
          </h1>

          {/*
            TELEFONDA ARAMA SAYFANIN İÇİNDE

            Masaüstünde arama üst çubukta duruyor; telefonda üst çubukta
            kutu yok, o yüzden sayfa kendi kutusunu çiziyor. İkisi TEK
            terimi paylaşıyor (`arama` / `onAramaDegis`), ayrı bir durum
            yok — Keşfet'te de aynı kalıp.

            Yer tutucu "kullanıcı" da diyor: telefonda kişi arama yolu
            yalnız bu kutu (Header'daki kişi kutusu `hidden lg:block`).
            Kişi sonuçları aşağıda, rehber sonuçlarının üstünde.
          */}
          <div className="flex items-center gap-2 lg:hidden">
            {onAramaDegis && (
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  type="search"
                  aria-label="Rehber, bölüm veya kullanıcı ara"
                  value={arama}
                  onChange={(event) => onAramaDegis(event.target.value)}
                  placeholder="Rehber, bölüm veya kullanıcı ara"
                  /*
                    Keşfet'teki kutu `pl-11 pr-4`; burada `pl-10 pr-3`.
                    Ölçüldü (390 px, telefonda alanlar 16 px — index.css
                    iOS yakınlaştırma kuralı): yer tutucu 225,9 px, eski
                    iç genişlik 222 px, son harf kırpılıyordu. Simge
                    32 px'te bitiyor, 40 px'lik sol boşluk 8 px pay
                    bırakıyor; iç genişlik 230 px'e çıkıyor.
                  */
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-10 pr-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-blue-600 focus:outline-none"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setFiltrelerAcik((acik) => !acik)}
              aria-expanded={filtrelerAcik}
              aria-controls="rehber-filtreleri"
              aria-label={
                aktifSuzgecler.length ? `Filtreler (${aktifSuzgecler.length} açık)` : 'Filtreler'
              }
              className={`relative flex min-h-12 w-[52px] shrink-0 cursor-pointer items-center justify-center self-stretch rounded-2xl border ${
                filtrelerAcik || aktifSuzgecler.length ? FILTRE_DUGMESI_ACIK : FILTRE_DUGMESI_KAPALI
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
              {aktifSuzgecler.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-extrabold text-white">
                  {aktifSuzgecler.length}
                </span>
              )}
            </button>
          </div>

          <div
            id="rehber-filtreleri"
            className={`${filtrelerAcik ? 'block' : 'hidden'} lg:block`}
          >
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
                <SlidersHorizontal className="h-4 w-4 text-gray-500" aria-hidden />
                <span className="text-sm font-bold text-gray-900">Filtreler</span>
                {aktifSuzgecler.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSekmeyeDokunuldu(true);
                      setSekme('tumu');
                      onAramaTemizle?.();
                    }}
                    className="ml-auto min-h-8 cursor-pointer text-xs font-bold text-blue-600 hover:underline"
                  >
                    Temizle
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                <FiltreBlogu baslik="Konu">{KonuSecici}</FiltreBlogu>
                {/*
                  "Sana uygun" bir süzgeç değil SIRALAMA: listeden hiçbir
                  şey elemiyor. Yalnızca profilde sıralamaya yetecek veri
                  varsa çiziliyor — yoksa çalışmayan bir düğme olurdu.
                */}
                {kisisel && (
                  <FiltreBlogu baslik="Sıralama">
                    <div className="space-y-0.5">
                      <SecenekSatiri
                        tip="radio"
                        etiket="Sana uygun"
                        secili={!terim && sekme === 'uygun'}
                        onChange={() => sekmeSec('uygun')}
                      />
                      <SecenekSatiri
                        tip="radio"
                        etiket="Varsayılan"
                        secili={!terim && sekme !== 'uygun'}
                        onChange={() => sekmeSec('tumu')}
                      />
                    </div>
                  </FiltreBlogu>
                )}
              </div>
            </section>
          </div>

          {/*
            AYIRICI — SÜTUNUN SON ÇOCUĞU, EKRANDA ARAMANIN ALTINDA
            Aradaki filtre kabı telefonda `display:none`; dizilim Keşfet
            ve ilanlar sayfasıyla aynı. Sona yazılıyor çünkü `space-y-4`
            son çocuk dışındaki her çocuğa alt boşluk veriyor.
          */}
          {!filtrelerAcik && (
            <div
              aria-hidden
              className="h-0.5 rounded-2xl border border-gray-200 bg-white shadow-xs lg:hidden"
            />
          )}
        </div>

        {/* --------------------------------------------------- orta: liste */}
        <section aria-label="Rehberler" className="min-w-0 space-y-4 lg:col-span-6">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">
              {aktifSuzgecler.length ? 'Filtrelenen rehberler' : 'Tüm rehberler'} ({sonuclar.length}
              )
            </h2>
            <span className="hidden text-xs font-medium text-gray-500 sm:block">
              Rakam değil, işleyiş anlatılıyor
            </span>
          </div>

          {/*
            KONU ŞERİDİ — KEŞFET'TEKİ ŞEHİR ŞERİDİNİN YERİNDE

            Konu süzgeci yalnızca bir açılır menüydü; kapalıyken hangi
            konuların olduğunu göstermiyordu. Şerit yedi konuyu ve her
            birindeki yazı sayısını tek bakışta veriyor. Menü kaldırılmadı,
            filtre panelinde duruyor ve aynı durumu paylaşıyor.
          */}
          <KonuSeridi
            konular={seritKonulari}
            secili={seritSecili}
            toplam={ogrenciRehberleri.length}
            onSec={(id) => sekmeSec(id as Sekme)}
            onTumu={() => sekmeSec('tumu')}
          />

          {/*
          Açıklama yalnızca gerçekten kişiselleştirme yapılabiliyorsa.
          Veri yoksa satır hiç çizilmiyor — "senin için seçtik" demek için
          kişi hakkında bir şey bilmek gerekiyor.
        */}
        {kisisel && !suzuluyor && (
          <p className="-mt-3 text-xs text-gray-600">
            Eğitim bilgilerine göre senin için öne çıkardık.
          </p>
        )}

        {veriDurumu === 'hata' && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            Kaydettiklerin ve okunma sayıları yüklenemedi. Rehberler açılıyor.
            <button
              type="button"
              onClick={() => void veriYukle()}
              className="cursor-pointer font-bold underline"
            >
              Yeniden dene
            </button>
          </p>
        )}

        {/*
          KİŞİLER, REHBER SONUÇLARININ ÜSTÜNDE

          Aynı kutu kişi de arıyor. Mantık kopyalanmadı: geciktirme, üç
          harf sınırı ve `sosyalKullaniciAra` çağrısı yalnız
          `KullaniciAramaSonuclari` içinde; burada yalnız iki kapı var.
          Oturum yoksa parça DOM'a hiç girmiyor — RPC zaten ziyaretçiye
          satır vermiyor ve boş bir "Kişiler" bölümü, ziyaretçiye
          aramanın çalışmadığını düşündürürdü. `gomuluBaslik` ile parça
          eşleşme yokken de hiç çizilmiyor: "eşleşen profil yok" satırı
          rehber arayan kullanıcı için gürültü olurdu.
        */}
        {ogrenci && terim ? (
          <KullaniciAramaSonuclari sorgu={arama} onNavigate={onNavigate} gomuluBaslik="Kişiler" />
        ) : null}

        {/* ================================================== içerikler */}
        {terim && aramaSonuclari.toplam > 0 ? (
          <RehberSonuclari
            sonuclar={aramaSonuclari}
            onNavigate={onNavigate}
            kartOzellikleri={kartOzellikleri}
          />
        ) : sonuclar.length === 0 ? (
          <section className="space-y-3 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="font-bold text-gray-900">
              {terim
                ? `“${arama.trim()}” için sonuç bulunamadı`
                : 'Bu konuda henüz rehber yok'}
            </p>
            <p className="text-sm text-gray-600">
              Rehberlerde, bölümlerde, işverenlerde ve kariyer merkezlerinde arandı. Süzgeçleri
              kaldırıp tüm rehberlere göz atabilirsin.
            </p>
            <button
              type="button"
              onClick={() => {
                setSekmeyeDokunuldu(true);
                setSekme('tumu');
                onAramaTemizle?.();
              }}
              className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
            >
              Filtreleri temizle
            </button>
          </section>
        ) : suzuluyor ? (
          <Bolum
            baslik={terim ? 'Arama sonuçları' : konuEtiketi(sekme as KonuId)}
            sag={
              <span className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{sonuclar.length} yazı</span>
                {KonuSecici}
              </span>
            }
          >
            <RehberIzgarasi>
              {sonuclar.map((r) => (
                <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
              ))}
            </RehberIzgarasi>
          </Bolum>
        ) : (
          <>
            <Bolum baslik={kisisel ? 'Sana özel seçilenler' : 'Öne çıkan rehberler'}>
              <RehberIzgarasi>
                {seciliOlanlar.map((r) => (
                  <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                ))}
              </RehberIzgarasi>
            </Bolum>

            {/* Yalnızca gerçekten okuma geçmişi olana gösteriliyor. */}
            {devamEdilecekler.length > 0 && (
              <Bolum baslik="Kaldığın yerden devam et">
                <RehberIzgarasi>
                  {devamEdilecekler.map((r) => (
                    <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                  ))}
                </RehberIzgarasi>
              </Bolum>
            )}

            {/*
              Okunma sayıları gerçek: uydurma bir popülerlik sıralaması
              göstermektense bölüm hiç çizilmiyor. Sayım yüklenirken
              iskelet duruyor.
            */}
            {veriDurumu === 'yukleniyor' ? (
              <Bolum baslik="En çok okunanlar">
                <RehberIzgarasi>
                  <RehberKartiIskeleti />
                  <RehberKartiIskeleti />
                  <RehberKartiIskeleti />
                </RehberIzgarasi>
              </Bolum>
            ) : (
              populer.length > 0 && (
                <Bolum baslik="En çok okunanlar">
                  <RehberIzgarasi>
                    {populer.map((r) => (
                      <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                    ))}
                  </RehberIzgarasi>
                </Bolum>
              )
            )}

            {yeniler.length > 0 && (
              <Bolum baslik="Yeni eklenenler">
                <RehberIzgarasi>
                  {yeniler.map((r) => (
                    <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                  ))}
                </RehberIzgarasi>
              </Bolum>
            )}

            <Bolum
              baslik="Tüm rehberler"
              sag={
                <span className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{sonuclar.length} yazı</span>
                  {KonuSecici}
                </span>
              }
            >
              <RehberIzgarasi>
                {sonuclar.map((r) => (
                  <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                ))}
              </RehberIzgarasi>
            </Bolum>
          </>
        )}

          {/*
            YOLCULUK VE DİZİN BLOKLARI LİSTENİN ALTINA İNDİ

            İkisi de sayfanın tepesindeydi ve masaüstünde kaydırmadan tek
            bir rehber BAŞLIĞI görünmüyordu — bu dosyanın kendi notu da
            aynı sorunu anlatıyor. Bloklar silinmedi: rehber listesi ilk
            ekrana çıktıktan sonra, "başka nereye bakayım" sorusunun
            geldiği yerde duruyorlar.
          */}
          <StajYollari onNavigate={onNavigate} />

          <YolHaritasi onNavigate={onNavigate} ogrenci={ogrenci} />

          <a
            href="/isveren"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              onNavigate('/isveren');
            }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm transition-colors hover:border-blue-300"
          >
            <span>
              <b className="block font-bold text-gray-900">Şirketler için rehber</b>
              <span className="text-gray-600">Stajyer nasıl alınır: sigorta, ücret, evrak</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" />
          </a>
        </section>

        {/* --------------------------------------- sağ: sayaçlar ve bilgi */}
        {/*
          `hidden lg:block`: telefonda sayaçlar listenin üstündeki başlıkta
          ve konu şeridinde zaten var; ikisini ayrıca göstermek listeyi bir
          ekran aşağı iterdi. Keşfet ve ilanlar sayfasında da aynı sebeple
          gizli.
        */}
        <div className="hidden space-y-4 lg:sticky lg:top-4 lg:col-span-3 lg:block">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
            {[
              { etiket: 'Rehber', deger: ogrenciRehberleri.length },
              { etiket: 'Konu', deger: doluKonular.length },
              { etiket: 'Bölüm', deger: BOLUMLER.length },
            ].map((kutu) => (
              <div key={kutu.etiket} className="min-w-0 text-center">
                <p className="text-2xl font-black leading-none tabular-nums text-gray-900">
                  {kutu.deger}
                </p>
                <p className="mt-1 truncate text-[11px] font-semibold text-gray-500">
                  {kutu.etiket}
                </p>
              </div>
            ))}
          </div>

          {/*
            Sayfanın en altındaki uzun not buraya taşındı. Orada kimse
            görmüyordu; oysa söylediği şey rehberlerin nasıl yazıldığı —
            yani okumaya başlamadan önce bilinmesi gereken şey.
          */}
          <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
            <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Rehberler nasıl yazılıyor
            </span>
            <p className="text-sm leading-relaxed text-gray-600">
              Rehberlerde yıldan yıla değişen oran ve tutarlar{' '}
              <strong className="text-gray-900">yazılmıyor</strong>; mekanizma anlatılıp güncel
              rakam için resmî kaynağa yönlendiriliyor. Eksik veya hatalı gördüğün bir şey olursa
              bize yaz.
            </p>
          </aside>
        </div>
      </div>
    </SayfaKabugu>
  );
};

export { RehberKarti } from './RehberKartlari';
