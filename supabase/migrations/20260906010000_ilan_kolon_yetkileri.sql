-- ŞİRKET KENDİ İLANINI YÖNETSİN, PLATFORMUN SİNYALLERİNİ YÖNETMESİN
--
-- RLS bir şirketi kendi SATIRLARIYLA sınırlıyor ama Postgres'te satır
-- güvenliği KOLON güvenliği değildir: kendi ilanı üzerinde bir şirket,
-- `authenticated` rolünün tablo düzeyindeki UPDATE yetkisiyle her kolona
-- yazabiliyordu. Yani şirket kendi ilanının
--
--   source_status       = 'acik'
--   source_verified_at  = now()
--   source_checked_at   = now()
--   last_seen_at        = now()
--
-- alanlarını elle doldurup ilanı platform tarafından "az önce
-- doğrulanmış" gibi gösterebiliyordu. Bu alanlar öğrenciye tazelik ve
-- güven sinyali olarak gösteriliyor (InternshipCard'daki "son kontrol"
-- satırı); onları ilan sahibinin yazabilmesi, sinyali anlamsız kılar.
--
-- ÇÖZÜM: TABLO DÜZEYİ YAZMA YETKİSİNİ KALDIR, KOLON BAZINDA VER
--
-- Bu şemada okuma yetkisi zaten kolon bazında veriliyor
-- (scripts/sql/listings-kolon-yetkileri.sql); yazma da aynı desene
-- geçiyor. RPC'ye taşımak daha büyük bir değişiklik olurdu ve buradaki
-- sorunu kolon yetkisinden daha iyi çözmezdi.
--
-- SELECT ve DELETE'e DOKUNULMUYOR. Panel ilanı silmiyor, 'closed'
-- durumuna alıyor; mevcut davranış korunuyor.
--
-- service_role tablo düzeyinde tam yetkili kalıyor: tarama otomasyonu ve
-- Edge Function sistem alanlarını yazmaya devam ediyor.

revoke insert, update on public.listings from authenticated;

-- ---------------------------------------------------------------- INSERT
--
-- İlan açarken şirketin gönderebileceği alanlar. `company_id` ve `origin`
-- yalnızca burada: ilan bir kez açıldıktan sonra hangi şirkete ait
-- olduğu ve nereden geldiği değişmemeli.
--
-- Sistem alanları listede YOK. Şirket istek gövdesine `source_status`
-- eklese bile Postgres "permission denied for column" ile reddediyor;
-- alan sessizce yok sayılmıyor, istek düşüyor. Alanlar şemadaki güvenli
-- varsayılanlarından başlıyor: source_status NULL (hiç bakılmadı),
-- doğrulama damgaları NULL, applicants_count 0, featured false.
grant insert (
  company_id, origin,
  title, department, city, work_type, term, duration, description,
  application_deadline, min_grade_level,
  required_skills, preferred_skills, responsibilities, perks, category,
  mandatory_staj_accepted, voluntary_staj_accepted,
  is_paid, stipend_text, insurance_note,
  apply_url, application_method, status, posted_at
) on public.listings to authenticated;

-- ---------------------------------------------------------------- UPDATE
--
-- Düzenlenebilir alanlar aynı; `company_id` ve `origin` düşüyor.
--
-- `status` ve `posted_at` listede: panel ilanı yayınlıyor, taslağa alıyor
-- ve kapatıyor; yönetici kuyruğu da yayınlıyor/arşivliyor. Yayına çıkma
-- kararı ayrıca `guard_listing_publish` tetikleyicisiyle korunuyor —
-- yetki vermek yayın hakkı vermiyor.
--
-- `posted_at` şirketin KENDİ yayın tarihi beyanı; platformun doğrulama
-- damgası değil. Arayüz ikisini ayırıyor: kaynaktan doğrulanmamış tarihe
-- "yayınlandı" değil "eklendi" diyor.
grant update (
  title, department, city, work_type, term, duration, description,
  application_deadline, min_grade_level,
  required_skills, preferred_skills, responsibilities, perks, category,
  mandatory_staj_accepted, voluntary_staj_accepted,
  is_paid, stipend_text, insurance_note,
  apply_url, application_method, status, posted_at
) on public.listings to authenticated;
