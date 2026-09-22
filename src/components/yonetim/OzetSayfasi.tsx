import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchAdminOzet, type AdminOzet } from '../../lib/queries';
import { sayi, sure, trafikOzeti } from '../../lib/yonetim-demo.mjs';
import { BosDurum, CubukGrafik, DagilimListesi, Huni, Iskelet } from './Grafikler';
import { TUR_RENGI, oturumAdi, useCanliOturumlar } from './useCanliOturumlar';
import type { YonetimSayfaKimlik } from './YonetimKabuk';

/**
 * ÖZET
 *
 * Üstte canlı şerit, altında mevcut ürün KPI'ları (öğrenciler, ilanlar,
 * şirket tarafı), 7 gün trafik, 7 gün kayıt, canlı hareket, dikkat
 * gerektirenler, top sayfalar, şehirler ve huni.
 *
 * İKİ VERİ KAYNAĞI AYRI DURUYOR
 * -----------------------------
 * Ürün sayıları (öğrenci, ilan, başvuru, tarama) GERÇEK veritabanından
 * `fetchAdminOzet` ile geliyor. Ziyaretçi trafiği bugün hiç
 * toplanmadığı için demo veriden geliyor ve kenar çubuğunda bu
 * yazıyor. İkisini tek bir kutuda karıştırmak, hangisinin ölçülmüş
 * hangisinin üretilmiş olduğunu belirsizleştirirdi.
 */

const Kutu: React.FC<{
  deger: React.ReactNode;
  etiket: string;
  vurgu?: 'normal' | 'uyari' | 'iyi';
}> = ({ deger, etiket, vurgu = 'normal' }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4">
    <p
      className={`text-2xl font-black tabular-nums ${
        vurgu === 'uyari' ? 'text-amber-600' : vurgu === 'iyi' ? 'text-emerald-600' : 'text-gray-900'
      }`}
    >
      {deger}
    </p>
    <p className="mt-0.5 text-[11px] font-semibold text-gray-500">{etiket}</p>
  </div>
);

const Bolum: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="space-y-2">
    <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{baslik}</p>
    {children}
  </section>
);

const Kart: React.FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-4">
    <h2 className="mb-3 text-sm font-bold text-gray-900">{baslik}</h2>
    {children}
  </section>
);

export const OzetSayfasi: React.FC<{
  onNavigate: (yol: string) => void;
  git: (k: YonetimSayfaKimlik) => void;
}> = ({ onNavigate, git }) => {
  const [ozet, setOzet] = React.useState<AdminOzet | null>(null);
  const [durum, setDurum] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const { oturumlar, olaylar, bugunGiren, bugunCikan, sayfaBakisi } = useCanliOturumlar();
  const trafik = React.useMemo(() => trafikOzeti('yedi'), []);

  const yukle = React.useCallback(() => {
    setDurum('yukleniyor');
    fetchAdminOzet()
      .then((o) => { setOzet(o); setDurum('hazir'); })
      .catch(() => setDurum('hata'));
  }, []);

  React.useEffect(yukle, [yukle]);

  const taramaYasi = ozet?.sonTarama
    ? Math.round((Date.now() - new Date(ozet.sonTarama.zaman).getTime()) / 60000)
    : null;

  /*
    DİKKAT LİSTESİ: yalnız GERÇEKTEN bekleyen iş.

    Sıfır olan satır hiç çizilmiyor. "0 onay bekliyor" yazan bir satır,
    listeyi doldurup gerçekten bekleyeni gözden kaçırtır.
  */
  const dikkat = ozet
    ? [
        ozet.taslakIlan > 0 && {
          metin: `${sayi(ozet.taslakIlan)} ilan onay bekliyor`,
          git: () => git('onay'),
        },
        ozet.bekleyenTalep > 0 && {
          metin: `${sayi(ozet.bekleyenTalep)} şirket sahiplenme talebi bekliyor`,
          git: () => git('sirketler'),
        },
        ozet.sonTarama && ozet.sonTarama.durum !== 'ok' && {
          metin: `Son tarama "${ozet.sonTarama.durum}" döndü`,
          git: () => git('tarama'),
        },
        taramaYasi !== null && taramaYasi > 180 && {
          metin: `Son taramadan beri ${sure(taramaYasi * 60)} geçti`,
          git: () => git('tarama'),
        },
      ].filter(Boolean) as { metin: string; git: () => void }[]
    : [];

  return (
    <div className="space-y-5">
      {/* ---- canlı şerit ---- */}
      <section
        className="grid grid-cols-2 gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 lg:grid-cols-4"
        aria-label="Canlı"
      >
        <div>
          <p className="flex items-center gap-1.5 text-2xl font-black tabular-nums text-blue-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" aria-hidden />
            {sayi(oturumlar.length)}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-blue-900/70">şu an bakıyor</p>
        </div>
        <div>
          <p className="text-2xl font-black tabular-nums text-gray-900">{sayi(bugunGiren)}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-gray-500">bugün girdi</p>
        </div>
        <div>
          <p className="text-2xl font-black tabular-nums text-gray-900">{sayi(bugunCikan)}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-gray-500">bugün çıktı</p>
        </div>
        <div>
          <p className="text-2xl font-black tabular-nums text-gray-900">{sayi(sayfaBakisi)}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-gray-500">sayfa bakışı</p>
        </div>
      </section>

      {durum === 'yukleniyor' && <Iskelet yukseklik="h-40" />}

      {durum === 'hata' && (
        <div className="space-y-2 rounded-2xl border border-rose-200 bg-white p-5 text-center">
          <p className="font-bold text-rose-800">Ürün özeti yüklenemedi</p>
          <p className="text-sm text-gray-600">Canlı trafik çalışmaya devam ediyor; bu bölüm veritabanından geliyor.</p>
          <button
            type="button"
            onClick={yukle}
            className="min-h-11 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {durum === 'hazir' && ozet && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">Ürün sayıları veritabanından</p>
            <button
              type="button"
              onClick={yukle}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              <RefreshCw aria-hidden className="h-3.5 w-3.5" />
              Yenile
            </button>
          </div>

          {dikkat.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <AlertTriangle aria-hidden className="h-4 w-4" />
                Dikkat
              </h2>
              <ul className="mt-2 space-y-1">
                {dikkat.map((d) => (
                  <li key={d.metin}>
                    <button
                      type="button"
                      onClick={d.git}
                      className="min-h-11 cursor-pointer text-left text-sm text-amber-900 underline-offset-2 hover:underline"
                    >
                      {d.metin}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Bolum baslik="Öğrenciler">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Kutu deger={sayi(ozet.ogrenci)} etiket="kayıtlı öğrenci" />
              <Kutu deger={sayi(ozet.profilDolu)} etiket="okulunu girmiş" />
              <Kutu deger={sayi(ozet.teklifeAcik)} etiket="teklife açık" />
              <Kutu deger={sayi(ozet.rozet)} etiket="kazanılan rozet" />
            </div>
          </Bolum>

          <Bolum baslik="İlanlar ve başvurular">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {/*
                "Yayındaki ilan" = şirketin StajımVar'da açtığı NATIVE ilan.
                Taranan ilan ayrı bir KPI ve İlanlar sayfasında ayrı
                sayılıyor: ikisini toplamak, başvuru alabildiğimiz ilan
                sayısını olduğundan büyük gösterirdi.
              */}
              <Kutu deger={sayi(ozet.ilan)} etiket="yayındaki ilan" />
              <Kutu
                deger={sayi(ozet.taslakIlan)}
                etiket="onay bekleyen ilan"
                vurgu={ozet.taslakIlan > 0 ? 'uyari' : 'normal'}
              />
              <Kutu deger={sayi(ozet.basvuru)} etiket="toplam başvuru" />
              <Kutu deger={sayi(ozet.sirket)} etiket="şirket kaydı" />
            </div>
          </Bolum>

          <Bolum baslik="Şirket tarafı">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Kutu deger={sayi(ozet.sahiplenmis)} etiket="sahiplenilmiş şirket" />
              <Kutu
                deger={sayi(ozet.bekleyenTalep)}
                etiket="bekleyen talep"
                vurgu={ozet.bekleyenTalep > 0 ? 'uyari' : 'normal'}
              />
              <Kutu
                deger={taramaYasi === null ? '—' : sure(taramaYasi * 60)}
                etiket="son taramadan beri"
                vurgu={taramaYasi !== null && taramaYasi > 180 ? 'uyari' : 'iyi'}
              />
              <Kutu
                deger={ozet.sonTarama?.durum === 'ok' ? 'sağlıklı' : (ozet.sonTarama?.durum ?? '—')}
                etiket="son tarama durumu"
                vurgu={ozet.sonTarama?.durum === 'ok' ? 'iyi' : 'uyari'}
              />
            </div>
          </Bolum>

          <div className="grid gap-3 lg:grid-cols-2">
            <Kart baslik="Son 7 günün trafiği">
              <CubukGrafik
                veri={trafik.gunler.map((g) => ({ etiket: g.etiket, deger: g.tekil }))}
                baslik="Son 7 günün tekil ziyaretçisi"
              />
            </Kart>
            <Kart baslik="Son 7 günün kayıtları">
              {ozet.sonKayitlar.length ? (
                <CubukGrafik
                  veri={ozet.sonKayitlar.map((g) => ({ etiket: g.tarih.slice(5), deger: g.sayi }))}
                  baslik="Son 7 günün öğrenci kaydı"
                  birincilEtiket="Kayıt"
                />
              ) : (
                <BosDurum mesaj="Bu hafta kayıt yok" />
              )}
            </Kart>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Kart baslik="Canlı hareket">
              {olaylar.length ? (
                <ul className="space-y-1.5">
                  {olaylar.slice(0, 8).map((o) => (
                    <li key={o.oturum.kimlik + o.an + o.tur} className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${TUR_RENGI[o.oturum.tur].nokta}`} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                        {oturumAdi(o.oturum)} — {o.oturum.sayfaAdi}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <BosDurum mesaj="Akış birazdan başlıyor" />
              )}
            </Kart>
            <Kart baslik="En çok bakılan sayfalar">
              <DagilimListesi
                veri={trafik.sayfalar.map((s) => ({ ad: s.ad, adet: s.adet }))}
                toplam={trafik.tekil}
                sinir={6}
              />
            </Kart>
            <Kart baslik="Şehirler">
              <DagilimListesi
                veri={trafik.sehirler.map((s) => ({ ad: s.ad, adet: s.adet }))}
                toplam={trafik.tekil}
                sinir={6}
              />
            </Kart>
          </div>

          <Kart baslik="Ziyaretten başvuruya">
            <Huni adimlar={trafik.huni} />
          </Kart>

          {/* ---- alt düğmeler ---- */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => git('kesfet')} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
              Keşfet arşivi
            </button>
            <button type="button" onClick={() => git('onay')} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
              Onay kuyrukları
              {ozet.bekleyenTalep + ozet.taslakIlan > 0 && (
                <span className="ml-1.5">({sayi(ozet.bekleyenTalep + ozet.taslakIlan)})</span>
              )}
            </button>
            <button type="button" onClick={() => git('bolum')} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50">
              Bölüm talepleri
            </button>
            <button type="button" onClick={() => git('paylasim')} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50">
              Gönderi paylaş
            </button>
            <button type="button" onClick={() => onNavigate('/')} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Siteye dön
            </button>
          </div>
        </>
      )}
    </div>
  );
};
