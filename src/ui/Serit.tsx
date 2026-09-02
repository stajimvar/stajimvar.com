import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Yatay kart şeridi.
 *
 * NEDEN PAYLAŞILAN BİR BİLEŞEN
 * ----------------------------
 * Aynı şerit iki yerde var: Keşfet'teki etkinlik koleksiyonları ve
 * Fırsatlar'daki burs grupları. İkisi ayrı ayrı yazıldığında kart
 * genişliği, boşluk ve ok davranışı sessizce birbirinden ayrılıyor —
 * tokens.ts'in baştan uyardığı durum tam olarak bu.
 *
 * KART GENİŞLİĞİ BURADA SABİT
 * ---------------------------
 * 300 / 320 / 340. Kullanan sayfa genişlik vermiyor: iki sayfada iki
 * farklı ölçü, "aynı üründe iki ayrı kart boyu" demek olurdu.
 *
 * MOBİLDE KENARDAN TAŞIYOR
 * ------------------------
 * Şerit ekranın kenarına kadar gidiyor, böylece "devamı var" duygusu
 * kenarda kesilen karttan okunuyor. Masaüstünde kap ortalanmış olduğu
 * için taşma yok.
 */

/** Kart adımı: kartın gerçek genişliği + aradaki boşluk. */
function kartAdimi(el: HTMLElement): number {
  const li = el.querySelector('li');
  if (!li) return 0;
  const bosluk = parseFloat(getComputedStyle(el).columnGap) || 0;
  return li.getBoundingClientRect().width + bosluk;
}

export function Serit<T>({
  baslik,
  id,
  ogeler,
  anahtar,
  ciz,
  yanBilgi,
}: {
  baslik: string;
  /** Başlık ile şeridi bağlayan kimlik; sayfada eşsiz olmalı. */
  id: string;
  ogeler: T[];
  anahtar: (oge: T) => string;
  ciz: (oge: T) => React.ReactNode;
  /** Başlığın sağında duran küçük açıklama; oklardan önce çiziliyor. */
  yanBilgi?: React.ReactNode;
}) {
  const kutuRef = useRef<HTMLUListElement>(null);
  const [solaKayabilir, setSolaKayabilir] = useState(false);
  const [sagaKayabilir, setSagaKayabilir] = useState(false);

  /*
    Şerit hiç kaymıyorsa (kartlar zaten sığıyorsa) oklar ÇİZİLMİYOR.
    İki sönük düğme, yapacak işi olmadan başlığın sağında duruyor ve
    "bir şey var ama çalışmıyor" izlenimi veriyordu.
  */
  const [kaydirilabilir, setKaydirilabilir] = useState(false);

  const durumuOlc = useCallback(() => {
    const el = kutuRef.current;
    if (!el) return;
    setSolaKayabilir(el.scrollLeft > 4);
    /* 4 piksel pay: alt piksel yuvarlamaları sağ oku hiç sönmez hâle getiriyordu. */
    setSagaKayabilir(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    setKaydirilabilir(el.scrollWidth > el.clientWidth + 4);
  }, []);

  useEffect(() => {
    durumuOlc();
    window.addEventListener('resize', durumuOlc);
    return () => window.removeEventListener('resize', durumuOlc);
  }, [durumuOlc, ogeler]);

  /*
    KAYDIRMA PİKSELLE DEĞİL KART SAYISIYLA

    Önce `scrollBy({ left: clientWidth * 0.85 })` idi ve ok düğmeleri
    çalışmıyordu: hedef bir snap noktasına denk gelmediği için
    `snap-mandatory` şeridi en yakın karta geri çekiyordu. Adım kartın
    gerçek genişliği + boşluk, hedef de bunun tam katı — yani her zaman
    bir snap noktası. Ölçü DOM'dan okunuyor çünkü kart genişliği
    kırılma noktasına göre değişiyor.
  */
  const kaydir = (yon: 1 | -1) => {
    const el = kutuRef.current;
    if (!el) return;
    const adim = kartAdimi(el);
    if (!adim) return;

    const hamle = Math.max(1, Math.floor(el.clientWidth / adim));
    const enFazla = el.scrollWidth - el.clientWidth;
    const suankiIndeks = Math.round(el.scrollLeft / adim);
    const hedef = Math.min(enFazla, Math.max(0, (suankiIndeks + yon * hamle) * adim));

    /* Hareket azaltma açıksa animasyon yok; kaydırmanın kendisi duruyor. */
    const azalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: hedef, behavior: azalt ? 'auto' : 'smooth' });
  };

  if (ogeler.length === 0) return null;

  /* 40 piksel, hafif kenar, üzerine gelince marka mavisi. */
  const okSinifi =
    /*
      Hover `enabled:` ile kapsandı. Önce `disabled:hover:*` ile geri
      alınıyordu; hem üç fazla sınıf hem de aynı dizide "gri yazı + mavi
      zemin" eşleşmesi doğuyordu. Pasif düğme artık hover kuralına hiç
      girmiyor.
    */
    'flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors enabled:hover:border-blue-400 enabled:hover:bg-blue-50 enabled:hover:text-blue-700 disabled:cursor-default disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

  return (
    /*
      Başlık ile kartlar arası 16 piksel. `space-y-3` (12) iken masaüstünde
      satır yüksekliği payıyla 16'ya çıkıyordu ama mobilde 12'de kalıyordu;
      tek değer iki kırılmada iki farklı sonuç veriyordu. 16 tabanı ikisini
      de hedef aralığa (16–20) oturtuyor.
    */
    <section aria-labelledby={`serit-${id}`} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {/*
          BAŞLIK VE SAYI TEK GRUPTA

          Sayı ayrı bir satırdaydı ve başlık satırının sağında 1300
          pikselden fazla boşluk kalıyordu: solda küçük bir başlık, ta
          uzakta iki küçük ok, arası bomboş. Sayıyı başlığın yanına almak
          hem o boşluğu dolduruyor hem sayfadan bir satır siliyor.

          `items-baseline`: 24 piksellik başlıkla 13 piksellik sayının alt
          çizgileri hizalanıyor; `items-center` olsaydı küçük yazı büyük
          yazının ortasında yüzerdi.
        */}
        <div className="flex min-w-0 items-baseline gap-2">
          <h2
            id={`serit-${id}`}
            className="truncate text-2xl font-extrabold tracking-tight text-gray-900"
          >
            {baslik}
          </h2>
          {yanBilgi}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/*
            Oklar yalnızca farenin olduğu genişlikte VE gerçekten
            kaydırılacak bir şey varken. Dokunmatikte parmak var; kartlar
            zaten sığıyorsa kaydıracak bir şey yok.
          */}
          <div className={`${kaydirilabilir ? 'hidden lg:flex' : 'hidden'} items-center gap-2`}>
            <button
              type="button"
              onClick={() => kaydir(-1)}
              disabled={!solaKayabilir}
              aria-label={`${baslik}: öncekiler`}
              className={okSinifi}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => kaydir(1)}
              disabled={!sagaKayabilir}
              aria-label={`${baslik}: sonrakiler`}
              className={okSinifi}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ul
        ref={kutuRef}
        onScroll={durumuOlc}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ogeler.map((oge) => (
          <li
            key={anahtar(oge)}
            /*
              GENİŞLİK ORANLA, SABİT PİKSELLE DEĞİL

              Masaüstünde tam DÖRT kart yan yana duruyor: genişlik
              `(100% - 3 boşluk) / 4`. Sabit piksel (340) verildiğinde
              kaç kartın sığdığı kabın genişliğine göre değişiyordu —
              tam genişlikte 3,8, dar bir kolonda 1,85 kart. Aynı üründe
              iki farklı ızgara demekti bu.

              Beşliydi; şerit sayfanın tamamını kaplarken doğru sayıydı.
              Şerit artık solundaki süzgeç panelinden arta kalan 9 sütunda
              ve orada beş kart 200 pikselin altına iniyor — afiş okunmaz
              oluyordu. Oran korunuyor, bölen dörde indi.

              `[&>article]` : bazı kartların kendi şerit genişliği var
              (ScholarshipDiscoveryCard); onu ezip kabı doldurtuyoruz.
            */
            className="w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] sm:max-w-none md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] [&>article]:w-full [&>article]:max-w-none"
          >
            {ciz(oge)}
          </li>
        ))}
      </ul>
    </section>
  );
}
