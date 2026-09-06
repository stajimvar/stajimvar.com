import React from 'react';
import { Map as HaritaIkonu } from 'lucide-react';
import { seritSehirleri, seritToplami } from '../lib/sehir-seridi.mjs';
import { SehirSimgesi } from './SehirSimgesi';

/**
 * Şehir şeridi — ilanlar sayfasındaki şirket şeridinin (SirketSeridi.tsx)
 * Keşfet karşılığı. Aynı aile: aynı yuvarlak ölçüsü, aynı yatay kaydırma,
 * aynı kart kabı.
 *
 * NEDEN YUVARLAĞIN İÇİNDE SİMGE
 * -----------------------------
 * Şirketin logosu var, şehrin yok. Bir ara buraya rakam yazıldı — "kaç
 * etkinlik" sorusunu cevaplıyordu ama iki şerit yan yana konunca aynı
 * geometri iki farklı şey anlatıyordu: ilanlarda daire "kim", Keşfet'te
 * "kaç tane". Baş harf ("İS", "AN") ise hiçbir şey anlatmayan bir harf
 * dizisi olurdu.
 *
 * Şimdi dairede şehrin simgesi duruyor (İstanbul için Kız Kulesi, Ankara
 * için Anıtkabir…), sayı ise adın altına indi. Düzen ilan şeridiyle
 * birebir: dairede kimlik, altında ad, onun altında adet.
 *
 * Çizimler `SehirSimgesi.tsx` içinde ve fotoğraf DEĞİL; sebepleri orada.
 *
 * SAYI NEREDEN GELİYOR
 * --------------------
 * Katalog RPC'sinin `facets.cityCounts` alanından. İstemcide sayılamıyor:
 * sayfa yalnızca 24 kayıt getiriyor, oysa katalogda yüzden fazla etkinlik
 * var. Seçili şehir bu sayıma UYGULANMIYOR — uygulansaydı bir şehir
 * seçilince diğer bütün daireler sıfırlanır ve şeritten başka şehre
 * geçilemezdi. Arama, kategori, ücretsiz ve indirim süzgeçleri uygulanıyor.
 */

const Daire: React.FC<{
  etiket: string;
  adet: number;
  okunan: string;
  secili: boolean;
  onClick: () => void;
  /** Dairenin içi: şehir simgesi ya da "Tümü" için harita ikonu. */
  children: React.ReactNode;
}> = ({ etiket, adet, okunan, secili, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={secili}
    title={`${etiket} — ${adet} etkinlik`}
    /* min-h-11 = 44px dokunma hedefi; daire zaten daha uzun, taban yine de yazılı. */
    className="group flex min-h-11 w-[76px] shrink-0 cursor-pointer flex-col items-center gap-1.5"
  >
    <span
      aria-hidden
      className="rounded-full p-[2.5px] transition-colors"
      style={secili ? { background: '#111827' } : { background: '#e5e7eb' }}
    >
      <span className="block rounded-full bg-white p-[2px]">
        <span
          className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ${
            secili ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600'
          }`}
        >
          {children}
        </span>
      </span>
    </span>
    {/*
      SAYI DAİRENİN İÇİNDEN ADIN ALTINA İNDİ

      Daireye rakam yazmak, ŞİRKET şeridinde logonun durduğu yeri bir
      sayıyla dolduruyordu; iki şerit yan yana konunca aynı geometri iki
      farklı şey anlatıyordu. Artık ilan şeridiyle birebir aynı düzen:
      dairede simge, altında ad, onun altında adet.
    */}
    <span aria-hidden className="w-full text-center">
      <span
        className={`block truncate text-[11px] ${
          secili ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
        }`}
      >
        {etiket}
      </span>
      <span className="block truncate text-[10px] tabular-nums text-gray-600">
        {adet} etkinlik
      </span>
    </span>
    {/*
      Görünen iki satır `aria-hidden`; ekran okuyucu düğmenin tamamını tek
      cümle olarak duyuyor: "İstanbul, 71 etkinlik". Aksi hâlde ad ve adet
      ayrı düğümler olarak, arada duraklamayla okunurdu.
    */}
    <span className="sr-only">{okunan}</span>
  </button>
);

export const SehirSeridi: React.FC<{
  /** Katalog yanıtındaki `facets.cityCounts`. */
  sayilar: Record<string, number> | undefined;
  /** Seçili şehir; tek kaynak filtre durumu (`filters.city`). */
  secili: string;
  onSec: (sehir: string) => void;
  onTumu: () => void;
}> = ({ sayilar, secili, onSec, onTumu }) => {
  const sehirler = seritSehirleri(sayilar) as { ad: string; adet: number }[];
  /*
    Hiç şehir yoksa şerit çizilmiyor — SirketSeridi'ndeki kalıbın aynısı.
    Boş bir kutu "veri yok" demiyor, yalnızca yer kaplıyor. Eski önbellekten
    dönen, `cityCounts` taşımayan bir yanıt da buraya düşüyor: şerit
    görünmüyor ama sayfa çalışmaya devam ediyor.
  */
  if (sehirler.length === 0) return null;
  const toplam = seritToplami(sehirler) as number;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white py-3">
      {/*
        `relative` GÖRÜNÜM İÇİN DEĞİL, YATAY TAŞMAYI DURDURMAK İÇİN
        ---------------------------------------------------------
        Her dairenin içinde ekran okuyucu için bir `sr-only` düğümü var ve
        Tailwind'in `sr-only`si `position: absolute`. Bu sarmalayıcı, iç
        şerit ve düğmeler konumlandırılmamışken o mutlak kutuların kapsayıcı
        bloğu ta EN DIŞA — görüntü alanına — düşüyordu. CSS'te bir kaydırma
        kabı, kapsayıcı bloğu kendi dışında kalan mutlak konumlu kutuyu
        KIRPAMAZ: `overflow-x-auto` görünen daireleri kırpıyor ama kaçan
        `sr-only` düğümleri belgenin kaydırma alanını genişletiyordu.

        375 px'lik ekranda ölçülen: documentElement.clientWidth = 375 iken
        scrollWidth = 684. 684, şeritteki SON `sr-only` düğümünün
        ("Şanlıurfa, 1 etkinlik") sağ kenarı. Telefonda bunun bedeli ağır:
        yerleşim görüntü alanı 684'e genişliyor, `position: fixed` olan alt
        gezinme çubuğu ile çerez şeridi de 684 px'e uzuyor — sayfanın tamamı
        sağa sola kayıyor.

        `relative` sarmalayıcıyı bu kutuların kapsayıcı bloğu yapıyor;
        kırpma yeniden işliyor, belge 375'te kalıyor. Sıfır konum kayması,
        yığın bağlamı da açmıyor (z-index: auto). `overflow-x-auto` tek
        başına yetmiyordu — ölçüldü: `overflow-x: hidden` bile bu kaçışı
        durdurmuyor, çünkü sorun kırpma değil kapsayıcı blok seçimi.
      */}
      <div className="relative overflow-x-auto px-3">
        <div className="flex min-w-max gap-3">
          {/*
            İlk daire "Tümü": şehir seçiliyken çıkış yolu. Olmasaydı
            kullanıcı seçtiği şehri filtre panelinden geri almak zorunda
            kalırdı — şeridin kendi içinde tıkladığı seçimin geri alma
            düğmesi yine şeritte olmalı.
          */}
          <Daire
            etiket="Tümü"
            adet={toplam}
            okunan={`Tüm şehirler, ${toplam} etkinlik`}
            secili={secili === ''}
            onClick={onTumu}
          >
            {/* Tek bir yer değil, hepsi: harita ikonu. Şirket şeridinde aynı yerde Layers var. */}
            <HaritaIkonu className="h-6 w-6" aria-hidden />
          </Daire>
          {sehirler.map((sehir) => (
            <Daire
              key={sehir.ad}
              etiket={sehir.ad}
              adet={sehir.adet}
              okunan={`${sehir.ad}, ${sehir.adet} etkinlik`}
              secili={secili === sehir.ad}
              onClick={() => onSec(sehir.ad)}
            >
              <SehirSimgesi sehir={sehir.ad} className="h-7 w-7" />
            </Daire>
          ))}
        </div>
      </div>
    </div>
  );
};
