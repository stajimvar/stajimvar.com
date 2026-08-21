alter table public.opportunity_sources add column if not exists auto_publish_enabled boolean not null default false;
create or replace function public.is_safe_opportunity_source_url(value text)
returns boolean language sql immutable set search_path = public as $$
 select value ~* '^https://[a-z0-9.-]+'
   and position('[' in value) = 0
   and value !~* '^https://(localhost|127\\.|0\\.|10\\.|192\\.168\\.|169\\.254\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.)';
$$;
