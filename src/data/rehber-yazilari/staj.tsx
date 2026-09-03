import { metinRehberi } from '../rehber-govde';
import type { Rehber } from '../rehberler';

/**
 * Staj ve stajyerlik rehberleri.
 *
 * İÇERİK KURALI
 * -------------
 * Yıldan yıla değişen oran ve tutar YAZILMIYOR. Asgari ücrete endeksli
 * ödemeler, prim oranları ve destek üst sınırları her yıl güncelleniyor;
 * sabit bir rakam bırakmak bir süre sonra okuyucuyu yanlış yönlendirmek
 * olur. Mekanizma anlatılıyor, güncel rakam için resmî kaynağa
 * yönlendiriliyor.
 *
 * Okuldan okula değişen konularda kesin ve evrensel ifade kullanılmıyor:
 * "uygulama üniversiteye göre değişebilir, kendi yönergene bak" cümlesi
 * yazının içinde duruyor.
 */

export const STAJ_REHBERLERI: Rehber[] = [
  metinRehberi({
    slug: 'staj-sigortasi-kim-yapar',
    baslik: 'Staj sigortasını kim yapar?',
    ozet: 'Zorunlu stajda okul, gönüllü stajda işyeri — ama istisnaları var.',
    konu: 'staj',
    etiketler: ['sigorta', 'sgk', 'iş kazası', 'zorunlu staj', 'gönüllü staj'],
    oneCikan: true,
    aciklama:
      'Staj sigortasını kim yapar? Zorunlu ve gönüllü stajda sigorta yükümlülüğü kimde, ' +
      'işveren ne ödüyor, öğrenci neye dikkat etmeli.',
    hizliCevap:
      'Zorunlu stajda sigorta girişini genellikle öğrencinin okulu yapar ve prim okul tarafından ödenir; ' +
      'yani işyerine bu primin MALİYETİ çıkmaz. Ama işverenin iş sağlığı ve güvenliği yükümlülükleri ' +
      'aynen sürüyor: 6331 sayılı Kanun stajyerleri de kapsıyor. Gönüllü (isteğe bağlı) stajda okulun böyle bir zorunluluğu ' +
      'olmadığı için sigorta yükümlülüğü işyerine geçebilir. Kesin cevap kendi okulunun staj yönergesinde ' +
      've işyeriyle yaptığın yazılı anlaşmadadır.',
    bloklar: [
      {
        paragraflar: [
          'Staj başvurularında en sık takılan yer sigorta. Küçük işletmeler stajyer almaktan çekiniyor çünkü ' +
            '"bir de sigorta masrafı çıkar" diye düşünüyorlar. Çoğu zorunlu staj durumunda bu doğru değil ve ' +
            'bunu tek cümleyle söylemek başvurunun kabul edilme ihtimalini artırıyor.',
        ],
      },
      {
        figur: {
          kaynak: '/rehber-gorseller/staj-sigortasi-karar-agaci.svg',
          alt:
            'Staj sigortası karar ağacı. Soru: okulun bu staj için zorunlu staj formu düzenliyor mu? ' +
            'Evet ise zorunlu staj — sigorta girişini genellikle okul yapıyor; hayır ise gönüllü staj — ' +
            'yükümlülük işyerine geçebiliyor. İki durumda da kesin cevap okulun staj yönergesinde.',
          aciklama:
            'Şema bir karar değil, soru sırası: hangi dalda olduğunu belirledikten sonra bile ' +
            'bağlayıcı cevap okulunun yönergesinden ve işyeriyle yaptığın yazılı anlaşmadan geliyor.',
          genislik: 400,
          yukseklik: 520,
        },
      },
      {
        baslik: 'Zorunlu stajda yükümlülük kimde',
        paragraflar: [
          'Zorunlu staj, müfredatın parçası olan stajdır: okul senden belirli sayıda iş günü staj yapmanı ister ve ' +
            'karşılığında bir "zorunlu staj formu" verir. Bu formun anlamı şudur: öğrenci bizim öğrencimiz, staj ' +
            'bizim programımızın parçası.',
          'Bu durumda iş kazası ve meslek hastalığı sigortası girişi genellikle okul tarafından yapılır ve primi okul öder. ' +
            'İşyerinin evrak tarafında yapması gereken şey formu imzalamak, stajın başlangıç ve bitiş tarihlerini doğrulamak ve ' +
            'staj bitince değerlendirme bölümünü doldurmaktır.',
          'Buradaki ayrımı karıştırmamak gerekiyor: primi okulun ödemesi işverenin SORUMLULUĞUNU kaldırmıyor, yalnızca o ' +
            'primin maliyetini kaldırıyor. 6331 sayılı İş Sağlığı ve Güvenliği Kanunu kapsamını sayarken "çırak ve stajyerler ' +
            'de dâhil olmak üzere tüm çalışanlar" diyor; yani işverenin risk değerlendirmesi, İSG eğitimi, gözetim ve gerekli ' +
            'donanımı sağlama yükümlülükleri stajyer için de aynen geçerli. 3308 sayılı Kanun da işyerinin kusuru hâlinde ' +
            'meydana gelen iş kazası ve meslek hastalığından işvereni sorumlu tutuyor.',
        ],
        uyari:
          'Uygulama üniversiteden üniversiteye değişebiliyor; bazı okullar primi öğrenciden istiyor, bazıları belirli ' +
          'bölümler için farklı işletiyor. Başlamadan önce [okulunun staj birimine](/rehber/universite-staj-birimi) sor ve ' +
          'yönergeyi oku.',
      },
      {
        baslik: 'Gönüllü stajda ne değişiyor',
        paragraflar: [
          'Gönüllü staj, okulun zorunlu tutmadığı, öğrencinin kendi isteğiyle yaptığı stajdır. Okul zorunlu staj formu ' +
            'vermediğinde stajın okulla resmî bir bağı kalmaz — sigorta yükümlülüğü de okulda olmaz.',
          'Bu durumda iki yol vardır: bazı okullar gönüllü staj için de form düzenler ve sigorta girişini yapar; ' +
            'düzenlemiyorsa yükümlülük işyerine geçer. Hangisi olduğunu stajı kabul ettirmeden önce netleştir — ' +
            'işe başladıktan sonra sorulan soru, işvereni hazırlıksız yakalıyor.',
          'Ayrıntısı için: [gönüllü staj ile zorunlu stajın farkı](/rehber/gonullu-staj-rehberi).',
        ],
      },
      {
        baslik: 'Sigorta neyi kapsıyor',
        paragraflar: [
          'Staj sigortası tam kapsamlı bir sigorta değil. Genel sağlık sigortası ya da emeklilik primi anlamına gelmiyor; ' +
            'kapsamı iş kazası ve meslek hastalığıdır. Yani stajda çalışırken başına gelen bir kaza karşılanır, ' +
            'stajın emeklilik gününe sayılması ayrı bir konudur.',
        ],
        liste: [
          'Kapsam: staj süresince, staj yerinde ve staja bağlı işlerde meydana gelen iş kazası ve meslek hastalığı.',
          'Kapsam dışı: staj dışındaki zamanlar ve staj yerine gidiş gelişin genel sağlık sigortası tarafı.',
          'Prim oranı ve tabanı her yıl değişiyor; güncel rakam için resmî kaynağa bak.',
        ],
      },
      {
        baslik: 'İşverene nasıl anlatmalı',
        paragraflar: [
          'Başvuru e-postana tek cümle eklemek çoğu tereddüdü kaldırıyor. Rakam vermeye, mevzuat maddesi saymaya gerek yok; ' +
            'söylenmesi gereken şey işverenin sorduğu şey: "bana ne yükümlülük çıkıyor".',
        ],
        karsilastirma: {
          kotuBaslik: 'Belirsiz',
          iyiBaslik: 'Net',
          kotu: [
            'Sigorta işlemleri için gerekeni yaparız.',
            'Staj konusunda okulla görüşeceğim.',
            'Sigorta sorununu hallederim.',
          ],
          iyi: [
            'Zorunlu staj sigortam okulum tarafından karşılanıyor; gerekli belgeyi paylaşabilirim.',
            'Okulumun zorunlu staj formunu ekte gönderiyorum; sizden yalnızca imza ve tarih onayı gerekiyor.',
            'Staj bitiminde değerlendirme formunu doldurmanız yeterli.',
          ],
        },
      },
      {
        baslik: 'Sık yapılan hatalar',
        liste: [
          'Sigortayı işe başladıktan sonra sormak. Giriş stajın ilk gününden önce yapılmalı; sonradan tarih geriye çekmek çoğu zaman mümkün olmuyor.',
          'Formu okula geç teslim etmek. Okulların çoğunda son teslim tarihi stajın başlangıcından haftalar önce.',
          'Gönüllü stajı zorunlu staj gibi anlatmak. İşveren formu bekliyor, form gelmiyor ve staj başlamadan tıkanıyor.',
          'Staj tarihlerini işverenle sözlü konuşup okula başka tarih yazdırmak. Sigorta girişi yazılı tarihe göre yapılıyor.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Zorunlu stajda sigorta primini kim öder?',
        cevap:
          'Genellikle öğrencinin okulu öder ve işyerine bu primin maliyeti çıkmaz. Bu, işverenin iş sağlığı ve güvenliği yükümlülüklerini kaldırmıyor: 6331 sayılı Kanun stajyerleri de kapsıyor ve 3308 sayılı Kanun işyerinin kusuru hâlindeki iş kazasından işvereni sorumlu tutuyor. Bazı üniversiteler primi farklı uyguluyor; kesin cevap için kendi okulunun staj yönergesine bak.',
      },
      {
        soru: 'Gönüllü stajda sigorta zorunlu mu?',
        cevap:
          'Okul zorunlu staj formu düzenlemiyorsa stajın okulla resmî bağı olmaz ve sigorta yükümlülüğü işyerine geçebilir. Staja başlamadan önce bunu yazılı olarak netleştirmek gerekiyor.',
      },
      {
        soru: 'Primi okul ödüyorsa işverenin hiçbir sorumluluğu kalmıyor mu?',
        cevap:
          'Hayır. Primi okulun ödemesi yalnızca o ödemenin maliyetini kaldırır. 6331 sayılı İş Sağlığı ve Güvenliği Kanunu çırak ve stajyerler de dâhil tüm çalışanları kapsıyor; risk değerlendirmesi, İSG eğitimi ve gözetim yükümlülükleri stajyer için de sürüyor. 3308 sayılı Kanun ayrıca işyerinin kusuru hâlinde meydana gelen iş kazası ve meslek hastalığından işvereni sorumlu tutuyor.',
      },
      {
        soru: 'Staj sigortası emekliliğe sayılır mı?',
        cevap:
          'Staj sigortasının kapsamı iş kazası ve meslek hastalığıdır; uzun vadeli sigorta kolları (emeklilik) bu kapsamda değildir. Bu yüzden staj süresi doğrudan emeklilik gün sayısına eklenmez.',
      },
      {
        soru: 'Sigorta girişi yapılmadan staja başlarsam ne olur?',
        cevap:
          'Bir kaza durumunda güvencesiz kalırsın ve okul stajı geçersiz sayabilir. Sigorta girişinin ilk günden önce yapıldığını okul biriminden yazılı olarak teyit et.',
      },
    ],
    kaynaklar: [
      { etiket: '6331 sayılı İş Sağlığı ve Güvenliği Kanunu, madde 2 (kapsam)', adres: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.6331.pdf', kurum: 'Mevzuat Bilgi Sistemi', tur: 'belge', destekledigi: 'Kanunun "çırak ve stajyerler de dâhil olmak üzere tüm çalışanlara" uygulandığı; işverenin İSG yükümlülüklerinin stajyer için de sürdüğü.' },
      { etiket: '3308 sayılı Mesleki Eğitim Kanunu, madde 25', adres: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.3308.pdf', kurum: 'Mevzuat Bilgi Sistemi', tur: 'belge', destekledigi: 'İşyerinin kusuru hâlinde meydana gelen iş kazası ve meslek hastalığından işverenin sorumlu olduğu.' },
      { etiket: '5510 sayılı Kanun — sigortalılık ve kısa vadeli sigorta kolları', adres: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5510.pdf', kurum: 'Mevzuat Bilgi Sistemi', tur: 'belge', destekledigi: 'Staj sigortasının kapsamının iş kazası ve meslek hastalığı ile sınırlı olduğu.' },
      { etiket: 'e-Devlet — SGK tescil ve hizmet dökümü', adres: 'https://www.turkiye.gov.tr/sgk-tescil-ve-hizmet-dokumu', kurum: 'Cumhurbaşkanlığı Dijital Dönüşüm Ofisi', tur: 'belge', destekledigi: 'Sigorta girişinin yapılıp yapılmadığını hizmet dökümünden görme.' },
    ],
    guncelleme: '2026-09-03',
    inceleyen: 'StajımVar içerik ekibi',
    sonrakiAdim: {
      etiket: 'Açık staj ilanlarına bak',
      yol: '/',
      aciklama: 'Sigorta tarafını netleştirdiysen sıradaki adım başvuru.',
    },
  }),

  metinRehberi({
    slug: 'staj-ucreti-nasil-hesaplanir',
    baslik: 'Staj ücreti nasıl hesaplanır?',
    ozet: 'Ücret zorunlu mu, neye göre belirleniyor, devlet desteği nasıl işliyor.',
    konu: 'staj',
    etiketler: ['staj ücreti', 'maaş', 'asgari ücret', 'devlet desteği'],
    oneCikan: true,
    aciklama:
      'Staj ücreti nasıl hesaplanır? Zorunlu stajda ücret yükümlülüğü, işletme büyüklüğüne göre ' +
      'değişen oran ve devlet katkısının mekanizması.',
    hizliCevap:
      'Zorunlu stajda ücret, asgari ücretin belirli bir oranı olarak hesaplanır ve oran işletmedeki ' +
      'çalışan sayısına göre değişir. Bu ödemenin bir kısmı devlet tarafından karşılanabiliyor. ' +
      'Oranlar ve asgari ücret her yıl değiştiği için sitede sabit rakam yazmıyoruz — güncel tutarı ' +
      '[staj ücreti hesaplama aracıyla](/araclar/staj-ucreti-hesaplama) ve resmî kaynaktan kontrol et.',
    bloklar: [
      {
        paragraflar: [
          'Staj ücreti öğrencinin en çok merak ettiği ama en az sorduğu konu. Sormaktan çekinmenin sebebi genellikle ' +
            '"ücret istersem beni almazlar" korkusu; oysa zorunlu stajda ücret çoğu durumda işverenin tercihine bırakılmış ' +
            'bir şey değil, kurallı bir ödeme.',
        ],
      },
      {
        baslik: 'Ücret neye göre belirleniyor',
        paragraflar: [
          'Zorunlu stajda ödenecek asgari tutar iki şeye bağlı: yürürlükteki asgari ücret ve işletmenin büyüklüğü. ' +
            'Belirli bir çalışan sayısının altındaki işletmeler için oran daha düşük, üstündekiler için daha yüksek uygulanıyor.',
          'İşveren bu asgari tutarın üstünde ödeme yapmakta serbest; kanun yalnızca alt sınırı belirliyor, üst sınır koymuyor. ' +
            'Şirketlerin fiilen ne ödediğine dair elimizde doğrulanmış bir veri yok, o yüzden bir ortalama söylemiyoruz — ' +
            'ilanda yazan tutara ve işverene sorduğun cevaba bak.',
        ],
        liste: [
          'Hesabın tabanı: yürürlükteki asgari ücretin NET tutarı. 3308 sayılı Kanun m.25 böyle diyor; brüt üzerinden hesaplamak tutarı olduğundan yüksek gösterir.',
          'Çarpan: işletmedeki çalışan sayısına göre değişen oran.',
          'Süre: fiilen staj yapılan gün sayısı. Devamsız geçen gün ödenmiyor.',
          'Oran: yirmiden az personel çalıştıran işyerinde net asgari ücretin yüzde 15’i, yirmi ve üzerinde yüzde 30’u (3308 m.25).',
          'Kapsam dışı: staj yapacak işletme bulunamadığı için stajını kendi okulunda ya da üniversitesinde yapan öğrenciler bu alt sınıra dayanamıyor.',
          'Üst sınır yok: işveren daha fazlasını ödeyebilir.',
        ],
      },
      {
        baslik: 'Devlet katkısı nasıl işliyor',
        paragraflar: [
          'Ödenen staj ücretinin bir kısmı, koşullar sağlandığında devlet tarafından karşılanabiliyor. Mekanizma şu: ' +
            'işveren ücreti öğrenciye öder, sonra belirlenen kısmı için başvurur ve geri alır. Yani öğrenciye ödeme ' +
            'yine işverenden gider; katkı işverenin maliyetini düşürür.',
          'Bu, küçük işletmelere staj teklif ederken söylenebilecek en işe yarar cümlelerden biri. Ayrıntısını bilmen ' +
            'gerekmiyor; "bir kısmının devlet katkısıyla karşılanabildiğini biliyorum, isterseniz kaynağını göndereyim" ' +
            'demek yetiyor.',
        ],
        uyari:
          'Oranlar, üst sınırlar ve başvuru koşulları her yıl güncelleniyor. Bu sayfada rakam yazmıyoruz; ' +
          'güncel tutar için resmî kaynağa bak.',
      },
      {
        baslik: 'Ücreti nasıl sorarsın',
        paragraflar: [
          'Ücreti ilk e-postada sormak gerekmiyor; görüşmeye çağrıldığında sormak hem doğal hem de zamanı. ' +
            'Soruyu pazarlık gibi değil, bilgi sorusu gibi kur.',
        ],
        karsilastirma: {
          kotuBaslik: 'Böyle sorma',
          iyiBaslik: 'Böyle sor',
          kotu: [
            'Ne kadar ödüyorsunuz?',
            'Ücretsiz staj yapmam.',
            'Başka yer daha fazla veriyor.',
          ],
          iyi: [
            'Staj ücreti ve ödeme dönemi konusunda bilgi alabilir miyim?',
            'Zorunlu staj kapsamında ücret uygulamanız nasıl işliyor?',
            'Yol ve yemek desteği veriyor musunuz?',
          ],
        },
      },
      {
        baslik: 'Ücret dışında sorulacaklar',
        liste: [
          'Yol ve yemek desteği var mı, ayrı mı ödeniyor.',
          'Ödeme hangi gün yapılıyor ve ilk ödeme ne zaman.',
          'Devamsız geçen gün nasıl işleniyor.',
          'Staj süresi uzarsa ödeme devam ediyor mu.',
        ],
      },
      {
        baslik: 'Ödeme yapılmazsa',
        paragraflar: [
          'Zorunlu stajda ödeme yapılmıyorsa önce işyerindeki sorumluna, sonra okulun staj birimine söyle. ' +
            'Okul stajı onaylayan taraf olduğu için işyeriyle konuşma ağırlığı sende değil onlarda. ' +
            'Yazışmaları ve staj formunun bir kopyasını sakla.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Zorunlu stajda ücret ödemek zorunlu mu?',
        cevap:
          'Zorunlu staj yapan öğrenciye asgari ücretin belirli bir oranında ödeme yapılması esastır ve oran işletmedeki çalışan sayısına göre değişir. Güncel oran ve tutar için resmî kaynağa bakmak gerekiyor.',
      },
      {
        soru: 'Gönüllü stajda ücret ödenir mi?',
        cevap:
          'Gönüllü stajda ücret tarafların anlaşmasına bağlıdır; zorunlu stajdaki gibi kurallı bir alt sınır işlemez. Anlaşmayı staja başlamadan yazılı hale getirmek gerekiyor.',
      },
      {
        soru: 'Staj ücretinden vergi kesilir mi?',
        cevap:
          'Staj ödemelerinin vergilendirilmesi normal ücretten farklı işliyor ve kurallar değişebiliyor. Net tutarı öğrenmek için işverenin bordro biriminden yazılı bilgi iste.',
      },
      {
        soru: 'Devamsız geçen gün için ücret alınır mı?',
        cevap:
          'Ödeme fiilen staj yapılan güne göre hesaplandığı için devamsız geçen gün genellikle ödenmez ve o gün stajın gün sayısına da sayılmaz.',
      },
    ],
    kaynaklar: [
      { etiket: '3308 sayılı Mesleki Eğitim Kanunu, madde 25', adres: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.3308.pdf', kurum: 'Mevzuat Bilgi Sistemi', tur: 'belge', destekledigi: 'Ücretin asgari ücretin NET tutarı üzerinden hesaplandığı; yirmiden az personelde %15, yirmi ve üzerinde %30 alt sınırı; okulda yapılan stajların kapsam dışı olduğu.' },
      { etiket: 'Asgari Ücret Tespit Komisyonu Kararı (2025/1) — Resmî Gazete, 26/12/2025', adres: 'https://www.resmigazete.gov.tr/eskiler/2025/12/20251226-6.pdf', kurum: 'Resmî Gazete', tur: 'belge', destekledigi: '2026 yılı net asgari ücretin 28.075,50 TL olarak belirlendiği.' },
      { etiket: 'Çalışma ve Sosyal Güvenlik Bakanlığı — 2026 asgari ücret duyurusu', adres: 'https://www.csgb.gov.tr/cgm/haberler/23122025/', kurum: 'Çalışma ve Sosyal Güvenlik Bakanlığı', tur: 'belge', destekledigi: '2026 net ve brüt asgari ücret tutarlarının resmî duyurusu.' },
    ],
    guncelleme: '2026-09-03',
    inceleyen: 'StajımVar içerik ekibi',
    sonrakiAdim: {
      etiket: 'Staj ücretini hesapla',
      yol: '/araclar/staj-ucreti-hesaplama',
      aciklama: 'Güncel asgari ücret ve işletme büyüklüğüyle tutarı gör.',
    },
  }),

  metinRehberi({
    slug: 'staj-basvurusu-gerekli-belgeler',
    baslik: 'Staj başvurusunda gerekli belgeler',
    ozet: 'Hangi belge nereden alınır, hangi sırayla toplanır.',
    konu: 'staj',
    etiketler: ['belge', 'evrak', 'öğrenci belgesi', 'transkript', 'staj formu'],
    aciklama:
      'Staj başvurusunda hangi belgeler isteniyor? Öğrenci belgesi, transkript, zorunlu staj formu ' +
      've nüfus belgesi nereden alınır, hangi sırayla toplanır.',
    hizliCevap:
      'Çoğu staj başvurusunda dört belge yeterli: öğrenci belgesi, transkript, zorunlu staj formu ve CV. ' +
      'Öğrenci belgesi ve transkript e-Devlet ya da öğrenci bilgi sisteminden anında alınır; zorunlu staj formu ' +
      'okulun staj biriminden gelir ve en uzun süren adım odur. Belgeleri başvurudan önce toplarsan ' +
      '"formu ne zaman getirirsin" sorusunda beklemezsin.',
    bloklar: [
      {
        paragraflar: [
          'Staj sürecinde zaman kaybının çoğu belge sırasının yanlış kurulmasından çıkıyor: önce yer bulunuyor, ' +
            'sonra form isteniyor, form haftalar sürüyor ve işveren beklerken vazgeçiyor. Doğru sıra tersine yakın.',
        ],
      },
      {
        figur: {
          kaynak: '/rehber-gorseller/staj-belge-dosyasi.svg',
          alt:
            'Staj belge dosyası kaynağına göre üçe ayrılmış: senden gelenler (öğrenci belgesi, ' +
            'transkript, nüfus cüzdanı fotokopisi, CV) anında hazır; okuldan gelen zorunlu staj formu ' +
            've sigorta teyidi günler ya da haftalar sürüyor; işyerinden unvan, adres, vergi ve SGK ' +
            'bilgileri isteniyor.',
          aciklama:
            'Belgeleri kaynağına ve süresine göre ayırmak sırayı da veriyor: anında alınanlarla ' +
            'başvuruyu yap, en uzun süren okul formunu olumlu dönüşten sonra başlat.',
          genislik: 400,
          yukseklik: 644,
        },
      },
      {
        baslik: 'Temel belgeler',
        tablo: {
          sutunlar: ['Belge', 'Nereden alınır', 'Ne kadar sürer'],
          satirlar: [
            ['Öğrenci belgesi', 'e-Devlet ya da öğrenci bilgi sistemi', 'Anında'],
            ['Transkript', 'Öğrenci bilgi sistemi ya da öğrenci işleri', 'Anında – birkaç gün'],
            ['Zorunlu staj formu', 'Bölümün staj birimi / staj komisyonu', 'Günler – haftalar'],
            ['Nüfus cüzdanı fotokopisi', 'Kendinde', 'Anında'],
            ['CV', 'Kendin hazırlıyorsun', 'Bir akşam'],
          ],
        },
      },
      {
        baslik: 'Doğru sıra',
        sirali: [
          'Bölümünün staj yönergesini oku: kaç iş günü, hangi tarih aralığı, hangi form.',
          'Öğrenci belgesi ve transkripti indir. Bunlar anında ve ücretsiz.',
          '[CV\'ni hazırla](/rehber/staj-cv-nasil-yazilir) ve PDF olarak kaydet.',
          'Başvurularını yap. Form henüz elinde olmasa da olur — "formu okuldan alıp getireceğim" demek yeterli.',
          'Olumlu dönüş gelince zorunlu staj formunu başlat: işyerinin unvanı, adresi ve vergi bilgileri gerekiyor.',
          'İmzalı formu okula teslim et ve sigorta girişinin yapıldığını yazılı olarak teyit et.',
        ],
        uyari:
          'Formun okula teslim edilmesi için çoğu okulda stajın başlangıcından haftalar önce bir son tarih var. ' +
          'Bu tarihi kaçırırsan staj yerin hazır olsa bile o dönem staj yapamayabilirsin.',
      },
      {
        baslik: 'İşyerinden isteyeceğin bilgiler',
        paragraflar: [
          'Zorunlu staj formunun işyeri bölümü çoğu zaman öğrencinin bilmediği bilgileri istiyor. Bunları tek seferde ' +
            'sormak, forma üç kere gidip gelmekten iyi.',
        ],
        kontrol: {
          baslik: 'Tek e-postada sor',
          maddeler: [
            'İşyerinin tam yasal unvanı',
            'Adres ve faaliyet alanı',
            'Vergi dairesi ve vergi numarası',
            'SGK işyeri sicil numarası (form istiyorsa)',
            'Formu imzalayacak yetkilinin adı ve unvanı',
            'Stajın başlangıç ve bitiş tarihi',
          ],
        },
      },
      {
        baslik: 'Sık yapılan hatalar',
        liste: [
          'Transkripti "not ortalamam düşük" diye göndermemek. İstenmişse göndermemek, düşük ortalamadan daha kötü görünüyor.',
          'Belgeleri telefon fotoğrafı olarak göndermek. PDF olarak tara ya da e-Devlet çıktısını doğrudan yolla.',
          'Dosya adlarını "belge1.pdf" bırakmak. "AdSoyad-transkript.pdf" hem bulunur hem ciddi durur.',
          'Formu doldurmadan işverene göndermek. Öğrenci bölümünü sen doldurup öyle iletmelisin.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Öğrenci belgesini nereden alırım?',
        cevap:
          'e-Devlet üzerinden barkodlu öğrenci belgesi anında alınabiliyor; okulun öğrenci bilgi sisteminden de indirilebiliyor. İkisi de resmî kabul ediliyor.',
      },
      {
        soru: 'Zorunlu staj formunu işveren mi doldurur?',
        cevap:
          'Formun öğrenci bölümünü sen, işyeri bölümünü işveren doldurur. Sen kendi kısmını doldurup imzalı şekilde iletirsen süreç bir tur kısalır.',
      },
      {
        soru: 'Başvuru sırasında transkript zorunlu mu?',
        cevap:
          'Zorunlu değil ama birçok büyük şirket istiyor. Hazırda bulundurmak, isteyen olduğunda bir gün kaybetmemeni sağlıyor.',
      },
      {
        soru: 'Belgelerin geçerlilik süresi var mı?',
        cevap:
          'Öğrenci belgesi ve transkript genellikle güncel tarihli isteniyor. Aylar önce alınmış bir belge yerine başvuru sırasında yeniden indirmek daha güvenli.',
      },
    ],
    kaynaklar: [{ etiket: 'e-Devlet Kapısı', adres: 'https://www.turkiye.gov.tr' }],
    sonrakiAdim: {
      etiket: 'Başvuru e-postası şablonunu aç',
      yol: '/basvuru-sablonu',
      aciklama: 'Belgeler hazırsa sıradaki adım e-postayı yazmak.',
    },
  }),

  metinRehberi({
    slug: 'ilan-acmayan-sirkete-nasil-yazilir',
    baslik: 'İlan açmayan şirkete nasıl yazılır?',
    ozet: 'Rekabetin en düşük olduğu kanal; kimin okuyacağını bilmek yeter.',
    konu: 'staj',
    etiketler: ['soğuk başvuru', 'e-posta', 'ilan yok', 'kendiliğinden başvuru'],
    oneCikan: true,
    aciklama:
      'İlan açmayan şirkete staj için nasıl yazılır? Doğru adresi bulmak, konu satırı, ' +
      'metin yapısı ve takip e-postası.',
    hizliCevap:
      'Stajyer alan şirketlerin çoğu ilan açmıyor; alacaklarını da genellikle kendilerine yazan öğrenciler ' +
      'arasından seçiyorlar. Yapman gereken üç şey var: doğru adresi bulmak, konu satırını "Staj Başvurusu — ' +
      'Bölüm — Tarih aralığı" biçiminde yazmak ve metinde neden o şirket olduğunu tek cümleyle söylemek. ' +
      'Cevap gelmezse bir hafta sonra bir kez hatırlatmak normal.',
    bloklar: [
      {
        paragraflar: [
          'İlan sitelerinde bir staj ilanına yüzlerce başvuru geliyor. İlan açmayan bir şirkete gelen staj ' +
            'e-postası sayısı ise çoğu zaman ayda birkaç. Rekabet farkı buradan çıkıyor — ve bu kanal en az ' +
            'denenen kanal olduğu için bu fark uzun süre kapanmıyor.',
        ],
      },
      {
        baslik: 'Doğru adresi bulmak',
        paragraflar: [
          'Genel "info@" adresine giden e-postaların çoğu okunmadan geçiyor. Küçük işletmelerde bu adres yeterli olabiliyor ' +
            'çünkü kutuya bakan kişi karar veren kişi. Orta ve büyük şirketlerde insan kaynakları adresini ya da ' +
            'ilgili birimdeki bir kişiyi bulmak gerekiyor.',
        ],
        sirali: [
          'Şirketin kendi sitesindeki "Kariyer" ya da "İnsan Kaynakları" sayfasına bak.',
          'Yoksa "İletişim" sayfasındaki kurumsal adresi al.',
          'LinkedIn\'de şirkette çalışan İK ya da ilgili birim yöneticisini bul; kısa bir mesaj e-postadan hızlı dönüyor.',
          'Hiçbiri yoksa genel adrese yaz ama konu satırını doğru kur — okunmasını sağlayan şey o.',
        ],
      },
      {
        baslik: 'Konu satırı e-postayı açtıran şey',
        karsilastirma: {
          kotuBaslik: 'Açılmayan konu',
          iyiBaslik: 'Açılan konu',
          kotu: ['Merhaba', 'Staj', 'Başvuru', '(boş konu)'],
          iyi: [
            'Staj Başvurusu — Makine Mühendisliği — Temmuz-Ağustos',
            'Zorunlu Yaz Stajı Başvurusu — Bilgisayar Müh. 3. sınıf',
            'Staj Başvurusu — Giyim Üretim Teknolojisi — 20 iş günü',
          ],
        },
      },
      {
        baslik: 'Metnin iskeleti',
        paragraflar: [
          'Uzun yazmak işe yaramıyor; okunma süresi otuz saniye. Beş bilgi yeterli.',
        ],
        sirali: [
          'Kim olduğun: üniversite, bölüm, sınıf.',
          'Ne istediğin: hangi tarih aralığında kaç iş günü staj.',
          'Neden o şirket: ürün, proje ya da alan adıyla, tek cümle.',
          'Ne yapabildiğin: bir ders projesi, kullandığın bir program, yaptığın bir iş.',
          'Yükümlülük: sigorta okul tarafından yapılacaksa bunu söyle.',
        ],
        uyari:
          '"Neden o şirket" cümlesi kopyala-yapıştır anlaşılıyor. Şirketin sitesinde beş dakika geçirip somut bir şey ' +
          'yazmak, aynı e-postayı yirmi şirkete göndermekten daha çok sonuç veriyor.',
      },
      {
        baslik: 'Takip e-postası',
        paragraflar: [
          'Cevap gelmemesi çoğu zaman ret değil, e-postanın kaybolması. Bir hafta sonra aynı konu başlığına yanıt ' +
            'olarak iki cümlelik bir hatırlatma göndermek fazla ısrar sayılmıyor. İkinci hatırlatmadan sonra bırak.',
        ],
        liste: [
          'Yeni bir e-posta değil, aynı zincire yanıt yaz — böylece ilk mesaj da görünür.',
          'Yeni bir bilgi ekle: tarih aralığını güncelledin, bir proje bitirdin.',
          'Cuma öğleden sonra ve pazartesi sabahı yerine salı-perşembe arası gönder.',
        ],
      },
      {
        baslik: 'Kaç şirkete yazmalı',
        paragraflar: [
          'Bu kanalda dönüş oranı düşük ama sıfır değil. Gerçekçi bir hedef: haftada on kişiselleştirilmiş e-posta. ' +
            'Yirmi beşinci e-postada ilk olumlu dönüşü almak olağan bir sonuç; bunu baştan bilmek vazgeçmeni engelliyor.',
        ],
      },
    ],
    sss: [
      {
        soru: 'İlan açmayan şirkete yazmak rahatsız edici olmaz mı?',
        cevap:
          'Kısa, doğru adrese giden ve neden o şirket olduğunu söyleyen bir e-posta rahatsız edici değil. Rahatsız eden şey aynı metnin toplu gönderildiğinin belli olması.',
      },
      {
        soru: 'CV\'yi ilk e-postaya eklemeli miyim?',
        cevap:
          'Evet, PDF olarak ekle ve dosya adına adını yaz. İkinci e-postayı beklemek süreci uzatıyor.',
      },
      {
        soru: 'Kaç gün sonra hatırlatma yazmalıyım?',
        cevap:
          'Bir hafta uygun bir aralık. Aynı e-posta zincirine yanıt olarak yaz ve iki cümleyi geçme.',
      },
      {
        soru: 'LinkedIn mesajı e-postadan iyi mi?',
        cevap:
          'İkisi farklı işe yarıyor: LinkedIn doğru kişiye ulaşmak için hızlı, e-posta ise belge göndermek ve resmî bir iz bırakmak için gerekli. İkisini birlikte kullanmak en iyi sonucu veriyor.',
      },
    ],
    sonrakiAdim: {
      etiket: 'Başvuru e-postası şablonunu aç',
      yol: '/basvuru-sablonu',
      aciklama: 'Profilindeki bilgilerle doldurulmuş, kopyalanabilir metin.',
    },
  }),

  metinRehberi({
    slug: 'stajda-izin-ve-devamsizlik',
    baslik: 'Stajda izin ve devamsızlık',
    ozet: 'Hangi gün sayılır, hangi gün sayılmaz, rapor ne oluyor.',
    konu: 'staj',
    etiketler: ['izin', 'devamsızlık', 'rapor', 'iş günü'],
    aciklama:
      'Stajda izin alınır mı, devamsızlık ne oluyor, hastalık raporu stajı uzatır mı? ' +
      'İş günü hesabı ve okulun kabul ettiği mazeretler.',
    hizliCevap:
      'Staj gün sayısı iş günü üzerinden hesaplanır: hafta sonları ve resmî tatiller sayılmaz, ' +
      'devamsız geçen günler de sayılmaz ve genellikle stajın sonuna eklenerek telafi edilir. ' +
      'İzin ve mazeret kuralları okulun staj yönergesine göre değişiyor; hastalık durumunda ' +
      'raporu hem işyerine hem okula ulaştırmak gerekiyor.',
    bloklar: [
      {
        paragraflar: [
          'Staj günü hesabı basit görünüyor ama en çok sorun çıkan yerlerden biri. "20 iş günü" ifadesi takvimde ' +
            'dört hafta demek değil; araya giren resmî tatil ve devamsızlık stajı uzatıyor.',
        ],
      },
      {
        baslik: 'İş günü nasıl sayılıyor',
        liste: [
          'Hafta içi günler sayılır; cumartesi ve pazar genellikle sayılmaz.',
          'İşyeri cumartesi çalışıyorsa ve okulun yönergesi izin veriyorsa cumartesi sayılabilir — bunu önceden okula sor.',
          'Resmî tatiller sayılmaz; o günler stajın sonuna eklenir.',
          'Devamsız geçen gün sayılmaz ve genellikle telafi edilmesi gerekir.',
        ],
        uyari:
          'Kaç iş günü staj yapman gerektiğini ve hangi günlerin sayıldığını kendi bölümünün yönergesi belirliyor. ' +
          'Tarih hesabı için [staj günü hesaplama aracını](/araclar/staj-gunu-hesaplama) kullanabilirsin.',
      },
      {
        baslik: 'İzin almak',
        paragraflar: [
          'Staj bir ders değil, bir işyerinde bulunma. İzin isteme biçimi de işyerindeki gibi olmalı: önceden, ' +
            'yazılı ve gerekçeli. Sınav, resmî işlem ya da sağlık sebebiyle izin çoğu işyerinde sorun olmuyor; ' +
            'sorun olan şey haber vermemek.',
        ],
        kontrol: {
          baslik: 'İzin isterken',
          maddeler: [
            'En az bir gün önceden söyle',
            'Sebebini kısaca yaz, ayrıntıya girme',
            'Telafi edeceğin günü kendin öner',
            'Sorumlundan yazılı onay al (e-posta yeterli)',
            'Okulun staj birimini gerekiyorsa bilgilendir',
          ],
        },
      },
      {
        baslik: 'Hastalık ve rapor',
        paragraflar: [
          'Hastalandığında ilk iş işyerini aynı gün bilgilendirmek. Rapor alırsan raporun bir kopyası hem işyerine ' +
            'hem okulun staj birimine gitmeli. Raporlu geçen günün staj gününe sayılıp sayılmadığı okuldan okula ' +
            'değişiyor; çoğu okulda sayılmaz ve telafi istenir.',
        ],
      },
      {
        baslik: 'Devamsızlık ne kadar olursa staj geçersiz olur',
        paragraflar: [
          'Bunun tek bir cevabı yok: sınır okulun yönergesinde yazıyor. Bazı okullar belirli bir gün sayısının ' +
            'üstündeki devamsızlıkta stajı tamamen geçersiz sayıyor, bazıları telafiye izin veriyor. ' +
            'Bir gün bile kaçırdıysan yönergedeki maddeyi okumak en güvenlisi.',
        ],
        uyari:
          'Staj defterine devamsız geçen günü çalışılmış gibi yazma. Defter ile işyeri kaydı çeliştiğinde ' +
          'staj tümüyle reddedilebiliyor. [Staj defteri nasıl doldurulur](/rehber/staj-defteri-nasil-doldurulur).',
      },
    ],
    sss: [
      {
        soru: 'Stajda hafta sonu çalışırsam sayılır mı?',
        cevap:
          'Çoğu okulun yönergesinde staj günleri hafta içi üzerinden sayılıyor. İşyeri cumartesi çalışıyorsa bunun sayılıp sayılmayacağını staj birimine önceden sormak gerekiyor.',
      },
      {
        soru: 'Resmî tatiller staj gününe sayılır mı?',
        cevap:
          'Genellikle sayılmaz; o günler stajın sonuna eklenerek gün sayısı tamamlanır. Bu yüzden bayram dönemine denk gelen stajlar takvimde daha uzun sürüyor.',
      },
      {
        soru: 'Sınav için izin alabilir miyim?',
        cevap:
          'Çoğu işyeri sınav iznini kabul ediyor. Önceden haber vermek ve telafi günü önermek işi kolaylaştırıyor; okulun yönergesi devamsızlığa nasıl baktığını da belirliyor.',
      },
      {
        soru: 'Raporlu olduğum gün stajdan sayılır mı?',
        cevap:
          'Çoğu okulda sayılmaz ve telafi edilmesi istenir. Raporun kopyasını hem işyerine hem staj birimine ulaştır.',
      },
    ],
    kaynaklar: [
      { etiket: 'Yükseköğretim Kurulu (YÖK)', adres: 'https://www.yok.gov.tr', kurum: 'Yükseköğretim Kurulu', tur: 'kurum' },
    ],
    sonrakiAdim: {
      etiket: 'Staj gününü hesapla',
      yol: '/araclar/staj-gunu-hesaplama',
      aciklama: 'Tatilleri çıkarıp bitiş tarihini gör.',
    },
  }),

  metinRehberi({
    slug: 'uzaktan-staj-kabul-edilir-mi',
    baslik: 'Uzaktan staj okul tarafından kabul edilir mi?',
    ozet: 'Cevap bölüme göre değişiyor; sormadan başlama.',
    konu: 'staj',
    etiketler: ['uzaktan staj', 'remote', 'online staj', 'hibrit'],
    aciklama:
      'Uzaktan staj zorunlu staj yerine sayılır mı? Okulların yaklaşımı, sorulması gereken sorular ' +
      've uzaktan stajda dikkat edilecekler.',
    hizliCevap:
      'Uzaktan stajın zorunlu staj yerine sayılıp sayılmadığına okul karar veriyor ve cevap bölümden bölüme ' +
      'değişiyor: yazılım ve tasarım bölümlerinde çoğunlukla kabul edilirken, laboratuvar ya da şantiye ' +
      'gerektiren bölümlerde kabul edilmeyebiliyor. Staj yerini kabul ettirmeden önce staj komisyonundan ' +
      'yazılı onay al — sonradan alınan sözlü onay işe yaramıyor.',
    bloklar: [
      {
        paragraflar: [
          'Uzaktan staj ilanları arttı ama okulların yönergeleri aynı hızda güncellenmedi. Bu yüzden en sık ' +
            'yaşanan şey şu: öğrenci uzaktan stajı buluyor, kabul ediliyor, staj bitiyor ve okul saymıyor.',
        ],
        uyari:
          'Bu sayfadaki hiçbir cümle senin okulunun kararının yerine geçmez. Tek geçerli cevap bölümünün ' +
          'staj komisyonundan yazılı olarak alınan onaydır.',
      },
      {
        baslik: 'Okullar neye bakıyor',
        liste: [
          'Stajın öğrenme çıktısı ölçülebiliyor mu: yapılan iş defterde ve raporda gösterilebiliyor mu.',
          'Denetim mümkün mü: işyeri sorumlusu stajyeri gerçekten yönlendiriyor mu.',
          'Bölümün doğası: fiziksel ortam gerektiren bölümlerde uzaktan staj çoğunlukla kabul edilmiyor.',
          'İşyerinin niteliği: kayıtlı bir işyeri mi, sigorta girişi yapılabiliyor mu.',
        ],
      },
      {
        baslik: 'Onayı nasıl alırsın',
        sirali: [
          'Bölümünün staj yönergesinde "uzaktan", "çevrim içi" ya da "işyeri dışında" ifadelerini ara.',
          'Bulamazsan staj komisyonuna e-posta yaz; sözlü sorma, yazılı sor.',
          'E-postada işyerinin adını, yapılacak işi ve gün/saat düzenini yaz.',
          'Onay gelirse e-postayı sakla; staj sonunda itiraz çıkarsa dayanağın o.',
        ],
      },
      {
        baslik: 'Uzaktan stajda işe yarayan alışkanlıklar',
        paragraflar: [
          'Uzaktan stajda en büyük risk görünmez olmak. Ofiste bulunmanın kendiliğinden sağladığı şeyi ' +
            'uzaktan bilinçli yapmak gerekiyor.',
        ],
        liste: [
          'Her gün kısa bir durum mesajı yaz: dün ne yaptım, bugün ne yapacağım, nerede takıldım.',
          'Kamerayı açık tut. Görüşmede yüz görmek, yazışmada olmayan güveni kuruyor.',
          'İşi teslim ederken ekran görüntüsü ya da bağlantı ekle; "bitti" demek yetmiyor.',
          'Haftada bir yarım saatlik geri bildirim görüşmesi iste.',
          'Yaptığın işleri günlük olarak kaydet; staj defteri sonunda bu kayıttan yazılıyor.',
        ],
      },
      {
        baslik: 'Uzaktan stajda sigorta',
        paragraflar: [
          'Sigorta yükümlülüğü stajın uzaktan olması nedeniyle değişmiyor: zorunlu stajda okul, gönüllü stajda ' +
            'anlaşmaya göre işyeri. Ayrıntısı için [staj sigortasını kim yapar](/rehber/staj-sigortasi-kim-yapar).',
        ],
      },
    ],
    sss: [
      {
        soru: 'Uzaktan staj zorunlu staj yerine geçer mi?',
        cevap:
          'Buna okul karar veriyor ve bölümden bölüme değişiyor. Staja başlamadan önce bölümünün staj komisyonundan yazılı onay almak gerekiyor.',
      },
      {
        soru: 'Hibrit staj kabul ediliyor mu?',
        cevap:
          'Haftanın bir kısmı ofiste geçen hibrit düzen, tamamen uzaktan olan stajlara göre daha çok okulda kabul görüyor. Yine de yazılı onay şart.',
      },
      {
        soru: 'Uzaktan stajda defter nasıl doldurulur?',
        cevap:
          'Defter aynı şekilde günlük doldurulur; yaptığın işi somut olarak yazarsın. İmza ve kaşe için işyeriyle önceden bir yöntem belirle — kargo ya da ıslak imza için tek bir gün ofise gitmek yaygın çözüm.',
      },
    ],
    kaynaklar: [
      { etiket: 'Yükseköğretim Kurulu (YÖK)', adres: 'https://www.yok.gov.tr', kurum: 'Yükseköğretim Kurulu', tur: 'kurum' },
    ],
    sonrakiAdim: {
      etiket: 'Okulun staj birimiyle nasıl çalışılır',
      yol: '/rehber/universite-staj-birimi',
      aciklama: 'Onayı kimden, nasıl isteyeceğini oku.',
    },
  }),

  metinRehberi({
    slug: 'stajyerin-gorev-ve-sorumluluklari',
    baslik: 'Stajyerin görev ve sorumlulukları',
    ozet: 'Ne beklenir, ne beklenmez, sınır nerede.',
    konu: 'staj',
    etiketler: ['stajyer', 'sorumluluk', 'iş tanımı', 'ilk gün'],
    aciklama:
      'Stajyerden ne beklenir? Görev tanımı, çalışma saatleri, gizlilik ve stajyere ' +
      'verilmemesi gereken işler.',
    hizliCevap:
      'Stajyerden beklenen şey üretkenlik değil öğrenme isteği, düzen ve güvenilirlik: zamanında gelmek, ' +
      'anlamadığını sormak, verilen işi takip etmek ve gizliliğe uymak. Stajyer bir işyerinin asıl işgücü ' +
      'yerine konulamaz; günlerin tamamı işle ilgisiz işlerle geçiyorsa bu stajın amacına aykırıdır.',
    bloklar: [
      {
        paragraflar: [
          'Stajın ilk haftası genellikle ne yapacağını bilememekle geçiyor. Bunun sebebi çoğu zaman senin değil, ' +
            'işyerinin hazırlıksız olması. Yine de sonuçtan etkilenen sensin; birkaç alışkanlık farkı büyütüyor.',
        ],
      },
      {
        baslik: 'Senden beklenenler',
        liste: [
          'Zamanında gelmek ve geç kalacaksan önceden haber vermek.',
          'Anlamadığın işi yapmış gibi görünmek yerine sormak.',
          'Verilen işin ne zaman biteceğini söylemek ve bitince haber vermek.',
          'İşyerinde gördüğün müşteri, ürün ve kişi bilgilerini dışarı taşımamak.',
          'Kılık kıyafet ve iletişim konusunda işyerinin düzenine uymak.',
          'Not tutmak: aynı şeyi ikinci kez sormamanın tek yolu.',
        ],
      },
      {
        baslik: 'Senden beklenmeyenler',
        paragraflar: [
          'Staj bir öğrenme dönemi. Aşağıdakiler stajın amacına aykırı ve sürekli hale geldiğinde konuşulması gereken şeyler.',
        ],
        liste: [
          'Günlerin tamamının işle ilgisiz kişisel işlerle geçmesi.',
          'Tek başına, denetimsiz biçimde sorumluluk gerektiren bir işin sana bırakılması.',
          'İş güvenliği eğitimi verilmeden riskli bir alanda çalıştırılmak.',
          'Sözleşmede ve staj formunda yazan tarih ve saatlerin dışına çıkarılmak.',
        ],
        uyari:
          'Bu durumlar sürüyorsa önce işyerindeki sorumlunla konuş; değişmezse okulun staj birimine bildir. ' +
          'Stajı sessizce tamamlayıp sonra şikâyet etmek, defterin onaylanmasını da zorlaştırıyor.',
      },
      {
        baslik: 'İlk gün sorulacak beş soru',
        kontrol: {
          baslik: 'İlk gün',
          maddeler: [
            'Kime bağlı çalışıyorum, takıldığımda kime sorarım?',
            'Çalışma saatleri ve mola düzeni nasıl?',
            'Bu hafta benden ne bekleniyor?',
            'Hangi araçlara ve hesaplara erişimim olacak?',
            'Gizlilik konusunda uymam gereken bir kural var mı?',
          ],
        },
      },
      {
        baslik: 'Görünür olmak',
        paragraflar: [
          'Stajyerlerin çoğu iyi iş çıkarıyor ama kimse fark etmiyor, çünkü yapılan iş anlatılmıyor. ' +
            'Haftada bir, üç maddelik bir özet göndermek işi görünür kılıyor: bu hafta ne yaptım, ne öğrendim, ' +
            'gelecek hafta ne yapacağım. Bu özet aynı zamanda [staj defterinin](/rehber/staj-defteri-nasil-doldurulur) ' +
            've stajın sonunda isteyeceğin referansın hammaddesi.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Stajyer kaç saat çalışır?',
        cevap:
          'Çalışma saatleri staj formunda ve işyerinin düzeninde belirlenir; genellikle işyerinin normal mesai saatleridir. Formda yazan saatlerin dışına çıkılması gerekiyorsa okulun staj birimine sormak gerekiyor.',
      },
      {
        soru: 'Stajyere çay servisi gibi işler verilebilir mi?',
        cevap:
          'Ara sıra herkesin yaptığı işler olağan sayılır; stajın tamamının bu tür işlerle geçmesi stajın amacına aykırıdır ve staj birimine bildirilmesi gereken bir durumdur.',
      },
      {
        soru: 'Stajda gizlilik sözleşmesi imzalatılır mı?',
        cevap:
          'Birçok şirket imzalatıyor ve bu olağan. İmzalamadan önce oku; anlamadığın bir madde varsa sormaktan çekinme.',
      },
      {
        soru: 'Stajyer izin kullanabilir mi?',
        cevap:
          'Yıllık izin hakkı doğmaz ama mazeret izni işyerinin insiyatifindedir. Devamsız geçen gün staj gününe sayılmadığı için telafi gerekir; ayrıntısı [stajda izin ve devamsızlık](/rehber/stajda-izin-ve-devamsizlik) sayfasında.',
      },
    ],
    kaynaklar: [
      { etiket: 'Çalışma ve Sosyal Güvenlik Bakanlığı', adres: 'https://www.csgb.gov.tr', kurum: 'Çalışma ve Sosyal Güvenlik Bakanlığı', tur: 'kurum' },
    ],
    sonrakiAdim: {
      etiket: 'Staj defteri nasıl doldurulur',
      yol: '/rehber/staj-defteri-nasil-doldurulur',
      aciklama: 'Yaptığın işi kayda geçirmenin doğru yolu.',
    },
  }),

  metinRehberi({
    slug: 'kotu-gecen-stajda-ne-yapilir',
    baslik: 'Kötü geçen stajda ne yapılır?',
    ozet: 'İş verilmiyor, ortam kötü ya da staj amacından uzak — sırayla ne yapmalı.',
    konu: 'staj',
    etiketler: ['sorun', 'staj bırakma', 'şikayet', 'staj birimi'],
    aciklama:
      'Stajda iş verilmiyorsa, ortam kötüyse ya da staj amacından uzaklaştıysa ne yapılır? ' +
      'Konuşma sırası, okulun rolü ve stajı bırakmanın sonuçları.',
    hizliCevap:
      'Önce işyerindeki sorumlunla konuş ve somut bir talep söyle ("bu hafta bir işin parçası olmak istiyorum"). ' +
      'Değişmezse okulun staj birimine durumu yazılı olarak bildir; karar okulun. Stajı kendi başına bırakmak, ' +
      'o dönemin tümüyle geçersiz sayılmasına yol açabildiği için son seçenek olmalı — taciz, ' +
      'güvenlik riski veya yasa dışı bir talep varsa bu sıralama geçerli değil, hemen okula ve gerekirse yetkililere bildir.',
    bloklar: [
      {
        paragraflar: [
          'Her staj iyi geçmiyor. Bazı işyerleri stajyer alacak hazırlığı yapmadan alıyor, bazılarında stajyere ' +
            'ayrılacak vakit gerçekten olmuyor. Sorunun ne olduğunu ayırmak, ne yapılacağını belirliyor.',
        ],
      },
      {
        figur: {
          kaynak: '/rehber-gorseller/stajda-sorun-karar-agaci.svg',
          alt:
            'Stajda sorun çıktığında ne yapılır. İş güvenliği riski, taciz, ayrımcılık, baskı ya da ' +
            'yasa dışı bir talep varsa sıra beklenmez: iş durdurulur, okula ve gerekirse yetkililere ' +
            'bildirilir. Diğer durumlarda sırayla sorumluyla konuşulur, değişmezse staj birimine yazılı ' +
            'bildirilir ve kararı okul verir.',
          aciklama:
            'Üstteki şerit aşağıdaki sıraya girmiyor: güvenlik ve suç niteliğindeki durumlar ' +
            'konuşma adımını beklemez.',
          genislik: 400,
          yukseklik: 616,
        },
      },
      {
        baslik: 'Önce sorunu ayır',
        tablo: {
          sutunlar: ['Durum', 'İlk adım'],
          satirlar: [
            ['İş verilmiyor, boş oturuyorum', 'Sorumluna somut bir iş öner ya da iste'],
            ['Verilen iş bölümümle ilgisiz', 'Staj biriminin yönergesine bak, sonra sorumlunla konuş'],
            ['İş güvenliği riski var', 'Hemen durdur, işyerine ve okula bildir'],
            ['Taciz, ayrımcılık veya baskı', 'Okula ve gerekirse yetkililere bildir; beklemeye gerek yok'],
            ['Ücret ödenmiyor', 'İşyerine sor, sonra staj birimine bildir'],
          ],
        },
      },
      {
        baslik: 'Konuşmayı nasıl kurarsın',
        paragraflar: [
          'Şikâyet gibi başlayan konuşmalar savunmaya yol açıyor. Aynı şeyi talep olarak söylemek çoğu zaman işe yarıyor.',
        ],
        karsilastirma: {
          kotuBaslik: 'Şikâyet',
          iyiBaslik: 'Talep',
          kotu: [
            'Burada hiçbir şey yapmıyorum.',
            'Bana kimse iş vermiyor.',
            'Bu staj boşa geçiyor.',
          ],
          iyi: [
            'Bu hafta devam eden bir işin küçük bir parçasını alabilir miyim?',
            'X konusunda yardımcı olabilirim, denememi ister misiniz?',
            'Defterime yazabileceğim somut bir görev alabilir miyim?',
          ],
        },
      },
      {
        baslik: 'Okulun rolü',
        paragraflar: [
          'Okulun staj birimi stajı onaylayan taraf. İşyeriyle konuşma ağırlığı sende değil onlarda; bu yüzden ' +
            'durumu erken bildirmek işine yarıyor. Bildirimini e-posta ile yap ki yazılı bir iz kalsın.',
          'Okul üç şeyden birini yapabilir: işyeriyle görüşür, stajın kalan kısmını farklı bir düzende sürdürmene ' +
            'izin verir ya da stajın iptal edilip yeniden yapılmasına karar verir.',
        ],
      },
      {
        baslik: 'Stajı bırakmak',
        paragraflar: [
          'Stajı kendi başına bırakmak, o dönemki stajın tümüyle geçersiz sayılmasına ve baştan yapılmasına ' +
            'yol açabiliyor. Bu yüzden okulla konuşmadan bırakma. Güvenlik riski, taciz ya da yasa dışı bir talep ' +
            'söz konusuysa bu kural geçerli değil: önce kendini koru, bildirimi sonra yap.',
        ],
        uyari:
          'Bıraksan da bırakmasan da elindeki kaydı sakla: staj formunun kopyası, yazışmalar, defterin doldurduğun ' +
          'kısmı ve varsa devam çizelgesi. Sonradan çıkan itirazda tek dayanağın bunlar.',
      },
      {
        baslik: 'Kötü staj da işe yarar',
        paragraflar: [
          'Beklediğin gibi geçmeyen bir stajdan bile çıkarılacak somut şeyler var: bir sektörü içeriden görmüş oluyorsun, ' +
            'ne istemediğini öğreniyorsun ve mülakatlarda anlatılabilecek gerçek bir gözlem elde ediyorsun. ' +
            'Defterine yazdığın her somut iş, [CV\'nde](/rehber/staj-cv-nasil-yazilir) bir satır demek.',
        ],
      },
    ],
    sss: [
      {
        soru: 'Stajı yarıda bırakırsam ne olur?',
        cevap:
          'Çoğu okulda staj geçersiz sayılır ve baştan yapılması istenir. Bırakmadan önce mutlaka staj birimiyle konuş ve kararı yazılı olarak al.',
      },
      {
        soru: 'İşyeri defterimi imzalamıyor, ne yapmalıyım?',
        cevap:
          'Önce yazılı olarak talep et; e-posta ile istemek hem hatırlatma hem kayıt oluyor. Yine imzalanmıyorsa durumu okulun staj birimine bildir.',
      },
      {
        soru: 'Staj yerimi staj sürerken değiştirebilir miyim?',
        cevap:
          'Bazı okullar belirli koşullarda izin veriyor, bazıları vermiyor. Kararı staj komisyonu veriyor; kendi başına değiştirmek stajın sayılmamasına yol açabiliyor.',
      },
    ],
    kaynaklar: [
      { etiket: 'Çalışma ve Sosyal Güvenlik Bakanlığı', adres: 'https://www.csgb.gov.tr', kurum: 'Çalışma ve Sosyal Güvenlik Bakanlığı', tur: 'kurum' },
    ],
    sonrakiAdim: {
      etiket: 'Okulun staj birimiyle nasıl çalışılır',
      yol: '/rehber/universite-staj-birimi',
      aciklama: 'Kime, nasıl ve hangi sırayla başvuracağını oku.',
    },
  }),
];
