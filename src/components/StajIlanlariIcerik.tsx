import React from 'react';
import { BOLUMLER } from '../data/bolumler';
import { STAJ_ILANLARI_METNI } from '../lib/staj-ilanlari-metni.mjs';

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
 * Bu sayfanın tek konusu ilan aramak. Ana sayfanın kopyası DEĞİL: fırsat
 * şeridi burada yok; buradaki şehir/bölüm dökümü, "nasıl arıyoruz"
 * anlatımı ve staj türü rehberleri de ana sayfada yok.
 *
 * LİSTE ÜSTTE, BİLGİ ALTTA (14 Ekim 2026, kullanıcı kararı)
 * ---------------------------------------------------------
 * Sayfa yalnız bu metinden oluşuyordu: görselsiz, uzun bir okuma sayfası.
 * Üst çubuktaki "Staj İlanları" sekmesi buraya götürdüğü için kullanıcı
 * gerçek ilan listesini (logolu kartlar, süzgeçler, kaydet) hiç
 * görmüyordu. Artık sayfanın üstünde ana sayfadaki GERÇEK liste
 * (MatchedInternshipsView) çiziliyor; h1 ve giriş cümlesi
 * lib/staj-ilanlari-metni.mjs'ten. Bu bileşen yalnız listenin ALTINDAKİ bilgi bölümü:
 * arama motoru için hazırlanan metin ve bağlantılar kaybolmadı, yeri
 * değişti.
 *
 * SAYILAR UYDURULMUYOR
 * --------------------
 * Bu bileşen hiçbir sayı hesaplamıyor ve hiçbir metni kendi üretmiyor:
 * ne verilirse onu yazıyor. Veri gelmediyse ilgili satır HİÇ çizilmiyor
 * — "0 ilan" ya da "—" yazmak, ölçülmemiş bir şeyi ölçülmüş gibi
 * göstermek olurdu. Sayılar listenin kendi katalog sayfasından (aynı
 * RPC, aynı kapsam) geliyor; ikinci bir sayım yok.
 */

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
  /** İlanı olan şehirler, çoktan aza. */
  sehirler?: SehirSayisi[];
  /**
   * Hangi kapının metni: Türkiye (varsayılan; ön render ve arama motoru
   * bunu görüyor), Yurtdışı ya da Tüm ilanlar. Sayılar çağıranda o kapının
   * kapsamından sayılıyor — Türkiye metninde yurtdışı ilanı yok.
   */
  gorunum?: 'turkiye' | 'yurtdisi' | 'tumu';
}

/** Sayfanın h1'i ve giriş cümlesi — bkz. lib/staj-ilanlari-metni.mjs. */
export const GORUNUM_METNI = STAJ_ILANLARI_METNI;

/* Tasarım sistemi aynen: bölüm ve rehber sayfalarındaki kart ölçüleri. */
const KART = 'rounded-2xl border border-gray-200 bg-white p-5 sm:p-6';
const BASLIK3 = 'text-base font-extrabold tracking-tight text-gray-900 sm:text-lg';
const METIN = 'text-[15px] leading-relaxed text-gray-700';
const BAG = 'font-semibold text-blue-700 hover:underline';

/** Tarihi "14 Eylül 2026" biçiminde yazıyor; geçersizse null. */
export function tarihYaz(deger: string | null | undefined): string | null {
  if (!deger) return null;
  const t = new Date(deger);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
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

/*
  SAYININ KAPSAMI CÜMLEDE (14 Ekim 2026): Türkiye kapısındaki 94 ile tüm
  ülkelerdeki sayfalı arşivin 174'ü aynı sayfada; hangisinin neyi saydığı
  yazılı olmalı. Sayı değişmiyor, yalnız kapsamı söyleniyor.
*/
const SAYI_KAPSAMI = {
  turkiye: "Türkiye'de ",
  yurtdisi: 'Yurtdışında ',
  tumu: 'Tüm ülkelerde ',
} as const;

const STAJ_TURU_REHBERLERI: ReadonlyArray<readonly [string, string]> = [
  ['/rehber/staj-sigortasi-kim-yapar', 'Zorunlu stajda sigortayı kim yapar?'],
  ['/rehber/gonullu-staj-rehberi', 'Gönüllü staj nasıl yapılır?'],
  ['/rehber/uzaktan-staj-kabul-edilir-mi', 'Uzaktan staj kabul ediliyor mu?'],
  ['/rehber/staj-basvurusu-gerekli-belgeler', 'Staj başvurusu için gerekli belgeler'],
  ['/rehber/staj-nasil-bulunur', 'Staj nasıl bulunur?'],
  ['/araclar/staj-ucreti-hesaplama', 'Staj ücreti hesaplama'],
];

/**
 * LİSTENİN ALTINDAKİ BİLGİ BÖLÜMÜ — canlı rota ve ön render aynı bileşeni
 * çiziyor (scripts/onrender.mjs).
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
    <section aria-labelledby="staj-ilanlari-bilgi" className="mt-10 border-t border-gray-200 pt-8 sm:mt-12">
      <h2 id="staj-ilanlari-bilgi" className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
        Staj ilanları hakkında
      </h2>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/*
          SAYILAR VE SON KONTROL

          Her biri ayrı ayrı koşullu: biri gelmediyse yalnız o cümle düşüyor.

          TÜM AÇIK İLANLAR — GERÇEK BAĞLANTI (12 Ekim 2026): sayfalı tam
          liste (`/staj-ilanlari/sayfa/1`) tarayıcının da izleyebildiği bir
          <a href>; her ilan oradan birkaç tık uzakta. Bkz.
          src/lib/seo/ilan-arsivi.mjs.
        */}
        <div className={KART}>
          <h3 className={BASLIK3}>Listede şu an ne var?</h3>
          {(typeof toplam === 'number' || kontrolTarihi) && (
            <ul className={`mt-3 space-y-1.5 ${METIN}`}>
              {typeof toplam === 'number' && (
                <li>
                  {SAYI_KAPSAMI[gorunum]}
                  <strong className="font-bold text-gray-900">{toplam}</strong> yayında staj ilanı
                  {typeof sirketToplam === 'number' ? `, ${sirketToplam} şirketten` : ''}
                  {typeof sehirToplam === 'number' ? `, ${sehirToplam} şehirde` : ''}.
                </li>
              )}
              {typeof dogrulananToplam === 'number' && dogrulananToplam > 0 && (
                <li>{dogrulananToplam} ilanın başvuru bağlantısı kaynağından kontrol edildi.</li>
              )}
              {kontrolTarihi && <li>Son kontrol: {kontrolTarihi}.</li>}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Bag href="/staj-ilanlari/sayfa/1" onNavigate={onNavigate} className={BAG}>
              {gorunum === 'tumu' ? 'Tüm açık ilanları sayfa sayfa gör' : 'Tüm ülkelerdeki açık ilanları sayfa sayfa gör'}
            </Bag>
          </p>
          {/*
            Şehir sayfası (14 Ekim 2026): Türkiye ilanlarının çoğu İstanbul'da;
            kendi sayfası var (lib/seo/sehir-ilanlari). Tek, açıklayıcı bağlantı —
            iki sayfa aynı listeyi taşımasın, birbirine yol göstersin.
          */}
          <p className="mt-1.5 text-sm">
            <Bag href="/staj-ilanlari/istanbul" onNavigate={onNavigate} className={BAG}>
              İstanbul staj ilanları
            </Bag>
          </p>
        </div>

        {/*
          İLANLARI NASIL DERLİYORUZ — arama sonucundan gelen kişinin ilk
          sorusu: "bu liste nereden geliyor, başvuruyu kime yapacağım".
        */}
        <div className={KART}>
          <h3 className={BASLIK3}>İlanlar nereden geliyor?</h3>
          <p className={`mt-3 ${METIN}`}>
            İlanları aracı sitelerden değil, şirketlerin kendi kariyer sayfalarından
            derliyoruz. Çoğu ilanda başvuru şirketin kendi sayfasında tamamlanıyor.
          </p>
          <p className={`mt-2 ${METIN}`}>
            Kaynağı doğrulanmayan kayıt listeye girmiyor. Bir ilan kapandığında
            listeden düşüyor; kapanmış bir ilan açıkmış gibi gösterilmiyor.
          </p>
        </div>

        {/* -------------------------------------------------------- şehir */}
        {sehirler.length > 0 && (
          <div className={KART}>
            <h3 className={BASLIK3}>{metin.sehir}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Şehir süzgeci yukarıdaki listenin içinde.
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
          </div>
        )}

        {/*
          STAJ TÜRÜ — şehir kartı yoksa (canlıda şehir dökümü gelmiyor)
          iki sütunlu ızgarada yalnız kalıp yanında boşluk bırakmasın diye
          tam genişlik.
        */}
        <div className={`${KART} ${sehirler.length === 0 ? 'lg:col-span-2' : ''}`}>
          <h3 className={BASLIK3}>Staj türüne göre ne değişiyor?</h3>
          <p className={`mt-2 ${METIN}`}>
            Zorunlu staj, gönüllü staj ve uzaktan staj başvuru biçimi, evrak ve sigorta
            tarafında birbirinden ayrılıyor. Her birinin kendi rehberi var:
          </p>
          <ul className="mt-3 space-y-1.5 text-[15px]">
            {STAJ_TURU_REHBERLERI.map(([yol, ad]) => (
              <li key={yol}>
                <Bag href={yol} onNavigate={onNavigate} className={BAG}>
                  {ad}
                </Bag>
              </li>
            ))}
          </ul>
        </div>

        {/* -------------------------------------------------------- bölüm */}
        <div className={`${KART} lg:col-span-2`}>
          <h3 className={BASLIK3}>Bölümüne göre staj</h3>
          <p className={`mt-2 ${METIN}`}>
            Her bölüm için ayrı bir sayfa var: staj nerede yapılır, stajyer gerçekte ne
            iş yapar, başvurmadan önce ne öğrenmek işe yarar.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
            {bolumler.map((b) => (
              <li key={b.slug}>
                <Bag href={`/bolum/${b.slug}`} onNavigate={onNavigate} className={BAG}>
                  {b.ad} stajı
                </Bag>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
