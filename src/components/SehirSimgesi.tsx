import React from 'react';
import { sehirAnahtari } from '../lib/sehir-anahtari.mjs';

/**
 * ŞEHİR SİMGELERİ — ŞEHİR ŞERİDİNİN DAİRESİ İÇİN
 *
 * NEDEN ÇİZİM, FOTOĞRAF DEĞİL
 * ---------------------------
 * Şirket şeridinde dairenin içinde gerçek logo var; şehrin logosu yok.
 * Yerine simge kondu: İstanbul için Kız Kulesi, Ankara için Anıtkabir
 * gibi. Fotoğraf kullanılmadı — üç sebep, üçü de ölçülebilir:
 *
 *   1. Telif. Yapıların kendisi serbest ama FOTOĞRAFI değil; kaynağı
 *      belirsiz bir görseli siteye koymak lisans borcu demek. Depoda
 *      zaten "stok fotoğraf yok" kuralı var ve testle korunuyor.
 *   2. Ağırlık. Yedi şehir için yedi fotoğraf, 56 piksellik bir daire
 *      uğruna yüzlerce kilobayt; buradaki yedi çizimin tamamı birkaç
 *      kilobayt ve HTML'in içinde geliyor, ek istek yok.
 *   3. Okunurluk. 56 piksellik dairede fotoğraf lapaya dönüyor; tek
 *      renk siluet o ölçekte hâlâ tanınıyor.
 *
 * NEDEN INLINE SVG, DOSYA DEĞİL
 * -----------------------------
 * Rehber görselleri `<img>` ile dosyadan geliyor çünkü onlar bilgi
 * taşıyan, paylaşılabilir varlıklar. Bunlar ise ikon: `currentColor`
 * ile seçili/seçili değil durumuna göre renk değiştirmeleri gerekiyor
 * ve tek tek istek atmaları saçma olurdu.
 *
 * TANIMADIĞIN ŞEHİR
 * -----------------
 * Katalogda bugün yedi şehir var ama yarın sekizincisi gelebilir; o
 * zaman genel bir silüet çiziliyor. Eksik simge yüzünden daire boş
 * kalmıyor, şerit de bozulmuyor.
 */

/* Çizimlerin tamamı 24×24 ızgarada, tek renk (`currentColor`). */
const G = {
  /**
   * Kız Kulesi.
   *
   * İlk çizim konik çatılı genel bir deniz feneriydi — Kız Kulesi'ne
   * benzemiyordu. Fotoğrafa bakılarak yeniden çizildi ve yapının
   * gerçekten ayırt edici beş parçası kondu: adacıktaki alçak yapı,
   * taş sekizgen gövde, korkuluklu şerefe, sütunlu kasnak üstündeki
   * YUVARLAK kubbe (koni değil) ve tepedeki uzun direk.
   */
  istanbul: (
    <>
      <path d="M2 20.6c1.5 0 1.5.9 3 .9s1.5-.9 3-.9 1.5.9 3 .9 1.5-.9 3-.9 1.5.9 3 .9 1.5-.9 3-.9" />
      <path d="M3.5 19.8V17h17v2.8" />
      <path d="M9.6 17V9.2h4.8V17" />
      <path d="M8.3 9.2h7.4V7.9H8.3z" />
      <path d="M10 7.9V5.6h4v2.3" />
      <path d="M9.6 5.6a2.4 2.4 0 0 1 4.8 0" />
      <path d="M12 3.2V.7" />
    </>
  ),
  /** Anıtkabir — basamaklı taban, sütun dizisi, düz saçak. */
  ankara: (
    <>
      <path d="M2.5 21h19" />
      <path d="M4 21v-1.5h16V21" />
      <path d="M5 19.5V9h14v10.5" />
      <path d="M8 19.5V11M12 19.5V11M16 19.5V11" />
      <path d="M3.5 9h17V7h-17z" />
      <path d="M4.5 7 12 3l7.5 4" />
    </>
  ),
  /** Konak Saat Kulesi — geniş taban, gövde, kadran, kubbeli tepe. */
  izmir: (
    <>
      <path d="M5 21h14" />
      <path d="M7 21v-2.5h10V21" />
      <path d="M9 18.5V8.5h6v10" />
      <circle cx="12" cy="12.4" r="2" />
      <path d="M8.4 8.5h7.2V6.6H8.4z" />
      <path d="M9.6 6.6a2.4 2.4 0 0 1 4.8 0" />
      <path d="M12 4.2V2.9" />
    </>
  ),
  /**
   * Ulu Cami — kubbe ve iki minare.
   *
   * İlk çizimde kubbe doğrudan tabanın üstüne oturuyordu ve ikisi
   * birleşip bir KEMER gibi okunuyordu; minareler de kenarda ince birer
   * çizgi olarak kayboluyordu (80 pikselde bakıldı). Taban alçaltıldı,
   * kubbe küçültüldü, minareler dışa açılıp şerefe çentiği ve sivri
   * külah eklendi — üç öğe artık birbirinden ayrı okunuyor.
   */
  bursa: (
    <>
      <path d="M2 21h20" />
      <path d="M6.5 21v-5.5h11V21" />
      <path d="M7 15.5a5 5 0 0 1 10 0" />
      <path d="M12 10.5V9" />
      <path d="M3 21V9M2.1 9 3 7.2 3.9 9M2.2 12.6h1.6" />
      <path d="M21 21V9M20.1 9 21 7.2l.9 1.8M20.2 12.6h1.6" />
    </>
  ),
  /** Mevlâna Dergâhı — silindir kasnak, konik külah, alemli tepe. */
  konya: (
    <>
      <path d="M2.5 21h19" />
      <path d="M5 21v-5h14v5" />
      <path d="M8.5 16V9.8h7V16" />
      <path d="M12 2.6 7.6 9.8h8.8z" />
      <path d="M12 2.6V1.2" />
    </>
  ),
  /** Odunpazarı evi — çıkmalı üst kat, kiremit çatı. */
  eskisehir: (
    <>
      <path d="M2.5 21h19" />
      <path d="M6 21v-7h12v7" />
      <path d="M4 14h16V9.5H4z" />
      <path d="M7 11.8v-1M12 11.8v-1M17 11.8v-1" />
      <path d="M3 9.5 12 4l9 5.5" />
    </>
  ),
  /** Göbeklitepe — T biçimli dikilitaşlar. */
  sanliurfa: (
    <>
      <path d="M2.5 21h19" />
      <path d="M10 21V8h4v13" />
      <path d="M7.5 8h9V5.2h-9z" />
      <path d="M4.5 21v-7.5h2.2V21" />
      <path d="M3 13.5h5.2v-2H3z" />
    </>
  ),
} as const;

/** Adı tanınmayan şehir: genel bir silüet. */
const GENEL = (
  <>
    <path d="M2.5 21h19" />
    <path d="M4 21V11h5v10" />
    <path d="M9 21V6h6v15" />
    <path d="M15 21v-7h5v7" />
    <path d="M6 14h1M6 17h1M11.5 9h1M11.5 13h1M11.5 17h1M17 17h1" />
  </>
);

export const SehirSimgesi: React.FC<{ sehir: string; className?: string }> = ({
  sehir,
  className,
}) => {
  const cizim = G[sehirAnahtari(sehir) as keyof typeof G] ?? GENEL;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      /*
        Simge dekor: dairenin erişilebilir adı düğmedeki `sr-only`
        cümlesinden geliyor ("İstanbul, 71 etkinlik"). İkona ayrıca ad
        verilseydi ekran okuyucu şehri iki kez söylerdi.
      */
      aria-hidden
    >
      {cizim}
    </svg>
  );
};

/** Simgesi çizilmiş şehirler — test ve bakım için. */
export const SIMGELI_SEHIRLER = Object.keys(G);
