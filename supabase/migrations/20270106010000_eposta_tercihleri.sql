/*
  E-POSTA TERCİHLERİ (9 Kasım 2026, rakip analizi #8)

  Yeni başvuru şirkete e-postayla gidiyor (20261230010000) ama kişi bunu
  kapatamıyordu. Her kullanıcı kendi tercihini yönetiyor; kapalıysa
  bildirim zilde duruyor, yalnız e-postası gitmiyor.

  BU GÖÇ
    1. bildirim_tercihleri (kişi başına bir satır; satır yoksa açık).
    2. bildirim_eposta_kuyruktan_al: tercihi kapalı alıcının bekleyen
       yeni başvuru e-postası "gönderilmiş" sayılıp (son hata
       'tercih-kapali') kuyruktan düşüyor; tercih sonradan açılsa da
       geçmiş e-posta yağmuru olmuyor.

  GERİ ALMA
    -- 20261230010000'deki bildirim_eposta_kuyruktan_al'ı yeniden uygula
    drop table if exists public.bildirim_tercihleri;
*/

create table if not exists public.bildirim_tercihleri (
  user_id uuid primary key references auth.users(id) on delete cascade,
  yeni_basvuru_eposta boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.bildirim_tercihleri enable row level security;

drop policy if exists "kendi tercihini gorur" on public.bildirim_tercihleri;
create policy "kendi tercihini gorur" on public.bildirim_tercihleri
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "kendi tercihini ekler" on public.bildirim_tercihleri;
create policy "kendi tercihini ekler" on public.bildirim_tercihleri
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "kendi tercihini gunceller" on public.bildirim_tercihleri;
create policy "kendi tercihini gunceller" on public.bildirim_tercihleri
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.bildirim_tercihleri from anon;
grant select, insert, update on public.bildirim_tercihleri to authenticated;

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
  /* Tercihi kapalı alıcının bekleyenleri kuyruktan düşüyor. */
  update public.notifications n
     set eposta_gonderildi_at = now(), eposta_son_hata = 'tercih-kapali'
   where n.eposta_gonderildi_at is null
     and n.type = 'yeni_basvuru'
     and exists (select 1 from public.bildirim_tercihleri t
                  where t.user_id = n.recipient_id and not t.yeni_basvuru_eposta);

  return query
  with alinan as (
    select n.id
      from public.notifications n
     where n.eposta_gonderildi_at is null
       and n.type = any (array['yeni_basvuru'])
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
