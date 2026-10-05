import React from 'react';
import { GEREKCE_EN_AZ, gerekceYeterli } from '../../lib/ilan-kontrol-gorunumu.mjs';

/**
 * GEREKÇELİ YÖNETİCİ KARARI — ret, değişiklik reddi, yayından kaldırma
 *
 * NEDEN AYRI BİLEŞEN
 * ------------------
 * Üç karar (onay kuyruğu ve ilanlar sayfası) aynı kuralı taşıyor:
 * gerekçe zorunlu, en az 10 karakter (sunucu da zorluyor:
 * `yonetim_gerekce_dogrula`) ve ŞİRKETE AYNEN gösteriliyor. Kural tek
 * yerde: biri gevşeyip öteki sıkı kalmasın.
 *
 * İKİNCİ ADIM: yayından kaldırma geri alınabilir ama öğrencinin gördüğü
 * ilan anında kalkıyor. `onaySorusu` verilince bir onay kutusu da
 * işaretlenmeden düğme açılmıyor — yanlış satıra basmak tek tıkla bir
 * şirketin ilanını kaldırmasın.
 *
 * Telefonda okunuyor: açıklama ve sayaç düz metin, ipucu balonu yok.
 */
export const GerekceliKarar: React.FC<{
  /** Düğmenin ve formun kimliği; aynı sayfada birden çok form olabiliyor. */
  kimlik: string;
  gonderEtiketi: string;
  /** Gerekçenin kime, nerede görüneceği. */
  aciklama: string;
  onaySorusu?: string;
  onGonder: (gerekce: string) => Promise<void>;
  onVazgec: () => void;
}> = ({ kimlik, gonderEtiketi, aciklama, onaySorusu, onGonder, onVazgec }) => {
  const [gerekce, setGerekce] = React.useState('');
  const [onay, setOnay] = React.useState(false);
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [hata, setHata] = React.useState('');
  const kilit = React.useRef(false);
  const uzunluk = gerekce.trim().length;
  const hazir = gerekceYeterli(gerekce) && (!onaySorusu || onay);

  const gonder = async () => {
    if (!hazir || kilit.current) return;
    kilit.current = true;
    setGonderiliyor(true);
    setHata('');
    try {
      await onGonder(gerekce.trim());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem uygulanamadı. Yeniden dene.');
    } finally {
      kilit.current = false;
      setGonderiliyor(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <label htmlFor={`${kimlik}-gerekce`} className="block text-[13px] font-semibold text-gray-900">
        Gerekçe
      </label>
      <p id={`${kimlik}-aciklama`} className="text-[12px] leading-relaxed text-gray-700">
        {aciklama}
      </p>
      <textarea
        id={`${kimlik}-gerekce`}
        value={gerekce}
        onChange={(e) => setGerekce(e.target.value)}
        rows={3}
        aria-describedby={`${kimlik}-aciklama ${kimlik}-sayac`}
        className="block w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:outline-2 focus:outline-blue-600 sm:text-sm"
      />
      <p
        id={`${kimlik}-sayac`}
        className={`text-[12px] tabular-nums ${uzunluk >= GEREKCE_EN_AZ ? 'text-gray-600' : 'text-amber-800'}`}
      >
        {uzunluk} karakter · en az {GEREKCE_EN_AZ}
      </p>
      {onaySorusu && (
        <label className="flex min-h-11 cursor-pointer items-start gap-2 text-[13px] leading-snug text-gray-900">
          <input
            type="checkbox"
            checked={onay}
            onChange={(e) => setOnay(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-red-600"
          />
          <span>{onaySorusu}</span>
        </label>
      )}
      {hata && (
        <p role="alert" className="text-[13px] font-semibold text-rose-700">
          {hata}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void gonder()}
          disabled={!hazir || gonderiliyor}
          aria-busy={gonderiliyor}
          className="min-h-11 flex-1 cursor-pointer rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {gonderiliyor ? 'Uygulanıyor…' : gonderEtiketi}
        </button>
        <button
          type="button"
          onClick={onVazgec}
          disabled={gonderiliyor}
          className="min-h-11 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
};
