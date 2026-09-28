/** 11-22 Ekim 2026 için 24 fotoğraflı karusel ekler. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { KOK, PAYLASIM } from './paylasim-sablonu.mjs';
import { BOY, EN, SURUM, kartSvg } from './paylasim-takvim-2026-09-15.mjs';

const fotoKlasoru = path.join(KOK, 'assets', 'instagram', 'takvim-20261011');
const p = (tarih, gun, saat, slug, baslik, foto, seri, kanca, giris, adimlar, kontrol, kapanis, metin) => ({
  kod: `2026-10-${tarih}-${saat.replace('.', '')}-${slug}`,
  ad: `${Number(tarih)} Ekim 2026 ${gun} • ${saat} • ${baslik}`,
  foto, seri, kanca, giris, adimlar, kontrol, kapanis, metin,
  etiketler: ['#staj', '#stajbaşvurusu', '#öğrenci', '#kariyer', '#işhayatı', '#stajyer', '#stajimvar'],
});

const postlar = [
  p('11','Pazar','12.30','on-yazi-ilk-paragraf','Ön yazının ilk paragrafını hazırlama','on-yazi.png','ÖN YAZI',
    ['Ön yazıya','kendini överek','başlama.'],['Rol ile arandaki','gerçek bağı göster.'],
    [['Rolü adlandır','Hangi pozisyona başvurduğun belli olsun.'],['Bağı kur','Şirketin gerçek işiyle ilgini eşleştir.'],['Kanıt ver','Hazırlığını gösteren tek örnek ekle.']],
    ['Başka şirkete de gönderilebilir mi?','İlandan gerçek ayrıntı kullandın mı?','İlk paragraf kısa mı?'],['Rol + bağ + kanıt.','İlk üç cümleyi böyle kur.'],
    'Ön yazının ilk paragrafında başvurduğun rolü açıkça belirt, kurumun gerçek çalışma alanıyla ilgini bağla ve hazırlığını gösteren tek bir örnek ver. Şirketi genel sözlerle övmek yerine neden bu göreve yöneldiğini anlat. Her yere gönderilebilecek kalıp bir giriş kullanma.'),
  p('11','Pazar','20.30','bolum-disi-staj','Bölüm dışı staja başvurma','bolum-disi.png','ALAN DEĞİŞİMİ',
    ['Bölümün farklı diye','hemen vazgeçme.','Aktarılabilir becerine bak.'],['Ders adından önce','yapabildiğin işi göster.'],
    [['Rolü çöz','Günlük görevleri ve temel beklentiyi çıkar.'],['Beceriyi eşleştir','Proje, kulüp veya ders kanıtını bul.'],['Açığı belirt','Öğrenmen gereken kısmı dürüstçe yaz.']],
    ['Temel şartı karşılıyor musun?','Kanıtın somut mu?','Alan değişimini açıklayabiliyor musun?'],['Unvanı değil, işi karşılaştır.','Gerçek kanıtın varsa başvur.'],
    'Bölüm dışı bir staja başvururken rolün günlük görevlerini incele ve mevcut deneyimlerinden aktarılabilecek becerileri seç. Ders projesi, kulüp görevi veya gönüllülük çalışmasıyla somut kanıt sun. Eksik olduğun alanı saklama; öğrenme planını kısa ve gerçekçi biçimde anlat.'),
  p('12','Pazartesi','12.30','yabanci-dil-seviyesi','CV’de yabancı dil seviyesini doğru yazma','yabanci-dil.png','CV DOĞRULUĞU',
    ['“İleri seviye”','yazmadan önce','kanıtını düşün.'],['Seviyeni işte ne','yapabildiğinle anlat.'],
    [['Beceriyi ayır','Okuma, yazma, dinleme ve konuşma.'],['Ölçüt kullan','Varsa güncel ve geçerli sonuç.'],['İşle bağla','Sunum, yazışma veya kaynak takibi.']],
    ['Seviyeni açıklayabilir misin?','Belgen güncel mi?','Konuşma düzeyinle uyumlu mu?'],['Abartma, küçültme.','Açıklayabildiğin seviyeyi yaz.'],
    'CV’de yabancı dil seviyesini tek bir belirsiz sıfatla yazmak yerine hangi becerileri kullanabildiğini düşün. Varsa güncel ve geçerli sınav sonucunu ekle. Dil bilgisini iş bağlamında nasıl kullandığını gösterebiliyorsan kısa bir örnek ver. Mülakatta sürdüremeyeceğin seviyeyi yazma.'),
  p('12','Pazartesi','20.30','sertifika-secimi','Sertifikayı CV’ye ekleme kararı','sertifika.png','SERTİFİKA',
    ['Her sertifika','CV’ye girmek','zorunda değil.'],['Rol ile ilgili ve','doğrulanabilir olanı seç.'],
    [['İlgiyi ölç','Hedef rolün becerisine bağlanıyor mu?'],['Kaynağı doğrula','Kurum, tarih ve içerik belli mi?'],['Uygulamayı göster','Öğrendiğini nerede kullandın?']],
    ['Yalnız katılım belgesi mi?','Tarih ve veren kurum yazılı mı?','Proje kanıtın var mı?'],['Az ve ilgili sertifika.','Listeyi değil öğrenmeyi göster.'],
    'CV’ye yalnızca hedef rolle ilgili, kaynağı ve tarihi doğrulanabilir sertifikaları ekle. Katıldığın her eğitimi sıralamak yerine öğrendiğin beceriyi nerede uyguladığını göster. Süresi geçmiş veya açıklayamayacağın belgeleri öne çıkarma; birkaç güçlü seçim uzun bir listeden daha anlaşılırdır.'),
  p('13','Salı','12.30','github-profili','GitHub profilini başvuruya hazırlama','github.png','TEKNİK PORTFÖY',
    ['GitHub bağlantın','boş bir vitrine','açılmasın.'],['Az sayıda anlaşılır','projeyi öne çıkar.'],
    [['Projeyi seç','Hedef rolle ilgili iki-üç çalışma.'],['Açıklama yaz','Amaç, kurulum ve senin katkın.'],['Gizliliği temizle','Anahtar, şifre ve özel veri bırakma.']],
    ['Projeler açılıyor mu?','Açıklama yeni biri için yeterli mi?','Gizli bilgi var mı?'],['Temiz profil, net projeler.','Bağlantıyı göndermeden önce aç.'],
    'GitHub profilinde hedef rolle ilgili birkaç projeyi öne çıkar. Her proje için amacı, nasıl çalıştırıldığını ve kendi katkını açıklayan kısa bir README hazırla. Kullanılmayan denemeleri vitrine taşımak zorunda değilsin. Kodda API anahtarı, şifre veya kişisel veri bulunmadığını kontrol et.'),
  p('13','Salı','20.30','portfoy-ilk-sayfa','Tasarım portföyünde ilk sayfa','portfoy-ilk-sayfa.png','PORTFÖY AÇILIŞI',
    ['İlk sayfa','süs değil,','yönlendirme olsun.'],['Kimsin, ne üretiyorsun,','nereden başlanmalı?'],
    [['Kısa tanıt','Alanını ve odak noktanı söyle.'],['Seçkiyi göster','En güçlü üç projeye yol ver.'],['İletişimi ekle','Güncel ve çalışan bağlantı.']],
    ['Rolün anlaşılır mı?','En güçlü proje görünür mü?','Bağlantılar çalışıyor mu?'],['Az metin, net yön.','İlk sayfa gezinmeyi kolaylaştırsın.'],
    'Tasarım portföyünün ilk sayfası ziyaretçiye kim olduğunu, hangi alana odaklandığını ve hangi projeden başlaması gerektiğini göstermeli. En güçlü çalışmalarına doğrudan yol ver ve güncel iletişim bağlantısı ekle. Uzun bir hayat hikâyesi yerine kısa, okunabilir ve işlevsel bir açılış kullan.'),
  p('14','Çarşamba','12.30','telefon-mulakati','Telefon mülakatına hazırlanma','telefon-mulakati.png','TELEFON MÜLAKATI',
    ['Telefon çaldığında','ilanı aramaya','başlama.'],['Rol notun ve CV’n','önünde hazır olsun.'],
    [['Sessiz yer seç','Kesintisiz ve iyi çeken alan.'],['Belgeleri aç','İlan, CV ve kısa şirket notu.'],['Soru hazırla','Süreç ve sonraki adım için.']],
    ['Telefonun şarjlı mı?','Kimin arayacağı belli mi?','Not almak için hazır mısın?'],['Sesin tek aracın.','Yavaş, net ve kısa konuş.'],
    'Telefon mülakatından önce sessiz ve bağlantısı güçlü bir yer seç. İlanı, gönderdiğin CV’yi ve şirket hakkında kısa notunu önünde açık tut. Ses tonun ve anlatım hızın daha görünür olacağı için kısa ve net cevaplar ver. Görüşmenin sonunda sürecin sonraki adımını sor ve not et.'),
  p('14','Çarşamba','20.30','online-mulakat-duzeni','Online mülakatta teknik düzen','online-mulakat.png','ONLINE MÜLAKAT',
    ['Mülakattan','beş dakika önce','kamera arama.'],['Bağlantıyı ve cihazı','önceden dene.'],
    [['Davet bağlantısı','Uygulama ve hesap erişimini kontrol et.'],['Ses ve görüntü','Mikrofon, kamera ve ışığı dene.'],['Yedek plan','Telefon ve iletişim adresini hazırla.']],
    ['Görünen adın doğru mu?','Bildirimler kapalı mı?','Yedek bağlantın var mı?'],['Tekniği önceden çöz.','Görüşmede role odaklan.'],
    'Online mülakattan önce davet bağlantısını, gerekli uygulamayı ve görünen adını kontrol et. Kamera, mikrofon, ışık ve internet bağlantısını dene; bildirimleri kapat. Teknik sorun yaşarsan ulaşabileceğin iletişim adresini ve yedek cihazı hazır tut. Görüşmeye son anda bağlanmayı bekleme.'),
  p('15','Perşembe','12.30','mulakat-kiyafeti','Mülakat kıyafeti seçme','mulakat-kiyafeti.png','MÜLAKAT HAZIRLIĞI',
    ['Kıyafetin','senden önce','konuşmasın.'],['Temiz, rahat ve','ortama uygun seçim yap.'],
    [['Kurumu düşün','Sektör ve görüşme biçimi.'],['Rahatlığı dene','Otururken ve hareket ederken.'],['Önceden hazırla','Son dakika sorununu azalt.']],
    ['Temiz ve düzenli mi?','Dikkatini dağıtıyor mu?','Kamera kadrajında uygun mu?'],['Kostüm giyme.','Kendinin düzenli hâli ol.'],
    'Mülakat kıyafetini sektörün ve görüşme biçiminin genel ortamına göre seç. Temiz, düzenli ve rahat bir görünüm çoğu durumda yeterlidir. Kendini yabancı hissettiren bir kostüme dönüşme; kıyafeti bir gün önce dene ve çevrim içi görüşmede kamera kadrajında nasıl göründüğüne bak.'),
  p('15','Perşembe','20.30','basarisizlik-sorusu','Mülakatta başarısızlık sorusuna cevap','basarisizlik-sorusu.png','MÜLAKAT CEVABI',
    ['“Hiç başarısız','olmadım” demek','güçlü cevap değil.'],['Gerçek bir örnek ve','öğrendiğin değişikliği anlat.'],
    [['Örneği seç','Sorumluluk alabildiğin gerçek durum.'],['Payını söyle','Bahane üretmeden kendi kararın.'],['Değişimi göster','Sonraki işte neyi farklı yaptın?']],
    ['Örnek çok kişisel mi?','Başkalarını suçluyor musun?','Öğrenme kanıtın var mı?'],['Hata + sorumluluk + değişim.','Cevabın burada güçlenir.'],
    'Başarısızlık sorusunda gerçek ve iş bağlamında anlatılabilir bir örnek seç. Durumdaki kendi payını bahane üretmeden açıkla, ne öğrendiğini ve sonraki benzer işte neyi değiştirdiğini göster. Başkalarını suçlamak veya hiç hata yapmadığını söylemek yerine gelişim kanıtı sun.'),
  p('16','Cuma','12.30','vaka-calismasi-sunumu','Vaka çalışmasını sunma','vaka-sunumu.png','VAKA SUNUMU',
    ['Sonucu göstermeden','önce düşünme','yolunu kur.'],['Sorun, varsayım ve','öneriyi ayır.'],
    [['Sorunu tanımla','Ne çözülüyor ve sınır ne?'],['Veriyi açıkla','Kullandığın bilgi ve varsayımlar.'],['Öneriyi bağla','Neden bu çözüm ve nasıl ölçülür?']],
    ['Kaynağın belli mi?','Varsayımını işaretledin mi?','Riskleri söyledin mi?'],['Tek doğruyu savunma.','Mantığını görünür kıl.'],
    'Vaka çalışmasını sunarken önce problemi ve kapsamı netleştir. Kullandığın verileri, eksik bilgiler için yaptığın varsayımları ve değerlendirdiğin seçenekleri göster. Önerini ölçülebilir bir hedefe bağla ve risklerini belirt. Amaç tek doğruyu bulmuş gibi görünmek değil, düşünme biçimini anlaşılır kılmaktır.'),
  p('16','Cuma','20.30','sunum-heyecani','Sunum sırasında heyecanı yönetme','sunum-heyecani.png','SUNUM',
    ['Heyecanı yok etmeye','çalışma.','Yönetilebilir hâle getir.'],['İlk cümleyi bil,','nefesini ve hızını koru.'],
    [['Başlangıcı hazırla','İlk iki cümleyi netleştir.'],['Durak kullan','Hızlandığında kısa ara ver.'],['Notu küçült','Tam metin yerine anahtar sözcük.']],
    ['Süreyi prova ettin mi?','Su yakınında mı?','Teknik dosyan hazır mı?'],['Yavaşla ve durakla.','Heyecan görünse de devam et.'],
    'Sunum heyecanını tamamen yok etmeye çalışmak yerine yönetilebilir hâle getir. İlk iki cümleni ve sunum akışını önceden bil, tam metin yerine anahtar sözcükler kullan. Hızlandığını fark ettiğinde kısa bir durak ver ve nefesine dön. Küçük bir prova, belirsizliği önemli ölçüde azaltır.'),
  p('17','Cumartesi','12.30','beklenti-netlestirme','Göreve başlamadan beklentiyi netleştirme','beklenti-netlestirme.png','GÖREV BAŞLANGICI',
    ['Görevi aldın.','Hemen üretmeye','başlama.'],['Beklenen çıktıyı','kendi cümlenle doğrula.'],
    [['Çıktıyı sor','Dosya, rapor veya sunum mu?'],['Ölçütü öğren','İyi sonuç nasıl değerlendirilecek?'],['Tarihi netleştir','Teslim ve ara kontrol zamanı.']],
    ['Öncelik belli mi?','Örnek çıktı var mı?','Yetkin ve erişimin hazır mı?'],['Çıktı + ölçüt + tarih.','Başlamadan önce üçünü bil.'],
    'Yeni bir göreve başlamadan önce beklenen çıktıyı, değerlendirme ölçütünü ve teslim zamanını netleştir. Görevi kendi cümlenle tekrar ederek doğru anladığını doğrula. Gerekli dosya veya erişim eksikse başta belirt ve uygun bir ara kontrol zamanı öner. Bu kısa konuşma gereksiz yeniden çalışmayı azaltır.'),
  p('17','Cumartesi','20.30','oncelik-cakismasi','Çakışan öncelikleri yöneticiye bildirme','oncelik-cakismasi.png','ÖNCELİK YÖNETİMİ',
    ['İki acil görev','aynı anda','geldiyse sessiz kalma.'],['Durumu ve seçenekleri','erken paylaş.'],
    [['Listele','Görev, tarih ve tahmini süre.'],['Çakışmayı göster','İkisini birlikte etkileyen nokta.'],['Öncelik iste','Hangi sırayla ilerlemelisin?']],
    ['Risk ne zaman başlıyor?','Alternatif önerdin mi?','Kararı not ettin mi?'],['Sorunu erken görünür kıl.','Önceliği birlikte netleştir.'],
    'İki önemli görev aynı zamana geldiğinde yetiştiremeyeceğini son anda söyleme. Görevleri, teslim tarihlerini ve tahmini sürelerini kısa biçimde paylaş; çakışmanın etkisini açıkla. Mümkünse iki seçenek öner ve yöneticinden öncelik sırası iste. Verilen kararı not ederek yeni planını güncelle.'),
  p('18','Pazar','12.30','kurumsal-mesajlasma','Kurumsal mesajlaşmada profesyonellik','kurumsal-mesaj.png','İŞ YERİNDE MESAJ',
    ['“Merhaba” yazıp','cevap bekleme.','Amacını aynı mesajda söyle.'],['Bağlam, istek ve','zamanı kısa tut.'],
    [['Bağlam ver','Hangi görev veya konuşma?'],['İsteği belirt','Karşı taraftan ne bekliyorsun?'],['Zamanı ekle','Gerçekten gerekli bir tarih varsa.']],
    ['Mesaj tek başına anlaşılır mı?','Üslup uygun mu?','Gereksiz aciliyet var mı?'],['Selam + bağlam + istek.','Tek, anlaşılır mesaj gönder.'],
    'Kurumsal mesajlaşmada yalnızca “merhaba” yazıp devamı için cevap beklemek yerine selam, kısa bağlam ve isteğini aynı mesajda belirt. Gerçek bir son tarih varsa açıkça yaz; gereksiz aciliyet oluşturma. Mesajı göndermeden önce karşı tarafın tek okumada ne yapması gerektiğini anlayıp anlamayacağını düşün.'),
  p('18','Pazar','20.30','toplanti-daveti','Toplantı davetine doğru yanıt verme','toplanti-daveti.png','TAKVİM DÜZENİ',
    ['Davet geldi.','Takvimde sessizce','bekletme.'],['Katılımını ve varsa','çakışmayı zamanında bildir.'],
    [['Amacı oku','Başlık, açıklama ve gündem.'],['Takvimi karşılaştır','Saat ve hazırlık süresi.'],['Yanıt ver','Kabul, ret veya yeni zaman önerisi.']],
    ['Saat dilimi doğru mu?','Bağlantı ve konum var mı?','Hazırlık gerekiyor mu?'],['Davet bir sorudur.','Zamanında yanıtla.'],
    'Toplantı davetini aldığında başlığı, gündemi, saati ve konumu kontrol et. Katılabiliyorsan kabul et; çakışma varsa sessiz bırakmak yerine kısa açıklamayla alternatif zaman öner. Saat dilimine ve çevrim içi bağlantıya dikkat et. Hazırlık gerektiren dosyaları davetin not bölümünden önceden incele.'),
  p('19','Pazartesi','12.30','dosya-bilgi-isteme','İş arkadaşından dosya veya bilgi isteme','dosya-isteme.png','İŞ BİRLİĞİ',
    ['“Dosyayı atar mısın?”','yerine hangi dosya','ve neden söyle.'],['Karşı tarafın arama','yükünü azalt.'],
    [['Dosyayı tanımla','Adı, tarihi veya ilgili proje.'],['Amacı belirt','Nerede kullanacağın.'],['Zamanı söyle','Gerçek ihtiyacın olan tarih.']],
    ['Doğru kişiye mi soruyorsun?','Paylaşım yetkisi uygun mu?','Önce mevcut klasöre baktın mı?'],['Ne + neden + ne zaman.','İsteğini netleştir.'],
    'Bir dosya veya bilgi isterken neye ihtiyaç duyduğunu, hangi iş için kullanacağını ve ne zamana gerektiğini açıkça belirt. Önce erişebildiğin ortak klasörleri kontrol et. Dosyada hassas bilgi varsa uygun paylaşım kanalını kullan ve karşı tarafın yetkisini varsayma. Net istek, gereksiz yazışmayı azaltır.'),
  p('19','Pazartesi','20.30','mesai-disi-iletisim','Mesai dışı iletişim sınırlarını anlama','mesai-disi.png','ÇALIŞMA SINIRI',
    ['Mesaj geldiyse','hemen cevap şart mı?','Düzeni öğren.'],['Ekip beklentisini','başta netleştir.'],
    [['Kuralı sor','Çalışma saatleri ve acil kanal.'],['Bildirimi düzenle','Gereksiz kesintiyi azalt.'],['Acil durumu ayır','Gerçek acil ile bekleyebilen iş.']],
    ['Kurum politikası belli mi?','Nöbet veya özel görev var mı?','Ertesi gün yanıt uygun mu?'],['Sınırı varsayma.','Beklentiyi ekipçe netleştir.'],
    'Mesai dışı mesajlara nasıl yaklaşılacağını kurumun çalışma düzeni ve rolün belirler. Başlangıçta ulaşılabilirlik beklentisini, gerçek acil durum kanalını ve normal yanıt süresini sor. Özel nöbet veya görev yoksa bildirimleri düzenleyerek dinlenme alanını koru. Belirsizlik olduğunda sessizce varsaymak yerine yöneticinle netleştir.'),
  p('20','Salı','12.30','ogrendigini-paylasma','Stajda öğrendiğini ekipte paylaşma','bilgi-paylasma.png','BİLGİ PAYLAŞIMI',
    ['Yeni bir şey','öğrendin.','Ekibe de değer üret.'],['Kısa örnek ve kaynakla','paylaşılabilir hâle getir.'],
    [['Konuyu daralt','Tek yöntem veya küçük keşif.'],['Örneği hazırla','İşte nerede kullanılabilir?'],['Kaynağı ekle','Doğrulanabilir ve erişilebilir bağlantı.']],
    ['Bilgi kurum için uygun mu?','Örnek çalışıyor mu?','Paylaşım kısa mı?'],['Öğren, uygula, paylaş.','Küçük bilgi de değer yaratır.'],
    'Stajda öğrendiğin faydalı bir yöntemi ekiple paylaşmadan önce konuyu daralt ve işe bağlanan küçük bir örnek hazırla. Kaynağını belirt, bilmediğin noktayı kesin bilgi gibi sunma. Kısa bir not veya beş dakikalık anlatım çoğu zaman yeterlidir. Kuruma ait gizli bilgileri örneğe taşımamaya dikkat et.'),
  p('20','Salı','20.30','staj-degerlendirmesi','Staj değerlendirme görüşmesine hazırlanma','degerlendirme.png','DEĞERLENDİRME',
    ['Değerlendirmeye','yalnızca dinlemeye','gitme.'],['Kanıtlarını ve','sorularını hazırla.'],
    [['Çıktıları seç','Tamamladığın somut işler.'],['Gelişimi göster','İlk haftaya göre değişen beceri.'],['Soru hazırla','Bir güçlü yön, bir gelişim alanı.']],
    ['Örneklerin doğrulanabilir mi?','Geri bildirime açık mısın?','Sonraki hedefin belli mi?'],['Kanıt + öğrenme + hedef.','Görüşmeyi gelişime çevir.'],
    'Staj değerlendirme görüşmesinden önce tamamladığın işleri ve aldığın geri bildirimleri gözden geçir. İlk haftaya göre gelişen bir becerini somut örnekle anlat. Yöneticinden güçlü yönün ve üzerinde çalışman gereken alan için açık geri bildirim iste. Görüşme sonunda bir sonraki gelişim hedefini netleştir.'),
  p('21','Çarşamba','12.30','staj-devir-dosyasi','Staj bitiş teslim dosyasını düzenleme','devir-dosyasi.png','DEVİR TESLİM',
    ['Staj biterken','bilgi sende','kalmasın.'],['Dosya, durum ve','sonraki adımı devret.'],
    [['Dosyaları topla','Onaylı son sürümler ve doğru klasör.'],['Durumu yaz','Tamamlanan, açık ve bekleyen işler.'],['Erişimi temizle','Kişisel cihaz ve hesapları ayır.']],
    ['Dosya adları anlaşılır mı?','Açık işler sorumlusuyla belli mi?','Gizli kopya sende kaldı mı?'],['Düzenli bırak.','Sonraki kişi kaldığı yerden başlasın.'],
    'Staj bitiminde onaylı son dosyaları kurumun belirlediği klasörde düzenle. Tamamlanan, açık ve bekleyen işleri kısa bir devir notunda belirt; ilgili kişi ve sonraki adımı yaz. Kişisel cihazındaki kurum dosyalarını politika doğrultusunda temizle ve hesap erişimlerinin kapatılmasını doğrula.'),
  p('21','Çarşamba','20.30','yaptigin-isi-sunma','Yaptığın işi kısa sunumla anlatma','kisa-sunum.png','İŞ SUNUMU',
    ['Yaptığın işi','dosya listesiyle','anlatma.'],['Problem, katkı ve','sonuç akışını kullan.'],
    [['Problemi aç','İş neden gerekliydi?'],['Katkını ayır','Sen hangi kararı ve işi üstlendin?'],['Sonucu göster','Çıktı ve öğrenilen ders.']],
    ['Süreye sığıyor mu?','Ekip katkısı doğru mu?','Gizli bilgi temiz mi?'],['Problem + katkı + sonuç.','Üç dakikada anlaşılır ol.'],
    'Yaptığın işi sunarken önce hangi problemi çözdüğünü, ardından kendi katkını ve ortaya çıkan sonucu anlat. Ekip çalışmasını tamamen kendine mal etme; karar verdiğin veya ürettiğin kısmı açıkça ayır. Sunumu birkaç dakikaya sığdır ve kurumun gizli bilgilerini göstermeden önce izin sınırlarını kontrol et.'),
  p('22','Perşembe','12.30','kariyer-hedefi-cumlesi','Kariyer hedefi cümlesi oluşturma','kariyer-hedefi.png','KARİYER YÖNÜ',
    ['“Başarılı olmak','istiyorum” hedef','değildir.'],['Alan, katkı ve','öğrenme yönünü birleştir.'],
    [['Alanı seç','Şimdilik ilgilendiğin çalışma alanı.'],['Katkıyı düşün','Hangi probleme yardım etmek istiyorsun?'],['Yakın adımı yaz','Önümüzdeki altı ayda ne deneyeceksin?']],
    ['Hedef çok genel mi?','Değişebilir olduğunu kabul ediyor musun?','Yakın adım ölçülebilir mi?'],['Yön gösteren cümle yaz.','Ömür boyu söz verme.'],
    'Kariyer hedefi cümlen kesin bir ömür planı olmak zorunda değildir. Şimdilik ilgilendiğin alanı, katkı vermek istediğin problem türünü ve yakın dönemde deneyeceğin adımı birleştir. “Başarılı olmak” gibi ölçülemeyen sözler yerine yön gösteren, gerektiğinde güncellenebilir bir cümle kur.'),
  p('22','Perşembe','20.30','gelisim-haritasi','Bir sonraki staj için gelişim haritası','gelisim-haritasi.png','GELİŞİM HARİTASI',
    ['Sonraki staj için','rastgele kurs','biriktirme.'],['Hedef rol, mevcut kanıt','ve tek boşluk seç.'],
    [['Hedef rolü belirle','Yakın dönemde denemek istediğin görev.'],['Kanıtını çıkar','Şu anda gösterebildiğin beceriler.'],['Tek boşluğu seç','Bir proje veya deneyimle kapat.']],
    ['Hedef rol gerçek ilanlara dayanıyor mu?','Planın küçük ve uygulanabilir mi?','Çıktı üretecek misin?'],
    ['Bir boşluk, bir proje, bir tarih.','Gelişimi görünür kıl.'],
    'Bir sonraki staj için gelişim planı yaparken gerçek ilanlardan hedef bir rol seç. Mevcut projelerinle gösterebildiğin becerileri çıkar ve en önemli tek boşluğu belirle. Bu boşluğu kapatacak küçük bir proje, ders veya sorumluluk seçip tarih koy. Kurs sayısını değil ürettiğin kanıtı artır.'),
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
  kod: post.kod, ad: post.ad, surum: SURUM, guncellendi: '2026-09-15', metin: post.metin, etiketler: post.etiketler,
  kartlar: [1, 2, 3, 4].map((no) => `/paylasim/${post.kod}/${String(no).padStart(2, '0')}-${SURUM}.jpg`),
}));
fs.writeFileSync(manifestYolu, `${JSON.stringify([...oncekiSetler, ...yeniSetler], null, 2)}\n`);
console.log(`${yeniSetler.length} gönderi ve ${yeniSetler.length * 4} kart panel paketine eklendi.`);
