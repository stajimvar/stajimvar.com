/**
 * BELGE SAYFALARI İLE UYGULAMA BÖLÜMLERİNİN AYRIMI.
 *
 * Sitede iki farklı şey var ve ikisi aynı önbellek kuralını kaldırmıyor:
 *
 *   BELGE — herkese aynı gelen, kişiye göre değişmeyen sayfalar:
 *   anasayfa, ilan sayfaları, bölüm rehberleri, öğrenci rehberi. Bunların
 *   HTML'i ziyaretçiden bağımsız; kenardan saniyeler boyunca aynı cevap
 *   verilebilir ve verilmeli — ilk açılışta en pahalı bekleme burası.
 *
 *   UYGULAMA — oturuma bağlı ekranlar: profil, işveren tarafı, yönetim,
 *   CV, kaydedilenler. HTML kabuğu teknik olarak aynı olsa bile bu
 *   adresler kişiye ait bir bağlamda açılıyor; kenarda tutulan bir cevap
 *   yarın yanlış kişiye gidebilir. Bunlar önbelleğe HİÇ girmiyor.
 *
 * Ayrım burada tek bir yerde tanımlı ve `functions/_middleware.ts` ile
 * `tests/onbellek-politikasi.test.mjs` aynı listeyi okuyor: iki ayrı
 * kopya tutulsaydı biri değiştiğinde öteki sessizce eskirdi.
 */

/** Kişiye bağlı bölümler. Alt adresleri de kapsıyor. */
export const UYGULAMA_BOLUMLERI = [
  '/profil',
  '/isveren',
  '/yonetim',
  '/cv',
  '/baglantilar',
  '/bana-uygun',
  '/kaydedilen-firsatlar',
  '/sifre-yenile',
];

/** Herkese açık belge bölümleri. Alt adresleri de kapsıyor. */
export const BELGE_BOLUMLERI = ['/ilan', '/bolum', '/rehber'];

const kirp = (yol) => yol.replace(/\/+$/, '') || '/';

const bolumdeMi = (yol, bolumler) => {
  const temiz = kirp(yol);
  return bolumler.some((b) => temiz === b || temiz.startsWith(`${b}/`));
};

export function uygulamaBolumuMu(yol) {
  return bolumdeMi(yol, UYGULAMA_BOLUMLERI);
}

/**
 * Bu adres herkese açık bir belge sayfası mı?
 *
 * Uygulama bölümleri önce eleniyor: `/isveren` ön render edilmiş bir
 * sayfa olsa da uygulama tarafına ait ve önbelleğe girmemeli.
 */
export function belgeSayfasiMi(yol) {
  if (uygulamaBolumuMu(yol)) return false;
  return kirp(yol) === '/' || bolumdeMi(yol, BELGE_BOLUMLERI);
}

/**
 * Oturum çerezi taşıyan istek önbelleğe hiç girmiyor.
 *
 * Belge sayfalarının HTML'i kişiye göre değişmiyor; yine de giriş yapmış
 * bir ziyaretçinin cevabını kenarda tutmuyoruz. Sebebi kurallı olmak
 * değil, hata payı: ileride kabuğa kişiye özel tek bir satır eklendiğinde
 * bu kapı zaten kapalı olsun. Supabase oturumunu `sb-...` çerezlerinde
 * tutuyor.
 */
export function oturumCereziVarMi(cerezBasligi) {
  if (!cerezBasligi) return false;
  return /(^|;\s*)sb-[^=]*=/.test(cerezBasligi);
}

/**
 * Belge sayfaları için önbellek başlığı.
 *
 * `max-age=0` — tarayıcı her seferinde soruyor; kullanıcı bayat sayfa
 * görmüyor. `s-maxage=60` — paylaşılan önbellek bir dakika boyunca aynı
 * cevabı veriyor. `stale-while-revalidate=300` — bir dakika dolduktan
 * sonraki ilk istek beklemeden bayat kopyayı alıyor, tazeleme arkada
 * yapılıyor.
 *
 * Üst sınır 60 saniye: yeni yayımlanan bir ilan en çok bir dakika gecikmeyle
 * görünür oluyor.
 *
 * DİKKAT — BU BAŞLIK TEK BAŞINA HİÇBİR ŞEY YAPMIYOR.
 * Ölçüldü (12 Eylül 2026, canlı):
 *   GET https://stajimvar.com/            → cf-cache-status: DYNAMIC
 *   GET https://stajimvar.com/bolum/...   → cf-cache-status: DYNAMIC
 *   GET https://stajimvar.com/assets/*.js → cf-cache-status: MISS (yani
 *                                            önbelleğe giriyor)
 * Cloudflare varsayılan davranışında HTML'i önbelleğe ALMIYOR; `s-maxage`
 * yazmak bunu değiştirmiyor. Bu yüzden önbellek ara katmanda Cache API
 * ile AÇIKÇA yapılıyor (bkz. `functions/_middleware.ts`). Başlık yine de
 * yazılıyor: tarayıcı ve varsa aradaki başka önbellekler için doğru
 * sözleşme bu.
 */
export const BELGE_ONBELLEGI = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

/** Kenar önbelleğinde bir kopyanın kaç saniye TAZE sayılacağı. */
export const BELGE_TAZELIK_SN = 60;

/**
 * Tazelik bittikten sonra kopyanın kaç saniye daha SUNULABİLECEĞİ.
 *
 * `stale-while-revalidate=300` ile aynı sayı: bu pencerede ziyaretçi
 * beklemeden bayat kopyayı alıyor, tazeleme arkada yapılıyor.
 */
export const BELGE_BAYAT_SN = 300;

/**
 * Bir kopyanın yaşına göre ne yapılacağı.
 *
 * NEDEN ELLE HESAPLANIYOR
 * -----------------------
 * Ölçüldü (wrangler pages dev, 12 Eylül 2026): `cache.put` ile yazılan
 * kopya `s-maxage=60` başlığına rağmen 75 saniye sonra hâlâ `HIT`
 * dönüyordu — Cache API'nin yerel gerçeklemesi süreyi uygulamıyor.
 * Cloudflare kenarında davranış farklı olabilir; "ortama göre değişen
 * tazelik" ise ne test edilebilir ne de güvenilir.
 *
 * Bu yüzden yaş kopyanın içine yazılan zaman damgasından hesaplanıyor ve
 * karar burada veriliyor. Böylece yerelde ölçtüğümüz davranış canlıda da
 * aynı.
 */
export function kopyaKarari(yasSn) {
  if (!Number.isFinite(yasSn) || yasSn < 0) return 'yok';
  if (yasSn <= BELGE_TAZELIK_SN) return 'taze';
  if (yasSn <= BELGE_TAZELIK_SN + BELGE_BAYAT_SN) return 'bayat';
  return 'yok';
}

/**
 * Kenar önbelleği anahtarı: yalnız ADRES YOLU.
 *
 * Sorgu dizesi kasten dışarıda. Ön render her yol için TEK bir dosya
 * yazıyor; `?utm_source=...`, `?ulke=DE` ya da `?fbclid=...` aynı HTML'i
 * döndürüyor. Sorguyu anahtara katmak her pazarlama bağlantısı için ayrı
 * bir kopya üretir ve önbelleği neredeyse hiç isabet etmez hâle getirirdi.
 *
 * Ülke seçimi istemcide okunuyor (src/components/useGlobalListingPreferences.ts),
 * HTML'i değiştirmiyor.
 */
export function onbellekAnahtariAdresi(url) {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
}

/**
 * Bu istek kenar önbelleğinden okunabilir/yazılabilir mi?
 *
 * Üç koşul: GET olacak, herkese açık bir belge sayfası olacak ve oturum
 * çerezi TAŞIMAYACAK. Çerezli istek önbelleğe hiç bakmıyor — ne okuyor ne
 * yazıyor.
 */
export function kenardaTutulabilirMi({ yontem, yol, cerez }) {
  if (yontem !== 'GET') return false;
  if (oturumCereziVarMi(cerez)) return false;
  return belgeSayfasiMi(yol);
}

/** Uygulama bölümleri ve oturumlu istekler için. */
export const OZEL_ONBELLEK = 'private, no-store';

/**
 * Bu cevaba önbellek başlığı yazılmalı mı, yazılacaksa hangisi?
 *
 * `null` dönerse cevaba dokunulmuyor: HTML olmayan her şey (API yanıtları,
 * JSON, varlıklar) kendi başlıklarıyla geçiyor.
 */
export function onbellekBasligi({ yol, contentType, cerez }) {
  if (!contentType || !contentType.includes('text/html')) return null;
  if (oturumCereziVarMi(cerez)) return OZEL_ONBELLEK;
  if (uygulamaBolumuMu(yol)) return OZEL_ONBELLEK;
  if (belgeSayfasiMi(yol)) return BELGE_ONBELLEGI;
  return null;
}

/*
  `Vary: Cookie` YAZILMIYOR — bir tur yazıldı, ölçülüp geri alındı.

  Gerekçesi "ileride kabuğa kişiye özel bir satır eklenirse kapı zaten
  kapalı olsun" idi. Ama belge sayfalarının HTML'i çereze göre ZERRE
  değişmiyor: kişiselleştirmenin tamamı istemcide, oturum okunduktan
  sonra yapılıyor. Vary başlığı bu durumda hiçbir şeyi korumuyor, buna
  karşılık çerez değerini önbellek anahtarına katıyor: `cerez_rizasi`,
  `_ga`, `fbp` gibi her farklı çerez birleşimi ayrı bir kopya üretir ve
  isabet oranını sıfıra yaklaştırırdı.

  Oturum güvenliği Vary'den değil, kapının kendisinden geliyor:
  `kenardaTutulabilirMi` oturum çerezli isteği önbelleğe hiç sokmuyor —
  ne okutuyor ne yazdırıyor. Kabuğa kişiye özel bir satır eklenirse
  doğru adım Vary eklemek değil, o adresi UYGULAMA_BOLUMLERI'ne almak.
*/
