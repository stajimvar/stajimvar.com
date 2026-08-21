create table public.opportunity_admin_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  admin_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('create','update','publish','unpublish','expire','archive')),
  before_data jsonb, after_data jsonb not null, created_at timestamptz not null default now()
);
create index opportunity_admin_events_opportunity_created_idx on public.opportunity_admin_events(opportunity_id, created_at desc);
alter table public.opportunity_admin_events enable row level security;
create policy "yonetici denetim kayitlarini gorur" on public.opportunity_admin_events for select using (public.is_admin());

alter table public.opportunities add constraint opportunities_safe_admin_urls check (
  source_url ~* '^https://' and source_url !~* '^https://(localhost|127\\.|0\\.|10\\.|192\\.168\\.|169\\.254\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|\\[::1\\]|\\[(fc|fd|fe80))'
  and (application_url is null or (application_url ~* '^https://' and application_url !~* '^https://(localhost|127\\.|0\\.|10\\.|192\\.168\\.|169\\.254\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|\\[::1\\]|\\[(fc|fd|fe80))'))
);
revoke insert, update, delete on public.opportunities from anon, authenticated;

create or replace function public.opportunity_admin_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare event_action text;
begin
  if not public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then event_action := 'create';
  elsif new.status = 'published' and old.status <> 'published' then event_action := 'publish';
  elsif old.status = 'published' and new.status = 'draft' then event_action := 'unpublish';
  elsif new.status = 'archived' and old.status <> 'archived' then event_action := 'archive';
  elsif new.status = 'expired' and old.status <> 'expired' then event_action := 'expire';
  else event_action := 'update'; end if;
  insert into public.opportunity_admin_events(opportunity_id, admin_user_id, action, before_data, after_data)
  values (new.id, auth.uid(), event_action, case when tg_op='INSERT' then null else to_jsonb(old) end, to_jsonb(new));
  return new;
end; $$;
create trigger t7_opportunity_admin_audit after insert or update on public.opportunities for each row execute function public.opportunity_admin_audit();

create or replace function public.admin_create_opportunity(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; generated_slug text;
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;
  if coalesce(trim(p->>'title'),'')='' or coalesce(trim(p->>'organization_name'),'')='' or coalesce(trim(p->>'description'),'')='' or coalesce(trim(p->>'source_url'),'')='' then raise exception 'zorunlu alan eksik'; end if;
  if exists(select 1 from public.opportunities where source_url = p->>'source_url') then raise exception 'aynı resmî kaynak zaten kayıtlı'; end if;
  generated_slug := trim(both '-' from regexp_replace(translate(lower(p->>'title'),'ıişşğğüüööçç','iissgguuoocc'),'[^a-z0-9]+','-','g'));
  insert into public.opportunities(slug,title,organization_name,opportunity_type,short_description,description,eligibility,education_levels,eligible_departments,eligible_class_years,cities,countries,minimum_gpa,language_requirements,amount_text,support_type,application_start_at,application_deadline,application_url,source_url,required_documents,status)
  values (coalesce(nullif(p->>'slug',''), generated_slug),trim(p->>'title'),trim(p->>'organization_name'),(p->>'opportunity_type')::public.opportunity_type,nullif(p->>'short_description',''),trim(p->>'description'),nullif(p->>'eligibility',''),coalesce(array(select jsonb_array_elements_text(coalesce(p->'education_levels','[]'::jsonb))),'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(p->'eligible_departments','[]'::jsonb))),'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(p->'eligible_class_years','[]'::jsonb))),'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(p->'cities','[]'::jsonb))),'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(p->'countries','[]'::jsonb))),'{}'),nullif(p->>'minimum_gpa','')::numeric,coalesce(array(select jsonb_array_elements_text(coalesce(p->'language_requirements','[]'::jsonb))),'{}'),nullif(p->>'amount_text',''),nullif(p->>'support_type',''),nullif(p->>'application_start_at','')::timestamptz,nullif(p->>'application_deadline','')::timestamptz,nullif(p->>'application_url',''),trim(p->>'source_url'),coalesce(array(select jsonb_array_elements_text(coalesce(p->'required_documents','[]'::jsonb))),'{}'),'draft') returning id into new_id;
  return new_id;
end; $$;
create or replace function public.admin_set_opportunity_status(p_id uuid, p_expected_updated_at timestamptz, p_status public.opportunity_status)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare result timestamptz;
begin
 if not public.is_admin() then raise exception 'yetkisiz'; end if;
 if p_status='published' and exists(select 1 from public.opportunities where id=p_id and application_deadline < now()) then raise exception 'süresi geçmiş fırsat yayımlanamaz'; end if;
 update public.opportunities set status=p_status, published_at=case when p_status='published' then now() when p_status='draft' then null else published_at end where id=p_id and updated_at=p_expected_updated_at returning updated_at into result;
 if result is null then raise exception 'kayıt değişti, sayfayı yenileyin'; end if; return result;
end; $$;
create or replace function public.admin_update_opportunity(p_id uuid, p_expected_updated_at timestamptz, p jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare result timestamptz;
begin
 if not public.is_admin() then raise exception 'yetkisiz'; end if;
 if exists(select 1 from public.opportunities where id<>p_id and source_url=p->>'source_url') then raise exception 'aynı resmî kaynak zaten kayıtlı'; end if;
 update public.opportunities set
 title=trim(p->>'title'), organization_name=trim(p->>'organization_name'), opportunity_type=(p->>'opportunity_type')::public.opportunity_type,
 short_description=nullif(p->>'short_description',''), description=trim(p->>'description'), eligibility=nullif(p->>'eligibility',''),
 education_levels=coalesce(array(select jsonb_array_elements_text(coalesce(p->'education_levels','[]'::jsonb))),'{}'), eligible_departments=coalesce(array(select jsonb_array_elements_text(coalesce(p->'eligible_departments','[]'::jsonb))),'{}'), eligible_class_years=coalesce(array(select jsonb_array_elements_text(coalesce(p->'eligible_class_years','[]'::jsonb))),'{}'), cities=coalesce(array(select jsonb_array_elements_text(coalesce(p->'cities','[]'::jsonb))),'{}'), countries=coalesce(array(select jsonb_array_elements_text(coalesce(p->'countries','[]'::jsonb))),'{}'), minimum_gpa=nullif(p->>'minimum_gpa','')::numeric, language_requirements=coalesce(array(select jsonb_array_elements_text(coalesce(p->'language_requirements','[]'::jsonb))),'{}'), amount_text=nullif(p->>'amount_text',''), support_type=nullif(p->>'support_type',''), application_start_at=nullif(p->>'application_start_at','')::timestamptz, application_deadline=nullif(p->>'application_deadline','')::timestamptz, application_url=nullif(p->>'application_url',''), source_url=trim(p->>'source_url'), required_documents=coalesce(array(select jsonb_array_elements_text(coalesce(p->'required_documents','[]'::jsonb))),'{}')
 where id=p_id and updated_at=p_expected_updated_at returning updated_at into result;
 if result is null then raise exception 'kayıt değişti, sayfayı yenileyin'; end if; return result;
end; $$;
revoke all on function public.admin_create_opportunity(jsonb), public.admin_update_opportunity(uuid,timestamptz,jsonb), public.admin_set_opportunity_status(uuid,timestamptz,public.opportunity_status) from public, anon;
grant execute on function public.admin_create_opportunity(jsonb), public.admin_update_opportunity(uuid,timestamptz,jsonb), public.admin_set_opportunity_status(uuid,timestamptz,public.opportunity_status) to authenticated;
