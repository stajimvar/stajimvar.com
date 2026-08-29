-- Aday becerileri: yalnızca DOĞRULANMIŞ şirkete açık.
--
-- Eski kural yalnızca "şirketin üyesiyim ve bu öğrenci bize başvurmuş"
-- diyordu; şirketin doğrulanmış olmasını sormuyordu. Yani "ilan vermek ≠
-- öğrenci görmek" kuralı applications tablosunda tutulurken burada
-- delikti.
--
-- Pratikte ulaşılması zordu: Kademe 1 applications satırlarını göremediği
-- için öğrencinin kimliğini bilmiyordu. Ama "ulaşması zor" bir yetki,
-- olmaması gereken bir yetkidir; kimliği başka bir yoldan öğrenen bir
-- Kademe 1 üyesi becerileri okuyabilirdi.
--
-- Öğrencinin kendi erişimi ("kendi becerileri" politikası) değişmiyor.

drop policy if exists "basvurulan sirket becerileri gorur" on public.student_skills;

create policy "dogrulanmis sirket basvuranin becerilerini gorur"
  on public.student_skills for select
  using (
    exists (
      select 1
      from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.student_id = student_skills.student_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );
