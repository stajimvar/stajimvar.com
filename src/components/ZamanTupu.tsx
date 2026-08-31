import React from 'react';
import type { Opportunity } from '../lib/opportunities';
import {
  TUP_RENKLERI,
  tupDolulugu,
  tupDurumu,
  tupErisilebilirAd,
  tupMetni,
} from '../lib/zaman-tupu.mjs';

/**
 * Zaman tüpü — son başvuruya ne kadar kaldığını gösteren doluluk kapsülü.
 *
 * NEDEN TÜP
 * ---------
 * Önce kırmızı/pembe bir bant vardı. Kırmızı bu üründe hata rengi ve açık
 * bir burs, sistem uyarısı gibi görünüyordu. Söylenmek istenen şey kötü
 * haber değil: "bu fırsat yaklaşıyor". Tüp, süre azaldıkça doluyor ve
 * rengi pozitif ailede kalıyor.
 *
 * YATAY KAPSÜL
 * ------------
 * Dikey tüp kartın yüksekliğini büyütüyordu ve telefonda kart zaten dar.
 * Yatay kapsül metnin hemen altına giriyor, 390 pikselde de tam genişlik
 * alıyor ve düğmelerle çakışmıyor.
 *
 * RENK TEK BAŞINA ANLATMIYOR
 * --------------------------
 * Tüpün üstünde her zaman metin var ("Son 3 gün", "Bugün son gün"). Renk
 * körlüğünde bilgi kaybolmuyor. Tüp `aria-hidden`: aynı cümleyi ekran
 * okuyucuya iki kez okutmanın anlamı yok.
 *
 * ANİMASYON
 * ---------
 * Yalnızca genişlikte 700 ms'lik tek bir geçiş, `motion-reduce` ile
 * kapanıyor. Parlama, nabız, sayaç yok: oyun arayüzü değil.
 */

export const ZamanTupu: React.FC<{
  item: Opportunity;
  /** Şeritteki dar kartta ikinci satır gizlenebiliyor. */
  sikisik?: boolean;
  className?: string;
}> = ({ item, sikisik, className }) => {
  const durum = tupDurumu(item) as keyof typeof TUP_RENKLERI;
  const renk = TUP_RENKLERI[durum] ?? TUP_RENKLERI.takvimsiz;
  const { vurgu, tarih } = tupMetni(item);
  const dolu = tupDolulugu(item);

  /*
    TAKVİMİ AÇIKLANMAMIŞ KAYITTA TÜP ÇİZİLMİYOR

    Bilinmeyen bir süre için çubuk çizmek, olmayan bir bilgiyi varmış gibi
    göstermek olurdu. Yalnızca durumu söyleyen sade bir satır kalıyor.
  */
  if (durum === 'takvimsiz') {
    return (
      <p className={`text-[13px] font-semibold ${className ?? ''}`} style={{ color: renk.yazi }}>
        Takvim açıklanmadı
      </p>
    );
  }

  return (
    <div className={className}>
      {/*
        Vurgu varsa iki uçta: solda kısa vurgu, sağda küçük tarih.
        Vurgu yoksa (bir haftadan uzun süre) tarih SOLA geçiyor — sağda
        tek başına duran bir tarih, solu boş bir satır bırakıyordu.
      */}
      <div className={`flex items-baseline gap-2 ${vurgu ? 'justify-between' : ''}`}>
        {vurgu && (
          <p className="text-[13px] font-extrabold leading-tight" style={{ color: renk.yazi }}>
            {vurgu}
          </p>
        )}
        {tarih && !sikisik && (
          <p
            className={`leading-tight ${vurgu ? 'shrink-0 text-[11px] font-semibold' : 'text-[13px] font-bold'}`}
            style={{ color: vurgu ? '#6B7280' : renk.yazi }}
          >
            {tarih}
          </p>
        )}
      </div>

      <div
        role="img"
        aria-label={tupErisilebilirAd(item)}
        title={tupErisilebilirAd(item)}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
        style={{ background: renk.kanal }}
      >
        <span
          aria-hidden
          className="block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${Math.round(dolu * 100)}%`, background: renk.dolgu }}
        />
      </div>
    </div>
  );
};
