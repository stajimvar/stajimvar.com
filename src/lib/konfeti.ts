/**
 * KONFETİ — yalnız atılacağı anda iniyor.
 *
 * `canvas-confetti` statik olarak import edildiğinde Rollup onu ana
 * paketin bağımlılık ağacına koyuyor ve `index.html` bir
 * `<link rel="modulepreload">` yazıyordu: siteye ilk giren herkes,
 * başvuru gönderen bir kullanıcının göreceği kutlama efektini de
 * indiriyordu.
 *
 * Dinamik import ağacı kesiyor. Dosya ancak bu işlev çağrıldığında —
 * yani efekt gerçekten atılacağı anda — iniyor.
 *
 * Hata yutuluyor: kutlama efektinin inememesi kullanıcıya
 * gösterilecek bir sorun değil, akış aynen sürüyor.
 */
export async function konfetiAt(secenekler: Record<string, unknown>): Promise<void> {
  try {
    const modul = await import('canvas-confetti');
    modul.default(secenekler);
  } catch {
    /* sessiz */
  }
}
