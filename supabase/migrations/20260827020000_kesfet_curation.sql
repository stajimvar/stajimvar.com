alter table public.discover_events
  add column if not exists application_deadline timestamptz,
  add column if not exists discount_terms text,
  add column if not exists age_limit text,
  add column if not exists registration_required boolean not null default false,
  add column if not exists target_audiences text[] not null default '{}',
  add column if not exists interest_tags text[] not null default '{}',
  add column if not exists source_kind text not null default 'official' check (source_kind in ('official','institution','ticketing','unknown')),
  add column if not exists source_trust_score smallint check (source_trust_score between 0 and 100),
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_status text not null default 'unverified' check (verification_status in ('unverified','pending_review','verified','needs_review')),
  add column if not exists latitude numeric(9,6) check (latitude between -90 and 90),
  add column if not exists longitude numeric(9,6) check (longitude between -180 and 180),
  add column if not exists save_count integer not null default 0 check (save_count >= 0),
  add column if not exists price_score smallint check (price_score between 0 and 100),
  add column if not exists interest_score smallint check (interest_score between 0 and 100),
  add column if not exists trust_score smallint check (trust_score between 0 and 100),
  add column if not exists proximity_score smallint check (proximity_score between 0 and 100),
  add column if not exists popularity_score smallint check (popularity_score between 0 and 100),
  add column if not exists diversity_score smallint check (diversity_score between 0 and 100),
  add column if not exists student_fit_score smallint not null default 0 check (student_fit_score between 0 and 100),
  add column if not exists review_reason text,
  add column if not exists source_fingerprint text;

create or replace function public.discover_event_fingerprint(p_title text, p_venue text, p_starts_at timestamptz)
returns text language sql immutable as $$
  select md5(lower(regexp_replace(trim(coalesce(p_title,'')), '\s+', ' ', 'g')) || '|' || lower(regexp_replace(trim(coalesce(p_venue,'')), '\s+', ' ', 'g')) || '|' || coalesce(p_starts_at::text,''));
$$;

create or replace function public.calculate_discover_event_score()
returns trigger language plpgsql set search_path = public as $$
declare total numeric := 0; weights numeric := 0; freshness numeric;
begin
  new.source_fingerprint := public.discover_event_fingerprint(new.title,new.venue_name,new.starts_at);
  if new.is_free or new.regular_price is not null or new.student_price is not null then
    new.price_score := case when new.is_free then 100 when coalesce(new.regular_price,0)>0 then greatest(0,least(100,round(((new.regular_price-coalesce(new.student_price,new.regular_price))/new.regular_price)*100))) when coalesce(new.student_price,999999)<=100 then 75 else 20 end;
    total := total + new.price_score*25; weights := weights+25;
  end if;
  if cardinality(new.target_audiences)>0 or cardinality(new.interest_tags)>0 then
    new.interest_score := case when new.target_audiences && array['student','university'] then 85 else 35 end;
    total := total+new.interest_score*25; weights := weights+25;
  end if;
  if new.source_trust_score is not null then
    freshness := case when new.last_verified_at >= now()-interval '1 day' then 100 when new.last_verified_at >= now()-interval '7 days' then 80 when new.last_verified_at >= now()-interval '30 days' then 55 else 25 end;
    new.trust_score := round(new.source_trust_score*.7+freshness*.3); total:=total+new.trust_score*20; weights:=weights+20;
  end if;
  if new.proximity_score is not null then total:=total+new.proximity_score*15; weights:=weights+15; end if;
  if new.popularity_score is not null then total:=total+new.popularity_score*10; weights:=weights+10; end if;
  if new.diversity_score is not null then total:=total+new.diversity_score*5; weights:=weights+5; end if;
  new.student_fit_score := case when weights=0 then 0 else round(total/weights) end;
  return new;
end; $$;

update public.discover_events set source_fingerprint=public.discover_event_fingerprint(title,venue_name,starts_at) where source_fingerprint is null;
create unique index if not exists discover_events_unique_source_fingerprint on public.discover_events(source_fingerprint);
drop trigger if exists t_discover_events_curation on public.discover_events;
create trigger t_discover_events_curation before insert or update on public.discover_events for each row execute function public.calculate_discover_event_score();

create or replace function public.admin_set_discover_event_curation(p_id uuid, p_expected_updated_at timestamptz, p jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare result timestamptz;
begin
  if not public.is_admin() then raise exception 'yetkisiz'; end if;
  update public.discover_events set
    application_deadline=nullif(p->>'application_deadline','')::timestamptz,
    discount_terms=nullif(p->>'discount_terms',''), age_limit=nullif(p->>'age_limit',''),
    registration_required=coalesce((p->>'registration_required')::boolean,false),
    target_audiences=coalesce(array(select jsonb_array_elements_text(coalesce(p->'target_audiences','[]'::jsonb))),'{}'),
    interest_tags=coalesce(array(select jsonb_array_elements_text(coalesce(p->'interest_tags','[]'::jsonb))),'{}'),
    source_kind=coalesce(nullif(p->>'source_kind',''),'official'),
    source_trust_score=nullif(p->>'source_trust_score','')::smallint,
    last_verified_at=nullif(p->>'last_verified_at','')::timestamptz,
    verification_status=coalesce(nullif(p->>'verification_status',''),'unverified'),
    latitude=nullif(p->>'latitude','')::numeric, longitude=nullif(p->>'longitude','')::numeric,
    proximity_score=nullif(p->>'proximity_score','')::smallint,
    popularity_score=nullif(p->>'popularity_score','')::smallint,
    diversity_score=nullif(p->>'diversity_score','')::smallint,
    review_reason=nullif(p->>'review_reason','')
  where id=p_id and updated_at=p_expected_updated_at returning updated_at into result;
  if result is null then raise exception 'kayıt değişti, sayfayı yenileyin'; end if;
  return result;
end; $$;
revoke all on function public.admin_set_discover_event_curation(uuid,timestamptz,jsonb) from public, anon;
grant execute on function public.admin_set_discover_event_curation(uuid,timestamptz,jsonb) to authenticated;
