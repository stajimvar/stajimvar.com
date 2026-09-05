/**
 * Asgari ücret ve staj ücreti alt sınırı — TEK KAYNAK.
 *
 * NEDEN MERKEZDE
 * --------------
 * Tutar ve oran hem hesaplama aracında hem staj ücreti rehberinde ayrı ayrı
 * yazılıydı. Asgari ücret yılda en az bir kez değişiyor; iki yerde duran bir
 * sayı er geç ayrışıyor ve site aynı soruya iki cevap veriyor. Buradan
 * okunuyor, buradan güncelleniyor.
 *
 * GÜNCELLEME
 * ----------
 * Yeni yılın rakamı Resmî Gazete'de yayımlanınca YALNIZCA bu dosya
 * değişecek: YIL, NET_KURUS, BRUT_KURUS ve DOGRULANDI. Kaynak bağlantıları
 * da o kararın kendi adresiyle güncellenmeli — haber sayfası zamanla
 * taşınabiliyor, Resmî Gazete PDF'i kalıcı.
 */

/** Yürürlükteki asgari ücretin ait olduğu yıl. */
export const YIL = 2026;

/**
 * Net ve brüt tutar, KURUŞ cinsinden tam sayı.
 *
 * Kuruş tutuluyor çünkü 2026 net tutarı tam da kuruşlu: 28.075,50 TL.
 * Lirayı ondalıkla tutmak, aracın düzeltilen hatasının kapıyı yeniden
 * aralaması demekti (bkz. lib/para.mjs).
 */
export const NET_KURUS = 2_807_550;
export const BRUT_KURUS = 3_303_000;

/** Bu rakamların resmî kaynaktan son doğrulandığı tarih. */
export const DOGRULANDI = '2026-09-03';

/** Tutarın dayandığı resmî kaynaklar. */
export const KAYNAK = {
  karar: {
    etiket: 'Asgari Ücret Tespit Komisyonu Kararı (2025/1) — Resmî Gazete',
    adres: 'https://www.resmigazete.gov.tr/eskiler/2025/12/20251226-6.pdf',
  },
  duyuru: {
    etiket: 'Çalışma ve Sosyal Güvenlik Bakanlığı duyurusu',
    adres: 'https://www.csgb.gov.tr/cgm/haberler/23122025/',
  },
};

/**
 * 3308 sayılı Mesleki Eğitim Kanunu m.25'teki alt sınır oranları.
 *
 * Kanunun kendi cümlesi (mevzuat.gov.tr, 3 Eylül 2026'da metinden
 * doğrulandı):
 *
 *   "…işletmelerde mesleki eğitim gören öğrenciler ile mesleki ve teknik
 *   ortaöğretim okul ve kurumlarında staj veya tamamlayıcı eğitim gören
 *   öğrencilere ASGARİ ÜCRETİN NET TUTARININ; yirmi ve üzerinde personel
 *   çalıştıran işyerlerinde yüzde otuzundan, yirmiden az personel çalıştıran
 *   işyerlerinde yüzde onbeşinden … aşağı ücret ödenemez."
 *
 * Oranın brüte değil NET tutara bağlı olması bu cümleden geliyor; araç ve
 * rehber "net asgari ücret" demeli.
 */
export const ORAN = {
  /** Yirmiden az personel çalıştıran işyeri. */
  kucukIsyeri: 15,
  /** Yirmi ve üzerinde personel çalıştıran işyeri. */
  buyukIsyeri: 30,
  kaynak: {
    etiket: '3308 sayılı Mesleki Eğitim Kanunu, madde 25',
    adres: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.3308.pdf',
  },
};

/**
 * KAPSAM DIŞI — aracın söylemesi gereken sınır.
 *
 * Aynı fıkranın son cümlesi: "Staj yapacak işletme bulunamaması nedeniyle
 * stajını okulda yapan ortaöğretim öğrencileri ile yükseköğretim kurumları
 * ve birimlerinde yapan yükseköğretim öğrencilerinin yaptıkları stajlar bu
 * fıkra hükmü kapsamı dışındadır."
 *
 * Yani stajını okulunda/üniversitesinde yapan öğrenci bu alt sınıra
 * dayanamıyor. Aracı kullanan öğrenciye bunu söylemezsek, hakkı olmayan bir
 * tutarı hakkıymış gibi göstermiş oluruz.
 */
export const KAPSAM_DISI =
  'Staj yapacak işletme bulunamadığı için stajını kendi okulunda ya da üniversitesinde yapan öğrenciler bu alt sınırın kapsamı dışında.';
