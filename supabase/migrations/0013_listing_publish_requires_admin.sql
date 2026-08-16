-- =============================================================================
-- Yayına alma yetkisi yalnızca yöneticide
-- =============================================================================
--
-- BULGU
-- -----
-- `sirket kendi ilanlarini yonetir` politikası şöyleydi:
--
--     for all using (is_company_member(company_id))
--     with check (is_company_member(company_id))
--
-- Yani şirket üyesi ilanı DOĞRUDAN `status = 'published'` olarak
-- ekleyebiliyordu. Arayüz taslak gönderse bile, isteği elle düzenleyen biri
-- onay kuyruğunu tamamen atlardı. "Şirketler ilan girsin ama benim onayımdan
-- geçsin" kuralı veritabanında karşılıksızdı.
--
-- NEDEN TETİKLEYİCİ, NEDEN POLİTİKA DEĞİL
-- ---------------------------------------
-- RLS'in WITH CHECK ifadesi yalnızca YENİ satırı görür, eskisini görmez.
-- Politikaya "published olamaz" yazsaydık şirket kendi YAYINDAKİ ilanını
-- düzenleyemez hale gelirdi — açıklamasındaki bir yazım hatasını bile
-- düzeltemezdi. Yasaklanması gereken şey durum değil, GEÇİŞ: yayında olmayan
-- bir ilanı yayına almak.

create or replace function public.guard_listing_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  rol text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
begin
  -- Otomasyon service_role ile çalışıyor ve derlediği ilanları kendisi yayına
  -- alıyor; onun akışı bu kuralın dışında.
  if rol = 'service_role' then
    return new;
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and not public.is_admin() then
    raise exception 'Ilan yayina ancak yonetici onayiyla alinir'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$BODY$;

drop trigger if exists listings_publish_guard on public.listings;
create trigger listings_publish_guard
  before insert or update on public.listings
  for each row execute function public.guard_listing_publish();

-- Yönetici, üyesi olmadığı şirketin ilanını da onaylayabilmeli.
drop policy if exists "yonetici ilanlari yonetir" on public.listings;
create policy "yonetici ilanlari yonetir" on public.listings
  for all using (public.is_admin()) with check (public.is_admin());

-- DOGRULAMA (gecici bir test kullanicisiyla, gercek HTTP uzerinden olculdu)
--   sirket uyesi TASLAK olusturur          -> 201  izin veriliyor
--   sirket uyesi kendi taslagini yayinlar  -> 400  "Ilan yayina ancak yonetici onayiyla alinir"
--   sirket uyesi dogrudan published ekler  -> 400  ayni hata
--   service_role taslak olusturup yayinlar -> 201 / 204  otomasyon bozulmadi
--   anon yayina almayi dener               -> 401  yetki katmaninda duruyor
-- Test kullanicisi ve ilanlari sonrasinda silindi; yayindaki ilan sayisi 11.
