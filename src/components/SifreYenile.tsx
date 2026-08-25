import React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { SayfaKabugu } from './SayfaKabugu';
import { sifreSorunu, updatePassword } from '../lib/auth';
import { supabase } from '../lib/supabase';

/**
 * Şifre yenileme sayfası.
 *
 * NEDEN VAR
 * ---------
 * `sendPasswordReset` e-postayı gönderiyordu ve bağlantı /sifre-yenile
 * adresine düşüyordu — ama o adres uygulamada tanımlı değildi. Yani
 * "şifremi unuttum" akışı e-postaya kadar gidip orada bitiyordu; şifresini
 * unutan kullanıcı hesabına bir daha giremiyordu.
 *
 * NASIL ÇALIŞIYOR
 * ---------------
 * Supabase kurtarma bağlantısını açan tarayıcıya geçici bir oturum
 * veriyor. Bu sayfa o oturumun gerçekten geldiğini bekliyor: gelmeden
 * form gösterilirse kullanıcı şifre yazıyor, kaydedilemiyor ve nedenini
 * anlamıyor.
 */
export const SifreYenile: React.FC<{ onNavigate: (yol: string) => void }> = ({ onNavigate }) => {
  const [oturum, setOturum] = React.useState<'bekleniyor' | 'hazir' | 'yok'>('bekleniyor');
  const [sifre, setSifre] = React.useState('');
  const [tekrar, setTekrar] = React.useState('');
  const [goster, setGoster] = React.useState(false);
  const [hata, setHata] = React.useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [bitti, setBitti] = React.useState(false);

  React.useEffect(() => {
    document.title = 'Şifre yenile | StajımVar';
  }, []);

  React.useEffect(() => {
    let iptal = false;

    /*
      İki yoldan da oturum gelebiliyor: bağlantı işlenmişse getSession
      doluyor, işlenme anını kaçırdıysak PASSWORD_RECOVERY olayı geliyor.
      İkisini de dinlemek gerekiyor; yalnızca birine bakmak zamanlamaya
      bağlı bir hata bırakıyor.
    */
    supabase.auth.getSession().then(({ data }) => {
      if (!iptal && data.session) setOturum('hazir');
    });

    const { data: dinleyici } = supabase.auth.onAuthStateChange((olay, session) => {
      if (iptal) return;
      if (olay === 'PASSWORD_RECOVERY' || session) setOturum('hazir');
    });

    /* Beş saniye içinde oturum gelmezse bağlantı süresi dolmuş demektir. */
    const zamanlayici = window.setTimeout(() => {
      if (!iptal) setOturum((o) => (o === 'bekleniyor' ? 'yok' : o));
    }, 5000);

    return () => {
      iptal = true;
      window.clearTimeout(zamanlayici);
      dinleyici.subscription.unsubscribe();
    };
  }, []);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    const sorun = sifreSorunu(sifre);
    if (sorun) return setHata(sorun);
    if (sifre !== tekrar) return setHata('İki şifre aynı değil.');

    setHata(null);
    setKaydediliyor(true);
    try {
      await updatePassword(sifre);
      setBitti(true);
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Şifre değiştirilemedi.');
    } finally {
      setKaydediliyor(false);
    }
  };

  const alanSinifi =
    'w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-blue-600';

  return (
    <SayfaKabugu>
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Şifre yenile</h1>

        {bitti ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
            <p className="font-bold text-emerald-900">Şifren değiştirildi.</p>
            <p className="text-sm text-emerald-800">Artık yeni şifrenle giriş yapabilirsin.</p>
            <button
              onClick={() => onNavigate('/')}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white cursor-pointer"
            >
              Ana sayfaya dön
            </button>
          </div>
        ) : oturum === 'yok' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
            <p className="font-bold text-amber-900">Bağlantının süresi dolmuş olabilir.</p>
            <p className="text-sm text-amber-800">
              Şifre yenileme bağlantıları kısa süre geçerli. Giriş ekranından &quot;Şifremi
              unuttum&quot; ile yeni bir bağlantı iste.
            </p>
            <button
              onClick={() => onNavigate('/')}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white cursor-pointer"
            >
              Ana sayfaya dön
            </button>
          </div>
        ) : oturum === 'bekleniyor' ? (
          <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        ) : (
          <form onSubmit={gonder} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div>
              <label htmlFor="yeni-sifre" className="block text-sm font-bold text-gray-700 mb-1">
                Yeni şifre
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="yeni-sifre"
                  name="new-password"
                  type={goster ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  className={alanSinifi}
                />
                <button
                  type="button"
                  onClick={() => setGoster((g) => !g)}
                  aria-label={goster ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  {goster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">En az 8 karakter, bir harf ve bir rakam.</p>
            </div>

            <div>
              <label htmlFor="yeni-sifre-tekrar" className="block text-sm font-bold text-gray-700 mb-1">
                Yeni şifre (tekrar)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="yeni-sifre-tekrar"
                  name="new-password-confirm"
                  type={goster ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={tekrar}
                  onChange={(e) => setTekrar(e.target.value)}
                  className={alanSinifi}
                />
              </div>
            </div>

            {hata && <p className="text-sm font-semibold text-rose-600">{hata}</p>}

            <button
              type="submit"
              disabled={kaydediliyor}
              className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50 cursor-pointer"
            >
              {kaydediliyor ? 'Kaydediliyor…' : 'Şifreyi değiştir'}
            </button>
          </form>
        )}
      </div>
    </SayfaKabugu>
  );
};
