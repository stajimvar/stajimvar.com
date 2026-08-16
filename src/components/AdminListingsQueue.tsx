import React, { useCallback, useEffect, useState } from 'react';
import { Check, MapPin, X } from 'lucide-react';
import {
  archiveListing,
  fetchPendingListings,
  publishListing,
  type PendingListing,
} from '../lib/queries';

/**
 * Şirketlerin girdiği ilanların onay kuyruğu.
 *
 * Yalnızca `origin = 'internal'` ilanlar buraya düşüyor. Otomasyonun
 * derledikleri kuyruğa girmiyor: onlar zaten şirketin kendi kariyer
 * sayfasında yayınlanmış, ikinci kez onaylamak hem anlamsız hem de
 * kuyruğu kullanılamaz hale getirirdi.
 *
 * Reddedilen ilan silinmiyor, arşivleniyor — şirket ne olduğunu görebilmeli.
 */

interface AdminListingsQueueProps {
  onToast: (mesaj: string) => void;
}

/** İlan kurallarına aykırı olabilecek ifadeler için basit bir işaretleyici. */
const RISKLI = [
  { kalip: /(ücret|ödeme|bedel|katılım payı|kayıt ücreti)\s*(talep|iste|alın)/i, uyari: 'Adaydan ücret isteniyor olabilir' },
  { kalip: /\b(kefil|senet|teminat)\b/i, uyari: 'Teminat / kefil ifadesi geçiyor' },
  { kalip: /\b(whatsapp|telegram)\b/i, uyari: 'Başvuru mesajlaşma uygulamasına yönlendiriliyor' },
  { kalip: /\b(mlm|network marketing|ikili sistem)\b/i, uyari: 'Ağ pazarlaması şüphesi' },
];

function riskleriBul(ilan: PendingListing): string[] {
  const metin = `${ilan.title} ${ilan.description ?? ''}`;
  return RISKLI.filter((r) => r.kalip.test(metin)).map((r) => r.uyari);
}

export const AdminListingsQueue: React.FC<AdminListingsQueueProps> = ({ onToast }) => {
  const [ilanlar, setIlanlar] = useState<PendingListing[]>([]);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [islemde, setIslemde] = useState<string | null>(null);

  const yukle = useCallback(() => {
    setDurum('yukleniyor');
    fetchPendingListings()
      .then((v) => {
        setIlanlar(v);
        setDurum('hazir');
      })
      .catch(() => setDurum('hata'));
  }, []);

  useEffect(yukle, [yukle]);

  const uygula = async (ilan: PendingListing, yayinla: boolean) => {
    setIslemde(ilan.id);
    try {
      if (yayinla) {
        await publishListing(ilan.id);
        onToast(`"${ilan.title}" yayına alındı.`);
      } else {
        await archiveListing(ilan.id);
        onToast(`"${ilan.title}" arşivlendi.`);
      }
      setIlanlar((p) => p.filter((x) => x.id !== ilan.id));
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'İşlem başarısız.');
    } finally {
      setIslemde(null);
    }
  };

  if (durum === 'yukleniyor') {
    return <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" role="status" aria-label="Yükleniyor" />;
  }

  if (durum === 'hata') {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-5 text-center space-y-2">
        <p className="font-bold text-rose-800">İlanlar yüklenemedi</p>
        <button
          type="button"
          onClick={yukle}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 cursor-pointer"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (ilanlar.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">Onay bekleyen ilan yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ilanlar.map((ilan) => {
        const riskler = riskleriBul(ilan);
        return (
          <div key={ilan.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-blue-600">{ilan.companyName}</p>
              <h3 className="font-bold text-gray-900">{ilan.title}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-100">
                <MapPin className="w-3.5 h-3.5" />
                {ilan.city || 'Konum belirtilmemiş'} ({ilan.workType})
              </span>
              {ilan.isPaid && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                  {ilan.stipendText || 'Ücretli'}
                </span>
              )}
              {ilan.applicationDeadline && (
                <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">
                  Son: {ilan.applicationDeadline}
                </span>
              )}
            </div>

            {ilan.description && (
              <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-6">{ilan.description}</p>
            )}

            {ilan.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ilan.requiredSkills.map((y) => (
                  <span key={y} className="px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-semibold text-gray-600">
                    {y}
                  </span>
                ))}
              </div>
            )}

            {/*
              İlan kurallarında "adaydan ücret isteyen ilan yayınlanmaz" yazıyor
              ama uygulayacak bir mekanizma yoktu. Bu liste karar vermiyor,
              yalnızca gözden kaçmasın diye işaret koyuyor.
            */}
            {riskler.length > 0 && (
              <ul className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
                {riskler.map((r) => (
                  <li key={r}>⚠ {r}</li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={islemde === ilan.id}
                onClick={() => uygula(ilan, true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Yayına al
              </button>
              <button
                type="button"
                disabled={islemde === ilan.id}
                onClick={() => uygula(ilan, false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                <X className="w-4 h-4" /> Reddet
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
