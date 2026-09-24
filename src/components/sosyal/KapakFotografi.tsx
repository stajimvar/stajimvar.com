import React from 'react';
import { SOSYAL_KAPAK_KOVASI } from '../../lib/queries/sosyal';
import { useGorselAdresleri } from './useGorselAdresleri';
import { KAPAK_BANDI_SINIFI, KAPAK_DOSYASI_SINIFI } from '../../lib/kapak-orani';

/**
 * KAPAK FOTOĞRAFI — `ProfilFotografi`NİN BANT HÂLİ
 *
 * `social_profiles.kapak_path` bir depolama YOLU; kova private
 * (`sosyal-kapak`, 20261105010000) ve dosya gösterileceği anda
 * kullanıcının OTURUMUYLA indiriliyor. İmzalı adres kullanılmıyor —
 * gerekçe ve ölçüm tablosu `useGorselAdresleri` başlığında. Okuma kapısı
 * avatarınkiyle AYNI fonksiyon: profili göremeyen kapağı da göremiyor.
 *
 * DÖRT DURUM, DÖRDÜ DE AYRI
 * -------------------------
 *   yol undefined  satır HENÜZ OKUNMADI — iskelet (animate-pulse)
 *   yol null       kapak yok — nötr bant
 *   iniyor         aynı bant, animate-pulse
 *   indi           fotoğrafın kendisi
 *   inemedi        nötr bant — kırık bir <img> değil
 *
 * NÖTR BANT, UYDURMA GÖRSEL DEĞİL
 * -------------------------------
 * Kapağı olmayan profilde degrade, desen ya da marka görseli çizmek,
 * kullanıcının seçmediği bir kapağı onun adına seçmek olurdu. Bant yine
 * de ÇİZİLİYOR: avatar bandın alt kenarına biniyor ve bant kalkarsa
 * profilin iskeleti kapağı olan/olmayan iki kullanıcıda iki farklı
 * yükseklikte olurdu. Rengi sayfa iskeletinin grisi — "burada bir şey
 * yok" diyen, sayfadaki en sessiz ton.
 *
 * "İnemedi" dalında hata cümlesi yazılmıyor: profil başlığında sebebi
 * kullanıcının çözemeyeceği bir satır bırakırdı. `ProfilFotografi` baş
 * harfe düşerken verdiği kararın aynısı.
 *
 * ORAN BİLEŞENDE (`kip`), KÖŞE ÇAĞIRANDA
 * --------------------------------------
 *   kip="bant"   profil başlığı: 3:1, `lg:` ve üstünde 5:1. 1440'ta 3:1
 *                bant 1343×448 ölçüldü, 900 piksellik ekranın yarısıydı.
 *                Geniş ekranda dosyanın ortadaki şeridi görünüyor
 *                (`object-center`); kırpma ekranı kesilen payı karartıyor.
 *   kip="dosya"  her ekranda 3:1 — kaydedilen dosyanın tamamı (düzenleme
 *                önizlemesi, yükleme ekranındaki "şu anki kapağın").
 * Oran kararı yalnız burada: iki profil ekranı "bant" deyip kararı
 * almıyor, sınıf da sessiz bir CSS önceliğine bırakılmıyor. Köşe kabın
 * kendi yarıçapına bağlı (kart 20, başlık 16 piksel); `className` ile
 * geliyor.
 *
 * BÜYÜTME YOK: kapak dekoratif bir bant, görüntüleyici gerekmiyor.
 */

interface KapakProps {
  /** `alt` metni için; başlıkta görünen adın aynısı. */
  ad: string;
  /**
   * `social_profiles.kapak_path`.
   *
   * `null` = kapak yok, `undefined` = satır HENÜZ OKUNMADI. İkisi ayrı:
   * bilinmeyeni "yok" saymak, önce boş bant sonra fotoğraf diye bir
   * yanıp sönme üretirdi.
   */
  yol: string | null | undefined;
  /** Oran: "bant" (profil başlığı, lg'de 5:1) ya da "dosya" (hep 3:1). */
  kip: 'bant' | 'dosya';
  /** Genişlik, köşe ve dış boşluk — kabın kendi ölçüsüne göre çağırandan. */
  className?: string;
}

/* Boş dizi her çizimde yeniden üretilmesin: kanca yolların METNİNE bakıyor. */
const YOL_YOK: string[] = [];

/*
  `overflow-hidden`: köşe yarıçapı görselin kendisini de kırpsın. Kabın
  (kart / başlık) kendisine `overflow-hidden` verilmedi — dişli menüsü ve
  bağlantı düğmesi gibi kabın içinden taşan katmanlar kesilirdi.

  GENİŞLİK BURADA YOK, ÇAĞIRANDA: başlıkta `w-full`, düzenleme bloğunda
  `w-40`. İkisi aynı dizeye girseydi hangisinin kazanacağı üretilen
  CSS'in sırasına kalırdı (`Card`daki `mobilYuzey` notunun aynısı).
*/
const TABAN = 'block overflow-hidden bg-gray-100';

/* Oran sınıfları `lib/kapak-orani`da, sayılarla aynı yerde; şirket bandı da oradan okuyor. */
const ORAN_SINIFI: Record<KapakProps['kip'], string> = {
  bant: KAPAK_BANDI_SINIFI,
  dosya: KAPAK_DOSYASI_SINIFI,
};

export const KapakFotografi: React.FC<KapakProps> = ({ ad, yol, kip, className = '' }) => {
  const bant = `${TABAN} ${ORAN_SINIFI[kip]}`;
  const yollar = React.useMemo(() => (yol ? [yol] : YOL_YOK), [yol]);
  /* Kanca koşulsuz: React kancaları dallara giremez. Yol yokken istek atılmıyor. */
  const { durum, adresler } = useGorselAdresleri(SOSYAL_KAPAK_KOVASI, yollar);

  if (yol === undefined || (yol && durum === 'yukleniyor')) {
    return <div aria-hidden className={`${bant} animate-pulse ${className}`} />;
  }
  const adres = yol ? (adresler.get(yol) ?? null) : null;
  if (!adres) {
    return <div aria-hidden className={`${bant} ${className}`} />;
  }
  return (
    <div className={`${bant} ${className}`}>
      <img src={adres} alt={`${ad} kapak fotoğrafı`} className="h-full w-full object-cover object-center" />
    </div>
  );
};
