-- Keşfet etkinlik içeriğini tarih/seans yaşam döngüsünden ayırır.

create table if not exists public.discover_event_occurrences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.discover_events(id) on delete cascade,
  source_occurrence_id text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  time_precision text not null default 'exact'
    check (time_precision in ('exact','date_only','recurring','ongoing')),
  status text not null default 'scheduled'
    check (status in ('scheduled','cancelled','postponed','archived')),
  last_seen_at timestamptz,
  consecutive_missing_runs integer not null default 0
    check (consecutive_missing_runs >= 0),
  cancelled_at timestamptz,
  postponed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discover_event_occurrences_dates_check
    check (ends_at is null or ends_at >= starts_at),
  constraint discover_event_occurrences_source_unique
    unique (event_id, source_occurrence_id)
);

alter table public.discover_event_import_runs
  add column if not exists missing_occurrence_count integer not null default 0
    check (missing_occurrence_count >= 0),
  add column if not exists archived_occurrence_count integer not null default 0
    check (archived_occurrence_count >= 0);

create index if not exists discover_event_occurrences_active_idx
  on public.discover_event_occurrences(status, ends_at, starts_at);
create index if not exists discover_event_occurrences_event_idx
  on public.discover_event_occurrences(event_id, starts_at);

drop trigger if exists t_discover_event_occurrences_touch on public.discover_event_occurrences;
create trigger t_discover_event_occurrences_touch
before update on public.discover_event_occurrences
for each row execute function public.touch_updated_at();

insert into public.discover_event_occurrences (
  event_id,
  source_occurrence_id,
  starts_at,
  ends_at,
  time_precision,
  status,
  last_seen_at,
  cancelled_at,
  postponed_at,
  archived_at
)
select
  e.id,
  'legacy:' || e.id::text,
  e.starts_at,
  e.ends_at,
  case
    when e.starts_at = date_trunc('day', e.starts_at at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
      then 'date_only'
    else 'exact'
  end,
  case e.status
    when 'cancelled' then 'cancelled'
    when 'postponed' then 'postponed'
    when 'archived' then 'archived'
    else 'scheduled'
  end,
  coalesce(e.last_seen_at, e.updated_at),
  e.cancelled_at,
  e.postponed_at,
  case when e.status = 'archived' then coalesce(e.updated_at, now()) end
from public.discover_events e
on conflict (event_id, source_occurrence_id) do nothing;

alter table public.discover_event_occurrences enable row level security;

drop policy if exists "yayindaki kesfet seanslari herkese acik"
on public.discover_event_occurrences;
create policy "yayindaki kesfet seanslari herkese acik"
on public.discover_event_occurrences for select
using (
  status = 'scheduled'
  and coalesce(ends_at, starts_at) >= now()
  and
  exists (
    select 1 from public.discover_events e
    where e.id = event_id and e.status = 'published'
  )
);

drop policy if exists "yonetici tum kesfet seanslarini gorur"
on public.discover_event_occurrences;
create policy "yonetici tum kesfet seanslarini gorur"
on public.discover_event_occurrences for select to authenticated
using (public.is_admin());

revoke insert, update, delete on public.discover_event_occurrences from anon, authenticated;

drop policy if exists "yayindaki aktif kesfet etkinlikleri herkese acik"
on public.discover_events;
drop policy if exists "yayindaki kesfet etkinlikleri herkese acik"
on public.discover_events;
create policy "yayindaki kesfet etkinlikleri herkese acik"
on public.discover_events for select
using (status = 'published');

create or replace view public.discover_event_occurrence_rows
with (security_invoker = true) as
select
  e.*,
  o.id as occurrence_id,
  o.source_occurrence_id,
  o.starts_at as occurrence_starts_at,
  o.ends_at as occurrence_ends_at,
  o.time_precision,
  o.status as occurrence_status,
  o.last_seen_at as occurrence_last_seen_at,
  o.consecutive_missing_runs
from public.discover_events e
join public.discover_event_occurrences o on o.event_id = e.id;

revoke all on public.discover_event_occurrence_rows from public;
grant select on public.discover_event_occurrence_rows to anon, authenticated;

create or replace function public.sync_admin_discover_event_occurrence()
returns trigger language plpgsql set search_path = public as $$
declare
  affected integer := 0;
  occurrence_status text;
  precision text;
begin
  if new.import_source_id is not null then
    return new;
  end if;
  occurrence_status := case new.status
    when 'cancelled' then 'cancelled'
    when 'postponed' then 'postponed'
    when 'archived' then 'archived'
    else 'scheduled'
  end;
  precision := case
    when new.starts_at = date_trunc('day', new.starts_at at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
      then 'date_only'
    else 'exact'
  end;
  update public.discover_event_occurrences set
    starts_at = new.starts_at,
    ends_at = new.ends_at,
    time_precision = precision,
    status = occurrence_status,
    last_seen_at = now(),
    consecutive_missing_runs = 0,
    cancelled_at = case when occurrence_status = 'cancelled' then now() end,
    postponed_at = case when occurrence_status = 'postponed' then now() end,
    archived_at = case when occurrence_status = 'archived' then now() end
  where event_id = new.id
    and source_occurrence_id in ('legacy:' || new.id::text, 'admin:' || new.id::text);
  get diagnostics affected = row_count;
  if affected = 0 then
    insert into public.discover_event_occurrences (
      event_id, source_occurrence_id, starts_at, ends_at, time_precision,
      status, last_seen_at, cancelled_at, postponed_at, archived_at
    ) values (
      new.id, 'admin:' || new.id::text, new.starts_at, new.ends_at, precision,
      occurrence_status, now(),
      case when occurrence_status = 'cancelled' then now() end,
      case when occurrence_status = 'postponed' then now() end,
      case when occurrence_status = 'archived' then now() end
    ) on conflict (event_id, source_occurrence_id) do update set
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      time_precision = excluded.time_precision,
      status = excluded.status,
      last_seen_at = excluded.last_seen_at,
      consecutive_missing_runs = 0;
  end if;
  return new;
end;
$$;

drop trigger if exists t_sync_admin_discover_event_occurrence on public.discover_events;
create trigger t_sync_admin_discover_event_occurrence
after insert or update of starts_at, ends_at, status on public.discover_events
for each row
when (new.import_source_id is null)
execute function public.sync_admin_discover_event_occurrence();

create or replace function public.list_active_discover_events(
  p_start timestamptz default null,
  p_end timestamptz default null
)
returns setof public.discover_event_occurrence_rows
language sql stable security invoker set search_path = public as $$
  with ranked as (
    select
      r as event_row,
      row_number() over (
        partition by o.event_id
        order by
          case
            when o.starts_at <= now()
              and coalesce(o.ends_at, o.starts_at) >= now() then 0
            else 1
          end,
          o.starts_at,
          o.id
      ) as occurrence_rank
    from public.discover_event_occurrence_rows r
    join public.discover_event_occurrences o on o.id = r.occurrence_id
    join public.discover_events e on e.id = o.event_id
    where e.status = 'published'
      and o.status = 'scheduled'
      and coalesce(o.ends_at, o.starts_at) >= now()
      and (p_end is null or o.starts_at < p_end)
      and (p_start is null or coalesce(o.ends_at, o.starts_at) >= p_start)
  )
  select (event_row).* from ranked where occurrence_rank = 1;
$$;

drop function if exists public.get_discover_event_by_slug(text);
create function public.get_discover_event_by_slug(p_slug text)
returns setof public.discover_event_occurrence_rows
language sql stable security definer set search_path = public as $$
  select r.*
  from public.discover_event_occurrence_rows r
  where r.slug = p_slug and r.status = 'published'
  order by
    case
      when r.occurrence_status = 'scheduled'
        and r.occurrence_starts_at <= now()
        and coalesce(r.occurrence_ends_at, r.occurrence_starts_at) >= now() then 0
      when r.occurrence_status = 'scheduled'
        and r.occurrence_starts_at > now() then 1
      else 2
    end,
    case when r.occurrence_starts_at >= now() then r.occurrence_starts_at end,
    case when r.occurrence_starts_at < now() then r.occurrence_starts_at end desc;
$$;

revoke all on function public.list_active_discover_events(timestamptz,timestamptz) from public;
grant execute on function public.list_active_discover_events(timestamptz,timestamptz) to anon, authenticated;
revoke all on function public.get_discover_event_by_slug(text) from public;
grant execute on function public.get_discover_event_by_slug(text) to anon, authenticated;
