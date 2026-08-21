begin;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'application_channels_company_id_type_value_key' and conrelid = 'public.application_channels'::regclass) then
    raise exception 'expected production unique constraint is missing';
  end if;
end $$;

alter table public.opportunity_sources
  add column if not exists auto_publish_enabled boolean not null default false;

create or replace function public.is_safe_opportunity_source_url(value text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  authority text;
  host text;
  port_text text;
  literal inet;
  labels text[];
  label text;
begin
  if value is null or length(value) = 0 or length(value) > 2048 or value <> btrim(value) then return false; end if;
  if value !~ '^https://' then return false; end if;
  authority := substring(value from '^https://([^/?#]+)');
  if authority is null or authority = '' or authority like '%@%' or authority like '%\\%' or authority like '%%%' then return false; end if;
  if authority ~ '^\[' then
    if authority !~ '^\[[0-9A-Fa-f:.]+\](:[0-9]{1,5})?$' then return false; end if;
    host := substring(authority from '^\[([^]]+)\]');
    begin literal := host::inet; exception when others then return false; end;
    return false;
  end if;
  if authority ~ ':' then
    if authority !~ '^[^:]+:[0-9]{1,5}$' then return false; end if;
    host := split_part(authority, ':', 1); port_text := split_part(authority, ':', 2);
    if port_text::integer not between 1 and 65535 then return false; end if;
  else host := authority; end if;
  if host !~ '^[A-Za-z0-9.-]+$' or host like '%.%' or host like '.%' or host !~ '\.' then return false; end if;
  begin literal := host::inet; return false; exception when others then null; end;
  if lower(host) = 'localhost' or lower(host) like '%.localhost' or lower(host) like '%.local' or lower(host) like '%.internal' then return false; end if;
  labels := string_to_array(host, '.');
  foreach label in array labels loop
    if label = '' or length(label) > 63 or label like '-%' or label like '%-' or label !~ '^[A-Za-z0-9-]+$' then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

revoke all on function public.guard_listing_publish() from public, anon, authenticated;
grant execute on function public.guard_listing_publish() to service_role;

comment on function public.is_safe_opportunity_source_url(text) is 'Static URL validation only; fetchers must revalidate resolved addresses and redirects.';
commit;
