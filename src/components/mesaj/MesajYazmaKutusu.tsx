import React from 'react';
import { SendHorizontal } from 'lucide-react';
import { ODAK_HALKASI, RENK_GECISI, RENK_PRIMARY } from '../../lib/renk-token';
import { kalanKarakter } from '../../lib/mesaj-ekrani.mjs';
import { MESAJ_EN_UZUN } from '../../lib/queries/mesajlasma';
import { SosyalHata } from '../../lib/queries/sosyal';

/**
 * YAZMA KUTUSU
 *
 *   - kendiliğinden büyüyen textarea (en çok ~6 satır, sonra kendi içinde kayar)
 *   - geniş ekranda Enter gönderir, Shift+Enter yeni satır; dokunmatik
 *     ekranda Enter satır sonu — telefon klavyesinde "Shift" yok, gönderim
 *     görünür düğmeden
 *   - gönderirken kilit: çift Enter ikinci bir mesaj atmıyor
 *   - 1800 karakterden sonra kalan karakter sayacı
 *   - hata cümlesi sunucunun kodundan (`SosyalHata.message`); metin
 *     kutuda KALIYOR, kullanıcı yeniden yazmak zorunda değil
 *
 * İYİMSER KOPYA YOK: bu bileşen mesajı listeye eklemiyor. `onGonder`
 * çözülünce çağıran SUNUCUNUN döndürdüğü satırı ekliyor; kutu ancak o
 * zaman boşalıyor.
 *
 * KAPALI HÂL: `kapali` bir cümle taşıyorsa (istek sınırı doldu) kutu ve
 * düğme devre dışı, sebep kutunun yerinde yazılı.
 */

const EN_YUKSEK = 160;

export const MesajYazmaKutusu: React.FC<{
  onGonder: (metin: string) => Promise<void>;
  /** Doluysa kutu kapalı ve bu cümle gösteriliyor. */
  kapali: string | null;
}> = ({ onGonder, kapali }) => {
  const [metin, setMetin] = React.useState('');
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [hata, setHata] = React.useState<string | null>(null);
  const kutuRef = React.useRef<HTMLTextAreaElement>(null);
  const hataId = React.useId();

  /* Dokunmatik mi: Enter'ın anlamı buna göre (yukarıdaki gerekçe). */
  const dokunmatik = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true,
    [],
  );

  const boyutla = () => {
    const kutu = kutuRef.current;
    if (!kutu) return;
    kutu.style.height = 'auto';
    kutu.style.height = `${Math.min(kutu.scrollHeight, EN_YUKSEK)}px`;
  };
  React.useLayoutEffect(boyutla, [metin]);

  const kalan = kalanKarakter(metin, MESAJ_EN_UZUN);
  const bos = metin.trim().length === 0;
  const kilitli = gonderiliyor || Boolean(kapali);

  const gonder = async () => {
    if (kilitli || bos) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await onGonder(metin);
      setMetin('');
    } catch (sorun) {
      setHata(sorun instanceof SosyalHata ? sorun.message : 'Mesaj gönderilemedi. Yeniden deneyebilirsin.');
    } finally {
      setGonderiliyor(false);
      requestAnimationFrame(() => kutuRef.current?.focus());
    }
  };

  if (kapali) {
    return (
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <p role="status" className="text-sm leading-relaxed text-gray-600">
          {kapali}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(olay) => {
        olay.preventDefault();
        void gonder();
      }}
      aria-busy={gonderiliyor}
      className="border-t border-gray-200 bg-white px-3 py-2.5"
    >
      {hata && (
        <p id={hataId} role="alert" className="mb-2 px-1 text-sm font-semibold text-rose-700">
          {hata}
        </p>
      )}
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Mesaj</span>
          <textarea
            ref={kutuRef}
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey || dokunmatik || e.nativeEvent.isComposing) return;
              e.preventDefault();
              void gonder();
            }}
            rows={1}
            maxLength={MESAJ_EN_UZUN}
            readOnly={gonderiliyor}
            placeholder="Mesaj yaz…"
            aria-describedby={hata ? hataId : undefined}
            className={`block max-h-40 min-h-11 w-full resize-none rounded-3xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm leading-6 text-gray-900 placeholder:text-gray-500 ${ODAK_HALKASI}`}
          />
        </label>
        <button
          type="submit"
          disabled={kilitli || bos}
          aria-label={gonderiliyor ? 'Gönderiliyor' : 'Gönder'}
          className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full ${RENK_PRIMARY.zemin} ${RENK_PRIMARY.zeminHover} text-white disabled:cursor-default disabled:opacity-40 ${RENK_GECISI} ${ODAK_HALKASI}`}
        >
          <SendHorizontal aria-hidden className="h-5 w-5" />
        </button>
      </div>
      {kalan !== null && (
        <p aria-live="polite" className={`mt-1 px-1 text-right text-xs ${kalan < 50 ? 'font-bold text-rose-700' : 'text-gray-500'}`}>
          {kalan} karakter kaldı
        </p>
      )}
    </form>
  );
};
