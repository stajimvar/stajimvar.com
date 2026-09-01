/**
 * İKİ AYRI KARAR: REKLAM VE İNDEKS
 *
 * Bir sayfanın reklam göstermeye uygun olmaması, onu arama motorundan
 * silmek için sebep DEĞİL. İki karar birbirinden bağımsız:
 *
 *   ADS_VALUE_GATE   — burada reklam gösterilebilir mi?
 *   INDEX_VALUE_GATE — bu sayfa kullanıcıya değer veriyor mu?
 *
 * Google'ın ilkesi "düşük değerli ya da özgün yayıncı içeriği olmayan
 * yüzeyde reklam olmaz". Bu, "içerik kısa ise sayfayı sil" demek değil.
 *
 * EŞİKLER GOOGLE'IN YAZDIĞI EŞİKLER DEĞİL
 * ---------------------------------------
 * "1000 kelime altı reklam yasak", "domain 3 aylık olmalı" gibi kurallar
 * Google politikasında yok; internette dolaşan tahminler. Burada kelime
 * sayısı yalnız SİNYALLERDEN BİRİ ve ölçülmüş gerçeğe göre kalibre
 * edildi: 70 rehberin medyanı 396 kelime, en uzunu 894. "1000 kelime"
 * eşiği bu sitede bütün içeriği elerdi ve hiçbir şey anlatmazdı.
 */

/** Reklam gösterilebilecek route aileleri. */
export const REKLAM_ACIK_AILELER = ['/rehber/'];

/**
 * Reklamın KAPALI olduğu aileler.
 *
 * Ortak yanları: sayfanın ana içeriği bizim yazdığımız metin değil —
 * şirketin ilanı, kurumun duyurusu, etkinliğin tanıtımı ya da
 * kullanıcının kendi verisi. Bunların yanında reklam göstermek,
 * başkasının içeriğinden gelir üretmeye en yakın duran şey.
 */
export const REKLAM_KAPALI_AILELER = [
  '/ilan/',
  '/sirket/',
  '/firsatlar/',
  '/kesfet/',
  '/burslar',
  '/kyk',
  '/yurtdisi-firsatlari',
  '/yarismalar',
  '/firsat-takvimi',
  '/gizlilik',
  '/kvkk-aydinlatma-metni',
  '/cerez-politikasi',
  '/kullanim-kosullari',
  '/hakkimizda',
  '/iletisim',
  '/ilan-kurallari',
  '/ilan-bildir',
  '/sirket/ilanlar',
  '/sirket/basvuranlar',
  '/sirket/profil',
  '/basvurularim',
  '/profil',
  '/cv',
];

/**
 * Bu adreste reklam yuvası çizilebilir mi?
 *
 * Ana sayfa dahil hiçbir liste/veri yüzeyinde reklam yok: ana sayfanın
 * içeriği şirketlerin ilanları, bizim yazımız değil.
 */
export function reklamGosterilebilir(yol, editoryalGecti = false) {
  const temiz = (yol || '/').split('?')[0].replace(/\/+$/, '') || '/';
  if (temiz === '/') return false;
  if (REKLAM_KAPALI_AILELER.some((a) => temiz === a.replace(/\/$/, '') || temiz.startsWith(a))) {
    return false;
  }
  if (!REKLAM_ACIK_AILELER.some((a) => temiz.startsWith(a))) return false;
  return editoryalGecti;
}

/**
 * EDİTORYAL DEĞER KAPISI
 *
 * Kelime sayısı tek başına karar değil; sinyallerden biri. Bir rehberin
 * reklam göstermeye uygun sayılması için özgün anlatımın yanında
 * okuyucuya bağımsız değer veren en az iki yapı gerekiyor.
 *
 * @param {{kelime?: number, sss?: number, kaynak?: number,
 *          karsilastirma?: boolean, liste?: number, hizliCevap?: boolean,
 *          guncelleme?: boolean, tamamlanmis?: boolean}} sinyaller
 */
export function editoryalDeger(sinyaller = {}) {
  const nedenler = [];
  let puan = 0;

  const kelime = sinyaller.kelime ?? 0;
  if (kelime >= 600) {
    puan += 2;
    nedenler.push(`gövde ${kelime} kelime`);
  } else if (kelime >= 350) {
    puan += 1;
    nedenler.push(`gövde ${kelime} kelime`);
  } else {
    nedenler.push(`gövde kısa (${kelime} kelime)`);
  }

  if ((sinyaller.sss ?? 0) >= 3) { puan += 1; nedenler.push('sık sorulanlar'); }
  if ((sinyaller.kaynak ?? 0) >= 1) { puan += 1; nedenler.push('resmî kaynak'); }
  if (sinyaller.karsilastirma) { puan += 1; nedenler.push('iyi/kötü karşılaştırması'); }
  if ((sinyaller.liste ?? 0) >= 6) { puan += 1; nedenler.push('kontrol listesi'); }
  if (sinyaller.hizliCevap) { puan += 1; nedenler.push('hızlı cevap'); }
  if (sinyaller.guncelleme) { puan += 1; nedenler.push('gözden geçirme tarihi'); }

  const sinif =
    puan >= 5 ? 'EDITORIAL_STRONG' : puan >= 3 ? 'EDITORIAL_MEDIUM' : 'THIN_OR_INCOMPLETE';

  return {
    puan,
    sinif,
    nedenler,
    /* Reklam yalnız GÜÇLÜ sayfada. Orta seviye indekslenir ama reklamsız. */
    reklamUygun: sinif === 'EDITORIAL_STRONG',
  };
}

/**
 * İNDEKS DEĞER KAPISI — REKLAMDAN BAĞIMSIZ
 *
 * Reklam kapalı olması indeksten çıkarma sebebi değil. Bir sayfa
 * kullanıcıya doğrulanmış bilgi ve bir sonraki adımı veriyorsa arama
 * sonucunda durmayı hak ediyor.
 *
 * @returns {{indeks: boolean, neden: string}}
 */
export function indeksDegeri(alanlar = {}) {
  const { baslik, kaynakAdresi, sonKontrol, aciklama, ekBaglam } = alanlar;

  if (!baslik || !String(baslik).trim()) {
    return { indeks: false, neden: 'INCOMPLETE' };
  }
  if (!kaynakAdresi) {
    return { indeks: false, neden: 'MISSING_SOURCE' };
  }

  /* Doğrulanmış kaynak + en az bir ek bağlam (açıklama, ilişki, tarih). */
  const baglam =
    (aciklama && String(aciklama).trim().length >= 80 ? 1 : 0) +
    (sonKontrol ? 1 : 0) +
    (ekBaglam ? 1 : 0);

  if (baglam === 0) return { indeks: false, neden: 'THIN_NO_VALUE' };
  return { indeks: true, neden: 'OK' };
}
