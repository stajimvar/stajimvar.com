import React from 'react';
import { Avatar } from '../Avatar';
import { SOSYAL_AVATAR_KOVASI } from '../../lib/queries/sosyal';
import { useGorselAdresleri } from './useGorselAdresleri';

/**
 * PROFİL FOTOĞRAFI — YOLDAN İNDİRİLEN DOSYAYA
 *
 * `social_profiles.avatar_path` bir depolama YOLU; tek başına hiçbir
 * yerde açılmıyor. Kova private (20260924020000) ve dosya, gösterileceği
 * anda kullanıcının OTURUMUYLA indiriliyor: her indirme okuma
 * politikasından (`avatar_dosyasi_gorunur`) yeniden geçiyor.
 *
 * İMZALI ADRES KALDIRILDI — ÖLÇÜM
 * -------------------------------
 * Bir kez verilen imza jetonu RLS'i yeniden sormuyordu: arşiv, bağlantı
 * kaldırma ve engel sonrasında eski imza hâlâ 200 dönerken yetkili
 * indirme 400 dönüyordu. Gerekçenin tamamı ve ölçüm tablosu
 * `useGorselAdresleri` ile `gorselIndir` başlıklarında. Buradaki adres
 * artık yalnız bu sekmenin belleğinde (`URL.createObjectURL`) ve
 * bileşen kalkınca bırakılıyor.
 *
 * İNDİRMEYİ BİLEŞEN KENDİ YAPIYOR
 * -------------------------------
 * Sayfa katmanına taşımak, dosyayı profil verisiyle birlikte önbelleğe
 * almak demekti; yetki profilin ömründen daha çabuk değişebiliyor. Aynı
 * kalıp `BaglantiDugmesi`de de var: kendi durumunu kendi okuyan küçük
 * bileşen.
 *
 * DÖRT DURUM, DÖRDÜ DE AYRI
 * -------------------------
 *   yol yok        baş harfler — fotoğraf gerçekten yok
 *   iniyor         nötr daire; baş harf YANIP SÖNMÜYOR (aşağıda)
 *   indi           fotoğrafın kendisi
 *   inemedi        baş harfler — kırık bir <img> değil
 *
 * BEKLERKEN BAŞ HARF ÇİZİLMİYOR
 * -----------------------------
 * Fotoğrafı olan bir profilde dosya gelene kadar baş harfleri çizmek,
 * her sayfa açılışında "fotoğrafı yok → var" diye bir yanıp sönme
 * üretirdi ve o ilk kare yanlış bilgi olurdu. Bekleme durumu bu yüzden
 * iskelet kalıbı: `animate-pulse`, sayfa iskeletinin kullandığı gri.
 */

interface FotografProps {
  /** Baş harf yedeği ve `alt` metni için; başlıkta görünen adın aynısı. */
  ad: string;
  /** `social_profiles.avatar_path`; fotoğraf yoksa null. */
  yol: string | null;
  /** Ölçü ve yuvarlaklık çağırandan geliyor: başlıkta ve formda farklı. */
  className?: string;
}

/*
  Boş dizi her render'da yeniden üretilmesin diye modül düzeyinde:
  kanca yolların METNİNE bakıyor, yine de gereksiz bir dizi üretmiyoruz.
*/
const YOL_YOK: string[] = [];

export const ProfilFotografi: React.FC<FotografProps> = ({ ad, yol, className = '' }) => {
  const yollar = React.useMemo(() => (yol ? [yol] : YOL_YOK), [yol]);
  const { durum, adresler } = useGorselAdresleri(SOSYAL_AVATAR_KOVASI, yollar);
  const adres = yol ? (adresler.get(yol) ?? null) : null;

  if (yol && durum === 'yukleniyor') {
    return <div aria-hidden className={`animate-pulse bg-gray-100 ${className}`} />;
  }
  if (adres) {
    return <Avatar name={ad} url={adres} className={className} />;
  }
  /*
    Baş harfler: yol yoksa (fotoğraf yok) ya da dosya inemediyse.
    İkinci dalda "fotoğraf gösterilemedi" diye ayrı bir kutu çizmek,
    profil başlığında sebebi kullanıcının çözemeyeceği bir hata satırı
    bırakırdı; `Avatar` kendi `onError` yedeğinde de aynı kararı veriyor.
  */
  return <Avatar name={ad} className={className} />;
};
