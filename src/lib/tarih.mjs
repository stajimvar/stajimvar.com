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
