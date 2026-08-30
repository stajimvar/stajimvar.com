-- ÜÇÜNCÜ YETKİ AÇIĞI: BAŞVURMAMIŞ ÖĞRENCİNİN PROFİLİ
--
-- Ölçüldü: hiç başvuru almamış, yeni doğrulanmış bir şirket 11 öğrencinin
-- üniversitesini, bölümünü, notunu, GitHub'ını, LinkedIn'ini ve cv_path
-- alanını okuyabiliyordu. Tek kapı `is_open_to_offers` idi — o bir öğrenci
-- bayrağı ve "teklif almaya açığım" demek; "her doğrulanmış şirket bütün
-- profilimi ve CV yolumu okusun" demek değil.
--
-- Ürün kuralı açıktı: "Yasak: başvurmamış öğrenci kartı" ve "ilan
-- verebilmek ile öğrenci kişisel verisine erişebilmek aynı izin değil".
-- Veritabanı bu kurala uymuyordu.
--
-- Yeni kural student_skills ile AYNI şekle getirildi (geçen turda o
-- daraltılmıştı): öğrenci o şirketin bir ilanına BAŞVURMUŞ olmalı VE
-- şirket doğrulanmış olmalı.

drop policy if exists "dogrulanmis sirketler acik profilleri gorur" on public.student_profiles;

create policy "dogrulanmis sirket basvuranin profilini gorur"
  on public.student_profiles for select
  using (
    exists (
      select 1
      from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.student_id = student_profiles.id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );

/*
  student_projects'te ŞİRKET KONTROLÜ HİÇ YOKTU: kural yalnızca "profil
  teklife açık mı" diye soruyordu, kimin okuduğuna hiç bakmıyordu.
*/
drop policy if exists "projeler acik profillerde gorunur" on public.student_projects;

create policy "dogrulanmis sirket basvuranin projelerini gorur"
  on public.student_projects for select
  using (
    exists (
      select 1
      from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.student_id = student_projects.student_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );

/*
  TOPLU SAYI SATIR ERİŞİMİ GEREKTİRMİYOR

  İşveren sayfasındaki "staj arayan öğrenci sayısı" satır okuyarak
  hesaplanıyordu; artık satır okunamadığı için sayı da gelmezdi. Toplu sayı
  kimseyi tanımlanabilir kılmıyor, o yüzden ayrı bir fonksiyona alındı:
  sayıyı veriyor, satırı vermiyor.
*/
create or replace function public.staj_arayan_ogrenci_ozeti()
returns table (toplam bigint, en_cok_bolum text, en_cok_sehir text)
language sql stable security definer set search_path to 'public'
as $$
  with acik as (
    select department, pref_cities from public.student_profiles where is_open_to_offers
  )
  select
    (select count(*) from acik),
    (select department from acik where department is not null
      group by department order by count(*) desc, department limit 1),
    (select sehir from (select unnest(pref_cities) as sehir from acik) x
      where sehir is not null group by sehir order by count(*) desc, sehir limit 1);
$$;

grant execute on function public.staj_arayan_ogrenci_ozeti() to anon, authenticated;
