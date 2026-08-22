-- Fırsat alt sistemini onar ve ilk içeriği ekle.
--
-- ÜÇ AYRI KAÇIŞ HATASI, TEK KÖK NEDEN
-- -----------------------------------
-- PostgreSQL'de standard_conforming_strings AÇIK. Yani '...' içindeki
-- ters bölü kendiliğinden kaçış yapmıyor ve `\` iki GERÇEK ters bölü
-- oluyor. Bu dosyanın düzelttiği üç hatanın hepsi bundan doğmuş:
--
-- 1) opportunities_safe_admin_urls kısıtı (0019_opportunity_admin_panel)
--    Desenin son seçeneği `\[(fc|fd|fe80)` — köşeli parantez açılıyor,
--    hiç kapanmıyor. Postgres: "invalid regular expression: brackets []
--    not balanced". Kısıt her INSERT'te değerlendirildiği için
--    opportunities tablosuna KAYIT EKLEMEK İMKÂNSIZDI; yönetim
--    panelinden de. /firsatlar sayfası bu yüzden boştu.
--
-- 2) is_safe_opportunity_source_url içinde `authority like '%%%'`
--    LIKE'da % joker; üç joker HER metinle eşleşiyor, yani fonksiyon her
--    adresi reddediyor. Niyet "yüzde işareti içeriyor mu" olmalıydı:
--    '%\%%'. Kanıt: disposable güvenlik testi 21 Ağustos'tan beri
--    "url test failed: https://example.com" diyerek düşüyordu.
--
-- 3) Aynı fonksiyonda `host like '%.%'`
--    "nokta içeriyor" demek. Hemen altındaki `host !~ '\.'` ise "nokta
--    içermiyorsa reddet" diyor. İkisi birlikte her konağı reddediyor.
--    Niyet "nokta ile bitiyor" ('%.') — test dosyasındaki
--    ('https://example.com.', false) durumu bunu doğruluyor.
--
-- Kısıt artık kendi kopyasını taşımıyor, doğrulanmış fonksiyonu çağırıyor.
-- Kural tek yerde duruyor ve ileride yine ikiye ayrılmıyor.

create or replace function public.is_safe_opportunity_source_url(value text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  authority text;
  host text;
  port_text text;
  literal inet;
  labels text[];
  label text;
begin
  if value is null or length(value) = 0 or length(value) > 2048 or value <> btrim(value) then return false; end if;
  if value !~ '^https://' then return false; end if;
  authority := substring(value from '^https://([^/?#]+)');
  if authority is null or authority = '' or authority like '%@%' or authority like '%\\%' or authority like '%\%%' then return false; end if;
  if authority ~ '^\[' then
    if authority !~ '^\[[0-9A-Fa-f:.]+\](:[0-9]{1,5})?$' then return false; end if;
    host := substring(authority from '^\[([^]]+)\]');
    begin literal := host::inet; exception when others then return false; end;
    return false;
  end if;
  if authority ~ ':' then
    if authority !~ '^[^:]+:[0-9]{1,5}$' then return false; end if;
    host := split_part(authority, ':', 1); port_text := split_part(authority, ':', 2);
    if port_text::integer not between 1 and 65535 then return false; end if;
  else host := authority; end if;
  if host !~ '^[A-Za-z0-9.-]+$' or host like '%.' or host like '.%' or host !~ '\.' then return false; end if;
  begin literal := host::inet; return false; exception when others then null; end;
  if lower(host) = 'localhost' or lower(host) like '%.localhost' or lower(host) like '%.local' or lower(host) like '%.internal' then return false; end if;
  labels := string_to_array(host, '.');
  foreach label in array labels loop
    if label = '' or length(label) > 63 or label like '-%' or label like '%-' or label !~ '^[A-Za-z0-9-]+$' then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

alter table public.opportunities drop constraint if exists opportunities_safe_admin_urls;

alter table public.opportunities add constraint opportunities_safe_admin_urls check (
  public.is_safe_opportunity_source_url(source_url)
  and (application_url is null or public.is_safe_opportunity_source_url(application_url))
);

-- ---------------------------------------------------------------------
-- İLK İÇERİK
--
-- TUTAR VE TARİH BİLEREK YAZILMIYOR: burs tutarları ve başvuru takvimleri
-- her yıl değişiyor; eskimiş rakam hiç yazmamaktan kötü.
--   * application_deadline NULL -> kod bunu "süresi dolmamış" sayıyor
--     (isExpiredOpportunity tarih yoksa false döner), RLS null tarihli
--     kaydı herkese açık gösteriyor, arayüz "Dönemsel" çiziyor.
--   * amount_text yalnızca yapısal olarak doğru olanı söylüyor:
--     "Karşılıksız" / "Geri ödemeli". Rakam yok.
--
-- KAYNAK ADRESLERİ DOĞRULANDI: her source_url gerçekten çağrıldı ve 200
-- döndü. Doğrulanamayanlar listeye ALINMADI — Sabancı Vakfı (SSL hatası)
-- ve bideb.tubitak.gov.tr (bağlantı kurulamadı; TÜBİTAK için ana alan
-- adı). Tahmin edilen bir e-Devlet adresi 404 döndüğü için çıkarıldı.
-- ---------------------------------------------------------------------

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
