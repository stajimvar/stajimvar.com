/**
 * TARİH BİÇİMLENDİRME — TEK KAYNAK
 *
 * NEDEN VAR
 * ---------
 * Tarih on beş ayrı dosyada elle biçimlendiriliyordu ve iki sonucu vardı:
 *
 *   1. Ham ISO sızıyordu. Ölçüldü (canlı, 1440px): ana sayfa ve /ilanlar
 *      ilan kartlarında "Son: 2026-09-06" yazıyordu — kullanıcıya
 *      gösterilen bir makine biçimi.
 *   2. Tarih-only değerlerde GÜN KAYIYORDU. `new Date('2026-09-06')`
 *      UTC gece yarısı demek; `toLocaleDateString` bunu YEREL saate
 *      çevirdiği için UTC'nin batısındaki bir kullanıcıda 5 Eylül
 *      görünüyor. Son başvuru tarihinde bu bir gün kaybettirir.
 *
 * NASIL ÇÖZÜLÜYOR
 * ---------------
 * "2026-09-06" gibi SAATSİZ bir değer bir takvim günüdür, bir an değil.
 * Bu yüzden UTC saat diliminde biçimlendiriliyor: değer hangi saat
 * diliminde okunursa okunsun aynı günü gösteriyor.
 *
 * Saatli değerler (timestamp) gerçekten bir an; onlar okuyucunun kendi
 * saat diliminde gösteriliyor.
 */

/** Saatsiz tarih: 2026-09-06. Saat, T ya da Z içermez. */
const SADECE_TARIH = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Kullanıcıya gösterilmeyecek değerler.
 *
 * Veri hattı boş alanı üç farklı biçimde bırakabiliyor; üçü de tarih
 * değil. `'—'` ayrıca arayüzde "boş" için kullanılan bir işaret.
 */
function bosDeger(deger) {
  if (deger === null || deger === undefined) return true;
  const s = String(deger).trim();
  return s === '' || s === '-' || s === '—' || s === 'null' || s === 'undefined';
}

function tarihNesnesi(deger) {
  if (bosDeger(deger)) return null;
  if (deger instanceof Date) return Number.isNaN(deger.getTime()) ? null : deger;
  const t = new Date(deger);
  return Number.isNaN(t.getTime()) ? null : t;
}

/**
 * Görünen tarih metni.
 *
 * @param {string|Date|null|undefined} deger
 * @param {{yil?: boolean}} [secenek] `yil: false` → "6 Eylül" (dar kartlar)
 * @returns {string|null} biçimlenmiş metin ya da null (basılmaması gerekir)
 */
export function tarihMetni(deger, secenek = {}) {
  const t = tarihNesnesi(deger);
  if (!t) return null;

  const sadeceTarih = typeof deger === 'string' && SADECE_TARIH.test(deger.trim());
  const bicim = {
    day: 'numeric',
    month: 'long',
    ...(secenek.yil === false ? {} : { year: 'numeric' }),
    /*
      Saatsiz değerde UTC: gün kaymasını burada durduruyoruz.
      Saatli değerde saat dilimi verilmiyor, okuyucunun kendi dilimi
      kullanılıyor — çünkü o gerçekten bir an.
    */
    ...(sadeceTarih ? { timeZone: 'UTC' } : {}),
  };

  return new Intl.DateTimeFormat('tr-TR', bicim).format(t);
}

/**
 * Kısa tarih: "6 Eyl 2026". Dar kutularda ay adı satırı taşırıyorsa.
 */
export function kisaTarihMetni(deger, secenek = {}) {
  const t = tarihNesnesi(deger);
  if (!t) return null;
  const sadeceTarih = typeof deger === 'string' && SADECE_TARIH.test(deger.trim());
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    ...(secenek.yil === false ? {} : { year: 'numeric' }),
    ...(sadeceTarih ? { timeZone: 'UTC' } : {}),
  }).format(t);
}

/**
 * Saatli değer: "6 Eylül 2026 14:30". Yalnızca saatin bilgi taşıdığı
 * yerlerde — etkinlik başlangıcı gibi.
 */
export function tarihSaatMetni(deger) {
  const t = tarihNesnesi(deger);
  if (!t) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(t);
}

/*
  YILA GELEN BULUNMA EKİ: "2026'da", "2025'te", "2020'de"

  Yıl her zaman RAKAMLA yazılıyor; ek, rakamın SESLİ okunuşunun son
  hecesine uyuyor. Tek bir "'da" sabiti 2026 için doğru ama 2027'de
  ("yirmi yedi") "'de", 2025'te ("yirmi beş") "'te" olmak zorunda — sabit
  bir ek ürün yaşlandıkça yanlış yazmaya başlardı. Tablo okunuşun son
  kelimesine göre: ünlü uyumu (a/ı/o/u → a, e/i/ö/ü → e) ve sertleşme
  (ç, f, h, k, p, s, ş, t ile biten kelimede d → t).

  Yalnız son SIFIR OLMAYAN basamak bakılıyor: 2030 "otuz" diye, 2000
  "bin" diye, 2100 "yüz" diye biter.
*/
const BIRLER_EKI = ['', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'];
//                     bir   iki   üç    dört  beş   altı  yedi  sekiz dokuz
const ONLAR_EKI = ['', 'da', 'de', 'da', 'ta', 'de', 'ta', 'te', 'de', 'da'];
//                     on    yirmi otuz  kırk  elli  altmış yetmiş seksen doksan

/**
 * Rakamla yazılmış bir yıla gelen bulunma eki (kesme işaretsiz).
 *
 * @param {number} yil pozitif tam sayı
 * @returns {string} 'da' | 'de' | 'ta' | 'te'
 */
export function yilBulunmaEki(yil) {
  const n = Math.abs(Math.trunc(yil));
  if (n % 10 !== 0) return BIRLER_EKI[n % 10];
  if (n % 100 !== 0) return ONLAR_EKI[(n % 100) / 10];
  /* "yüz" ve "bin" ince ünlüyle bitiyor; ikisi de "'de". Sıfır yıl yok. */
  return 'de';
}

/**
 * Profildeki katılma satırı: "Eylül 2026'da katıldı".
 *
 * Değer bir AN (`social_profiles.created_at`, saatli), takvim günü değil:
 * okuyucunun kendi saat diliminde gösteriliyor — `tarihSaatMetni` ile
 * aynı karar. Ay sonunda gece yarısına yakın açılmış bir hesap iki saat
 * diliminde iki farklı ay gösterebilir; bu bir an için doğru davranış.
 *
 * Yıl `formatToParts`tan okunuyor, biçimlenmiş metnin sonundan kesilmiyor:
 * ek YILA bağlı ve ay adının yazımı ileride değişse bile yıl parçası aynı
 * kalıyor.
 *
 * @param {string|Date|null|undefined} deger
 * @returns {string|null} metin ya da null (satır çizilmemeli)
 */
export function katilmaMetni(deger) {
  const t = tarihNesnesi(deger);
  if (!t) return null;
  const parcalar = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).formatToParts(t);
  const ay = parcalar.find((p) => p.type === 'month')?.value;
  const yil = parcalar.find((p) => p.type === 'year')?.value;
  if (!ay || !yil) return null;
  return `${ay} ${yil}'${yilBulunmaEki(Number(yil))} katıldı`;
}
