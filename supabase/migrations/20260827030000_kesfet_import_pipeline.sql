-- Keşfet kaynak/import telemetrisi ve güvenli etkinlik kapakları.

alter table public.discover_events
  drop constraint if exists discover_events_status_check;

alter table public.discover_events
  add constraint discover_events_status_check
  check (status in ('draft','published','cancelled','postponed','archived'));

alter table public.discover_events
  add column if not exists canonical_source_url text,
  add column if not exists source_event_id text,
  add column if not exists original_image_url text,
  add column if not exists card_image_url text,
  add column if not exists detail_image_url text,
  add column if not exists cover_kind text not null default 'category'
    check (cover_kind in ('official','category','manual')),
  add column if not exists event_mode text not null default 'physical'
    check (event_mode in ('physical','online','hybrid')),
  add column if not exists online_url text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists imported_at timestamptz,
  add column if not exists import_source_id uuid,
  add column if not exists review_required boolean not null default false,
  add column if not exists cancelled_at timestamptz,
  add column if not exists postponed_at timestamptz;

alter table public.discover_events
  add constraint discover_events_canonical_source_url_https
    check (canonical_source_url is null or canonical_source_url ~* '^https://'),
  add constraint discover_events_original_image_url_https
    check (original_image_url is null or original_image_url ~* '^https://'),
  add constraint discover_events_card_image_url_https
    check (card_image_url is null or card_image_url ~* '^https://'),
  add constraint discover_events_detail_image_url_https
    check (detail_image_url is null or detail_image_url ~* '^https://'),
  add constraint discover_events_online_url_https
    check (online_url is null or online_url ~* '^https://');

create table public.discover_event_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  base_url text not null check (base_url ~* '^https://'),
  adapter text not null,
  official_domains text[] not null default '{}',
  cities text[] not null default '{}',
  trust_score smallint not null default 90 check (trust_score between 0 and 100),
  is_enabled boolean not null default true,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger t_discover_event_sources_touch
before update on public.discover_event_sources
for each row execute function public.touch_updated_at();

create table public.discover_event_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.discover_event_sources(id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  found_count integer not null default 0 check (found_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  unchanged_count integer not null default 0 check (unchanged_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  archived_count integer not null default 0 check (archived_count >= 0),
  image_count integer not null default 0 check (image_count >= 0),
  category_cover_count integer not null default 0 check (category_cover_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_summary text
);

alter table public.discover_events
  add constraint discover_events_import_source_id_fkey
  foreign key (import_source_id) references public.discover_event_sources(id) on delete set null;

create unique index discover_events_source_event_unique
  on public.discover_events(import_source_id, source_event_id)
  where import_source_id is not null and source_event_id is not null;

create unique index discover_events_canonical_source_unique
  on public.discover_events(canonical_source_url)
  where canonical_source_url is not null;

alter table public.discover_event_sources enable row level security;
alter table public.discover_event_import_runs enable row level security;

create policy "yonetici kesfet kaynaklarini okur"
on public.discover_event_sources for select to authenticated
using (public.is_admin());

create policy "yonetici kesfet importlarini okur"
on public.discover_event_import_runs for select to authenticated
using (public.is_admin());

revoke insert, update, delete on public.discover_event_sources from anon, authenticated;
revoke insert, update, delete on public.discover_event_import_runs from anon, authenticated;

drop policy if exists "yayindaki aktif kesfet etkinlikleri herkese acik"
on public.discover_events;
create policy "yayindaki aktif kesfet etkinlikleri herkese acik"
on public.discover_events for select
using (status = 'published' and ends_at >= now());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-covers', 'event-covers', true, 5242880, array['image/webp','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "event covers public read" on storage.objects;
create policy "event covers public read"
on storage.objects for select
using (bucket_id = 'event-covers');

drop policy if exists "event covers admin insert" on storage.objects;
create policy "event covers admin insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-covers' and public.is_admin());

drop policy if exists "event covers admin update" on storage.objects;
create policy "event covers admin update"
on storage.objects for update to authenticated
using (bucket_id = 'event-covers' and public.is_admin())
with check (bucket_id = 'event-covers' and public.is_admin());

create or replace function public.admin_set_discover_event_cover(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_card_image_url text,
  p_detail_image_url text,
  p_cover_kind text
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare result timestamptz;
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;
  if p_cover_kind not in ('official','category','manual') then
    raise exception 'geçersiz kapak türü';
  end if;
  update public.discover_events set
    card_image_url = nullif(p_card_image_url,''),
    detail_image_url = nullif(p_detail_image_url,''),
    cover_kind = p_cover_kind
  where id = p_id and updated_at = p_expected_updated_at
  returning updated_at into result;
  if result is null then raise exception 'kayıt değişti, sayfayı yenileyin'; end if;
  return result;
end; $$;

revoke all on function public.admin_set_discover_event_cover(uuid,timestamptz,text,text,text)
from public, anon;
grant execute on function public.admin_set_discover_event_cover(uuid,timestamptz,text,text,text)
to authenticated;
