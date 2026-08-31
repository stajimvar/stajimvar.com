-- DURUM GEÇİŞ KURALI TEK YERDE: TETİKLEYİCİDE
--
-- ÖLÇÜM
-- -----
-- İşveren güncelleme politikasının WITH CHECK ifadesi şöyleydi:
--
--   status not in ('withdrawn', 'offer_accepted', 'offer_declined')
--   and exists (üyelik + doğrulama)
--
-- Amaç "şirket bu değerlere GEÇEMESİN" idi. Ama WITH CHECK yalnızca
-- YENİ satırı görüyor ve satırın tamamına bakıyor: teklif kabul edilmiş
-- bir başvuruda şirket NOT yazmaya çalıştığında da yeni satırın
-- `status` değeri hâlâ `offer_accepted` olduğu için ifade düşüyordu.
--
-- Regresyon bunu yakaladı: "A, kabul edilmis basvuruya not yazabilir"
-- kontrolü kırmızıya döndü. Yani kural, yasaklamak istediğinden
-- fazlasını yasaklıyordu — kabul edilmiş bir adaya not yazmak, mülakat
-- tarihini düzeltmek, CV alanına dokunmak da engelleniyordu.
--
-- ÇÖZÜM
-- -----
-- Geçiş kuralı ESKİ ve YENİ değeri birlikte görmek zorunda; WITH CHECK
-- bunu yapısal olarak yapamıyor. Kural tamamen tetikleyiciye taşınıyor
-- (zaten kararın nihailiğini orada koruyorduk) ve politika yalnızca
-- "bu şirketin ilanına gelen başvuru mu" sorusuna bakıyor.
--
-- Kural aynı, yeri değişti. İki yarısı iki farklı mekanizmada durduğu
-- sürece hangisinin neyi kapsadığı belirsizdi.

drop policy if exists "dogrulanmis sirket basvuru durumu gunceller" on public.applications;

create policy "dogrulanmis sirket basvuru durumu gunceller" on public.applications
  for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );

/**
 * DURUM GEÇİŞLERİ — ŞİRKET TARAFI
 *
 * İki yasak, ikisi de aynı gerekçeyle: bunlar ÖĞRENCİNİN kararı.
 *
 *   1. Şirket bu değerlere GEÇEMEZ.
 *      (teklifi kabul/ret etmek, başvurudan vazgeçmek adayın kararı)
 *
 *   2. Şirket bu değerlerden ÇIKAMAZ.
 *      (verilmiş kararı geri almak da aynı şey)
 *
 * `rejected` ikisinde de yok: o şirketin KENDİ kararı. Verebiliyor ve
 * yanlışlıkla verdiyse geri alabiliyor.
 *
 * Durum DIŞINDAKİ alanlar serbest: kabul edilmiş bir adaya not yazmak,
 * görüşme tarihini düzeltmek engellenmiyor.
 */
create or replace function public.guard_ogrenci_karari_nihai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ogrencinin_karari constant application_status[] :=
    array['offer_accepted', 'offer_declined', 'withdrawn']::application_status[];
begin
  -- Durum değişmiyorsa söylenecek bir şey yok: not, CV, görüşme alanları
  -- serbestçe yazılabiliyor.
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Öğrencinin kendisi. Kendi başvurusunu geri çekmesi kendi
  -- politikasıyla zaten `withdrawn` ile sınırlı; kabul/ret ise ayrı bir
  -- kapıdan (teklife_yanit_ver) geçiyor.
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

  if new.status = any (v_ogrencinin_karari) then
    raise exception 'Bu kararı yalnızca aday verebilir.' using errcode = '42501';
  end if;

  if old.status = any (v_ogrencinin_karari) then
    raise exception 'Öğrencinin verdiği karar değiştirilemez.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_ogrenci_karari_nihai() from public, anon, authenticated;

drop trigger if exists applications_guard_ogrenci_karari on public.applications;
create trigger applications_guard_ogrenci_karari
  before update on public.applications
  for each row execute function public.guard_ogrenci_karari_nihai();
