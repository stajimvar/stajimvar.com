-- POLİTİKADAN ÇAĞRILAN YARDIMCI anon TARAFINDAN DA ÇALIŞTIRILABİLMELİ
--
-- CI YAKALADI
-- -----------
-- `Supabase disposable security tests` koşusu düştü:
--
--   GUVENLIK REGRESYONU BASARISIZ: politikadan cagrilan fonksiyonda
--   EXECUTE yok: anon -> sirket_basvuru_yazabilir(uuid)
--
-- Kural (scripts/sql/rls-regresyon-testleri.sql): bir politikanın
-- KAPSADIĞI her rol, o politikanın ifadesinde geçen her fonksiyonu
-- çalıştırabilmeli. 20261122010000'in yazdığı
-- "dogrulanmis sirket basvuru durumu gunceller" politikası rol
-- kapsamı BELİRTMEDİĞİ için PUBLIC — yani `anon` da kapsamda.
-- Fonksiyondan `anon`un EXECUTE hakkı alınmıştı.
--
-- NEDEN GRANT, NEDEN POLİTİKAYI DARALTMAK DEĞİL
-- ---------------------------------------------
-- Politikaya `to authenticated` eklemek de hatayı susturdu ama
-- deponun kurulu düzenini değiştirirdi: `is_company_member`,
-- `sirket_dogrulandi` ve `is_admin` üretimde `anon`a AÇIK ve aynı
-- politikalarda kullanılıyorlar (ölçüldü, 5 Ekim 2026). Yardımcıyı
-- aynı hizaya getirmek, politika kapsamını tek başına değiştirmekten
-- daha küçük ve daha tutarlı bir değişiklik.
--
-- GÜVENLİK KAYBI YOK
-- ------------------
-- `anon` oturumunda `auth.uid()` null; fonksiyon `company_members`
-- içinde eşleşme bulamıyor ve HER ZAMAN false dönüyor. Yani `anon`
-- bu işlevi çalıştırabiliyor ama ondan "yazabilir" cevabı alamıyor.
-- Fonksiyonun kendisi de şirket doğrulamasını soruyor
-- (20261129010000), o koşul da yerinde duruyor.
--
-- `sirket_adaylarini_gorebilir` BU GÖÇTE AÇILMIYOR: onu çağıran tek
-- politika (`sirket degerlendirmeleri gorur`) `to authenticated` ile
-- yazıldı, yani `anon` kapsamda değil. Gerekmeyen yetkiyi vermemek
-- için olduğu gibi bırakılıyor; kural ileride o politika
-- genişletilirse zaten yeniden yakalar.

grant execute on function public.sirket_basvuru_yazabilir(uuid) to anon;

comment on function public.sirket_basvuru_yazabilir(uuid) is
  'Başvuruya yazma kapısı: şirket DOĞRULANMIŞ olmalı ve üye Owner/Recruiter olmalı. Viewer false alır. anon da çağırabiliyor (politika kapsamı gereği) ve her zaman false alıyor.';
