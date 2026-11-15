import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useModalErisim } from '../lib/modal-erisim';
import { SILME_ONAYI, hesabimiSil, silmeHataMetni } from '../lib/hesap-silme';

/**
 * HESABIMI SİL — ONAY PENCERESİ (20270114010000)
 *
 * Geri dönüşü olmayan işlem; iki ayrı onay isteniyor: neyin silineceğini
 * okuduğunu söyleyen kutu ve "SİL" yazmak. Düğme ikisi de tamam olmadan
 * etkin değil. Silinecekler listesi kişinin türüne göre (öğrenci / şirket
 * üyesi); başvurulan şirketin de CV'yi artık göremeyeceği açıkça yazıyor.
 */
export const HesapSilmePenceresi: React.FC<{
  tur: 'ogrenci' | 'sirket';
  onKapat: () => void;
  /** Silme bitti: oturum kapatıldı; App yerel durumu temizleyip ana sayfaya döner. */
  onSilindi: (epostaGitti: boolean) => void;
}> = ({ tur, onKapat, onSilindi }) => {
  const [okudum, setOkudum] = useState(false);
  const [yazi, setYazi] = useState('');
  const [siliniyor, setSiliniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const kapat = () => {
    if (!siliniyor) onKapat();
  };
  const kutuRef = useModalErisim<HTMLDivElement>(true, kapat);

  const hazir = okudum && yazi.trim().toLocaleUpperCase('tr-TR') === SILME_ONAYI && !siliniyor;

  const sil = async () => {
    if (!hazir) return;
    setSiliniyor(true);
    setHata(null);
    const sonuc = await hesabimiSil();
    if ('eposta' in sonuc) {
      onSilindi(sonuc.eposta);
      return;
    }
    setHata(silmeHataMetni(sonuc));
    setSiliniyor(false);
  };

  const silinecekler =
    tur === 'sirket'
      ? [
          'Giriş hesabın ve profilin',
          'Şirket ekibindeki üyeliğin (şirket sayfası ve ilanlar şirkette kalır)',
          'Aday notların ve değerlendirmelerin şirkette kalır; adın onlardan kaldırılır',
          'Mesajların, paylaşımların ve bildirimlerin',
        ]
      : [
          'Giriş hesabın ve profilin',
          'CV’n, fotoğrafın ve yüklediğin dosyalar',
          'Bütün başvuruların — başvurduğun şirketler de artık göremez',
          'Paylaşımların, mesajların, bağlantıların ve kaydettiklerin',
        ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={kapat}>
      <div
        ref={kutuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hesap-silme-basligi"
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-xl sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2 id="hesap-silme-basligi" className="text-xl font-extrabold leading-snug text-gray-900">
              Hesabını sil
            </h2>
          </div>
          <button
            type="button"
            onClick={kapat}
            disabled={siliniyor}
            aria-label="Kapat"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
          <p className="text-sm leading-6 text-gray-700">
            Bu işlem <strong>geri alınamaz</strong>. Şunlar kalıcı olarak silinir:
          </p>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {silinecekler.map((s) => (
              <li key={s} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-gray-600">
            Silindikten sonra e-posta adresine bir bilgi e-postası gönderilir. Aynı adresle istediğin zaman yeni bir
            hesap açabilirsin.
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3">
            <input
              type="checkbox"
              checked={okudum}
              onChange={(e) => setOkudum(e.target.checked)}
              disabled={siliniyor}
              className="mt-0.5 h-5 w-5 shrink-0 accent-red-600"
            />
            <span className="text-sm text-gray-800">Neyin silineceğini okudum; hesabımın kalıcı olarak silinmesini istiyorum.</span>
          </label>

          <div>
            <label htmlFor="hesap-silme-onayi" className="block text-sm font-semibold text-gray-800">
              Onaylamak için <span className="font-black">SİL</span> yaz
            </label>
            <input
              id="hesap-silme-onayi"
              value={yazi}
              onChange={(e) => setYazi(e.target.value)}
              disabled={siliniyor}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 text-base"
            />
          </div>

          {hata && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {hata}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={kapat}
            disabled={siliniyor}
            className="min-h-11 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => void sil()}
            disabled={!hazir}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {siliniyor && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {siliniyor ? 'Hesabın siliniyor…' : 'Hesabımı kalıcı olarak sil'}
          </button>
        </div>
      </div>
    </div>
  );
};
