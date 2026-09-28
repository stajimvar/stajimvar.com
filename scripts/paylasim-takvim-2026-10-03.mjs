/** 3-10 Ekim 2026 için 16 fotoğraflı karusel ekler. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { KOK, PAYLASIM } from './paylasim-sablonu.mjs';
import { BOY, EN, SURUM, kartSvg } from './paylasim-takvim-2026-09-15.mjs';

const fotoKlasoru = path.join(KOK, 'assets', 'instagram', 'takvim-20261003');
const postlar = [
  {
    kod: '2026-10-03-1230-sahte-staj-ilani', ad: '3 Ekim 2026 Cumartesi • 12.30 • Sahte staj ilanını ayırt etme', foto: 'sahte-ilan.png', seri: 'GÜVENLİ BAŞVURU',
    kanca: ['Staj ilanı', 'gerçek mi?', 'Üç noktayı doğrula.'], giris: ['Başvurmadan önce', 'kurumu ve bağlantıyı kontrol et.'],
    adimlar: [['Kurumu ara', 'Resmî site ve doğrulanabilir iletişim.'], ['Adresi incele', 'Başvuru bağlantısı doğru alan adında mı?'], ['Talebi sorgula', 'Para, şifre veya gereksiz belge isteniyor mu?']],
    kontrol: ['İlan resmî kanalda var mı?', 'İletişim adresi kuruma mı ait?', 'Şüpheli ödeme talebi var mı?'], kapanis: ['Şüphedeysen dur.', 'Kurumun resmî kanalından doğrula.'],
    metin: 'Bir staj ilanına başvurmadan önce kurumun resmî sitesini ve kariyer kanalını kontrol et. İletişim adresinin gerçekten kuruma ait olduğundan, bağlantının doğru alan adına yöneldiğinden emin ol. Başvuru için para, hesap şifresi veya gereksiz kişisel belge isteyen ilanlarda işlemi durdur. Şüpheli durumu ilandaki numaradan değil, kurumun resmî iletişim kanalından doğrula.',
    etiketler: ['#güvenlibaşvuru', '#stajilanı', '#stajbaşvurusu', '#öğrenci', '#kariyer', '#dolandırıcılık', '#stajimvar'],
  },
  {
    kod: '2026-10-03-2030-eposta-konu-satiri', ad: '3 Ekim 2026 Cumartesi • 20.30 • Başvuru e-postasının konu satırı', foto: 'eposta-konu.png', seri: 'BAŞVURU E-POSTASI',
    kanca: ['E-postan açılmadan', 'amacı belli', 'olsun.'], giris: ['Konu satırında', 'rol, adın ve gerekiyorsa kod yer alsın.'],
    adimlar: [['Rolü yaz', 'Başvurduğun pozisyonun açık adı.'], ['Kendini ekle', 'Ad ve soyadın.'], ['Kodu koru', 'İlanda referans kodu varsa aynen kullan.']],
    kontrol: ['Konu kısa mı?', 'Rol adı ilanla aynı mı?', '“Acil” gibi gereksiz ifade var mı?'], kapanis: ['Stajyer Başvurusu – Ad Soyad', 'Net konu, kolay takip.'],
    metin: 'Başvuru e-postasının konu satırı, alıcının mesajın amacını açmadan anlamasını sağlamalıdır. İlanda belirtilen pozisyon adını, adını ve varsa referans kodunu kısa biçimde yaz. “CV”, “başvuru” veya “acil” gibi tek başına belirsiz ifadeler kullanma. İlan özel bir konu biçimi istiyorsa onu aynen uygula.',
    etiketler: ['#başvuruepostası', '#stajbaşvurusu', '#eposta', '#öğrenci', '#kariyer', '#işarama', '#stajimvar'],
  },
  {
    kod: '2026-10-04-1230-kariyer-etkinligi', ad: '4 Ekim 2026 Pazar • 12.30 • Kariyer etkinliğine hazırlanma', foto: 'kariyer-etkinligi.png', seri: 'KARİYER ETKİNLİĞİ',
    kanca: ['Etkinliğe', 'şirket listesiyle', 'git.'], giris: ['Önceliğini bilirsen', 'kalabalıkta zaman kaybetmezsin.'],
    adimlar: [['Programı tara', 'İlgili oturum ve kurumları seç.'], ['Kısa tanıtım hazırla', 'Bölümün, ilgin ve tek hedefin.'], ['Sorunu yaz', 'İnternette cevabı olmayan bir soru.']],
    kontrol: ['Kayıt tamam mı?', 'CV veya profilin güncel mi?', 'Görüşeceğin üç kurum belli mi?'], kapanis: ['Üç kurum, üç soru.', 'Etkinliğe amaçla gir.'],
    metin: 'Kariyer etkinliğinden önce programı incele ve görüşmek istediğin en fazla üç kurumu önceliklendir. Bölümünü, ilgilendiğin alanı ve aradığın fırsatı anlatan kısa bir tanıtım hazırla. Her kurum için resmî kaynaklarda cevabını bulamadığın tek bir soru yaz. Böylece kalabalık bir etkinlikte rastgele dolaşmak yerine anlamlı görüşmeler yapabilirsin.',
    etiketler: ['#kariyeretkinliği', '#networking', '#öğrenci', '#staj', '#kariyer', '#işarama', '#stajimvar'],
  },
  {
    kod: '2026-10-04-2030-baglanti-mesaji', ad: '4 Ekim 2026 Pazar • 20.30 • Etkinlik sonrası bağlantı mesajı', foto: 'baglanti-mesaji.png', seri: 'NETWORKING',
    kanca: ['“Tanıştığımıza', 'memnun oldum”dan', 'bir adım ileri git.'], giris: ['Mesajında görüşmenin', 'gerçek bir ayrıntısını hatırlat.'],
    adimlar: [['Kendini hatırlat', 'Etkinlik ve konuştuğunuz konu.'], ['Değeri belirt', 'Sana yardımcı olan kısa nokta.'], ['Bağı açık bırak', 'Uygun bir sonraki temas nedeni.']],
    kontrol: ['Mesaj kişiye özel mi?', 'Doğrudan iş istemeye dönüyor mu?', 'Kısa ve nazik mi?'], kapanis: ['Bağlam + teşekkür + devam.', 'Kopyala-yapıştır mesaj gönderme.'],
    metin: 'Etkinlik sonrası bağlantı mesajında nerede tanıştığınızı ve konuşmadan hatırladığın gerçek bir noktayı belirt. Paylaşılan bilginin sana nasıl yardımcı olduğunu kısa biçimde söyle ve teşekkür et. İlk mesajı doğrudan iş istemeye dönüştürme; gelecekte ilgili bir gelişme olduğunda iletişim kurabilmek için doğal bir kapı bırak.',
    etiketler: ['#networking', '#bağlantı', '#kariyeretkinliği', '#öğrenci', '#kariyer', '#iletişim', '#stajimvar'],
  },
  {
    kod: '2026-10-05-1230-ders-projesi-cv', ad: '5 Ekim 2026 Pazartesi • 12.30 • Ders projesini CV’de anlatma', foto: 'ders-projesi.png', seri: 'CV DENEYİMİ',
    kanca: ['Ders projen', 'CV’de yalnızca', 'proje adı olmasın.'], giris: ['Problemi, katkını', 've çıktıyı ayır.'],
    adimlar: [['Problemi söyle', 'Proje neyi çözmeye çalıştı?'], ['Katkını ayır', 'Ekip içinde sen ne yaptın?'], ['Çıktıyı göster', 'Rapor, prototip, analiz veya sonuç.']],
    kontrol: ['Kendi katkın net mi?', 'Kullandığın araçları açıklayabilir misin?', 'Sonuç abartısız mı?'], kapanis: ['Problem + katkı + çıktı.', 'Bir ders projesini bugün dönüştür.'],
    metin: 'Ders projesini CV’ye eklerken yalnızca ders ve proje adını yazma. Çözülen problemi, ekipte üstlendiğin kısmı ve ortaya çıkan somut çıktıyı anlat. Kullandığın araçları ancak gerçekten uyguladıysan ekle; ekip sonucunu tamamen kendi başarın gibi sunma. Mümkünse rapor, prototip veya kod gibi paylaşılabilir bir kanıt bağlantısı kullan.',
    etiketler: ['#dersprojesi', '#stajcv', '#cvhazırlama', '#öğrenci', '#proje', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-10-05-2030-mulakat-sorulari', ad: '5 Ekim 2026 Pazartesi • 20.30 • Mülakatta sorulacak doğru sorular', foto: 'mulakat-sorulari.png', seri: 'MÜLAKAT SORULARI',
    kanca: ['“Sorunuz var mı?”', 'cevapsız', 'kalmasın.'], giris: ['Sorun rolü anlamaya', 've karar vermeye yardım etsin.'],
    adimlar: [['Görevi sor', 'Stajyerin ilk somut sorumluluğu.'], ['Desteği sor', 'Geri bildirim ve mentörlük biçimi.'], ['Başarıyı sor', 'İyi bir stajyer nasıl değerlendiriliyor?']],
    kontrol: ['Cevabı ilanda zaten var mı?', 'Evet-hayır sorusu mu?', 'Gerçekten kararını etkiler mi?'], kapanis: ['İki soru seç.', 'Birini rol, birini öğrenme üzerine kur.'],
    metin: 'Mülakat sonunda soracağın sorular, rolü ve çalışma ortamını anlamana yardımcı olmalı. Stajyerin ilk sorumluluklarını, geri bildirim düzenini ve başarının nasıl değerlendirildiğini sorabilirsin. Cevabı ilanda veya şirket sitesinde açıkça bulunan soruları tekrar etme. Maaş ve koşullar kadar öğrenme desteğini de kararının parçası yap.',
    etiketler: ['#mülakatsoruları', '#stajmülakatı', '#mülakat', '#öğrenci', '#kariyer', '#staj', '#stajimvar'],
  },
  {
    kod: '2026-10-06-1230-uzaktan-staj-alani', ad: '6 Ekim 2026 Salı • 12.30 • Uzaktan staj çalışma alanı hazırlama', foto: 'uzaktan-staj.png', seri: 'UZAKTAN STAJ',
    kanca: ['Uzaktan stajda', 'masanı değil,', 'çalışma düzenini kur.'], giris: ['Bağlantı, ses ve', 'odak alanını önceden hazırla.'],
    adimlar: [['Tekniği dene', 'İnternet, kamera, mikrofon ve erişimler.'], ['Alanı sadeleştir', 'Dikkati dağıtanları ve arka planı düzenle.'], ['Rutini belirle', 'Başlangıç, mola ve iletişim saatleri.']],
    kontrol: ['Yedek bağlantın var mı?', 'Toplantıda sesin anlaşılır mı?', 'Kurum verileri güvende mi?'], kapanis: ['İlk günden önce dene.', 'Sorunu toplantıda keşfetme.'],
    metin: 'Uzaktan staj başlamadan önce internet bağlantını, mikrofonunu, kameranı ve gerekli erişimleri dene. Görüşmeler için sessiz ve sade bir alan oluştur; kurum dosyalarını ortak veya güvensiz cihazlarda bırakma. Çalışma saatlerini, molalarını ve ulaşılabilirlik düzenini yöneticinle netleştir. Teknik sorunlar için yedek bağlantı veya iletişim yolunu önceden bil.',
    etiketler: ['#uzaktanstaj', '#remotework', '#stajyer', '#öğrenci', '#işhayatı', '#verimlilik', '#stajimvar'],
  },
  {
    kod: '2026-10-06-2030-geri-bildirim-uygulama', ad: '6 Ekim 2026 Salı • 20.30 • Gelen geri bildirimi uygulama', foto: 'geri-bildirim.png', seri: 'GERİ BİLDİRİM',
    kanca: ['Geri bildirimi', 'yalnız dinleme.', 'Eyleme çevir.'], giris: ['Ne değişeceğini', 'kendi cümlenle netleştir.'],
    adimlar: [['Dinle ve not et', 'Savunmaya geçmeden örneği anla.'], ['Tekrarla', 'Beklenen değişikliği doğrula.'], ['Uygula ve göster', 'Düzenlenmiş çıktıyı yeniden paylaş.']],
    kontrol: ['Geri bildirim somut mu?', 'Sonraki adımın belli mi?', 'Ne zaman yeniden göstereceksin?'], kapanis: ['Dinle, doğrula, uygula.', 'Gelişimini görünür kıl.'],
    metin: 'Geri bildirim aldığında hemen açıklama yapmaya çalışmak yerine örneği ve beklenen değişikliği dinle. Anladığını kendi cümlenle tekrar et, gerekiyorsa önceliği ve teslim zamanını sor. Düzenlemeyi yaptıktan sonra yalnız “tamamlandı” demek yerine değişen kısmı göster. Aynı geri bildirimi tekrar almamak için kısa bir not tut.',
    etiketler: ['#geribildirim', '#stajyer', '#gelişim', '#işhayatı', '#öğrenci', '#iletişim', '#stajimvar'],
  },
  {
    kod: '2026-10-07-1230-teslim-kontrolu', ad: '7 Ekim 2026 Çarşamba • 12.30 • Görevi teslim etmeden önce kontrol', foto: 'teslim-kontrolu.png', seri: 'TESLİM KONTROLÜ',
    kanca: ['“Bitti” demeden', 'önce üç kez', 'bak.'], giris: ['Beklenti, içerik', 've teslim biçimini ayır.'],
    adimlar: [['Beklentiyi eşleştir', 'İstenen çıktı gerçekten hazır mı?'], ['İçeriği tara', 'Eksik, hata ve kaynak kontrolü.'], ['Teslimi doğrula', 'Dosya adı, biçim ve doğru kanal.']],
    kontrol: ['Tüm maddeler karşılandı mı?', 'Dosya açılıyor mu?', 'Son sürüm mü gönderiliyor?'], kapanis: ['İçerik + biçim + kanal.', 'Teslimden önce üç dakikanı ayır.'],
    metin: 'Bir görevi teslim etmeden önce istenen maddelerle çıktını yan yana karşılaştır. İçerikte eksik, yazım hatası veya doğrulanmamış bilgi olup olmadığını tara. Dosyanın açıldığını, doğru adlandırıldığını ve son sürüm olduğunu kontrol et. Teslimi istenen kanal üzerinden yap ve gerekiyorsa kısa bir özetle ne gönderdiğini belirt.',
    etiketler: ['#teslimkontrolü', '#stajyer', '#işhayatı', '#verimlilik', '#öğrenci', '#görevtakibi', '#stajimvar'],
  },
  {
    kod: '2026-10-07-2030-mentor-gorusmesi', ad: '7 Ekim 2026 Çarşamba • 20.30 • Mentör görüşmesine hazırlanma', foto: 'mentor-gorusmesi.png', seri: 'MENTÖR GÖRÜŞMESİ',
    kanca: ['Mentör görüşmesini', 'durum toplantısına', 'çevirme.'], giris: ['Bir hedef, bir örnek', 've bir soruyla git.'],
    adimlar: [['Hedefi seç', 'Bu görüşmeden ne öğrenmek istiyorsun?'], ['Örneği götür', 'Üzerinde konuşulacak gerçek çalışma.'], ['Soruyu daralt', 'Genel tavsiye yerine somut karar.']],
    kontrol: ['Önceki öneriyi uyguladın mı?', 'Sorun açık ve kısa mı?', 'Not almaya hazır mısın?'], kapanis: ['Hedef + örnek + soru.', 'Görüşmenin değerini artır.'],
    metin: 'Mentör görüşmesine giderken yalnızca yaptığın işleri sıralamak yerine öğrenmek istediğin tek hedefi belirle. Üzerinde konuşulabilecek gerçek bir örnek götür ve genel tavsiye istemek yerine somut bir kararı sor. Önceki görüşmede verilen öneriyi nasıl uyguladığını paylaş. Görüşme sonunda atacağın adımı ve yeniden ne zaman değerlendireceğinizi netleştir.',
    etiketler: ['#mentörlük', '#stajyer', '#kariyer', '#gelişim', '#öğrenci', '#işhayatı', '#stajimvar'],
  },
  {
    kod: '2026-10-08-1230-sure-tahmini', ad: '8 Ekim 2026 Perşembe • 12.30 • İş için gerçekçi süre tahmini verme', foto: 'sure-tahmini.png', seri: 'ZAMAN TAHMİNİ',
    kanca: ['“Ne zaman biter?”', 'sorusuna', 'rastgele cevap verme.'], giris: ['İşi parçalara ayır,', 'belirsizliği açıkça söyle.'],
    adimlar: [['Kapsamı doğrula', 'Beklenen çıktı ve kalite düzeyi.'], ['Adımları böl', 'Araştırma, üretim, kontrol ve teslim.'], ['Pay bırak', 'Yeni bilgi ve geri bildirim zamanı.']],
    kontrol: ['Benzer işi daha önce yaptın mı?', 'Bağımlılıklar belli mi?', 'Ara kontrol zamanı var mı?'], kapanis: ['Tahmin + varsayım + kontrol.', 'Kesinmiş gibi söz verme.'],
    metin: 'Bir iş için süre verirken önce beklenen çıktıyı ve kalite düzeyini doğrula. İşi araştırma, üretim, kontrol ve teslim adımlarına böl; başka bir kişi veya dosyaya bağlıysan bunu belirt. Bilmediğin kısmı saklamak yerine varsayımını açıkla ve ara kontrol zamanı öner. Gecikme riski oluştuğunda tahmini erkenden güncelle.',
    etiketler: ['#zamanyönetimi', '#süretahmini', '#stajyer', '#işhayatı', '#öğrenci', '#verimlilik', '#stajimvar'],
  },
  {
    kod: '2026-10-08-2030-hata-iletisimi', ad: '8 Ekim 2026 Perşembe • 20.30 • Hata yaptığında doğru iletişim kurma', foto: 'hata-iletisimi.png', seri: 'HATA YÖNETİMİ',
    kanca: ['Hatayı saklamak', 'küçük sorunu', 'büyütebilir.'], giris: ['Durumu erken, açık', 've çözüm odaklı bildir.'],
    adimlar: [['Gerçeği söyle', 'Ne oldu ve ne zaman fark ettin?'], ['Etkisini ayır', 'Neyi etkiledi, neyi etkilemedi?'], ['Adım öner', 'Düzeltme ve tekrarını önleme planı.']],
    kontrol: ['Doğru kişiye haber verdin mi?', 'Varsayımı gerçek gibi sunuyor musun?', 'Acil işlemi netleştirdin mi?'], kapanis: ['Erken bildir.', 'Sorumluluk al ve çözümü konuş.'],
    metin: 'Bir hata fark ettiğinde saklamak veya başkasının bulmasını beklemek yerine doğru kişiye erken haber ver. Ne olduğunu, ne zaman fark ettiğini ve bilinen etkisini kısa biçimde açıkla. Emin olmadığın noktaları tahmin olarak belirt. Mümkünse düzeltme adımını ve aynı hatanın tekrarını önleyecek küçük değişikliği öner; sorumluluk almak kendini suçlamak değildir.',
    etiketler: ['#hatayönetimi', '#stajyer', '#iletişim', '#işhayatı', '#öğrenci', '#sorumluluk', '#stajimvar'],
  },
  {
    kod: '2026-10-09-1230-eposta-guvenligi', ad: '9 Ekim 2026 Cuma • 12.30 • E-posta eki ve bağlantı güvenliği', foto: 'eposta-guvenligi.png', seri: 'DİJİTAL GÜVENLİK',
    kanca: ['Tanıdık görünen', 'her eki', 'açma.'], giris: ['Göndereni, adresi', 've isteği birlikte kontrol et.'],
    adimlar: [['Adresi oku', 'Görünen ad değil tam e-posta adresi.'], ['Bağlantıyı incele', 'Tıklamadan önce gerçek hedef.'], ['Başka kanaldan sor', 'Beklenmeyen dosyayı gönderene doğrulat.']],
    kontrol: ['Mesaj aciliyet baskısı kuruyor mu?', 'Şifre veya kod istiyor mu?', 'Dosya beklediğin biçimde mi?'], kapanis: ['Şüphedeysen açma.', 'Resmî kanaldan doğrula.'],
    metin: 'Beklemediğin bir e-posta eki veya bağlantı geldiğinde görünen ada güvenmek yerine tam gönderen adresini kontrol et. Bağlantının gerçek hedefini tıklamadan incele; şifre, doğrulama kodu veya ödeme isteyen mesajlarda işlemi durdur. Tanıdığın birinden gelmiş görünse bile beklenmeyen dosyayı farklı bir iletişim kanalından doğrula ve kurumun güvenlik politikasını izle.',
    etiketler: ['#dijitalgüvenlik', '#epostagüvenliği', '#stajyer', '#öğrenci', '#işhayatı', '#güvenlik', '#stajimvar'],
  },
  {
    kod: '2026-10-09-2030-sirket-kulturu', ad: '9 Ekim 2026 Cuma • 20.30 • Şirket kültürü ifadelerini değerlendirme', foto: 'sirket-kulturu.png', seri: 'ŞİRKET KÜLTÜRÜ',
    kanca: ['“Dinamik ekip”', 'senin için', 'ne demek?'], giris: ['Genel ifadeyi', 'somut çalışma biçimine çevir.'],
    adimlar: [['İfadeyi seç', 'İlanda geçen kültür iddiası.'], ['Örneği sor', 'Günlük işte nasıl görünüyor?'], ['Kendinle karşılaştır', 'Öğrenme ve çalışma beklentin.']],
    kontrol: ['Yalnız sloganla mı karar veriyorsun?', 'Ekip düzenini sordun mu?', 'Kendi önceliklerin belli mi?'], kapanis: ['Sloganı değil,', 'davranışı ve sistemi sor.'],
    metin: 'İlanlarda geçen “dinamik”, “aile gibi” veya “girişimci” gibi kültür ifadeleri tek başına yeterli bilgi vermez. Bu sözlerin günlük işte nasıl göründüğünü; görev paylaşımı, geri bildirim, çalışma saatleri ve öğrenme desteği üzerinden sor. Kendi önceliklerini de belirle. Şirket kültürü hakkında yalnız tanıtım sloganına veya tek bir çevrim içi yoruma dayanarak kesin hüküm verme.',
    etiketler: ['#şirketkültürü', '#stajbaşvurusu', '#işhayatı', '#öğrenci', '#kariyer', '#mülakat', '#stajimvar'],
  },
  {
    kod: '2026-10-10-1230-gizli-deneyim', ad: '10 Ekim 2026 Cumartesi • 12.30 • Staj deneyimini gizliliği koruyarak anlatma', foto: 'gizli-deneyim.png', seri: 'DENEYİM ANLATIMI',
    kanca: ['Deneyimini anlat.', 'Gizli bilgiyi', 'değil.'], giris: ['Müşteri adı yerine', 'problemi ve yöntemini öne çıkar.'],
    adimlar: [['Bağlamı genelleştir', 'Sektör veya problem türü.'], ['Rolünü anlat', 'Aldığın sorumluluk ve yöntem.'], ['Sonucu anonimleştir', 'İzinli ve güvenli düzeyde çıktı.']],
    kontrol: ['Kurum veya müşteri adı izinli mi?', 'Ekran görüntüsünde veri var mı?', 'Sonuç kişiyi tanımlıyor mu?'], kapanis: ['Gizlilik sınırdır.', 'Yöntemini güçlü biçimde anlat.'],
    metin: 'Staj deneyimini CV’de veya mülakatta anlatırken kurumun ve müşterilerin gizli bilgilerini paylaşma. Projenin adını vermek yerine problem türünü genelleştir, kendi sorumluluğunu ve kullandığın yöntemi açıkla. Rakam, ekran görüntüsü veya dosya kullanmadan önce izin durumunu kontrol et. Güçlü bir anlatım için gizli ayrıntıya değil kararlarına ve öğrendiklerine odaklan.',
    etiketler: ['#gizlilik', '#stajdeneyimi', '#stajcv', '#mülakat', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-10-10-2030-iletisimi-surdurme', ad: '10 Ekim 2026 Cumartesi • 20.30 • Staj bittikten sonra iletişimi sürdürme', foto: 'iletisimi-surdurme.png', seri: 'STAJ SONRASI',
    kanca: ['Staj bitti.', 'İletişim bir anda', 'bitmek zorunda değil.'], giris: ['Sadece ihtiyacın olduğunda', 'yazan kişi olma.'],
    adimlar: [['Teşekkür et', 'Öğrendiğin somut şeyi belirt.'], ['Gelişme paylaş', 'Uyguladığın öneri veya yeni çalışma.'], ['Ölçülü kal', 'Anlamlı aralıklarla kısa iletişim.']],
    kontrol: ['Mesajın gerçek bir nedeni var mı?', 'Kişisel sınırlar korunuyor mu?', 'Yalnız iş istemek için mi yazıyorsun?'], kapanis: ['Teşekkür + gelişme + bağ.', 'Az ama anlamlı iletişim kur.'],
    metin: 'Staj bittikten sonra ekibine ve mentörüne öğrendiğin somut bir noktayı belirterek teşekkür et. Sonraki aylarda verilen bir öneriyi uyguladığında veya ilgili bir çalışma tamamladığında kısa bir güncelleme paylaşabilirsin. Yalnız fırsat istediğinde yazmak yerine gerçek bir bağlam oluştur; sık ve amaçsız mesajlarla kişisel sınırları aşma.',
    etiketler: ['#stajsonrası', '#networking', '#mentörlük', '#kariyer', '#öğrenci', '#iletişim', '#stajimvar'],
  },
];

for (const post of postlar) {
  const foto = await sharp(path.join(fotoKlasoru, post.foto)).resize(EN, BOY, { fit: 'cover' }).png().toBuffer();
  const foto64 = foto.toString('base64');
  const klasor = path.join(PAYLASIM, post.kod);
  fs.mkdirSync(klasor, { recursive: true });
  for (let no = 0; no < 4; no += 1) {
    const hedef = path.join(klasor, `${String(no + 1).padStart(2, '0')}-${SURUM}.jpg`);
    await sharp(Buffer.from(kartSvg({ foto64, post, no })), { density: 192 })
      .resize(1440, 1920, { kernel: 'lanczos3' })
      .jpeg({ quality: 94, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(hedef);
  }
}

const manifestYolu = path.join(PAYLASIM, 'setler.json');
const oncekiSetler = JSON.parse(fs.readFileSync(manifestYolu, 'utf8'));
const mevcutKodlar = new Set(oncekiSetler.map((set) => set.kod));
const yeniSetler = postlar.filter((post) => !mevcutKodlar.has(post.kod)).map((post) => ({
  kod: post.kod,
  ad: post.ad,
  surum: SURUM,
  guncellendi: '2026-09-15',
  metin: post.metin,
  etiketler: post.etiketler,
  kartlar: [1, 2, 3, 4].map((no) => `/paylasim/${post.kod}/${String(no).padStart(2, '0')}-${SURUM}.jpg`),
}));
fs.writeFileSync(manifestYolu, `${JSON.stringify([...oncekiSetler, ...yeniSetler], null, 2)}\n`);
console.log(`${yeniSetler.length} gönderi ve ${yeniSetler.length * 4} kart panel paketine eklendi.`);
