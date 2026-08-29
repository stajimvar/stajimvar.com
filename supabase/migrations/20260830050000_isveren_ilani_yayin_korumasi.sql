-- İŞVEREN İLANI YAYINA ÇIKABİLİR, DİĞERLERİ ÇIKAMAZ
--
-- guard_listing_publish toplama hattı için yazılmıştı: hiçbir ilan
-- yönetici onayı olmadan yayına çıkamıyordu. Kademe modeli gelince bu
-- kural "ik@sirket.com + alan adı eşleşiyor → ilan canlı" şartıyla
-- çelişti. ÖLÇÜLDÜ: işveren formundan yayınlamak
--   "Ilan yayina ancak yonetici onayiyla alinir"
-- hatası veriyordu. Tarayıcıdaki görsel test bunu göremez; ancak
-- gerçekten kaydetmeye çalışınca çıkıyor.
--
-- Koruma KALKMIYOR, daralıyor. Kendi kendine yayına çıkabilen tek şey
-- işverenin kendi açtığı ilan (origin = employer_posted) ve yalnızca şu
-- iki hâlde:
--
--   Kademe 2  şirket doğrulanmış
--   Kademe 1  şirket üyesi VE şirketin kurumsal maili site alan adıyla
--             eşleşiyor
--
-- Toplanan ilan (scraped/internal/manual) yine yönetici onayı istiyor.
--
-- KARAR İSTEMCİDE DEĞİL BURADA: arayüz "yayınla" diyebilir ama alan adı
-- eşleşmiyorsa veritabanı taslakta bırakır. İstemci kandırılabilir,
-- trigger kandırılamaz.
create or replace function public.guard_listing_publish()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rol text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
  s   public.companies;
begin
  if rol = 'service_role' then
    return new;
  end if;

  if new.status <> 'published'
     or (tg_op = 'UPDATE' and old.status is not distinct from 'published') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.origin = 'employer_posted' and public.is_company_member(new.company_id) then
    select * into s from public.companies where id = new.company_id;

    if s.verified then
      return new;                                   -- Kademe 2
    end if;

    if public.alan_adi_eslesiyor(s.website_url, s.hr_email) then
      return new;                                   -- Kademe 1 + kurumsal mail
    end if;

    raise exception 'Kurumsal e-posta alan adi site adresiyle eslesmiyor; ilan taslak olarak kaydedilir'
      using errcode = 'check_violation';
  end if;

  raise exception 'Ilan yayina ancak yonetici onayiyla alinir'
    using errcode = 'check_violation';
end;
$function$;
