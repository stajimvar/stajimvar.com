import React from 'react';
import { PALET, paletSirasi, rozetYazisi } from '../lib/okul-rozeti.mjs';

/**
 * OKUL ROZETİ — görsel kısım.
 *
 * Mantığı `lib/okul-rozeti.mjs` içinde; gerekçeler de orada. Burası
 * yalnız çiziyor.
 *
 * LOGO: `logoAdresi` verilirse üniversitenin amblemi çiziliyor. Adresi
 * `lib/universite-logosu.mjs` üretiyor ve dosyalar depoda duruyor; burası
 * dışarıdan adres bilmiyor. Görsel yüklenemezse monograma düşüyor —
 * şirket tarafındaki `CompanyLogo` ile aynı davranış.
 */

export const OkulRozeti: React.FC<{
  okul: string;
  logoAdresi?: string;
  boyut?: 'kucuk' | 'orta';
}> = ({ okul, logoAdresi, boyut = 'kucuk' }) => {
  const [dustu, setDustu] = React.useState(false);
  const yazi = rozetYazisi(okul);
  if (!okul || !yazi) return null;

  /*
    KUTU KISA KISALTMADA KARE, UZUNDA GENİŞLİYOR

    Ölçüldü (Chromium, 390 ve 1000 piksel): sabit 28×28 kutuda beş harfli
    kısaltma ("MSGSÜ") taşıyor — harfler kutunun dışına çıkıp yanındaki
    okul adına giriyordu. `min-w` + yatay dolgu ile iki harfli kısaltma
    hâlâ kare duruyor, beş harfli olan kendi genişliğini alıyor.
  */
  const olcu =
    boyut === 'orta'
      ? 'h-10 min-w-10 px-2 text-[13px]'
      : 'h-7 min-w-7 px-1.5 text-[11px]';
  const gorselVar = Boolean(logoAdresi) && !dustu;

  if (gorselVar) {
    return (
      <img
        src={logoAdresi}
        alt=""
        aria-hidden
        width={64}
        height={64}
        loading="lazy"
        onError={() => setDustu(true)}
        /*
          ÇERÇEVE VE ÖLÇÜ (22 Eylül 2026)

          Logo satıra çıplak ve 28 piksel konuyordu; telefonda okul adı 14
          piksel (satır 20) olduğu için rozet satırdan taşıyordu. Amblemlerin
          oranı da birbirini tutmuyor — MSGSÜ'nün baykuşu geniş ve yassı,
          mühürler kare — çerçevesiz hâlde geniş olan adın yanında havada
          duruyordu.

          Kutu 24 piksele indi, kenarlık ve iç boşlukla hepsi aynı kareye
          oturuyor. Geniş ekranda ad 16 piksele çıktığı için kutu da 28'e
          çıkıyor. Şirket logolarında (`CompanyLogo`) ve kariyer merkezi
          kartında da aynı dil kullanılıyor.
        */
        className={`${boyut === 'orta' ? 'h-10 w-10 p-1' : 'h-6 w-6 p-0.5 sm:h-7 sm:w-7'} shrink-0 rounded-lg border border-gray-200 bg-white object-contain`}
      />
    );
  }

  return (
    <span
      /*
        `aria-hidden`: rozet okul adının YANINDA duruyor ve ad zaten
        metin olarak yazıyor. Ekran okuyucuya kısaltmayı bir kez daha
        okutmak, aynı bilgiyi iki kez söylemek olurdu.
      */
      aria-hidden
      title={okul}
      className={`${olcu} ${PALET[paletSirasi(okul)]} inline-flex shrink-0 items-center justify-center rounded-lg font-black tracking-tight`}
    >
      {yazi}
    </span>
  );
};
