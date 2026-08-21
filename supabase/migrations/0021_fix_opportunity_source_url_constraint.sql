alter table public.opportunity_sources drop constraint if exists opportunity_sources_base_url_check;
create or replace function public.is_safe_opportunity_source_url(value text)
returns boolean language sql immutable set search_path = public as $$
 select value ~* '^https://[a-z0-9.-]+' and value !~* '^https://(localhost|127\\.|0\\.|10\\.|192\\.168\\.|169\\.254\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|\\[::1\\]|\\[(fc|fd|fe80))';
$$;
alter table public.opportunity_sources add constraint opportunity_sources_base_url_check check (public.is_safe_opportunity_source_url(base_url));
