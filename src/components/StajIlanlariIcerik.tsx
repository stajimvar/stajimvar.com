import React from 'react';
import { BOLUMLER } from '../data/bolumler';

/**
 * /staj-ilanlari — "staj ilanları" arama niyetinin BİRİNCİL sayfası.
 *
 * NEDEN AYRI SAYFA, ANA SAYFA DURURKEN
 * ------------------------------------
 * Ana sayfa markayı ve ürünün tamamını anlatıyor: ilanlar, fırsatlar,
 * rehberler, araçlar. Arama motoru bu yüzden onu "StajımVar nedir"
 * sorusuna eşliyor — ölçüldü (Search Console): "staj" içeren sorgularda
 * 137 gösterim, ana sayfadan TEK tıklama yok ve tam "staj ilanları"
 * sorgusunda ana sayfa hiç gösterim almıyor.
 *
 * Bu sayfanın tek konusu ilan aramak. Ana sayfanın kopyası DEĞİL:
 * ürün tanıtımı, fırsatlar, araçlar ve sosyal katman burada hiç yok;
 * buradaki şehir/bölüm dökümü ve "nasıl arıyoruz" anlatımı da ana
 * sayfada yok. İkisi aynı kelimeler için yarışmıyor.
 *
 * SAYILAR UYDURULMUYOR
 * --------------------
 * Bu bileşen hiçbir sayı hesaplamıyor ve hiçbir metni kendi üretmiyor:
 * ne verilirse onu yazıyor. Veri gelmediyse ilgili bölüm HİÇ
 * çizilmiyor — "0 ilan" ya da "—" yazmak, ölçülmemiş bir şeyi ölçülmüş
 * gibi göstermek olurdu.
 */

export interface IlanOzeti {
  /** `/ilan/<slug>` — gerçek ilan sayfası. */
  yol: string;
  baslik: string;
  sirket: string;
  sehir: string | null;
  /** "On-site", "Remote", "Hybrid" gibi; ham değer çağırandan geliyor. */
  calismaSekli: string | null;
}

export interface SehirSayisi {
  ad: string;
  adet: number;
}

export interface StajIlanlariVerisi {
  /** Yayında olan ilan sayısı. */
  toplam?: number;
  sirketToplam?: number;
  sehirToplam?: number;
  /** Kaynağı son kontrol edilmiş ilan sayısı ve son kontrol anı. */
  dogrulananToplam?: number;
  sonKontrol?: string | null;
  /** En yeni ilanlar; sıralama çağıranda yapılıyor. */
  ilanlar?: IlanOzeti[];
  /** İlanı olan şehirler, çoktan aza. */
  sehirler?: SehirSayisi[];
  /**
   * Hangi kapının metni: Türkiye (varsayılan; ön render ve arama motoru
   * bunu görüyor), Yurtdışı ya da Tüm ilanlar. Sayılar çağıranda o kapının
   * kapsamından sayılıyor — Türkiye metninde yurtdışı ilanı yok.
   */
  gorunum?: 'turkiye' | 'yurtdisi' | 'tumu';
}

const GORUNUM_METNI = {
  turkiye: {
    h1: 'Güncel Staj İlanları',
    aciklama:
      'Türkiye genelindeki güncel staj ilanlarını şehir, bölüm ve staj türüne göre filtrele. Şirketlerin resmî başvuru sayfalarına doğrudan ulaş.',
    liste: 'Tüm staj ilanlarını filtrele',
    adres: '/?country=TR',
    son: 'Son eklenen staj ilanları',
    sehir: "Türkiye'de ilanın en çok olduğu şehirler",
  },
  yurtdisi: {
    h1: 'Yurtdışında Staj İlanları',
    aciklama:
      'Çalışma konumu Türkiye dışında olan staj ilanları. Dil, vize ve başvuru koşullarını her ilanın kendi kaynak sayfasında kontrol et.',
    liste: 'Yurtdışı ilanlarını filtrele',
    adres: '/?country=all&bolge=yurtdisi',
    son: 'Son eklenen yurtdışı staj ilanları',
    sehir: 'Yurtdışında ilanın en çok olduğu şehirler',
  },
  tumu: {
    h1: 'Tüm Staj İlanları',
    aciklama:
      "Türkiye'deki ve yurtdışındaki bütün yayındaki staj ilanları; konumu kaynakta belirtilmemiş ilanlar dahil.",
    liste: 'Tüm ilanları filtrele',
    adres: '/?country=all',
    son: 'Son eklenen staj ilanları',
    sehir: 'İlanın en çok olduğu şehirler',
  },
} as const;

/* Tasarım sistemi aynen: bölüm ve rehber sayfalarındaki kart ve başlık ölçüleri. */
const KART = 'rounded-2xl border border-gray-200 bg-white p-5 sm:p-6';
const BASLIK2 = 'text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl';

/** Tarihi "14 Eylül 2026" biçiminde yazıyor; geçersizse null. */
export function tarihYaz(deger: string | null | undefined): string | null {
  if (!deger) return null;
  const t = new Date(deger);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Çalışma şeklinin Türkçesi.
 *
 * Ham değerler İngilizce (`on-site`, `remote`, `hybrid`) ve ekranda öyle
 * duruyordu. Bilinmeyen bir değer ÇEVRİLMİYOR, olduğu gibi yazılıyor:
 * uydurma bir karşılık, yanlış bir bilgi olurdu.
 */
export function calismaSekliYaz(deger: string | null | undefined): string | null {
  if (!deger) return null;
  const k = deger.trim().toLowerCase();
  if (k === 'on-site' || k === 'onsite') return 'İş yerinde';
  if (k === 'remote') return 'Uzaktan';
  if (k === 'hybrid') return 'Hibrit';
  return deger;
}

/*
  BAĞLANTI: GERÇEK <a href>

  Liste öğeleri düğme olsaydı tarayıcı onları bağlantı saymazdı — bu
  sitede daha önce ölçülmüştü: /rehber ve /bolumler'in statik HTML'inde
  hiç bağlantı yoktu ve sayfalar birbirinden kopuk adalardı. Tıklama
  uygulama içi geçişe çevriliyor, yani kullanıcı için tam sayfa
  yenilemesi yok; değiştirici tuşlarda tarayıcıya dokunulmuyor.
*/
const Bag: React.FC<{
  href: string;
  onNavigate?: (yol: string) => void;
  className?: string;
  children: React.ReactNode;
}> = ({ href, onNavigate, className, children }) => (
  <a
    href={href}
    onClick={(olay) => {
      if (!onNavigate) return;
      if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
      olay.preventDefault();
      onNavigate(href);
    }}
    className={className}
  >
    {children}
  </a>
);

/**
 * Sayfanın GÖVDESİ — hem canlı rota hem ön render aynı bileşeni çiziyor.
 *
 * Ön render `onNavigate` vermiyor: statik HTML'de bağlantılar düz
 * `<a href>` kalıyor ve tarayıcı onları izleyebiliyor.
 */
export const StajIlanlariIcerik: React.FC<
  StajIlanlariVerisi & { onNavigate?: (yol: string) => void }
> = ({
  toplam,
  sirketToplam,
  sehirToplam,
  dogrulananToplam,
  sonKontrol,
  ilanlar = [],
  sehirler = [],
  onNavigate,
  gorunum = 'turkiye',
}) => {
  const metin = GORUNUM_METNI[gorunum];
  const kontrolTarihi = tarihYaz(sonKontrol);

  /*
    BÖLÜM BAĞLANTILARI GERÇEK SAYFALARA

    Her biri `/bolum/<slug>` — hepsi var olan, kendi metni olan sayfalar.
    Buradan üretilmiş bir "şehir sayfası" YOK: şehir süzgeci bu üründe
    adres değil, liste ekranındaki bir seçim. Var olmayan adresler
    üretmek, taranacak ama içi boş yüzlerce sayfa açmak olurdu.
  */
  const bolumler = BOLUMLER.slice().sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

  return (
    <main className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
          {metin.h1}
        </h1>
        <p className="text-[15px] leading-relaxed text-gray-700">{metin.aciklama}</p>
      </header>

      {/*
        TAM LİSTEYE ÇIKIŞ EN ÜSTTE

        Bu sayfa arama niyetinin karşılığı: metin, döküm ve bağlantılar.
        Süzgeçli GERÇEK liste (şehir, çalışma şekli, şirket, ücret)
        uygulamanın kendi ekranında ve oraya giden yol en üstte
        duruyor — okumak isteyen aşağı iniyor, aramak isteyen tek
        dokunuşla listeye geçiyor.
      */}
      <p>
        <Bag
          href={metin.adres}
          onNavigate={onNavigate}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
        >
          {metin.liste}
        </Bag>
      </p>

      {/*
        SAYILAR VE SON KONTROL

        Her biri ayrı ayrı koşullu: biri gelmediyse yalnız o cümle
        düşüyor, blok komple kaybolmuyor. "0 ilan" yazmak ile "ilan
        sayısı okunamadı" aynı şey değil.
      */}
      {(toplam || sirketToplam || sehirToplam || kontrolTarihi) && (
        <section className={KART}>
          <h2 className={BASLIK2}>Listede şu an ne var?</h2>
          <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-gray-700">
            {typeof toplam === 'number' && (
              <li>
                <strong className="font-bold text-gray-900">{toplam}</strong> yayında staj ilanı
                {typeof sirketToplam === 'number' ? `, ${sirketToplam} şirketten` : ''}
                {typeof sehirToplam === 'number' ? `, ${sehirToplam} şehirde` : ''}.
              </li>
            )}
            {typeof dogrulananToplam === 'number' && dogrulananToplam > 0 && (
              <li>
                {dogrulananToplam} ilanın başvuru bağlantısı kaynağından kontrol edildi.
              </li>
            )}
            {kontrolTarihi && <li>Son kontrol: {kontrolTarihi}.</li>}
          </ul>
        </section>
      )}

      {/*
        İLANLARI NASIL DERLİYORUZ

        Ana sayfada bu anlatım YOK; orada ürünün tamamı tanıtılıyor.
        Burada arama sonucundan gelen kişinin ilk sorusu cevaplanıyor:
        "bu liste nereden geliyor, başvuruyu kime yapacağım".
      */}
      <section className={KART}>
        <h2 className={BASLIK2}>İlanlar nereden geliyor?</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-700">
          İlanları aracı sitelerden değil, şirketlerin kendi kariyer sayfalarından
          derliyoruz. Her ilanda şirketin kendi başvuru bağlantısı var; başvuru
          StajımVar üzerinden değil, şirketin resmî sayfasında tamamlanıyor.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
          Kaynağı doğrulanmayan kayıt listeye girmiyor. Bir ilan kapandığında
          listeden düşüyor; kapanmış bir ilan açıkmış gibi gösterilmiyor.
        </p>
      </section>

      {/* ------------------------------------------------------- ilanlar */}
      {ilanlar.length > 0 && (
        <section className="space-y-3">
          <h2 className={BASLIK2}>{metin.son}</h2>
          <ul className="space-y-2">
            {ilanlar.map((ilan) => {
              const alt = [ilan.sirket, ilan.sehir, calismaSekliYaz(ilan.calismaSekli)]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={ilan.yol}>
                  <Bag
                    href={ilan.yol}
                    onNavigate={onNavigate}
                    className="block rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-500"
                  >
                    <span className="block text-[15px] font-bold text-gray-900">{ilan.baslik}</span>
                    {alt && <span className="mt-0.5 block text-sm text-gray-600">{alt}</span>}
                  </Bag>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* -------------------------------------------------------- şehir */}
      {sehirler.length > 0 && (
        <section className={KART}>
          <h2 className={BASLIK2}>{metin.sehir}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Şehir süzgeci ilan listesinin içinde: listeyi açıp şehri seçebilirsin.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sehirler.map((s) => (
              <li
                key={s.ad}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
              >
                {s.ad} <span className="font-bold text-gray-900">{s.adet}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* -------------------------------------------------------- bölüm */}
      <section className={KART}>
        <h2 className={BASLIK2}>Bölümüne göre staj</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
          Her bölüm için ayrı bir sayfa var: staj nerede yapılır, stajyer gerçekte ne
          iş yapar, başvurmadan önce ne öğrenmek işe yarar.
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
          {bolumler.map((b) => (
            <li key={b.slug}>
              <Bag
                href={`/bolum/${b.slug}`}
                onNavigate={onNavigate}
                className="font-semibold text-blue-700 hover:underline"
              >
                {b.ad} stajı
              </Bag>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------- staj türü */}
      <section className={KART}>
        <h2 className={BASLIK2}>Staj türüne göre ne değişiyor?</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
          Zorunlu staj, gönüllü staj ve uzaktan staj başvuru biçimi, evrak ve sigorta
          tarafında birbirinden ayrılıyor. Her birinin kendi rehberi var:
        </p>
        <ul className="mt-3 space-y-1.5 text-[15px]">
          <li>
            <Bag
              href="/rehber/staj-sigortasi-kim-yapar"
              onNavigate={onNavigate}
              className="font-semibold text-blue-700 hover:underline"
            >
              Zorunlu stajda sigortayı kim yapar?
            </Bag>
          </li>
          <li>
            <Bag
              href="/rehber/gonullu-staj-rehberi"
              onNavigate={onNavigate}
              className="font-semibold text-blue-700 hover:underline"
            >
              Gönüllü staj nasıl yapılır?
            </Bag>
          </li>
          <li>
            <Bag
              href="/rehber/uzaktan-staj-kabul-edilir-mi"
              onNavigate={onNavigate}
              className="font-semibold text-blue-700 hover:underline"
            >
              Uzaktan staj kabul ediliyor mu?
            </Bag>
          </li>
          <li>
            <Bag
              href="/rehber/staj-basvurusu-gerekli-belgeler"
              onNavigate={onNavigate}
              className="font-semibold text-blue-700 hover:underline"
            >
              Staj başvurusu için gerekli belgeler
            </Bag>
          </li>
          <li>
            <Bag
              href="/rehber/staj-nasil-bulunur"
              onNavigate={onNavigate}
              className="font-semibold text-blue-700 hover:underline"
            >
              Staj nasıl bulunur?
            </Bag>
          </li>
          <li>
            <Bag
              href="/araclar/staj-ucreti-hesaplama"
              onNavigate={onNavigate}
              className="font-semibold text-blue-700 hover:underline"
            >
              Staj ücreti hesaplama
            </Bag>
          </li>
        </ul>
      </section>
    </main>
  );
};
