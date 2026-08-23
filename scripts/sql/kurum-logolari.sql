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

-- BURS LİSTESİ 59'A ÇIKINCA GELEN KURUMLAR
-- Bu kurumların logo adresleri elle değil, scripts/kurum-logo-bul.mjs ile
-- bulundu: her kurumun kendi sayfası açılıp içindeki ikon/logo bağlantıları
-- okundu, adaylar indirilip ölçüldü ve en iyisi seçildi. Sonucun tamamına
-- gözle de bakıldı; yanlış çıkan üçü (Türkiye Bursları, İÜ-Cerrahpaşa
-- Geliştirme Vakfı, Yağmur Damlası Derneği) elle düzeltildi.
--
-- Altı kurum bilerek logosuz: Baştüzel Eğitim Vakfı'nın sitesindeki logo
-- başka bir kurumun adını taşıyan tema örneği, Bir İyilik Yap Derneği'nin
-- görselleri 404, Hukuk Araştırma Vakfı ile Memur-Sen yalnızca beyaz logo
-- yayınlıyor (beyaz kartta görünmez), Süreyya Ağaoğlu Derneği ve Yakın Doğu
-- Üniversitesi ise sunucudan indirmeyi Cloudflare ile engelliyor. Onlar
-- kartta baş harfleriyle görünüyor.

update public.opportunities set organization_logo_url = '/kurum-logolari/ahmet-ve-nezahat-kelesoglu-vakfi.png'
  where organization_name = 'Ahmet ve Nezahat Keleşoğlu Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/akpa-kimya.png'
  where organization_name = 'AKPA Kimya';

update public.opportunities set organization_logo_url = '/kurum-logolari/ankara-bilim-universitesi.png'
  where organization_name = 'Ankara Bilim Üniversitesi';

update public.opportunities set organization_logo_url = '/kurum-logolari/avrupa-komisyonu.png'
  where organization_name = 'Avrupa Komisyonu';

update public.opportunities set organization_logo_url = '/kurum-logolari/avrupa-parlamentosu.png'
  where organization_name = 'Avrupa Parlamentosu';

update public.opportunities set organization_logo_url = '/kurum-logolari/bayburt-universitesi.png'
  where organization_name = 'Bayburt Üniversitesi';

update public.opportunities set organization_logo_url = '/kurum-logolari/bulgurcu-ailesi-vakfi.png'
  where organization_name = 'Bulgurcu Ailesi Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/bursa-ticaret-ve-sanayi-odasi.png'
  where organization_name = 'Bursa Ticaret ve Sanayi Odası';

update public.opportunities set organization_logo_url = '/kurum-logolari/cern.png'
  where organization_name = 'CERN';

update public.opportunities set organization_logo_url = '/kurum-logolari/cerrahpasa-tip-mezunlar-dernegi.png'
  where organization_name = 'Cerrahpaşa Tıp Fakültesi Mezunlar Derneği';

update public.opportunities set organization_logo_url = '/kurum-logolari/chevening.png'
  where organization_name = 'Chevening';

update public.opportunities set organization_logo_url = '/kurum-logolari/dogu-akdeniz-universitesi.png'
  where organization_name = 'Doğu Akdeniz Üniversitesi';

update public.opportunities set organization_logo_url = '/kurum-logolari/dokuz-eylul-universitesi.png'
  where organization_name = 'Dokuz Eylül Üniversitesi';

update public.opportunities set organization_logo_url = '/kurum-logolari/erciyes-organ-nakli-vakfi.png'
  where organization_name = 'Erciyes Organ Nakli Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/esenler-belediyesi.png'
  where organization_name = 'Esenler Belediyesi';

update public.opportunities set organization_logo_url = '/kurum-logolari/eskisehir-ticaret-odasi.png'
  where organization_name = 'Eskişehir Ticaret Odası';

update public.opportunities set organization_logo_url = '/kurum-logolari/faydasicok-vakfi.png'
  where organization_name = 'Faydasıçok Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/genc-girisimciler-ve-yoneticiler-dernegi.png'
  where organization_name = 'Genç Girişimciler ve Yöneticiler Derneği';

update public.opportunities set organization_logo_url = '/kurum-logolari/guney-egitim-vakfi.png'
  where organization_name = 'Güney Eğitim Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/ihsan-arslan-vakfi.png'
  where organization_name = 'İhsan Arslan Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/iu-cerrahpasa-gelistirme-vakfi.png'
  where organization_name = 'İstanbul Üniversitesi-Cerrahpaşa Geliştirme Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/izzetpasa-vakfi.png'
  where organization_name = 'İzzetpaşa Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/kahev.png'
  where organization_name = 'Kadın Hekimler Eğitime Destek Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/mehmet-emin-akin-egitim-vakfi.png'
  where organization_name = 'Mehmet Emin Akın Eğitim Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/muhendis-kadinlar-dernegi.png'
  where organization_name = 'Mühendis Kadınlar Derneği';

update public.opportunities set organization_logo_url = '/kurum-logolari/mustafa-oncel-egitim-vakfi.png'
  where organization_name = 'Mustafa Öncel Eğitim Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/ogem-vakfi.png'
  where organization_name = 'Orman Genel Müdürlüğü Eğitim Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/saglik-ve-sosyal-yardim-vakfi.png'
  where organization_name = 'Sağlık ve Sosyal Yardım Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/sutas.png'
  where organization_name = 'Sütaş';

update public.opportunities set organization_logo_url = '/kurum-logolari/teknik-elemanlar-dernegi.png'
  where organization_name = 'Teknik Elemanlar Derneği';

update public.opportunities set organization_logo_url = '/kurum-logolari/turk-altin-isletmeleri.png'
  where organization_name = 'Türk Altın İşletmeleri';

update public.opportunities set organization_logo_url = '/kurum-logolari/fulbright.png'
  where organization_name = 'Türkiye Fulbright Komisyonu';

update public.opportunities set organization_logo_url = '/kurum-logolari/yesilay.png'
  where organization_name = 'Türkiye Yeşilay Cemiyeti';

update public.opportunities set organization_logo_url = '/kurum-logolari/urla-egitim-vakfi.png'
  where organization_name = 'Urla Eğitim Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/vitalen-vakfi.png'
  where organization_name = 'Vitalen Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/yagmur-damlasi-dernegi.png'
  where organization_name = 'Yağmur Damlası Yardımlaşma ve Dayanışma Derneği';

update public.opportunities set organization_logo_url = '/kurum-logolari/yeni-dunya-vakfi.png'
  where organization_name = 'Yeni Dünya Vakfı';

update public.opportunities set organization_logo_url = '/kurum-logolari/ytb.png'
  where organization_name = 'Yurtdışı Türkler ve Akraba Topluluklar Başkanlığı';

-- Kontrol: hangi kurumda logo var, hangisinde yok.
select organization_name, coalesce(organization_logo_url, '(baş harfler)') as logo
from public.opportunities
order by organization_logo_url nulls last, organization_name;
