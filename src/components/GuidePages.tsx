import React, { useEffect } from 'react';
import { GoogleAdBanner } from './GoogleAdBanner';
import { REKLAM_UYGUN_REHBERLER } from '../data/reklam-uygun-rehberler';
import { rehberEylemleri } from '../lib/rehber-eylemleri.mjs';
import {
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  Building2,
  Calculator,
  Sparkles,
  ExternalLink,
  List,
  Clock,
  CalendarCheck,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';
import { IcindekilerMobil, IcindekilerYan, OkumaCubugu, REHBER_GOVDE_STILI, useRehberBasliklari } from './RehberOkuma';
import { RehberdeIlanlar } from './RehberdeIlanlar';
import { SayfaKabugu } from './SayfaKabugu';
import { RenkliKart } from './RehberGorseller';
import { REHBERLER, konuEtiketi, rehberBul, rehberOkumaDakika, type Rehber } from '../data/rehberler';
import { BOLUMLER } from '../data/bolumler';
import { ARACLAR } from './AraclarListesi';
import { SAYFA_GENISLIGI } from '../lib/duzen';
import { RehberMerkezi as RehberMerkeziBilesen } from './RehberMerkezi';
import { RehberIzgarasi, RehberKapagi, RehberKarti } from './RehberKartlari';
import { gecmiseYaz } from '../lib/rehber-gecmis.mjs';
import { rehberOkunduBildir } from '../lib/rehber-veri';
import type { StudentProfile } from '../types';
import { tarihMetni } from '../lib/tarih.mjs';

/**
 * Rehber merkezi ve tek rehber sayfası.
 *
 * İkisi de aynı kayıttan besleniyor (`src/data/rehberler.tsx`): yeni bir
 * başlık eklemek için o dizine bir girdi yazmak yeterli, burada hiçbir şey
 * değişmiyor. Site haritası da aynı kayıttan üretiliyor.
 *
 * Rehberler sitenin ikinci işi: bir öğrenci "zorunlu staj nasıl yapılır" diye
 * arıyor, bir işveren "stajyer nasıl alınır" diye. İkisi de bize buradan
 * geliyor — davet e-postası gönderemediğimiz için tek keşif kanalı bu.
 */

/**
 * Ortak kabuk kullaniliyor: baslik cubugu ana sayfayla ayni genislikte,
 * logo hep sol ust kosede. Ayrintisi SayfaKabugu.tsx icinde.
 */
/*
  REHBER DETAYINDA TEK GERİ YOLU

  Kabuğun genel "Geri" düğmesi ile gövdedeki "← Tüm rehberler" aynı işi
  yapıyordu. Nereye gittiğini söyleyen kaldı.
*/
const Kabuk: React.FC<{ onBack?: () => void; genis?: boolean; children: React.ReactNode }> = ({
  genis = false,
  children,
}) => (
  /* Rehber yazısı site genişliğinde (17 Eylül 2026): ana sayfadan girince daralmıyor. */
  <SayfaKabugu icerikGenisligi={genis ? SAYFA_GENISLIGI : undefined}>{children}</SayfaKabugu>
);

/* ------------------------------------------------------------------ merkez */

interface GuideHubProps {
  onBack: () => void;
  onNavigate: (path: string) => void;
}

/*
  LİSTE ÖĞELERİ DÜĞME DEĞİL BAĞLANTI.

  Önce hepsi <button onClick={onNavigate(...)}> idi. Görsel olarak
  çalışıyordu ama tarayıcı bir düğmeyi bağlantı saymıyor: ölçüldü,
  /rehber ve /bolumler sayfalarının statik HTML'inde HİÇ bağlantı yoktu.
  Yani otuz dört bölüm ve on rehber sayfası birbirinden kopuk adalardı;
  aralarında sinyal taşınmıyordu ve tarayıcı onlara yalnızca site
  haritasından ulaşabiliyordu.

  Şimdi gerçek <a href>. Tıklama yakalanıp uygulama içi geçişe çevriliyor,
  yani kullanıcı için hiçbir şey değişmiyor: tam sayfa yenilenmesi yok.
  Karşılığında orta tuşla yeni sekmede açma ve bağlantıyı kopyalama gibi
  davranışlar da kendiliğinden geliyor — düğmede bunlar hiç yoktu.
*/
const Satir: React.FC<{ rehber: Rehber; onNavigate?: (p: string) => void }> = ({
  rehber,
  onNavigate,
}) => (
  <li className="border-b border-gray-100 last:border-b-0">
    <a
      href={`/rehber/${rehber.slug}`}
      onClick={(e) => {
        if (!onNavigate) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate(`/rehber/${rehber.slug}`);
      }}
      className="w-full flex items-center gap-3 px-4 py-4 text-left cursor-pointer hover:bg-blue-50/60 transition-colors"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-gray-900">{rehber.baslik}</span>
        <span className="block text-sm text-gray-500">{rehber.ozet}</span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-gray-300" />
    </a>
  </li>
);

/**
 * Üstteki büyük kısayol kartı.
 *
 * Sayı (34 bölüm, 4 araç) bilerek gösteriliyor: "Bölüme göre staj" tek
 * başına ne kadar şey olduğunu anlatmıyor, "34 bölüm" anlatıyor.
 */
const Kisayol: React.FC<{
  ikon: React.ReactNode;
  renk: string;
  baslik: string;
  ozet: string;
  sayi: string;
  onClick: () => void;
}> = ({ ikon, renk, baslik, ozet, sayi, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex flex-col gap-3 p-5 rounded-2xl bg-white border border-gray-200 text-left cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm"
  >
    <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${renk}`}>
      {ikon}
    </span>
    <span className="min-w-0 space-y-1">
      <span className="block font-bold text-gray-900">{baslik}</span>
      <span className="block text-sm text-gray-500 leading-snug">{ozet}</span>
    </span>
    <span className="mt-auto pt-1 flex items-center gap-1.5 text-xs font-bold text-blue-600">
      {sayi}
      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  </button>
);

/**
 * Rehber kartı.
 *
 * Her kartın üstünde ince bir renk şeridi var ve renk sırayla değişiyor.
 * Hepsi beyazken ızgara tek bir gri blok gibi duruyordu; şerit kartları
 * birbirinden ayırıyor ve sayfayı canlandırıyor. Renk bir anlam taşımıyor,
 * yalnızca ayırt edici — o yüzden sırayla dağıtılıyor.
 */
/*
  KART TEK YERDE: RehberMerkezi.tsx

  Burada ikinci bir kart bileşeni duruyordu. İkisi de aynı işi yapıyordu ama
  biri fotoğrafı `.jpg` ile, öteki `<picture>` ile istiyordu — yani
  kullanıcının gördüğü kart ile ön render'ın yazdığı kart farklı dosyaya
  bakıyordu. Aynı kart iki yerde yaşayınca fark er geç sessizce oluşuyor.
*/

/**
 * Rehber ızgarası — merkez sayfanın ASIL içeriği.
 *
 * BolumListesi ile aynı gerekçe: bu ağaç hem tarayıcıda hem ön render'da
 * çiziliyor. Önce yalnızca GuideHub içindeydi ve /rehber adresinin statik
 * HTML'inde hiç bağlantı yoktu.
 */
export const RehberListesi: React.FC<{ onNavigate?: (p: string) => void }> = ({
  onNavigate,
}) => {
  const ogrenci = REHBERLER.filter((r) => r.kategori === 'ogrenci');
  const isveren = REHBERLER.filter((r) => r.kategori === 'isveren');
  return (
    <>
      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold text-gray-900">Tüm rehberler</h2>
          <span className="text-sm text-gray-600">{ogrenci.length} yazı</span>
        </div>
        {/*
          Mobilde tek, tablette iki, masaüstünde üç sütun.

          Kart artık kare bir fotoğraf değil: kapak alçaldı, altına başlık,
          özet, okuma süresi ve tarih geldi. Mobilde iki sütuna sıkıştırınca
          özet okunmuyordu — 375 pikselde sütun başına ~170 piksel kalıyor.
        */}
        <RehberIzgarasi>
          {ogrenci.map((r) => (
            <RehberKarti key={r.slug} rehber={r} onNavigate={onNavigate} />
          ))}
        </RehberIzgarasi>
      </section>

      {isveren.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">İşverenler için</h2>
          <RehberIzgarasi>
            {isveren.map((r) => (
              <RehberKarti key={r.slug} rehber={r} onNavigate={onNavigate} />
            ))}
          </RehberIzgarasi>
        </section>
      )}
    </>
  );
};

/*
  REHBER MERKEZİ AYRI DOSYADA

  Merkez sayfası artık arama, konu süzgeci, öne çıkanlar ve keşif şeridi
  taşıyor; bu dosyada tek rehber sayfasıyla iç içe durması ikisini de
  okunmaz yapıyordu. Eski adı (`GuideHub`) korunuyor — App ve ön render
  betiği bu adı kullanıyor.
*/
export { RehberMerkezi } from './RehberMerkezi';

export const GuideHub: React.FC<
  GuideHubProps & {
    ogrenci?: StudentProfile | null;
    arama?: string;
    onAramaDegis?: (terim: string) => void;
    onAramaTemizle?: () => void;
    onGirisGerekli?: () => void;
    /** Şirket hesabında şirketlere yönelik rehber en üstte. */
    sirketHesabi?: boolean;
  }
> = ({ onNavigate, ogrenci = null, arama, onAramaDegis, onAramaTemizle, onGirisGerekli, sirketHesabi }) => (
  <RehberMerkeziBilesen
    onNavigate={onNavigate}
    ogrenci={ogrenci}
    arama={arama}
    onAramaDegis={onAramaDegis}
    onAramaTemizle={onAramaTemizle}
    onGirisGerekli={onGirisGerekli}
    sirketHesabi={sirketHesabi}
  />
);

/* ------------------------------------------------------------- tek rehber */

interface GuidePageProps {
  slug: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

/**
 * Rehber sayfasının sonundaki bağlantılar.
 *
 * Önce bu blok GuidePage içindeydi, yani yalnızca tarayıcıda çizilen
 * kısımdaydı ve ön render çıktısına hiç girmiyordu. Ölçüldü: on rehber
 * sayfasının dokuzunda statik HTML'de SIFIR bağlantı vardı — yani her
 * rehber çıkmaz sokaktı.
 *
 * Bölüm sayfalarına da bağlanıyor: rehberden bölüme giden hiçbir yol
 * yoktu, bağlantı ağı tek yönlü işliyordu.
 */
export const RehberBaglantilari: React.FC<{
  slug: string;
  kategori: Rehber['kategori'];
  onNavigate?: (p: string) => void;
}> = ({ slug, kategori, onNavigate }) => {
  /*
    İLGİLİ REHBERLER: ÜÇ TANE, AYNI KONUDAN

    Burada `kategori`ye göre süzülüyordu — yani öğrenci rehberlerinin
    TAMAMI. On bir yazıyken sorun değildi; yetmiş yazıda her rehber
    sayfasının altına 69 bağlantı düşüyor. Ölçüldü: öğrenci evi rehberi
    7.747 piksele ve 74 rehber bağlantısına çıkıyordu.

    Bu hem okuyucu için işe yaramaz (69 seçenek seçenek değildir) hem de
    bağlantı ağırlığını dağıtıp hiçbir sayfaya sinyal taşımıyor.

    Artık AYNI KONUDAN üç yazı geliyor; konu tek başına yetmezse aynı
    kategoriden tamamlanıyor ve altta "Tüm rehberler" bağlantısı duruyor.
  */
  const bu = REHBERLER.find((r) => r.slug === slug);
  const havuz = REHBERLER.filter((r) => r.slug !== slug && r.kategori === kategori);
  const ayniKonu = bu ? havuz.filter((r) => r.konu === bu.konu) : [];
  const digerleri = [...ayniKonu, ...havuz.filter((r) => !ayniKonu.includes(r))].slice(0, 3);

  // Bölüm sayfalarının tamamı değil: en çok aranan birkaçı, sonra tam liste.
  const bolumler = BOLUMLER.slice(0, 6);

  /*
    Tıklama yakalayıcı. `onNavigate` yoksa (ön render tarafı) hiçbir şey
    yapmıyor ve tarayıcı bağlantıyı normal şekilde izliyor.
  */
  const yakala = (e: React.MouseEvent, yol: string) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(yol);
  };

  return (
    <>
      {digerleri.length > 0 && (
        <section className="mt-10 space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Bunlar da işine yarar
          </h2>
          {/* Fotoğraflı kartlar: rehber merkeziyle aynı kart (RehberKarti), gerçek <a href>. */}
          <RehberIzgarasi>
            {digerleri.map((r) => (
              <RehberKarti key={r.slug} rehber={r} onNavigate={onNavigate} />
            ))}
          </RehberIzgarasi>
          <a
            href="/rehber"
            onClick={(e) => yakala(e, '/rehber')}
            className="inline-block text-sm font-semibold text-blue-700 hover:underline"
          >
            Tüm rehberleri gör
          </a>
        </section>
      )}

      {/*
        REHBERDEN İLAN ARAMAYA ÇIKIŞ

        Rehberler bu sitenin arama motorundan en çok gösterim alan
        sayfaları (bazıları 7-10. sırada). Okuyan kişi bilgiyi alıyor ve
        sayfanın sonunda gidecek yer olarak yalnız başka rehberleri ve
        bölüm sayfalarını buluyordu — okuduğu şeyin karşılığı olan ilan
        listesine giden hiçbir bağlantı yoktu.

        Tek satır ve metni doğal: bağlantı metni sayfanın gerçekten
        götürdüğü yeri söylüyor.
      */}
      <section className="mt-8">
        <a
          href="/staj-ilanlari"
          onClick={(e) => yakala(e, '/staj-ilanlari')}
          className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
        >
          Güncel staj ilanlarını gör
        </a>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">
          Bölümüne göre staj
        </h2>
        <div className="flex flex-wrap gap-2">
          {bolumler.map((b) => (
            <a
              key={b.slug}
              href={`/bolum/${b.slug}`}
              onClick={(e) => yakala(e, `/bolum/${b.slug}`)}
              className="px-3.5 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300"
            >
              {b.ad}
            </a>
          ))}
          <a
            href="/bolumler"
            onClick={(e) => yakala(e, '/bolumler')}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:border-blue-300"
          >
            Tüm bölümler
          </a>
        </div>
      </section>
    </>
  );
};

/**
 * İçindekiler.
 *
 * NEDEN DOM'DAN OKUNUYOR
 * ----------------------
 * Rehber metinleri JSX; başlıklar ayrı bir alanda tutulmuyor ve her rehber
 * için elle bir başlık listesi yazmak, metin değiştiğinde sessizce
 * eskiyen ikinci bir kayıt demekti. Çizildikten sonra kabın içindeki h2
 * öğeleri okunuyor: liste her zaman yazının kendisiyle aynı.
 *
 * Kısa yazılarda hiç çizilmiyor — üç başlıklı bir yazıda içindekiler
 * gezinmeye yardım etmiyor, yalnızca yer kaplıyor.
 */

export const GuidePage: React.FC<GuidePageProps> = ({ slug, onBack, onNavigate }) => {
  /* Rehbere karşılık gelen ürün yüzeyleri; eşlemesi yoksa boş dizi. */
  const eylemler = React.useMemo(() => rehberEylemleri(slug), [slug]);

  /*
    REKLAM YALNIZ EDİTORYAL DEĞER KAPISINI GEÇEN REHBERDE

    Liste üretilmiş bir dosyadan geliyor (scripts/rehber-sayimi.mjs) ve
    kapı `src/lib/reklam-kapisi.mjs` içinde. Kelime sayısı tek başına
    ölçüt değil: sık sorulanlar, resmî kaynak, karşılaştırma bloğu,
    kontrol listesi ve gözden geçirme tarihi de sayılıyor.

    Sitenin geri kalanında reklam yok — ilanlar, şirketler, fırsatlar ve
    etkinliklerde ana içerik bizim yazdığımız metin değil.
  */
  const reklamUygun = REKLAM_UYGUN_REHBERLER.includes(slug);
  const rehber = rehberBul(slug);
  const icerikRef = React.useRef<HTMLDivElement>(null);
  const { basliklar, tumBasliklar, etkin, kendiNumarasiVar } = useRehberBasliklari(icerikRef, slug);

  useEffect(() => {
    /*
      ÖN RENDER İLE AYNI BAŞLIK

      Ön render `seoBaslik || baslik` yazıyor. Burada yalnızca `baslik`
      kullanılsaydı aynı adres, ilk açılışta bir başlık, uygulama içinden
      gidildiğinde başka bir başlık gösterirdi.
    */
    document.title = rehber
      ? `${rehber.seoBaslik || rehber.baslik} | StajımVar`
      : 'Rehber bulunamadı | StajımVar';
    if (rehber) {
      const etiket = document.querySelector('meta[name="description"]');
      if (etiket) etiket.setAttribute('content', rehber.aciklama);
    }
  }, [rehber]);

  /*
    OKUMA KAYDI

    İki ayrı yere yazılıyor, ikisi de farklı soruya cevap veriyor:

      - Tarayıcı geçmişi → "Kaldığın yerden devam et". Cihazda kalıyor,
        hiçbir yere gönderilmiyor, giriş yapmamış okuyucuda da çalışıyor.
      - Sunucudaki sayaç → "En çok okunanlar". Uydurma bir popülerlik
        sıralaması göstermemek için gerçek sayım tutuluyor.

    Bir kez, yazı gerçekten açıldığında. İkisi de sessiz: yazılamazsa
    okuyucunun bilmesi gereken bir şey yok ve konsola hata düşmüyor.
  */
  useEffect(() => {
    if (!rehber) return;
    gecmiseYaz(rehber.slug);
    void rehberOkunduBildir(rehber.slug);
  }, [rehber]);

  if (!rehber) {
    return (
      <Kabuk onBack={onBack}>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <p className="font-bold text-gray-900">Bu rehber bulunamadı</p>
          <button
            type="button"
            onClick={() => onNavigate('/rehber')}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Tüm rehberler
          </button>
        </div>
      </Kabuk>
    );
  }

  return (
    <Kabuk onBack={onBack} genis>
      <style>{REHBER_GOVDE_STILI}</style>
      <OkumaCubugu />
      <article>
        <button
          type="button"
          onClick={() => onNavigate('/rehber')}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Tüm rehberler
        </button>

        {/*
          KAPAK: rehberin kartta görünen fotoğrafı, üstünde başlık.
          Fotoğraf yüklenemezse gizleniyor; koyu degrade başlığı yine okunur tutuyor.
        */}
        <header className="relative mt-2 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-800 text-white shadow-sm">
          <div aria-hidden className="absolute inset-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_picture]:block [&_picture]:h-full">
            <RehberKapagi slug={rehber.slug} oncelikli />
          </div>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/60 to-slate-900/10" />
          <div className="relative flex min-h-[320px] flex-col justify-end gap-4 p-6 sm:min-h-[420px] sm:p-10 lg:p-12">
            <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
              {konuEtiketi(rehber.konu)}
            </span>
            <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {rehber.baslik}
            </h1>
            {rehber.ozet && <p className="max-w-3xl text-base leading-relaxed text-white/85 sm:text-lg">{rehber.ozet}</p>}
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                <Clock aria-hidden className="h-4 w-4" />
                {rehberOkumaDakika(rehber)} dk okuma
              </span>
              {tumBasliklar.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                  <List aria-hidden className="h-4 w-4" />
                  {tumBasliklar.length} bölüm
                </span>
              )}
              {rehber.guncelleme && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                  <CalendarCheck aria-hidden className="h-4 w-4" />
                  {tarihMetni(rehber.guncelleme)}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* İKİ SÜTUN (geniş ekranda): solda yazı, sağda yapışkan içindekiler. */}
        <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 space-y-5 lg:col-span-8">

        {/*
          HIZLI CEVAP

          Öğrencilerin çoğu tek bir soruyla geliyor ("sigortayı kim yapar").
          Cevabı bulmak için 1500 kelime okutmak, cevabı vermemekle aynı şey.
          Ayrıntı aşağıda duruyor; kısası burada.
        */}
        {rehber.hizliCevap && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white shadow-sm sm:p-7">
            <Lightbulb aria-hidden className="absolute -right-4 -top-4 h-28 w-28 text-white/10" />
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-100">
              <Lightbulb aria-hidden className="h-4 w-4" />
              Kısa cevap
            </p>
            <p className="relative mt-2 text-lg font-semibold leading-relaxed sm:text-xl">
              {rehber.hizliCevap}
            </p>
          </div>
        )}

        <IcindekilerMobil basliklar={basliklar} kendiNumarasiVar={kendiNumarasiVar} />
        {/*
          İÇERİK İÇİ BAĞLANTILARI YAKALA

          Rehber metinleri düz JSX; navigate işlevine erişimleri yok. Bir
          rehberden diğerine bağlanmak için düz `<a href="/rehber/...">`
          yazılıyor ve bu bilinçli: tarayıcı yalnızca gerçek `<a href>`
          görüyor, düğmeye bastırılan bir geçişi bağlantı saymıyor. İç
          bağlantı da sayfalar arası sinyal taşıdığı için bu şart.

          Ama tıklamayı olduğu gibi bırakırsak tam sayfa yenileniyor:
          uygulama baştan kuruluyor, kaydırma sıfırlanıyor. Burada tek bir
          yakalayıcı ikisini birden veriyor — işaretlemede gerçek bağlantı,
          kullanıcıda anında geçiş.

          Yeni sekmede açma (Ctrl/Cmd/orta tuş) ve dış bağlantılar
          dokunulmadan geçiyor.
        */}
        <div
          ref={icerikRef}
          className={`rehber-govde rounded-3xl border border-gray-200 bg-white p-5 sm:p-8 lg:p-10 ${kendiNumarasiVar ? '' : 'rehber-govde--sayili'}`}
          onClick={(e) => {
            const bag = (e.target as HTMLElement).closest('a');
            if (!bag) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            if (bag.target === '_blank') return;
            const adres = bag.getAttribute('href');
            if (!adres || !adres.startsWith('/')) return;
            e.preventDefault();
            onNavigate(adres);
          }}
        >
          {rehber.icerik}
        </div>

        {/*
          SIK SORULANLAR

          Aynı liste ön render'da FAQPage yapısal verisine de çevriliyor;
          Google arama sonucunda soruları açılır kapanır gösterebiliyor.
          Burada görünmesi şart: yapısal veride olup sayfada olmayan içerik
          Google'ın kurallarına aykırı.
        */}
        {rehber.sss && rehber.sss.length > 0 && (
          <section className="mt-10 space-y-3">
            <h2 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-gray-900">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <HelpCircle className="h-5 w-5" />
              </span>
              Sık sorulanlar
            </h2>
            <div className="space-y-2.5">
              {rehber.sss.map((s) => (
                <details key={s.soru} className="group rounded-2xl border border-gray-200 bg-white px-5 py-4 transition-colors open:border-blue-200 open:bg-blue-50/40">
                  <summary className="flex min-h-8 items-center gap-3 cursor-pointer list-none font-bold text-gray-900 text-base">
                    <ChevronRight className="w-5 h-5 shrink-0 text-blue-600 transition-transform group-open:rotate-90" />
                    {s.soru}
                  </summary>
                  <p className="mt-2 pl-8 text-base text-gray-700 leading-relaxed">{s.cevap}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/*
          RESMÎ KAYNAKLAR

          Rakam ve mevzuat burada doğrulanıyor. Rehberde yıldan yıla
          değişen tutar yazmıyoruz; onun yerine nereden bakılacağını
          söylüyoruz — kaynağı göstermeyen bir bilgi bir süre sonra
          sessizce yanlış oluyor.
        */}
        {/*
          KAYNAK YOKSA SESSİZ KALMIYOR

          Rehberlerin 20'sinde resmî kaynak yok ve olması da gerekmiyor:
          "ATS uyumlu CV nasıl hazırlanır" bir mevzuata dayanmıyor. Ama
          bölüm hiç çizilmeyince okuyucu kaynağın UNUTULDUĞUNU mu yoksa
          hiç OLMADIĞINI mı bilemiyordu — kaynaklı ve kaynaksız yazı
          ekranda aynı görünüyordu.

          `dayanak` yokluğu açıkça söylüyor. İkisi bir arada olmuyor:
          resmî kaynağı olan rehberde bu alan boş kalıyor.
        */}
        {(!rehber.kaynaklar || rehber.kaynaklar.length === 0) && rehber.dayanak && (
          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">
              Bu rehber neye dayanıyor
            </h2>
            <p className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-600">
              {rehber.dayanak}
            </p>
          </section>
        )}

        {rehber.kaynaklar && rehber.kaynaklar.length > 0 && (
          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">
              Resmî kaynaklar
            </h2>
            {/*
              KAYNAK NE İŞE YARADIĞINI SÖYLÜYOR

              Önce yalnızca kurum adı ve bağlantı vardı: "SGK" yazıp ana
              sayfaya göndermek okuyucuya aradığını bulma işini bırakıyordu.
              Artık her kaynak hangi cümleyi desteklediğini söylüyor,
              kurumu yazıyor ve ana sayfa mı belge mi olduğu belli.

              Erişim tarihi yazının son gözden geçirme tarihi: kaynağı o gün
              kontrol ettik. Ayrı bir tarih tutmak, iki tarihin birbirinden
              ayrılmasına ve hangisinin doğru olduğunun belirsizleşmesine
              yol açardı.
            */}
            <ul className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
              {rehber.kaynaklar.map((k) => (
                <li key={k.adres} className="px-4 py-3">
                  <a
                    href={k.adres}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
                  >
                    {k.etiket}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                    {k.kurum && <span>{k.kurum}</span>}
                    <span className="text-gray-300">·</span>
                    <span>
                      {k.tur === 'belge' ? 'Doğrudan sayfa' : 'Kurumun ana sayfası'}
                    </span>
                    {rehber.guncelleme && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>
                          Erişim:{' '}
                          {tarihMetni(rehber.guncelleme)}
                        </span>
                      </>
                    )}
                  </div>
                  {k.destekledigi && (
                    <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                      Neyi doğruluyor: {k.destekledigi}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/*
          YAZININ DİBİNDE CANLI İLAN

          Rehber en güçlü yüzey ama çıkmaz sokaktı: öğrenci "staj CV'si
          nasıl yazılır"ı okuyup çıkıyordu. Yazıyı okuyan kişi başvurmaya
          en yakın kişi; o anda gerçek ilan göstermemek, hazırladığı CV'yi
          göndereceği yeri saklamak olur.

          Yalnızca STAJ ve CV konulu yazılarda: burs, yurt ya da üniversite
          hayatı yazısının altında staj ilanı alakasız durur ve rehberin
          tonunu bozar.
        */}
        {(rehber.konu === 'staj' || rehber.konu === 'cv') && (
          <RehberdeIlanlar baslik={rehber.baslik} onNavigate={onNavigate} />
        )}

        {/*
          UYGULANABİLİR SONRAKİ ADIM

          Yazının sonunda yalnızca başka yazılar göstermek, okuyanı bir
          arşivde dolaştırmak demek. Buradaki bağlantı sitede GERÇEKTEN
          var olan bir yere gidiyor; karşılığı olmayan rehberde bu blok
          hiç çizilmiyor.
        */}
        {rehber.sonrakiAdim && (
          <button
            type="button"
            onClick={() => onNavigate(rehber.sonrakiAdim!.yol)}
            className="mt-8 w-full flex items-center justify-between gap-3 rounded-2xl bg-blue-600 px-4 py-4 text-left text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-blue-100">
                Sıradaki adım
              </span>
              <span className="block font-bold">{rehber.sonrakiAdim.etiket}</span>
              {rehber.sonrakiAdim.aciklama && (
                <span className="block text-xs text-blue-100">{rehber.sonrakiAdim.aciklama}</span>
              )}
            </span>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>
        )}

        {/*
          BURADAN DEVAM ET — ÜRÜN YÜZEYİNE

          `sonrakiAdim` tek ve editoryal bir adım; bu blok ise rehberin
          konusuna karşılık gelen ÜRÜN yüzeylerini veriyor. Eşleme elle
          kurulu (src/lib/rehber-eylemleri.mjs): slug ya da başlıktaki
          kelimeye bakıp otomatik bağlantı üretmek, "burs" geçen her
          rehberi burs sayfasına bağlamak olurdu.

          Bağlantılar gerçek <a href>: tarayıcı bunları izleyebilsin.
          Eşlemesi olmayan rehberde blok hiç çizilmiyor.
        */}
        {eylemler.length > 0 && (
          <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
            <h2 className="text-sm font-extrabold text-gray-900">Buradan devam et</h2>
            <ul className="mt-3 space-y-2">
              {eylemler.map((e) => (
                <li key={e.yol}>
                  <a
                    href={e.yol}
                    onClick={(ev) => {
                      ev.preventDefault();
                      onNavigate(e.yol);
                    }}
                    className="block rounded-xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                  >
                    <span className="block text-sm font-bold text-gray-900">{e.baslik}</span>
                    <span className="block text-xs leading-relaxed text-gray-500">
                      {e.aciklama}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {reklamUygun && <GoogleAdBanner format="in-feed" className="mt-8" />}

        {(rehber.guncelleme || rehber.inceleyen) && (
          <p className="mt-6 text-xs text-gray-600">
            {rehber.guncelleme && (
              <>
                Son gözden geçirme:{' '}
                {tarihMetni(rehber.guncelleme)}
              </>
            )}
            {/* Gözden geçiren yalnızca yazılmışsa çiziliyor; uydurma unvan yok. */}
            {rehber.guncelleme && rehber.inceleyen && ' · '}
            {rehber.inceleyen && <>Gözden geçiren: {rehber.inceleyen}</>}
          </p>
        )}
        </div>

        <aside className="hidden lg:col-span-4 lg:block" aria-label="Yazı içinde gezin">
          <div className="sticky top-24 space-y-4">
            <IcindekilerYan basliklar={basliklar} etkin={etkin} kendiNumarasiVar={kendiNumarasiVar} />
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Okuduğunu uygula</p>
              <p className="mt-1 text-base font-bold leading-snug">Rehberi bitirince güncel staj ilanlarına göz at.</p>
              <a
                href="/staj-ilanlari"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  onNavigate('/staj-ilanlari');
                }}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 hover:bg-blue-50"
              >
                İlanlara git
                <ChevronRight aria-hidden className="h-4 w-4" />
              </a>
            </div>
          </div>
        </aside>
        </div>
      </article>

      <RehberBaglantilari
        slug={rehber.slug}
        kategori={rehber.kategori}
        onNavigate={onNavigate}
      />
    </Kabuk>
  );
};
