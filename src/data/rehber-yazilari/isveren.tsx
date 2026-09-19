import { metinRehberi } from '../rehber-govde';
import type { Rehber } from '../rehberler';

/**
 * Şirketler için rehberler.
 *
 * NEDEN AYRI KATEGORİ
 * -------------------
 * Bu yazılar öğrenciye değil işverene hitap ediyor ("siz"). `kategori:
 * 'isveren'` olduğu için rehber merkezinin öğrenci akışına — öne
 * çıkanlar, konu bölümleri, "sana uygun" sıralaması ve arama — hiç
 * girmiyorlar; yalnız "Şirketler için" konusu seçilince listeleniyorlar.
 * Aynı alan tek rehber sayfasındaki "ilgili rehberler" havuzunu da
 * ayırıyor: işveren yazısının altında öğrenci yazısı çıkmıyor.
 *
 * İÇERİK KURALI
 * -------------
 * Rakam, oran, tutar YOK. Mevzuat ve tutar değişir; mekanizma anlatılır,
 * resmî kaynağa yönlendirilir. Bu sayfalar hukuki danışmanlık değildir.
 *
 * Konunun ilk sırasındaki "Stajyer nasıl alınır" (/stajyer-nasil-alinir)
 * bu listede DEĞİL: tablo, çizim ve havuz istatistiği taşıyan özel bir
 * bileşen; RehberMerkezi onu bağlantı olarak ekliyor.
 */

export const ISVEREN_REHBERLERI: Rehber[] = [
  metinRehberi({
    slug: 'iyi-staj-ilani-nasil-yazilir',
    kategori: 'isveren',
    konu: 'isveren',
    dayanak:
      'İlanın nasıl yazılacağını belirleyen bağlayıcı bir mevzuat yok: bu yazı kural değil, ' +
        'ilan pratiği anlatıyor. Sigorta ve ücret gibi yükümlülükler ayrı bir yazıda ve orada ' +
        'resmî kaynağa bağlanıyor.',
    baslik: 'İyi bir staj ilanı nasıl yazılır?',
    ozet: 'Başvuruyu artıran şey uzun metin değil, üç somut cevap.',
    etiketler: ['staj ilanı', 'işveren', 'ilan yazma', 'başvuru'],
    guncelleme: '2026-09-18',
    aciklama:
      'Staj ilanı yazarken hangi alanlar başvuruyu artırır? Görev, süre, ücret ve bölüm ' +
        'bilgisini nasıl yazmalı; öğrencinin ilanı neden geçtiğini anlatan pratik rehber.',
    hizliCevap:
      'Öğrenci bir staj ilanında üç şeye bakıyor: ne yapacağım, ne zaman ve ne kadar süreyle, ' +
        'ücret var mı. Bu üçü başlıkta ve ilk paragrafta cevaplanmıyorsa ilan geçiliyor. Şirket ' +
        'tanıtımı, vizyon cümlesi ve uzun nitelik listesi başvuruyu artırmıyor; belirsizlik ' +
        'azaltan her satır artırıyor. İlan formu sizi bu alanlardan sırayla geçiriyor; boş ' +
        'bıraktığınız her alan öğrencinin sorusu olarak geri geliyor.',
    bloklar: [
      {
        baslik: 'Başlık: pozisyon + alan, süs yok',
        paragraflar: [
          '"Dinamik ekibimize stajyer arıyoruz" bir başlık değil; hangi işin stajı olduğunu ' +
            'söylemiyor. "Muhasebe Stajyeri", "Ön Muhasebe ve Fatura Takibi Stajyeri", "Grafik ' +
            'Tasarım Stajyeri (Sosyal Medya)" gibi başlıklar öğrencinin listede tarayarak bulduğu ' +
            'şeyler. Bölüm adı ya da işin adı başlıkta olmalı; "stajyer" kelimesi de olmalı, ' +
            'çünkü öğrenci öyle arıyor.',
          'Şehir ve çalışma biçimi (ofis, hibrit, uzaktan) başlıkta değil ilanın kendi ' +
            'alanlarında duruyor; StajımVar bunları kartta ayrıca gösteriyor, başlığa ' +
            'sıkıştırmanıza gerek yok.',
        ],
      },
      {
        baslik: 'İlk paragraf: stajyer ne yapacak?',
        paragraflar: [
          'Öğrencinin en çok korktuğu şey üç hafta boş oturmak. İlk paragrafta stajyerin ' +
            'gerçekten dokunacağı iki-üç işi yazın: "Haftalık satış raporunu Excel\'de ' +
            'hazırlayacak", "Müşteri e-postalarını ilk cevaplayan kişi olacak", "Ürün ' +
            'fotoğraflarının düzenlenmesinde tasarımcıya eşlik edecek". Fiil somut olsun; "destek ' +
            'olmak" ve "katkı sağlamak" hiçbir şey anlatmıyor.',
          'Kime bağlı çalışacağını da yazın. "Muhasebe müdürüyle birlikte" cümlesi, stajyerin ' +
            'ilk gün kime soracağını bildiği anlamına geliyor — ve şirketin bunu düşünmüş ' +
            'olduğunu.',
        ],
      },
      {
        baslik: 'Süre, dönem ve ücret: belirsiz bırakmayın',
        paragraflar: [
          'Zorunlu staj için öğrenci belirli bir iş günü sayısı arıyor; süreyi okul belirliyor ' +
            've öğrencinin belgesinde yazıyor. İlanda "yaz dönemi, 20-40 iş günü, okulun ' +
            'belirlediği süreye göre" gibi bir aralık vermek, hiç yazmamaktan iyi. Gönüllü ya da ' +
            'uzun dönem stajda haftada kaç gün beklediğinizi yazın; "esnek" demek belirsizlik ' +
            'demek.',
          'Ücret: ödeyecekseniz yazın, ödemeyecekseniz onu da yazın. Öğrenci "ücret ' +
            'açıklanmadı" gördüğünde en kötüyü varsayıyor. [Zorunlu stajda ücret ve sigorta ' +
            'yükümlülükleri](/rehber/zorunlu-staj-isverenin-yukumlulukleri) stajın türüne göre ' +
            'değişiyor; ilanda kendi durumunuzu açıkça yazmak yeter, tutar yazmak zorunda ' +
            'değilsiniz.',
        ],
      },
      {
        baslik: 'Aranan nitelikler: üçten fazla yazmayın',
        paragraflar: [
          'On maddelik nitelik listesi öğrenciyi eliyor, işvereni değil. Stajyer öğrenmek için ' +
            'geliyor; "ileri seviye Excel" ve "iki yıl deneyim" gibi şartlar staj ilanına ait ' +
            'değil. Gerçekten gerekli olan bir-iki şeyi yazın: bölüm (varsa), sınıf (3. ve 4. ' +
            'sınıf gibi), yabancı dil gerekiyorsa hangi seviyede.',
          'Bölüm alanı önemli: StajımVar öğrencinin profilindeki bölümle ilanınızı ' +
            'eşleştiriyor. Bölüm seçmeden yayınlanan ilan "Sana uygun" listesine hiç girmiyor.',
        ],
        liste: [
          'Bölüm ya da bölümler (eşleşme için)',
          'Sınıf beklentisi varsa',
          'Yabancı dil gerekiyorsa, seviyesiyle',
          'Gerçekten şart olan tek bir araç ya da beceri',
        ],
      },
      {
        baslik: 'Yayınlamadan önce',
        sirali: [
          'Başlıkta işin adı ve "stajyer" var mı?',
          'İlk paragrafta stajyerin yapacağı üç somut iş var mı?',
          'Süre, dönem ve ücret durumu açık mı?',
          'Bölüm seçili mi?',
          'Son başvuru tarihi gerçekçi mi? Yaz stajı için ilanı mart-nisan\'da açmak, haziranda ' +
            'açmaktan çok daha fazla başvuru getiriyor.',
        ],
      },
    ],
    sss: [
      {
        soru: 'İlanı İngilizce mi yazmalıyım?',
        cevap:
          'Ekip İngilizce çalışmıyorsa hayır. Türkçe ilan daha çok başvuru alıyor; yabancı dil ' +
            'gerekiyorsa nitelikler arasında seviyesiyle belirtmek yeter.',
      },
      {
        soru: 'Birden fazla bölümden stajyer alabilir miyim?',
        cevap:
          'Evet, ilanda birden fazla bölüm seçebilirsiniz. Ama görev tanımı bölüme göre ' +
            'değişiyorsa ayrı ilan açmak daha iyi sonuç veriyor; tek ilanda "hem muhasebe hem ' +
            'tasarım" yazmak iki tarafı da kaçırıyor.',
      },
      {
        soru: 'İlanım neden az başvuru alıyor?',
        cevap:
          'En sık üç sebep: başlıkta işin adı yok, ücret durumu boş, son başvuru tarihi dönemin ' +
            'çok geç bir yerinde. Üçünü düzeltip ilanı güncelleyin; StajımVar\'da ilan düzenlemek ' +
            'yeni ilan açmayı gerektirmiyor.',
      },
    ],
    sonrakiAdim: { etiket: 'İlan oluştur', yol: '/sirket/ilan', aciklama: 'Form sizi bu alanlardan sırayla geçiriyor.' },
  }),

  metinRehberi({
    slug: 'zorunlu-staj-isverenin-yukumlulukleri',
    kategori: 'isveren',
    konu: 'isveren',
    baslik: 'Zorunlu stajda işverenin yükümlülükleri: belge, sigorta, defter',
    ozet: 'Zorunlu stajda yükün çoğu okulda; işverenin işi üç belge ve bir imza.',
    etiketler: ['zorunlu staj', 'staj sigortası', 'staj defteri', 'işveren', '3308'],
    guncelleme: '2026-09-18',
    aciklama:
      'Zorunlu staj alan işveren neyle yükümlü? Sigorta primini kim öder, hangi belgeler ' +
        'imzalanır, staj defteri nasıl onaylanır. Mekanizma anlatımı, resmî kaynağa yönlendirme.',
    hizliCevap:
      'Üniversitenin müfredatındaki zorunlu stajda ' +
        '[iş kazası ve meslek hastalığı sigortası](/rehber/staj-sigortasi-kim-yapar) ' +
        'öğrencinin okulu tarafından yapılıyor ve primi de okul ödüyor — işverenlerin en çok ' +
        'yanıldığı nokta bu. İşverenin işi: kabul belgesini imzalamak, stajyere bir sorumlu ' +
        'atamak, staj defterini ve değerlendirme formunu doldurmak. Ücret yükümlülüğü stajın ' +
        'türüne ve mevzuata göre değişiyor; kesin kural için okulun staj birimine ve resmî ' +
        'kaynağa bakın.',
    bloklar: [
      {
        baslik: 'Önce ayırın: zorunlu mu, gönüllü mü?',
        paragraflar: [
          'Zorunlu staj, öğrencinin mezun olabilmek için yapmak zorunda olduğu ve okulun ' +
            'belgeyle tanımladığı staj. Gönüllü staj öğrencinin kendi isteğiyle yaptığı, ' +
            'müfredatta olmayan staj. Sigorta ve ücret yükümlülükleri bu ikisinde farklı işliyor; ' +
            'bu sayfa zorunlu stajı anlatıyor, çünkü küçük işletmenin karşılaştığı durum ' +
            'çoğunlukla bu.',
          'Ayrımı ilk görüşmede öğrenciye sorun: "Okuldan staj belgesi var mı?" Belge varsa ' +
            'zorunlu stajdır ve süreç aşağıdaki gibi işler.',
        ],
      },
      {
        baslik: 'Sigorta: okul yapar, işveren yapmaz',
        paragraflar: [
          'Üniversite öğrencisinin zorunlu stajında iş kazası ve meslek hastalığı sigortasının ' +
            'girişini okul yapıyor ve primini okul ödüyor. İşverenin SGK\'ya öğrenci için bildirim ' +
            'yapması gerekmiyor; öğrenci staja başlamadan önce okulun sigorta girişini yaptığını ' +
            'belgeleyebilir, isteyin. Aynı sorunun öğrenci tarafındaki cevabı ' +
            '[staj sigortasını kim yapar](/rehber/staj-sigortasi-kim-yapar) yazısında; ' +
            'stajyerinizin okuldan ne isteyeceğini oradan görebilirsiniz.',
          'Meslek lisesi öğrencilerinin beceri eğitimi ayrı bir mevzuata (3308 sayılı Kanun) ' +
            'tabi; orada ücret ve sözleşme kuralları üniversite stajından farklı. Hangi mevzuatın ' +
            'uygulanacağını öğrencinin okulu belirliyor.',
          'Gönüllü stajda okulun sigortası otomatik devreye girmiyor; sigorta ve ücret ' +
            'sorumluluğu işverene geçebiliyor. Bu durumda okulun staj birimine ve SGK\'ya yazılı ' +
            'sorun; sözlü bilgiyle başlamayın.',
        ],
      },
      {
        baslik: 'İmzalayacağınız belgeler',
        paragraflar: [
          'Belgelerin adı okuldan okula değişiyor ama işlevleri aynı. Öğrenci hepsini okulundan ' +
            'alıp getiriyor; sizin işiniz doldurup imzalamak ve kaşelemek.',
        ],
        liste: [
          'Staj kabul (başvuru) formu: stajı kabul ettiğinizi, tarihleri ve stajyerin bağlı ' +
            'olacağı sorumluyu yazdığınız belge. Staj başlamadan önce imzalanır; imzasız form ' +
            'geçerli değil.',
          'Staj defteri: stajyer günlük ya da haftalık ne yaptığını yazar, sorumlu her sayfayı ' +
            'imzalar. Sonunda kaşe ve yetkili imzası gerekir.',
          'Değerlendirme (sicil) formu: staj bitince sorumlu doldurur, çoğu okul kapalı zarfta ' +
            'ister. Öğrencinin staj notu buna bağlı.',
        ],
      },
      {
        baslik: 'Bir sorumlu atayın — tek satırlık ama en önemli iş',
        paragraflar: [
          'Staj belgesinde "işletme sorumlusu" alanı var; oraya yazılan kişi stajyerin ilk gün ' +
            'kime soracağı kişi. Bu alan boş ya da "genel müdür" olarak kalırsa stajyer üç hafta ' +
            'kimseyi rahatsız etmemeye çalışarak oturuyor. Sorumlu, stajyerin fiilen yanında ' +
            'çalışacağı kişi olsun.',
          'Sorumlunun adı ilanda da yazabilir: "Muhasebe müdürüne bağlı çalışacak" cümlesi ' +
            'başvuruyu artırıyor, çünkü öğrenci düzenli bir yerle karşılaşacağını anlıyor.',
        ],
      },
      {
        baslik: 'Ücret: yazmadığımız şey ve neden',
        paragraflar: [
          'Bu sayfada tutar, oran ve devlet katkısı payı yazmıyoruz. Bunlar asgari ücrete ' +
            'endeksli ve her yıl değişiyor; sabit bir rakam bırakmak bir süre sonra yanlış ' +
            'yönlendirmek demek. Kural şu: ücret yükümlülüğü stajın türüne, işletmenizin çalışan ' +
            'sayısına ve öğrencinin okul türüne göre değişiyor. Kendi durumunuz için SGK, İŞKUR ' +
            've okulun staj birimini esas alın.',
          'Ödemeye karar verdiyseniz ilanda "ücretli" yazın; tutarı yazmak zorunda değilsiniz. ' +
            'Öğrenci için "ücretli" ile "açıklanmadı" arasında büyük fark var.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Stajyer için SGK\'ya bildirim yapmam gerekiyor mu?',
        cevap:
          'Üniversitenin zorunlu stajında hayır; sigorta girişini okul yapıyor. Gönüllü stajda ' +
            've meslek lisesi beceri eğitiminde kurallar farklı; okulun staj birimine ve SGK\'ya ' +
            'sorun.',
      },
      {
        soru: 'Staj defterini kim doldurur?',
        cevap:
          'Stajyer yazar, atadığınız sorumlu imzalar. Sonunda işletme kaşesi ve yetkili imzası ' +
            'gerekir. Boş bırakılan günler öğrencinin stajının kabul edilmemesine yol açabiliyor.',
      },
      {
        soru: 'Tek bir stajyer için de bu süreç işler mi?',
        cevap:
          'Evet. Süreç işletme büyüklüğünden bağımsız; değişen yalnızca ücret yükümlülüğünün ' +
            'oranı olabiliyor, o da resmî kaynakta.',
      },
      {
        soru: 'Bu sayfa hukuki danışmanlık mı?',
        cevap:
          'Hayır. Mevzuat ve tutarlar değişebilir. Bağlayıcı bilgi için SGK, MEB, İŞKUR ve ' +
            'öğrencinin okulunun staj birimini esas alın; eksik ya da hatalı gördüğünüz bir şey ' +
            'varsa bize yazın, düzeltelim.',
      },
    ],
    kaynaklar: [
      { etiket: 'Sosyal Güvenlik Kurumu', adres: 'https://www.sgk.gov.tr', kurum: 'Sosyal Güvenlik Kurumu', tur: 'kurum' },
      { etiket: '3308 sayılı Mesleki Eğitim Kanunu (mevzuat.gov.tr)', adres: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3308&MevzuatTur=1&MevzuatTertip=5', kurum: 'Mevzuat Bilgi Sistemi', tur: 'belge' },
      { etiket: 'İŞKUR', adres: 'https://www.iskur.gov.tr', kurum: 'Türkiye İş Kurumu', tur: 'kurum' },
    ],
    sonrakiAdim: { etiket: 'Stajyer nasıl alınır?', yol: '/stajyer-nasil-alinir', aciklama: 'Kim ne yapar tablosu ve adım adım süreç.' },
  }),

  metinRehberi({
    slug: 'staj-basvurularini-degerlendirme',
    kategori: 'isveren',
    konu: 'isveren',
    dayanak:
      'Başvuru değerlendirmeyi düzenleyen bir mevzuat yok: buradakiler kural değil, işe alım ' +
        'pratiği. Ayrımcılık ve kişisel veri konularında geçerli hukuk ayrıdır; o sorular için ' +
        'resmî kaynağa ve hukuk danışmanınıza bakın.',
    baslik: 'Staj başvurularını değerlendirme: profil, kısa liste, mülakat daveti',
    ozet: 'Deneyim aramayın; yoktur. Bölüm, sınıf, ilgi ve cevap hızına bakın.',
    etiketler: ['başvuru değerlendirme', 'kısa liste', 'mülakat', 'işveren'],
    guncelleme: '2026-09-18',
    aciklama:
      'Staj başvurularını nasıl değerlendirmeli? Öğrenci profilinde neye bakılır, kısa liste ' +
        'nasıl yapılır, mülakat daveti nasıl yazılır. Küçük şirketler için pratik süreç.',
    hizliCevap:
      'Staj başvurusunda deneyim aramak yanlış ölçü; stajyer deneyim kazanmaya geliyor. ' +
        'Bakılacak şeyler: bölüm ve sınıf ilanla uyuyor mu, profil doldurulmuş mu (bu çabayı ' +
        'gösteriyor), öğrencinin yazdığı not ilanı gerçekten okuduğunu gösteriyor mu. ' +
        '[Başvuranlar ekranında](/sirket/basvuranlar) her adayın profilini, CV\'sini ve ' +
        'durumunu tek yerde görüyorsunuz; kısa listeye alma, mülakata davet ve karar aynı ' +
        'yerden.',
    bloklar: [
      {
        baslik: 'Neye bakılır, neye bakılmaz',
        paragraflar: [
          'Öğrenci profilinde okul, bölüm, sınıf, beceriler ve varsa projeler duruyor. Bölüm ve ' +
            'sınıf, stajın türüne (zorunlu staj hangi sınıfta yapılıyor) ve işin niteliğine ' +
            'uyuyorsa ilk eşik geçilmiş demektir.',
          'Deneyim, referans ve "ileri seviye" beceri aramayın. İkinci sınıf öğrencisinde ' +
            'bunlar yok ve olmaması normal. Bunun yerine profilin dolu olmasına bakın: fotoğraf, ' +
            'birkaç cümlelik tanıtım, becerilerin girilmiş olması öğrencinin bu işe zaman ' +
            'ayırdığını gösteriyor.',
        ],
        liste: [
          'Bölüm ve sınıf ilanla uyuyor mu?',
          'Profil dolu mu, yoksa boş bir hesap mı?',
          'Başvuru notu ilana özel mi, kopyala-yapıştır mı?',
          'Şehir ve çalışma biçimi uyuyor mu? (Uzaktan değilse bu eleyici.)',
        ],
      },
      {
        baslik: 'Kısa liste: en fazla beş kişi',
        paragraflar: [
          'Otuz başvurunun hepsini mülakata çağırmak iki tarafı da yoruyor. Yukarıdaki dört ' +
            'soruyu geçenlerden en fazla beş kişiyi kısa listeye alın. Başvuranlar ekranında ' +
            'durumu "kısa liste" yapmak yeter; öğrenci kendi tarafında "inceleniyor" görüyor, ' +
            'sessizlikte kalmıyor.',
          'Elediklerinize de karar bildirin. Cevap alamayan öğrenci ilanı ve şirketi hatırlıyor ' +
            '— olumsuz olarak. Tek tık, ama şirketin adı için değerli.',
        ],
      },
      {
        baslik: 'Mülakat: yirmi dakika, üç soru',
        paragraflar: [
          'Staj mülakatı işe alım mülakatı değil. Yirmi dakika ve üç soru yeter: bu ilana neden ' +
            'başvurdun, okulda en çok neyi seviyorsun, staj bitince ne öğrenmiş olmak istiyorsun. ' +
            'Cevaplar size öğrencinin ilgisini ve iletişimini gösterir; teknik bilgiyi zaten staj ' +
            'boyunca vereceksiniz.',
          'Çevrim içi görüşme yapıyorsanız öğrencinin tarafındaki hazırlık için [çevrim içi ' +
            'mülakat rehberi](/rehber/online-mulakat) var; davet mesajında bağlantıyı ' +
            'paylaşabilirsiniz. Davet gönderirken tarih, saat, süre ve görüşmeyi kimin yapacağını ' +
            'yazın; "uygun olduğunuzda" demeyin, iki seçenek verin.',
        ],
      },
      {
        baslik: 'Karar ve teklif',
        paragraflar: [
          'Kararı bir hafta içinde verin; öğrenci aynı anda birkaç yere başvuruyor ve zorunlu ' +
            'staj için tarih baskısı var. Teklifte başlangıç tarihi, süre, haftalık gün sayısı, ' +
            'ücret durumu ve ilk gün kime geleceği yazsın. Bu bilgilerin hepsi Başvuranlar ' +
            'ekranındaki teklif alanında var; oradan gönderilen teklif öğrencinin başvurularım ' +
            'listesine düşüyor.',
          'Teklifi kabul eden öğrenciden okulun staj belgelerini isteyin; [hangi belgelerin ' +
            'gerektiği](/rehber/zorunlu-staj-isverenin-yukumlulukleri) ayrı rehberde.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Aday kartlarını neden göremiyorum?',
        cevap:
          'Aday bilgileri yalnız doğrulanmış şirket hesaplarına açılıyor; panelde "İlan açık · ' +
            'kartlar kapalı" yazıyorsa şirketiniz henüz doğrulanmamış demek. Doğrulama şirket ' +
            'profilinizden başlıyor.',
      },
      {
        soru: 'Başvuran çok azsa ne yapmalıyım?',
        cevap:
          'Önce ilanı kontrol edin: başlıkta işin adı, ücret durumu ve son başvuru tarihi. ' +
            '[İlan yazma rehberinde](/rehber/iyi-staj-ilani-nasil-yazilir) en sık üç sebep var.',
      },
      {
        soru: 'Öğrenciye olumsuz cevap vermek zorunda mıyım?',
        cevap:
          'Zorunda değilsiniz ama verin. Başvuranlar ekranında tek tık; öğrenci sessizlikte ' +
            'kalmıyor ve şirketinizi düzgün hatırlıyor.',
      },
    ],
    sonrakiAdim: { etiket: 'Başvuranları gör', yol: '/sirket/basvuranlar', aciklama: 'Kısa liste, davet ve teklif aynı ekranda.' },
  }),

  metinRehberi({
    slug: 'stajyerin-ilk-gunu-oryantasyon',
    kategori: 'isveren',
    konu: 'isveren',
    dayanak:
      'Oryantasyonun nasıl yapılacağını söyleyen bir mevzuat yok: bu yazı kural değil, işyeri ' +
        'pratiği anlatıyor. İş sağlığı ve güvenliği eğitimi ayrı bir konu ve resmî kaynağı var.',
    baslik: 'Stajyerin ilk günü: oryantasyon ve haftalık hedef',
    ozet: 'İlk gün masa, kişi ve bir iş: üçü hazırsa staj başlamıştır.',
    etiketler: ['oryantasyon', 'ilk gün', 'staj defteri', 'işveren'],
    guncelleme: '2026-09-18',
    aciklama:
      'Stajyer ilk gün ne yapmalı, işveren neyi hazırlamalı? Oryantasyon listesi, haftalık ' +
        'hedef ve staj defterinin nasıl yürüyeceği. Küçük şirketler için uygulanabilir plan.',
    hizliCevap:
      'Kötü stajın tarifi basit: ilk gün masa yok, kime soracağı belli değil, verilecek iş ' +
        'düşünülmemiş. İyi stajın tarifi de basit: bir masa, bir sorumlu, ilk hafta için yazılı ' +
        'bir hedef. Oryantasyon bir sunum değil; stajyerin ilk günün sonunda "yarın ne yapacağımı ' +
        'biliyorum" diyebilmesi.',
    bloklar: [
      {
        baslik: 'Staj başlamadan önce hazır olması gerekenler',
        liste: [
          'Çalışacağı yer: masa, bilgisayar ya da gerekli araçlar, gerekiyorsa e-posta hesabı ' +
            've sistem erişimleri. İlk gün "hesabını açalım" ile geçmesin.',
          'Sorumlusu: staj belgesinde yazan kişi. O gün ofiste olmalı ve ilk saati stajyere ayırmalı.',
          'İlk haftanın işi: küçük, bitirilebilir, gerçek bir iş. Örnek: geçen ayın ' +
            'faturalarını sisteme girmek, ürün fotoğraflarını klasörlemek, müşteri listesini ' +
            'güncellemek.',
          'Kurallar: çalışma saatleri, öğle arası, kime izin sorulacağı, gizlilik. Sözlü yeter ' +
            'ama ilk gün söylenmeli.',
        ],
      },
      {
        baslik: 'İlk gün: bir saat, üç şey',
        paragraflar: [
          'İlk saat sorumluya ait. Üç şey: şirket ne yapıyor ve bu bölüm neresi (beş dakika), ' +
            'stajyer hangi işi yapacak ve nasıl kontrol edilecek (on dakika), ekip kim ve kime ne ' +
            'sorulur (tanıştırma). Sonra iş verilir; stajyer ilk günün sonunda bir şey bitirmiş ' +
            'olmalı.',
          'Kalan gün ekipte geçsin, sorumlunun yanında değil. Stajyerin gözlemleyebileceği, ' +
            'sorabileceği insanlar arasında oturması, kapalı bir odada evrak okumasından daha çok ' +
            'öğretiyor.',
        ],
      },
      {
        baslik: 'Haftalık hedef: yazılı ve küçük',
        paragraflar: [
          'Her pazartesi beş dakika: bu hafta neyi bitireceğiz? Tek cümle, yazılı (mesaj bile ' +
            'olur). Cuma beş dakika: bitti mi, ne öğrendin, gelecek hafta ne? Bu on dakika staj ' +
            'defterinin de içeriğini veriyor; stajyer ne yazacağını biliyor, sorumlu ne ' +
            'imzaladığını biliyor.',
          'Hedef küçük olsun. "Muhasebeyi öğren" hedef değil; "gelen faturaları kontrol edip ' +
            'sisteme girmeyi tek başına yap" hedef. Üç haftada üç küçük hedef, bir büyük hedeften ' +
            'iyi.',
        ],
      },
      {
        baslik: 'Staj defteri: ertelemeyin',
        paragraflar: [
          'Defter her gün ya da her hafta doldurulmalı; sonda toplu yazılan defter hem eksik ' +
            'olur hem öğrencinin notunu riske sokar. Cuma görüşmesi bunun için: o hafta yazılanı ' +
            'sorumlu okuyup imzalıyor. Sonunda kaşe ve yetkili imzası gerekiyor, [belgeler ' +
            'rehberinde](/rehber/zorunlu-staj-isverenin-yukumlulukleri) ayrıntısı var.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Stajyere gerçek iş vermek riskli değil mi?',
        cevap:
          'Kontrol edilebilir iş verin: sonucu sorumlu görüp düzeltebilsin. Müşteriye giden bir ' +
            'şeyi ilk hafta tek başına yollamasın ama hazırlasın. Sahte iş vermek stajyeri de ' +
            'sizi de üç hafta oyalıyor.',
      },
      {
        soru: 'Uzaktan stajda oryantasyon nasıl olur?',
        cevap:
          'Aynı üç şey: erişimler ilk günden önce hazır, sorumluyla ilk gün görüntülü bir saat, ' +
            'yazılı haftalık hedef. Uzaktan stajda yazılı hedef daha da önemli; sorulacak insan ' +
            'yan masada değil.',
      },
      {
        soru: 'Birden fazla stajyer alırsam?',
        cevap:
          'Her birinin ayrı sorumlusu ve ayrı işi olsun. Aynı işi iki stajyere vermek ikisini ' +
            'de belirsizlikte bırakıyor.',
      },
    ],
    sonrakiAdim: { etiket: 'Staj sonu: referans, teklif, geri bildirim', yol: '/rehber/staj-sonu-referans-teklif-geri-bildirim' },
  }),

  metinRehberi({
    slug: 'staj-sonu-referans-teklif-geri-bildirim',
    kategori: 'isveren',
    konu: 'isveren',
    dayanak:
      'Referans yazısı, geri bildirim ve teklifin biçimini belirleyen bir mevzuat yok: bu yazı ' +
        'kural değil, pratik anlatıyor. Okulun istediği değerlendirme formu üniversiteden ' +
        'üniversiteye değişiyor; biçimi okulun kendi resmî kaynağında.',
    baslik: 'Staj sonu: değerlendirme formu, referans, teklif ve geri bildirim',
    ozet: 'Staj bittiğinde dört şey var: form, belge, geri bildirim ve — istiyorsanız — teklif.',
    etiketler: ['staj sonu', 'referans', 'teklif', 'değerlendirme formu', 'işveren'],
    guncelleme: '2026-09-18',
    aciklama:
      'Staj bittiğinde işveren ne yapmalı? Değerlendirme formu, staj belgesi, referans yazısı, ' +
        'geri bildirim görüşmesi ve iş teklifi. Öğrenciyle ilişkiyi doğru kapatmanın yolu.',
    hizliCevap:
      'Staj son gün bitmez; okulun değerlendirme formu doldurulur, defter kaşelenir, öğrenciye ' +
        'on dakikalık dürüst bir geri bildirim verilir ve isterse referans olacağınızı ' +
        'söylersiniz. İyi geçtiyse teklif de bu görüşmede yapılır: mezuniyet sonrası için, yarı ' +
        'zamanlı için ya da gelecek yaz için. Bunları yapan şirketi öğrenci okulunda anlatıyor; ' +
        'sonraki ilanınızın başvurusu buradan geliyor.',
    bloklar: [
      {
        baslik: 'Okul belgeleri: form ve defter',
        paragraflar: [
          'Değerlendirme (sicil) formunu sorumlu doldurur; çoğu okul kapalı zarf ve kaşe ' +
            'istiyor, öğrenci okulun kuralını biliyor, sorun. Staj defterinin her sayfası imzalı, ' +
            'son sayfası kaşeli ve yetkili imzalı olmalı. Bu ikisi eksikse öğrencinin stajı okul ' +
            'tarafından kabul edilmeyebiliyor; sizin üç haftanız da boşa gider.',
          'Formu dürüst doldurun ama öğrenciyle konuşmadan sürpriz not vermeyin. Geri bildirim ' +
            'görüşmesinde söylediğinizle formda yazdığınız aynı olmalı.',
        ],
      },
      {
        baslik: 'Geri bildirim: on dakika, iki yönlü',
        paragraflar: [
          'Son gün on dakika ayırın. Üç şey söyleyin: iyi yaptığı somut bir şey, geliştirmesi ' +
            'gereken somut bir şey, bir sonraki adım için bir öneri. Sonra sorun: bizde neyi ' +
            'farklı yapardın? Stajyerin cevabı, sonraki stajyer için oryantasyonunuzu düzeltir.',
          'Genel cümlelerden kaçının. "Çok çalışkandın" öğrenciye bir şey vermiyor; "fatura ' +
            'girişinde hata oranın ikinci haftadan sonra sıfırlandı, bunu CV\'ne yazabilirsin" ' +
            'veriyor.',
        ],
      },
      {
        baslik: 'Referans: söyleyin ve yazın',
        paragraflar: [
          'Öğrencinin bir sonraki başvurusunda referans sorulacak; sizin adınızı vermek ' +
            'isteyecek. Bunu kendisi istemeye çekinir, siz söyleyin: "Referans olarak beni ' +
            'yazabilirsin." Öğrenci tarafındaki [referans nasıl ' +
            'istenir](/rehber/referans-nasil-istenir) rehberi de aynı şeyi ona anlatıyor.',
          'Kısa bir yazılı referans (üç-dört cümle: ne yaptı, ne kadar süre, nasıl çalıştı) ' +
            'e-posta olarak yeter; imzalı belge şart değil. Yazarken formdaki değerlendirmeyle ' +
            'tutarlı olun.',
        ],
      },
      {
        baslik: 'Teklif: dört seçenek',
        paragraflar: [
          'Stajyerden memnunsanız ilişkiyi kapatmayın; dört yol var ve hepsi Başvuranlar ' +
            'ekranındaki teklif alanından gönderilebiliyor.',
        ],
        liste: [
          'Yarı zamanlı devam: okul dönemi boyunca haftada belirli günler. Öğrencinin en çok ' +
            'istediği seçenek; ücret ve sigorta artık staj kuralına değil çalışma kuralına tabi, ' +
            'SGK\'ya bakın.',
          'Gelecek yaz için söz: bir sonraki staj döneminde öncelik. Yazılı olsun, bir cümle yeter.',
          'Mezuniyet sonrası teklif: son sınıfsa. Tarih ve pozisyon adı belirtin.',
          'Sadece referans: teklif yoksa da bu var ve değerli.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Değerlendirme formunda düşük not verirsem ne olur?',
        cevap:
          'Öğrencinin staj notu düşer, bazı okullarda staj tekrar gerekebilir. Not dürüst olsun ' +
            'ama sürpriz olmasın: geri bildirim görüşmesinde söylemediğiniz bir şeyi forma ' +
            'yazmayın.',
      },
      {
        soru: 'Staj belgesini ben mi düzenlerim?',
        cevap:
          'Okulun formları öğrencinin okulundan geliyor; siz doldurup imzalıyorsunuz. Ayrıca ' +
            'şirket antetli kısa bir "staj yapmıştır" yazısı vermek öğrencinin işine yarıyor, ' +
            'zorunlu değil.',
      },
      {
        soru: 'Stajyeri işe almak istiyorum, staj kuralları devam eder mi?',
        cevap:
          'Hayır. Staj bitip çalışmaya başladığında iş sözleşmesi, ücret ve sigorta normal ' +
            'çalışan kurallarına tabi olur; staj sigortası bunu kapsamaz. SGK\'ya ve gerekirse bir ' +
            'mali müşavire sorun.',
      },
    ],
    sonrakiAdim: { etiket: 'Yeni ilan aç', yol: '/sirket/ilan', aciklama: 'Bir sonraki dönem için ilanı erken açmak başvuruyu artırıyor.' },
  }),
];
