-- YÖK PROGRAM KATALOĞU — 2026 KILAVUZUNA GÖRE TAMAMLAMA (17 Kasım 2026)
--
-- KULLANICI İSTEĞİ: "olan okulların tüm bölümleri eksiksiz olsun".
--
-- ÖLÇÜLEN DURUM
-- -------------
-- 20261021010000 kataloğu YÖK Atlas'ın program grubu listesinden (595 ad)
-- kurulmuştu. Aynı kaynağın 2026 YKS tercih kılavuzu (228 üniversite,
-- 21.493 program satırı) 634 program grubu içeriyor; 39'u katalogda
-- yoktu (Robotik ve Otonom Sistemler Mühendisliği, Veri Mühendisliği,
-- Finansal Teknoloji, Psikolojik Danışmanlık ve Rehberlik…).
--
-- Kılavuzda HİÇ olmayan 9 program da ekleniyor: özel yetenek sınavıyla
-- öğrenci alanlar (Müzik, Resim, Heykel, Sahne Sanatları, Spor
-- Yöneticiliği, Müzik ve Resim-İş Öğretmenliği) ile öğrencisi süren ama
-- kılavuzda görünmeyenler (Adalet, Din Kültürü ve Ahlak Bilgisi
-- Öğretmenliği). Bu öğrenciler bölümünü listede bulamıyordu.
--
-- Kural 20261021010000 ile aynı: ada ek konmuyor, düzey ayrı sütunda;
-- var olan satır ezilmiyor, var olan alan eşlemesi ezilmiyor.
-- src/data/turkeyData.ts (TR_DEPARTMENTS) scripts/cv-bolum-listesi.mjs
-- ile bu iki göçten üretiliyor.

create temporary table yok_katalog_ek (ad text, slug text, duzey text, alan text) on commit drop;

insert into yok_katalog_ek (ad, slug, duzey, alan) values
  ('Animasyon ve Video Üretimi', 'animasyon-ve-video-uretimi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Bahçe ve Tarla Bitkileri', 'bahce-ve-tarla-bitkileri', 'lisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Balıkçılık Teknolojisi', 'balikcilik-teknolojisi', 'ikisi', 'Gıda, Tarım ve Hayvancılık'),
  ('Bankacılık ve Finans', 'bankacilik-ve-finans', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Bilgisayar Bilimleri ve Mühendisliği', 'bilgisayar-bilimleri-ve-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Dijital Oyun Teknolojileri', 'dijital-oyun-teknolojileri', 'onlisans', 'Bilişim ve Yazılım'),
  ('Dijital Yapımcılık ve Yayıncılık', 'dijital-yapimcilik-ve-yayincilik', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('E-Ticaret', 'e-ticaret', 'lisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('E-İşletme ve E-Ticaret', 'e-isletme-ve-e-ticaret', 'lisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Felsefe ve Yapay Zeka', 'felsefe-ve-yapay-zeka', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Filoloji (İngiliz Dili ve Edebiyatı)', 'filoloji-ingiliz-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Finansal Teknoloji', 'finansal-teknoloji', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Gastronomi', 'gastronomi', 'lisans', 'Turizm ve Konaklama'),
  ('Görsel Sanatlar ve İletişim Tasarımı', 'gorsel-sanatlar-ve-iletisim-tasarimi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Halkla İlişkiler ve Pazarlama İletişimi', 'halkla-iliskiler-ve-pazarlama-iletisimi', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Hayvancılık Teknolojileri ve İşletmeciliği', 'hayvancilik-teknolojileri-ve-isletmeciligi', 'onlisans', 'Gıda, Tarım ve Hayvancılık'),
  ('Kırgız Dili ve Edebiyatı', 'kirgiz-dili-ve-edebiyati', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Laboratuvar Hayvanları', 'laboratuvar-hayvanlari', 'onlisans', 'Sağlık ve İlaç'),
  ('Mobil Güvenlik Teknolojileri', 'mobil-guvenlik-teknolojileri', 'onlisans', 'Bilişim ve Yazılım'),
  ('Mütercim-Tercümanlık (Rusça)', 'mutercim-tercumanlik-rusca', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Patlayıcı ve Enerjetik Malzemeler Teknikerliği', 'patlayici-ve-enerjetik-malzemeler-teknikerligi', 'onlisans', 'Kimya, Malzeme ve Maden'),
  ('Psikolojik Danışmanlık ve Rehberlik Öğretmenliği', 'psikolojik-danismanlik-ve-rehberlik-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Psikolojik Danışmanlık ve Rehberlik', 'psikolojik-danismanlik-ve-rehberlik', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Robotik ve Otonom Sistemler Mühendisliği', 'robotik-ve-otonom-sistemler-muhendisligi', 'lisans', 'Mekatronik ve Otomasyon'),
  ('Rus Dili ve Edebiyatı Öğretmenliği', 'rus-dili-ve-edebiyati-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Tarih ve Yapay Zeka', 'tarih-ve-yapay-zeka', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Tespih Tasarımı ve İmalatı', 'tespih-tasarimi-ve-imalati', 'onlisans', 'Tekstil, Moda ve Hazır Giyim'),
  ('Turizm ve Otel Yönetimi', 'turizm-ve-otel-yonetimi', 'lisans', 'Turizm ve Konaklama'),
  ('Türkoloji', 'turkoloji', 'lisans', 'Psikoloji ve Sosyal Bilimler'),
  ('Uluslararası Ticaret ve Finans', 'uluslararasi-ticaret-ve-finans', 'lisans', 'Ticaret, Pazarlama ve E-ticaret'),
  ('Uygulamalı Bankacılık ve Finans', 'uygulamali-bankacilik-ve-finans', 'lisans', 'Finans, Bankacılık ve Sigorta'),
  ('Veri Görselleştirme ve Bilgi Tasarımı', 'veri-gorsellestirme-ve-bilgi-tasarimi', 'onlisans', 'Bilişim ve Yazılım'),
  ('Veri Mühendisliği', 'veri-muhendisligi', 'lisans', 'Bilişim ve Yazılım'),
  ('Yapay Zeka Destekli Kodlama', 'yapay-zeka-destekli-kodlama', 'onlisans', 'Bilişim ve Yazılım'),
  ('Yapay Zeka Destekli Tasarım ve Animasyon', 'yapay-zeka-destekli-tasarim-ve-animasyon', 'onlisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Yapay Zeka Destekli Web Tasarımı ve Kodlama', 'yapay-zeka-destekli-web-tasarimi-ve-kodlama', 'onlisans', 'Bilişim ve Yazılım'),
  ('Yapay Zeka ve Veri Analizi', 'yapay-zeka-ve-veri-analizi', 'lisans', 'Bilişim ve Yazılım'),
  ('İlaç Üretim Teknolojisi', 'ilac-uretim-teknolojisi', 'onlisans', 'Sağlık ve İlaç'),
  ('İç Mimarlık ve Mobilya Tasarımı', 'ic-mimarlik-ve-mobilya-tasarimi', 'lisans', 'İnşaat, Mimarlık ve Yapı'),
  ('Adalet', 'adalet', 'onlisans', 'Hukuk ve Adalet'),
  ('Din Kültürü ve Ahlak Bilgisi Öğretmenliği', 'din-kulturu-ve-ahlak-bilgisi-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Heykel', 'heykel', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Müzik', 'muzik', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Müzik Öğretmenliği', 'muzik-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Resim', 'resim', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Resim-İş Öğretmenliği', 'resim-is-ogretmenligi', 'lisans', 'Eğitim ve Çocuk Gelişimi'),
  ('Sahne Sanatları', 'sahne-sanatlari', 'lisans', 'Medya, İletişim ve Yaratıcı Endüstriler'),
  ('Spor Yöneticiliği', 'spor-yoneticiligi', 'lisans', 'Spor ve Rekreasyon');

/* Her satır bir alana bağlanmalı: sektör adı yazım hatasıyla tutmazsa göç dursun. */
do $$
begin
  if exists (select 1 from yok_katalog_ek k
              where not exists (select 1 from public.sectors s where s.ad = k.alan)) then
    raise exception 'yok_katalog_ek: tanınmayan alan adı';
  end if;
end
$$;

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
  from yok_katalog_ek k
 where not exists (
   select 1 from public.departments d
    where sosyal_gizli.ad_sadelestir(d.ad) = sosyal_gizli.ad_sadelestir(k.ad)
 );

insert into public.department_sectors (department_id, sector_id)
select d.id, s.id
  from yok_katalog_ek k
  join public.departments d
    on sosyal_gizli.ad_sadelestir(d.ad) = sosyal_gizli.ad_sadelestir(k.ad)
  join public.sectors s on s.ad = k.alan
 where not exists (select 1 from public.department_sectors ds where ds.department_id = d.id)
on conflict (department_id) do nothing;
