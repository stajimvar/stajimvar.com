/**
 * Burs çakışma matrisi — hangi burs hangisiyle birlikte alınır.
 *
 * NEDEN AYRI VERİ KATMANI
 * -----------------------
 * Aynı bilgi üç yerde görünüyor: rehber sayfasındaki matris, mobildeki
 * seçici ve burs ilanı sayfasındaki mini blok. Üçüne ayrı ayrı metin
 * yazılsaydı biri güncellenip diğerleri eskirdi — okuyucuya aynı soruya
 * iki farklı cevap veren bir site kalırdı. Tek kaynak burada.
 *
 * DÖRT DURUM, ÜÇÜ DEĞİL
 * ---------------------
 * 'olur' ve 'olmaz' iddiadır; ikisini de resmî bir cümle söylüyorsa
 * yazıyoruz. Aradaki gri alan tek kova değil, iki ayrı şey:
 *
 *   'kosullu'  — hiçbir metin yasaklamıyor ama izin de vermiyor; karar
 *                beyana, gelir değerlendirmesine ya da ilan metnine bağlı.
 *   'belirsiz' — kurumun kendisi tek değil (her belediye, her üniversite
 *                ayrı kural yazıyor) ya da hiçbir resmî metin bu çifte
 *                değmiyor.
 *
 * İkisini 'belirsiz'de birleştirmek, "kimse yasaklamamış" ile "bilmiyoruz"u
 * aynı şey saymak olurdu. Öğrenci için bunlar aynı şey değil.
 *
 * KAYNAKSIZ HÜCRE YOK
 * -------------------
 * Her çiftte kaynakUrl zorunlu ve resmî alan adı olmak zorunda (test bunu
 * kontrol ediyor). Forum, Instagram ya da haber sitesi kaynak sayılmıyor:
 * bu sayfanın tek değeri, söylediğini nereden aldığını gösterebilmesi.
 * Bilmediğimiz çiftte 'belirsiz' yazıp öğrenciyi kuruma yolluyoruz —
 * "herhâlde olur" yazmak, olmayan bir güvence vermek olur.
 *
 * TARİH NEDEN HER HÜCREDE
 * -----------------------
 * Kurumlar kural değiştiriyor. TEV, 01.09.2026 duyurusuyla yıllardır
 * uyguladığı "başka burs alınmaz" koşulunu kaldırdı; eski bilgiye göre
 * yazılmış bir "olmaz" bugün yanlış. Erişim tarihi, okuyucunun hücreye ne
 * kadar güveneceğini kendisinin ölçmesini sağlıyor.
 */

/** @typedef {'olur'|'olmaz'|'kosullu'|'belirsiz'} Durum */

/* ----------------------------------------------------------------- kurumlar */

/**
 * Matristeki kurumlar.
 *
 * `tur` yalnızca etiket değil: 5102 sayılı Kanun m.2 kamu kurumlarına ödeme
 * yasağı getirip vakıfları kapsam dışında bıraktığı için, bir bursun kamu mu
 * vakıf mı olduğu doğrudan sonucu belirliyor.
 *
 * `adresNotu`, tek bir resmî adresi OLMAYAN kurumlar için: "belediye bursu"
 * diye tek bir kurum yok, 1300'den fazla belediye var. Oraya rastgele bir
 * belediyenin sayfasını koymak, olmayan bir merkezî kural varmış gibi
 * göstermek olurdu.
 */
export const KURUMLAR = [
  {
    id: 'kyk-burs',
    ad: 'KYK bursu',
    kisaAd: 'KYK bursu',
    tur: 'kamu',
    resmiUrl: 'https://kygm.gsb.gov.tr',
    sssUrl: 'https://kygm.gsb.gov.tr/sayfalar/2446/3200/sikca-sorulan-sorular-kredi-burs.aspx',
    adresNotu: null,
  },
  {
    id: 'kyk-kredi',
    ad: 'KYK öğrenim kredisi',
    kisaAd: 'KYK kredisi',
    tur: 'kamu',
    resmiUrl: 'https://kygm.gsb.gov.tr',
    sssUrl: 'https://kygm.gsb.gov.tr/sayfalar/2446/3200/sikca-sorulan-sorular-kredi-burs.aspx',
    adresNotu: null,
  },
  {
    id: 'tev',
    ad: 'TEV (Türk Eğitim Vakfı) bursu',
    kisaAd: 'TEV',
    tur: 'vakif',
    resmiUrl: 'https://www.tev.org.tr',
    sssUrl: 'https://www.tev.org.tr/duyuru/tr/72/TEV-Bursunun-Diger-Burslarla-Birlikte-Alinmasina-Iliskin-Bilgilendirme',
    adresNotu: null,
  },
  {
    id: 'vgm',
    ad: 'VGM (Vakıflar Genel Müdürlüğü) bursu',
    kisaAd: 'VGM',
    tur: 'kamu',
    resmiUrl: 'https://www.vgm.gov.tr',
    sssUrl: 'https://burs.vgm.gov.tr',
    adresNotu: null,
  },
  {
    id: 'mev',
    ad: 'Millî Eğitim Vakfı (MEV) bursu',
    kisaAd: 'MEV',
    tur: 'vakif',
    resmiUrl: 'https://www.mev.org.tr',
    sssUrl: 'https://www.mev.org.tr/sayfa/burslar-hakkinda-sss',
    adresNotu: null,
  },
  {
    id: 'tubitak-2205',
    ad: 'TÜBİTAK 2205 Lisans Burs Programı',
    kisaAd: 'TÜBİTAK 2205',
    tur: 'kamu',
    resmiUrl: 'https://tubitak.gov.tr/tr/burslar/lisans/burs-programlari',
    sssUrl: null,
    adresNotu: null,
  },
  {
    id: 'belediye',
    ad: 'Belediye bursu',
    kisaAd: 'Belediye',
    tur: 'belediye',
    resmiUrl: null,
    sssUrl: null,
    adresNotu:
      'Tek bir "belediye bursu" yok; her belediye kendi koşulunu kendi ilanında yazıyor. ' +
      'Kendi belediyenin burs ilanına bak.',
  },
  {
    id: 'universite',
    ad: 'Üniversite bursu (başarı / ihtiyaç)',
    kisaAd: 'Üniversite',
    tur: 'universite',
    resmiUrl: null,
    sssUrl: null,
    adresNotu:
      'Her üniversitenin kendi burs yönergesi var; ayrıca üniversitenin kendi bütçesinden ödenen ' +
      'burs ile üniversite vakfının ödediği burs farklı. Öğrenci işlerine sor.',
  },
];

/* -------------------------------------------------------------- kaynak künye */

/*
  KAYNAKLAR TEK YERDE

  Aynı belge birden çok hücreyi destekliyor (5102 m.2 dört hücrede geçiyor).
  URL'yi her hücreye elle yazsaydık biri değiştiğinde diğerleri eskiyecekti.
*/
const K = {
  kykSss: {
    baslik: 'KYGM — Sıkça Sorulan Sorular (Kredi/Burs)',
    url: 'https://kygm.gsb.gov.tr/sayfalar/2446/3200/sikca-sorulan-sorular-kredi-burs.aspx',
  },
  bursYonetmeligi: {
    baslik: 'Gençlik ve Spor Bakanlığı Burs Yönetmeliği, m.16/2',
    url: 'https://www.resmigazete.gov.tr/eskiler/2023/11/20231103-1.htm',
  },
  kanun5102: {
    baslik: '5102 sayılı Kanun, m.2',
    url: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5102.pdf',
  },
  kanun5102m3: {
    baslik: '5102 sayılı Kanun, m.2 dipnotu ve m.3',
    url: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5102.pdf',
  },
  vgmKilavuz: {
    baslik: 'VGM Yükseköğrenim Bursu Başvuru Kılavuzu',
    url: 'https://burs.vgm.gov.tr/HHYS_BELGELER/Kilavuz/HHYSDoc842908.pdf',
  },
  tevDuyuru: {
    baslik: 'TEV — Bursun Diğer Burslarla Birlikte Alınmasına İlişkin Bilgilendirme (01.09.2026)',
    url: 'https://www.tev.org.tr/duyuru/tr/72/TEV-Bursunun-Diger-Burslarla-Birlikte-Alinmasina-Iliskin-Bilgilendirme',
  },
  mevSss: {
    baslik: 'MEV — Burslar Hakkında Sıkça Sorulan Sorular',
    url: 'https://www.mev.org.tr/sayfa/burslar-hakkinda-sss',
  },
  tubitakCagri: {
    baslik: 'TÜBİTAK 2205 Lisans Burs Programı Çağrı Duyurusu, md. 9.1.8',
    url: 'https://tubitak.gov.tr/sites/default/files/2025-04/2205_Lisans_Burs_Programi_Cagri_Duyurusu_2025_1.pdf',
  },
};

/** Kaynakların son okunduğu tarih (YYYY-AA-GG). Elle güncelleniyor. */
export const ERISIM_TARIHI = '2026-09-04';

const c = (a, b, durum, gerekce, kaynak, not = null) => ({
  a,
  b,
  durum,
  gerekce,
  kaynakBaslik: kaynak.baslik,
  kaynakUrl: kaynak.url,
  erisimTarihi: ERISIM_TARIHI,
  not,
});

/* ------------------------------------------------------------------ çiftler */

/**
 * Kurum çiftleri. Simetrik: (a,b) ile (b,a) aynı hücre, bir kez yazılıyor.
 *
 * "olmaz" burada "yasak" demek değil, "ikisi aynı anda yürümez" demek.
 * Örneğin KYK bursu alırken TÜBİTAK bursunu seçmek suç değil; sadece KYK
 * bursu kesiliyor. Öğrencinin sorduğu soru "ikisini birden alabilir miyim"
 * olduğu için cevabı da o soruya göre veriyoruz, mekanizmayı gerekçede
 * anlatıyoruz.
 */
export const CIFTLER = [
  /* --- KYK bursu --- */
  c('kyk-burs', 'kyk-kredi', 'olmaz',
    'KYK aynı öğrenciye ikisini birden ödemiyor; başvuruda burs ya da kredi seçiliyor.',
    K.kykSss,
    'KYGM SSS: “Mevzuata göre burs alan öğrenciye kredi; kredi alan öğrenciye ise burs ödemesi yapılamaz.”'),

  c('kyk-burs', 'tev', 'olur',
    'TEV, 1 Eylül 2026 duyurusuyla başka burs alma yasağını kaldırdı; KYK bursunu açıkça sayıyor.',
    K.tevDuyuru,
    'Duyuru “bundan sonra topluluğumuza katılacak” gençleri anlatıyor; hâlihazırda TEV bursiyeriysen kendi dönemin için TEV’e sor.'),

  c('kyk-burs', 'vgm', 'olmaz',
    'VGM kılavuzu, KYK bursu alan öğrencilere burs verilmediğini açıkça yazıyor.',
    K.vgmKilavuz,
    'Kılavuzun engel listesi “kamu kurumlarından karşılıksız eğitim yardımı ve burs alanlar” diyor; KYK bursu bu kapsamda.'),

  c('kyk-burs', 'mev', 'kosullu',
    'MEV bir vakıf olduğu için KYK tarafında engel yok; MEV ise başka bursu ne yasaklıyor ne de izin veriyor.',
    K.mevSss,
    'MEV’in başvuru koşulları ve burs kesme sebepleri arasında başka kurumdan burs almak geçmiyor. Burs ihtiyaç esaslı olduğu için formdaki gelir ve burs beyanını eksiksiz doldur.'),

  c('kyk-burs', 'tubitak-2205', 'olmaz',
    'TÜBİTAK kanunla kurulmuş bir kamu kurumu; bursunu tercih eden öğrencinin KYK bursu kesiliyor.',
    K.bursYonetmeligi,
    'Yönetmelik m.16/2, 5102 sayılı Kanun m.2/3 kapsamındaki kamu kurumlarını işaret ediyor. Yasak değil, tercih: birini seçiyorsun.'),

  c('kyk-burs', 'belediye', 'belirsiz',
    'Belediyeler için tek bir merkezî kural yok; kanundaki “belediyeler hariç” ibaresi Anayasa Mahkemesi’nce iptal edilmiş, belediyeler ayrı bir bildirim rejimine bağlanmış.',
    K.kanun5102m3,
    'Kendi belediyenin burs ilanındaki koşullar bölümüne bak; yazmıyorsa belediyeye yazıp yazılı cevap al.'),

  c('kyk-burs', 'universite', 'belirsiz',
    'Bursun üniversitenin kendi bütçesinden mi yoksa üniversite vakfından mı ödendiğine göre değişiyor; ikisi ayrı tüzel kişi.',
    K.kanun5102,
    'Devlet üniversitesinin kendi ödediği burs kanunun kapsamına giriyor; vakıf bursu ve öğrenim ücreti indirimi girmiyor. Öğrenci işlerine bursun kaynağını sor.'),

  /* --- KYK öğrenim kredisi --- */
  c('kyk-kredi', 'tev', 'olur',
    'TEV, bursiyerlerinin KYK burs veya kredi statüsünü olağan bir durum olarak anlatıyor ve başka bursa engel koymuyor.',
    K.tevDuyuru,
    'Duyurunun notu: öğrencilerin KYK burs veya kredi statüsünde TEV tarafından değişiklik yapılamıyor.'),

  c('kyk-kredi', 'vgm', 'belirsiz',
    'VGM kılavuzu “karşılıksız” burs ve yardımları dışlıyor; geri ödenen öğrenim kredisine hiç değinmiyor.',
    K.vgmKilavuz,
    'Metin krediyi ne sayıyor ne de saymıyor. Başvurmadan önce VGM’ye sorup yazılı cevap al.'),

  c('kyk-kredi', 'mev', 'kosullu',
    'MEV başka destek almayı yasaklamıyor ama bursu ihtiyaç esaslı; kredi de gelir değerlendirmesine girebiliyor.',
    K.mevSss,
    'Başvuru formunda sorulan her desteği yaz. MEV’de burs kesme sebeplerinden biri beyanın doğru olmadığının anlaşılması.'),

  c('kyk-kredi', 'tubitak-2205', 'belirsiz',
    'Burs Yönetmeliği’ndeki kesme kuralı “burs almakta iken” diyor; kredi için aynı hükmü söyleyen resmî bir metin bulunamadı.',
    K.bursYonetmeligi,
    'TÜBİTAK’ın 2205 çağrısı da yalnızca BİDEB programlarını dışlıyor. İkisini birden düşünüyorsan KYGM’ye yazıp yazılı cevap al.'),

  c('kyk-kredi', 'belediye', 'belirsiz',
    'Belediye ilanlarının bir kısmı krediyi burs sayıyor, bir kısmı saymıyor; merkezî bir kural yok.',
    K.kanun5102m3,
    'İlan metnindeki koşullar bölümüne bak; “burs” mu “burs veya kredi” mi yazdığına dikkat et.'),

  c('kyk-kredi', 'universite', 'belirsiz',
    'Üniversite yönergeleri krediyi çoğunlukla ayrı değerlendiriyor ama bunu söyleyen merkezî bir metin yok.',
    K.kanun5102,
    'Kendi üniversitenin burs yönergesine bak ya da öğrenci işlerine sor.'),

  /* --- TEV --- */
  c('tev', 'vgm', 'olur',
    'İki metin de birbirini engellemiyor: TEV diğer kamu kurumu burslarına izin veriyor, VGM ise yalnızca kamu burslarını dışlıyor ve TEV bir vakıf.',
    K.tevDuyuru,
    'VGM tarafındaki engel listesi kamu kurumu burslarını kapsıyor; vakıf bursları listede yok. VGM başvuru formundaki burs beyanını yine de eksiksiz doldur.'),

  c('tev', 'mev', 'kosullu',
    'TEV tarafında engel yok; MEV ise başka bursu ne yasaklıyor ne de açıkça kabul ediyor.',
    K.mevSss,
    'Belirleyici olan MEV’in ihtiyaç değerlendirmesi. Başvuru formunda TEV bursunu yaz.'),

  c('tev', 'tubitak-2205', 'olur',
    'TEV diğer kamu kurumu burslarına izin veriyor; TÜBİTAK 2205 ise yalnızca BİDEB’in başka bir programından burs almayı engelliyor.',
    K.tubitakCagri,
    'Çağrı md. 9.1.8: “Bursiyerler bu bursun yanında aynı anda BİDEB’in başka bir programından burs alamaz.” TEV bir BİDEB programı değil.'),

  c('tev', 'belediye', 'kosullu',
    'TEV tarafında engel yok; karar belediyenin kendi ilan koşullarına kalıyor.',
    K.tevDuyuru,
    'Belediyenin ilanında “başka kurumdan burs almamak” şartı varsa TEV bursu o şartı ihlal eder.'),

  c('tev', 'universite', 'kosullu',
    'TEV tarafında engel yok; üniversitenin kendi burs yönergesi belirleyici.',
    K.tevDuyuru,
    'Öğrenim ücreti indirimi genellikle burs sayılmıyor ama nakit ödenen üniversite bursu sayılabiliyor. Yönergeye bak.'),

  /* --- VGM --- */
  c('vgm', 'mev', 'kosullu',
    'VGM yalnızca kamu kurumu burslarını dışlıyor ve MEV bir vakıf; MEV tarafında ise yazılı bir kural yok.',
    K.vgmKilavuz,
    'İki başvuru formunda da diğer bursu beyan et. Her iki kurum da yanlış beyanı burs kesme sebebi sayıyor.'),

  c('vgm', 'tubitak-2205', 'olmaz',
    'TÜBİTAK 2205 bir kamu kurumunun karşılıksız bursu; VGM bu bursu alanlara burs vermiyor.',
    K.vgmKilavuz,
    'Kılavuzun engel listesi “kamu kurumlarından karşılıksız eğitim yardımı ve burs alan öğrenciler” diyor.'),

  c('vgm', 'belediye', 'belirsiz',
    'Belediyenin bu engel listesine girip girmediği kılavuzda açıkça yazmıyor.',
    K.vgmKilavuz,
    'Belediye bir kamu tüzel kişisi ama kılavuz belediyeleri ayrıca saymıyor. Başvurmadan önce VGM’ye sor.'),

  c('vgm', 'universite', 'belirsiz',
    'Devlet üniversitesinin kendi bursu ile üniversite vakfının bursu VGM açısından farklı sonuç verebiliyor; kılavuz bu ayrımı yazmıyor.',
    K.vgmKilavuz,
    'Önce bursun kaynağını öğrenci işlerinden öğren, sonra VGM’ye sor.'),

  /* --- MEV --- */
  c('mev', 'tubitak-2205', 'kosullu',
    'TÜBİTAK yalnızca BİDEB programlarını dışlıyor; MEV’in yazılı bir engeli yok ama bursu ihtiyaç esaslı.',
    K.tubitakCagri,
    'MEV başvuru formunda TÜBİTAK bursunu beyan et.'),

  c('mev', 'belediye', 'belirsiz',
    'MEV tarafında yazılı kural yok; belediye tarafında merkezî kural yok.',
    K.mevSss,
    'Belirleyici olan belediyenin ilan metni. İkisine de diğer bursu beyan et.'),

  c('mev', 'universite', 'belirsiz',
    'İki tarafta da bu çifte değen yazılı bir kural bulunamadı.',
    K.mevSss,
    'Üniversitenin burs yönergesine bak; MEV formunda üniversite bursunu beyan et.'),

  /* --- TÜBİTAK 2205 --- */
  c('tubitak-2205', 'belediye', 'belirsiz',
    'TÜBİTAK yalnızca BİDEB programlarını dışlıyor; belediye tarafında merkezî kural yok.',
    K.tubitakCagri,
    'Belediyenin ilanında kamu bursu alanları dışlayan bir şart olup olmadığına bak.'),

  c('tubitak-2205', 'universite', 'belirsiz',
    'TÜBİTAK tarafında BİDEB dışı burslar engel değil; üniversite tarafında yönergeye bağlı.',
    K.tubitakCagri,
    'Üniversitenin burs yönergesinde kamu bursu alanlar için bir kısıt olup olmadığına bak.'),

  /* --- belediye / üniversite --- */
  c('belediye', 'universite', 'belirsiz',
    'İki tarafta da kurum kurum değişen kurallar var; ortak bir metin yok.',
    K.kanun5102m3,
    'Belediyenin ilanına ve üniversitenin yönergesine ayrı ayrı bak.'),
];

/* -------------------------------------------------------------------- sorgu */

/**
 * İki kurumun çiftini bulur. Sıra önemli değil: matris simetrik.
 *
 * Köşegende (a === b) çift aranmıyor; "KYK bursu ile KYK bursu birlikte
 * alınır mı" bir soru değil.
 */
export function ciftBul(a, b) {
  if (!a || !b) return null;
  if (a === b) return null;
  return CIFTLER.find((k) => (k.a === a && k.b === b) || (k.a === b && k.b === a)) ?? null;
}

/** Kurum kaydı. */
export function kurumBul(id) {
  return KURUMLAR.find((k) => k.id === id) ?? null;
}

/**
 * Bir kurumun bütün çiftleri — burs ilanı sayfasındaki mini blok bunu
 * kullanıyor. Sıra sabit: KURUMLAR sırası.
 */
export function kurumunCiftleri(id) {
  return KURUMLAR.filter((k) => k.id !== id)
    .map((k) => ({ diger: k, cift: ciftBul(id, k.id) }))
    .filter((s) => s.cift);
}

/* ------------------------------------------------------------------ görünüm */

/**
 * Durum etiketleri ve renkleri.
 *
 * RENK TEK BAŞINA ANLAM TAŞIMIYOR
 * -------------------------------
 * Her hücrede yazılı etiket de var. Renk körlüğü olan bir okuyucu için
 * yeşil/kırmızı ayrımı yoksa matris boş bir tablodur. `isaret` aynı sebeple:
 * renk de metin de küçüldüğünde simge kalıyor.
 */
export const DURUMLAR = {
  olur: {
    etiket: 'Olur',
    isaret: '✓',
    aciklama: 'Resmî bir metin ikisinin birlikte alınabildiğini söylüyor.',
    sinif: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    nokta: 'bg-emerald-500',
  },
  olmaz: {
    etiket: 'Olmaz',
    isaret: '×',
    aciklama: 'Resmî bir metin ikisinin birlikte yürümediğini söylüyor.',
    sinif: 'border-red-200 bg-red-50 text-red-900',
    nokta: 'bg-red-500',
  },
  kosullu: {
    etiket: 'Koşullu',
    isaret: '!',
    aciklama: 'Yasaklayan bir metin yok ama izin veren de yok; koşullara bağlı.',
    sinif: 'border-amber-200 bg-amber-50 text-amber-900',
    nokta: 'bg-amber-500',
  },
  belirsiz: {
    etiket: 'Belirsiz',
    isaret: '?',
    aciklama: 'Kurum kurum değişiyor ya da bu çifte değen resmî bir metin yok.',
    sinif: 'border-gray-200 bg-gray-100 text-gray-700',
    nokta: 'bg-gray-400',
  },
};

/** Durum sırası — özet sayaçlarında kullanılıyor. */
export const DURUM_SIRASI = ['olur', 'kosullu', 'belirsiz', 'olmaz'];

/**
 * "Eylül 2026" — kaynak satırındaki tarih.
 *
 * Tarih hücrede duruyor, BAŞLIKTA DEĞİL: başlığa yıl yazılsaydı adres her
 * yıl ölür, biriken bağlantılar boşa giderdi.
 */
export function tarihYazisi(iso = ERISIM_TARIHI) {
  const AYLAR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  const [yil, ay] = String(iso).split('-');
  const i = Number(ay) - 1;
  if (!yil || !AYLAR[i]) return '';
  return `${AYLAR[i]} ${yil}`;
}

/* --------------------------------------------------- ilanı kuruma bağlama */

/**
 * Bir burs ilanının hangi kuruma ait olduğunu metinden çıkarır.
 *
 * NEDEN TAHMİN, NEDEN VERİTABANI ALANI DEĞİL
 * ------------------------------------------
 * İlanlarda kurum kimliği tutan bir alan yok; olan tek şey başlık ve kurum
 * adı. Bu eşleştirme yalnızca ilan sayfasındaki mini bloğun HANGİ satırı
 * göstereceğine karar veriyor — bir hak ya da yasak üretmiyor.
 *
 * EŞLEŞMEYENDE BLOK ÇİZİLMİYOR
 * ----------------------------
 * Tanımadığımız bir bursu "herhâlde vakıf bursudur" diye bir satıra
 * yerleştirmek, olmayan bir bilgiyi varmış gibi göstermek olur. `null`
 * dönünce ilan sayfası mini bloğu hiç çizmiyor, yalnızca matris sayfasına
 * bağlantı veriyor.
 *
 * KYK'da BURS/KREDİ AYRIMI
 * ------------------------
 * "KYK" tek başına geçtiğinde hangisi olduğu belli değil ve ikisinin cevabı
 * farklı. Metin açıkça "kredi" demiyorsa burs varsayılmıyor: `null` dönüyor
 * ve öğrenci matriste kendisi seçiyor.
 */
const ESLESMELER = [
  { id: 'kyk-kredi', kalip: /(öğrenim|ogrenim)\s*kredisi|kyk\s*kredi/i },
  { id: 'kyk-burs', kalip: /kyk\s*burs|kredi\s*ve\s*yurtlar|kygm/i },
  { id: 'tev', kalip: /\btev\b|türk\s*eğitim\s*vakfı|turk\s*egitim\s*vakfi/i },
  { id: 'vgm', kalip: /\bvgm\b|vakıflar\s*genel\s*müdürlüğü|vakiflar\s*genel/i },
  { id: 'mev', kalip: /\bmev\b|mill[iî]\s*eğitim\s*vakfı|milli\s*egitim\s*vakfi/i },
  { id: 'tubitak-2205', kalip: /2205|tübitak|tubitak/i },
  { id: 'belediye', kalip: /belediye|büyükşehir|buyuksehir/i },
];

export function kurumEslestir(...parcalar) {
  const metin = parcalar.filter(Boolean).join(' ');
  if (!metin.trim()) return null;
  const bulunan = ESLESMELER.find((e) => e.kalip.test(metin));
  return bulunan ? bulunan.id : null;
}
