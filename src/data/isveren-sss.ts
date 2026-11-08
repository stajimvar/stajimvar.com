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
      'Ayrı bir giriş ekranı yok. Kayıtta İşverenim’i seçin ve e-postanızı doğrulayın. ' +
      'Ardından şirketinizi bulup sahiplenir ya da listede yoksa eklersiniz. Hesabınızın ' +
      'kurumsal e-postası şirketinizin web sitesiyle eşleşiyorsa şirket hesabınız hemen ' +
      'açılır ve doğrulanmış sayılır; eşleşmiyorsa (ör. Gmail) ekibimiz kontrol edip ' +
      'onaylar. Yayına gönderdiğiniz ilan otomatik kontrol ' +
      'edilir: sorunsuzsa hemen çıkar, eksikse düzeltmeniz için döner, şüpheliyse ' +
      'incelemede kalır ve listede görünmez. Aynı şirkette birden çok kişi çalışabilir.',
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
      'Öğrenci başvururken telefonunu ve e-postasını paylaşmayı onayladıysa, başvuru ' +
      'panelinizde görünür. Yalnız doğrulanmış şirketin yetkili ekip üyeleri görebilir; ' +
      'salt okunur üyeler göremez. Öğrenci bu onayı sonradan kapatabilir.',
  },
  {
    soru: 'Aday sürecini panelden nasıl yürütüyorum?',
    cevap:
      'Başvuruyu inceliyor, durumunu güncelliyorsunuz; uygun olmayan başvuruyu ' +
      'olumsuz olarak işaretleyebiliyorsunuz. Görüşme ve sonrasını öğrencinin ' +
      'paylaştığı telefon ya da e-postayla doğrudan siz yürütüyorsunuz. Öğrenci ' +
      'başvurusunun durumunu kendi sayfasında izliyor.',
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
