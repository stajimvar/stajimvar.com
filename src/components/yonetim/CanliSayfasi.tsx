import React from 'react';
import { sure } from '../../lib/yonetim-demo.mjs';
import { BosDurum } from './Grafikler';
import { TUR_RENGI, oturumAdi, useCanliOturumlar, type CanliOlay, type CanliOturum } from './useCanliOturumlar';

/**
 * GİREN · BAKAN · ÇIKAN
 *
 * Üç kolon: az önce girenler, şu an bakanlar, çıkanlar. Altında olay
 * akışı.
 *
 * ÇEREZ YOK
 * ---------
 * Misafir ziyaretçi şehir + sayfa + kaynak ile anılıyor; adı yok ve
 * olmamalı. Giriş yapmış öğrenci ve şirket kullanıcısının adı zaten
 * bizde olduğu için görünüyor. Bu ayrım renkle de destekleniyor:
 * öğrenci mavi, şirket turuncu, misafir gri.
 */

const Rozet: React.FC<{ tur: CanliOturum['tur'] }> = ({ tur }) => (
  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${TUR_RENGI[tur].rozet}`}>
    {TUR_RENGI[tur].etiket}
  </span>
);

const OturumSatiri: React.FC<{ o: CanliOturum; ayrinti?: boolean; an?: number }> = ({ o, ayrinti, an }) => (
  <li className="flex min-h-11 items-start gap-2 border-b border-gray-100 py-2 last:border-b-0">
    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TUR_RENGI[o.tur].nokta}`} aria-hidden />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-1.5">
        <p className="min-w-0 truncate text-sm font-semibold text-gray-900">{oturumAdi(o)}</p>
        <Rozet tur={o.tur} />
      </div>
      <p className="truncate text-xs text-gray-600">{o.sayfaAdi}</p>
      {ayrinti && (
        <p className="mt-0.5 truncate text-[11px] text-gray-500">
          {o.sehir} · {o.cihaz} · {o.kaynak} · {sure((Date.now() - o.basladi) / 1000)}
        </p>
      )}
      {an !== undefined && (
        <p className="mt-0.5 text-[11px] text-gray-500">{sure((Date.now() - an) / 1000)} önce</p>
      )}
    </div>
  </li>
);

const Kolon: React.FC<{
  baslik: string;
  sayi: number;
  children: React.ReactNode;
}> = ({ baslik, sayi, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white">
    <header className="flex items-baseline justify-between gap-2 border-b border-gray-200 px-3 py-2.5">
      <h2 className="text-sm font-bold text-gray-900">{baslik}</h2>
      <span className="tabular-nums text-sm font-black text-gray-900">{sayi}</span>
    </header>
    <div className="max-h-[420px] overflow-y-auto px-3">{children}</div>
  </section>
);

export const CanliSayfasi: React.FC = () => {
  const { oturumlar, olaylar, duraklatildi } = useCanliOturumlar();

  const girenler = olaylar.filter((o) => o.tur === 'girdi').slice(0, 12);
  const cikanlar = olaylar.filter((o) => o.tur === 'cikti').slice(0, 12);

  return (
    <div className="space-y-4">
      {duraklatildi && (
        /*
          Sekme arka plandayken akış duruyor. Bunu SÖYLEMEK gerekiyor:
          duran bir sayacı canlı sanmak, "şu an kimse yok" diye
          okunurdu.
        */
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sekme arka planda olduğu için canlı akış duraklatıldı. Sekmeye dönünce sürüyor.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <Kolon baslik="Yeni girenler" sayi={girenler.length}>
          {girenler.length ? (
            <ul>{girenler.map((o) => <OturumSatiri key={o.oturum.kimlik + o.an} o={o.oturum} an={o.an} />)}</ul>
          ) : (
            <div className="py-6"><BosDurum mesaj="Henüz yeni giren yok" /></div>
          )}
        </Kolon>

        <Kolon baslik="Şu an bakanlar" sayi={oturumlar.length}>
          {oturumlar.length ? (
            <ul>{oturumlar.slice(0, 30).map((o) => <OturumSatiri key={o.kimlik} o={o} ayrinti />)}</ul>
          ) : (
            <div className="py-6"><BosDurum mesaj="Şu an kimse bakmıyor" /></div>
          )}
        </Kolon>

        <Kolon baslik="Çıkanlar" sayi={cikanlar.length}>
          {cikanlar.length ? (
            <ul>{cikanlar.map((o) => <OturumSatiri key={o.oturum.kimlik + o.an} o={o.oturum} an={o.an} />)}</ul>
          ) : (
            <div className="py-6"><BosDurum mesaj="Henüz çıkan yok" /></div>
          )}
        </Kolon>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <header className="border-b border-gray-200 px-3 py-2.5">
          <h2 className="text-sm font-bold text-gray-900">Olay akışı</h2>
        </header>
        <div className="max-h-80 overflow-y-auto px-3">
          {olaylar.length ? (
            <ul>
              {olaylar.slice(0, 40).map((o: CanliOlay) => (
                <li
                  key={o.oturum.kimlik + o.an + o.tur}
                  className="flex min-h-11 items-center gap-2 border-b border-gray-100 py-2 last:border-b-0"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${TUR_RENGI[o.oturum.tur].nokta}`} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                    <strong className="font-semibold text-gray-900">{oturumAdi(o.oturum)}</strong>
                    {o.tur === 'girdi' && ' siteye girdi — '}
                    {o.tur === 'cikti' && ' çıktı — '}
                    {o.tur === 'sayfa' && ' sayfa değiştirdi — '}
                    {o.oturum.sayfaAdi}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-gray-500">
                    {sure((Date.now() - o.an) / 1000)} önce
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6"><BosDurum mesaj="Akış birazdan başlıyor" /></div>
          )}
        </div>
      </section>
    </div>
  );
};
