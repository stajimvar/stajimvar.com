/**
 * ANASAYFADA GÖSTERİLEN VERİ SAYILARI.
 *
 * NEDEN AYRI BİR DOSYA
 * --------------------
 * `SonrakiAdim` anasayfanın altında duruyor ve üç yerde yalnızca bir
 * SAYI gösteriyor: kaç bölüm, kaç kurum, kaç kariyer merkezi. Bu sayıları
 * `BOLUMLER.length` ile okumak için veri dosyalarını import etmek
 * gerekiyordu ve ölçüldü: bu tek satır, `src/data/bolumler.ts` (205 KB)
 * ile `stajProgramlari.ts` (21 KB) dosyalarını ana JavaScript paketine
 * taşıyordu. Anasayfayı açan herkes, /bolumler sayfasına hiç girmese de
 * bütün bölüm rehberlerini indiriyordu.
 *
 * NEDEN YİNE DE YALAN SÖYLEMİYOR
 * ------------------------------
 * Elle yazılmış bir sayı zamanla veriden kopar. `tests/veri-sayilari.test.mjs`
 * bu üç sayıyı gerçek veri dosyalarıyla karşılaştırıyor: veri değişip bu
 * dosya güncellenmezse test kırmızı yanıyor.
 */

/** `src/data/bolumler.ts` içindeki bölüm sayısı. */
export const BOLUM_SAYISI = 42;

/** `src/data/stajProgramlari.ts` içindeki kurum sayısı. */
export const STAJ_PROGRAMI_SAYISI = 44;

/** `src/data/kariyerMerkezleri.ts` içindeki üniversite sayısı. */
export const KARIYER_MERKEZI_SAYISI = 22;
