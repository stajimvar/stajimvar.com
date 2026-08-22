-- Fırsat veren kurumların logolarını kayıtlara bağlar.
--
-- Görseller scripts/kurum-logolari.mjs ile kurumların KENDİ sitelerinden
-- indirildi, 128x128 PNG'ye çevrildi ve public/kurum-logolari/ altına
-- yazıldı. Dışarıya bağlanmıyoruz: hem o siteye bağımlı kalmamak hem de
-- ziyaretçinin IP'sini oraya sızdırmamak için (automation/logos.py ile
-- aynı gerekçe).
--
-- İBB VE VEHBİ KOÇ VAKFI SONRADAN EKLENDİ
-- İkisi bir süre baş harfleriyle duruyordu:
--   * İBB'nin sayfasındaki <link rel="icon"> adresi bozuk çıkıyor
--     ("...ibb.istanbulundefined"). Sitenin kökündeki favicon.ico duruyor
--     ve içinde 256x256 PNG var; ICO kabı açılıp o PNG alınıyor.
--   * Vehbi Koç Vakfı'nın yüksek çözünürlüklü dosyası beyaz, beyaz kartta
--     görünmüyor. Başlıktaki renkli yatay kilidin kırmızı amblemi
--     kırpılarak kullanılıyor.
-- İkisi de kurumun kendi sitesinden; ayrıntısı scripts/kurum-logolari.mjs.
--
-- Bu dosya supabase/migrations altında DEĞİL: oraya konursa dağıtım kapısı
-- (detect-deploy-changes.mjs) devreye giriyor ve migration geçmişi
-- hizalanana kadar site dağıtımını da bloke ediyor. İçerik güncellemesi
-- şema değişikliği değil.

update public.opportunities set organization_logo_url = '/kurum-logolari/kyk.png'
  where organization_name = 'Gençlik ve Spor Bakanlığı';

update public.opportunities set organization_logo_url = '/kurum-logolari/tev.png'
  where organization_name = 'Türk Eğitim Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/tubitak.png'
  where organization_name = 'TÜBİTAK';

update public.opportunities set organization_logo_url = '/kurum-logolari/ua.png'
  where organization_name = 'Türkiye Ulusal Ajansı';

update public.opportunities set organization_logo_url = '/kurum-logolari/teknofest.png'
  where organization_name = 'TEKNOFEST';

update public.opportunities set organization_logo_url = '/kurum-logolari/turgev.png'
  where organization_name = 'TÜRGEV';

update public.opportunities set organization_logo_url = '/kurum-logolari/anadoluvakfi.png'
  where organization_name = 'Anadolu Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/ted.png'
  where organization_name = 'Türk Eğitim Derneği';

update public.opportunities set organization_logo_url = '/kurum-logolari/ibb.png'
  where organization_name = 'İstanbul Büyükşehir Belediyesi';

update public.opportunities set organization_logo_url = '/kurum-logolari/vkv.png'
  where organization_name = 'Vehbi Koç Vakfı';

-- Kontrol: hangi kurumda logo var, hangisinde yok.
select organization_name, coalesce(organization_logo_url, '(baş harfler)') as logo
from public.opportunities
order by organization_logo_url nulls last, organization_name;
