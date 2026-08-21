begin;

select
  public.is_safe_opportunity_source_url('https://example.edu.tr/burs') as https_allowed,
  public.is_safe_opportunity_source_url('http://example.edu.tr/burs') as http_rejected,
  public.is_safe_opportunity_source_url('https://localhost/burs') as localhost_rejected,
  public.is_safe_opportunity_source_url('https://127.0.0.1/burs') as loopback_rejected,
  public.is_safe_opportunity_source_url('https://10.0.0.1/burs') as private_ip_rejected,
  public.is_safe_opportunity_source_url('https://169.254.169.254/latest/meta-data') as metadata_rejected,
  public.is_safe_opportunity_source_url('ftp://example.edu.tr/burs') as protocol_rejected;

insert into public.opportunity_sources (
  name, base_url, source_type, trust_level, discovery_method, parser_type
) values (
  'Schema verification only', 'https://example.edu.tr/burs', 'government', 'official', 'schema_audit', 'none'
)
returning auto_publish_enabled;

rollback;
