import React from 'react';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { YUZEY } from '../ui/tokens';
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
  /**
   * Süzgeç panelinin içinde mi çiziliyor.
   *
   * İlanlar sayfasında onaylanan tasarım başlığın altına yalnız küre
   * şeridini koyuyor ve ilanlar doğrudan onun altından başlıyor. Bu soru
   * o yüzden panele taşındı. Panelde kutu değil sade bir bölüm; "Şimdi
   * değil" yok, çünkü panel zaten isteyerek açılıyor ve bölüm seçimi
   * orada her zaman erişilebilir olmalı.
   */
  panelde?: boolean;
}> = ({ secili, onSec, sayilar, panelde = false }) => {
  /*
    TERCİH İLK ÇİZİMDE OKUNUYOR — ETKİDE DEĞİL.

    Önce `useState(false)` ile başlanıp `useEffect` içinde açılıyordu ve
    gerekçesi "Başlatıcıda okunsaydı ön render (Node) çökerdi" idi. Bu
    bileşen Node'da HİÇ çizilmiyor (anasayfanın ön render gövdesi elle
    yazılan HTML, React değil), ama gerekçenin kendisi hâlâ geçerli:
    `window` yoksa okumak çökerdi. O yüzden korunuyor, kaldırılmıyor.

    Bedeli ölçüldü: bölüm sorusu 275 piksellik bir blok ve ilk çizimden
    SONRA açılınca altındaki bütün liste aşağı kayıyordu — sayfanın en
    büyük düzen sıçraması buydu (CLS 0.212). Başlatıcıda okununca blok
    ilk çizimde yerinde oluyor ve hiçbir şey kaymıyor.

    `useState` başlatıcısı yalnız ilk çizimde çalışıyor; her çizimde
    localStorage okunmuyor.
  */
  const ilkTercih = React.useState(() =>
    typeof window === 'undefined'
      ? { alan: null as string | null, soruldu: false }
      : tercihOku(window.localStorage),
  )[0];
  const [gorunur, setGorunur] = React.useState(
    () => !ilkTercih.soruldu || Boolean(ilkTercih.alan),
  );

  /*
    Kayıtlı alan üst bileşene bildiriliyor. Bu bir DIŞARI haber verme, yani
    çizim sırasında yapılamaz; etkide kalıyor.
  */
  React.useEffect(() => {
    if (ilkTercih.alan) onSec(ilkTercih.alan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gorunur && !panelde) return null;

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
      /*
        Telefonda kutu değil BANT: şeritle liste arasında, ikisi de
        ekranın iki kenarına yaslıyken bu blok 16 piksel içeride
        yuvarlak bir kutu olarak duruyordu ve aradaki tek girintili
        öğe olduğu için bozuk görünüyordu. `sm:` üstünde kutu aynen
        geri geliyor.
      */
      className={
        panelde
          ? /*
              MASAÜSTÜ (10 Ekim 2026, referans tasarım): panelin içinde açık
              mavi tonlu ayrı bir bölüm. Telefonda `px-4 py-3` olduğu gibi.
            */
            'px-4 py-3 lg:mx-2 lg:my-2 lg:rounded-xl lg:bg-blue-50/70 lg:px-3 lg:py-3.5 xl:mx-3 xl:my-3 xl:px-3.5 xl:py-4'
          : `border-y border-blue-100 bg-blue-50/60 p-4 sm:rounded-2xl sm:border ${YUZEY.kap}`
      }
    >
      <div className="flex items-start justify-between gap-3">
        {panelde && (
          <GraduationCap aria-hidden className="mt-0.5 hidden h-6 w-6 shrink-0 text-blue-600 xl:block" />
        )}
        <div className="min-w-0 lg:flex-1">
          <p className="text-sm font-bold text-gray-900 lg:text-[15px]">
            <span className={panelde ? 'lg:hidden' : undefined}>Bölümün ne?</span>
            {panelde && <span className="hidden lg:inline">Bölümüne göre keşfet</span>}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
            {secili
              ? 'Alanına uyan ilanlar listenin başına alındı. Diğer ilanlar altta duruyor.'
              : 'Seç, alanına uyan ilanlar başa gelsin. Hiçbir ilan gizlenmiyor.'}
          </p>
          {/*
            Tercih gerçekten saklanıyor (`stajimvar:bolum-tercihi`) ve açılışta
            uygulanıyor; "Tümü" onu temizliyor. Cümle yalnız seçim varken.
          */}
          {secili && (
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Tercihlerin bu tarayıcıda hatırlanır. İstediğin zaman temizleyebilirsin.
            </p>
          )}
        </div>
        {/*
          Ok GERÇEK bir yere gidiyor: bölüm bölüm staj sayfaları (/bolumler).
          Süs olarak çizilen bir ok, basınca hiçbir şey olmayan bir düğme olurdu.
        */}
        {panelde && (
          <a
            href="/bolumler"
            aria-label="Bütün bölümler"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 lg:inline-flex"
          >
            <ChevronRight aria-hidden className="h-5 w-5" />
          </a>
        )}
        {!secili && !panelde && (
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

      <div className="mt-3 flex flex-wrap gap-2 lg:gap-1.5">
        {gosterilecek.map((a: { id: string; etiket: string }) => {
          const aktif = a.id === secili;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => sec(aktif ? null : a.id)}
              aria-pressed={aktif}
              className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition-colors lg:inline-flex lg:min-h-9 lg:items-center lg:px-2.5 lg:text-xs ${
                aktif
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 lg:border-gray-200 lg:text-gray-800 lg:shadow-2xs lg:hover:border-blue-300'
              }`}
            >
              {a.etiket}
              {sayilar && sayilar[a.id] != null && (
                <span
                  className={
                    aktif
                      ? 'ml-1.5 opacity-80 lg:ml-1.5 lg:inline-flex lg:h-[18px] lg:min-w-[18px] lg:items-center lg:justify-center lg:rounded-full lg:bg-white/20 lg:px-1 lg:text-[10px] lg:font-bold lg:opacity-100'
                      : 'ml-1.5 text-gray-400 lg:ml-1.5 lg:inline-flex lg:h-[18px] lg:min-w-[18px] lg:items-center lg:justify-center lg:rounded-full lg:bg-blue-100 lg:px-1 lg:text-[10px] lg:font-bold lg:text-blue-700'
                  }
                >
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
