-- BAŞVURU ALMIŞ İLAN SİLİNEMEZ
--
-- ÖLÇÜLDÜ: `applications_listing_id_fkey` ON DELETE CASCADE. Bir ilanı
-- silmek, o ilana yapılmış HER BAŞVURUYU da siliyor — şirketin kaydını
-- da, öğrencinin kendi başvuru geçmişini de. Öğrenci "Başvurularım"
-- listesinden bir satırın neden kaybolduğunu hiçbir yerde göremezdi.
--
-- Panele silme eylemi eklenirken bu yol açıldı. Kuralı arayüzde tutmak
-- yetmez: `listings` üzerindeki RLS politikası FOR ALL ve şirket üyesi
-- kendi ilanını doğrudan silebiliyor.
--
-- KONTROL NEDEN İSTEMCİDE OLAMAZ
-- ------------------------------
-- Panel "başvurusu var mı" diye sorabilir ama DOĞRULANMAMIŞ şirket
-- `applications` tablosunu okuyamıyor (SELECT politikası
-- `sirket_dogrulandi()` istiyor). O şirkette sayım sıfır döner ve
-- başvurulu bir ilan silinebilirdi. Sayımı burada yapmak o boşluğu
-- kapatıyor.
--
-- ARŞİV VAR
-- ---------
-- Şirketin gerçek ihtiyacı "listeden kaldırmak"; o da `archived`
-- durumuyla karşılanıyor ve veri duruyor.
--
-- service_role muaf: sunucu tarafındaki bakım işleri (veri taşıma,
-- KVKK silme talebi) bilinçli olarak yapılıyor ve kendi kayıtlarını
-- tutuyor.
create or replace function public.guard_listing_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  rol text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
  n int;
begin
  if rol = 'service_role' then
    return old;
  end if;

  select count(*) into n from public.applications where listing_id = old.id;
  if n > 0 then
    raise exception
      'Bu ilana % basvuru gelmis; silmek basvurulari da siler. Ilani arsivleyin.', n
      using errcode = 'restrict_violation';
  end if;

  return old;
end;
$$;

revoke all on function public.guard_listing_delete() from public, anon, authenticated;

drop trigger if exists listings_guard_delete on public.listings;
create trigger listings_guard_delete
  before delete on public.listings
  for each row execute function public.guard_listing_delete();
