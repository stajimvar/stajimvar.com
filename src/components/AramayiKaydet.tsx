import React from 'react';
import { BookmarkPlus } from 'lucide-react';
import {
  aramayiKaydet,
  fetchEslesmeIcinIlanlar,
  tabanKayitlariniYaz,
} from '../lib/queries';
import {
  FILTRE_SURUMU,
  KAYDEDILMEYEN_FILTRELER,
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

/**
 * KAYDEDİLEN FİLTRELERİN OKUNABİLİR LİSTESİ
 *
 * Kullanıcı neyin kaydedildiğini görmeden kaydetmesin: ekranda beş
 * filtre uygulanmışken üçünün kaydedildiğini fark etmemek, e-postanın
 * beklediğinden farklı sonuç göndermesi demek.
 */
export function kaydedilenler(filtreler: unknown): string[] {
  const f = filtreleriDogrula(filtreler);
  const liste: string[] = [];
  if (f.q) liste.push(`Arama: “${f.q}”`);
  if (f.country === 'remote') liste.push('Uzaktan (Remote)');
  else if (f.country !== 'all') liste.push(`Ülke: ${f.country}`);
  if (f.city !== 'all') liste.push(`Şehir: ${f.city}`);
  if (f.workTypes.length) liste.push(`Çalışma biçimi: ${f.workTypes.join(', ')}`);
  if (f.companies.length) liste.push(`Şirket: ${f.companies.join(', ')}`);
  if (f.postedWithinDays !== null) liste.push(`Son ${f.postedWithinDays} günde eklenen`);
  if (f.departments.length) liste.push(`Bölüm: ${f.departments.join(', ')}`);
  if (f.pay === 'paid') liste.push('Ücretli');
  if (f.pay === 'unpaid') liste.push('Ücretsiz');
  if (f.mandatory) liste.push('Zorunlu staj kabul ediliyor');
  if (f.voluntary) liste.push('Gönüllü staj kabul ediliyor');
  return liste;
}

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
      {/*
        NE KAYDEDİLİYOR, NE KAYDEDİLMİYOR — AÇIKÇA

        Aktif bir filtrenin sessizce yok sayılması, kullanıcının
        kaydettiğini sandığı aramadan farklı bir e-posta almasıydı.
        Dışarıda kalanlar da yazılıyor: ikisi sunum kararı (uyum eşiği,
        görünüm sekmesi), biri listeye özel bir kova (şehirde "diğer").
      */}
      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Kaydedilecek filtreler
        </p>
        <ul className="mt-1 space-y-0.5 text-xs text-gray-800">
          {kaydedilenler(filtreler).map((satir) => (
            <li key={satir} className="break-words">
              · {satir}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
          Kaydedilmeyenler: {KAYDEDILMEYEN_FILTRELER.join(', ')}. Bunlar listeyi nasıl
          sıraladığını/gösterdiğini belirliyor, hangi ilanların uyduğunu değil.
        </p>
      </div>

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
