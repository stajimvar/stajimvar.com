/**
 * SAYFA GENİŞLİĞİ — TEK KAYNAK
 *
 * Üst çubuk, ana içerik ve CV sayfası aynı genişliği kullanmak zorunda;
 * farklı olurlarsa logo içerikle hizalanmıyor. Değer burada, üç dosyada
 * ayrı ayrı değil.
 *
 * NEDEN 1440
 * ----------
 * Önce 1536'ydı. 1920 piksellik ekranda sütunlar 346/716/346 oluyordu;
 * 1440'ta ise 318/660/318. Yani geniş ekranda düzen, üzerinde çalışılan
 * ölçüden farklıydı.
 *
 * NEDEN DAHA DA KISILMADI
 * -----------------------
 * 1280 önerisi geldi ama reklam yuvasını kırıyor. Sağ sütun:
 *     (1280 - 80 kenar boşluğu - sütun araları) / 4 ≈ 288 piksel
 * AdSense kenar çubuğu birimi 300 piksel geniş; 288'e sığmıyor. Alt sınır
 * bu yüzden ~1330; 1440 hem yuvayı rahat alıyor hem tanıdık ölçüyü koruyor.
 */
export const SAYFA_GENISLIGI = 'max-w-[1440px]';
