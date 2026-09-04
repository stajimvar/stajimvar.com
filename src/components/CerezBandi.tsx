import React from 'react';
import { rizaOku, rizaYaz, bandGerekli, KATEGORILER } from '../lib/cerez-rizasi.mjs';

/**
 * Çerez rızası bandı.
 *
 * ÜÇ SEÇENEK, EŞİT AĞIRLIK
 * ------------------------
 * "Kabul et" dolu mavi, "Reddet" soluk gri bir bağlantı olsaydı seçim
 * görünürde sunulmuş ama fiilen yönlendirilmiş olurdu. Üç düğme de aynı
 * yükseklikte, aynı köşe yarıçapında ve aynı punto; ayrım yalnızca
 * çerçeve renginde. Hiçbiri diğerinden büyük değil.
 *
 * REDDETMEK TEK DOKUNUŞ
 * ---------------------
 * Reddetmek için "Tercihler"e girip tek tek kapatmak gerekmiyor; band
 * üzerinde doğrudan duruyor. Reddi zorlaştırmak, seçimi zorlaştırmaktır.
 *
 * BAND ÇIKMADAN REKLAM YÜKLENMİYOR
 * --------------------------------
 * Bu bileşen yalnızca soruyor; betiği yükleme kararı App'te rızaya bakarak
 * veriliyor. Bandı çizip betiği yine de yüklemek, sormuş gibi yapmak olurdu.
 */
export const CerezBandi: React.FC<{
  /** Seçim yapıldığında; App rızayı yeniden okuyup betiği ona göre başlatıyor. */
  onKarar: () => void;
  /** Tercihler ekranı dışarıdan da açılabiliyor (altbilgideki bağlantı). */
  acikBasla?: boolean;
  onKapat?: () => void;
}> = ({ onKarar, acikBasla = false, onKapat }) => {
  const [gorunur, setGorunur] = React.useState(
    () => acikBasla || bandGerekli(rizaOku(window.localStorage)),
  );
  const [tercihler, setTercihler] = React.useState(acikBasla);
  const mevcut = rizaOku(window.localStorage);
  const [reklam, setReklam] = React.useState(mevcut.reklam);
  const [olcum, setOlcum] = React.useState(mevcut.olcum);

  /*
    ALTBİLGİDEKİ "ÇEREZ TERCİHLERİ" PANELİ AÇMALI

    `gorunur` yalnızca `useState` başlatıcısıyla kuruluyordu ve başlatıcı bir
    kez çalışıyor. Karar vermiş kullanıcıda band kapalı; altbilgideki düğme
    `acikBasla`'yı true yapıyor ama bileşen bunu HİÇ okumuyordu — düğme
    hiçbir şey yapmıyor gibi görünüyordu (bildirildi ve doğrulandı).

    Bu etki `acikBasla` değişimini izliyor: panel açılıyor, tercihler
    bölümü açık geliyor ve kutular kayıtlı karara göre doluyor.
  */
  React.useEffect(() => {
    if (!acikBasla) return;
    const kayitli = rizaOku(window.localStorage);
    setReklam(kayitli.reklam);
    setOlcum(kayitli.olcum);
    setTercihler(true);
    setGorunur(true);
  }, [acikBasla]);

  if (!gorunur) return null;

  const kaydet = (secim: { reklam: boolean; olcum: boolean }) => {
    rizaYaz(window.localStorage, secim);
    setGorunur(false);
    setTercihler(false);
    onKapat?.();
    onKarar();
  };

  const dugme = 'min-h-11 flex-1 cursor-pointer rounded-xl px-4 text-sm font-bold transition-colors';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Çerez tercihleri"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-200 bg-white p-4 shadow-[0_-4px_24px_-12px_rgba(15,23,42,0.25)] sm:p-5"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="space-y-1">
          <p className="text-sm font-bold text-gray-900">Çerez tercihlerin</p>
          <p className="text-sm leading-relaxed text-gray-600">
            Sitenin çalışması için gereken çerezler her hâlükârda kullanılıyor. Reklam ve
            ölçüm çerezleri yalnızca izin verirsen yükleniyor — izin vermezsen ilgili
            istekler hiç başlamıyor.{' '}
            <a href="/cerez-politikasi" className="font-semibold text-blue-700 hover:underline">
              Çerez politikası
            </a>
          </p>
        </div>

        {tercihler && (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            {/*
              Zorunlu çerezler seçenek olarak SUNULMUYOR, yalnızca
              bildiriliyor: kapatılamayan bir kutuyu kapatılabilir gibi
              göstermek sahte seçim olur.
            */}
            <p className="text-xs text-gray-600">
              <strong className="text-gray-900">Zorunlu çerezler:</strong> oturum ve güvenlik.
              Kapatılamıyor, çünkü site bunlarsız çalışmıyor.
            </p>
            <label className="flex cursor-pointer items-start gap-2.5 py-1">
              <input
                type="checkbox"
                checked={reklam}
                onChange={(e) => setReklam(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600"
              />
              <span className="text-xs leading-relaxed text-gray-700">
                <strong className="text-gray-900">Reklam (Google AdSense):</strong> rehber
                sayfalarında reklam gösterimi ve ölçümü.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 py-1">
              <input
                type="checkbox"
                checked={olcum}
                onChange={(e) => setOlcum(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600"
              />
              <span className="text-xs leading-relaxed text-gray-700">
                <strong className="text-gray-900">Ölçüm:</strong> hangi sayfaların
                kullanıldığını anlamak için. Şu an aktif bir ölçüm aracı yok; kutu ileride
                eklenecek araçlar için duruyor.
              </span>
            </label>
          </div>
        )}

        {/*
          ÜÇ DÜĞME AYNI ÖLÇÜDE

          `flex-1` üçüne de veriliyor: hiçbiri diğerinden geniş değil.
          Reddetme dolu düğme kadar erişilebilir.
        */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => kaydet({ reklam: false, olcum: false })}
            className={`${dugme} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}
          >
            Reddet
          </button>
          <button
            type="button"
            onClick={() => setTercihler((o) => !o)}
            aria-expanded={tercihler}
            className={`${dugme} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}
          >
            Tercihler
          </button>
          <button
            type="button"
            onClick={() =>
              tercihler ? kaydet({ reklam, olcum }) : kaydet({ reklam: true, olcum: true })
            }
            className={`${dugme} border border-blue-600 bg-blue-600 text-white hover:bg-blue-700`}
          >
            {tercihler ? 'Seçimi kaydet' : 'Kabul et'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Kategori adları dışarıdan da okunabilsin (politika sayfası kullanıyor). */
export { KATEGORILER };
