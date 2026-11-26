import React from 'react';
import { ArrowRight, Calculator, CalendarDays, ChevronDown, ChevronRight, Clock, Search, X } from 'lucide-react';
import { REHBERLER, rehberOkumaDakika } from '../data/rehberler';
import { RehberKapagi } from '../components/RehberKartlari';
import { SIRKET_KENAR, SIRKET_METIN, SIRKET_METIN_IKINCIL, SIRKET_ODAK, SIRKET_ROZET, SIRKET_VURGU_KOYU } from './renk';

/**
 * İŞVEREN REHBERİ — ŞİRKET HESABININ REHBER AÇILIŞI
 *
 * STAJYER ALMA YOLCULUĞU (26 Kasım 2026)
 * --------------------------------------
 * Sayfa İlanlar, Başvuranlar ve Adaylar'ın yeni kalitesine çekildi.
 * Eski düzen öğrenci rehberinin üç sütunlu iskeletiydi: solda TEK
 * seçenekli "Filtreler" radyosu, telefonda aynı seçimi tekrarlayan bir
 * çip satırı, ortada düz yazı listesi. Kalıcı kural: yatay süzgeç çipi
 * satırı yok ve aynı kontrol iki yerde olmaz. İkisi de kalktı.
 *
 * Yeni sıra bir şirketin stajyer alma yolculuğu:
 *   1. Öne çıkan: /stajyer-nasil-alinir (EmployerGuide) — kullanıcının
 *      beğendiği pilot sayfa.
 *   2. Beş adım: her adım MEVCUT bir işveren yazısı (`ADIMLAR`). Kartta
 *      numara, yazının kendi başlığı ve özeti, okuma süresi ve varsa panel
 *      kısayolu ("İlan oluştur", "Başvuranlar"). Kart yazıya, kısayol
 *      panele gidiyor; iç içe bağlantı yok.
 *   3. İşveren araçları: iki mevcut hesaplayıcı.
 *   4. Sık sorulanlar: soru VE cevap yazıların kendi `sss` alanından;
 *      soru metniyle aranıyor, yazıdan kalkarsa burada da çizilmiyor.
 *   5. Öğrenci rehberleri: silinmedi, en altta tek kartta; "Tüm rehber"
 *      öğrenci merkezini (`onTumRehber`) açıyor.
 *
 * YALNIZ VAR OLAN İÇERİK
 * Yeni yazı, uydurma sayı ya da cevap yok. Adım adları ("İlan yaz",
 * "İlk gün"…) yalnız gezinme etiketi; içerik yazının kendisinden.
 * Kısayollarda başvuru sayısı YOK: bu sayfanın elinde başvuru verisi
 * yok ve sayıyı tahmin etmek panelin "gerçek sayı" kuralını bozardı.
 *
 * ARAMA
 * Üst çubuktaki terimle aynı durum (`arama` / `onAramaDegis`): masaüstünde
 * kutu üst çubukta, telefonda sayfanın içinde. Terim varken yolculuk
 * yerine sonuç listesi çiziliyor; işveren yazılarında sonuç yoksa "Tüm
 * rehberde ara" aynı terimle öğrenci merkezine geçiyor.
 *
 * TELEFON
 * Panel telefonda okunuyor: hiçbir bilgi yalnız hover'da ya da yalnız
 * geniş ekran sütununda değil. Izgara telefonda tek sütun, dokunma
 * hedefleri en az 44 px (min-h-11).
 */

const ISVEREN_YAZILARI = REHBERLER.filter((r) => r.kategori === 'isveren');
type Yazi = (typeof ISVEREN_YAZILARI)[number];

const yaziBul = (slug: string): Yazi | undefined => ISVEREN_YAZILARI.find((r) => r.slug === slug);

/* Beş adım — sıra şirketin yaşadığı sıra. Slug'lar mevcut yazılar. */
const ADIMLAR: { ad: string; slug: string; kisayol?: { etiket: string; yol: string } }[] = [
  { ad: 'İlan yaz', slug: 'iyi-staj-ilani-nasil-yazilir', kisayol: { etiket: 'İlan oluştur', yol: '/sirket/ilan/yeni' } },
  {
    ad: 'Yasal yükümlülükler',
    slug: 'zorunlu-staj-isverenin-yukumlulukleri',
    kisayol: { etiket: 'Staj günü hesapla', yol: '/araclar/staj-gunu-hesaplama' },
  },
  {
    ad: 'Başvuruları değerlendir',
    slug: 'staj-basvurularini-degerlendirme',
    kisayol: { etiket: 'Başvuranlar', yol: '/sirket/basvuranlar' },
  },
  { ad: 'İlk gün', slug: 'stajyerin-ilk-gunu-oryantasyon' },
  { ad: 'Staj sonu', slug: 'staj-sonu-referans-teklif-geri-bildirim' },
];

/* Araç açıklamaları araç sayfalarının kendi tanımından (lib/seo/arac-metinleri). */
const ARACLAR = [
  {
    ad: 'Staj ücreti hesaplama',
    yol: '/araclar/staj-ucreti-hesaplama',
    aciklama: 'Stajyere ödenmesi gereken en düşük tutar; işyerinin personel sayısına göre.',
    Ikon: Calculator,
  },
  {
    ad: 'Staj günü hesaplama',
    yol: '/araclar/staj-gunu-hesaplama',
    aciklama: '20 ya da 30 iş günlük stajın hangi gün bittiği; pazar ve resmî tatiller düşülerek.',
    Ikon: CalendarDays,
  },
];

/* Sık sorulanlar: [yazı, soru metni]. Cevap yazının sss alanından okunuyor. */
const SSS_SECIMI: [string, string][] = [
  ['zorunlu-staj-isverenin-yukumlulukleri', "Stajyer için SGK'ya bildirim yapmam gerekiyor mu?"],
  ['zorunlu-staj-isverenin-yukumlulukleri', 'Staj defterini kim doldurur?'],
  ['staj-sonu-referans-teklif-geri-bildirim', 'Staj belgesini ben mi düzenlerim?'],
  ['iyi-staj-ilani-nasil-yazilir', 'İlanım neden az başvuru alıyor?'],
];

const SSS = SSS_SECIMI.flatMap(([slug, soru]) => {
  const yazi = yaziBul(slug);
  const kayit = yazi?.sss?.find((s) => s.soru === soru);
  return yazi && kayit ? [{ yazi, soru: kayit.soru, cevap: kayit.cevap }] : [];
});

const kucuk = (metin: string) => metin.toLocaleLowerCase('tr-TR');

function eslesir(rehber: Yazi, terim: string): boolean {
  if (!terim) return true;
  const alanlar = [rehber.baslik, rehber.ozet, rehber.hizliCevap ?? '', ...(rehber.etiketler ?? [])];
  return alanlar.some((alan) => kucuk(String(alan)).includes(terim));
}

/** Uygulama içi gezinme; değiştirici tuşlarla tarayıcının kendi davranışı. */
function icTiklama(onNavigate: (yol: string) => void, yol: string) {
  return (olay: React.MouseEvent<HTMLAnchorElement>) => {
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0) return;
    olay.preventDefault();
    onNavigate(yol);
  };
}

const KART = 'rounded-2xl border bg-white';
const IKINCIL_DUGME = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border bg-white px-3.5 text-sm font-bold hover:bg-gray-50 ${SIRKET_ODAK}`;

const BolumBasligi: React.FC<{ id: string; baslik: string; aciklama?: string }> = ({ id, baslik, aciklama }) => (
  <div>
    <h2 id={id} className="text-lg font-extrabold" style={{ color: SIRKET_METIN }}>
      {baslik}
    </h2>
    {aciklama && (
      <p className="mt-0.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
        {aciklama}
      </p>
    )}
  </div>
);

export const IsverenRehberi: React.FC<{
  onNavigate: (yol: string) => void;
  arama: string;
  onAramaDegis: (terim: string) => void;
  /** "Tüm rehber" — öğrenci merkezine geçiş; içerik silinmiyor. */
  onTumRehber: () => void;
}> = ({ onNavigate, arama, onAramaDegis, onTumRehber }) => {
  React.useEffect(() => {
    const eski = document.title;
    document.title = 'İşveren rehberi | StajımVar';
    return () => {
      document.title = eski;
    };
  }, []);

  const terim = kucuk(arama.trim());
  const sonuclar = ISVEREN_YAZILARI.filter((r) => eslesir(r, terim));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: SIRKET_METIN }}>
          İşveren rehberi
        </h1>
        <p className="mt-1 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
          Stajyer alımının beş adımı: her adımda ilgili rehber ve paneldeki kısayolu.
        </p>
      </div>

      {/* Arama (telefon): etiket görünür değil ama bağlı (`sr-only`). Masaüstünde üst çubuktaki kutu. */}
      <div className="relative lg:hidden">
        <label htmlFor="isveren-rehber-ara" className="sr-only">
          Rehberde ara
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          id="isveren-rehber-ara"
          type="search"
          value={arama}
          onChange={(olay) => onAramaDegis(olay.target.value)}
          placeholder="Rehberde ara"
          className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-11 text-base text-gray-900 placeholder:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
        {arama && (
          <button
            type="button"
            onClick={() => onAramaDegis('')}
            aria-label="Aramayı temizle"
            className={`absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 ${SIRKET_ODAK}`}
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>

      {terim ? (
        /* ------------------------------------------------ arama sonuçları */
        <section aria-labelledby="isveren-arama" className="space-y-3">
          <BolumBasligi id="isveren-arama" baslik="Arama sonuçları" />
          {sonuclar.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {sonuclar.map((r) => (
                <li key={r.slug}>
                  <a
                    href={`/rehber/${r.slug}`}
                    onClick={icTiklama(onNavigate, `/rehber/${r.slug}`)}
                    className={`flex h-full items-start gap-3 ${KART} p-4 hover:border-gray-300 ${SIRKET_ODAK}`}
                    style={{ borderColor: SIRKET_KENAR }}
                  >
                    <span aria-hidden className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      <RehberKapagi slug={r.slug} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-bold leading-snug" style={{ color: SIRKET_METIN }}>
                        {r.baslik}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
                        {r.ozet}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                        <Clock aria-hidden className="h-3.5 w-3.5" />
                        {rehberOkumaDakika(r)} dk
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="mt-2.5 h-4 w-4 shrink-0 text-gray-400" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className={`${KART} p-5 text-center`} style={{ borderColor: SIRKET_KENAR }}>
              <p className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
                İşveren yazılarında sonuç yok.
              </p>
              <button
                type="button"
                onClick={onTumRehber}
                className={`mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800 ${SIRKET_ODAK}`}
              >
                Tüm rehberde ara
                <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          {/*
            ÖNE ÇIKAN: gerçek sayfa (/stajyer-nasil-alinir). Telefonda
            fotoğraf üstte; geniş ekranda yatay kart (fotoğraf solda).
          */}
          <a
            href="/stajyer-nasil-alinir"
            onClick={icTiklama(onNavigate, '/stajyer-nasil-alinir')}
            className={`group grid overflow-hidden ${KART} shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-gray-300 md:grid-cols-5 ${SIRKET_ODAK}`}
            style={{ borderColor: SIRKET_KENAR }}
          >
            <div className="relative aspect-video w-full overflow-hidden bg-gray-100 md:col-span-2 md:aspect-auto md:min-h-56">
              <RehberKapagi slug="stajyerin-gorev-ve-sorumluluklari" oncelikli />
            </div>
            <div className="flex flex-col justify-center px-5 pb-5 pt-4 md:col-span-3 md:p-7">
              <span
                className="w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
              >
                Yol haritası
              </span>
              <p className="mt-2 text-xl font-extrabold leading-tight group-hover:text-blue-700 sm:text-2xl" style={{ color: SIRKET_METIN }}>
                Stajyer nasıl alınır?
              </p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                İlk stajyeriniz için yol haritası: iş, belge, sigorta ve ücret dört adımda.
              </p>
              <span className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold" style={{ color: SIRKET_VURGU_KOYU }}>
                Rehberi incele
                <ArrowRight aria-hidden className="h-4 w-4" />
              </span>
            </div>
          </a>

          {/* ------------------------------------------- beş adımlık yolculuk */}
          <section aria-labelledby="isveren-yolculuk" className="space-y-3">
            <BolumBasligi
              id="isveren-yolculuk"
              baslik="Stajyer alma yolculuğu"
              aciklama="İlandan staj sonuna; her adım bir rehber."
            />
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ADIMLAR.map((adim, i) => {
                const yazi = yaziBul(adim.slug);
                if (!yazi) return null;
                return (
                  <li
                    key={adim.slug}
                    className={`flex h-full min-w-0 flex-col overflow-hidden ${KART}`}
                    style={{ borderColor: SIRKET_KENAR }}
                  >
                    <a
                      href={`/rehber/${yazi.slug}`}
                      onClick={icTiklama(onNavigate, `/rehber/${yazi.slug}`)}
                      className={`group block flex-1 rounded-t-2xl ${SIRKET_ODAK}`}
                    >
                      <span aria-hidden className="relative block aspect-[16/7] w-full overflow-hidden bg-gray-100">
                        <RehberKapagi slug={yazi.slug} />
                      </span>
                      <span className="block p-4 pb-2">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums text-white"
                            style={{ background: SIRKET_VURGU_KOYU }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: SIRKET_VURGU_KOYU }}>
                            <span className="sr-only">Adım {i + 1}: </span>
                            {adim.ad}
                          </span>
                        </span>
                        <span
                          className="mt-2 block break-words text-[15px] font-extrabold leading-snug group-hover:text-blue-700"
                          style={{ color: SIRKET_METIN }}
                        >
                          {yazi.baslik}
                        </span>
                        <span className="mt-1 block text-sm leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
                          {yazi.ozet}
                        </span>
                      </span>
                    </a>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4 pt-1">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Clock aria-hidden className="h-3.5 w-3.5" />
                        {rehberOkumaDakika(yazi)} dk okuma
                      </span>
                      {adim.kisayol && (
                        <a
                          href={adim.kisayol.yol}
                          onClick={icTiklama(onNavigate, adim.kisayol.yol)}
                          className={IKINCIL_DUGME}
                          style={{ borderColor: SIRKET_KENAR, color: SIRKET_VURGU_KOYU }}
                        >
                          {adim.kisayol.etiket}
                          <ArrowRight aria-hidden className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
            {/* ------------------------------------------------ sık sorulanlar */}
            {SSS.length > 0 && (
              <section aria-labelledby="isveren-sss" className="space-y-3 lg:col-span-3">
                <BolumBasligi id="isveren-sss" baslik="Sık sorulanlar" />
                <div className={`divide-y ${KART}`} style={{ borderColor: SIRKET_KENAR }}>
                  {SSS.map((s) => (
                    <details key={s.soru} className="group px-4">
                      <summary
                        className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden ${SIRKET_ODAK}`}
                        style={{ color: SIRKET_METIN }}
                      >
                        {s.soru}
                        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="pb-4">
                        <p className="text-sm leading-relaxed" style={{ color: SIRKET_METIN_IKINCIL }}>
                          {s.cevap}
                        </p>
                        <a
                          href={`/rehber/${s.yazi.slug}`}
                          onClick={icTiklama(onNavigate, `/rehber/${s.yazi.slug}`)}
                          className={`mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-bold ${SIRKET_ODAK}`}
                          style={{ color: SIRKET_VURGU_KOYU }}
                        >
                          Devamı: {s.yazi.baslik}
                          <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
                        </a>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* ------------------------------------------------ işveren araçları */}
            <section aria-labelledby="isveren-araclar" className="space-y-3 lg:col-span-2">
              <BolumBasligi id="isveren-araclar" baslik="İşveren araçları" />
              <ul className="space-y-3">
                {ARACLAR.map(({ ad, yol, aciklama, Ikon }) => (
                  <li key={yol}>
                    <a
                      href={yol}
                      onClick={icTiklama(onNavigate, yol)}
                      className={`flex items-start gap-3 ${KART} p-4 hover:border-gray-300 ${SIRKET_ODAK}`}
                      style={{ borderColor: SIRKET_KENAR }}
                    >
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: SIRKET_ROZET, color: SIRKET_VURGU_KOYU }}
                      >
                        <Ikon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold" style={{ color: SIRKET_METIN }}>
                          {ad}
                        </span>
                        <span className="mt-0.5 block text-sm leading-snug" style={{ color: SIRKET_METIN_IKINCIL }}>
                          {aciklama}
                        </span>
                      </span>
                      <ChevronRight aria-hidden className="mt-2.5 h-4 w-4 shrink-0 text-gray-400" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}

      {/*
        ÖĞRENCİ REHBERLERİ EN ALTTA: içerik silinmiyor, tek kartta
        toplanıyor. Düğme öğrenci merkezini açıyor (burs, KYK, CV…).
      */}
      <section
        aria-labelledby="isveren-tum-rehber"
        className={`flex flex-col gap-3 ${KART} p-4 sm:flex-row sm:items-center sm:justify-between`}
        style={{ borderColor: SIRKET_KENAR }}
      >
        <div className="min-w-0">
          <h2 id="isveren-tum-rehber" className="text-sm font-bold" style={{ color: SIRKET_METIN }}>
            Öğrenci rehberleri
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: SIRKET_METIN_IKINCIL }}>
            Zorunlu staj, CV, burs ve KYK yazıları; stajyerinizin okuduğu rehberler.
          </p>
        </div>
        <button
          type="button"
          onClick={onTumRehber}
          className={`${IKINCIL_DUGME} shrink-0`}
          style={{ borderColor: SIRKET_KENAR, color: SIRKET_METIN }}
        >
          Tüm rehberi aç
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
};
