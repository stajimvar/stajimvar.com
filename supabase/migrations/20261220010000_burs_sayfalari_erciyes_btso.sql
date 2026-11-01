/*
  BURS SAYFALARI — ERCİYES ORGAN NAKLİ VAKFI VE BTSO (31 Ekim 2026)

  İki fırsat sayfası yalnız başlık, kurum ve "koşullar resmî kaynakta"
  cümlesinden ibaretti (görünür metin ~210 karakter). Search Console
  (28 Ağu – 14 Eyl 2026): Erciyes 460 gösterim / 2 tık, BTSO 510 gösterim /
  2 tık; ikisi de `description` ve `eligibility` boş olduğu için noindex
  (scripts/onrender.mjs, `firsatInce`).

  Bu göç YALNIZ bu iki kaydın metin alanlarını dolduruyor. Her cümle
  31 Ekim 2026'da okunan resmî sayfaya dayanıyor:

    Erciyes: https://erciyesorgannaklivakfi.org/burs-3/2026-2027-egitim-ve-ogretim-yili-aday-bursiyer-ogrenci-listesi/
             (koşullar, belge listesi, takvim, ödeme süresi)
             https://erciyesorgannaklivakfi.org/burs-basvuru-formu-2026-2027/
    BTSO:    https://www.btso.org.tr/guncel/haberler-ve-duyurular/haber-duyuru-detay/60771

  YAZILMAYANLAR: burs tutarı (iki kaynakta da yok), ikincil sitelerdeki
  "300 öğrenci" iddiası, gelecek dönem tarihleri.

  ERCİYES SON TARİHİ (25.09.2026) DEĞİŞMİYOR: vakfın duyurusunda
  "Burs başvuruları 25 EYLÜL 2026 tarihinde sona erecektir" yazıyor.

  DOKUNULMAYANLAR: durum (`expired`), son başvuru tarihi, kaynak adresi,
  tutar alanları (amount_*), uygunluk dizileri ve onların *_verified_at
  damgaları (eşleşmeyi değiştirmemek için), başka hiçbir kayıt.

  KORUMA: satır ancak kimliği, slug'ı VE `description`'ı hâlâ boşsa
  güncelleniyor; araya biri metin yazdıysa göç hiçbir şey değiştirmiyor.

  BEKLENEN SONUÇ: `description` dolduğu için sayfalar noindex'ten çıkıyor
  (mevcut kural). Süresi geçmiş olsalar da yapılı açıklamaları olduğu
  için site haritasına giriyor ve /firsatlar ile /burslar sayfalarındaki
  "Başvurusu kapanan, ayrıntısı derlenmiş kayıtlar" bölümünden
  bağlanıyorlar (scripts/onrender.mjs, bu göçle aynı PR).

  GERİ ALMA (yalnız bu göçün yazdıklarını eski değerlerine döndürür):
    update public.opportunities set
      description = null, eligibility = null, academic_year = null,
      short_description = 'Erciyes Organ Nakli Vakfı tarafından verilen burs. Koşullar, tutar ve gerekli belgeler resmî kaynakta.',
      verified_at = '2026-09-28 11:38:48.836+00', last_checked_at = '2026-09-28 11:38:48.836+00'
    where id = 'e9f1e2b7-a98b-4bdd-ad91-1ed1ca90a8fb' and slug = 'erciyes-organ-nakli-vakfi-bursu';
    update public.opportunities set
      description = null, eligibility = null, academic_year = null,
      short_description = 'Bursa Ticaret ve Sanayi Odası tarafından verilen burs. Koşullar, tutar ve gerekli belgeler resmî kaynakta.',
      verified_at = '2026-09-16 05:21:45.493+00', last_checked_at = '2026-09-16 05:21:45.493+00'
    where id = 'd3d306b8-6da5-4a4e-848c-7a45a3ea8b7c' and slug = 'btso-yuksekogrenim-bursu';
*/

update public.opportunities set
  short_description = 'Kayseri nüfusuna kayıtlı Tıp ve Sağlık Bilimleri öğrencilerine burs: koşullar, çevrim içi başvuru, belgeler ve 2026–2027 takvimi.',
  academic_year = '2026-2027',
  eligibility = $metin$- Devlet üniversitelerinde Tıp ya da Sağlık Bilimleri alanında lisans öğrencisi olmak
- Türkiye Cumhuriyeti vatandaşı ve Kayseri ili nüfusuna kayıtlı olmak
- Başarılı olmak ve maddi desteğe ihtiyaç duymak
- Ara sınıflarda sınıfını en az 2,5/5 ya da 65/100 ortalamayla geçmiş olmak
- Eğitim sırasında ve sonrasında organ nakli konusunda araştırma yapıp halkı bilinçlendirmek için çalışmak$metin$,
  description = $metin$## Kısa cevap
Erciyes Organ Nakli Vakfı'nın bursu, devlet üniversitelerinde Tıp ya da Sağlık Bilimleri (lisans) okuyan ve Kayseri nüfusuna kayıtlı öğrencilere yönelik. Başvuru vakfın internet sitesindeki form üzerinden, belgeler sisteme yüklenerek yapılıyor. 2026–2027 başvuruları 25 Eylül 2026'da kapandı.

## Kimler başvurabilir?
Vakfın [2026–2027 duyurusunda](https://erciyesorgannaklivakfi.org/burs-3/2026-2027-egitim-ve-ogretim-yili-aday-bursiyer-ogrenci-listesi/) vakıf tüzüğüne dayanan koşullar:
- Devlet üniversitelerinde Tıp ya da Sağlık Bilimleri alanında lisans öğrencisi olmak
- Türkiye Cumhuriyeti vatandaşı ve Kayseri ili nüfusuna kayıtlı olmak
- Başarılı olmak ve maddi desteğe ihtiyaç duymak
- Ara sınıflarda sınıfını en az 2,5/5 ya da 65/100 ortalamayla geçmiş olmak
- Eğitim sırasında ve sonrasında organ nakli konusunda araştırma yapıp halkı bilinçlendirmek için çalışmak

## Nasıl başvurulur?
- Başvuru yalnızca vakfın internet sitesindeki [burs başvuru formu](https://erciyesorgannaklivakfi.org/burs-basvuru-formu-2026-2027/) üzerinden yapılıyor.
- Belgeler formun son bölümünde sisteme yükleniyor. Vakıf, belgeler hazır olmadan başvuruya başlanmamasını istiyor; sistem bir belgeyi kabul etmezse dosyayı küçültüp yeniden yüklemek gerekiyor.
- Daha önce bu vakıftan burs almış öğrenciler yalnızca başvuru belgesini, transkriptini ve yeni tarihli onaylı öğrenci belgesini yüklüyor.
- Burs kazananlar vakıf merkezinde burs başvuru dilekçesini bizzat imzalıyor ve yükledikleri belgelerin asıllarını teslim ediyor. Dilekçeyi imzalamayanın bursu iptal ediliyor.

## Gerekli belgeler
Parantez içi, belgenin kimden istendiğini gösteriyor.
- YKS sonuç belgesi, puan türlerine göre Türkiye geneli başarı sıralamasıyla (yalnızca yeni adaylar)
- Okuldan alınmış, devam edilecek sınıfı gösteren onaylı öğrenci belgesi (tüm adaylar)
- Ara sınıflar için dersleri, notları ve genel ortalamayı gösteren transkript (tüm adaylar)
- Tüm aile fertlerinin ikamet adresini gösteren vukuatlı aile nüfus kayıt örneği (yalnızca yeni adaylar)
- Nüfus cüzdanı fotokopisi (yalnızca yeni adaylar)
- Adli sicil kaydı (tüm adaylar)
- Son 6 ayda çekilmiş fotoğraf (yalnızca yeni adaylar)
- Ailenin mali durumunu gösteren belge: maaş bordrosu, serbest çalışanlar için gelir vergisi beyannamesi, emekliler için SGK'dan alınan aylık dökümü; anne ve baba için ayrı ayrı (yalnızca yeni adaylar)
- Geliri olmayan anne ya da baba için sosyal güvenlik kaydı olmadığını gösteren belge (yalnızca yeni adaylar)

## 2026–2027 takvimi
- Başvuruların son günü: 25 Eylül 2026. Başvuru dönemi kapandı.
- Sonuç açıklama tarihi duyuruda 3 Ekim 2026 olarak verilmiş; aday bursiyer listesini içeren duyuru 2 Ekim 2026 tarihli.
- 5–16 Ekim 2026 başvuru tarihi değil: burs kazananların belge asıllarını vakfa elden teslim ettiği dönem. Teslim hafta içi 10.00–14.00 arasında, vakıf merkezinde yapılıyor (Kılıçaslan Mahallesi, Sivas Caddesi, Damla Apartmanı No: 56/5 Kat 1, Melikgazi/Kayseri). Belgesini teslim etmeyen öğrenci burs listesinden çıkarılıyor.
- Belgeleri öğrenci kendisi teslim ediyor; şehir dışındaki öğrencinin belgelerini annesi ya da babası nüfus cüzdanıyla teslim edebiliyor. Postayla ya da başka yakınlar aracılığıyla gönderilen belge kabul edilmiyor.
- 2027–2028 dönemi için tarih henüz açıklanmadı. Bursiyerlerin başvurusunu her yıl yenilemesi gerekiyor.

## Burs miktarı
Vakfın duyurusunda da başvuru sayfasında da aylık burs tutarı yazmıyor. Duyuruya göre ödemeler Ekim 2026'da başlıyor ve 9 ay sürüyor.

## Başka burslarla birlikte alınabilir mi?
Vakfın duyurusunda bu bursun başka bir burs ya da krediyle birlikte alınıp alınamayacağına dair bir kural yok. Emin olmak için başvurmadan önce vakfa sormak en sağlıklısı. KYK, TEV ve öteki büyük bursların hangi ikililerde birlikte alınabildiğini [burs çakışma rehberinde](/rehber/burs-cakisma) kaynaklarıyla anlattık.

## Kaynaklar ve son kontrol
- [2026–2027 aday bursiyer duyurusu ve başvuru açıklaması](https://erciyesorgannaklivakfi.org/burs-3/2026-2027-egitim-ve-ogretim-yili-aday-bursiyer-ogrenci-listesi/), Erciyes Organ Nakli Vakfı
- [Burs başvuru formu 2026–2027](https://erciyesorgannaklivakfi.org/burs-basvuru-formu-2026-2027/), Erciyes Organ Nakli Vakfı

Bu sayfadaki bilgiler 31 Ekim 2026'da bu iki resmî sayfadan kontrol edildi. Koşulları ve tarihleri vakıf değiştirebilir; başvurmadan önce resmî sayfaya bak.$metin$,
  verified_at = '2026-10-31 12:00:00+03',
  last_checked_at = '2026-10-31 12:00:00+03'
where id = 'e9f1e2b7-a98b-4bdd-ad91-1ed1ca90a8fb'
  and slug = 'erciyes-organ-nakli-vakfi-bursu'
  and nullif(btrim(description), '') is null;

update public.opportunities set
  short_description = 'Bursa doğumlu ya da ortaöğrenimini Bursa''da bitirmiş lisans öğrencilerine BTSO bursu: koşullar, gelir sınırı, belgeler ve 2026–2027 takvimi.',
  academic_year = '2026-2027',
  eligibility = $metin$- T.C. vatandaşı olmak
- Doğum yeri Bursa olmak ya da ortaöğrenimini Bursa'da tamamlamış olmak (Bursa il sınırları esas alınıyor)
- Bir yükseköğretim kurumunda örgün lisans programına kayıtlı olmak
- Öğrencinin ya da ailesinin eğitim giderlerini karşılayamayacak durumda olması: ailenin toplam aylık net geliri 56.151 TL'nin altında olmalı
- Herhangi bir firma ya da kuruluşta tam zamanlı çalışmamak
- Hüküm giymemiş olmak; hakkında adli, idari ya da disiplin soruşturması bulunmamak
- Ara sınıflarda not ortalaması en az 2,40/4 ya da 60/100 olmak ve o dönemin tüm derslerinden geçmiş olmak$metin$,
  description = $metin$## Kısa cevap
BTSO Yükseköğrenim Bursu, Bursa'da doğmuş ya da ortaöğrenimini Bursa'da bitirmiş ve ailesi eğitim giderlerini karşılamakta zorlanan lisans öğrencilerine yönelik. 2026–2027 döneminde başvuru çevrim içi değildi: form ve belgeler Bursa Ticaret ve Sanayi Odası'na elden teslim edildi. Başvurular 10 Ağustos – 15 Eylül 2026 arasında alındı ve kapandı.

## Kimler başvurabilir?
[BTSO'nun 2026–2027 duyurusundaki](https://www.btso.org.tr/guncel/haberler-ve-duyurular/haber-duyuru-detay/60771) asgari koşullar:
- T.C. vatandaşı olmak
- Doğum yeri Bursa olmak ya da ortaöğrenimini Bursa'da tamamlamış olmak (Bursa il sınırları esas alınıyor)
- Bir yükseköğretim kurumunda örgün lisans programına kayıtlı olmak
- Öğrencinin ya da ailesinin eğitim giderlerini karşılayamayacak durumda olması: ailenin toplam aylık net geliri 56.151 TL'nin altında olmalı
- Herhangi bir firma ya da kuruluşta tam zamanlı çalışmamak
- Hüküm giymemiş olmak; hakkında adli, idari ya da disiplin soruşturması bulunmamak
- Ara sınıflarda not ortalaması en az 2,40/4 ya da 60/100 olmak ve o dönemin tüm derslerinden geçmiş olmak

Bursiyerler belirlenirken üniversiteye yeni başlayanlarda ve hazırlığı yeni bitirenlerde üniversite giriş sınavı sıralamasına, ara sınıflarda ise sıralamayla birlikte lisans not ortalamasına bakılıyor.

## Nasıl başvurulur?
- 2026–2027 döneminde başvuru formu BTSO'nun duyurusundan indirilip dolduruluyordu. Duyurudaki form bağlantısı 31 Ekim 2026 itibarıyla çalışmıyor (hata sayfasına yönleniyor); yeni dönemin formu BTSO duyurusunda yayımlandığında oradan alınmalı.
- Doldurulan form, aşağıdaki belgelerle birlikte BTSO İnsan Kaynakları Müdürlüğü'ne elden teslim ediliyor: Fethiye OSB Mah. Mavi Cadde No: 13, 16140 Nilüfer/Bursa.
- Posta, kargo ya da e-postayla gönderilen belgeler dikkate alınmıyor.
- Aylık gelirini beyan etmeyenlerin başvurusu değerlendirilmiyor. Eksik ya da hatalı belge olursa başvuru, geri dönüş yapılmadan iptal ediliyor.

## Gerekli belgeler
Duyuruya göre e-Devlet'ten alınan belgeler kabul ediliyor.
- Kayıtlı olunan üniversiteden öğrenci belgesi
- Mezun olunan ortaöğretim kurumunun diploma fotokopisi
- Ara sınıflar için lisans transkripti
- ÖSYM sınav sonuç belgeleri: sıralama belgesi ve yerleştirme belgesi
- Son 1 yıl içinde çekilmiş 1 vesikalık fotoğraf
- Vukuatlı nüfus kayıt örneği (aile)
- Adli sicil belgesi
- Ailenin gelir belgeleri: çalışan anne ve baba için maaş bordrosu; çalışmayan ebeveyn için SGK 4/a, 4/b ve 4/c kapsamında olmadığını gösteren belge; emekli ebeveyn için e-Devlet'ten emekli aylık bilgisi çıktısı; serbest çalışan ebeveyn için vergi levhası (matrahsız levhada ve çalışmayan ebeveynde son 6 ayın hizmet dökümü ya da muhtaçlık belgesi). Her durumda Sosyal Güvenlik Kayıt Belgesi de isteniyor.
- Şehit çocukları, sürekli iş göremezlik belgesi olan gazilerin çocukları ve afette anne ya da babasını kaybedenler bu durumu belgelemeli.

## 2026–2027 takvimi
- Başvuru dönemi: 10 Ağustos – 15 Eylül 2026. Başvuru dönemi kapandı.
- Belgelerin son teslim günü de 15 Eylül 2026'ydı.
- 2027–2028 dönemi için tarih henüz açıklanmadı.

## Burs miktarı
BTSO'nun duyurusunda burs tutarı ve ödeme süresi yazmıyor. Duyuruda geçen 56.151 TL burs tutarı değil, ailenin aylık net gelir sınırı.

## Burs ne zaman kesilir?
Duyuruya göre şu durumlarda verilen burs kesiliyor:
- Okulu bitirmek ya da bölümün yasal öğrenim süresinin dolması
- Okuldan geçici ya da sürekli uzaklaştırma cezası almak ya da öğrencilik vakarına yakışmayan bir davranışın tespit edilmesi
- Herhangi bir kuruluşta sürekli ve ücretli görev almak
- Başvuruda yanlış bilgi verildiğinin anlaşılması
- Oda Yönetim Kurulu'nun onayı olmadan bölüm ya da okul değiştirmek, ya da kayıt dondurmak
- Yıllık not ortalamasının 2,40/4 ya da 60/100'ün altına düşmesi
- Öğretim yılında bir ya da daha fazla dersten başarısız olmak
- İstenen bilgi ve belgeleri süresinde vermemek

## Başka burslarla birlikte alınabilir mi?
Duyuruda başka bir burs ya da krediyle birlikte alınmasını yasaklayan ya da açıkça serbest bırakan bir kural yok. Kesilme nedenleri arasında başka burs almak değil, bir kuruluşta sürekli ve ücretli görev almak sayılıyor. KYK, TEV ve öteki büyük bursların hangi ikililerde birlikte alınabildiğini [burs çakışma rehberinde](/rehber/burs-cakisma) kaynaklarıyla anlattık.

## Kaynaklar ve son kontrol
- [2026–2027 Yılı Burs Başvurusu duyurusu](https://www.btso.org.tr/guncel/haberler-ve-duyurular/haber-duyuru-detay/60771), Bursa Ticaret ve Sanayi Odası
- BTSO telefon: +90 224 275 16 00

Bu sayfadaki bilgiler 31 Ekim 2026'da BTSO'nun resmî duyurusundan kontrol edildi. Koşulları ve tarihleri oda değiştirebilir; başvurmadan önce resmî duyuruya bak.$metin$,
  verified_at = '2026-10-31 12:00:00+03',
  last_checked_at = '2026-10-31 12:00:00+03'
where id = 'd3d306b8-6da5-4a4e-848c-7a45a3ea8b7c'
  and slug = 'btso-yuksekogrenim-bursu'
  and nullif(btrim(description), '') is null;
