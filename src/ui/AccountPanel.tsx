import React from 'react';
import { KOSE } from './tokens';

/**
 * Hesap paneli kabuğu — mobilde alttan açılan sayfa, masaüstünde popover.
 *
 * NEDEN İKİ AYRI DAVRANIŞ
 * -----------------------
 * Tek bir masaüstü dropdown'ı her ekranda kullanılıyordu. Telefonda
 * ekranın sağ üstünden aşağı sarkan, altındaki içerikle hiçbir bağı
 * olmayan bir kart çıkıyordu: arka plan kararmadığı için bir KATMAN gibi
 * değil, sayfanın üstüne düşmüş başka bir kart gibi görünüyordu.
 *
 * Telefonda alışılmış kalıp alttan açılan panel: baş parmağın ulaştığı
 * yerde, ekranın kenarına yaslı ve arkası kararmış. Masaüstünde ise
 * avatarın altına yaslanan kompakt bir popover doğru olan — orada
 * ekranın altı işaretçiden uzak.
 *
 * KAPANMA YOLLARI
 * ---------------
 * Dışarı tıklama, Escape ve telefonun geri tuşu. Geri tuşu özellikle
 * önemli: alttan açılan bir panelde kullanıcının ilk refleksi geri
 * tuşuna basmak oluyor ve panel kapanmazsa sayfadan çıkıyor.
 *
 * KAYDIRMA KİLİDİ
 * ---------------
 * Panel açıkken arkadaki sayfa kaymıyor. Kaydığında panel yerinde
 * duruyor ve arkasındaki içerik altından akıyor; bu, panelin sayfaya ait
 * olmadığı hissini büyütüyor.
 */

export const AccountPanel: React.FC<{
  acik: boolean;
  onKapat: () => void;
  /** Ekran okuyucu için panelin adı. */
  etiket: string;
  children: React.ReactNode;
}> = ({ acik, onKapat, etiket, children }) => {
  const kapatRef = React.useRef(onKapat);
  kapatRef.current = onKapat;

  /* Escape ve kaydırma kilidi. */
  React.useEffect(() => {
    if (!acik) return;

    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapatRef.current();
    };
    document.addEventListener('keydown', tus);

    const oncekiTasma = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', tus);
      document.body.style.overflow = oncekiTasma;
    };
  }, [acik]);

  /*
    GERİ TUŞU

    Açılırken geçmişe bir kayıt düşülüyor; geri tuşu o kaydı geri alınca
    panel kapanıyor. Panel başka bir yolla kapandıysa düşülen kayıt geri
    alınıyor, yoksa kullanıcının bir sonraki geri basışı hiçbir şey
    yapmıyormuş gibi görünürdü.
  */
  React.useEffect(() => {
    if (!acik) return;

    const isaret = { stajimvarPanel: true };
    window.history.pushState(isaret, '');
    let geriyleKapandi = false;

    const geri = () => {
      geriyleKapandi = true;
      kapatRef.current();
    };
    window.addEventListener('popstate', geri);

    return () => {
      window.removeEventListener('popstate', geri);
      if (!geriyleKapandi && window.history.state?.stajimvarPanel) window.history.back();
    };
  }, [acik]);

  if (!acik) return null;

  return (
    <>
      {/*
        MOBİL: alttan açılan panel.

        Arka plan kararıyor — panelin bir KATMAN olduğunu söyleyen şey bu.
        Genişlik calc(100% - 24px) ve en fazla 400 piksel: geniş
        telefonlarda kenardan kenara uzayıp tablet gibi görünmüyor.
      */}
      <div className="fixed inset-0 z-[60] md:hidden">
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={onKapat}
          className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-200"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={etiket}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          className={`absolute bottom-0 left-1/2 w-[calc(100%-24px)] max-w-[400px] -translate-x-1/2 ${KOSE.panel} border border-gray-100 bg-white pb-3 animate-in slide-in-from-bottom-4 fade-in duration-200`}
        >
          {/* Tutamaç: panelin aşağı kapanabileceğini söyleyen bilinen işaret. */}
          <span aria-hidden className="mx-auto mt-2.5 mb-1 block h-1 w-10 rounded-full bg-gray-200" />
          {children}
        </div>
      </div>

      {/*
        MASAÜSTÜ: avatarın altında kompakt popover.

        Konumlandırma çağıran taraftaki `relative` kaptan geliyor; burada
        yalnızca hizalama ve genişlik var.
      */}
      <div className="hidden md:block">
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={onKapat}
          className="fixed inset-0 z-40 h-full w-full cursor-default"
        />
        <div
          role="dialog"
          aria-modal="false"
          aria-label={etiket}
          className={`absolute right-0 top-full z-50 mt-2.5 w-[320px] max-w-[320px] ${KOSE.kart} border border-gray-100 bg-white py-2 shadow-lg animate-in fade-in slide-in-from-top-1 duration-200`}
        >
          {children}
        </div>
      </div>
    </>
  );
};
