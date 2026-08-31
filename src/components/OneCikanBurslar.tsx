import React from 'react';
import type { Opportunity } from '../lib/opportunities';
import { oneCikanBurslar } from '../lib/one-cikan-burslar.mjs';
import { ScholarshipDiscoveryCard } from './ScholarshipDiscoveryCard';

/**
 * Öne çıkan burslar şeridi.
 *
 * ÜSTTE KEŞİF, ALTTA KARŞILAŞTIRMA
 * --------------------------------
 * Fırsatlar sayfası bir liste sayfası: kartlar alt alta, hızlı
 * karşılaştırma için. Ama liste sayfası insanı içeri davet etmiyor —
 * ilk ekranda yalnızca kontroller ve gri satırlar görünüyordu. Şerit o
 * daveti veriyor; altındaki liste olduğu gibi kalıyor.
 *
 * BÜTÜN LİSTE CAROUSEL DEĞİL
 * Yalnızca üstteki bu şerit yatay kayıyor. Bütün fırsatları yatay
 * kaydırmaya çevirmek karşılaştırmayı bitirirdi.
 *
 * SÜZGEÇ VARKEN ÇİZİLMİYOR
 * Kullanıcı arama yaptıysa ya da bir süzgeç açtıysa şerit gizleniyor:
 * süzgece uymayan kartları "öne çıkan" diye göstermek, kullanıcının az
 * önce verdiği kararı yok saymak olurdu.
 *
 * SEÇİM VERİDEN
 * Sıralama lib/one-cikan-burslar.mjs içinde ve her bileşeni
 * açıklanabilir: yaklaşan son tarih, doğrulanmış tutar, doğrulanmış
 * kaynak, kapak/logo. Uydurma bir popülerlik ya da editör seçimi yok.
 */

export const OneCikanBurslar: React.FC<{
  items: Opportunity[];
  onNavigate: (yol: string) => void;
  /** Arama ya da süzgeç açıksa şerit hiç çizilmiyor. */
  gizle?: boolean;
}> = ({ items, onNavigate, gizle }) => {
  const secilenler = React.useMemo(() => (gizle ? [] : oneCikanBurslar(items)), [items, gizle]);
  if (secilenler.length === 0) return null;

  return (
    <section aria-labelledby="one-cikan-baslik" className="mb-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id="one-cikan-baslik" className="text-sm font-black tracking-tight text-gray-900">
          Öne çıkan burslar
        </h2>
        {/*
          "Neye göre" sorusunun cevabı görünür: sıralama bir sır değil ve
          kullanıcı bunun editör seçimi olmadığını bilmeli.
        */}
        <span className="shrink-0 text-[11px] font-semibold text-gray-500">
          Son başvurusu yaklaşanlar
        </span>
      </div>

      {/*
        Kaydırma çubuğu gizli ama kaydırma açık; kenardan taşma sayfanın
        yatay kaymasına dönüşmesin diye şerit kendi kutusunda kayıyor.
        `snap` ile kartlar hizada duruyor: parmakla itince yarım kart
        kalmıyor.
      */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {secilenler.map((item: Opportunity) => (
          /*
            GENİŞLİK ŞERİTTE SABİT

            Kartın kendi `serit` biçemi `sm`'den itibaren `w-auto`
            oluyor; o kural keşfet sayfası için doğru, çünkü orada şerit
            geniş ekranda IZGARAYA dönüşüyor. Burada şerit her genişlikte
            şerit kalıyor ve `w-auto` kartları içeriğine göre farklı
            genişliklerde çiziyordu — masaüstünde vitrin dalgalı
            görünüyordu. Genişlik `li`'de sabit, kart onu dolduruyor.
          */
          <li
            key={item.id}
            className="w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-[288px] sm:max-w-none [&>article]:w-full [&>article]:max-w-none"
          >
            <ScholarshipDiscoveryCard
              item={item}
              onNavigate={onNavigate}
              serit
            />
          </li>
        ))}
      </ul>
    </section>
  );
};
