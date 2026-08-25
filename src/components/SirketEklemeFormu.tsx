import React from 'react';
import { Building2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * "Şirketimi ekle" formu.
 *
 * NEDEN SAYFANIN İÇİNDE
 * ---------------------
 * Şirket aramada bulunamayınca işverene "aşağıda ne yapacağınız yazıyor"
 * deniyordu; aşağısı iletişim bölümüne, orası da yalnızca bir e-posta
 * adresine çıkıyordu. İletişim sayfasında form bile yok. Yani hunini en
 * kritik noktasında işveren e-posta yazmak zorunda kalıyordu ve orada
 * çoğu kişi vazgeçiyor.
 *
 * Form talebi doğrudan alıyor. E-posta ikincil destek yolu olarak duruyor,
 * ilk seçenek değil.
 *
 * HESAP ŞART DEĞİL
 * ----------------
 * İşveren siteyi ilk kez görüyor olabilir. Önce hesap açtırmak, henüz
 * karar vermemiş birine bedel ödetmek olur. Giriş yapılmışsa kimlik
 * talebe ekleniyor; yapılmamışsa talep yine kaydediliyor.
 */

type Alan = 'sirketAdi' | 'webSitesi' | 'kariyerSayfasi' | 'yetkiliAdi' | 'eposta' | 'gorev' | 'telefon';

const BOS: Record<Alan, string> = {
  sirketAdi: '',
  webSitesi: '',
  kariyerSayfasi: '',
  yetkiliAdi: '',
  eposta: '',
  gorev: '',
  telefon: '',
};

/* Serbest e-posta sağlayıcıları: engellenmiyor, yalnızca uyarılıyor. */
const SERBEST_SAGLAYICILAR = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];

export const SirketEklemeFormu: React.FC<{
  /** Aramada yazılan ad; forma önden geliyor. */
  onAd?: string;
  userId?: string | null;
}> = ({ onAd = '', userId = null }) => {
  const [deger, setDeger] = React.useState<Record<Alan, string>>({ ...BOS, sirketAdi: onAd });
  const [durum, setDurum] = React.useState<'bos' | 'gonderiliyor' | 'tamam' | 'hata'>('bos');
  const [hata, setHata] = React.useState('');

  /* Arama terimi değişince şirket adı da güncelleniyor — yeniden yazdırmıyoruz. */
  React.useEffect(() => {
    setDeger((o) => (o.sirketAdi ? o : { ...o, sirketAdi: onAd }));
  }, [onAd]);

  const yaz = (alan: Alan) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDeger((o) => ({ ...o, [alan]: e.target.value }));

  const serbestEposta = SERBEST_SAGLAYICILAR.some((s) =>
    deger.eposta.toLocaleLowerCase('tr-TR').endsWith(`@${s}`)
  );

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deger.sirketAdi.trim() || !deger.yetkiliAdi.trim() || !deger.eposta.trim()) {
      setHata('Şirket adı, adınız ve kurumsal e-posta gerekiyor.');
      setDurum('hata');
      return;
    }

    setDurum('gonderiliyor');
    setHata('');
    try {
      const { error } = await (
        supabase.from('sirket_talepleri' as never) as never as {
          insert: (s: Record<string, string | null>) => Promise<{ error: { message: string } | null }>;
        }
      ).insert({
        sirket_adi: deger.sirketAdi.trim(),
        web_sitesi: deger.webSitesi.trim() || null,
        kariyer_sayfasi: deger.kariyerSayfasi.trim() || null,
        yetkili_adi: deger.yetkiliAdi.trim(),
        kurumsal_eposta: deger.eposta.trim(),
        gorev: deger.gorev.trim() || null,
        telefon: deger.telefon.trim() || null,
        user_id: userId,
      });
      if (error) throw new Error(error.message);
      setDurum('tamam');
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Talep gönderilemedi.');
      setDurum('hata');
    }
  };

  if (durum === 'tamam') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="flex items-center gap-2 font-bold text-emerald-900">
          <Check className="h-4 w-4" />
          Talebiniz alındı
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-emerald-800">
          {deger.sirketAdi.trim()} için sayfayı biz oluşturuyoruz. Kurumsal e-postanıza
          yazacağız. Genellikle iki iş günü içinde dönüyoruz.
        </p>
      </div>
    );
  }

  const alanSinifi =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-600';

  return (
    <form onSubmit={gonder} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Building2 className="h-4 w-4 text-blue-700" />
          Şirketinizi bulamadık
        </p>
        <p className="text-sm leading-relaxed text-gray-600">
          Bilgileri ekleyin, sizin için şirket sayfasını oluşturalım.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-gray-700 sm:col-span-2">
          Şirket adı *
          <input required value={deger.sirketAdi} onChange={yaz('sirketAdi')} className={`mt-1 ${alanSinifi}`} />
        </label>

        <label className="block text-xs font-bold text-gray-700">
          Web sitesi
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={deger.webSitesi}
            onChange={yaz('webSitesi')}
            className={`mt-1 ${alanSinifi}`}
          />
        </label>

        <label className="block text-xs font-bold text-gray-700">
          Kariyer sayfası
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={deger.kariyerSayfasi}
            onChange={yaz('kariyerSayfasi')}
            className={`mt-1 ${alanSinifi}`}
          />
        </label>

        <label className="block text-xs font-bold text-gray-700">
          Adınız soyadınız *
          <input required value={deger.yetkiliAdi} onChange={yaz('yetkiliAdi')} className={`mt-1 ${alanSinifi}`} />
        </label>

        <label className="block text-xs font-bold text-gray-700">
          Görevi
          <input value={deger.gorev} onChange={yaz('gorev')} className={`mt-1 ${alanSinifi}`} />
        </label>

        <label className="block text-xs font-bold text-gray-700">
          Kurumsal e-posta *
          <input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            value={deger.eposta}
            onChange={yaz('eposta')}
            className={`mt-1 ${alanSinifi}`}
          />
        </label>

        <label className="block text-xs font-bold text-gray-700">
          Telefon <span className="font-medium text-gray-500">(isteğe bağlı)</span>
          {/* inputMode: mobilde sayı klavyesi açılsın. */}
          <input
            type="tel"
            inputMode="tel"
            value={deger.telefon}
            onChange={yaz('telefon')}
            className={`mt-1 ${alanSinifi}`}
          />
        </label>
      </div>

      {/*
        Serbest e-posta engellenmiyor, uyarılıyor. Küçük işletmelerin
        büyük kısmı Gmail kullanıyor; kapıyı kapatmak onları dışarıda
        bırakır. Yalnızca doğrulamanın neden uzayabileceği söyleniyor.
      */}
      {serbestEposta && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
          Şirket alan adınızdan bir e-posta varsa onu yazmanız doğrulamayı hızlandırır. Zorunlu
          değil — serbest e-postayla gelen talepleri elle doğruluyoruz.
        </p>
      )}

      {durum === 'hata' && <p className="text-sm font-semibold text-rose-600">{hata}</p>}

      <button
        type="submit"
        disabled={durum === 'gonderiliyor'}
        className="min-h-11 w-full cursor-pointer rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-50"
      >
        {durum === 'gonderiliyor' ? 'Gönderiliyor…' : 'Şirketimi Ekle'}
      </button>

      <p className="text-xs leading-relaxed text-gray-600">
        Bilgileriniz yalnızca şirket sayfasını oluşturmak ve sizinle iletişim kurmak için
        kullanılıyor.
      </p>
    </form>
  );
};
