import React from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { ODAK_HALKASI } from '../../lib/renk-token';

/**
 * ONAYLI EYLEM MENÜSÜ — tetik → tek satırlık menü → onay adımı
 *
 * Bağlantıyı kaldırmanın kalıbıydı (kullanıcı isteği, 17 Eylül 2026):
 * ağı küçülten bir eylem, ağı büyüten eylemlerle aynı ağırlıkta durmasın;
 * LinkedIn'deki gibi bir menüde ve ONAY adımıyla. Yanlışlıkla dokunuşla
 * bir şey kopmuyor:
 *
 *   tetik  →  eylem satırı  →  "… istiyor musun?"  →  onay
 *
 * GENELLEŞTİRİLDİ (kullanıcı kararı 24 Eylül 2026: durum hapın kendisi,
 * eylem görünür menüde): profil başlığında bağlantı durumu artık bir hap
 * ("Bağlantıdasın", "İstek gönderildi") ve hapın kendisi bu menünün
 * TETİĞİ. Aynı kalıp iki eylemde (kaldır, isteği geri çek) kullanılıyor;
 * ikinci bir kopya yazılmadı. Tetik dışarıdan veriliyor, verilmezse
 * bağlantılar listesindeki "⋯".
 *
 * GİZLİ EYLEM YOK: tetik görünür bir düğme (`aria-haspopup="menu"`,
 * `aria-expanded`), eylem açık bir menü satırı, sonuç bir onay kutusu.
 * X'teki "Pending" hapı üstüne gelince görünen bir eylemle isteği geri
 * çekiyor; burada o eylem her zaman menüde yazılı.
 *
 * ODAK
 * ----
 * Menü açılınca odak ilk satıra, onay açılınca "Vazgeç"e gidiyor (yıkıcı
 * olmayan seçenek). Escape ya da "Vazgeç" odağı tetiğe geri veriyor —
 * klavye kullanıcısı sayfanın başına düşmüyor. Dışarı tıklama odağı
 * çalmıyor: kullanıcı tıkladığı yerde kalıyor.
 */

export interface OnayliEylemMenusuProps {
  /** Tetik düğmesinin içeriği ve biçimi. Görünür metin yoksa `ariaLabel` şart. */
  tetik: { icerik: React.ReactNode; sinif: string; ariaLabel?: string };
  /** Menüdeki tek satır. */
  eylem: { etiket: string; ikon: React.ReactNode };
  /** Onay adımının metinleri. */
  onay: { soru: string; aciklama: string; dugme: string; islemdeDugme: string };
  islemde: boolean;
  onOnayla: () => void;
}

const ONAY_DUGMESI =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-bold';

export const OnayliEylemMenusu: React.FC<OnayliEylemMenusuProps> = ({
  tetik,
  eylem,
  onay,
  islemde,
  onOnayla,
}) => {
  const [menuAcik, setMenuAcik] = React.useState(false);
  const [onayAcik, setOnayAcik] = React.useState(false);
  const kap = React.useRef<HTMLDivElement>(null);
  const tetikRef = React.useRef<HTMLButtonElement>(null);
  const ilkSatirRef = React.useRef<HTMLButtonElement>(null);
  const vazgecRef = React.useRef<HTMLButtonElement>(null);
  const baslikId = React.useId();

  const kapatVeTetigeDon = React.useCallback(() => {
    setMenuAcik(false);
    setOnayAcik(false);
    /* Bir sonraki karede: kapanan katman DOM'dan çıktıktan sonra. */
    requestAnimationFrame(() => tetikRef.current?.focus());
  }, []);

  React.useEffect(() => {
    if (menuAcik) ilkSatirRef.current?.focus();
  }, [menuAcik]);
  React.useEffect(() => {
    if (onayAcik) vazgecRef.current?.focus();
  }, [onayAcik]);

  React.useEffect(() => {
    if (!menuAcik && !onayAcik) return;
    const disari = (e: MouseEvent) => {
      if (kap.current && !kap.current.contains(e.target as Node)) {
        setMenuAcik(false);
        setOnayAcik(false);
      }
    };
    const kacis = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapatVeTetigeDon();
    };
    document.addEventListener('mousedown', disari);
    document.addEventListener('keydown', kacis);
    return () => {
      document.removeEventListener('mousedown', disari);
      document.removeEventListener('keydown', kacis);
    };
  }, [menuAcik, onayAcik, kapatVeTetigeDon]);

  return (
    <div ref={kap} className="relative shrink-0">
      <button
        ref={tetikRef}
        type="button"
        onClick={() => {
          setMenuAcik((a) => !a);
          setOnayAcik(false);
        }}
        aria-haspopup="menu"
        aria-expanded={menuAcik}
        aria-label={tetik.ariaLabel}
        className={tetik.sinif}
      >
        {tetik.icerik}
      </button>

      {menuAcik && (
        <div role="menu" className="absolute right-0 top-12 z-30 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          <button
            ref={ilkSatirRef}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuAcik(false);
              setOnayAcik(true);
            }}
            className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100 ${ODAK_HALKASI}`}
          >
            {eylem.ikon}
            {eylem.etiket}
          </button>
        </div>
      )}

      {onayAcik && (
        <div
          role="alertdialog"
          aria-labelledby={baslikId}
          className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-lg"
        >
          <p id={baslikId} className="text-sm font-bold text-gray-900">
            {onay.soru}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">{onay.aciklama}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              ref={vazgecRef}
              type="button"
              onClick={kapatVeTetigeDon}
              className={`${ONAY_DUGMESI} text-gray-700 hover:bg-gray-100 ${ODAK_HALKASI}`}
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={islemde}
              onClick={() => {
                onOnayla();
                kapatVeTetigeDon();
              }}
              className={`${ONAY_DUGMESI} bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 ${ODAK_HALKASI}`}
            >
              {islemde ? onay.islemdeDugme : onay.dugme}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/*
  "⋯" TETİĞİ — bağlantılar listesinin varsayılanı.

  40 → 44 PİKSEL: dokunma hedefi kuralı en az 44 istiyor. Ölçüldü
  (Chromium, 390): tetik 40×40'tı. Bağlantılar listesinde satırın
  yüksekliğini 44 piksellik fotoğraf belirlediği için satır büyümüyor.
  Açılan menü ve onay kutusu bu yüzden `top-12`.
*/
const NOKTALAR_TETIGI = {
  icerik: <MoreHorizontal aria-hidden className="h-5 w-5" />,
  sinif: `flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 ${ODAK_HALKASI}`,
  ariaLabel: 'Diğer seçenekler',
};

/**
 * Bağlantıyı kaldırma — onaylı menüde. Listede "⋯" ile, profil başlığında
 * "Bağlantıdasın" hapıyla açılıyor (`tetik`).
 */
export const BaglantiKaldirMenusu: React.FC<{
  /** Onay cümlesinde geçen ad. */
  ad: string;
  islemde: boolean;
  onKaldir: () => void;
  /** Verilmezse "⋯". */
  tetik?: OnayliEylemMenusuProps['tetik'];
}> = ({ ad, islemde, onKaldir, tetik = NOKTALAR_TETIGI }) => (
  <OnayliEylemMenusu
    tetik={tetik}
    eylem={{ etiket: 'Bağlantıyı kaldır', ikon: <Trash2 aria-hidden className="h-4 w-4 text-gray-600" /> }}
    onay={{
      soru: `${ad} ile bağlantını kaldırmak istiyor musun?`,
      aciklama: 'Paylaşımları akışında görünmeyi bırakır. Yeniden bağlanmak için tekrar istek göndermen gerekir.',
      dugme: 'Kaldır',
      islemdeDugme: 'Kaldırılıyor…',
    }}
    islemde={islemde}
    onOnayla={onKaldir}
  />
);
