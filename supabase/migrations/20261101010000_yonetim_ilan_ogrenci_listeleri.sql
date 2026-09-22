-- PANEL LİSTELERİ: İLANLAR VE ÖĞRENCİLER
--
-- İkisi de RPC, çünkü `listings` SELECT iznini sütun sütun veriyor ve
-- tarayıcıdan `select('*')` 42501 ile düşüyor; öğrenci listesi ise ad ve
-- e-posta içeriyor, bunlar `profiles` ve `auth.users` tablolarından
-- geliyor ve istemciye açık olmamalı.
--
-- SAYFALAMA VAR
-- -------------
-- 189 yayındaki ilan tek istekte çekilmiyor. Tamamını indirip tarayıcıda
-- süzmek bugün çalışırdı ama ilan sayısı arttıkça sessizce yavaşlardı;
-- süzme ve sayfalama en baştan sunucuda.

create or replace function public.yonetim_ilanlar(
  p_durum  text default null,
  p_kaynak text default null,
  p_arama  text default null,
  p_limit  int  default 50,
  p_ofset  int  default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  ara text := nullif(btrim(coalesce(p_arama, '')), '');
  sinir int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if not public.is_admin() then
    raise exception 'yonetim_ilanlar yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  with suzulmus as (
    select l.*, c.name as sirket_adi
    from listings l
    left join companies c on c.id = l.company_id
    where (p_durum is null  or l.status::text = p_durum)
      and (p_kaynak is null or l.origin::text = p_kaynak)
      and (ara is null
           or l.title ilike '%' || ara || '%'
           or c.name  ilike '%' || ara || '%'
           or l.city  ilike '%' || ara || '%')
  )
  select jsonb_build_object(
    'toplam', (select count(*) from suzulmus),

    -- Sayımlar SÜZGEÇTEN BAĞIMSIZ: sekmelerin üstündeki sayı, o sekmeye
    -- geçince kaç satır göreceğini söylemeli. Süzülmüş kümeden saymak,
    -- seçili sekme dışındaki her sayıyı sıfır gösterirdi.
    'durumSayimlari', (
      select coalesce(jsonb_object_agg(d, n), '{}'::jsonb)
      from (select status::text as d, count(*) as n from listings group by 1) x
    ),
    'kaynakSayimlari', (
      select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
      from (select origin::text as k, count(*) as n from listings group by 1) y
    ),

    'satirlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',         s.id,
               'baslik',     s.title,
               'sirket',     s.sirket_adi,
               'sehir',      s.city,
               'ulke',       s.country_code,
               'durum',      s.status::text,
               'kaynak',     s.origin::text,
               'calisma',    s.work_type::text,
               'basvuruYolu', s.application_method::text,
               'adres',      s.apply_url,
               'sonBasvuru', s.application_deadline,
               'kaynakDurumu', s.source_status,
               'olustu',     s.created_at
             ) order by s.created_at desc), '[]'::jsonb)
      from (select * from suzulmus order by created_at desc
            limit sinir offset greatest(coalesce(p_ofset, 0), 0)) s
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_ilanlar(text, text, text, int, int) from public, anon;
grant execute on function public.yonetim_ilanlar(text, text, text, int, int) to authenticated;


-- ÖĞRENCİLER
--
-- KİŞİSEL VERİ: ad ve e-posta yalnız yöneticiye dönüyor ve tablo
-- istemciye hiç açılmıyor. "Son görülme" sitedeki ziyaret ölçümünden
-- geliyor; ölçüm 22 Eylül'de kurulduğu için ondan önceki ziyaretler
-- bilinmiyor ve bu alan boş dönüyor. Boş olmak, "hiç girmedi" demek
-- değil ve ekranda da öyle yazmıyor.

create or replace function public.yonetim_ogrenciler(
  p_arama text default null,
  p_limit int  default 50,
  p_ofset int  default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  ara text := nullif(btrim(coalesce(p_arama, '')), '');
  sinir int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if not public.is_admin() then
    raise exception 'yonetim_ogrenciler yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  with temel as (
    select sp.id,
           p.full_name,
           u.email,
           sp.university, sp.faculty, sp.department, sp.grade_level,
           sp.city, sp.is_open_to_offers, sp.updated_at,
           (select count(*) from applications a where a.student_id = sp.id) as basvuru,
           (select max(o.olustu_at) from site_olaylari o where o.kullanici_id = sp.id) as son_gorulme
    from student_profiles sp
    left join profiles p on p.id = sp.id
    left join auth.users u on u.id = sp.id
  ),
  suzulmus as (
    select * from temel
    where ara is null
       or full_name  ilike '%' || ara || '%'
       or email      ilike '%' || ara || '%'
       or university ilike '%' || ara || '%'
       or department ilike '%' || ara || '%'
  )
  select jsonb_build_object(
    'toplam', (select count(*) from suzulmus),
    'satirlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',          s.id,
               'ad',          s.full_name,
               'eposta',      s.email,
               'okul',        s.university,
               'fakulte',     s.faculty,
               'bolum',       s.department,
               'sinif',       s.grade_level,
               'sehir',       s.city,
               'teklifeAcik', s.is_open_to_offers,
               'basvuru',     s.basvuru,
               'sonGorulme',  s.son_gorulme,
               'guncellendi', s.updated_at
             ) order by s.updated_at desc nulls last), '[]'::jsonb)
      from (select * from suzulmus order by updated_at desc nulls last
            limit sinir offset greatest(coalesce(p_ofset, 0), 0)) s
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_ogrenciler(text, int, int) from public, anon;
grant execute on function public.yonetim_ogrenciler(text, int, int) to authenticated;
