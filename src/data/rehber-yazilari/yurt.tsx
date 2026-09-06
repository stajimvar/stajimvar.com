import { metinRehberi } from '../rehber-govde';
import type { Rehber } from '../rehberler';

/**
 * Yurt ve barınma rehberleri.
 *
 * Yurt ücretleri, kontenjanlar ve başvuru tarihleri her yıl yeniden
 * belirleniyor; bu sayfalarda rakam ve tarih yazmıyoruz. Süreç ve
 * mekanizma anlatılıp güncel bilgi için resmî kaynağa yönlendiriliyor.
 */
export const YURT_REHBERLERI: Rehber[] = [
  metinRehberi({
    slug: 'kyk-yurt-basvurusu',
    guncelleme: '2026-08-25',
    baslik: 'KYK yurt başvurusu nasıl yapılır?',
    ozet: 'Başvuru e-Devlet üzerinden; yerleştirme puanla yapılıyor.',
    konu: 'yurt',
    etiketler: ['kyk yurt', 'yurt başvurusu', 'e-devlet', 'barınma'],
    oneCikan: true,
    aciklama:
      'KYK yurt başvurusu nasıl yapılır? Başvuru dönemi, gerekli bilgiler, ' +
      'yerleştirme mantığı ve sonuç açıklandıktan sonraki adımlar.',
    hizliCevap:
      'KYK yurt başvuruları e-Devlet üzerinden, belirlenen başvuru döneminde yapılıyor. ' +
      'Yerleştirme başvuru sırasına göre değil, öğrencinin durumuna verilen puanlara göre yapılıyor; ' +
      'bu yüzden ilk gün başvurmak avantaj sağlamıyor ama son güne bırakmak risk. ' +
      'Sonuç açıklandığında kabul edilen öğrencinin belirlenen süre içinde kayıt yaptırması gerekiyor.',
    bloklar: [
      {
        paragraflar: [
          'Barınma, üniversiteye yerleşen öğrencinin ilk büyük problemi. KYK yurtları en yaygın ' +
            've en uygun seçenek olduğu için başvuru süreci de yoğun geçiyor.',
        ],
      },
      {
        baslik: 'Başvuru adımları',
        sirali: [
          'Başvuru döneminin açıldığını resmî duyurudan takip et.',
          'e-Devlet\'e gir ve yurt başvuru hizmetini aç.',
          'Öğrenci bilgilerini kontrol et; yerleşme belgen sisteme düşmüş olmalı.',
          'Tercih edeceğin yurtları/şehri seç.',
          'Aile ve gelir durumu bilgilerini eksiksiz gir.',
          'Başvuruyu tamamla ve alındı belgesini kaydet.',
        ],
        uyari:
          'Başvuru tarihleri her yıl yeniden açıklanıyor. Bu sayfada tarih yazmıyoruz; ' +
          'güncel takvim için resmî duyuruya bak.',
      },
      {
        baslik: 'Yerleştirme neye göre yapılıyor',
        paragraflar: [
          'Yerleştirme bir puanlama sistemine dayanıyor. Puanı belirleyen unsurlar genel olarak ' +
            'öğrencinin ve ailesinin sosyoekonomik durumu, özel durumlar ve öğrencilik bilgileri. ' +
            'Ayrıntılı ölçütler her yıl yayımlanan yönergede yer alıyor.',
        ],
        liste: [
          'Başvuru sırası yerleştirmeyi etkilemiyor — ilk gün başvurmak avantaj değil.',
          'Beyan edilen bilgiler denetleniyor; yanlış beyan yerleştirmeyi iptal ettiriyor.',
          'Şehir tercihi önemli: kontenjan yoğun şehirlerde daha çekişmeli.',
        ],
      },
      {
        baslik: 'Sonuçtan sonra',
        liste: [
          'Kabul edildiysen belirlenen süre içinde kayıt yaptır; süre kaçarsa hak düşüyor.',
          'Kayıtta istenen belgeler ve depozito bilgisi duyuruda yazıyor.',
          'Yedekte kaldıysan sıranın nasıl işlediğine [yurt yedek sırası](/rehber/yurt-yedek-sirasi) sayfasından bak.',
          'Yerleşemediysen [özel yurt](/rehber/ozel-yurt-secerken) ve [öğrenci evi](/rehber/ogrenci-evi-kiralarken) seçeneklerine yönel.',
        ],
      },
    ],
    sss: [
      {
        soru: 'KYK yurt başvurusu ne zaman yapılır?',
        cevap:
          'Başvurular genellikle üniversite yerleştirme sonuçlarının ardından açılıyor. Kesin tarih her yıl resmî duyuruyla açıklanıyor.',
      },
      {
        soru: 'Başvuruyu erken yapmak avantaj sağlar mı?',
        cevap:
          'Hayır. Yerleştirme puan esaslı yapılıyor, başvuru sırasına göre değil. Yine de son güne bırakmak teknik sorun riski taşıyor.',
      },
      {
        soru: 'Ara sınıf öğrencisi başvurabilir mi?',
        cevap:
          'Evet, ara sınıflar için de başvuru alınıyor. Koşullar ve kontenjanlar duyuruda belirtiliyor.',
      },
      {
        soru: 'Başka şehirde okuyorum, memleketimdeki yurda başvurabilir miyim?',
        cevap:
          'Yurt başvurusu genellikle öğrenim görülen şehir üzerinden yapılıyor. Staj gibi geçici durumlar için ayrı düzenlemeler olabiliyor; kuruma sormak gerekiyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr', kurum: 'Gençlik ve Spor Bakanlığı Kredi ve Yurtlar Genel Müdürlüğü', tur: 'kurum', destekledigi: 'Yurt başvuru dönemi, yerleştirme ölçütleri ve kayıt süresi.' },
      { etiket: 'e-Devlet Kapısı', adres: 'https://www.turkiye.gov.tr', kurum: 'Cumhurbaşkanlığı Dijital Dönüşüm Ofisi', tur: 'kurum', destekledigi: 'Başvurunun yapıldığı ve sonucun görüldüğü yer.' },
    ],
    sonrakiAdim: {
      etiket: 'Fırsat takvimini aç',
      yol: '/firsat-takvimi',
      aciklama: 'Açılan ve kapanan başvuruları kaçırma.',
    },
  }),

  metinRehberi({
    slug: 'kyk-yurt-tipleri',
    guncelleme: '2026-08-25',
    baslik: 'KYK yurt tipleri ve oda düzeni',
    ozet: 'Oda kişi sayısı ücreti ve günlük düzeni belirliyor.',
    konu: 'yurt',
    etiketler: ['yurt tipi', 'oda', 'kyk', 'barınma'],
    aciklama:
      'KYK yurtlarında oda tipleri neler? Kişi sayısı, ortak alanlar, yemek ve ' +
      'tercih yaparken dikkat edilecekler.',
    hizliCevap:
      'KYK yurtlarında odalar genellikle kişi sayısına göre ayrılıyor ve ücret oda tipine göre değişiyor: ' +
      'kişi sayısı azaldıkça ücret artıyor. Tercih yaparken yalnızca ücrete değil, yurdun kampüse ' +
      'uzaklığına, ortak alanlarına ve çalışma salonu imkânına da bakmak gerekiyor — günlük hayatını ' +
      'en çok bunlar belirliyor.',
    bloklar: [
      {
        baslik: 'Önce bir uyarı: oda tipi mevzuatta tanımlı değil',
        paragraflar: [
          'İnternette "KYK oda tipleri" diye dolaşan listeler kaynak göstermiyor ve birbirini ' +
            'tutmuyor. Sebebi şu: Gençlik ve Spor Bakanlığı Yurt Hizmetleri Yönetmeliği oda tipi ya ' +
            'da oda kapasitesi diye bir sınıflandırma YAPMIYOR. Yönetmelik yurtların açılması, ' +
            'barınma şartları, ücret ve disiplin gibi başlıkları düzenliyor; kaç kişilik oda ' +
            'olacağını binaya ve Bakanlığın uygulamasına bırakıyor.',
          'Aşağıdaki tablo bu yüzden bir kural değil, yaygın olarak karşılaşılan düzen. Bağlayıcı ' +
            'bilgi kendi yerleştiğin yurdun duyurusunda.',
        ],
      },
      {
        baslik: 'Oda tipleri',
        paragraflar: [
          'Yurtlarda oda düzeni binadan binaya değişiyor. Genel eğilim şöyle:',
        ],
        tablo: {
          sutunlar: ['Oda tipi', 'Ne beklemeli'],
          satirlar: [
            ['Tek kişilik', 'En az bulunan tip, ücret en yüksek'],
            ['İki kişilik', 'Çalışma düzeni kurmak kolay, kontenjan sınırlı'],
            ['Dört kişilik', 'En yaygın tip; ortak yaşam kuralları önem kazanıyor'],
            ['Altı ve üzeri', 'Ücret en düşük, sessizlik en zor'],
          ],
        },
        uyari:
          'Ücretler her yıl yeniden belirleniyor ve oda tipine göre değişiyor. Güncel tutar için ' +
          'resmî duyuruya bakmak gerekiyor.',
      },
      {
        baslik: 'Tercih ederken bak',
        liste: [
          'Kampüse uzaklık ve ulaşım: günde iki saat yolda geçen zaman, oda farkından ağır basıyor.',
          'Çalışma salonu var mı, saat kaça kadar açık.',
          'Yemekhane düzeni: öğün sayısı ve saatleri.',
          'Çamaşırhane ve mutfak imkânı.',
          'İnternet altyapısı — uzaktan derse giriyorsan belirleyici.',
          'Giriş-çıkış saatleri ve izin düzeni.',
        ],
      },
      {
        baslik: 'Ortak yaşam',
        paragraflar: [
          'Çok kişilik odalarda en sık çıkan sorunlar uyku saati, ses ve temizlik. Dönem başında ' +
            'oda arkadaşlarıyla üç madde üzerinde anlaşmak, dönem ortasındaki tartışmaların çoğunu önlüyor: ' +
            'sessizlik saati, ortak alan temizliği ve misafir düzeni.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Oda tipini kendim seçebilir miyim?',
        cevap:
          'Başvuruda tercih belirtilebiliyor ama yerleştirme kontenjana bağlı. Tercih ettiğin tip dolduğunda başka bir odaya yerleştirilebiliyorsun.',
      },
      {
        soru: 'Oda değişikliği yapılabilir mi?',
        cevap:
          'Yurt yönetimine başvurarak talep edilebiliyor; kontenjan varsa değerlendiriliyor. Kesin bir hak değil.',
      },
      {
        soru: 'Yurt ücretine yemek dahil mi?',
        cevap:
          'Barınma ve yemek genellikle ayrı ücretlendiriliyor. Güncel uygulama için resmî duyuruya bakmak gerekiyor.',
      },
    ],
    kaynaklar: [{ etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr' }],
    sonrakiAdim: {
      etiket: 'KYK yurt başvurusu nasıl yapılır',
      yol: '/rehber/kyk-yurt-basvurusu',
      aciklama: 'Başvuru adımlarını ve yerleştirme mantığını oku.',
    },
  }),

  metinRehberi({
    slug: 'yurt-yedek-sirasi',
    guncelleme: '2026-08-25',
    baslik: 'Yurt yedek sırası nasıl ilerler?',
    ozet: 'Sıra boşalan kontenjana göre ilerliyor; beklerken plan B şart.',
    konu: 'yurt',
    etiketler: ['yedek', 'sıra', 'kyk yurt', 'kontenjan'],
    aciklama:
      'KYK yurt yedek sırası nasıl ilerler? Ne zaman hareket eder, nasıl takip edilir ' +
      've beklerken ne yapılmalı.',
    hizliCevap:
      'Yedek sırası, asıl listeden yerleştirilen öğrencilerin kayıt yaptırmaması ya da kayıt sildirmesiyle ' +
      'boşalan kontenjana göre ilerliyor. Bu yüzden en çok hareket, kayıt süresinin bittiği günlerde ve ' +
      'dönem başındaki ilk haftalarda oluyor. Sıranı e-Devlet üzerinden takip edebilirsin; ' +
      'ama sıranın ne zaman geleceği garanti edilemediği için beklerken mutlaka bir plan B kurmak gerekiyor.',
    bloklar: [
      {
        paragraflar: [
          'Yedek listede olmak "yerleşemedin" demek değil; ama "yerleşeceksin" de demek değil. ' +
            'Belirsizliği yönetmenin tek yolu, beklerken alternatifi hazır tutmak.',
        ],
      },
      {
        baslik: 'Sıra ne zaman hareket eder',
        liste: [
          'Asıl listedekilerin kayıt süresi dolduğunda: en büyük hareket burada oluyor.',
          'Dönem başında: gelmeyen ya da kayıt sildiren öğrencilerin yerleri boşalıyor.',
          'Dönem içinde: nakil, kayıt sildirme ve mezuniyetle boşalan yerler.',
          'Bahar dönemi başında: ikinci bir hareket dalgası.',
        ],
      },
      {
        baslik: 'Sırada kim önde',
        paragraflar: [
          'Yedek sırası yalnızca başvuru zamanına göre kurulmuyor. Yurt Hizmetleri Yönetmeliği ' +
            'başvuruları "öğrenci ve ailesinin sosyal, ekonomik durumu, öğrencinin başarısı ve ' +
            'benzeri durumlar" üzerinden değerlendiriyor (madde 9/1) ve belgelendirmek koşuluyla ' +
            'bazı öğrencileri öncelikli barındırıyor (madde 9/2):',
        ],
        liste: [
          'Şehit eşi ve çocukları; şehidin çocuğu yoksa bekâr kardeşleri.',
          'Gazi ve gazi çocukları.',
          'Yüzde 40 ve üzerinde engel durumu olanlar.',
          'Anne ve babası vefat etmiş, yirmi beş yaşını geçmemiş öğrenciler.',
          'Lise ve dengi öğrenimini Aile ve Sosyal Hizmetler Bakanlığı bünyesinde barınarak tamamlayanlar.',
          'Devlet koruması altında olanlar.',
          'Lise ve dengi öğrenimini Darüşşafaka Lisesinde tamamlayanlar.',
          'Bakanlığın belirlediği kriterleri taşıyan millî sporcu belgesi sahipleri.',
          'Gönüllü güvenlik korucusu olarak çalışan, çalışırken vefat eden veya emekliye ayrılanların çocukları.',
          'ÖSYM sınavlarında her puan türünde ham puan bazında ilk yüze girenler.',
        ],
        uyari:
          'Öncelik kendiliğinden işlemiyor. Yönetmelik "kamu kurum ve kuruluşlarından temin edilmiş ' +
          'olan belgelerle durumunu belgelendiren öğrenci" diyor: belge yüklenmemişse öncelik ' +
          'uygulanmıyor.',
      },
      {
        baslik: 'Kayıtlar bittikten sonra boş yatak kalırsa',
        paragraflar: [
          'Asıl ve yedek listeden hak kazananların kayıtları tamamlandıktan sonra yurtta hâlâ boş ' +
            'yatak varsa, yönetmelik dört grubun talebinin ayrıca değerlendirileceğini söylüyor ' +
            '(madde 10/2). Yani sıran gelmese bile bakılacak ikinci bir kapı var:',
        ],
        liste: [
          'Yurt bulunmayan ilçelerde öğrenim görenler.',
          'Yedek sırası devam eden il veya ilçelerde öğrenim görenler.',
          'Yeni açılan yükseköğretim kurumlarında öğrenim görenler.',
          'Öğrenim gördüğü yere ulaşımı zor olan mahalle, belde veya köylerde oturanlar.',
        ],
      },
      {
        baslik: 'Nasıl takip edilir',
        sirali: [
          'e-Devlet üzerinden başvuru durumunu düzenli kontrol et.',
          'e-Devlet ve SMS bildirimlerinin açık olduğundan emin ol.',
          'İletişim bilgilerinin güncel olduğunu doğrula.',
          'Yerleştirme bildirimi geldiğinde kayıt süresini kaçırma — süre kısa oluyor.',
        ],
        uyari:
          'Yerleştirme bildirimi geldiğinde belirlenen sürede kayıt yaptırmazsan hakkın düşüyor ve ' +
          'sıra bir sonrakine geçiyor. Bildirimleri günlük kontrol et.',
      },
      {
        baslik: 'Beklerken plan B',
        paragraflar: [
          'Yedek sıranın hareket edeceği tarih belli olmadığı için, dönem başlamadan barınma sorununu ' +
            'çözecek geçici bir çözüm gerekiyor.',
        ],
        liste: [
          'Kısa süreli kiralık oda ya da öğrenci apartı.',
          'Aylık sözleşmeli özel yurtlar — [seçerken dikkat edilecekler](/rehber/ozel-yurt-secerken).',
          'Ev arkadaşlığı: dönem başında ilan çok, [sözleşmeye dikkat](/rehber/depozito-ve-kira-sozlesmesi).',
          'Üniversitenin kendi yurtları ve öğrenci toplulukları duyuruları.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Yedek sıram kaç numarada, nereden görürüm?',
        cevap:
          'Başvuru sonucu ve durumu e-Devlet üzerinden görülebiliyor. Sıranın ne kadar ilerleyeceği önceden bilinemiyor.',
      },
      {
        soru: 'Yedekteyken başka yurda başvurabilir miyim?',
        cevap:
          'Özel yurt ve üniversite yurtları ayrı sistemler; onlara başvurmak KYK yedek durumunu etkilemiyor. Yerleştiğinde birinden vazgeçmen gerekiyor.',
      },
      {
        soru: 'Yedekten yerleşirsem depozito öder miyim?',
        cevap:
          'Kayıt sırasında istenen ödemeler asıl listeden yerleşenlerle aynı. Ayrıntı kayıt duyurusunda yazıyor.',
      },
    ],
    kaynaklar: [
      {
        etiket: 'Gençlik ve Spor Bakanlığı Yurt Hizmetleri Yönetmeliği',
        adres: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=38510&MevzuatTur=7&MevzuatTertip=5',
        kurum: 'Cumhurbaşkanlığı Mevzuat Bilgi Sistemi',
        tur: 'belge',
        destekledigi:
          'Başvurunun neye göre değerlendirildiği (madde 9), öncelikli barındırma halleri ' +
          '(madde 9/2), asıl listeden kayıt yaptırmayanın yerine yedek sırasından yerleştirme ' +
          've boş yatak kalması hâlinde değerlendirilecek gruplar (madde 10).',
      },
      {
        etiket: 'e-Devlet Kapısı',
        adres: 'https://www.turkiye.gov.tr',
        kurum: 'Cumhurbaşkanlığı Dijital Dönüşüm Ofisi',
        tur: 'kurum',
        destekledigi: 'Başvurunun yapıldığı ve sonucun görüldüğü yer.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Öğrenci evi kiralarken dikkat edilecekler',
      yol: '/rehber/ogrenci-evi-kiralarken',
      aciklama: 'Beklerken plan B kurmanın yolu.',
    },
  }),

  metinRehberi({
    slug: 'kyk-yurt-nakli',
    guncelleme: '2026-08-25',
    baslik: 'KYK yurt nakli nasıl yapılır?',
    ozet: 'Şehir değişince yurt hakkı otomatik taşınmıyor.',
    konu: 'yurt',
    etiketler: ['nakil', 'yurt değişikliği', 'yatay geçiş', 'staj'],
    aciklama:
      'KYK yurt nakli nasıl yapılır? Şehir ve okul değişikliğinde yurt hakkı, ' +
      'geçici nakil ve staj dönemi.',
    hizliCevap:
      'Yurt nakli, öğrencinin okuduğu şehir ya da okul değiştiğinde yurt hakkının başka bir yurda ' +
      'aktarılmasıdır ve otomatik olmuyor: talep etmek, gerekçeyi belgelemek ve hedef yurtta kontenjan ' +
      'olması gerekiyor. Yaz stajı gibi geçici durumlar için ayrı düzenlemeler bulunabiliyor; ' +
      'başvurmadan önce bulunduğun yurt yönetimine sormak gerekiyor.',
    bloklar: [
      {
        baslik: 'Nakil gerektiren durumlar',
        liste: [
          'Yatay geçişle başka üniversiteye geçmek.',
          'Bölüm değişikliğiyle başka kampüse geçmek.',
          'Aynı şehirde kampüse daha yakın bir yurda geçmek istemek.',
          'Yaz stajı ya da dönemlik eğitim için geçici olarak başka şehirde bulunmak.',
        ],
      },
      {
        baslik: 'Süreç',
        sirali: [
          'Bulunduğun yurdun yönetimine durumu bildir ve nakil talebini yaz.',
          'Gerekçe belgesini hazırla: yeni okulun kayıt belgesi, staj kabul yazısı ya da benzeri.',
          'Hedef yurtta kontenjan olup olmadığını sor.',
          'Talebin sonuçlanmasını bekle; onay çıkana kadar mevcut yurtla ilişiğini kesme.',
          'Onay çıkınca kayıt ve depozito işlemlerini tamamla.',
        ],
        uyari:
          'Nakil onaylanmadan mevcut yurttan ayrılmak, iki yurtta da yersiz kalmana yol açabiliyor. ' +
          'Sıralamayı bozmadan ilerlemek önemli.',
      },
      {
        baslik: 'Okul değişince barınma hakkı ne oluyor',
        paragraflar: [
          'Nakil ile barınma HAKKI iki ayrı şey. Yurt Hizmetleri Yönetmeliği barınma sürelerini ' +
            'ayrıca düzenliyor (madde 17) ve okul değişikliğinde ikisi farklı işliyor:',
        ],
        liste: [
          'AYNI il veya ilçede üniversite ya da bölüm değiştirmek, yatay veya dikey geçiş yapmak: ' +
            'bir defaya mahsus olmak üzere yeni kurumun normal öğrenim süresi sonuna kadar yurtta ' +
            'barınmaya devam ediliyor (madde 17/2).',
          'FARKLI il veya ilçeye geçmek: yurt hakkı taşınmıyor, yeni yerde yurda yerleşmek için ' +
            'yeniden müracaat ediliyor (madde 17/3). "Nakil" burada bir başvuru anlamına geliyor.',
          'Çift ana dal ya da yan dal yapan öğrenci, o programın öğrenim süresi kadar daha ' +
            'barındırılıyor (madde 17/6) — [çift anadal ve yan dal](/rehber/cift-anadal-ve-yan-dal) ' +
            'düşünüyorsan bu hakkı hesaba kat.',
          'Değişim programıyla yurt dışında geçen süre normal öğrenim süresinden sayılmıyor ' +
            '(madde 17/11); dönüşte öncelikli olarak yurda yerleştiriliyorsun (madde 10/3).',
        ],
        uyari:
          'Kayıt hangi tarihte yapılırsa yapılsın, öğretim yılı sonunda bir yıllık barınma hakkı ' +
          'kullanılmış sayılıyor (madde 17/7). Yani şubatta yerleşmek "yarım yıl" saymıyor.',
      },
      {
        baslik: 'Nakil talebi kaç kez yapılabilir',
        paragraflar: [
          'Yönetmelik nakil işlemlerinin ayrıntısını Bakanlığa bırakıyor (madde 41/1); rakam ' +
            'orada değil, KYGM’nin kendi duyurusunda: bir öğrenci aynı eğitim-öğretim dönemi ' +
            'içinde en fazla iki defa yurt değişikliği talep edebiliyor ve isteğe bağlı nakil ' +
            'talepleri GSBBİZ uygulaması ya da biz.gsb.gov.tr üzerinden açılıyor.',
          'Bir istisna yönetmelikte yazılı: öğrenci değişim programı kapsamında geçici olarak ' +
            'başka bir şehirde okuyacak yurt öğrencileri, gidecekleri şehirdeki yurtlara ÖNCELİKLİ ' +
            'olarak naklediliyor; döndüklerinde de esas şehirlerine yine öncelikli dönüyorlar ' +
            '(madde 41/2).',
        ],
      },
      {
        baslik: 'Staj dönemi',
        paragraflar: [
          'Yaz stajını başka bir şehirde yapacaksan barınma ayrı bir sorun. Bazı dönemlerde yurtlar ' +
            'staj yapan öğrencilere geçici barınma sağlayabiliyor; bu düzenleme yıla ve şehre göre değişiyor. ' +
            'Ayrıntı için [başka şehirde staj yaparken barınma](/rehber/baska-sehirde-staj-barinma) sayfasına bak.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Yurt nakli her zaman kabul edilir mi?',
        cevap:
          'Hayır. Kabul, hedef yurttaki kontenjana ve gerekçenin uygunluğuna bağlı. Talep etmek hak doğurmuyor.',
      },
      {
        soru: 'Aynı şehirde başka yurda geçebilir miyim?',
        cevap:
          'Talep edilebiliyor ama kontenjana bağlı ve öncelik genellikle geçerli bir gerekçesi olanlarda.',
      },
      {
        soru: 'Nakil sırasında depozitom ne oluyor?',
        cevap:
          'Uygulama kuruma göre değişiyor; bazı durumlarda aktarılıyor, bazılarında iade edilip yeniden alınıyor. Yurt yönetiminden yazılı bilgi al.',
      },
    ],
    kaynaklar: [
      {
        etiket: 'Gençlik ve Spor Bakanlığı Yurt Hizmetleri Yönetmeliği',
        adres: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=38510&MevzuatTur=7&MevzuatTertip=5',
        kurum: 'Cumhurbaşkanlığı Mevzuat Bilgi Sistemi',
        tur: 'belge',
        destekledigi:
          'Okul/şehir değişikliğinde barınma süresi (madde 17), nakil işlemlerinin Bakanlıkça ' +
          'belirlendiği ve değişim programı öğrencilerinin öncelikli nakli (madde 41).',
      },
      {
        etiket: 'Gençlik ve Spor Bakanlığı — KYGM yurt sıkça sorulan sorular',
        adres: 'https://kygm.gsb.gov.tr/Sayfalar/2678/3200/sikca-sorulan-sorular-yurt.aspx',
        kurum: 'Gençlik ve Spor Bakanlığı Kredi ve Yurtlar Genel Müdürlüğü',
        tur: 'belge',
        destekledigi:
          'Nakil talebinin nereden açıldığı ve aynı dönemde en fazla iki defa talep edilebildiği.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Başka şehirde staj yaparken barınma',
      yol: '/rehber/baska-sehirde-staj-barinma',
      aciklama: 'Staj dönemi için barınma seçenekleri.',
    },
  }),

  metinRehberi({
    slug: 'yurt-izin-ve-giris-cikis',
    guncelleme: '2026-08-25',
    baslik: 'Yurtta izin ve giriş-çıkış işlemleri',
    ozet: 'Kurallar yurda göre değişiyor ama mantık aynı.',
    konu: 'yurt',
    etiketler: ['yurt izni', 'giriş çıkış', 'devamsızlık', 'kural'],
    aciklama:
      'Yurtta izin nasıl alınır? Giriş-çıkış saatleri, gece izni, uzun süreli izin ve ' +
      'devamsızlığın sonuçları.',
    hizliCevap:
      'Yurtlarda giriş-çıkış kayıt altında tutuluyor ve belirli bir saatten sonra girişler ' +
      'izne bağlı oluyor. Gece dışarıda kalacaksan önceden izin almak, uzun süre ayrı kalacaksan ' +
      '(memlekete gitmek, staj) yönetimi bilgilendirmek gerekiyor. Haber vermeden uzun süre ' +
      'gelmemek, yurt hakkının düşmesine yol açabiliyor.',
    bloklar: [
      {
        baslik: 'Günlük düzen',
        liste: [
          'Giriş-çıkışlar kartla ya da kayıtla yapılıyor.',
          'Belirli bir saatten sonra giriş genellikle izne bağlı.',
          'Gece dışarıda kalmak için önceden izin alınıyor.',
          'Misafir kabulü ayrı kurallara tabi; çoğu yurtta odaya misafir alınmıyor.',
        ],
      },
      {
        baslik: 'Saatler neden her yerde yazmıyor',
        paragraflar: [
          'Giriş-çıkış saatini internette arayınca farklı farklı rakamlar çıkıyor ve hiçbiri ' +
            'kaynak göstermiyor. Sebebi şu: Yurt Hizmetleri Yönetmeliği bir saat YAZMIYOR. ' +
            'Madde 18 tek cümle — "Yurtlara giriş çıkış saatleri ve öğrenci izinleri ile ilgili ' +
            'hususlar Bakanlık tarafından usul ve esaslar ile belirlenir."',
          'Yani saat, yönetmelikle sabitlenmiş bir kural değil; Bakanlığın belirlediği ve ' +
            'değişebilen bir uygulama. Bu sayfada da bu yüzden saat yazmıyoruz — bağlayıcı olan ' +
            'kendi yurdunun kayıt sırasında verdiği yönerge.',
        ],
        uyari:
          'Giriş-çıkış saatlerine uymamak ve izinsiz yurttan ayrılmak, yönetmeliğin disiplin ' +
          'maddelerinde sayılan davranışlar arasında. "Geceyi izinsiz veya mazeretsiz olarak bir ' +
          'gün yurdun dışında geçirmek" de ayrıca yazılı. Yani izin almak bir nezaket değil, ' +
          'kuralın kendisi.',
      },
      {
        baslik: 'Uzun ayrılıkta hakkın ne kadar korunuyor',
        paragraflar: [
          'Burada yönetmelik net bir süre veriyor (madde 19). Hastalık ve diğer sebeplerle geçici ' +
            'olarak ayrılmak isteyen öğrencinin barınma hakkı, ücretini zamanında ödemek ve yurt ' +
            'idaresine bilgi verip durumunu belgelendirmek koşuluyla saklı tutuluyor:',
        ],
        liste: [
          'Hastalıkta: rapor süresince.',
          'Diğer sebeplerde: bir ay süreyle.',
          'Bu sürenin sonunda yurda dönmeyen öğrencinin yurtla ilişiği kesiliyor.',
        ],
        uyari:
          'Üç koşulun üçü birden gerekiyor: ücreti ödemeye devam etmek, idareye bilgi vermek ve ' +
          'durumu belgelendirmek. Yalnızca haber vermek yetmiyor; belge yoksa hak saklı tutulmuyor.',
      },
      {
        baslik: 'Uzun süreli ayrılık',
        paragraflar: [
          'Bayram, ara tatil, staj ya da sağlık nedeniyle uzun süre yurtta olmayacaksan yönetimi ' +
            'bilgilendirmek gerekiyor. Bazı yurtlar belirli bir süreyi aşan bildirimsiz devamsızlıkta ' +
            'yerin boşaltıldığını kabul ediyor.',
        ],
        uyari:
          'Süreler ve kurallar yurttan yurda değişiyor. Kayıt sırasında verilen yönergeyi sakla ve ' +
          'emin olmadığın durumda yönetime yazılı sor.',
      },
      {
        baslik: 'Sık karşılaşılan durumlar',
        tablo: {
          sutunlar: ['Durum', 'Ne yapmalı'],
          satirlar: [
            ['Gece dışarıda kalacağım', 'Önceden gece izni al'],
            ['Bir hafta memlekete gideceğim', 'Yönetimi bilgilendir, izin formu doldur'],
            ['Stajım başka şehirde', 'Nakil ya da geçici izin için yönetime başvur'],
            ['Hastalandım, hastanedeyim', 'Raporu yönetime ulaştır'],
            ['Kartımı kaybettim', 'Aynı gün yönetime bildir'],
          ],
        },
      },
    ],
    sss: [
      {
        soru: 'Yurda geç kalırsam ne olur?',
        cevap:
          'Kurallar yurda göre değişiyor; genellikle geç giriş kayda geçiyor ve tekrarı disiplin işlemine yol açabiliyor. Önceden izin almak sorunu ortadan kaldırıyor.',
      },
      {
        soru: 'Hafta sonu eve gitmek için izin gerekiyor mu?',
        cevap:
          'Çoğu yurtta çıkış serbest ama gece dönmeyeceksen izin gerekiyor. Kendi yurdunun yönergesine bakmak gerekiyor.',
      },
      {
        soru: 'Uzun süre gelmezsem yerim kalır mı?',
        cevap:
          'Bildirimsiz uzun devamsızlıkta yer boşaltılabiliyor. Ayrılacağın süreyi önceden bildirmek gerekiyor.',
      },
    ],
    kaynaklar: [
      {
        etiket: 'Gençlik ve Spor Bakanlığı Yurt Hizmetleri Yönetmeliği',
        adres: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=38510&MevzuatTur=7&MevzuatTertip=5',
        kurum: 'Cumhurbaşkanlığı Mevzuat Bilgi Sistemi',
        tur: 'belge',
        destekledigi:
          'Giriş-çıkış saatleri ve izinlerin yönetmelikle değil Bakanlık usul ve esaslarıyla ' +
          'belirlendiği (madde 18); geçici ayrılmada barınma hakkının hastalıkta rapor süresince, ' +
          'diğer sebeplerde bir ay saklı tutulduğu (madde 19); giriş-çıkışa uymamanın disiplin ' +
          'maddelerinde sayıldığı.',
      },
      {
        etiket: 'Gençlik ve Spor Bakanlığı — KYGM',
        adres: 'https://kygm.gsb.gov.tr',
        kurum: 'Gençlik ve Spor Bakanlığı Kredi ve Yurtlar Genel Müdürlüğü',
        tur: 'kurum',
        destekledigi: 'Yurtların güncel uygulama duyuruları.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Yurttan kayıt silme',
      yol: '/rehber/yurttan-kayit-silme',
      aciklama: 'Ayrılman gerekiyorsa doğru sıra.',
    },
  }),

  metinRehberi({
    slug: 'yurttan-kayit-silme',
    guncelleme: '2026-08-25',
    baslik: 'Yurttan kayıt silme ve depozito iadesi',
    ozet: 'Sıra önemli: önce dilekçe, sonra teslim, sonra iade.',
    konu: 'yurt',
    etiketler: ['kayıt silme', 'depozito', 'iade', 'ilişik kesme'],
    aciklama:
      'Yurttan kayıt nasıl silinir? Dilekçe, oda teslimi, ilişik kesme ve depozito iadesi süreci.',
    hizliCevap:
      'Yurttan ayrılmak için önce yazılı talep (dilekçe) veriliyor, sonra oda ve demirbaş teslimi ' +
      'yapılıyor, ilişik kesme belgesi alınıyor ve depozito bu belgeye göre iade ediliyor. ' +
      'Sırayı atlamak — örneğin odayı boşaltıp dilekçe vermemek — iadeyi geciktiriyor ya da ' +
      'engelleyebiliyor.',
    bloklar: [
      {
        baslik: 'Doğru sıra',
        sirali: [
          'Yönetime yazılı ayrılma talebi ver ve bir kopyasını sakla.',
          'Ayrılma tarihini netleştir; o tarihe kadar olan ücret hesabını sor.',
          'Odayı ve demirbaşları teslim et; eksik ya da hasar varsa yazılı tutanağa geçir.',
          'İlişik kesme belgesini al.',
          'Depozito iadesi için gereken banka bilgisini ver ve süreci takip et.',
        ],
        uyari:
          'Odayı boşaltmadan ve ilişik kesmeden ayrılmak, ücret tahakkukunun devam etmesine yol açabiliyor. ' +
          'Belgeyi almadan yurttan ayrılma.',
      },
      {
        baslik: 'Ayrılmadan önce: belki silmen gerekmiyor',
        paragraflar: [
          'Yurttan bir süreliğine uzak kalacaksan kaydı silmek tek yol değil. Yurt Hizmetleri ' +
            'Yönetmeliği geçici ayrılmayı ayrı düzenliyor (madde 19): ücretini zamanında ödemek ve ' +
            'yurt idaresine bilgi verip durumunu belgelendirmek koşuluyla barınma hakkı, hastalık ' +
            'durumunda rapor süresince, diğer sebeplerde ise bir ay süreyle saklı tutuluyor.',
          'Bu sürenin sonunda yurda dönmeyen öğrencinin yurtla ilişiği kesiliyor. Yani "bir ay ' +
            'gitmem gerekiyor" ile "artık kalmayacağım" iki farklı işlem — ilkinde kayıt silmek ' +
            'hakkı gereksiz yere bitiriyor.',
        ],
      },
      {
        baslik: 'Güvence bedeli (depozito) mevzuatta ne diyor',
        paragraflar: [
          'Yönetmelik depozitoyu "güvence bedeli" diye adlandırıyor ve iki şeyin karşılığı olduğunu ' +
            'söylüyor: zamanında yatırılmayan yurt ücreti ve yurda verilebilecek zarar (madde 13/1).',
        ],
        liste: [
          'Kayıt silinince ya da yurttan ayrılınca kalan güvence bedeli öğrencinin BANKA HESABINA ' +
            'iade ediliyor (madde 13/5) — elden ödeme diye bir usul yok, o yüzden IBAN bilgisini doğru vermek gerekiyor.',
          'Yurt malzemesine zarar verilmişse önce öğrenciye tebliğ ediliyor ve ödemesi için otuz gün ' +
            'süre veriliyor. Bu sürede ödenmezse tutar güvence bedelinden tahsil ediliyor ve ' +
            'öğrencinin yurtla ilişiği kesiliyor (madde 13/4).',
          'Zarar güvence bedelini aşarsa kalan kısım genel hükümlere göre tahsil ediliyor; yani ' +
            'depozito tavan değil.',
        ],
        uyari:
          'Kayıt silme talebi yurt müdürlüğüne dilekçeyle ya da GSBBİZ uygulaması üzerinden ' +
          'yapılıyor. Kaydı silinen öğrencilere iade edilecek tutar il müdürlüklerine gönderilip ' +
          'IBAN numaralı hesaba yatırılıyor — işlem anında değil, takip etmek gerekiyor.',
      },
      {
        baslik: 'Depozito',
        paragraflar: [
          'Depozito, hasar ve eksik demirbaş için tutulan güvence. Teslim sırasında oda durumunun ' +
            'tutanağa geçirilmesi, sonradan çıkacak itirazın önüne geçiyor. Odaya girerken var olan ' +
            'hasarları da baştan tutanağa yazdırmak en iyi koruma.',
        ],
        kontrol: {
          baslik: 'Teslimde',
          maddeler: [
            'Odanın fotoğraflarını çek (giriş ve çıkışta)',
            'Demirbaş listesini birlikte kontrol edin',
            'Hasar varsa tutanağa yazdır',
            'İlişik kesme belgesinin bir kopyasını al',
            'İade için IBAN bilgisini yazılı ver',
          ],
        },
      },
      {
        baslik: 'İade gecikirse',
        liste: [
          'İlişik kesme belgesi ve dilekçe kopyanla yönetime başvur.',
          'Yazılı başvuru yap; sözlü takip iz bırakmıyor.',
          'Sonuç alamazsan kurumun üst birimine ya da resmî başvuru kanalına yaz.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Depozito ne zaman iade edilir?',
        cevap:
          'İlişik kesme tamamlandıktan sonra kurumun belirlediği süre içinde iade ediliyor. Süre kuruma göre değişiyor; kayıt sırasında verilen yönergede yazıyor.',
      },
      {
        soru: 'Dönem ortasında ayrılırsam ödediğim ücret iade edilir mi?',
        cevap:
          'Uygulama kuruma göre değişiyor. Ayrılma tarihine kadar olan kısmın tahakkuk etmesi ve kalanın iadesi yaygın; kesin cevabı yönetimden yazılı al.',
      },
      {
        soru: 'Odada hasar varsa ne olur?',
        cevap:
          'Hasar bedeli depozitodan düşülebiliyor. Girişte var olan hasarları tutanağa yazdırmak, sana ait olmayan hasarın üstüne kalmasını önlüyor.',
      },
    ],
    kaynaklar: [
      {
        etiket: 'Gençlik ve Spor Bakanlığı Yurt Hizmetleri Yönetmeliği',
        adres: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=38510&MevzuatTur=7&MevzuatTertip=5',
        kurum: 'Cumhurbaşkanlığı Mevzuat Bilgi Sistemi',
        tur: 'belge',
        destekledigi:
          'Güvence bedelinin neyin karşılığı olduğu, zarar hâlinde otuz günlük süre ve iade ' +
          '(madde 13); hastalık ve diğer sebeplerle geçici ayrılmada barınma hakkının saklı ' +
          'tutulduğu süreler (madde 19).',
      },
      {
        etiket: 'Gençlik ve Spor Bakanlığı — KYGM',
        adres: 'https://kygm.gsb.gov.tr',
        kurum: 'Gençlik ve Spor Bakanlığı Kredi ve Yurtlar Genel Müdürlüğü',
        tur: 'kurum',
        destekledigi: 'Kayıt silme talebinin nasıl açıldığı ve iadenin nasıl yapıldığı.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Öğrenci evi kiralarken dikkat edilecekler',
      yol: '/rehber/ogrenci-evi-kiralarken',
      aciklama: 'Yurttan çıkıyorsan sıradaki adım.',
    },
  }),

  metinRehberi({
    slug: 'ozel-yurt-secerken',
    guncelleme: '2026-08-25',
    baslik: 'Özel yurt seçerken dikkat edilecekler',
    ozet: 'Ruhsat, sözleşme ve toplam maliyet — üçünü de sor.',
    konu: 'yurt',
    etiketler: ['özel yurt', 'apart', 'sözleşme', 'ruhsat'],
    aciklama:
      'Özel yurt seçerken nelere dikkat edilmeli? Ruhsat, sözleşme maddeleri, ' +
      'gizli masraflar ve görmeden kayıt riski.',
    hizliCevap:
      'Özel yurt seçerken üç şeyi sor: kurumun izin/ruhsat durumu, sözleşmenin cayma ve iade maddeleri, ' +
      've aylık toplam maliyet (yemek, elektrik, temizlik dahil mi). Görmeden ve sözleşmeyi okumadan ' +
      'kapora ödeme; ödediysen makbuz al. Fotoğraflarla gerçek arasındaki fark, en sık yaşanan hayal kırıklığı.',
    bloklar: [
      {
        baslik: 'Ziyaret ederken',
        kontrol: {
          baslik: 'Yerinde gör',
          maddeler: [
            'Odayı ve banyoyu kendi gözünle gör (fotoğrafla yetinme)',
            'Ortak alanlar: çalışma salonu, mutfak, çamaşırhane',
            'Isınma ve sıcak su düzeni',
            'İnternet hızı — telefonla dene',
            'Kampüse ulaşım süresi ve son otobüs saati',
            'Güvenlik: giriş kontrolü, kamera, gece görevlisi',
            'Gürültü: caddeye mi bakıyor, üst katta ne var',
          ],
        },
      },
      {
        baslik: 'Sözleşmede bakılacak maddeler',
        liste: [
          'Süre: dokuz ay mı, on iki ay mı; yaz dönemi dahil mi.',
          'Cayma: erken çıkarsan ne oluyor, kalan aylar isteniyor mu.',
          'İade: depozito hangi koşullarda iade ediliyor.',
          'Ücrete dahil olanlar: yemek kaç öğün, elektrik-su-internet dahil mi.',
          'Zam: dönem ortasında ücret artışı yapılabiliyor mu.',
          'Kurallar: giriş-çıkış saati, misafir, ceza maddeleri.',
        ],
        uyari:
          'Sözleşmeyi imzalamadan önce tamamını oku ve bir kopyasını al. İmzalanmış ama sende kopyası ' +
          'olmayan sözleşme, itiraz durumunda işine yaramıyor.',
      },
      {
        baslik: 'Toplam maliyeti hesapla',
        paragraflar: [
          'Aylık ücret tek başına karşılaştırma yapmaya yetmiyor. Aynı ücretteki iki yurt, ' +
            'ek masraflarla belirgin biçimde ayrışabiliyor.',
        ],
        liste: [
          'Yemek: kaç öğün dahil, kalanı ne tutuyor.',
          'Ulaşım: günlük gidiş-dönüş, aylık kart.',
          'Çamaşır ve temizlik ücretleri.',
          'Depozito ve kayıt ücreti (bir defalık).',
          'Yaz dönemi ücreti.',
        ],
      },
      {
        baslik: 'Uyarı işaretleri',
        liste: [
          'Görmeden kapora isteniyor.',
          'Sözleşme gösterilmiyor ya da "sonra imzalarız" deniyor.',
          'Makbuzsuz nakit ödeme isteniyor.',
          'Ruhsat/izin sorulduğunda konu değiştiriliyor.',
          'İlan fotoğrafları başka bir binaya ait.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Özel yurt ile apart arasındaki fark ne?',
        cevap:
          'Apartlar genellikle daireler hâlinde ve daha az ortak hizmet sunuyor; yurtlarda yemek, etüt ve görevli düzeni daha yaygın. Hangisinin uygun olduğu çalışma ve yaşam düzenine bağlı.',
      },
      {
        soru: 'Kapora ödedim, vazgeçtim. Geri alabilir miyim?',
        cevap:
          'Sözleşmedeki cayma maddesine bağlı. Yazılı bir belge ve makbuz yoksa talebini kanıtlamak zorlaşıyor.',
      },
      {
        soru: 'Yurdun ruhsatını nasıl kontrol ederim?',
        cevap:
          'Kurumdan belge isteyebilir, ayrıca il millî eğitim ya da ilgili il müdürlüğüne sorabilirsin. Belge göstermekten kaçınan kurumdan uzak dur.',
      },
    ],
    kaynaklar: [
      { etiket: 'Millî Eğitim Bakanlığı', adres: 'https://www.meb.gov.tr', kurum: 'Millî Eğitim Bakanlığı', tur: 'kurum' },
    ],
    sonrakiAdim: {
      etiket: 'Depozito ve kira sözleşmesi',
      yol: '/rehber/depozito-ve-kira-sozlesmesi',
      aciklama: 'Sözleşmede nelere bakacağını oku.',
    },
  }),

  metinRehberi({
    slug: 'ogrenci-evi-kiralarken',
    guncelleme: '2026-08-25',
    baslik: 'Öğrenci evi kiralarken dikkat edilecekler',
    ozet: 'Ev arkadaşı, konum ve sözleşme — sırayla.',
    konu: 'yurt',
    etiketler: ['ev kiralama', 'ev arkadaşı', 'kira', 'öğrenci evi'],
    aciklama:
      'Öğrenci evi kiralarken nelere dikkat edilmeli? Ev arkadaşı seçimi, konum, ' +
      'faturalar ve sözleşme.',
    hizliCevap:
      'Ev tutmadan önce üç şeyi netleştir: kiminle oturacağın, aylık toplam maliyet (kira + aidat + ' +
      'faturalar) ve sözleşmenin kimin adına olacağı. Sözleşmeyi tek kişi imzalarsa sorumluluk da ' +
      'tek kişide kalıyor. Evi görmeden ve sözleşmeyi okumadan kapora ödeme.',
    bloklar: [
      {
        baslik: 'Ev arkadaşı',
        paragraflar: [
          'Öğrenci evlerinde en sık çıkan sorun ev değil ev arkadaşlığı. Taşınmadan önce üç konuda ' +
            'konuşmak, dönem ortasındaki tartışmaların çoğunu önlüyor.',
        ],
        liste: [
          'Para: kira ve faturalar nasıl bölünecek, kim ne zaman ödeyecek.',
          'Düzen: sessizlik saati, misafir, temizlik sırası.',
          'Süre: kim ne kadar kalmayı planlıyor; biri çıkarsa ne olacak.',
        ],
      },
      {
        baslik: 'Evi görürken',
        kontrol: {
          baslik: 'Kontrol listesi',
          maddeler: [
            'Isıtma türü ve kışın gerçek maliyeti (önceki kiracıya sor)',
            'Su basıncı ve sıcak su',
            'Rutubet ve küf izi',
            'Pencere yalıtımı',
            'İnternet altyapısı',
            'Kampüse ulaşım süresi ve son otobüs saati',
            'Çevre: market, eczane, gece güvenliği',
            'Aidat ne kadar, neleri kapsıyor',
          ],
        },
      },
      {
        baslik: 'Sözleşme kimin adına',
        paragraflar: [
          'Üç kişi oturacaksa sözleşmenin üç kişi adına olması en güvenlisi; tek kişi imzalarsa ' +
            'kiranın tamamından ve hasardan o kişi sorumlu oluyor. Ayrıca kimin adına ne kadar ' +
            'depozito verildiği yazılı olmalı.',
        ],
        uyari:
          'Kira sözleşmesi ciddi bir hukuki belge. Ayrıntısı [depozito ve kira sözleşmesi](/rehber/depozito-ve-kira-sozlesmesi) ' +
          'sayfasında; imzalamadan önce oku.',
      },
      {
        baslik: 'Taşınırken',
        sirali: [
          'Devir teslimde evin fotoğraflarını çek — çıkarken işine yarıyor.',
          'Sayaç değerlerini (elektrik, su, doğalgaz) not al ve yazılı teyit et.',
          'Abonelikleri kendi adına al; önceki kiracının borcu üstüne kalmasın.',
          'Depozito makbuzunu sakla.',
          'Ev sahibiyle iletişim için yazılı kanal kur (mesaj, e-posta).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Öğrenci evinde kaç kişi kalmalı?',
        cevap:
          'Maliyet açısından kişi başına düşen tutar azalıyor ama ortak yaşam zorlaşıyor. İki-üç kişi çoğu öğrenci için dengeli bir sayı.',
      },
      {
        soru: 'Ev arkadaşım çıkarsa kira ne olur?',
        cevap:
          'Sözleşme kimin adınaysa sorumluluk ondadır. Bu yüzden çıkma durumunun sözleşmede ya da aranızdaki yazılı anlaşmada konuşulması gerekiyor.',
      },
      {
        soru: 'Emlakçı komisyonu ödemek zorunda mıyım?',
        cevap:
          'Emlakçı aracılığıyla tutulan evlerde komisyon yaygın. Tutarı ve neyi kapsadığını baştan yazılı olarak netleştir.',
      },
    ],
    kaynaklar: [
      { etiket: 'Tüketicinin Korunması Genel Müdürlüğü', adres: 'https://tuketici.ticaret.gov.tr', kurum: 'Ticaret Bakanlığı — Tüketicinin Korunması ve Piyasa Gözetimi Genel Müdürlüğü', tur: 'belge', destekledigi: 'Kiracı olarak tüketici haklarının başvuru kanalı.' },
    ],
    sonrakiAdim: {
      etiket: 'Depozito ve kira sözleşmesi',
      yol: '/rehber/depozito-ve-kira-sozlesmesi',
      aciklama: 'Sözleşmede hangi maddelere bakacağını oku.',
    },
  }),

  metinRehberi({
    slug: 'depozito-ve-kira-sozlesmesi',
    guncelleme: '2026-08-25',
    baslik: 'Depozito ve kira sözleşmesinde nelere dikkat edilir?',
    ozet: 'İmzalamadan önce okunacak beş madde.',
    konu: 'yurt',
    etiketler: ['kira sözleşmesi', 'depozito', 'tahliye', 'zam'],
    aciklama:
      'Kira sözleşmesinde hangi maddelere dikkat edilmeli? Depozito, süre, zam, ' +
      'tahliye ve fatura sorumluluğu.',
    hizliCevap:
      'Sözleşmede beş şeye bak: süre ve yenileme, kira artışının nasıl yapılacağı, depozitonun ' +
      'tutarı ve iade koşulu, faturaların kime ait olduğu ve erken çıkma durumunda ne olacağı. ' +
      'Sözleşmenin imzalı bir kopyasını mutlaka al; depozitoyu banka üzerinden öde ki kaydı kalsın.',
    bloklar: [
      {
        baslik: 'Beş madde',
        tablo: {
          sutunlar: ['Madde', 'Neye bakmalı'],
          satirlar: [
            ['Süre', 'Kaç aylık, bitince kendiliğinden uzuyor mu'],
            ['Kira artışı', 'Ne zaman ve nasıl belirleniyor'],
            ['Depozito', 'Tutar, kime verildi, hangi koşulda iade ediliyor'],
            ['Faturalar', 'Elektrik, su, doğalgaz, aidat kimin üstünde'],
            ['Erken çıkış', 'Cayma bedeli var mı, ihbar süresi ne kadar'],
          ],
        },
      },
      {
        baslik: 'Depozito',
        paragraflar: [
          'Depozito, evde oluşabilecek hasar ve ödenmemiş faturalar için tutulan güvence. ' +
            'Kira değildir — "son ayın kirasına sayılsın" ancak ev sahibiyle yazılı anlaşırsanız olur.',
        ],
        liste: [
          'Elden nakit yerine banka havalesiyle öde; açıklamaya "depozito" yaz.',
          'Tutarı sözleşmede yazılı olsun.',
          'Girişte evin durumunu fotoğrafla ve mümkünse tutanak yap.',
          'Çıkışta faturaların ödendiğini gösteren belgeleri hazır et.',
        ],
        uyari:
          'Makbuzsuz nakit ödeme, iade talebini kanıtlamayı çok zorlaştırıyor. Ödemeyi banka üzerinden ' +
          'yapmak en basit korunma yolu.',
      },
      {
        baslik: 'İmzalamadan önce',
        kontrol: {
          baslik: 'Son kontrol',
          maddeler: [
            'Sözleşmenin tamamını okudum',
            'Boş bırakılmış satır yok',
            'Ev sahibinin kimlik ve iletişim bilgisi yazılı',
            'Taşınmazın adresi doğru yazılmış',
            'İmzalı bir kopyası bende',
            'Depozito tutarı ve ödeme biçimi yazılı',
          ],
        },
      },
      {
        baslik: 'Sorun çıkarsa',
        paragraflar: [
          'Anlaşmazlıkta ilk adım yazılı iletişim: talebini mesaj ya da e-postayla ilet ki kayıt kalsın. ' +
            'Çözülmezse kiracı hakları konusunda tüketici ve hukuk danışma kanallarına başvurulabiliyor. ' +
            'Sözleşme, dekontlar ve fotoğraflar bu aşamada tek dayanağın.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Depozito kaç kira olur?',
        cevap:
          'Uygulamada genellikle bir ya da iki kira tutarında oluyor; tutar sözleşmede yazılı olmalı.',
      },
      {
        soru: 'Depozitoyu son ayın kirası olarak kullanabilir miyim?',
        cevap:
          'Ancak ev sahibiyle yazılı olarak anlaşırsan. Tek taraflı olarak böyle kullanmak anlaşmazlık doğuruyor.',
      },
      {
        soru: 'Sözleşme bitmeden çıkmam gerekirse ne olur?',
        cevap:
          'Sözleşmedeki erken çıkış ve ihbar maddesine bağlı. Bu madde yoksa durumu ev sahibiyle yazılı olarak anlaşarak çözmek gerekiyor.',
      },
      {
        soru: 'Sözleşmeyi kim imzalamalı?',
        cevap:
          'Evde oturacak kişilerin hepsinin imzalaması, sorumluluğun tek kişide kalmasını önlüyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Tüketicinin Korunması Genel Müdürlüğü', adres: 'https://tuketici.ticaret.gov.tr', kurum: 'Ticaret Bakanlığı — Tüketicinin Korunması ve Piyasa Gözetimi Genel Müdürlüğü', tur: 'belge', destekledigi: 'Sözleşme ve depozito anlaşmazlığında başvurulacak resmî kanal.' },
    ],
    sonrakiAdim: {
      etiket: 'Öğrenci evi kiralarken dikkat edilecekler',
      yol: '/rehber/ogrenci-evi-kiralarken',
      aciklama: 'Evi seçerken bakılacaklar.',
    },
  }),

  metinRehberi({
    slug: 'baska-sehirde-staj-barinma',
    guncelleme: '2026-08-25',
    baslik: 'Başka şehirde staj yaparken barınma',
    ozet: 'Kısa süreli kalmak, uzun süreli kiralamadan farklı işliyor.',
    konu: 'yurt',
    etiketler: ['staj', 'barınma', 'kısa süreli', 'yurt', 'kiralık oda'],
    aciklama:
      'Yaz stajında başka şehirde nasıl kalınır? Yurt, kısa süreli kiralama, ' +
      'ev arkadaşlığı ve maliyet hesabı.',
    hizliCevap:
      'İki ay için ev tutmak çoğu zaman en pahalı seçenek. Sırayla şunlara bak: staj yapılan şehirdeki ' +
      'yurtların yaz dönemi konaklaması, üniversite yurtları, kısa süreli kiralık oda ve tanıdık ağı. ' +
      'Konaklama maliyetini [staj ücretiyle](/rehber/staj-ucreti-nasil-hesaplanir) karşılaştırmadan kabul verme — bazı stajlarda ' +
      'barınma gideri ücretin tamamını yiyor.',
    bloklar: [
      {
        paragraflar: [
          'Yaz stajının en çok gözden kaçan tarafı barınma. İş bulundu, tarih ayarlandı ve ' +
            'iki hafta kala "nerede kalacağım" sorusu çıkıyor. Bu soruyu kabul vermeden önce sormak gerekiyor.',
        ],
      },
      {
        baslik: 'Seçenekler',
        tablo: {
          sutunlar: ['Seçenek', 'Artısı', 'Eksisi'],
          satirlar: [
            ['Yurtların yaz konaklaması', 'Uygun fiyat, hazır düzen', 'Kontenjan sınırlı, erken başvuru gerekiyor'],
            ['Üniversite yurdu (staj yapılan şehirde)', 'Kampüs imkânları', 'Her üniversite dışarıdan öğrenci kabul etmiyor'],
            ['Kısa süreli kiralık oda', 'Esnek', 'Fiyat yüksek, dolandırıcılık riski'],
            ['Ev arkadaşlığı (devren)', 'Ucuz', 'Sözleşme ve depozito karmaşası'],
            ['Tanıdık yanı', 'En ucuz', 'Her zaman mümkün değil'],
          ],
        },
      },
      {
        baslik: 'Maliyet hesabı',
        paragraflar: [
          'Kabul vermeden önce şu dört kalemi topla ve staj ücretiyle karşılaştır: konaklama, ' +
            'ulaşım, yemek ve bir defalık masraflar (depozito, yol). Sonuç eksiye düşüyorsa, ' +
            'stajı kendi şehrinde aramak ya da işverenden destek istemek makul bir tercih.',
        ],
        liste: [
          'Aylık konaklama × staj ayı.',
          'Günlük ulaşım × iş günü sayısı ([staj günü hesaplama](/araclar/staj-gunu-hesaplama)).',
          'Günlük yemek gideri (işyeri yemek veriyor mu, sor).',
          'Depozito ve yol: bir defalık ama peşin.',
        ],
      },
      {
        baslik: 'İşverene sorulacaklar',
        kontrol: {
          baslik: 'Kabul vermeden sor',
          maddeler: [
            'Yemek desteği var mı?',
            'Yol desteği ya da servis var mı?',
            'Konaklama konusunda anlaşmalı bir yer var mı?',
            'Staj ücreti ne zaman ödeniyor (ilk ödeme ay sonunda mı)?',
            'Çalışma saatleri ulaşımla uyumlu mu?',
          ],
        },
        uyari:
          'Bu soruları sormak başvuruyu riske atmıyor; aksine planlı görünüyorsun. Sormadan kabul verip ' +
          'sonra vazgeçmek, hem seni hem işvereni zor durumda bırakıyor.',
      },
      {
        baslik: 'Güvenlik',
        paragraflar: [
          'Kısa süreli konaklamada dolandırıcılık riski yüksek: görmeden kapora isteyen ilanlar yaygın. ' +
            'Görmeden ödeme yapma, ödeme yaptıysan banka üzerinden yap ve yazışmaları sakla.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Yaz stajı için KYK yurdunda kalabilir miyim?',
        cevap:
          'Bazı dönemlerde yaz konaklaması açılıyor ve staj yapan öğrenciler için düzenleme olabiliyor. Uygulama yıla ve şehre göre değiştiği için resmî duyuruya bakmak gerekiyor.',
      },
      {
        soru: 'İşveren konaklama sağlamak zorunda mı?',
        cevap:
          'Zorunlu değil. Bazı büyük şirketler staj programlarında konaklama ya da destek sunuyor; ilan metninde ya da görüşmede sorulabilir.',
      },
      {
        soru: 'İki ay için kira sözleşmesi yapılır mı?',
        cevap:
          'Yapılabiliyor ama kısa süreli sözleşmelerde fiyat yükseliyor. Sözleşmeyi yine yazılı yapmak ve depozitoyu banka üzerinden ödemek gerekiyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr', kurum: 'Gençlik ve Spor Bakanlığı Kredi ve Yurtlar Genel Müdürlüğü', tur: 'kurum' },
    ],
    sonrakiAdim: {
      etiket: 'Staj gününü hesapla',
      yol: '/araclar/staj-gunu-hesaplama',
      aciklama: 'Kaç gün kalacağını bilmeden maliyet çıkmıyor.',
    },
  }),
];
