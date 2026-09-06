/**
 * COĞRAFİ KEŞİF ASKIYA ALINDI
 *
 * NEDEN KAPALI
 * ------------
 * Küre, ülke çipleri ve ülke seçilince açılan harita canlıda denendi ve
 * beğenilmedi. Özellik SİLİNMEDİ, askıya alındı: bileşenler, hook ve
 * testler yerinde duruyor. Geri açmak için bu sabiti `true` yapmak
 * yeterli; başka hiçbir dosyaya dokunmak gerekmiyor.
 *
 * NEDEN TEK BAYRAK
 * ----------------
 * Kapatma iki ayrı yerde yapılsaydı (arayüzde panel gizlenip durum
 * mantığı açık bırakılsaydı) biri açık biri kapalı kalabilirdi: küre
 * ekranda görünmezken `?yer=TR` adresi haritayı yine açardı ve kullanıcı
 * ulaşamadığı bir seçimin içinde sıkışırdı. Kart sayısı da sessizce
 * değişirdi — harita ilk satırı aldığı için "24 gösteriliyor" 21'e
 * düşerdi. Tek kaynak olması bu iki durumun ayrışmasını imkânsız kılıyor.
 */
export const KESFET_GEO_ACIK = false;
