import { metinRehberi } from '../rehber-govde';
import type { Rehber } from '../rehberler';

/**
 * Üniversite hayatı rehberleri.
 *
 * Bu konudaki her şey okuldan okula değişiyor: yönetmelikler, kontenjanlar,
 * başvuru takvimleri. Kesin ve evrensel ifade kullanmıyoruz; işleyişi
 * anlatıp "kendi okulunun yönetmeliğine bak" diyoruz.
 */
export const UNIVERSITE_REHBERLERI: Rehber[] = [
  metinRehberi({
    slug: 'universite-kariyer-merkezi',
    baslik: 'Üniversite kariyer merkezi ne işe yarar?',
    ozet: 'Çoğu öğrencinin varlığından haberi olmayan en yakın kaynak.',
    konu: 'universite',
    etiketler: ['kariyer merkezi', 'staj', 'kariyer günleri', 'mentorluk'],
    oneCikan: true,
    aciklama:
      'Üniversite kariyer merkezi ne yapar? Staj ilanları, CV desteği, kariyer günleri ' +
      've mezun ağı nasıl kullanılır.',
    hizliCevap:
      'Kariyer merkezleri şirketlerle okul arasındaki resmî köprü: kendilerine gelen staj ve ' +
      'yeni mezun ilanlarını duyurur, kariyer günleri düzenler, CV ve mülakat desteği verir. ' +
      'Buraya gelen ilanların rekabeti dışarıdaki ilanlara göre çok daha düşük çünkü yalnızca ' +
      'o okulun öğrencilerine açık. Merkezin duyuru listesine kayıt olmak, yapılabilecek en ' +
      'düşük maliyetli iş.',
    bloklar: [
      {
        paragraflar: [
          'Şirketler stajyer ararken en kolay yolu seçiyor: doğrudan üniversiteye yazmak. ' +
            'O yazı kariyer merkezine düşüyor ve merkezin duyuru kanalından dağıtılıyor. ' +
            'Kanalda olmayan öğrenci o ilanı hiç görmüyor.',
        ],
      },
      {
        baslik: 'Ne veriyorlar',
        liste: [
          'Okula özel staj ve yeni mezun ilanları.',
          'Kariyer günleri ve şirket sunumları — İK ile yüz yüze tanışma.',
          'CV inceleme ve deneme mülakatı.',
          'Mezun ağı: aynı bölümden mezun olup sektörde çalışanlara ulaşma.',
          'Sertifika programları ve atölyeler.',
          'Bazı okullarda staj yeri eşleştirme desteği.',
        ],
      },
      {
        baslik: 'Nasıl kullanılır',
        sirali: [
          'Merkezin sayfasını bul ve duyuru listesine kaydol (e-posta ya da uygulama).',
          'Varsa öğrenci portalına CV\'ni yükle — şirketler oradan tarıyor.',
          'Kariyer günlerine katıl ve tanıştığın kişilerden iletişim bilgisi al.',
          'CV inceleme randevusu al; ücretsiz ve dışarıda para verdiğin hizmetin aynısı.',
          'Mezun ağı varsa kendi bölümünden birine kısa bir mesaj yaz.',
        ],
        uyari:
          'Kariyer merkezi ile [staj birimi](/rehber/universite-staj-birimi) farklı yerler. ' +
          'Staj birimi zorunlu staj formunu ve resmî süreci yürütüyor; kariyer merkezi ilan ve ' +
          'etkinlik tarafında. İkisini de tanımak gerekiyor.',
      },
      {
        baslik: 'Kariyer günlerinden verim almak',
        liste: [
          'Katılacak şirketlerin listesine önceden bak, üç tanesini seç.',
          'CV\'nin birkaç çıktısını yanında götür.',
          'Otuz saniyelik bir tanıtım hazırla: kim olduğun, ne aradığın, ne yapabildiğin.',
          'Standa yalnızca hediye almak için gitme; bir soru sor.',
          'Aynı gün LinkedIn\'den bağlantı gönder ve kısa bir not ekle.',
        ],
      },
      {
        baslik: 'Merkezin olmadığı durumlar',
        paragraflar: [
          'Her okulda aktif bir kariyer merkezi olmuyor. Öyleyse bölüm sekreterliği ve ' +
            'öğretim üyeleri aynı işlevi kısmen görüyor: şirketlerden gelen staj talepleri ' +
            'çoğu zaman bölüm başkanlığına düşüyor. Bölüm duyuru panosunu ve e-posta listesini takip et.',
          'Türkiye\'deki kariyer merkezlerinin listesine [buradan](/universite-kariyer-merkezleri) bakabilirsin.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Kariyer merkezine kimler başvurabilir?',
        cevap:
          'Genellikle o üniversitenin bütün öğrencileri ve çoğu okulda mezunlar da yararlanabiliyor.',
      },
      {
        soru: 'Hizmetleri ücretli mi?',
        cevap:
          'Üniversitelerin kariyer merkezleri öğrencilere genellikle ücretsiz hizmet veriyor.',
      },
      {
        soru: 'Kariyer merkezi staj yeri buluyor mu?',
        cevap:
          'Bazı okullarda eşleştirme desteği var, çoğunda ise ilan duyurusu yapılıyor ve başvuruyu öğrenci kendisi yapıyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Kariyer merkezlerini gör',
      yol: '/universite-kariyer-merkezleri',
      aciklama: 'Üniversitelerin kariyer merkezi sayfaları tek listede.',
    },
  }),

  metinRehberi({
    slug: 'ogrenci-isleri-hangi-islemler',
    baslik: 'Öğrenci işleri hangi işlemleri yapar?',
    ozet: 'Belge, kayıt, ders ve mezuniyet — hepsinin tek durağı.',
    konu: 'universite',
    etiketler: ['öğrenci işleri', 'belge', 'kayıt', 'transkript'],
    aciklama:
      'Üniversitede öğrenci işleri hangi işlemleri yapıyor? Belgeler, kayıt işlemleri, ' +
      'ders kaydı ve mezuniyet süreci.',
    hizliCevap:
      'Öğrenci işleri kayıt, belge, ders kaydı ve mezuniyetle ilgili resmî işlemleri yürütür: ' +
      'öğrenci belgesi, transkript, kayıt dondurma, yatay geçiş evrakı ve mezuniyet belgesi ' +
      'buradan çıkar. Belgelerin çoğu artık e-Devlet ya da öğrenci bilgi sisteminden anında ' +
      'alınabildiği için, öğrenci işlerine gitmen gereken işlem sayısı azalmış durumda.',
    bloklar: [
      {
        baslik: 'Hangi işlem nerede',
        tablo: {
          sutunlar: ['İşlem', 'Nereden'],
          satirlar: [
            ['Öğrenci belgesi', 'e-Devlet ya da öğrenci bilgi sistemi'],
            ['Transkript', 'Öğrenci bilgi sistemi (ıslak imzalı için öğrenci işleri)'],
            ['Ders kaydı ve ekle-sil', 'Öğrenci bilgi sistemi, danışman onayıyla'],
            ['Kayıt dondurma', 'Öğrenci işleri, dilekçeyle'],
            ['Yatay geçiş / çift anadal', 'Öğrenci işleri ve ilgili bölüm'],
            ['Zorunlu staj formu', 'Bölümün staj birimi'],
            ['Mezuniyet ve diploma', 'Öğrenci işleri'],
            ['Askerlik erteleme (EK-C2)', 'Öğrenci işleri ya da e-Devlet'],
          ],
        },
      },
      {
        baslik: 'İşi kolaylaştıran alışkanlıklar',
        liste: [
          'Dilekçeni önceden yaz ve iki kopya götür; bir kopyaya alındı kaşesi vurdur.',
          'E-posta ile başvurabiliyorsan kullan: yazılı iz kalıyor.',
          'Danışmanının onayı gereken işlemleri son güne bırakma.',
          'Akademik takvimi bir kere okuyup önemli tarihleri telefonuna işle.',
          'Belge isterken hangi kurum için gerektiğini söyle; format değişebiliyor.',
        ],
        uyari:
          'Kayıt dondurma, ders ekleme-silme ve yatay geçiş gibi işlemlerin son tarihleri akademik ' +
          'takvimde yazıyor ve bu tarihler kaçırıldığında genellikle telafisi olmuyor.',
      },
      {
        baslik: 'Sık sorulan belgeler',
        paragraflar: [
          'Staj ve burs başvurularında en çok istenen belgeler öğrenci belgesi ve transkript. ' +
            'İkisi de e-Devlet üzerinden barkodlu olarak alınabiliyor ve resmî kabul ediliyor. ' +
            'Ayrıntı için [staj başvurusunda gerekli belgeler](/rehber/staj-basvurusu-gerekli-belgeler) ' +
            've [burs başvurusunda gerekli belgeler](/rehber/burs-basvurusu-gerekli-belgeler).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Transkriptin ıslak imzalısı gerekir mi?',
        cevap:
          'Çoğu başvuruda barkodlu çıktı kabul ediliyor. Bazı resmî işlemlerde ıslak imzalı isteniyor; başvuru yapacağın kuruma sormak gerekiyor.',
      },
      {
        soru: 'Kayıt dondurma nasıl yapılır?',
        cevap:
          'Öğrenci işlerine dilekçeyle başvurulur ve gerekçe belgelenir. Süre ve koşullar üniversitenin yönetmeliğine göre değişiyor.',
      },
      {
        soru: 'Ders kaydını danışmanım onaylamazsa ne olur?',
        cevap:
          'Onaysız ders kaydı tamamlanmış sayılmıyor. Onay süresi dolmadan danışmanına ulaşmak, gerekirse bölüm sekreterliğine durumu bildirmek gerekiyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Okulun staj birimiyle nasıl çalışılır',
      yol: '/rehber/universite-staj-birimi',
      aciklama: 'Staj tarafındaki resmî süreç ayrı yürüyor.',
    },
  }),

  metinRehberi({
    slug: 'yaz-okulu-ve-staj',
    baslik: 'Yaz okulu ve staj aynı anda yapılabilir mi?',
    ozet: 'Teknik olarak mümkün ama takvim çakışması ciddi risk.',
    konu: 'universite',
    etiketler: ['yaz okulu', 'staj', 'takvim', 'devamsızlık'],
    aciklama:
      'Yaz okuluyla staj aynı dönemde yapılabilir mi? Takvim çakışması, devamsızlık ' +
      'riski ve okulun yaklaşımı.',
    hizliCevap:
      'Yasal bir engel olmasa da pratikte zor: yaz okulu dersleri hafta içi gündüz saatlerinde ' +
      'oluyor, staj da tam zamanlı. Okulların çoğu stajda devamsızlığı kabul etmiyor, yaz okulunda ' +
      'devamsızlık sınırı da dar. İkisini birlikte yapacaksan tarihleri çakışmayacak şekilde ' +
      'ayır ve ikisini de yazılı olarak onaylat.',
    bloklar: [
      {
        paragraflar: [
          'Yaz dönemi öğrenciler için sıkışık: ders tekrarı, staj ve çalışma aynı üç aya sığmak zorunda. ' +
            'Çakışmayı önceden görmek, dönem ortasında birini bırakmaktan iyi.',
        ],
      },
      {
        baslik: 'Neden zor',
        liste: [
          'Yaz okulu dersleri yoğunlaştırılmış: haftada daha çok saat, devamsızlık sınırı dar.',
          'Staj tam zamanlı ve devamsız geçen gün stajın gün sayısına sayılmıyor.',
          'İşveren ders saatleri için düzenli izin vermek zorunda değil.',
          'İki tarafta da devamsızlık birikince ikisi de geçersiz olabiliyor.',
        ],
      },
      {
        baslik: 'Yapılabilir hâle getirmek',
        sirali: [
          'Yaz okulu takvimini ve ders saatlerini kesinleştir.',
          '[Staj gününü hesapla](/araclar/staj-gunu-hesaplama) ve staj tarihlerini dersler bittikten sonraya al.',
          'Mümkünse stajı ağustos-eylül aralığına, yaz okulunu temmuza yerleştir.',
          'Çakışma kaçınılmazsa işverene baştan söyle ve yazılı onay al.',
          'Staj birimine durumu bildir; bazı okullar çakışan tarihleri kabul etmiyor.',
        ],
        uyari:
          'Staj tarihlerini işverene bir türlü, okula başka türlü bildirmek en riskli yol: ' +
          'sigorta girişi yazılı tarihe göre yapılıyor ve tutmayan tarih stajı geçersiz kılıyor.',
      },
      {
        baslik: 'Alternatifler',
        liste: [
          'Stajı dönem içinde yarı zamanlı yapmak (okul izin veriyorsa).',
          'Yaz okulunu bir sonraki yaza bırakıp bu yaz stajı tamamlamak.',
          'Uzaktan staj — okul kabul ediyorsa ders saatleriyle uyumlanabiliyor. ' +
            '[Uzaktan staj kabul edilir mi](/rehber/uzaktan-staj-kabul-edilir-mi).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Yaz okulu okurken staj yapabilir miyim?',
        cevap:
          'Yasal bir engel yok ama takvim çakışması pratik engel oluşturuyor. İki tarafın da devamsızlık kurallarına uymak gerekiyor.',
      },
      {
        soru: 'Staj sırasında ders için izin alabilir miyim?',
        cevap:
          'İşverenin insiyatifinde. Kabul edilse bile devamsız geçen gün staj gününe sayılmıyor ve telafi gerekiyor.',
      },
      {
        soru: 'Stajı iki döneme bölebilir miyim?',
        cevap:
          'Bazı okullar bölünmüş stajı kabul ediyor, bazıları kesintisiz istiyor. Bölümünün yönergesine bakmak gerekiyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Staj gününü hesapla',
      yol: '/araclar/staj-gunu-hesaplama',
      aciklama: 'Tarihleri çakıştırmadan planla.',
    },
  }),

  metinRehberi({
    slug: 'ogrenci-kulupleri-cvye-nasil-yazilir',
    baslik: 'Öğrenci kulüpleri CV\'ye nasıl yazılır?',
    ozet: 'Kulüp deneyimdir; anlatılırsa iş görür.',
    konu: 'universite',
    etiketler: ['kulüp', 'topluluk', 'cv', 'deneyim'],
    aciklama:
      'Öğrenci kulübü deneyimi CV\'de nasıl gösterilir? Hangi görevler yazılır, ' +
      'nasıl somutlaştırılır.',
    hizliCevap:
      'Kulüp deneyimi CV\'de "Deneyim" bölümüne yazılır ve iş deneyimi gibi anlatılır: görev, ' +
      'süre ve somut çıktı. "Kulüp üyesiydim" bilgi vermiyor; "dört kişilik ekiple 120 kişilik ' +
      'atölyenin kaydını ve gün planını yürüttüm" veriyor. Özellikle deneyimi az olan öğrenciler ' +
      'için en kolay somutlaşan içerik burası.',
    bloklar: [
      {
        paragraflar: [
          'Öğrenci CV\'lerinde kulüp satırı genellikle en altta, tek kelimeyle geçiyor. Oysa işverenin ' +
            'aradığı beceriler — ekip çalışması, organizasyon, iletişim, sorumluluk — en çok orada görünür.',
        ],
      },
      {
        baslik: 'Nasıl yazılır',
        karsilastirma: {
          kotuBaslik: 'Bilgi vermiyor',
          iyiBaslik: 'Bilgi veriyor',
          kotu: [
            'IEEE Kulübü — üye',
            'Sosyal sorumluluk kulübünde çalıştım',
            'Kulüp etkinliklerine katıldım',
          ],
          iyi: [
            'IEEE Öğrenci Kulübü — Etkinlik Sorumlusu (2025–2026): 3 teknik seminerin planlamasını yaptım, toplam 200+ katılımcı.',
            'Sosyal Sorumluluk Kulübü — Sponsorluk ekibi: 8 firmayla görüşüp 3 sponsorluk anlaşması sağladım.',
            'Fotoğrafçılık Kulübü — Sergi koordinasyonu: 15 kişilik sergi düzenledim, mekân ve baskı sürecini yürüttüm.',
          ],
        },
      },
      {
        baslik: 'Hangi bilgi yazılır',
        liste: [
          'Kulübün adı ve görevin.',
          'Dönem (yıl aralığı).',
          'Yaptığın somut iş — "katıldım" değil, "yürüttüm/düzenledim/görüştüm".',
          'Sayı: kaç kişi, kaç etkinlik, ne kadar bütçe.',
        ],
      },
      {
        baslik: 'Mülakatta işine yarıyor',
        paragraflar: [
          'Staj mülakatlarında sık sorulan "bir sorunu nasıl çözdün", "ekip içinde anlaşmazlık yaşadın mı" ' +
            'gibi soruların cevabı çoğu öğrencide kulüp deneyiminden çıkıyor. Bu yüzden CV\'de yazan ' +
            'kulüp satırının arkasında anlatılabilecek bir hikâye olmalı. ' +
            '[Staj mülakatına hazırlık](/rehber/staj-mulakati) sayfasında örnekleri var.',
        ],
      },
      {
        baslik: 'Sadece üyeysem',
        paragraflar: [
          'Yalnızca üyeysen ve somut bir iş yapmadıysan, bir satırla geçmek yeterli — abartmak ' +
            'mülakatta zor durumda bırakıyor. Bunun yerine bu dönem küçük bir sorumluluk almak, ' +
            'CV\'ye yazılabilecek gerçek bir içerik üretiyor.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Kulüp deneyimi gerçekten dikkate alınıyor mu?',
        cevap:
          'Stajyer alımında evet. İş deneyimi olmayan bir öğrencide işverenin bakacağı en somut içerik kulüp ve proje deneyimi oluyor.',
      },
      {
        soru: 'Kaç kulüp yazmalıyım?',
        cevap:
          'İki ya da üç yeterli. Görev aldığın ve anlatabildiğin olanları yaz; sadece üye olduklarını sıralamak yer kaybı.',
      },
      {
        soru: 'Kulüp deneyimini LinkedIn\'e de yazmalı mıyım?',
        cevap:
          'Evet, LinkedIn\'de "Deneyim" bölümüne eklenebiliyor. Ayrıntısı [LinkedIn profili](/rehber/linkedin-profili-nasil-duzenlenir) sayfasında.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Profilini tamamla ve CV\'ni indir',
      yol: '/cv',
      aciklama: 'Kulüp deneyimini profiline ekle, CV\'de görünsün.',
    },
  }),

  metinRehberi({
    slug: 'cift-anadal-ve-yan-dal',
    baslik: 'Çift anadal ve yan dal: farkı ne, kime uygun?',
    ozet: 'İkisi de ek yük; hangisinin karşılığı var.',
    konu: 'universite',
    etiketler: ['çap', 'çift anadal', 'yan dal', 'başvuru'],
    aciklama:
      'Çift anadal ile yan dal arasındaki fark nedir? Başvuru koşulları, iş yükü ve ' +
      'karar verirken bakılacaklar.',
    hizliCevap:
      'Çift anadal (ÇAP) ikinci bir lisans diploması verir ve ders yükü ağırdır; yan dal ' +
      'diploma değil sertifika verir ve daha az ders gerektirir. İkisine de genellikle belirli ' +
      'bir not ortalaması ve sınıf şartıyla, kontenjan dahilinde başvurulur. Koşullar ve ' +
      'kontenjanlar her üniversitenin kendi yönetmeliğinde belirlenir.',
    bloklar: [
      {
        baslik: 'Fark',
        tablo: {
          sutunlar: ['', 'Çift anadal', 'Yan dal'],
          satirlar: [
            ['Çıktı', 'İkinci lisans diploması', 'Yan dal sertifikası'],
            ['Ders yükü', 'Ağır', 'Daha hafif'],
            ['Süre', 'Genellikle mezuniyeti uzatabilir', 'Genellikle uzatmaz'],
            ['Ortalama şartı', 'Daha yüksek', 'Daha düşük'],
          ],
        },
        uyari:
          'Bu tablo genel eğilimi gösteriyor. Ortalama şartı, kontenjan, başvuru dönemi ve ' +
          'hangi sınıfta başvurulabileceği her üniversitede farklı. Kendi okulunun yönetmeliğini oku.',
      },
      {
        baslik: 'Karar verirken',
        liste: [
          'Amaç ne: iş piyasasında ikinci bir alan mı, yoksa ilgi alanını derinleştirmek mi.',
          'Ders yükü: haftalık ders saatin ne olacak, staj ve iş için zaman kalıyor mu.',
          'Mezuniyet süresi: uzarsa maliyeti ne (barınma, burs, askerlik erteleme).',
          'Bursun etkilenir mi: bazı burslarda normal süre şartı var.',
          'Gerçek karşılığı: sektörde o ikinci diploma aranıyor mu, yoksa proje ve deneyim mi belirleyici.',
        ],
      },
      {
        baslik: 'Başvuru süreci',
        sirali: [
          'Okulun yönetmeliğini ve ilgili bölümün kontenjan ilanını oku.',
          'Ortalama ve sınıf şartını sağlıyor musun kontrol et.',
          'Başvuru dönemini akademik takvimden bul; genellikle dönem başında.',
          'Öğrenci işlerine başvuru formunu ve transkriptini ver.',
          'Kabul edilirsen ders planını danışmanınla birlikte kur.',
        ],
      },
      {
        baslik: 'Vazgeçmek',
        paragraflar: [
          'Çift anadaldan ayrılmak mümkün; alınan dersler çoğu zaman seçmeli olarak sayılabiliyor. ' +
            'Ama ortalama düşerse ana programın da etkileniyor. Dönem ortasında karar vermek yerine ' +
            'bir dönem deneyip değerlendirmek daha sağlıklı.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Çift anadal mezuniyeti uzatır mı?',
        cevap:
          'Ders yüküne ve planlamaya bağlı. Birçok öğrencide bir ya da iki dönem uzuyor; iyi planlanırsa aynı sürede bitirmek de mümkün.',
      },
      {
        soru: 'Yan dal iş başvurusunda işe yarar mı?',
        cevap:
          'Alanla ilgiliyse ve anlatılabiliyorsa yarıyor. Tek başına sertifika değil, o alanda yaptığın proje belirleyici oluyor.',
      },
      {
        soru: 'Çift anadal yaparken staj nasıl olacak?',
        cevap:
          'Her iki programın da staj zorunluluğu olabiliyor. Başvurmadan önce ikisinin staj yükünü toplayıp takvime yerleştir.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Bölümüne göre staj sayfasını aç',
      yol: '/bolumler',
      aciklama: 'İkinci alanında staj nerede yapılıyor, bak.',
    },
  }),

  metinRehberi({
    slug: 'yatay-gecis',
    baslik: 'Yatay geçiş nasıl yapılır?',
    ozet: 'İki yol var: not ortalamasıyla ve merkezi puanla.',
    konu: 'universite',
    etiketler: ['yatay geçiş', 'gno', 'ek madde 1', 'kontenjan'],
    aciklama:
      'Yatay geçiş nasıl yapılır? Not ortalamasıyla ve merkezi puanla geçiş, ' +
      'başvuru dönemi ve ders intibakı.',
    hizliCevap:
      'Yatay geçişin iki temel yolu var: not ortalaması ile yapılan geçiş ve merkezi yerleştirme ' +
      'puanı ile yapılan geçiş. İkisinin de koşulları, kontenjanları ve başvuru tarihleri ' +
      'üniversiteler tarafından ilan ediliyor. Kabul edilirsen ders intibakı yapılıyor: ' +
      'önceki derslerinin bir kısmı sayılıyor, kalanları almak gerekiyor.',
    bloklar: [
      {
        baslik: 'İki yol',
        liste: [
          'Not ortalamasıyla geçiş: belirli bir genel not ortalamasını sağlayan öğrencilerin, ilan edilen kontenjanlara başvurması.',
          'Merkezi puanla geçiş: üniversiteye giriş sınavı puanının, geçilecek programın ilgili yıldaki taban puanına eşit ya da üstünde olması.',
        ],
        uyari:
          'Hangi yolun hangi koşullarda işlediği, hangi sınıflarda başvurulabildiği ve kontenjanlar ' +
          'yıldan yıla ve okuldan okula değişiyor. Başvurmadan önce hedef üniversitenin o yılki ' +
          'ilanını okumak zorunlu.',
      },
      {
        baslik: 'Süreç',
        sirali: [
          'Hedef üniversitenin yatay geçiş ilanını ve kontenjanlarını bul.',
          'Koşulları kontrol et: ortalama, sınıf, disiplin durumu, puan.',
          'Belgeleri hazırla: transkript, ders içerikleri, öğrenci belgesi, sınav sonuç belgesi.',
          'Başvuruyu ilan edilen tarihlerde yap.',
          'Sonuç açıklandığında kayıt süresini kaçırma.',
          'Kayıttan sonra ders intibak formunu doldur ve danışmanla görüş.',
        ],
      },
      {
        baslik: 'Ders intibakı',
        paragraflar: [
          'Geçiş yaptığında önceki dersler otomatik sayılmıyor; intibak komisyonu içerik ve krediye ' +
            'bakarak karar veriyor. Bu yüzden ders içeriklerini (syllabus) eski okulundan almak ve ' +
            'başvuruya eklemek işe yarıyor. Sayılmayan dersler dönem yükünü artırıyor ve mezuniyeti uzatabiliyor.',
        ],
      },
      {
        baslik: 'Geçiş öncesi düşün',
        liste: [
          'Yeni okulun staj zorunluluğu ve yönergesi farklı olabilir.',
          'Bursun geçişten etkilenir mi — kurumuna sor.',
          'Yurt hakkın taşınmıyor; [yurt nakli](/rehber/kyk-yurt-nakli) ayrı bir süreç.',
          'Şehir değişiyorsa barınma ve maliyet hesabını baştan yap.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Yatay geçiş ne zaman yapılır?',
        cevap:
          'Genellikle dönem başlarında, üniversitelerin ilan ettiği takvimde. Kesin tarihler her okulun kendi duyurusunda.',
      },
      {
        soru: 'Birinci sınıfta yatay geçiş yapılabilir mi?',
        cevap:
          'Not ortalamasıyla geçişte genellikle ilk yıl kabul edilmiyor; merkezi puanla geçişte koşullar farklı olabiliyor. Hedef okulun ilanına bakmak gerekiyor.',
      },
      {
        soru: 'Bütün derslerim sayılır mı?',
        cevap:
          'Hayır. İntibak komisyonu ders içeriği ve kredisine göre karar veriyor. Ders içeriklerini başvuruya eklemek olumlu etkiliyor.',
      },
    ],
    kaynaklar: [{ etiket: 'Yükseköğretim Kurulu (YÖK)', adres: 'https://www.yok.gov.tr' }],
    sonrakiAdim: {
      etiket: 'Bölümüne göre staj sayfasını aç',
      yol: '/bolumler',
      aciklama: 'Yeni bölümünde staj nerede yapılıyor, önceden bak.',
    },
  }),

  metinRehberi({
    slug: 'ogrenciyken-yari-zamanli-calisma',
    baslik: 'Öğrenciyken yarı zamanlı çalışmak',
    ozet: 'Bursu, dersleri ve stajı nasıl etkiliyor.',
    konu: 'universite',
    etiketler: ['yarı zamanlı', 'part-time', 'çalışma', 'burs'],
    aciklama:
      'Öğrenciyken yarı zamanlı çalışmak: kampüs içi işler, sigorta, bursun etkilenmesi ' +
      've ders dengesi.',
    hizliCevap:
      'Yarı zamanlı çalışmak öğrenciler için yaygın ve çoğu durumda bursu etkilemiyor; ancak ' +
      'bazı kurumlar gelir beyanı istediği için sözleşmeni okumak gerekiyor. Kampüs içi işler ' +
      '(kütüphane, laboratuvar, öğrenci asistanlığı) ders programına en uyumlu seçenek. ' +
      'Çalıştığın işin sigortalı olması, hem hakların hem ileride emeklilik günün açısından önemli.',
    bloklar: [
      {
        baslik: 'Nereye bakmalı',
        liste: [
          'Kampüs içi kısmi zamanlı öğrenci çalıştırma programları — okulunun duyurularına bak.',
          'Öğrenci asistanlığı ve laboratuvar görevleri: bölüm sekreterliğinden sorulabiliyor.',
          'Kütüphane, kariyer merkezi ve etkinlik birimleri.',
          'Kampüs dışı: kafe, mağaza, çağrı merkezi, dershane.',
          'Uzaktan yapılabilen işler: içerik, çeviri, veri girişi, tasarım.',
        ],
      },
      {
        baslik: 'Bursunu etkiler mi',
        paragraflar: [
          'Çoğu burs, öğrencinin çalışmasını yasaklamıyor. Ancak bazı kurumlar başvuru ve devam ' +
            'sürecinde gelir beyanı istiyor ve düzenli gelir bursun yeniden değerlendirilmesine yol açabiliyor. ' +
            'Kurumunun sözleşmesine bak; belirsizse yazılı sor. Ayrıntı: ' +
            '[burs hangi durumlarda kesilir](/rehber/burs-hangi-durumlarda-kesilir).',
        ],
      },
      {
        baslik: 'Sigorta ve haklar',
        liste: [
          'Çalıştığın iş sigortalı olmalı; sigortasız çalışma hem risk hem hak kaybı.',
          'Yazılı bir iş sözleşmesi iste; sözlü anlaşma ispatlanamıyor.',
          'Çalışma saatlerinin ders programını bozmadığından emin ol.',
          'Ücret ödeme günü ve tutarı yazılı olsun.',
        ],
        uyari:
          'Ailenin sağlık güvencesinden yararlanıyorsan, sigortalı çalışmaya başlamanın bu durumu ' +
          'değiştirip değiştirmeyeceğini SGK\'dan öğren. Bu, öğrencilerin en sık gözden kaçırdığı nokta.',
      },
      {
        baslik: 'Ders dengesi',
        paragraflar: [
          'Haftada belirli bir saatin üstünde çalışmak ders başarısını düşürüyor. Dönem başında ' +
            'ders programını ve iş saatlerini aynı takvime yazıp bakmak, dönem ortasında ' +
            'ikisinden birini bırakmaktan iyi. Sınav haftalarında izin alabileceğini baştan konuş.',
        ],
      },
      {
        baslik: 'CV\'ye yazmak',
        paragraflar: [
          'Yarı zamanlı iş, alanınla ilgili olmasa bile CV\'de değerli: sorumluluk, düzen ve ' +
            'müşteri iletişimi gösteriyor. Yazarken yaptığın işi somutlaştır — ' +
            '[CV\'de proje ve deneyim nasıl anlatılır](/rehber/cvde-proje-nasil-anlatilir).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Çalışırsam KYK bursum kesilir mi?',
        cevap:
          'Kurumun koşullarına bağlı. Çoğu durumda çalışmak tek başına kesilme sebebi değil, ancak gelir beyanı isteniyorsa doğru bildirmek gerekiyor.',
      },
      {
        soru: 'Kampüs içi işler nereden duyuruluyor?',
        cevap:
          'Sağlık kültür daire başkanlığı, kariyer merkezi ve bölüm duyuruları. Kontenjan sınırlı olduğu için duyuruları takip etmek gerekiyor.',
      },
      {
        soru: 'Yarı zamanlı iş staj yerine sayılır mı?',
        cevap:
          'Genellikle sayılmıyor; staj okulun onayladığı ve formu düzenlenen ayrı bir süreç. Bazı bölümler belirli koşullarda sayabiliyor, staj birimine sormak gerekiyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Profilini tamamla ve CV\'ni indir',
      yol: '/cv',
      aciklama: 'Çalıştığın işi deneyim olarak profiline ekle.',
    },
  }),

  metinRehberi({
    slug: 'mezun-olmadan-once-yapilacaklar',
    baslik: 'Mezun olmadan önce yapılması gerekenler',
    ozet: 'Son dönem: belgeler, bağlantılar ve bir sonraki adım.',
    konu: 'universite',
    etiketler: ['mezuniyet', 'son sınıf', 'diploma', 'ilişik kesme'],
    aciklama:
      'Mezun olmadan önce hangi işler bitirilmeli? Belgeler, referanslar, ' +
      'öğrenci hakları ve iş arama hazırlığı.',
    hizliCevap:
      'Mezuniyetten önce üç şey bitmiş olmalı: resmî işler (staj onayı, ilişik kesme, diploma ' +
      'başvurusu), belgeler (transkript, öğrencilik döneminde alınan sertifikalar) ve bağlantılar ' +
      '(hocalarından ve staj yerinden referans, mezun ağına kayıt). Öğrenciyken ücretsiz olan ' +
      'birçok imkân mezuniyetle birlikte kapanıyor; onları da mezun olmadan kullan.',
    bloklar: [
      {
        baslik: 'Resmî işler',
        kontrol: {
          baslik: 'Son dönem',
          maddeler: [
            'Zorunlu stajın onaylandığını ve kaydına işlendiğini doğrula',
            'Mezuniyet için eksik ders ve kredi kontrolü yap',
            'Kütüphane, laboratuvar ve yurt ilişik kesme işlemlerini tamamla',
            'Diploma ve mezuniyet belgesi başvurusunu yap',
            'Askerlik durumunu ve erteleme sürecini kontrol et',
            'Öğrenim kredisi kullandıysan geri ödeme takvimini öğren',
          ],
        },
      },
      {
        baslik: 'Belgeleri topla',
        liste: [
          'Güncel transkript (mezuniyet notlarıyla).',
          'Staj belgeleri ve varsa işyeri değerlendirme formu.',
          'Aldığın sertifika ve kurs belgeleri — dijital kopyalarını bir klasörde topla.',
          'Kulüp görevlerini gösteren yazılar.',
          'Referans olacak kişilerin güncel iletişim bilgileri.',
        ],
      },
      {
        baslik: 'Bağlantılar',
        paragraflar: [
          'Mezuniyetten sonra hocalarına ve staj yerindeki sorumluna ulaşmak zorlaşıyor. ' +
            'Son dönemde referans istemek hem daha kolay hem daha güçlü: seni hatırlıyorlar. ' +
            'Referans isteme biçimi için [stajdan işe geçiş](/rehber/stajdan-ise-gecis) sayfasına bak.',
        ],
        liste: [
          'İki hocadan referans olabileceklerini teyit al.',
          'Staj yaptığın yerdeki sorumlundan referans iste.',
          'LinkedIn profilini mezuniyet bilgisiyle güncelle.',
          'Üniversitenin mezun ağına kaydol.',
        ],
      },
      {
        baslik: 'Öğrenciyken bitir',
        liste: [
          'Öğrenci indirimli yazılım lisansları ve bulut kredileri.',
          'Kütüphane veritabanı erişimiyle indirmek istediğin kaynaklar.',
          'Kariyer merkezinin ücretsiz CV inceleme ve deneme mülakat hizmeti.',
          'Öğrenci kimliğiyle alınabilen sertifika sınavı indirimleri.',
        ],
      },
      {
        baslik: 'Bir sonraki adım',
        paragraflar: [
          'Mezuniyetten sonra iş aramaya başlamak yerine son dönemde başlamak, boşta geçen süreyi ' +
            'kısaltıyor. Yeni mezun programlarının başvuruları çoğu zaman mezuniyetten önce açılıyor. ' +
            '[Yeni mezun CV\'si](/rehber/yeni-mezun-cvsi) ve ' +
            '[yeni mezun programları](/rehber/yeni-mezun-programlari) sayfalarına bak.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Diploma ne zaman alınır?',
        cevap:
          'Mezuniyet işlemleri tamamlandıktan sonra hazırlanıyor; süre okuldan okula değişiyor. O süreçte geçici mezuniyet belgesi alınabiliyor.',
      },
      {
        soru: 'İlişik kesme neden gerekiyor?',
        cevap:
          'Kütüphane, laboratuvar, yurt gibi birimlerle borç ve malzeme ilişkisinin kapatıldığını gösteriyor. Tamamlanmadan diploma verilmiyor.',
      },
      {
        soru: 'Mezun olduktan sonra kariyer merkezinden yararlanabilir miyim?',
        cevap:
          'Birçok üniversite mezunlarına da hizmet veriyor. Mezun olmadan önce mezun ağına kaydolmak erişimi kolaylaştırıyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Yeni mezun CV\'si nasıl yazılır',
      yol: '/rehber/yeni-mezun-cvsi',
      aciklama: 'Öğrenci CV\'sinden farkı ne, oku.',
    },
  }),
];
