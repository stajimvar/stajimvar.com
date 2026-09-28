/** 22-28 Eylül 2026 için ikinci haftanın 14 fotoğraflı karuselini ekler. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { KOK, PAYLASIM } from './paylasim-sablonu.mjs';
import { BOY, EN, SURUM, kartSvg } from './paylasim-takvim-2026-09-15.mjs';

const fotoKlasoru = path.join(KOK, 'assets', 'instagram', 'takvim-20260922');
const postlar = [
  {
    kod: '2026-09-22-1230-hedef-sirket-listesi', ad: '22 Eylül 2026 Salı • 12.30 • Hedef şirket listesi oluşturma', foto: 'hedef-sirket-listesi.png', seri: 'STAJ ARAMA',
    kanca: ['Her şirkete', 'başvurmak yerine', 'hedef liste kur.'], giris: ['İlan beklemeden önce', 'nerede çalışmak istediğini araştır.'],
    adimlar: [['Alanı seç', 'Öğrenmek istediğin iki çalışma alanı.'], ['Şirketi doğrula', 'Resmî kariyer sayfası ve gerçek faaliyet.'], ['Listeyi sınırla', 'Öncelikli, alternatif ve takip edilecek.']],
    kontrol: ['Bu şirket neden listende?', 'Staj veya genç yetenek kanalı var mı?', 'Resmî bağlantıyı kaydettin mi?'], kapanis: ['Bugün beş şirket seç.', 'Her biri için tek neden yaz.'],
    metin: 'Hedef şirket listesi, önüne çıkan her ilana rastgele başvurmak yerine araştırmanı yönlendirir. Önce öğrenmek istediğin iki çalışma alanını seç; ardından o alanlarda gerçekten faaliyet gösteren kurumların resmî kariyer sayfalarını bul. Şirketleri öncelikli, alternatif ve takip edilecek olarak ayır. Her kurumun yanına neden ilgilendiğini ve doğrulanmış başvuru bağlantısını yaz.',
    etiketler: ['#hedefşirket', '#stajbaşvurusu', '#işarama', '#kariyer', '#öğrenci', '#staj', '#stajimvar'],
  },
  {
    kod: '2026-09-22-2030-beceri-ogrenme-plani', ad: '22 Eylül 2026 Salı • 20.30 • İlandaki beceri için öğrenme planı', foto: 'beceri-ogrenme-plani.png', seri: 'BECERİ PLANI',
    kanca: ['İlanda bir', 'beceri eksik.', 'Peki öğrenilebilir mi?'], giris: ['Eksik gördüğün her madde', 'başvurmamak için neden değildir.'],
    adimlar: [['Temeli tanımla', 'Rol için hangi seviye gerçekten gerekli?'], ['Küçük kaynak seç', 'Tek ders veya kısa bir rehber.'], ['Kanıt üret', 'Beceriyi kullanan küçük bir çıktı.']],
    kontrol: ['Öğrenme hedefin ölçülebilir mi?', 'Bir haftaya sığacak kadar küçük mü?', 'Çıktıyı gösterebilecek misin?'], kapanis: ['Bir beceri seç.', 'Yedi günlük mini plan yap.'],
    metin: 'Bir ilandaki beceriyi henüz bilmiyor olman, onu öğrenemeyeceğin anlamına gelmez. Önce rolün gerçekten hangi seviyeyi beklediğini ayır; ardından tek bir başlangıç kaynağı seç. Öğrendiklerini küçük bir proje veya örnek çıktı üzerinde uygula. CV’ye yalnızca eğitimi izlediğini değil, beceriyi nerede kullandığını yaz. Yapmadığın veya açıklayamayacağın yetkinliği ekleme.',
    etiketler: ['#becerigelişimi', '#stajilanı', '#öğrenme', '#kariyer', '#öğrenci', '#stajbaşvurusu', '#stajimvar'],
  },
  {
    kod: '2026-09-23-1230-basvuru-dosyalari', ad: '23 Eylül 2026 Çarşamba • 12.30 • Başvuru dosyalarını düzenleme', foto: 'basvuru-dosyalari.png', seri: 'DOSYA DÜZENİ',
    kanca: ['Doğru CV’yi', 'yanlış ilana', 'gönderme.'], giris: ['Basit bir klasör düzeni', 'başvuru hatalarını azaltır.'],
    adimlar: [['Ana dosyayı koru', 'Güncel, düzenlenebilir CV kaynağı.'], ['Rol kopyası aç', 'Şirket ve pozisyona göre ayrı sürüm.'], ['Kanıtı sakla', 'İlan PDF’i, bağlantı ve gönderim tarihi.']],
    kontrol: ['Dosya adları anlaşılır mı?', 'Son sürüm kolayca seçiliyor mu?', 'Kişisel bilgiler güvenli yerde mi?'], kapanis: ['Tek klasör, net sürümler.', 'Başvurudan önce son kez aç.'],
    metin: 'Başvuru dosyalarını düzenlemek, yanlış CV sürümünü göndermeni ve ilan ayrıntılarını kaybetmeni önler. Güncel ana CV’ni ayrı tut; her rol için şirket ve pozisyon adıyla yeni bir kopya oluştur. İlan bağlantısını, gönderim tarihini ve kullandığın portföy dosyasını aynı klasörde sakla. Hassas kişisel belgeleri herkese açık bağlantılara yükleme ve paylaşım izinlerini kontrol et.',
    etiketler: ['#dosyadüzeni', '#stajcv', '#stajbaşvurusu', '#verimlilik', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-23-2030-kariyer-merkezi', ad: '23 Eylül 2026 Çarşamba • 20.30 • Kariyer merkezinden yararlanma', foto: 'kariyer-merkezi.png', seri: 'KAMPÜSTE KARİYER',
    kanca: ['Kariyer merkezine', 'yalnız ilan sormaya', 'gitme.'], giris: ['Hazırlıklı bir görüşme', 'daha somut destek getirir.'],
    adimlar: [['Hedefini götür', 'Aradığın rol ve sektör kısa olsun.'], ['Belgeni götür', 'CV veya portföyünden bir örnek.'], ['Tek soru seç', 'En çok nerede zorlandığını anlat.']],
    kontrol: ['Randevu gerekiyor mu?', 'Hangi hizmetleri sunuyorlar?', 'Görüşme sonrası adımın belli mi?'], kapanis: ['Bir soru hazırla.', 'Bu hafta randevu iste.'],
    metin: 'Üniversitenin kariyer merkezi yalnızca ilan panosu değildir. CV değerlendirmesi, görüşme provası, etkinlik ve işveren bağlantıları gibi hizmetleri olabilir. Görüşmeye hedeflediğin rolü ve üzerinde çalışmak istediğin tek soruyu belirleyerek git; güncel CV’ni yanında bulundur. Aldığın önerileri küçük eylemlere çevir ve bir sonraki kontrol tarihini kendin için not et.',
    etiketler: ['#kariyermerkezi', '#üniversite', '#stajbaşvurusu', '#kariyer', '#öğrenci', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-24-1230-kulup-deneyimi', ad: '24 Eylül 2026 Perşembe • 12.30 • Kulüp deneyimini CV’ye çevirme', foto: 'kulup-deneyimi.png', seri: 'CV KANITI',
    kanca: ['Kulüp görevin', '“deneyim”', 'sayılır mı?'], giris: ['Gerçek sorumluluk aldıysan', 'evet—doğru anlat.'],
    adimlar: [['Rolünü söyle', 'Üye değil, üstlendiğin sorumluluk.'], ['Süreci anlat', 'Planlama, iletişim veya üretim.'], ['Çıktıyı göster', 'Etkinlik, içerik veya düzenlenen süreç.']],
    kontrol: ['Kendi katkın ekipten ayrılıyor mu?', 'Abartısız ve doğrulanabilir mi?', 'Hedef rolle ilgisi görünüyor mu?'], kapanis: ['Bir kulüp görevini seç.', 'Fiil + katkı + çıktı yaz.'],
    metin: 'Öğrenci kulübü deneyimi, gerçekten sorumluluk aldıysan CV’de değerli bir kanıt olabilir. Yalnızca “kulüp üyesi” yazmak yerine üstlendiğin görevi, uyguladığın süreci ve ortaya çıkan çıktıyı anlat. Etkinlik planladıysan hangi kısmı yönettiğini; içerik ürettiysen neyi ve kimin için hazırladığını belirt. Sayıları yalnızca kayıtla doğrulayabiliyorsan kullan.',
    etiketler: ['#öğrencikulübü', '#stajcv', '#cvhazırlama', '#öğrenci', '#kariyer', '#deneyim', '#stajimvar'],
  },
  {
    kod: '2026-09-24-2030-gonulluluk-deneyimi', ad: '24 Eylül 2026 Perşembe • 20.30 • Gönüllülük deneyimini anlatma', foto: 'gonulluluk-deneyimi.png', seri: 'DENEYİM ANLATIMI',
    kanca: ['Gönüllülük yalnız', '“yardım ettim”', 'demek değildir.'], giris: ['Sorumluluğunu ve etkisini', 'somutlaştır.'],
    adimlar: [['İhtiyacı belirt', 'Çalışma hangi soruna odaklanıyordu?'], ['Katkını ayır', 'Sen hangi işi üstlendin?'], ['Öğrenmeyi bağla', 'Hangi becerin gelişti?']],
    kontrol: ['Yararlanıcıların mahremiyeti korunuyor mu?', 'İzin olmayan görseli kullanıyor musun?', 'Katkını abartmadan anlatıyor musun?'], kapanis: ['Deneyimini yaz.', 'İnsanları değil katkını öne çıkar.'],
    metin: 'Gönüllülük deneyimini anlatırken yalnızca kurum adını veya “yardım ettim” cümlesini yazma. Çalışmanın odaklandığı ihtiyacı, senin üstlendiğin sorumluluğu ve geliştirdiğin beceriyi açıkla. Yararlanıcıların kişisel bilgilerini veya izinsiz fotoğraflarını paylaşma. Etkiyi abartmadan, kendi gözlem ve katkın üzerinden anlatmak hem daha dürüst hem de daha güçlüdür.',
    etiketler: ['#gönüllülük', '#stajcv', '#sosyalsorumluluk', '#öğrenci', '#kariyer', '#deneyim', '#stajimvar'],
  },
  {
    kod: '2026-09-25-1230-mini-proje', ad: '25 Eylül 2026 Cuma • 12.30 • Staj için mini proje seçme', foto: 'mini-proje.png', seri: 'MİNİ PROJE',
    kanca: ['Büyük fikir değil,', 'bitmiş küçük', 'bir proje.'], giris: ['Staj başvurusunda', 'tamamlanmış kanıt daha değerlidir.'],
    adimlar: [['Soruyu küçült', 'Tek kullanıcı veya tek problem.'], ['Süre koy', 'Bir haftalık net sınır belirle.'], ['Çıktıyı seç', 'Rapor, prototip, analiz veya tasarım.']],
    kontrol: ['Yedi günde bitebilir mi?', 'Kullandığın yöntemi açıklayabilir misin?', 'Sonucu portföyde gösterebilir misin?'], kapanis: ['Bir problem seç.', 'İlk çıktıyı bugün tanımla.'],
    metin: 'Staj başvurusu için mini proje seçerken büyük görünmeye değil, tamamlanabilir olmaya odaklan. Tek bir kullanıcıyı veya problemi seç, bir haftalık süre sınırı koy ve göstereceğin çıktıyı baştan tanımla. Proje bittiğinde yalnız sonucu değil, kullandığın yöntemi ve verdiğin kararları da kaydet. Kopyalanmış bir eğitim çalışması yerine kendi küçük yorumunu ekle.',
    etiketler: ['#miniproje', '#portföy', '#stajbaşvurusu', '#öğrenci', '#proje', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-25-2030-teknik-gorev', ad: '25 Eylül 2026 Cuma • 20.30 • Teknik değerlendirme görevini planlama', foto: 'teknik-gorev.png', seri: 'TEKNİK GÖREV',
    kanca: ['Süre başladı.', 'Hemen üretmeye', 'başlama.'], giris: ['Önce görevi bölmek', 'zamanını korur.'],
    adimlar: [['Beklentiyi çıkar', 'Teslim biçimi ve değerlendirme ölçütü.'], ['Zamanı böl', 'Anlama, üretme, kontrol ve teslim.'], ['Varsayımı yaz', 'Belirsiz noktayı açıkça belirt.']],
    kontrol: ['İstenen dosya biçimi doğru mu?', 'Çalışman kendi üretimin mi?', 'Kontrol için süre bıraktın mı?'], kapanis: ['İlk 15 dakika:', 'oku, böl, süre koy.'],
    metin: 'Teknik değerlendirme görevi geldiğinde hemen üretmeye başlamak yerine teslim biçimini ve ölçütleri çıkar. Süreni görevi anlama, temel çözümü üretme, kontrol etme ve teslim etme olarak böl. Belirsiz bir nokta varsa makul varsayımını açıkça yaz veya izin verilen kanaldan sor. Başkasının çalışmasını kendi üretimin gibi sunma; kullandığın kaynak ve araçları dürüstçe belirt.',
    etiketler: ['#teknikgörev', '#stajbaşvurusu', '#değerlendirme', '#zamanyönetimi', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-26-1230-bilmiyorum-cevabi', ad: '26 Eylül 2026 Cumartesi • 12.30 • Mülakatta bilmediğin soruya cevap', foto: 'bilmiyorum-cevabi.png', seri: 'MÜLAKAT',
    kanca: ['Cevabı', 'bilmiyorsan', 'uydurma.'], giris: ['Düşünme biçimini göstermek', 'boşluğu saklamaktan daha güçlüdür.'],
    adimlar: [['Durakla', 'Soruyu anladığından emin ol.'], ['Bildiklerini ayır', 'İlgili temel bilgiyi paylaş.'], ['Yaklaşım kur', 'Nasıl araştırıp deneyeceğini anlat.']],
    kontrol: ['Soruyu yeniden ifade ettin mi?', 'Tahmini gerçek gibi sunuyor musun?', 'Öğrenme yolunu somutlaştırdın mı?'], kapanis: ['“Bilmiyorum”dan sonra', 'nasıl ilerleyeceğini söyle.'],
    metin: 'Mülakatta bilmediğin bir soruyla karşılaştığında rastgele cevap uydurmak zorunda değilsin. Soruyu doğru anladığını teyit et, bildiğin ilgili kısmı ayır ve çözmek için nasıl ilerleyeceğini anlat. Gerekirse düşünmek için kısa bir süre iste. “Bu konuda deneyimim yok; önce şu kaynağı kontrol eder, küçük bir örnekle denerdim” gibi dürüst ve somut bir yaklaşım güven verir.',
    etiketler: ['#stajmülakatı', '#mülakat', '#iletişim', '#öğrenci', '#ilkstaj', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-26-2030-grup-mulakati', ad: '26 Eylül 2026 Cumartesi • 20.30 • Grup mülakatında görünür olma', foto: 'grup-mulakati.png', seri: 'GRUP MÜLAKATI',
    kanca: ['En çok konuşan', 'değil, ekibi', 'ilerleten görünür olur.'], giris: ['Katkı vermekle', 'sohbeti kaplamak aynı şey değildir.'],
    adimlar: [['Erken katkı ver', 'Kısa bir fikir veya netleştiren soru.'], ['Dinlediğini göster', 'Bir fikri geliştir veya bağ kur.'], ['Süreyi koru', 'Ekibin sonuca ilerlemesine yardım et.']],
    kontrol: ['Başkalarının sözünü kesiyor musun?', 'Sessiz kalan kişiye alan açtın mı?', 'Fikrin göreve gerçekten hizmet ediyor mu?'], kapanis: ['Amaç öne çıkmak değil,', 'ekibi ileri taşımak.'],
    metin: 'Grup mülakatında görünür olmak, sürekli konuşmak anlamına gelmez. Başta kısa bir katkı ver, diğer adayların fikirlerini dikkatle dinle ve konuşmayı görevin hedefine bağla. Birinin fikrini geliştirmen veya sessiz kalan kişiye alan açman ekip davranışını gösterir. Süreyi takip et ve grubun net bir sonuca ulaşmasına yardımcı ol; rekabeti tartışmaya dönüştürme.',
    etiketler: ['#grupmülakatı', '#stajmülakatı', '#takımçalışması', '#iletişim', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-27-1230-sirket-arastirmasi', ad: '27 Eylül 2026 Pazar • 12.30 • 15 dakikada şirket araştırması', foto: 'sirket-arastirmasi.png', seri: 'ŞİRKET ARAŞTIRMASI',
    kanca: ['Mülakat öncesi', '15 dakikan varsa', 'buradan başla.'], giris: ['Rastgele arama değil,', 'üç resmî kaynak.'],
    adimlar: [['Şirket sitesi', 'Ürün, hizmet ve çalışma alanı.'], ['Kariyer sayfası', 'Rol, kültür iddiası ve süreç.'], ['Güncel açıklama', 'Resmî haber veya duyuru.']],
    kontrol: ['Bilgin resmî kaynaktan mı?', 'Rol ile şirket işi arasında bağ kurdun mu?', 'Soracağın tek soru hazır mı?'], kapanis: ['Üç not çıkar.', 'Birini mülakatta soruya çevir.'],
    metin: 'Mülakat öncesi şirket araştırmasını sınırsız bir internet taramasına dönüştürme. On beş dakikada kurumun resmî sitesinden ne yaptığını, kariyer sayfasından rolün bağlamını ve güncel resmî açıklamalardan yakın dönemdeki odağını öğren. Üç kısa not çıkar ve bunlardan birini görüşmede sorabileceğin somut bir soruya dönüştür. Doğrulanmamış yorumları gerçek bilgi gibi kullanma.',
    etiketler: ['#şirketaraştırması', '#stajmülakatı', '#stajbaşvurusu', '#kariyer', '#öğrenci', '#mülakat', '#stajimvar'],
  },
  {
    kod: '2026-09-27-2030-referans-isteme', ad: '27 Eylül 2026 Pazar • 20.30 • Staj için referans isteme', foto: 'referans-isteme.png', seri: 'REFERANS',
    kanca: ['“Bana referans', 'olur musunuz?”dan', 'önce bağlam ver.'], giris: ['Doğru kişi, seni ve', 'çalışmanı gerçekten tanır.'],
    adimlar: [['Kişiyi seç', 'Çalışmanı gözlemlemiş biri.'], ['Rolü anlat', 'Nereye ve neden başvurduğunu söyle.'], ['Malzemeyi ver', 'CV, ilan ve hatırlatıcı örnek.']],
    kontrol: ['Reddetmesi için rahat alan bıraktın mı?', 'Son tarihi açıkça söyledin mi?', 'Sonuçtan sonra teşekkür edecek misin?'], kapanis: ['Erken sor.', 'Kısa bağlam ve net tarih ver.'],
    metin: 'Staj için referans isterken yalnızca unvanı güçlü birini değil, çalışmanı gerçekten gözlemlemiş birini seç. Başvurduğun rolü, neden uygun olduğunu düşündüğünü ve referansın ne zaman gerektiğini açıkça anlat. Güncel CV’ni, ilanı ve birlikte yaptığınız çalışmayı hatırlatan kısa notu paylaş. Karşı tarafa rahatça hayır diyebileceği alan bırak ve süreç tamamlandığında teşekkür et.',
    etiketler: ['#referans', '#stajbaşvurusu', '#kariyer', '#iletişim', '#öğrenci', '#işarama', '#stajimvar'],
  },
  {
    kod: '2026-09-28-1230-ucret-konusmasi', ad: '28 Eylül 2026 Pazartesi • 12.30 • Staj ücretini ve koşulları sorma', foto: 'ucret-konusmasi.png', seri: 'STAJ KOŞULLARI',
    kanca: ['Ücret ve koşulları', 'sormak', 'ayıp değil.'], giris: ['Karar vermeden önce', 'teklifin tamamını anlamalısın.'],
    adimlar: [['Doğru zamanı seç', 'Görüşme sonunda veya teklif aşamasında.'], ['Soruyu net kur', 'Ücret, yemek, yol ve çalışma düzeni.'], ['Yazılı doğrula', 'Başlangıç, süre ve koşulları kaydet.']],
    kontrol: ['Sorun profesyonel ve doğrudan mı?', 'Toplam zaman ve ulaşımı düşündün mü?', 'Belirsiz kısmı yazılı sordun mu?'], kapanis: ['Net koşul,', 'bilinçli karar getirir.'],
    metin: 'Stajın ücretini ve çalışma koşullarını sormak profesyonel sürecin doğal parçasıdır. Görüşmenin uygun bölümünde veya teklif aşamasında ücret, yemek, yol, çalışma günleri, saatleri ve konumu net biçimde sorabilirsin. Karar vermeden önce başlangıç tarihini, süresini ve temel koşulları mümkünse yazılı gör. Soruyu özür dileyerek değil, teklifin tamamını anlamak amacıyla kur.',
    etiketler: ['#stajücreti', '#stajteklifi', '#staj', '#işhayatı', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-09-28-2030-haftalik-dersler', ad: '28 Eylül 2026 Pazartesi • 20.30 • Başvurulardan haftalık ders çıkarma', foto: 'haftalik-dersler.png', seri: 'BAŞVURU VERİSİ',
    kanca: ['Kaç başvuru yaptın?', 'Tek başına', 'yeterli bir soru değil.'], giris: ['Haftayı sayıyla değil,', 'öğrendiğin desenle kapat.'],
    adimlar: [['Kaynağı karşılaştır', 'Hangi kanallar uygun ilan getirdi?'], ['Uyumu incele', 'Hangi rollerde kanıtın daha güçlü?'], ['Bir değişiklik seç', 'Gelecek hafta neyi farklı yapacaksın?']],
    kontrol: ['Başvuruların kayıtlı mı?', 'Yanıt gelmeyenleri sonuç sayıyor musun?', 'Tek haftadan kesin hüküm çıkarıyor musun?'], kapanis: ['Veriyi suçlamak için değil,', 'planını iyileştirmek için kullan.'],
    metin: 'Hafta sonunda yalnızca başvuru sayısını toplamak yerine sürecindeki desenlere bak. Uygun ilanları hangi kaynaklarda bulduğunu, hangi rollerde daha güçlü kanıt sunduğunu ve nerede zaman kaybettiğini not et. Yanıt gelmemesini hemen kişisel başarısızlık olarak yorumlama; kısa dönem verisi kesin sonuç vermez. Gelecek hafta için yalnızca bir değişiklik seç ve etkisini yeniden gözlemle.',
    etiketler: ['#başvurutakibi', '#kariyerplanı', '#işarama', '#stajbaşvurusu', '#öğrenci', '#verimlilik', '#stajimvar'],
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
  console.log(`${post.kod}: 4 kart`);
}

const manifestYolu = path.join(PAYLASIM, 'setler.json');
const oncekiSetler = JSON.parse(fs.readFileSync(manifestYolu, 'utf8'));
const yeniSetler = postlar.map((post) => ({
  kod: post.kod,
  ad: post.ad,
  surum: SURUM,
  guncellendi: '2026-09-14',
  metin: post.metin,
  etiketler: post.etiketler,
  kartlar: [1, 2, 3, 4].map((no) => `/paylasim/${post.kod}/${String(no).padStart(2, '0')}-${SURUM}.jpg`),
}));
fs.writeFileSync(manifestYolu, `${JSON.stringify([...oncekiSetler, ...yeniSetler], null, 2)}\n`);
console.log(`\nİkinci hafta eklendi; panelde toplam ${oncekiSetler.length + yeniSetler.length} gönderi var.`);
