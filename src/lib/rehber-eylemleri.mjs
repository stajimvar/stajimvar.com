/**
 * REHBERDEN GERÇEK AKSİYONA — TEK EŞLEME KATMANI
 *
 * Rehber okuyan öğrenci sayfanın sonunda "şimdi ne yapacağım?" sorusunun
 * cevabını görmeli. Ama her rehbere aynı beş bağlantıyı koymak bunu
 * cevaplamıyor; yalnızca sayfayı uzatıyor.
 *
 * NEDEN ELLE EŞLEME
 * -----------------
 * Rehber verisinde ürün ilişkisi YOK: `kategori` alanı yalnız
 * `ogrenci` / `isveren` ayrımı yapıyor. Slug ya da başlıktaki kelimelere
 * bakıp otomatik bağlantı üretmek, "burs" geçen her rehberi burs
 * sayfasına bağlamak olurdu — alakasız bağlantı, hiç bağlantı olmamasından
 * kötü. Bu yüzden eşleme elle ve deterministik.
 *
 * KURAL: rehber başına EN FAZLA ÜÇ eylem. Eşlemesi olmayan rehber
 * hiçbir şey göstermiyor; uydurma bağlantı üretilmiyor.
 */

/** Eylem aileleri — hangi ürün yüzeyine gidildiği. */
export const AILELER = /** @type {const} */ ({
  JOBS: 'jobs',
  COMPANIES: 'companies',
  CV_PROFILE: 'cv_profile',
  SCHOLARSHIPS: 'scholarships',
  CAREER_CENTERS: 'career_centers',
  DEPARTMENTS: 'departments',
  EVENTS: 'events',
});

/**
 * Eylem tanımları. Metinler bağlamsız değil: "Devam" ya da "Buraya
 * tıkla" gibi bir bağlantı, ekran okuyucuda tek başına okunduğunda
 * hiçbir şey ifade etmiyor.
 */
const EYLEM = {
  ilanlar: {
    aile: AILELER.JOBS,
    baslik: 'Açık staj ilanlarını gör',
    aciklama: 'Şirketlerin kendi kaynağından derlenen, adresi her gün kontrol edilen ilanlar.',
    yol: '/',
  },
  isverenler: {
    aile: AILELER.COMPANIES,
    baslik: 'Büyük işverenleri keşfet',
    aciklama: 'Stajı kendi kariyer sayfasından alan kurumlar ve ilgili bölümler.',
    yol: '/staj-programlari',
  },
  cv: {
    aile: AILELER.CV_PROFILE,
    baslik: "Özgeçmişini hazırla",
    aciklama: 'Profilindeki bilgilerden yazdırılabilir bir özgeçmiş üret.',
    yol: '/cv',
  },
  burslar: {
    aile: AILELER.SCHOLARSHIPS,
    baslik: 'Açık bursları gör',
    aciklama: 'Resmî kaynağı doğrulanmış burs ve destek başvuruları.',
    yol: '/burslar',
  },
  kyk: {
    aile: AILELER.SCHOLARSHIPS,
    baslik: 'KYK duyurularını takip et',
    aciklama: 'Burs, kredi ve yurt başvurularına dair resmî duyurular.',
    yol: '/kyk',
  },
  yurtdisi: {
    aile: AILELER.SCHOLARSHIPS,
    baslik: 'Yurtdışı fırsatlarını gör',
    aciklama: 'Değişim, staj ve hareketlilik programları.',
    yol: '/yurtdisi-firsatlari',
  },
  kariyerMerkezleri: {
    aile: AILELER.CAREER_CENTERS,
    baslik: 'Üniversitenin kariyer merkezini bul',
    aciklama: 'Staj formu, sigorta yazısı ve onay imzası kendi okulundan çıkıyor.',
    yol: '/universite-kariyer-merkezleri',
  },
  bolumler: {
    aile: AILELER.DEPARTMENTS,
    baslik: 'Bölümüne göre staj yolunu gör',
    aciklama: 'Hangi pozisyonlar açılıyor, ne aranıyor, nereye başvurulur.',
    yol: '/bolumler',
  },
  etkinlikler: {
    aile: AILELER.EVENTS,
    baslik: 'Öğrenci etkinliklerini keşfet',
    aciklama: 'Şehrindeki ücretsiz ya da öğrenci bütçesine uygun etkinlikler.',
    yol: '/kesfet',
  },
};

/**
 * Rehber slug'ı → eylem anahtarları.
 *
 * Buradaki her satır elle kuruldu ve rehberin gerçekten ne anlattığına
 * bakıyor. Listede olmayan rehber hiçbir eylem göstermiyor.
 */
const ESLEME = {
  // --- CV ve başvuru
  'ats-uyumlu-cv': ['cv', 'ilanlar'],
  'cvde-proje-nasil-anlatilir': ['cv', 'ilanlar'],
  'yeni-mezun-cvsi': ['cv', 'ilanlar'],
  'on-yazi-nasil-yazilir': ['cv', 'ilanlar'],
  'portfolyo-nasil-hazirlanir': ['cv', 'bolumler'],
  'linkedin-profili-nasil-duzenlenir': ['cv', 'ilanlar'],
  'staj-basvuru-epostasi': ['isverenler', 'ilanlar', 'cv'],
  'ilan-acmayan-sirkete-nasil-yazilir': ['isverenler', 'cv'],
  'basvuruya-cevap-gelmezse': ['ilanlar', 'isverenler'],

  // --- staj bulma
  'staj-nasil-bulunur': ['ilanlar', 'isverenler', 'bolumler'],
  'staj-basvurusu-gerekli-belgeler': ['kariyerMerkezleri', 'ilanlar'],
  'uzaktan-staj-kabul-edilir-mi': ['kariyerMerkezleri', 'ilanlar'],
  'yeni-mezun-programlari': ['isverenler', 'ilanlar'],

  // --- zorunlu staj ve okul işleri
  'staj-sigortasi-kim-yapar': ['kariyerMerkezleri', 'bolumler'],
  'staj-ucreti-nasil-hesaplanir': ['ilanlar'],
  'stajda-izin-ve-devamsizlik': ['kariyerMerkezleri'],
  'stajyerin-gorev-ve-sorumluluklari': ['bolumler'],
  'kotu-gecen-stajda-ne-yapilir': ['kariyerMerkezleri'],
  'universite-kariyer-merkezi': ['kariyerMerkezleri', 'ilanlar'],
  'ogrenci-isleri-hangi-islemler': ['kariyerMerkezleri'],
  'yaz-okulu-ve-staj': ['kariyerMerkezleri', 'ilanlar'],

  // --- burs ve destek
  'burslar-hangi-aylarda-acilir': ['burslar'],
  'ayni-anda-birden-fazla-burs': ['burslar'],
  'burs-basvurusu-gerekli-belgeler': ['burslar'],
  'burs-mulakati': ['burslar'],
  'burs-hangi-durumlarda-kesilir': ['burslar'],
  'karsiliksiz-ve-geri-odemeli-burs-farki': ['burslar', 'kyk'],
  'burs-dolandiriciligi': ['burslar'],
  'burs-basvuru-takvimi-takibi': ['burslar'],
  'kyk-kredisi-geri-odeme': ['kyk'],
  'kyk-yurt-basvurusu': ['kyk'],

  // --- kariyer ve mezuniyet
  'stajdan-sonra-is-teklifi': ['ilanlar', 'cv'],
  'ilk-is-mulakati': ['cv', 'ilanlar'],
  'mezun-olmadan-once-yapilacaklar': ['cv', 'ilanlar', 'kariyerMerkezleri'],
  'ogrenci-kulupleri-cvye-nasil-yazilir': ['cv', 'etkinlikler'],
  'ogrenciyken-yari-zamanli-calisma': ['ilanlar'],
};

/**
 * Bir rehberin sonunda gösterilecek eylemler.
 *
 * @param {string} slug
 * @returns {{aile: string, baslik: string, aciklama: string, yol: string}[]}
 */
export function rehberEylemleri(slug) {
  const anahtarlar = ESLEME[slug];
  if (!anahtarlar) return [];
  /* Üç sınırı burada uygulanıyor: eşlemede fazlası yazılsa bile kesiliyor. */
  return anahtarlar.slice(0, 3).map((a) => EYLEM[a]).filter(Boolean);
}

/** Şirket sayfalarının kullandığı ortak hazırlık eylemleri. */
export function basvuruHazirligiEylemleri() {
  return [EYLEM.cv, EYLEM.ilanlar];
}

/** Eşlemesi olan rehber sayısı — rapor ve regresyon için. */
export function eslemeliRehberler() {
  return Object.keys(ESLEME);
}

/**
 * Fırsat detayının sonunda gösterilecek eylemler.
 *
 * Fırsatın KENDİ türüne bakıyor; rastgele üç kart değil.
 * @param {string | undefined | null} tur
 */
export function firsatEylemleri(tur) {
  /*
    Türler `opportunities.opportunity_type` enum'undan okundu:
    scholarship (47), international (14), student_support (2), kyk (2),
    competition (1), education (1), youth_program (1).

    Eşleme TAM DEĞER üzerinden; alt dize araması "student_support"u
    yanlışlıkla başka bir aileye bağlayabilirdi.
  */
  const ESLEME_TUR = {
    kyk: [EYLEM.kyk, EYLEM.burslar],
    scholarship: [EYLEM.burslar, EYLEM.kyk],
    student_support: [EYLEM.burslar],
    international: [EYLEM.yurtdisi, EYLEM.burslar],
    youth_program: [EYLEM.yurtdisi],
    education: [EYLEM.burslar],
    competition: [EYLEM.etkinlikler],
  };
  /* Tür tanınmıyorsa uydurma bağlantı yok. */
  return ESLEME_TUR[(tur || '').toLowerCase()] ?? [];
}
