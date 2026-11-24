/**
 * PLANLI KAPANIŞ (25 Kasım 2026)
 *
 * Workday, GitHub koşucularından gelen her isteği 429 ile reddediyor
 * (PUMA, PwC, Bentley, Signify — ölçüldü). Bu ilanlar elle, doğrulanmış
 * olarak ekleniyor; otomasyon açık olup olmadıklarını kontrol edemiyor.
 * Kullanıcı kararı: "son kapanma tarihi belirle, o gün gelince kapansın".
 *
 * Tarih `raw.planli_kapanis`'ta (YYYY-AA-GG) duruyor, `application_deadline`
 * alanında DEĞİL: o alan ilan sayfasında "Son başvuru" diye gösteriliyor ve
 * şirketin vermediği bir tarihi resmî son başvuru gibi sunmak yanlış beyan.
 *
 * Günlük bağlantı kontrolü (scripts/ilan-baglanti-kontrol.mjs) tarihi gelen
 * ilanı kapatıyor; bu sebeple kapanan ilan, sayfası açık görünse de yeniden
 * yayına alınmıyor.
 */
export const PLANLI_KAPANIS_SEBEBI = 'planli_kapanis';

/** İlanın planlı kapanış tarihi (YYYY-AA-GG) ya da null. */
export function planliKapanisTarihi(ilan) {
  const t = String(ilan?.raw?.planli_kapanis ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

/** `bugun` (İstanbul, YYYY-AA-GG) kapanış gününe geldi ya da geçti mi. */
export function planliKapanisGeldiMi(ilan, bugun) {
  const t = planliKapanisTarihi(ilan);
  return Boolean(t) && t <= bugun;
}

/** Planlı kapanışla kapanmış ilan yeniden açılmaz. */
export const planliKapandiMi = (ilan) => ilan?.closure_reason === PLANLI_KAPANIS_SEBEBI;
