/**
 * AYNI ANDA İSTENEN AYNI ŞEY BİR KEZ İSTENİYOR
 *
 * Bu bir ÖNBELLEK DEĞİL: sonuç saklanmıyor. Yalnız HÂLÂ UÇUŞTA olan bir
 * istek varsa ikinci çağıran ona bağlanıyor; istek biter bitmez kayıt
 * siliniyor ve bir sonraki çağrı gerçekten yeniden soruyor.
 *
 * Ayrım önemli, çünkü bu depoda yetki her istekte yeniden soruluyor:
 * özel kovadaki dosya `download()` ile, her seferinde okuma
 * politikasından geçerek iniyor (bkz. `useGorselAdresleri` — imzalı
 * adres tam da bu yüzden kaldırıldı). Sonucu saklayan bir önbellek o
 * kararı dondururdu. Aynı ANI paylaşmak ise hiçbir şeyi dondurmuyor:
 * iki çağıran zaten aynı yetkiyle, aynı saniyede soruyor; ikinci istek
 * birincisiyle aynı cevabı getirirdi.
 *
 * ÖLÇÜM (canlı, 13 Eylül 2026, /agim, tek açılış):
 *
 *   aynı avatar dosyası              5 indirme
 *   kendi sosyal profilin            2 sorgu
 *
 * Avatarı çizen beş bileşen (üst çubuk, sağ sütun kartı ve üç paylaşım
 * başlığı) aynı commit'te bağlanıyor, yani beş istek aynı tikte
 * açılıyordu. Sosyal profili de App ile Ağım ekranı ayrı ayrı
 * okuyordu.
 *
 * `finally` ile silme HEM başarıda HEM hatada çalışıyor: başarısız bir
 * istek haritada kalsaydı, sonraki çağıranlar hep aynı hataya
 * bağlanırdı.
 */
const ucustakiler = new Map();

export function ucustaPaylas(anahtar, uret) {
  const mevcut = ucustakiler.get(anahtar);
  if (mevcut) return mevcut;

  const istek = uret().finally(() => {
    ucustakiler.delete(anahtar);
  });
  ucustakiler.set(anahtar, istek);
  return istek;
}

/** Testler için: iki ölçüm arasında harita boş başlasın. */
export function ucustaSifirla() {
  ucustakiler.clear();
}
