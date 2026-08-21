with target_functions(name) as (
  values ('approve_company_claim'), ('guard_channel_verification'), ('guard_listing_publish'),
         ('handle_new_user'), ('is_safe_opportunity_source_url'), ('submit_quiz_attempt')
), functions as (
  select p.oid, n.nspname as schema, p.proname as name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_function_result(p.oid) as result,
    l.lanname as language, p.provolatile, p.proisstrict, p.prosecdef, p.proparallel,
    r.rolname as owner, p.proconfig, coalesce(p.proacl::text, '{}') as acl,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  join pg_roles r on r.oid=p.proowner
  where n.nspname='public' and p.proname in (select name from target_functions)
), function_report as (
  select 'function' as kind, name as object_name,
    jsonb_build_object('schema',schema,'identity_arguments',identity_arguments,'result',result,'language',language,
      'volatility',provolatile,'strict',proisstrict,'security_definer',prosecdef,'parallel',proparallel,
      'owner',owner,'proconfig',proconfig,'acl',acl,
      'definition',case when definition ~* '(sb_secret_|service_role[[:space:]]*=|postgres(ql)?://[^[:space:]]+:[^[:space:]]+@)' then 'SECRET_DETECTED' else definition end) as detail
  from functions
), constraint_report as (
  select 'constraint' as kind, c.conname as object_name,
    jsonb_build_object('definition',pg_get_constraintdef(c.oid,true),'type',c.contype,'deferrable',c.condeferrable,
      'initially_deferred',c.condeferred,'validated',c.convalidated,'index_definition',pg_get_indexdef(c.conindid)) as detail
  from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public' and t.relname='application_channels' and c.conname='application_channels_company_id_type_value_key'
), duplicate_report as (
  select 'constraint_duplicates' as kind, 'application_channels_company_id_type_value_key' as object_name,
    jsonb_build_object('duplicate_groups',count(*) filter(where n>1),'duplicate_rows',coalesce(sum(n) filter(where n>1),0),
      'null_groups',count(*) filter(where company_id is null or type is null or value is null)) as detail
  from (select company_id,type,value,count(*) as n from public.application_channels group by company_id,type,value) grouped
)
select * from function_report union all select * from constraint_report union all select * from duplicate_report order by kind,object_name;
