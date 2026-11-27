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
 * Kalan 22'si burada. 23 Kasım 2026'da tarama 221 üniversiteye genişletildi
 * (alan adları Wikidata'dan, doğrulama aynı betikle) ve 38 okul eklendi: 60. İlk tur 5 adres kalıbıyla 20 sonuç vermişti; kalıp
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

/*
  LİSTEDE OLMAYACAK OKULLAR
  Üsküdar Üniversitesi — 27 Kasım 2026, kurumun e-postayla talebi
  (protokol olmadan adının yer almaması). Yeniden eklemek için kurumun
  yazılı izni gerekir; tests/kariyer-merkezleri-disarida.test.mjs.
*/
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
  /* 23 Kasım 2026 taraması: 221 üniversitenin resmî alan adı (Wikidata) ve aynı doğrulama (automation/kariyer_merkezi_bul.py: 200, yumuşak 404 yok, sayfada "kariyer"). Yalnız kurumsal kariyer e-postası da bulunan 38 okul. */
  {
    universite: 'İstanbul Yeni Yüzyıl Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyermerkezi.yeniyuzyil.edu.tr/',
  },
  {
    universite: 'Giresun Üniversitesi',
    sehir: 'Giresun',
    url: 'https://kariyer.giresun.edu.tr/',
  },
  {
    universite: 'Bingöl Üniversitesi',
    sehir: 'Bingöl',
    url: 'https://kariyer.bingol.edu.tr/',
  },
  {
    universite: 'Kastamonu Üniversitesi',
    sehir: 'Kastamonu',
    url: 'https://kariyer.kastamonu.edu.tr/',
  },
  {
    universite: 'Erzincan Binali Yıldırım Üniversitesi',
    sehir: 'Erzincan',
    url: 'https://kariyermerkezi.ebyu.edu.tr/',
  },
  {
    universite: 'Recep Tayyip Erdoğan Üniversitesi',
    sehir: 'Rize',
    url: 'https://kariyer.erdogan.edu.tr/',
  },
  {
    universite: 'Balıkesir Üniversitesi',
    sehir: 'Balıkesir',
    url: 'https://kariyer.balikesir.edu.tr/',
  },
  {
    universite: 'Gümüşhane Üniversitesi',
    sehir: 'Gümüşhane',
    url: 'https://kariyer.gumushane.edu.tr/',
  },
  {
    universite: 'Nevşehir Hacı Bektaş Veli Üniversitesi',
    sehir: 'Nevşehir',
    url: 'https://kariyer.nevsehir.edu.tr/',
  },
  {
    universite: 'Harran Üniversitesi',
    sehir: 'Şanlıurfa',
    url: 'https://www.harran.edu.tr/idari/merkezler/kariyer-gelisimi-uygulama-ve-arastirma-merkezi',
  },
  {
    universite: 'Tekirdağ Namık Kemal Üniversitesi',
    sehir: 'Tekirdağ',
    url: 'https://kariyer.nku.edu.tr/',
  },
  {
    universite: 'Burdur Mehmet Akif Ersoy Üniversitesi',
    sehir: 'Burdur',
    url: 'https://kariyer.mehmetakif.edu.tr/tr',
  },
  {
    universite: 'Düzce Üniversitesi',
    sehir: 'Düzce',
    url: 'https://kariyer.duzce.edu.tr/',
  },
  {
    universite: 'Bayburt Üniversitesi',
    sehir: 'Bayburt',
    url: 'https://kariyer.bayburt.edu.tr/',
  },
  {
    universite: 'Uşak Üniversitesi',
    sehir: 'Uşak',
    url: 'https://kariyer.usak.edu.tr/',
  },
  {
    universite: 'Yalova Üniversitesi',
    sehir: 'Yalova',
    url: 'https://kariyer.yalova.edu.tr/',
  },
  {
    universite: 'Sanko Üniversitesi',
    sehir: 'Gaziantep',
    url: 'https://kariyer.sanko.edu.tr/kariyer/index.html',
  },
  {
    universite: 'Karabük Üniversitesi',
    sehir: 'Karabük',
    url: 'https://kariyer.karabuk.edu.tr/index.aspx',
  },
  {
    universite: 'Alanya Alaaddin Keykubat Üniversitesi',
    sehir: 'Antalya',
    url: 'https://kariyermerkezi.alanya.edu.tr/',
  },
  {
    universite: 'Ankara Sosyal Bilimler Üniversitesi',
    sehir: 'Ankara',
    url: 'https://kariyer.asbu.edu.tr/',
  },
  {
    universite: 'İzmir Demokrasi Üniversitesi',
    sehir: 'İzmir',
    url: 'https://kariyer.idu.edu.tr/',
  },
  {
    universite: 'Iğdır Üniversitesi',
    sehir: 'Iğdır',
    url: 'https://kariyer.igdir.edu.tr/',
  },
  {
    universite: 'Hitit Üniversitesi',
    sehir: 'Çorum',
    url: 'https://kariyer.hitit.edu.tr/',
  },
  {
    universite: 'Munzur Üniversitesi',
    sehir: 'Tunceli',
    url: 'https://kariyer.munzur.edu.tr/',
  },
  {
    universite: 'Karamanoğlu Mehmetbey Üniversitesi',
    sehir: 'Karaman',
    url: 'https://www.kmu.edu.tr/kariyer',
  },
  {
    universite: 'İstanbul Gedik Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyer.gedik.edu.tr/',
  },
  {
    universite: 'Beykoz Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://www.beykoz.edu.tr/akademik/4683-kariyer-merkezi',
  },
  {
    universite: 'Kapadokya Üniversitesi',
    sehir: 'Nevşehir',
    url: 'https://kariyer.kapadokya.edu.tr/',
  },
  {
    universite: 'İzmir Ekonomi Üniversitesi',
    sehir: 'İzmir',
    url: 'https://kariyer.ieu.edu.tr/tr',
  },
  {
    universite: 'Haliç Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyer.halic.edu.tr/',
  },
  {
    universite: 'Fenerbahçe Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyer.fbu.edu.tr/',
  },
  {
    universite: 'İstanbul Gelişim Üniversitesi',
    sehir: 'İstanbul',
    url: 'https://kariyer.gelisim.edu.tr/tr/idari-anasayfa',
  },
  {
    universite: 'Sivas Bilim ve Teknoloji Üniversitesi',
    sehir: 'Sivas',
    url: 'https://kariyer.sivas.edu.tr/',
  },
  {
    universite: 'Sakarya Uygulamalı Bilimler Üniversitesi',
    sehir: 'Sakarya',
    url: 'https://kariyer.subu.edu.tr/',
  },
  {
    universite: 'Isparta Uygulamalı Bilimler Üniversitesi',
    sehir: 'Isparta',
    url: 'https://kariyer.isparta.edu.tr/',
  },
  {
    universite: 'Kayseri Üniversitesi',
    sehir: 'Kayseri',
    url: 'https://kariyer.kayseri.edu.tr/',
  },
  {
    universite: 'Eskişehir Teknik Üniversitesi',
    sehir: 'Eskişehir',
    url: 'https://kariyer.eskisehir.edu.tr/',
  },
];
