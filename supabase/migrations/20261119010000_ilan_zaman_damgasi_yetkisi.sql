-- =====================================================================
-- ŞİRKET KENDİ İLANINI DÜZENLEYEMİYORDU — zaman damgası tetikleyicisi
-- =====================================================================
--
-- OLAY (4 Ekim 2026)
-- ------------------
-- Şirket panelinde "Değişiklikleri kaydet" her seferinde "Bu ilanı
-- düzenleme yetkin görünmüyor." diyordu. Postgres günlüğü (17:11, üç
-- deneme):
--
--     permission denied for function listings_normalize_alanlari
--
-- NEDEN
-- -----
-- 20261025010000 `t4` tetikleyicisini `listings_zaman_damgalari()`ye
-- bağladı ve iki yardımcıyı (`listings_normalize_alanlari`,
-- `listings_anlamli_alanlar`) `authenticated`'dan geri aldı. Ama
-- tetikleyici fonksiyonu SECURITY INVOKER: gövdesi, güncellemeyi yapan
-- kullanıcının yetkisiyle çalışıyor ve o kullanıcı yardımcıları
-- çağıramıyor. Otomasyon (service_role) ve yönetici etkilenmediği için
-- fark edilmedi; şirket üyesinin HER `listings` UPDATE'i düşüyordu
-- (düzenleme, kapatma, arşivleme).
--
-- Canlıda tarandı: kullanıcı yetkisiyle çalışan tetikleyicilerden,
-- `authenticated`'ın çalıştıramadığı bir işlevi çağıran tek örnek bu.
--
-- DÜZELTME
-- --------
-- Tetikleyici fonksiyonu SECURITY DEFINER yapılıyor; yardımcılar kapalı
-- kalıyor. Davranış değişmiyor:
--   · fonksiyon yalnız NEW'deki iki zaman damgasını ayarlıyor, başka
--     tabloya dokunmuyor;
--   · kullanıcı hangi kolonları yazabileceğini UPDATE ifadesinin kendi
--     kolon yetkisinden alıyor (tetikleyiciden önce denetleniyor);
--     `updated_at` / `content_updated_at` yazma yetkisi hâlâ yok;
--   · tetikleyici fonksiyonu doğrudan çağrılamaz (`returns trigger`) ve
--     EXECUTE zaten geri alınmış.
-- Öteki `listings` tetikleyicileri (yayın kapısı, başvuru kanalı, alan
-- doldurma) zaten SECURITY DEFINER.

alter function public.listings_zaman_damgalari() security definer;
alter function public.listings_zaman_damgalari() set search_path = public, pg_temp;

revoke all on function public.listings_zaman_damgalari() from public, anon, authenticated;
