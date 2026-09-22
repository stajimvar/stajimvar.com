import React from 'react';
import { sayi } from '../../lib/yonetim-bicim.mjs';

/**
 * YÖNETİM PANELİ GRAFİKLERİ — SVG, KÜTÜPHANESİZ
 *
 * NEDEN KÜTÜPHANE YOK
 * -------------------
 * Panelin ihtiyacı üç grafik: zaman serisi, yatay dağılım ve huni.
 * Bir grafik kütüphanesi eklemek pakete yüzlerce kilobayt katardı;
 * ölçüldü (bkz. vite.config.ts), bu projede ilk yük zaten dikkatle
 * korunuyor ve ikon paketi bile bu yüzden bölünmedi.
 *
 * ERİŞİLEBİLİRLİK
 * ---------------
 * Her grafiğin yanında AYNI veriyi veren metin var: `<title>` ve
 * ekran okuyucuya açık tablo özeti. Yalnız görsel anlatan bir grafik,
 * veriyi göremeyene hiçbir şey anlatmaz.
 *
 * BOŞ DURUM
 * ---------
 * Veri yoksa grafik çizilmiyor; "veri yok" yazan bir kutu geliyor.
 * Sıfır yükseklikte çubuklar çizmek, veri varmış ama hepsi sıfırmış
 * gibi görünür — ikisi farklı şeyler.
 */

const MAVI = '#2563EB';

/* ------------------------------------------------------------------ */

export const BosDurum: React.FC<{ mesaj?: string }> = ({ mesaj = 'Bu dönem için veri yok' }) => (
  <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60">
    <p className="text-sm text-gray-500">{mesaj}</p>
  </div>
);

export const Iskelet: React.FC<{ yukseklik?: string }> = ({ yukseklik = 'h-40' }) => (
  <div className={`${yukseklik} animate-pulse rounded-xl bg-gray-100`} role="status" aria-label="Yükleniyor" />
);

/* ------------------------------------------------------------------ */
/*  ZAMAN SERİSİ — çubuk                                               */
/* ------------------------------------------------------------------ */

export interface SeriNoktasi {
  etiket: string;
  deger: number;
  ikincil?: number;
}

/**
 * Günlük çubuk grafiği.
 *
 * Çubuklar yüzde yükseklikle çiziliyor, sabit pikselle değil: kap
 * daraldığında (390 piksel mobil) grafik kendi içinde ölçekleniyor ve
 * yatay kaydırma doğmuyor.
 */
export const CubukGrafik: React.FC<{
  veri: SeriNoktasi[];
  baslik: string;
  ikincilEtiket?: string;
  birincilEtiket?: string;
}> = ({ veri, baslik, birincilEtiket = 'Tekil', ikincilEtiket }) => {
  if (!veri.length) return <BosDurum />;
  const enBuyuk = Math.max(...veri.map((n) => Math.max(n.deger, n.ikincil ?? 0)), 1);

  return (
    <figure className="w-full">
      <div className="flex h-44 items-end gap-1.5" role="img" aria-label={baslik}>
        {veri.map((n) => (
          <div key={n.etiket} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            {/*
              SAYI ÇUBUĞUN ÜSTÜNDE YAZIYOR.

              Önceden değer yalnız `title` içindeydi; `title` masaüstünde
              fareyle beklenince çıkıyor, TELEFONDA HİÇ ÇIKMIYOR. Panel
              çoğunlukla telefonda açılıyor.

              Sayısız bir çubuk yanıltıyor: en yüksek değer barı tam
              yüksekliğe çiziyor, yani tek ziyaretçi de "çok" gibi
              görünüyor. Ölçekten okunamayan bir grafikte sayıyı yazmak
              süs değil, grafiğin okunabilmesinin şartı.
            */}
            <div className="flex flex-col items-center leading-none">
              <span className="text-[10px] font-bold tabular-nums text-gray-900">
                {sayi(n.deger)}
              </span>
              {ikincilEtiket !== undefined && (
                <span className="mt-0.5 text-[9px] tabular-nums text-blue-400">
                  {sayi(n.ikincil ?? 0)}
                </span>
              )}
            </div>
            <div className="flex h-32 w-full items-end justify-center gap-0.5">
              {ikincilEtiket !== undefined && (
                <div
                  className="w-1/2 rounded-t bg-blue-200"
                  style={{ height: `${((n.ikincil ?? 0) / enBuyuk) * 100}%` }}
                  title={`${n.etiket} · ${ikincilEtiket}: ${n.ikincil ?? 0}`}
                />
              )}
              <div
                className="w-1/2 rounded-t"
                style={{ height: `${(n.deger / enBuyuk) * 100}%`, backgroundColor: MAVI }}
                title={`${n.etiket} · ${birincilEtiket}: ${n.deger}`}
              />
            </div>
            <span className="truncate text-[10px] text-gray-500">{n.etiket}</span>
          </div>
        ))}
      </div>
      {/* Aynı veri metin olarak: grafiği göremeyen de okuyabilsin. */}
      <figcaption className="sr-only">
        {baslik}. {veri.map((n) => `${n.etiket}: ${n.deger}`).join(', ')}
      </figcaption>
    </figure>
  );
};

/* ------------------------------------------------------------------ */
/*  DAĞILIM — yatay bar                                                */
/* ------------------------------------------------------------------ */

export const DagilimListesi: React.FC<{
  veri: { ad: string; adet: number }[];
  toplam?: number;
  sinir?: number;
}> = ({ veri, toplam, sinir = 8 }) => {
  if (!veri.length) return <BosDurum mesaj="Kayıt yok" />;
  const t = toplam ?? veri.reduce((a, b) => a + b.adet, 0);
  const gosterilecek = veri.slice(0, sinir);

  return (
    <ul className="space-y-2">
      {gosterilecek.map((x) => {
        const oran = t > 0 ? x.adet / t : 0;
        return (
          <li key={x.ad}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-gray-700">{x.ad}</span>
              <span className="shrink-0 tabular-nums font-semibold text-gray-900">
                {new Intl.NumberFormat('tr-TR').format(x.adet)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(oran * 100, 1)}%`, backgroundColor: MAVI }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/* ------------------------------------------------------------------ */
/*  HUNİ                                                               */
/* ------------------------------------------------------------------ */

/**
 * Huni.
 *
 * Her adımın yanında hem kendi sayısı hem BİR ÖNCEKİNE göre oranı
 * yazıyor. Yalnız ilk adıma göre oran yazmak, nerede kaybedildiğini
 * gizler: %34'ten %11'e düşüş, ilk adıma göre bakınca küçük bir fark
 * gibi görünür ama o adımda üçte ikisi kayboluyor.
 */
export const Huni: React.FC<{ adimlar: { ad: string; adet: number }[] }> = ({ adimlar }) => {
  if (!adimlar.length) return <BosDurum mesaj="Huni verisi yok" />;
  const ilk = adimlar[0]?.adet || 1;

  return (
    <ol className="space-y-2.5">
      {adimlar.map((a, i) => {
        const oncekiAdet = i === 0 ? null : adimlar[i - 1].adet;
        const oncekineGore = oncekiAdet ? a.adet / oncekiAdet : null;
        return (
          <li key={a.ad}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-gray-700">{a.ad}</span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
                {new Intl.NumberFormat('tr-TR').format(a.adet)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max((a.adet / ilk) * 100, 1)}%`, backgroundColor: MAVI }}
              />
            </div>
            {oncekineGore !== null && (
              <p className="mt-0.5 text-[11px] text-gray-500">
                Bir önceki adımın %{(oncekineGore * 100).toFixed(0)}'i
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
};
