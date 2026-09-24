import React from 'react';
import { Flag, MoreHorizontal } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI } from '../../lib/renk-token';
import { SosyalHata } from '../../lib/queries/sosyal';
import { mesajiSikayetEt } from '../../lib/queries/mesajlasma';
import { HAP, HAP_BIRINCIL } from '../sosyal/ProfilKimlikKalibi';

/**
 * MESAJ ŞİKÂYETİ — ⋯ → "Şikâyet et" → sebep → gönder
 *
 * YALNIZ KARŞI TARAFIN MESAJINDA: kendi mesajını şikâyet etmenin anlamı
 * yok; menü kendi balonunda hiç çizilmiyor.
 *
 * GÖRÜNÜRLÜK: telefonda ⋯ her zaman görünür (üstüne gelme yok); geniş
 * ekranda balonun üstüne gelince ya da klavye odağı gelince beliriyor.
 * Gizliyken de odaklanabilir ve odak alınca görünür — klavye kullanıcısı
 * için gizli bir eylem yok.
 *
 * ONAY CÜMLESİ DÜRÜST: göç (20261107010000) yöneticiye YALNIZ şikâyet
 * edilen mesajı okutuyor; sohbetin tamamını değil. Cümle bunu söylüyor,
 * fazlasını vaat etmiyor.
 */

const SEBEPLER: { deger: string; etiket: string }[] = [
  { deger: 'taciz', etiket: 'Taciz' },
  { deger: 'spam', etiket: 'Spam' },
  { deger: 'uygunsuz', etiket: 'Uygunsuz içerik' },
  { deger: 'diger', etiket: 'Diğer' },
];

const SikayetPenceresi: React.FC<{
  kullaniciId: string;
  mesajId: string;
  onKapat: () => void;
}> = ({ kullaniciId, mesajId, onKapat }) => {
  const [sebep, setSebep] = React.useState<string | null>(null);
  const [aciklama, setAciklama] = React.useState('');
  const [durum, setDurum] = React.useState<'form' | 'gonderiliyor' | 'tamam'>('form');
  const [hata, setHata] = React.useState<string | null>(null);
  const ilkRef = React.useRef<HTMLInputElement>(null);
  const kapatRef = React.useRef<HTMLButtonElement>(null);
  const baslikId = React.useId();

  React.useEffect(() => {
    ilkRef.current?.focus();
  }, []);
  React.useEffect(() => {
    if (durum === 'tamam') kapatRef.current?.focus();
  }, [durum]);
  React.useEffect(() => {
    const kacis = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && durum !== 'gonderiliyor') onKapat();
    };
    document.addEventListener('keydown', kacis);
    return () => document.removeEventListener('keydown', kacis);
  }, [durum, onKapat]);

  const gonder = async (olay: React.FormEvent) => {
    olay.preventDefault();
    if (!sebep || durum === 'gonderiliyor') return;
    setDurum('gonderiliyor');
    setHata(null);
    try {
      await mesajiSikayetEt(kullaniciId, mesajId, sebep, aciklama);
      setDurum('tamam');
    } catch (sorun) {
      setHata(sorun instanceof SosyalHata ? sorun.message : 'Şikâyet gönderilemedi. Yeniden deneyebilirsin.');
      setDurum('form');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={baslikId}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl"
      >
        <h2 id={baslikId} className="text-base font-extrabold text-gray-900">
          Mesajı şikâyet et
        </h2>

        {durum === 'tamam' ? (
          <div className="mt-3 space-y-4">
            <p role="status" className="text-sm leading-relaxed text-gray-700">
              Şikâyetin iletildi. Yönetim yalnız bu mesajı görebilir.
            </p>
            <div className="flex justify-end">
              <button ref={kapatRef} type="button" onClick={onKapat} className={HAP}>
                Kapat
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={gonder} className="mt-3 space-y-4" aria-busy={durum === 'gonderiliyor'}>
            <fieldset>
              <legend className="text-sm text-gray-600">Neden şikâyet ediyorsun?</legend>
              <div className="mt-2 space-y-1">
                {SEBEPLER.map((s, i) => (
                  <label
                    key={s.deger}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600"
                  >
                    <input
                      ref={i === 0 ? ilkRef : undefined}
                      type="radio"
                      name="sikayet-sebebi"
                      value={s.deger}
                      checked={sebep === s.deger}
                      onChange={() => setSebep(s.deger)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    {s.etiket}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="text-sm text-gray-600">Açıklama (isteğe bağlı)</span>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                maxLength={500}
                className={`mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 ${ODAK_HALKASI}`}
              />
            </label>
            {hata && (
              <p role="alert" className="text-sm font-semibold text-rose-700">
                {hata}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onKapat} disabled={durum === 'gonderiliyor'} className={HAP}>
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={!sebep || durum === 'gonderiliyor'}
                className={`${HAP_BIRINCIL} disabled:cursor-default disabled:opacity-40`}
              >
                {durum === 'gonderiliyor' ? 'Gönderiliyor…' : 'Şikâyet et'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/**
 * Balonun yanındaki ⋯ menüsü. Tek satır: "Şikâyet et". Menü kapanınca
 * odak ⋯'ye dönüyor; pencere kapanınca da.
 */
export const MesajEylemMenusu: React.FC<{ kullaniciId: string; mesajId: string }> = ({ kullaniciId, mesajId }) => {
  const [menuAcik, setMenuAcik] = React.useState(false);
  const [pencereAcik, setPencereAcik] = React.useState(false);
  const tetikRef = React.useRef<HTMLButtonElement>(null);
  const satirRef = React.useRef<HTMLButtonElement>(null);
  const kap = React.useRef<HTMLDivElement>(null);

  const tetigeDon = React.useCallback(() => {
    requestAnimationFrame(() => tetikRef.current?.focus());
  }, []);

  React.useEffect(() => {
    if (menuAcik) satirRef.current?.focus();
  }, [menuAcik]);
  React.useEffect(() => {
    if (!menuAcik) return;
    const disari = (e: MouseEvent) => {
      if (kap.current && !kap.current.contains(e.target as Node)) setMenuAcik(false);
    };
    const kacis = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuAcik(false);
        tetigeDon();
      }
    };
    document.addEventListener('mousedown', disari);
    document.addEventListener('keydown', kacis);
    return () => {
      document.removeEventListener('mousedown', disari);
      document.removeEventListener('keydown', kacis);
    };
  }, [menuAcik, tetigeDon]);

  return (
    <div ref={kap} className="relative shrink-0 self-center">
      <button
        ref={tetikRef}
        type="button"
        onClick={() => setMenuAcik((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={menuAcik}
        aria-label="Mesaj seçenekleri"
        className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 ${
          menuAcik ? 'lg:opacity-100' : ''
        } ${RENK_GECISI} ${ODAK_HALKASI}`}
      >
        <MoreHorizontal aria-hidden className="h-5 w-5" />
      </button>
      {menuAcik && (
        <div role="menu" className="absolute left-0 top-12 z-30 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          <button
            ref={satirRef}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuAcik(false);
              setPencereAcik(true);
            }}
            className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100 ${ODAK_HALKASI}`}
          >
            <Flag aria-hidden className="h-4 w-4 text-gray-600" />
            Şikâyet et
          </button>
        </div>
      )}
      {pencereAcik && (
        <SikayetPenceresi
          kullaniciId={kullaniciId}
          mesajId={mesajId}
          onKapat={() => {
            setPencereAcik(false);
            tetigeDon();
          }}
        />
      )}
    </div>
  );
};
