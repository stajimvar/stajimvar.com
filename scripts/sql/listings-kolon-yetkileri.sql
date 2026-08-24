-- İlan tablosunun okuma yetkisini tasarımdaki hâline geri getirir.
--
-- NE OLDU
-- -------
-- 24 Ağustos'ta ölçüldü: üretimde `public.listings` tablosunda `anon` ve
-- `authenticated` rollerinin SELECT yetkisi YOKTU. Yazma yetkileri
-- (INSERT/UPDATE/DELETE) duruyordu, okuma düşmüştü.
--
-- Sonucu şuydu: site ziyaretçiye ilan gösteremiyordu. Ön render edilen HTML
-- (derleme sırasında servis anahtarıyla üretiliyor) ilanları içerdiği için
-- sayfa kaynağında ilanlar görünüyordu; ama tarayıcıda uygulama açılınca
-- sorgu 401 "permission denied for table listings" dönüyor ve liste boş
-- kalıyordu. Yani hata, sayfa kaynağına bakarak fark edilemiyordu.
--
-- Sebep, migration soyunun üretimle ayrışması: 0005_discovery_pipeline.sql
-- bu yetkileri veriyor, üretimde uygulanmamış ya da sonradan düşmüş.
--
-- NEDEN TABLO DEĞİL KOLON
-- -----------------------
-- Bu şemada okuma yetkisi kolon bazında veriliyor. Beyaz listede olmayan
-- kolonlar bilerek dışarıda: `raw` (kaynağın ham cevabı), `content_hash`,
-- `raw_listing_id`, `source_listing_id`, `imported_at`, `first_seen_at`,
-- `deactivated_at`, `deactivation_reason`. Bunlar iç işleyişe ait ve
-- ziyaretçinin görmesi için bir sebep yok.
--
-- Olayın ilk anında tablo geneline SELECT verildi (site derhal açılsın
-- diye); bu betik onu geri alıp beyaz listeye döndürüyor.
--
-- last_seen_at LİSTEYE EKLENDİ
-- ----------------------------
-- Kartlarda "Son kontrol: bugün" rozeti bu alandan geliyor. Sitenin en
-- ayırt edici iddiası kaynağı sürekli doğrulaması; tarih görünmezse iddia
-- kanıtsız kalıyor. Alan yalnızca bir zaman damgası, kişisel veri değil.
--
-- Satır güvenliği (RLS) ayrı ve açık: "yayindaki ilanlar herkese acik"
-- politikası yalnızca status='published' satırları veriyor. Kolon yetkisi
-- vermek taslak ilanları açmaz.
--
-- Kullanım: Supabase SQL Editor'de çalıştır.

revoke select on public.listings from anon, authenticated;

grant select (
  id, company_id, title, department, work_type, city,
  mandatory_staj_accepted, voluntary_staj_accepted,
  is_paid, stipend_text, duration, term, application_deadline, min_grade_level,
  required_skills, preferred_skills, description, responsibilities, perks,
  category, featured, status, applicants_count, posted_at, created_at, updated_at,
  origin, source_id, source_url, canonical_url, apply_url,
  application_method, application_channel_id, insurance_note,
  last_seen_at
) on public.listings to anon, authenticated;

-- Kontrol: anon hangi kolonları okuyabiliyor (beyaz liste kadar olmalı) ve
-- tablo geneline yetki kalmamış olmalı.
select count(*) as anon_okuyabildigi_kolon
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'listings'
  and grantee = 'anon' and privilege_type = 'SELECT';

select coalesce(string_agg(privilege_type, ','), 'tablo geneli yetki yok') as anon_tablo_yetkisi
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'listings' and grantee = 'anon';
