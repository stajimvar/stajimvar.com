-- ÖĞRENCİNİN KARARI NİHAİ
--
-- ÖLÇÜM (üretim şeması, 31 Ağustos 2026)
-- --------------------------------------
-- İşveren güncelleme politikasının WITH CHECK ifadesi şunu diyor:
--
--   status not in ('withdrawn', 'offer_accepted', 'offer_declined')
--
-- Yani şirket bu üç değere GEÇEMİYOR. Ama WITH CHECK yalnızca YENİ
-- satırı görüyor: başvuru `offer_accepted` durumundayken şirket onu
-- `rejected` ya da `under_review` yapabiliyordu — çünkü yeni değer
-- yasak listede değil.
--
-- Sonuç: öğrencinin verdiği karar geri alınabiliyordu. Arayüzde teklif
-- kabul edilmiş adayda hâlâ aktif bir durum seçici duruyordu ve o
-- seçici gerçekten çalışıyordu.
--
-- Kuralı arayüzde kapatıp veritabanında açık bırakmak, kuralı hiç
-- koymamaktır. Üç durum artık ŞİRKET İÇİN NİHAİ:
--
--   offer_accepted  öğrenci teklifi kabul etti
--   offer_declined  öğrenci teklifi reddetti
--   withdrawn       öğrenci başvurusunu geri çekti
--
-- Üçü de ÖĞRENCİNİN kararı. Şirket bunları veremiyordu; artık
-- bozamıyor da.
--
-- `rejected` BİLEREK DIŞARIDA
-- ---------------------------
-- O şirketin KENDİ kararı ve yanlışlıkla verilmiş bir kararı
-- düzeltebilmek meşru (20260910010000'de bu açıkça yazılmıştı). Akış
-- tek yönlü değil; şirket bir adayı olumsuz kapatıp sonra geri
-- açabilmeli.
--
-- WITH CHECK yerine tetikleyici: değerin ESKİ hâlini görmek gerekiyor
-- ve politikanın WITH CHECK ifadesi yalnız yeni satırı görüyor.
create or replace function public.guard_ogrenci_karari_nihai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Durum değişmiyorsa (not, CV, mülakat alanı yazımı) söylenecek bir şey yok.
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status not in ('offer_accepted', 'offer_declined', 'withdrawn') then
    return new;
  end if;

  -- Öğrencinin kendisi: kendi kararını değiştirmesi bu turun konusu
  -- değil ve zaten kendi politikası sonucu `withdrawn` olmaya zorluyor.
  if auth.uid() = old.student_id then
    return new;
  end if;

  -- service_role bakım için yazabiliyor.
  if coalesce(
       (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::json ->> 'role'),
       ''
     ) = 'service_role'
  then
    return new;
  end if;

  raise exception 'Öğrencinin verdiği karar değiştirilemez.' using errcode = '42501';
end;
$$;

revoke execute on function public.guard_ogrenci_karari_nihai() from public, anon, authenticated;

drop trigger if exists applications_guard_ogrenci_karari on public.applications;
create trigger applications_guard_ogrenci_karari
  before update on public.applications
  for each row execute function public.guard_ogrenci_karari_nihai();
