import React from 'react';
import { GECIS, KOSE } from './tokens';

/**
 * Sayı + etiket.
 *
 * TIKLANABİLİRSE GERÇEKTEN GİDİYOR
 * --------------------------------
 * Sayılar bir şeyi sayıyor ve o şeyin bir listesi var. Sayıya basınca o
 * listeye gitmiyorsa sayı bir süs; gittiği yerde aynı sayıyı göremiyorsa
 * sayı yanlış.
 *
 * ÜÇ HÂL: DÜZ METİN, DÜĞME, BAĞLANTI
 * ----------------------------------
 * Hedefi bir ADRES olan sayaç (`href`) gerçek `<a>` olarak çiziliyor:
 * orta tuş ve "yeni sekmede aç" çalışıyor, düğmede çalışmazdı. Hedefi
 * yalnız uygulama içi bir sekme durumu olan sayaç (`onClick`) düğme
 * kalıyor — ona adres uydurmak, yeni sekmede boş bir sayfa açmak olurdu.
 *
 * Değiştirici tuşla tıklama (Ctrl/⌘/Shift/Alt, orta tuş) tarayıcıya
 * bırakılıyor; yalnız düz sol tık uygulama içi gezinmeye çevriliyor.
 * Kalıp deponun öteki kart bağlantılarıyla aynı.
 */
export const StatItem: React.FC<{
  deger: number | string;
  etiket: string;
  onClick?: () => void;
  /** Gerçek adres. Verilirse `onClick` yerine bağlantı çiziliyor. */
  href?: string;
  /** Uygulama içi gezinme; yoksa bağlantı tam sayfa yüklemeyle gidiyor. */
  onNavigate?: (yol: string) => void;
}> = ({ deger, etiket, onClick, href, onNavigate }) => {
  const icerik = (
    <>
      <span className="block text-xl font-extrabold leading-tight tabular-nums text-gray-900">
        {deger}
      </span>
      <span className="mt-0.5 block text-[11px] leading-tight text-gray-600">{etiket}</span>
    </>
  );

  /* Odak halkası: klavyeyle gezen kullanıcı sayacın seçili olduğunu görsün. */
  const tiklanabilir = `block min-h-11 min-w-0 flex-1 ${KOSE.kontrol} px-1 text-center ${GECIS} cursor-pointer hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`;

  if (href) {
    return (
      <a
        href={href}
        onClick={(olay) => {
          if (!onNavigate) return;
          if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey || olay.button !== 0)
            return;
          olay.preventDefault();
          onNavigate(href);
        }}
        className={tiklanabilir}
      >
        {icerik}
      </a>
    );
  }

  if (!onClick) return <span className="block min-w-0 text-center">{icerik}</span>;

  return (
    <button type="button" onClick={onClick} className={tiklanabilir}>
      {icerik}
    </button>
  );
};
