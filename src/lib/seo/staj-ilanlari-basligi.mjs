/**
 * /staj-ilanlari BAŞLIĞI (23 Kasım 2026)
 *
 * "staj ilanları" ve "stajyer iş ilanları" aramalarının asıl sayfası bu.
 * Ana sayfanın başlığı da "Şirketlerin staj ilanları" diyordu ve Search
 * Console'da aynı aramada bazen ana sayfa (44.), bazen bu sayfa (51.)
 * çıkıyordu: iki sayfa aynı aramayı bölüyordu. Ana sayfa artık markayı
 * anlatıyor; bu kelimeler burada.
 *
 * YIL: staj dönemi yıl başında değil sonbaharda aranmaya başlıyor (Kasım
 * 2026'da öğrenciler 2027 yaz stajını arıyor). Eylülden itibaren gelecek
 * yıl yazılıyor. Derleme tarihinden hesaplanıyor; elle güncellenmesi
 * unutulan "2026" kalmıyor.
 */
export function stajIlanlariYili(tarih = new Date()) {
  return tarih.getMonth() >= 8 ? tarih.getFullYear() + 1 : tarih.getFullYear();
}

export function stajIlanlariBasligi(tarih = new Date()) {
  return `Staj İlanları ${stajIlanlariYili(tarih)} — Güncel Stajyer İş İlanları | StajımVar`;
}

/** Ana sayfa: marka ve ürün; "staj ilanları" aramasını /staj-ilanlari'ye bırakır. */
export const ANA_SAYFA_BASLIGI = 'StajımVar — Öğrenciler için staj, burs ve kariyer';
