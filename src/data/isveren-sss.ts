/*
  İŞVEREN SIKÇA SORULANLAR — TEK KAYNAK

  Aynı liste iki yerde kullanılıyor: /isveren sayfasında görünen metin ve
  ön render'ın ürettiği FAQPage yapısal verisi. İkisini ayrı yazmak,
  arama motoruna sayfada olmayan bir cevap göstermek olurdu.

  KURAL: buradaki her cevap ürünün BUGÜN yaptığı şeyi anlatır. Yapılmayan
  bir şeyi "yakında" diye yazmıyoruz, teknik iç terim kullanmıyoruz.
*/

export interface SssMaddesi {
  soru: string;
  cevap: string;
}

export const ISVEREN_SSS: SssMaddesi[] = [
  {
    soru: 'İlan vermek ücretli mi?',
    cevap:
      'Hayır. Şirket hesabı açmak da ilan yayınlamak da ücretsiz. İlan paketi, ' +
      'kontenjan ya da abonelik yok; kredi kartı istenmiyor.',
  },
  {
    soru: 'Şirket hesabı nasıl açılıyor ve nasıl doğrulanıyor?',
    cevap:
      'Ayrı bir şirket kaydı yok: kendi adınıza hesap açıyor, sonra şirketinizin ' +
      'StajımVar’daki sayfasını sahipleniyorsunuz. Kurumsal e-posta adresinizin alan ' +
      'adı şirketin site adresiyle eşleşiyorsa ilan doğrudan yayına çıkıyor; ' +
      'eşleşmiyorsa ilan önce bizde inceleniyor ve o sırada listede görünmüyor. ' +
      'Aynı şirkette birden çok kişi çalışabiliyor.',
  },
  {
    soru: 'Öğrenciler nereden başvuruyor?',
    cevap:
      'StajımVar’da açtığınız ilanlarda öğrenci siteden çıkmadan başvuruyor ve ' +
      'başvuru doğrudan şirket panelinize düşüyor. Kariyer sayfanızdan derlediğimiz ' +
      'ilanlarda ise öğrenciyi sizin resmî başvuru sayfanıza yönlendiriyoruz; o ' +
      'başvurular bizden geçmiyor.',
  },
  {
    soru: 'Adayın özgeçmişini ne zaman görebiliyorum?',
    cevap:
      'Öğrenci ilanınıza başvurduğunda. Başvuruya, öğrencinin o anki profilinin ve ' +
      'yüklediği özgeçmiş dosyasının bir kopyası bağlanıyor; öğrenci sonradan ' +
      'profilini değiştirse bile sizin gördüğünüz belge değişmiyor. Başvurmamış ' +
      'öğrencilerin listesi diye bir ekran yok.',
  },
  {
    soru: 'Öğrencinin iletişim bilgileri ne zaman açılıyor?',
    cevap:
      'Yalnızca öğrenci teklifinizi kabul ettiğinde ve karşılıklı olarak. Başvuruya ' +
      'bağlanan kopyada e-posta ve telefon bulunmuyor. Öğrenci teklifi reddederse ya ' +
      'da başvurusunu geri çekerse iletişim bilgileri açılmıyor.',
  },
  {
    soru: 'Aday sürecini panelden nasıl yürütüyorum?',
    cevap:
      'Başvuruyu inceliyor, durumunu güncelliyorsunuz. Görüşmeye davet ' +
      'gönderebiliyor, öğrencinin yanıtını görebiliyor ve ardından teklif ' +
      'iletebiliyorsunuz. Öğrenci aynı süreci kendi başvuru sayfasında adım adım ' +
      'izliyor. Site içinde mesajlaşma yok.',
  },
  {
    soru: 'Kariyer sayfamdan derlenen ilanlarla StajımVar ilanı arasındaki fark ne?',
    cevap:
      'Derlenen ilanlarda başvuru sizin kendi sisteminizde tamamlanıyor ve süreci ' +
      'orada yürütüyorsunuz; biz yalnızca ilanı listeliyor ve bağlantıyı düzenli ' +
      'kontrol ediyoruz. StajımVar ilanında ise başvuru ve sonrasındaki aday süreci ' +
      'burada, panelinizde yürüyor.',
  },
  {
    soru: 'İlanı kapatabilir miyim?',
    cevap:
      'Evet, ilanı panelden kendiniz kapatabilir ve düzenleyebilirsiniz. Kariyer ' +
      'sayfanızdan derlenen bir ilanın kaldırılmasını isterseniz talebiniz doğrulama ' +
      'beklemeden işleme alınıyor.',
  },
];
