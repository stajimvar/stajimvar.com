import React from 'react';
import { XL_SORGUSU, useGenisEkran } from './useGenisEkran';

/**
 * PROFİL SAYFA DÜZENİ — X'İN SAYFASI, SOL MENÜ YOK
 *
 * Kullanıcı kararı 24 Eylül 2026: X sayfa düzeni, sol menü yok. Kullanıcı
 * x.com/StajimVar ekran görüntüsünde sol menünün üstünü çizip "ben sana
 * böyle bir şey yap dedim" yazdı. İstenen, başlığın iç düzeninden önce
 * SAYFANIN düzeni: ortada dar bir profil sütunu, sağında ayrı bir yan
 * sütun. Önceki hâlde kart 1440'ta 1343 piksele yayılıyordu.
 *
 *   ana sütun   `max-w-[600px]` — kapak → kimlik → sayaçlar → paylaşımlar
 *   yan sütun   350 piksel, yapışkan — öneriler, son ilanlar, rehberler
 *   aralık      32 piksel (`gap-8`); iki sütun sayfada ortalı
 *
 * Üç profil ekranı (`/cv` ana görünümü, `/profil/:ad`, şirket sayfası)
 * bu kabı paylaşıyor; ölçüler tek yerde.
 *
 * YAN SÜTUN `xl`DE, `lg`DE DEĞİL — ÖLÇÜLDÜ
 * ----------------------------------------
 * Sayfa kabının yan dolgusu `lg:px-8`. Ölçüldü (Chromium, kaydırma çubuğu
 * dahil): 1024 piksellik pencerede içerik alanı 944.8 piksel; 600 + 32 +
 * 350 = 982 sığmıyor. `lg` ile `xl` arasında ana sütun yine 600 ve ortada,
 * yan sütun çizilmiyor. 1280'de içerik alanı 1184.8 piksel; iki sütun
 * sığıyor ve sol/sağ boşluk 141.4 / 141.6.
 *
 * DAR EKRAN: `lg` altında ana sütun tam genişlik (telefonda bugünkü
 * kenarsız yüzey kalıbı) ve yan sütun DOM'a girmiyor — X de dar ekranda
 * gizliyor. CSS ile gizlemek yetmezdi: yan sütun kendi verisini
 * (öneriler, ilanlar) çekiyor; görünmeyen bir sütun için istek atılırdı.
 * Bu yüzden görünürlük bir medya sorgusu kancasıyla veriliyor.
 *
 * SOL MENÜ YOK: sitenin üst çubuğu gezinmeyi zaten taşıyor.
 */

export const PROFIL_SAYFA_DUZENI = 'lg:flex lg:items-start lg:justify-center lg:gap-8';
export const PROFIL_ANA_SUTUNU = 'w-full min-w-0 lg:max-w-[600px]';
export const PROFIL_YAN_SUTUNU = 'w-[350px] shrink-0 sticky top-4 space-y-4';

export const ProfilSayfaDuzeni: React.FC<{
  /**
   * Yan sütunun içeriği. Verilmezse (oturum yok) ana sütun tek başına
   * ortada duruyor; boş bir sütun ya da yer tutucu çizilmiyor.
   */
  yanSutun?: React.ReactNode;
  /**
   * Düzen uygulanmasın — `/cv` DÜZENLEME kipi. O kip kendi iki sütunlu
   * iskeletini (solda bölüm listesi, sağda form) kullanıyor ve 600
   * piksellik sütuna sığdırılmıyor; içerik olduğu gibi çiziliyor.
   */
  devreDisi?: boolean;
  children: React.ReactNode;
}> = ({ yanSutun, devreDisi = false, children }) => {
  const genis = useGenisEkran(XL_SORGUSU);
  if (devreDisi) return <>{children}</>;
  return (
    <div className={PROFIL_SAYFA_DUZENI}>
      <div className={PROFIL_ANA_SUTUNU}>{children}</div>
      {genis && yanSutun && (
        <aside aria-label="Önerilenler" className={PROFIL_YAN_SUTUNU}>
          {yanSutun}
        </aside>
      )}
    </div>
  );
};
