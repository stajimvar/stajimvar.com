-- KAYNAĞIN KENDİ İLAN ADI
--
-- Dış kaynaktan gelen ilanlar Türkçeye çevrilerek kaydediliyordu ve
-- çeviri, başlığın ÜZERİNE yazıyordu: `translate_job` adaptör
-- çıktısındaki başlığı değiştirip öyle depoluyordu. Sonuç ölçüldü —
-- yayındaki 9 ilanın 9'unda da şirketin resmî ilan adı kayıptı, hem
-- `listings` hem `raw_listings` hem de `raw` JSON'unda yalnız çeviri
-- vardı.
--
-- Bu, iki şeyi imkânsız kılıyordu: ilan detayında "Resmî ilan adı: ..."
-- şeffaflığını göstermek ve kötü bir çeviriyi orijinaline dönerek
-- düzeltmek.
--
-- Çeviri bir GÖRÜNÜM katmanı; kaynak veriyi değiştiremez. `title`
-- kullanıcıya gösterilen ad, `source_title` şirketin kendi kaynağında
-- gördüğümüz ad.
--
-- Şirketin StajımVar'da kendi açtığı ilanlarda bu alan boş kalıyor:
-- orada başlığı zaten şirket yazıyor, yani `title` canonical.
alter table public.listings
  add column if not exists source_title text;

comment on column public.listings.source_title is
  'Şirketin resmî kaynağında görünen ilan adı. Çeviri bu alanı değiştirmez; '
  'yalnız dış kaynaklı ilanlarda dolu olur.';
