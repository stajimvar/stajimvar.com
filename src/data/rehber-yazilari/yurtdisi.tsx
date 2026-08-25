import { metinRehberi } from '../rehber-govde';
import type { Rehber } from '../rehberler';

/**
 * Yurtdışı rehberleri.
 *
 * Hibe tutarları, kur ve vize koşulları sürekli değişiyor; bu sayfalarda
 * rakam yazmıyoruz. Ayrıca vize ve göç kuralları ülkeye göre değiştiği
 * için tek bir doğru anlatılmıyor: süreç anlatılıp resmî kaynağa
 * yönlendiriliyor.
 */
export const YURTDISI_REHBERLERI: Rehber[] = [
  metinRehberi({
    slug: 'erasmus-ogrenim-hareketliligi',
    baslik: 'Erasmus+ öğrenim hareketliliği nasıl işler?',
    ozet: 'Bir ya da iki dönem yurt dışında ders almak.',
    konu: 'yurtdisi',
    etiketler: ['erasmus', 'öğrenim hareketliliği', 'değişim', 'hibe'],
    oneCikan: true,
    aciklama:
      'Erasmus+ öğrenim hareketliliği nedir, nasıl başvurulur? Başvuru şartları, ' +
      'dil sınavı, ders denkliği ve hibe süreci.',
    hizliCevap:
      'Erasmus+ öğrenim hareketliliği, bir ya da iki dönemini anlaşmalı bir yurt dışı üniversitesinde ' +
      'okumanı sağlayan program. Başvuru okulunun uluslararası ilişkiler ofisinden yapılıyor; ' +
      'seçim genellikle not ortalaması ve dil sınavı puanının birlikte hesaplandığı bir sıralamayla ' +
      'oluyor. Aldığın dersler öğrenim anlaşmasıyla önceden onaylanıyor ve döndüğünde sayılıyor.',
    bloklar: [
      {
        paragraflar: [
          'Erasmus, öğrencilerin en çok duyduğu ama başvuru sürecini en az bildiği program. ' +
            'Süreç okulun ilanıyla başlıyor ve tamamı okulun uluslararası ofisi üzerinden yürüyor — ' +
            'doğrudan yurt dışı üniversitesine başvurulmuyor.',
        ],
      },
      {
        baslik: 'Süreç',
        sirali: [
          'Okulunun uluslararası ilişkiler ofisinin başvuru ilanını takip et.',
          'Not ortalaması ve sınıf şartını kontrol et.',
          'Dil sınavına gir (okulun kendi sınavı ya da kabul ettiği sınavlar).',
          'Tercih listeni yap: anlaşmalı üniversiteler listesinden.',
          'Sonuç açıklandığında yerleştiğin okulun kabul sürecine gir.',
          'Öğrenim anlaşmasını (Learning Agreement) hazırla ve bölüm koordinatörüne onaylat.',
          'Vize, sigorta ve barınma işlemlerini tamamla.',
          'Dönüşte ders denkliği ve belge teslimi.',
        ],
        uyari:
          'Öğrenim anlaşması en kritik belge: gideceğin okulda alacağın derslerin kendi bölümünde ' +
          'hangi derslerin yerine sayılacağını gösteriyor. Onaysız ders almak, döndüğünde ' +
          'dersin sayılmaması demek.',
      },
      {
        baslik: 'Seçim nasıl yapılıyor',
        paragraflar: [
          'Çoğu okulda sıralama, not ortalaması ve dil sınavı puanının belirli ağırlıklarla ' +
            'toplanmasıyla yapılıyor. Daha önce Erasmus\'tan yararlanmış olmak puan düşürebiliyor. ' +
            'Ağırlıklar ve ek ölçütler okuldan okula değiştiği için ilan metnini okumak gerekiyor.',
        ],
      },
      {
        baslik: 'Hibe',
        paragraflar: [
          'Öğrenim hareketliliğinde aylık hibe ödeniyor ve tutar gidilen ülkenin yaşam maliyeti ' +
            'grubuna göre değişiyor. Hibe genellikle giderlerin tamamını karşılamıyor; ' +
            'fark öğrenci tarafından tamamlanıyor. Hibesiz katılım da mümkün — ' +
            '[hibesiz Erasmus ne demek](/rehber/hibesiz-erasmus).',
        ],
        uyari:
          'Hibe tutarları ve ülke grupları her dönem güncelleniyor. Bu sayfada rakam yazmıyoruz; ' +
          'güncel tutar için Ulusal Ajans duyurularına ve okulunun ilanına bak.',
      },
      {
        baslik: 'Bütçe planı',
        liste: [
          'Barınma: gideceğin şehirde yurt mu, özel oda mı.',
          'Uçuş ve şehir içi ulaşım.',
          'Sağlık sigortası (çoğu ülkede zorunlu).',
          'Vize ve oturum izni masrafları.',
          'Aylık yaşam gideri — hibeyle farkı hesapla.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Erasmus başvurusu ne zaman yapılır?',
        cevap:
          'Başvuru dönemleri okulların uluslararası ofisleri tarafından ilan ediliyor; çoğunlukla bir önceki akademik yılda açılıyor. Kesin tarih için okulunun duyurusunu takip et.',
      },
      {
        soru: 'Dil sınavı zorunlu mu?',
        cevap:
          'Çoğu okulda zorunlu. Okulun kendi sınavı ya da kabul ettiği ulusal/uluslararası sınav sonuçları kullanılıyor.',
      },
      {
        soru: 'Erasmus\'ta aldığım dersler sayılır mı?',
        cevap:
          'Öğrenim anlaşmasıyla önceden onaylanan dersler sayılıyor. Anlaşmada olmayan bir ders alırsan sayılmama riski var.',
      },
      {
        soru: 'Mezuniyetim uzar mı?',
        cevap:
          'Ders denkliği düzgün planlanırsa uzamıyor. Anlaşmayı bölüm koordinatörüyle birlikte hazırlamak bu riski büyük ölçüde kaldırıyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Erasmus+ Programı — Ulusal Ajans program sayfası', adres: 'https://www.ua.gov.tr/programlar_/erasmus-programi/', kurum: 'Türkiye Ulusal Ajansı', tur: 'belge', destekledigi: 'Erasmus+ hibe tutarları, ülke grupları ve başvuru koşulları.' },
      { etiket: 'Erasmus+ resmî sayfası', adres: 'https://erasmus-plus.ec.europa.eu', kurum: 'Avrupa Komisyonu', tur: 'kurum', destekledigi: 'Programın Avrupa Komisyonu tarafından tanımlanan kuralları.' },
    ],
    sonrakiAdim: {
      etiket: 'Yurtdışı fırsatlarını gör',
      yol: '/yurtdisi-firsatlari',
      aciklama: 'Açık değişim ve staj programları tek listede.',
    },
  }),

  metinRehberi({
    slug: 'erasmus-staj-hareketliligi',
    baslik: 'Erasmus+ staj hareketliliği',
    ozet: 'Yurt dışında staj; yeri çoğu zaman öğrenci kendisi buluyor.',
    konu: 'yurtdisi',
    etiketler: ['erasmus staj', 'yurtdışı staj', 'hibe', 'kabul mektubu'],
    oneCikan: true,
    aciklama:
      'Erasmus+ staj hareketliliği nasıl işler? Staj yeri bulma, kabul mektubu, ' +
      'hibe ve zorunlu stajla ilişkisi.',
    hizliCevap:
      'Erasmus+ staj hareketliliği, yurt dışındaki bir işletmede staj yapmanı ve bunun için hibe ' +
      'almanı sağlıyor. Öğrenim hareketliliğinden en önemli farkı: staj yerini genellikle öğrenci ' +
      'kendisi buluyor ve kabul mektubunu (Letter of Acceptance) alıp okula getiriyor. ' +
      'Mezuniyetten sonraki belirli bir süre içinde de yararlanılabiliyor.',
    bloklar: [
      {
        baslik: 'Öğrenim hareketliliğinden farkı',
        tablo: {
          sutunlar: ['', 'Öğrenim', 'Staj'],
          satirlar: [
            ['Nereye gidilir', 'Anlaşmalı üniversite', 'Herhangi bir uygun işletme/kurum'],
            ['Yeri kim bulur', 'Okul (anlaşma listesi)', 'Genellikle öğrenci'],
            ['Süre', 'Dönem bazlı', 'Genellikle daha kısa, aylık'],
            ['Mezuniyet sonrası', 'Hayır', 'Belirli süre içinde mümkün'],
          ],
        },
        uyari:
          'Koşullar ve süre sınırları her dönem güncellenebiliyor. Kendi okulunun ilanı ve ' +
          'Ulusal Ajans duyuruları esas.',
      },
      {
        baslik: 'Staj yeri bulmak',
        paragraflar: [
          'Bu sürecin en zor ve en uzun adımı. Kabul mektubu olmadan başvuru tamamlanmıyor, ' +
            'o yüzden başvuru döneminden aylar önce aramaya başlamak gerekiyor.',
        ],
        sirali: [
          'Hedef ülke ve sektörü belirle.',
          'Şirketlerin kariyer sayfalarını ve Erasmus staj platformlarını tara.',
          'Bölüm hocalarının yurt dışı bağlantılarını sor — en çok işe yarayan kanal bu.',
          'İngilizce başvuru e-postası yaz ([nasıl yazılır](/rehber/ingilizce-basvuru-epostasi)).',
          'Kabul mektubunu al ve okulun formatına uygun olduğunu kontrol ettir.',
        ],
      },
      {
        baslik: 'Zorunlu stajla ilişkisi',
        paragraflar: [
          'Erasmus stajının okulundaki zorunlu staj yerine sayılıp sayılmayacağına bölümün staj ' +
            'komisyonu karar veriyor. Bazı bölümler sayıyor, bazıları ayrı tutuyor. Gitmeden önce ' +
            'yazılı onay al — dönüşte sorulduğunda elinde bir belge olsun.',
        ],
      },
      {
        baslik: 'Belgeler',
        kontrol: {
          baslik: 'Genellikle istenenler',
          maddeler: [
            'Kabul mektubu (Letter of Acceptance)',
            'Öğrenim/staj anlaşması (Learning Agreement for Traineeships)',
            'Transkript ve öğrenci belgesi',
            'Dil yeterlilik belgesi',
            'Pasaport ve vize belgeleri',
            'Sağlık sigortası poliçesi',
          ],
        },
      },
    ],
    sss: [
      {
        soru: 'Erasmus stajı için okul mu yer buluyor?',
        cevap:
          'Genellikle öğrenci buluyor. Bazı okullarda ve bölümlerde bağlantılar üzerinden destek olunuyor ama garanti değil.',
      },
      {
        soru: 'Mezun olduktan sonra Erasmus stajı yapılabilir mi?',
        cevap:
          'Mezuniyet sonrası belirli bir süre içinde yapılabiliyor, ancak başvurunun mezun olmadan önce yapılmış olması gerekiyor. Koşullar dönemsel olarak güncelleniyor.',
      },
      {
        soru: 'Hibe yeterli oluyor mu?',
        cevap:
          'Ülkeye göre değişiyor; çoğu durumda giderlerin bir kısmını karşılıyor. Bütçeyi hibeye ek kaynak varsayarak planlamak gerekiyor.',
      },
    ],
    kaynaklar: [{ etiket: 'Türkiye Ulusal Ajansı', adres: 'https://www.ua.gov.tr' }],
    sonrakiAdim: {
      etiket: 'Yurt dışında staj: Erasmus+ ve IAESTE',
      yol: '/rehber/yurtdisinda-staj',
      aciklama: 'İki kanalın karşılaştırması.',
    },
  }),

  metinRehberi({
    slug: 'hibesiz-erasmus',
    baslik: 'Hibesiz Erasmus ne demek?',
    ozet: 'Hakkı kazanıyorsun, parasını kendin karşılıyorsun.',
    konu: 'yurtdisi',
    etiketler: ['hibesiz erasmus', 'zero grant', 'kontenjan', 'değişim'],
    aciklama:
      'Hibesiz Erasmus nedir? Hibeli Erasmus\'tan farkı, kimler için mantıklı ve ' +
      'başvuru süreci.',
    hizliCevap:
      'Hibesiz Erasmus, programa kabul edilip yurt dışında ders almanı ya da staj yapmanı ' +
      'sağlayan ama aylık hibe ödenmeyen katılım biçimidir. Öğrencilik statün, ders denkliğin ve ' +
      'programın bütün resmî hakları aynı kalıyor; değişen tek şey maddi destek. ' +
      'Hibe kontenjanı dolduğunda sıradaki öğrencilere genellikle bu seçenek sunuluyor.',
    bloklar: [
      {
        paragraflar: [
          'Erasmus ilanlarında sık görülen "hibesiz kontenjan" ifadesi öğrencilerde soru işareti ' +
            'yaratıyor. Kısacası: gitme hakkı var, para yok.',
        ],
      },
      {
        baslik: 'Ne değişiyor, ne değişmiyor',
        tablo: {
          sutunlar: ['Değişmiyor', 'Değişiyor'],
          satirlar: [
            ['Öğrenci statüsü ve resmî kabul', 'Aylık hibe ödenmiyor'],
            ['Ders denkliği ve öğrenim anlaşması', 'Bütçenin tamamı sana ait'],
            ['Karşı üniversitede öğrenim ücreti ödememe', 'Bazı ek destek başvurularına erişim'],
            ['Erasmus belgeleri ve sertifika', ''],
          ],
        },
      },
      {
        baslik: 'Kimin için mantıklı',
        liste: [
          'Gideceği şehirde kalacak yeri olan öğrenciler.',
          'Kendi kaynağı ya da ailesinden desteği olanlar.',
          'Yurt dışı deneyimini mezuniyetten önce mutlaka istemiş olanlar.',
          'Hibe sıralamasında kıl payı kalanlar — bir dönem beklemek istemeyenler.',
        ],
        uyari:
          'Karar vermeden önce gerçek bir bütçe çıkar: barınma, ulaşım, sigorta, vize ve aylık ' +
          'yaşam gideri. Hibesiz gitmenin en sık yaşanan sorunu, üçüncü ayda paranın bitmesi.',
      },
      {
        baslik: 'Ek destekler',
        paragraflar: [
          'Hibesiz katılımda bile bazı ek destek kalemleri (özel gereksinim desteği, ' +
            'dezavantajlı öğrenci desteği gibi) dönemsel olarak açılabiliyor. Okulunun ' +
            'uluslararası ofisine sormak gerekiyor. Ayrıca üniversitelerin kendi burs ve ' +
            'destek programları da olabiliyor — [açık bursları](/burslar) tara.',
        ],
      },
      {
        baslik: 'Hibe listesine sonradan girmek',
        paragraflar: [
          'Hibe kontenjanı, asıl listeden vazgeçenler oldukça hareket edebiliyor. Hibesiz kabul ' +
            'edildiysen ofisi düzenli takip et; bazı dönemlerde hibeli listeye geçiş mümkün oluyor.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Hibesiz Erasmus\'a katılmak resmî olarak Erasmus sayılır mı?',
        cevap:
          'Evet. Program kapsamında kabul edilmiş sayılıyorsun; belgeler ve ders denkliği aynı şekilde işliyor.',
      },
      {
        soru: 'Karşı üniversiteye öğrenim ücreti öder miyim?',
        cevap:
          'Erasmus kapsamında karşı üniversiteye öğrenim ücreti ödenmiyor. Kendi okuluna ödediğin harç ve katkı payı devam ediyor.',
      },
      {
        soru: 'Sonradan hibe alabilir miyim?',
        cevap:
          'Kontenjan boşalırsa mümkün olabiliyor. Uluslararası ofisin duyurularını takip etmek gerekiyor.',
      },
    ],
    kaynaklar: [{ etiket: 'Türkiye Ulusal Ajansı', adres: 'https://www.ua.gov.tr' }],
    sonrakiAdim: {
      etiket: 'Yurtdışı fırsatlarını gör',
      yol: '/yurtdisi-firsatlari',
      aciklama: 'Hibeli programlar ve burslar tek listede.',
    },
  }),

  metinRehberi({
    slug: 'iaeste-ile-yurtdisinda-staj',
    baslik: 'IAESTE ile yurt dışında staj',
    ozet: 'Teknik bölümler için değişim temelli staj programı.',
    konu: 'yurtdisi',
    etiketler: ['iaeste', 'yurtdışı staj', 'mühendislik', 'değişim'],
    aciklama:
      'IAESTE nedir, nasıl başvurulur? Teknik bölüm öğrencileri için yurt dışı staj ' +
      'programının işleyişi.',
    hizliCevap:
      'IAESTE, ağırlıklı olarak mühendislik, fen ve teknik bölüm öğrencilerine yurt dışında ' +
      'ücretli staj imkânı sağlayan uluslararası bir değişim programı. Sistem karşılıklılık ' +
      'esasına dayanıyor: Türkiye\'den giden öğrenci sayısı kadar yurt dışından öğrenci kabul ' +
      'ediliyor. Başvurular üniversitelerdeki yerel komiteler ve ulusal ofis üzerinden yürüyor.',
    bloklar: [
      {
        baslik: 'Nasıl işliyor',
        sirali: [
          'Üniversitendeki IAESTE yerel komitesini ya da ulusal ofisi bul.',
          'Başvuru döneminde başvur; genellikle transkript, CV ve dil belgesi isteniyor.',
          'Açılan staj yerleri listesinden tercih yap.',
          'Eşleştirme yapıldığında kabul belgeni al.',
          'Vize, sigorta ve barınma işlemlerini tamamla.',
        ],
      },
      {
        baslik: 'Erasmus stajından farkı',
        tablo: {
          sutunlar: ['', 'IAESTE', 'Erasmus+ staj'],
          satirlar: [
            ['Staj yeri', 'Programın sunduğu listeden', 'Genellikle öğrenci buluyor'],
            ['Kapsam', 'Ağırlıklı teknik bölümler', 'Bütün bölümler'],
            ['Ödeme', 'İşveren ücret ödüyor', 'Hibe ödeniyor'],
            ['Ülke', 'Üye ülkeler', 'Program ülkeleri'],
          ],
        },
        uyari:
          'Kontenjanlar, katılımcı ülkeler ve koşullar yıldan yıla değişiyor. Güncel bilgi için ' +
          'ulusal ofisin duyurularına bak.',
      },
      {
        baslik: 'Kimler başvurabilir',
        liste: [
          'Ağırlıklı olarak mühendislik, fen bilimleri, teknoloji ve tarım alanları.',
          'Genellikle belirli bir sınıfı tamamlamış öğrenciler.',
          'Yeterli düzeyde İngilizce ya da gidilecek ülkenin dili.',
          'Bazı yerlerde belirli bir not ortalaması şartı.',
        ],
      },
      {
        baslik: 'Zorunlu staj sayılır mı',
        paragraflar: [
          'Bölümünün staj komisyonu karar veriyor. Teknik bölümlerde IAESTE stajının zorunlu staj ' +
            'yerine sayılması yaygın ama garanti değil — gitmeden önce yazılı onay al.',
        ],
      },
    ],
    sss: [
      {
        soru: 'IAESTE stajı ücretli mi?',
        cevap:
          'Genellikle işveren tarafından yaşam giderlerini karşılamaya yönelik bir ödeme yapılıyor. Tutar ülkeye ve işverene göre değişiyor.',
      },
      {
        soru: 'Başvuru nereden yapılır?',
        cevap:
          'Üniversitendeki yerel komite ya da ulusal ofis üzerinden. Okulunda komite yoksa ulusal ofise doğrudan başvurulabiliyor.',
      },
      {
        soru: 'Vize işlemlerini kim yapıyor?',
        cevap:
          'Vize başvurusu öğrencinin sorumluluğunda; program kabul belgesi ve davet yazısı sağlıyor. Ayrıntı: [yurtdışı staj vizesi](/rehber/yurtdisi-staj-vizesi).',
      },
    ],
    kaynaklar: [
      { etiket: 'IAESTE', adres: 'https://iaeste.org', kurum: 'IAESTE', tur: 'kurum', destekledigi: 'Programın katılımcı ülkeleri ve başvuru işleyişi.' },
    ],
    sonrakiAdim: {
      etiket: 'Yurt dışında staj: Erasmus+ ve IAESTE',
      yol: '/rehber/yurtdisinda-staj',
      aciklama: 'İki kanalın genel karşılaştırması.',
    },
  }),

  metinRehberi({
    slug: 'yurtdisi-staj-vizesi',
    baslik: 'Yurt dışı staj vizesi nasıl alınır?',
    ozet: 'Ülkeye göre değişiyor; erken başlamak tek ortak kural.',
    konu: 'yurtdisi',
    etiketler: ['vize', 'schengen', 'oturum izni', 'randevu'],
    aciklama:
      'Yurt dışında staj için hangi vize gerekiyor? Başvuru süreci, belgeler ve ' +
      'sık yapılan hatalar.',
    hizliCevap:
      'Staj için gereken vize türü ülkeye, stajın süresine ve ücretli olup olmadığına göre ' +
      'değişiyor: kısa süreli stajlarda kısa dönem vizesi, uzun stajlarda oturum izni ' +
      'gerekebiliyor. Tek geçerli kaynak gideceğin ülkenin konsolosluğu ve resmî vize ' +
      'sayfası. Randevu ve işlem süreleri uzun olabildiği için kabul mektubunu alır almaz başlamak gerekiyor.',
    bloklar: [
      {
        paragraflar: [
          'Vize, yurt dışı stajının en çok zaman alan ve en çok değişen tarafı. Bu sayfa süreci ' +
            'anlatıyor; kurallar ülkeye göre farklı olduğu için hiçbir cümlesi konsolosluğun ' +
            'söylediğinin yerine geçmez.',
        ],
      },
      {
        baslik: 'Süreç',
        sirali: [
          'Gideceğin ülkenin resmî vize sayfasını bul ve staj için hangi türün gerektiğini oku.',
          'Randevu takvimini kontrol et — bazı dönemlerde randevu haftalar sonrasına düşüyor.',
          'Belge listesini çıkar ve eksiklerini tamamla.',
          'Randevuya git, biyometrik işlemleri tamamla.',
          'Sonucu bekle; pasaportunu teslim aldığında vizedeki tarihleri kontrol et.',
          'Uzun süreli kalacaksan varışta oturum izni işlemlerini araştır.',
        ],
        uyari:
          'Uçuş ve konaklama rezervasyonlarını vize çıkmadan kesinleştirme; iade edilemez bilet ' +
          'alıp vize gecikince zarar eden çok öğrenci var.',
      },
      {
        baslik: 'Genellikle istenen belgeler',
        liste: [
          'Geçerli pasaport (dönüş tarihinden sonra da geçerli olacak şekilde).',
          'Staj kabul mektubu ve işverenin bilgileri.',
          'Öğrenci belgesi ve transkript.',
          'Seyahat/sağlık sigortası poliçesi.',
          'Konaklama belgesi ya da rezervasyon.',
          'Maddi yeterlilik belgesi (hibe yazısı, banka hesap dökümü).',
          'Gidiş-dönüş uçuş bilgisi.',
          'Biyometrik fotoğraf.',
        ],
      },
      {
        baslik: 'Sık yapılan hatalar',
        liste: [
          'Randevuyu geç almak: en sık yaşanan ve en çok pişmanlık yaratan hata.',
          'Belgelerin çevirisini ve gerekiyorsa onayını atlamak.',
          'Sigorta kapsamının konsolosluğun istediği tutarı karşılamaması.',
          'Kabul mektubundaki tarihlerle vize başvurusundaki tarihlerin uyuşmaması.',
          'Pasaport geçerlilik süresinin yetmemesi.',
        ],
      },
      {
        baslik: 'Okulun rolü',
        paragraflar: [
          'Uluslararası ofis çoğu zaman öğrenci statünü gösteren yazıyı ve program katılım ' +
            'belgesini hazırlıyor. Bu belgeleri erken istemek işini hızlandırıyor. ' +
            'Vize başvurusunun kendisi ise senin sorumluluğunda.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Staj için turist vizesiyle gidilebilir mi?',
        cevap:
          'Çoğu ülkede staj, çalışma niteliğinde sayıldığı için turist vizesi uygun olmuyor. Doğru vize türünü konsolosluğun resmî sayfasından öğrenmek gerekiyor.',
      },
      {
        soru: 'Vize ne kadar sürede çıkar?',
        cevap:
          'Ülkeye, döneme ve başvuru yoğunluğuna göre değişiyor. Randevu süresiyle birlikte haftaları bulabildiği için kabul mektubunu alır almaz başlamak gerekiyor.',
      },
      {
        soru: 'Vize reddedilirse ne olur?',
        cevap:
          'Ret gerekçesi bildiriliyor ve genellikle itiraz ya da yeniden başvuru hakkı oluyor. Programa ve işverene durumu hemen bildirmek gerekiyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Dışişleri Bakanlığı', adres: 'https://www.mfa.gov.tr', kurum: 'Dışişleri Bakanlığı', tur: 'kurum', destekledigi: 'Ülkelere göre vize rejimi ve konsolosluk bilgileri.' },
    ],
    sonrakiAdim: {
      etiket: 'Yurtdışı fırsatlarını gör',
      yol: '/yurtdisi-firsatlari',
      aciklama: 'Programı seçtiysen sıradaki adım başvuru.',
    },
  }),

  metinRehberi({
    slug: 'europass-cv',
    baslik: 'Europass CV nedir, ne zaman kullanılır?',
    ozet: 'Avrupa\'da standart biçim; her başvuruda gerekmiyor.',
    konu: 'yurtdisi',
    etiketler: ['europass', 'cv', 'avrupa', 'başvuru'],
    aciklama:
      'Europass CV nedir? Nasıl hazırlanır, hangi başvurularda isteniyor ve ' +
      'normal CV\'den farkı ne.',
    hizliCevap:
      'Europass, Avrupa\'da ortak kullanılan standart bir CV biçimi. Erasmus başvuruları ve ' +
      'bazı Avrupa kurumlarının ilanlarında isteniyor. Standart olması karşılaştırmayı kolaylaştırıyor ' +
      'ama biçimi sabit olduğu için özel şirket başvurularında öne çıkmıyor: Europass\'ı istendiğinde ' +
      'kullan, genel başvurularda kendi düzenli CV\'ni gönder.',
    bloklar: [
      {
        baslik: 'Ne zaman kullanılır',
        liste: [
          'Erasmus ve değişim programı başvurularında.',
          'Avrupa kurumlarının ve bazı kamu programlarının ilanlarında.',
          'İlanda açıkça "Europass formatında CV" istendiğinde.',
        ],
        paragraflar: [
          'Bunların dışında özel şirket başvurularında Europass tercih edilmiyor; ' +
            'daha sade ve okunur bir düzen daha iyi sonuç veriyor. ' +
            'Ayrıntı: [ATS uyumlu CV](/rehber/ats-uyumlu-cv).',
        ],
      },
      {
        baslik: 'Nasıl hazırlanır',
        sirali: [
          'Europass\'ın resmî sitesinde hesap aç.',
          'Kişisel bilgiler, eğitim ve deneyim bölümlerini doldur.',
          'Dil becerileri bölümünü Avrupa dil seviyeleriyle (A1–C2) belirt.',
          'Dijital ve mesleki becerileri örnekle yaz.',
          'PDF olarak indir ve dosya adını düzenle.',
        ],
      },
      {
        baslik: 'İçerik yine sen yazıyorsun',
        paragraflar: [
          'Biçim standart olsa da içeriğin gücü sana bağlı. "Takım çalışmasına yatkınım" gibi ' +
            'her CV\'de yazan cümleler Europass\'ta da işe yaramıyor. Deneyim ve proje ' +
            'anlatımını somutlaştır — [CV\'de proje nasıl anlatılır](/rehber/cvde-proje-nasil-anlatilir).',
        ],
        uyari:
          'Dil seviyesini olduğundan yüksek yazmak, dil sınavı ya da mülakat aşamasında ' +
          'hemen ortaya çıkıyor. Kendi seviyeni dürüst belirt.',
      },
    ],
    sss: [
      {
        soru: 'Europass CV ücretsiz mi?',
        cevap:
          'Evet, resmî Europass platformu üzerinden ücretsiz hazırlanıp indirilebiliyor.',
      },
      {
        soru: 'Türkçe mi İngilizce mi hazırlamalıyım?',
        cevap:
          'Başvuru yapılan kurumun diline göre. Erasmus başvurularında genellikle İngilizce isteniyor; ikisini de hazırlayıp saklamak pratik.',
      },
      {
        soru: 'Europass CV her yerde geçerli mi?',
        cevap:
          'Avrupa\'da yaygın olarak tanınıyor ama zorunlu değil. İlan neyi istiyorsa onu göndermek en doğrusu.',
      },
    ],
    kaynaklar: [
      {
        etiket: 'Europass özgeçmişinizi oluşturun',
        adres: 'https://europa.eu/europass/tr/create-europass-cv',
        kurum: 'Avrupa Komisyonu — Europass',
        tur: 'belge',
        destekledigi: 'Europass özgeçmişinin ücretsiz oluşturulduğu resmî araç.',
      },
    ],
    sonrakiAdim: {
      etiket: 'İngilizce başvuru e-postası nasıl yazılır',
      yol: '/rehber/ingilizce-basvuru-epostasi',
      aciklama: 'CV hazırsa sıradaki adım e-posta.',
    },
  }),

  metinRehberi({
    slug: 'ingilizce-basvuru-epostasi',
    baslik: 'İngilizce başvuru e-postası nasıl yazılır?',
    ozet: 'Kısa, doğrudan ve hatasız — üç kural yeterli.',
    konu: 'yurtdisi',
    etiketler: ['ingilizce', 'e-posta', 'başvuru', 'yurtdışı staj'],
    aciklama:
      'Yurt dışı staj başvurusu için İngilizce e-posta nasıl yazılır? Konu satırı, ' +
      'yapı ve sık yapılan hatalar.',
    hizliCevap:
      'İngilizce başvuru e-postası Türkçesinden daha kısa olmalı: konu satırında pozisyon ve tarih, ' +
      'gövdede üç kısa paragraf (kim olduğun, neden o kurum, ne yapabildiğin) ve kapanışta net bir ' +
      'talep. Süslü ifadeler yerine basit cümleler kullan; dil bilgisi hatası içerikten daha çok ' +
      'göze çarpıyor, o yüzden göndermeden önce bir kez daha oku.',
    bloklar: [
      {
        baslik: 'Konu satırı',
        karsilastirma: {
          kotuBaslik: 'Zayıf',
          iyiBaslik: 'İyi',
          kotu: ['Hello', 'Internship', 'Application', 'Job request'],
          iyi: [
            'Internship Application — Mechanical Engineering — Summer 2027',
            'Erasmus+ Traineeship Application — June–August',
            'Internship Inquiry — Computer Engineering, 3rd year',
          ],
        },
      },
      {
        baslik: 'Yapı',
        sirali: [
          'Açılış: hitap ve tek cümlelik amaç. "I am writing to apply for..."',
          'Kim olduğun: üniversite, bölüm, sınıf, tarih aralığı.',
          'Neden o kurum: somut bir proje, ürün ya da alan.',
          'Ne yapabildiğin: bir proje ya da araç, tek cümle.',
          'Kapanış: net talep ve teşekkür. "I have attached my CV. I would be glad to hear from you."',
        ],
      },
      {
        baslik: 'Dil tuzakları',
        liste: [
          'Türkçeden birebir çeviri: "I want to make internship" yerine "I would like to do an internship".',
          'Aşırı resmî kalıplar: uzun ve eski ifadeler doğal durmuyor.',
          'Çok uzun cümleler: her cümle bir fikir taşısın.',
          '"Dear Sir/Madam" yerine kişi adı biliniyorsa "Dear Ms./Mr. [Soyadı]".',
          'Ek dosyayı unutmak: "Please find attached" yazıp ek koymamak sık görülüyor.',
        ],
        uyari:
          'Yapay zekâ ile yazdırdığın metni olduğu gibi göndermek yerine, kendi cümlelerinle ' +
          'sadeleştir. Doğal olmayan bir İngilizce, hatalı bir İngilizceden daha çok dikkat çekiyor.',
      },
      {
        baslik: 'Takip',
        paragraflar: [
          'Yurt dışı başvurularında dönüş süresi daha uzun olabiliyor. On gün sonra aynı zincire ' +
            'kısa bir hatırlatma yazmak uygun. Ayrıntı: ' +
            '[başvuruya cevap gelmezse](/rehber/basvuruya-cevap-gelmezse).',
        ],
      },
    ],
    sss: [
      {
        soru: 'CV\'yi de İngilizce mi göndermeliyim?',
        cevap:
          'Evet, başvuru dili neyse CV de o dilde olmalı. Avrupa başvurularında [Europass](/rehber/europass-cv) istenebiliyor.',
      },
      {
        soru: 'Dil seviyem düşükse başvurmalı mıyım?',
        cevap:
          'Kısa ve hatasız bir e-posta yazabiliyorsan başvurabilirsin. İlanın istediği dil seviyesi varsa onu dürüst belirtmek gerekiyor.',
      },
      {
        soru: 'Ne kadar uzun olmalı?',
        cevap:
          'Ekran kaydırmadan okunabilecek kadar: yaklaşık 120–150 kelime yeterli.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Başvuru e-postası şablonunu aç',
      yol: '/basvuru-sablonu',
      aciklama: 'Türkçe şablonu temel alıp İngilizceye uyarlayabilirsin.',
    },
  }),

  metinRehberi({
    slug: 'yurtdisi-burslari',
    baslik: 'Yurt dışı bursları: nereden başlanır?',
    ozet: 'Devlet, üniversite ve kurum bursları farklı takvimlerde işliyor.',
    konu: 'yurtdisi',
    etiketler: ['yurtdışı bursu', 'yüksek lisans', 'başvuru', 'devlet bursu'],
    aciklama:
      'Yurt dışında okumak için burslar neler? Devlet bursları, üniversite bursları ' +
      've başvuru takvimi.',
    hizliCevap:
      'Yurt dışı bursları üç kaynaktan geliyor: kendi ülkenin devlet bursları, gidilecek ülkenin ' +
      'devlet/kurum bursları ve üniversitelerin kendi bursları. Başvuru takvimleri genellikle ' +
      'okul başvurusundan önce ya da onunla eş zamanlı işliyor ve dil belgesi, referans mektubu ' +
      'gibi hazırlığı uzun süren belgeler isteniyor — bir yıl önceden planlamak gerekiyor.',
    bloklar: [
      {
        baslik: 'Üç kaynak',
        tablo: {
          sutunlar: ['Kaynak', 'Genellikle kapsar'],
          satirlar: [
            ['Kendi ülkenin devlet bursları', 'Öğrenim ücreti, yaşam gideri, bazen ulaşım'],
            ['Gidilecek ülkenin kurum bursları', 'Öğrenim ücreti ve/veya aylık destek'],
            ['Üniversitelerin kendi bursları', 'Öğrenim ücretinde indirim ya da muafiyet'],
          ],
        },
        uyari:
          'Kapsam, tutar ve koşullar program program değişiyor ve her yıl güncelleniyor. ' +
          'Bu sayfada rakam ve tarih yazmıyoruz; her programın kendi resmî sayfasına bak.',
      },
      {
        baslik: 'Hazırlığı uzun süren belgeler',
        liste: [
          'Dil sınavı sonucu — sınav randevusu ve sonuç süresi haftalar alabiliyor.',
          'Referans mektupları — hocalardan istemek için erken haber vermek gerekiyor.',
          'Niyet mektubu / motivasyon mektubu — birkaç taslak gerektiriyor.',
          'Transkriptin İngilizce ve onaylı hâli.',
          'Bazı programlarda araştırma önerisi.',
        ],
      },
      {
        baslik: 'Zaman planı',
        sirali: [
          'Bir yıl önce: hedef ülke ve program listesi çıkar, dil sınavına hazırlan.',
          'Dokuz ay önce: dil sınavına gir, referans olacak hocalarla konuş.',
          'Altı ay önce: niyet mektubu taslağını yaz, belgeleri topla.',
          'Başvuru dönemi: hem okula hem bursa başvur; takvimler farklı olabiliyor.',
          'Sonuç sonrası: vize ve barınma sürecini başlat.',
        ],
      },
      {
        baslik: 'Dolandırıcılığa dikkat',
        paragraflar: [
          'Yurt dışı bursu adı altında "danışmanlık" ve "başvuru garantisi" satan yapılar var. ' +
            'Resmî burs programları başvuru için ücret istemiyor. ' +
            'Ayrıntı: [burs dolandırıcılığı nasıl anlaşılır](/rehber/burs-dolandiriciligi).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Lisans için yurt dışı bursu var mı?',
        cevap:
          'Var ama lisansüstü burslarına göre daha az ve daha çekişmeli. Üniversitelerin kendi başarı bursları lisans için en yaygın seçenek.',
      },
      {
        soru: 'Dil belgesi olmadan başvurabilir miyim?',
        cevap:
          'Çoğu program dil belgesi istiyor. Bazıları koşullu kabul veriyor ve belgeyi sonradan istiyor; programın koşullarına bakmak gerekiyor.',
      },
      {
        soru: 'Erasmus ile yurt dışı bursu aynı şey mi?',
        cevap:
          'Hayır. Erasmus değişim programı — kendi üniversitendeki öğrenciliğin devam ediyor. Yurt dışı bursları ise oradaki bir programa tam kayıt için veriliyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Millî Eğitim Bakanlığı', adres: 'https://www.meb.gov.tr', kurum: 'Millî Eğitim Bakanlığı', tur: 'kurum' },
      { etiket: 'Yükseköğretim Kurulu (YÖK)', adres: 'https://www.yok.gov.tr', kurum: 'Yükseköğretim Kurulu', tur: 'kurum' },
    ],
    sonrakiAdim: {
      etiket: 'Yurtdışı fırsatlarını gör',
      yol: '/yurtdisi-firsatlari',
      aciklama: 'Resmî kaynağıyla doğrulanmış programlar.',
    },
  }),

  metinRehberi({
    slug: 'yurtdisinda-staj-sigortasi',
    baslik: 'Yurt dışında staj sigortası',
    ozet: 'Türkiye\'deki sigorta orada geçmiyor; ayrı poliçe gerekiyor.',
    konu: 'yurtdisi',
    etiketler: ['sigorta', 'yurtdışı staj', 'sağlık', 'sorumluluk'],
    aciklama:
      'Yurt dışı stajında sigorta nasıl yapılıyor? Sağlık, kaza ve sorumluluk ' +
      'sigortası ve vize için gereken kapsam.',
    hizliCevap:
      'Yurt dışı stajında genellikle üç ayrı kapsam isteniyor: sağlık, kaza ve mesleki sorumluluk. ' +
      'Türkiye\'deki genel sağlık sigortan çoğu ülkede geçerli olmuyor, bu yüzden seyahat sağlık ' +
      'sigortası yaptırmak gerekiyor. Vize başvurusunda poliçenin belirli bir teminat tutarını ' +
      'karşılaması isteniyor; programın ve konsolosluğun istediği kapsamı önceden öğren.',
    bloklar: [
      {
        baslik: 'Üç kapsam',
        liste: [
          'Sağlık: hastalık ve tedavi giderleri. Vize için genellikle zorunlu.',
          'Kaza: staj sırasında oluşabilecek iş kazaları.',
          'Mesleki sorumluluk: stajyerin işyerinde verebileceği zararlar. Bazı işverenler şart koşuyor.',
        ],
        uyari:
          'Poliçenin kapsamı, teminat tutarı ve geçerlilik tarihleri, staj tarihlerini tam olarak ' +
          'kapsamalı. Bir gün eksik poliçe, vize başvurusunda ret sebebi olabiliyor.',
      },
      {
        baslik: 'Nereden alınır',
        liste: [
          'Sigorta şirketlerinin seyahat sağlık sigortası ürünleri.',
          'Bazı programların anlaşmalı sigorta seçenekleri (Erasmus ve IAESTE\'de olabiliyor).',
          'Gidilecek ülkedeki zorunlu sistem — bazı ülkeler kendi sistemine kayıt istiyor.',
        ],
      },
      {
        baslik: 'Kontrol listesi',
        kontrol: {
          baslik: 'Poliçeyi almadan önce',
          maddeler: [
            'Teminat tutarı konsolosluğun istediği düzeyde mi?',
            'Tarihler stajın tamamını kapsıyor mu (varış ve dönüş dahil)?',
            'Staj sırasındaki kazalar kapsamda mı?',
            'Poliçe İngilizce ya da gidilecek ülkenin dilinde mi?',
            'İşveren ek bir sigorta istiyor mu?',
          ],
        },
      },
      {
        baslik: 'Türkiye\'deki durumun',
        paragraflar: [
          'Yurt dışında staj yaparken Türkiye\'deki zorunlu staj sigortası uygulaması genellikle ' +
            'devreye girmiyor; ama stajın okulunda zorunlu staj olarak sayılması için okulun ' +
            'süreci ayrıca işlemesi gerekebiliyor. İkisini karıştırmamak için staj birimine ' +
            'yazılı sor. Yurt içindeki durum için: ' +
            '[staj sigortasını kim yapar](/rehber/staj-sigortasi-kim-yapar).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Türkiye\'deki sigortam yurt dışında geçerli mi?',
        cevap:
          'Genel olarak geçerli olmuyor. Bazı ülkelerle sosyal güvenlik anlaşmaları var ama kapsam sınırlı; seyahat sağlık sigortası yaptırmak gerekiyor.',
      },
      {
        soru: 'Sigortayı kim yaptırıyor?',
        cevap:
          'Genellikle öğrenci kendisi yaptırıyor. Bazı programlar ve işverenler kapsamın bir kısmını sağlıyor; başvuru öncesinde sormak gerekiyor.',
      },
      {
        soru: 'Vize için hangi teminat isteniyor?',
        cevap:
          'Ülkeye göre değişiyor. Gideceğin ülkenin konsolosluk sayfasında istenen asgari teminat yazıyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Sosyal Güvenlik Kurumu', adres: 'https://www.sgk.gov.tr', kurum: 'Sosyal Güvenlik Kurumu', tur: 'kurum' },
    ],
    sonrakiAdim: {
      etiket: 'Yurt dışı staj vizesi nasıl alınır',
      yol: '/rehber/yurtdisi-staj-vizesi',
      aciklama: 'Sigorta poliçesi vize dosyasının parçası.',
    },
  }),

  metinRehberi({
    slug: 'yurtdisinda-barinma',
    baslik: 'Yurt dışında barınma seçenekleri',
    ozet: 'Yurt, paylaşımlı ev ve geçici konaklama — üçünü de bil.',
    konu: 'yurtdisi',
    etiketler: ['barınma', 'yurtdışı', 'kiralama', 'dolandırıcılık'],
    aciklama:
      'Erasmus ve yurt dışı stajında nerede kalınır? Üniversite yurdu, paylaşımlı ev, ' +
      'geçici konaklama ve dolandırıcılıktan korunma.',
    hizliCevap:
      'En güvenli seçenek gidilen üniversitenin ya da programın sağladığı yurt; kontenjan sınırlı ' +
      'olduğu için kabul gelir gelmez başvurmak gerekiyor. Yurt çıkmazsa paylaşımlı ev yaygın ' +
      'alternatif. Görmeden kapora ödememek en önemli kural: yurt dışı barınma ilanlarında ' +
      'dolandırıcılık yaygın ve uzaktan doğrulamak zor.',
    bloklar: [
      {
        baslik: 'Seçenekler',
        tablo: {
          sutunlar: ['Seçenek', 'Artısı', 'Eksisi'],
          satirlar: [
            ['Üniversite yurdu', 'Güvenli, kampüse yakın', 'Kontenjan sınırlı, erken başvuru şart'],
            ['Öğrenci rezidansı', 'Hazır düzen, faturalar dahil olabiliyor', 'Fiyat yüksek'],
            ['Paylaşımlı ev', 'Uygun fiyat, sosyal', 'Sözleşme ve depozito riski'],
            ['Geçici konaklama (ilk hafta)', 'Yerinde arama imkânı', 'Maliyetli, plan gerektiriyor'],
          ],
        },
      },
      {
        baslik: 'Sıralama',
        sirali: [
          'Kabul mektubunu alır almaz üniversitenin barınma ofisine yaz.',
          'Yurt başvurusunu yap; kontenjan çoğu okulda kabul sırasına göre işliyor.',
          'Paralelde paylaşımlı ev ilanlarını takip et.',
          'Yurt çıkmazsa ilk hafta için geçici konaklama ayarla ve yerinde ara.',
          'Sözleşmeyi imzalamadan önce oda ve binayı gör ya da görüntülü tur iste.',
        ],
        uyari:
          'Görmeden ödeme yapma. Ödemen gerekiyorsa banka üzerinden yap, dekontu ve yazışmaları sakla. ' +
          'Nakit, kripto ya da para transfer servisiyle ödeme isteyen ilanlardan uzak dur.',
      },
      {
        baslik: 'Dolandırıcılık işaretleri',
        liste: [
          'Fiyat piyasanın çok altında.',
          '"Ülke dışındayım, anahtarı kargoyla göndereceğim" denmesi.',
          'Görüntülü tur isteğinin reddedilmesi.',
          'Sözleşme yerine yalnızca mesajla anlaşma.',
          'Acele ettiren dil: "başka biri de istiyor, bugün kapora gönder".',
        ],
      },
      {
        baslik: 'Bütçe',
        paragraflar: [
          'Kira dışında hesaba katılacak kalemler: depozito (çoğu ülkede bir-iki kira), ' +
            'faturalar, ulaşım kartı ve ilk hafta konaklaması. Erasmus hibesi bu kalemlerin ' +
            'tamamını karşılamayabiliyor — [Erasmus öğrenim hareketliliği](/rehber/erasmus-ogrenim-hareketliligi) ' +
            'sayfasındaki bütçe planına bak.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Erasmus\'ta yurt garanti mi?',
        cevap:
          'Hayır. Karşı üniversite kontenjan ayırabiliyor ama garanti değil. Kabul sonrası hemen başvurmak şansı artırıyor.',
      },
      {
        soru: 'Depozito ne kadar oluyor?',
        cevap:
          'Ülkeye göre değişiyor; genellikle bir ya da iki aylık kira tutarında. Sözleşmede yazılı olmasına ve banka üzerinden ödenmesine dikkat et.',
      },
      {
        soru: 'İlk hafta nerede kalmalıyım?',
        cevap:
          'Ev bulunmadıysa hostel ya da kısa süreli kiralama yaygın çözüm. Yerinde arama, uzaktan aramaya göre çok daha güvenli.',
      },
    ],
    kaynaklar: [
      { etiket: 'Erasmus+ Programı — Ulusal Ajans program sayfası', adres: 'https://www.ua.gov.tr/programlar_/erasmus-programi/', kurum: 'Türkiye Ulusal Ajansı', tur: 'belge' },
    ],
    sonrakiAdim: {
      etiket: 'Yurtdışı fırsatlarını gör',
      yol: '/yurtdisi-firsatlari',
      aciklama: 'Program seçimi barınma planından önce geliyor.',
    },
  }),
];
