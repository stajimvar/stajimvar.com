/** 29 Eylül-2 Ekim 2026 için 8 fotoğraflı karusel ekler. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { KOK, PAYLASIM } from './paylasim-sablonu.mjs';
import { BOY, EN, SURUM, kartSvg } from './paylasim-takvim-2026-09-15.mjs';

const fotoKlasoru = path.join(KOK, 'assets', 'instagram', 'takvim-20260929');
const postlar = [
  {
    kod: '2026-09-29-1230-basvuru-formu', ad: '29 Eylül 2026 Salı • 12.30 • Başvuru formundaki açık uçlu sorular', foto: 'basvuru-formu.png', seri: 'BAŞVURU FORMU',
    kanca: ['“Neden bizi', 'seçtin?” sorusuna', 'genel cevap verme.'], giris: ['Cevabını şirket, rol', 've kanıtın üzerine kur.'],
    adimlar: [['Şirketi bağla', 'İlgini çeken gerçek çalışma alanı.'], ['Rolü bağla', 'Öğrenmek istediğin somut görev.'], ['Kanıt ekle', 'Hazırlığını gösteren kısa bir örnek.']],
    kontrol: ['Cevap başka şirkete de uyuyor mu?', 'İlanda olmayan bir iddia var mı?', 'Tek bir örnekle destekledin mi?'], kapanis: ['Genel övgüyü çıkar.', 'Gerçek bağını iki cümlede yaz.'],
    metin: 'Başvuru formundaki açık uçlu sorular, şirketi ne kadar övdüğünü değil rol ile arandaki bağı görmeye yarar. Kurumun resmî kaynaklarında gerçekten gördüğün bir çalışma alanını seç, bu rolde öğrenmek istediğin somut görevi belirt ve hazırlığını gösteren kısa bir örnek ekle. Her şirkete gönderilebilecek genel cümleleri çıkar; yapmadığın araştırmayı veya sahip olmadığın deneyimi yazma.',
    etiketler: ['#başvuruformu', '#stajbaşvurusu', '#kariyer', '#öğrenci', '#işarama', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-29-2030-cv-dosya-adi', ad: '29 Eylül 2026 Salı • 20.30 • CV dosya adını profesyonel hazırlama', foto: 'cv-dosya-adi.png', seri: 'CV DETAYI',
    kanca: ['CV’nin dosya adı', 'ilk izlenimi', 'bozmasın.'], giris: ['“son_final_2.pdf” yerine', 'açık ve düzenli bir ad kullan.'],
    adimlar: [['Adını yaz', 'Ad ve soyad kolayca görülsün.'], ['Belgeyi belirt', 'CV veya özgeçmiş olduğunu ekle.'], ['PDF kontrolü', 'Son sürümü açıp yeniden oku.']],
    kontrol: ['Dosya adı anlaşılır mı?', 'Türkçe karakter kaynaklı sorun var mı?', 'Yanlış sürümü ekledin mi?'], kapanis: ['AdSoyad_CV.pdf', 'Basit, net, bulunabilir.'],
    metin: 'CV dosyanı göndermeden önce adını düzenle. Ad ve soyadını, belgenin CV olduğunu ve gerekiyorsa hedef rolü açıkça belirten kısa bir dosya adı kullan. “final”, “son2” veya anlamsız sayı dizileri işe alım tarafında karışıklık yaratabilir. PDF’yi ekledikten sonra dosyayı bir kez aç; doğru sürümün, çalışan bağlantıların ve güncel iletişim bilgilerinin yer aldığını kontrol et.',
    etiketler: ['#stajcv', '#cvhazırlama', '#stajbaşvurusu', '#kariyer', '#öğrenci', '#işarama', '#stajimvar'],
  },
  {
    kod: '2026-09-30-1230-mulakat-provasi', ad: '30 Eylül 2026 Çarşamba • 12.30 • Mülakat provasını kayda alma', foto: 'mulakat-provasi.png', seri: 'MÜLAKAT PROVASI',
    kanca: ['Cevabını biliyorsun.', 'Peki anlaşılır', 'anlatıyor musun?'], giris: ['Kısa bir video kaydı', 'fazlalıkları görünür kılar.'],
    adimlar: [['Tek soru seç', 'Kendinden bahset ile başla.'], ['Süre tut', 'Altmış-doksan saniye hedefle.'], ['Bir şeyi düzelt', 'Hız, dolgu sözü veya yapı.']],
    kontrol: ['Cevabın ezber gibi mi?', 'Örneğin anlaşılır mı?', 'Göz temasın ve sesin doğal mı?'], kapanis: ['Bir kez kaydet.', 'Tek iyileştirme seç ve tekrarla.'],
    metin: 'Mülakat provasında kendini kaydetmek, ne söyleyeceğini ezberlemek için değil anlatımını görmek içindir. Tek bir soruyla başla ve cevabını altmış-doksan saniyede tamamlamaya çalış. Kaydı izlerken hız, gereksiz tekrarlar ve örneğin anlaşılır olup olmadığına bak. Her denemede yalnızca bir şeyi düzelt; kusursuz görünmeye değil, doğal ve net konuşmaya odaklan.',
    etiketler: ['#mülakatprovasi', '#stajmülakatı', '#iletişim', '#öğrenci', '#kariyer', '#ilkstaj', '#stajimvar'],
  },
  {
    kod: '2026-09-30-2030-toplanti-hazirligi', ad: '30 Eylül 2026 Çarşamba • 20.30 • Stajda toplantıya hazırlanma', foto: 'toplanti-hazirligi.png', seri: 'STAJDA İLETİŞİM',
    kanca: ['Toplantıya', 'yalnızca katılma.', 'Hazırlıkla gir.'], giris: ['Üç kısa not, toplantıda', 'daha rahat katkı vermeni sağlar.'],
    adimlar: [['Amacı öğren', 'Toplantının sonunda ne çıkacak?'], ['Durumu hazırla', 'Tamamlanan, bekleyen ve engel.'], ['Sorunu yaz', 'Yanıt beklediğin tek net konu.']],
    kontrol: ['Gündemi okudun mu?', 'Paylaşacağın bilgi güncel mi?', 'Not almak için hazır mısın?'], kapanis: ['Amaç, durum, soru.', 'Toplantıdan önce üç satır yaz.'],
    metin: 'Stajda bir toplantıya hazırlanırken gündemi ve beklenen çıktıyı önceden öğren. Kendi işinle ilgili tamamlananları, sıradaki adımı ve varsa engeli üç kısa satırda hazırla. Yanıt beklediğin konuyu net bir soruya dönüştür. Toplantı boyunca kararları ve sana verilen işleri not et; anlamadığın noktayı uygun anda sor ve sonrasında sorumluluğunu tekrar doğrula.',
    etiketler: ['#stajdailetişim', '#toplantı', '#işhayatı', '#stajyer', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-10-01-1230-sorumluluk-takibi', ad: '1 Ekim 2026 Perşembe • 12.30 • Stajda sorumluluk takibi', foto: 'sorumluluk-takibi.png', seri: 'GÖREV TAKİBİ',
    kanca: ['Görevlerini', 'aklında değil,', 'tek yerde tut.'], giris: ['Basit bir liste', 'unutmayı ve belirsizliği azaltır.'],
    adimlar: [['Görevi yaz', 'Beklenen çıktıyı kendi cümlenle.'], ['Tarihi ekle', 'Teslim ve ara kontrol zamanı.'], ['Durumu güncelle', 'Bekliyor, sürüyor veya tamamlandı.']],
    kontrol: ['Öncelik belli mi?', 'Bağımlı olduğun kişi veya dosya yazılı mı?', 'Engeli zamanında bildirdin mi?'], kapanis: ['Tek liste kullan.', 'Her gün beş dakika güncelle.'],
    metin: 'Stajda verilen işleri yalnızca hafızanda tutma. Görevi, beklenen çıktıyı, teslim tarihini ve durumunu tek bir listede takip et. Bir dosya, onay veya başka kişinin yanıtı gerekiyorsa bunu da görevin yanına yaz. Gecikme riski oluştuğunda son günü beklemeden haber ver; yalnız sorunu değil, ilerleyebilmek için ihtiyaç duyduğun şeyi de belirt.',
    etiketler: ['#görevtakibi', '#stajyer', '#işhayatı', '#verimlilik', '#öğrenci', '#kariyer', '#stajimvar'],
  },
  {
    kod: '2026-10-01-2030-not-alma', ad: '1 Ekim 2026 Perşembe • 20.30 • İş yerinde etkili not alma', foto: 'not-alma.png', seri: 'NOT ALMA',
    kanca: ['Her şeyi yazma.', 'Kararı ve', 'sonraki adımı yakala.'], giris: ['İyi not, toplantıyı', 'tekrar dinletmez.'],
    adimlar: [['Başlığı koy', 'Tarih, konu ve katılımcılar.'], ['Kararı ayır', 'Ne üzerinde anlaşıldı?'], ['Eylemi yaz', 'Kim, neyi, ne zamana yapacak?']],
    kontrol: ['Kişisel veya hassas bilgi var mı?', 'Sana ait görevler net mi?', 'Belirsiz noktayı doğruladın mı?'], kapanis: ['Karar + sorumlu + tarih.', 'Notunu aynı gün düzenle.'],
    metin: 'İş yerinde etkili not almak, söylenen her cümleyi yazmak değildir. Tarih ve konu başlığından sonra alınan kararları, sorumluları ve tarihleri ayrı biçimde kaydet. Sana verilen görevi kendi cümlenle tekrar ederek doğru anladığını doğrula. Hassas bilgileri kişisel veya izinsiz araçlara taşımadan kurumun uygun gördüğü yerde sakla ve notlarını aynı gün kısa bir düzene sok.',
    etiketler: ['#notalma', '#stajyer', '#işhayatı', '#toplantı', '#öğrenci', '#verimlilik', '#stajimvar'],
  },
  {
    kod: '2026-10-02-1230-portfoy-izni', ad: '2 Ekim 2026 Cuma • 12.30 • Staj çalışmasını portföye eklemek için izin isteme', foto: 'portfoy-izni.png', seri: 'PORTFÖY ETİĞİ',
    kanca: ['Stajda yaptığın', 'her işi portföye', 'koyamazsın.'], giris: ['Önce gizliliği öğren,', 'sonra açık izin iste.'],
    adimlar: [['Kuralı sor', 'Kurumun gizlilik ve paylaşım sınırı.'], ['Örneği göster', 'Ne paylaşmak istediğini somutlaştır.'], ['Alternatif sun', 'Anonimleştirilmiş süreç anlatımı.']],
    kontrol: ['Yazılı izin aldın mı?', 'Müşteri ve şirket verisi kaldırıldı mı?', 'Onaylanan sürüm mü kullanılıyor?'], kapanis: ['İzin yoksa paylaşma.', 'Öğrendiklerini genel dille anlat.'],
    metin: 'Staj sırasında hazırladığın bir işi portföye eklemeden önce kurumun gizlilik kurallarını öğren ve açık izin iste. Paylaşmak istediğin örneği, nerede yayımlayacağını ve hangi bilgileri kaldıracağını somut biçimde göster. İzin verilmiyorsa dosyayı yayımlama; bunun yerine problemi, kendi rolünü ve öğrendiğin yöntemi gizli bilgileri açıklamadan genel dille anlat.',
    etiketler: ['#portföy', '#stajyer', '#gizlilik', '#kariyer', '#öğrenci', '#işhayatı', '#stajimvar'],
  },
  {
    kod: '2026-10-02-2030-haftalik-ozet', ad: '2 Ekim 2026 Cuma • 20.30 • Yöneticiye haftalık durum özeti gönderme', foto: 'haftalik-ozet.png', seri: 'HAFTALIK ÖZET',
    kanca: ['“Bu hafta ne yaptın?”', 'sorusuna hazır', 'bir özetin olsun.'], giris: ['Kısa durum mesajı', 'emeğini ve ihtiyacını görünür kılar.'],
    adimlar: [['Tamamlanan', 'Ortaya çıkan somut işler.'], ['Devam eden', 'Şu an bulunduğun aşama.'], ['İhtiyaç', 'Karar, bilgi veya geri bildirim.']],
    kontrol: ['Özet kısa ve taranabilir mi?', 'Engel açıkça yazıyor mu?', 'Gelecek adım belli mi?'], kapanis: ['Üç başlık, birkaç madde.', 'Haftayı netlikle kapat.'],
    metin: 'Hafta sonunda yöneticine veya mentörüne kısa bir durum özeti göndermek, yaptığın işi ve ihtiyaçlarını görünür kılar. Tamamlananları, devam eden işleri ve yanıt beklediğin konuları ayrı başlıklarda yaz. Her maddeyi somut tut ve gelecek haftanın ilk adımını ekle. Kurumda farklı bir raporlama düzeni varsa onu kullan; gereksiz uzunluk yerine karar vermeyi kolaylaştıran bilgi ver.',
    etiketler: ['#haftalıközet', '#stajyer', '#işhayatı', '#iletişim', '#öğrenci', '#kariyer', '#stajimvar'],
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
