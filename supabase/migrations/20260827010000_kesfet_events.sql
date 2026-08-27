create table public.discover_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  short_description text,
  description text not null,
  category text not null check (category in ('exhibition','museum','festival','fair','theatre','concert','workshop','university','city_route','day_trip')),
  image_url text,
  city text not null,
  district text,
  venue_name text not null,
  address text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  regular_price numeric(12,2) check (regular_price is null or regular_price >= 0),
  student_price numeric(12,2) check (student_price is null or student_price >= 0),
  is_free boolean not null default false,
  has_student_discount boolean not null default false,
  organizer text,
  source_url text not null,
  ticket_url text,
  directions_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at),
  check (source_url ~* '^https://' and source_url !~* '^https://(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)'),
  check (image_url is null or image_url ~* '^https://'),
  check (ticket_url is null or ticket_url ~* '^https://'),
  check (directions_url is null or directions_url ~* '^https://')
);

create index discover_events_public_idx on public.discover_events(status, ends_at, starts_at);
create index discover_events_city_category_idx on public.discover_events(city, category);
create trigger t_discover_events_touch before update on public.discover_events for each row execute function public.touch_updated_at();

alter table public.discover_events enable row level security;
create policy "yayindaki aktif kesfet etkinlikleri herkese acik" on public.discover_events
  for select using (status = 'published' and ends_at >= now());
create policy "yonetici tum kesfet etkinliklerini gorur" on public.discover_events
  for select using (public.is_admin());
revoke insert, update, delete on public.discover_events from anon, authenticated;

-- Liste geçmiş kayıtları dışarıda tutar; detay yalnızca yayındaki kaydı
-- döndürerek sona ermiş etkinliğin durumunu gösterebilir.
create or replace function public.get_discover_event_by_slug(p_slug text)
returns setof public.discover_events language sql stable security definer set search_path = public as $$
  select * from public.discover_events where slug = p_slug and status = 'published' limit 1;
$$;
revoke all on function public.get_discover_event_by_slug(text) from public;
grant execute on function public.get_discover_event_by_slug(text) to anon, authenticated;

create or replace function public.admin_create_discover_event(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare result uuid;
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;
  insert into public.discover_events(slug,title,short_description,description,category,image_url,city,district,venue_name,address,starts_at,ends_at,regular_price,student_price,is_free,has_student_discount,organizer,source_url,ticket_url,directions_url,status,published_at)
  values (p->>'slug',trim(p->>'title'),nullif(p->>'short_description',''),trim(p->>'description'),p->>'category',nullif(p->>'image_url',''),trim(p->>'city'),nullif(p->>'district',''),trim(p->>'venue_name'),nullif(p->>'address',''),(p->>'starts_at')::timestamptz,(p->>'ends_at')::timestamptz,nullif(p->>'regular_price','')::numeric,nullif(p->>'student_price','')::numeric,coalesce((p->>'is_free')::boolean,false),coalesce((p->>'has_student_discount')::boolean,false),nullif(p->>'organizer',''),trim(p->>'source_url'),nullif(p->>'ticket_url',''),nullif(p->>'directions_url',''),coalesce(nullif(p->>'status',''),'draft'),case when p->>'status'='published' then now() else null end)
  returning id into result;
  return result;
end; $$;

create or replace function public.admin_update_discover_event(p_id uuid, p_expected_updated_at timestamptz, p jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare result timestamptz;
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;
  update public.discover_events set slug=p->>'slug',title=trim(p->>'title'),short_description=nullif(p->>'short_description',''),description=trim(p->>'description'),category=p->>'category',image_url=nullif(p->>'image_url',''),city=trim(p->>'city'),district=nullif(p->>'district',''),venue_name=trim(p->>'venue_name'),address=nullif(p->>'address',''),starts_at=(p->>'starts_at')::timestamptz,ends_at=(p->>'ends_at')::timestamptz,regular_price=nullif(p->>'regular_price','')::numeric,student_price=nullif(p->>'student_price','')::numeric,is_free=coalesce((p->>'is_free')::boolean,false),has_student_discount=coalesce((p->>'has_student_discount')::boolean,false),organizer=nullif(p->>'organizer',''),source_url=trim(p->>'source_url'),ticket_url=nullif(p->>'ticket_url',''),directions_url=nullif(p->>'directions_url',''),status=coalesce(nullif(p->>'status',''),'draft'),published_at=case when p->>'status'='published' then coalesce(published_at,now()) else null end
  where id=p_id and updated_at=p_expected_updated_at returning updated_at into result;
  if result is null then raise exception 'kayıt değişti, sayfayı yenileyin'; end if;
  return result;
end; $$;

create or replace function public.admin_set_discover_event_status(p_id uuid, p_expected_updated_at timestamptz, p_status text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare result timestamptz;
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;
  if p_status not in ('draft','published') then raise exception 'geçersiz durum'; end if;
  if p_status='published' and exists(select 1 from public.discover_events where id=p_id and ends_at < now()) then raise exception 'sona eren etkinlik yayımlanamaz'; end if;
  update public.discover_events set status=p_status,published_at=case when p_status='published' then coalesce(published_at,now()) else null end where id=p_id and updated_at=p_expected_updated_at returning updated_at into result;
  if result is null then raise exception 'kayıt değişti, sayfayı yenileyin'; end if;
  return result;
end; $$;

create or replace function public.admin_delete_discover_event(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;
  delete from public.discover_events where id=p_id;
end; $$;

revoke all on function public.admin_create_discover_event(jsonb), public.admin_update_discover_event(uuid,timestamptz,jsonb), public.admin_set_discover_event_status(uuid,timestamptz,text), public.admin_delete_discover_event(uuid) from public, anon;
grant execute on function public.admin_create_discover_event(jsonb), public.admin_update_discover_event(uuid,timestamptz,jsonb), public.admin_set_discover_event_status(uuid,timestamptz,text), public.admin_delete_discover_event(uuid) to authenticated;
