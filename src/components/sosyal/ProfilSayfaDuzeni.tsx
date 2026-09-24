import React from 'react';
import { SOL_SUTUN_SORGUSU, XL_SORGUSU, useGenisEkran } from './useGenisEkran';

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
 *
 * SOL SÜTUN: KAMPÜSÜM (kullanıcı tasarımı, 25 Eylül 2026)
 * -------------------------------------------------------
 * Menü değil, bakan öğrencinin kampüs paneli (`KampusumPaneli`). 330
 * piksel, yapışkan; orta 600 ve sağ 350 değişmiyor. Üçü ve iki ara 1344
 * piksel istiyor ve kabın en geniş içeriği 1440 − 80 = 1360.
 * Ölçüldü (Chromium, kaydırma çubuğu 15 piksel): 1440 pencerede içerik
 * alanı 1345, üç sütun 330 / 600 / 350 sığıyor; 1710'da 1360. 1280'de
 * içerik 1185, sol sütun yok ve ana/yan sütun eski yerinde (x 141.4).
 * Eşik bu yüzden 1440 (`SOL_SUTUN_SORGUSU`), bir üst kırılım gerekmedi.
 * Kaydırma çubuğu 17 piksel olan pencerede 1440'ta 1343 kalıyor; o bir
 * piksellik açığı sol sütun karşılıyor (`PROFIL_SOL_SUTUNU` notu).
 *
 * Görünmediği genişlikte panel ana sütunda, profil kartının altında
 * çiziliyor; kararı sayfalar `useSolSutunAcik` ile bu kapla AYNI sorgudan
 * okuyor. İki yerleşimden yalnız biri DOM'da: panel kendi verisini
 * çekiyor, görünmeyen kopya ikinci bir istek olurdu (yan sütunla aynı
 * gerekçe).
 */

export const PROFIL_SAYFA_DUZENI = 'lg:flex lg:items-start lg:justify-center lg:gap-8';
export const PROFIL_ANA_SUTUNU = 'w-full min-w-0 lg:max-w-[600px]';
export const PROFIL_YAN_SUTUNU = 'w-[350px] shrink-0 sticky top-4 space-y-4';
/*
  Sol sütun `shrink-0` DEĞİL, ana sütun sol sütun varken `shrink-0`:
  kaydırma çubuğu 17 piksel olan bir pencerede eşikte bir iki piksel
  eksik kalabiliyor. Açığı 600'lük profil sütunu değil, "~330" olan panel
  karşılıyor.
*/
export const PROFIL_SOL_SUTUNU = 'w-[330px] min-w-0 sticky';

/*
  SOL SÜTUN EKRANDAN UZUN OLABİLİYOR — X'İN YAPIŞMA KURALI

  Kampüsüm üç bölümle 1440 × 1000 pencerede 1093 piksel ölçüldü
  (ölçüm verisi: dört yemek, dört duyuru, üç burs).
  `top-4` ile yapışsaydı ekrana sığmayan alt kısmı (burslar) sayfa
  bitene kadar hiç görünmezdi. X'in yan sütunu gibi: sütun sayfayla
  kayıyor ve ALT kenarı pencerenin altına gelince orada duruyor. Sığıyorsa
  `top` 16 piksel ve eski davranışın aynısı. Boy değişince (bölümler
  yüklenince) yeniden hesaplanıyor.
*/
const SOL_BOSLUK = 16;

const SolSutun: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [ust, setUst] = React.useState(SOL_BOSLUK);
  React.useLayoutEffect(() => {
    const kutu = ref.current;
    if (!kutu) return;
    const hesapla = () => setUst(Math.min(SOL_BOSLUK, window.innerHeight - kutu.offsetHeight - SOL_BOSLUK));
    hesapla();
    const gozlemci = typeof ResizeObserver === 'function' ? new ResizeObserver(hesapla) : null;
    gozlemci?.observe(kutu);
    window.addEventListener('resize', hesapla);
    return () => {
      gozlemci?.disconnect();
      window.removeEventListener('resize', hesapla);
    };
  }, []);
  return (
    <div ref={ref} className={PROFIL_SOL_SUTUNU} style={{ top: ust }}>
      {children}
    </div>
  );
};

/** Sol sütun şu an açık mı — sayfalar paneli ana sütuna koyup koymayacağını buradan okuyor. */
export function useSolSutunAcik(): boolean {
  return useGenisEkran(SOL_SUTUN_SORGUSU);
}

export const ProfilSayfaDuzeni: React.FC<{
  /**
   * Yan sütunun içeriği. Verilmezse (oturum yok) ana sütun tek başına
   * ortada duruyor; boş bir sütun ya da yer tutucu çizilmiyor.
   */
  yanSutun?: React.ReactNode;
  /**
   * Sol sütunun içeriği (Kampüsüm). Yalnız `SOL_SUTUN_SORGUSU` tuttuğunda
   * çiziliyor; tutmadığında çağıran aynı paneli ana sütuna koyuyor.
   */
  solSutun?: React.ReactNode;
  /**
   * Düzen uygulanmasın — `/cv` DÜZENLEME kipi. O kip kendi iki sütunlu
   * iskeletini (solda bölüm listesi, sağda form) kullanıyor ve 600
   * piksellik sütuna sığdırılmıyor; içerik olduğu gibi çiziliyor.
   */
  devreDisi?: boolean;
  children: React.ReactNode;
}> = ({ yanSutun, solSutun, devreDisi = false, children }) => {
  const genis = useGenisEkran(XL_SORGUSU);
  const solAcik = useSolSutunAcik();
  if (devreDisi) return <>{children}</>;
  const sol = solAcik && solSutun ? solSutun : null;
  return (
    <div className={PROFIL_SAYFA_DUZENI}>
      {sol && <SolSutun>{sol}</SolSutun>}
      <div className={sol ? `${PROFIL_ANA_SUTUNU} shrink-0` : PROFIL_ANA_SUTUNU}>{children}</div>
      {genis && yanSutun && (
        <aside aria-label="Önerilenler" className={PROFIL_YAN_SUTUNU}>
          {yanSutun}
        </aside>
      )}
    </div>
  );
};
