-- One complete, server-filtered catalog. 24 is a page size, never a total cap.
-- Existing list/detail RPCs remain unchanged for older clients.
create or replace function public.normalize_discover_search(p_value text)
returns text language sql immutable parallel safe set search_path = public as $$
  select translate(lower(translate(coalesce(p_value,''),'Iİ','ıi')),'çğıöşüâîû','cgiosuaiu');
$$;

create index if not exists discover_events_catalog_newest_idx
  on public.discover_events(created_at desc,id desc) where status='published';

create or replace function public.get_discover_catalog(
  p_query text default null, p_city text default null, p_category text default null,
  p_period text default 'all', p_free boolean default false, p_discount boolean default false,
  p_sort text default 'newest', p_cursor_value timestamptz default null,
  p_cursor_id uuid default null, p_snapshot timestamptz default null
)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  watermark timestamptz := least(coalesce(p_snapshot,now()),now());
  day_start timestamp := date_trunc('day',now() at time zone 'Europe/Istanbul');
  range_start timestamptz; range_end timestamptz;
  needle text := public.normalize_discover_search(trim(left(coalesce(p_query,''),200)));
  result jsonb;
begin
  if p_sort is null or p_sort not in ('newest','upcoming') then raise exception 'Geçersiz sıralama (sort)' using errcode='22023'; end if;
  if p_period is null or p_period not in ('all','today','week','month') then raise exception 'Geçersiz tarih filtresi' using errcode='22023'; end if;
  if (p_cursor_value is null) <> (p_cursor_id is null) or (p_cursor_id is not null and p_snapshot is null) then
    raise exception 'Eksik sayfalama imleci (cursor)' using errcode='22023';
  end if;
  if p_period in ('today','week') then
    range_start := day_start at time zone 'Europe/Istanbul';
    range_end := (day_start + case when p_period='today' then interval '1 day' else interval '8 days' end) at time zone 'Europe/Istanbul';
  elsif p_period='month' then
    range_start := date_trunc('month',day_start) at time zone 'Europe/Istanbul';
    range_end := (date_trunc('month',day_start)+interval '1 month') at time zone 'Europe/Istanbul';
  end if;
  with active as materialized (
    select r.* from public.list_active_discover_events(range_start,range_end) r where r.created_at <= watermark
  ), searched as materialized (
    select a.* from active a where needle='' or strpos(public.normalize_discover_search(concat_ws(' ',
      a.title,a.city,a.district,a.venue_name,a.organizer,
      case a.category when 'exhibition' then 'Sergi' when 'museum' then 'Müze' when 'festival' then 'Festival'
        when 'fair' then 'Fuar' when 'theatre' then 'Tiyatro' when 'concert' then 'Konser'
        when 'workshop' then 'Atölye' when 'university' then 'Üniversite etkinliği'
        when 'city_route' then 'Şehir rotası' when 'day_trip' then 'Günübirlik gezi' else a.category end)),needle)>0
  ), local_matches as materialized (
    select s.* from searched s where nullif(p_city,'') is null or s.city=p_city
  ), filtered as materialized (
    select m.*,case when p_sort='newest' then m.created_at else m.occurrence_starts_at end as sort_value
    from local_matches m where (nullif(p_category,'') is null or m.category=p_category)
      and (not coalesce(p_free,false) or m.is_free) and (not coalesce(p_discount,false) or m.has_student_discount)
  ), candidates as materialized (
    select f.* from filtered f where p_cursor_id is null
      or (p_sort='newest' and (f.sort_value,f.id)<(p_cursor_value,p_cursor_id))
      or (p_sort='upcoming' and (f.sort_value,f.id)>(p_cursor_value,p_cursor_id))
    order by case when p_sort='newest' then f.sort_value end desc, case when p_sort='newest' then f.id end desc,
      case when p_sort='upcoming' then f.sort_value end asc, case when p_sort='upcoming' then f.id end asc limit 25
  ), numbered as (
    select c.*,row_number() over(order by case when p_sort='newest' then c.sort_value end desc,
      case when p_sort='newest' then c.id end desc, case when p_sort='upcoming' then c.sort_value end asc,
      case when p_sort='upcoming' then c.id end asc) as position from candidates c
  ), page as materialized (select * from numbered where position<=24)
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(p)-'sort_value'-'position' order by position) from page p),'[]'::jsonb),
    'total',(select count(*) from filtered),'hasMore',(select count(*)>24 from candidates),
    'nextCursor',case when (select count(*)>24 from candidates) then
      (select jsonb_build_object('value',sort_value,'id',id) from page order by position desc limit 1) else null end,
    'snapshot',watermark,'facets',jsonb_build_object(
      'cities',coalesce((select jsonb_agg(city order by city) from (select distinct city from active) cities),'[]'::jsonb),
      'categories',coalesce((select jsonb_object_agg(category,amount) from (
        select category,count(*) as amount from local_matches where (not coalesce(p_free,false) or is_free)
          and (not coalesce(p_discount,false) or has_student_discount) group by category) categories),'{}'::jsonb),
      'free',(select count(*) from local_matches where is_free and (nullif(p_category,'') is null or category=p_category)
        and (not coalesce(p_discount,false) or has_student_discount)),
      'discount',(select count(*) from local_matches where has_student_discount
        and (nullif(p_category,'') is null or category=p_category) and (not coalesce(p_free,false) or is_free)))) into result;
  return result;
end;
$$;

revoke all on function public.normalize_discover_search(text) from public;
grant execute on function public.normalize_discover_search(text) to anon,authenticated;
revoke all on function public.get_discover_catalog(text,text,text,text,boolean,boolean,text,timestamptz,uuid,timestamptz) from public;
grant execute on function public.get_discover_catalog(text,text,text,text,boolean,boolean,text,timestamptz,uuid,timestamptz) to anon,authenticated;
