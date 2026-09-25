/**
 * Ad ve okul adı yardımcıları — ÇALIŞMA ZAMANI SÜRÜMÜ.
 *
 * Bu fonksiyon `ad.ts` içindeydi. `.mjs` modülleri (ve Node testleri) onu
 * kullanıyor; bir `.mjs` modülü `.ts` dosyasından içe aktaramıyor: Node testte
 * modülü bulamıyordu. Mantığı ikinci kez yazmak yerine buraya taşındı;
 * `ad.ts` onu yeniden dışa veriyor, böylece TypeScript tarafındaki
 * çağrıların hiçbiri değişmedi.
 */

/**
 * Uzun üniversite adını kısaltır: "Mimar Sinan Güzel Sanatlar Üniversitesi" → MSGSÜ.
 *
 * NEDEN KISALTMA
 * --------------
 * Profil satırında okul ve bölüm tek satıra sığmalı. Tam ad yazılınca
 * satır kesiliyor ("Mimar Sinan Güzel Sanatlar Ünive…") ve bölüm adı hiç
 * görünmüyor; oysa satırın asıl bilgisi ikisi birlikte.
 *
 * KURAL DAR TUTULDU
 * -----------------
 * Kısaltma yalnızca ÜÇ ya da daha fazla kelimeli ve yirmi karakterden
 * uzun adlarda yapılıyor. İki kelimeli adlarda ("Boğaziçi Üniversitesi")
 * baş harfler kimsenin kullanmadığı bir kısaltma üretir ("BÜ" değil,
 * herkes "Boğaziçi" der) — o yüzden dokunulmuyor.
 *
 * Baş harfler Türkçe büyütmeyle alınıyor: i → İ.
 */
export function okulKisaltmasi(ad) {
  const temiz = (ad ?? '').trim();
  if (!temiz) return '';

  const kelimeler = temiz.split(/\s+/).filter(Boolean);
  if (kelimeler.length < 3 || temiz.length <= 20) return temiz;

  return kelimeler.map((k) => k[0].toLocaleUpperCase('tr-TR')).join('');
}
