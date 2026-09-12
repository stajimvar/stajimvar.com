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
 * NEDEN İKİ KATMAN: ÖN KOŞUL + PUAN
 * ---------------------------------
 * Önce her sinyal puan veriyordu. Ölçüldü: puan veren yedi sinyalin
 * ikisi 71 rehberin 71'inde vardı (hızlı cevap ve en az üç SSS),
 * çünkü rehber şablonu ikisini de zorunlu tutuyor. Yani her yazı daha
 * başlarken +2 alıyordu ve eşiğe yalnız üç puan kalıyordu; uzunluk,
 * liste ve kaynak üçlüsü onu zaten dolduruyordu. Kapı "editoryal güç"
 * değil "şablona uygun mu" ölçüyordu — 71 rehberin 51'i geçiyordu.
 *
 * Eşiği yükseltmek bunu düzeltmezdi, aynı ayrımsız puanın kestiği yeri
 * kaydırırdı. Herkeste bulunan sinyal ÖN KOŞULA taşındı: yoksa yazı
 * güçlü sayılamıyor, varsa puan getirmiyor. Puan yalnızca rehberden
 * rehbere DEĞİŞEN şeylerden geliyor.
 *
 * Aynı hamle daha önce güncelleme tarihinde yapılmıştı; sebebi de aynı.
 *
 * ÖLÇÜLEN DAĞILIM (71 rehber, yeni puanla)
 *   puan 1: 1 · 2: 14 · 3: 32 · 4: 22 · 5: 2
 *   eşik 3 → 56 rehber (%79)  hâlâ ayırmıyor
 *   eşik 4 → 24 rehber (%34)  seçilen
 *   eşik 5 →  2 rehber (%3)   fazla dar
 *
 * @param {{kelime?: number, sss?: number, kaynak?: number,
 *          karsilastirma?: boolean, liste?: number, tablo?: boolean,
 *          hizliCevap?: boolean, dayanak?: boolean}} sinyaller
 */
export function editoryalDeger(sinyaller = {}) {
  const nedenler = [];
  const eksikler = [];

  /*
    ÖN KOŞULLAR — puan getirmiyor, yokluğu eliyor.

    Kaynak ya da dayanak: yazının neye dayandığını söylemeyen bir sayfa
    güçlü sayılamaz. İkisinden biri yeterli, çünkü rehberlerin bir kısmı
    mevzuata değil başvuru pratiğine dayanıyor ve bunu açıkça yazıyor.
  */
  if (!sinyaller.hizliCevap) eksikler.push('hızlı cevap yok');
  if ((sinyaller.sss ?? 0) < 3) eksikler.push('en az üç SSS yok');
  if ((sinyaller.kaynak ?? 0) < 1 && !sinyaller.dayanak) {
    eksikler.push('kaynak ya da dayanak yok');
  }

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

  if ((sinyaller.kaynak ?? 0) >= 1) { puan += 1; nedenler.push('resmî kaynak'); }
  if ((sinyaller.liste ?? 0) >= 6) { puan += 1; nedenler.push('kontrol listesi'); }
  if (sinyaller.karsilastirma) { puan += 1; nedenler.push('iyi/kötü karşılaştırması'); }
  /*
    Tablo yeni bir sinyal. Puan vermiyordu ama 20 rehberde var ve
    karşılaştırmayla aynı işi yapıyor: iki şeyi yan yana koymak. Sayım
    onu zaten ölçüyordu, ölçüp kullanmamak için sebep yoktu.
  */
  if (sinyaller.tablo) { puan += 1; nedenler.push('tablo'); }

  const sinif = eksikler.length
    ? 'THIN_OR_INCOMPLETE'
    : puan >= 4
      ? 'EDITORIAL_STRONG'
      : puan >= 2
        ? 'EDITORIAL_MEDIUM'
        : 'THIN_OR_INCOMPLETE';

  return {
    puan,
    sinif,
    nedenler: [...nedenler, ...eksikler.map((e) => `EKSİK: ${e}`)],
    eksikler,
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

  /*
    HİÇ METNİ OLMAYAN SAYFA HER HÂLÜKÂRDA DİZİN DIŞI

    Aşağıdaki sinyal sayımı metnin UZUNLUĞUNA hiç bakmıyordu ve pratikte
    hiçbir şeyi elemiyordu: her etkinliğin bir tarihi ve bir şehri var,
    bu da iki sinyal ediyor. Ölçüldü: yayındaki 136 etkinliğin 136'sı
    indekse giriyordu, oysa 22'sinin açıklaması TAMAMEN BOŞTU.

    Açıklaması boş bir sayfada özgün metin diye yalnızca başlık kalıyor.
    Böyle 22 sayfa, sitenin tamamının "düşük değerli içerik" sayılmasına
    yetiyor — kazancı olmayan, riski olan sayfalar.

    Kısa açıklamalılar elenmiyor: aşağıdaki notta anlatıldığı gibi tarihi,
    yeri ve kaynağı olan bir etkinlik öğrenciye gerçek bilgi veriyor.
    Eleme yalnızca hiç cümlesi olmayanlara uygulanıyor.
  */
  if (!aciklama || !String(aciklama).trim()) {
    return { indeks: false, neden: 'NO_TEXT' };
  }

  /* Doğrulanmış kaynak + en az bir ek bağlam (açıklama, ilişki, tarih). */
  const baglam =
    (aciklama && String(aciklama).trim().length >= 80 ? 1 : 0) +
    (sonKontrol ? 1 : 0) +
    (ekBaglam ? 1 : 0);

  /*
    EN AZ İKİ BAĞLAM SİNYALİ

    Tek sinyal fazla gevşekti: yalnız bir tarihi olan, başka hiçbir şey
    anlatmayan sayfa da geçiyordu. İki sinyal, "ne, nerede, ne zaman"
    sorusundan en az ikisinin cevaplandığı anlamına geliyor.

    Eşik yine de sertleştirilmedi: açıklaması kısa ama tarihi, yeri ve
    resmî kaynağı olan bir etkinlik öğrenciye gerçek bilgi veriyor —
    onu "ince" sayıp Google'dan silmek, kullanıcıya değeri olan bir
    sayfayı yok etmek olurdu.
  */
  if (baglam < 2) return { indeks: false, neden: 'THIN_NO_VALUE' };
  return { indeks: true, neden: 'OK' };
}
