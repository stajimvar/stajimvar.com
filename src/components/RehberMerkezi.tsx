import React from 'react';
import {
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  FileText,
  GraduationCap,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { RehberIzgarasi, RehberKarti, RehberKartiIskeleti } from './RehberKartlari';
import { REHBERLER, KONULAR, konuEtiketi, type KonuId, type Rehber } from '../data/rehberler';
import { BOLUMLER } from '../data/bolumler';
import { ARACLAR } from './AraclarListesi';
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
import { kaydedilenRehberler, okunmaSayilari, rehberKaydiDegistir } from '../lib/rehber-veri';
import type { StudentProfile } from '../types';

/**
 * Rehber merkezi.
 *
 * NE DEĞİŞTİ
 * ----------
 * Sayfa bir blog arşivi gibi açılıyordu: tam ekranlık bir tanıtım bloğu,
 * içinde ikinci bir arama kutusu, altında kare fotoğraf karolar. Ölçüldü —
 * masaüstünde kaydırmadan tek bir rehber BAŞLIĞI görünmüyordu; ilk ekranı
 * kaplayan şey siteyi tanıtan bir cümleydi, oysa oraya gelen kişi siteyi
 * zaten bulmuş.
 *
 * Şimdi ilk ekranda üç şey var: kullanıcının ne yapmak istediğini soran
 * kısa bir satır, dört hızlı işlem ve rehber kartları.
 *
 * ARAMA ÜST ÇUBUKTA
 * -----------------
 * Sayfanın kendi arama kutusu kaldırıldı. Üstte zaten bir arama alanı var
 * ve iki arama kutusunun aynı ekranda durması "hangisi neyi arıyor"
 * sorusunu doğuruyordu. Üstteki kutu bu sayfadayken rehberleri arıyor;
 * terim `arama` özelliğiyle buraya iniyor ve adreste `?q=` olarak duruyor.
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

type Sekme = 'uygun' | 'tumu' | KonuId;

/** İlk aşamada görünen konular; gerisi "Daha fazla" ile açılıyor. */
const ONCELIKLI_KONULAR: KonuId[] = ['staj', 'cv', 'burs'];

/* ------------------------------------------------------------ hızlı işlem */

/*
  DÖRT HIZLI İŞLEM

  Kullanıcının cümlesiyle yazılmış: "Staj bulmak istiyorum". Konu adı
  ("Staj") bir raf etiketi; niyet cümlesi ise ekrandaki soruya cevap.

  Basınca ARA EKRAN YOK: aynı sayfada konu süzgeci uygulanıyor ve liste
  yerinde değişiyor.
*/
const HIZLI_ISLEMLER: { konu: KonuId; etiket: string; ikon: React.ReactNode; renk: string }[] = [
  {
    konu: 'staj',
    etiket: 'Staj bulmak istiyorum',
    ikon: <Briefcase className="h-4 w-4" />,
    renk: 'bg-blue-50 text-blue-700',
  },
  {
    konu: 'cv',
    etiket: "CV'mi geliştirmek istiyorum",
    ikon: <FileText className="h-4 w-4" />,
    renk: 'bg-violet-50 text-violet-700',
  },
  {
    konu: 'burs',
    etiket: 'Burs arıyorum',
    ikon: <Award className="h-4 w-4" />,
    renk: 'bg-emerald-50 text-emerald-700',
  },
  {
    konu: 'kariyer',
    etiket: 'Kariyerimi planlamak istiyorum',
    ikon: <TrendingUp className="h-4 w-4" />,
    renk: 'bg-amber-50 text-amber-700',
  },
];

const KesfetKarti: React.FC<{
  ikon: React.ReactNode;
  renk: string;
  baslik: string;
  sayi: string;
  onClick: () => void;
}> = ({ ikon, renk, baslik, sayi, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-40 shrink-0 snap-start cursor-pointer flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3.5 text-left transition-colors hover:border-blue-300"
  >
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${renk}`}>
      {ikon}
    </span>
    <span className="block text-sm font-bold leading-snug text-gray-900">{baslik}</span>
    <span className="block text-[11px] font-semibold text-blue-700">{sayi}</span>
  </button>
);

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
  /** Boş sonuç ekranındaki "temizle" bunu çağırıyor. */
  onAramaTemizle?: () => void;
  /** Kaydetme giriş istiyor; ziyaretçide giriş ekranını açıyor. */
  onGirisGerekli?: () => void;
}> = ({ onNavigate, ogrenci = null, arama = '', onAramaTemizle, onGirisGerekli }) => {
  React.useEffect(() => {
    document.title = 'Öğrenci rehberi | StajımVar';
  }, []);

  const kisisel = kisisellestirilebilir(ogrenci);
  const [sekme, setSekme] = React.useState<Sekme>(kisisel ? 'uygun' : 'tumu');
  const [digerleriAcik, setDigerleriAcik] = React.useState(false);

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

  const sonuclar = React.useMemo(() => {
    let liste = ogrenciRehberleri;

    if (terim) {
      /*
        Arama başlıkla sınırlı değil: özet, açıklama, konu adı ve etiketler
        de taranıyor. "sigorta" yazan kişi başlığında sigorta geçmeyen
        zorunlu staj rehberini bulabilmeli.
      */
      return liste.filter((r) =>
        sadelestir(
          [r.baslik, r.ozet, r.aciklama, konuEtiketi(r.konu), ...(r.etiketler ?? [])].join(' ')
        ).includes(terim)
      );
    }

    if (sekme === 'uygun' && kisisel) return kisiyeGoreSirala(liste, ogrenci) as Rehber[];
    if (sekme !== 'tumu' && sekme !== 'uygun') liste = liste.filter((r) => r.konu === sekme);
    return liste;
  }, [terim, sekme, kisisel, ogrenci, ogrenciRehberleri]);

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

  const gorunenKonular = digerleriAcik
    ? doluKonular
    : doluKonular.filter((k) => ONCELIKLI_KONULAR.includes(k.id));
  const gizliSayisi = doluKonular.length - gorunenKonular.length;

  const sekmeSec = (id: Sekme) => {
    setSekmeyeDokunuldu(true);
    setSekme(id);
    if (arama) onAramaTemizle?.();
  };

  const kartOzellikleri = (r: Rehber) => ({
    rehber: r,
    onNavigate,
    kayitli: kayitlilar.has(r.slug),
    onKaydet: kaydetmeDestekli ? kaydet : undefined,
    kaydetmeEtiketi: ogrenci?.id ? undefined : 'Kaydetmek için giriş yap',
  });

  return (
    <SayfaKabugu icerikGenisligi={SAYFA_GENISLIGI}>
      <div className="space-y-6">
        {/* ================================================== karşılama */}
        {/*
          Tanıtım bloğu yerine tek satırlık bir soru ve dört işlem. Zemin
          beyaz, kenarlık ince: sayfanın geri kalanıyla aynı dil, ilk ekranı
          kaplamayan bir yükseklik.
        */}
        <section className="space-y-3.5">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
              Kariyer yolculuğunda sıradaki adım ne?
            </h1>
            <p className="text-sm text-gray-600">İhtiyacını seç, sana uygun rehberlere hemen ulaş.</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {HIZLI_ISLEMLER.map((h) => (
              <button
                key={h.konu}
                type="button"
                onClick={() => sekmeSec(h.konu)}
                aria-pressed={sekme === h.konu && !terim}
                className={`flex min-h-11 cursor-pointer flex-col items-start gap-2 rounded-2xl border bg-white p-3 text-left transition-colors sm:flex-row sm:items-center sm:gap-2.5 ${
                  sekme === h.konu && !terim
                    ? 'border-blue-600 ring-1 ring-blue-600'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${h.renk}`}
                >
                  {h.ikon}
                </span>
                <span className="text-[13px] font-bold leading-snug text-gray-900">{h.etiket}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ==================================================== konular */}
        <div className="space-y-2">
          <nav
            aria-label="Rehber konuları"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {kisisel && (
              <SekmeDugmesi aktif={sekme === 'uygun' && !terim} onClick={() => sekmeSec('uygun')}>
                Sana uygun
              </SekmeDugmesi>
            )}
            <SekmeDugmesi aktif={sekme === 'tumu' && !terim} onClick={() => sekmeSec('tumu')}>
              Tümü
            </SekmeDugmesi>
            {gorunenKonular.map((k) => (
              <SekmeDugmesi
                key={k.id}
                aktif={sekme === k.id && !terim}
                onClick={() => sekmeSec(k.id)}
              >
                {k.etiket}
              </SekmeDugmesi>
            ))}

            {gizliSayisi > 0 && (
              <SekmeDugmesi aktif={false} onClick={() => setDigerleriAcik(true)}>
                <span className="inline-flex items-center gap-1">
                  Daha fazla
                  <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </SekmeDugmesi>
            )}
            {digerleriAcik && (
              <SekmeDugmesi aktif={false} onClick={() => setDigerleriAcik(false)}>
                <span className="inline-flex items-center gap-1">
                  Daha az
                  <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                </span>
              </SekmeDugmesi>
            )}
            {/* Son seçenek kenara yapışmasın: yatay listede sağdaki öğe tam erişilebilir olmalı. */}
            <span aria-hidden className="w-2 shrink-0" />
          </nav>

          {/*
            Açıklama yalnızca gerçekten kişiselleştirme yapılabiliyorsa.
            Veri yoksa satır hiç çizilmiyor — "senin için seçtik" demek için
            kişi hakkında bir şey bilmek gerekiyor.
          */}
          {sekme === 'uygun' && kisisel && !terim && (
            <p className="text-xs text-gray-600">Eğitim bilgilerine göre senin için öne çıkardık.</p>
          )}
        </div>

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

        {/* ================================================== içerikler */}
        {sonuclar.length === 0 ? (
          <section className="space-y-3 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="font-bold text-gray-900">
              {terim ? `“${arama.trim()}” için rehber bulunamadı` : 'Bu konuda henüz rehber yok'}
            </p>
            <p className="text-sm text-gray-600">
              Aradığın konuyu henüz yazmamış olabiliriz. Süzgeçleri kaldırıp tüm rehberlere göz at.
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
            sag={<span className="text-sm text-gray-600">{sonuclar.length} yazı</span>}
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
              sag={<span className="text-sm text-gray-600">{sonuclar.length} yazı</span>}
            >
              <RehberIzgarasi>
                {sonuclar.map((r) => (
                  <RehberKarti key={r.slug} {...kartOzellikleri(r)} />
                ))}
              </RehberIzgarasi>
            </Bolum>
          </>
        )}

        {/* ==================================================== keşfet */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Keşfet</h2>
          <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <KesfetKarti
              ikon={<GraduationCap className="h-4.5 w-4.5" />}
              renk="bg-violet-50 text-violet-700"
              baslik="Bölüme göre staj"
              sayi={`${BOLUMLER.length} bölüm`}
              onClick={() => onNavigate('/bolumler')}
            />
            <KesfetKarti
              ikon={<Calculator className="h-4.5 w-4.5" />}
              renk="bg-emerald-50 text-emerald-700"
              baslik="Hesaplama araçları"
              sayi={`${ARACLAR.length} araç`}
              onClick={() => onNavigate('/araclar')}
            />
            <KesfetKarti
              ikon={<Building2 className="h-4.5 w-4.5" />}
              renk="bg-blue-50 text-blue-700"
              baslik="Büyük işverenler"
              sayi="Staj programları"
              onClick={() => onNavigate('/staj-programlari')}
            />
            <KesfetKarti
              ikon={<MapPin className="h-4.5 w-4.5" />}
              renk="bg-amber-50 text-amber-700"
              baslik="Kariyer merkezleri"
              sayi="Üniversiteler"
              onClick={() => onNavigate('/universite-kariyer-merkezleri')}
            />
            <span aria-hidden className="w-2 shrink-0" />
          </div>
        </section>

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

        <p className="max-w-2xl text-xs leading-relaxed text-gray-600">
          Rehberlerde yıldan yıla değişen oran ve tutarlar yazılmıyor; mekanizma anlatılıp güncel
          rakam için resmî kaynağa yönlendiriliyor. Eksik veya hatalı gördüğün bir şey olursa bize
          yaz.
        </p>
      </div>
    </SayfaKabugu>
  );
};

/* Dokunma alanı 44 piksel: mobilde küçük çipleri ıskalamak en sık şikâyet. */
const SekmeDugmesi: React.FC<{
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ aktif, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={aktif}
    className={`min-h-11 shrink-0 cursor-pointer rounded-full px-3.5 text-xs font-bold transition-colors ${
      aktif
        ? 'bg-blue-600 text-white'
        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
    }`}
  >
    {children}
  </button>
);

export { RehberKarti } from './RehberKartlari';
