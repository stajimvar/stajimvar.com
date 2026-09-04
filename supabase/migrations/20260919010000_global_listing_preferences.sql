-- Additive global preferences and listing geography. Existing city/work_type stay canonical.
alter table public.profiles
  add column if not exists interface_language text,
  add column if not exists content_language text,
  add column if not exists home_country text;

alter table public.student_profiles
  add column if not exists preferred_job_countries text[] not null default '{}';

alter table public.listings
  add column if not exists country_code text,
  add column if not exists original_language text,
  add column if not exists international_applicants boolean,
  add column if not exists visa_sponsorship boolean;

alter table public.profiles
  add constraint profiles_interface_language_iso check(interface_language is null or interface_language ~ '^[a-z]{2}$'),
  add constraint profiles_content_language_iso check(content_language is null or content_language ~ '^[a-z]{2}$'),
  add constraint profiles_home_country_iso check(home_country is null or home_country ~ '^[A-Z]{2}$');

create or replace function public.valid_country_code_array(p_codes text[])
returns boolean language sql immutable parallel safe set search_path=public as $$
  select coalesce(array_length(p_codes,1),0)=coalesce((select count(distinct code) from unnest(p_codes) code),0)
    and not exists(select 1 from unnest(p_codes) code where code !~ '^[A-Z]{2}$');
$$;

alter table public.student_profiles
  add constraint student_profiles_preferred_countries_valid check(public.valid_country_code_array(preferred_job_countries));
alter table public.listings
  add constraint listings_country_code_iso check(country_code is null or country_code ~ '^[A-Z]{2}$'),
  add constraint listings_original_language_iso check(original_language is null or original_language ~ '^[a-z]{2}$');

-- Conservative backfill: location only. Titles, Remote/Global and unknown values are never evidence.
with location_map(label,code) as (values
  ('adana','TR'),('adiyaman','TR'),('afyonkarahisar','TR'),('agri','TR'),('aksaray','TR'),('amasya','TR'),('ankara','TR'),('antalya','TR'),('ardahan','TR'),('artvin','TR'),('aydin','TR'),('balikesir','TR'),('bartin','TR'),('batman','TR'),('bayburt','TR'),('bilecik','TR'),('bingol','TR'),('bitlis','TR'),('bolu','TR'),('burdur','TR'),('bursa','TR'),('canakkale','TR'),('cankiri','TR'),('corum','TR'),('denizli','TR'),('diyarbakir','TR'),('duzce','TR'),('edirne','TR'),('elazig','TR'),('erzincan','TR'),('erzurum','TR'),('eskisehir','TR'),('gaziantep','TR'),('giresun','TR'),('gumushane','TR'),('hakkari','TR'),('hatay','TR'),('igdir','TR'),('isparta','TR'),('istanbul','TR'),('izmir','TR'),('kahramanmaras','TR'),('karabuk','TR'),('karaman','TR'),('kars','TR'),('kastamonu','TR'),('kayseri','TR'),('kilis','TR'),('kirikkale','TR'),('kirklareli','TR'),('kirsehir','TR'),('kocaeli','TR'),('konya','TR'),('kutahya','TR'),('malatya','TR'),('manisa','TR'),('mardin','TR'),('mersin','TR'),('mugla','TR'),('mus','TR'),('nevsehir','TR'),('nigde','TR'),('ordu','TR'),('osmaniye','TR'),('rize','TR'),('sakarya','TR'),('samsun','TR'),('sanliurfa','TR'),('siirt','TR'),('sinop','TR'),('sirnak','TR'),('sivas','TR'),('tekirdag','TR'),('tokat','TR'),('trabzon','TR'),('tunceli','TR'),('usak','TR'),('van','TR'),('yalova','TR'),('yozgat','TR'),('zonguldak','TR'),
  ('turkiye','TR'),('turkey','TR'),('berlin','DE'),('germany','DE'),('paris','FR'),('france','FR'),('london','GB'),('united kingdom','GB'),('amsterdam','NL'),('netherlands','NL'),('new york','US'),('united states','US')
), folded as (
  select id,lower(translate(coalesce(city,''),'ÇĞİÖŞÜçğıöşü','CGIOSUcgiosu')) value from public.listings where country_code is null
), inferred as (
  select f.id,min(m.code) code,count(distinct m.code) code_count
  from folded f join location_map m on f.value ~ ('(^|[^a-z])'||m.label||'([^a-z]|$)')
  group by f.id
)
update public.listings l set country_code=i.code from inferred i where l.id=i.id and i.code_count=1;

create index if not exists listings_published_country_posted_idx
  on public.listings(country_code,posted_at desc,id) where status='published';

create or replace function public.get_published_listings_catalog(
  p_country text default 'all',
  p_cursor_posted_at timestamptz default null,
  p_cursor_id uuid default null,
  p_snapshot timestamptz default null
)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare
  watermark timestamptz:=least(coalesce(p_snapshot,now()),now());
  result jsonb;
begin
  if p_country is null or not (p_country in ('all','remote') or p_country ~ '^[A-Z]{2}$') then
    raise exception 'Geçersiz ülke filtresi' using errcode='22023';
  end if;
  if (p_cursor_posted_at is null)<>(p_cursor_id is null) or (p_cursor_id is not null and p_snapshot is null) then
    raise exception 'Eksik sayfalama imleci' using errcode='22023';
  end if;
  with active as materialized (
    select l.*,coalesce(l.posted_at,l.created_at) sort_value from public.listings l
    where l.status='published' and l.created_at<=watermark
  ), filtered as materialized (
    select * from active where p_country='all'
      or (p_country='remote' and work_type='Remote')
      or (p_country not in ('all','remote') and country_code=p_country)
  ), candidates as materialized (
    select * from filtered where p_cursor_id is null or (sort_value,id)<(p_cursor_posted_at,p_cursor_id)
    order by sort_value desc,id desc limit 25
  ), numbered as (
    select c.*,row_number() over(order by sort_value desc,id desc) position from candidates c
  ), page as materialized (select * from numbered where position<=24)
  select jsonb_build_object(
    'listings',coalesce((select jsonb_agg((to_jsonb(p)-'sort_value'-'position') || jsonb_build_object('companies',(select to_jsonb(c) from public.companies c where c.id=p.company_id)) order by position) from page p),'[]'::jsonb),
    'facets',jsonb_build_object('countries',coalesce((select jsonb_agg(jsonb_build_object('code',country_code,'count',amount) order by country_code) from (select country_code,count(*) amount from active where country_code is not null group by country_code)x),'[]'::jsonb)),
    'hasMore',(select count(*)>24 from candidates),
    'nextCursor',case when (select count(*)>24 from candidates) then (select jsonb_build_object('value',sort_value,'id',id) from page order by position desc limit 1) else null end,
    'snapshot',watermark
  ) into result;
  return result;
end;
$$;

revoke all on function public.valid_country_code_array(text[]) from public;
grant execute on function public.valid_country_code_array(text[]) to authenticated;
revoke all on function public.get_published_listings_catalog(text,timestamptz,uuid,timestamptz) from public;
grant execute on function public.get_published_listings_catalog(text,timestamptz,uuid,timestamptz) to anon,authenticated;
grant select(country_code,original_language,international_applicants,visa_sponsorship) on public.listings to anon,authenticated;
grant select(interface_language,content_language,home_country) on public.profiles to authenticated;
grant update(interface_language,content_language,home_country) on public.profiles to authenticated;
grant select(preferred_job_countries) on public.student_profiles to authenticated;
grant update(preferred_job_countries) on public.student_profiles to authenticated;
