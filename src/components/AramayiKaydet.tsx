import React from 'react';
import { BookmarkPlus } from 'lucide-react';
import {
  aramayiKaydet,
  fetchEslesmeIcinIlanlar,
  tabanKayitlariniYaz,
} from '../lib/queries';
import {
  FILTRE_SURUMU,
  RIZA_METNI,
  RIZA_METNI_SURUMU,
  aramaEslesiyorMu,
  filtreBosMu,
  filtreleriDogrula,
  ilaniNormalize,
} from '../lib/kayitli-arama.mjs';

/**
 * "BU ARAMAYI KAYDET"
 *
 * Yalnız filtre uygulanmışken görünüyor: boş bir aramayı kaydetmek
 * "bütün ilanlar" demek ve her gün her ilanı e-postalamak olurdu.
 *
 * E-POSTA VARSAYILAN KAPALI. Açılırsa rıza metni AÇIK biçimde
 * gösteriliyor ve sürümü kaydediliyor.
 *
 * İLK KAYITTA GEÇMİŞ GÖNDERİLMİYOR
 * --------------------------------
 * Kaydettiği anda eşleşen ilanlar TABAN olarak işaretleniyor
 * (`reason='baseline'`). Bu kayıtlar "gönderilmiş e-posta" sayılmıyor;
 * yalnız aday listesinin dışında kalıyorlar. Böylece ilk özet
 * geçmişin tamamını değil, bundan sonra gelenleri gönderiyor.
 */

interface AramayiKaydetProps {
  /** Listede o an uygulanmış filtreler (kanonik sözleşme). */
  filtreler: Record<string, unknown>;
  studentId: string | null;
  onToast: (mesaj: string) => void;
  /** Giriş yoksa çağrılıyor: kapı burada değil, çağıranda. */
  onGirisGerekli: () => void;
}

export const AramayiKaydet: React.FC<AramayiKaydetProps> = ({
  filtreler,
  studentId,
  onToast,
  onGirisGerekli,
}) => {
  const [acik, setAcik] = React.useState(false);
  const [ad, setAd] = React.useState('');
  /* VARSAYILAN KAPALI. */
  const [eposta, setEposta] = React.useState(false);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  /* Filtre yoksa işlem hiç çizilmiyor. */
  if (filtreBosMu(filtreler)) return null;

  const kaydet = async () => {
    if (!studentId) {
      onGirisGerekli();
      return;
    }
    setKaydediliyor(true);
    try {
      const dogrulanmis = filtreleriDogrula(filtreler);
      const arama = await aramayiKaydet({
        studentId,
        name: ad,
        filters: dogrulanmis,
        filtersVersion: FILTRE_SURUMU,
        emailEnabled: eposta,
        consentTextVersion: RIZA_METNI_SURUMU,
      });

      /*
        TABAN: aynı kanonik eşleşme fonksiyonu kullanılıyor — işçi ile
        aynı sonucu vermesi böyle garanti ediliyor.
      */
      try {
        const ilanlar = await fetchEslesmeIcinIlanlar();
        const eslesenler = ilanlar
          .filter((i) => aramaEslesiyorMu(ilaniNormalize(i), dogrulanmis))
          .map((i) => String(i.id));
        const yazilan = await tabanKayitlariniYaz(arama.id, eslesenler);
        onToast(
          eposta
            ? `Arama kaydedildi. Bugünkü ${yazilan} ilan taban sayıldı; yarından itibaren yeni eşleşmeleri e-postayla alacaksın.`
            : 'Arama kaydedildi. Günlük özet kapalı; ayarlardan açabilirsin.'
        );
      } catch {
        /*
          TABAN YAZILAMAZSA ARAMA YİNE KAYITLI

          Kullanıcı aramasını kaybetmesin. Ama bu durumda ilk özet
          geçmişi de içerebilir; mesaj bunu saklamıyor.
        */
        onToast('Arama kaydedildi. Taban işaretlenemedi; ilk özet eski ilanları da içerebilir.');
      }

      setAcik(false);
      setAd('');
      setEposta(false);
    } catch (hata) {
      onToast(hata instanceof Error ? hata.message : 'Arama kaydedilemedi.');
    } finally {
      setKaydediliyor(false);
    }
  };

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
      >
        <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
        Bu aramayı kaydet
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      <label className="block text-sm font-semibold text-gray-800" htmlFor="arama-adi">
        Aramaya bir ad ver <span className="font-normal text-gray-600">(isteğe bağlı)</span>
      </label>
      <input
        id="arama-adi"
        value={ad}
        onChange={(o) => setAd(o.target.value)}
        placeholder="Örn. İstanbul yazılım stajı"
        className="w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-gray-900"
      />

      {/*
        RIZA — VARSAYILAN KAPALI, METİN AÇIKÇA YAZILI

        Kutu işaretli gelseydi kullanıcı istemediği bir aboneliği
        farkında olmadan açardı.
      */}
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-700">
        <input
          type="checkbox"
          checked={eposta}
          onChange={(o) => setEposta(o.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
        />
        <span>{RIZA_METNI}</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={kaydet}
          disabled={kaydediliyor}
          className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
        >
          {kaydediliyor ? 'Kaydediliyor…' : 'Aramayı kaydet'}
        </button>
        <button
          type="button"
          onClick={() => setAcik(false)}
          className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
};
