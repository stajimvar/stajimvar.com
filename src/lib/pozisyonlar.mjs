/**
 * POZİSYON ÖNERİLERİ VE POZİSYONA BAĞLI İŞ TANIMI ŞABLONLARI
 * (27 Eylül 2026, kullanıcı isteği)
 *
 * Tek kaynak: şirketin "Yeni ilan" formundaki Pozisyon önerileri ve iş
 * tanımı başlangıç metinleri buradan; öğrenci profilindeki "Aradığım
 * pozisyonlar" hızlı seçenekleri de aynı listeyi kullanıyor (aynı
 * terimler iki tarafta).
 *
 * Kural saf işlev: arama ve alan tanıma arayüzden bağımsız sınanıyor.
 */

/* ------------------------------------------------------------------ */
/*  Türkçe katlama                                                     */
/* ------------------------------------------------------------------ */

const TR_KATLAMA = {
  ı: 'i', İ: 'i', I: 'i', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u',
  ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c', â: 'a', Â: 'a', î: 'i', û: 'u',
};

/** Küçük harf + Türkçe karakter katlama: "İŞ" → "is", "Zekâ" → "zeka". */
export function katla(metin) {
  let sonuc = '';
  for (const harf of String(metin ?? '')) sonuc += TR_KATLAMA[harf] ?? harf;
  return sonuc.toLowerCase();
}

/** Katlanmış kelimeler; "/", "-", "&", parantez ayraç sayılıyor. */
function kelimeler(metin) {
  return katla(metin).split(/[^a-z0-9]+/).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  Pozisyon listesi                                                   */
/* ------------------------------------------------------------------ */

/**
 * Öğrenci profilindeki hedef pozisyonlar (önceden StudentProfileView
 * içindeydi; sıra ve yazım aynı).
 */
export const HEDEF_POZISYONLAR = [
  'Yazılım Geliştirme Stajyeri', 'Frontend Stajyeri', 'Backend Stajyeri',
  'Mobil Uygulama Stajyeri', 'Veri Analisti Stajyeri', 'Yapay Zeka / ML Stajyeri',
  'Siber Güvenlik Stajyeri', 'Test / QA Stajyeri', 'UI/UX Tasarım Stajyeri',
  'Grafik Tasarım Stajyeri', 'Dijital Pazarlama Stajyeri', 'Sosyal Medya Stajyeri',
  'İnsan Kaynakları Stajyeri', 'Muhasebe / Finans Stajyeri', 'Satış Stajyeri',
  'Lojistik Stajyeri', 'Makine Mühendisliği Stajyeri', 'Elektrik-Elektronik Stajyeri',
  'İnşaat / Şantiye Stajyeri', 'Endüstri Mühendisliği Stajyeri', 'Mimarlık Stajyeri',
  'Kimya / Laboratuvar Stajyeri', 'Gıda Mühendisliği Stajyeri', 'Tekstil / Konfeksiyon Stajyeri',
  'Üretim & Kalite Kontrol Stajyeri', 'Hukuk Stajyeri', 'Turizm / Otelcilik Stajyeri',
  'Sağlık Hizmetleri Stajyeri', 'Eğitim / Öğretmenlik Stajyeri', 'Halkla İlişkiler Stajyeri',
];

/**
 * Yayındaki ilanlarda BİREBİR geçen başlıklar (27 Eylül 2026, salt okuma).
 * Yalnız genel ve Türkçe olanlar alındı: şirket, program adı, dönem ya da
 * yabancı dilde başlık öneri olmuyor.
 */
export const ILAN_BASLIKLARI = [
  'Yazılım Mühendisliği Stajyeri', 'Bilgi Teknolojileri Stajyeri', 'IT Stajyeri',
  'Veri Analizi Stajyeri', 'Yapay Zekâ Ürün Stajyeri', 'Martech Stajyeri',
  'Pazarlama Stajyeri', 'Pazarlama Tasarım Stajyeri', 'Sosyal Medya ve İçerik Stajyeri',
  'Satış ve Pazarlama Stajyeri', 'Perakende Satış Stajyeri', 'İş Geliştirme ve Büyüme Stajyeri',
  'Satış Operasyonları ve Analitik Stajyeri', 'Muhasebe Stajyeri', 'Finansal Planlama ve Analiz Stajyeri',
  'Finansal Risk Yönetimi Danışman Stajyeri', 'Operasyon Stajyeri', 'Operasyonel Mükemmellik Stajyeri',
  'Tedarik Zinciri Stajyeri', 'Tedarik Zinciri ve Lojistik Stajyeri', 'Kalite Stajyeri',
  'Entegre Devre Tasarım Mühendisliği Stajyeri', 'Ürün Uzmanı Stajyeri', 'Kurucu Asistanı Stajyeri',
  'Çeviri Proje Yönetimi Stajyeri', 'Eğitim Stajyeri',
];

/**
 * Listeye elle eklenen genel başlıklar — kullanıcının istediği örnekler
 * ("Tasarım Stajyeri", "Tekstil Tasarım Stajyeri"). Uydurma değil, bir
 * alanın düz adı; ikisi de aşağıdaki alan tanımıyla şablona bağlanıyor.
 */
export const EK_POZISYONLAR = ['Tasarım Stajyeri', 'Tekstil Tasarım Stajyeri'];

/** Öneri listesi: tekrarlar (katlanmış hâliyle) bir kez. */
export const POZISYONLAR = (() => {
  const gorulen = new Set();
  const liste = [];
  for (const p of [...HEDEF_POZISYONLAR, ...EK_POZISYONLAR, ...ILAN_BASLIKLARI]) {
    const anahtar = katla(p).replace(/\s+/g, ' ').trim();
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    liste.push(p);
  }
  return liste;
})();

/*
  "STAJYERİ" ARAMAYA KATILMIYOR: her başlıkta geçtiği için "sta" ya da
  "staj" yazmak bütün listeyi döndürürdü. Kelime başı eşleşmesi zaten
  "ta" → "Stajyeri" eşleşmesini engelliyor (iç eşleşme yok).
*/
const GENEL_KELIMELER = new Set(['stajyeri', 'stajyer', 'staj', 'stajyerligi']);

/**
 * Pozisyon araması — kelime başından, Türkçe karakter ve büyük/küçük
 * harften bağımsız.
 *
 * - Her yazılan kelime, başlıktaki bir kelimenin BAŞINA uymalı:
 *   "ta" → "Tasarım Stajyeri", "Tekstil Tasarım Stajyeri"; "Stajyeri"
 *   içindeki "ta" sayılmıyor. "tek tas" → "Tekstil Tasarım Stajyeri".
 * - Başlığın ilk kelimesiyle başlayanlar üstte, sonra liste sırası.
 * - Boş aramada öneri yok: liste ancak yazınca açılıyor.
 */
export function pozisyonAra(sorgu, secenekler = POZISYONLAR, enFazla = 8) {
  /*
    Yazılan "Stajyeri" (ya da ikinci kelimede yarım "stajy") da şart
    sayılmıyor: "Tasarım Stajyeri" yazan kullanıcı öneriyi kaybetmesin.
    İlk kelime yarım bile olsa aranıyor ("s" → Satış, Siber…).
  */
  const aranan = kelimeler(sorgu).filter(
    (a, i) => !GENEL_KELIMELER.has(a) && !(i > 0 && [...GENEL_KELIMELER].some((g) => g.startsWith(a))),
  );
  if (aranan.length === 0) return [];
  const bulunan = [];
  secenekler.forEach((secenek, sira) => {
    const hepsi = kelimeler(secenek);
    const aday = hepsi.filter((k) => !GENEL_KELIMELER.has(k));
    const uyar = aranan.every((a) => aday.some((k) => k.startsWith(a)));
    if (!uyar) return;
    const bastan = hepsi[0]?.startsWith(aranan[0]) ? 0 : 1;
    bulunan.push({ secenek, bastan, sira });
  });
  bulunan.sort((a, b) => a.bastan - b.bastan || a.sira - b.sira);
  return bulunan.slice(0, enFazla).map((b) => b.secenek);
}

/* ------------------------------------------------------------------ */
/*  Pozisyona bağlı iş tanımı şablonları                               */
/* ------------------------------------------------------------------ */

/*
  ŞABLONLAR YALNIZ İŞİ ANLATIYOR

  Her metin iki bölüm: stajyerin yer alacağı işler ve aranan nitelikler,
  madde madde (şirket madde ekleyip çıkarabilsin diye). Ücret, sigorta,
  yan hak, çalışma düzeni, eğitim/mentor sözü, iş teklifi gibi ŞİRKETİN
  DOĞRULAMADIĞIMIZ vaatleri YOK — onları yalnız şirket kendisi yazabilir.
  (tests/ilan-pozisyon-sablonlari.test.mjs bu sözcükleri tarıyor.)

  ALAN TANIMA: pozisyon adındaki kelime başlarına bakılıyor, alanlar
  öncelik sırasıyla deneniyor ("Tekstil Tasarım" → tekstil, grafik
  tasarım değil). `$` ile biten anahtar tam kelime ister ("ik$" →
  "iklim" değil). `haric` bir alanı o kelimede devre dışı bırakıyor
  ("Entegre Devre Tasarım Mühendisliği" grafik tasarım değil).
  Tanınmayan pozisyona şablon sunulmuyor; alakasız metin önermek,
  boş bırakmaktan kötü.
*/

const NITELIK = 'Aradığımız nitelikler:';

const sablon = (id, etiket, giris, isler, nitelikler) => ({
  id,
  etiket,
  metin:
    `${giris}\n` +
    isler.map((m) => `- ${m}`).join('\n') +
    `\n\n${NITELIK}\n` +
    nitelikler.map((m) => `- ${m}`).join('\n'),
});

export const IS_TANIMI_ALANLARI = [
  {
    id: 'tekstil',
    etiket: 'Tekstil ve moda',
    anahtarlar: ['tekstil', 'konfeksiyon', 'moda', 'hazir giyim', 'giyim', 'kumas', 'dikim', 'orme', 'dokuma', 'fashion', 'textile', 'apparel'],
    sablonlar: [
      sablon('tekstil-tasarim', 'Tasarım ve koleksiyon', 'Staj süresince tasarım ekibinin koleksiyon hazırlığında yer alacaksın:', [
        'Sezon temasına uygun trend ve ilham araştırması yapmak',
        'Eskiz ve teknik çizimlerin hazırlanmasına katkı vermek',
        'Renk kartelaları ve kumaş örnekleriyle mood board oluşturmak',
        'Numune sürecindeki ölçü ve düzeltmeleri takip etmek',
      ], [
        'Moda, tekstil ya da giyim tasarımı alanında öğrenci olmak',
        'Adobe Illustrator ya da Photoshop gibi bir çizim programını kullanabilmek',
        'Portfolyo ya da okul projeleriyle çalışmalarını gösterebilmek',
      ]),
      sablon('tekstil-kumas', 'Kumaş ve malzeme', 'Staj süresince kumaş ve malzeme seçim sürecinde yer alacaksın:', [
        'Tedarikçilerden gelen kumaş ve aksesuar örneklerini arşivlemek',
        'Kumaşların içerik, gramaj ve renk bilgilerini kayıt altına almak',
        'Koleksiyon için uygun kumaş alternatiflerini araştırmak',
        'Numune ve laboratuvar test sonuçlarının takibine destek olmak',
      ], [
        'Tekstil mühendisliği, tekstil tasarımı ya da ilgili bir bölümde öğrenci olmak',
        'Elyaf ve kumaş türleri hakkında temel bilgi sahibi olmak',
        'Düzenli kayıt tutma alışkanlığı ve Excel kullanabilmek',
      ]),
      sablon('tekstil-uretim', 'Üretim ve kalite', 'Staj süresince konfeksiyon üretim sürecinde yer alacaksın:', [
        'Kesim, dikim ve ütü-paket aşamalarındaki iş akışını takip etmek',
        'Ara ve son kalite kontrollerinde ölçü ve dikiş kontrollerine destek olmak',
        'Üretim planı ile gerçekleşen adetleri karşılaştırıp raporlamak',
        'Kalıp ve numune değişikliklerinin kaydını tutmak',
      ], [
        'Tekstil, konfeksiyon ya da endüstri mühendisliği alanında öğrenci olmak',
        'Üretim süreçlerine ilgi ve detaylara dikkat',
        'Temel düzeyde Excel kullanabilmek',
      ]),
    ],
  },
  {
    id: 'yazilim',
    etiket: 'Yazılım ve bilişim',
    anahtarlar: [
      'yazilim', 'software', 'frontend', 'front end', 'backend', 'back end', 'full stack', 'fullstack',
      'mobil', 'mobile', 'developer', 'kodlama', 'web', 'yapay zeka', 'ml$', 'ai$', 'qa$', 'test',
      'bilgi teknolojileri', 'bilisim', 'it$', 'siber', 'devops', 'bulut', 'cloud',
    ],
    sablonlar: [
      sablon('yazilim-gelistirme', 'Uygulama geliştirme', 'Staj süresince ürün geliştirme ekibinin işlerinde yer alacaksın:', [
        'Yeni özelliklerin kodlanmasına ve hata düzeltmelerine katkı vermek',
        'Kod incelemelerine (code review) katılmak',
        'Yazdığın kod için birim testleri hazırlamak',
        'Teknik dokümantasyonu güncel tutmak',
      ], [
        'Bilgisayar, yazılım mühendisliği ya da ilgili bir bölümde öğrenci olmak',
        'En az bir programlama dilinde proje geliştirmiş olmak',
        'Git ile sürüm kontrolü kullanabilmek',
      ]),
      sablon('yazilim-test', 'Test ve kalite güvence', 'Staj süresince yazılım test süreçlerinde yer alacaksın:', [
        'Yeni özellikler için test senaryoları yazmak ve çalıştırmak',
        'Bulunan hataları adım adım, tekrarlanabilir şekilde raporlamak',
        'Düzeltilen hataların yeniden testine destek olmak',
        'Uygun görülen senaryoların otomasyon testlerine katkı vermek',
      ], [
        'Bilgisayar, yazılım mühendisliği ya da ilgili bir bölümde öğrenci olmak',
        'Detaylara dikkat ve düzenli raporlama alışkanlığı',
        'Temel düzeyde bir programlama dili ya da SQL bilgisi',
      ]),
      sablon('yazilim-bt', 'BT destek ve sistem', 'Staj süresince bilgi teknolojileri ekibinin işlerinde yer alacaksın:', [
        'Kullanıcılardan gelen donanım ve yazılım taleplerinin çözümüne destek olmak',
        'Bilgisayar, yazıcı ve ağ cihazlarının kurulum ve envanter kayıtlarını tutmak',
        'Kullanıcı hesaplarının ve erişim yetkilerinin düzenlenmesine yardımcı olmak',
        'Sık karşılaşılan sorunlar için kısa kullanım notları hazırlamak',
      ], [
        'Bilgisayar mühendisliği, bilgisayar programcılığı ya da ilgili bir bölümde öğrenci olmak',
        'İşletim sistemleri ve ağ temelleri hakkında bilgi sahibi olmak',
        'Kullanıcılarla açık ve sabırlı iletişim kurabilmek',
      ]),
    ],
  },
  {
    id: 'veri',
    etiket: 'Veri ve analiz',
    anahtarlar: ['veri', 'data', 'analist', 'analyst', 'raporlama', 'bi$', 'analitik'],
    sablonlar: [
      sablon('veri-analiz', 'Veri analizi ve raporlama', 'Staj süresince veri analizi ve raporlama işlerinde yer alacaksın:', [
        'Farklı kaynaklardan gelen verileri toplayıp temizlemek',
        'SQL ya da Excel ile düzenli raporlar hazırlamak',
        'Bulguları grafik ve kısa özetlerle ekibe sunmak',
        'Veri tanımlarının ve rapor kaynaklarının dokümantasyonunu tutmak',
      ], [
        'İstatistik, endüstri mühendisliği, bilgisayar mühendisliği ya da ilgili bir bölümde öğrenci olmak',
        "Excel'de pivot tablo ve formüllerle çalışabilmek",
        'Temel SQL ya da Python bilgisi',
      ]),
      sablon('veri-pano', 'Pano ve görselleştirme', 'Staj süresince iş birimlerinin kullandığı panoların hazırlanmasında yer alacaksın:', [
        'Power BI, Tableau ya da benzeri bir araçla pano hazırlamak ve güncellemek',
        'Pano verilerinin doğruluğunu kaynak verilerle karşılaştırmak',
        'Kullanıcılardan gelen rapor taleplerini toplamak ve önceliklendirmek',
        'Metrik tanımlarını ekiple birlikte netleştirmek',
      ], [
        'Sayısal ya da ilgili bir bölümde öğrenci olmak',
        'Bir veri görselleştirme aracını kullanmış olmak',
        'Bulguları sade bir dille anlatabilmek',
      ]),
    ],
  },
  {
    id: 'tasarim',
    etiket: 'Grafik ve dijital tasarım',
    anahtarlar: ['tasarim', 'design', 'grafik', 'ui$', 'ux$', 'gorsel', 'illustrasyon', 'kreatif', 'creative'],
    haric: ['muhendis', 'devre', 'mimar', 'peyzaj', 'makine'],
    sablonlar: [
      sablon('tasarim-grafik', 'Grafik tasarım', 'Staj süresince tasarım ekibinin görsel işlerinde yer alacaksın:', [
        'Sosyal medya, web ve basılı işler için görsel hazırlamak',
        'Marka kılavuzuna uygun şablonlar ve varyasyonlar üretmek',
        'Fotoğraf düzenleme ve basit rötuş işlerine destek olmak',
        'Baskıya ya da yayına gidecek dosyaları hazırlamak',
      ], [
        'Grafik tasarım, görsel iletişim tasarımı ya da ilgili bir bölümde öğrenci olmak',
        'Adobe Photoshop, Illustrator ya da Figma kullanabilmek',
        'Çalışmalarını gösteren bir portfolyo',
      ]),
      sablon('tasarim-arayuz', 'Arayüz (UI/UX) tasarımı', 'Staj süresince dijital ürünlerin arayüz tasarımında yer alacaksın:', [
        'Kullanıcı akışları ve tel kafes (wireframe) çizimleri hazırlamak',
        "Figma'da ekran tasarımları ve bileşenler üretmek",
        'Kullanıcı görüşmeleri ve kullanılabilirlik testlerinin notlarını toplamak',
        'Tasarımların geliştirme ekibine aktarılması için gerekli dokümantasyonu hazırlamak',
      ], [
        'Tasarım, bilgisayar ya da ilgili bir bölümde öğrenci olmak',
        'Figma ya da benzeri bir arayüz tasarım aracını kullanabilmek',
        'Tasarım kararlarını gerekçesiyle anlatabilmek',
      ]),
    ],
  },
  {
    id: 'pazarlama',
    etiket: 'Pazarlama ve iletişim',
    anahtarlar: [
      'pazarlama', 'marketing', 'sosyal medya', 'icerik', 'reklam', 'marka', 'halkla iliskiler',
      'iletisim', 'pr$', 'kampanya', 'seo$', 'martech',
    ],
    sablonlar: [
      sablon('pazarlama-dijital', 'Dijital pazarlama', 'Staj süresince dijital pazarlama ekibinin işlerinde yer alacaksın:', [
        'Reklam kampanyalarının kurulumuna ve günlük takibine destek olmak',
        'Kampanya sonuçlarını haftalık raporlara dönüştürmek',
        'Rakip ve pazar araştırması yapmak',
        'Web sitesi ve e-posta içeriklerinin güncellenmesine katkı vermek',
      ], [
        'İşletme, iktisat, iletişim ya da ilgili bir bölümde öğrenci olmak',
        'Dijital pazarlama kanallarına ilgi ve temel Excel bilgisi',
        'Yazılı iletişimde özen',
      ]),
      sablon('pazarlama-sosyal', 'Sosyal medya ve içerik', 'Staj süresince sosyal medya ve içerik üretiminde yer alacaksın:', [
        'Sosyal medya hesapları için içerik takvimi hazırlamak',
        'Gönderi metinleri yazmak ve görsel ihtiyaçlarını belirlemek',
        'Paylaşımların etkileşim verilerini takip edip raporlamak',
        'Güncel trendleri ve rakip hesapları izlemek',
      ], [
        'İletişim, halkla ilişkiler, pazarlama ya da ilgili bir bölümde öğrenci olmak',
        'Sosyal medya platformlarını yakından takip etmek',
        'Akıcı ve dikkatli bir Türkçe ile yazabilmek',
      ]),
      sablon('pazarlama-marka', 'Marka ve iletişim', 'Staj süresince marka ve kurumsal iletişim işlerinde yer alacaksın:', [
        'Basın bülteni, duyuru ve bülten metinlerinin taslaklarını hazırlamak',
        'Etkinlik ve iş birliği projelerinin hazırlık listelerini takip etmek',
        'Markayla ilgili haber ve paylaşımları izleyip özetlemek',
        'Tanıtım materyallerinin arşivini düzenli tutmak',
      ], [
        'Halkla ilişkiler, iletişim, işletme ya da ilgili bir bölümde öğrenci olmak',
        'Güçlü yazılı ve sözlü iletişim',
        'Birden fazla işi aynı anda takip edebilmek',
      ]),
    ],
  },
  {
    id: 'ik',
    etiket: 'İnsan kaynakları',
    anahtarlar: ['insan kaynaklari', 'ik$', 'hr$', 'ise alim', 'recruit', 'yetenek', 'talent', 'bordro'],
    sablonlar: [
      sablon('ik-isealim', 'İşe alım', 'Staj süresince işe alım süreçlerinde yer alacaksın:', [
        'İlan metinlerinin hazırlanmasına ve yayınlanmasına destek olmak',
        'Gelen başvuruları ön kriterlere göre gözden geçirmek',
        'Mülakat planlamasını ve adaylarla yazışmaları takip etmek',
        'Aday takip tablosunu güncel tutmak',
      ], [
        'Psikoloji, işletme, çalışma ekonomisi ya da ilgili bir bölümde öğrenci olmak',
        'Kişisel verilerin gizliliğine özen',
        'Düzenli çalışma ve açık iletişim',
      ]),
      sablon('ik-operasyon', 'İK operasyonları', 'Staj süresince insan kaynakları operasyonlarında yer alacaksın:', [
        'Özlük dosyalarının dijital arşivini düzenlemek',
        'İşe giriş ve çıkış süreçlerinin belge takibine destek olmak',
        'Oryantasyon programlarının katılım kayıtlarını tutmak',
        'İK raporları için veri derlemek',
      ], [
        'Çalışma ekonomisi, işletme, psikoloji ya da ilgili bir bölümde öğrenci olmak',
        'Excel ve temel ofis programlarını kullanabilmek',
        'Gizli bilgilerle çalışırken özenli olmak',
      ]),
    ],
  },
  {
    id: 'finans',
    etiket: 'Muhasebe ve finans',
    anahtarlar: ['muhasebe', 'finans', 'denetim', 'audit', 'butce', 'vergi', 'bankacilik', 'yatirim', 'mali$', 'hazine'],
    sablonlar: [
      sablon('finans-muhasebe', 'Muhasebe', 'Staj süresince muhasebe ekibinin günlük işlerinde yer alacaksın:', [
        'Fatura ve belgelerin kontrolüne ve kaydına destek olmak',
        'Cari hesap mutabakatlarını hazırlamak',
        'Banka hareketlerini kayıtlarla karşılaştırmak',
        'Ay sonu kapanış için gerekli belgeleri derlemek',
      ], [
        'İşletme, iktisat, muhasebe ya da ilgili bir bölümde öğrenci olmak',
        'Temel muhasebe bilgisi ve Excel kullanabilmek',
        'Sayılarla dikkatli ve düzenli çalışmak',
      ]),
      sablon('finans-analiz', 'Finansal analiz ve raporlama', 'Staj süresince finansal planlama ve raporlama işlerinde yer alacaksın:', [
        'Aylık gelir-gider raporlarının hazırlanmasına destek olmak',
        'Bütçe ile gerçekleşen rakamları karşılaştırıp farkları özetlemek',
        'Sektör ve rakip şirketlerin finansal verilerini derlemek',
        'Sunumlar için tablo ve grafik hazırlamak',
      ], [
        'İşletme, iktisat, finans ya da ilgili bir bölümde öğrenci olmak',
        "Excel'de formül ve pivot tablolarla çalışabilmek",
        'Analitik düşünme ve sayılara dikkat',
      ]),
    ],
  },
  {
    id: 'satis',
    etiket: 'Satış ve iş geliştirme',
    anahtarlar: ['satis', 'sales', 'musteri', 'is gelistirme', 'business development', 'perakende', 'bayi'],
    sablonlar: [
      sablon('satis-destek', 'Satış destek', 'Staj süresince satış ekibinin günlük işlerinde yer alacaksın:', [
        'Teklif ve sipariş belgelerinin hazırlanmasına destek olmak',
        'Müşteri kayıtlarını ve satış takip tablolarını güncel tutmak',
        'Potansiyel müşteri ve pazar araştırması yapmak',
        'Haftalık satış raporları için veri derlemek',
      ], [
        'İşletme, iktisat, uluslararası ticaret ya da ilgili bir bölümde öğrenci olmak',
        'İletişim becerisi ve insanlarla çalışmayı sevmek',
        'Excel ve temel ofis programlarını kullanabilmek',
      ]),
      sablon('satis-musteri', 'Müşteri ilişkileri', 'Staj süresince müşteri ilişkileri süreçlerinde yer alacaksın:', [
        'Müşterilerden gelen talep ve soruları kayıt altına almak ve ilgili birime yönlendirmek',
        'Talep çözüm sürelerini takip edip raporlamak',
        'Sık sorulan sorular için yanıt metinleri hazırlamak',
        'Müşteri memnuniyeti anketlerinin sonuçlarını derlemek',
      ], [
        'İşletme, iletişim ya da ilgili bir bölümde öğrenci olmak',
        'Sabırlı ve çözüm odaklı iletişim',
        'Yazılı ve sözlü Türkçeyi etkin kullanabilmek',
      ]),
    ],
  },
  {
    id: 'lojistik',
    etiket: 'Lojistik ve tedarik zinciri',
    anahtarlar: ['lojistik', 'logistics', 'tedarik', 'supply', 'satin alma', 'depo', 'sevkiyat', 'dis ticaret', 'gumruk', 'procurement'],
    sablonlar: [
      sablon('lojistik-operasyon', 'Lojistik operasyon', 'Staj süresince lojistik operasyonlarında yer alacaksın:', [
        'Sevkiyatların planlanmasına ve takibine destek olmak',
        'Taşıma ve teslimat belgelerini kontrol etmek',
        'Depo giriş-çıkış ve stok kayıtlarını güncel tutmak',
        'Teslimat sürelerine ilişkin raporlar hazırlamak',
      ], [
        'Lojistik, uluslararası ticaret, endüstri mühendisliği ya da ilgili bir bölümde öğrenci olmak',
        'Excel kullanabilmek ve düzenli kayıt tutmak',
        'Birden fazla işi aynı anda takip edebilmek',
      ]),
      sablon('lojistik-satinalma', 'Satın alma ve tedarik', 'Staj süresince satın alma ve tedarik süreçlerinde yer alacaksın:', [
        'Tedarikçilerden teklif toplamak ve karşılaştırma tabloları hazırlamak',
        'Siparişlerin durumunu takip etmek',
        'Tedarikçi bilgilerini ve belgelerini güncel tutmak',
        'Alternatif tedarikçi araştırması yapmak',
      ], [
        'İşletme, endüstri mühendisliği, uluslararası ticaret ya da ilgili bir bölümde öğrenci olmak',
        'Excel kullanabilmek',
        'Yazışmalarda özen ve takip becerisi',
      ]),
    ],
  },
  {
    id: 'uretim',
    etiket: 'Üretim ve kalite',
    anahtarlar: ['uretim', 'kalite', 'imalat', 'endustri', 'makine', 'fabrika', 'operasyonel mukemmellik', 'bakim', 'production'],
    sablonlar: [
      sablon('uretim-surec', 'Üretim ve süreç iyileştirme', 'Staj süresince üretim süreçlerinde yer alacaksın:', [
        'Üretim hattındaki iş akışını gözlemlemek ve kayıt altına almak',
        'Süre ve verimlilik ölçümlerine destek olmak',
        'İyileştirme önerileri için veri toplamak ve raporlamak',
        'İş talimatlarının ve süreç dokümanlarının güncellenmesine katkı vermek',
      ], [
        'Endüstri, makine mühendisliği ya da ilgili bir bölümde öğrenci olmak',
        'İş güvenliği kurallarına özen',
        'Excel ve temel ofis programlarını kullanabilmek',
      ]),
      sablon('uretim-kalite', 'Kalite kontrol', 'Staj süresince kalite kontrol süreçlerinde yer alacaksın:', [
        'Giriş, ara ve son kontrollerde ölçüm ve muayenelere destek olmak',
        'Uygunsuzluk kayıtlarını tutmak ve takip etmek',
        'Kalite raporları için veri derlemek',
        'Kalite yönetim sistemi dokümanlarının güncel tutulmasına katkı vermek',
      ], [
        'Mühendislik ya da ilgili bir bölümde öğrenci olmak',
        'Ölçüm aletleri ve teknik resim hakkında temel bilgi',
        'Detaylara dikkat ve düzenli kayıt tutma',
      ]),
    ],
  },
];

/** Anahtar, katlanmış başlık metninde kelime başından geçiyor mu? */
function anahtarGeciyor(duzMetin, anahtar) {
  const tamKelime = anahtar.endsWith('$');
  const govde = tamKelime ? anahtar.slice(0, -1) : anahtar;
  const kacisli = govde.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const desen = new RegExp(`(^| )${kacisli}${tamKelime ? '( |$)' : ''}`);
  return desen.test(duzMetin);
}

/**
 * Pozisyon adına uyan iş tanımı alanı; tanınmıyorsa `null`.
 * Serbest yazılmış başlıklar da tanınıyor ("Frontend Developer Stajyeri").
 */
export function pozisyonAlani(unvan) {
  const duz = kelimeler(unvan).join(' ');
  if (!duz) return null;
  for (const alan of IS_TANIMI_ALANLARI) {
    if (alan.haric?.some((h) => anahtarGeciyor(duz, h))) continue;
    if (alan.anahtarlar.some((a) => anahtarGeciyor(duz, a))) return alan;
  }
  return null;
}
