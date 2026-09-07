-- ANA SAYFA SAYAÇLARI YÜKLENMİŞ SAYFAYI SAYIYORDU
--
-- ÖLÇÜLDÜ (üretim + canlı sayfa, 7 Eylül 2026, country=TR):
--
--                     ekranda    gerçek
--   Açık ilan            24        62
--   Şirket               23        51
--   Şehir                 4         6
--
-- Sebep: sağ sütundaki üç sayaç `filteredListings` üzerinden hesaplanıyordu
-- ve o dizi yalnızca YÜKLENMİŞ ilk sayfayı taşıyor. Sayfa boyu 24 — yani
-- "24" bir ölçüm değil, sayfa boyunun kendisiydi.
--
-- Aynı ekranda liste başlığı zaten "Açık Staj İlanları (62)" diyordu:
-- sayfa kendi kendisiyle çelişiyordu. Başlık doğruyu söylüyordu çünkü o,
-- sunucudan gelen `total` alanını kullanan `gosterilecekIlanSayisi()`
-- yardımcısından geçiyor.
--
-- ŞİRKET VE ŞEHİR SAYISI İSTEMCİDE HESAPLANAMAZ
-- İstemci yalnız yüklediği 24 kaydı görüyor; "62 ilanın kaç şirkete ait
-- olduğu" sorusunun cevabı sunucuda. Bu yüzden sayım toplamla AYNI yerde,
-- AYNI süzgeçle üretiliyor — üç rakam artık tek sorgudan çıkıyor ve
-- birbiriyle çelişemez.
--
-- Şehir sayısı ham `city` değeri üzerinden: veritabanındaki değerler zaten
-- il adı (Ankara, İstanbul, İzmir, Karaman, Kocaeli, Tekirdağ), yani
-- istemcideki il eşleştirmesiyle aynı sonucu veriyor. Boş ve yalnız boşluk
-- içeren değerler sayılmıyor — "bilinmeyen şehir" bir şehir değil.

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
  watermark timestamptz;
begin
  page := public.get_published_listings_catalog(p_country,p_cursor_posted_at,p_cursor_id,p_snapshot);
  watermark := (page->>'snapshot')::timestamptz;

  /*
    Üç sayı TEK taramadan. Ayrı sorgular yazılsaydı üçü farklı anların
    görüntüsünü verebilirdi; aynı `watermark` ile aynı süzgeçten geçiyorlar.
  */
  select count(*),
         count(distinct l.company_id),
         count(distinct nullif(btrim(l.city),''))
    into total, sirket, sehir
  from public.listings l
  where l.status='published' and l.created_at<=watermark
    and (p_country='all'
      or (p_country='remote' and l.work_type='Remote')
      or (p_country not in ('all','remote') and l.country_code=p_country));

  return page || jsonb_build_object(
    'total', total,
    'companyTotal', sirket,
    'cityTotal', sehir
  );
end;
$function$;

revoke all on function public.get_published_listings_catalog_v2(text,timestamptz,uuid,timestamptz) from public;
grant execute on function public.get_published_listings_catalog_v2(text,timestamptz,uuid,timestamptz) to anon,authenticated;
