/**
 * BEKLEYEN BAŞVURU — saf hesap
 *
 * "Kaç gündür işlem görmedi" sorusunun cevabı. React ağacı kurmadan
 * sınanabilsin diye ayrı dosyada; ekran yalnız çiziyor.
 *
 * SUNUCUYLA AYNI ÖLÇÜ: hatırlatma RPC'si de (20261127010000) bekleme
 * süresini `greatest(aday_ilerleme_at, applied_at)` üzerinden
 * hesaplıyor ve aynı eşikleri kullanıyor. İki yerde ayrı tanımlansaydı
 * ekranda "9 gündür bekliyor" yazarken bildirim gelmemiş olabilirdi.
 */

import { asamayaGore } from './basvuru-panosu.mjs';

/**
 * Hatırlatma eşikleri (gün). Sunucudaki `case` ile BİREBİR aynı.
 *
 * Üçten fazlası yok: 30 günden sonra susuluyor. Cevap vermeyen bir
 * ekibe dördüncü kez seslenmek bildirimi gürültüye çevirir.
 */
export const BEKLEME_ESIKLERI = [7, 14, 30];

const GUN = 24 * 60 * 60 * 1000;

/** Geçerli bir tarihe çeviriyor; çözümlenemeyen değer `null`. */
function an(deger) {
  if (!deger) return null;
  const t = new Date(deger).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Adaya yönelik son ilerleme anı —
 * sunucudaki `greatest(aday_ilerleme_at, applied_at)`.
 *
 * `updated_at` ARTIK KULLANILMIYOR. O, tablodaki her güncellemede
 * damgalanıyordu; sorumlu atamak da onu tazeliyor ve adayın bekleme
 * saatini sıfırlıyordu. Oysa ekip içinde "buna ben bakacağım" demek
 * adaya hiçbir şey söylemiyor. Ayrımın tanımı 20261127010000'de:
 * durum, görüşme, teklif ve öğrenciye not ilerleme sayılıyor; sorumlu
 * atama, puan ve e-posta muhasebesi sayılmıyor.
 *
 * İkisi de yoksa `null` — bilinmeyen tarihten gün saymak uydurma olurdu.
 */
export function sonIslemAni(kart) {
  const a = an(kart?.adayIlerlemesi ?? kart?.aday_ilerleme_at);
  const b = an(kart?.tarih ?? kart?.applied_at);
  if (a === null && b === null) return null;
  return Math.max(a ?? -Infinity, b ?? -Infinity);
}

/**
 * Kaç gündür işlem görmedi. Tarih bilinmiyorsa `null`.
 *
 * Aşağı yuvarlanıyor: "6,9 gün" 6 gün. Yukarı yuvarlamak, eşiği
 * aşmamış bir başvuruyu aşmış gibi gösterirdi.
 */
export function beklemeGunu(kart, simdi = new Date()) {
  const son = sonIslemAni(kart);
  if (son === null) return null;
  const fark = simdi.getTime() - son;
  return fark < 0 ? 0 : Math.floor(fark / GUN);
}

/**
 * Bu başvuru bekliyor mu?
 *
 * SONUÇLANMIŞ BAŞVURU BEKLEMİYOR: teklif kabul/ret, red ve geri çekmede
 * yapılacak iş kalmıyor. Ayrım panodaki 'sonuclandi' aşamasından
 * geliyor — iki yerde ayrı liste tutmak, birinin değişip ötekinin
 * geride kalması demekti.
 */
export function bekliyorMu(kart, simdi = new Date(), esik = BEKLEME_ESIKLERI[0]) {
  if (asamayaGore(String(kart?.durum ?? kart?.status ?? '')) === 'sonuclandi') return false;
  const gun = beklemeGunu(kart, simdi);
  return gun !== null && gun >= esik;
}

/**
 * Aşılan en yüksek eşik; hiçbiri aşılmadıysa `null`.
 * Sunucu da yalnız bunu yazıyor — 50 günlük bir başvuru üç bildirim
 * birden üretmiyor.
 */
export function asilanEsik(kart, simdi = new Date()) {
  if (asamayaGore(String(kart?.durum ?? kart?.status ?? '')) === 'sonuclandi') return null;
  const gun = beklemeGunu(kart, simdi);
  if (gun === null) return null;
  let sonuc = null;
  for (const e of BEKLEME_ESIKLERI) if (gun >= e) sonuc = e;
  return sonuc;
}

/** Bekleyenleri en uzun bekleyen başta sıralıyor. */
export function bekleyenleriSirala(kartlar, simdi = new Date(), esik = BEKLEME_ESIKLERI[0]) {
  return (kartlar ?? [])
    .filter((k) => bekliyorMu(k, simdi, esik))
    .sort((a, b) => (beklemeGunu(b, simdi) ?? 0) - (beklemeGunu(a, simdi) ?? 0));
}
