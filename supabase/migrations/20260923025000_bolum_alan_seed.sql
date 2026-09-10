-- SOSYAL KATMAN C AŞAMASI — SEKİZ YENİ ALAN VE 42 EŞLEME (İÇERİK)
--
-- Bu göçteki her satır ürün sahibinin ONAYLADIĞI listeden geliyor
-- (tasarım §10). Model kendi bilgisiyle ya da internetten bir eşleme
-- üretmedi; taslak ayrı bir turda sunuldu, sekiz yeni alan açılarak
-- 42/42 bölüm karara bağlandı.
--
-- NEDEN SEKİZ YENİ ALAN
-- ---------------------
-- Taslak, 42 bölümün 12'sinin 15 alana oturmadığını ölçtü ve 7'sinde
-- hiçbir alanın doğal ev olmadığını gösterdi. Yani eksik olan eşleme
-- değil, alan listesinin KAPSAMIYDI: hukuk, kamu yönetimi, eğitim ve
-- "işlev" nitelikli bölümler (İSG, Endüstri Müh.) karşılık bulmuyordu.
-- Liste 15'ten 23'e çıkarıldı.
--
-- UUID ELLE YAZILMIYOR
-- --------------------
-- Eşlemeler `slug` üzerinden bağlanıyor. Kimlikler `gen_random_uuid()`
-- ile üretildiği için ortamdan ortama değişiyor; göçe uuid yazmak bu
-- dosyayı yalnız tek bir veritabanında doğru kılardı.

/* ================================================================== */
/*  1) SEKİZ YENİ ALAN                                                 */
/* ================================================================== */

/*
  `on conflict (slug) do nothing`: göç yeniden çalıştırılabilir ve var
  olan 15 alanın adını/sırasını DEĞİŞTİRMİYOR. Alan adı düzeltmesi ayrı
  ve bilinçli bir göçün işi.
*/
insert into public.sectors (slug, ad, sira) values
  ('endustri-operasyon-yonetimi',         'Endüstri ve Operasyon Yönetimi',          16),
  ('mekatronik-otomasyon',                'Mekatronik ve Otomasyon',                 17),
  ('ekonomi-isletme-yonetim',             'Ekonomi, İşletme ve Yönetim',             18),
  ('is-sagligi-guvenligi-kalite',         'İş Sağlığı, Güvenliği ve Kalite',         19),
  ('kamu-siyaset-uluslararasi-iliskiler', 'Kamu, Siyaset ve Uluslararası İlişkiler', 20),
  ('hukuk-adalet',                        'Hukuk ve Adalet',                         21),
  ('psikoloji-sosyal-bilimler',           'Psikoloji ve Sosyal Bilimler',            22),
  ('egitim-cocuk-gelisimi',               'Eğitim ve Çocuk Gelişimi',                23)
on conflict (slug) do nothing;

/* ================================================================== */
/*  2) 42 BÖLÜMÜN EŞLEMESİ                                             */
/* ================================================================== */

/*
  `otomotiv-mobilite` alanı listede kalıyor ama hiçbir bölüm ona bağlı
  DEĞİL. Bu bilinçli: alanı silmek, ileride otomotiv odaklı bir bölüm
  eklendiğinde geri alınması gereken bir karar olurdu. Test bu boşluğun
  kaza değil tercih olduğunu sabitliyor.
*/
insert into public.department_sectors (department_id, sector_id)
select d.id, s.id
  from (values
    ('bilgisayar-muhendisligi',            'bilisim-yazilim'),
    ('yazilim-muhendisligi',               'bilisim-yazilim'),
    ('bilgisayar-programciligi',           'bilisim-yazilim'),
    ('elektrik-elektronik-muhendisligi',   'elektrik-elektronik-enerji'),
    ('makine-muhendisligi',                'makine-imalat'),
    ('endustri-muhendisligi',              'endustri-operasyon-yonetimi'),
    ('mekatronik-muhendisligi',            'mekatronik-otomasyon'),
    ('mekatronik',                         'mekatronik-otomasyon'),
    ('insaat-muhendisligi',                'insaat-mimarlik-yapi'),
    ('mimarlik',                           'insaat-mimarlik-yapi'),
    ('ic-mimarlik',                        'insaat-mimarlik-yapi'),
    ('harita-ve-geomatik-muhendisligi',    'insaat-mimarlik-yapi'),
    ('gida-muhendisligi',                  'gida-tarim-hayvancilik'),
    ('ziraat-muhendisligi',                'gida-tarim-hayvancilik'),
    ('kimya-muhendisligi',                 'kimya-malzeme-maden'),
    ('metalurji-ve-malzeme-muhendisligi',  'kimya-malzeme-maden'),
    ('cevre-muhendisligi',                 'cevre-surdurulebilirlik'),
    ('giyim-uretim-teknolojisi',           'tekstil-moda-hazir-giyim'),
    ('moda-tasarimi',                      'tekstil-moda-hazir-giyim'),
    ('grafik-tasarim',                     'medya-iletisim-yaratici'),
    ('radyo-televizyon-ve-sinema',         'medya-iletisim-yaratici'),
    ('iletisim',                           'medya-iletisim-yaratici'),
    ('muhasebe-ve-vergi-uygulamalari',     'finans-bankacilik-sigorta'),
    ('iktisat',                            'ekonomi-isletme-yonetim'),
    ('isletme',                            'ekonomi-isletme-yonetim'),
    ('uluslararasi-ticaret',               'ticaret-pazarlama-eticaret'),
    ('halkla-iliskiler-ve-pazarlama',      'ticaret-pazarlama-eticaret'),
    ('lojistik',                           'lojistik-havacilik-denizcilik'),
    ('is-sagligi-ve-guvenligi',            'is-sagligi-guvenligi-kalite'),
    ('uluslararasi-iliskiler',             'kamu-siyaset-uluslararasi-iliskiler'),
    ('siyaset-bilimi',                     'kamu-siyaset-uluslararasi-iliskiler'),
    ('hukuk',                              'hukuk-adalet'),
    ('psikoloji',                          'psikoloji-sosyal-bilimler'),
    ('sosyoloji',                          'psikoloji-sosyal-bilimler'),
    ('cocuk-gelisimi',                     'egitim-cocuk-gelisimi'),
    ('eczacilik',                          'saglik-ilac'),
    ('tip',                                'saglik-ilac'),
    ('hemsirelik',                         'saglik-ilac'),
    ('fizyoterapi-ve-rehabilitasyon',      'saglik-ilac'),
    ('tibbi-laboratuvar-teknikleri',       'saglik-ilac'),
    ('turizm-ve-otel-yoneticiligi',        'turizm-konaklama'),
    ('gastronomi-ve-mutfak',               'turizm-konaklama')
  ) as e(bolum_slug, alan_slug)
  join public.departments d on d.slug = e.bolum_slug
  join public.sectors     s on s.slug = e.alan_slug
on conflict (department_id) do nothing;

/*
  SESSİZ EKSİK OLMASIN

  Yukarıdaki `join`, slug'lardan biri yanlış yazılmışsa o satırı sessizce
  ATLAR ve göç hatasız geçer. Bu blok sayımı doğrulayıp uyuşmazlıkta
  göçü durduruyor: 42 bölümün 42'sinin de eşlemesi olmalı.
*/
do $$
declare
  eslesmeyen int;
  toplam int;
begin
  select count(*) into toplam from public.departments;
  select count(*) into eslesmeyen
    from public.departments d
    left join public.department_sectors ds on ds.department_id = d.id
   where ds.department_id is null;

  if eslesmeyen > 0 then
    raise exception 'Bölüm-alan eşlemesi eksik: % bölümün karşılığı yok (toplam %).',
      eslesmeyen, toplam;
  end if;
end $$;
