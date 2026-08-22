/**
 * Bölüme göre staj rehberi.
 *
 * NEDEN VERİ, JSX DEĞİL
 * ---------------------
 * Rehberler (`rehberler.tsx`) serbest metin: her biri farklı bir konuyu farklı
 * bir kurguyla anlatıyor. Bölümler öyle değil — hepsi aynı altı soruyu
 * cevaplıyor: nerede staj yapılır, stajyer ne iş yapar, önceden ne öğrenilmeli,
 * ne aranıyor, hangi belge, ne aranmalı. Aynı iskelet tekrar ettiği için içerik
 * düz veri; sayfayı tek bir bileşen çiziyor.
 *
 * Sonuç: yeni bölüm eklemek = buraya bir nesne yazmak. Otuz bölümde de otuz
 * ayrı dosya olmuyor.
 *
 * SAYFANIN İŞİ SADECE ANLATMAK DEĞİL
 * ----------------------------------
 * Her bölümün `aramaKelimeleri` alanı var. Sayfanın altındaki düğme kişiyi
 * ilan listesine o kelimeler yazılmış hâlde götürüyor. Yoksa okuyan kişi
 * metni bitirip siteden çıkıyor.
 *
 * İÇERİK KURALI
 * -------------
 * `rehberler.tsx` ile aynı: yıldan yıla değişen oran ve tutar yazılmıyor.
 * Burada zaten para geçmiyor; geçmesi gerekirse hesaplama araçlarına
 * yönlendiriliyor.
 */

export type BolumGrubu =
  | 'muhendislik'
  | 'myo'
  | 'sosyal'
  | 'tasarim'
  | 'saglik'
  | 'hizmet';

export interface BolumSoruCevap {
  soru: string;
  cevap: string;
}

export interface Bolum {
  slug: string;
  ad: string;
  grup: BolumGrubu;
  /** Liste satırında görünen tek cümle. */
  ozet: string;
  /**
   * Açılış paragrafı (80–120 kelime).
   *
   * NEDEN EKLENDİ
   * -------------
   * Sayfalar madde listelerinden ibaretti. Liste bilgi veriyor ama sayfanın
   * neyi vaat ettiğini söylemiyor; arama sonucundan gelen kişi ilk üç saniyede
   * "burası benim sorunumu biliyor mu" diye bakıyor. Bir de ölçülebilir tarafı
   * var: yalnız listeden oluşan sayfa Google için ince içerik.
   *
   * Bu alanı olmayan bölümlerde sayfa eskisi gibi çiziliyor — eksik içerik
   * uydurmaktansa kısa kalması iyi.
   */
  giris?: string;
  /** Bu bölümde stajyerin karşısına çıkan pozisyon/alan adları. */
  pozisyonlar?: string[];
  /** Bu bölüme özgü, staj ararken atlanan şeyler. */
  dikkat?: string[];
  /** CV ve başvuru tarafında bu bölüme özgü 2–3 cümle. */
  cvIpucu?: string;
  /** Sık sorulanlar; ön render'da FAQPage yapısal verisine de çevriliyor. */
  sss?: BolumSoruCevap[];
  /** Son gözden geçirme (YYYY-AA-GG). Elle güncelleniyor. */
  guncelleme?: string;
  /** Arama motorunun göreceği açıklama. */
  aciklama: string;
  /** Bu bölümün stajı hangi tür yerlerde yapılır. */
  nerede: string[];
  /** Stajyer gerçekte ne yapıyor — hayal değil, sahadaki iş. */
  isler: string[];
  /** Başvurmadan önce öğrenilmesi işe yarayan şeyler. */
  hazirlik: string[];
  /** İlanlarda ve mülakatta aranan somut şeyler. */
  aranan: string[];
  /** Tek cümlelik püf nokta. */
  ipucu: string;
  /** İlan aramasına yazılacak kelimeler. */
  aramaKelimeleri: string[];
}

export const BOLUM_GRUPLARI: Record<BolumGrubu, string> = {
  muhendislik: 'Mühendislik ve mimarlık',
  myo: 'Meslek yüksekokulu',
  sosyal: 'İktisadi, idari ve sosyal',
  tasarim: 'Tasarım ve iletişim',
  saglik: 'Sağlık',
  hizmet: 'Turizm ve hizmet',
};

/**
 * Sağlık bölümlerinde staj başka türlü işliyor.
 *
 * Hemşirelik, fizyoterapi, acil yardım gibi bölümlerde staj "klinik uygulama"
 * adıyla okulun anlaşmalı olduğu hastanede yapılıyor; öğrenci ilan aramıyor,
 * okul yerleştiriyor. Bunu söylemeyip diğer bölümler gibi "ilanlara bak"
 * demek, o öğrenciyi olmayan bir kapıya yollamak olurdu.
 */
export const OKUL_YERLESTIRIR: BolumGrubu[] = ['saglik'];

export const BOLUMLER: Bolum[] = [
  /* ------------------------------------------------------------ mühendislik */
  {
    slug: 'bilgisayar-muhendisligi',
    ad: 'Bilgisayar Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Staj ilanlarının yoğunlaştığı bölümlerden; bir ilana gelen başvuru sayısı da yüksek.',
    aciklama:
      'Bilgisayar mühendisliği stajı nerede yapılır, stajyer ne iş yapar, ' +
      'başvurmadan önce ne öğrenilmeli ve ilanlarda ne aranıyor.',
    nerede: [
      'Yazılım şirketleri ve teknoloji girişimleri',
      'Bankaların ve sigorta şirketlerinin bilgi teknolojileri birimleri',
      'Büyük sanayi şirketlerinin kendi yazılım ekipleri',
      'Teknoparklardaki Ar-Ge merkezleri',
    ],
    isler: [
      'Var olan bir projede küçük hata düzeltmeleri',
      'Test yazmak — çoğu stajyerin ilk gerçek görevi budur',
      'İç kullanıma yönelik küçük bir araç veya ekran geliştirmek',
      'Veri tabanı sorguları ve rapor çıkarma',
    ],
    hazirlik: [
      'Bir dili yüzeysel değil doğru düzgün bilmek: Python, Java, C# veya JavaScript',
      'Git — neredeyse her ilan istiyor, okulda çoğu zaman öğretilmiyor',
      'SQL: temel sorgular, JOIN mantığı',
      'GitHub\'da gösterilebilir bir proje. Bitmemiş olması sorun değil, olmaması sorun.',
    ],
    aranan: [
      'GitHub bağlantısı olan bir CV',
      'Kendi yazdığın kodu anlatabilmek',
      'İngilizce teknik doküman okuyabilmek',
    ],
    ipucu:
      'Ödev projelerini "okul ödevi" diye küçültme. Ne yaptığını ve neden öyle yaptığını ' +
      'anlatabildiğin her proje, anlatamadığın on projeden değerli.',
    aramaKelimeleri: ['yazılım', 'developer', 'bilgisayar'],
    giris:
      'Bilgisayar mühendisliği, staj ilanlarının yoğunlaştığı bölümlerden — ve başvuru sayısı da ' +
      'aynı ölçüde yüksek. Tek bir yazılım stajı ilanına yüzlerce başvuru gelebiliyor ve ' +
      'başvuranların çoğu birbirinin aynısı bir CV gönderiyor: aynı dersler, aynı notlar, ' +
      'gösterilebilir tek bir çalışma yok. Ayrıştıran şey ortalama değil, çalıştırıp ' +
      'gösterebildiğin bir şey oluyor. Bu sayfada bu bölümün stajının gerçekte nerede ' +
      'yapıldığını, stajyerin ilk hafta hangi işleri aldığını, başvurmadan önce hangi araçları ' +
      'öğrenmenin işe yaradığını ve ilanlarda somut olarak neye bakıldığını bulacaksın.',
    pozisyonlar: [
      'Yazılım geliştirme stajı (backend, frontend ya da mobil)',
      'Test ve kalite güvence stajı — stajyer alımı en çok buradan oluyor',
      'Veri ve raporlama stajı: SQL, panolar, veri temizliği',
      'Bilgi teknolojileri destek ve sistem stajı',
      'Siber güvenlik stajı — kontenjan az, çoğunlukla büyük kurumlarda',
    ],
    dikkat: [
      'Yaz stajı kontenjanları erken doluyor. Büyük şirketlerin programları genellikle ' +
        'şubat-nisan arasında başvuru alıyor; mayısta aramaya başlamak çoğu kapıyı kapatıyor.',
      'İlan sayısı çok diye yalnız ilanlara yüklenme. Rekabetin düşük olduğu yer, ilan açmamış ' +
        'küçük yazılım şirketleri ve sanayi şirketlerinin kendi yazılım ekipleri.',
      '"Staj ücreti yok" diyen her yeri eleme — ama zorunlu stajda 3308 kapsamındaysan ücret ' +
        'ödenmesi gerektiğini bil ve baştan sor.',
      'Uzaktan staj ilanlarında sigorta ve okul onayı tarafını başlamadan netleştir; bazı ' +
        'bölümler uzaktan yapılan stajı saymıyor.',
    ],
    cvIpucu:
      'CV\'ye mutlaka bir kod deposu bağlantısı koy ve o bağlantının açıldığından emin ol — boş ' +
      'ya da erişilemeyen bir GitHub adresi, hiç olmamasından kötü. Proje satırlarında "Bitirme ' +
      'projesi" yazmak yerine ne yaptığını ve hangi araçları kullandığını yaz. Bildiğin dilleri ' +
      'seviye belirterek listele; mülakatta "bunu CV\'ne yazmışsın" diye sorulduğunda ' +
      'cevaplayamayacağın hiçbir şeyi yazma.',
    sss: [
      {
        soru: 'Bilgisayar mühendisliği stajı için hangi dili bilmek gerekir?',
        cevap:
          'Belirli bir dil şartı yok; bir dili yüzeysel değil doğru düzgün bilmek yeterli. Python, ' +
          'Java, C# ve JavaScript ilanlarda en çok geçenler. Bir dili iyi bilen öğrenci, ikinci ' +
          'dile birkaç haftada geçebiliyor ve işverenler de bunu biliyor.',
      },
      {
        soru: 'Stajyer olarak gerçekten kod yazdırılıyor mu?',
        cevap:
          'Genellikle evet ama ilk iş büyük bir geliştirme olmuyor. Çoğu stajyer var olan bir ' +
          'projede küçük hata düzeltmeleriyle ve test yazarak başlıyor. Bu bilinçli: kod tabanını ' +
          'en hızlı böyle öğreniyorsun.',
      },
      {
        soru: 'GitHub hesabım yoksa başvurmayayım mı?',
        cevap:
          'Başvur, ama açman yarım saatini alır ve fark yaratır. Okulda yazdığın ödevleri bile ' +
          'yüklemek, işverene çalışan bir şey gösterebilmek demek. Bitmemiş olması sorun değil; ' +
          'olmaması sorun.',
      },
      {
        soru: 'Uzaktan (remote) staj yapabilir miyim?',
        cevap:
          'Yazılım tarafında uzaktan staj mümkün ve ilanı da var. Ancak okulunun bunu kabul edip ' +
          'etmediğini staj yönergesinden teyit et; bazı bölümler iş yerinde fiziken bulunmayı şart ' +
          'koşuyor.',
      },
      {
        soru: 'Yazılım stajına ne zaman başvurmalıyım?',
        cevap:
          'Yaz stajı için kışın. Büyük şirketlerin staj programları genellikle şubat-nisan arasında ' +
          'başvuru alıp mayısta kapanıyor. Küçük şirketlerde böyle bir takvim yok ama orada da ' +
          'erken yazan öne geçiyor.',
      },
      {
        soru: 'Şirketin kullandığı dili bilmiyorum, başvurayım mı?',
        cevap:
          'Başvur. Stajyerden o dili bilmesi değil, bir dili iyi bilip ikincisine geçebilmesi ' +
          'bekleniyor. Başvuruda bunu açıkça yazmak — hangi dili bildiğin ve öğrenmeye açık olduğun ' +
          '— çekingen davranmaktan daha iyi sonuç veriyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'makine-muhendisligi',
    ad: 'Makine Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Atölye stajı ve büro stajı ayrı ayrı isteniyor; ikisi farklı yerlerde yapılır.',
    aciklama:
      'Makine mühendisliği stajı nasıl bulunur? Atölye ve büro stajı farkı, ' +
      'stajyerin işi, aranan programlar ve başvuru yolları.',
    nerede: [
      'Üretim yapan fabrikalar — talaşlı imalat, kalıp, otomotiv yan sanayi',
      'Beyaz eşya ve otomotiv ana sanayi',
      'Enerji, iklimlendirme ve tesisat firmaları',
      'Bakım ve teknik servis birimleri',
    ],
    isler: [
      'Tezgâh ve üretim hattını gözlemleyip süreci not etmek',
      'Teknik resim okumak, basit parçaların çizimini güncellemek',
      'Ölçüm yapmak ve kalite kayıtlarını tutmak',
      'Bakım kayıtlarını ve arıza geçmişini düzenlemek',
    ],
    hazirlik: [
      'Teknik resim okuma — atölye stajının tamamı buna dayanıyor',
      'SolidWorks, CATIA veya AutoCAD\'den en az biri',
      'Ölçü aletleri: kumpas, mikrometre — kullanmayı bilmek fark yaratıyor',
      'İş güvenliği kuralları; fabrika ortamında ilk sorulan şey',
    ],
    aranan: [
      'Kaçıncı sınıf olduğun ve hangi staj türünü yaptığın (atölye/büro)',
      'Fabrikaya ulaşım — servis olmayan yerlerde ciddi bir eleme sebebi',
      'Kullandığın çizim programı',
    ],
    ipucu:
      'Okulun istediği staj türünü (atölye mi büro mu) başvuru yazına açıkça yaz. ' +
      'Şirket hangi bölüme yerleştireceğini bilemediği için cevapsız kalan çok başvuru var.',
    aramaKelimeleri: ['makine', 'üretim', 'mühendis'],
    giris:
      'Makine mühendisliğinde staj tek bir şey değil: çoğu bölüm atölye stajı ile büro stajını ' +
      'ayrı ayrı istiyor ve ikisi farklı yerlerde yapılıyor. Atölye stajında imalatın nasıl ' +
      'yapıldığını göreceksin, büro stajında tasarım ve hesap tarafını. Bunu bilmeden tek bir ' +
      'yere başvurup iki stajı da orada yapmayı planlamak, çoğu öğrencinin sonradan fark ettiği ' +
      'hata. Bu sayfada hangi tür iş yerinin hangi stajı karşıladığını, stajyerin sahada ' +
      'gerçekte ne yaptığını ve fabrika ortamına girmeden önce bilmen gerekenleri bulacaksın.',
    pozisyonlar: [
      'Üretim ve imalat stajı — talaşlı imalat, kalıp, kaynak',
      'Tasarım ve teknik resim stajı (büro stajı olarak sayılıyor)',
      'Bakım ve teknik servis stajı',
      'Kalite kontrol ve ölçüm stajı',
      'İklimlendirme, tesisat ve enerji tarafı',
    ],
    dikkat: [
      'Atölye ve büro stajının hangisini nerede yapabileceğini okulun staj yönergesinden teyit ' +
        'et. Yanlış yerde yapılan staj çoğu bölümde sayılmıyor.',
      'Fabrika stajında iş güvenliği eğitimi ve kişisel koruyucu donanım şart. Baret ve çelik ' +
        'burunlu ayakkabıyı kendin götürmen istenebiliyor.',
      'Küçük atölyeler stajyer almaya açık ama ilan açmıyor. Bu bölümde staj çoğunlukla ' +
        'doğrudan gidip sorarak bulunuyor.',
      'Yaz aylarında birçok fabrika toplu izne çıkıyor. Tarihleri seçerken işletmenin kapalı ' +
        'olacağı haftaları baştan sor.',
    ],
    cvIpucu:
      'Kullandığın çizim programını sürüm belirtmeden, ama seviye vererek yaz: "SolidWorks — ' +
      'parça ve montaj" gibi. Atölye deneyimi varsa (okulun atölye dersi de sayılır) hangi ' +
      'tezgâhı gördüğünü yaz; işverenin en çok merak ettiği şey, üretim ortamına daha önce ' +
      'girip girmediğin. Teknik resim okuyabildiğini açıkça belirt.',
    sss: [
      {
        soru: 'Atölye stajı ile büro stajı arasındaki fark nedir?',
        cevap:
          'Atölye stajında imalatın nasıl yapıldığını yerinde görüyorsun: tezgâhlar, kaynak, ' +
          'montaj. Büro stajında tasarım, teknik resim ve hesap tarafında çalışıyorsun. Çoğu bölüm ' +
          'ikisini ayrı ayrı istiyor ve ayrı defter tutturuyor.',
      },
      {
        soru: 'Hangi çizim programını öğrenmeliyim?',
        cevap:
          'SolidWorks, CATIA ve AutoCAD ilanlarda en çok geçenler. Birini iyi öğrenmek üçünü ' +
          'yüzeysel bilmekten iyi; mantık aynı olduğu için ikinciye geçiş kolay oluyor.',
      },
      {
        soru: 'Küçük bir atölyede yapılan staj kabul edilir mi?',
        cevap:
          'Çoğu bölümde ediliyor ama şartı okul koyuyor: bazı yönergeler asgari çalışan sayısı ya ' +
          'da faaliyet alanı şartı arıyor. Belge sürecine girmeden önce staj sorumlusu hocana sor.',
      },
      {
        soru: 'Staj yerinde bana iş verilmezse ne yapmalıyım?',
        cevap:
          'Sormak serbest. "Şu işi izleyebilir miyim, notunu alabilir miyim" demek çoğu atölyede ' +
          'kapı açıyor. Defterin de bu gözlemlerle doluyor: ne yapıldı, nasıl yapıldı, ne ' +
          'öğrenildi.',
      },
      {
        soru: 'Hangi ölçü aletlerini bilmem gerekiyor?',
        cevap:
          'Kumpas ve mikrometre başta geliyor; komparatör ve mastar da atölyede sık kullanılıyor. ' +
          'Bunları kullanmayı bilmek, atölye stajının ilk gününden itibaren iş almanı sağlıyor.',
      },
      {
        soru: 'Otomotiv ana sanayide staj bulmak zor mu?',
        cevap:
          'Kontenjan sınırlı ve başvuru dönemi erken kapanıyor. Yan sanayi ise çok daha fazla ' +
          'stajyer alıyor ve öğrettiği şey çoğu zaman daha kapsamlı oluyor: küçük ekipte üretimin ' +
          'tamamını görüyorsun.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'elektrik-elektronik-muhendisligi',
    ad: 'Elektrik-Elektronik Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Saha, üretim ve donanım tasarımı — üçü çok farklı staj deneyimi.',
    aciklama:
      'Elektrik-elektronik mühendisliği stajı nerede yapılır, stajyer ne iş yapar ' +
      've başvuru öncesi hangi araçlar öğrenilmeli.',
    nerede: [
      'Enerji dağıtım şirketleri ve elektrik taahhüt firmaları',
      'Elektronik kart üreten firmalar',
      'Otomasyon ve kontrol sistemleri kuran şirketler',
      'Savunma ve haberleşme sektörü Ar-Ge birimleri',
    ],
    isler: [
      'Pano ve tesisat projelerini incelemek, saha ile projeyi karşılaştırmak',
      'Devre kartı test etmek, ölçüm almak',
      'PLC programlarını okumak ve küçük değişiklikleri izlemek',
      'Malzeme listesi ve teknik doküman hazırlamak',
    ],
    hazirlik: [
      'Ölçü aleti kullanımı: multimetre, osiloskop',
      'AutoCAD Electrical veya benzeri bir proje programı',
      'Temel PLC mantığı — otomasyon tarafına gideceksen şart',
      'Bir mikrodenetleyiciyle (Arduino, STM32) yaptığın küçük bir proje',
    ],
    aranan: [
      'Hangi alana ilgin olduğu: enerji mi, elektronik mi, otomasyon mu',
      'Sahaya çıkabilecek durumda olmak',
      'Temel devre bilgisini sözlü anlatabilmek',
    ],
    ipucu:
      'Bu bölümün üç ayrı dünyası var. "Elektrik-elektronik okuyorum" demek yerine ' +
      '"enerji tarafında staj arıyorum" demek başvuruyu doğru masaya düşürüyor.',
    aramaKelimeleri: ['elektrik', 'elektronik', 'otomasyon'],
    giris:
      'Elektrik-elektronik mühendisliği geniş bir alan ve staj tarafı da öyle: aynı bölümden ' +
      'iki öğrenci, biri şantiyede elektrik tesisatı görürken diğeri laboratuvarda kart ' +
      'tasarımı yapabiliyor. Bu yüzden "elektrik stajı" diye tek bir şey aramak yerine hangi ' +
      'tarafta çalışmak istediğine baştan karar vermek, doğru yeri bulmayı çok kolaylaştırıyor. ' +
      'Bu sayfada bölümün stajının hangi tür iş yerlerinde yapıldığını, stajyere verilen gerçek ' +
      'işleri, başvurmadan önce öğrenilmesi işe yarayanları ve ilanlarda aranan somut şeyleri ' +
      'bulacaksın.',
    pozisyonlar: [
      'Enerji dağıtım ve şebeke tarafı',
      'Elektrik projelendirme ve tesisat (şantiye ve büro)',
      'Otomasyon ve PLC — sanayi tesislerinde',
      'Gömülü sistem ve kart tasarımı (Ar-Ge merkezleri)',
      'Test, ölçüm ve kalite laboratuvarları',
    ],
    dikkat: [
      'Enerji tarafındaki stajlarda iş güvenliği eğitimi ve yüksek gerilim kuralları başlangıç ' +
        'şartı; bunu ciddiye almayan öğrenci sahaya alınmıyor.',
      'Ar-Ge ve gömülü sistem stajlarının kontenjanı az ve başvuru dönemi erken kapanıyor. Bu ' +
        'tarafı hedefliyorsan kışın başla.',
      'Şantiye stajında çalışma ortamı tozlu, gürültülü ve ayakta geçiyor. Büro stajıyla ' +
        'karıştırılmasın; ikisi çok farklı deneyimler.',
      'Bazı bölümler stajın enerji ve elektronik taraflarını ayrı ayrı istiyor. Yönergeye ' +
        'bakmadan iki stajı aynı yerde planlama.',
    ],
    cvIpucu:
      'Hangi tarafta çalışmak istediğini CV\'nin en üstünde bir cümleyle söyle; ' +
      '"elektrik-elektronik öğrencisiyim" cümlesi işverene hiçbir şey anlatmıyor. Laboratuvar ' +
      'derslerinde kullandığın ölçü aletlerini ve kurduğun devreleri yaz. Bir mikrodenetleyici ' +
      'ile yaptığın küçük bir çalışma bile, hiç projesi olmayan onlarca CV\'nin arasından seni ' +
      'ayırıyor.',
    sss: [
      {
        soru: 'Elektrik stajını hangi tür şirkette yapmalıyım?',
        cevap:
          'Neyi öğrenmek istediğine bağlı. Enerji ve tesisat tarafı için elektrik taahhüt firmaları ' +
          've dağıtım şirketleri, otomasyon için sanayi tesisleri, elektronik için Ar-Ge merkezleri ' +
          've teknoparklar.',
      },
      {
        soru: 'PLC bilmeden otomasyon stajına başvurabilir miyim?',
        cevap:
          'Başvurabilirsin; stajın tanımı zaten öğrenmek. Ancak temel merdiven mantığını önceden ' +
          'görmek ilk haftayı çok kolaylaştırıyor ve mülakatta ilgi göstergesi olarak okunuyor.',
      },
      {
        soru: 'Şantiye stajı mı, büro stajı mı daha iyi?',
        cevap:
          'İkisi farklı şeyler öğretiyor. Şantiye işin nasıl uygulandığını, büro nasıl ' +
          'tasarlandığını gösteriyor. Mümkünse ikisini farklı dönemlerde yapmak en iyisi.',
      },
      {
        soru: 'Staj için hangi programları öğrenmeliyim?',
        cevap:
          'AutoCAD elektrik projelerinde yaygın; otomasyon tarafında kullanılan PLC yazılımları ' +
          'markaya göre değişiyor. Birini öğrenmek diğerine geçişi kolaylaştırıyor, o yüzden ' +
          'hangisiyle başladığın çok önemli değil.',
      },
      {
        soru: 'Stajda elektrikli sistemlere doğrudan müdahale edebilir miyim?',
        cevap:
          'Hayır. Stajyer enerji altındaki bir sistemde çalışmıyor; gözlem yapıyor ve yetkili ' +
          'kişinin gözetiminde destek oluyor. Bunu talep eden bir yer varsa hem seni hem kendini ' +
          'riske atıyor demektir.',
      },
      {
        soru: 'Enerji sektöründe staj için sertifika gerekiyor mu?',
        cevap:
          'Stajyerden mesleki yeterlilik belgesi beklenmiyor ama işletmenin kendi iş güvenliği ' +
          'eğitimini alman ve katılım kaydının tutulması gerekiyor. Bu eğitim olmadan sahaya ' +
          'çıkarılmıyorsun.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'endustri-muhendisligi',
    ad: 'Endüstri Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Üretim yapan her yerde staj yeri var; iş tanımını kendin netleştirmen gerekiyor.',
    aciklama:
      'Endüstri mühendisliği stajı nerede yapılır, stajyer hangi işlere bakar ' +
      've hangi programlar isteniyor.',
    nerede: [
      'Üretim tesislerinin planlama ve verimlilik birimleri',
      'Lojistik ve tedarik zinciri şirketleri',
      'Perakende zincirlerinin operasyon merkezleri',
      'Danışmanlık firmaları',
    ],
    isler: [
      'Zaman etüdü: bir işin kaç dakika sürdüğünü ölçmek',
      'Süreç akış şeması çıkarmak',
      'Stok ve sipariş verisini tabloya dökmek, rapor hazırlamak',
      'İyileştirme önerisi için veri toplamak',
    ],
    hazirlik: [
      'Excel — bu bölümde beklenen seviye "biraz biliyorum"un çok üstünde',
      'Pivot tablo ve temel formüller (DÜŞEYARA, EĞERSAY)',
      'Süreç haritalama mantığı',
      'Bir veri görselleştirme aracı görmüş olmak (Power BI gibi)',
    ],
    aranan: [
      'Excel seviyesi — çoğu ilanda açıkça yazıyor',
      'Sayısal veriyi yorumlayabilmek',
      'Sahada durup gözlem yapabilecek sabır',
    ],
    ipucu:
      'Endüstri stajyerine çoğu şirket ne iş vereceğini bilmiyor. İlk gün "hangi süreci ' +
      'inceleyeyim?" diye sormak, üç hafta boş oturmakla dolu bir staj arasındaki fark.',
    aramaKelimeleri: ['endüstri', 'planlama', 'tedarik'],
    giris:
      'Endüstri mühendisliği stajında en sık yaşanan sorun şu: öğrenci ne iş yapacağını ' +
      'bilmiyor, işveren de stajyere ne verebileceğini bilmiyor. Bölümün alanı geniş olduğu ' +
      'için "süreçleri iyileştirmek" gibi soyut bir tanımla gidilince iki hafta boyunca kimse ' +
      'kimseden ne isteyeceğini bulamıyor. Oysa bu bölümün stajyerine verilebilecek çok somut ' +
      'işler var: veri toplamak, süre ölçmek, akış çıkarmak, stok kaydı düzenlemek. Bu sayfada ' +
      'o somut işleri, staja hangi tür şirketlerde başvurulacağını ve başvurmadan önce hangi ' +
      'araçları öğrenmenin işe yaradığını bulacaksın.',
    pozisyonlar: [
      'Üretim planlama ve çizelgeleme',
      'Kalite yönetimi ve süreç iyileştirme',
      'Tedarik zinciri, satın alma ve stok yönetimi',
      'Lojistik ve depo operasyonu',
      'İş analizi ve raporlama (üretim dışı sektörlerde de)',
    ],
    dikkat: [
      '"Süreç iyileştirme" diye başvurma; hangi somut işi yapabileceğini söyle. Veri toplayıp ' +
        'analiz edebildiğini yazmak, işverenin kafasındaki soru işaretini kaldırıyor.',
      'Bu bölümün stajı yalnız fabrikalarda değil: bankalar, perakende zincirleri, lojistik ' +
        'şirketleri ve hastaneler de endüstri mühendisi stajyeri alıyor.',
      'Excel\'i "biliyorum" demek yetmiyor. Pivot tablo ve arama fonksiyonlarını gerçekten ' +
        'kullanabilmek, stajın ilk gününden itibaren iş almanı sağlıyor.',
      'Staj sonunda somut bir çıktı bırakmaya çalış — bir tablo, bir akış şeması, bir rapor. ' +
        'İşe dönüşen stajların çoğu bu şekilde başlıyor.',
    ],
    cvIpucu:
      'Yaptığın işleri sayıyla anlat: kaç kişilik ekip, kaç veri satırı, ne kadar süre. Bu ' +
      'bölümün işvereni sayıyla düşünüyor ve CV\'de de onu arıyor. Excel, SQL ve varsa Minitab, ' +
      'Python ya da bir simülasyon programını seviye belirterek yaz. Kulüp ya da okul ' +
      'projesinde bir süreci ölçüp iyileştirdiysen, o satır bütün CV\'nin en güçlü yeri.',
    sss: [
      {
        soru: 'Endüstri mühendisliği stajı sadece fabrikada mı yapılır?',
        cevap:
          'Hayır. Fabrikalar en yaygın yer ama lojistik şirketleri, perakende zincirleri, bankalar, ' +
          'hastaneler ve danışmanlık şirketleri de stajyer alıyor. Süreç, veri ve planlama olan her ' +
          'yerde bu bölümün işi var.',
      },
      {
        soru: 'Stajda gerçekte hangi işler veriliyor?',
        cevap:
          'En yaygınları: üretim hattında süre ölçümü, veri toplama ve tabloya dökme, süreç akışı ' +
          'çıkarma, stok ve sipariş kayıtlarını düzenleme, hazır raporları güncelleme.',
      },
      {
        soru: 'Hangi programları bilmek gerekiyor?',
        cevap:
          'Excel her ilanda geçiyor ve sadece açabilmek yetmiyor. Bunun üstüne SQL temel sorguları, ' +
          'varsa bir ERP arayüzü tecrübesi ve veri analizi için Python ya da Minitab fark ' +
          'yaratıyor.',
      },
      {
        soru: 'Yalın üretim terimlerini bilmem şart mı?',
        cevap:
          'Şart değil ama mülakatta konu açılıyor. Kaizen, kanban, 5S gibi kavramların ne olduğunu ' +
          'bir okumak, bilmediğin bir alanda konuşmak zorunda kalmanı önlüyor.',
      },
      {
        soru: 'Zaman etüdü nedir, stajda yapar mıyım?',
        cevap:
          'Bir işin ne kadar sürdüğünü ölçüp kayda geçirmek. Endüstri mühendisliği stajyerine en ' +
          'sık verilen işlerden biri, çünkü hem öğretici hem de işletmeye doğrudan fayda sağlıyor. ' +
          'Kronometre ve bir tablo yeterli.',
      },
      {
        soru: 'Endüstri mühendisliği stajı işe dönüşür mü?',
        cevap:
          'Dönüşme ihtimali görece yüksek, çünkü stajyerin bıraktığı çıktı ölçülebilir oluyor: bir ' +
          'tablo, bir akış şeması, düzenlenmiş bir stok kaydı. Staj biterken somut bir iş ' +
          'tamamlamak bu ihtimali en çok artıran şey.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'insaat-muhendisligi',
    ad: 'İnşaat Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Şantiye stajı ve büro stajı ayrı; şantiyede iş güvenliği belgesi isteniyor.',
    aciklama:
      'İnşaat mühendisliği stajı nasıl bulunur? Şantiye ve büro stajı farkı, ' +
      'stajyerin görevleri ve gereken belgeler.',
    nerede: [
      'Müteahhitlik firmalarının şantiyeleri',
      'Proje ve statik hesap büroları',
      'Belediyelerin fen işleri müdürlükleri',
      'Altyapı ve yol projeleri yürüten kamu kurumları',
    ],
    isler: [
      'Şantiyede imalat takibi, günlük rapor tutmak',
      'Metraj çıkarmak',
      'Nokta atışı ölçüm ekibine eşlik etmek',
      'Projedeki detayları sahadaki uygulamayla karşılaştırmak',
    ],
    hazirlik: [
      'AutoCAD — büro stajının temel aracı',
      'Metraj mantığı ve birim fiyat kavramı',
      'Statik projeyi okuyabilmek',
      'İş güvenliği eğitimi; şantiyede baret ve ayakkabı olmadan giriş yok',
    ],
    aranan: [
      'Şantiyede kalabilecek durumda olup olmadığın (bazı projeler şehir dışında)',
      'Temel çizim programı bilgisi',
      'Sağlık raporu ve iş güvenliği belgeleri',
    ],
    ipucu:
      'Şantiye stajı için başvururken hangi tarih aralığında tam zamanlı olabileceğini yaz. ' +
      'Şantiyeler yarım gün gelen stajyerle çalışamıyor.',
    aramaKelimeleri: ['inşaat', 'şantiye', 'proje'],
    giris:
      'İnşaat mühendisliğinde staj çoğu bölümde ikiye ayrılıyor: şantiye stajı ve büro stajı. ' +
      'Şantiyede yapının nasıl kurulduğunu yerinde görüyorsun, büroda projenin nasıl ' +
      'hesaplandığını ve çizildiğini. İkisi çok farklı ortamlar ve çoğu öğrenci ilk stajını ' +
      'hangisi olduğuna bakmadan alıp sonradan eksik kalıyor. Bir de mevsim tarafı var: ' +
      'şantiyeler kış aylarında yavaşlıyor, yaz ise en yoğun dönem. Bu sayfada iki staj türünün ' +
      'nerede yapıldığını, stajyerin sahada gerçekte ne yaptığını ve başvurmadan önce bilmen ' +
      'gerekenleri bulacaksın.',
    pozisyonlar: [
      'Şantiye stajı — bina, altyapı ya da yol projelerinde',
      'Proje ve statik hesap bürosu (büro stajı)',
      'Kalite kontrol ve malzeme laboratuvarı',
      'Metraj, hakediş ve maliyet tarafı',
      'Kamu kurumlarının yapı işleri birimleri',
    ],
    dikkat: [
      'Şantiyeye kişisel koruyucu donanım olmadan girilmiyor: baret, çelik burunlu ayakkabı ve ' +
        'yelek. Bazı şantiyeler veriyor, bazıları senden bekliyor — önceden sor.',
      'Şantiye stajı yaz aylarında sıcak ve tozlu bir ortamda, ayakta geçiyor. Bunu bilerek ' +
        'seçmek, ilk hafta pes etmemeni sağlıyor.',
      'Büro stajı için AutoCAD neredeyse şart; statik program bilgisi ise beklenmiyor ama bilen ' +
        'öğrenci hemen fark ediliyor.',
      'Kamu kurumlarında staj kontenjanları erken açılıyor ve belge süreci uzun. Bu tarafı ' +
        'hedefliyorsan aylar öncesinden başla.',
    ],
    cvIpucu:
      'Şantiye mi büro mu istediğini CV\'de açıkça yaz; ikisine aynı CV\'yi göndermek her ' +
      'ikisinde de zayıf duruyor. Gördüğün yapı türlerini ve kullandığın programları listele. ' +
      'Okulun malzeme laboratuvarında yaptığın deneyler (beton basınç, agrega analizi) gerçek ' +
      'bir deneyim satırı — "sadece ders" diye atlamamalısın.',
    sss: [
      {
        soru: 'Şantiye stajı ile büro stajı arasındaki fark nedir?',
        cevap:
          'Şantiye stajında imalatı yerinde görüyorsun: kalıp, demir, beton döküm, kot ölçümü. Büro ' +
          'stajında proje çizimi, statik hesap ve metraj tarafında çalışıyorsun. Çoğu bölüm ikisini ' +
          'ayrı ayrı istiyor.',
      },
      {
        soru: 'Staja hangi mevsimde başvurmalıyım?',
        cevap:
          'Şantiye stajı için yaz en yoğun dönem ve en çok yer o zaman açılıyor. Ama başvuruyu ' +
          'yazın yapmak geç: kışın yazmaya başlamak, yaz kontenjanına yetişmek demek.',
      },
      {
        soru: 'İnşaat stajında hangi programlar isteniyor?',
        cevap:
          'AutoCAD en yaygını. Bunun üstüne metraj ve hakediş programları, bina bilgi modelleme ' +
          'araçları ve statik hesap yazılımları geliyor; stajyerden bunlar beklenmiyor ama bilmek ' +
          'ayırt edici.',
      },
      {
        soru: 'Kamu kurumunda staj yapabilir miyim?',
        cevap:
          'Yapabilirsin; belediyeler, karayolları ve DSİ gibi kurumlar stajyer alıyor. Ancak ' +
          'başvuru takvimi erken ve evrak süreci uzun; aynı anda özel sektöre de başvurup seçenek ' +
          'bırakmak akıllıca.',
      },
      {
        soru: 'Şantiyeye stajyer olarak girerken ne isteniyor?',
        cevap:
          'Okulun staj belgesi ve sigorta girişinin yapılmış olması, işletmenin iş güvenliği ' +
          'eğitimi ve kişisel koruyucu donanım. Bazı büyük şantiyeler ayrıca sağlık raporu ve giriş ' +
          'kartı süreci işletiyor; bunlar birkaç gün alabiliyor.',
      },
      {
        soru: 'Kış döneminde şantiye stajı yapabilir miyim?',
        cevap:
          'Yapabilirsin ama iş hacmi düşüyor: soğuk havada beton döküm ve bazı imalatlar duruyor. ' +
          'Kışın büro stajı, yazın şantiye stajı yapmak çoğu öğrenci için daha verimli bir ' +
          'sıralama.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'gida-muhendisligi',
    ad: 'Gıda Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Üretim ve kalite laboratuvarı; portör muayenesi çoğu yerde şart.',
    aciklama:
      'Gıda mühendisliği stajı nerede yapılır, stajyer hangi işlere bakar ve ' +
      'hangi sağlık belgeleri isteniyor.',
    nerede: [
      'Gıda üretim tesisleri: süt, un, konserve, içecek',
      'Kalite kontrol laboratuvarları',
      'Perakende zincirlerinin kalite birimleri',
      'Tarım ve gıda alanındaki kamu laboratuvarları',
    ],
    isler: [
      'Numune almak ve laboratuvar analizlerine eşlik etmek',
      'Üretim hattında hijyen ve sıcaklık kayıtlarını tutmak',
      'HACCP kayıtlarını incelemek',
      'Raf ömrü çalışmalarına destek olmak',
    ],
    hazirlik: [
      'HACCP ve gıda güvenliği kavramları',
      'Temel laboratuvar teknikleri ve hijyen kuralları',
      'Mikrobiyoloji dersinden aklında kalanları tazelemek',
    ],
    aranan: [
      'Portör muayenesi / hijyen belgesi — üretim alanına girmenin şartı',
      'Laboratuvarda dikkatli çalışma',
      'Kayıt tutma disiplini',
    ],
    ipucu:
      'Sağlık belgelerini başvuru sırasında hazırlamaya başla. Kabul aldıktan sonra ' +
      'belge bekleyip staja geç başlayan çok kişi var.',
    aramaKelimeleri: ['gıda', 'kalite', 'laboratuvar'],
    giris:
      'Gıda mühendisliği stajı, üretimin içinde geçen bir staj: laboratuvar analizi kadar ' +
      'hattın kendisini de görüyorsun. Bu bölümde en sık yaşanan hayal kırıklığı, öğrencinin ' +
      'Ar-Ge ve ürün geliştirme beklentisiyle gidip kendini kalite kontrol kayıtlarında ' +
      'bulması. Oysa gıda güvenliği bu sektörün omurgası ve o kayıtlar işin en kritik parçası; ' +
      'bunu bilerek gitmek stajı çok daha verimli kılıyor. Bu sayfada hangi tesislerin stajyer ' +
      'aldığını, stajyere verilen gerçek işleri, hangi standartları önceden tanımanın işe ' +
      'yaradığını ve başvuru ipuçlarını bulacaksın.',
    pozisyonlar: [
      'Kalite kontrol ve gıda güvenliği',
      'Üretim ve proses takibi',
      'Ar-Ge ve ürün geliştirme',
      'Duyusal analiz ve raf ömrü çalışmaları',
      'Tedarikçi ve hammadde kabul kontrolü',
    ],
    dikkat: [
      'Ar-Ge kontenjanı az; stajların çoğu kalite kontrol ve üretim tarafında geçiyor. Bunu ' +
        'bilerek gitmek hayal kırıklığını önlüyor.',
      'Hijyen kuralları katı: bone, önlük, takı yasağı ve bazı tesislerde sağlık raporu. ' +
        'Kurallara uymayan stajyer üretim alanına alınmıyor.',
      'Gıda güvenliği standartlarının (HACCP gibi) ne olduğunu önceden okumak, mülakatta ve ilk ' +
        'günde belirgin fark yaratıyor.',
      'Mevsimlik üretim yapan tesislerde (konserve, salça, meyve suyu) staj dönemi üretim ' +
        'sezonuna denk gelmeli; kapalı dönemde gidersen görecek bir şey olmuyor.',
    ],
    cvIpucu:
      'Laboratuvarda yaptığın analizleri adıyla yaz: nem, asitlik, mikrobiyolojik ekim gibi. ' +
      'Gıda güvenliği ya da hijyen eğitimi aldıysan mutlaka belirt — üretim tesisleri buna ' +
      'doğrudan bakıyor. Hangi ürün grubuyla ilgilendiğini bir cümleyle söylemek de başvuruyu ' +
      'kişiselleştiriyor: süt, et, unlu mamul, içecek çok farklı süreçler.',
    sss: [
      {
        soru: 'Gıda mühendisliği stajı nerede yapılır?',
        cevap:
          'Süt, et, unlu mamul, içecek, konserve ve hazır gıda üreten tesisler; ayrıca gıda analiz ' +
          'laboratuvarları, market zincirlerinin kalite birimleri ve kamu denetim kurumları.',
      },
      {
        soru: 'Stajda gerçekte ne yapıyorum?',
        cevap:
          'Hammadde ve ürün numunelerinin analizi, hijyen ve sıcaklık kayıtlarının tutulması, ' +
          'üretim hattının izlenmesi, kalite kayıtlarının düzenlenmesi ve raf ömrü çalışmalarına ' +
          'destek.',
      },
      {
        soru: 'HACCP nedir, bilmem gerekiyor mu?',
        cevap:
          'Gıda üretiminde tehlikelerin nerede oluşabileceğini belirleyip kontrol altına alma ' +
          'sistemi. Stajyerden uzmanlık beklenmiyor ama ne olduğunu bilmek mülakatta ve ilk günde ' +
          'fark yaratıyor.',
      },
      {
        soru: 'Ar-Ge stajı bulmak mümkün mü?',
        cevap:
          'Mümkün ama kontenjan az ve genellikle büyük firmalarda. Kalite ve üretim tarafında ' +
          'geçirilen bir staj da Ar-Ge\'ye giden yolu açıyor: ürünün nasıl üretildiğini bilmeden ' +
          'geliştirmek mümkün olmuyor.',
      },
      {
        soru: 'Mevsimlik üretim yapan tesiste staj yapmalı mıyım?',
        cevap:
          'Üretim sezonuna denk getirebilirsen çok verimli oluyor: hattın tam kapasite çalıştığını ' +
          'görüyorsun. Sezon dışında gidersen tesis büyük ölçüde duruyor.',
      },
      {
        soru: 'Sağlık raporu isteniyor mu?',
        cevap:
          'Gıda üretim alanına girecek herkesten portör muayenesi ya da benzeri bir sağlık kaydı ' +
          'isteniyor. Süreci başlatmak birkaç gün aldığı için staj başlangıcından önce halletmek ' +
          'gerekiyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },

  /* -------------------------------------------------------------------- MYO */
  {
    slug: 'bilgisayar-programciligi',
    ad: 'Bilgisayar Programcılığı (MYO)',
    grup: 'myo',
    ozet: 'İki yıllık programda staj zorunlu; küçük yazılım firmaları en gerçekçi hedef.',
    aciklama:
      'Bilgisayar programcılığı önlisans stajı nerede yapılır, stajyer ne iş yapar ' +
      've hangi konular önceden öğrenilmeli.',
    nerede: [
      'Küçük ve orta ölçekli yazılım firmaları',
      'Web ve mobil ajanslar',
      'Şirketlerin bilgi işlem birimleri',
      'Bilgisayar teknik servisleri',
    ],
    isler: [
      'Hazır bir projede arayüz düzenlemeleri',
      'Veri tabanına kayıt ekleyen basit ekranlar yazmak',
      'Test etmek ve hata bildirmek',
      'Bilgi işlem tarafındaysan kurulum ve destek işleri',
    ],
    hazirlik: [
      'Bir dilde temel seviyeyi geçmek: C#, Python veya JavaScript',
      'HTML ve CSS — web tarafında ilk istenen şey',
      'SQL: SELECT, INSERT, JOIN',
      'Küçük de olsa bitmiş tek bir proje',
    ],
    aranan: [
      'Gösterebileceğin bir çalışma',
      'Öğrenmeye açıklık — bu seviyede kimse uzman beklemiyor',
      'Staj süresi ve günleri konusunda netlik',
    ],
    ipucu:
      'Büyük şirketlerin stajyer programları çoğunlukla dört yıllık bölümlere açık. ' +
      'Önlisans için küçük firmalara doğrudan başvurmak çok daha yüksek dönüş alıyor.',
    aramaKelimeleri: ['yazılım', 'web', 'destek'],
    giris:
      'Bilgisayar programcılığı, meslek yüksekokulunun staj bulması en kolay bölümlerinden ' +
      'biri: piyasada yazılım işi çok ve iki yıllık öğrenciden beklenen şey diploma değil, ' +
      'çalışan bir şey gösterebilmek. Bu bölümün asıl avantajı da bu — dört yıllık öğrencilerle ' +
      'aynı ilana başvururken elinde bitirmiş bir projen varsa fark kapanıyor. Zorluk şurada: ' +
      'müfredat geniş ama yüzeysel geçiyor, o yüzden bir konuyu kendi başına derinleştirmek ' +
      'gerekiyor. Bu sayfada staj yerlerini, stajyere verilen gerçek işleri ve başvurmadan önce ' +
      'öğrenmen gerekenleri bulacaksın.',
    pozisyonlar: [
      'Web geliştirme stajı (ön yüz ya da arka uç)',
      'Mobil uygulama stajı',
      'Test ve hata kaydı tutma',
      'Veri tabanı ve raporlama desteği',
      'Bilgi işlem ve teknik destek',
    ],
    dikkat: [
      'Dört yıllık bölümlerle aynı ilanlara başvuruyorsun. Ayrıştıran şey unvan değil, ' +
        'gösterebildiğin çalışma — bir tane bitmiş küçük proje, on yarım projeden değerli.',
      'İki yıllık programda staj dönemi genellikle daha kısıtlı. Okulunun takvimini erken ' +
        'öğren, çünkü şirketlerin staj programları o tarihlere uymayabiliyor.',
      'Küçük yazılım şirketleri ve dijital ajanslar bu bölümden stajyer almaya çok açık ama ' +
        'neredeyse hiç ilan açmıyor. Doğrudan yazmak en verimli yol.',
      'Dikey geçiş planın varsa staj yerini ona göre seç: bir alanı gerçekten öğrendiğin bir ' +
        'staj, hem işe hem okula devam kararında elini güçlendiriyor.',
    ],
    cvIpucu:
      'Kod deposu bağlantısı olmayan bir CV bu bölümde en büyük eksik. Okul ödevlerini bile ' +
      'yüklemek, işverene bakabileceği bir şey vermek demek. Hangi dille ne yaptığını yaz; ' +
      '"HTML, CSS, JavaScript, Python, Java, C#" diye altı dili alt alta sıralamak inandırıcı ' +
      'durmuyor. İkisini iyi bilmek ve bunu bir projeyle göstermek yeterli.',
    sss: [
      {
        soru: 'İki yıllık mezunu olarak yazılım stajı bulabilir miyim?',
        cevap:
          'Bulabilirsin. Bu alanda işverenin baktığı şey bölüm süresi değil, çalışan bir şey ' +
          'gösterip gösteremediğin. Bitmiş küçük bir proje, çoğu ilanda dört yıllık öğrencilerle ' +
          'aranı kapatıyor.',
      },
      {
        soru: 'Hangi alanda uzmanlaşmalıyım?',
        cevap:
          'Web ve mobil, staj bulma açısından en çok kapı açan iki alan. Birini seçip derinleşmek, ' +
          'hepsine yüzeysel dokunmaktan çok daha hızlı sonuç veriyor.',
      },
      {
        soru: 'Staj sırasında bana gerçek proje verilir mi?',
        cevap:
          'Küçük şirketlerde büyük ihtimalle evet — ekip küçük olduğu için stajyer hızla işin içine ' +
          'giriyor. Büyük şirketlerde ise genelde var olan bir projede küçük görevlerle ' +
          'başlıyorsun.',
      },
      {
        soru: 'Sertifika kursları işe yarıyor mu?',
        cevap:
          'Sertifikanın kendisi tek başına ayırt edici değil; o kursta yaptığın proje ayırt edici. ' +
          'İşveren sertifikayı değil, onunla ne ürettiğini soruyor.',
      },
      {
        soru: 'Dijital ajansta staj yapmak nasıl?',
        cevap:
          'Ajanslarda tempo yüksek ve aynı anda birden çok projeye dokunuyorsun; bu, kısa sürede ' +
          'çok şey görmek demek. Karşılığında derinleşme az oluyor. Ne öğrenmek istediğine göre ' +
          'avantaj ya da dezavantaj.',
      },
      {
        soru: 'Dikey geçiş planım varsa staj yerimi ona göre mi seçmeliyim?',
        cevap:
          'Seçebilirsen iyi olur. Bir alanı gerçekten öğrendiğin staj, hem dikey geçiş sonrası ' +
          'derslerde hem de doğrudan işe başlama kararında elini güçlendiriyor. İki seçeneği de ' +
          'açık tutmak en sağlamı.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'muhasebe-ve-vergi-uygulamalari',
    ad: 'Muhasebe ve Vergi Uygulamaları (MYO)',
    grup: 'myo',
    ozet: 'Mali müşavir ofisleri stajyer alıyor; dönem başlarında yoğunluk artıyor.',
    aciklama:
      'Muhasebe stajı nerede yapılır, stajyer hangi işlere bakar ve hangi ' +
      'programlar isteniyor.',
    nerede: [
      'Serbest muhasebeci mali müşavir ofisleri',
      'Şirketlerin muhasebe ve finans birimleri',
      'Denetim firmalarının destek birimleri',
    ],
    isler: [
      'Fatura ve fiş kaydı girmek',
      'Evrak düzenlemek ve arşivlemek',
      'Banka hareketlerini kayıtla karşılaştırmak',
      'Beyanname dönemlerinde veri hazırlığına destek olmak',
    ],
    hazirlik: [
      'Tek düzen hesap planını tanımak',
      'Excel — burada da beklenen seviye yüksek',
      'Bir ön muhasebe programı görmüş olmak (Logo, Mikro, Netsis gibi)',
    ],
    aranan: [
      'Dikkat: bu işte rakam hatasının bedeli yüksek',
      'Gizlilik bilinci — şirketlerin mali verilerini görüyorsun',
      'Düzenli çalışma alışkanlığı',
    ],
    ipucu:
      'Mali müşavir ofisleri en çok beyanname dönemlerinde yardıma ihtiyaç duyuyor. ' +
      'Başvuru zamanlamanı buna göre ayarlamak kabul şansını artırıyor.',
    aramaKelimeleri: ['muhasebe', 'finans', 'ön muhasebe'],
    giris:
      'Muhasebe, staj yeri bulmanın görece kolay olduğu bölümlerden biri: her şehirde çok ' +
      'sayıda serbest muhasebeci mali müşavir bürosu var ve çoğu stajyer alıyor. Asıl mesele ' +
      'yer bulmak değil, doğru yeri bulmak — çünkü stajın kalitesi büroya göre ciddi biçimde ' +
      'değişiyor. Bir yerde gerçekten fiş kesip beyanname hazırlığı görürken, başka bir yerde ' +
      'iki ay boyunca evrak taşımakla geçebiliyor. Bu sayfada nerede staj yapıldığını, stajyere ' +
      'verilen gerçek işleri, hangi programları öğrenmenin işe yaradığını ve başvururken nelere ' +
      'dikkat etmen gerektiğini bulacaksın.',
    pozisyonlar: [
      'Serbest muhasebeci mali müşavir bürosu',
      'Şirketlerin ön muhasebe ve finans birimleri',
      'Bağımsız denetim şirketleri',
      'Bordro ve özlük işleri',
      'Perakende ve ticaret şirketlerinin cari hesap tarafı',
    ],
    dikkat: [
      'Büroyu seçerken ne öğreneceğini baştan sor. "Stajyerinize hangi işleri veriyorsunuz?" ' +
        'sorusu, iki ayını evrak taşıyarak geçirmeni önlüyor.',
      'Beyanname dönemleri (ay başları ve geçici vergi dönemleri) çok yoğun geçiyor. O ' +
        'haftalarda işin içine girme şansın yüksek ama tempo da yüksek.',
      'Muhasebe programlarının arayüzü markaya göre değişiyor; birini öğrenmek diğerine geçişi ' +
        'kolaylaştırıyor. Hangisiyle başladığın çok önemli değil.',
      'Gördüğün her şey müşteri bilgisi. Rakam, isim ve belge fotoğrafını dışarı çıkarmamak bu ' +
        'bölümde meslek kuralı; staj defterine yazarken bile sorumluna sor.',
    ],
    cvIpucu:
      'Kullandığın muhasebe programını ve Excel seviyeni yaz; "Excel" tek başına bir şey ' +
      'anlatmıyor, "Excel — DÜŞEYARA ve pivot tablo" anlatıyor. Daha önce bir işletmede kasa, ' +
      'fatura ya da cari hesap tuttuysan, alanla ilgisiz görünse bile yaz: bu bölümde işverenin ' +
      'aradığı ilk şey dikkat ve düzen.',
    sss: [
      {
        soru: 'Muhasebe stajı nerede yapılır?',
        cevap:
          'En yaygını serbest muhasebeci mali müşavir büroları. Bunun dışında şirketlerin kendi ' +
          'muhasebe ve finans birimleri, bağımsız denetim şirketleri ve büyük ticaret şirketlerinin ' +
          'cari hesap birimleri stajyer alıyor.',
      },
      {
        soru: 'Stajda hangi işler verilir?',
        cevap:
          'Fatura ve fiş kaydı, cari hesap takibi, banka hareketlerinin eşleştirilmesi, evrak ' +
          'düzeni ve beyanname hazırlığına destek. Beyannameyi stajyer imzalamıyor ama hazırlık ' +
          'sürecini görüyor.',
      },
      {
        soru: 'Hangi muhasebe programını öğrenmeliyim?',
        cevap:
          'Piyasada birkaç program yaygın ve her büro farklısını kullanıyor. Birini öğrenmek ' +
          'mantığı öğrenmek demek; ikinci programa geçiş birkaç gün sürüyor.',
      },
      {
        soru: 'Muhasebe bürosunda staj işe dönüşür mü?',
        cevap:
          'Bu bölümde ihtimal görece yüksek: bürolar güvendikleri stajyeri yanlarında tutmayı ' +
          'tercih ediyor. Niyetini staj bitmeden açıkça söylemek, bu ihtimali gerçeğe çeviren şey ' +
          'oluyor.',
      },
      {
        soru: 'Bu staj, mali müşavirlik staj süresinden sayılır mı?',
        cevap:
          'Okul stajı ile meslek mensubu olmak için yapılan staj farklı süreçler ve farklı mevzuata ' +
          'tabi. Kendi durumun için bağlayıcı cevabı bağlı olduğun serbest muhasebeci mali ' +
          'müşavirler odasından almalısın.',
      },
      {
        soru: 'Beyanname döneminde staja başlamak avantaj mı?',
        cevap:
          'Öğrenmek açısından evet: işin en yoğun ve en öğretici kısmı o dönemlerde yaşanıyor. ' +
          'Dezavantajı, herkesin çok meşgul olması ve sana ayrılan zamanın azalması. İkisini ' +
          'bilerek seçmek en iyisi.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'giyim-uretim-teknolojisi',
    ad: 'Giyim Üretim Teknolojisi / Tekstil',
    grup: 'myo',
    ozet: 'Konfeksiyon üretimi, model evi ve kalite — üçü ayrı staj rotası.',
    aciklama:
      'Giyim üretim teknolojisi ve tekstil stajı nerede yapılır, stajyer ne iş ' +
      'yapar, hangi programlar ve beceriler aranıyor.',
    nerede: [
      'Konfeksiyon üretim atölyeleri ve fabrikaları',
      'Markaların model evi ve ürün geliştirme birimleri',
      'Kumaş üreticileri ve boyahaneler',
      'Kalite kontrol birimleri',
    ],
    isler: [
      'Kalıp hazırlığına ve numune dikimine eşlik etmek',
      'Üretim hattında model takibi',
      'Kalite kontrolde ölçü ve dikiş hatası kaydı tutmak',
      'Kumaş ve aksesuar takibi, malzeme listesi hazırlamak',
    ],
    hazirlik: [
      'Temel kalıp bilgisi ve ölçü tablosu okumak',
      'Dikiş makinesi kullanabilmek — atölyede en somut avantaj',
      'Kalıp programlarından biri: Optitex, Gerber veya Lectra',
      'Kumaş türlerini ve temel dikiş hatalarını tanımak',
    ],
    aranan: [
      'El becerisi ve üretim ortamına uyum',
      'Kalıp programı bilgisi (model evi tarafı için)',
      'Ölçü ve detaya dikkat',
    ],
    ipucu:
      'Kendi diktiğin ya da kalıbını çıkardığın işlerin fotoğrafını bir dosyada topla. ' +
      'Bu bölümde gösterilebilir iş, yazılı CV\'den daha hızlı sonuç veriyor.',
    aramaKelimeleri: ['tekstil', 'konfeksiyon', 'üretim'],
    giris:
      'Giyim üretim teknolojisi, staj yeri bulmanın görece kolay olduğu alanlardan biri: ' +
      'Türkiye\'nin konfeksiyon üretimi büyük ve neredeyse her sanayi şehrinde fabrika var. ' +
      'Asıl mesele hangi bölümde çalışacağın — kesimhane, dikimhane, kalite kontrol ve numune ' +
      'bölümü birbirinden oldukça farklı işler ve öğrettikleri de farklı. Bir de ihracat ' +
      'gerçeği var: bu sektörün büyük kısmı yurt dışına üretiyor ve o yüzden kalite ' +
      'standartları katı. Bu sayfada hangi bölümlerin ne öğrettiğini, stajyere verilen gerçek ' +
      'işleri ve başvuru ipuçlarını bulacaksın.',
    pozisyonlar: [
      'Numune ve model bölümü — en çok öğreten yer',
      'Kesimhane ve serim',
      'Dikimhane ve hat takibi',
      'Kalite kontrol ve son kontrol',
      'Planlama ve sipariş takibi',
    ],
    dikkat: [
      'Numune bölümü bu sektörde en çok öğreten yer: ürünün nasıl doğduğunu baştan sona ' +
        'görüyorsun. Başvuruda bu bölümü açıkça istemek işe yarıyor.',
      'İhracat yapan fabrikalarda kalite standartları katı ve müşteri denetimleri var. Bunu ' +
        'görmek, sektörün gerçekte nasıl işlediğini anlamanın en hızlı yolu.',
      'Üretim hattında tempo yüksek ve iş ayakta geçiyor. Vardiya düzeni olan fabrikalar da ' +
        'var; başvurmadan önce çalışma saatlerini sor.',
      'Fabrikalar sanayi bölgelerinde ve şehir dışında olabiliyor. Servis olup olmadığını ' +
        'önceden öğren.',
    ],
    cvIpucu:
      'Kullandığın kalıp ve tasarım programlarını yaz; bu sektörde bilgisayarlı kalıp hazırlama ' +
      'bilen öğrenci sayısı az ve doğrudan ayırt edici. Dikiş makinesi kullanabilme, kalıp ' +
      'çıkarma ve ölçü alma gibi el becerilerini de belirt. Okulun atölyesinde diktiğin ' +
      'ürünlerin fotoğraflarını bir araya getirmek küçük bir portfolyo işi görüyor.',
    sss: [
      {
        soru: 'Bu bölümün stajı nerede yapılır?',
        cevap:
          'Konfeksiyon fabrikaları, model ve numune evleri, markaların üretim takip birimleri, ' +
          'tekstil üreticileri ve kalite kontrol firmaları.',
      },
      {
        soru: 'Hangi bölümde staj yapmak daha çok öğretir?',
        cevap:
          'Numune ve model bölümü: ürünün tasarımdan üretime nasıl geçtiğini baştan sona ' +
          'görüyorsun. Kesimhane ve dikimhane ise üretimin kendisini öğretiyor.',
      },
      {
        soru: 'Dikiş bilmem şart mı?',
        cevap:
          'Şart değil ama işi anlamak için çok yardımcı. Dikişi bilen stajyer, hattaki bir sorunun ' +
          'neden çıktığını daha hızlı görüyor ve bu hemen fark ediliyor.',
      },
      {
        soru: 'Kalıp programı bilmek gerekiyor mu?',
        cevap:
          'Zorunlu değil ama bilgisayarlı kalıp hazırlama bilen öğrenci az. Temel düzeyde bile ' +
          'kullanabiliyorsan bunu CV\'ye yazmak seni belirgin biçimde öne çıkarıyor.',
      },
      {
        soru: 'Fabrikada çalışma saatleri nasıl?',
        cevap:
          'Üretim düzenine göre değişiyor ve bazı fabrikalarda vardiya var. Sipariş teslim ' +
          'dönemleri yoğun geçiyor; o dönemlerde işin içine girme şansın yüksek.',
      },
      {
        soru: 'Konfeksiyon stajı işe dönüşür mü?',
        cevap:
          'Sektörde nitelikli eleman ihtiyacı sürekli ve stajyeri yetiştirip tutmak fabrikalar için ' +
          'en kolay yol. Numune ve kalite bölümlerinde ihtimal özellikle yüksek.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'mekatronik',
    ad: 'Mekatronik / Elektronik Teknolojisi (MYO)',
    grup: 'myo',
    ozet: 'Bakım ve otomasyon birimleri; teknik serviste iş bulmak en kolay.',
    aciklama:
      'Mekatronik ve elektronik teknolojisi stajı nerede yapılır, stajyerin ' +
      'görevleri ve gereken teknik bilgi.',
    nerede: [
      'Fabrikaların bakım ve otomasyon birimleri',
      'Makine üreticilerinin montaj hatları',
      'Teknik servis firmaları',
      'Panolu otomasyon kuran şirketler',
    ],
    isler: [
      'Arıza tespitine eşlik etmek',
      'Sensör ve motor bağlantılarını kontrol etmek',
      'Bakım kayıtlarını tutmak',
      'Pano montajına destek olmak',
    ],
    hazirlik: [
      'Multimetre ve temel ölçüm',
      'PLC mantığı ve merdiven diyagramı okumak',
      'Pnömatik ve hidrolik devre şemaları',
      'İş güvenliği kuralları',
    ],
    aranan: [
      'Elini işe sürebilmek — bu alanda gözlemci stajyer aranmıyor',
      'Temel devre ve şema okuma',
      'Vardiyalı ortama uyum',
    ],
    ipucu:
      'Küçük bir otomasyon firmasında bakım ekibine takılmak, büyük fabrikada ' +
      'ofiste oturmaktan çok daha fazla şey öğretiyor.',
    aramaKelimeleri: ['mekatronik', 'bakım', 'otomasyon'],
    giris:
      'Mekatronik, mekanik ile elektroniğin kesiştiği yerde duruyor ve staj tarafındaki en ' +
      'büyük avantajı da bu: fabrikaların bakım ve otomasyon ekipleri tam olarak bu ikisini ' +
      'birden bilen kişiyi arıyor. Üretim duran bir hatta hem mekanik hem elektriksel arızayı ' +
      'ayırt edebilmek, sahada en çok değer verilen beceri. Zorluğu ise şu: alan geniş olduğu ' +
      'için okulda her şey yüzeysel geçiyor, bir tarafı kendin derinleştirmen gerekiyor. Bu ' +
      'sayfada nerede staj yapıldığını, stajyere verilen gerçek işleri ve başvurmadan önce ' +
      'öğrenmen gerekenleri bulacaksın.',
    pozisyonlar: [
      'Fabrikaların bakım ve onarım ekipleri',
      'Endüstriyel otomasyon ve PLC firmaları',
      'Robot ve üretim hücresi entegratörleri',
      'Makine imalatçılarının montaj ve devreye alma birimleri',
      'Teknik servis ve arıza giderme',
    ],
    dikkat: [
      'Bakım ekiplerinde arıza her an çıkıyor ve iş planlı ilerlemiyor. Bu, öğrenmek için en ' +
        'verimli ama en yorucu ortam.',
      'Otomasyon tarafında temel PLC mantığını önceden görmek stajın ilk haftasını tamamen ' +
        'değiştiriyor; internetteki ücretsiz kaynaklar bunun için yeterli.',
      'Enerji altındaki panolarda çalışma yetkili kişinin işi. Stajyer gözlem yapıyor ve ' +
        'gözetim altında destek oluyor; bunu talep eden bir yer varsa uzak dur.',
      'Fabrikalar sanayi bölgelerinde ve vardiya düzeni olabiliyor. Ulaşımı ve çalışma ' +
        'saatlerini başvurmadan önce sor.',
    ],
    cvIpucu:
      'Hem mekanik hem elektronik tarafta ne yapabildiğini ayrı ayrı yaz; bu bölümün avantajı ' +
      'ikisini birden bilmek ve CV\'de bunu göstermek gerekiyor. Kullandığın ölçü aletlerini, ' +
      'PLC ya da mikrodenetleyici deneyimini ve varsa yaptığın bir düzeneği belirt. Küçük bir ' +
      'otomasyon projesi, bu alanda en güçlü CV satırı.',
    sss: [
      {
        soru: 'Mekatronik stajı nerede yapılır?',
        cevap:
          'Fabrikaların bakım ekipleri, endüstriyel otomasyon firmaları, robot entegratörleri, ' +
          'makine imalatçılarının montaj birimleri ve teknik servisler.',
      },
      {
        soru: 'PLC bilmeden staja başvurabilir miyim?',
        cevap:
          'Başvurabilirsin, öğretiliyor. Ama temel merdiven mantığını önceden görmek ilk haftayı ' +
          'çok kolaylaştırıyor ve mülakatta ilgi göstergesi olarak okunuyor.',
      },
      {
        soru: 'Bakım ekibinde staj yapmak nasıl?',
        cevap:
          'Plansız ve hızlı: arıza çıkıyor, ekiple gidiyorsun. Öğrenmek açısından en verimli ' +
          'ortamlardan biri çünkü sistemin nerede kırıldığını canlı görüyorsun.',
      },
      {
        soru: 'Mekanik mi elektronik mi tarafına yönelmeliyim?',
        cevap:
          'İkisini birden bilmek bu bölümün asıl değeri. Yine de birini biraz daha derinleştirmek, ' +
          'başvuruda ne yapabileceğini net söylemeni sağlıyor.',
      },
      {
        soru: 'Robot programlama öğrenmeli miyim?',
        cevap:
          'Üretim hücrelerinde robot kullanımı artıyor ve bilen teknik eleman az. Temel düzeyde ' +
          'bile görmüş olmak entegratör firmalarında doğrudan avantaj.',
      },
      {
        soru: 'Mekatronik stajı işe dönüşür mü?',
        cevap:
          'Sanayide bakım ve otomasyon tarafında eleman ihtiyacı sürekli. İşi öğrenen bir stajyeri ' +
          'tutmak işletme için en kolay yol; ihtimal bu alanda görece yüksek.',
      },
    ],
    guncelleme: '2026-08-17',
  },

  /* ----------------------------------------------------- iktisadi ve idari */
  {
    slug: 'isletme',
    ad: 'İşletme',
    grup: 'sosyal',
    ozet: 'Staj yeri bol ama iş tanımı belirsiz; hangi birimi istediğini söylemek şart.',
    aciklama:
      'İşletme stajı nerede yapılır, stajyer hangi birimlerde çalışır ve ' +
      'başvuruda ne öne çıkarılmalı.',
    nerede: [
      'Şirketlerin insan kaynakları, pazarlama, finans veya satış birimleri',
      'Bankaların şubeleri ve genel müdürlük birimleri',
      'Danışmanlık ve denetim firmaları',
      'Küçük işletmelerin genel yönetimi',
    ],
    isler: [
      'Rapor ve sunum hazırlamak',
      'Veri girmek ve tablo düzenlemek',
      'Toplantı notu tutmak',
      'Birime göre değişir: İK\'da özgeçmiş taraması, pazarlamada içerik desteği',
    ],
    hazirlik: [
      'Excel ve PowerPoint — bu bölümde en çok kullanılan iki araç',
      'Temel mali tablo okuma',
      'İngilizce; çok uluslu şirketlerde ilk eleme kriteri',
    ],
    aranan: [
      'Hangi birimde çalışmak istediğini bilmek',
      'Yazılı ifade — rapor ve e-posta yazacaksın',
      'Sunum yapabilme',
    ],
    ipucu:
      '"İşletme okuyorum, staj arıyorum" cümlesi hiçbir kapıyı açmıyor. "Pazarlama ' +
      'biriminde staj arıyorum" cümlesi açıyor. Bir birim seç.',
    aramaKelimeleri: ['işletme', 'insan kaynakları', 'pazarlama'],
    giris:
      'İşletme, öğrenci sayısı en yüksek bölümlerden biri ve staj tarafındaki asıl zorluk da ' +
      'buradan geliyor: alan çok geniş olduğu için "işletme stajı" diye başvurmak, işverene ne ' +
      'yapabileceğin hakkında hiçbir şey söylemiyor. Aynı bölümden bir öğrenci insan ' +
      'kaynaklarında, diğeri pazarlamada, üçüncüsü finansta staj yapıyor ve üçünün işi ' +
      'birbirine benzemiyor. Hangi tarafa gitmek istediğine baştan karar vermek, hem doğru yeri ' +
      'bulmayı hem de kabul alma ihtimalini ciddi biçimde artırıyor. Bu sayfada o tarafları, ' +
      'stajyere verilen gerçek işleri ve başvuru ipuçlarını bulacaksın.',
    pozisyonlar: [
      'İnsan kaynakları — işe alım ve özlük tarafı',
      'Pazarlama ve dijital pazarlama',
      'Finans, bütçe ve raporlama',
      'Satın alma ve tedarik',
      'Satış ve müşteri ilişkileri',
    ],
    dikkat: [
      'Tek bir tarafı seç ve başvuruda onu söyle. "İşletme öğrencisiyim, her işi yaparım" ' +
        'cümlesi, hiçbir işe uygun görünmemekle aynı sonucu veriyor.',
      'Bu bölümde rekabet yüksek çünkü aday çok. Ayrıştıran şey not ortalaması değil, ' +
        'gösterebildiğin bir çalışma: kulüp bütçesi, düzenlediğin etkinlik, hazırladığın rapor.',
      'İnsan kaynakları stajı en çok istenen ama kontenjanı en az olan taraf. Finans ve satın ' +
        'alma tarafında rekabet belirgin biçimde daha düşük.',
      'Küçük ve orta ölçekli işletmeler bu bölümden stajyer almaya açık ama ilan açmıyor. ' +
        'Doğrudan yazmak, ilan beklemekten çok daha hızlı sonuç veriyor.',
    ],
    cvIpucu:
      'Her satırı sayıyla destekle: kaç kişilik ekip, kaç katılımcı, ne kadar bütçe. Sayısı ' +
      'olmayan bir başarı, okuyanın kafasında hiçbir yer kaplamıyor. Excel seviyeni belirt ve ' +
      'hedeflediğin tarafa göre CV\'nin en üstüne tek cümlelik bir yön koy: "finans alanında ' +
      'staj arıyorum" gibi. Aynı CV\'yi beş farklı alana göndermek en yaygın hata.',
    sss: [
      {
        soru: 'İşletme stajı hangi alanlarda yapılabilir?',
        cevap:
          'İnsan kaynakları, pazarlama, finans ve muhasebe, satın alma, satış ve operasyon. Bunlar ' +
          'birbirinden oldukça farklı işler; hangisini istediğine baştan karar vermek başvurunun ' +
          'kabul alma ihtimalini artırıyor.',
      },
      {
        soru: 'Staja hangi sınıfta başvurmalıyım?',
        cevap:
          'Zorunlu stajın hangi sınıfta olduğunu okulun yönergesi belirliyor. Ama gönüllü staj için ' +
          'beklemeye gerek yok; erken yapılan bir staj, zorunlu staj başvurusunda seni diğer ' +
          'adaylardan öne çıkarıyor.',
      },
      {
        soru: 'Not ortalamam düşükse şansım var mı?',
        cevap:
          'Çoğu işveren stajyerde ortalamaya bakmıyor. Baktığı şey gösterebildiğin bir çalışma ve ' +
          'iletişim. Kulüp, gönüllü iş ya da yarı zamanlı bir iş deneyimi, ortalamadan daha güçlü ' +
          'bir sinyal.',
      },
      {
        soru: 'İnsan kaynakları stajı bulmak neden zor?',
        cevap:
          'Talep çok, kontenjan az: her işletme öğrencisi oraya başvuruyor ama İK ekipleri genelde ' +
          'küçük. Finans, satın alma ve operasyon taraflarında aynı şirkette bile rekabet çok daha ' +
          'düşük olabiliyor.',
      },
      {
        soru: 'Küçük bir şirkette staj yapmak CV\'de zayıf durur mu?',
        cevap:
          'Durmuyor. Okuyan kişi şirketin adına değil, senin ne yaptığına bakıyor. Küçük şirkette ' +
          'stajyer genelde işin tamamını görüyor; büyük şirkette tek bir alt sürecin küçük bir ' +
          'parçasını. Anlatacak şey açısından küçük şirket çoğu zaman daha zengin.',
      },
      {
        soru: 'İşletme stajında bana gerçek iş verilir mi?',
        cevap:
          'Verilmesi büyük ölçüde senin talebine bağlı. "Şu raporu ben hazırlayabilir miyim" demek, ' +
          'çoğu ekipte kapı açıyor. Sormayan stajyer genelde izleyerek geçiriyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'iktisat',
    ad: 'İktisat / Ekonomi',
    grup: 'sosyal',
    ozet: 'Veri ve analiz tarafına yönelenler çok daha kolay staj buluyor.',
    aciklama:
      'İktisat stajı nerede yapılır, stajyer ne iş yapar ve hangi araçlar ' +
      'başvuruyu güçlendirir.',
    nerede: [
      'Bankaların ekonomik araştırma ve kredi birimleri',
      'Aracı kurumlar ve portföy şirketleri',
      'Araştırma şirketleri',
      'Kamu kurumlarının istatistik ve planlama birimleri',
    ],
    isler: [
      'Veri toplamak ve düzenlemek',
      'Sektör raporu için kaynak taraması yapmak',
      'Grafik ve tablo hazırlamak',
      'Rapor taslaklarına destek olmak',
    ],
    hazirlik: [
      'Excel ileri seviye',
      'İstatistik dersini ciddiye almak',
      'Python veya R\'da temel veri işleme — bu bölümde en büyük fark yaratan şey',
      'Resmî veri kaynaklarını tanımak (TÜİK, TCMB)',
    ],
    aranan: [
      'Sayısal veriyi yorumlayabilmek',
      'Yazılı anlatım',
      'İngilizce rapor okuyabilmek',
    ],
    ipucu:
      'Teorik ders notu herkeste var. Gerçek bir veri setiyle yapılmış küçük bir analiz ' +
      'çok az kişide var — ayrışmak istiyorsan orada ayrış.',
    aramaKelimeleri: ['ekonomi', 'analiz', 'finans'],
    giris:
      'İktisat bölümünün staj tarafındaki en büyük sorunu, mezuniyet sonrası çalışılan ' +
      'alanların net olmaması: öğrenci "iktisatçı stajyer" diye bir ilan aradığında karşısına ' +
      'çok az şey çıkıyor. Oysa bu bölümün mezunları bankacılıktan araştırma birimlerine, kamu ' +
      'kurumlarından veri analizi işlerine kadar geniş bir alanda çalışıyor. Yapılması gereken, ' +
      'bölüm adıyla değil yapılacak işle aramak. Bu sayfada hangi tür kurumların bu bölümden ' +
      'stajyer aldığını, stajyere verilen gerçek işleri ve başvurmadan önce hangi araçları ' +
      'öğrenmenin işe yaradığını bulacaksın.',
    pozisyonlar: [
      'Bankaların şube ve genel müdürlük birimleri',
      'Araştırma ve ekonomi analiz birimleri',
      'Kamu kurumları ve düzenleyici kuruluşlar',
      'Danışmanlık ve denetim şirketleri',
      'Şirketlerin finans, bütçe ve raporlama birimleri',
    ],
    dikkat: [
      'İlan ararken bölüm adını değil işi ara: "analiz", "raporlama", "bütçe", "araştırma". Bu ' +
        'bölümden stajyer alan çok kurum ilanında iktisat kelimesini hiç geçirmiyor.',
      'Banka staj programlarının başvuru dönemi erken açılıp erken kapanıyor ve genellikle ' +
        'kendi kariyer sayfaları üzerinden yürüyor.',
      'Kamu kurumlarında staj için evrak süreci uzun; başvuruyu aylar öncesinden başlatmak ' +
        'gerekiyor.',
      'Veri ile çalışabilmek bu bölümde en büyük fark yaratıcı. Excel\'in ötesine geçen (SQL, ' +
        'Python, R, Stata gibi) tek bir araç bile CV\'ni ayırıyor.',
    ],
    cvIpucu:
      'Kullandığın analiz araçlarını seviye belirterek yaz — bu bölümde en çok atlanan ve en ' +
      'çok işe yarayan satır bu. Bir ders projesinde veri toplayıp analiz ettiysen onu bir iş ' +
      'deneyimi gibi anlat: hangi veriyi, hangi yöntemle, ne sonuçla. İngilizce seviyeni de ' +
      'belirt; araştırma ve bankacılık tarafında kaynakların çoğu İngilizce.',
    sss: [
      {
        soru: 'İktisat stajı nerede yapılır?',
        cevap:
          'Bankalar, araştırma birimleri, kamu kurumları, danışmanlık ve denetim şirketleri, ' +
          'şirketlerin finans ve bütçe birimleri. Sanayi şirketlerinin raporlama tarafı da bu ' +
          'bölümden stajyer alıyor.',
      },
      {
        soru: 'Banka stajına nasıl başvurulur?',
        cevap:
          'Çoğu banka staj programını kendi kariyer sayfasından duyuruyor ve başvuru dönemi erken ' +
          'kapanıyor. Aracı sitelerde çıkmadan önce ilan orada yayımlanıyor, o yüzden doğrudan ' +
          'takip etmek gerekiyor.',
      },
      {
        soru: 'Hangi programları öğrenmeliyim?',
        cevap:
          'Önce Excel\'i gerçekten öğren: pivot tablo, arama fonksiyonları, temel grafikler. Sonra ' +
          'bir veri aracı ekle — SQL en çok işe yarayanı, Python ya da R ise araştırma tarafında ' +
          'ayırt edici.',
      },
      {
        soru: 'İktisat mezunu olarak sadece bankada mı çalışılır?',
        cevap:
          'Hayır. Veri, analiz ve raporlama olan her yerde iş var. Staj yerini seçerken de bunu ' +
          'esas almak, ilan bulma sorununu büyük ölçüde çözüyor.',
      },
      {
        soru: 'İktisat stajı için İngilizce şart mı?',
        cevap:
          'Şart değil ama araştırma ve bankacılık tarafında kaynakların çoğu İngilizce, o yüzden ' +
          'okuma seviyesinde bilmek belirgin fark yaratıyor. CV\'de seviyeni belirtmek, ' +
          'belirtmemekten iyi.',
      },
      {
        soru: 'Kamu kurumunda staj başvurusu nasıl yapılır?',
        cevap:
          'Kurumun kendi duyuru sayfası üzerinden; aracı sitelerde genelde yayımlanmıyor. Evrak ' +
          'süreci uzun olduğu için aylar öncesinden başlamak ve aynı anda özel sektöre de başvurup ' +
          'seçenek bırakmak gerekiyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },

  /* ------------------------------------------------------ tasarım/iletişim */
  {
    slug: 'grafik-tasarim',
    ad: 'Grafik Tasarım',
    grup: 'tasarim',
    ozet: 'Portfolyo olmadan başvuru yapılmıyor; CV ikinci planda.',
    aciklama:
      'Grafik tasarım stajı nerede yapılır, stajyer ne iş yapar ve portfolyoda ' +
      'ne olmalı.',
    nerede: [
      'Reklam ve dijital ajanslar',
      'Markaların kendi pazarlama birimleri',
      'Matbaa ve baskı öncesi hazırlık firmaları',
      'Oyun ve yazılım şirketlerinin tasarım ekipleri',
    ],
    isler: [
      'Sosyal medya görselleri hazırlamak',
      'Var olan tasarımları farklı ölçülere uyarlamak',
      'Sunum ve katalog düzenlemek',
      'Baskı öncesi dosya hazırlığı',
    ],
    hazirlik: [
      'Adobe Photoshop, Illustrator, InDesign',
      'Figma — dijital tarafta artık standart',
      'Tipografi ve ızgara düzeni bilgisi',
      'Baskı ölçüleri ve renk profilleri (CMYK/RGB farkı)',
    ],
    aranan: [
      'Portfolyo. Bu bölümde başvurunun kendisi portfolyodur.',
      'Bir tasarımı neden öyle yaptığını anlatabilmek',
      'Geri bildirime açıklık — ajanslarda revizyon işin yarısı',
    ],
    ipucu:
      'Portfolyona her işini koyma. Beş güçlü iş, on beş ortalama işten iyi; ' +
      'değerlendiren kişi en zayıf işine bakarak karar veriyor.',
    aramaKelimeleri: ['tasarım', 'grafik', 'sosyal medya'],
    giris:
      'Grafik tasarımda staj başvurusunun kaderini CV değil portfolyo belirliyor. İşveren önce ' +
      'işine bakıyor, sonra kim olduğuna. Bu bölümün öğrencileri için asıl sorun da burada: ' +
      'okul projeleri var ama toparlanmış, gösterilebilir bir portfolyo yok. Oysa portfolyo ' +
      'hazırlamak birkaç günlük iş ve başvurunun tamamını değiştiriyor. Bu sayfada hangi tür ' +
      'yerlerin stajyer aldığını, stajyere verilen gerçek işleri, portfolyoda nelerin işe ' +
      'yaradığını ve başvururken atlanan noktaları bulacaksın.',
    pozisyonlar: [
      'Reklam ve dijital ajanslar',
      'Markaların kendi tasarım ve pazarlama ekipleri',
      'Matbaa ve baskı öncesi hazırlık',
      'Oyun ve yazılım şirketlerinde arayüz tasarımı',
      'Yayıncılık ve editoryal tasarım',
    ],
    dikkat: [
      'Portfolyosuz başvuru bu alanda neredeyse hiç cevap almıyor. Üç beş işi düzgün bir ' +
        'sunumda toplamak, başvurunun en belirleyici parçası.',
      'Ajansta tempo yüksek ve çok iş görüyorsun; marka tarafında ise tek bir görsel dili ' +
        'derinlemesine öğreniyorsun. İkisini karıştırma.',
      'Baskı tarafı okulda az anlatılıyor ama piyasada çok isteniyor: renk profili, taşma payı, ' +
        'çözünürlük. Bunları bilmek stajda hemen fark ediliyor.',
      '"Görünürlük karşılığı ücretsiz iş" teklifleri bu alanda yaygın. Zorunlu stajda 3308 ' +
        'kapsamındaysan ücret ödenmesi gerektiğini bil ve baştan sor.',
    ],
    cvIpucu:
      'CV\'nin en üstünde portfolyo bağlantısı olsun ve mutlaka açılıyor mu diye kontrol et. ' +
      'Her işin yanına bir cümle koy: sorun neydi, ne çözdün. Görsel yığını, seçilmiş beş iş ' +
      'kadar etkili olmuyor. Kullandığın programları ve baskı bilgini yazmayı unutma; işverenin ' +
      'ilk sorularından biri bu.',
    sss: [
      {
        soru: 'Grafik tasarım portfolyosunda ne olmalı?',
        cevap:
          'Seçilmiş beş sekiz iş ve her birinin yanında kısa bir açıklama: sorun neydi, ne yaptın, ' +
          'neden öyle yaptın. Okul projesi olması sorun değil; anlatabiliyor olman önemli.',
      },
      {
        soru: 'Grafik tasarım stajı için hangi programlar isteniyor?',
        cevap:
          'Vektör ve piksel tarafında birer program temel şart. Arayüz tasarımı hedefliyorsan bir ' +
          'arayüz aracı, hareketli içerik için basit bir animasyon aracı ekleniyor.',
      },
      {
        soru: 'Ajans mı, marka tarafı mı daha iyi?',
        cevap:
          'Ajansta kısa sürede çok iş ve çok marka görüyorsun; marka tarafında tek bir görsel dili ' +
          'derinleştiriyorsun. Ne öğrenmek istediğine göre değişiyor.',
      },
      {
        soru: 'Baskı bilgisi gerçekten gerekli mi?',
        cevap:
          'Matbaa ve ambalaj tarafında evet, ve okulda çoğunlukla yüzeysel geçiliyor. Taşma payı, ' +
          'renk profili ve çözünürlüğü bilen stajyer, ilk günden gerçek iş alıyor.',
      },
      {
        soru: 'Freelance yaptığım işleri CV\'ye yazabilir miyim?',
        cevap:
          'Yazmalısın. Ücretli ya da gönüllü fark etmez; gerçek bir müşteri için yapılmış iş, okul ' +
          'projesinden daha güçlü bir satır. Müşteri adını paylaşmadan önce izin al.',
      },
      {
        soru: 'Uzaktan tasarım stajı olur mu?',
        cevap:
          'Bu alanda uzaktan staj yaygın. Ancak okulunun kabul edip etmediğini staj yönergesinden ' +
          'teyit et; bazı bölümler iş yerinde bulunmayı şart koşuyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'halkla-iliskiler-ve-pazarlama',
    ad: 'Halkla İlişkiler ve Pazarlama',
    grup: 'tasarim',
    ozet: 'Dijital pazarlama bilenler öne geçiyor; yazı yazabilmek en aranan beceri.',
    aciklama:
      'Halkla ilişkiler ve pazarlama stajı nerede yapılır, stajyerin görevleri ' +
      've aranan beceriler.',
    nerede: [
      'Reklam, halkla ilişkiler ve dijital ajanslar',
      'Markaların pazarlama ve iletişim birimleri',
      'E-ticaret şirketleri',
      'Etkinlik ve organizasyon firmaları',
    ],
    isler: [
      'Sosyal medya içeriği yazmak ve planlamak',
      'Basın bülteni ve duyuru metni taslağı hazırlamak',
      'Rakip ve sektör takibi yapmak',
      'Kampanya sonuçlarını raporlamak',
    ],
    hazirlik: [
      'Yazı yazabilmek — bu alanda tek gerçek temel beceri',
      'Sosyal medya araçlarını yönetici tarafından tanımak',
      'Google Analytics gibi bir ölçüm aracına göz atmış olmak',
      'Temel görsel düzenleme (Canva yeterli başlangıç)',
    ],
    aranan: [
      'Yazdığın örnek metinler',
      'Kendi yürüttüğün bir hesap veya proje',
      'Takip ettiğin markalar hakkında fikir sahibi olmak',
    ],
    ipucu:
      'Başvuru yazın zaten bir yazma örneğidir. Özensiz bir e-posta, bu alanda ' +
      'CV\'deki her şeyi geçersiz kılıyor.',
    aramaKelimeleri: ['pazarlama', 'sosyal medya', 'iletişim'],
    giris:
      'Pazarlama, staj ilanı görece çok çıkan alanlardan biri — ama başvuranların çoğu aynı ' +
      'cümleyle geliyor: "sosyal medyayı iyi kullanıyorum". Bu, işverene hiçbir şey anlatmıyor, ' +
      'çünkü herkes kullanıyor. Ayrıştıran şey, bir hesabı ya da içeriği gerçekten yönetmiş ' +
      'olmak: kaç kişiye ulaştı, ne değişti, neyi denedin. Bu bölümde staj bulmanın yolu da ' +
      'buradan geçiyor. Bu sayfada hangi tür kurumların stajyer aldığını, stajyere verilen ' +
      'gerçek işleri, hangi araçları öğrenmenin işe yaradığını ve başvuruda nelere dikkat etmen ' +
      'gerektiğini bulacaksın.',
    pozisyonlar: [
      'Dijital pazarlama ve sosyal medya stajı',
      'İçerik üretimi ve metin yazarlığı',
      'Marka ve iletişim ajanslarında müşteri ilişkileri',
      'Etkinlik ve organizasyon tarafı',
      'Pazar araştırması ve rakip analizi',
    ],
    dikkat: [
      '"Sosyal medyayı iyi kullanıyorum" cümlesi başvuruda bir şey ifade etmiyor. Yönettiğin ' +
        'bir hesap, yazdığın bir metin ya da düzenlediğin bir etkinlik varsa onu göster.',
      'Ajanslarda tempo yüksek ve aynı anda birçok markaya dokunuyorsun; marka tarafında ise ' +
        'tek bir işi derinlemesine öğreniyorsun. İkisi çok farklı deneyimler.',
      'Bu alanda "portfolyo" beklentisi var ama kimse söylemiyor. Üç beş örnek çalışmayı bir ' +
        'araya getirmek, başvurunun en güçlü parçası oluyor.',
      'Ücretsiz staj teklifleri bu alanda yaygın. Zorunlu stajda 3308 kapsamındaysan ücret ' +
        'ödenmesi gerektiğini bil ve baştan sor.',
    ],
    cvIpucu:
      'Yaptığın işi sayıyla anlat: kaç gönderi, kaç katılımcı, ne kadar erişim. Sayısı olmayan ' +
      'bir pazarlama satırı okuyanın kafasında yer kaplamıyor. Kullandığın araçları listele ' +
      '(tasarım, planlama, analiz) ve varsa örnek çalışmalarına bir bağlantı ekle. Kendi ' +
      'yürüttüğün küçük bir hesap bile, hiç örneği olmayan onlarca CV\'nin arasından seni ' +
      'ayırıyor.',
    sss: [
      {
        soru: 'Pazarlama stajı için tasarım bilmek şart mı?',
        cevap:
          'Şart değil ama basit görsel hazırlayabilmek neredeyse her ilanda işe yarıyor. Bir ' +
          'tasarım aracını temel düzeyde kullanabilmek, stajın ilk gününden itibaren iş almanı ' +
          'sağlıyor.',
      },
      {
        soru: 'Ajansta mı, markanın kendi ekibinde mi staj yapmalıyım?',
        cevap:
          'Ajans hızlı ve çeşitli: kısa sürede çok iş görüyorsun. Marka tarafı yavaş ve derin: tek ' +
          'bir işin tamamını öğreniyorsun. Ne öğrenmek istediğine göre seç; ikisi de değerli.',
      },
      {
        soru: 'Portfolyom yoksa ne yapmalıyım?',
        cevap:
          'Bir hafta içinde kurabilirsin. Kendi seçtiğin bir marka için üç örnek gönderi tasarla, ' +
          'bir tanıtım metni yaz, kısa bir rakip analizi çıkar. Hayali bile olsa, çalışma ' +
          'gösterebilmek hiçbir şey göstermemekten çok daha güçlü.',
      },
      {
        soru: 'Hangi araçları öğrenmeliyim?',
        cevap:
          'Bir tasarım aracı, bir içerik planlama aracı ve temel analiz okuma becerisi. Bunun ' +
          'üstüne Excel\'de veri düzenleyebilmek, çoğu adayın atladığı ve işverenin çok değer ' +
          'verdiği bir şey.',
      },
      {
        soru: 'Halkla ilişkiler ile pazarlama aynı şey mi?',
        cevap:
          'Aynı değil ama iç içe. Halkla ilişkiler kurumun itibarını ve iletişimini yönetiyor, ' +
          'pazarlama ürünün satışını hedefliyor. Staj ilanlarında ikisi çoğu zaman aynı ekipte ' +
          'birleşiyor.',
      },
      {
        soru: 'Uzaktan pazarlama stajı yapabilir miyim?',
        cevap:
          'Bu alanda uzaktan staj mümkün ve ilanı da var. Ancak okulunun uzaktan yapılan stajı ' +
          'kabul edip etmediğini staj yönergesinden teyit et; bazı bölümler iş yerinde fiziken ' +
          'bulunmayı şart koşuyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'moda-tasarimi',
    ad: 'Moda Tasarımı',
    grup: 'tasarim',
    ozet: 'Koleksiyon ve ürün geliştirme; portfolyo olmadan kapı açılmıyor.',
    aciklama:
      'Moda tasarımı stajı nerede yapılır, stajyer ne iş yapar ve portfolyoda ' +
      'ne olması gerekir.',
    nerede: [
      'Hazır giyim markalarının tasarım ve ürün geliştirme ekipleri',
      'Bağımsız tasarımcı atölyeleri',
      'Konfeksiyon firmalarının model evleri',
      'Tekstil ihracatçılarının koleksiyon birimleri',
    ],
    isler: [
      'Trend araştırması yapmak ve pano hazırlamak',
      'Teknik çizim ve ürün dosyası hazırlamak',
      'Kumaş ve aksesuar seçimine eşlik etmek',
      'Numune sürecini takip etmek',
    ],
    hazirlik: [
      'Teknik çizim — serbest eskiz tek başına yetmiyor',
      'Adobe Illustrator ve Photoshop',
      'Kumaş bilgisi: cins, gramaj, davranış',
      'Bir koleksiyon fikrini baştan sona anlatabilmek',
    ],
    aranan: [
      'Portfolyo — başvurunun kendisi bu',
      'Üretim gerçeğini bilmek; dikilemeyen tasarım işe yaramıyor',
      'Ekip içinde çalışabilmek',
    ],
    ipucu:
      'Portfolyona sadece çizim koyma. Çizimin yanına dikilmiş hâlinin fotoğrafını ' +
      'koyduğunda değerlendiren kişi senin üretimi bildiğini anlıyor.',
    aramaKelimeleri: ['moda', 'tasarım', 'tekstil'],
    giris:
      'Moda tasarımı stajında, tasarım fikrinin üretimle karşılaştığı yeri görüyorsun ve okulda ' +
      'öğrenilemeyen tarafın tamamı orada: kalıp tutmayan bir tasarım, maliyeti çıkmayan bir ' +
      'kumaş, dikilemeyen bir detay. Bu yüzden yalnızca çizim yapılan bir yerde kalmak eksik ' +
      'bir staj oluyor; numune ve kalıp tarafını da görmek gerekiyor. Bir de portfolyo gerçeği ' +
      'var: bu alanda başvurunun kaderini CV değil, gösterdiğin işler belirliyor. Bu sayfada ' +
      'nerede staj yapıldığını, stajyere verilen gerçek işleri ve portfolyoda nelerin işe ' +
      'yaradığını bulacaksın.',
    pozisyonlar: [
      'Model evleri ve numune bölümleri',
      'Markaların tasarım ekipleri',
      'Konfeksiyon üreticilerinin ürün geliştirme birimleri',
      'Kumaş ve aksesuar tedarikçileri',
      'Bağımsız tasarımcı atölyeleri',
    ],
    dikkat: [
      'Sadece çizim yapılan bir yerde kalmak eksik. Numune ve kalıp bölümünü görmek, tasarımın ' +
        'üretime nasıl döndüğünü öğretiyor.',
      'Kumaş bilgisi bu bölümün en zayıf kaldığı yer ve piyasada en çok sorulan şey. Staj ' +
        'boyunca gördüğün her kumaşın adını ve davranışını not al.',
      'Portfolyo başvurunun en belirleyici parçası; çizim kadar teknik çizim ve kalıp ' +
        'çalışmalarını da koymak, seni sadece çizim yapan adaylardan ayırıyor.',
      '"Görünürlük karşılığı ücretsiz çalışma" teklifleri bu alanda yaygın. Zorunlu stajda 3308 ' +
        'kapsamındaysan ücret ödenmesi gerektiğini bil ve baştan sor.',
    ],
    cvIpucu:
      'Portfolyo bağlantısı CV\'nin en üstünde olsun; bu alanda ilk bakılan yer orası. ' +
      'Portfolyoya sadece illüstrasyon değil, teknik çizim ve dikilmiş ürün fotoğrafı da koy — ' +
      'üretimi bildiğini gösteren şey bu. Kalıp ve tasarım programlarını seviye vererek yaz; ' +
      'dikiş ve kalıp becerini belirtmeyi unutma.',
    sss: [
      {
        soru: 'Moda tasarımı stajı nerede yapılır?',
        cevap:
          'Model evleri, markaların tasarım ekipleri, konfeksiyon üreticilerinin ürün geliştirme ' +
          'birimleri, kumaş ve aksesuar tedarikçileri, bağımsız tasarımcı atölyeleri.',
      },
      {
        soru: 'Stajda tasarım yapıyor muyum?',
        cevap:
          'İlk dönem çoğunlukla araştırma, kumaş ve aksesuar takibi, numune sürecine destek. Güven ' +
          'kazandıkça tasarım kararlarına dahil oluyorsun; küçük atölyelerde bu çok daha hızlı ' +
          'oluyor.',
      },
      {
        soru: 'Moda tasarımı portfolyosunda ne olmalı?',
        cevap:
          'İllüstrasyonun yanında teknik çizim ve dikilmiş ürün fotoğrafı. Üretim tarafını ' +
          'bildiğini gösteren portfolyo, sadece çizimden oluşandan çok daha güçlü.',
      },
      {
        soru: 'Kalıp bilmem gerekiyor mu?',
        cevap:
          'Zorunlu değil ama bilen tasarımcı sayısı az. Kalıbı anlayan biri, dikilemeyecek bir ' +
          'tasarım çizmiyor ve bu piyasada hemen fark ediliyor.',
      },
      {
        soru: 'Marka tarafında mı, üreticide mi staj yapmalıyım?',
        cevap:
          'Marka tarafı koleksiyon ve trend kararlarını, üretici ise ürünün nasıl doğduğunu ' +
          'gösteriyor. İkincisini görmemiş bir tasarımcı hep eksik kalıyor.',
      },
      {
        soru: 'Kumaş bilgisi neden bu kadar önemli?',
        cevap:
          'Çünkü tasarımın davranışını kumaş belirliyor: dökümü, esnemesi, dikilebilirliği. Kumaşı ' +
          'tanımayan bir tasarım kâğıtta güzel, üründe sorunlu oluyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'ic-mimarlik',
    ad: 'İç Mimarlık',
    grup: 'tasarim',
    ozet: 'Proje ofisi ve uygulama şantiyesi; çizim programı olmadan başvurulmuyor.',
    aciklama:
      'İç mimarlık stajı nerede yapılır, stajyerin görevleri ve gereken çizim ' +
      'programları.',
    nerede: [
      'İç mimarlık ve tasarım ofisleri',
      'Mimarlık bürolarının iç mekân ekipleri',
      'Mobilya ve mutfak üreticilerinin tasarım birimleri',
      'Uygulama ve taahhüt firmaları',
    ],
    isler: [
      'Ölçü almak ve mevcut durum çizimi hazırlamak',
      'Uygulama projesi ve detay çizimlerine destek olmak',
      'Malzeme ve mobilya araştırması yapmak',
      'Görselleştirme (render) hazırlamak',
    ],
    hazirlik: [
      'AutoCAD — proje ofisinin temel dili',
      'SketchUp veya 3ds Max ile görselleştirme',
      'Malzeme bilgisi: kaplama, boya, aydınlatma',
      'Detay çizimi okuyabilmek',
    ],
    aranan: [
      'Çizim programı bilgisi (ilanlarda birinci sırada)',
      'Küçük de olsa bir proje portfolyosu',
      'Şantiyeye çıkabilmek',
    ],
    ipucu:
      'Okul projelerinin render\'ı herkeste güzel. Ofisler asıl uygulama detayı çizebilen ' +
      'stajyer arıyor — bir detay çizimini portfolyona koy.',
    aramaKelimeleri: ['iç mimarlık', 'mimar', 'tasarım'],
    giris:
      'İç mimarlıkta staj, tasarımın kâğıttan çıkıp gerçek bir mekâna dönüştüğü yeri görme ' +
      'fırsatı ve bu, okulda öğrenilemeyen tarafın tamamı. Ölçü tutmayan bir detay, bulunamayan ' +
      'bir malzeme, bütçeye sığmayan bir fikir — bunlar ancak sahada öğreniliyor. Bu yüzden ' +
      'yalnızca çizim yapılan bir stüdyoda kalmak eksik bir staj oluyor; uygulama tarafını da ' +
      'görmek gerekiyor. Bu sayfada hangi tür ofis ve firmaların stajyer aldığını, stajyere ' +
      'verilen gerçek işleri, portfolyoda nelerin işe yaradığını ve başvuru ipuçlarını ' +
      'bulacaksın.',
    pozisyonlar: [
      'İç mimarlık ve tasarım stüdyoları',
      'Uygulama ve taahhüt firmaları (şantiye tarafı)',
      'Mobilya üreticilerinin tasarım birimleri',
      'Mağaza ve zincir marka konsept ekipleri',
      'Otel ve restoran projeleri yürüten ofisler',
    ],
    dikkat: [
      'Sadece çizim yapılan bir stüdyoda kalmak eksik bir staj. Uygulamayı da görmek, çizdiğin ' +
        'detayın sahada nasıl çözüldüğünü öğretiyor.',
      'Malzeme bilgisi bu bölümün en zayıf kaldığı yer ve piyasada en çok sorulan şey. Staj ' +
        'sırasında gördüğün her malzemenin adını ve kullanım yerini not al.',
      'Portfolyo başvurunun en belirleyici parçası. Bağlantısı açılmayan bir portfolyo, hiç ' +
        'portfolyo olmamasıyla aynı sonucu veriyor.',
      'Küçük ofislerde stajyerden gerçek üretim bekleniyor; büyük ofislerde sürecin bir ' +
        'parçasını görüyorsun. Ne öğrenmek istediğine göre seç.',
    ],
    cvIpucu:
      'Portfolyo bağlantısını CV\'nin en üstüne koy ve açıldığını kontrol et. Kullandığın ' +
      'çizim, modelleme ve görselleştirme programlarını ayrı ayrı yaz. Stüdyo projelerinden iki ' +
      'tanesini seçip ne yaptığını anlatmak, on projeyi listelemekten güçlü. Malzeme ve detay ' +
      'bilgin varsa bunu belirtmek, çoğu adayın atladığı bir avantaj.',
    sss: [
      {
        soru: 'İç mimarlık stajı nerede yapılır?',
        cevap:
          'Tasarım stüdyoları, uygulama ve taahhüt firmaları, mobilya üreticilerinin tasarım ' +
          'birimleri, mağaza konsept ekipleri ve otel-restoran projeleri yürüten ofisler.',
      },
      {
        soru: 'Stajda gerçekten tasarım yapıyor muyum?',
        cevap:
          'Genelde önce çizim, ölçü alma ve sunum hazırlığı veriliyor. Güven kazandıkça detay ' +
          'çözümüne ve tasarım kararlarına dahil oluyorsun. Küçük ofislerde bu çok daha hızlı ' +
          'oluyor.',
      },
      {
        soru: 'İç mimarlık stajı için hangi programlar isteniyor?',
        cevap:
          'Çizim tarafında AutoCAD, modelleme tarafında SketchUp ya da bir bina bilgi modelleme ' +
          'aracı, sunum tarafında görselleştirme ve grafik programları.',
      },
      {
        soru: 'Uygulama firmasında staj yapmak mantıklı mı?',
        cevap:
          'Çok mantıklı. Çizdiğin detayın sahada nasıl imal edildiğini, hangi malzemenin nerede ' +
          'çalışmadığını orada öğreniyorsun. Bunu görmemiş bir tasarımcı aynı hatayı yıllarca ' +
          'tekrarlıyor.',
      },
      {
        soru: 'İç mimarlık ile mimarlık stajı aynı yerde yapılabilir mi?',
        cevap:
          'Bazı ofisler ikisini birden yürütüyor ama okulun yönergesi kabul edilen iş yerini ' +
          'tanımlıyor. Belge sürecine girmeden önce bölüm staj sorumlusuna sor.',
      },
      {
        soru: 'Portfolyoda okul projeleri yeterli mi?',
        cevap:
          'Yeterli. Önemli olan projenin nerede yapıldığı değil, fikri ve çözümü anlatabilmen. Her ' +
          'projenin yanına bir iki cümlelik açıklama koymak fark yaratıyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'radyo-televizyon-ve-sinema',
    ad: 'Radyo, Televizyon ve Sinema',
    grup: 'tasarim',
    ozet: 'Sette ve kurguda; set stajı yorucu ama en çok öğreten yer.',
    aciklama:
      'Radyo televizyon ve sinema stajı nerede yapılır, stajyer sette ne iş ' +
      'yapar ve hangi programlar isteniyor.',
    nerede: [
      'Yapım şirketleri ve prodüksiyon setleri',
      'Televizyon kanallarının haber ve program birimleri',
      'Dijital içerik ve video ajansları',
      'Post prodüksiyon (kurgu) stüdyoları',
    ],
    isler: [
      'Sette ekibe destek olmak, ekipman taşımak ve hazırlamak',
      'Çekim planı ve devamlılık notu tutmak',
      'Kaba kurgu yapmak, malzeme arşivlemek',
      'Altyazı ve basit grafik hazırlamak',
    ],
    hazirlik: [
      'Adobe Premiere veya DaVinci Resolve',
      'Temel kamera ve ışık bilgisi',
      'Ses kaydının nasıl alındığı — en çok atlanan konu',
      'Kendi çektiğin kısa bir iş',
    ],
    aranan: [
      'Uzun saat çalışmaya hazır olmak; set saatleri düzensiz',
      'Gösterilebilir bir video işi',
      'Ekip içinde söz dinleyip inisiyatif alabilme dengesi',
    ],
    ipucu:
      'Set stajı fiziksel olarak zor ve çoğu zaman ücretsiz başlıyor. Buna rağmen bu ' +
      'sektörde işe girmenin neredeyse tek yolu; tanıdığın herkese haber ver.',
    aramaKelimeleri: ['medya', 'video', 'prodüksiyon'],
    giris:
      'Radyo, televizyon ve sinema bölümünde staj, sektöre girmenin neredeyse tek kapısı: bu ' +
      'alanda işe alım büyük ölçüde tanışıklıkla yürüyor ve set ortamına ilk kez stajyer olarak ' +
      'giriliyor. Bunun karşılığı ise ağır çalışma koşulları — uzun saatler, düzensiz program, ' +
      'hafta sonu çekimleri. Bunu bilerek gitmek şart. Bir de şu var: sette hiyerarşi net ve ' +
      'stajyerin işi genelde en temelden başlıyor. Bu sayfada hangi tür yerlerin stajyer ' +
      'aldığını, stajyerin gerçekte ne yaptığını ve başvururken bilmen gerekenleri bulacaksın.',
    pozisyonlar: [
      'Yapım şirketleri — dizi, film ve program setleri',
      'Televizyon kanallarının yayın ve haber birimleri',
      'Reklam prodüksiyon şirketleri',
      'Dijital içerik ve sosyal medya prodüksiyonu',
      'Kurgu, ses ve post prodüksiyon stüdyoları',
    ],
    dikkat: [
      'Set çalışması uzun ve düzensiz saatlere yayılıyor; hafta sonu çekimi normal. Bunu ' +
        'bilerek gitmek, ilk hafta bırakmamanın şartı.',
      'Bu sektörde işe alım büyük ölçüde tanışıklıkla yürüyor. Staj, sadece deneyim değil ' +
        'bağlantı kurma fırsatı; birlikte çalıştığın herkesle iletişimi koparma.',
      'Stajyerin işi en temelden başlıyor: ekipman taşıma, set düzeni, not tutma. Bu ' +
        'küçümsenecek bir şey değil — sette işleyişi böyle öğreniyorsun.',
      'Post prodüksiyon tarafı (kurgu, ses, renk) daha düzenli saatlerde çalışıyor. Set temposu ' +
        'sana uymuyorsa bu tarafa yönelmek mantıklı.',
    ],
    cvIpucu:
      'Kendi çektiğin ya da kurguladığın işlere bağlantı koy; bu alanda gösterilebilir iş her ' +
      'şeyden önemli. Kısa bir film, bir tanıtım videosu ya da düzenli ürettiğin içerik olsun ' +
      'fark etmez. Kullandığın kurgu ve ses programlarını, kamera deneyimini yaz. Sette hangi ' +
      'bölümde çalışmak istediğini belirtmek başvuruyu kişiselleştiriyor.',
    sss: [
      {
        soru: 'RTS stajı nerede yapılır?',
        cevap:
          'Yapım şirketleri, televizyon kanalları, reklam prodüksiyon şirketleri, dijital içerik ' +
          'üreticileri ve post prodüksiyon stüdyoları.',
      },
      {
        soru: 'Sette stajyer ne iş yapıyor?',
        cevap:
          'Set düzeni, ekipman taşıma ve hazırlık, not tutma, ekipler arası iletişim. İş temel ' +
          'görünüyor ama setin nasıl işlediğini öğrenmenin başka yolu yok.',
      },
      {
        soru: 'Çalışma saatleri gerçekten çok uzun mu?',
        cevap:
          'Set tarafında evet: çekim günleri uzun ve program düzensiz olabiliyor. Post prodüksiyon ' +
          've kanal içi birimler daha düzenli saatlerde çalışıyor.',
      },
      {
        soru: 'Kurgu programı bilmem gerekiyor mu?',
        cevap:
          'Post prodüksiyon tarafını hedefliyorsan şart. Set tarafında beklenmiyor ama bilmek, ' +
          'çekilen malzemenin nasıl kullanılacağını anlamanı sağlıyor.',
      },
      {
        soru: 'Kendi işim yoksa başvurabilir miyim?',
        cevap:
          'Başvurabilirsin ama küçük bir iş üretmek birkaç gününü alır ve başvurunun tamamını ' +
          'değiştirir. Telefonla çekilmiş, düzgün kurgulanmış kısa bir iş bile yeterli.',
      },
      {
        soru: 'Sette yapılan staj işe dönüşür mü?',
        cevap:
          'Sektörün işe alım biçimi buna dayanıyor: setteki ekipler tanıdıkları kişilerle çalışmayı ' +
          'tercih ediyor. Staj sonunda bağlantıyı korumak burada başka her yerden önemli.',
      },
    ],
    guncelleme: '2026-08-17',
  },

  /* --------------------------------------------------- mühendislik (devam) */
  {
    slug: 'mimarlik',
    ad: 'Mimarlık',
    grup: 'muhendislik',
    ozet: 'Proje ofisi ve şantiye ayrı stajlar; ofisler portfolyo istiyor.',
    aciklama:
      'Mimarlık stajı nasıl bulunur? Ofis ve şantiye stajı farkı, stajyerin ' +
      'görevleri ve gereken programlar.',
    nerede: [
      'Mimarlık ve proje ofisleri',
      'Müteahhitlik firmalarının proje birimleri',
      'Belediyelerin imar ve plan müdürlükleri',
      'Restorasyon ve koruma projeleri yürüten ofisler',
    ],
    isler: [
      'Proje çizimlerini düzenlemek, pafta hazırlamak',
      'Maket ve görselleştirme hazırlamak',
      'Mevzuat ve imar durumu araştırması yapmak',
      'Şantiyede uygulamayı projeyle karşılaştırmak',
    ],
    hazirlik: [
      'AutoCAD ve bir BIM programı (Revit, ArchiCAD)',
      'SketchUp ve görselleştirme',
      'Adobe InDesign — pafta ve sunum düzeni için',
      'İmar yönetmeliğinin temel kavramları',
    ],
    aranan: [
      'Portfolyo — mimarlıkta CV\'den önce buna bakılıyor',
      'BIM bilgisi; ofisler giderek bunu istiyor',
      'Çizim hızı ve titizlik',
    ],
    ipucu:
      'Portfolyonu PDF olarak ve 10 MB altında hazırla. Açılmayan ya da indirilemeyen ' +
      'portfolyo yüzünden okunmayan başvuru çok fazla.',
    aramaKelimeleri: ['mimar', 'proje', 'inşaat'],
    giris:
      'Mimarlık öğrencisinin staj tarafındaki ilk sorusu genelde şu oluyor: ofis stajı mı, ' +
      'şantiye stajı mı? Çoğu bölüm ikisini de istiyor ve ikisi tamamen farklı ortamlar. Ofiste ' +
      'çizim, sunum ve proje geliştirme var; şantiyede projenin gerçekte nasıl uygulandığını, ' +
      'çizimle imalatın nerede ayrıldığını görüyorsun. İkincisini görmemiş bir mimarın çizimi ' +
      'kâğıtta kalıyor. Bu sayfada iki staj türünün nerede yapıldığını, stajyere verilen gerçek ' +
      'işleri, hangi programların beklendiğini ve portfolyo tarafında nelere dikkat etmen ' +
      'gerektiğini bulacaksın.',
    pozisyonlar: [
      'Mimari proje ofisleri (ofis stajı)',
      'Şantiye ve uygulama tarafı',
      'İç mekân ve tasarım stüdyoları',
      'Restorasyon ve koruma projeleri',
      'Belediyelerin imar ve ruhsat birimleri',
    ],
    dikkat: [
      'Ofis stajı ile şantiye stajının hangisini nerede yapabileceğini okulun staj ' +
        'yönergesinden teyit et; yanlış yerde yapılan staj çoğu bölümde sayılmıyor.',
      'Küçük ofisler stajyerden gerçek üretim bekliyor, büyük ofisler ise sürecin bir parçasını ' +
        'gösteriyor. Küçük ofiste daha çok iş yapıyorsun, büyük ofiste daha kurumsal bir süreç ' +
        'görüyorsun.',
      'Portfolyo bu bölümde CV\'den önce bakılan şey. Bağlantısı olmayan ya da açılmayan bir ' +
        'portfolyo, başvurunun en zayıf noktası oluyor.',
      'Şantiyeye kişisel koruyucu donanımsız girilmiyor ve ortam tozlu, gürültülü. Ofis ' +
        'stajıyla karıştırılmasın.',
    ],
    cvIpucu:
      'CV\'nin başına portfolyo bağlantısını koy ve açıldığından emin ol; bu bölümde ilk ' +
      'bakılan yer orası. Kullandığın programları seviye vererek yaz: çizim, modelleme ve ' +
      'görselleştirme ayrı ayrı. Stüdyo projelerinden en güçlü ikisini seç ve ne yaptığını ' +
      'kısaca anlat — otuz proje listelemek yerine iki projeyi iyi anlatmak daha güçlü.',
    sss: [
      {
        soru: 'Ofis stajı ile şantiye stajı arasındaki fark nedir?',
        cevap:
          'Ofis stajında çizim, sunum ve proje geliştirme yapıyorsun. Şantiye stajında projenin ' +
          'nasıl uygulandığını yerinde görüyorsun: kalıp, imalat, detayların sahada nasıl ' +
          'çözüldüğü. Çoğu bölüm ikisini ayrı ayrı istiyor.',
      },
      {
        soru: 'Mimarlık stajı için hangi programlar isteniyor?',
        cevap:
          'Çizim tarafında AutoCAD, modelleme tarafında bir bina bilgi modelleme aracı ve SketchUp ' +
          'yaygın. Görselleştirme ve grafik programları ise sunum tarafında ayırt edici oluyor.',
      },
      {
        soru: 'Portfolyoda kaç proje olmalı?',
        cevap:
          'Az ve iyi. Beş projeyi düzgün anlatmak, yirmi projeyi görsel yığını hâlinde koymaktan ' +
          'güçlü. Her projede fikri, çözümü ve senin katkını bir iki cümleyle yaz.',
      },
      {
        soru: 'Küçük ofiste staj yapmak dezavantaj mı?',
        cevap:
          'Tam tersi olabiliyor. Küçük ofiste projenin tamamına dokunuyorsun; büyük ofiste genelde ' +
          'tek bir aşamayı görüyorsun. CV\'de anlatacak şey açısından küçük ofis çoğu zaman daha ' +
          'zengin.',
      },
      {
        soru: 'Belediyede staj yapılabilir mi?',
        cevap:
          'Yapılabiliyor; imar ve ruhsat birimleri stajyer alıyor. Mevzuat ve onay süreçlerini ' +
          'içeriden görmek, serbest çalışacaksan doğrudan işine yarayan bir deneyim.',
      },
      {
        soru: 'Staj için çizim yarışması deneyimi işe yarar mı?',
        cevap:
          'Yarıyor. Katıldığın bir yarışma, teslim disiplinini ve fikir üretebildiğini gösteriyor. ' +
          'Derece almamış olman önemli değil; süreci tamamlamış olman önemli.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'kimya-muhendisligi',
    ad: 'Kimya Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Proses ve laboratuvar; kimya sanayi kadar gıda ve ilaçta da staj var.',
    aciklama:
      'Kimya mühendisliği stajı nerede yapılır, stajyer ne iş yapar ve hangi ' +
      'güvenlik kuralları geçerli.',
    nerede: [
      'Kimya, boya, plastik ve rafineri tesisleri',
      'İlaç ve kozmetik üreticileri',
      'Gıda sanayinin proses birimleri',
      'Arıtma ve çevre teknolojileri firmaları',
    ],
    isler: [
      'Proses akış şemasını incelemek',
      'Laboratuvarda analiz yapmak ve sonuç kaydetmek',
      'Kalite kontrol numunelerine eşlik etmek',
      'Verimlilik ve tüketim verisi toplamak',
    ],
    hazirlik: [
      'Kütle ve enerji denkliği — sahada ilk sorulan şey',
      'Laboratuvar güvenliği ve kimyasal etiketleri',
      'Excel ile veri işleme',
      'Proses simülasyonu görmüş olmak (Aspen gibi)',
    ],
    aranan: [
      'İş güvenliği bilinci — bu sektörde tek başına eleme sebebi',
      'Laboratuvar disiplini',
      'Kişisel koruyucu donanım kullanımına uyum',
    ],
    ipucu:
      'Tesis stajlarında güvenlik eğitimi ilk gün veriliyor ve ciddiye alınıyor. ' +
      'Buradaki tavrın, staj sonu değerlendirmenin yarısı.',
    aramaKelimeleri: ['kimya', 'proses', 'laboratuvar'],
    giris:
      'Kimya mühendisliğinde staj yeri bulmanın önündeki en büyük engel, öğrencilerin çoğunun ' +
      'yalnızca büyük kimya ve ilaç şirketlerine bakması. Oysa bu bölümün mezunları gıdadan ' +
      'boyaya, kozmetikten arıtmaya çok geniş bir alanda çalışıyor ve o tesislerin hepsinde ' +
      'laboratuvar ve üretim birimi var. Bir de güvenlik tarafı var: kimyasalla çalışılan her ' +
      'yerde stajyerden önce iş güvenliği eğitimi bekleniyor. Bu sayfada hangi tesislerin ' +
      'stajyer aldığını, stajyere verilen gerçek işleri ve başvurmadan önce bilmen gerekenleri ' +
      'bulacaksın.',
    pozisyonlar: [
      'Üretim ve proses tarafı',
      'Kalite kontrol laboratuvarı',
      'Ar-Ge ve ürün geliştirme',
      'Arıtma ve çevre tesisleri',
      'İlaç, kozmetik ve gıda üretim tesisleri',
    ],
    dikkat: [
      'Yalnızca büyük kimya ve ilaç şirketlerine bakma. Boya, deterjan, kozmetik, gıda, plastik ' +
        've arıtma tesislerinin hepsinde bu bölümün işi var ve rekabet çok daha düşük.',
      'Laboratuvara girmeden önce iş güvenliği eğitimi ve kişisel koruyucu donanım şart. ' +
        'Gözlük, önlük ve eldiven konusunda esneklik olmuyor.',
      'İlaç ve gıda tesislerinde hijyen ve giriş kuralları katı: bazı alanlara girmek için ayrı ' +
        'eğitim ve sağlık raporu isteniyor. Bunlar birkaç gün alabiliyor.',
      'Ar-Ge stajlarının kontenjanı az ve başvuru dönemi erken kapanıyor. Bu tarafı ' +
        'hedefliyorsan kışın başla.',
    ],
    cvIpucu:
      'Okulda kullandığın laboratuvar cihazlarını adıyla yaz — bu bölümde en çok atlanan ve en ' +
      'çok işe yarayan satır bu. Yaptığın deneyleri ve analiz yöntemlerini belirt. Kalite ve ' +
      'güvenlik standartlarına dair bir eğitim aldıysan (iş güvenliği, kalite yönetimi) mutlaka ' +
      'yaz; üretim tesisleri buna doğrudan bakıyor.',
    sss: [
      {
        soru: 'Kimya mühendisliği stajı nerede yapılır?',
        cevap:
          'Kimya ve ilaç tesisleri en bilinenleri ama gıda, boya, deterjan, kozmetik, plastik ve ' +
          'arıtma tesisleri de bu bölümden stajyer alıyor. Alanı geniş tutmak staj bulma sorununu ' +
          'büyük ölçüde çözüyor.',
      },
      {
        soru: 'Stajda laboratuvarda mı çalışırım, üretimde mi?',
        cevap:
          'İkisi de olabiliyor. Kalite kontrol laboratuvarında numune analizi ve kayıt, üretim ' +
          'tarafında ise proses takibi ve veri toplama yapıyorsun. Hangisini istediğini başvuruda ' +
          'söylemek işe yarıyor.',
      },
      {
        soru: 'Hangi cihazları bilmem gerekiyor?',
        cevap:
          'Okul laboratuvarında gördüğün temel analiz cihazları yeterli başlangıç. Kromatografi ve ' +
          'spektroskopi cihazlarının ne işe yaradığını bilmek, laboratuvar stajında ilk günü ' +
          'kolaylaştırıyor.',
      },
      {
        soru: 'İlaç sektöründe staj bulmak zor mu?',
        cevap:
          'Kontenjan sınırlı ve başvuru dönemleri erken kapanıyor. Kozmetik ve gıda tesisleri ' +
          'benzer üretim mantığını öğretiyor ve stajyer almaya çok daha açık.',
      },
      {
        soru: 'Güvenlik eğitimi almadan laboratuvara girebilir miyim?',
        cevap:
          'Giremezsin ve girmemelisin. Kimyasalla çalışılan her tesiste eğitim ve koruyucu donanım ' +
          'şart; bunu atlayan bir yer, kendi çalışanını da korumuyor demektir.',
      },
      {
        soru: 'Simülasyon programı bilmem gerekir mi?',
        cevap:
          'Stajyerden beklenmiyor ama proses tarafında kullanılan bir simülasyon programını temel ' +
          'düzeyde görmüş olmak, Ar-Ge ve proses stajı başvurularında ayırt edici oluyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'cevre-muhendisligi',
    ad: 'Çevre Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Arıtma tesisleri ve danışmanlık; saha ölçümü işin büyük kısmı.',
    aciklama:
      'Çevre mühendisliği stajı nerede yapılır, stajyerin görevleri ve aranan ' +
      'bilgiler.',
    nerede: [
      'Su ve atık su arıtma tesisleri',
      'Çevre danışmanlık firmaları',
      'Belediyelerin çevre koruma müdürlükleri',
      'Sanayi tesislerinin çevre birimleri',
    ],
    isler: [
      'Arıtma tesisinde numune almak ve analiz yapmak',
      'Emisyon ve deşarj kayıtlarını incelemek',
      'ÇED ve çevre izni dosyalarına destek olmak',
      'Atık yönetim kayıtlarını düzenlemek',
    ],
    hazirlik: [
      'Arıtma proseslerinin mantığı',
      'Çevre mevzuatının temel başlıkları',
      'Saha ölçüm cihazlarını tanımak',
      'Rapor yazabilmek — danışmanlık tarafında işin çoğu bu',
    ],
    aranan: [
      'Sahaya çıkabilmek',
      'Mevzuat okuma sabrı',
      'Düzenli kayıt tutma',
    ],
    ipucu:
      'Danışmanlık firmaları rapor yazan stajyeri çok seviyor. Bir çevre raporunun ' +
      'yapısını önceden incelemek seni hemen öne çıkarıyor.',
    aramaKelimeleri: ['çevre', 'arıtma', 'atık'],
    giris:
      'Çevre mühendisliğinde staj arayan öğrencinin ilk şaşırdığı şey, işin ne kadar mevzuata ' +
      'dayandığı: bu alanda yapılan işlerin büyük kısmı yasal bir yükümlülükten doğuyor. Arıtma ' +
      'tesisi de, atık kaydı da, izin dosyası da bir düzenlemenin karşılığı. Bu yüzden staj ' +
      'yerleri de iki gruba ayrılıyor: mevzuatı uygulayan tesisler ve o mevzuatı takip eden ' +
      'danışmanlık firmaları. Bu sayfada iki tarafın da nerede olduğunu, stajyere verilen ' +
      'gerçek işleri ve başvurmadan önce bilmen gerekenleri bulacaksın.',
    pozisyonlar: [
      'Atıksu ve içme suyu arıtma tesisleri',
      'Çevre danışmanlık firmaları ve izin dosyaları',
      'Atık yönetimi ve geri kazanım tesisleri',
      'Sanayi tesislerinin çevre birimleri',
      'Belediyelerin çevre koruma müdürlükleri',
    ],
    dikkat: [
      'Bu alanda işin omurgası mevzuat. Çevre izinleri ve atık yönetimiyle ilgili temel ' +
        'kavramları önceden okumak, stajın ilk gününden itibaren işin içine girmeni sağlıyor.',
      'Arıtma tesisleri genellikle şehir dışında ve ulaşımı zor. Servis olup olmadığını ' +
        'başvurmadan önce sor.',
      'Danışmanlık firmalarında iş masa başında ve rapor ağırlıklı; tesiste ise saha ve numune ' +
        'ağırlıklı. İkisi çok farklı deneyimler.',
      'Sanayi tesislerinin çevre birimleri stajyer alıyor ama neredeyse hiç ilan açmıyor. ' +
        'Şehrindeki organize sanayi bölgesine doğrudan yazmak en verimli yol.',
    ],
    cvIpucu:
      'Laboratuvarda yaptığın analizleri adıyla yaz: KOİ, BOİ, askıda katı madde, pH gibi. Bu ' +
      'bölümde en çok atlanan satır bu. Coğrafi bilgi sistemleri ya da bir modelleme programı ' +
      'kullanabiliyorsan mutlaka belirt. Çevre mevzuatına dair bir eğitim ya da sertifikan ' +
      'varsa yaz; danışmanlık firmaları buna doğrudan bakıyor.',
    sss: [
      {
        soru: 'Çevre mühendisliği stajı nerede yapılır?',
        cevap:
          'Arıtma tesisleri, atık yönetimi ve geri kazanım tesisleri, çevre danışmanlık firmaları, ' +
          'sanayi tesislerinin çevre birimleri ve belediyelerin çevre müdürlükleri.',
      },
      {
        soru: 'Çevre stajında hangi işler veriliyor?',
        cevap:
          'Numune alma ve laboratuvar analizi, arıtma tesisi işletme verilerinin kaydı, atık ' +
          'beyanlarının hazırlığı, izin dosyalarının derlenmesi ve saha ölçümlerine destek.',
      },
      {
        soru: 'Danışmanlık firmasında mı, tesiste mi staj yapmalıyım?',
        cevap:
          'Tesis işin nasıl işlediğini gösteriyor, danışmanlık ise mevzuatın nasıl uygulandığını. ' +
          'İkisini farklı dönemlerde yapabilirsen alanın tamamını görmüş olursun.',
      },
      {
        soru: 'Çevre mevzuatını bilmem gerekiyor mu?',
        cevap:
          'Uzmanlık beklenmiyor ama çevre izni, atık kodları ve ÇED sürecinin ne olduğunu bilmek ' +
          'hem mülakatta hem ilk günde belirgin fark yaratıyor.',
      },
      {
        soru: 'Coğrafi bilgi sistemleri bu bölümde işe yarıyor mu?',
        cevap:
          'Fazlasıyla. Kirlilik haritalama, saha planlama ve raporlama tarafında kullanılıyor ve ' +
          'bilen öğrenci sayısı az olduğu için doğrudan ayırt edici oluyor.',
      },
      {
        soru: 'Belediyede staj yapabilir miyim?',
        cevap:
          'Yapabilirsin; çevre koruma ve kontrol müdürlükleri stajyer alıyor. Evrak süreci uzun ' +
          'olduğu için başvuruyu aylar öncesinden başlatmak gerekiyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'harita-ve-geomatik-muhendisligi',
    ad: 'Harita ve Geomatik Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Arazi ölçümü ve CBS; staj çoğunlukla sahada geçiyor.',
    aciklama:
      'Harita mühendisliği stajı nerede yapılır, stajyer hangi cihazlarla ' +
      'çalışır ve ne öğrenmeli.',
    nerede: [
      'Harita ve kadastro büroları',
      'İnşaat şantiyelerinin ölçüm ekipleri',
      'Belediyelerin imar ve harita müdürlükleri',
      'Coğrafi bilgi sistemleri (CBS) projeleri',
    ],
    isler: [
      'Total station ve GNSS ile arazi ölçümü',
      'Aplikasyon: projeyi araziye taşımak',
      'Ölçüm verisini bilgisayarda işlemek',
      'Harita ve altlık üretmek',
    ],
    hazirlik: [
      'Total station ve GNSS kullanımı',
      'NetCAD veya AutoCAD',
      'CBS programlarından biri (QGIS, ArcGIS)',
      'Koordinat sistemlerini anlamak',
    ],
    aranan: [
      'Arazi şartlarında çalışabilmek',
      'Ölçüm cihazı deneyimi',
      'Dikkat — burada hata doğrudan yapıya yansıyor',
    ],
    ipucu:
      'QGIS ücretsiz. Staj öncesi birkaç hafta kendi başına çalışıp bir harita üretmek, ' +
      'CBS tarafındaki ofis stajlarında seni doğrudan işe alır hâle getiriyor.',
    aramaKelimeleri: ['harita', 'ölçüm', 'cbs'],
    giris:
      'Harita ve geomatik mühendisliğinin stajı büyük ölçüde arazide geçiyor ve bu, bölümün hem ' +
      'en güzel hem en zorlayıcı tarafı: hava koşulları, arazi şartları ve erken saatler işin ' +
      'bir parçası. Karşılığında ölçtüğün şeyin doğrudan bir yapıya, bir tapuya ya da bir plana ' +
      'dönüştüğünü görüyorsun. Staj yerleri üç ana gruba ayrılıyor: ölçüm yapan harita ' +
      'büroları, uygulama yapan şantiyeler ve veriyi yöneten kamu kurumları. Bu sayfada üçünün ' +
      'de ne öğrettiğini, stajyere verilen gerçek işleri ve hangi cihazları tanımanın işe ' +
      'yaradığını bulacaksın.',
    pozisyonlar: [
      'Harita ve ölçüm büroları',
      'İnşaat şantiyelerinde aplikasyon ve kot kontrolü',
      'Kadastro ve tapu müdürlükleri',
      'Belediyelerin imar ve harita birimleri',
      'Coğrafi bilgi sistemleri ve uzaktan algılama projeleri',
    ],
    dikkat: [
      'Arazi çalışması erken başlıyor ve hava koşullarına bağlı. Yazın sıcak, kışın soğukta ' +
        'çalışmak işin normali; bunu bilerek gitmek gerekiyor.',
      'Cihazlar pahalı ve hassas. Kullanmayı öğrenirken acele etmemek, hem cihazı hem ölçümü ' +
        'koruyor.',
      'Kamu kurumlarında staj kontenjanı var ama evrak süreci uzun; başvuruyu aylar öncesinden ' +
        'başlatmak gerekiyor.',
      'Ofis tarafı da işin yarısı: arazide toplanan veri büroda işleniyor. Sadece arazi ya da ' +
        'sadece ofis gören bir staj eksik kalıyor.',
    ],
    cvIpucu:
      'Kullandığın cihazları adıyla yaz: total station, GNSS alıcısı, nivo. Bu bölümde CV\'nin ' +
      'en çok bakılan satırı orası. Coğrafi bilgi sistemleri ve çizim programlarını seviye ' +
      'vererek belirt. İnsansız hava aracıyla veri toplama ya da fotogrametri deneyimin varsa ' +
      'mutlaka yaz; bilen öğrenci sayısı az ve talep artıyor.',
    sss: [
      {
        soru: 'Harita mühendisliği stajı nerede yapılır?',
        cevap:
          'Harita ve ölçüm büroları, inşaat şantiyeleri, kadastro müdürlükleri, belediyelerin imar ' +
          've harita birimleri ve coğrafi bilgi sistemleri projeleri yürüten kurumlar.',
      },
      {
        soru: 'Stajda hangi cihazları kullanıyorum?',
        cevap:
          'Total station, GNSS alıcısı ve nivo en yaygınları. Kullanımı gözetim altında ' +
          'öğretiliyor; önceden görmüş olmak ilk günü çok kolaylaştırıyor.',
      },
      {
        soru: 'Şantiyede harita mühendisi ne yapıyor?',
        cevap:
          'Projenin araziye aktarılması, aks ve kot kontrolü, imalat sonrası ölçüm ve hakediş için ' +
          'metraj alınması. Yapının doğru yerde ve doğru kotta olmasının sorumluluğu bu işte.',
      },
      {
        soru: 'Coğrafi bilgi sistemleri öğrenmeli miyim?',
        cevap:
          'Öğrenmelisin. Verinin toplanması kadar yönetilmesi de bu bölümün işi ve kamu ' +
          'kurumlarından özel projelere kadar her yerde kullanılıyor.',
      },
      {
        soru: 'İnsansız hava aracı bilgisi işe yarar mı?',
        cevap:
          'Fazlasıyla. Fotogrametrik veri toplama hızla yaygınlaşıyor ve bu tarafı bilen öğrenci ' +
          'sayısı hâlâ az. CV\'de belirgin bir fark yaratıyor.',
      },
      {
        soru: 'Kadastroda staj yapmak mantıklı mı?',
        cevap:
          'Mülkiyet ve tapu tarafının nasıl işlediğini öğrenmek için en doğrudan yer. Serbest ' +
          'çalışmayı düşünüyorsan bu süreci içeriden görmüş olmak doğrudan işine yarıyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'metalurji-ve-malzeme-muhendisligi',
    ad: 'Metalurji ve Malzeme Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Dökümhane, haddehane ve malzeme laboratuvarı.',
    aciklama:
      'Metalurji ve malzeme mühendisliği stajı nerede yapılır ve stajyer ne iş yapar.',
    nerede: [
      'Demir çelik tesisleri ve dökümhaneler',
      'Otomotiv ve savunma sanayinin malzeme birimleri',
      'Isıl işlem ve kaplama firmaları',
      'Malzeme test laboratuvarları',
    ],
    isler: [
      'Numune hazırlamak, mikroyapı incelemek',
      'Sertlik ve çekme testlerine eşlik etmek',
      'Isıl işlem fırınlarının kayıtlarını tutmak',
      'Hata analizi çalışmalarına destek olmak',
    ],
    hazirlik: [
      'Faz diyagramları ve ısıl işlem mantığı',
      'Mekanik test yöntemleri',
      'Mikroskop ve numune hazırlama teknikleri',
      'İş güvenliği — sıcak proses ortamı ciddi risk taşıyor',
    ],
    aranan: [
      'Sıcak ve gürültülü ortama dayanıklılık',
      'Laboratuvar titizliği',
      'Temel malzeme bilgisini sözlü anlatabilmek',
    ],
    ipucu:
      'Dökümhane stajı zorlu ama bu alanda en çok iş teklifi buradan çıkıyor; ' +
      'ofis stajı arayanlara göre rekabet çok daha az.',
    aramaKelimeleri: ['metalurji', 'malzeme', 'üretim'],
    giris:
      'Metalurji ve malzeme mühendisliğinde staj arayan öğrencinin en sık düştüğü hata, ' +
      'yalnızca büyük demir-çelik tesislerine bakmak. Oysa malzeme her üretimin içinde: döküm ' +
      'atölyesinden ısıl işlem tesisine, otomotiv yan sanayiden kaynak imalatına kadar geniş ' +
      'bir alanda bu bölümün işi var ve o küçük tesislerde rekabet neredeyse yok. Bir de ' +
      'laboratuvar tarafı var: malzeme test laboratuvarları alanı en hızlı öğreten yerlerden ' +
      'biri. Bu sayfada nerede staj yapıldığını, stajyere verilen gerçek işleri ve başvurmadan ' +
      'önce bilmen gerekenleri bulacaksın.',
    pozisyonlar: [
      'Döküm ve dövme tesisleri',
      'Isıl işlem ve yüzey işlem tesisleri',
      'Malzeme test ve analiz laboratuvarları',
      'Otomotiv yan sanayi üretim tesisleri',
      'Kaynak ve metal imalat atölyeleri',
    ],
    dikkat: [
      'Yalnızca büyük demir-çelik tesislerine bakma. Döküm, ısıl işlem ve kaplama tesisleri de ' +
        'bu bölümden stajyer alıyor ve rekabet çok daha düşük.',
      'Sıcak proses ortamlarında (döküm, ısıl işlem) çalışma koşulları ağır: yüksek sıcaklık ve ' +
        'koruyucu donanım. Bunu bilerek seçmek gerekiyor.',
      'Laboratuvar tarafı alanı en hızlı öğreten yerlerden biri: malzemenin neden kırıldığını ' +
        'orada görüyorsun. Üretim stajından sonra bunu da görmek tamamlıyor.',
      'Bazı analiz cihazları pahalı ve kullanımı yetkiye bağlı. Gözlem yapmak bile öğretici; ' +
        'cihazın ne ölçtüğünü ve sonucun ne anlama geldiğini not al.',
    ],
    cvIpucu:
      'Okulda kullandığın test ve analiz yöntemlerini adıyla yaz: çekme testi, sertlik ölçümü, ' +
      'metalografik inceleme, mikroskopla yapı analizi. Bu bölümde en çok atlanan ve en çok işe ' +
      'yarayan satır bu. Isıl işlem ve kaynak yöntemlerine dair bildiklerini de belirt; üretim ' +
      'tesisleri doğrudan buna bakıyor.',
    sss: [
      {
        soru: 'Metalurji stajı nerede yapılır?',
        cevap:
          'Döküm ve dövme tesisleri, ısıl işlem ve kaplama tesisleri, malzeme test laboratuvarları, ' +
          'otomotiv yan sanayi ve metal imalat atölyeleri.',
      },
      {
        soru: 'Metalurji stajyerine hangi işler veriliyor?',
        cevap:
          'Numune hazırlama ve test, üretim parametrelerinin kaydı, hata ve ıskarta incelemesi, ' +
          'ısıl işlem fırın kayıtlarının takibi, kalite raporlarının hazırlığı.',
      },
      {
        soru: 'Laboratuvarda mı, üretimde mi staj yapmalıyım?',
        cevap:
          'Üretim malzemenin nasıl şekillendiğini, laboratuvar neden öyle davrandığını öğretiyor. ' +
          'İkisini farklı dönemlerde görmek alanı tamamlıyor.',
      },
      {
        soru: 'Döküm tesisinde çalışma koşulları nasıl?',
        cevap:
          'Sıcak ve koruyucu donanım gerektiren bir ortam. Karşılığında metalin sıvıdan katıya ' +
          'geçişini yerinde görmek, bu bölümün en öğretici deneyimlerinden biri.',
      },
      {
        soru: 'Hangi analiz yöntemlerini bilmem gerekiyor?',
        cevap:
          'Sertlik ölçümü, çekme testi ve metalografik inceleme temel başlangıç. Bunları okulda ' +
          'yaptıysan CV\'ye yazmak doğrudan karşılık buluyor.',
      },
      {
        soru: 'Kaynak bilgisi bu bölümde işe yarıyor mu?',
        cevap:
          'Fazlasıyla. Kaynak yöntemlerini ve kaynak hatalarını bilmek, metal imalat yapan her ' +
          'tesiste seni hemen kullanışlı hale getiriyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'ziraat-muhendisligi',
    ad: 'Ziraat Mühendisliği',
    grup: 'muhendislik',
    ozet: 'Sahada üretim ve tarım işletmeleri; mevsime bağlı planlama gerekiyor.',
    aciklama:
      'Ziraat mühendisliği stajı nerede yapılır, stajyerin görevleri ve ' +
      'mevsimsel planlama.',
    nerede: [
      'Tarım işletmeleri, seralar ve fidanlıklar',
      'Tohum, gübre ve zirai ilaç firmaları',
      'Gıda sanayinin hammadde birimleri',
      'Tarım il ve ilçe müdürlükleri',
    ],
    isler: [
      'Bitki gelişimini izlemek ve kayıt tutmak',
      'Toprak ve yaprak analizi için numune almak',
      'Sulama ve gübreleme programını takip etmek',
      'Hastalık ve zararlı tespiti yapmak',
    ],
    hazirlik: [
      'Kendi bölgendeki temel ürünleri tanımak',
      'Bitki besleme ve toprak analizi mantığı',
      'Zirai ilaç uygulama kuralları',
      'Kayıt tutma disiplini',
    ],
    aranan: [
      'Sahada, açık havada çalışabilmek',
      'Ehliyet — tarla ve sera arasında hareket gerekiyor',
      'Üretim takvimine uyum',
    ],
    ipucu:
      'Bu bölümde stajın zamanı içeriğini belirliyor. Hangi ürünün hangi ayda ne ' +
      'aşamada olduğunu bilip başvurunu ona göre planla.',
    aramaKelimeleri: ['ziraat', 'tarım', 'gıda'],
    giris:
      'Ziraat mühendisliğinde stajın en belirleyici tarafı takvim: tarım mevsime bağlı ve ' +
      'yanlış dönemde yapılan staj boş geçiyor. Ekim, bakım ve hasat dönemleri farklı işler ' +
      'gösteriyor; tesis ya da işletme o dönemde ne yapıyorsa sen onu öğreniyorsun. Bir de alan ' +
      'genişliği var: bitkisel üretim, hayvansal üretim, toprak, gıda ve tarım ekonomisi çok ' +
      'farklı işler. Bu sayfada hangi tür işletmelerin stajyer aldığını, stajyere verilen ' +
      'gerçek işleri ve dönem seçerken nelere dikkat etmen gerektiğini bulacaksın.',
    pozisyonlar: [
      'Tarım işletmeleri ve büyük ölçekli üretim çiftlikleri',
      'Sera işletmeleri ve fide üretimi',
      'Tohum, gübre ve tarım ilacı firmalarının saha ekipleri',
      'Gıda sanayinin hammadde tedarik birimleri',
      'Tarım kredi kooperatifleri, ziraat odaları ve kamu kurumları',
    ],
    dikkat: [
      'Staj dönemini üretim takvimine göre seç. Ekim, bakım ve hasat farklı işler gösteriyor; ' +
        'yanlış dönemde gidersen görecek bir şey olmuyor.',
      'Saha çalışması açık havada ve erken saatlerde başlıyor. Sıcak, toz ve tarla şartları ' +
        'işin bir parçası.',
      'Tarım ilacı ve gübre ile çalışılan yerlerde koruyucu donanım ve uygulama kuralları ' +
        'kesin. Bu konuda esneklik gösteren bir yerden uzak dur.',
      'Tohum ve tarım ilacı firmalarının saha ekipleri stajyer alıyor ve bu taraf hem üreticiyi ' +
        'hem ürünü tanımanı sağlıyor — çoğu öğrencinin hiç düşünmediği bir yol.',
    ],
    cvIpucu:
      'Hangi alanla ilgilendiğini açıkça yaz: bitkisel üretim, hayvansal üretim, toprak, gıda ' +
      'ya da tarım ekonomisi. "Ziraat mühendisliği öğrencisiyim" cümlesi çok geniş. ' +
      'Laboratuvarda yaptığın analizleri ve arazi çalışmalarını belirt. Ehliyet bu alanda işe ' +
      'yarıyor; saha ekipleri sürekli yolda oluyor.',
    sss: [
      {
        soru: 'Ziraat mühendisliği stajı nerede yapılır?',
        cevap:
          'Tarım işletmeleri ve çiftlikler, sera ve fide üreticileri, tohum-gübre-ilaç firmalarının ' +
          'saha ekipleri, gıda sanayinin hammadde birimleri, kooperatifler ve kamu kurumları.',
      },
      {
        soru: 'Staj dönemini nasıl seçmeliyim?',
        cevap:
          'Üretim takvimine göre. İlgilendiğin ürünün hangi ayda ne aşamada olduğunu öğren ve stajı ' +
          'ona göre planla; boş dönemde gidilen staj gözlem bile üretmiyor.',
      },
      {
        soru: 'Sahada mı, laboratuvarda mı çalışıyorum?',
        cevap:
          'İşletmeye göre değişiyor. Üretim işletmelerinde saha ağırlıklı, tohum ve gıda ' +
          'firmalarında laboratuvar ve analiz tarafı daha yoğun.',
      },
      {
        soru: 'Tarım ilacı ile çalışırken ne yapmalıyım?',
        cevap:
          'Koruyucu donanım ve uygulama kurallarına harfiyen uymalısın. Bu konuda gevşek davranan ' +
          'bir işletme kendi çalışanını da korumuyor demektir.',
      },
      {
        soru: 'Hayvansal üretim tarafında staj yapılabilir mi?',
        cevap:
          'Yapılabiliyor: süt ve besi işletmeleri, kuluçkahaneler ve yem fabrikaları stajyer ' +
          'alıyor. Çalışma saatleri hayvanın düzenine göre olduğu için erken başlıyor.',
      },
      {
        soru: 'Ziraat stajı için ehliyet gerekli mi?',
        cevap:
          'Zorunlu değil ama saha ekiplerinde çok işe yarıyor: bu iş sürekli üreticiden üreticiye ' +
          'gitmeyi gerektiriyor ve ehliyetli stajyer ekibe daha kolay katılıyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },

  /* --------------------------------------------------------- MYO (devam) */
  {
    slug: 'lojistik',
    ad: 'Lojistik (MYO)',
    grup: 'myo',
    ozet: 'Depo, nakliye ve gümrük süreçlerinde staj; ilanlarda belirli programlar sık isteniyor.',
    aciklama:
      'Lojistik stajı nerede yapılır, stajyer hangi işlere bakar ve hangi ' +
      'programlar isteniyor.',
    nerede: [
      'Nakliye ve taşımacılık firmaları',
      'Depo ve dağıtım merkezleri',
      'Gümrük müşavirliği ofisleri',
      'E-ticaret şirketlerinin operasyon birimleri',
    ],
    isler: [
      'Sevkiyat evrakı hazırlamak ve takip etmek',
      'Depo giriş çıkışlarını sisteme işlemek',
      'Sipariş ve teslimat durumunu izlemek',
      'Gümrük evraklarının hazırlığına destek olmak',
    ],
    hazirlik: [
      'Excel',
      'Temel gümrük ve dış ticaret terimleri (irsaliye, konşimento, incoterms)',
      'Bir depo yönetim veya ERP ekranı görmüş olmak',
      'İngilizce — evrakların çoğu İngilizce',
    ],
    aranan: [
      'Yoğun tempoya uyum',
      'Takip disiplini; kaybolan evrak doğrudan para kaybı',
      'Vardiyalı çalışabilmek',
    ],
    ipucu:
      'Bu alanda stajyer kalıcı işe en çok dönüşen alanlardan biri. Depo operasyonunda ' +
      'başlayıp planlama tarafına geçmek yaygın bir yol.',
    aramaKelimeleri: ['lojistik', 'depo', 'operasyon'],
    giris:
      'Lojistik, staj bulmanın görece kolay olduğu alanlardan biri: depolar, nakliye şirketleri ' +
      've dağıtım merkezleri sürekli iş yükü altında ve stajyer almaya açık. Asıl mesele hangi ' +
      'tarafta çalışmak istediğine karar vermek — depo operasyonu, taşımacılık planlaması ve ' +
      'dış ticaret tarafı birbirinden oldukça farklı işler. Bir de vardiya gerçeği var: bu ' +
      'alanda çalışma saatleri ofis düzeninden farklı olabiliyor. Bu sayfada nerede staj ' +
      'yapıldığını, stajyere verilen gerçek işleri ve başvururken bilmen gerekenleri ' +
      'bulacaksın.',
    pozisyonlar: [
      'Depo ve dağıtım merkezi operasyonu',
      'Nakliye ve sevkiyat planlama',
      'Gümrük ve dış ticaret operasyonu',
      'Tedarik zinciri ve stok takibi',
      'Kargo ve son kilometre dağıtım',
    ],
    dikkat: [
      'Depo tarafında çalışma vardiyalı olabiliyor ve iş ayakta geçiyor. Bunu bilerek seçmek, ' +
        'ilk hafta pes etmemeni sağlıyor.',
      'Sevkiyat ve dağıtım merkezleri şehir dışında, sanayi bölgelerinde oluyor. Ulaşımı ' +
        'başvurmadan önce hesapla; servis olup olmadığını sor.',
      'Bu alanda her şey sistem üzerinden yürüyor. Kullanılan depo ya da taşıma yazılımının ' +
        'adını öğrenmek, mülakatta doğrudan ilgi göstergesi oluyor.',
      'Yılın belirli dönemleri (kampanya sezonları, yıl sonu) aşırı yoğun geçiyor. O dönemlerde ' +
        'stajyer olarak işin içine girme şansın yüksek ama tempo da yüksek.',
    ],
    cvIpucu:
      'Excel seviyeni mutlaka yaz; bu alanda gün boyu tablo ile çalışılıyor. Daha önce depo, ' +
      'kasa, sayım ya da sevkiyat gibi bir işte çalıştıysan alanla ilgisiz görünse bile yaz — ' +
      'operasyon deneyimi burada doğrudan karşılık buluyor. Ehliyetin ve varsa forklift gibi ' +
      'operatör belgen varsa belirt.',
    sss: [
      {
        soru: 'Lojistik stajı nerede yapılır?',
        cevap:
          'Nakliye ve kargo şirketleri, depo ve dağıtım merkezleri, gümrük müşavirlikleri, üretici ' +
          'firmaların sevkiyat birimleri ve perakende zincirlerinin tedarik ekipleri.',
      },
      {
        soru: 'Lojistik stajyerine hangi işler veriliyor?',
        cevap:
          'Sevkiyat kayıtlarının takibi, stok sayımı ve fark analizi, araç ve rota planlamasına ' +
          'destek, irsaliye ve teslim belgelerinin düzeni, gecikme ve hasar kayıtlarının tutulması.',
      },
      {
        soru: 'Depo stajı ağır bir iş mi?',
        cevap:
          'Fiziksel olarak yorucu olabiliyor ve vardiyalı çalışma yaygın. Karşılığında işin ' +
          'gerçekte nasıl yürüdüğünü ofisten görülemeyecek kadar net öğreniyorsun.',
      },
      {
        soru: 'Hangi yazılımları bilmek işe yarar?',
        cevap:
          'Excel her yerde. Bunun üstüne bir depo yönetim sistemi ya da ERP arayüzü tecrübesi ayırt ' +
          'edici; markalar değişse de mantık aynı olduğu için biri diğerine geçişi kolaylaştırıyor.',
      },
      {
        soru: 'Lojistik stajı için ehliyet gerekli mi?',
        cevap:
          'Zorunlu değil ama saha tarafında işe yarıyor ve bazı ilanlarda isteniyor. Forklift gibi ' +
          'operatör belgesi ise depo tarafında doğrudan avantaj.',
      },
      {
        soru: 'Lojistik stajı işe dönüşür mü?',
        cevap:
          'Bu alanda ihtimal görece yüksek: sektörde eleman ihtiyacı sürekli ve işi bilen bir ' +
          'stajyeri yetiştirmek şirket için en kolay yol. Niyetini staj bitmeden söylemek ' +
          'belirleyici oluyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'is-sagligi-ve-guvenligi',
    ad: 'İş Sağlığı ve Güvenliği (MYO)',
    grup: 'myo',
    ozet: 'Sahada risk değerlendirmesi; her sektörde staj yeri var.',
    aciklama:
      'İş sağlığı ve güvenliği stajı nerede yapılır ve stajyer hangi işlere bakar.',
    nerede: [
      'OSGB (ortak sağlık güvenlik birimi) firmaları',
      'Fabrikaların İSG birimleri',
      'İnşaat şantiyeleri',
      'Lojistik ve depo işletmeleri',
    ],
    isler: [
      'Saha turlarına eşlik edip uygunsuzluk kaydı tutmak',
      'Risk değerlendirme tablolarına destek olmak',
      'Kişisel koruyucu donanım takibi',
      'Eğitim kayıtlarını düzenlemek',
    ],
    hazirlik: [
      'Risk değerlendirme yöntemlerinin mantığı',
      'Tehlike ve risk kavramlarının farkı',
      'İSG mevzuatının ana başlıkları',
      'Rapor ve tutanak yazımı',
    ],
    aranan: [
      'Sahada gözlem yapabilme',
      'Kurallara kendi uyman — burada örnek olmak işin parçası',
      'İletişim: uyarı yaparken karşı tarafı savunmaya itmemek',
    ],
    ipucu:
      'Sahada çalışanlar İSG\'yi çoğu zaman engel görüyor. Kural okumak yerine ' +
      'nedenini anlatabilen stajyer çok daha hızlı kabul görüyor.',
    aramaKelimeleri: ['iş güvenliği', 'isg', 'saha'],
    giris:
      'İş sağlığı ve güvenliği stajında öğrencinin ilk anlaması gereken şey şu: iş güvenliği ' +
      'uzmanı olmak ayrı bir süreç ve sertifikaya bağlı. Öğrenci olarak sahada gözlemci ve ' +
      'destek konumundasın; denetim yapma ya da tutanak imzalama yetkin yok. Bu sınırı bilmek ' +
      'hem seni korur hem işletmeyi. Karşılığında bu staj, bir işletmenin gerçekte nasıl ' +
      'çalıştığını en yakından gösteren stajlardan biri: üretimin her adımını risk gözüyle ' +
      'izliyorsun. Bu sayfada nerede staj yapıldığını, stajyerin gerçekte ne yaptığını ve ' +
      'başvururken bilmen gerekenleri bulacaksın.',
    pozisyonlar: [
      'Ortak sağlık ve güvenlik birimleri (OSGB)',
      'Fabrikaların iş güvenliği birimleri',
      'İnşaat şantiyeleri',
      'Enerji ve kimya tesisleri',
      'Lojistik ve depo işletmeleri',
    ],
    dikkat: [
      'İş güvenliği uzmanlığı sertifikaya bağlı ayrı bir süreç. Öğrenci olarak gözlemci ve ' +
        'destek konumundasın; denetim ve tutanak yetkisi uzmanda.',
      'Sahaya çıkarken kişisel koruyucu donanım şart ve kurala uymayan stajyer içeri alınmıyor. ' +
        'Bu alanda kuralı ilk uygulayan kişi sensin.',
      'OSGB\'lerde birçok farklı işletmeyi görüyorsun, tek bir fabrikada ise bir işletmeyi ' +
        'derinlemesine. İkisi farklı şeyler öğretiyor.',
      'Kaza ve ramak kala kayıtları gizli bilgi. Staj defterine yazarken işletme adını ve ' +
        'kişileri belirtme; nasıl yazacağını sorumluna sor.',
    ],
    cvIpucu:
      'Aldığın eğitimleri ve sertifikaları listele: ilk yardım, yangın, yüksekte çalışma. Bu ' +
      'bölümde CV\'de en çok bakılan yer orası. Risk değerlendirme yöntemlerinden hangilerini ' +
      'bildiğini yaz. Daha önce bir üretim ya da şantiye ortamında bulunduysan mutlaka belirt; ' +
      'sahayı tanımak bu işte doğrudan avantaj.',
    sss: [
      {
        soru: 'İş güvenliği stajı nerede yapılır?',
        cevap:
          'Ortak sağlık ve güvenlik birimleri, fabrikaların iş güvenliği birimleri, inşaat ' +
          'şantiyeleri, enerji ve kimya tesisleri, lojistik ve depo işletmeleri.',
      },
      {
        soru: 'Staj yaparken denetim yapabilir miyim?',
        cevap:
          'Hayır. Denetim ve tutanak yetkisi sertifikalı iş güvenliği uzmanında. Sen saha turlarına ' +
          'katılıyor, gözlem yapıyor ve kayıtların hazırlığına destek oluyorsun.',
      },
      {
        soru: 'Risk değerlendirmesi nedir, stajda yapar mıyım?',
        cevap:
          'Bir işte hangi tehlikelerin bulunduğunu ve ne kadar riskli olduğunu sistemli biçimde ' +
          'belirleme çalışması. Stajyer genelde veri toplama ve tablo hazırlığı tarafında yer ' +
          'alıyor.',
      },
      {
        soru: 'OSGB\'de mi, fabrikada mı staj yapmalıyım?',
        cevap:
          'OSGB\'de kısa sürede çok farklı işletme görüyorsun; fabrikada tek bir işletmeyi derinden ' +
          'öğreniyorsun. Alanı tanımak için OSGB, bir sektörü öğrenmek için fabrika daha uygun.',
      },
      {
        soru: 'Hangi sertifikalar işe yarıyor?',
        cevap:
          'İlk yardım, yangın güvenliği ve yüksekte çalışma eğitimleri stajyer için doğrudan ' +
          'avantaj. Bunlar kısa süreli eğitimler ve CV\'de somut karşılık buluyor.',
      },
      {
        soru: 'Bu bölümün stajı işe dönüşür mü?',
        cevap:
          'Sahayı tanıyan ve kayıt disiplini olan stajyeri işletmeler tutmak istiyor. Ancak uzman ' +
          'olarak çalışmak için sertifika süreci gerekiyor; bunu baştan planlamak gerek.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'cocuk-gelisimi',
    ad: 'Çocuk Gelişimi (MYO)',
    grup: 'myo',
    ozet: 'Anaokulu ve kreşler; adli sicil ve sağlık raporu şart.',
    aciklama:
      'Çocuk gelişimi stajı nerede yapılır, stajyerin görevleri ve gereken belgeler.',
    nerede: [
      'Anaokulları ve kreşler',
      'Özel eğitim ve rehabilitasyon merkezleri',
      'Hastanelerin çocuk servisleri',
      'Belediyelerin çocuk merkezleri',
    ],
    isler: [
      'Etkinlik hazırlığına ve uygulamasına destek olmak',
      'Çocukların gelişim gözlemlerini kaydetmek',
      'Materyal hazırlamak',
      'Öğretmene sınıf yönetiminde yardım etmek',
    ],
    hazirlik: [
      'Gelişim dönemleri ve yaş özellikleri',
      'Etkinlik planı hazırlayabilmek',
      'Çocukla iletişim dili',
      'Temel ilk yardım bilgisi',
    ],
    aranan: [
      'Adli sicil kaydı ve sağlık raporu — kurumların istediği ilk belgeler',
      'Sabır ve tutarlılık',
      'Aile iletişiminde ölçülü olmak',
    ],
    ipucu:
      'Belgeleri (adli sicil, sağlık raporu, portör) başvurudan önce hazırla. ' +
      'Kurumlar çocuk güvenliği nedeniyle bu konuda hiç esnemiyor.',
    aramaKelimeleri: ['çocuk', 'eğitim', 'anaokulu'],
    giris:
      'Çocuk gelişimi stajı, doğrudan çocuklarla aynı ortamda geçen bir staj ve bu onu diğer ' +
      'bölümlerden ayıran her şeyi belirliyor: kurumlar sana güvenmek zorunda, o yüzden belge ' +
      'süreci daha ayrıntılı ve kurallar daha katı. Gördüğün her çocuk hakkında öğrendiğin şey ' +
      'gizli bilgi; fotoğraf, isim ve durum ayrıntısı kurum dışına çıkmıyor. Bunu baştan bilmek ' +
      'hem doğru davranmanı sağlıyor hem de kurumun sana güvenmesini kolaylaştırıyor. Bu ' +
      'sayfada hangi kurumların stajyer aldığını, stajyerin gerçekte ne yaptığını ve ' +
      'başvurmadan önce hazırlaman gerekenleri bulacaksın.',
    pozisyonlar: [
      'Anaokulu ve kreşler',
      'Özel eğitim ve rehabilitasyon merkezleri',
      'Hastanelerin çocuk servisleri ve oyun odaları',
      'Belediyelerin çocuk ve gençlik merkezleri',
      'Sivil toplum kuruluşlarının çocuk çalışmaları',
    ],
    dikkat: [
      'Çocukla çalışılan kurumlarda sağlık raporu ve adli sicil belgesi istenebiliyor. Bu ' +
        'belgeleri toplamak birkaç gün sürüyor; staj başlangıcından önce başlat.',
      'Fotoğraf ve video kesin kural: çocukların görüntüsü izinsiz çekilmez ve hiçbir yerde ' +
        'paylaşılmaz. Sosyal medya paylaşımı en sık yapılan ve en ağır sonuçlanan hata.',
      'Gördüğün her durum gizli. Çocuğun adı, ailesi ve gelişim durumu staj defterine bile ' +
        'yazılmaz; nasıl yazacağını sorumluna sor.',
      'Özel eğitim merkezlerinde çalışmak duygusal olarak yorucu olabiliyor. Bunu bilerek ' +
        'gitmek, hem sana hem çocuğa iyi geliyor.',
    ],
    cvIpucu:
      'Çocuklarla geçirdiğin her deneyimi yaz: gönüllü çalışma, yaz kursu, kardeş bakımı bile ' +
      'olsa. Bu bölümde işverenin aradığı ilk şey sabır ve sorumluluk. İlk yardım, çocuk ' +
      'gelişimi ya da özel eğitim alanında aldığın kurslar varsa mutlaka belirt. Hangi yaş ' +
      'grubuyla çalışmak istediğini yazmak da başvuruyu kişiselleştiriyor.',
    sss: [
      {
        soru: 'Çocuk gelişimi stajı nerede yapılır?',
        cevap:
          'Anaokulları ve kreşler, özel eğitim ve rehabilitasyon merkezleri, hastanelerin çocuk ' +
          'servisleri, belediyelerin çocuk merkezleri ve çocuk alanında çalışan sivil toplum ' +
          'kuruluşları.',
      },
      {
        soru: 'Stajda çocuklarla doğrudan çalışıyor muyum?',
        cevap:
          'Evet ama gözetim altında. Etkinliklere katılıyor, oyun ve öğrenme süreçlerine destek ' +
          'oluyorsun. Değerlendirme ve program hazırlama sorumluluğu kurumun uzmanında kalıyor.',
      },
      {
        soru: 'Çocuk gelişimi stajı için hangi belgeler isteniyor?',
        cevap:
          'Okulun staj belgesi ve sigorta girişinin yanında, çoğu kurum sağlık raporu ve adli sicil ' +
          'belgesi istiyor. Kurumun kendi ek şartları da olabiliyor; başvuruda sor.',
      },
      {
        soru: 'Çocukların fotoğrafını çekebilir miyim?',
        cevap:
          'Hayır. İzinsiz görüntü almak ve paylaşmak hem kurumun kuralı hem hukuki bir sorun. Staj ' +
          'defterine görsel eklemen gerekiyorsa bunu sorumlunla konuş.',
      },
      {
        soru: 'Özel eğitim merkezinde staj yapmak zor mu?',
        cevap:
          'Duygusal olarak yorucu olabiliyor ve sabır istiyor. Karşılığında alanı en derin öğreten ' +
          'yerlerden biri; bu tarafta çalışmayı düşünüyorsan görmen gereken bir deneyim.',
      },
      {
        soru: 'Kreş ya da rehabilitasyon merkezinde staj işe dönüşür mü?',
        cevap:
          'Bu alanda ihtimal görece yüksek: kurumlar tanıdıkları ve çocuklarla uyum sağlamış birini ' +
          'işe almayı tercih ediyor. Niyetini staj bitmeden söylemek belirleyici oluyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },

  /* ---------------------------------------------- iktisadi ve idari (devam) */
  {
    slug: 'hukuk',
    ad: 'Hukuk',
    grup: 'sosyal',
    ozet: 'Avukat yanında staj ayrı bir süreç; öğrencilik stajı büro deneyimi.',
    aciklama:
      'Hukuk fakültesi öğrencisi staj nerede yapar, büroda ne iş yapılır ve ' +
      'avukatlık stajından farkı nedir.',
    nerede: [
      'Avukatlık büroları',
      'Şirketlerin hukuk müşavirlikleri',
      'Bankaların hukuk birimleri',
      'Kamu kurumlarının hukuk müşavirlikleri',
    ],
    isler: [
      'Dosya ve evrak düzenlemek',
      'Mevzuat ve içtihat taraması yapmak',
      'Dilekçe taslaklarına destek olmak',
      'Duruşma ve adliye işlerine eşlik etmek',
    ],
    hazirlik: [
      'UYAP ve içtihat veri tabanlarını tanımak',
      'Temel usul bilgisi — süre ve dosya mantığı',
      'Yazılı anlatım; bu meslekte tek gerçek araç',
      'Bir hukuk alanına yönelmiş olmak (ticaret, iş, ceza)',
    ],
    aranan: [
      'Gizlilik — dosyalarda kişisel veri var',
      'Titiz araştırma',
      'Yazım ve dil bilgisi',
    ],
    ipucu:
      'Mezuniyet sonrası yapılan avukatlık stajı ayrı bir süreç ve baroya bağlı. ' +
      'Öğrencilikte yaptığın büro stajı ise seni oraya hazırlayan deneyim; ikisini karıştırma.',
    aramaKelimeleri: ['hukuk', 'avukat', 'mevzuat'],
    giris:
      'Hukuk fakültesinde "staj" kelimesi iki ayrı şeyi anlatıyor ve karıştırılması sık yaşanan ' +
      'bir sorun. Mezuniyet sonrası yapılan avukatlık stajı ayrı bir süreç: baroya kayıt, ' +
      'adliye ve avukat yanı dönemleri, kendi mevzuatı var. Öğrencilik döneminde yapılan staj ' +
      'ise bundan farklı — bir büroda ya da hukuk biriminde çalışmayı görmek, dosya takibini ' +
      'öğrenmek ve alanı tanımak için yapılıyor. Bu sayfa ikincisini anlatıyor: öğrenci olarak ' +
      'nerede staj yapabileceğini, sana verilen gerçek işleri ve başvururken nelere dikkat ' +
      'etmen gerektiğini.',
    pozisyonlar: [
      'Avukatlık büroları — bireysel ya da kurumsal',
      'Şirketlerin hukuk müşavirliği birimleri',
      'Kamu kurumlarının hukuk birimleri',
      'Sivil toplum kuruluşlarında hak temelli çalışmalar',
      'Bankaların ve sigorta şirketlerinin hukuk servisleri',
    ],
    dikkat: [
      'Öğrenci stajı ile mezuniyet sonrası avukatlık stajı farklı süreçler. Bu sayfadaki her ' +
        'şey öğrencilik dönemi için; avukatlık stajının şartlarını baroya sormalısın.',
      'Öğrenci olarak duruşmaya giremez, dilekçe imzalayamaz ve müvekkil temsil edemezsin. ' +
        'Yaptığın iş gözlem, araştırma ve dosya hazırlığına destek oluyor.',
      'Gördüğün her dosya gizli. İsim, olay ayrıntısı ve belge fotoğrafı büro dışına çıkmıyor; ' +
        'staj defterine yazarken bile sorumluna sor.',
      'Büroyu seçerken çalıştığı alanı öğren: ceza, ticaret, iş hukuku, aile hukuku çok farklı ' +
        'günlük işler demek. Alanı sevmediğin bir büroda iki ay uzun geçiyor.',
    ],
    cvIpucu:
      'İlgilendiğin hukuk alanını CV\'nin en üstünde tek cümleyle söyle; "hukuk öğrencisiyim" ' +
      'cümlesi hiçbir büroya bir şey anlatmıyor. Farazi dava yarışması, hukuk kliniği, ' +
      'araştırma ödevi ya da yayımlanmış bir çalışman varsa yaz — bu bölümde en çok değer ' +
      'verilen şey yazma ve araştırma becerisi. Yabancı dil seviyeni de mutlaka belirt.',
    sss: [
      {
        soru: 'Öğrenci stajı ile avukatlık stajı aynı şey mi?',
        cevap:
          'Değil. Avukatlık stajı mezuniyetten sonra, baro kaydıyla ve kendi mevzuatına göre ' +
          'yapılıyor. Öğrencilik döneminde yapılan staj ise alanı tanımak ve büro işleyişini görmek ' +
          'için yapılan farklı bir süreç.',
      },
      {
        soru: 'Hukuk stajında ne iş yapılıyor?',
        cevap:
          'Mevzuat ve içtihat araştırması, dosya düzeni, duruşma ve müzakerelerin gözlemlenmesi, ' +
          'dilekçe taslaklarının hazırlığına destek. İmza ve temsil yetkisi gerektiren hiçbir iş ' +
          'öğrenciye verilmiyor.',
      },
      {
        soru: 'Hangi büroda staj yapmalıyım?',
        cevap:
          'Çalışmak istediğin alanda çalışan bir büroda. Ceza, ticaret, iş ve aile hukuku çok ' +
          'farklı günlük işler demek. Büyük büro daha kurumsal, küçük büro ise dosyanın tamamını ' +
          'görme imkânı veriyor.',
      },
      {
        soru: 'Şirketin hukuk biriminde staj yapmak mantıklı mı?',
        cevap:
          'Fazlasıyla. Sözleşme yönetimi, uyum ve iş hukuku tarafını içeriden görüyorsun; avukatlık ' +
          'dışında kariyer düşünüyorsan bu deneyim doğrudan işine yarıyor.',
      },
      {
        soru: 'Not ortalaması hukuk stajında önemli mi?',
        cevap:
          'Bazı büyük bürolar ve kurumsal hukuk birimleri bakıyor, çoğu büro bakmıyor. Bakılan asıl ' +
          'şey yazma becerisi ve araştırma disiplini; bunu bir çalışmayla göstermek ortalamadan ' +
          'güçlü.',
      },
      {
        soru: 'Staj sırasında duruşmaya girebilir miyim?',
        cevap:
          'Avukatın yanında izleyici olarak salonda bulunabilirsin ama dosyada taraf ya da vekil ' +
          'değilsin. Kapalı duruşmalarda bu da mümkün olmuyor; kararı hâkim veriyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'psikoloji',
    ad: 'Psikoloji',
    grup: 'sosyal',
    ozet: 'Klinik staj lisansta sınırlı; İK ve araştırma tarafı daha açık.',
    aciklama:
      'Psikoloji öğrencisi staj nerede yapar, hangi alanlar lisans düzeyinde ' +
      'açık ve ne öğrenilmeli.',
    nerede: [
      'Şirketlerin insan kaynakları birimleri',
      'Araştırma ve veri şirketleri',
      'Rehabilitasyon ve özel eğitim merkezleri (gözlem ağırlıklı)',
      'Üniversitelerin araştırma laboratuvarları',
    ],
    isler: [
      'Araştırma verisi toplamak ve girmek',
      'Literatür taraması yapmak',
      'İK tarafındaysan özgeçmiş taraması ve mülakat organizasyonu',
      'Gözlem ve kayıt tutmak',
    ],
    hazirlik: [
      'İstatistik ve SPSS — bu bölümde en çok fark yaratan beceri',
      'Araştırma yöntemleri dersini ciddiye almak',
      'İngilizce makale okuyabilmek',
      'Etik kurallar ve gizlilik',
    ],
    aranan: [
      'Veri ile çalışabilmek',
      'Sınırlarını bilmek — lisans öğrencisi terapi yapmaz',
      'Gizlilik bilinci',
    ],
    ipucu:
      'Klinik alan lisans düzeyinde büyük ölçüde kapalı ve bu normal. Araştırma ya da ' +
      'İK tarafında deneyim biriktirmek, yüksek lisans başvurunda da işine yarıyor.',
    aramaKelimeleri: ['psikoloji', 'insan kaynakları', 'araştırma'],
    giris:
      'Psikoloji bölümünde staj, diğer bölümlerdeki gibi işlemiyor ve bunu baştan bilmek ' +
      'gerekiyor: lisans öğrencisi klinik uygulama yapamıyor, danışan göremiyor ve test ' +
      'uygulayamıyor. Bu yasal bir sınır, kurumların keyfî tercihi değil. Dolayısıyla bu ' +
      'bölümde staj çoğunlukla gözlem, kurum tanıma, araştırma desteği ve sosyal proje ' +
      'tarafında yapılıyor. Bunu bilerek başvurmak hem doğru yere gitmeni sağlıyor hem de ' +
      'kurumla yaşanan yanlış anlaşmaları önlüyor. Bu sayfada hangi kurumların stajyer ' +
      'aldığını, stajyerin gerçekte ne yaptığını ve nelere dikkat etmen gerektiğini bulacaksın.',
    pozisyonlar: [
      'Kurum içi gözlem stajı (hastane, rehabilitasyon merkezi, özel eğitim kurumu)',
      'Araştırma asistanlığı — üniversite laboratuvarları',
      'İnsan kaynakları ve endüstri-örgüt psikolojisi tarafı',
      'Sivil toplum kuruluşlarında sosyal proje desteği',
      'Rehberlik ve danışma merkezlerinde gözlem',
    ],
    dikkat: [
      'Lisans öğrencisi olarak danışan göremez, test uygulayamaz ve terapi süreci yürütemezsin. ' +
        'Bunu vaat eden bir yer varsa orası hem seni hem danışanı riske atıyor.',
      'Gördüğün her şey gizli bilgi. İsim, olay ayrıntısı ve kurum bilgisi staj defterine bile ' +
        'yazılmaz; yazmadan önce sorumluna sor.',
      'Endüstri-örgüt tarafı (insan kaynakları) bu bölüm için en çok staj imkânı olan alan ve ' +
        'çoğu öğrenci hiç düşünmüyor.',
      'Araştırma asistanlığı için kendi bölümündeki hocalara sormak en kolay yol; çoğu ' +
        'laboratuvar öğrenci arıyor ama ilan açmıyor.',
    ],
    cvIpucu:
      'Araştırma tarafında ne yaptığını somut yaz: hangi veri toplama yöntemi, kaç katılımcı, ' +
      'hangi analiz programı. SPSS ya da benzeri bir programı kullanabiliyorsan bunu mutlaka ' +
      'belirt — bu bölümde en çok aranan ve en az yazılan beceri. Gönüllü çalışma ve sosyal ' +
      'sorumluluk projeleri de gerçek deneyim satırı; küçültmeden yaz.',
    sss: [
      {
        soru: 'Psikoloji öğrencisi klinik staj yapabilir mi?',
        cevap:
          'Lisans öğrencisi olarak danışan görmen, test uygulaman ya da terapi yürütmen mümkün ' +
          'değil. Kurumlarda yapılan staj gözlem ve kurum tanıma niteliğinde oluyor; klinik ' +
          'uygulama yüksek lisans ve sonrasına ait.',
      },
      {
        soru: 'Psikoloji stajı nerede yapılır?',
        cevap:
          'Hastanelerin ilgili birimleri, rehabilitasyon ve özel eğitim merkezleri, üniversite ' +
          'araştırma laboratuvarları, sivil toplum kuruluşları ve şirketlerin insan kaynakları ' +
          'birimleri.',
      },
      {
        soru: 'İnsan kaynakları psikoloji mezunu için uygun mu?',
        cevap:
          'Fazlasıyla. Endüstri ve örgüt psikolojisi bu bölümün alanı; işe alım, değerlendirme ve ' +
          'eğitim tarafında psikoloji arka planı doğrudan işe yarıyor. Staj imkânı da klinik tarafa ' +
          'göre çok daha fazla.',
      },
      {
        soru: 'SPSS bilmem gerekiyor mu?',
        cevap:
          'Zorunlu değil ama araştırma tarafında en çok istenen şey. Temel düzeyde kullanabilmek ' +
          'bile araştırma asistanlığı başvurusunda seni öne çıkarıyor.',
      },
      {
        soru: 'Psikoloji bölümünde staj zorunlu mu?',
        cevap:
          'Okuluna göre değişiyor: bazı bölümlerde zorunlu staj var, bazılarında yok ve öğrenci ' +
          'gönüllü staj yapıyor. Kesin bilgi kendi bölümünün staj yönergesinde.',
      },
      {
        soru: 'Yüksek lisans başvurusunda staj deneyimi işe yarar mı?',
        cevap:
          'Özellikle araştırma deneyimi yarıyor. Bir laboratuvarda veri toplama ya da analiz ' +
          'sürecine katılmış olmak, başvuru dosyasında anlatabileceğin en somut şey. Kurum gözlem ' +
          'stajı da alanı tanıdığını gösteriyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'uluslararasi-ticaret',
    ad: 'Uluslararası Ticaret ve İşletmecilik',
    grup: 'sosyal',
    ozet: 'İhracat birimleri; yabancı dil burada doğrudan iş aracı.',
    aciklama:
      'Uluslararası ticaret stajı nerede yapılır, stajyer ne iş yapar ve hangi ' +
      'diller aranıyor.',
    nerede: [
      'İhracat yapan üretici firmalar',
      'Dış ticaret ve gümrük müşavirlik şirketleri',
      'Lojistik firmalarının uluslararası birimleri',
      'Ticaret odaları ve ihracatçı birlikleri',
    ],
    isler: [
      'Proforma fatura ve ihracat evrakı hazırlamak',
      'Yurt dışı müşteri yazışmalarını takip etmek',
      'Pazar araştırması yapmak',
      'Fuar ve müşteri ziyaretlerine destek olmak',
    ],
    hazirlik: [
      'İngilizce — burada ders değil, günlük iş aracı',
      'Incoterms teslim şekilleri',
      'Akreditif ve ödeme yöntemlerinin mantığı',
      'Excel',
    ],
    aranan: [
      'Yabancı dil seviyesi; ikinci dil ciddi avantaj',
      'Yazışma disiplini',
      'Detaya dikkat — evrak hatası malı gümrükte bekletiyor',
    ],
    ipucu:
      'İkinci bir dil (Almanca, Rusça, Arapça) bu alanda İngilizceden daha çok ' +
      'ayrıştırıyor; firmalar o pazarlarda yazışacak kişi arıyor.',
    aramaKelimeleri: ['dış ticaret', 'ihracat', 'lojistik'],
    giris:
      'Uluslararası ticaret, staj bulurken en çok atlanan avantaja sahip bölümlerden biri: ' +
      'ihracat yapan her şirketin dış ticaret işlemlerini yürüten bir birimi var ve bu birimler ' +
      'sürekli iş yükü altında. Yani ilan az çıksa da ihtiyaç fazla. Şartı ise net: yabancı dil ' +
      'gerçekten kullanılabilir seviyede olmalı, çünkü işin büyük kısmı yazışma ve belge. Bu ' +
      'sayfada hangi tür şirketlerin stajyer aldığını, dış ticaret stajyerine verilen gerçek ' +
      'işleri, hangi belgeleri önceden tanımanın işe yaradığını ve başvuru ipuçlarını ' +
      'bulacaksın.',
    pozisyonlar: [
      'İhracat ve ithalat operasyon birimleri',
      'Gümrük müşavirlik firmaları',
      'Lojistik ve nakliye şirketlerinin dış ticaret masaları',
      'Üretici firmaların yurt dışı satış ekipleri',
      'Ticaret odaları ve ihracatçı birlikleri',
    ],
    dikkat: [
      'Yabancı dil bu bölümde süs değil, işin kendisi. Yazışmaların ve belgelerin çoğu ' +
        'İngilizce; seviyeni abartmak stajın ilk haftasında ortaya çıkıyor.',
      'İhracat yapan üretici firmalar ilan açmadan stajyer alıyor. Şehrindeki sanayi sitesinde ' +
        'ihracat yapan firmaları listeleyip doğrudan yazmak en verimli yol.',
      'İşin büyük kısmı belge ve mevzuat: fatura, konşimento, menşe belgesi, akreditif. Detaya ' +
        'dikkat edemeyen biri için bu iş yorucu oluyor.',
      'Gümrük müşavirlik firmalarında öğrenilen şey yoğun ve hızlı; alanı tanımak için en ' +
        'verimli yerlerden biri ama tempoyu bilerek gitmek gerekiyor.',
    ],
    cvIpucu:
      'Yabancı dil seviyeni somut yaz: "İngilizce — iş yazışması ve telefon görüşmesi" gibi. Bu ' +
      'bölümde CV\'nin en çok bakılan satırı orası. Excel seviyeni ve varsa bir ERP ya da ' +
      'gümrük yazılımı deneyimini belirt. Dış ticaret belgelerinin adlarını biliyorsan bunu ' +
      'yazmak, alana gerçekten ilgi duyduğunu gösteriyor.',
    sss: [
      {
        soru: 'Dış ticaret stajı için hangi dil gerekiyor?',
        cevap:
          'İngilizce neredeyse her yerde şart. İkinci bir dil (Almanca, Rusça, Arapça, Fransızca) ' +
          'ise hangi pazara çalıştığına göre büyük avantaj sağlıyor ve rekabeti ciddi biçimde ' +
          'azaltıyor.',
      },
      {
        soru: 'Dış ticaret stajyerine hangi işler veriliyor?',
        cevap:
          'Yurt dışı yazışmaların takibi, teklif ve sipariş kayıtları, dış ticaret belgelerinin ' +
          'hazırlığı ve kontrolü, navlun ve teslim sürelerinin izlenmesi, gümrük süreçlerinin ' +
          'takibi.',
      },
      {
        soru: 'Gümrük müşavirliği bürosunda staj yapmak mantıklı mı?',
        cevap:
          'Alanı en hızlı öğreten yerlerden biri: belgelerin tamamı oradan geçiyor. Tempo yüksek ' +
          'ama iki ayda gördüğün işlem çeşitliliği başka hiçbir yerde bulunmuyor.',
      },
      {
        soru: 'Hangi belgeleri önceden öğrenmeliyim?',
        cevap:
          'Proforma fatura, ticari fatura, konşimento, menşe şahadetnamesi ve akreditifin ne işe ' +
          'yaradığını bilmek yeterli. Ayrıntısını stajda öğreniyorsun ama adlarını bilmek ilk günü ' +
          'çok kolaylaştırıyor.',
      },
      {
        soru: 'İhracat yapan firmaları nasıl bulurum?',
        cevap:
          'Şehrinin ticaret odası ve ihracatçı birlikleri üye listesi tutuyor. Organize sanayi ' +
          'bölgelerinin firma rehberleri de açık. Bu listeler doğrudan başvuru için hazır bir ' +
          'kaynak.',
      },
      {
        soru: 'Bu bölümün stajı sadece İstanbul\'da mı bulunur?',
        cevap:
          'Hayır. İhracat yapan üretici her sanayi şehrinde var: Bursa, İzmir, Gaziantep, Denizli, ' +
          'Kayseri ve daha fazlası. Küçük şehirde rekabet düşük olduğu için kabul alma ihtimali ' +
          'genellikle daha yüksek.',
      },
    ],
    guncelleme: '2026-08-17',
  },

  /* ------------------------------------------------------------- sağlık */
  {
    slug: 'hemsirelik',
    ad: 'Hemşirelik',
    grup: 'saglik',
    ozet: 'Klinik uygulama okul üzerinden yapılıyor; ilan aranmıyor.',
    aciklama:
      'Hemşirelik stajı nasıl yapılır? Klinik uygulama süreci, öğrencinin ' +
      'görevleri ve hazırlık.',
    nerede: [
      'Üniversite ve devlet hastaneleri',
      'Özel hastaneler',
      'Aile sağlığı merkezleri',
      'Okulun anlaşmalı olduğu kurumlar',
    ],
    isler: [
      'Sorumlu hemşire gözetiminde hasta bakımına katılmak',
      'Vital bulguları ölçmek ve kaydetmek',
      'İlaç hazırlığını gözlemlemek',
      'Hasta dosyası ve kayıt sistemini öğrenmek',
    ],
    hazirlik: [
      'Temel beceri laboratuvarındaki uygulamaları tekrar etmek',
      'Enfeksiyon kontrolü ve el hijyeni',
      'İlaç hesaplama — hata payı sıfır olan konu',
      'Hasta mahremiyeti kuralları',
    ],
    aranan: [
      'Aşı kartı ve sağlık raporu',
      'Vardiya düzenine uyum',
      'Hasta bilgisinde kesin gizlilik',
    ],
    ipucu:
      'Bu bölümde staj yeri aramıyorsun; okulun yerleştiriyor. Enerjini yer aramaya ' +
      'değil, gittiğin klinikte soru sormaya harca — değerlendirme oradan geliyor.',
    aramaKelimeleri: ['sağlık', 'hastane', 'hemşire'],
    giris:
      'Hemşirelikte staj, diğer bölümlerdekinden farklı işliyor ve bu farkı bilmek zaman ' +
      'kazandırıyor: klinik uygulamanı okulun anlaşmalı olduğu kuruma okul yerleştiriyor, sen ' +
      'ilan aramıyorsun. Yani enerjini yer bulmaya değil, gittiğin klinikte ne öğrendiğine ' +
      'harcaman gerekiyor. Değerlendirme de oradan geliyor: sorumlu hemşirenin gözlemi, senin ' +
      'soru sorman ve kayıt disiplinin. Bu sayfada uygulamanın hangi birimlerde yapıldığını, ' +
      'öğrencinin gerçekte ne yaptığını, başlamadan önce nelerin hazır olması gerektiğini ve ' +
      'klinikte hangi kuralların kesin olduğunu bulacaksın.',
    pozisyonlar: [
      'Dahiliye ve cerrahi servisler',
      'Acil servis',
      'Yoğun bakım üniteleri',
      'Çocuk ve doğum servisleri',
      'Aile sağlığı merkezleri ve toplum sağlığı',
    ],
    dikkat: [
      'Hasta mahremiyeti kesin kural. Hasta adı, tanısı ve dosya bilgisi klinik dışına çıkmaz; ' +
        'sosyal medya paylaşımı en ağır sonuçlanan hata.',
      'İlaç hesaplama hata payı sıfır olan konu. Uygulamaya başlamadan önce tekrar et; emin ' +
        'olmadığın hiçbir işlemi sorumlu hemşireye sormadan yapma.',
      'Aşı kartı ve sağlık raporu genellikle uygulamadan önce isteniyor. Süreci erken başlat; ' +
        'eksik belge uygulamanın gecikmesine yol açıyor.',
      'Vardiya düzeni gece ve hafta sonunu içerebiliyor. Ulaşım ve dinlenme planını buna göre ' +
        'yapmak, ilk haftayı çok kolaylaştırıyor.',
    ],
    cvIpucu:
      'Mezuniyet sonrası başvurularda hangi birimlerde uygulama yaptığını yaz: yoğun bakım, ' +
      'acil, cerrahi ayrı ayrı. Bu, işverenin gördüğü ilk şey. Aldığın sertifikaları (ilk ' +
      'yardım, temel yaşam desteği) ve gönüllü sağlık çalışmalarını da belirt. Klinik uygulama ' +
      'gerçek bir deneyim satırı; "okul stajı" diye küçültme.',
    sss: [
      {
        soru: 'Hemşirelik stajı için yer aramam gerekiyor mu?',
        cevap:
          'Hayır. Klinik uygulamanı okulun anlaşmalı olduğu kuruma okul yerleştiriyor. Sana düşen, ' +
          'okulunun staj birimiyle takvimi ve belgeleri konuşmak.',
      },
      {
        soru: 'Klinik uygulamada öğrenci ne yapabiliyor?',
        cevap:
          'Sorumlu hemşire gözetiminde hasta bakımına katılıyor, vital bulguları ölçüp kaydediyor, ' +
          'ilaç hazırlığını gözlemliyor ve kayıt sistemini öğreniyor. Yetki ve sorumluluk sorumlu ' +
          'hemşirede kalıyor.',
      },
      {
        soru: 'Klinik uygulama için hangi belgeler isteniyor?',
        cevap:
          'Genellikle aşı kartı ve sağlık raporu; kuruma göre ek belge istenebiliyor. Okulun staj ' +
          'biriminden kesin listeyi al ve süreci erken başlat.',
      },
      {
        soru: 'Vardiyaya kalmak zorunda mıyım?',
        cevap:
          'Uygulama programını okul ve kurum belirliyor; gece ve hafta sonu vardiyası programın ' +
          'parçası olabiliyor. Kesin bilgi kendi bölümünün uygulama takviminde.',
      },
      {
        soru: 'Klinikte hata yapmaktan korkuyorum, ne yapmalıyım?',
        cevap:
          'Emin olmadığın hiçbir işlemi tek başına yapma ve sormaktan çekinme. Klinikte sorulmayan ' +
          'soru, yapılan hatadan çok daha tehlikeli sayılıyor.',
      },
      {
        soru: 'Uygulamadan iyi not almanın yolu nedir?',
        cevap:
          'Soru sormak, kayıtları düzgün tutmak ve zamanında gelmek. Değerlendirme büyük ölçüde ' +
          'sorumlu hemşirenin gözlemine dayanıyor ve bu üçü en çok göze çarpan şeyler.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'fizyoterapi-ve-rehabilitasyon',
    ad: 'Fizyoterapi ve Rehabilitasyon',
    grup: 'saglik',
    ozet: 'Klinik uygulama okul üzerinden; özel merkezlerde gözlem imkânı var.',
    aciklama:
      'Fizyoterapi stajı nerede yapılır, öğrencinin görevleri ve hazırlık.',
    nerede: [
      'Hastanelerin fizik tedavi üniteleri',
      'Özel rehabilitasyon merkezleri',
      'Spor kulüplerinin sağlık birimleri',
      'Özel eğitim merkezleri',
    ],
    isler: [
      'Fizyoterapist gözetiminde egzersiz uygulamalarına katılmak',
      'Hasta değerlendirme ölçümlerine eşlik etmek',
      'Cihaz kullanımını öğrenmek',
      'Seans kayıtlarını tutmak',
    ],
    hazirlik: [
      'Anatomi — sahada en çok yoklanan bilgi',
      'Manuel değerlendirme testleri',
      'Egzersiz reçetesinin mantığı',
      'Hasta iletişimi',
    ],
    aranan: [
      'Sağlık raporu ve aşı kartı',
      'Fiziksel dayanıklılık; iş ayakta ve elle',
      'Hasta mahremiyeti',
    ],
    ipucu:
      'Zorunlu klinik uygulamanın dışında, spor kulüpleri ve özel merkezlerde gözlemci ' +
      'olarak bulunmak mezuniyet sonrası iş bulmayı ciddi biçimde kolaylaştırıyor.',
    aramaKelimeleri: ['fizyoterapi', 'sağlık', 'rehabilitasyon'],
    giris:
      'Fizyoterapi ve rehabilitasyon bölümünde klinik uygulamayı okul yerleştiriyor; ilan ' +
      'aramıyorsun. Bu, yer bulma derdini ortadan kaldırıyor ama yerine başka bir soruyu ' +
      'koyuyor: iki ayı nasıl değerlendireceksin? Bu alanda öğrenmenin büyük kısmı izlemekten ' +
      'değil, hastayla kurulan temastan geliyor — ölçüm yapmak, egzersizi gözlemlemek, hastanın ' +
      'nasıl ilerlediğini takip etmek. Bu sayfada uygulamanın hangi birimlerde yapıldığını, ' +
      'öğrencinin gerçekte ne yaptığını ve uygulamayı verimli geçirmenin yollarını bulacaksın.',
    pozisyonlar: [
      'Fizik tedavi ve rehabilitasyon üniteleri',
      'Ortopedi ve nöroloji servisleri',
      'Özel rehabilitasyon merkezleri',
      'Pediatrik rehabilitasyon birimleri',
      'Spor sağlığı ve performans merkezleri',
    ],
    dikkat: [
      'Hasta bilgisi gizli: tanı, seyir ve kişisel bilgiler klinik dışına çıkmaz. Uygulama ' +
        'defterine yazarken bile sorumlu fizyoterapiste sor.',
      'Uygulamayı yürüten kişi fizyoterapist; öğrenci gözetim altında destek oluyor. Tedavi ' +
        'programı belirlemek ve değiştirmek öğrencinin işi değil.',
      'Hastayla fiziksel temas eden bir alan: pozisyon verme ve transfer tekniklerini doğru ' +
        'öğrenmek hem hastayı hem seni koruyor.',
      'Nöroloji ve pediatri tarafı duygusal olarak yorucu olabiliyor. Bunu bilerek gitmek, hem ' +
        'sana hem hastaya iyi geliyor.',
    ],
    cvIpucu:
      'Mezuniyet sonrası başvurularda hangi hasta gruplarıyla çalıştığını yaz: ortopedik, ' +
      'nörolojik, pediatrik ayrı ayrı. İşverenin bakacağı ilk şey bu. Kullanabildiğin ' +
      'değerlendirme ölçeklerini ve cihazları belirt. Spor kulübü, gönüllü sağlık çalışması ya ' +
      'da yaşlı bakımı deneyimin varsa mutlaka yaz.',
    sss: [
      {
        soru: 'Fizyoterapi stajı için yer aramam gerekiyor mu?',
        cevap:
          'Hayır. Klinik uygulamanı okul yerleştiriyor. Yapman gereken, okulunun staj birimiyle ' +
          'takvimi ve belgeleri konuşmak.',
      },
      {
        soru: 'Uygulamada hastaya doğrudan tedavi uygulayabiliyor muyum?',
        cevap:
          'Gözetim altında destek oluyorsun. Tedavi programını belirlemek ve değiştirmek ' +
          'fizyoterapistin sorumluluğunda; öğrenci uygulamaya katılıyor ama programı yürütmüyor.',
      },
      {
        soru: 'Hangi birimlerde uygulama yapılıyor?',
        cevap:
          'Fizik tedavi ve rehabilitasyon üniteleri, ortopedi ve nöroloji servisleri, özel ' +
          'rehabilitasyon merkezleri, pediatrik birimler ve spor sağlığı merkezleri.',
      },
      {
        soru: 'Uygulamayı verimli geçirmenin yolu nedir?',
        cevap:
          'Her hastada üç şeyi not al: hangi sorun, hangi yaklaşım, ne değişti. İzleyip geçmek ' +
          'yerine bu üçlüyü tutmak, iki ayın sonunda elinde gerçek bir birikim bırakıyor.',
      },
      {
        soru: 'Değerlendirme ölçeklerini bilmem gerekiyor mu?',
        cevap:
          'Uzmanlık beklenmiyor ama temel ölçeklerin ne işe yaradığını bilmek ilk haftayı çok ' +
          'kolaylaştırıyor ve sorumlu fizyoterapistin sana daha çok iş vermesini sağlıyor.',
      },
      {
        soru: 'Pediatrik rehabilitasyon zor mu?',
        cevap:
          'Sabır isteyen ve duygusal olarak yorucu olabilen bir alan. Karşılığında alanı en derin ' +
          'öğreten yerlerden biri; bu tarafta çalışmayı düşünüyorsan görmen gereken bir deneyim.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'tibbi-laboratuvar-teknikleri',
    ad: 'Tıbbi Laboratuvar Teknikleri (MYO)',
    grup: 'saglik',
    ozet: 'Hastane ve özel laboratuvarlar; okul yerleştirmesi ağırlıklı.',
    aciklama:
      'Tıbbi laboratuvar teknikleri stajı nerede yapılır ve öğrenci ne iş yapar.',
    nerede: [
      'Hastane laboratuvarları',
      'Özel tıbbi tahlil laboratuvarları',
      'Halk sağlığı laboratuvarları',
      'Kan merkezleri',
    ],
    isler: [
      'Numune kabul ve kayıt işlemlerini öğrenmek',
      'Cihaz hazırlığına eşlik etmek',
      'Biyokimya ve hematoloji analizlerini gözlemlemek',
      'Laboratuvar güvenliği kurallarını uygulamak',
    ],
    hazirlik: [
      'Numune alma ve saklama koşulları',
      'Biyogüvenlik kuralları',
      'Temel cihaz bilgisi',
      'Kayıt ve barkod sistemleri',
    ],
    aranan: [
      'Aşı kartı ve sağlık raporu',
      'Titizlik — yanlış etiketlenen numune yanlış teşhis demek',
      'Gizlilik',
    ],
    ipucu:
      'Numune etiketleme ve kabul süreci sıkıcı görünüyor ama laboratuvar hatalarının ' +
      'çoğu orada oluyor. Orayı iyi öğrenen stajyer fark ediliyor.',
    aramaKelimeleri: ['laboratuvar', 'sağlık', 'analiz'],
    giris:
      'Tıbbi laboratuvar teknikleri bölümünde uygulama yerini okul belirliyor; ilan ' +
      'aramıyorsun. Bu bölümün uygulaması, sonucu doğrudan bir hastanın tedavisini etkileyen ' +
      'bir işin içinde geçiyor — yanlış etiketlenmiş bir tüp ya da atlanmış bir adım, yanlış ' +
      'bir tanıya yol açabiliyor. Bu yüzden laboratuvarda en çok değer verilen şey hız değil, ' +
      'izlenebilirlik ve dikkat. Bu sayfada uygulamanın hangi birimlerde yapıldığını, ' +
      'öğrencinin gerçekte ne yaptığını ve laboratuvarda hangi kuralların kesin olduğunu ' +
      'bulacaksın.',
    pozisyonlar: [
      'Biyokimya laboratuvarı',
      'Mikrobiyoloji laboratuvarı',
      'Hematoloji ve kan bankası',
      'Patoloji laboratuvarı',
      'Numune kabul ve kan alma birimi',
    ],
    dikkat: [
      'Numune etiketi ve kayıt zinciri bu işin omurgası. Yanlış etiketlenmiş bir tüp, yanlış ' +
        'hastaya ait bir sonuç demek; bu alanda en ağır hata budur.',
      'Biyolojik materyalle çalışıyorsun: eldiven, önlük ve atık ayrımı kuralları kesin. ' +
        'Kesici-delici alet yaralanmalarında ne yapılacağını ilk gün öğren.',
      'Hasta bilgisi ve test sonucu gizli. Sonuç hastaya laboratuvar tarafından değil, hekim ' +
        'tarafından açıklanıyor; öğrencinin sonuç yorumlama yetkisi yok.',
      'Cihazlar kalibrasyon ve kalite kontrol düzenine bağlı çalışıyor. Bu kayıtları izlemek, ' +
        'laboratuvarın nasıl güvenilir sonuç ürettiğini gösteriyor.',
    ],
    cvIpucu:
      'Mezuniyet sonrası başvurularda hangi laboratuvar birimlerinde çalıştığını yaz: ' +
      'biyokimya, mikrobiyoloji, hematoloji ayrı ayrı. Kullandığın cihazları ve yaptığın ' +
      'testleri adıyla belirt — bu bölümde en çok bakılan satır orası. Kan alma deneyimin varsa ' +
      'mutlaka yaz; özel laboratuvarlar buna doğrudan bakıyor.',
    sss: [
      {
        soru: 'Tıbbi laboratuvar stajı için yer aramam gerekiyor mu?',
        cevap:
          'Hayır. Uygulama yerini okul belirliyor ve anlaşmalı kuruma yerleştiriyor. Sana düşen, ' +
          'okulunun staj birimiyle takvimi ve belgeleri konuşmak.',
      },
      {
        soru: 'Laboratuvarda öğrenci ne yapabiliyor?',
        cevap:
          'Numune kabul ve kayıt, numune hazırlama, cihaz çalıştırma süreçlerine gözetim altında ' +
          'katılma, kalite kontrol kayıtlarını izleme. Sonuç onayı ve yorum uzmanın işi.',
      },
      {
        soru: 'Kan alabiliyor muyum?',
        cevap:
          'Kurumun ve okulun kurallarına bağlı; yapılıyorsa gözetim altında ve eğitim sonrası ' +
          'oluyor. Kendi başına işlem yapmadan önce mutlaka sorumluna sor.',
      },
      {
        soru: 'Numune etiketleme neden bu kadar önemli?',
        cevap:
          'Çünkü sonuç doğrudan bir hastanın tedavisini belirliyor. Yanlış etiket, yanlış hastaya ' +
          'ait bir sonuç demek ve bu laboratuvarda en ağır hata sayılıyor.',
      },
      {
        soru: 'Hangi birimde uygulama yapmak daha çok öğretir?',
        cevap:
          'Hepsi farklı şey öğretiyor: biyokimya cihaz ve otomasyonu, mikrobiyoloji kültür ve ' +
          'değerlendirmeyi, hematoloji mikroskop becerisini. Mümkünse rotasyon iste.',
      },
      {
        soru: 'Test sonucunu hastaya söyleyebilir miyim?',
        cevap:
          'Hayır. Sonuç hekim tarafından değerlendirilip hastaya aktarılıyor. Laboratuvar ' +
          'çalışanının ve özellikle öğrencinin sonuç yorumlama yetkisi bulunmuyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },

  /* ---------------------------------------------------- turizm ve hizmet */
  {
    slug: 'turizm-ve-otel-yoneticiligi',
    ad: 'Turizm ve Otel Yöneticiliği',
    grup: 'hizmet',
    ozet: 'Sezonluk staj yaygın; otel çoğu zaman konaklama ve yemek veriyor.',
    aciklama:
      'Turizm ve otel yöneticiliği stajı nerede yapılır, stajyer hangi ' +
      'departmanlarda çalışır ve ne zaman başvurulmalı.',
    nerede: [
      'Oteller ve tatil köyleri',
      'Seyahat acenteleri',
      'Kongre ve etkinlik şirketleri',
      'Havayolu ve yer hizmetleri firmaları',
    ],
    isler: [
      'Ön büro: giriş çıkış işlemleri, misafir karşılama',
      'Kat hizmetleri ve yiyecek içecek departmanlarında rotasyon',
      'Rezervasyon sistemini kullanmak',
      'Misafir taleplerini takip etmek',
    ],
    hazirlik: [
      'İngilizce konuşabilmek — burada yazılı değil sözlü lazım',
      'İkinci dil: Rusça, Almanca, Arapça ciddi avantaj',
      'Bir otel yönetim programını tanımak (Opera gibi)',
      'Misafir iletişimi ve şikâyet yönetimi',
    ],
    aranan: [
      'Sezon boyunca çalışabilmek',
      'Yabancı dil',
      'Vardiya ve yoğun tempoya uyum',
    ],
    ipucu:
      'Sezonluk oteller staj başvurularını sezondan aylar önce topluyor. İlkbaharda ' +
      'aramaya başlayan çoğu öğrenci geç kalmış oluyor — kışın başvur.',
    aramaKelimeleri: ['turizm', 'otel', 'ön büro'],
    giris:
      'Turizm ve otel yöneticiliğinde staj, sektörün kendisi kadar mevsime bağlı: yazın sahil ' +
      'otellerinde çok sayıda staj yeri açılıyor, kışın ise şehir otelleri ve kayak bölgeleri ' +
      'devrede oluyor. Bir de departman gerçeği var — önbüro, kat hizmetleri, yiyecek-içecek ve ' +
      'satış birbirinden tamamen farklı işler ve birinde çalışmak diğerini öğretmiyor. ' +
      'Rotasyonlu staj veren tesisleri tercih etmek, iki ayda otelin tamamını görmek demek. Bu ' +
      'sayfada departmanları, stajyere verilen gerçek işleri ve başvururken bilmen gerekenleri ' +
      'bulacaksın.',
    pozisyonlar: [
      'Önbüro ve rezervasyon',
      'Yiyecek-içecek servisi ve restoran operasyonu',
      'Kat hizmetleri ve housekeeping',
      'Satış, pazarlama ve etkinlik organizasyonu',
      'Seyahat acenteleri ve tur operatörleri',
    ],
    dikkat: [
      'Rotasyonlu staj veren tesisleri tercih et: tek bir departmanda kalmak, otelin nasıl ' +
        'işlediğini öğrenmeni engelliyor.',
      'Sahil otellerinde staj sezonluk; sezon dışında tesis kapalı oluyor. Şehir otelleri yıl ' +
        'boyunca açık ve kurumsal süreçleri daha net.',
      'Yabancı dil bu sektörde doğrudan iş aracı. Konuşma seviyesinde bilmek, seni ön büroya ve ' +
        'misafirle temas eden pozisyonlara taşıyor.',
      'Sezonluk tesislerde konaklama ve yemek genelde sağlanıyor ama şartları baştan yazılı ' +
        'olarak netleştir; sonradan anlaşmazlık en sık burada çıkıyor.',
    ],
    cvIpucu:
      'Yabancı dil seviyeni somut yaz: "İngilizce — misafirle konuşma seviyesinde" gibi. Bu ' +
      'sektörde CV\'nin en çok bakılan satırı orası ve ikinci bir dil (Rusça, Almanca, Arapça) ' +
      'rekabeti ciddi biçimde azaltıyor. Müşteriyle temas eden herhangi bir işte çalıştıysan ' +
      'yaz; bu sektörde iletişim en değerli beceri.',
    sss: [
      {
        soru: 'Turizm stajı hangi departmanlarda yapılır?',
        cevap:
          'Önbüro ve rezervasyon, yiyecek-içecek, kat hizmetleri, satış ve pazarlama. Ayrıca ' +
          'seyahat acenteleri ve tur operatörleri de stajyer alıyor.',
      },
      {
        soru: 'Sahil oteli mi, şehir oteli mi daha iyi?',
        cevap:
          'Sahil oteli sezonda yoğun ve çok misafir görüyorsun; şehir oteli yıl boyu açık ve ' +
          'kurumsal süreçleri daha net. İş temposu ve öğrenme biçimi farklı.',
      },
      {
        soru: 'Yabancı dil şart mı?',
        cevap:
          'Misafirle temas eden pozisyonlarda evet. İkinci bir dil ise doğrudan avantaj: aynı ' +
          'tesise başvuran adaylar arasında seni öne çıkaran şey çoğu zaman bu oluyor.',
      },
      {
        soru: 'Konaklama ve yemek sağlanıyor mu?',
        cevap:
          'Sezonluk tesislerde genellikle sağlanıyor ama şartlar tesise göre değişiyor. Başlamadan ' +
          'önce yazılı olarak netleştirmek, sonradan çıkan anlaşmazlıkları önlüyor.',
      },
      {
        soru: 'Kat hizmetlerinde staj yapmak gereksiz mi?',
        cevap:
          'Tam tersi. Otel yöneticiliğinde bu departmanı bilmeden operasyonu yönetmek mümkün ' +
          'olmuyor; maliyetin ve misafir memnuniyetinin büyük kısmı orada belirleniyor.',
      },
      {
        soru: 'Otel stajı sonrasında kadroya alınıyor mu?',
        cevap:
          'Sektörde eleman devri yüksek ve tesisler tanıdıkları stajyeri sezonluk ya da sürekli ' +
          'kadroya almayı tercih ediyor. Niyetini sezon bitmeden söylemek belirleyici oluyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
  {
    slug: 'gastronomi-ve-mutfak',
    ad: 'Gastronomi ve Mutfak Sanatları',
    grup: 'hizmet',
    ozet: 'Mutfak stajı fiziksel olarak ağır; hijyen belgesi şart.',
    aciklama:
      'Gastronomi ve aşçılık stajı nerede yapılır, stajyer mutfakta ne iş yapar ' +
      've hangi belgeler gerekiyor.',
    nerede: [
      'Otel mutfakları',
      'Restoranlar ve fine dining işletmeleri',
      'Pastane ve fırınlar',
      'Toplu yemek üretim tesisleri (catering)',
    ],
    isler: [
      'Mizanplas: servis öncesi hazırlık',
      'Bir istasyonda şefin yanında çalışmak',
      'Soğuk mutfak ve pastane rotasyonu',
      'Depo ve maliyet takibine destek olmak',
    ],
    hazirlik: [
      'Temel bıçak teknikleri ve doğrama',
      'Ana sosların mantığı',
      'Hijyen ve gıda güvenliği (HACCP)',
      'Mutfak hiyerarşisini bilmek',
    ],
    aranan: [
      'Hijyen ve portör belgesi',
      'Uzun süre ayakta ve sıcakta çalışabilmek',
      'Talimatı harfiyen uygulamak — mutfakta doğaçlama stajyerin işi değil',
    ],
    ipucu:
      'Mutfak stajında ilk hafta genelde en basit işler verilir ve bu bir sınavdır. ' +
      'Sebze doğramayı ciddiye alan stajyer ikinci hafta ocağa geçiyor.',
    aramaKelimeleri: ['mutfak', 'aşçı', 'gastronomi'],
    giris:
      'Gastronomi stajı, okulda öğrendiğinle mutfakta yaşadığın arasındaki farkı en sert ' +
      'gösteren stajlardan biri. Profesyonel mutfak bir hiyerarşiyle çalışıyor, servis saatinde ' +
      'tempo çok yüksek ve mesai saatleri ofis düzenine benzemiyor: akşam ve hafta sonu ' +
      'çalışması bu işin normali. Bunu bilerek gitmek, ilk haftada pes etmemenin en önemli ' +
      'şartı. Bu sayfada hangi tür mutfakların stajyer aldığını, stajyere verilen gerçek ' +
      'işleri, hijyen tarafında nelerin beklendiğini ve başvuru ipuçlarını bulacaksın.',
    pozisyonlar: [
      'Otel mutfakları — en yapılandırılmış eğitim burada',
      'Restoran ve bistro mutfakları',
      'Pastane, fırın ve çikolata atölyeleri',
      'Toplu yemek ve catering üretimi',
      'Yiyecek-içecek üreten şirketlerin mutfak Ar-Ge birimleri',
    ],
    dikkat: [
      'Mesai saatleri akşam ve hafta sonuna kayıyor; servis saatlerinde tempo çok yüksek. Bunu ' +
        'bilerek başlamak, ilk hafta bırakmamanın en önemli şartı.',
      'Mutfakta hiyerarşi var ve bu keyfî değil: aynı anda çok kişinin güvenle çalışması için ' +
        'gerekiyor. Verilen işi sorgusuz değil ama kurala uygun yapmak öğreniyor.',
      'Hijyen kuralları kesin: bone, sakal filesi, takı yasağı ve el yıkama düzeni. Çoğu kurum ' +
        'portör muayenesi de istiyor; süreci önceden başlat.',
      'Turizm bölgelerinde mutfaklar sezonluk çalışıyor. Sezon dışında gidersen mutfak kapalı ' +
        'ya da çok düşük kapasitede oluyor.',
    ],
    cvIpucu:
      'Hangi mutfakta hangi bölümde çalıştığını yaz: soğuk mutfak, sıcak mutfak, pastane. ' +
      '"Mutfakta çalıştım" cümlesi hiçbir şef için bilgi taşımıyor. Hijyen belgesi ve portör ' +
      'muayenen varsa belirt. Kendi denediğin tarifler ya da katıldığın yarışmalar da gerçek ' +
      'deneyim; bu alanda merak en çok değer verilen şey.',
    sss: [
      {
        soru: 'Gastronomi stajı nerede yapılır?',
        cevap:
          'Otel mutfakları, restoranlar, pastane ve fırınlar, toplu yemek ve catering üretim ' +
          'tesisleri, yiyecek-içecek şirketlerinin Ar-Ge mutfakları.',
      },
      {
        soru: 'Otelde mi, restoranda mı staj yapmalıyım?',
        cevap:
          'Otel mutfağı en yapılandırılmış eğitimi veriyor: bölümler ayrı ve rotasyon mümkün. ' +
          'Restoran daha küçük ama işin tamamına dokunuyorsun. İkisi farklı şeyler öğretiyor.',
      },
      {
        soru: 'Stajda gerçekten yemek yapıyor muyum?',
        cevap:
          'İlk dönem çoğunlukla hazırlık: doğrama, porsiyonlama, mizanplas. Bu bilinçli — mutfakta ' +
          'hız ve düzen bu işlerle öğreniliyor. Güven kazandıkça pişirme tarafına geçiyorsun.',
      },
      {
        soru: 'Hijyen belgesi gerekiyor mu?',
        cevap:
          'Gıda üretilen alanda çalışacak herkesten portör muayenesi ya da benzeri bir sağlık kaydı ' +
          'isteniyor. Süreci başlatmak birkaç gün aldığı için staj öncesinde halletmek gerekiyor.',
      },
      {
        soru: 'Sezon dışında turizm bölgesinde staj yapabilir miyim?',
        cevap:
          'Çoğu tesis sezon dışında kapalı ya da çok düşük kapasitede çalışıyor. Şehir otelleri ve ' +
          'restoranlar ise yıl boyunca açık; sezon dışında oralara yönelmek daha verimli.',
      },
      {
        soru: 'Mutfakta çalışma saatleri nasıl?',
        cevap:
          'Servis saatlerine göre düzenleniyor: öğle ve akşam yoğun, aralarda hazırlık. Hafta sonu ' +
          'bu sektörün en yoğun günü, o yüzden izinler hafta içine denk geliyor.',
      },
    ],
    guncelleme: '2026-08-17',
  },
];

export function bolumBul(slug: string): Bolum | undefined {
  return BOLUMLER.find((b) => b.slug === slug);
}

/** Grup sırası sabit: liste her yenilemede aynı sırada görünsün. */
export const GRUP_SIRASI: BolumGrubu[] = [
  'muhendislik',
  'myo',
  'sosyal',
  'saglik',
  'tasarim',
  'hizmet',
];
