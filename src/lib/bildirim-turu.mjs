/**
 * BAŞVURU BİLDİRİMİ Mİ — tek tanım
 *
 * Bildirim merkezi başvuru satırlarında metni KIRPMIYOR: üç satırlık
 * kırpma uzun ilan adını ortasından kesiyordu ve kesilen kısım hangi ilan
 * olduğunu söyleyen kısımdı. Kırpmanın kalkması görselden BAĞIMSIZ —
 * logosu olmayan şirketin, rıza vermemiş adayın satırında da ilan adı tam
 * okunuyor (kullanıcı kararı, 4 Ekim 2026).
 *
 * Tanım iki kaynaktan:
 *   · `application_id` dolu — başvuru tetikleyicisinin yazdığı her satır
 *     (20260913010000, 20261117010000)
 *   · ya da türü başvuru türlerinden biri — eski satırlarda kimlik boş
 *     kalmış olabilir, tür yine de başvuruyu söylüyor
 *
 * Sosyal bildirimler (bağlantı, takip, beğeni) bu kümede DEĞİL; onların
 * kırpması ve düzeni değişmiyor.
 */

import { OGRENCI_BASVURU_TURLERI } from './bildirim-basvurusu.mjs';

/** İşverene giden başvuru bildirimleri (`bildir_sirkete`). */
export const ISVEREN_BASVURU_TURLERI = new Set([
  'yeni_basvuru',
  'teklif_kabul',
  'teklif_ret',
  'geri_cekildi',
  'gorusme_kabul',
  'gorusme_ret',
]);

/**
 * @param {{ tur: string, basvuruId?: string | null }} b
 * @returns {boolean}
 */
export function basvuruBildirimiMi(b) {
  if (!b) return false;
  if (typeof b.basvuruId === 'string' && b.basvuruId.trim()) return true;
  return OGRENCI_BASVURU_TURLERI.has(b.tur) || ISVEREN_BASVURU_TURLERI.has(b.tur);
}
