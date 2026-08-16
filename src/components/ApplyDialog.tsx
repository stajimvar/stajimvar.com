import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import type { InternshipListing } from '../types';

/**
 * StajımVar üzerinden başvuru.
 *
 * En kritik nokta dürüstlük: `external` ilanlarda başvuruyu şirkete HEMEN
 * iletemiyoruz, çünkü şirketin doğrulanmış bir başvuru kanalı yok. Öğrenci
 * "başvurdum" sanıp beklerse stajı kaçırır — sitenin yapabileceği en kötü
 * hata bu. Bu yüzden diyalog ne olacağını açıkça yazıyor ve ilana doğrudan
 * gitme bağlantısını da aynı ekranda tutuyor.
 */

interface ApplyDialogProps {
  listing: InternshipListing;
  /** Zaten başvurulmuşsa diyalog yalnızca durumu gösterir. */
  alreadyApplied: boolean;
  onClose: () => void;
  onSubmit: (consent: boolean) => Promise<void>;
}

export const ApplyDialog: React.FC<ApplyDialogProps> = ({
  listing,
  alreadyApplied,
  onClose,
  onSubmit,
}) => {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExternal = listing.applicationMethod === 'external';

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await onSubmit(consent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Başvuru gönderilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-gray-100 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {listing.companyName}
            </p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
              {listing.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {alreadyApplied ? (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Bu ilana zaten başvurdun.
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                Başvurun "Başvurularım" sekmesinde. Şirketin kendi sayfasından da
                başvurmak istersen aşağıdaki bağlantıyı kullanabilirsin.
              </p>
            </div>
          ) : (
            <>
              {/* Ne olacağını adım adım söyle. */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Başvurunca ne olacak?
                </p>
                <ol className="space-y-2.5 text-sm text-gray-600 dark:text-slate-300">
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      1
                    </span>
                    <span>Başvurun StajımVar'a kaydedilir ve panelinden takip edebilirsin.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      2
                    </span>
                    <span>
                      Bu ilana gelen talebi şirkete bildiririz ve başvuru kanallarını
                      doğrulamalarını isteriz.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      3
                    </span>
                    <span>
                      Şirket kanalını doğrulayınca profilini ve iletişim bilgilerini
                      onlara iletiriz.
                    </span>
                  </li>
                </ol>
              </div>

              {isExternal && (
                /*
                  Bu uyarı olmazsa öğrenci başvurusunun şirkete ulaştığını sanır.
                  Ulaşmıyor — henüz doğrulanmış bir kanal yok.
                */
                <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Bu başvuru şirkete henüz iletilmiyor.
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      Bu ilanın başvuruları şirketin kendi sisteminden alınıyor. Stajı
                      kaçırmamak için <strong>ilana doğrudan da başvurmanı öneririz</strong>;
                      StajımVar kaydın, şirketi buraya davet etmemizi sağlıyor.
                    </p>
                  </div>
                </div>
              )}

              {/* KVKK açık rızası */}
              <label className="flex gap-2.5 items-start cursor-pointer rounded-2xl border border-gray-200 dark:border-slate-800 p-3.5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
                />
                <span className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                  Profilimin ve iletişim bilgilerimin, <strong>yalnızca doğrulanmış</strong>{' '}
                  başvuru kanalı üzerinden {listing.companyName} ile paylaşılmasına izin
                  veriyorum.{' '}
                  <a
                    href="/kvkk-aydinlatma-metni"
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Aydınlatma metni
                  </a>
                </span>
              </label>

              {error && (
                <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl p-3">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="p-5 sm:p-6 pt-0 flex flex-col sm:flex-row gap-2.5">
          {listing.applyUrl && (
            <a
              href={listing.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              İlana git
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {!alreadyApplied && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!consent || busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Gönderiliyor
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  StajımVar ile Başvur
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
