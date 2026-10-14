/**
 * BÜYÜK İŞVEREN LOGOLARI — DOSYASI OLMAYANA GÖRSEL YOK (14 Ekim 2026)
 *
 * Bölüm sayfasının "büyük işverenler" satırı ve /staj-programlari kartları
 * logoyu `/isveren-logolari/<slug>.png` diye varsayıyordu. 44 işverenin
 * ikisinin dosyası yok (Roketsan, Coca-Cola İçecek): uygulamada `onError`
 * görseli gizliyordu ama JavaScript'siz ilk HTML'de kırık görsel ve 404
 * isteği kalıyordu (ölçüldü: /bolum/makine-muhendisligi).
 *
 * Geçerli bir kaynak yok: depoda dosya yok, veritabanında şirket kaydı ve
 * logo adresi yok. Uydurma logo ya da harfli yer tutucu konmuyor (dizinin
 * kararı: "logo var" izlenimi verirdi); görsel hiç çizilmiyor, ad kalıyor.
 * tests/anasayfa-baglantilari bu kümenin klasördeki dosyalarla birebir
 * olduğunu denetliyor — logo eklenince küme de güncellenmeli.
 */
export const LOGOSU_OLMAYAN_ISVERENLER = new Set(['roketsan', 'coca-cola-icecek']);

/** İşverenin logo adresi; dosyası yoksa null. */
export function isverenLogoAdresi(slug) {
  if (!slug || LOGOSU_OLMAYAN_ISVERENLER.has(slug)) return null;
  return `/isveren-logolari/${slug}.png`;
}
