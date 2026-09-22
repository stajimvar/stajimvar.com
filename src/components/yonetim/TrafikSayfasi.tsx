import React from 'react';
import { sayi, sure, trafikOzeti, yuzde } from '../../lib/yonetim-demo.mjs';
import { CubukGrafik, DagilimListesi, Huni } from './Grafikler';

/**
 * TRAFİK
 *
 * Dönem seçimi (bugün / 7 gün / 30 gün) ve dört temel ölçü; altında
 * kaynak, şehir, cihaz, sayfa dağılımları ve huni.
 *
 * ORTALAMA OTURUM SÜRESİ NEDEN VAR
 * --------------------------------
 * Tekil ziyaretçi tek başına "ilgi" anlatmıyor: arama sonucundan
 * gelip iki saniyede çıkan da tekil sayılıyor. Süre ve bounce, gelen
 * kişinin kalıp kalmadığını söylüyor.
 */

const DONEMLER = [
  { kimlik: 'bugun' as const, etiket: 'Bugün' },
  { kimlik: 'yedi' as const, etiket: '7 gün' },
  { kimlik: 'otuz' as const, etiket: '30 gün' },
];

const Olcu: React.FC<{ deger: string; etiket: string; not?: string }> = ({ deger, etiket, not }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4">
    <p className="text-2xl font-black tabular-nums text-gray-900">{deger}</p>
    <p className="mt-0.5 text-[11px] font-semibold text-gray-500">{etiket}</p>
    {not && <p className="mt-1 text-[11px] text-gray-400">{not}</p>}
  </div>
);

const Kart: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-4">
    <h2 className="mb-3 text-sm font-bold text-gray-900">{baslik}</h2>
    {children}
  </section>
);

export const TrafikSayfasi: React.FC = () => {
  const [donem, setDonem] = React.useState<'bugun' | 'yedi' | 'otuz'>('yedi');
  const ozet = React.useMemo(() => trafikOzeti(donem), [donem]);

  return (
    <div className="space-y-4">
      {/* ---- dönem seçimi ---- */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dönem">
        {DONEMLER.map((d) => (
          <button
            key={d.kimlik}
            type="button"
            onClick={() => setDonem(d.kimlik)}
            aria-pressed={donem === d.kimlik}
            className={`min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors ${
              donem === d.kimlik
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {d.etiket}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Olcu deger={sayi(ozet.tekil)} etiket="tekil ziyaretçi" />
        <Olcu deger={sayi(ozet.goruntuleme)} etiket="sayfa görüntüleme" />
        <Olcu
          deger={yuzde(ozet.bounce)}
          etiket="tek sayfada çıkan"
          not="Girip hiçbir yere tıklamadan ayrılan"
        />
        <Olcu deger={sure(ozet.ortalamaOturum)} etiket="ortalama oturum" />
      </div>

      <Kart baslik={donem === 'bugun' ? 'Bugün saatlik değil, günlük toplam' : 'Günlük trafik'}>
        <CubukGrafik
          veri={ozet.gunler.map((g) => ({ etiket: g.etiket, deger: g.tekil, ikincil: g.goruntuleme }))}
          baslik="Günlük tekil ziyaretçi ve sayfa görüntüleme"
          birincilEtiket="Tekil"
          ikincilEtiket="Görüntüleme"
        />
        <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: '#2563EB' }} aria-hidden />
            Tekil ziyaretçi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-blue-200" aria-hidden />
            Sayfa görüntüleme
          </span>
        </div>
      </Kart>

      <div className="grid gap-3 lg:grid-cols-2">
        <Kart baslik="Nereden geldiler">
          <DagilimListesi veri={ozet.kaynaklar.map((k) => ({ ad: k.ad, adet: k.adet }))} toplam={ozet.tekil} />
        </Kart>
        <Kart baslik="Şehirler">
          <DagilimListesi veri={ozet.sehirler.map((s) => ({ ad: s.ad, adet: s.adet }))} toplam={ozet.tekil} />
        </Kart>
        <Kart baslik="Cihaz">
          <DagilimListesi veri={ozet.cihazlar.map((c) => ({ ad: c.ad, adet: c.adet }))} toplam={ozet.tekil} sinir={3} />
        </Kart>
        <Kart baslik="En çok bakılan sayfalar">
          <DagilimListesi veri={ozet.sayfalar.map((s) => ({ ad: s.ad, adet: s.adet }))} toplam={ozet.goruntuleme} />
        </Kart>
      </div>

      <Kart baslik="Ziyaretten başvuruya">
        <Huni adimlar={ozet.huni} />
      </Kart>
    </div>
  );
};
