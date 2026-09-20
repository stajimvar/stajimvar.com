-- YÖK PROGRAM KATALOĞU — 595 BÖLÜM, 24 ALAN
--
-- KULLANICI İSTEĞİ (19 Eylül 2026): "CV doldururken okul seçiminden
-- sonra bölümünü bulamamak gibi bir durum asla yaşansın istemiyorum."
--
-- ÖLÇÜLEN DURUM
-- -------------
-- Bölüm kataloğu 42 kalemdi ve eşleştirme BİREBİR metin karşılaştırması:
--   where lower(btrim(d.ad)) = lower(btrim(ham))
-- Bunun canlıdaki sonucu: yayındaki 21 öğrenci profilinin 16'sında alan
-- YOK. Bölümünü yazan üç kullanıcının üçü de eşleşememiş:
--   "Spor Yöneticiliği"        katalogda yok
--   "Yeni Medya ve İletişim"   katalogda "İletişim" var, birebir tutmuyor
--   "Bilgisayar Programcılığı" katalogda "Bilgisayar Programcılığı (MYO)"
-- Sonuncusu can alıcı: kullanıcı bölümünü DOĞRU yazmış, kayıttaki
-- "(MYO)" eki yüzünden eşleşme tutmamış.
--
-- Alan bölümden türetildiği için (`bolum_girilince_tamamla`,
-- 20260926050000) alansız kalan kullanıcı bağlantı da kuramıyor
-- (20261019010000). Yani katalogdaki eksik, sosyal katmanın tamamını
-- kilitliyor.
--
-- KAYNAK
-- ------
-- YÖK Atlas tercih kılavuzu program grubu listesi (2026-YKS):
--   yokatlas.yok.gov.tr/api/tercih-kilavuz/universite-programlar
-- 611 satır, 595 benzersiz ad. Kullanıcı onayıyla çekildi; GitHub
-- kopyası ya da uydurma liste kullanılmadı. ÖSYM kılavuzunun 21 bin
-- satırlık üniversite × burs × dil kırılımı DEĞİL, program grubu adları.
--
-- ADLARA EK KOYULMUYOR
-- --------------------
-- 16 ad hem lisans hem önlisans olarak geçiyor (Çocuk Gelişimi,
-- Pazarlama, İlahiyat…). Bunları "(MYO)" gibi eklerle ayırmak, yukarıda
-- ölçülen eşleşme kusurunun ta kendisiydi. Ayrım `duzey` sütununda:
-- 'lisans' 334, 'onlisans' 245, 'ikisi' 16.
--
-- ESKİ 42 SATIR SİLİNMİYOR
-- ------------------------
-- `social_profiles.department_id` onlara bakıyor. Eşleştirme
-- normalleştirilmiş ada göre yapılıyor: katalogdaki ad zaten varsa satır
-- yeniden kullanılıyor, yalnız `duzey` ve alan eşlemesi tamamlanıyor.
--
-- `grup` YENİ SATIRLARDA NULL VE SÜTUN NULL'A AÇILIYOR.
--
-- O sütunun altı değerlik kısıtı (muhendislik/myo/sosyal/tasarim/saglik/
-- hizmet) 42 EDİTORYAL bölüm sayfası için yazılmıştı: her biri
-- /bolum/<slug> adresinde 700+ kelimelik kendi sayfası olan bölümler.
-- 595 programın çoğunun öyle bir sayfası yok ve olmayacak; altı kovaya
-- sıkıştırmak anlamlı bir gruplama üretmezdi. Anlamlı gruplama zaten
-- alan (24 sektör, `department_sectors`).
--
-- Sütun NOT NULL'dı; kaldırılıyor. CHECK kısıtı NULL'ı zaten geçiriyor
-- (NULL = ANY(...) → NULL → kısıt sağlanmış sayılıyor), engel yalnız
-- NOT NULL'dı. `grup` dolu olan 42 satır aynen duruyor, yani editoryal
-- sayfaların gruplaması bozulmuyor.
--
-- OKUYAN TARAF: `bolumleriGetir` (src/lib/queries/sosyal.ts) bu sütunu
-- döndürüyor ve yönetim kuyruğu ona göre başlık atıyor. Artık null
-- gelebilir; okuyan ekranın bunu karşılaması gerekiyor.

alter table public.departments alter column grup drop not null;

alter table public.departments
  add column if not exists duzey text
  check (duzey is null or duzey in ('lisans', 'onlisans', 'ikisi'));

comment on column public.departments.duzey is
  'YÖK program grubunun düzeyi: lisans, onlisans ya da ikisi (aynı ad iki düzeyde de açılıyorsa). Ada ek koymamak için ayrı sütun (20261021010000).';

/* Spor tarafına ev: dört program (Egzersiz ve Spor Bilimleri, Rekreasyon,
   Rekreasyon Yönetimi, Antrenörlük Eğitimi) 23 alanın hiçbirine oturmuyordu
   ve keyword eşleştirmesi onları dört ayrı alana dağıtmıştı. */
insert into public.sectors (slug, ad, sira, aktif)
select 'spor-ve-rekreasyon', 'Spor ve Rekreasyon',
       coalesce((select max(sira) from public.sectors), 0) + 1, true
where not exists (select 1 from public.sectors where ad = 'Spor ve Rekreasyon');

create temporary table yok_katalog (ad text, slug text, duzey text, alan text) on commit drop;

insert into yok_katalog (ad, slug, duzey, alan) values
  ('Abaza Dili ve Edebiyatı', 'abaza-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Acil Durum ve Afet Yönetimi', 'acil-durum-ve-afet-yonetimi', 'onlisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Acil Yardım ve Afet Yönetimi', 'acil-yardim-ve-afet-yonetimi', 'lisans', 'Sağlık ve İlaç'),
  ('Açık Deniz Sondaj Teknolojisi', 'acik-deniz-sondaj-teknolojisi', 'onlisans', 'Makine ve İmalat'),
  ('Adli Bilimler', 'adli-bilimler', 'lisans', 'Sağlık ve İlaç'),
  ('Adli Bilişim Mühendisliği', 'adli-bilisim-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Ağaç İşleri Endüstri Mühendisliği', 'agac-isleri-endustri-muhendisligi', 'lisans', 'Endüstri ve Operasyon Yönetimi'),
  ('Ağız ve Diş Sağlığı', 'agiz-ve-dis-sagligi', 'onlisans', 'İş Sağlığı, Güvenliği ve Kalite'),
  ('Akıllı Altyapılar Teknikerliği', 'akilli-altyapilar-teknikerligi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Akıllı Sera Teknolojileri', 'akilli-sera-teknolojileri', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Akıllı Tarım ve Gıda Yönetimi', 'akilli-tarim-ve-gida-yonetimi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Aktüerya Bilimleri', 'aktuerya-bilimleri', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Almanca Mütercim ve Tercümanlık', 'almanca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Almanca Öğretmenliği', 'almanca-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Alman Dili ve Edebiyatı', 'alman-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Alternatif Enerji Kaynakları Teknolojisi', 'alternatif-enerji-kaynaklari-teknolojisi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Ameliyathane Hizmetleri', 'ameliyathane-hizmetleri', 'onlisans', 'Sağlık ve İlaç'),
  ('Amerikan Kültürü ve Edebiyatı', 'amerikan-kulturu-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Anestezi', 'anestezi', 'onlisans', 'Sağlık ve İlaç'),
  ('Antrenörlük Eğitimi', 'antrenorluk-egitimi', 'lisans', 'Spor ve Rekreasyon'),
  ('Antropoloji', 'antropoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Arapça Mütercim ve Tercümanlık', 'arapca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Arapça Öğretmenliği', 'arapca-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Arap Dili ve Edebiyatı', 'arap-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Arıcılık', 'aricilik', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Arka-Yüz Yazılım Geliştirme', 'arka-yuz-yazilim-gelistirme', 'onlisans', 'Bilişim ve Yazılım'),
  ('Arkeoloji', 'arkeoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Arkeoloji ve Sanat Tarihi', 'arkeoloji-ve-sanat-tarihi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Arnavut Dili ve Edebiyatı', 'arnavut-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Astronomi ve Uzay Bilimleri', 'astronomi-ve-uzay-bilimleri', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Aşçılık', 'ascilik', 'onlisans', 'Turizm ve Konaklama'),
  ('Atçılık ve Antrenörlüğü', 'atcilik-ve-antrenorlugu', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Avcılık ve Yaban Hayatı', 'avcilik-ve-yaban-hayati', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Ayakkabı Tasarımı ve Üretimi', 'ayakkabi-tasarimi-ve-uretimi', 'lisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Ayakkabı Tasarım ve Üretimi', 'ayakkabi-tasarim-ve-uretimi', 'onlisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Azerbaycan Türkçesi ve Edebiyatı', 'azerbaycan-turkcesi-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Bağcılık', 'bagcilik', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Bağcılık ve Bağ Ürünleri Teknolojisi', 'bagcilik-ve-bag-urunleri-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Bahçe Bitkileri', 'bahce-bitkileri', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Bahçe Tarımı', 'bahce-tarimi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Balıkçılık Teknolojisi Mühendisliği', 'balikcilik-teknolojisi-muhendisligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Bankacılık', 'bankacilik', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Bankacılık ve Sigortacılık', 'bankacilik-ve-sigortacilik', 'ikisi', 'Finans, Bankacılık ve Sigorta'),
  ('Basım Teknolojileri', 'basim-teknolojileri', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Basım ve Yayım Teknolojileri', 'basim-ve-yayim-teknolojileri', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Basın ve Yayın', 'basin-ve-yayin', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Beden Eğitimi ve Spor Öğretmenliği', 'beden-egitimi-ve-spor-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Beslenme ve Diyetetik', 'beslenme-ve-diyetetik', 'lisans', 'Sağlık ve İlaç'),
  ('Bıçakçılık ve El Aletleri Üretim Teknolojisi', 'bicakcilik-ve-el-aletleri-uretim-teknolojisi', 'onlisans', 'Makine ve İmalat'),
  ('Bilgisayar Bilimleri', 'bilgisayar-bilimleri', 'lisans', 'Bilişim ve Yazılım'),
  ('Bilgisayar Destekli Tasarım ve Animasyon', 'bilgisayar-destekli-tasarim-ve-animasyon', 'onlisans', 'Bilişim ve Yazılım'),
  ('Bilgisayar Mühendisliği', 'bilgisayar-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Bilgisayar Operatörlüğü', 'bilgisayar-operatorlugu', 'onlisans', 'Bilişim ve Yazılım'),
  ('Bilgisayar Programcılığı', 'bilgisayar-programciligi', 'onlisans', 'Bilişim ve Yazılım'),
  ('Bilgisayar Teknolojisi', 'bilgisayar-teknolojisi', 'onlisans', 'Bilişim ve Yazılım'),
  ('Bilgisayar Teknolojisi ve Bilişim Sistemleri', 'bilgisayar-teknolojisi-ve-bilisim-sistemleri', 'lisans', 'Bilişim ve Yazılım'),
  ('Bilgisayar ve Öğretim Teknolojileri Öğretmenliği', 'bilgisayar-ve-ogretim-teknolojileri-ogretmenligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Bilgi ve Belge Yönetimi', 'bilgi-ve-belge-yonetimi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Bilim Tarihi', 'bilim-tarihi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Bilişim Güvenliği Teknolojisi', 'bilisim-guvenligi-teknolojisi', 'onlisans', 'Bilişim ve Yazılım'),
  ('Bilişim Sistemleri Mühendisliği', 'bilisim-sistemleri-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Bilişim Sistemleri ve Teknolojileri', 'bilisim-sistemleri-ve-teknolojileri', 'lisans', 'Bilişim ve Yazılım'),
  ('Bitki Koruma', 'bitki-koruma', 'ikisi', 'Gıda, Tarım ve Hayvancılık'),
  ('Bitkisel Üretim ve Teknolojileri', 'bitkisel-uretim-ve-teknolojileri', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Biyokimya', 'biyokimya', 'ikisi', 'Kimya, Malzeme ve Maden'),
  ('Biyoloji', 'biyoloji', 'lisans', 'Sağlık ve İlaç'),
  ('Biyoloji Öğretmenliği', 'biyoloji-ogretmenligi', 'lisans', 'Sağlık ve İlaç'),
  ('Biyomedikal Cihaz Teknolojisi', 'biyomedikal-cihaz-teknolojisi', 'onlisans', 'Sağlık ve İlaç'),
  ('Biyomedikal Mühendisliği', 'biyomedikal-muhendisligi', 'lisans', 'Sağlık ve İlaç'),
  ('Biyomühendislik', 'biyomuhendislik', 'lisans', 'Sağlık ve İlaç'),
  ('Biyosistem Mühendisliği', 'biyosistem-muhendisligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Biyoteknoloji', 'biyoteknoloji', 'lisans', 'Sağlık ve İlaç'),
  ('Biyoteknoloji ve Genetik', 'biyoteknoloji-ve-genetik', 'lisans', 'Sağlık ve İlaç'),
  ('Boşnak Dili ve Edebiyatı', 'bosnak-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Boya Teknolojisi', 'boya-teknolojisi', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Bulgarca Mütercim ve Tercümanlık', 'bulgarca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Bulgar Dili ve Edebiyatı', 'bulgar-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Bulut Bilişim Operatörlüğü', 'bulut-bilisim-operatorlugu', 'onlisans', 'Bilişim ve Yazılım'),
  ('Büro Yönetimi ve Yönetici Asistanlığı', 'buro-yonetimi-ve-yonetici-asistanligi', 'onlisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Büyük Veri Analistliği', 'buyuk-veri-analistligi', 'onlisans', 'Bilişim ve Yazılım'),
  ('Cevher Hazırlama Mühendisliği', 'cevher-hazirlama-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Ceza İnfaz ve Güvenlik Hizmetleri', 'ceza-infaz-ve-guvenlik-hizmetleri', 'onlisans', 'Hukuk ve Adalet'),
  ('Cnc Programlama ve Operatörlüğü', 'cnc-programlama-ve-operatorlugu', 'onlisans', 'Makine ve İmalat'),
  ('Coğrafi Bilgi Sistemleri', 'cografi-bilgi-sistemleri', 'onlisans', 'Bilişim ve Yazılım'),
  ('Coğrafya', 'cografya', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Coğrafya Öğretmenliği', 'cografya-ogretmenligi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Çağdaş Türk Lehçeleri ve Edebiyatları', 'cagdas-turk-lehceleri-ve-edebiyatlari', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Çağdaş Yunan Dili ve Edebiyatı', 'cagdas-yunan-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Çağrı Merkezi Hizmetleri', 'cagri-merkezi-hizmetleri', 'onlisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Çalışma Ekonomisi ve Endüstri İlişkileri', 'calisma-ekonomisi-ve-endustri-iliskileri', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Çay Tarımı ve İşleme Teknolojisi', 'cay-tarimi-ve-isleme-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Çerkez Dili ve Edebiyatı', 'cerkez-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Çerkez Dili ve Kültürü', 'cerkez-dili-ve-kulturu', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Çeviribilimi', 'ceviribilimi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Çevre Koruma ve Kontrol', 'cevre-koruma-ve-kontrol', 'onlisans', 'Çevre ve Sürdürülebilirlik'),
  ('Çevre Mühendisliği', 'cevre-muhendisligi', 'lisans', 'Çevre ve Sürdürülebilirlik'),
  ('Çevre Sağlığı', 'cevre-sagligi', 'onlisans', 'Çevre ve Sürdürülebilirlik'),
  ('Çevre Sağlığı ve Çevresel Risk Yönetimi Teknikerliği', 'cevre-sagligi-ve-cevresel-risk-yonetimi-teknikerligi', 'onlisans', 'Çevre ve Sürdürülebilirlik'),
  ('Çevresel Ölçüm ve İzleme Sistemleri Teknikerliği', 'cevresel-olcum-ve-izleme-sistemleri-teknikerligi', 'onlisans', 'Çevre ve Sürdürülebilirlik'),
  ('Çim Alan Tesisi ve Yönetimi', 'cim-alan-tesisi-ve-yonetimi', 'onlisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Çince Mütercim ve Tercümanlık', 'cince-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Çin Dili ve Edebiyatı', 'cin-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Çini Sanatı ve Tasarımı', 'cini-sanati-ve-tasarimi', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Çizgi Film ve Animasyon', 'cizgi-film-ve-animasyon', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Çocuk Gelişimi', 'cocuk-gelisimi', 'ikisi', 'Eğitim ve Çocuk Gelişimi'),
  ('Çocuk Koruma ve Bakım Hizmetleri', 'cocuk-koruma-ve-bakim-hizmetleri', 'onlisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Çok Boyutlu Modelleme ve Animasyon', 'cok-boyutlu-modelleme-ve-animasyon', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Deniz Brokerliği', 'deniz-brokerligi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Denizcilik İşletmeleri Yönetimi', 'denizcilik-isletmeleri-yonetimi', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Deniz Ulaştırma İşletme Mühendisliği', 'deniz-ulastirma-isletme-muhendisligi', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Deniz Ulaştırma ve İşletme', 'deniz-ulastirma-ve-isletme', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Deniz ve Liman İşletmeciliği', 'deniz-ve-liman-isletmeciligi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Deri Mühendisliği', 'deri-muhendisligi', 'lisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Deri Teknolojisi', 'deri-teknolojisi', 'onlisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Dezenfeksiyon, Sterilizasyon ve Antisepsi Teknikerliği', 'dezenfeksiyon-sterilizasyon-ve-antisepsi-teknikerligi', 'onlisans', 'Sağlık ve İlaç'),
  ('Dış Ticaret', 'dis-ticaret', 'onlisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Dijital Fabrika Teknolojileri', 'dijital-fabrika-teknolojileri', 'onlisans', 'Mekatronik ve Otomasyon'),
  ('Dijital Oyun Tasarımı', 'dijital-oyun-tasarimi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Dijital Sağlık Sistemleri Teknikerliği', 'dijital-saglik-sistemleri-teknikerligi', 'onlisans', 'Sağlık ve İlaç'),
  ('Dijital Tarım Teknolojileri', 'dijital-tarim-teknolojileri', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Dilbilimi', 'dilbilimi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Dil ve Konuşma Terapisi', 'dil-ve-konusma-terapisi', 'lisans', 'Sağlık ve İlaç'),
  ('Diş Hekimliği', 'dis-hekimligi', 'lisans', 'Sağlık ve İlaç'),
  ('Diş Protez Teknolojisi', 'dis-protez-teknolojisi', 'onlisans', 'Sağlık ve İlaç'),
  ('Diyaliz', 'diyaliz', 'onlisans', 'Sağlık ve İlaç'),
  ('Doğa Koruma ve Biyoçeşitlilik Yönetimi', 'doga-koruma-ve-biyocesitlilik-yonetimi', 'lisans', 'Çevre ve Sürdürülebilirlik'),
  ('Doğalgaz ve Tesisatı Teknolojisi', 'dogalgaz-ve-tesisati-teknolojisi', 'onlisans', 'Çevre ve Sürdürülebilirlik'),
  ('Doğal Yapı Taşları Teknolojisi', 'dogal-yapi-taslari-teknolojisi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Döküm', 'dokum', 'onlisans', 'Makine ve İmalat'),
  ('Ebelik', 'ebelik', 'lisans', 'Sağlık ve İlaç'),
  ('Eczacılık', 'eczacilik', 'lisans', 'Sağlık ve İlaç'),
  ('Eczane Hizmetleri', 'eczane-hizmetleri', 'onlisans', 'Sağlık ve İlaç'),
  ('Ekonometri', 'ekonometri', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Ekonomi', 'ekonomi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Ekonomi ve Finans', 'ekonomi-ve-finans', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Elektrik', 'elektrik', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektrik-Elektronik Mühendisliği', 'elektrik-elektronik-muhendisligi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektrik Enerjisi Üretim, İletim ve Dağıtımı', 'elektrik-enerjisi-uretim-iletim-ve-dagitimi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektrikli Cihaz Teknolojisi', 'elektrikli-cihaz-teknolojisi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektrik Makineleri Bakım ve Onarımı', 'elektrik-makineleri-bakim-ve-onarimi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektrik Mühendisliği', 'elektrik-muhendisligi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektronik Haberleşme Teknolojisi', 'elektronik-haberlesme-teknolojisi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektronik Mühendisliği', 'elektronik-muhendisligi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektronik Teknolojisi', 'elektronik-teknolojisi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektronik Ticaret ve Yönetimi', 'elektronik-ticaret-ve-yonetimi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektronik ve Haberleşme Mühendisliği', 'elektronik-ve-haberlesme-muhendisligi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Elektronörofizyoloji', 'elektronorofizyoloji', 'onlisans', 'Sağlık ve İlaç'),
  ('El Sanatları', 'el-sanatlari', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Emlak Yönetimi', 'emlak-yonetimi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Endüstri Mühendisliği', 'endustri-muhendisligi', 'lisans', 'Endüstri ve Operasyon Yönetimi'),
  ('Endüstri Ürünleri Tasarımı', 'endustri-urunleri-tasarimi', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Endüstriyel Cam ve Seramik', 'endustriyel-cam-ve-seramik', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Endüstriyel Hammaddeler İşleme Teknolojisi', 'endustriyel-hammaddeler-isleme-teknolojisi', 'onlisans', 'Endüstri ve Operasyon Yönetimi'),
  ('Endüstriyel Kalıpçılık', 'endustriyel-kalipcilik', 'onlisans', 'Endüstri ve Operasyon Yönetimi'),
  ('Endüstriyel Tasarım', 'endustriyel-tasarim', 'lisans', 'Endüstri ve Operasyon Yönetimi'),
  ('Endüstriyel Tasarım Mühendisliği', 'endustriyel-tasarim-muhendisligi', 'lisans', 'Endüstri ve Operasyon Yönetimi'),
  ('Enerji Bilimi ve Teknolojileri', 'enerji-bilimi-ve-teknolojileri', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Enerji Sistemleri Mühendisliği', 'enerji-sistemleri-muhendisligi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Enerji Tesisleri İşletmeciliği', 'enerji-tesisleri-isletmeciligi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Enerji Yönetimi', 'enerji-yonetimi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Engelli Bakımı ve Rehabilitasyon', 'engelli-bakimi-ve-rehabilitasyon', 'onlisans', 'Sağlık ve İlaç'),
  ('Engelliler İçin Gölge Öğreticilik', 'engelliler-icin-golge-ogreticilik', 'onlisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Ergoterapi', 'ergoterapi', 'lisans', 'Sağlık ve İlaç'),
  ('Ermeni Dili ve Kültürü', 'ermeni-dili-ve-kulturu', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Eser Koruma', 'eser-koruma', 'onlisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Eski Yunan Dili ve Edebiyatı', 'eski-yunan-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('E-Ticaret ve Pazarlama', 'e-ticaret-ve-pazarlama', 'onlisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Et ve Ürünleri Teknolojisi', 'et-ve-urunleri-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Evde Hasta Bakımı', 'evde-hasta-bakimi', 'onlisans', 'Sağlık ve İlaç'),
  ('Farsça Mütercim ve Tercümanlık', 'farsca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Fars Dili ve Edebiyatı', 'fars-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Felsefe', 'felsefe', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Felsefe Grubu Öğretmenliği', 'felsefe-grubu-ogretmenligi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Fen Bilgisi Öğretmenliği', 'fen-bilgisi-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Fındık Eksperliği', 'findik-eksperligi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Fiber Tekne İmalatı ve Kompozit Kalıp Teknolojileri', 'fiber-tekne-imalati-ve-kompozit-kalip-teknolojileri', 'onlisans', 'Makine ve İmalat'),
  ('Fidan Yetiştiriciliği', 'fidan-yetistiriciligi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Film Tasarımı ve Yönetimi', 'film-tasarimi-ve-yonetimi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Finans ve Bankacılık', 'finans-ve-bankacilik', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Fizik', 'fizik', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Fizik Mühendisliği', 'fizik-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Fizik Öğretmenliği', 'fizik-ogretmenligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Fizyoterapi', 'fizyoterapi', 'onlisans', 'Sağlık ve İlaç'),
  ('Fizyoterapi ve Rehabilitasyon', 'fizyoterapi-ve-rehabilitasyon', 'lisans', 'Sağlık ve İlaç'),
  ('Fotoğraf', 'fotograf', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Fotoğrafçılık ve Kameramanlık', 'fotografcilik-ve-kameramanlik', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Fotoğraf ve Video', 'fotograf-ve-video', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Fotonik', 'fotonik', 'lisans', 'Bilişim ve Yazılım'),
  ('Fransızca Mütercim ve Tercümanlık', 'fransizca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Fransızca Öğretmenliği', 'fransizca-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Fransız Dili ve Edebiyatı', 'fransiz-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Gastronomi ve Mutfak Sanatları', 'gastronomi-ve-mutfak-sanatlari', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Gayrimenkul Geliştirme ve Yönetimi', 'gayrimenkul-gelistirme-ve-yonetimi', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Gazetecilik', 'gazetecilik', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Geleneksel El Sanatları', 'geleneksel-el-sanatlari', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Geleneksel Tekstillerin Korunması ve Restorasyonu', 'geleneksel-tekstillerin-korunmasi-ve-restorasyonu', 'onlisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Gemi İnşaatı', 'gemi-insaati', 'onlisans', 'Makine ve İmalat'),
  ('Gemi İnşaatı ve Gemi Makineleri Mühendisliği', 'gemi-insaati-ve-gemi-makineleri-muhendisligi', 'lisans', 'Makine ve İmalat'),
  ('Gemi Makineleri İşletmeciliği', 'gemi-makineleri-isletmeciligi', 'onlisans', 'Makine ve İmalat'),
  ('Gemi Makineleri İşletme Mühendisliği', 'gemi-makineleri-isletme-muhendisligi', 'lisans', 'Makine ve İmalat'),
  ('Gemi ve Yat Tasarımı', 'gemi-ve-yat-tasarimi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Genetik ve Biyomühendislik', 'genetik-ve-biyomuhendislik', 'lisans', 'Sağlık ve İlaç'),
  ('Geoteknik', 'geoteknik', 'onlisans', 'Makine ve İmalat'),
  ('Gerontoloji', 'gerontoloji', 'lisans', 'Sağlık ve İlaç'),
  ('Gıda Kalite Kontrolü ve Analizi', 'gida-kalite-kontrolu-ve-analizi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Gıda Mühendisliği', 'gida-muhendisligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Gıda Teknolojisi', 'gida-teknolojisi', 'ikisi', 'Gıda, Tarım ve Hayvancılık'),
  ('Giyim Üretim Teknolojisi', 'giyim-uretim-teknolojisi', 'onlisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Görsel İletişim', 'gorsel-iletisim', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Görsel İletişim Tasarımı', 'gorsel-iletisim-tasarimi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Görsel Sanatlar', 'gorsel-sanatlar', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Grafik', 'grafik', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Grafik Sanatlar', 'grafik-sanatlar', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Grafik Tasarımı', 'grafik-tasarimi', 'ikisi', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Gümrük İşletme', 'gumruk-isletme', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Gürcü Dili ve Edebiyatı', 'gurcu-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Halıcılık ve Kilimcilik', 'halicilik-ve-kilimcilik', 'onlisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Halkbilimi', 'halkbilimi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Halkla İlişkiler ve Reklamcılık', 'halkla-iliskiler-ve-reklamcilik', 'lisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Halkla İlişkiler ve Tanıtım', 'halkla-iliskiler-ve-tanitim', 'ikisi', 'Ekonomi, İşletme ve Yönetim'),
  ('Harita Mühendisliği', 'harita-muhendisligi', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Harita ve Kadastro', 'harita-ve-kadastro', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Hassas Tarım ve Tarımsal Robotlar', 'hassas-tarim-ve-tarimsal-robotlar', 'lisans', 'Mekatronik ve Otomasyon'),
  ('Hasta Bakımı', 'hasta-bakimi', 'onlisans', 'Sağlık ve İlaç'),
  ('Hava Aracı İmalat Teknolojileri', 'hava-araci-imalat-teknolojileri', 'onlisans', 'Makine ve İmalat'),
  ('Havacılık Elektrik ve Elektroniği', 'havacilik-elektrik-ve-elektronigi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Havacılık Elektroniği Teknolojileri', 'havacilik-elektronigi-teknolojileri', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Havacılık ve Uzay Mühendisliği', 'havacilik-ve-uzay-muhendisligi', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Havacılık Yönetimi', 'havacilik-yonetimi', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Hayvansal Üretim ve Teknolojileri', 'hayvansal-uretim-ve-teknolojileri', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Hemşirelik', 'hemsirelik', 'lisans', 'Sağlık ve İlaç'),
  ('Hibrid ve Elektrikli Taşıtlar Teknolojisi', 'hibrid-ve-elektrikli-tasitlar-teknolojisi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Hidrojen ve Enerji Depolama Teknikerliği', 'hidrojen-ve-enerji-depolama-teknikerligi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Hidrojeoloji Mühendisliği', 'hidrojeoloji-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Hidrolik ve Pnömatik Teknikerliği', 'hidrolik-ve-pnomatik-teknikerligi', 'onlisans', 'Mekatronik ve Otomasyon'),
  ('Hindoloji', 'hindoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Hititoloji', 'hititoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Hukuk', 'hukuk', 'lisans', 'Hukuk ve Adalet'),
  ('Hungaroloji', 'hungaroloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('İbrani Dili ve Kültürü', 'ibrani-dili-ve-kulturu', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('İç Mekan Tasarımı', 'ic-mekan-tasarimi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('İç Mimarlık', 'ic-mimarlik', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('İç Mimarlık ve Çevre Tasarımı', 'ic-mimarlik-ve-cevre-tasarimi', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('İklim Bilimi ve Meteoroloji Mühendisliği', 'iklim-bilimi-ve-meteoroloji-muhendisligi', 'lisans', 'Çevre ve Sürdürülebilirlik'),
  ('İklimlendirme ve Soğutma Teknolojisi', 'iklimlendirme-ve-sogutma-teknolojisi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('İkram Hizmetleri', 'ikram-hizmetleri', 'onlisans', 'Turizm ve Konaklama'),
  ('İktisat', 'iktisat', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('İlahiyat', 'ilahiyat', 'ikisi', 'Psikoloji ve Sosyal Bilimler'),
  ('İletişim', 'iletisim', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('İletişim Bilimleri', 'iletisim-bilimleri', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('İletişim Tasarımı ve Yönetimi', 'iletisim-tasarimi-ve-yonetimi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('İletişim ve Tasarımı', 'iletisim-ve-tasarimi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('İlköğretim Matematik Öğretmenliği', 'ilkogretim-matematik-ogretmenligi', 'lisans', 'Bilişim ve Yazılım'),
  ('İlk ve Acil Yardım', 'ilk-ve-acil-yardim', 'onlisans', 'Sağlık ve İlaç'),
  ('İmalat Mühendisliği', 'imalat-muhendisligi', 'lisans', 'Makine ve İmalat'),
  ('İmalat Yürütme Sistemleri Operatörlüğü', 'imalat-yurutme-sistemleri-operatorlugu', 'onlisans', 'Mekatronik ve Otomasyon'),
  ('İngilizce, Fransızca Mütercim ve Tercümanlık', 'ingilizce-fransizca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('İngilizce Mütercim ve Tercümanlık', 'ingilizce-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('İngilizce Öğretmenliği', 'ingilizce-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('İngiliz Dilbilimi', 'ingiliz-dilbilimi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('İngiliz Dili ve Edebiyatı', 'ingiliz-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('İnsan Kaynakları Yönetimi', 'insan-kaynaklari-yonetimi', 'ikisi', 'Ekonomi, İşletme ve Yönetim'),
  ('İnsansız Araç Teknikerliği', 'insansiz-arac-teknikerligi', 'onlisans', 'Bilişim ve Yazılım'),
  ('İnsansız Hava Aracı Teknolojisi ve Operatörlüğü', 'insansiz-hava-araci-teknolojisi-ve-operatorlugu', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('İnşaat Mühendisliği', 'insaat-muhendisligi', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('İnşaat Teknolojisi', 'insaat-teknolojisi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('İnternet ve Ağ Teknolojileri', 'internet-ve-ag-teknolojileri', 'onlisans', 'Bilişim ve Yazılım'),
  ('İslami İlimler', 'islami-ilimler', 'ikisi', 'Psikoloji ve Sosyal Bilimler'),
  ('İslam İktisadı ve Finans', 'islam-iktisadi-ve-finans', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('İspanyolca Mütercim ve Tercümanlık', 'ispanyolca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('İspanyol Dili ve Edebiyatı', 'ispanyol-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('İstatistik', 'istatistik', 'lisans', 'Bilişim ve Yazılım'),
  ('İstatistik ve Bilgisayar Bilimleri', 'istatistik-ve-bilgisayar-bilimleri', 'lisans', 'Bilişim ve Yazılım'),
  ('İşletme', 'isletme', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('İşletme Mühendisliği', 'isletme-muhendisligi', 'lisans', 'Endüstri ve Operasyon Yönetimi'),
  ('İşletme ve Yapay Zeka', 'isletme-ve-yapay-zeka', 'lisans', 'Bilişim ve Yazılım'),
  ('İşletme Yönetimi', 'isletme-yonetimi', 'onlisans', 'Ekonomi, İşletme ve Yönetim'),
  ('İş Makineleri Operatörlüğü', 'is-makineleri-operatorlugu', 'onlisans', 'Makine ve İmalat'),
  ('İş Sağlığı ve Güvenliği', 'is-sagligi-ve-guvenligi', 'lisans', 'İş Sağlığı, Güvenliği ve Kalite'),
  ('İş ve Uğraşı Terapisi', 'is-ve-ugrasi-terapisi', 'onlisans', 'Sağlık ve İlaç'),
  ('İtalyan Dili ve Edebiyatı', 'italyan-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Japonca Mütercim ve Tercümanlık', 'japonca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Japonca Öğretmenliği', 'japonca-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Japon Dili ve Edebiyatı', 'japon-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Jeofizik Mühendisliği', 'jeofizik-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Jeoloji Mühendisliği', 'jeoloji-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Kamu Yönetimi', 'kamu-yonetimi', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Kanatlı Hayvan Yetiştiriciliği', 'kanatli-hayvan-yetistiriciligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Karayolu Yük Taşıtı Sürücülüğü', 'karayolu-yuk-tasiti-suruculugu', 'onlisans', 'Otomotiv ve Mobilite'),
  ('Karbon Yönetimi Teknikerliği', 'karbon-yonetimi-teknikerligi', 'onlisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Karşılaştırmalı Edebiyat', 'karsilastirmali-edebiyat', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Kaynak Teknolojisi', 'kaynak-teknolojisi', 'onlisans', 'Makine ve İmalat'),
  ('Kenevir Dokumacılığı', 'kenevir-dokumaciligi', 'onlisans', 'Makine ve İmalat'),
  ('Kentsel Tasarım ve Peyzaj Mimarlığı', 'kentsel-tasarim-ve-peyzaj-mimarligi', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Kimya', 'kimya', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Kimya-Biyoloji Mühendisliği', 'kimya-biyoloji-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Kimya Mühendisliği', 'kimya-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Kimya Öğretmenliği', 'kimya-ogretmenligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Kimya Teknolojisi', 'kimya-teknolojisi', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Klasik Arkeoloji', 'klasik-arkeoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Kontrol ve Otomasyon Mühendisliği', 'kontrol-ve-otomasyon-muhendisligi', 'lisans', 'Mekatronik ve Otomasyon'),
  ('Kontrol ve Otomasyon Teknolojisi', 'kontrol-ve-otomasyon-teknolojisi', 'onlisans', 'Mekatronik ve Otomasyon'),
  ('Kooperatifçilik', 'kooperatifcilik', 'onlisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Kore Dili ve Edebiyatı', 'kore-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Kozmetik Teknolojisi', 'kozmetik-teknolojisi', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Kurgu, Ses ve Görüntü Yönetimi', 'kurgu-ses-ve-goruntu-yonetimi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Kurumsal Bilişim Uzmanlığı', 'kurumsal-bilisim-uzmanligi', 'onlisans', 'Bilişim ve Yazılım'),
  ('Kuyumculuk ve Mücevher Tasarımı', 'kuyumculuk-ve-mucevher-tasarimi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Kuyumculuk ve Takı Tasarımı', 'kuyumculuk-ve-taki-tasarimi', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Kültürel Miras ve Turizm', 'kulturel-miras-ve-turizm', 'onlisans', 'Turizm ve Konaklama'),
  ('Kültür Varlıklarını Koruma ve Onarım', 'kultur-varliklarini-koruma-ve-onarim', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Kültür ve İletişim Bilimleri', 'kultur-ve-iletisim-bilimleri', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Kümes Hayvanları Yetiştiriciliği', 'kumes-hayvanlari-yetistiriciligi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Küresel Siyaset ve Uluslararası İlişkiler', 'kuresel-siyaset-ve-uluslararasi-iliskiler', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Kürt Dili ve Edebiyatı', 'kurt-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Laborant ve Veteriner Sağlık', 'laborant-ve-veteriner-saglik', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Laboratuvar Teknolojisi', 'laboratuvar-teknolojisi', 'onlisans', 'Sağlık ve İlaç'),
  ('Latin Dili ve Edebiyatı', 'latin-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Leh Dili ve Edebiyatı', 'leh-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Lojistik', 'lojistik', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Lojistik Yönetimi', 'lojistik-yonetimi', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Madencilik Teknolojisi', 'madencilik-teknolojisi', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Maden Mühendisliği', 'maden-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Mahkeme Büro Hizmetleri', 'mahkeme-buro-hizmetleri', 'onlisans', 'Hukuk ve Adalet'),
  ('Makine', 'makine', 'onlisans', 'Makine ve İmalat'),
  ('Makine Mühendisliği', 'makine-muhendisligi', 'lisans', 'Makine ve İmalat'),
  ('Makine Resim ve Konstrüksiyonu', 'makine-resim-ve-konstruksiyonu', 'onlisans', 'Makine ve İmalat'),
  ('Maliye', 'maliye', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Malzeme Bilimi ve Mühendisliği', 'malzeme-bilimi-ve-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Malzeme Bilimi ve Nanoteknoloji Mühendisliği', 'malzeme-bilimi-ve-nanoteknoloji-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Malzeme Bilimi ve Teknolojileri', 'malzeme-bilimi-ve-teknolojileri', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Mantarcılık', 'mantarcilik', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Marina ve Yat İşletmeciliği', 'marina-ve-yat-isletmeciligi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Marka İletişimi', 'marka-iletisimi', 'onlisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Matematik', 'matematik', 'lisans', 'Bilişim ve Yazılım'),
  ('Matematik Mühendisliği', 'matematik-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Matematik Öğretmenliği', 'matematik-ogretmenligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Matematik ve Bilgisayar Bilimleri', 'matematik-ve-bilgisayar-bilimleri', 'lisans', 'Bilişim ve Yazılım'),
  ('Medya ve Görsel Sanatlar', 'medya-ve-gorsel-sanatlar', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Medya ve İletişim', 'medya-ve-iletisim', 'ikisi', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Mekatronik', 'mekatronik', 'onlisans', 'Mekatronik ve Otomasyon'),
  ('Mekatronik Mühendisliği', 'mekatronik-muhendisligi', 'lisans', 'Mekatronik ve Otomasyon'),
  ('Mermer Teknolojisi', 'mermer-teknolojisi', 'onlisans', 'Makine ve İmalat'),
  ('Metalurji', 'metalurji', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Metalurji ve Malzeme Mühendisliği', 'metalurji-ve-malzeme-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Meyve ve Sebze İşleme Teknolojisi', 'meyve-ve-sebze-isleme-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Mimari Dekoratif Sanatlar', 'mimari-dekoratif-sanatlar', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Mimari Restorasyon', 'mimari-restorasyon', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Mimarlık', 'mimarlik', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Mobil Teknolojileri', 'mobil-teknolojileri', 'onlisans', 'Bilişim ve Yazılım'),
  ('Mobilya ve Dekorasyon', 'mobilya-ve-dekorasyon', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Moda Tasarımı', 'moda-tasarimi', 'ikisi', 'Tekstil, Moda ve Hazır Giyim'),
  ('Moda Yönetimi', 'moda-yonetimi', 'onlisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Moleküler Biyoloji ve Genetik', 'molekuler-biyoloji-ve-genetik', 'lisans', 'Sağlık ve İlaç'),
  ('Moleküler Biyoteknoloji', 'molekuler-biyoteknoloji', 'lisans', 'Sağlık ve İlaç'),
  ('Muhasebe ve Finans Yönetimi', 'muhasebe-ve-finans-yonetimi', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Muhasebe ve Vergi Uygulamaları', 'muhasebe-ve-vergi-uygulamalari', 'onlisans', 'Finans, Bankacılık ve Sigorta'),
  ('Mühendislik ve Doğa Bilimleri Programları', 'muhendislik-ve-doga-bilimleri-programlari', 'lisans', 'Çevre ve Sürdürülebilirlik'),
  ('Müzecilik', 'muzecilik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Nanobilim ve Nanoteknoloji', 'nanobilim-ve-nanoteknoloji', 'lisans', 'Bilişim ve Yazılım'),
  ('Nanoteknoloji Mühendisliği', 'nanoteknoloji-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Nükleer Enerji Mühendisliği', 'nukleer-enerji-muhendisligi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Nükleer Teknoloji ve Radyasyon Güvenliği', 'nukleer-teknoloji-ve-radyasyon-guvenligi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Nükleer Tıp Teknikleri', 'nukleer-tip-teknikleri', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Odyoloji', 'odyoloji', 'lisans', 'Sağlık ve İlaç'),
  ('Odyometri', 'odyometri', 'onlisans', 'Sağlık ve İlaç'),
  ('Ofis Teknolojileri ve Veri Yönetimi', 'ofis-teknolojileri-ve-veri-yonetimi', 'onlisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Okul Öncesi Öğretmenliği', 'okul-oncesi-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Optik ve Akustik Mühendisliği', 'optik-ve-akustik-muhendisligi', 'lisans', 'Makine ve İmalat'),
  ('Optisyenlik', 'optisyenlik', 'onlisans', 'Sağlık ve İlaç'),
  ('Optoelektronik ve Elektro Optik Teknolojileri', 'optoelektronik-ve-elektro-optik-teknolojileri', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Organik Tarım', 'organik-tarim', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Organik Tarım İşletmeciliği', 'organik-tarim-isletmeciligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Ormancılık ve Orman Ürünleri', 'ormancilik-ve-orman-urunleri', 'onlisans', 'Çevre ve Sürdürülebilirlik'),
  ('Orman Endüstrisi Mühendisliği', 'orman-endustrisi-muhendisligi', 'lisans', 'Çevre ve Sürdürülebilirlik'),
  ('Orman Mühendisliği', 'orman-muhendisligi', 'lisans', 'Çevre ve Sürdürülebilirlik'),
  ('Ortez ve Protez', 'ortez-ve-protez', 'lisans', 'Sağlık ve İlaç'),
  ('Ortopedik Protez ve Ortez', 'ortopedik-protez-ve-ortez', 'onlisans', 'Sağlık ve İlaç'),
  ('Otel Yöneticiliği', 'otel-yoneticiligi', 'lisans', 'Turizm ve Konaklama'),
  ('Otobüs Kaptanlığı', 'otobus-kaptanligi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Otomotiv Gövde ve Yüzey İşlem Teknolojileri', 'otomotiv-govde-ve-yuzey-islem-teknolojileri', 'onlisans', 'Otomotiv ve Mobilite'),
  ('Otomotiv Mühendisliği', 'otomotiv-muhendisligi', 'lisans', 'Otomotiv ve Mobilite'),
  ('Otomotiv Teknolojisi', 'otomotiv-teknolojisi', 'onlisans', 'Otomotiv ve Mobilite'),
  ('Otonom Sistemler Teknikerliği', 'otonom-sistemler-teknikerligi', 'onlisans', 'Bilişim ve Yazılım'),
  ('Otopsi Yardımcılığı', 'otopsi-yardimciligi', 'onlisans', 'Sağlık ve İlaç'),
  ('Oyun Geliştirme ve Programlama', 'oyun-gelistirme-ve-programlama', 'onlisans', 'Bilişim ve Yazılım'),
  ('Ön-Yüz Yazılım Geliştirme', 'on-yuz-yazilim-gelistirme', 'onlisans', 'Bilişim ve Yazılım'),
  ('Özel Eğitim Öğretmenliği', 'ozel-egitim-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Özel Güvenlik ve Koruma', 'ozel-guvenlik-ve-koruma', 'onlisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Paramedik', 'paramedik', 'lisans', 'Sağlık ve İlaç'),
  ('Pastacılık ve Ekmekçilik', 'pastacilik-ve-ekmekcilik', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Patoloji Laboratuvar Teknikleri', 'patoloji-laboratuvar-teknikleri', 'onlisans', 'Sağlık ve İlaç'),
  ('Pazarlama', 'pazarlama', 'ikisi', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Perakende Satış ve Mağaza Yönetimi', 'perakende-satis-ve-magaza-yonetimi', 'onlisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Perfüzyon', 'perfuzyon', 'lisans', 'Sağlık ve İlaç'),
  ('Petrol ve Doğalgaz Mühendisliği', 'petrol-ve-dogalgaz-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Peyzaj Mimarlığı', 'peyzaj-mimarligi', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Peyzaj ve Süs Bitkileri Yetiştiriciliği', 'peyzaj-ve-sus-bitkileri-yetistiriciligi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Pilotaj', 'pilotaj', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Podoloji', 'podoloji', 'onlisans', 'Sağlık ve İlaç'),
  ('Polimer Malzeme Mühendisliği', 'polimer-malzeme-muhendisligi', 'lisans', 'Kimya, Malzeme ve Maden'),
  ('Polimer Teknolojisi', 'polimer-teknolojisi', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Politika ve Ekonomi', 'politika-ve-ekonomi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Posta Hizmetleri', 'posta-hizmetleri', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Protohistorya ve Ön Asya Arkeolojisi', 'protohistorya-ve-on-asya-arkeolojisi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Psikoloji', 'psikoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Radyo, Televizyon ve Sinema', 'radyo-televizyon-ve-sinema', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Radyoterapi', 'radyoterapi', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Radyo ve Televizyon Teknolojisi', 'radyo-ve-televizyon-teknolojisi', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Rafineri ve Petro-Kimya Teknolojisi', 'rafineri-ve-petro-kimya-teknolojisi', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Raylı Sistemler Elektrik ve Elektronik', 'rayli-sistemler-elektrik-ve-elektronik', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Raylı Sistemler İşletmeciliği', 'rayli-sistemler-isletmeciligi', 'onlisans', 'Otomotiv ve Mobilite'),
  ('Raylı Sistemler Makine Teknolojisi', 'rayli-sistemler-makine-teknolojisi', 'onlisans', 'Otomotiv ve Mobilite'),
  ('Raylı Sistemler Makinistliği', 'rayli-sistemler-makinistligi', 'onlisans', 'Otomotiv ve Mobilite'),
  ('Raylı Sistemler Mühendisliği', 'rayli-sistemler-muhendisligi', 'lisans', 'Otomotiv ve Mobilite'),
  ('Raylı Sistemler Yol Teknolojisi', 'rayli-sistemler-yol-teknolojisi', 'onlisans', 'Otomotiv ve Mobilite'),
  ('Rehberlik ve Psikolojik Danışmanlık', 'rehberlik-ve-psikolojik-danismanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Reklamcılık', 'reklamcilik', 'ikisi', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Reklam Tasarımı ve İletişimi', 'reklam-tasarimi-ve-iletisimi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Rekreasyon', 'rekreasyon', 'lisans', 'Spor ve Rekreasyon'),
  ('Rekreasyon Yönetimi', 'rekreasyon-yonetimi', 'lisans', 'Spor ve Rekreasyon'),
  ('Robotik ve Yapay Zeka', 'robotik-ve-yapay-zeka', 'onlisans', 'Bilişim ve Yazılım'),
  ('Rusça Mütercim ve Tercümanlık', 'rusca-mutercim-ve-tercumanlik', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Rus Dili ve Edebiyatı', 'rus-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Saç Bakımı ve Güzellik Hizmetleri', 'sac-bakimi-ve-guzellik-hizmetleri', 'onlisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Saç ve Güzellik Uygulamaları', 'sac-ve-guzellik-uygulamalari', 'lisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Sağlık Bilgi Sistemleri Teknikerliği', 'saglik-bilgi-sistemleri-teknikerligi', 'onlisans', 'Bilişim ve Yazılım'),
  ('Sağlık Kurumları İşletmeciliği', 'saglik-kurumlari-isletmeciligi', 'onlisans', 'Sağlık ve İlaç'),
  ('Sağlık Turizmi İşletmeciliği', 'saglik-turizmi-isletmeciligi', 'onlisans', 'Sağlık ve İlaç'),
  ('Sağlık Yönetimi', 'saglik-yonetimi', 'lisans', 'Sağlık ve İlaç'),
  ('Sahne Işık ve Ses Teknolojileri', 'sahne-isik-ve-ses-teknolojileri', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Sahne ve Dekor Tasarımı', 'sahne-ve-dekor-tasarimi', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Sanal ve Artırılmış Gerçeklik', 'sanal-ve-artirilmis-gerceklik', 'onlisans', 'Bilişim ve Yazılım'),
  ('Sanat Tarihi', 'sanat-tarihi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Sanat ve Kültür Yönetimi', 'sanat-ve-kultur-yonetimi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Sanat ve Sosyal Bilimler Programları', 'sanat-ve-sosyal-bilimler-programlari', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Seracılık', 'seracilik', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Seramik ve Cam Tasarımı', 'seramik-ve-cam-tasarimi', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Sermaye Piyasası', 'sermaye-piyasasi', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Seyahat İşletmeciliği', 'seyahat-isletmeciligi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Seyahat İşletmeciliği ve Turizm Rehberliği', 'seyahat-isletmeciligi-ve-turizm-rehberligi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Sınıf Öğretmenliği', 'sinif-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Sırp Dili ve Edebiyatı', 'sirp-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Siber Güvenlik', 'siber-guvenlik', 'onlisans', 'Bilişim ve Yazılım'),
  ('Siber Güvenlik Analistliği ve Operatörlüğü', 'siber-guvenlik-analistligi-ve-operatorlugu', 'onlisans', 'Bilişim ve Yazılım'),
  ('Siber Güvenlik Mühendisliği', 'siber-guvenlik-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Sigortacılık', 'sigortacilik', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Sigortacılık ve Aktüerya Bilimleri', 'sigortacilik-ve-aktuerya-bilimleri', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Sigortacılık ve Risk Yönetimi', 'sigortacilik-ve-risk-yonetimi', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Sigortacılık ve Sosyal Güvenlik', 'sigortacilik-ve-sosyal-guvenlik', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Silah Sanayi Teknikerliği', 'silah-sanayi-teknikerligi', 'onlisans', 'Makine ve İmalat'),
  ('Sinema ve Dijital Medya', 'sinema-ve-dijital-medya', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Sinema ve Televizyon', 'sinema-ve-televizyon', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Sinoloji', 'sinoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Sivil Havacılık Kabin Hizmetleri', 'sivil-havacilik-kabin-hizmetleri', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Sivil Hava Ulaştırma İşletmeciliği', 'sivil-hava-ulastirma-isletmeciligi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Sivil Savunma ve İtfaiyecilik', 'sivil-savunma-ve-itfaiyecilik', 'onlisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Siyaset Bilimi', 'siyaset-bilimi', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Siyaset Bilimi ve Kamu Yönetimi', 'siyaset-bilimi-ve-kamu-yonetimi', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Siyaset Bilimi ve Uluslararası İlişkiler', 'siyaset-bilimi-ve-uluslararasi-iliskiler', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Sondaj Teknolojisi', 'sondaj-teknolojisi', 'onlisans', 'Makine ve İmalat'),
  ('Sosyal Bilgiler Öğretmenliği', 'sosyal-bilgiler-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Sosyal Güvenlik', 'sosyal-guvenlik', 'onlisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Sosyal Hizmet', 'sosyal-hizmet', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Sosyal Hizmetler', 'sosyal-hizmetler', 'onlisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Sosyal Medya Yöneticiliği', 'sosyal-medya-yoneticiligi', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Sosyoloji', 'sosyoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Su Altı Kaynak Teknolojisi', 'su-alti-kaynak-teknolojisi', 'onlisans', 'Makine ve İmalat'),
  ('Su Altı Teknolojisi', 'su-alti-teknolojisi', 'onlisans', 'Makine ve İmalat'),
  ('Su Bilimleri ve Mühendisliği', 'su-bilimleri-ve-muhendisligi', 'lisans', 'Çevre ve Sürdürülebilirlik'),
  ('Sulama Teknolojisi', 'sulama-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Su Ürünleri Endüstrisi Mühendisliği', 'su-urunleri-endustrisi-muhendisligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Su Ürünleri İşleme Teknolojisi', 'su-urunleri-isleme-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Su Ürünleri Mühendisliği', 'su-urunleri-muhendisligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Su ve Atık Yönetimi Teknikerliği', 'su-ve-atik-yonetimi-teknikerligi', 'onlisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Sümeroloji', 'sumeroloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Süryani Dili ve Edebiyatı', 'suryani-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Süt Teknolojisi', 'sut-teknolojisi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Süt ve Besi Hayvancılığı', 'sut-ve-besi-hayvanciligi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Süt ve Ürünleri Teknolojisi', 'sut-ve-urunleri-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Şarap Üretim Teknolojisi', 'sarap-uretim-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Şehir ve Bölge Planlama', 'sehir-ve-bolge-planlama', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Tahribatsız Muayene', 'tahribatsiz-muayene', 'onlisans', 'Makine ve İmalat'),
  ('Takı Tasarımı ve İmalatı', 'taki-tasarimi-ve-imalati', 'lisans', 'Makine ve İmalat'),
  ('Talaşlı Üretim Teknikerliği', 'talasli-uretim-teknikerligi', 'onlisans', 'Makine ve İmalat'),
  ('Tapu Kadastro', 'tapu-kadastro', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Tapu ve Kadastro', 'tapu-ve-kadastro', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Tarım Ekonomisi', 'tarim-ekonomisi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Tarım Makineleri', 'tarim-makineleri', 'onlisans', 'Makine ve İmalat'),
  ('Tarım Makineleri ve Teknolojileri', 'tarim-makineleri-ve-teknolojileri', 'onlisans', 'Makine ve İmalat'),
  ('Tarım Makineleri ve Teknolojileri Mühendisliği', 'tarim-makineleri-ve-teknolojileri-muhendisligi', 'lisans', 'Makine ve İmalat'),
  ('Tarımsal Biyoteknoloji', 'tarimsal-biyoteknoloji', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Tarımsal Genetik Mühendisliği', 'tarimsal-genetik-muhendisligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Tarımsal İşletmecilik', 'tarimsal-isletmecilik', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Tarımsal Yapılar ve Sulama', 'tarimsal-yapilar-ve-sulama', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Tarım Teknolojisi', 'tarim-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Tarım Ticareti ve İşletmeciliği', 'tarim-ticareti-ve-isletmeciligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Tarih', 'tarih', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Tarih Öğretmenliği', 'tarih-ogretmenligi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Tarih Öncesi Arkeolojisi', 'tarih-oncesi-arkeolojisi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Tarla Bitkileri', 'tarla-bitkileri', 'ikisi', 'Gıda, Tarım ve Hayvancılık'),
  ('Teknoloji ve Bilgi Yönetimi', 'teknoloji-ve-bilgi-yonetimi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Tekstil Mühendisliği', 'tekstil-muhendisligi', 'lisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Tekstil Tasarımı', 'tekstil-tasarimi', 'lisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Tekstil Teknolojisi', 'tekstil-teknolojisi', 'onlisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Tekstil ve Halı Makineleri', 'tekstil-ve-hali-makineleri', 'onlisans', 'Makine ve İmalat'),
  ('Tekstil ve Moda Tasarımı', 'tekstil-ve-moda-tasarimi', 'lisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Tele-Sağlık Teknikerliği', 'tele-saglik-teknikerligi', 'onlisans', 'Sağlık ve İlaç'),
  ('Televizyon Haberciliği ve Programcılığı', 'televizyon-haberciligi-ve-programciligi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Tıbbi Dokümantasyon ve Sekreterlik', 'tibbi-dokumantasyon-ve-sekreterlik', 'onlisans', 'Makine ve İmalat'),
  ('Tıbbi Görüntüleme Teknikleri', 'tibbi-goruntuleme-teknikleri', 'onlisans', 'Sağlık ve İlaç'),
  ('Tıbbi Laboratuvar Teknikleri', 'tibbi-laboratuvar-teknikleri', 'onlisans', 'Sağlık ve İlaç'),
  ('Tıbbi Tanıtım ve Pazarlama', 'tibbi-tanitim-ve-pazarlama', 'onlisans', 'Sağlık ve İlaç'),
  ('Tıbbi ve Aromatik Bitkiler', 'tibbi-ve-aromatik-bitkiler', 'onlisans', 'Sağlık ve İlaç'),
  ('Tıbbi Veri İşleme Teknikerliği', 'tibbi-veri-isleme-teknikerligi', 'onlisans', 'Sağlık ve İlaç'),
  ('Tıp', 'tip', 'lisans', 'Sağlık ve İlaç'),
  ('Tiyatro Eleştirmenliği ve Dramaturji', 'tiyatro-elestirmenligi-ve-dramaturji', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Tohum Bilimi ve Teknolojisi', 'tohum-bilimi-ve-teknolojisi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Tohumculuk Teknolojisi', 'tohumculuk-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Toprak Bilimi ve Bitki Besleme', 'toprak-bilimi-ve-bitki-besleme', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Turist Rehberliği', 'turist-rehberligi', 'onlisans', 'Turizm ve Konaklama'),
  ('Turizm Animasyonu', 'turizm-animasyonu', 'onlisans', 'Turizm ve Konaklama'),
  ('Turizm İşletmeciliği', 'turizm-isletmeciligi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Turizm Rehberliği', 'turizm-rehberligi', 'lisans', 'Turizm ve Konaklama'),
  ('Turizm ve Gastronomi Yönetimi Programları', 'turizm-ve-gastronomi-yonetimi-programlari', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Turizm ve Otel İşletmeciliği', 'turizm-ve-otel-isletmeciligi', 'ikisi', 'Ekonomi, İşletme ve Yönetim'),
  ('Turizm ve Seyahat Hizmetleri', 'turizm-ve-seyahat-hizmetleri', 'onlisans', 'Turizm ve Konaklama'),
  ('Türkçe Öğretmenliği', 'turkce-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Türk Dili ve Edebiyatı', 'turk-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Türk Dili ve Edebiyatı Öğretmenliği', 'turk-dili-ve-edebiyati-ogretmenligi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Türk Halkbilimi', 'turk-halkbilimi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Türk İslam Arkeolojisi', 'turk-islam-arkeolojisi', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Tütün Eksperliği', 'tutun-eksperligi', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Uçak Bakım ve Onarım', 'ucak-bakim-ve-onarim', 'lisans', 'Makine ve İmalat'),
  ('Uçak Elektrik ve Elektroniği', 'ucak-elektrik-ve-elektronigi', 'lisans', 'Elektrik, Elektronik ve Enerji'),
  ('Uçak Gövde ve Motor Bakımı', 'ucak-govde-ve-motor-bakimi', 'lisans', 'Makine ve İmalat'),
  ('Uçak Mühendisliği', 'ucak-muhendisligi', 'lisans', 'Makine ve İmalat'),
  ('Uçak Teknolojisi', 'ucak-teknolojisi', 'onlisans', 'Makine ve İmalat'),
  ('Uçuş Harekat Yöneticiliği', 'ucus-harekat-yoneticiligi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Ukrayna Dili ve Edebiyatı', 'ukrayna-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Ulaştırma ve Trafik Hizmetleri', 'ulastirma-ve-trafik-hizmetleri', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Uluslararası Finans', 'uluslararasi-finans', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Uluslararası Finans ve Bankacılık', 'uluslararasi-finans-ve-bankacilik', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Uluslararası Girişimcilik', 'uluslararasi-girisimcilik', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Uluslararası İlişkiler', 'uluslararasi-iliskiler', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Uluslararası İşletme Yönetimi', 'uluslararasi-isletme-yonetimi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Uluslararası Ticaret', 'uluslararasi-ticaret', 'lisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Uluslararası Ticaret ve Finansman', 'uluslararasi-ticaret-ve-finansman', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Uluslararası Ticaret ve İşletmecilik', 'uluslararasi-ticaret-ve-isletmecilik', 'lisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Uluslararası Ticaret ve Lojistik', 'uluslararasi-ticaret-ve-lojistik', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Un ve Unlu Mamuller Teknolojisi', 'un-ve-unlu-mamuller-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Urdu Dili ve Edebiyatı', 'urdu-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Uzaktan Algılama ve Coğrafi Bilgi Sistemleri', 'uzaktan-algilama-ve-cografi-bilgi-sistemleri', 'onlisans', 'Bilişim ve Yazılım'),
  ('Uzay Bilimleri ve Teknolojileri', 'uzay-bilimleri-ve-teknolojileri', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Uzay Mühendisliği', 'uzay-muhendisligi', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Üretimde Kalite Kontrol', 'uretimde-kalite-kontrol', 'onlisans', 'İş Sağlığı, Güvenliği ve Kalite'),
  ('Veri Bilimi ve Analitiği', 'veri-bilimi-ve-analitigi', 'lisans', 'Bilişim ve Yazılım'),
  ('Veteriner', 'veteriner', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Web Tasarımı ve Kodlama', 'web-tasarimi-ve-kodlama', 'onlisans', 'Bilişim ve Yazılım'),
  ('Yaban Hayatı Ekolojisi ve Yönetimi', 'yaban-hayati-ekolojisi-ve-yonetimi', 'lisans', 'Çevre ve Sürdürülebilirlik'),
  ('Yağ Endüstrisi', 'yag-endustrisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Yapay Zeka Mühendisliği', 'yapay-zeka-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Yapay Zeka Operatörlüğü', 'yapay-zeka-operatorlugu', 'onlisans', 'Bilişim ve Yazılım'),
  ('Yapay Zeka ve Makine Öğrenmesi', 'yapay-zeka-ve-makine-ogrenmesi', 'lisans', 'Bilişim ve Yazılım'),
  ('Yapay Zeka ve Veri Mühendisliği', 'yapay-zeka-ve-veri-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Yapı Denetimi', 'yapi-denetimi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Yapı Ressamlığı', 'yapi-ressamligi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Yapı Tesisat Teknolojisi', 'yapi-tesisat-teknolojisi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Yapı Yalıtım Teknolojisi', 'yapi-yalitim-teknolojisi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Yapı Yüzeyi Tasarım Teknikerliği', 'yapi-yuzeyi-tasarim-teknikerligi', 'onlisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Yaşlı Bakımı', 'yasli-bakimi', 'onlisans', 'Sağlık ve İlaç'),
  ('Yat Kaptanlığı', 'yat-kaptanligi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Yazılım Geliştirme', 'yazilim-gelistirme', 'lisans', 'Bilişim ve Yazılım'),
  ('Yazılım Mühendisliği', 'yazilim-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Yenilenebilir Enerji Teknikerliği', 'yenilenebilir-enerji-teknikerligi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Yeni Medya', 'yeni-medya', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Yeni Medya ve Gazetecilik', 'yeni-medya-ve-gazetecilik', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Yeni Medya ve İletişim', 'yeni-medya-ve-iletisim', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Yerel Yönetimler', 'yerel-yonetimler', 'lisans', 'Kamu, Siyaset ve Uluslararası İlişkiler'),
  ('Yeşil ve Ekolojik Bina Teknikerliği', 'yesil-ve-ekolojik-bina-teknikerligi', 'onlisans', 'Çevre ve Sürdürülebilirlik'),
  ('Yiyecek ve İçecek İşletmeciliği', 'yiyecek-ve-icecek-isletmeciligi', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Yönetim Bilimleri Programları', 'yonetim-bilimleri-programlari', 'lisans', 'Ekonomi, İşletme ve Yönetim'),
  ('Yönetim Bilişim Sistemleri', 'yonetim-bilisim-sistemleri', 'lisans', 'Bilişim ve Yazılım'),
  ('Yunan Dili ve Edebiyatı', 'yunan-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Zaza Dili ve Edebiyatı', 'zaza-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Zeytincilik ve Zeytin İşleme Teknolojisi', 'zeytincilik-ve-zeytin-isleme-teknolojisi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Ziraat Mühendisliği Programları', 'ziraat-muhendisligi-programlari', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Zootekni', 'zootekni', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Açık Deniz Tabanı Uygulamaları Teknolojisi', 'acik-deniz-tabani-uygulamalari-teknolojisi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Bilgi Güvenliği Teknolojisi', 'bilgi-guvenligi-teknolojisi', 'lisans', 'Bilişim ve Yazılım'),
  ('Dijital Dönüşüm Elektroniği', 'dijital-donusum-elektronigi', 'onlisans', 'Elektrik, Elektronik ve Enerji'),
  ('Egzersiz ve Spor Bilimleri', 'egzersiz-ve-spor-bilimleri', 'lisans', 'Spor ve Rekreasyon'),
  ('Geleneksel Türk Sanatları', 'geleneksel-turk-sanatlari', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Gemi ve Deniz Teknolojisi Mühendisliği', 'gemi-ve-deniz-teknolojisi-muhendisligi', 'lisans', 'Lojistik, Havacılık ve Denizcilik'),
  ('Hava Lojistiği', 'hava-lojistigi', 'onlisans', 'Lojistik, Havacılık ve Denizcilik');

/* Türkçe harf katlaması: İ→i, ı→i, ğ→g … Eşleştirmenin tamamı bunun
   üstünde duruyor; aşağıdaki `bolumu_esle` de aynı kuralı kullanıyor. */
create or replace function sosyal_gizli.ad_sadelestir(ham text)
returns text
language sql immutable
as $$
  select nullif(
    btrim(regexp_replace(
      lower(translate(coalesce(ham, ''), 'İIıÇçĞğÖöŞşÜü', 'iiiccggoossuu')),
      '[^a-z0-9]+', ' ', 'g'
    )),
    ''
  )
$$;

/* Var olan satırları normalleştirilmiş ada göre eşle, eksiklerini tamamla. */
update public.departments d
   set duzey = coalesce(d.duzey, k.duzey)
  from yok_katalog k
 where sosyal_gizli.ad_sadelestir(d.ad) = sosyal_gizli.ad_sadelestir(k.ad);

/* Katalogda olmayanları ekle. Slug çakışırsa sona sayı ekleniyor. */
insert into public.departments (slug, ad, duzey, sira, aktif)
select
  case when exists (select 1 from public.departments x where x.slug = k.slug)
       then left(k.slug, 76) || '-' || substr(md5(k.ad), 1, 3)
       else k.slug end,
  k.ad,
  k.duzey,
  coalesce((select max(sira) from public.departments), 0)
    + row_number() over (order by k.ad),
  true
  from yok_katalog k
 where not exists (
   select 1 from public.departments d
    where sosyal_gizli.ad_sadelestir(d.ad) = sosyal_gizli.ad_sadelestir(k.ad)
 );

/* Alan eşlemesi: department_sectors'ta karşılığı olmayan her bölüme
   katalogdaki alanı bağla. Var olan eşleme EZİLMİYOR — biri elle
   düzeltmişse o karar korunuyor. */
insert into public.department_sectors (department_id, sector_id)
select d.id, s.id
  from yok_katalog k
  join public.departments d
    on sosyal_gizli.ad_sadelestir(d.ad) = sosyal_gizli.ad_sadelestir(k.ad)
  join public.sectors s on s.ad = k.alan
 where not exists (select 1 from public.department_sectors ds where ds.department_id = d.id)
on conflict (department_id) do nothing;

/* --------------------------------------------------------------------
   EŞLEŞTİRME ARTIK TÜRKÇEYE DAYANIKLI

   Eski gövde `lower(btrim(...))` ile birebir karşılaştırıyordu. İki ayrı
   kusuru vardı: Türkçe İ/ı harfleri (lower('İ') noktalı bir i üretiyor)
   ve addaki ekler ("(MYO)", noktalama). İkisi de ölçüldü, ikisi de
   canlıda kullanıcı alansız bıraktı.

   Sıra: önce birebir sadeleştirilmiş ad, sonra eki atılmış hâli. Tek
   satır dönüyor; birden çok eşleşme olursa `sira` küçük olan kazanıyor
   (eski 42 kalem önce geliyor, onların içerik sayfası var).
-------------------------------------------------------------------- */
create or replace function sosyal_gizli.bolumu_esle(ham text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with aranan as (
    select sosyal_gizli.ad_sadelestir(ham) as ad
  )
  select d.id
    from public.departments d, aranan a
   where d.aktif
     and a.ad is not null
     and sosyal_gizli.ad_sadelestir(d.ad) = a.ad
   order by d.sira
   limit 1
$$;
