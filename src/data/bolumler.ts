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

export interface Bolum {
  slug: string;
  ad: string;
  grup: BolumGrubu;
  /** Liste satırında görünen tek cümle. */
  ozet: string;
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
    ozet: 'Staj ilanı en çok bulunan bölüm; rekabet de en yüksek burada.',
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
  },

  /* --------------------------------------------------------- MYO (devam) */
  {
    slug: 'lojistik',
    ad: 'Lojistik (MYO)',
    grup: 'myo',
    ozet: 'Depo, nakliye ve gümrük; işe alım oranı en yüksek MYO alanlarından.',
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
