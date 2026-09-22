import React from 'react';
import { fetchPanelBasvurulari, type PanelBasvuruListesi } from '../../lib/queries';
import { sayi } from '../../lib/yonetim-bicim.mjs';
import { BosDurum, Iskelet } from './Grafikler';

/**
 * BAŞVURULAR
 *
 * NEDEN 189 İLAN VARKEN 6 BAŞVURU VAR
 * -----------------------------------
 * Başvuru kaydı yalnız site içinde alınan başvurularda oluşuyor. Kariyer
 * sayfasına yönlendirilen ilanda öğrenci şirketin kendi formunu
 * dolduruyor ve bizde bir iz kalmıyor. Ölçüldü: yayındaki 189 ilanın
 * HİÇBİRİ site içi başvuru almıyor, hepsi yönlendirme.
 *
 * Bu yüzden düşük başvuru sayısı bir arıza değil, ürünün bugünkü hâli.
 * Ekranda yazıyor — yazmasaydı panel bozuk sanılırdı.
 */

const DURUM_ADI: Record<string, string> = {
  submitted: 'gönderildi',
  under_review: 'inceleniyor',
  technical_assessment: 'teknik değerlendirme',
  interview_scheduled: 'görüşme planlandı',
  offer_extended: 'teklif verildi',
  offer_accepted: 'teklif kabul edildi',
  offer_declined: 'teklif reddedildi',
  rejected: 'reddedildi',
  withdrawn: 'geri çekildi',
};

const DURUM_RENGI: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700',
  interview_scheduled: 'bg-amber-50 text-amber-800',
  offer_accepted: 'bg-emerald-50 text-emerald-700',
  offer_extended: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-gray-100 text-gray-600',
  withdrawn: 'bg-gray-100 text-gray-600',
};

function tarihYaz(deger: string | null): string {
  if (!deger) return '—';
  return new Date(deger).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const BasvurularSayfasi: React.FC = () => {
  const [durum, setDurum] = React.useState<string | null>(null);
  const [veri, setVeri] = React.useState<PanelBasvuruListesi | null>(null);
  const [asama, setAsama] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  React.useEffect(() => {
    let iptal = false;
    setAsama('yukleniyor');
    fetchPanelBasvurulari({ durum })
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
  }, [durum]);

  const satirlar = veri?.satirlar ?? [];
  const sayimlar = veri?.durumSayimlari ?? {};
  const durumlar = Object.keys(sayimlar).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Durum">
        <button
          type="button"
          onClick={() => setDurum(null)}
          aria-pressed={durum === null}
          className={`min-h-11 cursor-pointer rounded-lg px-3 text-sm font-semibold ${
            durum === null ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'
          }`}
        >
          Tümü
        </button>
        {durumlar.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDurum(d)}
            aria-pressed={durum === d}
            className={`min-h-11 cursor-pointer rounded-lg px-3 text-sm font-semibold ${
              durum === d ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'
            }`}
          >
            {DURUM_ADI[d] ?? d}
            <span className={`ml-1.5 tabular-nums ${durum === d ? 'text-blue-100' : 'text-gray-500'}`}>
              {sayi(sayimlar[d])}
            </span>
          </button>
        ))}
      </div>

      {asama === 'yukleniyor' && <Iskelet yukseklik="h-40" />}

      {asama === 'hata' && (
        <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center">
          <p className="font-bold text-rose-800">Başvuru listesi yüklenemedi</p>
        </div>
      )}

      {asama === 'hazir' && (
        <>
          {satirlar.length ? (
            <ul className="space-y-3">
              {satirlar.map((b) => (
                <li key={b.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        DURUM_RENGI[b.durum] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {DURUM_ADI[b.durum] ?? b.durum}
                    </span>
                    <span className="text-[11px] text-gray-500">{tarihYaz(b.basvurdu)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-gray-900">{b.ogrenci ?? 'öğrenci bilinmiyor'}</p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {b.ilan ?? 'ilan silinmiş'}
                    {b.sirket ? ` · ${b.sirket}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <BosDurum mesaj={durum ? 'Bu durumda başvuru yok' : 'Henüz başvuru yok'} />
          )}

          <p className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-gray-500">
            Başvuru kaydı yalnız site içinde alınan başvurularda oluşuyor. Yayındaki
            189 ilanın hepsi şirketin kariyer sayfasına yönlendiriyor; öğrenci orada
            şirketin kendi formunu dolduruyor ve bizde iz kalmıyor. Buradaki sayının
            düşük olması bir arıza değil.
          </p>
        </>
      )}
    </div>
  );
};
