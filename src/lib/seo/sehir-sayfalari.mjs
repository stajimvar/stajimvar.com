import { ilanIli } from '../ilan-ili.mjs';

/**
 * ŞEHİR SAYFALARI — LİSTE, ADRES VE İLANDAN BAĞLANTI (15 Ekim 2026)
 *
 * Şehir sayfası (sehir-ilanlari.mjs) ve ilan sayfası (ilan-sayfasi.mjs) aynı
 * listeyi ve aynı il kararını kullanıyor. Bu modül yalnız lib/ilan-ili'ye
 * bağlı: sehir-ilanlari.mjs ilan-sayfasi.mjs'i içe aktardığı için ilan
 * sayfası bağlantıyı oradan alsaydı iki modül birbirini içe aktarırdı.
 *
 * Liste bilerek kapalı: yeni bir şehir ancak buraya yazılarak açılır.
 *
 * ANKARA, İZMİR, KOCAELİ, BURSA (23 Kasım 2026, kullanıcı kararı):
 * "ankara staj ilanları" gibi aramalar için. Ölçüldü: o gün açık ilan
 * Ankara 5, Kocaeli 5, İzmir 3, Bursa 1 — hepsi eşiğin (SEHIR_ESIGI, 10)
 * altında. Eşik altı sayfa noindex alıyor ve haritaya girmiyor; ilan
 * sayısı eşiğe ulaşınca kendiliğinden dizine açılıyor. Yani ince sayfa
 * dizine girmiyor ama adres hazır bekliyor.
 */
export const SEHIR_SAYFALARI = Object.freeze({
  istanbul: Object.freeze({ il: 'İstanbul', bulunma: "İstanbul'daki" }),
  ankara: Object.freeze({ il: 'Ankara', bulunma: "Ankara'daki" }),
  izmir: Object.freeze({ il: 'İzmir', bulunma: "İzmir'deki" }),
  kocaeli: Object.freeze({ il: 'Kocaeli', bulunma: "Kocaeli'ndeki" }),
  bursa: Object.freeze({ il: 'Bursa', bulunma: "Bursa'daki" }),
});

export const sehirYolu = (slug, n = 1) => (n <= 1 ? `/staj-ilanlari/${slug}` : `/staj-ilanlari/${slug}/sayfa/${n}`);

/*
  ŞEHİR SAYFASINA İÇ BAĞLANTI

  /staj-ilanlari/istanbul yalnız 3 iç bağlantı alıyordu (hub ve kendi
  sayfalandırması); İstanbul'daki ilanların hiçbiri ona bağlanmıyordu.
  İlan sayfası ve ana sayfa bağlantıyı buradan alıyor. İl kararı şehir
  sayfasının seçimiyle AYNI: ilanIli(ilan) ve SEHIR_SAYFALARI. İkinci bir
  eşleştirme yok; listede olmayan il bağlantı almıyor.
*/
/** @returns {{yol: string, metin: string} | null} */
export function sehirBaglantisi(slug) {
  if (!Object.hasOwn(SEHIR_SAYFALARI, slug)) return null;
  return { yol: sehirYolu(slug), metin: `${SEHIR_SAYFALARI[slug].il} staj ilanları` };
}

/** İlanın ili bir şehir sayfasına karşılık geliyorsa o sayfanın bağlantısı. */
export function ilanSehirBaglantisi(ilan) {
  const il = ilanIli(ilan);
  if (!il) return null;
  const slug = Object.keys(SEHIR_SAYFALARI).find((s) => SEHIR_SAYFALARI[s].il === il);
  return slug ? sehirBaglantisi(slug) : null;
}
