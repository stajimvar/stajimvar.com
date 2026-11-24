/*
  FIRSAT SAYFALARI — RESMÎ KAYNAKTAN İÇERİK (24 Kasım 2026)

  AdSense siteyi "düşük değere sahip içerik" diye ikinci kez reddetti.
  20270121 sonrası kural (lib/anasayfa-baglantilari → firsatInceMi):
  açıklama + koşullar 120 kelimenin altındaysa fırsat sayfası noindex.
  Bu 12 kayıt kalıp cümleden ibaretti ("koşullar vakfın duyurusunda")
  ve 60-65 kelimeyle dizinden düştü.

  Her cümle 24 Kasım 2026'da okunan resmî kaynağa dayanıyor; kaynak
  bağlantısı metnin sonunda. Kaynakta olmayan tutar ya da tarih
  yazılmadı (TÜBİTAK 2205 tutarı, Erasmus hibe tutarı, TÜRGEV koşulları:
  vakfın detay sayfaları içerik vermiyor).

  DÜZELTMELER:
    · anadolu-vakfi-egitim-bursu: kaynak anadoluvakfi.org idi; o site
      Anadolu Eğitim Kültür ve Bilim Vakfı'nın. Anadolu Vakfı'nın
      (Anadolu Grubu) sitesi anadoluvakfi.org.tr; kaynak düzeltildi.
    · ted-egitim-bursu: TED Tam Eğitim Bursu üniversite öğrencisine
      yeni başvuruyla verilmiyor (4.–9. sınıf); metin bunu açıkça yazıyor.
    · ibb-ogrenci-bursu: programın resmî adı Genç Üniversiteli Eğitim
      Yardımı; kaynak programın portalı.

  KORUMA: satır yalnız açıklaması bu göçün okuduğu metinle aynıysa
  (md5) güncelleniyor; araya biri metin yazdıysa dokunulmuyor.

  GERİ ALMA: önceki açıklama metinleri göç öncesi veritabanı
  yedeğinde; uygunluk dizileri ve *_verified_at damgalarına
  dokunulmadı (eşleşme değişmiyor).
*/

update public.opportunities set
  short_description = $metin$KYK bursu: kimler başvurabilir, öncelikli öğrenciler, ödeme günleri ve bursun devam şartı (resmî SSS'den).$metin$,
  description = $metin$## Kısa cevap
KYK bursu, Gençlik ve Spor Bakanlığı Kredi ve Yurtlar Genel Müdürlüğü'nün yükseköğretim öğrencilerine verdiği karşılıksız burs. Burs ve kredi tek başvuruda, e-Devlet üzerinden alınıyor: değerlendirmede bütçeye göre belirlenen sayıda öğrenciye burs, durumu uygun diğer öğrencilere kredi veriliyor. 2026–2027 başvuruları 12–16 Ekim 2026 tarihleri arasında alındı.

## Kimler başvurabilir
- Yükseköğretim programına ilk kez kayıt yaptıran öğrenciler
- Eğitimine devam eden ara sınıf öğrencileri
- Yurt dışında yükseköğrenim gören Türk vatandaşları
- İkinci öğretim öğrencileri de değerlendirmeye alınıyor

Başvuru e-Devlet'teki öğrenim bilgilerine göre alınıyor; hatalı ya da eksik öğrenim bilgisiyle yapılan başvuru geçersiz sayılıyor. Bilgin yanlışsa önce üniversitenin öğrenci işlerine düzelttirmelisin.

## Öncelikli burs verilen öğrenciler
- Şehit çocukları (çocuğu yoksa bekâr kardeşleri), gazinin kendisi ya da bekâr çocukları
- Sağlık kurulu raporuyla %40 ve üzeri engelli olanlar
- Anne ve babası vefat etmiş bekâr öğrenciler
- Aile ve Sosyal Hizmetler Bakanlığı bünyesinde barınarak liseyi bitirenler ya da 5395 sayılı Kanunla koruma altına alınanlar
- Darüşşafaka Lisesi mezunları ve belirlenen kıstasları taşıyan milli sporcular
- AYT'de ham puan bazında ilk yüze girenler (Cahit Arf başarı bursu)

Öncelik durumu ilgili kurumlardan elektronik ortamda sorgulanıyor; ayrıca belge göndermen gerekmiyor.

## Sonuçtan sonra
- Burs ya da kredi çıkan öğrenci, ilan edilen tarihlerde e-Devlet'te taahhütnameyi onaylamalı. Onaylamayana ödeme yapılmıyor.
- İlk kez burs alana, başvurduğu yılın ekim ayı da dahil olmak üzere normal öğrenim süresi boyunca ödeme yapılıyor.
- Ödemeler T.C. kimlik numarasının son rakamına göre her ayın 6'sı ile 10'u arasında hesaba yatıyor.

## Burs nasıl devam eder
- Not ortalamasının 4'lük sistemde en az 2,00 (100'lük sistemde 53,33) olması gerekiyor; hazırlık öğrencilerinin bir üst sınıfa geçmesi yeterli.
- Bu şartı sağlamayanın bursu krediye dönüşüyor ve sonradan başarılı olsa da yeniden bursa dönmüyor.
- Burs alan öğrenciye kredi, kredi alana burs ödenmiyor.
- Normal öğrenim süresi uzayan öğrenciye ödeme yapılmıyor.

## Kaynak
[KYK Sıkça Sorulan Sorular (Kredi ve Burs)](https://kygm.gsb.gov.tr/Sayfalar/2446/2388/sikca-sorulan-sorular-kredi-burs.aspx) · [2026–2027 başvuru duyurusu](https://kygm.gsb.gov.tr/HaberDetaylari/1/303638/burs-kredi-basvurulari-basladi.aspx)

Burs ile kredinin farkı ve başvuru adımları: [KYK burs ve kredi rehberi](/rehber/kyk-burs-ve-kredi)$metin$,
  eligibility = $metin$Yükseköğretime ilk kez kayıt yaptıran öğrenciler, ara sınıf öğrencileri ve yurt dışında okuyan Türk vatandaşları. Burs, bütçeye göre belirlenen sayıda öğrenciye veriliyor.$metin$,
  last_checked_at = now(),
  verified_at = now()
where id = '8686f636-9aba-41b0-b277-75a3c36f892e' and slug = 'kyk-ogrenim-bursu' and md5(coalesce(description, '')) = '011730b5ea23341f2079fbac90fce566';

update public.opportunities set
  short_description = $metin$KYK öğrenim kredisi: bursla aynı başvuru, kimlere verilir, ödeme günleri, kesilme durumları ve geri ödeme (resmî SSS'den).$metin$,
  description = $metin$## Kısa cevap
KYK öğrenim kredisi, Gençlik ve Spor Bakanlığı Kredi ve Yurtlar Genel Müdürlüğü'nün yükseköğretim öğrencilerine verdiği geri ödemeli destek. Ayrı bir başvurusu yok: burs ve kredi aynı e-Devlet başvurusunda değerlendiriliyor, bütçeye göre belirlenen sayıda öğrenciye burs, durumu uygun diğer tüm öğrencilere kredi veriliyor. 2026–2027 başvuruları 12–16 Ekim 2026 tarihleri arasında alındı.

## Kimler başvurabilir
- Yükseköğretim programına ilk kez kayıt yaptıran öğrenciler
- Eğitimine devam eden ara sınıf öğrencileri
- Yurt dışında yükseköğrenim gören Türk vatandaşları
- İkinci öğretim öğrencileri

## Sonuçtan sonra
- Kredi çıkan öğrenci e-Devlet'te taahhütnameyi onaylamalı; onaylanmayan krediye ödeme yapılmıyor.
- Taahhütnamedeki tutar tahmini: kredi tutarları yıllara göre artırılıyor ve öğrenci artırılan tutarı ödeyeceğini kabul ediyor.
- Ödemeler T.C. kimlik numarasının son rakamına göre her ayın 6'sı ile 10'u arasında hesaba yatıyor.
- Burs alan öğrenciye kredi, kredi alana burs ödenmiyor.

## Kredi hangi durumlarda kesilir
- Okuldan ayrılma, çıkarılma ya da en az bir yarıyıl uzaklaştırma cezası
- Kayıt dondurma, izin alma, ders kaydı yaptırmama ya da vazgeçme
- Hesaba yatan kredinin altı ay içinde çekilmemesi
- Gerçeğe aykırı bilgi ve belge sunulması

## Geri ödeme
Resmî SSS'ye göre krediden vazgeçen öğrenci de borcunu, öğrenimine devam ettiği programın normal öğrenim süresinin bitiminden iki yıl sonra başlamak üzere, kredi aldığı süre kadar ve aylık taksitlerle ödüyor. Bölüm değiştirirsen kredinin devamı için e-Devlet'ten nakil başvurusu yapman gerekiyor; kredi nakli yalnız bir kez yapılabiliyor.

## Kaynak
[KYK Sıkça Sorulan Sorular (Kredi ve Burs)](https://kygm.gsb.gov.tr/Sayfalar/2446/2388/sikca-sorulan-sorular-kredi-burs.aspx) · [2026–2027 başvuru duyurusu](https://kygm.gsb.gov.tr/HaberDetaylari/1/303638/burs-kredi-basvurulari-basladi.aspx)

Burs ile kredinin farkı: [KYK burs ve kredi rehberi](/rehber/kyk-burs-ve-kredi)$metin$,
  eligibility = $metin$Burs ve kredi tek başvuruda değerlendiriliyor; burs çıkmayan ve durumu uygun olan öğrencilere kredi veriliyor.$metin$,
  last_checked_at = now(),
  verified_at = now()
where id = 'f3aa173a-66e5-41e9-93c5-8a6602ead1fe' and slug = 'kyk-ogrenim-kredisi' and md5(coalesce(description, '')) = '6641a67c1fa2ebd969a9a72fab363d8d';

update public.opportunities set
  short_description = $metin$TEV Üniversite (Eğitim) Bursu 2026–2027: aylık 8.000 TL, 9 ay; kimler başvurabilir ve bursun devam şartları.$metin$,
  description = $metin$## Kısa cevap
Türk Eğitim Vakfı'nın Üniversite (Eğitim) Bursu, başarılı ancak maddi desteğe ihtiyaç duyan üniversite öğrencilerine veriliyor ve geri ödemesiz. 2026–2027 akademik yılında burs aylık 8.000 TL; ödemeler Ekim–Haziran arasında 9 ay yapılıyor. 2026–2027 başvuruları 14 Eylül – 8 Ekim 2026 tarihleri arasında alındı.

## Kimler başvurabilir
- T.C. vatandaşı olmak
- Üniversiteye YKS ile yerleşmiş ve bir devlet üniversitesinde lisans ya da önlisans programına kayıtlı olmak
- Açık öğretim, uzaktan eğitim ya da ücretli programda okumamak
- Disiplin cezası ya da başarısızlık nedeniyle eğitimde kesinti yaşamamış olmak
- Mal varlığı ve gelir durumu uygun olmak
- Ara sınıflar için genel not ortalaması en az 2,50/4 (65/100)
- 25 yaşını geçmemiş ve daha önce bir lisans programından mezun olmamış olmak
- DGS ile yerleşenler için önlisans mezuniyet ortalaması en az 2,80 (70/100)

## Ödeme
- Burs her ayın 15'inde bursiyerin banka hesabına yatırılıyor.
- İlk kez burs almaya hak kazananlara ilk ödeme aralık ayında yapılıyor.

## Burs nasıl devam eder
- Genel not ortalaması en az 2,40/4 (100'lük sistemde 62) olmalı ve öğrenci bir üst sınıfa geçmeli; başarısız ders sayısına bakılmıyor.
- Devam için gereken belgeler her yıl eylülde duyuruluyor; 2026 için belge yükleme tarihleri 7 Eylül – 16 Kasım 2026.
- Yeniden sınava girip yıl kaybederek bölüm değiştirenlerin ya da vakıf üniversitesine geçenlerin bursu devam etmiyor.

## Vakfın diğer bursları
TEV'in Üstün Başarı (YKS'de ilk 5.000), Üstün Başarı Sanat, Yüksek Lisans, Doktora ve Kız Öğrenci Yurt bursları da var; koşulları ayrı.

## Kaynak
[TEV — Kimler başvurabilir?](https://www.tev.org.tr/burs/tr/44/Kimler-Basvurabilir) · [Üniversite (Eğitim) Bursu](https://www.tev.org.tr/burs/tr/39/Universite-Egitim-Bursu) · [Ödeme ve devam koşulları](https://tev.org.tr/burs/tr/46/Odeme-Sureci-Devam-Kosullari-ve-Oduller) · [2026–2027 burs tutarları](https://www.tev.org.tr/duyuru/tr/68/2026-2027-Akademik-Yili-TEV-Burs-Tutarlari-Aciklandi)$metin$,
  eligibility = $metin$Devlet üniversitesinde YKS ile yerleşmiş, maddi desteğe ihtiyacı olan, 25 yaşını geçmemiş T.C. vatandaşı önlisans ve lisans öğrencileri.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://www.tev.org.tr/burs/tr/39/Universite-Egitim-Bursu',
  canonical_source_url = 'https://www.tev.org.tr/burs/tr/39/Universite-Egitim-Bursu'
where id = '8f07de91-1e9a-426b-b5b9-3e163aeab3b4' and slug = 'tev-yuksekogretim-bursu' and md5(coalesce(description, '')) = 'b343c63d4a9312fd28956f287796cade';

update public.opportunities set
  short_description = $metin$Vehbi Koç Vakfı Üniversite Bursu: burs verilen üniversiteler, başvuru ve devam koşulları, mülakatlı seçim süreci.$metin$,
  description = $metin$## Kısa cevap
Vehbi Koç Vakfı'nın Üniversite Bursları, yetenekli ama maddi imkânları yetersiz öğrencileri eğitim süresi boyunca desteklemek için oluşturulmuş bir burs fonu. Burs yalnız vakfın listesindeki üniversitelerin öğrencilerine veriliyor; seçim başvuru formu ve yüz yüze mülakatla yapılıyor.

## Kimler başvurabilir
- T.C. vatandaşı olmak
- Örgün eğitimde lisans öğrencisi olmak
- Eğitimi için maddi yardıma ihtiyacı olmak
- Disiplin cezası almamış olmak
- Başarı notu en az 60/100 ya da 2,50/4 olmak
- Başka bir yerden karşılıksız burs almıyor olmak

## Burs verilen üniversiteler
Ankara, Anadolu, Akdeniz, Atatürk, Boğaziçi, Çukurova, Dokuz Eylül, Ege, Fırat, Gaziantep, Gebze Teknik, Hacettepe, Harran, İnönü, İskenderun Teknik, İstanbul Teknik, İstanbul (Hukuk Fakültesi), Karadeniz Teknik, Marmara, Mimar Sinan Güzel Sanatlar (Güzel Sanatlar Fakültesi ve Konservatuvar), Mersin, Muğla Sıtkı Koçman, Ondokuz Mayıs, Orta Doğu Teknik, Selçuk, Trakya, Uludağ ve Van Yüzüncü Yıl üniversiteleri.

## Seçim süreci
- Her yıl eğitim döneminin başında vakfın sitesi, üniversitelerin burs ofisleri ya da fakülte sekreterlikleri duyuru yayımlıyor.
- Öğrenci vakfın Burs Portalı'ndan Bursiyer Aday Formu'nu dolduruyor; bilgilerine göre mülakata çağrılacaklar belirleniyor.
- Vakıf ve okul yetkililerinden oluşan Burs Komisyonu adaylarla yüz yüze görüşüyor; asil ve yedek listeler duyuruluyor.

## Burs nasıl devam eder
- Yıl sonu başarı notu en az 60/100 ya da 2,50/4 olmalı.
- Öğrenci bir üst sınıfa geçmiş ve fiilen öğrenciliği sürüyor olmalı.
- Başka bir kurumdan karşılıksız burs almamalı ve disiplin cezası almamış olmalı.

Yanıltıcı beyanda burs hakkı iptal ediliyor ve ödenen tutarlar için yasal işlem başlatılabiliyor.

## Kaynak
[Vehbi Koç Vakfı — Üniversite Bursları](https://www.vkv.org.tr/tr/burslar/universite-burslari-75)$metin$,
  eligibility = $metin$Vakfın burs verdiği üniversitelerde örgün lisans okuyan, maddi yardıma ihtiyacı olan, ortalaması en az 2,50/4 olan ve karşılıksız burs almayan T.C. vatandaşları.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://www.vkv.org.tr/tr/burslar/universite-burslari-75',
  canonical_source_url = 'https://www.vkv.org.tr/tr/burslar/universite-burslari-75'
where id = 'e2bd859b-8afa-4be4-b110-91c1a177f5e2' and slug = 'vehbi-koc-vakfi-bursu' and md5(coalesce(description, '')) = '4f7505cc454c051a641574272ac569a5';

update public.opportunities set
  short_description = $metin$Anadolu Vakfı Burs Programı: devlet ya da %100 burslu vakıf üniversitesinde lisans okuyanlara geri ödemesiz burs; başvuru her yıl 1–30 Eylül.$metin$,
  description = $metin$## Kısa cevap
Anadolu Vakfı'nın Burs Programı, maddi desteğe ihtiyaç duyan başarılı öğrencilerin lisans eğitimini destekliyor. Burs geri ödeme ya da hizmet yükümlülüğü içermiyor. Başvurular her yıl 1–30 Eylül arasında vakfın sitesinden çevrim içi alınıyor.

## Kimler başvurabilir
- Türkiye Cumhuriyeti vatandaşı olmak
- Akademik başarı göstermek ve maddi desteğe ihtiyaç duymak
- Yurt içinde bir devlet üniversitesinde ya da %100 burslu olarak bir vakıf üniversitesinde tam zamanlı lisans programına kayıtlı olmak

## Ödeme
Burs ödemeleri Ekim–Haziran ayları arasında, toplam 9 ay boyunca düzenli olarak bursiyerin banka hesabına yapılıyor.

## Burstan fazlası
Vakfın sitesinde bursiyerlere yönelik Anadolu Vakfı Akademi, yetkinlik bazlı eğitimler, mentorluk, koçluk, staj ve İngilizce programları da yer alıyor.

## Karıştırılmasın
Bu burs, Anadolu Grubu'nun kurduğu Anadolu Vakfı'nın (anadoluvakfi.org.tr) bursu. Adı benzeyen Anadolu Eğitim Kültür ve Bilim Vakfı (anadoluvakfi.org) ayrı bir kuruluş ve kendi bursunu ayrı koşullarla veriyor.

## Kaynak
[Anadolu Vakfı — Burs Programı Kapsamı](https://www.anadoluvakfi.org.tr/egitim/burs-programi-kapsami)$metin$,
  eligibility = $metin$Akademik başarı gösteren, maddi desteğe ihtiyacı olan, devlet üniversitesinde ya da %100 burslu olarak vakıf üniversitesinde tam zamanlı lisans okuyan T.C. vatandaşları.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://www.anadoluvakfi.org.tr/egitim/burs-programi-kapsami',
  canonical_source_url = 'https://www.anadoluvakfi.org.tr/egitim/burs-programi-kapsami'
where id = '071de530-0d26-45f1-acd2-1a1c51ff6b5e' and slug = 'anadolu-vakfi-egitim-bursu' and md5(coalesce(description, '')) = '1676c665eae09393689f856ac1d443e7';

update public.opportunities set
  short_description = $metin$İBB Genç Üniversiteli Eğitim Yardımı: İstanbul'da ikamet eden öğrencilere destek; koşullar, istenen belgeler ve sık sorulanlar.$metin$,
  description = $metin$## Kısa cevap
İstanbul Büyükşehir Belediyesi'nin üniversite öğrencilerine verdiği eğitim desteğinin adı Genç Üniversiteli Eğitim Yardımı. Başvuru ve belge yükleme gencuniversiteli.ibb.istanbul portalından yapılıyor. Başvurular üniversitelerin kayıt tarihleri dikkate alınarak açılıyor ve her yıl yeniden başvurmak gerekiyor.

## Kimler başvurabilir
- Türkiye Cumhuriyeti vatandaşı olmak
- Öğrencinin kendisinin ya da ailesinin İstanbul'da ikamet etmesi (İstanbul dışındaki bir üniversitede okuyanlar da başvurabiliyor)
- Önlisans, lisans, yüksek lisans ya da doktora öğrencisi olmak ve normal öğrenim süresi içinde olmak
- Devlet üniversitesinde ya da vakıf/özel üniversitede %100 burslu okumak
- Ara ve son sınıflar için yıl sonu not ortalaması en az 53/100 ya da 2,00/4
- Gelir durumu açısından maddi desteğe ihtiyacı olmak

## Kimler başvuramaz
- Açık öğretim ve uzaktan öğretim öğrencileri
- Yurt dışında okuyan öğrenciler ve ücretli değişim programındakiler
- Önlisans ve lisansta 30, yüksek lisans ve doktorada 40 yaşından büyükler
- Kayıt donduran öğrenciler ve vakıf üniversitesinde %100'ün altında burslu okuyanlar

## İstenen belgeler
- Öğrenci belgesi ve transkript (1. sınıflardan transkript istenmiyor)
- Vakıf/özel üniversite öğrencileri için bursluluk belgesi
- Ailenin gelir durumunu gösteren belgeler (gelir belgesi, son aya ait maaş bordrosu; çalışmayan ebeveyn için SGK tescil ve hizmet dökümü)
- Varsa engelli raporu, okuyan kardeşlerin öğrenci belgesi, gazi ya da şehit belgesi

Adli sicil kaydı sistem tarafından sorgulanıyor. Aynı haneden iki üniversite öğrencisi birlikte yararlanabiliyor.

## Kaynak
[Genç Üniversiteli — Başvuru koşulları](https://gencuniversiteli.ibb.istanbul/BasvuruKosullari.aspx) · [Sıkça sorulan sorular](https://gencuniversiteli.ibb.istanbul/sss.aspx)$metin$,
  eligibility = $metin$Kendisi ya da ailesi İstanbul'da ikamet eden, devlet üniversitesinde ya da %100 burslu vakıf üniversitesinde okuyan ve maddi desteğe ihtiyacı olan öğrenciler.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://gencuniversiteli.ibb.istanbul/BasvuruKosullari.aspx',
  canonical_source_url = 'https://gencuniversiteli.ibb.istanbul/BasvuruKosullari.aspx'
where id = 'f0b60227-4823-45b3-804c-62e2ad24c53e' and slug = 'ibb-ogrenci-bursu' and md5(coalesce(description, '')) = '3d9e654ecb2158ddc0ac7598eed6960d';

update public.opportunities set
  short_description = $metin$TED Tam Eğitim Bursu: 4.–9. sınıf öğrencilerine verilir ve TED okulu mezunlarında üniversitede de sürer; üniversite öğrencisi yeni başvuramaz.$metin$,
  description = $metin$## Kısa cevap
Türk Eğitim Derneği'nin Tam Eğitim Bursu (TEB) üniversite öğrencilerine yeni başvuruyla verilen bir burs değil: burs ilkokul, ortaokul ve lise çağındaki çocukları TED okullarında okutuyor. TED okullarında burslu okuyup mezun olan öğrencilerin bursu ise üniversite eğitimleri boyunca devam ediyor. Yani üniversiteye başladıktan sonra bu bursa başvurulamıyor.

## Bursun kapsamı
Tam Eğitim Bursu yalnız okul ücretini değil; cep harçlığını, servis, yemek, kitap-kırtasiye ve kıyafet giderlerini, yatılı öğrencilerde pansiyon giderlerini de karşılıyor. Üniversiteye geçen burslu öğrencilerin staj ve kariyer süreçleri izleniyor, mezun olunca işe yerleşmeleri destekleniyor.

## Kimler başvurabilir
- T.C. vatandaşı olmak
- Başvuru yılında 4., 5., 6., 7., 8. ya da 9. sınıfa devam etmek (8. sınıflar LGS sonuçlarından sonra başvuruyor)
- Bitirdiği sınıfın karne ortalaması en az 85 olmak
- Aile gelirinin TED'in her yıl belirlediği düzeyin altında olması
- Halen bir TED okulunda okuyan öğrenciler sınava başvuramıyor

## Başvuru ve seçim
Başvuruyu veliler her yıl şubat ayında ted.org.tr üzerinden yapıyor. Başvurular akademik ve maddi olarak değerlendiriliyor, uygun bulunan adaylarla evde mülakat yapılıyor; burs kararı TED'in burslu öğrenci komisyonu ve yönetim kurulu tarafından veriliyor.

Üniversite öğrencisiysen bunun yerine [TEV Üniversite Bursu](/firsatlar/tev-yuksekogretim-bursu) ya da [KYK bursu](/firsatlar/kyk-ogrenim-bursu) gibi programlara bakabilirsin.

## Kaynak
[TED — Tam Eğitim Bursu](https://ted.org.tr/tam-egitim-bursu/)$metin$,
  eligibility = $metin$Başvuru yılında 4.–9. sınıfa devam eden, karne ortalaması en az 85 olan ve aile geliri TED'in belirlediği sınırın altında olan T.C. vatandaşı öğrenciler.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://ted.org.tr/tam-egitim-bursu/',
  canonical_source_url = 'https://ted.org.tr/tam-egitim-bursu/'
where id = 'eb861221-7010-4f63-85cf-c294bae05896' and slug = 'ted-egitim-bursu' and md5(coalesce(description, '')) = '10cc6f4016df0c6d3e839866ca441fe7';

update public.opportunities set
  short_description = $metin$TÜBİTAK 2205 Lisans Burs Programı: hangi bölümler, YKS'de ilk 25.000 şartı, olimpiyat ve proje yolu, ödeme ve devam koşulları.$metin$,
  description = $metin$## Kısa cevap
TÜBİTAK'ın lisans öğrencilerine yönelik ana bursu 2205 Lisans Burs Programı. Amaç, üniversite sınavında başarılı öğrencileri temel bilimlere ve sosyal-beşeri bilimlere yönlendirmek; bilim olimpiyatlarında ve araştırma projesi yarışmalarında üstün başarı gösterenleri de desteklemek. Başvuru yılda iki dönem alınıyor ve kesin tarihler programın sayfasında ilan ediliyor.

## Kimler başvurabilir
- T.C. vatandaşı ya da Mavi Kart sahibi olmak ve daha önce lisans bitirmemiş olmak
- Şu bölümlerden birine yerleşip, YKS'de sayısal programlar için Y-SAY, sözel ve eşit ağırlıklı programlar için TYT puan türünde ilk 25.000'e girmek: Antropoloji, Arkeoloji, Arkeoloji ve Sanat Tarihi, Astronomi ve Uzay Bilimleri, Biyoloji, Coğrafya, Felsefe, Fizik, İlahiyat, Kimya, Matematik, Moleküler Biyoloji ve Genetik, Sanat Tarihi, Sosyoloji, Tarih, Türk Dili ve Edebiyatı
- Bu bölümlerden birinde çift anadal (ÇAP) yapıp aynı sıralama şartını sağlamak
- TÜBİTAK 2204 lise araştırma projeleri yarışmalarının finalinde ilk üçe girip YKS'de ilk 25.000'e girmek
- TÜBİTAK Ulusal Bilim Olimpiyatlarında madalya almak ya da uluslararası olimpiyat ve proje yarışmalarında derece almak

## Başvuru ve ödeme
- Başvuru e-bideb.tubitak.gov.tr üzerinden yapılıyor; başvuru aşamasında belge yüklenmiyor, bilgiler çevrim içi sistemlerden görüntüleniyor.
- Burs bahar döneminde mart, güz döneminde ekim ayından başlıyor ve normal öğrenim süresinin bittiği yılın haziran ayına kadar sürüyor.
- Ödemeler yılın 12 ayını kapsıyor ve ait olduğu ayı izleyen ayın ilk 15 gününde yatıyor.
- Burs miktarı programın internet sayfasında ilan ediliyor.

## Burs nasıl devam eder
Genel not ortalamasının en az 2,50/4 (65/100) olması ve aktif öğrenci olunması gerekiyor. Ortalama düşerse burs durduruluyor; şart yeniden sağlanınca izleyen dönemde tekrar başlıyor.

## Kaynak
[TÜBİTAK 2205 Lisans Burs Programı — 2026 yılı 1. dönem çağrı duyurusu](https://tubitak.gov.tr/sites/default/files/2026-03/2205-Cagri_Duyurusu_2026_1.pdf)$metin$,
  eligibility = $metin$Temel bilimler ile sosyal ve beşeri bilimlerin belirlenen bölümlerine YKS'de ilk 25.000 içinde yerleşenler ve TÜBİTAK olimpiyat ya da proje yarışmalarında derece alanlar.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://tubitak.gov.tr/sites/default/files/2026-03/2205-Cagri_Duyurusu_2026_1.pdf',
  canonical_source_url = 'https://tubitak.gov.tr/sites/default/files/2026-03/2205-Cagri_Duyurusu_2026_1.pdf'
where id = '6d27392c-b16e-4c92-bc4c-37e13cb17149' and slug = 'tubitak-burs-programlari' and md5(coalesce(description, '')) = '60338f60ef51a36bac387978f8316642';

update public.opportunities set
  short_description = $metin$Erasmus+ öğrenim ve staj hareketliliği: kimler katılabilir, başvuru neden kendi üniversitenden yapılır, süreler ve hibe kalemleri.$metin$,
  description = $metin$## Kısa cevap
Erasmus+ yükseköğretim hareketliliği (KA131) öğrencilerin yurt dışında bir üniversitede öğrenim görmesini ya da bir şirket veya kurumda staj yapmasını destekliyor. Türkiye Ulusal Ajansı öğrencilerden bireysel başvuru almıyor: başvuru, kendi üniversitenin TURNAPortal üzerinden açtığı Erasmus ilanına yapılıyor.

## Kimler katılabilir
- Yükseköğretim kurumlarında önlisans, lisans, yüksek lisans ya da doktora düzeyinde örgün eğitim gören öğrenciler
- Üniversitenin Yükseköğretim için Erasmus Beyannamesi'ne (ECHE) sahip olması ya da bir hareketlilik konsorsiyumunda yer alması gerekiyor
- Bazı şartlarla yeni mezunlar da staj hareketliliğine katılabiliyor

## Hareketlilik türleri ve süreler
- Öğrenim hareketliliği: yurt dışındaki bir yükseköğretim kurumunda öğrenim
- Staj hareketliliği: yurt dışında bir şirkette ya da kurumda staj
- Uzun dönemli öğrenci hareketliliği en az 2, en fazla 12 ay sürüyor
- Karma hareketlilik, Karma Yoğun Programlar (BIP) ve kısa süreli doktora hareketliliğinde fiziksel süre 5 ila 30 gün arasında

## Hibe
Hibe kalemleri seyahat desteği ve bireysel destekten oluşuyor; imkânı kısıtlı öğrenciler için ek hibe ve içerme desteği var. Tutar gidilen ülkeye ve süreye göre değişiyor.

## Nasıl başvurulur
Üniversitenin Erasmus ya da Uluslararası İlişkiler ofisinin duyurularını takip et; ilan TURNAPortal'da yayımlanıyor. Dil şartı, not ortalaması ve takvim her üniversitenin kendi ilanında yazıyor.

Yurt dışında staj için ayrıntılı rehber: [Yurt dışında staj](/rehber/yurtdisinda-staj)

## Kaynak
[Türkiye Ulusal Ajansı — KA131 Yükseköğretim Hareketliliği](https://www.ua.gov.tr/programlar/firsatlar/ka1-ka131-program-ulkelerinde-staj/)$metin$,
  eligibility = $metin$Erasmus beyannamesi (ECHE) olan bir yükseköğretim kurumunda önlisans, lisans, yüksek lisans ya da doktora düzeyinde örgün eğitim gören öğrenciler.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://www.ua.gov.tr/programlar/firsatlar/ka1-ka131-program-ulkelerinde-staj/',
  canonical_source_url = 'https://www.ua.gov.tr/programlar/firsatlar/ka1-ka131-program-ulkelerinde-staj/'
where id = '878b45e9-fda1-4c11-ae15-5d6472abf160' and slug = 'erasmus-plus-hareketlilik' and md5(coalesce(description, '')) = '83989680f203d35cffc4a45293ba15c6';

update public.opportunities set
  description = $metin$## Kısa cevap
Ulusal Staj Programı (USP), Cumhurbaşkanlığı himayesinde ve İŞKUR koordinasyonunda yürütülen ulusal bir program. Amaç, öğrencilerin kamu kurumları ve özel sektörün sunduğu staj imkânlarına fırsat eşitliği ve liyakat esasıyla ulaşması. Öğrenci tek başvuru yapıyor, puanıyla stajyer havuzuna giriyor; teklifler işverenlerden geliyor.

## Kimler başvurabilir
İŞKUR'un 2026 öğrenci broşürüne göre:
- Başvuru yılının 1 Ocak tarihi itibarıyla 35 yaşını doldurmamış olmak
- Genel not ortalaması en az 2,00/4 olmak (önlisans 1. sınıf, yüksek lisans ve doktora öğrencilerinde ortalama şartı aranmıyor)
- Türkiye ya da KKTC'de örgün eğitim veren önlisans programlarının 1. ya da 2. sınıfında okumak
- Örgün eğitim veren lisans programlarının 2., 3. ya da 4. sınıfında okumak (tıp, öğretmenlik ve diş hekimliği hariç)
- Yurt dışındaki bir üniversitede okuyan T.C. vatandaşı ya da Mavi Kart sahibi olmak
- Yüksek lisans ve doktora öğrencileri de başvurabiliyor

## Adım adım
- Başvuru: e-Devlet ile giriş yapılarak programın sitesindeki başvuru formundan
- Belgelerin kontrolü: beyan edilen bilgi ve belgeler ilgili kurumlarca son başvuru tarihine kadar kontrol ediliyor
- Değerleme: onaylanan bilgiler Ağırlıklı Toplam Standart Puan (ATSP) ile akademik/mesleki, sanatsal/sosyal ve sportif yeterliliklere göre puanlanıyor
- Stajyer havuzu: değerlemesi biten adaylar havuza alınıyor ve sisteme kayıtlı işverenlerin erişimine açılıyor
- Teklif ve onay: işverenler adaylara kimlik bilgilerini görmeden, yalnız puanlara göre staj, iş gölgeleme ya da eğitim teklifi gönderiyor; aday kabul ederse onay süreci tamamlanıyor
- Program sonunda adaylar ve işverenler değerlendirme anketini dolduruyor, programı tamamlayana Katılım Belgesi veriliyor

## Kaynak
[Ulusal Staj Programı](https://ulusalstajprogrami.iskur.gov.tr) · [İŞKUR öğrenci broşürü (PDF)](https://staj.iskur.gov.tr/assets/images/iskur/usp-ogrenci-brosur.pdf)$metin$,
  eligibility = $metin$İŞKUR'un 2026 öğrenci broşürüne göre: 35 yaşını doldurmamış, genel not ortalaması en az 2,00/4 olan önlisans 1–2. sınıf, lisans 2.–4. sınıf (tıp, öğretmenlik ve diş hekimliği hariç), yüksek lisans ve doktora öğrencileri.$metin$,
  last_checked_at = now(),
  verified_at = now()
where id = '08501aec-8c9b-4e89-9476-f84ceccae92f' and slug = 'ulusal-staj-programi-2027' and md5(coalesce(description, '')) = '2b3e5fe6497950640cfeb44b249e68bf';

update public.opportunities set
  short_description = $metin$TEKNOFEST teknoloji yarışmaları: hangi alanlarda yarışma var, kimler katılabilir ve başvuru nasıl yapılır.$metin$,
  description = $metin$## Kısa cevap
TEKNOFEST kapsamında her yıl çok sayıda teknoloji yarışması düzenleniyor. Yarışmalar katılım düzeyine göre ayrılıyor: ilkokul, ortaokul, lise, önlisans-lisans-lisansüstü, mezun-girişim-özel sektör ve uluslararası katılım. Üniversite öğrencileri için ayrı bir düzey var.

## Yarışma alanları
- Eğitim, araştırma ve tasarım
- Enerji, çevre ve sürdürülebilirlik
- Sağlık teknolojileri
- Deniz araçları ve sistemleri
- Havacılık ve insansız hava sistemleri
- Mobilite ve akıllı ulaşım
- Uzay ve roket teknolojileri
- Yazılım ve dijital teknolojiler
- Yapay zekâ ve veri teknolojileri
- Savunma teknolojileri
- Robotik ve otonom sistemler
- Haberleşme ve ağ teknolojileri

## Nasıl katılınır
Başvurular TEKNOFEST'in sitesinden, yarışmanın kendi sayfasından yapılıyor. Çoğu yarışmaya takım olarak katılınıyor ve her yarışmanın kendi şartnamesi var: katılım düzeyi, takım büyüklüğü, danışman şartı ve aşamalar şartnamede yazıyor. Başvurmadan önce yarışmanın düzeyinin seninkiyle eşleştiğini kontrol et.

## Neden önemli
Takım halinde gerçek bir proje geliştirmek, staj ve iş başvurularında CV'nde güçlü bir madde olur. Proje deneyimini nasıl yazacağın: [Staj CV'si rehberi](/rehber/staj-cv-nasil-yazilir)

## Kaynak
[TEKNOFEST — Yarışmalar](https://www.teknofest.org/tr/yarismalar/)$metin$,
  eligibility = $metin$İlkokuldan lisansüstüne kadar öğrenciler, mezunlar, girişimler ve uluslararası katılımcılar; her yarışmanın kendi düzey ve takım koşulları var.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://www.teknofest.org/tr/yarismalar/',
  canonical_source_url = 'https://www.teknofest.org/tr/yarismalar/'
where id = 'f631f582-0948-438e-98c3-55f27dff5998' and slug = 'teknofest-yarismalari' and md5(coalesce(description, '')) = 'c6e2afc5c9914edf409d8fd638851e0a';

update public.opportunities set
  short_description = $metin$TÜRGEV eğitim ve yurt bursları: başarı ve destek bursu türleri ve 2026 başvuru dönemleri.$metin$,
  description = $metin$## Kısa cevap
TÜRGEV (Türkiye Gençlik ve Eğitime Hizmet Vakfı) bursları iki gruba ayrılıyor: eğitim bursları ve yurt bursları. Her grupta başarı bursu ve destek bursu var; ayrıca Aile Yılı Bursu açıldı.

## Burs türleri
- Eğitim Başarı Bursu ve Eğitim Destek Bursu
- Yurt Başarı Bursu ve Yurt Destek Bursu
- Aile Yılı Bursu

## 2026 başvuru dönemleri
Vakfın burs listesinde 2026 için son başvuru tarihleri 1 Eylül, 7 Ekim, 15 Ekim (Aile Yılı Bursu) ve 7 Kasım (yurt bursları) olarak görünüyor.

## Kaynak
[TÜRGEV — Burslar](https://www.turgev.org/tr/burslar)$metin$,
  eligibility = $metin$Koşullar burs türüne göre değişiyor; güncel koşullar vakfın burs sayfasında.$metin$,
  last_checked_at = now(),
  verified_at = now(),
  source_url = 'https://www.turgev.org/tr/burslar',
  canonical_source_url = 'https://www.turgev.org/tr/burslar'
where id = '73755fe5-d503-4ea0-8de2-d9bf738b52bb' and slug = 'turgev-ogrenci-bursu' and md5(coalesce(description, '')) = 'e79f740e5f8fbb5b1208308742ea35d5';
