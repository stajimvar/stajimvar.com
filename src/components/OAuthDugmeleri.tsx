import React from 'react';
import { acikOAuthSaglayicilari, OAUTH_ADLARI, signInWithProvider, type OAuthSaglayici } from '../lib/auth';

/**
 * Google ve Microsoft ile giriş düğmeleri.
 *
 * NEDEN İŞVEREN TARAFINDA ÖNEMLİ
 * ------------------------------
 * İşveren yetkilisi kurumsal e-postasını zaten Google Workspace ya da
 * Microsoft 365 üzerinden kullanıyor. Yeni bir şifre uydurmak, huninin en
 * kırılgan noktasında bir engel daha koymak demek.
 *
 * ŞİRKET DOĞRULAMASI DEĞİL
 * ------------------------
 * Bu düğmeler kişinin o e-posta adresine sahip olduğunu kanıtlıyor, o
 * şirketi TEMSİL ettiğini değil. İlan yayınlama ve aday bilgisine erişim
 * yetkisi sahiplenme onayına bağlı kalmaya devam ediyor; kontrol
 * veritabanı tarafında (company_members + RLS) ve buradaki hiçbir şey onu
 * gevşetmiyor. Gerekçesi src/lib/auth.ts içindeki signInWithProvider
 * başlığında.
 *
 * SİMGELER
 * --------
 * Sağlayıcıların resmî amblemleri satır içi SVG olarak gömülü: dış kaynak
 * çağırmak hem izleme hem de o kaynak düşünce düğmenin kimliksiz kalması
 * demek. Renkler markaların kendi değerleri.
 */

const GoogleSimgesi: React.FC = () => (
  <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
    />
  </svg>
);

const MicrosoftSimgesi: React.FC = () => (
  <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
    <path fill="#F25022" d="M0 0h8.5v8.5H0z" />
    <path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z" />
    <path fill="#00A4EF" d="M0 9.5h8.5V18H0z" />
    <path fill="#FFB900" d="M9.5 9.5H18V18H9.5z" />
  </svg>
);

const SIMGELER: Record<OAuthSaglayici, React.FC> = {
  google: GoogleSimgesi,
  azure: MicrosoftSimgesi,
};

export const OAuthDugmeleri: React.FC<{
  /** Giriş bitince dönülecek site içi adres. */
  donusYolu?: string;
  onHata: (mesaj: string) => void;
  /** Şifreli formun etiketine göre değişen ayırıcı metni. */
  ayiriciMetni?: string;
}> = ({ donusYolu, onHata, ayiriciMetni = 'veya kurumsal e-posta ile' }) => {
  const [bekleyen, setBekleyen] = React.useState<OAuthSaglayici | null>(null);

  /*
    ÇALIŞMAYAN DÜĞME ÇİZİLMİYOR

    signInWithOAuth istemcide hata fırlatmıyor; tarayıcıyı Supabase'e
    gönderiyor. Sağlayıcı panelde açık değilse kullanıcı bizim sitemizden
    çıkıp ham bir JSON hatasıyla karşılaşıyor (ölçüldü). Bu yüzden önce
    hangi sağlayıcının açık olduğu soruluyor ve yalnızca onlar çiziliyor.

    Panelden Google açıldığı anda düğme kendiliğinden beliriyor.
  */
  const [acikOlanlar, setAcikOlanlar] = React.useState<OAuthSaglayici[] | null>(null);

  React.useEffect(() => {
    let iptal = false;
    acikOAuthSaglayicilari()
      .then((liste) => {
        if (!iptal) setAcikOlanlar(liste);
      })
      .catch(() => {
        if (!iptal) setAcikOlanlar([]);
      });
    return () => {
      iptal = true;
    };
  }, []);

  const basla = async (saglayici: OAuthSaglayici) => {
    setBekleyen(saglayici);
    onHata('');
    try {
      await signInWithProvider(saglayici, donusYolu);
      /*
        Başarılıysa tarayıcı sağlayıcıya gidiyor ve bu bileşen yok oluyor;
        `bekleyen` sıfırlanmıyor çünkü sıfırlanacak bir ekran kalmıyor.
      */
    } catch (e) {
      setBekleyen(null);
      onHata(e instanceof Error ? e.message : 'Giriş başlatılamadı.');
    }
  };

  /*
    Sorgu sürerken de, hiçbiri açık değilken de hiçbir şey çizilmiyor:
    bir an görünüp kaybolan düğme, formu zıplatıyor.
  */
  if (!acikOlanlar || acikOlanlar.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {acikOlanlar.map((s) => {
          const Simge = SIMGELER[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => void basla(s)}
              disabled={bekleyen !== null}
              /*
                Tam genişlik ve `min-w-0` + `truncate`: dar ekranda uzun
                sağlayıcı adı düğmeyi taşırmasın. Yükseklik 44 piksel.
              */
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
            >
              <Simge />
              <span className="min-w-0 truncate">
                {bekleyen === s ? 'Yönlendiriliyor…' : `${OAUTH_ADLARI[s]} ile devam et`}
              </span>
            </button>
          );
        })}
      </div>

      {/* İki çizgi arasında ayırıcı. */}
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-gray-200" />
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {ayiriciMetni}
        </span>
        <span aria-hidden className="h-px flex-1 bg-gray-200" />
      </div>
    </div>
  );
};
