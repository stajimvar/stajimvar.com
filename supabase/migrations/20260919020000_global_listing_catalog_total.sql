-- Keep the already-released catalog RPC stable; v2 adds the filtered total.
create or replace function public.get_published_listings_catalog_v2(
  p_country text default 'all',
  p_cursor_posted_at timestamptz default null,
  p_cursor_id uuid default null,
  p_snapshot timestamptz default null
)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare
  page jsonb;
  total bigint;
  watermark timestamptz;
begin
  page := public.get_published_listings_catalog(p_country,p_cursor_posted_at,p_cursor_id,p_snapshot);
  watermark := (page->>'snapshot')::timestamptz;
  select count(*) into total
  from public.listings l
  where l.status='published' and l.created_at<=watermark
    and (p_country='all'
      or (p_country='remote' and l.work_type='Remote')
      or (p_country not in ('all','remote') and l.country_code=p_country));
  return page || jsonb_build_object('total',total);
end;
$$;

revoke all on function public.get_published_listings_catalog_v2(text,timestamptz,uuid,timestamptz) from public;
grant execute on function public.get_published_listings_catalog_v2(text,timestamptz,uuid,timestamptz) to anon,authenticated;
