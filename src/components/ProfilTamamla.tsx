import React from 'react';
import { User } from 'lucide-react';
import { adiKaydet } from '../lib/auth';

/**
 * OAuth sonrası eksik kalan adı tamamlatır.
 *
 * NEDEN GEREKLİ
 * -------------
 * Google ve Microsoft her hesapta ad döndürmüyor: bazı kurumsal
 * kiracılarda profil alanları paylaşıma kapalı oluyor. O durumda profil
 * adsız kalıyor ve kullanıcı sitede kendi adı yerine boşluk görüyor.
 *
 * Uydurulmuş bir ad yazmak (e-postanın baş kısmı gibi) yanlış: kişi
 * profilinde kendi adını görmüyor ve düzeltebileceğini de bilmiyor.
 * Bunun yerine bir kez soruluyor.
 *
 * KAPATILABİLİR
 * -------------
 * Zorunlu değil. Ad olmadan da site çalışıyor; kapıyı kilitlemek, giriş
 * yapmış birini işini yapmaktan alıkoymak olurdu. Kapatan kişiye bir daha
 * bu oturumda sorulmuyor.
 */
export const ProfilTamamla: React.FC<{
  onKapat: () => void;
  onKaydedildi: (ad: string) => void;
  /** İşveren bağlamında etiket "Yetkili adı soyadı" oluyor. */
  isveren?: boolean;
}> = ({ onKapat, onKaydedildi, isveren = false }) => {
  const [ad, setAd] = React.useState('');
  const [durum, setDurum] = React.useState<'bos' | 'kaydediliyor' | 'hata'>('bos');
  const [hata, setHata] = React.useState('');

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setDurum('kaydediliyor');
    setHata('');
    try {
      await adiKaydet(ad);
      onKaydedildi(ad.trim());
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Kaydedilemedi.');
      setDurum('hata');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={gonder}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profil-tamamla-baslik"
        className="w-full max-w-sm space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
      >
        <div className="space-y-1">
          <h2 id="profil-tamamla-baslik" className="text-lg font-extrabold text-gray-900">
            Adını tamamla
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Giriş yaptığın hesap ad bilgisi paylaşmadı. Sitede senin adına görünecek ismi bir kez
            yazman yeterli.
          </p>
        </div>

        <label className="block text-xs font-bold text-gray-700">
          {isveren ? 'Yetkili adı soyadı' : 'Ad Soyad'}
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              required
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              autoComplete="name"
              placeholder="Adınız Soyadınız"
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-blue-600"
            />
          </div>
        </label>

        {durum === 'hata' && <p className="text-sm font-semibold text-rose-600">{hata}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onKapat}
            className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Sonra
          </button>
          <button
            type="submit"
            disabled={durum === 'kaydediliyor'}
            className="min-h-11 flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {durum === 'kaydediliyor' ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};
