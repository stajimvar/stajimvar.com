import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import type { InternshipListing } from '../types';
import { basvuruYolu } from '../lib/basvuru-yolu.mjs';
import { useModalErisim } from '../lib/modal-erisim';

/**
 * StajımVar üzerinden başvuru.
 *
 * En kritik nokta dürüstlük: başvuru şirkete iletilmiyorsa bu diyalog bunu
 * açıkça söylüyor. Öğrenci "başvurdum" sanıp beklerse stajı kaçırır —
 * sitenin yapabileceği en kötü hata bu.
 *
 * Ne olduğunun kararı burada verilmiyor, lib/basvuru-yolu.mjs'ten geliyor;
 * kart, ilan detayı ve bu diyalog aynı cümleyi kuruyor.
 *
 * Açık rıza yalnızca gerçekten aktarım yapılan yöntemlerde isteniyor.
 * Aktarım yokken onay kutusu göstermek, olmayan bir veri aktarımına rıza
 * toplamak olurdu.
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

  const yol = basvuruYolu(listing);
  const rizaGerekli = yol.teslimEdiliyor;

  /* Odak yönetimi, ESC, focus trap ve arka plan kilidi. */
  const kutuRef = useModalErisim<HTMLDivElement>(true, onClose);

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
    >
      <div
        ref={kutuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="basvuru-diyalog-basligi"
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-gray-200 shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-600">
              {listing.companyName}
            </p>
            <h2 id="basvuru-diyalog-basligi" className="text-lg font-bold text-gray-900 leading-snug">
              {listing.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {alreadyApplied ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-bold text-emerald-900">
                {rizaGerekli
                  ? 'Bu ilana zaten başvurdun.'
                  : 'Bu ilanı zaten işaretlemiştin.'}
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {rizaGerekli
                  ? 'Başvurun başvuru listende; durumu değiştiğinde orada görürsün.'
                  : 'Kayıt başvuru listende duruyor. Bu kayıt şirkete gönderilmedi; resmî sayfadan başvurmadıysan aşağıdaki bağlantıyı kullan.'}
              </p>
            </div>
          ) : (
            <>
              {/* Ne olacağını adım adım söyle. */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-900">
                  {rizaGerekli ? 'Başvurunca ne olacak?' : 'İşaretleyince ne olacak?'}
                </p>
                <ol className="space-y-2.5 text-sm text-gray-600">
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      1
                    </span>
                    <span>
                      {rizaGerekli
                        ? "Başvurun StajımVar'a kaydedilir ve panelinden takip edebilirsin."
                        : 'Bu ilan panelindeki başvuru listene eklenir; hangi ilana başvurduğunu takip edebilirsin.'}
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      2
                    </span>
                    <span>
                      {rizaGerekli
                        ? 'Profilin ve iletişim bilgilerin, şirketin doğrulanmış başvuru kanalına iletilir.'
                        : 'Bilgilerin şirkete iletilmez ve şirketle paylaşılmaz.'}
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      3
                    </span>
                    <span>
                      {rizaGerekli
                        ? 'Şirketin cevabı geldiğinde başvurunun durumu panelinde güncellenir.'
                        : 'Gerçek başvuru şirketin kendi sayfasından yapılır — aşağıdaki bağlantı oraya götürür.'}
                    </span>
                  </li>
                </ol>
              </div>

              {!rizaGerekli && (
                /*
                  Bu uyarı olmazsa öğrenci başvurusunun şirkete ulaştığını sanır.
                  Ulaşmıyor: doğrulanmış bir başvuru kanalı yok.
                */
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-amber-900">
                      Bu kayıt şirkete başvuru göndermez.
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {yol.ozet} Stajı kaçırmamak için{' '}
                      <strong>resmî sayfadan başvurmayı unutma</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* KVKK açık rızası — yalnızca gerçekten aktarım yapılıyorsa */}
              {rizaGerekli && (
              <label className="flex gap-2.5 items-start cursor-pointer rounded-2xl border border-gray-200 p-3.5 hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  Profilimin ve iletişim bilgilerimin, <strong>yalnızca doğrulanmış</strong>{' '}
                  başvuru kanalı üzerinden {listing.companyName} ile paylaşılmasına izin
                  veriyorum.{' '}
                  <a
                    href="/kvkk-aydinlatma-metni"
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Aydınlatma metni
                  </a>
                </span>
              </label>
              )}

              {error && (
                <p role="alert" aria-live="assertive" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="p-5 sm:p-6 pt-0 flex flex-col sm:flex-row gap-2.5">
          {yol.resmiAdres && (
            <a
              href={yol.resmiAdres}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                rizaGerekli
                  ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  : 'text-white bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {rizaGerekli ? 'İlana git' : 'Resmî sitede başvur'}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {!alreadyApplied && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={(rizaGerekli && !consent) || busy}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed ${
                rizaGerekli
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Kaydediliyor
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {rizaGerekli ? 'StajımVar ile Başvur' : 'Başvurduğumu işaretle'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
