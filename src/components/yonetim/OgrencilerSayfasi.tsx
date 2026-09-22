import React from 'react';
import { fetchPanelOgrencileri, type PanelOgrencisi, type PanelOgrenciListesi } from '../../lib/queries';
import { sayi } from '../../lib/yonetim-bicim.mjs';
import { BosDurum, Iskelet } from './Grafikler';

/**
 * ÖĞRENCİLER
 *
 * KİŞİSEL VERİ EKRANDA, AMA GEREKTİĞİ KADAR
 * -----------------------------------------
 * Ad ve e-posta yalnız yöneticiye dönüyor; `student_profiles` tablosu
 * istemciye hiç açık değil ve liste sunucudaki bir RPC'den geliyor.
 *
 * "SON GÖRÜLME" BOŞSA "HİÇ GİRMEDİ" DEMEK DEĞİL
 * ---------------------------------------------
 * Bu alan ziyaret ölçümünden geliyor ve ölçüm 22 Eylül 2026'da
 * kuruldu. Ondan önceki ziyaretler kayıtlı değil. Boş hücreye "hiç
 * girmemiş" demek, ölçemediğimiz şeyi yokmuş gibi göstermek olurdu;
 * bu yüzden ekranda ayrıca yazıyor.
 *
 * "TEKLİFE AÇIK" NEDEN SİNYAL DEĞİL
 * ---------------------------------
 * Alan varsayılan olarak açık geliyor, yani 22 öğrencinin 22'si açık
 * görünüyor. Sütun duruyor ama tek başına bir şey anlatmadığı ekranda
 * yazıyor: yanıltıcı bir "hepsi teklife açık" okuması engelleniyor.
 */

const SAYFA = 50;

const Alan: React.FC<{ etiket: string; deger: React.ReactNode }> = ({ etiket, deger }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{etiket}</p>
    <p className="truncate text-sm text-gray-800">{deger}</p>
  </div>
);

function tarihYaz(deger: string | null): string {
  if (!deger) return '—';
  return new Date(deger).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const Satir: React.FC<{ ogrenci: PanelOgrencisi }> = ({ ogrenci }) => (
  <li className="rounded-2xl border border-gray-200 bg-white p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-sm font-bold text-gray-900">{ogrenci.ad ?? 'ad girilmemiş'}</p>
      {ogrenci.basvuru > 0 && (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          {sayi(ogrenci.basvuru)} başvuru
        </span>
      )}
    </div>
    {ogrenci.eposta && <p className="mt-0.5 truncate text-sm text-gray-600">{ogrenci.eposta}</p>}

    <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
      <Alan etiket="Okul" deger={ogrenci.okul || '—'} />
      <Alan etiket="Bölüm" deger={ogrenci.bolum || '—'} />
      <Alan etiket="Şehir" deger={ogrenci.sehir || '—'} />
      <Alan etiket="Son görülme" deger={tarihYaz(ogrenci.sonGorulme)} />
    </div>
  </li>
);

export const OgrencilerSayfasi: React.FC = () => {
  const [arama, setArama] = React.useState('');
  const [sorgu, setSorgu] = React.useState('');
  const [ofset, setOfset] = React.useState(0);
  const [veri, setVeri] = React.useState<PanelOgrenciListesi | null>(null);
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
    fetchPanelOgrencileri({ arama: sorgu || null, limit: SAYFA, ofset })
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
  }, [sorgu, ofset]);

  const satirlar = veri?.satirlar ?? [];
  const toplam = veri?.toplam ?? 0;
  const teklifeAcik = satirlar.filter((o) => o.teklifeAcik).length;
  const hepsiAcik = satirlar.length > 0 && teklifeAcik === satirlar.length;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">Ad, e-posta, okul ya da bölüm ara</span>
        <input
          type="search"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Ad, e-posta, okul ya da bölüm ara"
          className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400"
        />
      </label>

      {asama === 'yukleniyor' && <Iskelet yukseklik="h-40" />}

      {asama === 'hata' && (
        <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center">
          <p className="font-bold text-rose-800">Öğrenci listesi yüklenemedi</p>
        </div>
      )}

      {asama === 'hazir' && (
        <>
          <p className="text-[11px] font-semibold text-gray-500">
            {sayi(toplam)} öğrenci
            {toplam > SAYFA ? ` · ${sayi(ofset + 1)}–${sayi(Math.min(ofset + SAYFA, toplam))} arası` : ''}
          </p>

          {satirlar.length ? (
            <>
              <ul className="space-y-3">
                {satirlar.map((o) => (
                  <Satir key={o.id} ogrenci={o} />
                ))}
              </ul>

              <div className="space-y-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                {hepsiAcik && (
                  /*
                    "Teklife açık" alanı varsayılan olarak açık geliyor.
                    Sütunu göstermek yanlış değil ama "herkes teklife açık"
                    diye okunması yanlış olur.
                  */
                  <p className="text-[11px] leading-relaxed text-gray-500">
                    Listedeki öğrencilerin hepsi “teklife açık” görünüyor: bu alan
                    kayıt sırasında varsayılan olarak açık geliyor, öğrencinin
                    bilinçli bir seçimi değil.
                  </p>
                )}
                <p className="text-[11px] leading-relaxed text-gray-500">
                  “Son görülme” ziyaret ölçümünden geliyor ve ölçüm 22 Eylül 2026’da
                  kuruldu. Boş olması öğrencinin siteye hiç girmediği anlamına
                  gelmiyor; o tarihten önceki ziyaretler kayıtlı değil.
                </p>
              </div>
            </>
          ) : (
            <BosDurum mesaj={sorgu ? 'Bu aramayla öğrenci yok' : 'Kayıtlı öğrenci yok'} />
          )}

          {toplam > SAYFA && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={ofset === 0}
                onClick={() => setOfset(Math.max(ofset - SAYFA, 0))}
                className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Önceki
              </button>
              <button
                type="button"
                disabled={ofset + SAYFA >= toplam}
                onClick={() => setOfset(ofset + SAYFA)}
                className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
