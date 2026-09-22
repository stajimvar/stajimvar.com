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
      : 'h-6 min-w-6 px-1.5 text-[10px] sm:h-7 sm:min-w-7 sm:text-[11px]';
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
          YUVARLAK VE BEYAZ HALKALI (22 Eylül 2026)

          Rozet önce okul adının soluna konmuştu; hangi ölçü denendiyse
          yamalı durdu — satır telefonda 14 piksel, amblemlerin oranı da
          birbirini tutmuyor (MSGSÜ'nün baykuşu geniş ve yassı, mühürler
          kare) ve ortalanmış satırın başındaki kutu adı ortadan
          kaydırıyordu.

          Artık profil fotoğrafının köşesinde: fotoğraf yuvarlak olduğu için
          rozet de yuvarlak, beyaz halka da onu altındaki tamamlanma
          halkasından ayırıyor — halkanın yeşili amblemin kenarına
          karışmıyor. İç boşluk gerekiyor, dolgusuz hâlde geniş amblemler
          daireden taşıyor. Şirket logolarında (`CompanyLogo`) da kenarlık +
          beyaz zemin aynı işi görüyor.
        */
        className={`${boyut === 'orta' ? 'h-10 w-10 p-1' : 'h-6 w-6 p-0.5 sm:h-7 sm:w-7'} shrink-0 rounded-full border border-gray-200 bg-white object-contain ring-2 ring-white`}
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
      className={`${olcu} ${PALET[paletSirasi(okul)]} inline-flex shrink-0 items-center justify-center rounded-full font-black tracking-tight ring-2 ring-white`}
    >
      {yazi}
    </span>
  );
};
