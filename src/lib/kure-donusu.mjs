/**
 * İlanlar şeridinde küre dönüşü: seçili küreye tekrar dokununca küre
 * dönüyor ve arka yüzünde o kürenin ilan sayısı görünüyor.
 *
 * FİLTRE İLE DÖNÜŞ AYRI DURUM
 * ---------------------------
 * Dönüş hiçbir ilanı eklemiyor, çıkarmıyor. Filtre seçimi olduğu yerde
 * kalıyor; dönüş yalnız hangi kürenin arka yüzünün açık olduğunu tutuyor.
 * Durum, açıldığı andaki filtre İMZASIYLA saklanıyor: filtre değişince imza
 * tutmuyor ve küre kendiliğinden ön yüzüne dönüyor — eski seçimin sayısı
 * yeni seçimde görünmüyor.
 */

/** Dokunuşun karşılığı: seçili değilse filtrele, seçiliyse çevir. */
export function kureDokunusu(durum, { anahtar, secili, imza }) {
  if (!secili) return { eylem: 'filtrele', durum: null };
  const acik = durum !== null && durum.anahtar === anahtar && durum.imza === imza;
  return { eylem: 'cevir', durum: acik ? null : { anahtar, imza } };
}

/** Şu anda dönük olan kürenin anahtarı; imza eskidiyse hiçbiri. */
export function donukKure(durum, imza) {
  return durum !== null && durum.imza === imza ? durum.anahtar : null;
}

/*
  SAYI YALNIZ KESİNSE

  Katalog 24'erli sayfalarla geliyor ve süzme istemcide yalnız yüklenmiş
  kayıtlar üzerinde çalışıyor. İlk sayfanın süzülmüş adedini toplam gibi
  göstermek yanlış olurdu. Sayı iki durumda kesin:

  1. Daraltma yok ve sunucu toplamı var: sunucu o ülke seçiminin tamamını
     sayıyor (`get_published_listings_catalog_v2` → total).
  2. Kataloğun bütün sayfaları yüklendi: süzülmüş liste artık eksiksiz.

  Şirket küresinde sunucu tarafında şirket başına sayım yok; yalnız ikinci
  yol geçerli. Kesin değilse `null` dönüyor ve arayüz "…" gösteriyor —
  bilinmeyen sayı 0 yazılmıyor.
*/
export function kureSayisi({ sirketAdi = null, daraltmaVar, catalogTotal, tumuYuklendi, suzulmusSirketler }) {
  if (sirketAdi !== null) {
    if (!tumuYuklendi) return null;
    return suzulmusSirketler.filter((ad) => ad === sirketAdi).length;
  }
  if (!daraltmaVar && Number.isFinite(catalogTotal) && catalogTotal >= 0) return Math.trunc(catalogTotal);
  if (!tumuYuklendi) return null;
  return suzulmusSirketler.length;
}
