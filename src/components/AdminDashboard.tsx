import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchAdminOzet, type AdminOzet } from '../lib/queries';

/**
 * Yönetim özeti.
 *
 * NE GÖSTERİYOR: ürün verisi — kaç öğrenci kayıtlı, kaç başvuru geldi, kaç
 * ilan yayında, son tarama ne zaman çalıştı.
 *
 * NE GÖSTERMİYOR: ziyaretçi trafiği. "Kaç kişi siteye girdi, hangi sayfaya
 * baktı" sorusunun cevabı bizim veritabanımızda yok ve olmamalı — onu
 * kendimiz toplamaya kalkmak, her ziyaretçi için kayıt tutmak demek.
 * Cloudflare Web Analytics bunu çerezsiz ve kişi bazlı iz bırakmadan
 * yapıyor; trafiği oradan izliyoruz.
 *
 * Sayılar `count` ile alınıyor, satırlar çekilmiyor: panelin kaç öğrencinin
 * kayıtlı olduğunu bilmesi yeterli, kimlerin kayıtlı olduğunu listelemesi
 * gerekmiyor.
 */

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
}

const Kutu: React.FC<{
  deger: React.ReactNode;
  etiket: string;
  vurgu?: 'normal' | 'uyari' | 'iyi';
}> = ({ deger, etiket, vurgu = 'normal' }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-4">
    <p
      className={`text-2xl font-black tabular-nums ${
        vurgu === 'uyari' ? 'text-amber-600' : vurgu === 'iyi' ? 'text-emerald-600' : 'text-gray-900'
      }`}
    >
      {deger}
    </p>
    <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{etiket}</p>
  </div>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [ozet, setOzet] = useState<AdminOzet | null>(null);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  const yukle = useCallback(() => {
    setDurum('yukleniyor');
    fetchAdminOzet()
      .then((o) => {
        setOzet(o);
        setDurum('hazir');
      })
      .catch(() => setDurum('hata'));
  }, []);

  useEffect(yukle, [yukle]);

  if (durum === 'yukleniyor') {
    return <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" role="status" aria-label="Yükleniyor" />;
  }

  if (durum === 'hata' || !ozet) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-5 text-center space-y-2">
        <p className="font-bold text-rose-800">Özet yüklenemedi</p>
        <button
          type="button"
          onClick={yukle}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 cursor-pointer"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  const taramaYasi = ozet.sonTarama
    ? Math.round((Date.now() - new Date(ozet.sonTarama.zaman).getTime()) / 60000)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">Özet</h2>
        <button
          type="button"
          onClick={yukle}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Yenile
        </button>
      </div>

      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Öğrenciler</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Kutu deger={ozet.ogrenci} etiket="kayıtlı öğrenci" />
          <Kutu deger={ozet.profilDolu} etiket="okulunu girmiş" />
          <Kutu deger={ozet.teklifeAcik} etiket="teklife açık" />
          <Kutu deger={ozet.rozet} etiket="kazanılan rozet" />
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">İlanlar ve başvurular</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Kutu deger={ozet.ilan} etiket="yayındaki ilan" />
          <Kutu
            deger={ozet.taslakIlan}
            etiket="onay bekleyen ilan"
            vurgu={ozet.taslakIlan > 0 ? 'uyari' : 'normal'}
          />
          <Kutu deger={ozet.basvuru} etiket="toplam başvuru" />
          <Kutu deger={ozet.sirket} etiket="şirket kaydı" />
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Şirket tarafı</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Kutu deger={ozet.sahiplenmis} etiket="sahiplenilmiş şirket" />
          <Kutu
            deger={ozet.bekleyenTalep}
            etiket="bekleyen talep"
            vurgu={ozet.bekleyenTalep > 0 ? 'uyari' : 'normal'}
          />
          <Kutu
            deger={taramaYasi === null ? '—' : taramaYasi < 90 ? `${taramaYasi} dk` : `${Math.round(taramaYasi / 60)} sa`}
            etiket="son taramadan beri"
            vurgu={taramaYasi !== null && taramaYasi > 180 ? 'uyari' : 'iyi'}
          />
          <Kutu
            deger={ozet.sonTarama?.durum === 'ok' ? 'sağlıklı' : (ozet.sonTarama?.durum ?? '—')}
            etiket="son tarama durumu"
            vurgu={ozet.sonTarama?.durum === 'ok' ? 'iyi' : 'uyari'}
          />
        </div>
      </section>

      {ozet.sonKayitlar.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Son 7 günün kayıtları
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-end gap-2 h-28">
            {ozet.sonKayitlar.map((g) => {
              const enBuyuk = Math.max(...ozet.sonKayitlar.map((x) => x.sayi), 1);
              return (
                <div key={g.tarih} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] font-bold text-gray-600 tabular-nums">{g.sayi}</span>
                  <div
                    className="w-full bg-blue-600 rounded-t"
                    style={{ height: `${Math.max(4, (g.sayi / enBuyuk) * 60)}px` }}
                  />
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">
                    {g.tarih.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/*
        Trafik verisi bilerek burada değil. Kendi ziyaretçi kaydımızı tutmak,
        her ziyaret için kişisel veri işlemek demek olurdu.
      */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed">
        <p className="font-bold text-gray-900">Ziyaretçi trafiği burada değil</p>
        <p>
          Kaç kişi siteye girdi, hangi sayfaya baktı gibi veriler Cloudflare Web Analytics'te.
          Çerezsiz çalıştığı ve kişi bazlı iz bırakmadığı için onu tercih ettik; kendi
          ziyaretçi kaydımızı tutmak her ziyaret için kişisel veri işlemek olurdu.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNavigate('/yonetim/talepler')}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          Onay kuyrukları
          {ozet.bekleyenTalep + ozet.taslakIlan > 0 && (
            <span className="ml-1.5">({ozet.bekleyenTalep + ozet.taslakIlan})</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 cursor-pointer"
        >
          Siteye dön
        </button>
      </div>
    </div>
  );
};
