/**
 * Büyük işverenlerin staj başvuru sayfaları — DİZİN, ilan değil.
 *
 * NEDEN AYRI BİR ŞEY
 * ------------------
 * Ölçüldü (2026-08-18): Türkiye'nin 79 büyük işvereninin kariyer sayfası
 * tarandı, hiçbiri okuyabildiğimiz bir ATS panosu kullanmıyor. Koç grubu
 * SuccessFactors'ta ve o hostun robots.txt'i herkese kapalı; geri kalanı
 * kendi portalını veya LinkedIn'i kullanıyor.
 *
 * Yani bu şirketlerin stajları otomatik olarak ilan listemize giremiyor —
 * ama öğrencinin aradığı staj büyük ölçüde tam olarak burada. Boşluğu
 * dürüst yoldan kapatıyoruz: ilan uydurmuyoruz, işverenin KENDİ resmi
 * başvuru sayfasına yönlendiriyoruz.
 *
 * İLAN LİSTESİNE NEDEN KARIŞMIYOR
 * -------------------------------
 * Bir kariyer sayfasını "ilan" diye göstermek iki şeyi birden bozardı:
 * öğrenci tıklayıp ilan bulamayınca güvenini kaybeder, ve arama motoru
 * için içeriksiz ilan sayfası üretmiş oluruz. Bu yüzden ayrı bölüm, ayrı
 * dil: "şu işveren stajı kendi sayfasından alıyor, buradan başvurulur".
 *
 * YAZIM KURALLARI
 * ---------------
 * - `ozet` bizim cümlelerimiz. Şirketin tanıtım metni kopyalanmıyor.
 * - Tarih, kontenjan, maaş gibi yıla bağlı sayı YAZILMIYOR. Doğrulayamadığımız
 *   şeyi yazmıyoruz; program takvimleri her yıl değişiyor ve eskimiş bir
 *   tarih öğrenciyi yanlış yönlendirir.
 * - `kariyerUrl` taramada 200 dönmüş, doğrulanmış adres.
 * - `bolumler` bizim editoryal eşleştirmemiz: hangi bölüm sayfasından bu
 *   işverene bağlanmak mantıklı. src/data/bolumler.ts slug'ları.
 */

export interface StajProgrami {
  /** Adres parçası ve React anahtarı. */
  slug: string;
  isveren: string;
  /** Tek kelimelik sektör — dizinde gruplama için. */
  sektor: string;
  /** Doğrulanmış resmi kariyer/staj sayfası. */
  kariyerUrl: string;
  /** Kendi yazdığımız kısa açıklama. */
  ozet: string;
  /** İlgili bölüm sayfalarının slug'ları — iç bağlantı için. */
  bolumler: string[];
  /**
   * Adresin en son ne zaman çağrılıp çalıştığının doğrulandığı gün.
   *
   * scripts/isveren-baglanti-kontrol.mjs yazıyor ve YALNIZCA çalışan
   * adreslere yazıyor: ölü bir adrese "bugün kontrol edildi" damgası
   * vurmak, tam da güveni bitiren şey olurdu.
   *
   * DİKKAT: bu alan "başvurular açık" demek DEĞİL. Kariyer sayfasının
   * ayakta olması başvuru alındığı anlamına gelmiyor; doğrulayamadığımız
   * için hiçbir kartta "Başvurular açık" yazmıyor.
   */
  sonKontrol?: string;
}

export const STAJ_PROGRAMLARI: StajProgrami[] = [
  {
    slug: 'aselsan',
    isveren: 'Aselsan',
    sektor: 'Savunma ve havacılık',
    kariyerUrl: 'https://www.aselsan.com/en/careers',
    ozet:
      'Savunma elektroniği üreticisi; radar, haberleşme ve elektro-optik sistemler geliştiriyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['elektrik-elektronik-muhendisligi', 'bilgisayar-muhendisligi', 'makine-muhendisligi', 'mekatronik'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'tusas',
    isveren: 'TUSAŞ',
    sektor: 'Savunma ve havacılık',
    kariyerUrl: 'https://www.tusas.com/insan-kaynaklari',
    ozet:
      'Uçak, helikopter ve insansız hava aracı üretimi yapıyor. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['makine-muhendisligi', 'elektrik-elektronik-muhendisligi', 'metalurji-ve-malzeme-muhendisligi', 'bilgisayar-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'roketsan',
    isveren: 'Roketsan',
    sektor: 'Savunma ve havacılık',
    kariyerUrl: 'https://www.roketsan.com.tr/insan-kaynaklari',
    ozet:
      'Roket ve füze sistemleri üreticisi. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['makine-muhendisligi', 'kimya-muhendisligi', 'elektrik-elektronik-muhendisligi', 'metalurji-ve-malzeme-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'tav-havalimanlari',
    isveren: 'TAV Havalimanları',
    sektor: 'Savunma ve havacılık',
    kariyerUrl: 'https://www.tav.aero/kariyer',
    ozet:
      'Havalimanı işletmeciliği yapıyor; terminal, yer hizmetleri ve teknik operasyon alanları var. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['isletme', 'turizm-ve-otel-yoneticiligi', 'lojistik', 'endustri-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'pegasus',
    isveren: 'Pegasus',
    sektor: 'Savunma ve havacılık',
    kariyerUrl: 'https://www.flypgs.com/kariyer',
    ozet:
      'Havayolu şirketi; uçuş operasyonu, teknik bakım ve merkez ofis birimleri bulunuyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['isletme', 'lojistik', 'makine-muhendisligi', 'turizm-ve-otel-yoneticiligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'arcelik',
    isveren: 'Arçelik',
    sektor: 'Otomotiv ve dayanıklı tüketim',
    kariyerUrl: 'https://www.arcelikglobal.com/career',
    ozet:
      'Beyaz eşya ve ev teknolojileri üreticisi; Türkiye\'de birden fazla üretim tesisi işletiyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['makine-muhendisligi', 'elektrik-elektronik-muhendisligi', 'endustri-muhendisligi', 'mekatronik'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'tofas',
    isveren: 'Tofaş',
    sektor: 'Otomotiv ve dayanıklı tüketim',
    kariyerUrl: 'https://www.tofas.com.tr/kariyer',
    ozet:
      'Bursa\'daki fabrikasında binek ve hafif ticari araç üretiyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['makine-muhendisligi', 'endustri-muhendisligi', 'mekatronik', 'metalurji-ve-malzeme-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'bsh-turkiye',
    isveren: 'BSH Türkiye',
    sektor: 'Otomotiv ve dayanıklı tüketim',
    kariyerUrl: 'https://www.bsh-group.com/career',
    ozet:
      'Ev aletleri üreticisi; Türkiye\'de üretim ve Ar-Ge faaliyeti yürütüyor. Başvurular grubun kariyer sayfasından alınıyor.',
    bolumler: ['makine-muhendisligi', 'elektrik-elektronik-muhendisligi', 'endustri-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'bosch-turkiye',
    isveren: 'Bosch Türkiye',
    sektor: 'Otomotiv ve dayanıklı tüketim',
    kariyerUrl: 'https://www.bosch.com.tr/kariyer',
    ozet:
      'Otomotiv yan sanayi, elektrikli el aletleri ve endüstriyel teknoloji alanlarında üretim yapıyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['makine-muhendisligi', 'mekatronik', 'elektrik-elektronik-muhendisligi', 'endustri-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'tupras',
    isveren: 'Tüpraş',
    sektor: 'Enerji ve kimya',
    kariyerUrl: 'https://www.tupras.com.tr/kariyer',
    ozet:
      'Rafineri işletmecisi; ham petrolü işleyip akaryakıt ve petrokimya ürünlerine çeviriyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['kimya-muhendisligi', 'makine-muhendisligi', 'cevre-muhendisligi', 'is-sagligi-ve-guvenligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'petkim',
    isveren: 'Petkim',
    sektor: 'Enerji ve kimya',
    kariyerUrl: 'https://www.petkim.com.tr/kariyer',
    ozet:
      'Petrokimya üreticisi; plastik ve kimyasal hammadde üretiyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['kimya-muhendisligi', 'makine-muhendisligi', 'cevre-muhendisligi', 'is-sagligi-ve-guvenligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'opet',
    isveren: 'Opet',
    sektor: 'Enerji ve kimya',
    kariyerUrl: 'https://www.opet.com.tr/insan-kaynaklari',
    ozet:
      'Akaryakıt dağıtım şirketi; istasyon ağı ve terminal operasyonu yürütüyor. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['isletme', 'lojistik', 'endustri-muhendisligi', 'muhasebe-ve-vergi-uygulamalari'],
  },
  {
    slug: 'aygaz',
    isveren: 'Aygaz',
    sektor: 'Enerji ve kimya',
    kariyerUrl: 'https://www.aygaz.com.tr/en/careers',
    ozet:
      'LPG dağıtımı yapıyor; dolum tesisleri ve dağıtım ağı işletiyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['kimya-muhendisligi', 'makine-muhendisligi', 'lojistik', 'is-sagligi-ve-guvenligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'sasa',
    isveren: 'Sasa',
    sektor: 'Enerji ve kimya',
    kariyerUrl: 'https://www.sasa.com.tr/kariyer',
    ozet:
      'Polyester elyaf ve iplik üreticisi. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['kimya-muhendisligi', 'makine-muhendisligi', 'metalurji-ve-malzeme-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'kordsa',
    isveren: 'Kordsa',
    sektor: 'Enerji ve kimya',
    kariyerUrl: 'https://www.kordsa.com/kariyer',
    ozet:
      'Lastik güçlendirme ve kompozit malzeme üreticisi. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['kimya-muhendisligi', 'metalurji-ve-malzeme-muhendisligi', 'makine-muhendisligi'],
  },
  {
    slug: 'erdemir',
    isveren: 'Erdemir',
    sektor: 'Demir-çelik ve çimento',
    kariyerUrl: 'https://www.erdemir.com.tr/kariyer',
    ozet:
      'Yassı çelik üreticisi; entegre demir-çelik tesisi işletiyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['metalurji-ve-malzeme-muhendisligi', 'makine-muhendisligi', 'elektrik-elektronik-muhendisligi', 'is-sagligi-ve-guvenligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'kardemir',
    isveren: 'Kardemir',
    sektor: 'Demir-çelik ve çimento',
    kariyerUrl: 'https://www.kardemir.com/insan-kaynaklari',
    ozet:
      'Uzun ürün çelik üreticisi; ray ve profil üretimi yapıyor. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['metalurji-ve-malzeme-muhendisligi', 'makine-muhendisligi', 'endustri-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'tosyali-holding',
    isveren: 'Tosyalı Holding',
    sektor: 'Demir-çelik ve çimento',
    kariyerUrl: 'https://www.tosyaliholding.com.tr/insan-kaynaklari',
    ozet:
      'Demir-çelik üretimi ve boru sanayii alanında faaliyet gösteriyor. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['metalurji-ve-malzeme-muhendisligi', 'makine-muhendisligi', 'endustri-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'cimsa',
    isveren: 'Çimsa',
    sektor: 'Demir-çelik ve çimento',
    kariyerUrl: 'https://www.cimsa.com.tr/insan-kaynaklari',
    ozet:
      'Çimento ve yapı malzemeleri üreticisi. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['insaat-muhendisligi', 'kimya-muhendisligi', 'makine-muhendisligi', 'cevre-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'akcansa',
    isveren: 'Akçansa',
    sektor: 'Demir-çelik ve çimento',
    kariyerUrl: 'https://www.akcansa.com.tr/careers',
    ozet:
      'Çimento, hazır beton ve agrega üretiyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['insaat-muhendisligi', 'kimya-muhendisligi', 'makine-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'borusan',
    isveren: 'Borusan',
    sektor: 'Demir-çelik ve çimento',
    kariyerUrl: 'https://www.borusan.com/kariyer',
    ozet:
      'Çelik boru üretimi, lojistik ve otomotiv dağıtımı alanlarında şirketleri var. Başvurular grubun kariyer sayfasından alınıyor.',
    bolumler: ['metalurji-ve-malzeme-muhendisligi', 'lojistik', 'endustri-muhendisligi', 'isletme'],
  },
  {
    slug: 'enka',
    isveren: 'Enka',
    sektor: 'İnşaat ve taahhüt',
    kariyerUrl: 'https://www.enka.com/kariyer',
    ozet:
      'Uluslararası taahhüt ve inşaat şirketi; enerji santrali ve altyapı projeleri yürütüyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['insaat-muhendisligi', 'makine-muhendisligi', 'elektrik-elektronik-muhendisligi', 'mimarlik'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'limak',
    isveren: 'Limak',
    sektor: 'İnşaat ve taahhüt',
    kariyerUrl: 'https://www.limak.com.tr/kariyer',
    ozet:
      'İnşaat, enerji, çimento ve turizm alanlarında faaliyet gösteren grup. Başvurular grubun kariyer sayfasından alınıyor.',
    bolumler: ['insaat-muhendisligi', 'mimarlik', 'harita-ve-geomatik-muhendisligi', 'turizm-ve-otel-yoneticiligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'nurol',
    isveren: 'Nurol',
    sektor: 'İnşaat ve taahhüt',
    kariyerUrl: 'https://www.nurol.com.tr/kariyer',
    ozet:
      'İnşaat taahhüdü, savunma sanayii ve finans alanlarında şirketleri bulunan grup. Başvurular grubun kariyer sayfasından alınıyor.',
    bolumler: ['insaat-muhendisligi', 'makine-muhendisligi', 'mimarlik'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'garanti-bbva',
    isveren: 'Garanti BBVA',
    sektor: 'Bankacılık ve finans',
    kariyerUrl: 'https://www.garantibbva.com.tr/kariyer',
    ozet:
      'Özel sermayeli mevduat bankası; şube ağı ve genel müdürlük birimleri var. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['isletme', 'iktisat', 'bilgisayar-muhendisligi', 'muhasebe-ve-vergi-uygulamalari'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'is-bankasi',
    isveren: 'İş Bankası',
    sektor: 'Bankacılık ve finans',
    kariyerUrl: 'https://www.isbank.com.tr/kariyer',
    ozet:
      'Mevduat bankası; bankacılık ve teknoloji birimleri bulunuyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['isletme', 'iktisat', 'bilgisayar-muhendisligi', 'hukuk'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'qnb-finansbank',
    isveren: 'QNB Finansbank',
    sektor: 'Bankacılık ve finans',
    kariyerUrl: 'https://www.qnb.com.tr/insan-kaynaklari',
    ozet:
      'Mevduat bankası; bireysel ve kurumsal bankacılık alanlarında çalışıyor. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['isletme', 'iktisat', 'muhasebe-ve-vergi-uygulamalari', 'bilgisayar-muhendisligi'],
  },
  {
    slug: 'turk-telekom',
    isveren: 'Türk Telekom',
    sektor: 'Telekomünikasyon',
    kariyerUrl: 'https://www.turktelekom.com.tr/kariyer',
    ozet:
      'Sabit hat, internet ve mobil hizmet sağlayıcısı. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['elektrik-elektronik-muhendisligi', 'bilgisayar-muhendisligi', 'endustri-muhendisligi', 'isletme'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'turkcell',
    isveren: 'Turkcell',
    sektor: 'Telekomünikasyon',
    kariyerUrl: 'https://www.turkcell.com.tr/insan-kaynaklari',
    ozet:
      'Mobil operatör; şebeke, dijital servisler ve veri merkezi alanlarında çalışıyor. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['bilgisayar-muhendisligi', 'elektrik-elektronik-muhendisligi', 'endustri-muhendisligi', 'halkla-iliskiler-ve-pazarlama'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'vodafone-turkiye',
    isveren: 'Vodafone Türkiye',
    sektor: 'Telekomünikasyon',
    kariyerUrl: 'https://www.vodafone.com.tr/insan-kaynaklari',
    ozet:
      'Mobil operatör; şebeke işletimi ve dijital hizmetler yürütüyor. Başvurular kendi insan kaynakları sayfasından alınıyor.',
    bolumler: ['bilgisayar-muhendisligi', 'elektrik-elektronik-muhendisligi', 'isletme', 'halkla-iliskiler-ve-pazarlama'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'coca-cola-icecek',
    isveren: 'Coca-Cola İçecek',
    sektor: 'Gıda ve perakende',
    kariyerUrl: 'https://www.cci.com.tr/en/careers',
    ozet:
      'Meşrubat üretimi ve dağıtımı yapıyor; birden fazla ülkede fabrikası var. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['gida-muhendisligi', 'endustri-muhendisligi', 'lojistik', 'makine-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'eti',
    isveren: 'Eti',
    sektor: 'Gıda ve perakende',
    kariyerUrl: 'https://www.etietieti.com/careers',
    ozet:
      'Bisküvi, çikolata ve kek üreticisi. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['gida-muhendisligi', 'endustri-muhendisligi', 'makine-muhendisligi', 'halkla-iliskiler-ve-pazarlama'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'yildiz-holding',
    isveren: 'Yıldız Holding',
    sektor: 'Gıda ve perakende',
    kariyerUrl: 'https://www.yildizholding.com.tr/insan-kaynaklari',
    ozet:
      'Gıda ve perakende alanında çok sayıda markayı bünyesinde toplayan grup. Başvurular grubun insan kaynakları sayfasından alınıyor.',
    bolumler: ['gida-muhendisligi', 'isletme', 'endustri-muhendisligi', 'lojistik'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'migros',
    isveren: 'Migros',
    sektor: 'Gıda ve perakende',
    kariyerUrl: 'https://www.migroskurumsal.com/kariyer',
    ozet:
      'Market zinciri; mağaza operasyonu, depo ve online teslimat birimleri var. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['isletme', 'lojistik', 'gida-muhendisligi', 'muhasebe-ve-vergi-uygulamalari'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'boyner',
    isveren: 'Boyner',
    sektor: 'Gıda ve perakende',
    kariyerUrl: 'https://www.boynergrup.com/kariyer',
    ozet:
      'Hazır giyim perakendesi; mağazacılık ve e-ticaret operasyonu yürütüyor. Başvurular grubun kariyer sayfasından alınıyor.',
    bolumler: ['isletme', 'moda-tasarimi', 'halkla-iliskiler-ve-pazarlama', 'giyim-uretim-teknolojisi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'abdi-ibrahim',
    isveren: 'Abdi İbrahim',
    sektor: 'İlaç ve sağlık',
    kariyerUrl: 'https://www.abdiibrahim.com.tr/kariyer',
    ozet:
      'İlaç üreticisi; üretim tesisi ve Ar-Ge merkezi bulunuyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['kimya-muhendisligi', 'tibbi-laboratuvar-teknikleri', 'endustri-muhendisligi', 'is-sagligi-ve-guvenligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'bilim-ilac',
    isveren: 'Bilim İlaç',
    sektor: 'İlaç ve sağlık',
    kariyerUrl: 'https://www.bilimilac.com.tr/kariyer',
    ozet:
      'İlaç üreticisi; kendi üretim tesisini işletiyor. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['kimya-muhendisligi', 'tibbi-laboratuvar-teknikleri', 'endustri-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'acibadem-saglik',
    isveren: 'Acıbadem Sağlık',
    sektor: 'İlaç ve sağlık',
    kariyerUrl: 'https://www.acibadem.com.tr/kariyer',
    ozet:
      'Özel hastane grubu; hastane ve tıp merkezleri işletiyor. Başvurular grubun kariyer sayfasından alınıyor.',
    bolumler: ['hemsirelik', 'fizyoterapi-ve-rehabilitasyon', 'tibbi-laboratuvar-teknikleri', 'isletme'],
  },
  {
    slug: 'medicana',
    isveren: 'Medicana',
    sektor: 'İlaç ve sağlık',
    kariyerUrl: 'https://www.medicana.com.tr/kariyer',
    ozet:
      'Özel hastane grubu; birden fazla ilde hastanesi bulunuyor. Başvurular grubun kariyer sayfasından alınıyor.',
    bolumler: ['hemsirelik', 'fizyoterapi-ve-rehabilitasyon', 'tibbi-laboratuvar-teknikleri'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'sabanci-holding',
    isveren: 'Sabancı Holding',
    sektor: 'Sanayi ve holding',
    kariyerUrl: 'https://www.sabanci.com/tr/kariyer',
    ozet:
      'Enerji, çimento, finans ve sanayi alanlarında şirketleri olan holding. Başvurular holdingin kariyer sayfasından alınıyor.',
    bolumler: ['isletme', 'endustri-muhendisligi', 'iktisat', 'elektrik-elektronik-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'zorlu-holding',
    isveren: 'Zorlu Holding',
    sektor: 'Sanayi ve holding',
    kariyerUrl: 'https://www.zorlu.com.tr/kariyer',
    ozet:
      'Enerji, dayanıklı tüketim ve tekstil alanlarında şirketleri olan holding. Başvurular holdingin kariyer sayfasından alınıyor.',
    bolumler: ['elektrik-elektronik-muhendisligi', 'endustri-muhendisligi', 'isletme', 'giyim-uretim-teknolojisi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'oyak',
    isveren: 'Oyak',
    sektor: 'Sanayi ve holding',
    kariyerUrl: 'https://www.oyak.com.tr/kariyer',
    ozet:
      'Çimento, demir-çelik, otomotiv ve finans alanlarında şirketleri olan grup. Başvurular grubun kariyer sayfasından alınıyor.',
    bolumler: ['metalurji-ve-malzeme-muhendisligi', 'insaat-muhendisligi', 'isletme', 'endustri-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'schneider-electric-turkiye',
    isveren: 'Schneider Electric Türkiye',
    sektor: 'Sanayi ve holding',
    kariyerUrl: 'https://www.se.com/careers',
    ozet:
      'Enerji yönetimi ve endüstriyel otomasyon ürünleri sağlıyor. Başvurular kurumsal kariyer sayfasından alınıyor.',
    bolumler: ['elektrik-elektronik-muhendisligi', 'mekatronik', 'endustri-muhendisligi'],
    sonKontrol: '2026-08-25',
  },
  {
    slug: 'henkel-turkiye',
    isveren: 'Henkel Türkiye',
    sektor: 'Sanayi ve holding',
    kariyerUrl: 'https://www.henkel.com.tr/kariyer',
    ozet:
      'Yapıştırıcı, temizlik ve kişisel bakım ürünleri üreticisi. Başvurular kendi kariyer sayfasından alınıyor.',
    bolumler: ['kimya-muhendisligi', 'endustri-muhendisligi', 'halkla-iliskiler-ve-pazarlama'],
    sonKontrol: '2026-08-25',
  },
];

export const programBul = (slug: string): StajProgrami | undefined =>
  STAJ_PROGRAMLARI.find((p) => p.slug === slug);

/** Bir bölüm sayfasından o bölüme uygun işverenleri listelemek için. */
export const bolumeGoreProgramlar = (bolumSlug: string): StajProgrami[] =>
  STAJ_PROGRAMLARI.filter((p) => p.bolumler.includes(bolumSlug));
