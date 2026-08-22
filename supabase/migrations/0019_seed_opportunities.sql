-- Öğrenci fırsatları — ilk içerik.
--
-- NEDEN BU DOSYA VAR
-- ------------------
-- /firsatlar sayfası ve yönetim paneli aylardır çalışıyor ama tablo boştu.
-- Sayfa "0 başvurusu devam eden", "0 burs ve kredi" gösteriyordu; yani
-- çalışan bir sistem hiç içeriği olmadığı için bozuk görünüyordu.
--
-- TUTAR VE TARİH BİLEREK YAZILMIYOR
-- ---------------------------------
-- Burs tutarları ve başvuru takvimleri HER YIL değişiyor. Eskimiş bir
-- rakam ya da geçmiş bir tarih, hiç yazmamaktan kötü: öğrenci ona göre
-- plan yapıyor ve kaçırıyor.
--
--   * application_deadline NULL bırakılıyor. Kod bunu "süresi dolmamış"
--     sayıyor (isExpiredOpportunity tarih yoksa false dönüyor) ve RLS
--     politikası da null tarihli kaydı herkese açık gösteriyor. Arayüz
--     bunu "Dönemsel" olarak çiziyor.
--   * amount_text yalnızca YAPISAL olarak doğru olanı söylüyor:
--     "Karşılıksız" veya "Geri ödemeli". Rakam yok.
--
-- Takvim açıklandığında yönetim panelinden tarih giriliyor; kart o anda
-- kendiliğinden geri sayıma dönüyor.
--
-- KAYNAK ADRESLERİ DOĞRULANDI
-- ---------------------------
-- Aşağıdaki her source_url 19 Ağustos 2026'da gerçekten çağrıldı ve 200
-- döndü. Doğrulanamayan kurumlar bilerek listeye alınmadı:
--   * Sabancı Vakfı — sabancivakfi.org SSL hatası verdi, elle kontrol
--     edilip ayrı bir kayıtla eklenmeli.
--   * bideb.tubitak.gov.tr — bağlantı kurulamadı; TÜBİTAK için ana alan
--     adı kullanıldı.
--
-- Alt sayfa yerine ana adres kullanılan yerler var (TEV, TÜBİTAK, İBB):
-- denenen alt yollar ana sayfaya yönlendi, uydurma derin bağlantı yerine
-- kurumun kendi giriş sayfası veriliyor.

insert into public.opportunities (
  slug, title, organization_name, opportunity_type,
  short_description, description, eligibility,
  education_levels, cities, amount_text, support_type,
  application_deadline, source_url,
  status, verified_at, last_checked_at, published_at
) values

-- KYK en çok aranan iki kalem. Burs ve kredi AYRI kayıt: koşulları ve
-- geri ödemesi farklı, tek kartta birleştirmek öğrenciyi yanıltıyor.
('kyk-ogrenim-bursu',
 'KYK Öğrenim Bursu',
 'Gençlik ve Spor Bakanlığı',
 'kyk',
 'Karşılıksız öğrenim bursu. Başvurular her yıl dönemsel olarak e-Devlet üzerinden açılıyor.',
 'Gençlik ve Spor Bakanlığı tarafından yükseköğretim öğrencilerine verilen karşılıksız burs. Başvurular akademik yıl başında belirli bir tarih aralığında e-Devlet üzerinden alınıyor; kontenjan, tutar ve takvim her yıl bakanlığın duyurusuyla belirleniyor.',
 'Yükseköğretim kurumlarında öğrenim gören öğrenciler. Öncelik ve puanlama ölçütleri bakanlığın o yılki yönergesinde açıklanıyor.',
 '{Ön lisans,Lisans,Yüksek Lisans,Doktora}', '{}',
 'Karşılıksız', 'Burs',
 null, 'https://kygm.gsb.gov.tr/',
 'published', now(), now(), now()),

('kyk-ogrenim-kredisi',
 'KYK Öğrenim Kredisi',
 'Gençlik ve Spor Bakanlığı',
 'kyk',
 'Geri ödemeli öğrenim kredisi. Bursla aynı başvuruda değerlendiriliyor.',
 'Yükseköğretim öğrencilerine verilen ve mezuniyetten sonra geri ödenen öğrenim kredisi. Burs başvurusu yapan öğrenciler burs alamadıklarında genellikle kredi kapsamında değerlendiriliyor. Geri ödeme koşulları ve tutar her yıl bakanlığın duyurusunda yer alıyor.',
 'Yükseköğretim kurumlarında öğrenim gören öğrenciler. Kesin koşullar bakanlığın o yılki yönergesinde.',
 '{Ön lisans,Lisans,Yüksek Lisans,Doktora}', '{}',
 'Geri ödemeli', 'Kredi',
 null, 'https://kygm.gsb.gov.tr/',
 'published', now(), now(), now()),

('tev-yuksekogretim-bursu',
 'TEV Yükseköğretim Bursu',
 'Türk Eğitim Vakfı',
 'scholarship',
 'Karşılıksız eğitim bursu. Başvurular akademik yıl başında dönemsel olarak açılıyor.',
 'Türk Eğitim Vakfı''nın yükseköğretim öğrencilerine verdiği karşılıksız burs. Başvuru dönemi, istenen belgeler ve değerlendirme ölçütleri vakfın kendi duyurusunda açıklanıyor.',
 'Maddi desteğe ihtiyacı olan ve akademik başarı ölçütlerini karşılayan yükseköğretim öğrencileri.',
 '{Ön lisans,Lisans,Yüksek Lisans}', '{}',
 'Karşılıksız', 'Burs',
 null, 'https://www.tev.org.tr/anasayfa/tr',
 'published', now(), now(), now()),

('tubitak-burs-programlari',
 'TÜBİTAK Burs ve Destek Programları',
 'TÜBİTAK',
 'scholarship',
 'Lisans, lisansüstü ve araştırma bursları. Program başına ayrı takvim.',
 'TÜBİTAK''ın öğrencilere yönelik burs ve destek programları; lisans düzeyinde başarı bursları, lisansüstü bursları ve araştırma projelerinde bursiyer görevlendirmeleri bunlara dahil. Her programın kendi başvuru takvimi ve koşulları var.',
 'Program türüne göre değişiyor: lisans, yüksek lisans ve doktora öğrencileri ile araştırmacılar.',
 '{Lisans,Yüksek Lisans,Doktora}', '{}',
 'Programa göre değişiyor', 'Burs',
 null, 'https://tubitak.gov.tr/tr',
 'published', now(), now(), now()),

('erasmus-plus-hareketlilik',
 'Erasmus+ Öğrenim ve Staj Hareketliliği',
 'Türkiye Ulusal Ajansı',
 'international',
 'Yurt dışında öğrenim veya staj. Başvuru kendi üniversitenin Erasmus ofisinden.',
 'Erasmus+ programı öğrencileri başka bir ülkedeki üniversiteye veya iş yerine gönderiyor ve süre boyunca hibe ödeniyor. Başvurular merkezi değil: kendi üniversitenin Erasmus veya Uluslararası İlişkiler ofisi üzerinden yapılıyor. Hibe tutarı gidilen ülkeye ve döneme göre değişiyor.',
 'Üniversitesi programa dahil olan öğrenciler. Dil şartı ve başvuru takvimi okuldan okula değişiyor.',
 '{Ön lisans,Lisans,Yüksek Lisans,Doktora}', '{}',
 'Hibe destekli', 'Yurt dışı',
 null, 'https://www.ua.gov.tr/',
 'published', now(), now(), now()),

('teknofest-yarismalari',
 'TEKNOFEST Teknoloji Yarışmaları',
 'TEKNOFEST',
 'competition',
 'Takım halinde katılınan teknoloji yarışmaları. Ödüllü, dönemsel başvuru.',
 'TEKNOFEST kapsamında düzenlenen teknoloji yarışmaları; havacılık, yapay zekâ, robotik, sağlık teknolojileri gibi çok sayıda kategori bulunuyor. Başvurular takım olarak yapılıyor ve her yarışmanın kendi şartnamesi var.',
 'Lise ve üniversite öğrencileri ile mezunlar. Kategori bazında yaş ve takım koşulları değişiyor.',
 '{Lise,Ön lisans,Lisans,Yüksek Lisans,Doktora}', '{}',
 'Ödüllü', 'Yarışma',
 null, 'https://www.teknofest.org/tr/',
 'published', now(), now(), now()),

('ibb-ogrenci-bursu',
 'İBB Öğrenci Bursu',
 'İstanbul Büyükşehir Belediyesi',
 'scholarship',
 'İstanbul''da öğrenim gören öğrencilere yönelik belediye bursu.',
 'İstanbul Büyükşehir Belediyesi''nin öğrencilere verdiği eğitim desteği. Başvuru dönemi, kontenjan ve koşullar belediyenin kendi duyurusunda açıklanıyor.',
 'Genellikle İstanbul''da ikamet eden veya İstanbul''daki bir yükseköğretim kurumunda okuyan öğrenciler.',
 '{Ön lisans,Lisans}', '{İstanbul}',
 'Karşılıksız', 'Burs',
 null, 'https://www.ibb.istanbul/',
 'published', now(), now(), now()),

('turgev-ogrenci-bursu',
 'TÜRGEV Öğrenci Bursu',
 'TÜRGEV',
 'scholarship',
 'Vakıf bursu. Başvurular akademik yıl başında dönemsel olarak açılıyor.',
 'TÜRGEV''in yükseköğretim öğrencilerine verdiği burs ve barınma destekleri. Başvuru takvimi ve koşullar vakfın duyurusunda yer alıyor.',
 'Yükseköğretim öğrencileri. Kesin koşullar vakfın o yılki duyurusunda.',
 '{Ön lisans,Lisans,Yüksek Lisans}', '{}',
 'Karşılıksız', 'Burs',
 null, 'https://www.turgev.org/',
 'published', now(), now(), now()),

('anadolu-vakfi-egitim-bursu',
 'Anadolu Vakfı Eğitim Bursu',
 'Anadolu Vakfı',
 'scholarship',
 'Karşılıksız eğitim bursu. Dönemsel başvuru.',
 'Anadolu Vakfı''nın öğrencilere yönelik karşılıksız eğitim bursu. Başvuru dönemi ve değerlendirme ölçütleri vakfın kendi duyurusunda açıklanıyor.',
 'Yükseköğretim öğrencileri. Kesin koşullar vakfın duyurusunda.',
 '{Ön lisans,Lisans}', '{}',
 'Karşılıksız', 'Burs',
 null, 'https://anadoluvakfi.org/',
 'published', now(), now(), now()),

('vehbi-koc-vakfi-bursu',
 'Vehbi Koç Vakfı Eğitim Bursu',
 'Vehbi Koç Vakfı',
 'scholarship',
 'Karşılıksız eğitim bursu. Dönemsel başvuru.',
 'Vehbi Koç Vakfı''nın eğitim alanındaki burs programları. Başvuru koşulları ve takvim vakfın kendi sayfasında duyuruluyor.',
 'Yükseköğretim öğrencileri. Program bazında koşullar değişiyor.',
 '{Ön lisans,Lisans,Yüksek Lisans}', '{}',
 'Karşılıksız', 'Burs',
 null, 'https://www.vkv.org.tr/',
 'published', now(), now(), now()),

('ted-egitim-bursu',
 'Türk Eğitim Derneği Bursu',
 'Türk Eğitim Derneği',
 'scholarship',
 'Karşılıksız eğitim bursu. Dönemsel başvuru.',
 'Türk Eğitim Derneği''nin öğrencilere yönelik burs programları. Başvuru dönemi ve koşullar derneğin duyurusunda açıklanıyor.',
 'Öğrenim düzeyi ve koşullar programa göre değişiyor.',
 '{Lise,Ön lisans,Lisans}', '{}',
 'Karşılıksız', 'Burs',
 null, 'https://ted.org.tr/',
 'published', now(), now(), now())

on conflict (slug) do nothing;
