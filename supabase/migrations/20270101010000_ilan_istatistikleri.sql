/*
  İLAN İSTATİSTİKLERİ (9 Kasım 2026, kullanıcı: "önerilerini yap")

  Şirket ilanının kaç kez görüntülendiğini ve kaç öğrencinin kaydettiğini
  göremiyordu; "ilanım işe yarıyor mu" sorusunun cevabı yoktu.

  KAYNAK: sitenin kendi ölçümü (site_olaylari, 10 Ekim 2026'dan beri).
  Görüntülenme = ilan sayfasını açan farklı oturum sayısı ('girdi' ve
  'sayfa' olayları; ilan adresinin son 8 hanesi kimlik öneki). Şirketin
  KENDİ üyelerinin oturumları sayılmıyor: kendi ilanına bakan İK sayıyı
  şişirmesin. Kaydeden = saved_listings, başvuru = applications.

  Yalnız şirketin üyeleri (ve yönetici) okuyabiliyor; öğrenci kimliği
  dönmüyor, yalnız sayılar.

  GERİ ALMA
    drop function if exists public.sirket_ilan_istatistikleri(uuid);
*/

create or replace function public.sirket_ilan_istatistikleri(p_sirket uuid)
returns table (ilan_id uuid, goruntulenme integer, son_yedi_gun integer, kaydeden integer, basvuru integer)
language sql stable security definer set search_path to 'public'
as $$
  with yetki as (
    select (public.is_company_member(p_sirket) or public.is_admin()) as var
  ), ilanlar as (
    select l.id, left(l.id::text, 8) as onek
      from public.listings l, yetki
     where yetki.var and l.company_id = p_sirket and l.status <> 'archived'
  ), uyeler as (
    select m.user_id from public.company_members m where m.company_id = p_sirket
  ), olay as (
    select i.id, s.oturum, s.olustu_at
      from ilanlar i
      join public.site_olaylari s
        on s.tur in ('girdi', 'sayfa')
       and s.yol like '/ilan/%'
       and right(s.yol, 8) = i.onek
     where s.kullanici_id is null
        or s.kullanici_id not in (select u.user_id from uyeler u)
  )
  select i.id,
         coalesce((select count(distinct o.oturum) from olay o where o.id = i.id), 0)::int,
         coalesce((select count(distinct o.oturum) from olay o
                    where o.id = i.id and o.olustu_at > now() - interval '7 days'), 0)::int,
         (select count(*) from public.saved_listings s where s.listing_id = i.id)::int,
         (select count(*) from public.applications a where a.listing_id = i.id)::int
    from ilanlar i;
$$;

revoke all on function public.sirket_ilan_istatistikleri(uuid) from public, anon;
grant execute on function public.sirket_ilan_istatistikleri(uuid) to authenticated;
