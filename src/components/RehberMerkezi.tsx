import { useSayfaAramasiKaydet } from '../lib/sayfa-aramasi';
import React from 'react';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { FiltreBlogu, SecenekSatiri } from '../ui';
import { KonuSeridi } from './KonuSeridi';
import { donukKure, kureDokunusu } from '../lib/kure-donusu.mjs';
import {
  LISTE_BASLIGI,
  LISTE_BASLIGI_NOTU,
  LISTE_BASLIGI_YAZISI,
  YUZEY,
} from '../ui/tokens';
import { SayfaKabugu } from './SayfaKabugu';
import { OneCikanRehberKarti, RehberBolumu, RehberSatiri } from './RehberKartlari';
import { YolHaritasi } from './YolHaritasi';
import { RehberSonuclari } from './RehberSonuclari';
import { StajYollari } from './StajYollari';
import { REHBERLER, KONULAR, konuEtiketi, type KonuId, type Rehber } from '../data/rehberler';
import { BOLUMLER } from '../data/bolumler';
import { STAJ_PROGRAMLARI } from '../data/stajProgramlari';
import { KARIYER_MERKEZLERI } from '../data/kariyerMerkezleri';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { kisisellestirilebilir, kisiyeGoreSirala, sadelestir } from '../lib/rehber-siralama.mjs';
import { gecmisiOku } from '../lib/rehber-gecmis.mjs';
import { birlesikArama } from '../lib/rehber-arama.mjs';
import { kaydedilenRehberler, rehberKaydiDegistir } from '../lib/rehber-veri';
import type { StudentProfile } from '../types';

/*
  KİŞİ ARAMA TEMBEL YÜKLENİYOR — ÖN RENDER KIRILMASIN DİYE

  Ön render (scripts/onrender.mjs) bu dosyayı Node'da statik derleyip
  `renderToStaticMarkup` ile çiziyor. `./sosyal/KullaniciArama` →
  `lib/queries/sosyal` → `lib/supabase` zinciri modül yüklenirken
  `import.meta.env.VITE_SUPABASE_URL` okuyor; Node'da `import.meta.env`
  yok ve `npm run build` "ön render DURDU: merkez listeleri çizilemedi"
  ile düşüyordu (ölçüldü, HEAD 74f5eef). Supabase istemcisi ön render
  edilen bir dosyanın STATİK içe aktarma grafiğinde olamaz; dinamik
  `import()` modülü yalnız tarayıcıda, parça ilk çizildiğinde çekiyor.
  Parça zaten yalnız oturum açık + terim varken çiziliyor, yani Suspense
  de ancak o anda devreye giriyor; ön render ziyaretçi olarak çizdiği
  için o dala hiç girmiyor.
*/
const KullaniciAramaSonuclari = React.lazy(() =>
  import('./sosyal/KullaniciArama').then((m) => ({ default: m.KullaniciAramaSonuclari }))
);

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

/* Kürenin altına sığan kısa konu adları; tam ad ekran okuyucuda. */
const KONU_KISA_ETIKET: Record<string, string> = {
  cv: 'CV',
  yurt: 'Yurt',
  universite: 'Üniversite',
  kariyer: 'Kariyer',
  yurtdisi: 'Yurtdışı',
  /*
    "Şirketler için" küre altındaki 78 piksellik satıra sığmıyor ve
    `truncate` ile "Şirketl…" diye kırpılıyordu. Konu artık öğrenciye de
    göründüğü için kırpılmış ad daha çok kişinin karşısına çıkıyor.
  */
  isveren: 'Şirket',
};

/*
  SEÇİLİ KONU ADRESTE DURUYOR — `?konu=`

  "Şirketler için rehber" kartı /isveren'e, yani "Doğru stajyeri daha
  kolay bulun" PAZARLAMA sayfasına gidiyordu; şirket hesabıyla tıklayan
  kullanıcı "sanki hesaptan çıkılmış gibi" diye bildirdi (20 Eylül 2026).
  Kart artık sayfadan çıkmıyor, konuyu seçiyor — ama tıklanan şey yine
  gerçek bir `<a href>` olmalı (orta tuş, "yeni sekmede aç"). Bunun için
  konu seçiminin bir ADRESİ gerekiyor: `?konu=` hem kartın hedefi, hem
  yenilemeye dayanan hem de paylaşılabilen hâli. `?q=` ile aynı gerekçe
  (src/lib/arama-url.mjs).
*/
const KONU_PARAMETRESI = 'konu';

const adrestenKonu = (): KonuId | null => {
  /* Ön render Node'da çalışıyor: orada adres yok, varsayılan sekme geçerli. */
  if (typeof window === 'undefined') return null;
  try {
    const deger = new URLSearchParams(window.location.search).get(KONU_PARAMETRESI);
    return KONULAR.some((k) => k.id === deger) ? (deger as KonuId) : null;
  } catch {
    return null;
  }
};

const konuyuAdreseYaz = (secilen: Sekme) => {
  if (typeof window === 'undefined') return;
  const parametreler = new URLSearchParams(window.location.search);
  /* "tumu" ve "uygun" bir konu değil; boş parametre bırakmak aynı sayfanın
     ikinci bir adresi demek olurdu (arama-url.mjs'deki kuralın aynısı). */
  if (secilen === 'tumu' || secilen === 'uygun') parametreler.delete(KONU_PARAMETRESI);
  else parametreler.set(KONU_PARAMETRESI, secilen);
  const kuyruk = parametreler.toString();
  /*
    `replaceState`: şeritteki dairelere dokunmak sık bir hareket; her
    dokunuş geçmişe kayıt düşseydi geri tuşu sayfadan çıkamaz hâle
    gelirdi. Arama terimi de aynı sebeple replaceState ile yazılıyor.
  */
  window.history.replaceState({}, '', `${window.location.pathname}${kuyruk ? `?${kuyruk}` : ''}`);
};

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
  /**
   * Şirket hesabı (tek kabuk, 18 Eylül 2026): şirketlere yönelik rehber
   * kartı listenin EN ÜSTÜNE çıkıyor ve "Şirketler için" konusu şeritte
   * yazı sayısına göre sıralanıyor — seçilince /stajyer-nasil-alinir
   * bağlantısı ve `kategori: 'isveren'` yazıları listeleniyor.
   *
   * Öğrencide aynı içerik ULAŞILABİLİR ama ÖNE ÇIKMIYOR (20 Eylül 2026):
   * konu şeridin ve açılır menünün EN SONUNDA, kart listenin sonunda,
   * arama sonuçlarında öğrenci yazılarından sonra. Öne çıkan rehber ve
   * "sana uygun" sıralaması hâlâ yalnız `kategori: 'ogrenci'` görüyor.
   */
  sirketHesabi?: boolean;
}> = ({
  onNavigate,
  ogrenci = null,
  arama = '',
  onAramaDegis,
  onAramaTemizle,
  onGirisGerekli,
  sirketHesabi = false,
}) => {
  React.useEffect(() => {
    document.title = 'Öğrenci rehberi | StajımVar';
  }, []);

  /* Telefonda filtre paneli kapalı başlıyor — Keşfet'teki gibi. */
  const [filtrelerAcik, setFiltrelerAcik] = React.useState(false);

  const kisisel = kisisellestirilebilir(ogrenci);

  /*
    Adreste konu varsa sekme ondan başlıyor: kartın orta tuşla açtığı yeni
    sekme ve yenilenen sayfa, tıklanan konuyu göstermek zorunda.
  */
  const [baslangicKonusu] = React.useState(adrestenKonu);
  const [sekme, setSekme] = React.useState<Sekme>(baslangicKonusu ?? (kisisel ? 'uygun' : 'tumu'));

  /*
    Profil sonradan gelebiliyor (oturum çözülünce). Sekme o anda "tumu"da
    kalırsa kişiselleştirme hiç görünmüyor; kullanıcı elle bir sekme
    seçtiyse ona dokunulmuyor. Adresten gelen konu da elle seçim sayılıyor
    — yoksa profil çözülür çözülmez "sana uygun" onun üstüne yazardı ve
    paylaşılan bağlantı yanlış listeyi açardı.
  */
  const [sekmeyeDokunuldu, setSekmeyeDokunuldu] = React.useState(Boolean(baslangicKonusu));
  React.useEffect(() => {
    if (!sekmeyeDokunuldu) setSekme(kisisel ? 'uygun' : 'tumu');
  }, [kisisel, sekmeyeDokunuldu]);

  const ogrenciRehberleri = React.useMemo(
    () => REHBERLER.filter((r) => r.kategori === 'ogrenci'),
    []
  );

  /*
    İŞVEREN YAZILARI ÖĞRENCİ AKIŞINA KARIŞMIYOR

    Bu liste ayrı tutuluyor çünkü öğrenci akışının belkemiği — öne çıkan
    rehber, "sana uygun" sıralaması ve konu bölümleri — `ogrenciRehberleri`
    üzerinden besleniyor; bir şirket yazısı oraya girerse öğrenciye yanlış
    bir kişiselleştirme sunulmuş olur.

    Ayrımın gerekçesi geçerli, yalnız "öğrenci hiç görmesin" kısmı kalktı
    (20 Eylül 2026): işveren yazıları artık "Şirketler için" konusu
    seçilince öğrencide de listeleniyor ve aramada çıkıyor — ama konu
    şeridin SONUNDA, arama sonuçları da öğrenci yazılarından SONRA.
  */
  const isverenRehberleri = React.useMemo(
    () => REHBERLER.filter((r) => r.kategori === 'isveren'),
    []
  );

  /*
    KONU LİSTESİNİN KAYNAĞI — İŞVEREN KONUSU HER HESAPTA VAR

    Önce yalnız şirket hesabında ekleniyordu: öğrencide "Şirketler için"
    ne şeritte ne açılır menüde çıkıyor, dolayısıyla listenin sonundaki
    "Şirketler için rehber" kartı SEÇİLEMEYEN bir konuya işaret ediyordu.
    Konu artık her hesapta listede; öğrencide sıralamanın sonunda
    (aşağıda `seritKonulari`) — görünür, ama ilk göze çarpan değil.
  */
  const konuKaynagi = React.useMemo(
    () => [...ogrenciRehberleri, ...isverenRehberleri],
    [ogrenciRehberleri, isverenRehberleri]
  );

  /* Yalnızca yazısı OLAN konular sekme oluyor: boş sekme, çalışmayan sekme. */
  const doluKonular = React.useMemo(
    () => KONULAR.filter((k) => konuKaynagi.some((r) => r.konu === k.id)),
    [konuKaynagi]
  );

  /*
    Konu gerçekten seçilebilir mi: işveren yazıları veriden kalkarsa ya da
    kategorisi değişirse sekme boş listeye düşmesin, öğrenci listesine
    dönsün. Adresten `?konu=isveren` gelen bağlantı için de bu kapı.
  */
  const isverenKonusuAcik = doluKonular.some((k) => k.id === 'isveren');

  /* ---------------------------------------------------------- yan veriler */

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
      const kayitli = ogrenci?.id ? await kaydedilenRehberler(ogrenci.id) : [];
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
  const aramaSonuclari = React.useMemo(() => {
    type AramaCiktisi = {
      aktif: boolean;
      toplam: number;
      rehberler: Rehber[];
      bolumler: { slug: string; ad: string; ozet?: string }[];
      isverenler: { slug: string; isveren: string; sektor?: string }[];
      merkezler: { universite: string; sehir?: string; url: string }[];
    };

    const ogrenciSonucu = birlesikArama(arama, {
      rehberler: ogrenciRehberleri.map((r) => ({ ...r, konuAdi: konuEtiketi(r.konu) })),
      bolumler: BOLUMLER,
      isverenler: STAJ_PROGRAMLARI,
      merkezler: KARIYER_MERKEZLERI,
    }) as AramaCiktisi;

    /*
      İŞVEREN YAZILARI ARAMADA VAR AMA EN SONDA

      Aramaya hiç girmiyorlardı: "sigorta" yazan öğrenci, cevabı taşıyan
      şirket yazısını bulamıyordu. İki arama ayrı çalışıp sonuçlar
      arka arkaya ekleniyor — tek havuzda arasaydı sıralama yazıların
      eşleşme gücüne kalırdı ve bir şirket yazısı öğrenci listesinin
      başına geçebilirdi. Aranan kişi büyük çoğunlukla öğrenci.
    */
    const isverenSonucu = birlesikArama(arama, {
      rehberler: isverenRehberleri.map((r) => ({ ...r, konuAdi: konuEtiketi(r.konu) })),
    }) as AramaCiktisi;

    return {
      ...ogrenciSonucu,
      rehberler: [...ogrenciSonucu.rehberler, ...isverenSonucu.rehberler],
      toplam: ogrenciSonucu.toplam + isverenSonucu.rehberler.length,
    };
  }, [arama, ogrenciRehberleri, isverenRehberleri]);

  const sonuclar = React.useMemo(() => {
    if (terim) return aramaSonuclari.rehberler;

    /*
      "Şirketler için" seçiliyken kaynak işveren listesi — hesap türü fark
      etmiyor, konuyu seçen ne aradığını biliyor. `isverenKonusuAcik`
      ayrıca soruluyor: o yazılar veriden kalkarsa (ya da adresten
      uydurma bir `?konu=` gelirse) sekme boş liste değil, öğrenci
      listesi gösteriyor.
    */
    const liste = sekme === 'isveren' && isverenKonusuAcik ? isverenRehberleri : ogrenciRehberleri;
    if (sekme === 'uygun' && kisisel) return kisiyeGoreSirala(liste, ogrenci) as Rehber[];
    if (sekme !== 'tumu' && sekme !== 'uygun') return liste.filter((r) => r.konu === sekme);
    return liste;
  }, [
    terim,
    aramaSonuclari,
    sekme,
    kisisel,
    ogrenci,
    ogrenciRehberleri,
    isverenRehberleri,
    isverenKonusuAcik,
  ]);

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

  /* Konu küresinin dönüş durumu; seçim değişince imza tutmuyor ve kapanıyor. */
  const [konuKureDurumu, setKonuKureDurumu] = React.useState<{ anahtar: string; imza: string } | null>(null);

  const sekmeSec = (id: Sekme) => {
    setSekmeyeDokunuldu(true);
    setSekme(id);
    /* Seçim adrese de yazılıyor: yenileme ve paylaşılan bağlantı aynı
       listeyi açsın (bkz. `konuyuAdreseYaz`). */
    konuyuAdreseYaz(id);
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
        {/*
          Sıra `KONULAR` sırası; "Şirketler için" o dizinin sonunda
          (src/data/rehberler.tsx) olduğu için menüde de en altta —
          şeritteki sabitlemeyle aynı sonuç, ayrıca sıralamaya gerek yok.
        */}
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
  /*
    "ŞİRKETLER İÇİN" ÖĞRENCİDE EN SONDA

    Konu öğrenciye de açıldı ama bu onun işi değil: beş yazılık liste
    sayıya göre dizilse öğrenci konularının ortasına düşerdi. Sıralamaya
    girmeden sona sabitleniyor — arayan bulur, aramayan takılmaz. Şirket
    hesabında ASIL içerik olduğu için sabitleme yok, sayıya göre diziliyor
    (18 Eylül 2026'daki davranış).
  */
  const seritKonulari = React.useMemo(() => {
    const sonaSabit = (id: string) => (!sirketHesabi && id === 'isveren' ? 1 : 0);
    return doluKonular
      .map((k) => ({
        id: k.id as string,
        etiket: k.etiket,
        adet: konuKaynagi.filter((r) => r.konu === k.id).length,
      }))
      .sort(
        (a, b) =>
          sonaSabit(a.id) - sonaSabit(b.id) ||
          b.adet - a.adet ||
          a.etiket.localeCompare(b.etiket, 'tr')
      );
  }, [doluKonular, konuKaynagi, sirketHesabi]);

  /* Şeritte seçili görünen konu: arama varken ya da "uygun"dayken hiçbiri. */
  const seritSecili = terim || sekme === 'uygun' || sekme === 'tumu' ? '' : (sekme as string);

  /*
    BÖLÜM SIRASI VE BAŞLIKLARI — onaylanan tasarım

    Konu sekmeleri rehber sayısına göre diziliyor; bölümler ise okurun
    yolculuğuna göre: önce başvuruya hazırlık, sonra burs, sonra staj
    süreci. Öne çıkan rehber çoğunlukla staj konusunda olduğu için staj
    bölümü hemen altına gelip aynı konuyu tekrarlamıyor. Başlıklar konu
    adı değil, okurun yapacağı iş ("Başvuruya hazırlan"); konu adı
    sekmede ve "Tümünü gör" etiketinde duruyor.
  */
  const KONU_BOLUMU_SIRASI = ['cv', 'burs', 'staj', 'yurtdisi', 'universite', 'yurt', 'kariyer'];
  const KONU_BOLUMU_BASLIGI: Record<string, string> = {
    cv: 'Başvuruya hazırlan',
    burs: 'Burs ve KYK',
    staj: 'Staj sürecinde',
    yurtdisi: 'Yurtdışına açıl',
    universite: 'Üniversite hayatı',
    yurt: 'Yurt ve barınma',
    kariyer: 'İlk iş ve kariyer',
  };
  const KONU_BOLUMU_SATIRI = 3;
  const konuBolumleri = React.useMemo(() => {
    const oneCikanSlug = seciliOlanlar[0]?.slug;
    const sira = (id: string) => {
      const i = KONU_BOLUMU_SIRASI.indexOf(id);
      return i === -1 ? KONU_BOLUMU_SIRASI.length : i;
    };
    return [...seritKonulari]
      .sort((a, b) => sira(a.id) - sira(b.id))
      .map((k) => {
        /*
          Kaynak burada BİLEREK `ogrenciRehberleri`: varsayılan ekran
          (öne çıkan + konu bölümleri) öğrenci yolculuğuna göre dizili.
          "Şirketler için" konusu artık her hesapta şeritte duruyor ama
          bölümü boş kalıyor ve aşağıdaki `filter` onu düşürüyor —
          işveren yazıları konuyu SEÇİNCE geliyor.
        */
        const hepsi = ogrenciRehberleri.filter((r) => r.konu === k.id && r.slug !== oneCikanSlug);
        return {
          id: k.id,
          etiket: k.etiket,
          baslik: KONU_BOLUMU_BASLIGI[k.id] ?? k.etiket,
          toplam: k.adet,
          rehberler: hepsi.slice(0, KONU_BOLUMU_SATIRI),
          fazlasiVar: k.adet > KONU_BOLUMU_SATIRI,
        };
      })
      .filter((b) => b.rehberler.length > 0);
  }, [seritKonulari, ogrenciRehberleri, seciliOlanlar]);

  /* "Tümünü gör": konunun sekmesi açılıyor ve göz sekmelere dönüyor. */
  const sekmelerRef = React.useRef<HTMLDivElement>(null);
  const tumunuGor = (id: Sekme) => {
    sekmeSec(id);
    sekmelerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const aktifSuzgecler = [
    terim ? `Arama: ${arama.trim()}` : '',
    !terim && sekme !== 'tumu' && sekme !== 'uygun' ? konuEtiketi(sekme as KonuId) : '',
  ].filter(Boolean);

  /*
    ARAMA VE SÜZGEÇ TUTAMAĞI ÜST ÇUBUĞA.

    Durum burada kalıyor; üst çubuk yalnız yer tutucuyu ve iki geri
    çağrıyı alıyor. Geri çağrılar `useCallback` ile KARARLI olmak
    zorunda — her çizimde yeni nesne kaydedilseydi sağlayıcı döngüye
    girerdi (bkz. lib/sayfa-aramasi).
  */
  const aramaDegisti = React.useCallback(
    (deger: string) => onAramaDegis?.(deger),
    [onAramaDegis],
  );
  const suzgecAcKapa = React.useCallback(() => setFiltrelerAcik((acik) => !acik), []);
  useSayfaAramasiKaydet(
    onAramaDegis
      ? {
          yerTutucu: 'Rehber, bölüm veya kullanıcı ara',
          onDegisti: aramaDegisti,
          onSuzgec: suzgecAcKapa,
          acikSuzgec: aktifSuzgecler.length,
          suzgecAcik: filtrelerAcik,
        }
      : null,
  );

  const kartOzellikleri = (r: Rehber) => ({
    rehber: r,
    onNavigate,
    kayitli: kayitlilar.has(r.slug),
    onKaydet: kaydetmeDestekli ? kaydet : undefined,
    kaydetmeEtiketi: ogrenci?.id ? undefined : 'Kaydetmek için giriş yap',
  });

  /*
    İŞVEREN TARAFINA GEÇİŞ KARTI — TEK KALIP, İKİ HEDEF

    Aynı satır iki yerde kullanılıyor ve ikisi de rehber verisinde
    OLMAYAN bir hedefe gidiyor (biri özel bir sayfa, öteki sayfa içi konu
    seçimi; `REHBERLER` içinde kayıt yok). Bu yüzden `RehberSatiri` değil
    kendi kalıbı: tıklanan şey gerçek `<a href>`, orta tuş ve "yeni
    sekmede aç" çalışıyor.
  */
  const isverenGecisKarti = (
    adres: string,
    baslik: string,
    aciklama: string,
    testId: string,
    /*
      Verilirse sol tık SAYFADAN ÇIKMIYOR, bunu çağırıyor. `href` yine
      gerçek adres: orta tuş, "yeni sekmede aç" ve bağlantıyı kopyalamak
      aynı yeri açıyor.
    */
    sayfaIcindeAc?: () => void,
  ) => (
    <a
      href={adres}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (sayfaIcindeAc) sayfaIcindeAc();
        else onNavigate(adres);
      }}
      data-testid={testId}
      className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm transition-colors hover:border-blue-300"
    >
      <span>
        <b className="block font-bold text-gray-900">{baslik}</b>
        <span className="text-gray-600">{aciklama}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
    </a>
  );

  /*
    ŞİRKETLER İÇİN REHBER KARTI — ARTIK SAYFADAN ÇIKMIYOR

    Kart `/isveren`e gidiyordu: "Doğru stajyeri daha kolay bulun"
    PAZARLAMA sayfası. Şirket hesabıyla tıklayan kullanıcı "sanki
    hesaptan çıkılmış gibi" diye bildirdi (20 Eylül 2026) — haklı, o
    sayfa oturumsuz bir karşılama ekranı gibi duruyor. Oysa kartın vaat
    ettiği içerik ZATEN bu sayfada: "Şirketler için" konusu seçilince
    işveren yazıları listeleniyor. Kart artık o konuyu seçiyor, okuyucu
    /rehber'de kalıyor. (`/isveren` duruyor; oraya üst menüden gidiliyor.)

    Seçimden sonra şeride kaydırılıyor: kart öğrencide listenin dibinde
    ve liste kısaldığı için okuyucu tıkladıktan sonra boş alana bakardı.

    Öğrencide listenin sonunda (nadir ihtiyaç), şirket hesabında listenin
    başında. Aynı kart, tek tanım.

    Hedefi artık bir sayfa değil bir KONU olduğu için kart o konunun
    yazısı varken çiziliyor: yazılar veriden kalkarsa kart boş bir
    listeye götüren bir vaat olurdu.
  */
  const sirketRehberKarti = isverenKonusuAcik
    ? isverenGecisKarti(
        `/rehber?${KONU_PARAMETRESI}=isveren`,
        'Şirketler için rehber',
        'Stajyer nasıl alınır: sigorta, ücret, evrak',
        'rehber-sirketler-icin',
        () => tumunuGor('isveren'),
      )
    : null;

  return (
    <SayfaKabugu icerikGenisligi={SAYFA_GENISLIGI} ustBosluk="pt-0 sm:pt-3">
      {/*
        İSKELET KEŞFET VE İLANLAR SAYFASIYLA AYNI

        Sayfa tek sütunlu, üst üste yığılmış bölümlerden oluşuyordu; aynı
        ürünün diğer iki listesi (ilanlar ve Keşfet) ise 3/6/3 ızgara
        kullanıyor: solda süzgeçler, ortada başlık + şerit + liste, sağda
        sayaçlar ve bilgi kutusu. Üç liste artık aynı iskelette.
      */}
      {/* Telefonda satır boşluğu sıfır; gizli başlık bant bırakmasın. */}
      <div className={`grid grid-cols-1 items-start gap-0 sm:gap-6 lg:grid-cols-12 ${YUZEY.kolon}`}>
        {/* ------------------------------------------------- sol: süzgeçler */}
        {/*
          Sol sütun telefonda YER KAPLAMIYOR: başlık `sr-only` olunca
          çizecek bir şey kalmıyor ama sütun yine de satır açıyordu.
          `contents` kabı düzenden çıkarıyor; `lg:block` ile geniş
          ekranda sütun eskisi gibi geri geliyor. (İlanlar'daki kalıbın
          aynısı.)
        */}
        <div className="contents lg:block lg:space-y-4 lg:sticky lg:top-4 lg:col-span-3">
          {/*
            BAŞLIK TELEFONDA GÖRSELDEN KALKTI, METİNDEN KALKMADI.

            `sr-only` öğeyi ekrandan çıkarıyor ama DOM'da ve erişilebilirlik
            ağacında bırakıyor: ön render edilen `h1` metni yerinde, arama
            motoru ve ekran okuyucu için hiçbir şey değişmiyor. Geniş
            ekranda (`lg:not-sr-only`) başlık eskisi gibi görünüyor.
          */}
          {/*
            SAYFA BAŞLIĞI GÖRSELDEN KALKTI, METİNDEN KALKMADI

            "Rehber / Bir sonraki adımın için." başlığı kaldırıldı: sayfanın
            adı zaten alt menüde (telefonda) ve üst gezinmede (geniş ekranda)
            seçili sekme olarak yazıyor; aynı adı sayfanın tepesinde bir kez
            daha büyük puntoyla göstermek konu sekmelerini ve öne çıkan
            rehberi aşağı itiyordu.

            `h1` DOM'da `sr-only` olarak duruyor ve ön render edilen başlıkla
            aynı cümleyi söylüyor — arama motoru ve ekran okuyucu için sayfanın
            başlığı değişmedi.
          */}
          <h1 className="sr-only">Öğrenci rehberleri, tek listede.</h1>

          {/*
            TELEFONDA ARAMA VE SÜZGEÇ ÜST ÇUBUKTA

            Sayfa kendi geniş arama kutusunu ve süzgeç düğmesini
            çiziyordu; ikisi de üst çubuğa taşındı (`lib/sayfa-aramasi`).
            Arama DURUMU burada kaldı — üst çubuk yalnız bir tutamak
            alıyor, terim yine `arama` / `onAramaDegis` üzerinden akıyor,
            ayrı bir durum yok.

            Geniş ekranda değişen bir şey yok: orada arama zaten üst
            çubuktaydı ve süzgeç paneli aşağıda açık duruyor.
          */}
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
                      /* Süzgeç temizlenince `?konu=` de adresten düşüyor;
                         yoksa yenileyen kullanıcı temizlediği konuya
                         geri dönerdi. */
                      konuyuAdreseYaz('tumu');
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
          {/*
            AYIRICI KALDIRILDI — Fırsatlar'daki ikizi de kalktı.

            Arama kutusu ve süzgeç düğmesi telefonda üst çubuğa taşındı;
            "kontroller bitti, liste başlıyor" diyecek bir şey kalmadı.
            Geriye yalnız üst çubuğun altında ince bir çizgi kalıyordu.
          */}
        </div>

        {/* --------------------------------------------------- orta: liste */}
        <section aria-label="Rehberler" className="min-w-0 space-y-4 lg:col-span-6">
          {sirketHesabi && sirketRehberKarti}
          {/*
            LİSTE BAŞLIĞI YALNIZ EKRAN OKUYUCUYA — her genişlikte

            "TÜM REHBERLER (71)" satırı masaüstünden de kalktı (kullanıcı
            isteği, 16 Eylül 2026): konu küreleri doğrudan başlıyor, sayı
            dönen kürede. Listenin adı ve sayısı ekran okuyucuda kalıyor.
          */}
          <div className={`${LISTE_BASLIGI} sr-only`}>
            <h2 className={LISTE_BASLIGI_YAZISI}>
              {aktifSuzgecler.length ? 'Filtrelenen rehberler' : 'Tüm rehberler'} ({sonuclar.length}
              )
            </h2>
            <span className={LISTE_BASLIGI_NOTU}>
              Rakam değil, işleyiş anlatılıyor
            </span>
          </div>

          <div ref={sekmelerRef} className="scroll-mt-20">
            {/*
              KONU KÜRELERİ — İlanlar ve Fırsatlar ile tek tip (kullanıcı
              isteği, 16 Eylül 2026). Haplar kalktı; altında kısa ad, seçili
              küreye tekrar dokununca dönüp rehber sayısını gösteriyor.
            */}
            <KonuSeridi
              konular={seritKonulari}
              secili={seritSecili}
              toplam={ogrenciRehberleri.length}
              onSec={(id) => sekmeSec(id as Sekme)}
              onTumu={() => sekmeSec('tumu')}
              kisaEtiketler={KONU_KISA_ETIKET}
              donuk={donukKure(konuKureDurumu, seritSecili)}
              onCevir={(id) =>
                setKonuKureDurumu((d) => kureDokunusu(d, { anahtar: id, secili: true, imza: seritSecili }).durum)
              }
            />
          </div>

        {veriDurumu === 'hata' && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            Kaydettiklerin yüklenemedi. Rehberler açılıyor.
            <button
              type="button"
              onClick={() => void veriYukle()}
              className="cursor-pointer font-bold underline"
            >
              Yeniden dene
            </button>
          </p>
        )}

        {ogrenci && terim ? (
          <React.Suspense fallback={null}>
            <KullaniciAramaSonuclari sorgu={arama} onNavigate={onNavigate} gomuluBaslik="Kişiler" />
          </React.Suspense>
        ) : null}

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
                konuyuAdreseYaz('tumu');
                onAramaTemizle?.();
              }}
              className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
            >
              Filtreleri temizle
            </button>
          </section>
        ) : suzuluyor ? (
          <>
            {/*
              "Stajyer nasıl alınır" konunun GİRİŞ yazısı ama `REHBERLER`
              içinde değil: tablo, çizim ve canlı havuz sayısı taşıyan
              özel bir bileşen (/stajyer-nasil-alinir). Metin rehberi
              olmadığı için kart değil bağlantı satırı olarak, listenin
              başında duruyor — sıraya girmesi için veriye sahte bir
              kayıt eklemek gerekirdi.
            */}
            {!terim &&
              sekme === 'isveren' &&
              isverenKonusuAcik &&
              isverenGecisKarti(
                '/stajyer-nasil-alinir',
                'Stajyer nasıl alınır?',
                'Sigorta, ücret ve okulla imzalanan evrak: baştan sona süreç',
                'rehber-stajyer-nasil-alinir',
              )}
            <RehberBolumu baslik={terim ? 'Arama sonuçları' : konuEtiketi(sekme as KonuId)}>
              {sonuclar.map((r) => (
                <RehberSatiri key={r.slug} {...kartOzellikleri(r)} />
              ))}
            </RehberBolumu>
          </>
        ) : (
          <>
            {/*
              ÖNE ÇIKAN REHBER

              Profili olan öğrencide ona göre sıralanmış listenin ilki,
              diğerlerinde editörün öne çıkardığı ilk rehber.
            */}
            {seciliOlanlar[0] && <OneCikanRehberKarti {...kartOzellikleri(seciliOlanlar[0])} />}

            {devamEdilecekler.length > 0 && (
              <RehberBolumu baslik="Kaldığın yerden devam et">
                {devamEdilecekler.map((r) => (
                  <RehberSatiri key={r.slug} {...kartOzellikleri(r)} />
                ))}
              </RehberBolumu>
            )}

            {/*
              KONU BÖLÜMLERİ

              Sekmelerle aynı sırada (en çok rehberi olan konu önce). Her
              bölümde ilk üç rehber; daha fazlası varsa "Tümünü gör" o
              konunun sekmesini açıp sekmelere kaydırıyor. Öne çıkan rehber
              kendi konusunda ikinci kez listelenmiyor.
            */}
            {konuBolumleri.map((b) => (
              <RehberBolumu
                key={b.id}
                baslik={b.baslik}
                onTumunuGor={b.fazlasiVar ? () => tumunuGor(b.id as Sekme) : undefined}
                tumunuGorEtiketi={`${b.etiket}: tümünü gör (${b.toplam} rehber)`}
              >
                {b.rehberler.map((r) => (
                  <RehberSatiri key={r.slug} {...kartOzellikleri(r)} />
                ))}
              </RehberBolumu>
            ))}
          </>
        )}

          <StajYollari onNavigate={onNavigate} />

          <YolHaritasi onNavigate={onNavigate} ogrenci={ogrenci} />

          {!sirketHesabi && sirketRehberKarti}
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
