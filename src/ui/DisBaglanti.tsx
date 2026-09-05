import React from 'react';

/**
 * Girişe bağlı dış bağlantı.
 *
 * NEDEN KAPI
 * ----------
 * İlan, burs ve etkinlik kartlarındaki "Resmî sitede başvur" düğmesi
 * misafiri doğrudan kaynağın sitesine yolluyordu. Öğrenci başvurusunu orada
 * tamamlıyor, StajımVar'da hiçbir iz kalmıyordu: ne başvuru geçmişi, ne
 * kaydettikleri, ne de "bu ilana baktın" bilgisi. Kullanıcı bir sonraki
 * gelişinde aynı ilanı yeniden buluyordu.
 *
 * Kapı yalnızca DIŞARI çıkan bağlantıda. İlan metni, şehir, tarih, beceri
 * listesi — hepsi girişsiz okunuyor. Kapatılan şey içerik değil, son adım.
 *
 * REHBER HARİÇ
 * ------------
 * Rehberlerdeki resmî kaynak bağlantıları bu bileşeni KULLANMIYOR ve
 * kullanmamalı. Orası bilgi veren bir sayfa: "staj sigortasını kim yapar"
 * sorusunun cevabı SGK'nın kendi sayfasında ve o bağlantıyı giriş arkasına
 * koymak, cevabı vermemekle aynı şey. Ürün kararı bu ayrımda.
 *
 * KAPI YOKSA BAĞLANTI ÇALIŞIR
 * ---------------------------
 * `onGirisGerekli` verilmezse bileşen düz bir <a> çiziyor. App'te giriş
 * akışı `AUTH_ENABLED` ile kapatılabiliyor; o durumda kullanıcıyı
 * açılmayacak bir pencereye göndermek yerine bağlantı eskisi gibi
 * çalışıyor.
 */
export const DisBaglanti: React.FC<{
  href: string;
  /** Kullanıcı misafir mi. */
  girisGerekli: boolean;
  /** Giriş penceresini açan işlev; verilmezse kapı kurulmuyor. */
  onGirisGerekli?: () => void;
  /** Kapı devredeyken düğmede ve ipucunda görünecek metin. */
  kapiEtiketi?: string;
  className?: string;
  title?: string;
  id?: string;
  children: React.ReactNode;
}> = ({
  href,
  girisGerekli,
  onGirisGerekli,
  kapiEtiketi = 'Başvurmak için giriş yap',
  className,
  title,
  id,
  children,
}) => {
  if (girisGerekli && onGirisGerekli) {
    return (
      <button
        type="button"
        id={id}
        /*
          `stopPropagation`: bu düğmelerin bir kısmı, tamamı tıklanabilir
          kartların (`after:absolute after:inset-0`) içinde duruyor. Durdurmazsak
          giriş penceresi açılırken kart da detay sayfasına gidiyor.
        */
        onClick={(olay) => {
          olay.stopPropagation();
          olay.preventDefault();
          onGirisGerekli();
        }}
        title={kapiEtiketi}
        aria-label={kapiEtiketi}
        className={className}
      >
        {children}
      </button>
    );
  }

  return (
    <a
      id={id}
      href={href}
      target="_blank"
      /*
        `nofollow`: bağlantı bizim tavsiyemiz değil, kaydın kaynağı. Arama
        motoruna sinyal taşımaması gerekiyor.
      */
      rel="noopener noreferrer nofollow"
      title={title}
      className={className}
    >
      {children}
    </a>
  );
};
