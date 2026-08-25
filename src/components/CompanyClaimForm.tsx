import React, { useEffect, useState } from 'react';
import { BadgeCheck, Building2, Check, Clock, X } from 'lucide-react';
import { createCompanyClaim, fetchMyClaim, type CompanyClaim } from '../lib/queries';

/**
 * "Bu şirketin yetkilisi misiniz?" formu.
 *
 * NEDEN BU AKIŞ
 * -------------
 * İlanları şirketlerin kendi kariyer sayfalarından derliyoruz; şirketin
 * haberi yok. Şirket bizi ancak kendi adını aradığında buluyor — davet
 * e-postası gönderemiyoruz (İYS kaydı tüzel kişilik istiyor, henüz yok).
 * Bu yüzden sahiplenme çağrısı şirketin kendi sayfasında duruyor.
 *
 * NEDEN DOĞRUDAN DEĞİL
 * --------------------
 * Sahiplenme, kişiye şirketin ilanları ve gelen başvurular üzerinde yetki
 * veriyor. Otomatik vermek, "kurumsal e-postam var" diyen herkese başka bir
 * şirketin başvurularını açmak olurdu. Talep bırakılıyor, yönetici
 * onaylıyor.
 */

interface CompanyClaimFormProps {
  companyId: string;
  companyName: string;
  /** Giriş yapmamışsa null; o durumda forma değil giriş çağrısına yer veriliyor. */
  userId: string | null;
  userEmail?: string;
  onRequireLogin: () => void;
}

const alanClass =
  'w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 transition-colors';
const etiketClass = 'block text-xs font-semibold text-gray-600 mb-1.5';

export const CompanyClaimForm: React.FC<CompanyClaimFormProps> = ({
  companyId,
  companyName,
  userId,
  userEmail,
  onRequireLogin,
}) => {
  const [acik, setAcik] = useState(false);
  const [mevcut, setMevcut] = useState<CompanyClaim | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const [ad, setAd] = useState('');
  const [unvan, setUnvan] = useState('');
  const [eposta, setEposta] = useState(userEmail ?? '');
  const [telefon, setTelefon] = useState('');
  const [not, setNot] = useState('');

  /* Daha önce talep açılmışsa formu değil durumu göster. */
  useEffect(() => {
    if (!userId) return;
    let iptal = false;
    setYukleniyor(true);
    fetchMyClaim(companyId, userId)
      .then((t) => {
        if (!iptal) setMevcut(t);
      })
      .catch(() => {
        /* Talep durumu okunamazsa form yine açılabilir; engel değil. */
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [companyId, userId]);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setHata(null);
    setGonderiliyor(true);
    try {
      await createCompanyClaim({
        companyId,
        userId,
        contactName: ad,
        contactTitle: unvan,
        workEmail: eposta,
        phone: telefon,
        note: not,
      });
      setMevcut({
        id: 'yeni',
        companyId,
        companyName,
        companySlug: '',
        contactName: ad,
        workEmail: eposta,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setAcik(false);
    } catch (error) {
      setHata(error instanceof Error ? error.message : 'Talep gönderilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  };

  if (yukleniyor) return null;

  /* ---- Daha önce talep açılmış ---- */
  if (mevcut && mevcut.status === 'pending') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm text-amber-900">Talebiniz inceleniyor</p>
          <p className="text-xs text-amber-800">
            {companyName} için sahiplenme talebiniz alındı. Onaylandığında şirket
            profilini düzenleyebilir ve ilan girebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  if (mevcut && mevcut.status === 'approved') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
        <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-emerald-900">
          Bu şirketin yetkilisisiniz. Şirket portalından ilan girebilirsiniz.
        </p>
      </div>
    );
  }

  /* ---- Giriş yapılmamış ---- */
  if (!userId) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <p className="font-bold text-sm text-gray-900">Bu şirketin yetkilisi misiniz?</p>
        </div>
        <p className="text-xs text-gray-600">
          Şirket profilinizi sahiplenip ilanlarınızı doğrudan buradan yayınlayabilirsiniz.
          Devam etmek için giriş yapmanız gerekiyor.
        </p>
        <button
          type="button"
          onClick={onRequireLogin}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          Giriş yap
        </button>
      </div>
    );
  }

  /* ---- Form kapalı ---- */
  if (!acik) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <p className="font-bold text-sm text-gray-900">Bu şirketin yetkilisi misiniz?</p>
        </div>
        <p className="text-xs text-gray-600">
          {mevcut?.status === 'rejected'
            ? 'Önceki talebiniz onaylanmadı. Bilgilerinizi güncelleyip tekrar başvurabilirsiniz.'
            : `${companyName} profilini sahiplenin; ilanlarınızı doğrudan buradan yayınlayın.`}
        </p>
        {mevcut?.rejectReason && (
          <p className="text-xs text-gray-500">Gerekçe: {mevcut.rejectReason}</p>
        )}
        <button
          type="button"
          onClick={() => setAcik(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          Sahiplenme talebi gönder
        </button>
      </div>
    );
  }

  /* ---- Form açık ---- */
  return (
    <form onSubmit={gonder} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-gray-900">{companyName} — sahiplenme talebi</p>
        <button
          type="button"
          onClick={() => setAcik(false)}
          aria-label="Formu kapat"
          className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className={etiketClass} htmlFor="claim-ad">Ad Soyad</label>
        <input id="claim-ad" required value={ad} onChange={(e) => setAd(e.target.value)} className={alanClass} />
      </div>

      <div>
        <label className={etiketClass} htmlFor="claim-unvan">Görev / unvan</label>
        <input
          id="claim-unvan"
          value={unvan}
          onChange={(e) => setUnvan(e.target.value)}
          placeholder="İnsan Kaynakları Uzmanı"
          className={alanClass}
        />
      </div>

      <div>
        <label className={etiketClass} htmlFor="claim-eposta">Kurumsal e-posta</label>
        <input
          id="claim-eposta"
          type="email"
          required
          value={eposta}
          onChange={(e) => setEposta(e.target.value)}
          placeholder={`ad.soyad@${companyName.toLocaleLowerCase('tr').replace(/[^a-z0-9]/g, '')}.com`}
          className={alanClass}
        />
        <p className="text-[11px] text-gray-600 mt-1">
          Şirketin kendi alan adındaki adres olmalı; talebi bununla doğruluyoruz.
        </p>
      </div>

      <div>
        <label className={etiketClass} htmlFor="claim-telefon">Telefon</label>
        <input
          id="claim-telefon"
          type="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          className={alanClass}
        />
      </div>

      <div>
        <label className={etiketClass} htmlFor="claim-not">Eklemek istediğiniz bir şey</label>
        <textarea
          id="claim-not"
          rows={2}
          value={not}
          onChange={(e) => setNot(e.target.value)}
          className={alanClass}
        />
      </div>

      {hata && <p className="text-xs text-rose-600 font-semibold">{hata}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={gonderiliyor || !ad.trim() || !eposta.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
        >
          {gonderiliyor ? 'Gönderiliyor…' : 'Talebi gönder'}
        </button>
        <span className="text-[11px] text-gray-600 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Bilgileriniz yalnızca doğrulama için kullanılır
        </span>
      </div>
    </form>
  );
};
