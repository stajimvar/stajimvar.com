/**
 * ŞİRKET SAYFASI ARAMA BAŞLIĞI (17 Kasım 2026)
 *
 * Türkiye'den gelen şirket aramaları "bosch staj başvurusu", "siemens staj
 * başvurusu", "philip morris staj" biçiminde (Search Console, 17 Eyl –
 * 15 Kas; sıralar 36–96). Başlık yalnız "Bosch staj ilanları" idi;
 * "başvuru" sözcüğü başlıkta da açıklamada da yoktu.
 *
 * Tarayıcı (CompanyPage.tsx) ve ön render (scripts/onrender.mjs) aynı
 * başlığı buradan alıyor.
 */

/** @param {string} ad */
export function sirketSayfaBasligi(ad) {
  return `${ad} Staj İlanları ve Staj Başvurusu | StajımVar`;
}

/**
 * Şirketin kendi açıklaması yoksa kullanılan meta açıklama.
 * @param {{ ad: string, adet?: number, sehirler?: string[] }} p
 */
export function sirketYedekAciklamasi({ ad, adet, sehirler = [] }) {
  const sayi = Number.isInteger(adet) && adet > 0 ? `yayındaki ${adet} staj ilanı` : 'yayındaki staj ilanları';
  const yer = sehirler.length ? ` (${sehirler.slice(0, 3).join(', ')})` : '';
  return `${ad} staj başvurusu: ${sayi}${yer}. Son başvuru tarihi ve nasıl başvurulacağı ilan sayfalarında.`;
}
