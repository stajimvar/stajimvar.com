import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Yatay küre şeritlerinin kaydırma kabı.
 *
 * NEDEN
 * -----
 * Şeritler `overflow-x-auto` ve kaydırma çubuğu gizli. Telefonda parmakla
 * kayıyor; masaüstünde ise fare tekerleği dikey çalıştığı ve çubuk
 * görünmediği için şerit hiç kıpırdamıyordu (kullanıcı bildirdi, 17 Eylül
 * 2026). Bu kap üç yol ekliyor:
 *
 *   1. Tekerlek: şerit kayabildiği sürece dikey tekerlek yatay kaydırıyor;
 *      uca gelince sayfa normal kaymaya devam ediyor.
 *   2. Sürükleme: fareyle basılı tutup çekmek. Sürükleme sonrası tıklama
 *      yutuluyor ki küre yanlışlıkla seçilmesin.
 *   3. Oklar: yalnız fareli (hover destekli) cihazlarda ve yalnız o yönde
 *      kaydırılacak içerik varken.
 *
 * Dokunmatikte hiçbir şey değişmiyor: tarayıcının kendi kaydırması duruyor.
 */
export const YatayKaydirma: React.FC<{
  /** Kaydırılan kabın sınıfları (ör. `SERIT.ic`). */
  className: string;
  children: React.ReactNode;
}> = ({ className, children }) => {
  const kap = React.useRef<HTMLDivElement>(null);
  const [solaVar, setSolaVar] = React.useState(false);
  const [sagaVar, setSagaVar] = React.useState(false);

  const olc = React.useCallback(() => {
    const el = kap.current;
    if (!el) return;
    setSolaVar(el.scrollLeft > 2);
    setSagaVar(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    const el = kap.current;
    if (!el) return;
    olc();

    const tekerlek = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const sona = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      const basa = el.scrollLeft <= 0;
      if ((e.deltaY > 0 && sona) || (e.deltaY < 0 && basa)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    let basX = 0;
    let basKaydirma = 0;
    let basili = false;
    let surukledi = false;
    const bas = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      basili = true;
      surukledi = false;
      basX = e.clientX;
      basKaydirma = el.scrollLeft;
    };
    const hareket = (e: PointerEvent) => {
      if (!basili) return;
      const fark = e.clientX - basX;
      if (!surukledi && Math.abs(fark) < 6) return;
      surukledi = true;
      el.scrollLeft = basKaydirma - fark;
    };
    const birak = () => {
      if (!basili) return;
      basili = false;
      if (surukledi) {
        const yut = (olay: MouseEvent) => {
          olay.preventDefault();
          olay.stopPropagation();
        };
        el.addEventListener('click', yut, { capture: true, once: true });
        window.setTimeout(() => el.removeEventListener('click', yut, { capture: true }), 0);
      }
    };

    /* Logo görselleri sürüklenince tarayıcı kendi "resmi taşı" işlemini başlatıp sürüklemeyi kesiyordu. */
    const resimSurukleme = (e: DragEvent) => e.preventDefault();

    el.addEventListener('wheel', tekerlek, { passive: false });
    el.addEventListener('dragstart', resimSurukleme);
    el.addEventListener('pointerdown', bas);
    window.addEventListener('pointermove', hareket);
    window.addEventListener('pointerup', birak);
    el.addEventListener('scroll', olc, { passive: true });
    const gozlemci = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(olc) : null;
    gozlemci?.observe(el);
    if (el.firstElementChild) gozlemci?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('wheel', tekerlek);
      el.removeEventListener('dragstart', resimSurukleme);
      el.removeEventListener('pointerdown', bas);
      window.removeEventListener('pointermove', hareket);
      window.removeEventListener('pointerup', birak);
      el.removeEventListener('scroll', olc);
      gozlemci?.disconnect();
    };
  }, [olc]);

  const kaydir = (yon: 1 | -1) => {
    const el = kap.current;
    if (!el) return;
    el.scrollBy({ left: yon * Math.max(160, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  const OK =
    'absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-slate-800 shadow-sm hover:bg-gray-50 [@media(hover:hover)]:flex';

  return (
    <div className="relative">
      <div ref={kap} className={className}>
        {children}
      </div>
      {solaVar && (
        <button type="button" onClick={() => kaydir(-1)} aria-label="Sola kaydır" className={`${OK} left-1`}>
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </button>
      )}
      {sagaVar && (
        <button type="button" onClick={() => kaydir(1)} aria-label="Sağa kaydır" className={`${OK} right-1`}>
          <ChevronRight aria-hidden className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
