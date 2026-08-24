import { metinRehberi } from '../rehber-govde';
import type { Rehber } from '../rehberler';

/**
 * Burs ve KYK rehberleri.
 *
 * Bu konuda tutar, oran ve tarih YAZMIYORUZ: burs miktarları ve başvuru
 * takvimleri her yıl yeniden belirleniyor. Mekanizma anlatılıp güncel
 * rakam için resmî kaynağa yönlendiriliyor.
 */
export const BURS_REHBERLERI: Rehber[] = [
  metinRehberi({
    slug: 'burslar-hangi-aylarda-acilir',
    baslik: 'Burslar hangi aylarda açılır?',
    ozet: 'Takvim yıla göre kayıyor ama dönemler belli.',
    konu: 'burs',
    etiketler: ['burs takvimi', 'başvuru dönemi', 'kyk', 'vakıf bursu'],
    oneCikan: true,
    aciklama:
      'Burs başvuruları hangi aylarda açılır? KYK, vakıf ve üniversite burslarının ' +
      'dönemleri ve kaçırmamak için ne yapılmalı.',
    hizliCevap:
      'Burs başvurularının büyük kısmı güz dönemi başında, yani eylül-ekim aylarında açılıyor; ' +
      'KYK başvuruları da genellikle bu döneme denk geliyor. Vakıf ve dernek bursları ise yıl içine ' +
      'yayılıyor ve her kurum kendi takvimini açıklıyor. Kesin tarihler her yıl değiştiği için tek ' +
      'güvenilir yol kurumun resmî duyurusunu takip etmek.',
    bloklar: [
      {
        paragraflar: [
          'Burs kaçırmanın en yaygın sebebi başvuru yapmamak değil, tarihi kaçırmak. Çoğu burs yılda ' +
            'yalnızca bir kez ve iki-üç haftalık bir pencerede açılıyor; pencere kapandığında ' +
            'bir sonraki yıl bekleniyor.',
        ],
      },
      {
        baslik: 'Dönemler',
        tablo: {
          sutunlar: ['Dönem', 'Genellikle açılan burslar'],
          satirlar: [
            ['Eylül – Ekim', 'KYK burs ve öğrenim kredisi, üniversite kendi bursları, birçok vakıf bursu'],
            ['Ekim – Kasım', 'Dernek ve oda bursları, belediye bursları'],
            ['Ocak – Şubat', 'Bahar dönemi için ek başvurular, bazı vakıfların ikinci turu'],
            ['Mart – Mayıs', 'Yurt dışı programları, değişim ve staj hibeleri'],
            ['Yıl boyu', 'Proje ve yarışma temelli destekler'],
          ],
        },
        uyari:
          'Bu tablo genel bir eğilimi gösteriyor, takvim değil. Her kurum kendi tarihini açıklıyor ve ' +
          'tarihler yıldan yıla kayıyor. Başvurudan önce kurumun kendi duyurusuna bak.',
      },
      {
        baslik: 'Kaçırmamak için',
        sirali: [
          'İlgilendiğin kurumların duyuru sayfalarını tek bir yer imi klasöründe topla.',
          'Geçen yılın başvuru tarihini not et; kurumlar genellikle benzer haftalarda açıyor.',
          'Takvimine iki hatırlatma koy: tahmini açılış tarihinden bir hafta önce ve o gün.',
          'Belgeleri önceden hazırla — pencere iki hafta açıksa belge toplamaya vaktin olmuyor.',
          'StajımVar\'da [fırsat takvimini](/firsat-takvimi) aç: açılış ve son başvuru günleri ay ay duruyor.',
        ],
      },
      {
        baslik: 'Başvuru penceresi kısa olduğunda',
        paragraflar: [
          'İki haftalık pencerede belge toplamak zor. Bunun için yılın herhangi bir zamanında elde ' +
            'bulunması gereken bir "burs dosyası" tutmak işe yarıyor: öğrenci belgesi, transkript, ' +
            'gelir durumu belgeleri ve varsa niyet mektubunun taslağı.',
        ],
      },
    ],
    sss: [
      {
        soru: 'KYK burs başvurusu ne zaman açılır?',
        cevap:
          'Genellikle güz dönemi başında açılıyor ve başvuru penceresi sınırlı süre açık kalıyor. Kesin tarih her yıl resmî duyuruyla açıklanıyor.',
      },
      {
        soru: 'Başvuru dönemi kapandıysa ne yapabilirim?',
        cevap:
          'Kapanan başvuruya sonradan girmek mümkün olmuyor. Aynı dönemde açık olan başka bursları taramak ve bir sonraki dönem için belgeleri hazırlamak en verimli yol.',
      },
      {
        soru: 'Ara sınıflar da başvurabilir mi?',
        cevap:
          'Birçok burs yalnızca yeni kayıt olan öğrencilere değil, ara sınıflara da açık. Koşulu kurumun ilanında yazıyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr' },
      { etiket: 'e-Devlet Kapısı', adres: 'https://www.turkiye.gov.tr' },
    ],
    sonrakiAdim: {
      etiket: 'Fırsat takvimini aç',
      yol: '/firsat-takvimi',
      aciklama: 'Açılan ve kapanan başvuruları ay ay gör.',
    },
  }),

  metinRehberi({
    slug: 'ayni-anda-birden-fazla-burs',
    baslik: 'Aynı anda birden fazla burs alınabilir mi?',
    ozet: 'Bazıları birleşiyor, bazıları birbirini kesiyor.',
    konu: 'burs',
    etiketler: ['çifte burs', 'kyk', 'vakıf bursu', 'koşul'],
    aciklama:
      'Aynı anda iki burs alınır mı? KYK ile vakıf bursunun birlikte alınması, ' +
      'kurumların koşulları ve bildirim yükümlülüğü.',
    hizliCevap:
      'Bunun tek bir cevabı yok: kural bursu veren kurumun kendi koşullarında yazıyor. ' +
      'Birçok vakıf bursu "başka bir kurumdan burs almamak" şartı koyuyor, bazıları ' +
      'yalnızca belirli bursları hariç tutuyor. Başvuru formunda "başka burs alıyor musunuz" ' +
      'sorusuna doğru cevap vermek şart — yanlış beyan bursun kesilmesine ve geri istenmesine yol açabiliyor.',
    bloklar: [
      {
        paragraflar: [
          'Öğrencilerin en çok tereddüt ettiği konulardan biri: bir burs alırken ikincisine başvurmak ' +
            'doğru mu, sorun çıkar mı. Sorun çıkaran şey ikinci bursun kendisi değil, beyanın yanlış olması.',
        ],
      },
      {
        baslik: 'Üç farklı kural',
        liste: [
          'Hiçbir kısıt koymayanlar: burs miktarı düşükse ya da amaç belirli bir gideri karşılamaksa (yemek, ulaşım) çoğunlukla kısıt olmuyor.',
          'Belirli bursları hariç tutanlar: "kredi hariç, burs alıyorsa başvuramaz" gibi ifadeler yaygın.',
          'Tümüyle yasaklayanlar: "başka hiçbir kurumdan burs almıyor olmak" şartı.',
        ],
        uyari:
          'Kredi ile burs farklı şeyler. Bazı kurumlar öğrenim kredisi alanları burs alıyor saymıyor. ' +
          'Farkı [KYK burs ve öğrenim kredisi](/rehber/kyk-burs-ve-kredi) sayfasında anlattık.',
      },
      {
        baslik: 'Ne yapmalı',
        sirali: [
          'Her bursun ilan metnindeki "koşullar" bölümünü oku; kısıt orada yazıyor.',
          'Belirsizse kuruma yaz ve yazılı cevap al.',
          'Başvuru formundaki soruya doğru cevap ver. Aldığın bursu gizleme.',
          'Yeni bir burs almaya başladığında mevcut kurumu bilgilendir — çoğu kurum bunu şart koşuyor.',
        ],
      },
      {
        baslik: 'Yanlış beyanın sonucu',
        paragraflar: [
          'Kurumlar öğrenci beyanına güveniyor ama denetim de yapılıyor. Yanlış beyan tespit edildiğinde ' +
            'burs kesilebiliyor, ödenen tutar geri istenebiliyor ve öğrenci kurumun sonraki başvurularından ' +
            'çıkarılabiliyor. Kısa vadeli kazanç, uzun vadeli kaybın yanında küçük kalıyor.',
        ],
      },
    ],
    sss: [
      {
        soru: 'KYK bursu ile vakıf bursu birlikte alınır mı?',
        cevap:
          'Vakfın koşullarına bağlı. Bazı vakıflar KYK bursu alanları kabul etmiyor, bazıları yalnızca kendi türündeki bursları hariç tutuyor. Vakfın ilan metnine bakmak gerekiyor.',
      },
      {
        soru: 'Öğrenim kredisi burs sayılır mı?',
        cevap:
          'Kredi geri ödenen bir destek, burs ise geri ödenmiyor. Birçok kurum bu ikisini ayrı değerlendiriyor ama hepsi değil; kurumun tanımına bakmak gerekiyor.',
      },
      {
        soru: 'Yemek veya ulaşım desteği burs sayılır mı?',
        cevap:
          'Genellikle sayılmıyor, ama başvuru formunda soruluyorsa yazmak gerekiyor. Kararı kurum verir.',
      },
    ],
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr' },
    ],
    sonrakiAdim: {
      etiket: 'Açık bursları gör',
      yol: '/burslar',
      aciklama: 'Koşulları resmî kaynağıyla birlikte listeledik.',
    },
  }),

  metinRehberi({
    slug: 'burs-basvurusu-gerekli-belgeler',
    baslik: 'Burs başvurusunda gerekli belgeler',
    ozet: 'Öğrenci belgesi, gelir belgesi ve ikametgâh — en çok istenen üçlü.',
    konu: 'burs',
    etiketler: ['burs belgeleri', 'gelir belgesi', 'ikametgah', 'öğrenci belgesi'],
    aciklama:
      'Burs başvurusunda hangi belgeler isteniyor? Gelir durumu, öğrenci belgesi, ' +
      'transkript ve niyet mektubu nereden alınır.',
    hizliCevap:
      'Burs başvurularında en sık istenen belgeler öğrenci belgesi, transkript, ikametgâh ve ' +
      'ailenin gelir durumunu gösteren belgeler. Bunların çoğu e-Devlet üzerinden anında alınıyor; ' +
      'gelir belgeleri ise çalışılan kurumdan ya da SGK kayıtlarından geldiği için birkaç gün sürebiliyor. ' +
      'Başvuru pencereleri kısa olduğu için dosyayı önceden hazırlamak en önemli adım.',
    bloklar: [
      {
        baslik: 'En sık istenen belgeler',
        tablo: {
          sutunlar: ['Belge', 'Nereden'],
          satirlar: [
            ['Öğrenci belgesi', 'e-Devlet ya da öğrenci bilgi sistemi'],
            ['Transkript / not durum belgesi', 'Öğrenci bilgi sistemi'],
            ['İkametgâh (yerleşim yeri belgesi)', 'e-Devlet'],
            ['Nüfus kayıt örneği', 'e-Devlet'],
            ['Anne-baba gelir belgesi', 'İşyeri, SGK ya da vergi dairesi'],
            ['Adli sicil kaydı', 'e-Devlet'],
            ['Niyet mektubu', 'Kendin yazıyorsun'],
            ['Fotoğraf', 'Vesikalık, güncel'],
          ],
        },
      },
      {
        baslik: 'Gelir belgeleri',
        paragraflar: [
          'Burs değerlendirmesinde en belirleyici belge genellikle gelir durumu. İstenen belge ailenin ' +
            'çalışma durumuna göre değişiyor.',
        ],
        liste: [
          'Ücretli çalışan: işyerinden alınan maaş bordrosu ya da gelir yazısı.',
          'Emekli: emekli aylığı gösteren belge (e-Devlet üzerinden alınabiliyor).',
          'Serbest çalışan: vergi levhası ve gelir beyanı.',
          'Çalışmayan: SGK hizmet dökümü ya da "kaydı yoktur" yazısı.',
          'Kira geliri, tarım geliri gibi ek gelirler varsa bunları gösteren belgeler.',
        ],
        uyari:
          'Gelir belgesini eksik ya da gerçeğe aykırı vermek, bursun kesilmesine ve ödenen tutarın ' +
          'geri istenmesine yol açabiliyor. Eksik belge yerine açıklama yazmak her zaman daha güvenli.',
      },
      {
        baslik: 'Niyet mektubu',
        paragraflar: [
          'Birçok vakıf bursunda niyet mektubu isteniyor ve değerlendirmede ağırlığı yüksek. ' +
            'Yapısı [ön yazıya](/rehber/on-yazi-nasil-yazilir) benziyor ama daha kişisel: ' +
            'ne okuduğun, hangi koşullarda okuduğun, bursla ne yapacağın ve hedefin.',
        ],
      },
      {
        baslik: 'Dosya düzeni',
        kontrol: {
          baslik: 'Yüklemeden önce',
          maddeler: [
            'Bütün belgeler PDF mi?',
            'Dosya adları anlaşılır mı ("AdSoyad-ikametgah.pdf")',
            'Barkodlu belgelerin barkodu okunuyor mu?',
            'Tarihler güncel mi? (çoğu kurum son 30 gün istiyor)',
            'Toplam dosya boyutu sistemin sınırının altında mı?',
          ],
        },
      },
    ],
    sss: [
      {
        soru: 'Belgeler ne kadar güncel olmalı?',
        cevap:
          'Çoğu kurum son bir ay içinde alınmış belge istiyor. Başvuru döneminde yeniden indirmek en güvenlisi.',
      },
      {
        soru: 'Anne-babam çalışmıyorsa ne vermeliyim?',
        cevap:
          'SGK hizmet dökümü ya da kayıt bulunmadığını gösteren belge isteniyor. Bu belge e-Devlet üzerinden alınabiliyor.',
      },
      {
        soru: 'Belgelerin aslı isteniyor mu?',
        cevap:
          'Çoğu başvuru artık çevrim içi ve tarama kabul ediliyor. Bazı kurumlar kabulden sonra aslını istiyor; ilan metninde yazıyor.',
      },
    ],
    kaynaklar: [{ etiket: 'e-Devlet Kapısı', adres: 'https://www.turkiye.gov.tr' }],
    sonrakiAdim: {
      etiket: 'Açık bursları gör',
      yol: '/burslar',
      aciklama: 'Belgeler hazırsa başvuru dönemi açık olanlara bak.',
    },
  }),

  metinRehberi({
    slug: 'burs-mulakati',
    baslik: 'Burs mülakatı nasıl olur?',
    ozet: 'Sorular genellikle üç başlıkta toplanıyor.',
    konu: 'burs',
    etiketler: ['burs mülakatı', 'vakıf', 'görüşme', 'hazırlık'],
    aciklama:
      'Burs mülakatında ne sorulur? Hazırlık, sık sorulan sorular ve dikkat edilecekler.',
    hizliCevap:
      'Burs mülakatında sorular genellikle üç başlıkta toplanıyor: neden bu bursa ihtiyacın var, ' +
      'okulunda ve hayatında ne yapıyorsun, mezun olunca ne yapmayı düşünüyorsun. ' +
      'Amaç seni sınamak değil, beyan ettiğin durumu ve hedeflerini anlamak. ' +
      'Abartmadan, somut örneklerle konuşmak en iyi sonucu veriyor.',
    bloklar: [
      {
        paragraflar: [
          'Burs mülakatı iş mülakatına benzemiyor. Karşındaki kişi teknik bilgini ölçmüyor; ' +
            'dosyadaki bilgiyi doğrulamaya ve seni tanımaya çalışıyor.',
        ],
      },
      {
        baslik: 'Üç başlık',
        liste: [
          'Durum: ailen ne iş yapıyor, nerede kalıyorsun, giderlerini nasıl karşılıyorsun.',
          'Okul ve ilgi alanları: neden bu bölüm, hangi dersler ilgini çekiyor, ders dışında ne yapıyorsun.',
          'Hedef: mezun olunca ne yapmak istiyorsun, bu burs sana ne sağlayacak.',
        ],
      },
      {
        baslik: 'Hazırlık',
        sirali: [
          'Başvuru dosyanda ne yazdığını tekrar oku; sorular oradan çıkıyor.',
          'Kurumu tanı: vakıf neyi destekliyor, hangi alanlara önem veriyor.',
          'Üç somut örnek hazırla: bir proje, bir sorumluluk, bir zorluk.',
          'Giderlerini kabaca bil: kira, ulaşım, yemek. "Bilmiyorum" demek zayıf duruyor.',
          'Soracağın bir soru hazırla: bursun süresi, yenilenme koşulu, mentorluk desteği.',
        ],
      },
      {
        baslik: 'Dikkat edilecekler',
        karsilastirma: {
          kotuBaslik: 'Zayıf cevap',
          iyiBaslik: 'Güçlü cevap',
          kotu: [
            'Çok zor durumdayım, bursa çok ihtiyacım var.',
            'Ne yapacağımı henüz bilmiyorum.',
            'Ders çalışıyorum, başka bir şey yapmıyorum.',
          ],
          iyi: [
            'Kira ve ulaşım ayda X kadar tutuyor; şu an hafta sonu çalışarak karşılıyorum, burs ders saatlerimi geri kazandırır.',
            'Üretim planlama alanında ilerlemek istiyorum; bu yaz o alanda staj yapmayı hedefliyorum.',
            'Kulüpte etkinlik düzenliyorum; geçen dönem 120 kişilik bir atölyenin kaydını ben yürüttüm.',
          ],
        },
        uyari:
          'Durumunu olduğundan kötü anlatmak, tespit edildiğinde bursun kesilmesine yol açıyor. ' +
          'Dosyadaki bilgiyle söylediğin şey tutmalı.',
      },
    ],
    sss: [
      {
        soru: 'Burs mülakatına nasıl gitmeliyim?',
        cevap:
          'Sade ve düzgün bir kıyafet yeterli; takım elbise beklenmiyor. Belgelerinin bir kopyasını yanında bulundurmak işe yarıyor.',
      },
      {
        soru: 'Mülakat çevrim içi yapılıyorsa ne değişir?',
        cevap:
          'İçerik değişmiyor, hazırlık değişiyor: bağlantı, kamera ve sessiz ortam gerekiyor. Ayrıntısı [online mülakat](/rehber/online-mulakat) sayfasında.',
      },
      {
        soru: 'Not ortalamam düşükse sorun olur mu?',
        cevap:
          'Bazı burslarda ortalama şartı var, bazılarında yok. Şart yoksa düşük ortalamayı açıklamak — çalıştığın bir dönem, bir sağlık sorunu — dürüst ve etkili bir yaklaşım.',
      },
    ],
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr' },
    ],
    sonrakiAdim: {
      etiket: 'Açık bursları gör',
      yol: '/burslar',
      aciklama: 'Mülakata çağıracak başvuruları kaçırma.',
    },
  }),

  metinRehberi({
    slug: 'burs-hangi-durumlarda-kesilir',
    baslik: 'Burs hangi durumlarda kesilir?',
    ozet: 'Kayıt dondurma, başarısızlık ve bildirim eksikliği en sık sebepler.',
    konu: 'burs',
    etiketler: ['burs kesilmesi', 'kayıt dondurma', 'başarı şartı', 'kyk'],
    aciklama:
      'Burs hangi durumlarda kesilir? Kayıt dondurma, disiplin cezası, başarı şartı ve ' +
      'bildirim yükümlülüğü.',
    hizliCevap:
      'Bursun kesilmesine yol açan durumlar kurumdan kuruma değişse de ortak başlıklar şunlar: ' +
      'öğrencilik statüsünün sona ermesi ya da kayıt dondurma, kurumun aradığı başarı şartının ' +
      'sağlanamaması, disiplin cezası ve başvuruda verilen bilgilerin gerçeğe aykırı çıkması. ' +
      'Durumunda bir değişiklik olduğunda kuruma kendin bildirmek, sonradan tespit edilmesinden çok daha iyi sonuçlanıyor.',
    bloklar: [
      {
        baslik: 'Sık görülen sebepler',
        liste: [
          'Öğrencilik statüsünün sona ermesi: mezuniyet, kayıt sildirme ya da ilişik kesme.',
          'Kayıt dondurma: çoğu kurumda burs dondurulan dönem boyunca durduruluyor.',
          'Başarı şartı: kurumun belirlediği ortalamanın altına düşmek ya da yeterli ders geçmemek.',
          'Disiplin cezası: ceza türüne göre burs geçici ya da kalıcı olarak kesilebiliyor.',
          'Yanlış beyan: gelir durumu, başka burs alma ya da ikametgâh bilgisinin gerçeğe aykırı olması.',
          'Bildirim yapmamak: durum değiştiği hâlde kuruma haber vermemek.',
        ],
      },
      {
        baslik: 'Bildirim yükümlülüğü',
        paragraflar: [
          'Çoğu burs sözleşmesinde "durumunda değişiklik olması hâlinde kurumu bilgilendirmek" maddesi var. ' +
            'Bu madde işletildiğinde, değişikliği bildirmemek başlı başına bir kesilme sebebi oluyor — ' +
            'değişikliğin kendisi kesilme sebebi olmasa bile.',
        ],
        kontrol: {
          baslik: 'Bunları bildir',
          maddeler: [
            'Başka bir burs almaya başladım',
            'Kayıt dondurdum ya da okul değiştirdim',
            'Bölüm ya da üniversite değiştirdim',
            'Adres ve iletişim bilgilerim değişti',
            'Ailenin gelir durumunda önemli bir değişiklik oldu',
          ],
        },
      },
      {
        baslik: 'Kesilen burs geri alınır mı',
        paragraflar: [
          'Bazı kurumlar sebep ortadan kalktığında bursu yeniden başlatıyor: kayıt dondurma bittiğinde ' +
            'ya da başarı şartı yeniden sağlandığında. Bunun için genellikle yazılı başvuru gerekiyor ve ' +
            'süre sınırı olabiliyor.',
        ],
        uyari:
          'Yanlış beyan nedeniyle kesilen bursta ödenen tutar geri istenebiliyor ve kurumun sonraki ' +
          'başvurularına kapatılabiliyorsun. Bu, geri dönüşü en zor durum.',
      },
    ],
    sss: [
      {
        soru: 'Kayıt dondurursam bursum kesilir mi?',
        cevap:
          'Çoğu kurumda burs dondurulan dönem boyunca durduruluyor, kayıt açıldığında yeniden başlatılabiliyor. Kurumun kendi yönergesine bakmak gerekiyor.',
      },
      {
        soru: 'Bir dersten kalırsam burs kesilir mi?',
        cevap:
          'Tek dersten kalmak genellikle tek başına sebep olmuyor; ölçü kurumun belirlediği ortalama ya da geçilen kredi şartı.',
      },
      {
        soru: 'Staj yaparken ücret alırsam bursum etkilenir mi?',
        cevap:
          'Çoğu kurumda staj ücreti gelir sayılmıyor, ama bazı kurumlar bildirim istiyor. Sözleşmeni okumak ve gerekiyorsa bildirmek en güvenlisi.',
      },
    ],
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr' },
    ],
    sonrakiAdim: {
      etiket: 'KYK burs ve öğrenim kredisi',
      yol: '/rehber/kyk-burs-ve-kredi',
      aciklama: 'KYK tarafındaki koşulları ayrıca oku.',
    },
  }),

  metinRehberi({
    slug: 'kyk-kredisi-geri-odeme',
    baslik: 'KYK öğrenim kredisi geri ödemesi nasıl işliyor?',
    ozet: 'Ödeme mezuniyetten sonra başlıyor; mekanizmayı bilmek gerekiyor.',
    konu: 'burs',
    etiketler: ['kyk kredisi', 'geri ödeme', 'borç', 'mezuniyet'],
    aciklama:
      'KYK öğrenim kredisi geri ödemesi ne zaman başlar, nasıl hesaplanır ve nasıl ödenir?',
    hizliCevap:
      'Öğrenim kredisi, burstan farklı olarak geri ödenen bir destektir. Geri ödeme öğrencilik ' +
      'bittikten sonra, kanunla belirlenen bir süre geçtikten sonra başlar ve taksitlerle yapılır. ' +
      'Tutar, alınan kredi üzerine kanunda belirlenen artış uygulanarak hesaplanır. ' +
      'Güncel borcunu ve taksit planını e-Devlet üzerinden görebilirsin.',
    bloklar: [
      {
        paragraflar: [
          'Öğrenim kredisi alan öğrencilerin çoğu geri ödemeyi mezuniyete kadar düşünmüyor; ' +
            'oysa mekanizmayı baştan bilmek, kredi mi burs mu tercihinde ve mezuniyet planında işe yarıyor.',
        ],
      },
      {
        baslik: 'Burs ile kredi farkı',
        tablo: {
          sutunlar: ['Burs', 'Öğrenim kredisi'],
          satirlar: [
            ['Geri ödemesi yok', 'Mezuniyetten sonra geri ödenir'],
            ['Kontenjan sınırlı, başarı ve gelir şartı ağır', 'Daha geniş kesime açık'],
            ['Kesilme koşulları var', 'Kesilme koşulları var, ayrıca borç doğuyor'],
          ],
        },
        paragraflar: [
          'Ayrıntısı [KYK burs ve öğrenim kredisi](/rehber/kyk-burs-ve-kredi) sayfasında.',
        ],
      },
      {
        baslik: 'Geri ödeme nasıl başlıyor',
        sirali: [
          'Öğrencilik sona eriyor (mezuniyet, kayıt sildirme ya da ilişik kesme).',
          'Kanunla belirlenen bekleme süresi işliyor.',
          'Kurum borç tutarını ve taksit planını bildiriyor.',
          'Ödemeler taksitler hâlinde yapılıyor.',
        ],
        uyari:
          'Bekleme süresi, taksit sayısı ve uygulanan artış oranı mevzuata bağlı ve değişebiliyor. ' +
          'Bu sayfada rakam yazmıyoruz; güncel bilgi için resmî kaynağa bak.',
      },
      {
        baslik: 'Dikkat edilecekler',
        liste: [
          'Adres ve iletişim bilgilerini güncel tut: bildirimler oraya gidiyor.',
          'Borcunu e-Devlet üzerinden düzenli kontrol et.',
          'Taksitleri geciktirme; gecikmede ek yük doğabiliyor.',
          'Lisansüstü eğitime devam ediyorsan öğrencilik durumunun kayıtlara işlendiğinden emin ol.',
          'Askerlik ve benzeri durumlarda erteleme koşullarını kurumdan sor.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Öğrenim kredisi geri ödemesi ne zaman başlar?',
        cevap:
          'Öğrencilik sona erdikten sonra, kanunla belirlenen bekleme süresi geçtiğinde başlıyor. Süre mevzuata bağlı olduğu için güncel bilgiyi resmî kaynaktan almak gerekiyor.',
      },
      {
        soru: 'Borcumu erken kapatabilir miyim?',
        cevap:
          'Erken ödeme genellikle mümkün. Koşulları ve varsa indirimi kurumdan ya da e-Devlet üzerinden öğrenebilirsin.',
      },
      {
        soru: 'Lisansüstüne devam edersem ödeme başlar mı?',
        cevap:
          'Öğrenciliğin devam ettiği kayıtlara işlenmişse ödeme genellikle ertelenir. Kaydın sistemde göründüğünden emin olmak gerekiyor.',
      },
      {
        soru: 'Borcumu nereden görebilirim?',
        cevap:
          'e-Devlet üzerinden öğrenim kredisi borcu ve taksit bilgisi sorgulanabiliyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr' },
      { etiket: 'e-Devlet Kapısı', adres: 'https://www.turkiye.gov.tr' },
    ],
    sonrakiAdim: {
      etiket: 'Açık bursları gör',
      yol: '/burslar',
      aciklama: 'Geri ödemesi olmayan burslara da bak.',
    },
  }),

  metinRehberi({
    slug: 'karsiliksiz-ve-geri-odemeli-burs-farki',
    baslik: 'Karşılıksız ve geri ödemeli burs farkı',
    ozet: 'Adı burs olan her destek karşılıksız değil.',
    konu: 'burs',
    etiketler: ['karşılıksız burs', 'geri ödemeli', 'kredi', 'zorunlu hizmet'],
    aciklama:
      'Karşılıksız burs ile geri ödemeli destek arasındaki fark nedir? Zorunlu hizmet ' +
      'karşılığı burslar ve başvurmadan önce sorulacak sorular.',
    hizliCevap:
      'Karşılıksız burs geri ödenmez ve karşılığında bir yükümlülük doğurmaz. Geri ödemeli destek ' +
      '(öğrenim kredisi gibi) mezuniyetten sonra ödenir. Üçüncü bir tür daha var: zorunlu hizmet ' +
      'karşılığı burslar — para geri ödenmez ama mezuniyetten sonra belirli bir süre o kurumda ' +
      'çalışma yükümlülüğü doğar. Başvurmadan önce hangi türde olduğunu ilan metninden doğrula.',
    bloklar: [
      {
        baslik: 'Üç tür',
        tablo: {
          sutunlar: ['Tür', 'Geri ödeme', 'Başka yükümlülük'],
          satirlar: [
            ['Karşılıksız burs', 'Yok', 'Yok (başarı ve öğrencilik şartı hariç)'],
            ['Öğrenim kredisi', 'Var, mezuniyetten sonra', 'Yok'],
            ['Zorunlu hizmet karşılığı burs', 'Yok', 'Belirli süre çalışma yükümlülüğü'],
          ],
        },
      },
      {
        baslik: 'Zorunlu hizmet karşılığı burslar',
        paragraflar: [
          'Bazı kurumlar öğrenciyi okuturken mezuniyetten sonra kendi bünyesinde belirli bir süre ' +
            'çalışmasını şart koşuyor. Bu, kötü bir şey değil — güvenli bir iş girişi anlamına da geliyor. ' +
            'Ama sözleşmenin cayma maddesi çok önemli: yükümlülük yerine getirilmediğinde ödenen tutar ' +
            'genellikle faiziyle geri isteniyor.',
        ],
        kontrol: {
          baslik: 'Sözleşmeyi imzalamadan sor',
          maddeler: [
            'Yükümlülük kaç yıl?',
            'Hangi şehirde/kurumda çalışacağım, seçme hakkım var mı?',
            'Cayarsam ne kadar geri ödemem gerekiyor?',
            'Askerlik, sağlık gibi durumlarda erteleme var mı?',
            'Yükümlülük mezuniyetten kaç ay sonra başlıyor?',
          ],
        },
      },
      {
        baslik: 'İlan metninde arayacağın kelimeler',
        liste: [
          '"karşılıksız" — geri ödeme yok demek.',
          '"mecburi hizmet", "zorunlu hizmet", "taahhüt" — çalışma yükümlülüğü var demek.',
          '"kredi" — geri ödemeli demek.',
          '"senet", "kefil" — mali yükümlülük doğuyor demek; sözleşmeyi dikkatle oku.',
        ],
        uyari:
          'İlanda hiçbiri yazmıyorsa kuruma sor ve cevabı yazılı al. "Burs" kelimesi tek başına ' +
          'karşılıksız olduğu anlamına gelmiyor.',
      },
    ],
    sss: [
      {
        soru: '"Burs" denilen her destek karşılıksız mı?',
        cevap:
          'Hayır. Bazı destekler kredi niteliğinde, bazıları zorunlu hizmet karşılığı veriliyor. İlan metnindeki koşullar bölümü belirleyici.',
      },
      {
        soru: 'Zorunlu hizmetten cayarsam ne olur?',
        cevap:
          'Genellikle ödenen tutar yasal faiziyle geri isteniyor. Sözleşmedeki cayma maddesi ne diyorsa o uygulanıyor.',
      },
      {
        soru: 'Senet imzalamam istenirse ne yapmalıyım?',
        cevap:
          'Senet ciddi bir mali yükümlülük. İmzalamadan önce sözleşmenin tamamını oku, anlamadığın maddeyi sor ve gerekirse bir yetişkinden görüş al.',
      },
    ],
    kaynaklar: [
      { etiket: 'Gençlik ve Spor Bakanlığı — KYGM', adres: 'https://kygm.gsb.gov.tr' },
    ],
    sonrakiAdim: {
      etiket: 'Açık bursları gör',
      yol: '/burslar',
      aciklama: 'Karşılıksız olup olmadığını kartlarda gösteriyoruz.',
    },
  }),

  metinRehberi({
    slug: 'burs-dolandiriciligi',
    baslik: 'Burs dolandırıcılığı nasıl anlaşılır?',
    ozet: 'Para isteyen hiçbir burs gerçek değil.',
    konu: 'burs',
    etiketler: ['dolandırıcılık', 'sahte burs', 'güvenlik', 'kişisel veri'],
    oneCikan: true,
    aciklama:
      'Sahte burs ilanları nasıl anlaşılır? Başvuru ücreti isteyen ilanlar, kişisel veri ' +
      'talepleri ve güvenli başvuru yolları.',
    hizliCevap:
      'Gerçek bir burs başvurusu senden hiçbir aşamada para istemez: başvuru ücreti, dosya ücreti ' +
      've "kontenjan ayırma" bedeli diye bir şey yoktur. Kart bilgisi, banka şifresi ya da ' +
      'e-Devlet şifresi isteyen her talep dolandırıcılıktır. Başvuruyu her zaman kurumun kendi ' +
      'resmî adresi üzerinden yap; sosyal medyadan gelen bağlantılara güvenme.',
    bloklar: [
      {
        paragraflar: [
          'Burs başvuru dönemleri, dolandırıcılık girişimlerinin de arttığı dönemler. Hedef genellikle ' +
            'iki şey: küçük tutarlı ödemeler ve kişisel veriler.',
        ],
      },
      {
        baslik: 'Uyarı işaretleri',
        liste: [
          'Başvuru, dosya ya da işlem ücreti isteniyor.',
          'Kart numarası, CVV, banka şifresi ya da e-Devlet şifresi isteniyor.',
          'Adres kurumun resmî alan adı değil (benzer yazılmış, sonuna ek almış adresler).',
          '"Bugün son gün", "kontenjan bitiyor" gibi acele ettiren dil.',
          'Başvuru yalnızca WhatsApp ya da Instagram mesajıyla alınıyor.',
          'Kurumun kendi sitesinde böyle bir duyuru yok.',
          'Bursun koşulları belirsiz, ödeme tutarı gerçekçi olmayacak kadar yüksek.',
        ],
      },
      {
        baslik: 'Nasıl doğrularsın',
        sirali: [
          'Kurumun adını arama motorunda ara ve KENDİ resmî sitesine git.',
          'Duyuruyu o sitede gör; yoksa başvuru sahte olabilir.',
          'Adres çubuğundaki alan adını harf harf kontrol et.',
          'Şüphelendiğinde kurumun resmî telefonundan ara — mesajdaki numaradan değil.',
          'StajımVar\'da listelenen fırsatlarda "Resmî kaynak" bağlantısına bak; her kaydı kurumun kendi sayfasından doğruluyoruz.',
        ],
        uyari:
          'e-Devlet şifreni hiç kimseyle paylaşma. Hiçbir kurum, hiçbir burs başvurusu için ' +
          'e-Devlet şifreni istemez.',
      },
      {
        baslik: 'Dolandırıldıysan',
        liste: [
          'Ödeme yaptıysan bankanı hemen ara ve işlemi bildir.',
          'Kart bilgisi verdiysen kartı kapattır.',
          'e-Devlet şifreni paylaştıysan şifreni hemen değiştir.',
          'Durumu resmî makamlara bildir; ekran görüntülerini ve yazışmaları sakla.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Burs başvurusu için ücret istenmesi normal mi?',
        cevap:
          'Hayır. Gerçek burs başvurularında ücret alınmaz. Ücret isteyen her ilan şüpheli kabul edilmelidir.',
      },
      {
        soru: 'Sosyal medyadan gelen burs bağlantısına güvenilir mi?',
        cevap:
          'Bağlantıya değil kuruma güvenilir. Duyuruyu kurumun kendi resmî sitesinde görmeden başvuru yapma.',
      },
      {
        soru: 'Kişisel bilgilerimi vermek zorunda mıyım?',
        cevap:
          'Başvuru için ad, öğrenci bilgisi ve iletişim gerekiyor; ancak banka şifresi, kart güvenlik kodu ve e-Devlet şifresi hiçbir başvuruda istenmez.',
      },
    ],
    kaynaklar: [
      { etiket: 'USOM — Ulusal Siber Olaylara Müdahale Merkezi', adres: 'https://www.usom.gov.tr' },
      { etiket: 'e-Devlet Kapısı', adres: 'https://www.turkiye.gov.tr' },
    ],
    sonrakiAdim: {
      etiket: 'Doğrulanmış bursları gör',
      yol: '/burslar',
      aciklama: 'Her kaydın resmî kaynağı kurumun kendi sayfasından doğrulanıyor.',
    },
  }),

  metinRehberi({
    slug: 'burs-basvuru-takvimi-takibi',
    baslik: 'Burs başvuru takvimi nasıl takip edilir?',
    ozet: 'Kaçırmamak bir sistem işi; hafızaya bırakılmıyor.',
    konu: 'burs',
    etiketler: ['takvim', 'hatırlatma', 'başvuru', 'takip'],
    aciklama:
      'Burs başvuru tarihleri nasıl takip edilir? Kaynak listesi, hatırlatma kurma ve ' +
      'belge dosyası hazırlama.',
    hizliCevap:
      'Burs kaçırmanın sebebi genellikle başvurmamak değil, tarihi kaçırmak. İşe yarayan yöntem şu: ' +
      'ilgilendiğin kurumların resmî duyuru sayfalarını tek bir listede topla, geçen yılın tarihlerini ' +
      'not et, takvimine iki hatırlatma koy ve belgeleri pencere açılmadan hazırla. ' +
      'StajımVar\'ın [fırsat takvimi](/firsat-takvimi) açılış ve kapanış günlerini ay ay gösteriyor.',
    bloklar: [
      {
        baslik: 'Üç adımlı sistem',
        sirali: [
          'Kaynak listesi: ilgilendiğin her kurumun DUYURU sayfasını yer imlerine ekle. Ana sayfa değil, duyuru sayfası.',
          'Geçmiş takvim: geçen yıl hangi hafta açıldığını not et. Kurumlar genellikle benzer haftalarda açıyor.',
          'İki hatırlatma: tahmini tarihten bir hafta önce ve o gün.',
        ],
      },
      {
        baslik: 'Belge dosyası',
        paragraflar: [
          'Başvuru pencereleri kısa. Belgeleri pencere açıldıktan sonra toplamaya başlamak, ' +
            'çoğu başvurunun kaçırılma sebebi. Yılın herhangi bir zamanında hazır tutulabilecek bir klasör:',
        ],
        kontrol: {
          baslik: 'Burs dosyası',
          maddeler: [
            'Öğrenci belgesi (başvuru döneminde yenile)',
            'Transkript',
            'İkametgâh ve nüfus kayıt örneği',
            'Aile gelir belgeleri',
            'Niyet mektubu taslağı',
            'Vesikalık fotoğraf',
            'Varsa sertifika ve başarı belgeleri',
          ],
        },
      },
      {
        baslik: 'Nereleri takip etmeli',
        liste: [
          'Kendi üniversitenin burs ve sağlık kültür daire başkanlığı duyuruları.',
          'Kendi bölümünün duyuru panosu ve e-posta listesi.',
          'İlgilendiğin vakıf ve derneklerin resmî siteleri.',
          'Belediyelerin öğrenci destek sayfaları.',
          'Meslek odaları ve sektör dernekleri.',
          '[StajımVar fırsat sayfası](/firsatlar) — kayıtları resmî kaynağıyla doğruluyoruz.',
        ],
        uyari:
          'Sosyal medyadaki "burs duyuru" hesaplarından gelen bilgiyi mutlaka kurumun kendi sayfasından ' +
          'doğrula. Yanlış tarih paylaşımları yaygın ve bir günlük fark başvuruyu kaçırtabiliyor.',
      },
    ],
    sss: [
      {
        soru: 'Aynı anda kaç bursa başvurabilirim?',
        cevap:
          'Sayı sınırı genellikle yok; sınır bursların kendi koşullarında. Ayrıntısı [aynı anda birden fazla burs](/rehber/ayni-anda-birden-fazla-burs) sayfasında.',
      },
      {
        soru: 'Başvuru tarihini kaçırdım, itiraz edebilir miyim?',
        cevap:
          'Kapanan başvuru pencereleri genellikle yeniden açılmıyor. Aynı dönemde açık olan başka bursları taramak daha verimli.',
      },
      {
        soru: 'Takvimi nereden görebilirim?',
        cevap:
          'StajımVar fırsat takviminde açılış ve son başvuru günleri ay ay listeleniyor; her kaydın resmî kaynak bağlantısı da kartın üzerinde.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Fırsat takvimini aç',
      yol: '/firsat-takvimi',
      aciklama: 'Açılan ve kapanan başvurular ay ay.',
    },
  }),
];
