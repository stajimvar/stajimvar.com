-- PANEL LİSTELERİ: BAŞVURULAR, ŞİRKETLER, TARAMA
--
-- Üçü de RPC: `listings` ve `companies` SELECT iznini sütun sütun veriyor,
-- `applications` üzerinde ise yöneticiyi kapsayan bir RLS politikası yok.
-- Tarayıcıdan okumak üçünde de sessizce sıfır döndürürdü.

-- BAŞVURULAR
--
-- Yalnız site içinde alınan başvurular var; zaten başka türlüsü yok.
-- Kariyer sayfasına yönlendirilen ilanda başvuru kaydı OLUŞMUYOR ve
-- ölçüldü: yayındaki 189 ilanın hiçbiri site içi başvuru almıyor. Bu
-- yüzden ekranda 6 başvuru görünürken 189 ilan yayında olması bir
-- tutarsızlık değil; sayfa bunu yazıyor.

create or replace function public.yonetim_basvurular(
  p_durum text default null,
  p_limit int default 50,
  p_ofset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  sinir int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if not public.is_admin() then
    raise exception 'yonetim_basvurular yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  with suzulmus as (
    select a.id, a.status::text as durum, a.applied_at, a.submitted_at,
           a.status_changed_at, a.interview_date,
           p.full_name as ogrenci, l.title as ilan, c.name as sirket
    from applications a
    left join profiles  p on p.id = a.student_id
    left join listings  l on l.id = a.listing_id
    left join companies c on c.id = l.company_id
    where p_durum is null or a.status::text = p_durum
  )
  select jsonb_build_object(
    'toplam', (select count(*) from suzulmus),
    -- Sayımlar süzgeçten bağımsız: düğmedeki sayı, basınca kaç satır
    -- göreceğini söylemeli.
    'durumSayimlari', (
      select coalesce(jsonb_object_agg(d, n), '{}'::jsonb)
      from (select status::text as d, count(*) as n from applications group by 1) x
    ),
    'satirlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', s.id, 'durum', s.durum, 'ogrenci', s.ogrenci,
               'ilan', s.ilan, 'sirket', s.sirket,
               'basvurdu', coalesce(s.submitted_at, s.applied_at),
               'durumDegisti', s.status_changed_at,
               'gorusme', s.interview_date
             ) order by coalesce(s.submitted_at, s.applied_at) desc), '[]'::jsonb)
      from (select * from suzulmus
            order by coalesce(submitted_at, applied_at) desc
            limit sinir offset greatest(coalesce(p_ofset, 0), 0)) s
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_basvurular(text, int, int) from public, anon;
grant execute on function public.yonetim_basvurular(text, int, int) to authenticated;


-- ŞİRKETLER
--
-- Sahiplenilmiş / sahipsiz ayrımı ve şirket başına yayındaki ilan sayısı.
-- Alan adı eşleşmesi otomatik onaylanmıyor; o bir ipucu, kanıt değil ve
-- karar onay kuyruğunda elle veriliyor.

create or replace function public.yonetim_sirketler(
  p_sahiplenme text default null,   -- 'sahiplenmis' | 'sahipsiz' | null
  p_arama text default null,
  p_limit int default 50,
  p_ofset int default 0
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
    raise exception 'yonetim_sirketler yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  with temel as (
    select c.id, c.name, c.claimed_at,
           (select count(*) from listings l
             where l.company_id = c.id and l.status = 'published') as yayinda,
           (select count(*) from listings l
             where l.company_id = c.id and l.status = 'draft') as taslak
    from companies c
  ),
  suzulmus as (
    select * from temel
    where (p_sahiplenme is null
           or (p_sahiplenme = 'sahiplenmis' and claimed_at is not null)
           or (p_sahiplenme = 'sahipsiz'    and claimed_at is null))
      and (ara is null or name ilike '%' || ara || '%')
  )
  select jsonb_build_object(
    'toplam', (select count(*) from suzulmus),
    'sahiplenmisToplam', (select count(*) from temel where claimed_at is not null),
    'sahipsizToplam',    (select count(*) from temel where claimed_at is null),
    'satirlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', s.id, 'ad', s.name,
               'sahiplenildi', s.claimed_at,
               'yayinda', s.yayinda, 'taslak', s.taslak
             ) order by s.yayinda desc, s.name), '[]'::jsonb)
      from (select * from suzulmus order by yayinda desc, name
            limit sinir offset greatest(coalesce(p_ofset, 0), 0)) s
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_sirketler(text, text, int, int) from public, anon;
grant execute on function public.yonetim_sirketler(text, text, int, int) to authenticated;


-- TARAMA
--
-- 83 kaynağın durumu. Her kaynağın SON koşusu alınıyor; bütün koşuları
-- saymak 25 binden fazla satır demek ve panelin sorusu "hangi kaynak
-- bozuk" -- "toplam kaç kez çalıştı" değil.
--
-- KAPALI KAYNAK BOZUK DEĞİLDİR
-- ----------------------------
-- `is_enabled = false` olan kaynak bilerek kapatılmış olabilir. Onu
-- "başarısız" saymak, gerçek arızayı gürültüye gömerdi; ayrı sayılıyor.

create or replace function public.yonetim_tarama()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
begin
  if not public.is_admin() then
    raise exception 'yonetim_tarama yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  with son_kosu as (
    select distinct on (r.source_id)
           r.source_id, r.status::text as durum, r.started_at, r.finished_at,
           r.fetched_count, r.created_count, r.updated_count, r.error_text
    from import_runs r
    order by r.source_id, r.started_at desc
  ),
  kaynak as (
    select s.id, s.name, s.adapter, s.is_enabled, s.trust,
           s.last_run_at, s.last_success_at,
           k.durum, k.started_at, k.fetched_count, k.created_count,
           left(k.error_text, 200) as hata
    from sources s
    left join son_kosu k on k.source_id = s.id
  )
  select jsonb_build_object(
    'kaynakSayisi', (select count(*) from kaynak),
    'acik',         (select count(*) from kaynak where is_enabled),
    'kapali',       (select count(*) from kaynak where not is_enabled),

    -- Yalnız AÇIK kaynakların son durumu sayılıyor: kapalı kaynağın eski
    -- bir hatası bugünün sağlığı hakkında bir şey söylemiyor.
    'sonDurumSayimlari', (
      select coalesce(jsonb_object_agg(d, n), '{}'::jsonb)
      from (select coalesce(durum, 'hiç çalışmadı') as d, count(*) as n
            from kaynak where is_enabled group by 1) x
    ),

    'son7Gun', (
      select coalesce(jsonb_object_agg(d, n), '{}'::jsonb)
      from (select status::text as d, count(*) as n from import_runs
            where started_at > now() - interval '7 days' group by 1) y
    ),

    'sonKosu', (select max(started_at) from import_runs),

    -- Sorunlu kaynaklar önce: panelin işi arızayı göstermek.
    'kaynaklar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', k.id, 'ad', k.name, 'adaptor', k.adapter,
               'acik', k.is_enabled, 'guven', k.trust,
               'sonDurum', k.durum, 'sonKosu', k.started_at,
               'sonBasari', k.last_success_at,
               'bulunan', k.fetched_count, 'eklenen', k.created_count,
               'hata', k.hata
             ) order by
               case when not k.is_enabled then 3
                    when k.durum = 'failed' then 0
                    when k.durum = 'partial' then 1
                    else 2 end,
               k.started_at desc nulls first), '[]'::jsonb)
      from kaynak k
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_tarama() from public, anon;
grant execute on function public.yonetim_tarama() to authenticated;
