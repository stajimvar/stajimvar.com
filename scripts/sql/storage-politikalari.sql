-- storage.objects ÜZERİNDEKİ POLİTİKALAR — KARŞILAŞTIRILABİLİR BİÇİMDE
--
-- Şema temel denetimi `public` ve `extensions` şemalarını dökümleyip
-- karşılaştırıyor; `storage` hiç bakılmayan bir alandı. Oysa CV erişimi,
-- avatar ve logo görünürlüğü orada tanımlı: en hassas yetki kurallarının
-- bir kısmı denetimin dışında kalıyordu. 30 Ağustos'ta bunun bedeli
-- ölçüldü — "avatar ve logo herkese acik" politikası üretimde vardı,
-- depoda yoktu; depodan kurulan her ortamda profil fotoğrafları ve kurum
-- logoları kırık görünürdü ve hiçbir test bunu yakalamıyordu.
--
-- Bütün storage şemasını dökümlemek yerine YALNIZCA kendi
-- politikalarımız karşılaştırılıyor: Supabase'in yönettiği tablolar
-- sürümden sürüme değişiyor ve karşılaştırmaya girseler kapı gürültüye
-- boğulurdu.
--
-- Çıktı sıralı ve deterministik; iki tarafta birebir aynı olmalı.
select coalesce(
         json_agg(
           json_build_object(
             'ad', polname,
             'komut', polcmd::text,
             'roller', roller,
             'kosul', coalesce(pg_get_expr(polqual, polrelid), ''),
             'kontrol', coalesce(pg_get_expr(polwithcheck, polrelid), '')
           )
           order by polname
         ),
         '[]'::json
       ) as politikalar
from (
  select p.*,
         coalesce((select string_agg(r.rolname, ',' order by r.rolname)
                   from pg_roles r where r.oid = any(p.polroles)), 'PUBLIC') as roller
  from pg_policy p
  where p.polrelid = 'storage.objects'::regclass
) p;
