/**
 * BİLDİRİMİN KİŞİSİ — olayı yapan kullanıcının kimliği
 *
 * Bildirim satırı kişi kolonu taşımıyor; kimlik olay anahtarında
 * (`notifications.dedupe_key`) duruyor ve biçimi göçlerde sabit
 * (20260927130000_sosyal_bildirimler.sql):
 *
 *   baglanti_istegi:<isteyen>:<alıcı>   → bildirimi alan alıcı, kişi İSTEYEN
 *   baglanti_kabul:<isteyen>:<alıcı>    → bildirimi alan isteyen, kişi ALICI
 *   begeni:<paylaşım>:<beğenen>         → kişi BEĞENEN
 *
 * Başka bir anahtar, bozuk kimlik ya da kişi oturumun kendisiyse `null`:
 * kişi uydurulmuyor, satır tür simgesiyle kalıyor.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function bildirimKisisi(anahtar, benId = null) {
  if (typeof anahtar !== 'string') return null;
  const [tur, a, b, ...fazla] = anahtar.split(':');
  if (fazla.length > 0) return null;
  const kisi =
    tur === 'baglanti_istegi' ? a
    : tur === 'baglanti_kabul' ? b
    : tur === 'begeni' ? b
    : null;
  if (!kisi || !UUID.test(kisi)) return null;
  if (benId && kisi.toLowerCase() === String(benId).toLowerCase()) return null;
  return kisi;
}
