import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { fetchPanelTarama, type PanelTarama } from '../../lib/queries';
import { sayi, sure } from '../../lib/yonetim-bicim.mjs';
import { BosDurum, Iskelet } from './Grafikler';

/**
 * TARAMA
 *
 * 83 kaynağın durumu. Her kaynağın SON koşusu gösteriliyor; 25 binden
 * fazla koşu satırı var ve panelin sorusu "hangi kaynak bozuk", "toplam
 * kaç kez çalıştı" değil.
 *
 * KAPALI KAYNAK BOZUK DEĞİLDİR
 * ----------------------------
 * Bilerek kapatılmış kaynağı "başarısız" saymak, gerçek arızayı
 * gürültüye gömerdi. Ayrı sayılıyor ve listenin en altında duruyor.
 *
 * SIRALAMA ARIZAYA GÖRE
 * ---------------------
 * Başarısızlar en üstte. Alfabetik sıralamak, dört bozuk kaynağı 83
 * satırın arasına dağıtırdı ve panel arızayı göstermek için var.
 */

const DURUM_ADI: Record<string, string> = {
  ok: 'sağlıklı',
  failed: 'başarısız',
  partial: 'kısmi',
};

const DURUM_RENGI: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
  partial: 'bg-amber-50 text-amber-800',
};

const Olcu: React.FC<{ deger: React.ReactNode; etiket: string; vurgu?: boolean }> = ({
  deger,
  etiket,
  vurgu,
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4">
    <p className={`text-2xl font-black tabular-nums ${vurgu ? 'text-rose-600' : 'text-gray-900'}`}>
      {deger}
    </p>
    <p className="mt-0.5 text-[11px] font-semibold text-gray-500">{etiket}</p>
  </div>
);

export const TaramaSayfasi: React.FC = () => {
  const [veri, setVeri] = React.useState<PanelTarama | null>(null);
  const [asama, setAsama] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [hepsi, setHepsi] = React.useState(false);

  React.useEffect(() => {
    let iptal = false;
    fetchPanelTarama()
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
  }, []);

  if (asama === 'yukleniyor') return <Iskelet yukseklik="h-40" />;

  if (asama === 'hata' || !veri) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center">
        <p className="font-bold text-rose-800">Tarama durumu yüklenemedi</p>
      </div>
    );
  }

  const bozuk = veri.sonDurumSayimlari?.failed ?? 0;
  const kismi = veri.sonDurumSayimlari?.partial ?? 0;
  const yas = veri.sonKosu ? (Date.now() - new Date(veri.sonKosu).getTime()) / 1000 : null;
  const kaynaklar = hepsi ? veri.kaynaklar : veri.kaynaklar.slice(0, 15);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Olcu deger={sayi(veri.kaynakSayisi)} etiket="kaynak" />
        <Olcu deger={sayi(veri.acik)} etiket="açık" />
        <Olcu deger={sayi(bozuk + kismi)} etiket="son koşusu sorunlu" vurgu={bozuk + kismi > 0} />
        <Olcu deger={yas === null ? '—' : sure(yas)} etiket="son taramadan beri" />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-gray-900">Son 7 günün koşuları</h2>
        <ul className="space-y-1.5">
          {Object.entries(veri.son7Gun ?? {}).map(([d, n]) => (
            <li key={d} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-gray-700">{DURUM_ADI[d] ?? d}</span>
              <span className="tabular-nums font-semibold text-gray-900">{sayi(n)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-gray-900">Kaynaklar</h2>
        {kaynaklar.length ? (
          <ul className="space-y-2">
            {kaynaklar.map((k) => (
              <li key={k.id} className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      k.acik
                        ? DURUM_RENGI[k.sonDurum ?? ''] ?? 'bg-gray-100 text-gray-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {k.acik ? DURUM_ADI[k.sonDurum ?? ''] ?? 'hiç çalışmadı' : 'kapalı'}
                  </span>
                  {k.adaptor && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                      {k.adaptor}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-bold text-gray-900">{k.ad}</p>
                {k.hata && (
                  <p className="mt-1.5 flex gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[12px] leading-relaxed text-rose-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 break-words">{k.hata}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <BosDurum mesaj="Kaynak yok" />
        )}

        {!hepsi && veri.kaynaklar.length > 15 && (
          <button
            type="button"
            onClick={() => setHepsi(true)}
            className="min-h-11 w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            Kalan {sayi(veri.kaynaklar.length - 15)} kaynağı da göster
          </button>
        )}
      </section>

      {/*
        "Taramayı çalıştır" düğmesi YOK. Tarama GitHub Actions'ta zamanlı
        çalışıyor ve panelden tetiklemek için ayrı bir yetki yolu gerekiyor.
        Çalışmayan bir düğme koymak, çalışıyor sanılmasına yol açardı.
      */}
      <p className="text-[11px] leading-relaxed text-gray-500">
        Tarama zamanlı olarak GitHub Actions üzerinde çalışıyor; panelden elle
        tetikleme henüz yok.
      </p>
    </div>
  );
};
