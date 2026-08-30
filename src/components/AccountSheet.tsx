import React from 'react';
import { createPortal } from 'react-dom';
import { Award, Building2, LogOut, Send, Settings, User } from 'lucide-react';
import type { StudentProfile } from '../types';
import { Avatar } from './Avatar';

export type AccountSheetCloseReason = 'dismiss' | 'escape' | 'programmatic';

interface AccountSheetProps {
  open: boolean;
  student: StudentProfile;
  applicationsCount: number;
  isAdmin: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onRequestClose: (reason: AccountSheetCloseReason) => void;
  onOpenProfile: () => void;
  onOpenApplications: () => void;
  onOpenBadges: () => void;
  onOpenAdmin?: () => void;
  /*
    ŞİRKET PANELİNE DÖNÜŞ

    Şirket üyesi öğrenci görünümüne geçtiğinde geri dönecek görünür bir
    yol kalmıyordu; kullanıcı çıkış yapmak ya da tarayıcı geri tuşuna
    basmak zorundaydı. Satır YALNIZCA üyelik varsa çiziliyor — normal
    öğrenciye işveren bağlantısı gösterilmiyor.
  */
  sirketUyesiMi?: boolean;
  onIsverenPaneli?: () => void;
  onLogout?: () => void;
}

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobil hesap menüsü.
 *
 * Header içindeki `backdrop-filter`, iOS ve bazı WebKit sürümlerinde sabit
 * çocuklar için containing block olabildiğinden, bu bileşen görsel olarak
 * Header'a ait olsa da DOM'da doğrudan body'ye portal edilir.
 */
export const AccountSheet: React.FC<AccountSheetProps> = ({
  open,
  student,
  applicationsCount,
  isAdmin,
  triggerRef,
  onRequestClose,
  onOpenProfile,
  onOpenApplications,
  onOpenBadges,
  onOpenAdmin,
  sirketUyesiMi,
  onIsverenPaneli,
  onLogout,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onRequestCloseRef = React.useRef(onRequestClose);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  /*
    Kapatma callback'i her Header render'ında değişebilir. Onu effect
    bağımlılığı yapmak, açık panelin focus/scroll effect'ini her render'da
    söküp yeniden kurar; ref bunun yerine en güncel callback'i tutar.
  */
  React.useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  React.useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const odaklanabilirleriBul = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(ODAKLANABILIR)).filter(
        (element) => element.getClientRects().length > 0
      );

    const ilkOgeyeOdaklan = () => {
      const ilkAnlamliOge = panel.querySelector<HTMLElement>('[data-account-sheet-initial-focus]');
      const ilkOdaklanabilir = odaklanabilirleriBul()[0];
      (ilkAnlamliOge ?? ilkOdaklanabilir ?? panel).focus();
    };

    const focusFrame = window.requestAnimationFrame(ilkOgeyeOdaklan);

    const tusaBas = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onRequestCloseRef.current('escape');
        return;
      }

      if (event.key !== 'Tab') return;

      const odaklanabilirler = odaklanabilirleriBul();
      if (odaklanabilirler.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const ilk = odaklanabilirler[0];
      const son = odaklanabilirler[odaklanabilirler.length - 1];
      const aktifOge = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (aktifOge === ilk || !panel.contains(aktifOge))) {
        event.preventDefault();
        son.focus();
      } else if (!event.shiftKey && (aktifOge === son || !panel.contains(aktifOge))) {
        event.preventDefault();
        ilk.focus();
      }
    };

    /*
      body overflow'unu değiştirmiyoruz: bu proje iOS'ta body'yi scroll
      container'a çevirmenin fixed öğeleri belgeye bağladığını belgeledi.
      Bunun yerine panel dışından gelen gerçek wheel/touch hareketlerini
      yakalayıp engelliyoruz; panelin kendi iç kaydırması serbest kalıyor.
    */
    const arkaPlanKaydirmasiniEngelle = (event: Event) => {
      if (!panel.contains(event.target as Node)) event.preventDefault();
    };

    document.addEventListener('keydown', tusaBas);
    document.addEventListener('wheel', arkaPlanKaydirmasiniEngelle, {
      capture: true,
      passive: false,
    });
    document.addEventListener('touchmove', arkaPlanKaydirmasiniEngelle, {
      capture: true,
      passive: false,
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', tusaBas);
      document.removeEventListener('wheel', arkaPlanKaydirmasiniEngelle, true);
      document.removeEventListener('touchmove', arkaPlanKaydirmasiniEngelle, true);
      window.requestAnimationFrame(() => {
        const trigger = triggerRef.current;
        if (trigger && document.contains(trigger)) trigger.focus();
      });
    };
  }, [open, triggerRef]);

  if (!mounted || !open) return null;

  return createPortal(
    <div data-testid="account-sheet-portal" className="lg:hidden fixed inset-0 z-[100]">
      <button
        type="button"
        data-testid="account-sheet-backdrop"
        aria-label="Hesap menüsünü kapat"
        onClick={() => onRequestClose('dismiss')}
        className="fixed inset-0 w-full h-full bg-slate-950/45 backdrop-blur-[1px] touch-none cursor-default"
      />

      <div
        ref={panelRef}
        id="mobile-account-sheet"
        data-testid="account-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-sheet-title"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 max-h-[min(34rem,calc(100dvh-env(safe-area-inset-bottom)))] overflow-y-auto overscroll-contain rounded-t-[2rem] border-t border-x border-gray-200 bg-white shadow-[0_-20px_50px_rgba(15,23,42,0.24)] pb-[max(1rem,env(safe-area-inset-bottom))] touch-pan-y"
      >
        <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2">
          <span aria-hidden="true" className="h-1.5 w-11 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-4 flex items-center gap-3">
          <Avatar
            name={student.fullName}
            url={student.avatarUrl || undefined}
            className="w-12 h-12 rounded-full shrink-0 ring-1 ring-blue-500/30 text-base"
          />
          <div className="min-w-0 flex-1">
            <h2 id="account-sheet-title" className="truncate text-base font-extrabold text-gray-900">
              {student.fullName}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500">Öğrenci hesabı</span>
              {isAdmin && (
                <span
                  data-testid="account-sheet-admin-badge"
                  className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-extrabold text-violet-700 ring-1 ring-inset ring-violet-200"
                >
                  Yönetici
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-gray-100" />

        <div className="px-3 py-2 text-sm text-gray-800">
          <button
            type="button"
            data-testid="account-sheet-profile"
            data-account-sheet-initial-focus
            onClick={onOpenProfile}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-semibold transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <User className="h-5 w-5 shrink-0 text-gray-400" />
            <span>Profilim ve CV</span>
          </button>

          <button
            type="button"
            data-testid="account-sheet-applications"
            onClick={onOpenApplications}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-semibold transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Send className="h-5 w-5 shrink-0 text-gray-400" />
            <span className="min-w-0 flex-1">Başvurularım</span>
            <span
              data-testid="account-sheet-applications-badge"
              aria-label={`${applicationsCount} başvuru`}
              className="inline-flex min-w-6 items-center justify-center rounded-full bg-teal-600 px-2 py-0.5 text-xs font-extrabold tabular-nums text-white"
            >
              {applicationsCount}
            </span>
          </button>

          <button
            type="button"
            data-testid="account-sheet-badges"
            onClick={onOpenBadges}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-semibold transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Award className="h-5 w-5 shrink-0 text-gray-400" />
            <span>Rozetler ve testler</span>
          </button>

          {sirketUyesiMi && onIsverenPaneli && (
            <button
              type="button"
              data-testid="account-sheet-isveren"
              onClick={onIsverenPaneli}
              /* min-h-11 = 44px dokunma hedefi. */
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold transition-colors hover:bg-[#E6F0EA] focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: '#2B7357' }}
            >
              <Building2 className="h-5 w-5 shrink-0" />
              <span>İşveren paneline geç</span>
            </button>
          )}

          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              data-testid="account-sheet-admin"
              onClick={onOpenAdmin}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span>Yönetim paneli</span>
            </button>
          )}
        </div>

        <div className="mx-4 border-t border-gray-100" />

        <div className="px-3 pt-2">
          <button
            type="button"
            data-testid="account-sheet-logout"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Çıkış yap</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
