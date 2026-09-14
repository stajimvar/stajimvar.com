-- İLAN VERİSİNİN DOĞRULUĞU
--
-- Üç ayrı iddia düzeltiliyor; üçü de "bilmiyoruz"u "biliyoruz" gibi
-- gösteriyordu.

-- ---------------------------------------------------------------------
-- 1) ÜCRET: "BİLİNMİYOR" ARTIK "ÜCRETSİZ" DEĞİL
-- ---------------------------------------------------------------------
--
-- ÖLÇÜLDÜ (14 Eylül 2026, üretim): 175 ilanın 166'sı `is_paid = false`,
-- 9'u true, hiçbiri null. 166 false kaydın 164'ünde açıklamada ücretle
-- ilgili HİÇBİR ifade yok. Kalan 2'sinde `detect_paid`'in "burs" kalıbı
-- eşleşiyor ama bağlama bakınca ikisi de ŞEHİR:
--
--   "…İstanbul, Ankara, Antalya, Adana, Bursa ve İzmir ofisleri…"
--
-- Yani üretimde "ücretsiz" kanıtı olan TEK kayıt yok. Buna karşılık
-- sütun `not null default false` idi: kaynağın hiç konuşmadığı yerde
-- veritabanı "ücretsiz" diyordu. Karta bir gün "Ücretsiz" etiketi
-- eklenseydi 166 ilan hakkında kanıtsız bir iddia yayınlanacaktı.
--
-- ÜÇ DEĞER, ÜÇ ANLAM
--   true  → kaynakta açık ücretli kanıtı
--   false → kaynakta açık ücretsiz kanıtı
--   null  → kaynak söylemiyor
--
-- `stipend_text` boş olması tek başına hiçbir şeyi geçersiz kılmıyor:
-- bir ilan "ücretli staj" deyip tutarı yazmayabilir.

alter table public.listings
  alter column is_paid drop not null,
  alter column is_paid drop default;

comment on column public.listings.is_paid is
  'true = kaynakta açık ücretli kanıtı, false = açık ücretsiz kanıtı, '
  'null = kaynak söylemiyor. Varsayılan YOK: bilinmeyeni false yapmak '
  'kanıtsız bir iddia olurdu.';

-- ---------------------------------------------------------------------
-- 2) KAYNAK KONTROLÜ: DÖRDÜNCÜ DURUM — BELİRSİZ
-- ---------------------------------------------------------------------
--
-- Kontrol betiği üç durum tanıyordu: acik / kapali / erisilemedi.
-- Eksik olan dördüncüsü: adres cevap VERİYOR (HTTP 200) ama cevabın
-- ilanın hâlâ açık olduğuna dair bir kanıt taşıdığı belli değil.
--
-- Bugünkü davranış: `yanit.ok` → 'acik' + `source_verified_at = now()`
-- ve KAPANMIŞ ilan yayına geri alınıyor. Kaynak sitesi ilanı kaldırıp
-- adresi genel kariyer sayfasına yönlendirdiğinde o sayfa 200 dönüyor,
-- kapanma metni de içermiyor — yani kapanmış ilan "doğrulandı" damgası
-- alıp yayına geri dönüyor.
--
-- 200 ARTIK TEK BAŞINA KANIT DEĞİL. 'belirsiz': kontrol edildi, kapalı
-- olduğu söylenemez, açık olduğu da doğrulanamadı. Bu durumda
-- `source_checked_at` ilerliyor, `source_verified_at` KORUNUYOR ve ilanın
-- durumu değişmiyor.

alter table public.listings drop constraint if exists listings_source_status_check;
alter table public.listings add constraint listings_source_status_check
  check (source_status is null or source_status in ('acik', 'kapali', 'erisilemedi', 'belirsiz'));

comment on column public.listings.source_status is
  'acik = ilanın açık olduğu doğrulandı (sayfada ilanın kendi kanıtı var), '
  'kapali = kesin kapanış, erisilemedi = geçici erişim hatası (403/429/5xx/'
  'zaman aşımı), belirsiz = cevap alındı ama açık olduğu doğrulanamadı.';

/*
  Yalnız okuma yetkisi: şirket paneli bu alanları görüyor ama yazmıyor
  (20260905020000 ile aynı düzen; yeni değer o yetkileri değiştirmiyor).
*/

-- ---------------------------------------------------------------------
-- 3) GERÇEK ŞEMA EKSİKLERİ
-- ---------------------------------------------------------------------

/*
  HAM KONUM — `city`'nin YERİNE DEĞİL, YANINA

  `city` normalleştirilmiş: "İstanbul (Maslak)" → "İstanbul". Normalleşme
  bilgi kaybediyor ve kaybettiğini geri getirmenin yolu yok. Ham dize
  ayrı bir alanda duruyor; `city` dokunulmadan kalıyor, yani onu kullanan
  bütün ekran ve sorgular aynı çalışıyor.

  Kaynakta olmayan konum ÜRETİLMİYOR: alan yalnız kaynağın verdiği dize
  varsa doluyor.
*/
alter table public.listings
  add column if not exists location_raw text;

comment on column public.listings.location_raw is
  'Kaynağın verdiği ham konum dizesi, normalleştirme öncesi. `city` '
  'normalleştirilmiş hâli; bu alan onun yerine geçmiyor.';

/*
  SİGORTAYI SAĞLAYAN TARAF

  `insurance_note` serbest metin ve kalıyor (ekranlar onu basıyor). Eksik
  olan, ÜZERİNE FİLTRE KURULABİLİR bir alan: sigortayı kim yapıyor?

  BİLİNMEYEN SİGORTASIZ DEĞİL: alan nullable ve null "bilinmiyor"
  demek — "sigorta yok" ayrı bir değer ('yok'). Bu ayrım olmasa,
  kaynağın hiç konuşmadığı ilan "sigortasız" görünürdü; zorunlu staj
  arayan öğrenci için bu yanlış bilgi.
*/
alter table public.listings
  add column if not exists insurance_provider text;

alter table public.listings drop constraint if exists listings_insurance_provider_check;
alter table public.listings add constraint listings_insurance_provider_check
  check (
    insurance_provider is null
    or insurance_provider in ('isveren', 'universite', 'aday', 'yok')
  );

comment on column public.listings.insurance_provider is
  'Staj sigortasını kim sağlıyor: isveren / universite / aday / yok. '
  'null = kaynak söylemiyor — "yok" ile AYNI ŞEY DEĞİL.';

/*
  ÇOKLU BÖLÜM ETİKETİ

  `department` tek bir metin ve öyle kalıyor: onu okuyan ekranlar,
  sorgular ve site haritası bozulmasın. Gerçek ilanlar birden çok bölüme
  açık oluyor ("Bilgisayar, Yazılım, Elektrik-Elektronik") ve tek alan
  bunu ya kaybediyor ya virgüllü bir dizeye sıkıştırıyordu.

  UYUMLU GEÇİŞ: yazan taraf ikisini birlikte dolduruyor —
  `department_tags` tam liste, `department` listenin ilki. Böylece eski
  okuyucu çalışmaya devam ediyor, yeni okuyucu tamamını görüyor.
*/
alter table public.listings
  add column if not exists department_tags text[];

comment on column public.listings.department_tags is
  'İlanın açık olduğu bölümler. `department` geriye uyumluluk için '
  'listenin ilkini tutmaya devam ediyor; bu alan tamamını tutuyor.';

create index if not exists listings_department_tags_idx
  on public.listings using gin (department_tags);

/*
  MEVCUT KAYITLAR: TÜRETİLEN DOLDURULUYOR, UYDURULAN DOLDURULMUYOR

  `department_tags`, `department`'ın kendisinden türetiliyor — yeni bilgi
  değil, aynı bilginin dizi hâli. `location_raw` ve `insurance_provider`
  geri doldurulMUYOR: onlar için kaynak kanıtı gerekiyor ve elimizde
  toplu bir kanıt yok. Boş kalıyorlar; "bilinmiyor" doğru cevap.
*/
update public.listings
   set department_tags = array[department]
 where department is not null
   and btrim(department) <> ''
   and department_tags is null;
