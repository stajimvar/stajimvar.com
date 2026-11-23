-- PANELDEKİ ÖĞRENCİ SAYISI YALNIZ ÖĞRENCİ ROLÜ (23 Kasım 2026, kullanıcı: "paneldeki öğrenci sayısını düzelt")
--
-- Ölçüldü: panel "50 kayıtlı öğrenci" gösteriyordu; `student_profiles`
-- satırlarının 3'ü şirket, 1'i yönetici hesabı. Gerçek öğrenci 46.
-- `yonetim_ozet` (kart sayıları) ve `yonetim_ogrenciler` (Öğrenciler
-- listesi) yalnız `profiles.role = 'student'` hesapları sayıyor. Başvuru
-- sayısındaki ekip ayrımı (20270116010000) aynen duruyor.

create or replace function public.yonetim_ozet()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
begin
  if not public.is_admin() then
    raise exception 'yonetim_ozet yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    /*
      YALNIZ ÖĞRENCİ ROLÜ (20270120010000): `student_profiles` satırı
      şirket ve yönetici hesaplarında da var (ölçüldü: 50 satırın 3'ü şirket,
      1'i yönetici). Kart "kayıtlı öğrenci" diyor; gerçek öğrenci sayılıyor.
    */
    'ogrenci',      (select count(*) from student_profiles sp
                      join profiles p on p.id = sp.id and p.role = 'student'),
    'profilDolu',   (select count(*) from student_profiles sp
                      join profiles p on p.id = sp.id and p.role = 'student'
                      where sp.university is not null and sp.university <> ''),
    'teklifeAcik',  (select count(*) from student_profiles sp
                      join profiles p on p.id = sp.id and p.role = 'student'
                      where sp.is_open_to_offers is true),
    'rozet',        (select coalesce(sum(coalesce(array_length(sp.earned_badges, 1), 0)), 0)
                      from student_profiles sp
                      join profiles p on p.id = sp.id and p.role = 'student'),

    /*
      EKİP HESAPLARI AYRI (20270116010000): yönetici rolündeki hesabın
      başvuruları deneme ve kendi takip listesi; "toplam başvuru"ya girerse
      gerçek öğrenci ilgisini olduğundan büyük gösteriyor (ölçüldü: 13
      başvurunun 9'u kurucunun hesabından).
    */
    'basvuru',      (select count(*) from applications a
                      where not exists (select 1 from profiles p
                                         where p.id = a.student_id and p.role = 'admin')),
    'basvuruEkip',  (select count(*) from applications a
                      where exists (select 1 from profiles p
                                     where p.id = a.student_id and p.role = 'admin')),

    -- Yayındaki ilan: toplam ve kaynağına göre kırılım.
    'ilanYayinToplam', (select count(*) from listings where status = 'published'),
    'ilanNative',      (select count(*) from listings
                         where status = 'published' and origin in ('employer_posted', 'internal')),
    'ilanElle',        (select count(*) from listings
                         where status = 'published' and origin = 'manual'),
    'ilanTaranan',     (select count(*) from listings
                         where status = 'published' and origin = 'scraped'),

    -- Onay bekleyen: TÜM taslaklar. Eskiden yalnız `origin = 'internal'`
    -- sayılıyordu; o değeri hiçbir satır kullanmıyor, dolayısıyla kuyruk her
    -- zaman boş görünüyordu ve incelenmeyi bekleyen taslaklar kayboluyordu.
    'taslakToplam',  (select count(*) from listings where status = 'draft'),
    'taslakNative',  (select count(*) from listings
                       where status = 'draft' and origin in ('employer_posted', 'internal')),
    'taslakTaranan', (select count(*) from listings
                       where status = 'draft' and origin = 'scraped'),

    'sirket',        (select count(*) from companies),
    'sahiplenmis',   (select count(*) from companies where claimed_at is not null),
    'bekleyenTalep', (select count(*) from company_claims where status = 'pending'),

    'sonTarama', (
      select jsonb_build_object(
               'zaman',   started_at,
               'durum',   status,
               'bulunan', coalesce(fetched_count, 0))
      from import_runs order by started_at desc limit 1
    ),

    -- Son 7 gün: kaydı OLMAYAN günler de sıfırla dönüyor. Yalnız dolu günleri
    -- döndürmek, "son 7 gün" başlıklı grafiği iki çubukla çizdiriyordu.
    'sonKayitlar', (
      select coalesce(jsonb_agg(
               jsonb_build_object('tarih', to_char(g.gun, 'YYYY-MM-DD'), 'sayi', s.sayi)
               order by g.gun), '[]'::jsonb)
      from generate_series(
             (now() at time zone 'Europe/Istanbul')::date - 6,
             (now() at time zone 'Europe/Istanbul')::date,
             interval '1 day') as g(gun)
      cross join lateral (
        select count(*) as sayi from profiles p
        where (p.created_at at time zone 'Europe/Istanbul')::date = g.gun::date
      ) s
    )
  ) into sonuc;

  return sonuc;
end;
$$;

create or replace function public.yonetim_ogrenciler(
  p_arama text default null,
  p_limit int  default 50,
  p_ofset int  default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  ara text := nullif(btrim(coalesce(p_arama, '')), '');
  sinir int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if not public.is_admin() then
    raise exception 'yonetim_ogrenciler yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  with temel as (
    select sp.id,
           p.full_name,
           u.email,
           sp.university, sp.faculty, sp.department, sp.grade_level,
           sp.city, sp.is_open_to_offers, sp.updated_at,
           (select count(*) from applications a where a.student_id = sp.id) as basvuru,
           (select max(o.olustu_at) from site_olaylari o where o.kullanici_id = sp.id) as son_gorulme
    from student_profiles sp
    /* Yalnız öğrenci rolü (20270120010000): şirket ve yönetici hesabı listede yok. */
    join profiles p on p.id = sp.id and p.role = 'student'
    left join auth.users u on u.id = sp.id
  ),
  suzulmus as (
    select * from temel
    where ara is null
       or full_name  ilike '%' || ara || '%'
       or email      ilike '%' || ara || '%'
       or university ilike '%' || ara || '%'
       or department ilike '%' || ara || '%'
  )
  select jsonb_build_object(
    'toplam', (select count(*) from suzulmus),
    'satirlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',          s.id,
               'ad',          s.full_name,
               'eposta',      s.email,
               'okul',        s.university,
               'fakulte',     s.faculty,
               'bolum',       s.department,
               'sinif',       s.grade_level,
               'sehir',       s.city,
               'teklifeAcik', s.is_open_to_offers,
               'basvuru',     s.basvuru,
               'sonGorulme',  s.son_gorulme,
               'guncellendi', s.updated_at
             ) order by s.updated_at desc nulls last), '[]'::jsonb)
      from (select * from suzulmus order by updated_at desc nulls last
            limit sinir offset greatest(coalesce(p_ofset, 0), 0)) s
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_ozet() from public, anon;
grant execute on function public.yonetim_ozet() to authenticated;
revoke all on function public.yonetim_ogrenciler(text, int, int) from public, anon;
grant execute on function public.yonetim_ogrenciler(text, int, int) to authenticated;
