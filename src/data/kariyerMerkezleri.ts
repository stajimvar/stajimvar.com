/**
 * Üniversite kariyer merkezleri — doğrulanmış dış bağlantılar.
 *
 * NEDEN VAR
 * ---------
 * Zorunlu stajın evrak tarafı üniversitenin kariyer merkezinden veya staj
 * komisyonundan geçiyor: staj formu, sigorta yazısı, onay imzası. Öğrenci
 * "staj formu nereden alınır" diye arıyor ve cevabı kendi okulunun
 * sayfasında. Biz o sayfayı bulup bağlayabiliyoruz.
 *
 * NASIL ÜRETİLDİ
 * --------------
 * automation/kariyer_merkezi_bul.py her adresi gerçekten çağırıyor. 200
 * dönmeyen, gövdesi çok kısa olan veya içinde "kariyer" geçmeyen adres
 * listeye alınmıyor; robots.txt kapalıysa istek hiç atılmıyor.
 *
 * Taranan 42 üniversitenin 24'ünde sayfa bulundu, ikisi elendi:
 *
 *   - Gebze Teknik: istek ana sayfaya düşüyor. Kariyer merkezi diye ana
 *     sayfa göstermek öğrenciyi boşuna dolaştırır.
 *   - Başkent: adres /tr/404. Sunucu hata sayfasını 200 durum koduyla
 *     sunuyor ve içinde "kariyer" kelimesi geçtiği için tarayıcı önce
 *     kabul etmişti. Durum kodu tek başına yetmiyormuş; betiğe yumuşak
 *     404 koruması eklendi.
 *
 * Kalan 22'si burada. İlk tur 5 adres kalıbıyla 20 sonuç vermişti; kalıp
 * sayısı 16'ya çıkarılınca Hacettepe, Sabancı ve Pamukkale de bulundu.
 *
 * Hâlâ bulunamayanlar (ODTÜ, İTÜ, Ankara, Koç, Bilkent, Anadolu, Erciyes,
 * Kocaeli ve diğerleri) kariyer merkezini başka bir kalıpta tutuyor.
 * Uydurmak yerine listede yoklar.
 */

export interface KariyerMerkezi {
  universite: string;
  sehir: string;
  /** Doğrulanmış resmi adres. */
  url: string;
}

export const KARIYER_MERKEZLERI: KariyerMerkezi[] = [
  {
    universite: 'Çukurova Üniversitesi',
    sehir: 'Adana',
    url: 'https://kariyer.cu.edu.tr/',
  },
  {
    universite: 'Gazi Üniversitesi',
    sehir: 'Ankara',
    url: 'https://kariyer.gazi.edu.tr/',
  },
  {
    universite: 'Hacettepe Üniversitesi',
    sehir: 'Ankara',
    url: 'https://www.hacettepe.edu.tr/ogrenci/kariyer',
  },
  {
    universite: 'TOBB Ekonomi ve Teknoloji Üniversitesi',
    sehir: 'Ankara',
    url: 'https://www.etu.edu.tr/tr/kariyer',
  },
  {
    universite: 'Akdeniz Üniversitesi',
    sehir: 'Antalya',
    url: 'https://kariyermerkezi.akdeniz.edu.tr/',
  },
  {
    universite: 'Pamukkale Üniversitesi',
    sehir: 'Denizli',
    url: 'https://www.pau.edu.tr/kariyer',
  },
  {
    universite: 'Atatürk Üniversitesi',
    sehir: 'Erzurum',
    url: 'https://atauni.edu.tr/kariyer/',
  },
  {
    universite: 'Eskişehir Osmangazi Üniversitesi',
    sehir: 'Eskişehir',
    url: 'https://kariyer.ogu.edu.tr/',
  },
  {
    universite: 'Süleyman Demirel Üniversitesi',
    sehir: 'Isparta',
    url: 'https://kariyer.sdu.edu.tr/',
  },
  {
    universite: 'Selçuk Üniversitesi',
    sehir: 'Konya',
    url: 'https://kariyer.selcuk.edu.tr/',
  },
  {
    universite: 'Muğla Sıtkı Koçman Üniversitesi',
    sehir: 'Muğla',
    url: 'https://kariyer.mu.edu.tr/',
  },
  {
    universite: 'Sakarya Üniversitesi',
    sehir: 'Sakarya',
    url: 'https://kariyer.sakarya.edu.tr/',
  },
  {
    universite: 'Ondokuz Mayıs Üniversitesi',
    sehir: 'Samsun',
    url: 'https://kariyer.omu.edu.tr/tr',
  },
  {
    universite: 'Karadeniz Teknik Üniversitesi',
    sehir: 'Trabzon',
    url: 'https://www.ktu.edu.tr/kariyer',
  },
  {
    universite: 'Boğaziçi Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyermerkezi.bogazici.edu.tr/',
  },
  {
    universite: 'Marmara Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyermerkezi.marmara.edu.tr/',
  },
  {
    universite: 'Sabancı Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://career.sabanciuniv.edu/',
  },
  {
    universite: 'Yıldız Teknik Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyer.yildiz.edu.tr/',
  },
  {
    universite: 'İstanbul Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyer.istanbul.edu.tr/tr',
  },
  {
    universite: 'Dokuz Eylül Üniversitesi',
    sehir: 'İzmir',
    url: 'https://kariyer.deu.edu.tr/tr/',
  },
  {
    universite: 'Ege Üniversitesi',
    sehir: 'İzmir',
    url: 'https://kariyer.ege.edu.tr/',
  },
  {
    universite: 'İzmir Yüksek Teknoloji Enstitüsü',
    sehir: 'İzmir',
    url: 'https://kariyerimiyte.iyte.edu.tr/',
  },
];
