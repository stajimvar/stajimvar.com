import { metinRehberi } from '../rehber-govde';
import type { Rehber } from '../rehberler';

/** CV, başvuru ve mülakat rehberleri. */
export const CV_REHBERLERI: Rehber[] = [
  metinRehberi({
    slug: 'ats-uyumlu-cv',
    baslik: 'ATS uyumlu CV nasıl hazırlanır?',
    ozet: 'CV\'ni önce bir yazılım okuyor; okunabilir olması gerekiyor.',
    konu: 'cv',
    etiketler: ['ats', 'cv', 'başvuru sistemi', 'anahtar kelime', 'pdf'],
    oneCikan: true,
    aciklama:
      'ATS uyumlu CV nasıl hazırlanır? Başvuru takip sistemlerinin CV\'yi nasıl okuduğu, ' +
      'dosya biçimi, başlıklar ve anahtar kelime kullanımı.',
    hizliCevap:
      'Büyük şirketlerin çoğunda CV\'ni önce bir başvuru takip sistemi (ATS) okuyor ve metni ' +
      'alanlara ayırıyor. Sistemin takılmaması için CV tek sütun, standart başlıklı ' +
      '("Deneyim", "Eğitim", "Beceriler"), düz yazı tipli ve PDF olmalı; tablo, metin kutusu, ' +
      'sütunlu şablon ve görsele gömülü yazı okunmuyor.',
    bloklar: [
      {
        paragraflar: [
          'ATS (Applicant Tracking System), gelen CV\'leri toplayan ve arama yapılabilir hale getiren yazılımlara ' +
            'verilen ad. Amacı eleme değil düzenleme; ama CV metni düzgün ayrıştırılamazsa kayıt eksik oluşuyor ve ' +
            'aramada çıkmıyorsun.',
          'Bu, tasarımlı CV\'nin kötü olduğu anlamına gelmiyor. Küçük bir ajansa gönderdiğin CV\'yi insan açıyor. ' +
            'Kurumsal bir başvuru formuna yüklediğin CV\'yi ise önce yazılım okuyor. İki durum için iki dosya tutmak ' +
            'en pratik çözüm.',
        ],
      },
      {
        baslik: 'Sistemin takıldığı yerler',
        tablo: {
          sutunlar: ['Bunu yapma', 'Bunun yerine'],
          satirlar: [
            ['İki-üç sütunlu şablon', 'Tek sütun, yukarıdan aşağı akan düzen'],
            ['Bilgileri tabloya koymak', 'Düz paragraf ve madde imli liste'],
            ['Metin kutusu ve kenar çubuğu', 'Normal metin akışı'],
            ['İletişim bilgisini üstbilgiye (header) yazmak', 'Sayfanın gövdesine yazmak'],
            ['Beceri seviyelerini yıldız/grafikle göstermek', 'Kelimeyle yazmak: "SQL — orta düzey"'],
            ['CV\'yi görsel (JPG/PNG) olarak vermek', 'Metin katmanı olan PDF'],
            ['Süslü yazı tipi ve simgeler', 'Standart yazı tipi, düz madde imi'],
          ],
        },
      },
      {
        baslik: 'Başlıkları standart tut',
        paragraflar: [
          'Sistem metni başlıklara göre bölüyor. "Hayat Yolculuğum" ya da "Neler Yapabilirim" gibi yaratıcı başlıklar ' +
            'ayrıştırmayı bozuyor. Sıkıcı görünen başlıklar burada işe yarıyor.',
        ],
        liste: [
          'Eğitim',
          'Deneyim (staj ve yarı zamanlı işler de buraya)',
          'Projeler',
          'Beceriler',
          'Diller',
          'Sertifikalar',
        ],
      },
      {
        baslik: 'Anahtar kelimeler',
        paragraflar: [
          'İlan metni, o pozisyon için aranan kelimelerin listesidir. CV\'nde bu kelimelerin gerçekten karşılığı ' +
            'varsa aynı kelimeyle yazmak işe yarıyor: ilanda "SQL" yazıyorsa CV\'nde "veri tabanı sorguları" değil ' +
            '"SQL" geçmeli.',
        ],
        uyari:
          'Bilmediğin bir aracı CV\'ye yazmak kısa vadede eleme geçiriyor, mülakatta ise güveni tümden bitiriyor. ' +
          'Yalnızca gerçekten kullandığın şeyleri yaz; seviyesini dürüst belirt.',
      },
      {
        baslik: 'Dosya ve isim',
        liste: [
          'Biçim: PDF. Word dosyası düzeni cihazdan cihaza kayıyor.',
          'Dosya adı: "AdSoyad-CV.pdf". "cv_son_final2.pdf" hem bulunmuyor hem özensiz duruyor.',
          'Uzunluk: öğrenci CV\'si bir sayfa. İki sayfa ancak yayın ya da uzun proje listesi varsa.',
          'Tarih biçimi: "06/2026 – 08/2026" gibi tutarlı ve okunur.',
        ],
      },
      {
        baslik: 'Kontrol listesi',
        kontrol: {
          baslik: 'Göndermeden önce',
          maddeler: [
            'PDF\'i açıp metni seçebiliyor muyum? Seçemiyorsam görsel olmuştur.',
            'Tek sütun mu, tablo var mı?',
            'İletişim bilgisi gövdede mi?',
            'Başlıklar standart mı?',
            'İlandaki anahtar kelimeler gerçekten karşılığı olacak şekilde geçiyor mu?',
            'Dosya adı adımı içeriyor mu?',
          ],
        },
      },
    ],
    sss: [
      {
        soru: 'ATS CV\'leri otomatik eliyor mu?',
        cevap:
          'Sistemler genellikle otomatik elemiyor, arama ve sıralama yapıyor. Sorun elenmek değil, metnin düzgün okunamaması nedeniyle aramada hiç çıkmamak.',
      },
      {
        soru: 'Fotoğraf koymalı mıyım?',
        cevap:
          'Türkiye\'de yaygın ve çoğu şirkette sorun değil; ancak fotoğraf metin ayrıştırmasını bozacak şekilde yerleştirilmemeli. Yurt dışı başvurularında birçok ülkede fotoğrafsız CV tercih ediliyor.',
      },
      {
        soru: 'Canva şablonları uygun mu?',
        cevap:
          'Çok sütunlu ve grafikli şablonlar ayrıştırmayı bozabiliyor. Tek sütunlu, sade bir şablon seçersen sorun olmuyor.',
      },
      {
        soru: 'Aynı CV\'yi her ilana gönderebilir miyim?',
        cevap:
          'Gönderebilirsin ama başlıktaki hedef ve beceri sırasını ilana göre değiştirmek dönüş oranını belirgin şekilde artırıyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Profilini tamamla ve CV\'ni indir',
      yol: '/cv',
      aciklama: 'Profilindeki bilgilerle tek sütunlu, okunabilir bir CV üretiliyor.',
    },
  }),

  metinRehberi({
    slug: 'cvde-proje-nasil-anlatilir',
    baslik: 'CV\'de proje nasıl anlatılır?',
    ozet: 'Ders ödevi de sayılır; anlatma biçimi belirliyor.',
    konu: 'cv',
    etiketler: ['proje', 'cv', 'ders projesi', 'portfolyo'],
    aciklama:
      'CV\'de proje nasıl yazılır? Ders projesi, kişisel çalışma ve kulüp işini işverenin ' +
      'okuyacağı biçimde anlatmak.',
    hizliCevap:
      'Projeyi üç parçada anlat: problem (neyi çözüyordu), yaptığın şey (senin payın) ve sonuç ' +
      '(ölçülebilir bir çıktı). "Bitirme projesi yaptım" bir satır bilgi vermiyor; ' +
      '"20 kişilik anketten gelen veriyi Python ile temizleyip üç grafikte özetledim" veriyor. ' +
      'Ders projesi de kişisel çalışma da sayılır — koşul gerçek olması.',
    bloklar: [
      {
        paragraflar: [
          'Öğrenci CV\'lerinde en çok yer kaplayan ama en az iş gören bölüm projeler. Sebebi içerik değil anlatım: ' +
            'çoğu CV\'de proje adı yazıyor, ne yapıldığı yazmıyor.',
        ],
      },
      {
        baslik: 'Üç parça',
        sirali: [
          'Problem: ne çözülüyordu, neden yapıldı. Tek cümle.',
          'Senin payın: takım projesiyse hangi kısım sendeydi. Bu kısım en önemlisi.',
          'Sonuç: sayı, süre, çıktı. "Çalıştı" değil, "40 sayfayı 6 saniyede tarıyor".',
        ],
      },
      {
        baslik: 'Örnekler',
        karsilastirma: {
          kotuBaslik: 'Bilgi vermiyor',
          iyiBaslik: 'Bilgi veriyor',
          kotu: [
            'Bitirme projesi — mobil uygulama',
            'Veri analizi projesi yaptım',
            'Kulüpte etkinlik düzenledim',
            'Excel ile çalışma yaptım',
          ],
          iyi: [
            'Bitirme projesi — kampüs içi ikinci el kitap uygulaması. Arayüzü ben yazdım (React Native), ilanların filtrelenmesini kurdum. 30 kişilik test grubunda kullanıldı.',
            '150 satırlık satış verisini Python ile temizleyip aylık trend grafiği ürettim; el ile yapılan raporlama 2 saatten 10 dakikaya indi.',
            'Kulüp etkinliğinde 4 kişilik ekiple 120 kişilik atölye düzenledim; katılımcı kaydını ve gün planını ben yürüttüm.',
            'Üretim fire kaydını Excel\'de pivot tabloyla haftalık rapora çevirdim.',
          ],
        },
      },
      {
        baslik: 'Hangi proje sayılır',
        liste: [
          'Ders projesi ve bitirme projesi — en yaygın ve tamamen geçerli.',
          'Kişisel çalışma: kendin için yaptığın küçük bir uygulama, çizim serisi, hesap tablosu.',
          'Kulüp ve topluluk işi: organizasyon, sosyal medya, sponsor görüşmesi.',
          'Gönüllü iş: bir dernek için hazırladığın broşür ya da site.',
          'Yarışma katılımı: derece almasan da süreç anlatılabilir.',
        ],
        uyari:
          'Takım projesinde "biz" değil "ben" yaz. İşveren senin ne yaptığını okumak istiyor; ' +
          'takımın başarısı senin payın belirtilmeden bir şey söylemiyor.',
      },
      {
        baslik: 'Nereye koyulur',
        paragraflar: [
          'Deneyimin azsa "Projeler" bölümü CV\'nin en üstünde, eğitimin hemen altında olmalı. ' +
            'İki üç proje yeterli; on proje listelemek hiçbirinin okunmamasına yol açıyor. ' +
            'Kod ya da görsel varsa bağlantı ekle — [portfolyo hazırlama](/rehber/portfolyo-nasil-hazirlanir) ' +
            'sayfasında ayrıntısı var.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Ders projesi CV\'ye yazılır mı?',
        cevap:
          'Yazılır ve öğrenci CV\'sinde en değerli içeriklerden biridir. Önemli olan projenin türü değil, ne yaptığının somut anlatılması.',
      },
      {
        soru: 'Bitmemiş projeyi yazabilir miyim?',
        cevap:
          'Yazabilirsin, ama durumunu belirt: "devam ediyor" demek dürüst ve mülakatta konuşulacak bir konu açıyor.',
      },
      {
        soru: 'Kaç proje yazmalıyım?',
        cevap:
          'İki ile dört arası yeterli. En ilgili olanı en üste koy; ilana göre sırayı değiştir.',
      },
      {
        soru: 'GitHub bağlantısı koymalı mıyım?',
        cevap:
          'Kod içeren projelerde evet, ama deponun okunabilir bir README\'si olsun. Boş ya da dağınık bir depo, hiç bağlantı olmamasından kötü.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Profilini tamamla ve CV\'ni indir',
      yol: '/cv',
      aciklama: 'Projelerini profiline ekle, CV\'de otomatik görünsün.',
    },
  }),

  metinRehberi({
    slug: 'on-yazi-nasil-yazilir',
    baslik: 'Ön yazı (cover letter) nasıl yazılır?',
    ozet: 'CV neyi yaptığını, ön yazı neden orada olmak istediğini söylüyor.',
    konu: 'cv',
    etiketler: ['ön yazı', 'cover letter', 'motivasyon mektubu', 'başvuru'],
    aciklama:
      'Staj başvurusunda ön yazı nasıl yazılır? Yapısı, uzunluğu ve en sık yapılan hatalar.',
    hizliCevap:
      'Ön yazı üç paragraftan uzun olmamalı: kim olduğun, neden o şirket ve neden sen. ' +
      'CV\'de yazan şeyleri tekrarlamak değil, CV\'de görünmeyen bağlantıyı kurmak işe yarıyor. ' +
      'Her başvuruya aynı metni göndermek en sık yapılan hata; değişmesi gereken tek şey ' +
      'ikinci paragraf.',
    bloklar: [
      {
        paragraflar: [
          'Ön yazı istenmediği sürece uzun bir metin göndermek gerekmiyor; e-postanın gövdesi çoğu zaman ön yazının ' +
            'kendisi oluyor. Yine de bazı şirketler ayrı bir dosya istiyor ve burs başvurularında da benzer bir metin ' +
            'isteniyor.',
        ],
      },
      {
        baslik: 'Üç paragraf',
        sirali: [
          'Kim olduğun ve ne istediğin: üniversite, bölüm, sınıf, hangi tarihlerde staj. İki cümle.',
          'Neden o şirket: ürünü, projesi ya da çalışma alanı hakkında somut bir şey. Bu paragraf her başvuruda değişir.',
          'Neden sen: bir proje, bir araç, bir deneyim. CV\'deki bir satırı burada hikâyeye çeviriyorsun.',
        ],
      },
      {
        baslik: 'Kaçınılması gerekenler',
        karsilastirma: {
          kotuBaslik: 'Her CV\'de yazan',
          iyiBaslik: 'Sana ait olan',
          kotu: [
            'Kendimi geliştirmeye açık, disiplinli bir öğrenciyim.',
            'Takım çalışmasına yatkınım.',
            'Sektörünüzde kendimi geliştirmek istiyorum.',
            'Şirketinizin köklü yapısına hayranım.',
          ],
          iyi: [
            'Üretim planlama dersinde yaptığım fire analizi projesi beni bu alana çekti.',
            'Kulüpte dört kişilik bir ekiple çalışıp 120 kişilik bir atölye düzenledim.',
            'Ürününüzün ölçüm modülü, bitirme projemde uğraştığım problemin aynısını çözüyor.',
            'Geçen yıl yayımladığınız sürdürülebilirlik raporundaki geri dönüşüm hedefi ilgimi çekti.',
          ],
        },
      },
      {
        baslik: 'Biçim',
        liste: [
          'Uzunluk: yarım sayfa. Bir sayfayı geçme.',
          'Hitap: kişi adı biliniyorsa "Sayın [Ad Soyad]", bilinmiyorsa "Sayın İlgili".',
          'Dosya: PDF ve "AdSoyad-onyazi.pdf".',
          'E-posta gövdesine yazıyorsan ayrıca dosya ekleme; iki kez okutmak gerekmez.',
        ],
        uyari:
          'Yapay zekâ ile yazdırdığın metni olduğu gibi göndermek anlaşılıyor: cümleler doğru ama kimseye ait değil. ' +
          'Taslak olarak kullan, sonra kendi somut örneklerinle değiştir.',
      },
    ],
    sss: [
      {
        soru: 'Ön yazı zorunlu mu?',
        cevap:
          'Çoğu staj başvurusunda zorunlu değil. İstenmediği durumda e-postanın gövdesi ön yazı yerine geçiyor.',
      },
      {
        soru: 'Ön yazı ile motivasyon mektubu aynı şey mi?',
        cevap:
          'Yakın ama aynı değil: ön yazı bir işe/staja başvuruda, motivasyon mektubu genellikle burs ve program başvurularında isteniyor ve daha uzun oluyor.',
      },
      {
        soru: 'Aynı ön yazıyı birden fazla şirkete gönderebilir miyim?',
        cevap:
          'Birinci ve üçüncü paragraf aynı kalabilir; ikinci paragraf her şirkette değişmeli. Değişmediği anlaşıldığında metin ters etki yapıyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Başvuru e-postası şablonunu aç',
      yol: '/basvuru-sablonu',
      aciklama: 'Ön yazının e-posta hâli hazır şablonda.',
    },
  }),

  metinRehberi({
    slug: 'portfolyo-nasil-hazirlanir',
    baslik: 'Portfolyo nasıl hazırlanır?',
    ozet: 'Tasarım, yazılım ve mühendislikte CV\'den daha çok konuşan şey.',
    konu: 'cv',
    etiketler: ['portfolyo', 'github', 'behance', 'tasarım', 'proje'],
    aciklama:
      'Öğrenci portfolyosu nasıl hazırlanır? Hangi işler girer, nasıl sunulur, ' +
      'hangi platform kullanılır.',
    hizliCevap:
      'Portfolyo işlerin listesi değil, seçkisi: üç iyi iş, on vasat işten daha çok konuşuyor. ' +
      'Her işi aynı üç başlıkla anlat — problem, senin yaptığın, sonuç. Tasarımda Behance ya da ' +
      'kendi sayfan, yazılımda GitHub, mühendislikte PDF dosyası yaygın; hangi ortam olursa olsun ' +
      'bağlantının açık ve erişilebilir olması ilk koşul.',
    bloklar: [
      {
        paragraflar: [
          'Portfolyo, CV\'nin "yaptım" dediği şeyi gösteren yer. Tasarım, yazılım, mimarlık, moda ve ' +
            'içerik alanlarında CV\'den önce buraya bakılıyor.',
        ],
      },
      {
        baslik: 'Ne girer, ne girmez',
        tablo: {
          sutunlar: ['Girer', 'Girmez'],
          satirlar: [
            ['Bitmiş ve anlatılabilir iş', 'Yarım kalmış, açıklaması olmayan dosya'],
            ['Ders projesi (kendi payın belirtilerek)', 'Birebir taklit edilmiş şablon çalışma'],
            ['Kişisel çalışma ve deneme', 'Başkasının işi, kaynağı belirsiz görsel'],
            ['Süreç: taslak, karar, sonuç', 'Yalnızca son görsel, hiç açıklama yok'],
          ],
        },
      },
      {
        baslik: 'Her iş için üç başlık',
        sirali: [
          'Problem: neyi çözüyordu, kim içindi.',
          'Yaptığın: hangi kısım sende, hangi araçları kullandın.',
          'Sonuç: nerede kullanıldı, ne değişti, geri bildirim ne oldu.',
        ],
        uyari:
          'Açıklaması olmayan bir görsel portfolyoda en zayıf içerik. İşi gören şey görselin kendisi değil, ' +
          'kararların anlatılması: neden bu rengi, neden bu yapıyı seçtin.',
      },
      {
        baslik: 'Nerede yayımlanır',
        liste: [
          'Tasarım ve görsel işler: Behance, Dribbble ya da kendi tek sayfalık siten.',
          'Yazılım: GitHub. Her deponun README\'si olsun; kurulum ve ekran görüntüsü ekle.',
          'Mühendislik ve mimarlık: tek bir PDF. Dosya boyutunu 10 MB altında tut.',
          'Video ve hareketli işler: YouTube ya da Vimeo bağlantısı; gömülü oynatıcı yerine bağlantı ver.',
        ],
      },
      {
        baslik: 'Erişim kontrolü',
        kontrol: {
          baslik: 'Göndermeden önce dene',
          maddeler: [
            'Bağlantıyı gizli sekmede aç: giriş istemeden açılıyor mu?',
            'Telefonda açılıyor mu?',
            'PDF ise dosya boyutu makul mü?',
            'Depoların görünürlüğü herkese açık mı?',
            'İlk sayfada adın ve iletişim bilgin var mı?',
          ],
        },
      },
    ],
    sss: [
      {
        soru: 'Portfolyoda kaç iş olmalı?',
        cevap:
          'Üç ile altı arası yeterli. Seçki yapmak, çok iş göstermekten daha güçlü bir sinyal.',
      },
      {
        soru: 'Ders projelerini koyabilir miyim?',
        cevap:
          'Evet. Öğrenci portfolyosunun çoğu ders projesinden oluşuyor; koşul kendi payını açıkça belirtmen.',
      },
      {
        soru: 'GitHub deposu yeterli mi?',
        cevap:
          'Yazılım için genellikle yeterli, ama README yoksa depo boş görünüyor. Kısa bir açıklama ve ekran görüntüsü büyük fark yaratıyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'CV\'de proje nasıl anlatılır',
      yol: '/rehber/cvde-proje-nasil-anlatilir',
      aciklama: 'Portfolyodaki işi CV\'ye tek satırda geçirmenin yolu.',
    },
  }),

  metinRehberi({
    slug: 'linkedin-profili-nasil-duzenlenir',
    baslik: 'Öğrenci için LinkedIn profili nasıl düzenlenir?',
    ozet: 'Boş profil, profilin olmamasından kötü.',
    konu: 'cv',
    etiketler: ['linkedin', 'profil', 'ağ', 'başvuru'],
    aciklama:
      'Öğrenci LinkedIn profili nasıl düzenlenir? Başlık, hakkında bölümü, deneyim ve ' +
      'bağlantı kurma.',
    hizliCevap:
      'Öğrenci profilinde işe yarayan dört alan var: fotoğraf, başlık, hakkında ve projeler. ' +
      'Başlık "Öğrenci" değil, ne aradığını söylemeli — "Makine Mühendisliği 3. sınıf | Yaz stajı arıyorum". ' +
      'Profil boş kaldığında bağlantı kurmak da işe yaramıyor: önce doldur, sonra bağlan.',
    bloklar: [
      {
        paragraflar: [
          'LinkedIn öğrenciler için iki işe yarıyor: doğru kişiye ulaşmak ve ulaşıldığında bakılacak bir yerin olması. ' +
            'İkincisi olmadan birincisi çalışmıyor.',
        ],
      },
      {
        baslik: 'Başlık',
        karsilastirma: {
          kotuBaslik: 'Zayıf başlık',
          iyiBaslik: 'İşe yarayan başlık',
          kotu: ['Öğrenci', 'Üniversite öğrencisi', 'Hayalperest', '—'],
          iyi: [
            'Makine Mühendisliği 3. sınıf | Yaz stajı arıyorum',
            'Giyim Üretim Teknolojisi | Kalıp ve üretim planlama',
            'Bilgisayar Müh. 2. sınıf | Python, SQL | Staj arıyorum',
          ],
        },
      },
      {
        baslik: 'Hakkında bölümü',
        paragraflar: [
          'Üç dört cümle yeterli: ne okuduğun, hangi alana ilgi duyduğun, ne aradığın. Birinci tekil şahısla yaz; ' +
            'üçüncü şahıs anlatım öğrenci profilinde tuhaf duruyor.',
        ],
        liste: [
          'Ne okuyorsun ve kaçıncı sınıftasın.',
          'Hangi konuda çalışmak istiyorsun — alan adıyla.',
          'Elinde ne var: bir proje, bir araç, bir deneyim.',
          'Ne arıyorsun: yaz stajı, dönem içi yarı zamanlı, gönüllü proje.',
        ],
      },
      {
        baslik: 'Doldurulacak diğer alanlar',
        liste: [
          'Fotoğraf: sade arka plan, yüz net. Selfie olmasın.',
          'Eğitim: üniversite, bölüm, başlangıç-bitiş yılı.',
          'Deneyim: staj, yarı zamanlı iş, kulüp görevi. Kulüp de deneyimdir.',
          'Projeler: CV\'dekilerle aynı üç parça — problem, senin payın, sonuç.',
          'Beceriler: gerçekten kullandıkların. Beş on tane yeterli.',
          'Özel URL: linkedin.com/in/adsoyad biçimine çevir; CV\'ye bu adresi yaz.',
        ],
      },
      {
        baslik: 'Bağlantı ve mesaj',
        paragraflar: [
          'Boş bir davet çoğu zaman kabul edilmiyor. İki cümlelik bir not ekle: kim olduğun ve neden bağlanmak istediğin. ' +
            'Bağlandıktan hemen sonra iş istemek yerine, bir soru sormak daha çok karşılık buluyor.',
        ],
        uyari:
          'Aynı mesajı toplu göndermek belli oluyor ve kişinin şirketiyle ilgisiz bir metin, bağlantıyı da bitiriyor. ' +
          'Günde beş kişiselleştirilmiş mesaj, elli genel mesajdan çok iş görüyor.',
      },
    ],
    sss: [
      {
        soru: 'Deneyimim yokken LinkedIn açmalı mıyım?',
        cevap:
          'Evet, ama açtıktan sonra doldur. Boş profil, arayan kişide "bu kişiyle ilgili bilgi yok" izlenimi bırakıyor.',
      },
      {
        soru: 'Kulüp görevi deneyim sayılır mı?',
        cevap:
          'Sayılır. Organizasyon, sponsorluk görüşmesi ve ekip yönetimi işverenin ilgilendiği becerileri gösteriyor.',
      },
      {
        soru: 'İK\'ya doğrudan mesaj atmak doğru mu?',
        cevap:
          'Kısa, kim olduğunu söyleyen ve somut bir talebi olan mesajlar genellikle olumlu karşılanıyor. Uzun ve genel mesajlar yanıtsız kalıyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Profilini tamamla ve CV\'ni indir',
      yol: '/cv',
      aciklama: 'LinkedIn\'e yazacağın içerik profilinde zaten duruyor.',
    },
  }),

  metinRehberi({
    slug: 'online-mulakat',
    baslik: 'Online mülakatta dikkat edilecekler',
    ozet: 'Teknik hazırlık, kamera düzeni ve ilk otuz saniye.',
    konu: 'cv',
    etiketler: ['online mülakat', 'video görüşme', 'zoom', 'teams'],
    aciklama:
      'Online staj mülakatına nasıl hazırlanılır? Bağlantı, kamera, ışık, ortam ve ' +
      'görüşme sırasında dikkat edilecekler.',
    hizliCevap:
      'Online mülakatta kaybedilen puanların çoğu içerikten değil hazırlıktan geliyor: geç bağlanmak, ' +
      'mikrofonun çalışmaması, arkadan gelen ses. Görüşmeden on dakika önce bağlan, kamerayı göz ' +
      'hizasına al, ışığı yüzüne karşıdan ver ve yanına CV\'nin bir kopyasını koy.',
    bloklar: [
      {
        baslik: 'Bir gün önce',
        kontrol: {
          baslik: 'Teknik hazırlık',
          maddeler: [
            'Uygulamayı indir ve bir kere aç (Zoom, Teams, Meet)',
            'Kamera ve mikrofonu dene',
            'İnternet bağlantısını kontrol et; mümkünse kablolu ya da güçlü sinyal',
            'Bağlantı adresini takvimine ekle',
            'Yedek plan: telefon numaranı görüşmeciyle paylaş',
          ],
        },
      },
      {
        baslik: 'Ortam',
        liste: [
          'Işık yüzüne karşıdan gelsin; arkanda pencere olmasın, yoksa siluet görünürsün.',
          'Kamera göz hizasında olsun. Dizüstü bilgisayarı birkaç kitabın üstüne koymak yeterli.',
          'Arka plan sade olsun; sanal arka plan yerine düz duvar daha iyi duruyor.',
          'Telefon bildirimlerini kapat, kapıya haber ver.',
          'Kulaklık kullan: yankıyı ve arka plan sesini kesiyor.',
        ],
      },
      {
        baslik: 'Görüşme sırasında',
        paragraflar: [
          'Online görüşmede beden dili yarı yarıya kayboluyor; kalanı bilinçli kullanmak gerekiyor.',
        ],
        liste: [
          'Konuşurken kameraya bak, ekrandaki yüze değil. Karşıdaki göz teması olarak görüyor.',
          'Cümleni bitirmeden karşı tarafın konuşmasını bekle; gecikme yüzünden sözler çakışıyor.',
          'Not al ama klavyeye yazma; kâğıt sessiz.',
          'Bağlantı koparsa panik yapma: "kesildi, kaldığım yerden devam edeyim" demek yeterli.',
        ],
      },
      {
        baslik: 'Yanına koyacakların',
        liste: [
          'CV\'nin çıktısı ya da açık bir sekmede kopyası.',
          'Şirket hakkında üç madde not.',
          'Soracağın üç soru.',
          'Su.',
        ],
        uyari:
          'Ekranda açık duran notları okuduğun anlaşılıyor. Notlar hatırlatıcı olsun, metin olmasın.',
      },
      {
        baslik: 'Görüşmeden sonra',
        paragraflar: [
          'Aynı gün içinde iki cümlelik bir teşekkür e-postası gönder. Konuşulan bir konuya değinirsen ' +
            'mesaj hatırlanıyor. Ayrıntı için [staj mülakatına hazırlık](/rehber/staj-mulakati).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Kamerayı açmak zorunda mıyım?',
        cevap:
          'Zorunlu olmasa da açmak beklenir; kapalı kamera mesafeli algılanıyor. Teknik bir sorun varsa görüşme başında söylemek gerekiyor.',
      },
      {
        soru: 'Ne giymeliyim?',
        cevap:
          'Şirketin genel havasına yakın, sade ve düz renkli bir üst yeterli. İnce çizgili desenler kamerada titriyor.',
      },
      {
        soru: 'Görüşmeye kaç dakika önce bağlanmalıyım?',
        cevap:
          'Bekleme odası varsa 2-3 dakika önce bağlanmak yeterli. Uygulamayı ise 10 dakika önce açıp denemek gerekiyor.',
      },
      {
        soru: 'Kayıtlı (asenkron) video mülakatta ne değişir?',
        cevap:
          'Süre sınırlı ve tekrar hakkı sınırlı oluyor. Soruyu okuduktan sonra birkaç saniye düşünüp cevabı üç parçalı kurmak işe yarıyor: durum, yaptığın, sonuç.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Staj mülakatına hazırlık',
      yol: '/rehber/staj-mulakati',
      aciklama: 'Sorulan sorular ve hazırlanma yolu.',
    },
  }),

  metinRehberi({
    slug: 'basvuruya-cevap-gelmezse',
    baslik: 'Başvuruya cevap gelmezse ne yapılır?',
    ozet: 'Sessizlik çoğu zaman ret değil; ne zaman, nasıl hatırlatılır.',
    konu: 'cv',
    etiketler: ['takip', 'cevap yok', 'hatırlatma', 'başvuru'],
    aciklama:
      'Staj başvurusuna cevap gelmiyorsa ne yapılır? Ne kadar beklenir, hatırlatma nasıl ' +
      'yazılır ve başvuru sayısı nasıl artırılır.',
    hizliCevap:
      'Bir hafta bekle, sonra aynı e-posta zincirine iki cümlelik bir hatırlatma yaz. ' +
      'İkinci hatırlatmadan sonra o başvuruyu kapat ve enerjini yenilerine ayır. ' +
      'Cevapsızlık genellikle ret değil, kutuda kaybolma ya da sürecin gecikmesi; ' +
      'kişisel bir işaret olarak okumamak gerekiyor.',
    bloklar: [
      {
        paragraflar: [
          'Staj arayan öğrencilerin en çok yıprandığı yer bu: yirmi başvuru, tek cevap yok. ' +
            'Bunun anlamını doğru koymak, aramaya devam edip etmemeyi belirliyor.',
        ],
      },
      {
        baslik: 'Cevap neden gelmiyor',
        liste: [
          'E-posta genel bir kutuya düştü ve okunmadı.',
          'Süreç şirket içinde bekliyor; karar veren kişi izinde.',
          'Kontenjan doldu ama geri dönüş yapılmadı.',
          'Konu satırı açılmaya değer bulunmadı.',
          'Başvuru sistemi üzerinden gitti ve otomatik dönüş yapılmıyor.',
        ],
        paragraflar: [
          'Beşinin de ortak yanı: hiçbiri senin hakkında verilmiş bir karar değil.',
        ],
      },
      {
        baslik: 'Hatırlatma e-postası',
        paragraflar: [
          'Yeni bir e-posta açma; ilk mesaja yanıt yaz. Böylece ilk mesaj da görünür ve ' +
            'okuyanın araması gerekmez.',
        ],
        karsilastirma: {
          kotuBaslik: 'Zayıf hatırlatma',
          iyiBaslik: 'İyi hatırlatma',
          kotu: [
            'Merhaba, başvurumu değerlendirdiniz mi?',
            'Hâlâ cevap alamadım.',
            'Acil dönüş rica ederim.',
          ],
          iyi: [
            'Merhaba, geçen hafta staj başvurusu göndermiştim. Süreç hakkında bilgi verebilir misiniz?',
            'Merhaba, başvurumu hatırlatmak istedim. Bu arada X projesini tamamladım, CV\'nin güncel hâlini ekliyorum.',
            'Merhaba, staj tarihlerimde esneklik sağlayabiliyorum; süreç devam ediyorsa bunu iletmek istedim.',
          ],
        },
      },
      {
        baslik: 'Ne zaman durmalı',
        liste: [
          'İlk hatırlatma: bir hafta sonra.',
          'İkinci hatırlatma: iki hafta sonra, yeni bir bilgi varsa.',
          'Üçüncü yok. Kapat ve yenilerine geç.',
        ],
      },
      {
        baslik: 'Sayı meselesi',
        paragraflar: [
          'Bu süreçte dönüş oranı düşük. Haftada üç başvuruyla ilerleyen bir arama uzun sürüyor; ' +
            'haftada on kişiselleştirilmiş başvuru gerçekçi bir hız. Aynı anda birden çok kanal ' +
            'kullanmak da işe yarıyor: [ilan siteleri](/), okulun staj birimi ve ' +
            '[ilan açmayan şirketlere doğrudan yazmak](/rehber/ilan-acmayan-sirkete-nasil-yazilir).',
        ],
        uyari:
          'Aynı metni yirmi şirkete göndermek sayıyı artırıyor ama dönüşü artırmıyor. ' +
          'Değişmesi gereken tek şey "neden sizin şirketiniz" cümlesi; onu değiştirmek beş dakika sürüyor.',
      },
      {
        baslik: 'Başvurularını takip et',
        paragraflar: [
          'Kime, ne zaman, hangi tarihlerle yazdığını bir yerde tutmadan hatırlatma zamanını da kaçırıyorsun. ' +
            'StajımVar\'da başvurduğun ilanları işaretleyip [profil sayfandan](/profil) takip edebilirsin.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Kaç gün sonra hatırlatma yazmalıyım?',
        cevap:
          'Bir hafta uygun bir aralık. Daha erken yazmak sabırsız görünüyor, çok geç yazmak süreci kaçırıyor.',
      },
      {
        soru: 'Telefonla aramak doğru mu?',
        cevap:
          'Küçük işletmelerde çoğu zaman işe yarıyor. Büyük şirketlerde başvuru sistemi dışından arama genellikle sonuç vermiyor.',
      },
      {
        soru: 'Ret cevabı gelirse ne yapmalıyım?',
        cevap:
          'Kısa bir teşekkür yaz ve gelecek dönem için değerlendirilip değerlendirilemeyeceğini sor. Bu mesaj bir sonraki dönemde hatırlanmayı sağlıyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Açık staj ilanlarına bak',
      yol: '/',
      aciklama: 'Bekleyen başvurunun yanına yenilerini ekle.',
    },
  }),
];
