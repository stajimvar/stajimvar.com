-- Fırsat veren kurumların logolarını kayıtlara bağlar.
--
-- Görseller scripts/kurum-logolari.mjs ile kurumların KENDİ sitelerinden
-- indirildi, 128x128 PNG'ye çevrildi ve public/kurum-logolari/ altına
-- yazıldı. Dışarıya bağlanmıyoruz: hem o siteye bağımlı kalmamak hem de
-- ziyaretçinin IP'sini oraya sızdırmamak için (automation/logos.py ile
-- aynı gerekçe).
--
-- İKİ KURUMUN LOGOSU YOK, BİLEREK
--   * İstanbul Büyükşehir Belediyesi — sitesinde makine tarafından
--     bulunabilen logo yok, og:image adresi 404 dönüyor.
--   * Vehbi Koç Vakfı — bulunan tek dosya beyaz bir logoydu; indirilip
--     dönüştürülünce görsel tamamen boş çıktı. Gözle bakılmasaydı "logo
--     var" sanılacaktı, oysa beyaz kartın üzerinde görünmezdi.
--
-- İkisinde de arayüz kurumun baş harflerini çiziyor (CompanyLogo). Yanlış
-- ya da görünmez logo koymak, hiç koymamaktan kötü.
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

-- Kontrol: hangi kurumda logo var, hangisinde yok.
select organization_name, coalesce(organization_logo_url, '(baş harfler)') as logo
from public.opportunities
order by organization_logo_url nulls last, organization_name;
