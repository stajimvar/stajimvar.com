import React from 'react';
import { ExternalLink } from 'lucide-react';
import { fetchPanelIlanlari, type PanelIlani, type PanelIlanListesi } from '../../lib/queries';
import { sayi } from '../../lib/yonetim-bicim.mjs';
import { BosDurum, Iskelet } from './Grafikler';

/**
 * İLANLAR
 *
 * DURUM VE KAYNAK AYRI SÜZGEÇ
 * ---------------------------
 * "Yayında" ile "taranan" aynı eksen değil: bir ilan hem yayında hem
 * taranan olabiliyor. Tek bir listeye sıkıştırmak, başvuru
 * alabildiğimiz ilan sayısını olduğundan büyük gösterirdi.
 *
 * SAYIMLAR SÜZGEÇTEN BAĞIMSIZ
 * ---------------------------
 * Süzgeç düğmelerindeki sayı, o düğmeye basınca kaç satır göreceğini
 * söylüyor. Süzülmüş kümeden saymak, seçili olan dışındaki her sayıyı
 * sıfır gösterirdi ve süzgeç işe yaramaz hâle gelirdi.
 *
 * SAYFALAMA SUNUCUDA
 * ------------------
 * 189 ilanın tamamını indirip tarayıcıda süzmek bugün çalışırdı ama
 * ilan sayısı arttıkça sessizce yavaşlardı.
 */

const DURUMLAR = [
  { deger: null, etiket: 'Tümü' },
  { deger: 'published', etiket: 'Yayında' },
  { deger: 'draft', etiket: 'Taslak' },
  { deger: 'closed', etiket: 'Kapalı' },
  { deger: 'archived', etiket: 'Arşiv' },
];

const KAYNAKLAR = [
  { deger: null, etiket: 'Her kaynak' },
  { deger: 'manual', etiket: 'Elle' },
  { deger: 'scraped', etiket: 'Taranan' },
  { deger: 'employer_posted', etiket: 'Şirket açtı' },
];

const SAYFA = 50;

const Dugme: React.FC<{
  etkin: boolean;
  etiket: string;
  adet?: number;
  tikla: () => void;
}> = ({ etkin, etiket, adet, tikla }) => (
  <button
    type="button"
    onClick={tikla}
    aria-pressed={etkin}
    className={`min-h-11 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors ${
      etkin ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`}
  >
    {etiket}
    {adet !== undefined && (
      <span className={`ml-1.5 tabular-nums ${etkin ? 'text-blue-100' : 'text-gray-500'}`}>
        {sayi(adet)}
      </span>
    )}
  </button>
);

const DURUM_RENGI: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-amber-50 text-amber-800',
  closed: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-500',
};

const DURUM_ADI: Record<string, string> = {
  published: 'yayında',
  draft: 'taslak',
  closed: 'kapalı',
  archived: 'arşiv',
};

const KAYNAK_ADI: Record<string, string> = {
  manual: 'elle',
  scraped: 'taranan',
  employer_posted: 'şirket açtı',
  internal: 'site içi',
};

const Satir: React.FC<{ ilan: PanelIlani }> = ({ ilan }) => (
  <li className="rounded-2xl border border-gray-200 bg-white p-4">
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          DURUM_RENGI[ilan.durum] ?? 'bg-gray-100 text-gray-600'
        }`}
      >
        {DURUM_ADI[ilan.durum] ?? ilan.durum}
      </span>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
        {KAYNAK_ADI[ilan.kaynak] ?? ilan.kaynak}
      </span>
      {ilan.kaynakDurumu === 'erisilemedi' && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          bağlantıya erişilemedi
        </span>
      )}
      {/*
        Başvuru yolu ETİKET olarak duruyor: "external" olan ilan kariyer
        sayfasına yönlendiriyor ve başvuru kaydı oluşmuyor. Bu ayrım
        olmadan başvuru sayısının neden düşük olduğu anlaşılmaz.
      */}
      {ilan.basvuruYolu === 'external' && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
          yönlendirme
        </span>
      )}
    </div>

    <p className="mt-1.5 text-sm font-bold leading-snug text-gray-900">{ilan.baslik}</p>
    <p className="mt-0.5 text-sm text-gray-600">
      {ilan.sirket ?? 'şirket bilinmiyor'}
      {ilan.sehir ? ` · ${ilan.sehir}` : ''}
      {ilan.ulke ? ` · ${ilan.ulke}` : ''}
    </p>

    {ilan.adres && (
      <a
        href={ilan.adres}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-1.5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
      >
        Kaynağında aç
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    )}
  </li>
);

export const IlanlarSayfasi: React.FC = () => {
  const [durum, setDurum] = React.useState<string | null>('published');
  const [kaynak, setKaynak] = React.useState<string | null>(null);
  const [arama, setArama] = React.useState('');
  const [sorgu, setSorgu] = React.useState('');
  const [ofset, setOfset] = React.useState(0);
  const [veri, setVeri] = React.useState<PanelIlanListesi | null>(null);
  const [asama, setAsama] = React.useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');

  /*
    Arama yazarken her tuşta istek atılmıyor; yarım saniye beklenip
    gönderiliyor. Aksi hâlde "yazılım" yazan biri yedi istek attırırdı.
  */
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
    fetchPanelIlanlari({ durum, kaynak, arama: sorgu || null, limit: SAYFA, ofset })
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
  }, [durum, kaynak, sorgu, ofset]);

  const satirlar = veri?.satirlar ?? [];
  const toplam = veri?.toplam ?? 0;
  const sonSayfa = ofset + SAYFA >= toplam;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Durum">
        {DURUMLAR.map((d) => (
          <Dugme
            key={d.etiket}
            etkin={durum === d.deger}
            etiket={d.etiket}
            adet={d.deger ? veri?.durumSayimlari?.[d.deger] : undefined}
            tikla={() => {
              setDurum(d.deger);
              setOfset(0);
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kaynak">
        {KAYNAKLAR.map((k) => (
          <Dugme
            key={k.etiket}
            etkin={kaynak === k.deger}
            etiket={k.etiket}
            adet={k.deger ? veri?.kaynakSayimlari?.[k.deger] : undefined}
            tikla={() => {
              setKaynak(k.deger);
              setOfset(0);
            }}
          />
        ))}
      </div>

      <label className="block">
        <span className="sr-only">İlan, şirket ya da şehir ara</span>
        <input
          type="search"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="İlan, şirket ya da şehir ara"
          className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400"
        />
      </label>

      {asama === 'yukleniyor' && <Iskelet yukseklik="h-40" />}

      {asama === 'hata' && (
        <div className="rounded-2xl border border-rose-200 bg-white p-5 text-center">
          <p className="font-bold text-rose-800">İlan listesi yüklenemedi</p>
        </div>
      )}

      {asama === 'hazir' && (
        <>
          <p className="text-[11px] font-semibold text-gray-500">
            {sayi(toplam)} ilan
            {toplam > SAYFA ? ` · ${sayi(ofset + 1)}–${sayi(Math.min(ofset + SAYFA, toplam))} arası` : ''}
          </p>

          {satirlar.length ? (
            <ul className="space-y-3">
              {satirlar.map((i) => (
                <Satir key={i.id} ilan={i} />
              ))}
            </ul>
          ) : (
            <BosDurum mesaj="Bu süzgeçle ilan yok" />
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
                disabled={sonSayfa}
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
