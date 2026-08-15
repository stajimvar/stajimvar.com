-- =============================================================================
-- Fonksiyon yetkilerinin sıkılaştırılması
-- Supabase güvenlik denetçisinin (get_advisors) uyarıları üzerine eklendi.
-- =============================================================================

-- search_path sabitlensin
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- Trigger fonksiyonları REST API'den çağrılabilir durumdaydı. Bunlar yalnızca
-- tetikleyici olarak çalışmalı; doğrudan çağrı yetkisini kaldırıyoruz.
revoke all on function public.handle_new_user()       from public, anon, authenticated;
revoke all on function public.sync_applicants_count() from public, anon, authenticated;
revoke all on function public.touch_updated_at()      from public, anon, authenticated;

-- Uzantıları public şemasından çıkar
create schema if not exists extensions;
alter extension pg_trgm  set schema extensions;
alter extension unaccent set schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
