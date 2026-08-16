-- =============================================================================
-- API rollerindeki fazla yetkileri geri al
-- =============================================================================
--
-- BULGU
-- -----
-- `anon` rolünün public şemasındaki neredeyse her tabloda TRUNCATE, DELETE,
-- UPDATE ve INSERT yetkisi vardı. Satır güvenliği (RLS) her tabloda açık ve
-- politikalar doğru yazılmış — ama iki sorun var:
--
--   * TRUNCATE, RLS TARAFINDAN FİLTRELENMEZ. Tablo düzeyinde bir işlem
--     olduğu için politikalara hiç bakılmaz. Yetki duruyorsa tablo boşaltmayı
--     engelleyen tek şey, PostgREST'in bu komutu dışarı açmıyor olması kalır.
--   * Yazma yetkisinin durması, ileride yanlışlıkla gevşek yazılmış tek bir
--     politikanın doğrudan veri kaybına dönüşmesi demek.
--
-- `anon` = tarayıcıdaki herkes. Sitede giriş yapmadan yazılan hiçbir şey yok;
-- kayıt sırasında profil oluşturma tetikleyiciyle sunucu tarafında çalışıyor.
-- Bu yüzden anon'un hiçbir yazma yetkisine ihtiyacı yok.
--
-- Bu yetkiler elle verilmedi; Supabase'in varsayılan şema izinlerinden geldi.
-- O yüzden ALTER DEFAULT PRIVILEGES ile ileride açılacak tablolarda da
-- tekrarlanması engelleniyor.

do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
  loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t.relname);
    execute format('revoke insert, update, delete on public.%I from anon', t.relname);
  end loop;
end $$;

alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema public
  revoke insert, update, delete on tables from anon;

-- Doğrulandı (uygulandıktan sonra ölçüldü):
--   anon          -> yalnızca SELECT, 18 tablo
--   authenticated -> DELETE, INSERT, SELECT, UPDATE (TRUNCATE yok), 20 tablo
-- Site tarafı bozulmadı: ilanlar, şirketler ve test soruları 200 dönüyor;
-- anon ile şirket ekleme denemesi 401.
