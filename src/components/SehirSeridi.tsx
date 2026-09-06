import React from 'react';
import { seritSehirleri, seritToplami } from '../lib/sehir-seridi.mjs';

/**
 * Şehir şeridi — ilanlar sayfasındaki şirket şeridinin (SirketSeridi.tsx)
 * Keşfet karşılığı. Aynı aile: aynı yuvarlak ölçüsü, aynı yatay kaydırma,
 * aynı kart kabı.
 *
 * NEDEN YUVARLAĞIN İÇİNDE SAYI
 * ----------------------------
 * Şirketin logosu var, şehrin yok. Şirket şeridinde yuvarlak "kim" sorusunu
 * cevaplıyor; burada aynı yere baş harf koymak ("İS", "AN") hiçbir şey
 * anlatmayan bir harf dizisi olurdu. Şehrin adı zaten yuvarlağın ALTINDA
 * yazıyor, yani "kim" sorusu orada cevaplanmış durumda. Yuvarlağın içi bu
 * yüzden ikinci soruya ayrıldı: o şehirde kaç etkinlik var. Kullanıcı
 * daireye basmadan önce hangi şehrin dolu olduğunu görüyor.
 *
 * SAYI NEREDEN GELİYOR
 * --------------------
 * Katalog RPC'sinin `facets.cityCounts` alanından. İstemcide sayılamıyor:
 * sayfa yalnızca 24 kayıt getiriyor, oysa katalogda yüzden fazla etkinlik
 * var. Seçili şehir bu sayıma UYGULANMIYOR — uygulansaydı bir şehir
 * seçilince diğer bütün daireler sıfırlanır ve şeritten başka şehre
 * geçilemezdi. Arama, kategori, ücretsiz ve indirim süzgeçleri uygulanıyor.
 */

/** Dört haneli sayı 56 piksellik dairede taşmasın diye punto küçülüyor. */
const sayiPuntosu = (adet: number) => (String(adet).length >= 4 ? 'text-base' : 'text-xl');

const Daire: React.FC<{
  etiket: string;
  adet: number;
  okunan: string;
  secili: boolean;
  onClick: () => void;
}> = ({ etiket, adet, okunan, secili, onClick }) => (
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
          className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full px-1 font-extrabold tabular-nums ${sayiPuntosu(adet)} ${
            secili ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-700'
          }`}
        >
          {adet}
        </span>
      </span>
    </span>
    <span
      aria-hidden
      className={`block w-full truncate text-center text-[11px] ${
        secili ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
      }`}
    >
      {etiket}
    </span>
    {/*
      Yuvarlaktaki çıplak rakam tek başına okununca ("71") hiçbir şey
      anlatmıyor, altındaki ad ise ayrı bir düğüm. Ekran okuyucu bu yüzden
      düğmenin tamamını tek cümle olarak duyuyor: "İstanbul, 71 etkinlik".
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
      <div className="overflow-x-auto px-3">
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
          />
          {sehirler.map((sehir) => (
            <Daire
              key={sehir.ad}
              etiket={sehir.ad}
              adet={sehir.adet}
              okunan={`${sehir.ad}, ${sehir.adet} etkinlik`}
              secili={secili === sehir.ad}
              onClick={() => onSec(sehir.ad)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
