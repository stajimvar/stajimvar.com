import React from 'react';

/**
 * Modal pencereler için ortak erişilebilirlik davranışı.
 *
 * NEDEN ORTAK
 * -----------
 * Üç modal (giriş/kayıt, ilan önizleme, başvuru) birbirinden bağımsız
 * yazılmıştı ve hiçbirinde şu yoktu: açılışta odağın modala geçmesi, ESC ile
 * kapanma, odağın modal içinde kalması, kapanınca odağın modalı açan düğmeye
 * dönmesi. Klavyeyle gezen bir kullanıcı modal açtığında odak arka planda
 * kalıyor, Tab tuşu görünmeyen bağlantılarda dolaşıyordu.
 *
 * `aria-modal="true"` ekran okuyucuya arka planı yok saymasını söylüyor;
 * fare/dokunma için de gövde kaydırması kilitleniyor, yoksa modal açıkken
 * arkadaki liste kayıyor ve tıklanabiliyordu.
 */
const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalErisim<T extends HTMLElement>(acik: boolean, kapat: () => void) {
  const kutuRef = React.useRef<T>(null);

  React.useEffect(() => {
    if (!acik) return;

    const oncekiOdak = document.activeElement as HTMLElement | null;
    const odaklanabilirler = () =>
      Array.from(kutuRef.current?.querySelectorAll<HTMLElement>(ODAKLANABILIR) ?? []).filter(
        (oge) => oge.offsetParent !== null || oge === document.activeElement
      );

    // Açılışta odak modalın içine: yoksa Tab tuşu arka plandan devam ediyor.
    const ilkOdak = window.setTimeout(() => {
      const ogeler = odaklanabilirler();
      (ogeler[0] ?? kutuRef.current)?.focus?.();
    }, 0);

    const tusaBas = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') {
        olay.preventDefault();
        kapat();
        return;
      }
      if (olay.key !== 'Tab') return;

      const ogeler = odaklanabilirler();
      if (ogeler.length === 0) return;
      const ilk = ogeler[0];
      const son = ogeler[ogeler.length - 1];

      if (olay.shiftKey && document.activeElement === ilk) {
        olay.preventDefault();
        son.focus();
      } else if (!olay.shiftKey && document.activeElement === son) {
        olay.preventDefault();
        ilk.focus();
      }
    };

    document.addEventListener('keydown', tusaBas);
    const oncekiTasma = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(ilkOdak);
      document.removeEventListener('keydown', tusaBas);
      document.body.style.overflow = oncekiTasma;
      // Odak, modalı açan düğmeye dönüyor; yoksa sayfanın en başına düşüyor.
      oncekiOdak?.focus?.();
    };
  }, [acik, kapat]);

  return kutuRef;
}
