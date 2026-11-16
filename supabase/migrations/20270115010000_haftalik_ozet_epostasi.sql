-- HAFTALIK ÖZET E-POSTASI (16 Kasım 2026)
--
-- NEDEN
-- -----
-- Öğrenciyi siteye geri getiren bir e-posta yoktu. `gunluk_bildirimler`
-- pazartesi günleri "Haftalık özetin" bildirimini zaten üretiyor
-- (20261227010000: bölümüne uygun yeni ilan sayısı + kaydettiği ilanların
-- bu hafta dolan son başvuruları) ama yalnız zile düşüyordu; siteye
-- girmeyen öğrenci hiç görmüyordu. Ölçüldü: 35 öğrencinin 15'i son 30
-- günde giriş yapmış.
--
-- NE DEĞİŞİYOR
-- ------------
-- Aynı bildirim e-posta kuyruğuna da giriyor (yeni tür: haftalik_ozet).
-- Yeni içerik üretilmiyor: e-posta, zildeki satırın kopyası.
-- Öğrenci Bildirim ayarlarından kapatabiliyor (`haftalik_ozet_eposta`);
-- kapalıyken zil bildirimi yine geliyor. Yalnız e-postası DOĞRULANMIŞ
-- hesaba gidiyor (kuyruğun var olan kuralı).

alter table public.bildirim_tercihleri
  add column if not exists haftalik_ozet_eposta boolean not null default true;

comment on column public.bildirim_tercihleri.haftalik_ozet_eposta is
  'Pazartesi haftalık özet bildiriminin e-posta kopyası; kapalıyken yalnız zil.';

/*
  Bu göçten ÖNCE üretilmiş haftalık özetler e-postaya dönmesin: eski
  haftaların özeti bugün gelen kutusuna düşerse yanıltıcı olurdu.
*/
update public.notifications
   set eposta_gonderildi_at = now(), eposta_son_hata = 'goc-oncesi'
 where eposta_gonderildi_at is null
   and type = 'haftalik_ozet';

create or replace function public.eposta_tetikle_bildirim()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if exists (select 1 from yeni_satirlar y
              where y.type in ('yeni_basvuru', 'takip_ilan', 'sirket_onaylandi', 'sahiplenme_onaylandi', 'haftalik_ozet')) then
    perform public.eposta_tetik_cagir();
  end if;
  return null;
end;
$$;

revoke all on function public.eposta_tetikle_bildirim() from public, anon, authenticated;

create or replace function public.bildirim_eposta_kuyruktan_al(
  p_adet integer default 20,
  p_kilit_dakika integer default 10
)
returns table (id uuid, alici text, tur text, baslik text, govde text, hedef text, created_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  /* Tercihi kapalı alıcının bekleyenleri kuyruktan düşüyor (zil bildirimi duruyor). */
  update public.notifications n
     set eposta_gonderildi_at = now(), eposta_son_hata = 'tercih-kapali'
   where n.eposta_gonderildi_at is null
     and n.type in ('yeni_basvuru', 'takip_ilan', 'haftalik_ozet')
     and exists (select 1 from public.bildirim_tercihleri t
                  where t.user_id = n.recipient_id
                    and ((n.type = 'yeni_basvuru' and not t.yeni_basvuru_eposta)
                      or (n.type = 'takip_ilan' and not t.takip_ilan_eposta)
                      or (n.type = 'haftalik_ozet' and not t.haftalik_ozet_eposta)));

  return query
  with alinan as (
    select n.id
      from public.notifications n
     where n.eposta_gonderildi_at is null
       and n.type = any (array['yeni_basvuru', 'takip_ilan', 'sirket_onaylandi', 'sahiplenme_onaylandi', 'haftalik_ozet'])
       and n.eposta_denemeleri < 8
       and n.eposta_sonraki_at <= now()
       and exists (select 1 from auth.users u
                    where u.id = n.recipient_id and u.email_confirmed_at is not null)
     order by n.created_at
     limit greatest(1, least(p_adet, 100))
       for update skip locked
  ), kilit as (
    update public.notifications g
       set eposta_sonraki_at = now() + make_interval(mins => greatest(1, p_kilit_dakika))
     where g.id in (select a.id from alinan a)
    returning g.*
  )
  select k.id, u.email::text, k.type, k.title, k.body, k.target_url, k.created_at
    from kilit k
    join auth.users u on u.id = k.recipient_id and u.email_confirmed_at is not null;
end;
$$;

revoke all on function public.bildirim_eposta_kuyruktan_al(integer, integer) from public, anon, authenticated;
grant execute on function public.bildirim_eposta_kuyruktan_al(integer, integer) to service_role;
