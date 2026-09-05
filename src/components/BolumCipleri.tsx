import React from 'react';
import { ALANLAR } from '../lib/bolum-eslestirme.mjs';

/**
 * "Bölümün ne?" — ilk ziyarette sorulan tek soru.
 *
 * NEDEN SORULUYOR
 * ---------------
 * Arama kutusu vardı ama liste herkese aynı geliyordu: hukuk okuyan da
 * yazılım okuyan da aynı sırayla aynı 62 ilanı görüyordu. Kutuya bir şey
 * yazmak öğrencinin işi; alanını bir kez söylemek ise tek dokunuş.
 *
 * SEÇİM ELEMİYOR, ÖNE ALIYOR
 * --------------------------
 * Sınıflandırma başlıktan çıkarılan bir TAHMİN (bkz. bolum-eslestirme.mjs)
 * ve ölçüldü: ilanların yalnızca %66'sı bir alana düşüyor. Eleme yapsaydık
 * iki şey birden olurdu — yanlış sınıflanan ilan tamamen kaybolur, ve
 * "Hukuk" seçen öğrenci 2 sonuç görüp siteyi boş sanırdı. Bu yüzden seçim
 * yalnızca sıralamayı değiştiriyor; liste bütün kalıyor ve bunu ekranda
 * yazıyoruz.
 *
 * KAPATILABİLİR VE GERİ ALINABİLİR
 * --------------------------------
 * Soru bir duvar değil: "Şimdi değil" ile geçilebiliyor ve seçim sonradan
 * değiştirilebiliyor. Cevaplamadan devam edeni bir daha rahatsız
 * etmiyoruz — kapatma kararı da kaydediliyor.
 *
 * GİRİŞ GEREKTİRMİYOR
 * -------------------
 * Tercih localStorage'da. Bu bir kişisel veri toplama değil, tarayıcıda
 * kalan bir görünüm tercihi; sunucuya gitmiyor.
 */

const ANAHTAR = 'stajimvar:bolum-tercihi';

/** Kayıtlı tercihi okur. Bozuk kayıt yok sayılıyor. */
export function tercihOku(depo: Storage | null | undefined): {
  alan: string | null;
  soruldu: boolean;
} {
  if (!depo) return { alan: null, soruldu: false };
  try {
    const ham = depo.getItem(ANAHTAR);
    if (!ham) return { alan: null, soruldu: false };
    const k = JSON.parse(ham);
    const alan = ALANLAR.some((a: { id: string }) => a.id === k?.alan) ? k.alan : null;
    return { alan, soruldu: k?.soruldu === true };
  } catch {
    return { alan: null, soruldu: false };
  }
}

function tercihYaz(depo: Storage | null | undefined, alan: string | null) {
  try {
    depo?.setItem(ANAHTAR, JSON.stringify({ alan, soruldu: true }));
  } catch {
    /* Depolama kapalıysa tercih kalıcı olmuyor; soru her açılışta çıkıyor. */
  }
}

export const BolumCipleri: React.FC<{
  secili: string | null;
  onSec: (alan: string | null) => void;
  /** Alan başına eşleşen ilan sayısı — sıfır olan çip çizilmiyor. */
  sayilar?: Record<string, number>;
}> = ({ secili, onSec, sayilar }) => {
  const [gorunur, setGorunur] = React.useState(false);

  /*
    localStorage yalnızca tarayıcıda okunuyor.

    Başlatıcıda okunsaydı ön render (Node) çökerdi; ayrıca sunucuda
    çizilen HTML ile tarayıcıdaki ilk çizim ayrışırdı.
  */
  React.useEffect(() => {
    const { alan, soruldu } = tercihOku(window.localStorage);
    if (alan) onSec(alan);
    setGorunur(!soruldu || Boolean(alan));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gorunur) return null;

  const sec = (alan: string | null) => {
    tercihYaz(window.localStorage, alan);
    onSec(alan);
  };

  const gosterilecek = ALANLAR.filter(
    (a: { id: string }) => !sayilar || (sayilar[a.id] ?? 0) > 0 || a.id === secili,
  );

  return (
    <section
      aria-label="Bölüm tercihi"
      className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">Bölümün ne?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
            {secili
              ? 'Alanına uyan ilanlar listenin başına alındı. Diğer ilanlar altta duruyor.'
              : 'Seç, alanına uyan ilanlar başa gelsin. Hiçbir ilan gizlenmiyor.'}
          </p>
        </div>
        {!secili && (
          <button
            type="button"
            onClick={() => {
              tercihYaz(window.localStorage, null);
              setGorunur(false);
            }}
            className="shrink-0 cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            Şimdi değil
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {gosterilecek.map((a: { id: string; etiket: string }) => {
          const aktif = a.id === secili;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => sec(aktif ? null : a.id)}
              aria-pressed={aktif}
              className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition-colors ${
                aktif
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {a.etiket}
              {sayilar && sayilar[a.id] != null && (
                <span className={aktif ? 'ml-1.5 opacity-80' : 'ml-1.5 text-gray-400'}>
                  {sayilar[a.id]}
                </span>
              )}
            </button>
          );
        })}
        {secili && (
          <button
            type="button"
            onClick={() => sec(null)}
            className="min-h-9 cursor-pointer rounded-full border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-600 hover:border-gray-400"
          >
            Tümü
          </button>
        )}
      </div>
    </section>
  );
};
