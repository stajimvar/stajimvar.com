/*
  İLAN GÜNLÜK İSTATİSTİĞİ (9 Kasım 2026, rakip analizi #11)

  Kartta toplam sayı vardı (20270101010000); gün gün eğri ve
  görüntülenme → başvuru dönüşümü yoktu. Aynı ölçüm kuralı: ilan
  sayfasını açan farklı oturum, şirketin kendi üyeleri sayılmıyor.
  Günler İstanbul saatine göre; olay olmayan gün 0 olarak dönüyor.

  Yalnız ilanın şirket üyeleri (ve yönetici); yalnız sayılar.

  GERİ ALMA
    drop function if exists public.sirket_ilan_gunluk(uuid, integer);
*/

create or replace function public.sirket_ilan_gunluk(p_ilan uuid, p_gun integer default 30)
returns table (gun date, goruntulenme integer, basvuru integer)
language sql stable security definer set search_path to 'public'
as $$
  with ilan as (
    select l.id, l.company_id, left(l.id::text, 8) as onek
      from public.listings l
     where l.id = p_ilan
       and (public.is_company_member(l.company_id) or public.is_admin())
  ), gunler as (
    select g::date as gun
      from ilan,
           generate_series(
             (now() at time zone 'Europe/Istanbul')::date - (greatest(1, least(p_gun, 90)) - 1),
             (now() at time zone 'Europe/Istanbul')::date,
             interval '1 day') g
  ), olay as (
    select (s.olustu_at at time zone 'Europe/Istanbul')::date as gun, s.oturum
      from ilan i
      join public.site_olaylari s
        on s.tur in ('girdi', 'sayfa')
       and s.yol like '/ilan/%'
       and right(s.yol, 8) = i.onek
     where s.olustu_at >= now() - make_interval(days => greatest(1, least(p_gun, 90)) + 1)
       and (s.kullanici_id is null
            or s.kullanici_id not in (select m.user_id from public.company_members m
                                       where m.company_id = i.company_id))
  ), basvuru as (
    select (a.applied_at at time zone 'Europe/Istanbul')::date as gun
      from ilan i
      join public.applications a on a.listing_id = i.id
     where a.applied_at >= now() - make_interval(days => greatest(1, least(p_gun, 90)) + 1)
  )
  select g.gun,
         (select count(distinct o.oturum) from olay o where o.gun = g.gun)::int,
         (select count(*) from basvuru b where b.gun = g.gun)::int
    from gunler g
   order by g.gun;
$$;

revoke all on function public.sirket_ilan_gunluk(uuid, integer) from public, anon;
grant execute on function public.sirket_ilan_gunluk(uuid, integer) to authenticated;
