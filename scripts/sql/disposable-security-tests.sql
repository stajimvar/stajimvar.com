do $$
declare value text; expected boolean;
begin
  for value, expected in select * from (values
    ('https://example.com',true),('https://sub.example.com/a?x=1',true),('https://xn--bcher-kva.example',true),('https://example.com:443/a',true),
    ('http://example.com',false),('https://user:pass@example.com',false),('https://localhost',false),('https://127.0.0.1',false),('https://10.0.0.1',false),('https://169.254.169.254',false),('https://[::1]',false),('https://[fc00::1]',false),('https://[fe80::1]',false),('https://example.com@127.0.0.1',false),('https://example.com.',false),('javascript:alert(1)',false)
  ) as cases(value, expected) loop
    if public.is_safe_opportunity_source_url(value) is distinct from expected then raise exception 'url test failed: %', value using errcode='check_violation'; end if;
  end loop;
end $$;
select has_function_privilege('anon','public.guard_listing_publish()','EXECUTE') as anon_execute,
       has_function_privilege('authenticated','public.guard_listing_publish()','EXECUTE') as authenticated_execute;
