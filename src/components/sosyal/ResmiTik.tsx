import React from 'react';
import { BadgeCheck } from 'lucide-react';

/**
 * DOĞRULANMIŞ RESMÎ HESAP TİKİ — TEK BİLEŞEN, HER YERDE AYNI
 *
 * NEDEN EMOJİ DEĞİL
 * -----------------
 * Tiki kullanıcı adına ya da biyografiye ✔ diye yazmak üç ayrı şeyi
 * bozardı:
 *
 *   1. Herkes yazabilirdi. Görünen ad ve biyografi serbest metin;
 *      emoji bir yetki işareti değil, bir karakterdir. Doğrulama
 *      göstergesi TAKLİT EDİLEBİLİR olduğu anda göstergelikten çıkar.
 *   2. Ekran okuyucu "beyaz ağır onay işareti" diye okurdu — kullanıcı
 *      adının ortasında, anlamsız.
 *   3. Ad kesilince (mobilde `truncate`) tik de kesilirdi; işaretin
 *      görünmesi metnin uzunluğuna kalırdı.
 *
 * Bu yüzden tik AYRI bir düğüm: kendi `aria-label`ı var, kırpılmıyor
 * (`shrink-0`) ve kaynağı yalnız veritabanındaki bayrak.
 *
 * GÖSTERGENİN KAYNAĞI TEK: `social_profiles.resmi_mi`
 * ---------------------------------------------------
 * Bileşen `resmiMi` dışında hiçbir şeye bakmıyor — ada, alana,
 * paylaşım sayısına değil. Bayrağı yalnız yönetici verebiliyor
 * (`resmi_bayragi_kilidi` + `resmi_hesap_isaretle`, 20260928010000 ve
 * 20260928020000); normal kullanıcı kendi satırında bu alanı
 * değiştiremiyor. Arayüzdeki kapı ikinci kapı, tek kapı değil.
 *
 * PAYLAŞIMDAKİ ROZETİN YERİNE GEÇMİYOR
 * ------------------------------------
 * Akış kartındaki "StajımVar'dan · Resmî içerik" rozeti PAYLAŞIMIN
 * kitlesini anlatıyor; bu tik HESABIN doğrulanmış olduğunu. İkisi
 * farklı şeyler: resmî hesap ileride sıradan bir paylaşım yapabilir —
 * o kartta tik olur, rozet olmaz. Biri ötekinin yerine kullanılsaydı
 * kullanıcı "bu paylaşım resmî mi, bu hesap mı resmî" sorusunu
 * ayıramazdı.
 */

/** Ekran okuyucuya okunan; görsel ipucuyla AYNI ŞEYİ söylemiyor, daha açık söylüyor. */
export const RESMI_TIK_ETIKETI = 'Doğrulanmış StajımVar resmî hesabı';
/** Üzerine gelince ve dokununca görünen kısa açıklama. */
export const RESMI_TIK_ACIKLAMASI = 'StajımVar resmî hesabı';

interface TikProps {
  /** `social_profiles.resmi_mi`. Yanlışsa hiçbir şey çizilmiyor. */
  resmiMi: boolean | null | undefined;
  /**
   * Ölçü çağırandan geliyor: profil başlığında kullanıcı adı satırı,
   * akış kartında daha küçük bir satır. Varsayılan akış ölçüsü.
   */
  className?: string;
}

export const ResmiTik: React.FC<TikProps> = ({ resmiMi, className = 'h-4 w-4' }) => {
  /*
    Resmî olmayan hesapta DOM'a hiçbir şey girmiyor: gizlenmiş bir
    işaret, ekran okuyucuda ya da kopyalanan metinde ortaya çıkabilir.
  */
  if (!resmiMi) return null;

  return (
    /*
      DOKUNMATİKTE DE AÇILIYOR

      `title` yalnız fareyle üzerine gelince çıkıyor; telefonda hiçbir
      karşılığı yok. `tabIndex={0}` + odak/`group-hover` ile balon
      dokunarak da açılabiliyor — dokunmak elemana odak veriyor.

      `role="img"`: tik bir GÖRSEL, bir düğme değil. Düğme yapmak,
      basınca bir şey olacağı sözü vermek olurdu.
    */
    <span
      role="img"
      aria-label={RESMI_TIK_ETIKETI}
      title={RESMI_TIK_ACIKLAMASI}
      tabIndex={0}
      className="group/tik relative inline-flex shrink-0 cursor-default items-center outline-none"
    >
      <BadgeCheck
        aria-hidden
        className={`${className} text-blue-600`}
        /* İçi dolu mavi: ince çizgili hâli küçük ölçüde tanınmıyor. */
        fill="currentColor"
        stroke="white"
        strokeWidth={2}
      />

      {/*
        BALON KONUMU MUTLAK ve `pointer-events-none`

        Akışta olduğu gibi dar satırlarda balon yerleşimi bozmamalı:
        mutlak konum satırın yüksekliğini büyütmüyor. Tıklamayı da
        yutmuyor — altındaki profil bağlantısı tıklanabilir kalıyor,
        ki tik çoğu yerde bir bağlantının İÇİNDE duruyor.
      */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[11px] font-semibold text-white group-hover/tik:block group-focus/tik:block"
      >
        {RESMI_TIK_ACIKLAMASI}
      </span>
    </span>
  );
};
