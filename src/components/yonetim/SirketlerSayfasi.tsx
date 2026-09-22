import React from 'react';
import { fetchPanelSirketleri, type PanelSirketListesi } from '../../lib/queries';
import { sayi } from '../../lib/yonetim-bicim.mjs';
import { BosDurum, Iskelet } from './Grafikler';

/**
 * ŞİRKETLER
 *
 * Sahiplenilmiş / sahipsiz ayrımı ve şirket başına yayındaki ilan sayısı.
 *
 * ALAN ADI EŞLEŞMESİ OTOMATİK ONAY DEĞİL
 * --------------------------------------
 * Bir kişinin e-posta alan adının şirketinkiyle eşleşmesi bir ipucu,
 * kanıt değil: ortak alan adları ve eski çalışanlar var. Sahiplenme
 * kararı onay kuyruğunda elle veriliyor; bu sayfa yalnız durumu
 * gösteriyor.
 */

const SAYFA = 50;

function tarihYaz(deger: string | null): string {
  if (!deger) return '—';
  return new Date(deger).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const SirketlerSayfasi: React.FC = () => {
  const [sahiplenme, setSahiplenme] = React.useState<string | null>(null);
  const [arama, setArama] = React.useState('');
  const [sorgu, setSorgu] = React.useState('');
  const [ofset, setOfset] = React.useState(0);
  const [veri, setVeri] = React.useState<PanelSirketListesi | null>(null);
  const [asama, setAsama] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  React.useEffect(() => {
    const z = window.setTimeout(() => {
      setSorgu(arama.trim());
      setOfset(0);
    }, 500);
    return () => window.clearTimeout(z);
  }, [arama]);

  React.useEffect(() => {
    let iptal = false;
    setAsama('yukleniyor');
    fetchPanelSirketleri({ sahiplenme, arama: sorgu || null, limit: SAYFA, ofset })
      .then((d) => {
        if (iptal) return;
        setVeri(d);
        setAsama('hazir');
      })
      .catch(() => {
        if (!iptal) setAsama('hata');
      });
    return () => {
      iptal = true;
    };
  }, [sahiplenme, sorgu, ofset]);

  const satirlar = veri?.satirlar ?? [];
  const toplam = veri?.toplam ?? 0;

  const secenekler = [
    { deger: null, etiket: 'Tümü', adet: (veri?.sahiplenmisToplam ?? 0) + (veri?.sahipsizToplam ?? 0) },
    { deger: 'sahiplenmis', etiket: 'Sahiplenilmiş', adet: veri?.sahiplenmisToplam },
    { deger: 'sahipsiz', etiket: 'Sahipsiz', adet: veri?.sahipsizToplam },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sahiplenme">
        {secenekler.map((s) => (
          <button
            key={s.etiket}
            type="button"
            onClick={() => {
              setSahiplenme(s.deger);
              setOfset(0);
            }}
            aria-pressed={sahiplenme === s.deger}
            className={`min-h-11 cursor-pointer rounded-lg px-3 text-sm font-semibold ${
              sahiplenme === s.deger
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700'
            }`}
          >
            {s.etiket}
            {s.adet !== undefined && (
              <span
                className={`ml-1.5 tabular-nums ${
                  sahiplenme === s.deger ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {sayi(s.adet)}
              </span>
            )}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Şirket ara</span>
        <input
          type="search"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Şirket ara"
          className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400"
        />
      </label>

      {asama === 'yukleniyor' && <Iskelet yukseklik="h-40" />}

      {asama === 'hata' && (
        <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center">
          <p className="font-bold text-rose-800">Şirket listesi yüklenemedi</p>
        </div>
      )}

      {asama === 'hazir' && (
        <>
          <p className="text-[11px] font-semibold text-gray-500">
            {sayi(toplam)} şirket
            {toplam > SAYFA ? ` · ${sayi(ofset + 1)}–${sayi(Math.min(ofset + SAYFA, toplam))} arası` : ''}
          </p>

          {satirlar.length ? (
            <ul className="space-y-2">
              {satirlar.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{s.ad}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {s.sahiplenildi
                        ? `sahiplenildi · ${tarihYaz(s.sahiplenildi)}`
                        : 'sahipsiz'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-gray-900">{sayi(s.yayinda)}</p>
                    <p className="text-[10px] text-gray-500">yayında ilan</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <BosDurum mesaj={sorgu ? 'Bu aramayla şirket yok' : 'Şirket yok'} />
          )}

          {toplam > SAYFA && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={ofset === 0}
                onClick={() => setOfset(Math.max(ofset - SAYFA, 0))}
                className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 disabled:opacity-40"
              >
                Önceki
              </button>
              <button
                type="button"
                disabled={ofset + SAYFA >= toplam}
                onClick={() => setOfset(ofset + SAYFA)}
                className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
