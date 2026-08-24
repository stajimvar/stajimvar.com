import { metinRehberi } from '../rehber-govde';
import type { Rehber } from '../rehberler';

/** İlk iş ve kariyer rehberleri. */
export const KARIYER_REHBERLERI: Rehber[] = [
  metinRehberi({
    slug: 'stajdan-sonra-is-teklifi',
    baslik: 'Stajdan sonra iş teklifi almak',
    ozet: 'Teklif son iki haftada değil, ilk haftadan itibaren kazanılıyor.',
    konu: 'kariyer',
    etiketler: ['iş teklifi', 'staj', 'işe geçiş', 'görünürlük'],
    oneCikan: true,
    aciklama:
      'Stajdan sonra iş teklifi nasıl alınır? Görünür olmak, niyeti söylemek ve ' +
      'staj bitiminde yapılacaklar.',
    hizliCevap:
      'İş teklifi alan stajyerlerin ortak özelliği iyi iş çıkarmak değil, yaptığı işin görünür ' +
      'olması ve niyetini açıkça söylemesi. Stajın ortasında bir kez "burada devam etmek ilgimi ' +
      'çekiyor, bunun için ne yapmam gerekir" diye sormak, sonunda sormaktan çok daha etkili — ' +
      'çünkü kadro planlaması staj bitmeden yapılıyor.',
    bloklar: [
      {
        baslik: 'Görünür olmak',
        paragraflar: [
          'Stajyerlerin çoğu iyi iş çıkarıyor ama yaptığı iş kayıtsız kalıyor. Haftalık üç maddelik ' +
            'bir özet göndermek — bu hafta ne yaptım, ne öğrendim, gelecek hafta ne yapacağım — ' +
            'hem işi görünür kılıyor hem de staj sonunda referans isterken karşı tarafa hazır ' +
            'malzeme veriyor.',
        ],
        liste: [
          'Teslim ettiğin işi bağlantı ya da ekran görüntüsüyle göster.',
          'Toplantılarda bir soru sor: sessiz stajyer hatırlanmıyor.',
          'Kendi biriminin dışındaki bir kişiyle kahve içmeyi teklif et.',
          'Yaptığın işleri günlük kaydet — hem defter hem CV için.',
        ],
      },
      {
        baslik: 'Niyeti söylemek',
        paragraflar: [
          'İşverenlerin çoğu, stajyerin devam etmek isteyip istemediğini bilmiyor ve sormuyor. ' +
            'Bu yüzden niyeti söylemek sana kalıyor. Stajın ortasında sorulan bir soru, ' +
            'son gün sorulandan çok daha işe yarıyor.',
        ],
        karsilastirma: {
          kotuBaslik: 'Geç ve belirsiz',
          iyiBaslik: 'Zamanında ve net',
          kotu: [
            'Son gün: "Acaba burada işe alım var mı?"',
            '"Bir şey olursa haber verirsiniz."',
            'Hiç sormamak.',
          ],
          iyi: [
            'Stajın ortasında: "Burada devam etmek ilgimi çekiyor. Bunun için hangi becerileri geliştirmem gerekir?"',
            '"Yeni mezun programınız oluyor mu, başvuru dönemi ne zaman?"',
            '"Yarı zamanlı devam etme imkânı var mı?"',
          ],
        },
      },
      {
        baslik: 'Son iki hafta',
        kontrol: {
          baslik: 'Staj biterken',
          maddeler: [
            'Yaptığın işlerin kısa bir özetini çıkar ve sorumluna gönder',
            'Devrettiğin işleri belgeler ve not bırak',
            'Referans isteyeceğin kişiden izin al',
            'LinkedIn\'de bağlantı kur ve teşekkür mesajı yaz',
            'İletişim bilgilerini paylaş ve al',
            'Yeni mezun programının takvimini sor',
          ],
        },
      },
      {
        baslik: 'Teklif gelmezse',
        paragraflar: [
          'Teklif gelmemesi çoğu zaman performansla ilgili değil: kadro yok, bütçe kapalı ya da ' +
            'alım dönemi farklı. Bu durumda kaybetmediğin iki şey var — referans ve somut bir ' +
            'deneyim. İkisini de yanına al ve bir sonraki başvuruda kullan. ' +
            '[Referans nasıl istenir](/rehber/referans-nasil-istenir).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Stajın hangi aşamasında iş teklifini sormalıyım?',
        cevap:
          'Stajın ortası uygun bir zaman. Kadro planlaması staj bitmeden yapıldığı için son güne bırakmak geç kalmak oluyor.',
      },
      {
        soru: 'Teklif gelirse hemen kabul etmeli miyim?',
        cevap:
          'Düşünmek için süre istemek olağan. Koşulları yazılı olarak görmek ve değerlendirmek gerekiyor — [iş teklifini değerlendirme](/rehber/is-teklifini-degerlendirme).',
      },
      {
        soru: 'Stajım kötü geçtiyse referans isteyebilir miyim?',
        cevap:
          'Doğrudan sorumlun uygun değilse birlikte çalıştığın başka bir kişiden isteyebilirsin. İstemeden önce izin almak şart.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Stajdan işe geçiş',
      yol: '/rehber/stajdan-ise-gecis',
      aciklama: 'Staj bitince atılacak adımlar.',
    },
  }),

  metinRehberi({
    slug: 'yeni-mezun-cvsi',
    baslik: 'Yeni mezun CV\'si nasıl yazılır?',
    ozet: 'Öğrenci CV\'sinden farkı: eğitim aşağı, deneyim yukarı.',
    konu: 'kariyer',
    etiketler: ['yeni mezun', 'cv', 'iş başvurusu', 'deneyim'],
    oneCikan: true,
    aciklama:
      'Yeni mezun CV\'si nasıl hazırlanır? Öğrenci CV\'sinden farkları, sıralama ve ' +
      'deneyim bölümü.',
    hizliCevap:
      'Yeni mezun CV\'sinde sıralama değişiyor: staj ve iş deneyimi en üste, eğitim aşağı iniyor. ' +
      'Not ortalaması yüksek değilse yazılmayabilir. Her deneyim satırı sonuçla bitmeli — ' +
      '"stajyer olarak çalıştım" değil, "üretim raporlamasını Excel\'de otomatikleştirdim, ' +
      'haftalık 2 saat kazandırdı". Bir sayfa kuralı burada da geçerli.',
    bloklar: [
      {
        baslik: 'Öğrenci CV\'sinden farkı',
        tablo: {
          sutunlar: ['', 'Öğrenci CV\'si', 'Yeni mezun CV\'si'],
          satirlar: [
            ['En üstte', 'Eğitim ve projeler', 'Deneyim (staj dahil)'],
            ['Hedef ifadesi', 'Staj arıyorum', 'Hangi pozisyona başvuruyorsan o'],
            ['Ders projeleri', 'Ağırlıklı', 'Deneyim azsa hâlâ değerli'],
            ['Not ortalaması', 'Yüksekse yazılır', 'Genellikle gerekmez'],
          ],
        },
      },
      {
        baslik: 'Deneyim satırı nasıl yazılır',
        sirali: [
          'Pozisyon, kurum ve tarih aralığı.',
          'Ne yaptığın: eylem fiiliyle başlayan iki üç madde.',
          'Sonuç: sayı, süre ya da somut çıktı.',
        ],
        karsilastirma: {
          kotuBaslik: 'Görev tanımı',
          iyiBaslik: 'Sonuç',
          kotu: [
            'Üretim biriminde stajyer olarak çalıştım.',
            'Raporlama işlerinde yer aldım.',
            'Ekibe destek oldum.',
          ],
          iyi: [
            'Üretim fire kaydını pivot tabloya taşıdım; haftalık raporlama 2 saatten 15 dakikaya indi.',
            '3 kişilik ekiple 12 tedarikçi verisini tek formata çevirdim.',
            'Müşteri taleplerini kategorilere ayırıp aylık özet çıkardım.',
          ],
        },
      },
      {
        baslik: 'Deneyim yoksa',
        paragraflar: [
          'Staj yapmadan mezun olduysan CV boş kalmıyor: bitirme projesi, kulüp görevleri, ' +
            'gönüllü işler ve kişisel çalışmalar deneyim bölümünde yer alabiliyor. ' +
            'Önemli olan başlık değil, ne yaptığının somut anlatılması. ' +
            '[CV\'de proje nasıl anlatılır](/rehber/cvde-proje-nasil-anlatilir).',
        ],
      },
      {
        baslik: 'Teknik ayrıntılar',
        liste: [
          'Bir sayfa. İki sayfa ancak uzun bir yayın ya da proje listesiyle.',
          'PDF ve "AdSoyad-CV.pdf".',
          'Tek sütun, standart başlıklar — [ATS uyumlu CV](/rehber/ats-uyumlu-cv).',
          'İlana göre beceri sırasını değiştir.',
          'LinkedIn adresini ekle ve profilin CV ile tutarlı olsun.',
        ],
        uyari:
          'Mezuniyet tarihini gizlemek ya da belirsiz bırakmak işe yaramıyor; İK bunu ilk bakışta ' +
          'fark ediyor. Yeni mezun olmak dezavantaj değil, doğru pozisyonda avantaj.',
      },
    ],
    sss: [
      {
        soru: 'Not ortalamamı yazmalı mıyım?',
        cevap:
          'Yüksekse ve pozisyon için anlamlıysa yaz. Düşükse yazmamak yaygın ve kabul edilir bir tercih.',
      },
      {
        soru: 'Staj yapmadıysam ne yazacağım?',
        cevap:
          'Bitirme projesi, kulüp görevleri, gönüllü işler ve kişisel projeler deneyim bölümünde yer alabilir. Somut anlatım belirleyici.',
      },
      {
        soru: 'Fotoğraf koymalı mıyım?',
        cevap:
          'Türkiye\'de yaygın ve çoğu şirkette sorun değil. Yurt dışı başvurularında birçok ülkede fotoğrafsız CV tercih ediliyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Profilini tamamla ve CV\'ni indir',
      yol: '/cv',
      aciklama: 'Profilindeki bilgilerle tek sayfalık CV üretiliyor.',
    },
  }),

  metinRehberi({
    slug: 'ilk-is-mulakati',
    baslik: 'İlk iş mülakatına hazırlık',
    ozet: 'Staj mülakatından farkı: artık sonuç soruluyor.',
    konu: 'kariyer',
    etiketler: ['mülakat', 'ilk iş', 'yeni mezun', 'hazırlık'],
    aciklama:
      'İlk iş mülakatına nasıl hazırlanılır? Sık sorulan sorular, STAR yöntemi ve ' +
      'yeni mezunların en sık yaptığı hatalar.',
    hizliCevap:
      'İlk iş mülakatında sorular staj mülakatından daha somut: ne yaptığın değil, ne sonuç ' +
      'ürettiğin soruluyor. Cevapları üç parçalı kurmak işe yarıyor — durum, senin yaptığın, ' +
      'sonuç. Üç somut örnek hazırlamak (bir proje, bir zorluk, bir ekip çalışması) ' +
      'soruların çoğunu karşılıyor.',
    bloklar: [
      {
        baslik: 'Üç parçalı cevap',
        paragraflar: [
          'Mülakat sorularının çoğu "bir örnek ver" biçiminde geliyor. Dağınık anlatım ' +
            'burada en çok puan kaybettiren şey. Üç parça yeterli:',
        ],
        sirali: [
          'Durum: ne vardı, problem neydi. Bir cümle.',
          'Yaptığın: sen ne yaptın. "Biz" değil "ben".',
          'Sonuç: ne değişti. Mümkünse sayı.',
        ],
      },
      {
        baslik: 'Hazırlanacak üç örnek',
        liste: [
          'Bir proje: baştan sona anlatabildiğin, senin payının net olduğu.',
          'Bir zorluk: takıldığın ve çözdüğün bir durum.',
          'Bir ekip çalışması: anlaşmazlık ya da iş bölümü içeren.',
        ],
        paragraflar: [
          'Bu üç örnek, sorulan soruların büyük kısmını karşılıyor. Örnekleri staj, ' +
            'kulüp ya da ders projesinden seçebilirsin.',
        ],
      },
      {
        baslik: 'Sık sorulan sorular',
        liste: [
          'Kendinden bahseder misin? (İki dakika, kronolojik değil hedefe göre.)',
          'Neden bu şirket ve bu pozisyon?',
          'Güçlü ve zayıf yönlerin.',
          'Bir hatan ve ondan öğrendiğin.',
          'Beş yıl sonra kendini nerede görüyorsun?',
          'Maaş beklentin ne? — [nasıl cevaplanır](/rehber/maas-beklentisi-nasil-soylenir).',
          'Bize sormak istediğin bir şey var mı?',
        ],
      },
      {
        baslik: 'Yeni mezunların en sık hataları',
        karsilastirma: {
          kotuBaslik: 'Kaçın',
          iyiBaslik: 'Bunun yerine',
          kotu: [
            'Deneyimim yok ama öğrenmeye açığım.',
            'Şirketiniz hakkında pek bilgim yok.',
            'Her işi yaparım, fark etmez.',
            'Sorum yok.',
          ],
          iyi: [
            'Bitirme projemde bu alandaki temel problemle uğraştım; şunu öğrendim.',
            'Geçen yıl yayımladığınız X raporunu okudum, şu kısmı ilgimi çekti.',
            'Öncelikle şu alanda çalışmak istiyorum çünkü...',
            'Bu pozisyonda ilk üç ayda başarı nasıl ölçülüyor?',
          ],
        },
        uyari:
          '"Deneyimim yok" diye başlamak, olan deneyimi de siliyor. Ders projesi, kulüp ve ' +
          'staj deneyimdir; öyle anlat.',
      },
      {
        baslik: 'Sonrasında',
        paragraflar: [
          'Aynı gün kısa bir teşekkür e-postası gönder ve konuşulan bir konuya değin. ' +
            'Bir hafta içinde dönüş gelmezse nazik bir hatırlatma uygun — ' +
            '[cevap gelmezse ne yapılır](/rehber/basvuruya-cevap-gelmezse).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Mülakata ne giymeliyim?',
        cevap:
          'Şirketin genel havasına yakın, sade ve düzgün bir kıyafet yeterli. Emin değilsen İK\'ya sormak olağan karşılanıyor.',
      },
      {
        soru: 'Bilmediğim bir soru gelirse ne yapmalıyım?',
        cevap:
          'Bilmediğini söylemek, uydurmaktan iyi. "Bunu bilmiyorum ama şöyle yaklaşırdım" demek çoğu zaman olumlu değerlendiriliyor.',
      },
      {
        soru: 'Kaç aşama olur?',
        cevap:
          'Şirkete göre değişiyor: İK görüşmesi, teknik görüşme ve yönetici görüşmesi yaygın. Süreç hakkında baştan bilgi istemek normal.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Maaş beklentisi nasıl söylenir',
      yol: '/rehber/maas-beklentisi-nasil-soylenir',
      aciklama: 'Mülakatın en zor sorusuna hazırlık.',
    },
  }),

  metinRehberi({
    slug: 'maas-beklentisi-nasil-soylenir',
    baslik: 'Maaş beklentisi nasıl söylenir?',
    ozet: 'Rakam vermemek de bir cevap değil; aralık vermek en iyisi.',
    konu: 'kariyer',
    etiketler: ['maaş', 'beklenti', 'mülakat', 'pazarlık'],
    aciklama:
      'Mülakatta maaş beklentisi nasıl söylenir? Araştırma, aralık verme ve ' +
      'pazarlık yapma.',
    hizliCevap:
      'En iyi cevap bir aralık: "Araştırdığım kadarıyla bu pozisyon için X–Y bandı konuşuluyor; ' +
      'benim beklentim bu bandın içinde." Rakam vermemek kararsız gösteriyor, tek bir rakam ' +
      'vermek ise pazarlık alanını kapatıyor. Aralığı vermeden önce piyasayı araştır — ' +
      'bilmeden söylenen rakam ya çok düşük ya da inandırıcılığı zayıf oluyor.',
    bloklar: [
      {
        baslik: 'Önce araştır',
        liste: [
          'Aynı pozisyondaki ilanlarda yazan bandlar.',
          'Maaş paylaşım platformlarındaki yeni mezun verileri.',
          'Aynı bölümden yeni mezun olmuş tanıdıkların.',
          'Sektör ve şehir farkı: aynı iş şehre göre değişiyor.',
          'Toplam paket: yan haklar, prim, yemek ve yol.',
        ],
        uyari:
          'Bu sayfada rakam yazmıyoruz: maaşlar sektöre, şehre ve yıla göre çok hızlı değişiyor. ' +
          'Güncel bandı başvuru dönemine yakın bir zamanda kendin araştırmalısın.',
      },
      {
        baslik: 'Nasıl söylenir',
        karsilastirma: {
          kotuBaslik: 'Zayıf cevap',
          iyiBaslik: 'İyi cevap',
          kotu: [
            'Siz ne verirseniz.',
            'Fark etmez, deneyim kazanmak istiyorum.',
            'Bilmiyorum, siz söyleyin.',
            '(Piyasanın çok üstünde tek bir rakam)',
          ],
          iyi: [
            'Araştırdığım kadarıyla bu pozisyon için X–Y bandı konuşuluyor; beklentim bu bandın içinde.',
            'Toplam paketi görmek isterim; temel maaş dışında yan haklar nasıl işliyor?',
            'Bu aşamada bandı öğrenebilir miyim? Kendi beklentimi ona göre netleştirebilirim.',
          ],
        },
      },
      {
        baslik: 'Zamanlama',
        paragraflar: [
          'Maaş konusunu ilk görüşmede sen açma; genellikle İK açıyor. Sorulduğunda ise ' +
            'kaçamak cevap verme. Teklif aşamasına gelindiğinde rakam netleşiyor ve ' +
            'pazarlık asıl orada yapılıyor.',
        ],
      },
      {
        baslik: 'Pazarlık',
        sirali: [
          'Teklifi yazılı olarak iste.',
          'Düşünmek için birkaç gün süre iste — olağan karşılanıyor.',
          'Yükseltme talebini gerekçeyle kur: piyasa bandı, sahip olduğun bir beceri, başka bir teklif.',
          'Tek bir kalem üzerinden değil toplam paket üzerinden konuş.',
          'Anlaşma sağlanınca yazılı teyit al.',
        ],
        uyari:
          'Olmayan bir teklifi varmış gibi göstermek riskli: doğrulanması kolay ve güveni bitiriyor.',
      },
    ],
    sss: [
      {
        soru: 'Yeni mezun pazarlık yapabilir mi?',
        cevap:
          'Yapabilir. Gerekçeli ve saygılı bir talep olumsuz karşılanmıyor; kabul edilmese bile teklif geri çekilmiyor.',
      },
      {
        soru: 'Beklentimi düşük söylersem alınma şansım artar mı?',
        cevap:
          'Genellikle artmıyor, sadece başlangıç maaşını düşürüyor. Bandın altında bir rakam bazen deneyimsizlik işareti olarak da okunuyor.',
      },
      {
        soru: 'Net mi brüt mü söylemeliyim?',
        cevap:
          'Hangisini konuştuğunuzu netleştir. Türkiye\'de genellikle net üzerinden konuşuluyor; teklifte ikisinin de yazılı olmasını iste.',
      },
    ],
    sonrakiAdim: {
      etiket: 'İş teklifini değerlendirirken',
      yol: '/rehber/is-teklifini-degerlendirme',
      aciklama: 'Rakam tek başına yeterli değil.',
    },
  }),

  metinRehberi({
    slug: 'referans-nasil-istenir',
    baslik: 'Referans nasıl istenir?',
    ozet: 'İzin almadan isim yazmak en sık yapılan hata.',
    konu: 'kariyer',
    etiketler: ['referans', 'tavsiye mektubu', 'staj', 'hoca'],
    aciklama:
      'Referans nasıl istenir? Kimden istenir, nasıl sorulur ve referans mektubu ' +
      'için ne hazırlanır.',
    hizliCevap:
      'Referans istemenin ilk kuralı izin almak: CV\'ne ya da başvuruya birinin adını izinsiz ' +
      'yazmak, arandığında hazırlıksız yakalanmasına yol açıyor. İstemek için doğru zaman ' +
      'birlikte çalıştığın dönemin hemen sonrası. İstediğinde işini kolaylaştır: ' +
      'başvurduğun pozisyonu, birlikte yaptığınız işi ve son tarihi tek mesajda ver.',
    bloklar: [
      {
        baslik: 'Kimden istenir',
        liste: [
          'Staj yerindeki doğrudan sorumlun — en güçlü referans.',
          'Bitirme projesi danışmanın ya da yakın çalıştığın bir hoca.',
          'Kulüpte birlikte iş yaptığın akademik danışman.',
          'Yarı zamanlı çalıştığın işyerindeki yöneticin.',
        ],
        paragraflar: [
          'Aile üyeleri ve yakın arkadaşlar referans olarak kabul edilmiyor.',
        ],
      },
      {
        baslik: 'Nasıl istenir',
        sirali: [
          'Yüz yüze ya da e-postayla sor: "Benim için referans olur musunuz?"',
          'Kabul ederse iletişim bilgisini nasıl paylaşacağını sor.',
          'Başvurduğun pozisyonu ve şirketi kısaca anlat.',
          'Birlikte yaptığınız işi hatırlat — üç madde yeterli.',
          'Son tarihi belirt ve teşekkür et.',
          'Sonucu bildir: olumlu ya da olumsuz, haber vermek ilişkiyi sürdürüyor.',
        ],
        uyari:
          'İzin almadan CV\'ye isim yazma. Şirket aradığında hazırlıksız yakalanan bir referans, ' +
          'referans olmamasından kötü.',
      },
      {
        baslik: 'İşini kolaylaştır',
        paragraflar: [
          'Referans olacak kişi genellikle meşgul. Ona hazır malzeme vermek hem yükü azaltıyor ' +
            'hem de yazılacak metnin senin öne çıkarmak istediğin şeyleri içermesini sağlıyor.',
        ],
        kontrol: {
          baslik: 'Tek mesajda gönder',
          maddeler: [
            'Başvurduğun pozisyon ve şirket',
            'Son tarih',
            'Güncel CV\'n',
            'Birlikte yaptığınız işin üç maddelik özeti',
            'Vurgulanmasını istediğin beceri',
            'Gönderim biçimi: e-posta mı, form mu',
          ],
        },
      },
      {
        baslik: 'Tavsiye mektubu',
        paragraflar: [
          'Yurt dışı başvurularında ve bazı burslarda yazılı tavsiye mektubu isteniyor. ' +
            'Bu daha uzun süre gerektiriyor: en az iki-üç hafta önceden haber ver. ' +
            'Bazı hocalar taslak yazmanı isteyebiliyor; bu olağan bir uygulama.',
        ],
      },
    ],
    sss: [
      {
        soru: 'CV\'ye referans bilgisi yazmalı mıyım?',
        cevap:
          '"Referanslar istendiğinde sunulur" yazmak yaygın ve yeterli. İsim ve numara yazacaksan mutlaka önce izin al.',
      },
      {
        soru: 'Stajım kötü geçtiyse referans isteyebilir miyim?',
        cevap:
          'Doğrudan sorumlun uygun değilse birlikte çalıştığın başka biri olabilir. Referans olacak kişinin seni olumlu anlatacağından emin olmalısın.',
      },
      {
        soru: 'Kaç referans gerekiyor?',
        cevap:
          'Genellikle iki kişi yeterli. Biri iş/staj, biri akademik olması iyi bir denge.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Stajdan işe geçiş',
      yol: '/rehber/stajdan-ise-gecis',
      aciklama: 'Referansı staj biterken istemek en doğru zaman.',
    },
  }),

  metinRehberi({
    slug: 'is-teklifini-degerlendirme',
    baslik: 'İş teklifini değerlendirirken nelere bakılır?',
    ozet: 'Maaş bir kalem; toplam paket ve büyüme yolu daha belirleyici.',
    konu: 'kariyer',
    etiketler: ['iş teklifi', 'sözleşme', 'yan haklar', 'karar'],
    aciklama:
      'İlk iş teklifi nasıl değerlendirilir? Maaş dışındaki kalemler, sözleşme maddeleri ' +
      've karar verirken sorulacak sorular.',
    hizliCevap:
      'Teklifi yalnızca maaşla karşılaştırmak yanıltıyor: yan haklar, çalışma düzeni, ' +
      'öğrenme imkânı ve ilk iki yılda ne öğreneceğin uzun vadede daha belirleyici. ' +
      'Teklifi yazılı iste, düşünmek için birkaç gün süre al ve sözleşmede süre, deneme süresi, ' +
      'fesih ve rekabet yasağı maddelerini mutlaka oku.',
    bloklar: [
      {
        baslik: 'Toplam paket',
        liste: [
          'Temel maaş (net ve brüt).',
          'Prim ve bonus: hangi koşulda, ne sıklıkta.',
          'Yan haklar: özel sağlık sigortası, yemek, yol, telefon.',
          'Çalışma düzeni: ofis, hibrit, uzaktan; mesai beklentisi.',
          'İzin: yıllık izin gün sayısı ve kullanım esnekliği.',
          'Eğitim bütçesi ve konferans desteği.',
        ],
      },
      {
        baslik: 'Maaş dışındaki üç soru',
        sirali: [
          'İlk iki yılda ne öğreneceğim? Kimden öğreneceğim?',
          'Bu pozisyonda başarı nasıl ölçülüyor?',
          'Buradan sonraki adım ne? Terfi ve rol değişimi nasıl işliyor?',
        ],
        paragraflar: [
          'İlk işte öğrenme hızı, maaş farkından daha büyük bir bileşik etki yaratıyor. ' +
            'Yanında öğrenebileceğin bir ekip, biraz düşük maaşa değebiliyor.',
        ],
      },
      {
        baslik: 'Sözleşmede bakılacaklar',
        liste: [
          'Süre: belirli mi belirsiz mi.',
          'Deneme süresi ve bu süredeki fesih koşulları.',
          'Görev tanımı: yazılı mı, ne kadar geniş.',
          'Çalışma saatleri ve fazla mesai.',
          'Rekabet yasağı ve gizlilik maddeleri.',
          'İhbar süresi: ayrılmak istediğinde ne kadar önceden bildirmen gerekiyor.',
        ],
        uyari:
          'İmzalamadan önce sözleşmenin tamamını oku ve anlamadığın maddeyi sor. ' +
          'İmzalı bir kopyasını mutlaka al.',
      },
      {
        baslik: 'Karar verirken',
        paragraflar: [
          'İki teklif arasında kalırsan, altı ay sonrasını düşün: hangisinde daha çok şey ' +
            'öğrenmiş olursun ve CV\'nde hangisi daha güçlü bir satır olur. İlk işin, ' +
            'sonraki işlerin kapısını açan şey.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Teklifi düşünmek için süre istemek olur mu?',
        cevap:
          'Olağan karşılanıyor. Birkaç iş günü istemek profesyonel bir davranış; süre isterken ilgini de belirtmek iyi oluyor.',
      },
      {
        soru: 'İki teklif varsa diğerini söylemeli miyim?',
        cevap:
          'Söylemek pazarlık gücü verebiliyor ama abartma. Olmayan bir teklifi varmış gibi göstermek riskli.',
      },
      {
        soru: 'Sözlü teklif yeterli mi?',
        cevap:
          'Yeterli değil. Koşulların yazılı olması hem seni hem işvereni koruyor; yazılı teklif istemek olağan.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Maaş beklentisi nasıl söylenir',
      yol: '/rehber/maas-beklentisi-nasil-soylenir',
      aciklama: 'Pazarlık aşamasına hazırlık.',
    },
  }),

  metinRehberi({
    slug: 'yeni-mezun-programlari',
    baslik: 'Yeni mezun programları (MT) nasıl işler?',
    ozet: 'Başvurular mezuniyetten önce açılıyor.',
    konu: 'kariyer',
    etiketler: ['management trainee', 'mt', 'yeni mezun', 'başvuru'],
    aciklama:
      'Yeni mezun / MT programları nedir? Başvuru dönemi, seçim aşamaları ve ' +
      'hazırlık.',
    hizliCevap:
      'Yeni mezun programları (MT, graduate program), büyük şirketlerin yeni mezunları ' +
      'işe alıp rotasyonla yetiştirdiği yapılandırılmış programlar. Başvurular genellikle ' +
      'mezuniyetten önce, güz ve bahar dönemlerinde açılıyor. Seçim süreci uzun: ' +
      'başvuru, online testler, video mülakat ve değerlendirme merkezi aşamalarından oluşuyor.',
    bloklar: [
      {
        baslik: 'Neden değerli',
        liste: [
          'Yapılandırılmış eğitim ve rotasyon: birden fazla birimi görüyorsun.',
          'Mentor ve düzenli geri bildirim.',
          'Aynı dönem başlayan bir grup: uzun süreli bir ağ.',
          'Net bir kariyer yolu ve terfi takvimi.',
        ],
      },
      {
        baslik: 'Seçim aşamaları',
        sirali: [
          'Online başvuru ve CV.',
          'Yetenek testleri: sayısal, sözel, mantık.',
          'Kişilik envanteri.',
          'Kayıtlı (asenkron) video mülakat — [hazırlık](/rehber/online-mulakat).',
          'Değerlendirme merkezi: vaka çalışması, grup çalışması, sunum.',
          'Yönetici görüşmesi ve teklif.',
        ],
        uyari:
          'Süreç aylar sürebiliyor. Aynı anda birden fazla programa başvurmak ve süreçleri ' +
          'takip etmek için basit bir tablo tutmak gerekiyor.',
      },
      {
        baslik: 'Hazırlık',
        liste: [
          'Testler için deneme çöz: hız kazanmak puanı belirgin şekilde artırıyor.',
          'Vaka çalışması için yapı öğren: problem, seçenekler, öneri, gerekçe.',
          'Grup çalışmasında baskın olmak değil, ilerletmek değerlendiriliyor.',
          'Şirketin sektörünü ve güncel gündemini bil.',
          'CV\'ni pozisyona göre uyarla — [yeni mezun CV\'si](/rehber/yeni-mezun-cvsi).',
        ],
      },
      {
        baslik: 'Ne zaman başvurulur',
        paragraflar: [
          'Programların çoğu son sınıf öğrencilerine ve yeni mezunlara açık. Başvuru ' +
            'dönemleri genellikle güz ve bahar başlarında oluyor ve mezuniyetten önce ' +
            'kapanıyor. Son sınıfın başında takvimi çıkarmak, bir yıl kaybetmemeyi sağlıyor.',
          'Şirketlerin staj programları da çoğu zaman MT sürecinin ön kapısı: ' +
            'staj yapan öğrenciler doğrudan değerlendirmeye alınabiliyor. ' +
            '[Büyük işverenlerin staj programlarına](/staj-programlari) bak.',
        ],
      },
    ],
    sss: [
      {
        soru: 'MT programına kimler başvurabilir?',
        cevap:
          'Genellikle son sınıf öğrencileri ve son bir-iki yıl içinde mezun olanlar. Koşullar ilan metninde yazıyor.',
      },
      {
        soru: 'Not ortalaması şartı var mı?',
        cevap:
          'Bazı programlarda var, bazılarında yok. Şart varsa ilanda belirtiliyor.',
      },
      {
        soru: 'Testlere nasıl hazırlanılır?',
        cevap:
          'Yetenek testleri için deneme çözmek en etkili yöntem. Süre baskısına alışmak, soru tipini bilmekten daha çok fark yaratıyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Büyük işverenlerin staj programlarını gör',
      yol: '/staj-programlari',
      aciklama: 'Staj programları çoğu zaman MT sürecinin ön kapısı.',
    },
  }),
];
