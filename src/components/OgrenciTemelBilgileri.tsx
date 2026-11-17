import React from 'react';
import { Loader2 } from 'lucide-react';
import { AutocompleteField } from './AutocompleteField';
import { TR_CITIES, TR_UNIVERSITIES } from '../data/turkeyData';
import { useOkulBolumleri } from '../lib/useOkulBolumleri';
import { temelBilgiHatalari, type TemelBilgiler } from '../lib/ogrenci-temel-bilgileri.mjs';

/**
 * OKUL, BÖLÜM VE ŞEHİR ZORUNLU (17 Kasım 2026, kullanıcı kararı)
 *
 * Ölçüldü: 37 öğrencinin 30'unda bu üç alandan en az biri boştu. Yönetim
 * panelindeki öğrenci listesi "—" ile doluydu, bölüme uygun ilan ve
 * haftalık özet de bu bilgi olmadan çalışmıyor.
 *
 * Oturumu açık öğrencinin profilinde biri eksikse bu pencere açılıyor ve
 * KAPATILAMIYOR. Tek çıkış "Çıkış yap": hesabı kullanmak istemeyen
 * kişiyi zorla form doldurmaya bağlamıyoruz.
 *
 * Alanlar listeden öneriyor ama kapalı liste değil: yurt dışındaki okul ya
 * da listede olmayan bölüm yazılabilir.
 */
export const OgrenciTemelBilgileri: React.FC<{
  baslangic: TemelBilgiler;
  onKaydet: (bilgiler: TemelBilgiler) => Promise<void>;
  onCikis: () => void;
}> = ({ baslangic, onKaydet, onCikis }) => {
  const [bilgi, setBilgi] = React.useState<TemelBilgiler>(baslangic);
  const [denendi, setDenendi] = React.useState(false);
  const [mesgul, setMesgul] = React.useState(false);
  const [hata, setHata] = React.useState('');

  const hatalar = temelBilgiHatalari(bilgi);
  /* Okul seçilince önce o okulun programları (YÖK Atlas). */
  const bolumSecenekleri = useOkulBolumleri();
  const yaz = (alan: keyof TemelBilgiler) => (v: string) => setBilgi((o: TemelBilgiler) => ({ ...o, [alan]: v }));

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setDenendi(true);
    if (Object.keys(hatalar).length > 0 || mesgul) return;
    setMesgul(true);
    setHata('');
    try {
      await onKaydet({
        university: bilgi.university.trim(),
        department: bilgi.department.trim(),
        city: bilgi.city.trim(),
      });
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Kaydedilemedi. Biraz sonra yeniden dene.');
      setMesgul(false);
    }
  };

  const alan = (
    id: keyof TemelBilgiler,
    etiket: string,
    secenekler: string[],
    ornek: string
  ) => (
    <div className="space-y-1">
      <label htmlFor={`temel-${id}`} className="block text-xs font-bold text-gray-700">
        {etiket}
      </label>
      <AutocompleteField
        id={`temel-${id}`}
        value={bilgi[id]}
        onChange={yaz(id)}
        options={secenekler}
        placeholder={ornek}
        required
        className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600"
        klavyeDuzeni
      />
      {denendi && hatalar[id] && (
        <p className="text-xs font-semibold text-red-700" role="alert">
          {hatalar[id]}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <form
        onSubmit={gonder}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="temel-bilgi-baslik"
        className="w-full max-w-sm space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
      >
        <div className="space-y-1">
          <h2 id="temel-bilgi-baslik" className="text-lg font-extrabold text-gray-900">
            Okulunu ve bölümünü ekle
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Sana uygun ilanları ve haftalık özeti bu bilgilerle hazırlıyoruz. Bir kez yazman
            yeterli; sonra profilinden değiştirebilirsin.
          </p>
        </div>

        {alan('university', 'Okul', TR_UNIVERSITIES, 'Yazmaya başla, listeden seç')}
        {alan('department', 'Bölüm', bolumSecenekleri(bilgi.university), 'Örn. Bilgisayar Mühendisliği')}
        {alan('city', 'Yaşadığın şehir', TR_CITIES, 'Örn. İstanbul')}

        {hata && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {hata}
          </p>
        )}

        <button
          type="submit"
          disabled={mesgul}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {mesgul && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Kaydet ve devam et
        </button>

        <p className="text-center text-xs text-gray-500">
          Bilgilerin nasıl kullanıldığı{' '}
          <a href="/gizlilik" target="_blank" rel="noopener" className="font-semibold text-gray-700 underline">
            Gizlilik Politikası
          </a>
          'nda. Şimdi değil mi?{' '}
          <button type="button" onClick={onCikis} className="cursor-pointer font-semibold text-gray-700 underline">
            Çıkış yap
          </button>
        </p>
      </form>
    </div>
  );
};
