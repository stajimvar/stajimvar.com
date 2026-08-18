import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Check, ExternalLink, Mail, Phone, X } from 'lucide-react';
import {
  approveCompanyClaim,
  fetchPendingClaims,
  rejectCompanyClaim,
  type CompanyClaim,
} from '../lib/queries';

/**
 * Yönetici onay kuyruğu.
 *
 * Sahiplenme talepleri buraya düşüyor. Onay bir insan kararı: kurumsal
 * e-postanın alan adıyla şirketin sitesi karşılaştırılıyor. Bu yüzden
 * her satırda ikisi de yan yana duruyor ve alan adları eşleşmiyorsa
 * uyarı çıkıyor — karar yine sende, ama gözden kaçmasın.
 */

interface AdminClaimsViewProps {
  onToast: (mesaj: string) => void;
}

/** E-posta alan adı ile şirket sitesinin alan adı örtüşüyor mu? */
function alanAdiUyuyor(eposta: string, site?: string): boolean | null {
  if (!site) return null;
  const epostaAlan = eposta.split('@')[1]?.toLowerCase();
  if (!epostaAlan) return null;
  try {
    const siteAlan = new URL(site.startsWith('http') ? site : `https://${site}`).hostname
      .toLowerCase()
      .replace(/^www\./, '');
    // "ik@arcelik.com.tr" ile "arcelik.com.tr" veya "kariyer.arcelik.com.tr"
    return epostaAlan === siteAlan || siteAlan.endsWith(`.${epostaAlan}`) || epostaAlan.endsWith(`.${siteAlan}`);
  } catch {
    return null;
  }
}

export const AdminClaimsView: React.FC<AdminClaimsViewProps> = ({ onToast }) => {
  const [talepler, setTalepler] = useState<CompanyClaim[]>([]);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [islemde, setIslemde] = useState<string | null>(null);
  const [redEden, setRedEden] = useState<string | null>(null);
  const [redSebebi, setRedSebebi] = useState('');

  const yukle = useCallback(() => {
    setDurum('yukleniyor');
    fetchPendingClaims()
      .then((t) => {
        setTalepler(t);
        setDurum('hazir');
      })
      .catch(() => setDurum('hata'));
  }, []);

  useEffect(yukle, [yukle]);

  const onayla = async (talep: CompanyClaim) => {
    setIslemde(talep.id);
    try {
      await approveCompanyClaim(talep.id);
      onToast(`${talep.companyName} sahiplenmesi onaylandı.`);
      setTalepler((p) => p.filter((x) => x.id !== talep.id));
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Onaylanamadı.');
    } finally {
      setIslemde(null);
    }
  };

  const reddet = async (talep: CompanyClaim) => {
    setIslemde(talep.id);
    try {
      await rejectCompanyClaim(talep.id, redSebebi.trim() || 'Belirtilmedi');
      onToast(`${talep.companyName} talebi reddedildi.`);
      setTalepler((p) => p.filter((x) => x.id !== talep.id));
      setRedEden(null);
      setRedSebebi('');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Reddedilemedi.');
    } finally {
      setIslemde(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
        <h1 className="text-lg font-bold text-gray-900">Sahiplenme talepleri</h1>
        <p className="text-xs text-gray-500 mt-1">
          Onayladığında kişi şirketin yetkilisi olur: ilan girebilir ve o şirkete gelen
          başvuruları görebilir. Kurumsal e-postanın şirketin alan adıyla eşleştiğini
          kontrol et.
        </p>
      </div>

      {durum === 'yukleniyor' && (
        <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" role="status" aria-label="Yükleniyor" />
      )}

      {durum === 'hata' && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 text-center space-y-2">
          <p className="font-bold text-rose-800">Talepler yüklenemedi</p>
          <button
            type="button"
            onClick={yukle}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 cursor-pointer"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {durum === 'hazir' && talepler.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Bekleyen talep yok.</p>
        </div>
      )}

      {talepler.map((t) => {
        const uyum = alanAdiUyuyor(t.workEmail, t.companyWebsite);
        return (
          <div key={t.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900">{t.companyName}</p>
                {t.companyWebsite && (
                  <a
                    href={t.companyWebsite}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    {t.companyWebsite.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="text-sm space-y-1 pl-13">
              <p className="font-semibold text-gray-900">
                {t.contactName}
                {t.contactTitle && <span className="font-normal text-gray-500"> · {t.contactTitle}</span>}
              </p>
              <p className="text-gray-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {t.workEmail}
              </p>
              {t.phone && (
                <p className="text-gray-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {t.phone}
                </p>
              )}
              {t.note && <p className="text-xs text-gray-500 pt-1">{t.note}</p>}
            </div>

            {/*
              Alan adı karşılaştırması yalnızca bir işaret, karar değil.
              Şirketin sitesi bilinmiyorsa hiçbir şey iddia edilmiyor.
            */}
            {uyum === false && (
              <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                E-posta alan adı şirketin sitesiyle eşleşmiyor. Onaylamadan önce doğrula.
              </p>
            )}
            {uyum === null && t.companyWebsite === undefined && (
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                Şirketin web sitesi kayıtlı değil; alan adı karşılaştırması yapılamadı.
              </p>
            )}

            {redEden === t.id ? (
              <div className="space-y-2">
                <input
                  value={redSebebi}
                  onChange={(e) => setRedSebebi(e.target.value)}
                  placeholder="Ret gerekçesi (talep sahibi görecek)"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-600"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={islemde === t.id}
                    onClick={() => reddet(t)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 cursor-pointer"
                  >
                    Reddet
                  </button>
                  <button
                    type="button"
                    onClick={() => setRedEden(null)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={islemde === t.id}
                  onClick={() => onayla(t)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Onayla
                </button>
                <button
                  type="button"
                  onClick={() => setRedEden(t.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Reddet
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
