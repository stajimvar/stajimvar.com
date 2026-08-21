create type public.opportunity_type as enum ('scholarship','kyk','international','competition','education','student_support','youth_program');
create type public.opportunity_status as enum ('draft','published','expired','archived');

create table public.opportunities (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null, organization_name text not null, organization_logo_url text,
  opportunity_type public.opportunity_type not null, short_description text, description text, eligibility text,
  education_levels text[] not null default '{}', eligible_departments text[] not null default '{}', eligible_class_years text[] not null default '{}',
  cities text[] not null default '{}', countries text[] not null default '{}', minimum_gpa numeric(3,2) check (minimum_gpa between 0 and 4), language_requirements text[] not null default '{}',
  amount_text text, support_type text, application_start_at timestamptz, application_deadline timestamptz,
  application_url text check (application_url is null or application_url ~* '^https://'), source_url text not null check (source_url ~* '^https://'),
  required_documents text[] not null default '{}', status public.opportunity_status not null default 'draft', verified_at timestamptz, last_checked_at timestamptz, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'published' or (source_url is not null and source_url ~* '^https://'))
);
create index opportunities_public_deadline_idx on public.opportunities(status, application_deadline);
create index opportunities_type_idx on public.opportunities(opportunity_type);
create trigger t6 before update on public.opportunities for each row execute function public.touch_updated_at();

create table public.saved_opportunities (
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, opportunity_id)
);
alter table public.opportunities enable row level security;
alter table public.saved_opportunities enable row level security;
create policy "yayindaki aktif firsatlar herkese acik" on public.opportunities for select using (status = 'published' and (application_deadline is null or application_deadline >= now()));
create policy "yonetici firsatlari yonetir" on public.opportunities for all using (public.is_admin()) with check (public.is_admin());
create policy "kullanici kendi kayitlarini gorur" on public.saved_opportunities for select using (user_id = auth.uid());
create policy "kullanici kendi kaydini ekler" on public.saved_opportunities for insert with check (user_id = auth.uid());
create policy "kullanici kendi kaydini siler" on public.saved_opportunities for delete using (user_id = auth.uid());

create or replace function public.deactivate_expired_opportunities()
returns integer language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  if not public.is_admin() and coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '') <> 'service_role' then raise exception 'yetkisiz'; end if;
  update public.opportunities set status = 'expired' where status = 'published' and application_deadline < now();
  get diagnostics changed = row_count; return changed;
end; $$;
revoke all on function public.deactivate_expired_opportunities() from public, anon, authenticated;
grant execute on function public.deactivate_expired_opportunities() to service_role;
