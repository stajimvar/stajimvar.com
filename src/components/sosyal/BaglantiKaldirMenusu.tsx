import React from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { ODAK_HALKASI } from '../../lib/renk-token';

/**
 * Bağlantıyı kaldırma — göz önünde değil, "⋯" menüsünün içinde.
 *
 * NEDEN SAKLI
 * -----------
 * "Bağlantıyı kaldır" satırın ve profilin en görünür düğmesiydi; ağın
 * kendisini küçülten bir eylem, ağı büyüten eylemlerle aynı ağırlıkta
 * duruyordu. Kullanıcı isteği (17 Eylül 2026): kaldırmak isteyen biraz
 * uğraşsın. LinkedIn'deki gibi üç nokta menüsünde ve bir ONAY adımıyla:
 *
 *   ⋯  →  Bağlantıyı kaldır  →  "Emin misin?"  →  Kaldır
 *
 * Yanlışlıkla dokunuşla bağlantı kopmuyor.
 */
export const BaglantiKaldirMenusu: React.FC<{
  /** Onay cümlesinde geçen ad. */
  ad: string;
  islemde: boolean;
  onKaldir: () => void;
}> = ({ ad, islemde, onKaldir }) => {
  const [menuAcik, setMenuAcik] = React.useState(false);
  const [onayAcik, setOnayAcik] = React.useState(false);
  const kap = React.useRef<HTMLDivElement>(null);
  const baslikId = React.useId();

  React.useEffect(() => {
    if (!menuAcik && !onayAcik) return;
    const disari = (e: MouseEvent) => {
      if (kap.current && !kap.current.contains(e.target as Node)) {
        setMenuAcik(false);
        setOnayAcik(false);
      }
    };
    const kacis = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuAcik(false);
        setOnayAcik(false);
      }
    };
    document.addEventListener('mousedown', disari);
    document.addEventListener('keydown', kacis);
    return () => {
      document.removeEventListener('mousedown', disari);
      document.removeEventListener('keydown', kacis);
    };
  }, [menuAcik, onayAcik]);

  return (
    <div ref={kap} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setMenuAcik((a) => !a);
          setOnayAcik(false);
        }}
        aria-haspopup="menu"
        aria-expanded={menuAcik}
        aria-label="Diğer seçenekler"
        /*
          40 → 44 PİKSEL: dokunma hedefi kuralı en az 44 istiyor. Ölçüldü
          (Chromium, 390): tetik 40×40'tı. Bağlantılar listesinde satırın
          yüksekliğini 44 piksellik fotoğraf belirlediği için satır
          büyümüyor; profilin hap sırasında öteki haplarla aynı boy.
          Açılan menü ve onay kutusu bu yüzden `top-11` → `top-12`.
        */
        className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 ${ODAK_HALKASI}`}
      >
        <MoreHorizontal aria-hidden className="h-5 w-5" />
      </button>

      {menuAcik && (
        <div role="menu" className="absolute right-0 top-12 z-30 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuAcik(false);
              setOnayAcik(true);
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100"
          >
            <Trash2 aria-hidden className="h-4 w-4 text-gray-600" />
            Bağlantıyı kaldır
          </button>
        </div>
      )}

      {onayAcik && (
        <div
          role="alertdialog"
          aria-labelledby={baslikId}
          className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
        >
          <p id={baslikId} className="text-sm font-bold text-gray-900">
            {ad} ile bağlantını kaldırmak istiyor musun?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Paylaşımları akışında görünmeyi bırakır. Yeniden bağlanmak için tekrar istek göndermen gerekir.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOnayAcik(false)}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={islemde}
              onClick={() => {
                onKaldir();
                setOnayAcik(false);
              }}
              className="cursor-pointer rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {islemde ? 'Kaldırılıyor…' : 'Kaldır'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
