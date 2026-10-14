import { ILCE_IL, ONEK, TR_ILLERI, katla } from './il-bul.mjs';
import { COGRAFYA, ilanCografyasi } from './ilan-cografyasi.mjs';

/**
 * İLANIN İLİ — TEK KURAL (14 Ekim 2026)
 *
 * ÖLÇÜLEN SORUN: aynı soruya üç yer üç farklı cevap veriyordu.
 *   - sunucunun şehir sayımları `listings.il` kolonundan;
 *   - listedeki şehir menüsü ham `city` metninden (`ilBul`);
 *   - kayıtlı arama ham metni seçilen ille BİREBİR karşılaştırıyordu:
 *     "Turkey - Istanbul" yazan ilan, "İstanbul" seçilince düşüyordu.
 * `il` kolonu bir toplu işle (scripts/ilan-katalog-yaz.mjs) dolduruluyor;
 * işten sonra yayımlanan ilanlarda boş kalıyor (canlıda 9 İstanbul ilanı).
 *
 * KURAL
 *   1. Doğrulanmış `il` (veritabanının kısıtlı il listesinden) varsa o.
 *   2. Yoksa yalnız TÜRKİYE ilanında (lib/ilan-cografyasi) şehir metninden
 *      türet: il adı ya da ilçe/semt tablosu (lib/il-bul).
 *   3. Ülke adı şehir sayılmıyor ("Turkey" → il yok): il ve ilçe
 *      sözlüklerinde ülke adı yok, eşleşme çıkmıyor (testte kilitli).
 *   4. Metin BİRDEN FAZLA ile işaret ediyorsa ("İstanbul / Ankara") il
 *      UYDURULMUYOR: null. `ilBul` listede ilk bulduğunu döndürüyordu;
 *      burada belirsizlik açıkça reddediliyor.
 *   5. Bulunamazsa null — tahmin yok.
 *
 * @param {object} ilan  `il`, `city`, `country_code`/`countryCode` (ve varsa `konumlar`)
 * @returns {string|null} TR_ILLERI'nden bir il ya da null
 */
export function ilanIli(ilan) {
  if (!ilan || typeof ilan !== 'object') return null;
  const dogrulanmis = String(ilan.il ?? '').trim();
  if (dogrulanmis && TR_ILLERI.includes(dogrulanmis)) return dogrulanmis;
  if (ilanCografyasi(ilan) !== COGRAFYA.TURKIYE) return null;
  const iller = metindekiIller(ilan.city);
  return iller.length === 1 ? iller[0] : null;
}

/**
 * Serbest konum metninin işaret ettiği iller — tekrarsız.
 *
 * `ilBul` ile aynı sözlükler ve aynı kelime sınırı; fark yalnız şu: ilk
 * eşleşmede durmuyor, hepsini topluyor (belirsizliği görebilmek için).
 */
export function metindekiIller(ham) {
  if (!ham) return [];
  const temiz = katla(String(ham).replace(ONEK, '')).trim();
  if (!temiz) return [];
  const bulunan = new Set();
  const kelime = (k) => new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`);
  for (const il of TR_ILLERI) {
    if (kelime(katla(il)).test(temiz)) bulunan.add(il);
  }
  for (const [ilce, il] of Object.entries(ILCE_IL)) {
    if (il && kelime(ilce).test(temiz)) bulunan.add(il);
  }
  return [...bulunan];
}

/**
 * Seçilen il ile ilan eşleşiyor mu — şehir menüsü ve kayıtlı arama ortak.
 *
 * Seçim bir il adı (menü ille çalışıyor). Eski kayıtlı aramalar ve
 * paylaşılan adresler başka bir metin taşıyabilir: önceki kural (ham metnin
 * birebir eşitliği) KORUNUYOR — bir aramanın eskiden bulduğu ilan yine
 * bulunuyor; yeni kural yalnız eksikleri ekliyor.
 */
export function ileUyuyorMu(ilan, secilen) {
  const s = katla(String(secilen ?? '').trim());
  if (!s) return true;
  const il = ilanIli(ilan);
  if (il && katla(il) === s) return true;
  return katla(String(ilan?.city ?? '').trim()) === s;
}
