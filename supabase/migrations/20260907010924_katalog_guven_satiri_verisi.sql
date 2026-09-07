-- GÜVEN SATIRININ VERİSİ — İDDİA DEĞİL, ÖLÇÜM
--
-- Ana sayfada başlığın altında tek satırlık bir güven cümlesi duruyor.
-- "Kaynaklar düzenli kontrol ediliyor" sitenin en ayırt edici iddiası ve
-- tam da bu yüzden kanıtsız yazılamaz.
--
-- ÖLÇÜLDÜ (üretim, 7 Eylül 2026):
--   Türkiye  : 62 ilanın 62'sinin kaynağı doğrulanmış, en son 6 Eylül
--   Fransa   : 48 ilanın 0'ının kaynağı doğrulanmış (alan hiç yazılmamış)
--   Tüm ülke : 114 ilanın 66'sı
--
-- Yani sabit bir cümle Fransa listesinde YALAN olurdu. Arayüz bu iki
-- alana bakıp cümleyi kuruyor ya da hiç kurmuyor (src/lib/guven-satiri.mjs).
--
-- Sayaçlarla AYNI sorgudan çıkıyorlar: üç sayaç ve iki doğrulama alanı
-- tek taramadan, tek anlık görüntüden. Ayrı sorgular yazılsaydı beş
-- değer farklı anları anlatabilirdi.

create or replace function public.get_published_listings_catalog_v2(
  p_country text default 'all',
  p_cursor_posted_at timestamptz default null,
  p_cursor_id uuid default null,
  p_snapshot timestamptz default null
) returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  page jsonb;
  total bigint;
  sirket bigint;
  sehir bigint;
  dogrulanan bigint;
  son_dogrulama timestamptz;
  watermark timestamptz;
begin
  page := public.get_published_listings_catalog(p_country,p_cursor_posted_at,p_cursor_id,p_snapshot);
  watermark := (page->>'snapshot')::timestamptz;

  select count(*),
         count(distinct l.company_id),
         count(distinct nullif(btrim(l.city),'')),
         count(l.source_verified_at),
         max(l.source_verified_at)
    into total, sirket, sehir, dogrulanan, son_dogrulama
  from public.listings l
  where l.status='published' and l.created_at<=watermark
    and (p_country='all'
      or (p_country='remote' and l.work_type='Remote')
      or (p_country not in ('all','remote') and l.country_code=p_country));

  return page || jsonb_build_object(
    'total', total,
    'companyTotal', sirket,
    'cityTotal', sehir,
    'verifiedTotal', dogrulanan,
    'lastVerifiedAt', son_dogrulama
  );
end;
$function$;

revoke all on function public.get_published_listings_catalog_v2(text,timestamptz,uuid,timestamptz) from public;
grant execute on function public.get_published_listings_catalog_v2(text,timestamptz,uuid,timestamptz) to anon,authenticated;
