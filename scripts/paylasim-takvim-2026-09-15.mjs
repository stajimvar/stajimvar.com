/** 15-21 Eylül 2026 için günde iki fotoğraflı Instagram karuseli üretir. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { KOK, PAYLASIM } from './paylasim-sablonu.mjs';

const EN = 1080;
const BOY = 1440;
const SURUM = 'v1';
const MAVI = '#1263F6';
const LACIVERT = '#081A33';
const ACIK_MAVI = '#DCEBFF';
const BEYAZ = '#FFFFFF';
const FONT = 'Segoe UI, Arial, Helvetica, sans-serif';
const fotoKlasoru = path.join(KOK, 'assets', 'instagram', 'takvim-20260915');
const logo64 = fs.readFileSync(path.join(KOK, 'assets', 'logo-kaynak.png')).toString('base64');

const kacir = (deger) => String(deger)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const yazi = (x, y, metin, { boyut = 30, renk = LACIVERT, kalin = 500, hiza = 'start' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${boyut}" font-weight="${kalin}" fill="${renk}" text-anchor="${hiza}">${kacir(metin)}</text>`;
const satirlar = (x, y, diziler, ayar = {}) => diziler
  .map((satir, i) => yazi(x, y + i * (ayar.aralik ?? 66), satir, ayar)).join('');

const postlar = [
  {
    kod: '2026-09-15-1230-cv-guclu-madde', ad: '15 Eylül 2026 Salı • 12.30 • CV’de güçlü madde yazma', foto: 'cv-guclu-madde.png', seri: 'CV ATÖLYESİ',
    kanca: ['CV’ndeki madde', 'görev değil,', 'kanıt anlatsın.'], giris: ['“Sunum hazırladım” yerine', 'nasıl ve neden yaptığını göster.'],
    adimlar: [['Fiille başla', 'Analiz ettim, tasarladım, düzenledim.'], ['İşi somutlaştır', 'Hangi araçla, hangi kapsamda?'], ['Sonucu göster', 'Ne kolaylaştı veya ne öğrendin?']],
    kontrol: ['Her madde tek katkını anlatıyor mu?', 'Ekipte senin payın anlaşılıyor mu?', 'Kanıtlayamayacağın sayı var mı?'], kapanis: ['Bugün CV’nden', 'tek maddeyi yeniden yaz.'],
    metin: 'CV’de güçlü bir madde yalnızca yaptığın görevi saymaz; katkını ve ortaya çıkan sonucu görünür kılar. “Sunum hazırladım” gibi genel bir cümleyi güçlü bir fiille başlat, kullandığın yöntemi veya aracı belirt ve gerçek sonucu ekle. Sayı kullanacaksan kanıtlayabildiğinden emin ol. Ekip çalışmasında bütün projenin değil, kendi payının ne olduğunu açıkça yaz.',
    etiketler: ['#stajcv', '#cvhazırlama', '#stajbaşvurusu', '#kariyer', '#öğrenci', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-15-2030-ilan-okuma', ad: '15 Eylül 2026 Salı • 20.30 • Staj ilanını doğru okuma', foto: 'ilan-okuma.png', seri: 'İLAN OKUMA',
    kanca: ['İlan uzun olabilir.', 'Sen önce bu', '3 şeyi bul.'], giris: ['Her satıra aynı ağırlığı verme.', 'Rolün özünü ayır.'],
    adimlar: [['Günlük görev', 'Bu rolde gerçekten ne yapacaksın?'], ['Temel beklenti', 'Tekrarlanan beceriler hangileri?'], ['Koşullar', 'Konum, süre ve çalışma düzeni ne?']],
    kontrol: ['Karşılayabildiğin beklentileri işaretle.', 'Eksik ama öğrenilebilir olanları ayır.', 'Uymayan temel koşulu görmezden gelme.'], kapanis: ['Başvurmadan önce', 'ilanı üç renkle işaretle.'],
    metin: 'Staj ilanını doğru okumak, her koşulu eksiksiz karşılamaya çalışmak değildir. Önce günlük görevleri, tekrar eden temel beklentileri ve çalışma koşullarını ayır. Karşıladığın maddeleri CV’ndeki gerçek kanıtlarla eşleştir; öğrenebileceğin eksikleri ayrıca not et. Konum, süre veya çalışma düzeni sana uymuyorsa bunu baştan görmek hem zamanını hem de başvuru enerjini korur.',
    etiketler: ['#stajilanı', '#stajbaşvurusu', '#kariyer', '#işarama', '#öğrenci', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-16-1230-star-cevabi', ad: '16 Eylül 2026 Çarşamba • 12.30 • STAR yöntemiyle cevap verme', foto: 'star-cevabi.png', seri: 'MÜLAKAT',
    kanca: ['Örneğin var.', 'Ama anlatırken', 'dağılıyor musun?'], giris: ['Cevabını dört durakta kur:', 'durum, görev, eylem, sonuç.'],
    adimlar: [['Durum + görev', 'Bağlamı ve senden bekleneni kısalt.'], ['Eylem', 'Senin yaptığın adımları açıkça anlat.'], ['Sonuç', 'Çıktıyı ve öğrendiğin dersi bağla.']],
    kontrol: ['Bağlam cevabın yarısını kaplıyor mu?', '“Biz” yerine kendi katkın duyuluyor mu?', 'Sonuç gerçek ve açıklanabilir mi?'], kapanis: ['Bir örneğini seç.', '60 saniyede sesli anlat.'],
    metin: 'STAR yöntemi, mülakatta gerçek bir örneği dağılmadan anlatmana yardımcı olur. Durumu ve senden beklenen görevi kısa tut; cevabın ağırlığını kendi eylemlerine ver. Sonuç bölümünde yalnız başarıyı değil, öğrendiğin dersi de söyleyebilirsin. Ezberlenmiş bir metin okumak yerine dört durağı not al ve aynı örneği yaklaşık bir dakikada sesli prova et.',
    etiketler: ['#stajmülakatı', '#mülakat', '#staryöntemi', '#kariyer', '#öğrenci', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-16-2030-basvuru-takibi', ad: '16 Eylül 2026 Çarşamba • 20.30 • Başvuru sonrası doğru takip', foto: 'basvuru-takibi.png', seri: 'BAŞVURU TAKİBİ',
    kanca: ['Başvurdun.', 'Peki ne zaman', 'takip etmelisin?'], giris: ['Hemen yazma.', 'Önce ilandaki süreci kontrol et.'],
    adimlar: [['Süreyi oku', 'İlanda dönüş tarihi belirtilmiş olabilir.'], ['Makul bekle', 'Belirtilen süre dolmadan hatırlatma yapma.'], ['Kısa yaz', 'Rolü, tarihi ve ricayı tek mesajda söyle.']],
    kontrol: ['Doğru kişiye mi yazıyorsun?', 'Başvuru tarihini belirttin mi?', 'Nazik ve baskısız bir rica mı?'], kapanis: ['Tek takip yeter.', 'Sonra sıradaki başvuruya geç.'],
    metin: 'Başvuru sonrası takip mesajı, süreci hızlandırma talebi değil; başvurunun durumunu nazikçe sorma yoludur. Önce ilanda dönüş takvimi olup olmadığını kontrol et ve belirtilen süre dolmadan yazma. Mesajında başvurduğun rolü, başvuru tarihini ve kısa durum ricani belirt. Yanıt gelmezse art arda mesaj göndermek yerine başvuru planına devam et.',
    etiketler: ['#başvurutakibi', '#stajbaşvurusu', '#işarama', '#kariyer', '#öğrenci', '#eposta', '#stajimvar'],
  },
  {
    kod: '2026-09-17-1230-ilk-gun-hazirligi', ad: '17 Eylül 2026 Perşembe • 12.30 • Stajın ilk gününe hazırlık', foto: 'ilk-gun-hazirligi.png', seri: 'İLK GÜN',
    kanca: ['İlk günün', 'sabahı değil,', 'akşamı hazırlan.'], giris: ['Küçük hazırlıklar', 'ilk sabahın stresini azaltır.'],
    adimlar: [['Rotayı doğrula', 'Giriş saati, adres ve ulaşım planı.'], ['Gerekliyi hazırla', 'Kimlik, bilgisayar ve istenen belgeler.'], ['İlk soruyu yaz', 'Kime ulaşacağını ve ilk adımı öğren.']],
    kontrol: ['Kıyafet beklentisi net mi?', 'Yetkili kişinin iletişimi sende mi?', 'On dakika erken varabilecek misin?'], kapanis: ['Çantanı hazırla.', 'Sabah yalnızca yola çık.'],
    metin: 'Stajın ilk gününde her şeyi bilmen beklenmez; zamanında ve hazırlıklı gelmen yeterlidir. Bir önceki akşam adresi, giriş saatini ve ulaşımı doğrula. Kurumun istediği belge veya ekipmanı hazırla, iletişim kuracağın kişinin bilgisini kaydet. İlk günün hedefini “her şeyi öğrenmek” değil, çalışma düzenini anlamak ve doğru kişilere doğru soruları sormak olarak belirle.',
    etiketler: ['#stajdailkgün', '#ilkstaj', '#stajyer', '#kariyer', '#öğrenci', '#işhayatı', '#stajimvar'],
  },
  {
    kod: '2026-09-17-2030-yardim-isteme', ad: '17 Eylül 2026 Perşembe • 20.30 • İş yerinde doğru yardım isteme', foto: 'yardim-isteme.png', seri: 'İŞ YERİNDE İLETİŞİM',
    kanca: ['“Yapamadım” deme.', 'Nerede takıldığını', 'göster.'], giris: ['İyi soru, karşı tarafın', 'hızlı yardım etmesini sağlar.'],
    adimlar: [['Hedefi söyle', 'Ne üretmeye çalışıyorsun?'], ['Denediğini göster', 'Hangi adımları uyguladın?'], ['Engeli tarif et', 'Tam olarak nerede ilerleyemiyorsun?']],
    kontrol: ['Soruyu toplu ve kısa hazırladın mı?', 'Ekran veya dosya hazır mı?', 'Aldığın cevabı not edecek misin?'], kapanis: ['Yardım istemek değil,', 'belirsiz bırakmak zaman kaybettirir.'],
    metin: 'İş yerinde yardım isterken yalnızca “yapamadım” demek, sorunu karşı tarafın baştan keşfetmesine neden olur. Önce hedefini, denediğin adımları ve takıldığın noktayı kısa biçimde anlat. İlgili ekranı veya dosyayı hazır tut ve aldığın yönlendirmeyi not et. Böylece hem daha hızlı yardım alır hem de aynı sorunu tekrar yaşadığında kendi başına ilerleyebilirsin.',
    etiketler: ['#işyerindeiletişim', '#stajyer', '#stajipuçları', '#kariyer', '#öğrenci', '#işhayatı', '#stajimvar'],
  },
  {
    kod: '2026-09-18-1230-linkedin-profil', ad: '18 Eylül 2026 Cuma • 12.30 • Öğrenci LinkedIn profili', foto: 'linkedin-profil.png', seri: 'DİJİTAL PROFİL',
    kanca: ['Profilin dolu olabilir.', 'Ama ne aradığın', 'anlaşılıyor mu?'], giris: ['Öğrenci profili için', 'üç bölüm yeterince güçlü olabilir.'],
    adimlar: [['Başlık', 'Bölüm + ilgi alanı + hedef rol.'], ['Hakkında', 'Odağın ve tek gerçek kanıtın.'], ['Projeler', 'Ne yaptığın ve ortaya çıkan çıktı.']],
    kontrol: ['Fotoğrafın sade ve güncel mi?', 'Genel sıfatlar yerine kanıt var mı?', 'İletişim ve bağlantılar çalışıyor mu?'], kapanis: ['Profilini bir yabancı gibi', '30 saniye incele.'],
    metin: 'Öğrenci LinkedIn profilinde uzun bir deneyim listesi olmayabilir; buna rağmen yönün net görünebilir. Başlıkta bölümünü, ilgi alanını ve hedeflediğin rolü bir araya getir. Hakkında bölümünde tek bir somut proje veya çalışmayla odağını kanıtla. Projeleri yalnız isimleriyle bırakma; kendi katkını, kullandığın yöntemi ve ortaya çıkan çıktıyı kısa biçimde anlat.',
    etiketler: ['#linkedinprofili', '#öğrenci', '#kariyer', '#kişiselmarka', '#stajbaşvurusu', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-18-2030-haftalik-staj-gunlugu', ad: '18 Eylül 2026 Cuma • 20.30 • Haftalık staj günlüğü', foto: 'haftalik-staj-gunlugu.png', seri: 'STAJ GÜNLÜĞÜ',
    kanca: ['Hafta bitti.', 'Peki ne öğrendiğin', 'aklında kalacak mı?'], giris: ['Beş dakikalık haftalık not', 'gelişimini görünür kılar.'],
    adimlar: [['Yaptım', 'Tamamladığın somut işleri yaz.'], ['Öğrendim', 'Yeni yöntem veya iş bilgisini kaydet.'], ['Sıradaki', 'Gelecek haftanın ilk hedefini seç.']],
    kontrol: ['Bir zorluğu dürüstçe yazdın mı?', 'Geri bildirimden ne değişti?', 'Portföye dönüşebilecek kanıt var mı?'], kapanis: ['Her cuma', 'üç başlık, beş dakika.'],
    metin: 'Haftalık staj günlüğü yalnızca rapor teslim etmek için tutulmaz; ne öğrendiğini ve nasıl ilerlediğini görmeni sağlar. Her cuma tamamladığın işleri, öğrendiğin tek önemli dersi ve gelecek haftanın ilk hedefini yaz. Zorlandığın noktayı ve aldığın geri bildirimle neyi değiştirdiğini ekle. Bu notlar daha sonra CV, portföy ve mülakat örnekleri için gerçek malzeme olur.',
    etiketler: ['#stajgünlüğü', '#stajyer', '#kariyergelişimi', '#öğrenci', '#işhayatı', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-19-1230-portfoy-kaniti', ad: '19 Eylül 2026 Cumartesi • 12.30 • Portföyde çalışma kanıtı', foto: 'portfoy-kaniti.png', seri: 'PORTFÖY',
    kanca: ['Yalnız sonucu değil,', 'nasıl düşündüğünü', 'de göster.'], giris: ['Güçlü portföy bir galeri değil,', 'kısa bir süreç hikâyesidir.'],
    adimlar: [['Sorun', 'Neyi çözmeye çalıştın?'], ['Süreç', 'Hangi kararları neden verdin?'], ['Çıktı', 'Ne ürettin ve ne öğrendin?']],
    kontrol: ['Kendi katkın açık mı?', 'Gizli kurum verisi var mı?', 'Görseller okunabilir ve düzenli mi?'], kapanis: ['Bir projeni seç.', 'Üç kanıtla hikâyeye dönüştür.'],
    metin: 'Portföyde yalnızca bitmiş sonucu göstermek, senin nasıl düşündüğünü saklar. Projeyi çözmeye çalıştığın sorunla başlat; araştırma, deneme ve karar aşamalarından seçilmiş kanıtlar ekle. Kendi katkını ekip çalışmasından ayır ve öğrendiğin dersi yaz. Kuruma ait gizli bilgileri, kişisel verileri veya paylaşma iznin olmayan dosyaları kesinlikle kullanma.',
    etiketler: ['#portföy', '#öğrenciportföyü', '#kariyer', '#proje', '#stajbaşvurusu', '#öğrenci', '#stajimvar'],
  },
  {
    kod: '2026-09-19-2030-ret-sonrasi', ad: '19 Eylül 2026 Cumartesi • 20.30 • Staj reddinden sonra ilerleme', foto: 'ret-sonrasi.png', seri: 'BAŞVURU SÜRECİ',
    kanca: ['Ret mesajı', 'yetersiz olduğunun', 'kanıtı değildir.'], giris: ['Sonucu kişiselleştirmeden', 'süreci geliştirebilirsin.'],
    adimlar: [['Kaydı güncelle', 'Rolü, tarihi ve sonucu not et.'], ['Varsayım yapma', 'Sebebi bilmiyorsan hikâye kurma.'], ['Bir şeyi geliştir', 'CV, örnek veya hedef listenden biri.']],
    kontrol: ['Rol gerçekten sana uygun muydu?', 'Başvurun somut kanıt içeriyor muydu?', 'Sıradaki başvuru ne zaman?'], kapanis: ['Bir sonuç durdurmasın.', 'Veriyi al, planına dön.'],
    metin: 'Staj başvurusundan ret almak, tek başına yeteneğin veya geleceğin hakkında kesin bir karar değildir. Sonucu başvuru kaydına ekle; sebebi bilmiyorsan kendi hakkında olumsuz bir hikâye kurma. Bunun yerine kontrol edebildiğin tek bir alan seç: CV’deki kanıtları güçlendirmek, hedef şirket listesini iyileştirmek veya mülakat örneklerini prova etmek. Ardından sıradaki başvuruya dön.',
    etiketler: ['#stajbaşvurusu', '#işarama', '#kariyer', '#motivasyon', '#öğrenci', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-20-1230-basvuru-plani', ad: '20 Eylül 2026 Pazar • 12.30 • Haftalık başvuru planı', foto: 'basvuru-plani.png', seri: 'HAFTALIK PLAN',
    kanca: ['Bir gecede', '20 başvuru değil.', 'Haftaya yayılan plan.'], giris: ['Az ama araştırılmış başvuru', 'takibi kolaylaştırır.'],
    adimlar: [['Pazartesi', 'Hedef roller ve şirketler.'], ['Hafta içi', 'CV uyarlama ve başvurular.'], ['Cuma', 'Kayıt, takip ve kısa değerlendirme.']],
    kontrol: ['Her başvurunun kaynağı kayıtlı mı?', 'Son tarihleri doğruladın mı?', 'Takip günü takvimde mi?'], kapanis: ['Takvimine üç blok koy.', 'Ara, hazırla, takip et.'],
    metin: 'Haftalık başvuru planı, ilanları rastgele kaydetmek yerine düzenli ilerlemeni sağlar. Haftanın başında hedef rolleri ve şirketleri belirle; hafta içinde uygun ilanlara göre CV’ni uyarlayıp başvur. Cuma günü başvuru tarihlerini, bağlantıları ve takip zamanlarını kaydet. Sayıyı büyütmekten önce her başvurunun gerçek ve doğrulanmış bir kaynağa dayandığından emin ol.',
    etiketler: ['#başvuruplanı', '#stajbaşvurusu', '#işarama', '#zamanyönetimi', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-20-2030-departman-kesfi', ad: '20 Eylül 2026 Pazar • 20.30 • Sana uygun departmanı keşfetme', foto: 'departman-kesfi.png', seri: 'KARİYER KEŞFİ',
    kanca: ['Bölümün tek bir', 'departmana çıkmaz.', 'İşi gözlemle.'], giris: ['Departman adından önce', 'günlük iş biçimine bak.'],
    adimlar: [['Görevleri incele', 'Günün çoğu hangi işlerle geçiyor?'], ['İnsanlarla konuş', 'Bir çalışana gerçek rutini sor.'], ['Küçük deneme yap', 'Ders, kulüp veya kişisel proje.']],
    kontrol: ['Analiz mi, üretim mi, iletişim mi?', 'Tek başına mı ekipte mi rahatsın?', 'Hangi işte zaman hızlı geçiyor?'], kapanis: ['Unvan seçmeden önce', 'çalışma biçimini keşfet.'],
    metin: 'Üniversite bölümün seni yalnızca tek bir departmana yönlendirmez. Sana uygun alanı keşfetmek için unvanlardan önce günlük görevleri incele. O alanda çalışan birine tipik bir gününü sor ve küçük bir ders, kulüp veya kişisel projeyle işi dene. Analiz, üretim, iletişim ve ekip çalışması tercihlerinin hangi görevlerde güçlendiğini not et.',
    etiketler: ['#kariyerkeşfi', '#departman', '#meslekseçimi', '#öğrenci', '#staj', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-21-1230-cv-son-kontrol', ad: '21 Eylül 2026 Pazartesi • 12.30 • CV için 10 saniyelik son kontrol', foto: 'cv-son-kontrol.png', seri: 'CV SON KONTROL',
    kanca: ['CV’ne yalnızca', '10 saniye bak.', 'İlk ne görünüyor?'], giris: ['Son kontrolü yazardan değil,', 'okuyucudan yana yap.'],
    adimlar: [['Hiyerarşi', 'Başlıklar ve tarihler kolay seçiliyor mu?'], ['İlgili kanıt', 'Role en yakın deneyim üstte mi?'], ['Temizlik', 'Yazım, boşluk ve dosya adı doğru mu?']],
    kontrol: ['Tek sayfa gerçekten okunaklı mı?', 'Bağlantılar açılıyor mu?', 'PDF adı profesyonel mi?'], kapanis: ['Göndermeden önce', 'PDF’yi telefonda da aç.'],
    metin: 'CV’ni göndermeden önce içeriği ezberlemiş bir yazar gibi değil, ilk kez gören biri gibi incele. On saniyede adın, hedefin ve role en yakın kanıtın seçilebiliyor mu? Başlıkların hiyerarşisini, tarihlerin tutarlılığını, yazımı ve boşlukları kontrol et. Dosyayı PDF olarak kaydet, bağlantıları dene ve dosya adını “AdSoyad-CV.pdf” gibi anlaşılır biçimde düzenle.',
    etiketler: ['#cvkontrolü', '#stajcv', '#cvhazırlama', '#stajbaşvurusu', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-21-2030-tesekkur-mesaji', ad: '21 Eylül 2026 Pazartesi • 20.30 • Mülakat sonrası teşekkür mesajı', foto: 'tesekkur-mesaji.png', seri: 'MÜLAKAT SONRASI',
    kanca: ['Mülakat bitti.', 'Kısa bir teşekkür', 'mesajı gönder.'], giris: ['Uzun bir mektup değil;', 'görüşmeye bağlı üç cümle.'],
    adimlar: [['Teşekkür et', 'Ayırdıkları zaman için.'], ['Bağ kur', 'Konuştuğunuz tek somut noktaya.'], ['İlgini belirt', 'Rolü neden istediğini kısaca hatırlat.']],
    kontrol: ['İsim ve kurum doğru mu?', 'Kopyala-yapıştır hissi var mı?', 'Yeni bir baskı yaratıyor mu?'], kapanis: ['Aynı gün veya', 'ertesi iş günü gönder.'],
    metin: 'Mülakat sonrası teşekkür mesajı, sonucu zorlamak için değil; görüşmeye verdiğin değeri göstermek için yazılır. Ayırdıkları zaman için teşekkür et, konuştuğunuz somut bir noktayı hatırlat ve role ilgini kısa biçimde yeniden belirt. Üç veya dört cümle yeterlidir. Kişi ve kurum adını son kez kontrol et; yanıt talep eden baskılı bir dil kullanma.',
    etiketler: ['#mülakatsonrası', '#teşekkürmesajı', '#stajmülakatı', '#kariyer', '#öğrenci', '#işarama', '#stajimvar'],
  },
];

function ust(seri, sayfa) {
  return `<image href="data:image/png;base64,${logo64}" x="64" y="52" width="56" height="56"/>
    ${yazi(136, 92, 'StajımVar', { boyut: 31, kalin: 800 })}
    ${yazi(1016, 92, sayfa, { boyut: 25, kalin: 800, hiza: 'end' })}
    <rect x="64" y="180" width="58" height="7" rx="4" fill="${MAVI}"/>
    ${yazi(64, 234, seri, { boyut: 23, renk: MAVI, kalin: 800 })}`;
}

function kartSvg({ foto64, post, no }) {
  const sayfa = `${String(no + 1).padStart(2, '0')} / 04`;
  let icerik = '';
  if (no === 0) {
    icerik = `${satirlar(64, 326, post.kanca, { boyut: 67, kalin: 850, aralik: 74 })}
      ${satirlar(64, 615, post.giris, { boyut: 30, kalin: 650, aralik: 43 })}
      <rect x="64" y="1165" width="952" height="150" rx="30" fill="${MAVI}"/>
      ${satirlar(102, 1222, ['Kaydır → 3 adımda uygula', 've son kontrolü yap.'], { boyut: 30, renk: BEYAZ, kalin: 800, aralik: 43 })}`;
  } else if (no === 1) {
    icerik = `${satirlar(64, 326, ['Üç adımda', 'uygula.'], { boyut: 68, kalin: 850, aralik: 76 })}
      ${post.adimlar.map((a, i) => {
        const y = 545 + i * 176;
        return `<rect x="64" y="${y - 66}" width="630" height="118" rx="24" fill="${i % 2 === 0 ? MAVI : LACIVERT}"/>
          <rect x="86" y="${y - 38}" width="48" height="48" rx="16" fill="${ACIK_MAVI}"/>
          ${yazi(110, y - 6, String(i + 1).padStart(2, '0'), { boyut: 19, renk: MAVI, kalin: 850, hiza: 'middle' })}
          ${yazi(158, y - 22, a[0], { boyut: 27, renk: BEYAZ, kalin: 850 })}${yazi(158, y + 18, a[1], { boyut: 19, renk: BEYAZ, kalin: 650 })}`;
      }).join('')}`;
  } else if (no === 2) {
    icerik = `${satirlar(64, 326, ['Göndermeden önce', 'kendine sor.'], { boyut: 64, kalin: 850, aralik: 72 })}
      ${post.kontrol.map((s, i) => `<rect x="64" y="${538 + i * 145}" width="630" height="104" rx="22" fill="${LACIVERT}"/>
        <circle cx="101" cy="${590 + i * 145}" r="22" fill="${MAVI}"/>
        ${yazi(101, 598 + i * 145, '✓', { boyut: 23, renk: BEYAZ, kalin: 900, hiza: 'middle' })}
        ${yazi(140, 599 + i * 145, s, { boyut: 20, renk: BEYAZ, kalin: 750 })}`).join('')}`;
  } else {
    icerik = `<rect x="64" y="300" width="12" height="230" rx="6" fill="${MAVI}"/>
      ${satirlar(108, 354, post.kapanis, { boyut: 67, kalin: 850, aralik: 76 })}
      <rect x="64" y="1138" width="952" height="177" rx="30" fill="${LACIVERT}"/>
      ${satirlar(102, 1205, ['Kaydet • uygula • paylaş', 'stajimvar.com'], { boyut: 31, renk: BEYAZ, kalin: 800, aralik: 46 })}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${EN}" height="${BOY}" viewBox="0 0 ${EN} ${BOY}">
    <image href="data:image/png;base64,${foto64}" x="0" y="0" width="${EN}" height="${BOY}" preserveAspectRatio="xMidYMid slice"/>
    ${ust(post.seri, sayfa)}${icerik}
  </svg>`;
}

export { BOY, EN, SURUM, kartSvg };
