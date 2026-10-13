/**
 * /staj-ilanlari — h1 ve giriş cümlesi, seçili kapıya göre.
 *
 * Üç yerden okunuyor ve üçü aynı cümleyi yazmalı:
 *   · canlı liste (App → MatchedInternshipsView `giris`)
 *   · listenin altındaki bilgi bölümü (StajIlanlariIcerik, şehir başlığı)
 *   · ön render (scripts/onrender.mjs, JavaScript inmeden görünen h1)
 * Ayrı ve bağımlılıksız bir modül: bilgi bölümü 195 KB'lık bölüm verisini
 * içe aktarıyor; App bu sabit için onu ana pakete çekmemeli.
 */
export const STAJ_ILANLARI_METNI = {
  turkiye: {
    h1: 'Güncel Staj İlanları',
    aciklama:
      'Türkiye genelindeki güncel staj ilanlarını şehir, bölüm ve staj türüne göre filtrele. Şirketlerin resmî başvuru sayfalarına doğrudan ulaş.',
    sehir: "Türkiye'de ilanın en çok olduğu şehirler",
  },
  yurtdisi: {
    h1: 'Yurtdışında Staj İlanları',
    aciklama:
      'Çalışma konumu Türkiye dışında olan staj ilanları. Dil, vize ve başvuru koşullarını her ilanın kendi kaynak sayfasında kontrol et.',
    sehir: 'Yurtdışında ilanın en çok olduğu şehirler',
  },
  tumu: {
    h1: 'Tüm Staj İlanları',
    aciklama:
      "Türkiye'deki ve yurtdışındaki bütün yayındaki staj ilanları; konumu kaynakta belirtilmemiş ilanlar dahil.",
    sehir: 'İlanın en çok olduğu şehirler',
  },
};
