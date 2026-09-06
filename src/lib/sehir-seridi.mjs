/**
 * Şehir şeridinin sıralama ve süzme kuralı.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Kural bileşenin içinde dursaydı testin tek yapabileceği JSX metnini
 * okumak olurdu; o da davranışı değil, yazılışı doğrular. Saf fonksiyon
 * olarak burada durunca test gerçek çıktıyı çalıştırıyor.
 *
 * SIRALAMA NEDEN SAYIYA GÖRE
 * --------------------------
 * Şerit yatay kaydırılıyor ve ilk üç-dört daire ekranda görünüyor. Alfabetik
 * dizilseydi tek etkinlikli Ankara, yetmiş bir etkinlikli İstanbul'un önüne
 * geçerdi. Eşitlikte Türkçe alfabetik: sayı ayırt etmiyorsa sıra en azından
 * kararlı ve tahmin edilebilir olsun ('İ' ile 'I' ayrımı için 'tr').
 */

/**
 * @param {Record<string, unknown> | null | undefined} sayilar
 *   Katalog RPC'sinden gelen `facets.cityCounts`: şehir adı → etkinlik sayısı.
 * @returns {{ ad: string, adet: number }[]}
 */
export function seritSehirleri(sayilar) {
  if (!sayilar || typeof sayilar !== 'object') return [];
  return Object.entries(sayilar)
    .map(([ad, adet]) => ({ ad: String(ad).trim(), adet }))
    /*
      Sayısı sıfır olan şehir çizilmiyor: içi "0" yazan bir daire tıklanınca
      boş liste getirir, yani kullanıcıyı çıkmaz sokağa yollar. Sayı değilse
      de çizilmiyor — dairenin içindeki rakam uydurulamaz.
    */
    .filter((sehir) => sehir.ad !== '' && typeof sehir.adet === 'number'
      && Number.isFinite(sehir.adet) && sehir.adet > 0)
    .sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, 'tr'));
}

/**
 * Şeridin "Tümü" dairesindeki sayı.
 *
 * Katalog yanıtındaki `total` KULLANILMIYOR: o, seçili şehir süzgecinden
 * geçmiş sayı. Bir şehir seçiliyken "Tümü" o şehrin sayısını gösterirdi ve
 * altındaki dairelerin toplamıyla tutmazdı. Şeridin kendi sayılarından
 * toplanınca "Tümü" her zaman şeridin geri kalanıyla tutarlı.
 *
 * @param {{ adet: number }[]} sehirler
 * @returns {number}
 */
export function seritToplami(sehirler) {
  return sehirler.reduce((toplam, sehir) => toplam + sehir.adet, 0);
}
