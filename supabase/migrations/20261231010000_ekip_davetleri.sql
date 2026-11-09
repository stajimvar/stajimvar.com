/*
  EKİP DAVETİ (9 Kasım 2026, kullanıcı: "önerilerini yap")

  İşveren sayfası "Aynı şirkette birden çok kişi çalışabilir" diyordu ama
  bir şirket sahibinin iş arkadaşını ekleyebileceği bir yol yoktu.

  AKIŞ
    1. Şirket SAHİBİ (is_owner) Şirketim → Ayarlar → Ekip ekranından
       e-posta ve rol (Recruiter ya da Viewer) girer: ekip_daveti_gonder.
       Yalnız doğrulanmış şirket davet edebilir.
    2. Davet edilene e-posta gider (bu tablonun kendi kuyruğu; kişinin
       henüz hesabı olmayabilir). Hesabı varsa zile de bildirim düşer.
    3. Kişi bu e-postayla giriş yapıp /isveren/baslangic'ta daveti görür ve
       kabul eder: ekip_davetini_kabul_et. Kabul için hesabın DOĞRULANMIŞ
       e-postası davet adresiyle aynı olmalı.
    4. Sahip bekleyen daveti iptal edebilir, sahip olmayan üyeyi ekipten
       çıkarabilir.

  KÖTÜYE KULLANIMA KARŞI
    Davet e-postası bizim alan adımızdan gidiyor. Şirket başına son 24
    saatte en çok 10 davet ve aynı anda en çok 20 bekleyen davet. E-posta
    metni sabit; davet edenin yazdığı serbest metin yok.

  GERİ ALMA
    drop function if exists public.ekip_daveti_gonder(uuid, text, text);
    drop function if exists public.ekip_davetleri(uuid);
    drop function if exists public.ekip_davetini_iptal(uuid);
    drop function if exists public.benim_ekip_davetlerim();
    drop function if exists public.ekip_davetini_kabul_et(uuid);
    drop function if exists public.ekip_uyesini_cikar(uuid, uuid);
    drop function if exists public.ekip_daveti_eposta_kuyruktan_al(integer, integer);
    drop function if exists public.ekip_daveti_eposta_isaretle(uuid, boolean, text);
    drop table if exists public.sirket_davetleri;
*/

create table if not exists public.sirket_davetleri (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  eposta text not null check (eposta = lower(btrim(eposta)) and eposta ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  rol text not null check (rol in ('Recruiter', 'Viewer')),
  davet_eden uuid references auth.users(id) on delete set null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'kabul', 'iptal')),
  created_at timestamptz not null default now(),
  karar_at timestamptz,
  eposta_gonderildi_at timestamptz,
  eposta_denemeleri integer not null default 0,
  eposta_son_hata text,
  eposta_sonraki_at timestamptz not null default now()
);

create unique index if not exists sirket_davetleri_bekleyen_tekil
  on public.sirket_davetleri (company_id, eposta) where durum = 'bekliyor';
create index if not exists sirket_davetleri_eposta_idx on public.sirket_davetleri (eposta) where durum = 'bekliyor';

alter table public.sirket_davetleri enable row level security;
/* Politika yok: tabloya yalnız aşağıdaki işlevlerden erişiliyor. */
revoke all on public.sirket_davetleri from public, anon, authenticated;

-- Sahip mi ---------------------------------------------------------------------

create or replace function public.sirket_sahibi_mi(p_sirket uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.company_members m
     where m.company_id = p_sirket and m.user_id = auth.uid() and m.is_owner
  );
$$;

-- Davet gönder -----------------------------------------------------------------

create or replace function public.ekip_daveti_gonder(p_sirket uuid, p_eposta text, p_rol text)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare
  e text := lower(btrim(coalesce(p_eposta, '')));
  yeni_id uuid;
  hedef uuid;
  sirket_adi text;
begin
  if not public.sirket_sahibi_mi(p_sirket) then
    raise exception 'yalnizca sirket sahibi davet edebilir' using errcode = '42501';
  end if;
  if not exists (select 1 from public.companies c where c.id = p_sirket and c.verified) then
    raise exception 'sirket dogrulanmadan davet gonderilemez' using errcode = 'check_violation';
  end if;
  if p_rol not in ('Recruiter', 'Viewer') then
    raise exception 'gecersiz rol' using errcode = 'check_violation';
  end if;
  if e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'gecersiz e-posta' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.company_members m join auth.users u on u.id = m.user_id
     where m.company_id = p_sirket and lower(u.email) = e
  ) then
    raise exception 'bu kisi zaten ekipte' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.sirket_davetleri d
       where d.company_id = p_sirket and d.created_at > now() - interval '24 hours') >= 10 then
    raise exception 'gunluk davet siniri doldu' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.sirket_davetleri d
       where d.company_id = p_sirket and d.durum = 'bekliyor') >= 20 then
    raise exception 'bekleyen davet siniri doldu' using errcode = 'check_violation';
  end if;

  insert into public.sirket_davetleri (company_id, eposta, rol, davet_eden)
  values (p_sirket, e, p_rol, auth.uid())
  on conflict (company_id, eposta) where durum = 'bekliyor'
  do update set rol = excluded.rol
  returning id into yeni_id;

  /* Hesabı varsa zile de; e-posta davet tablosunun kuyruğundan gidiyor. */
  select u.id into hedef from auth.users u where lower(u.email) = e and u.email_confirmed_at is not null limit 1;
  if hedef is not null then
    select c.name into sirket_adi from public.companies c where c.id = p_sirket;
    begin
      insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
      values (hedef, 'ekip_daveti', 'Ekibe davet edildin',
              coalesce(nullif(trim(sirket_adi), ''), 'Bir şirket') || ' seni StajımVar''daki işveren ekibine davet etti.',
              '/isveren/baslangic', 'ekip-daveti:' || yeni_id::text)
      on conflict (dedupe_key) where dedupe_key is not null do nothing;
    exception when others then
      raise warning 'ekip_daveti bildirimi: %', sqlerrm;
    end;
  end if;

  return yeni_id;
end;
$$;

-- Şirketin bekleyen davetleri (sahip) -------------------------------------------

create or replace function public.ekip_davetleri(p_sirket uuid)
returns table (id uuid, eposta text, rol text, created_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select d.id, d.eposta, d.rol, d.created_at
    from public.sirket_davetleri d
   where d.company_id = p_sirket and d.durum = 'bekliyor'
     and public.sirket_sahibi_mi(p_sirket)
   order by d.created_at desc;
$$;

create or replace function public.ekip_davetini_iptal(p_davet uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  update public.sirket_davetleri d
     set durum = 'iptal', karar_at = now()
   where d.id = p_davet and d.durum = 'bekliyor' and public.sirket_sahibi_mi(d.company_id);
  if not found then
    raise exception 'davet bulunamadi' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Davet edilenin tarafı ---------------------------------------------------------

create or replace function public.benim_ekip_davetlerim()
returns table (id uuid, sirket_adi text, sirket_logo text, rol text, created_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select d.id, c.name, c.logo_url, d.rol, d.created_at
    from public.sirket_davetleri d
    join public.companies c on c.id = d.company_id
    join auth.users u on u.id = auth.uid() and u.email_confirmed_at is not null
   where d.durum = 'bekliyor' and d.eposta = lower(u.email)
   order by d.created_at desc;
$$;

create or replace function public.ekip_davetini_kabul_et(p_davet uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare
  d public.sirket_davetleri;
  e text;
begin
  select lower(u.email) into e from auth.users u
   where u.id = auth.uid() and u.email_confirmed_at is not null;
  if e is null then
    raise exception 'e-posta dogrulanmamis' using errcode = '42501';
  end if;
  select * into d from public.sirket_davetleri where id = p_davet for update;
  if not found or d.durum <> 'bekliyor' or d.eposta <> e then
    raise exception 'davet bulunamadi' using errcode = 'no_data_found';
  end if;

  insert into public.company_members (company_id, user_id, recruiter_role, is_owner)
  values (d.company_id, auth.uid(), d.rol, false)
  on conflict (company_id, user_id) do nothing;

  update public.profiles set role = 'company' where id = auth.uid() and role is distinct from 'admin';
  update public.sirket_davetleri set durum = 'kabul', karar_at = now() where id = p_davet;
  return d.company_id;
end;
$$;

-- Üyeyi çıkar (sahip; sahip çıkarılamaz) ---------------------------------------

create or replace function public.ekip_uyesini_cikar(p_sirket uuid, p_uye uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.sirket_sahibi_mi(p_sirket) then
    raise exception 'yalnizca sirket sahibi cikarabilir' using errcode = '42501';
  end if;
  delete from public.company_members m
   where m.company_id = p_sirket and m.user_id = p_uye and not m.is_owner;
  if not found then
    raise exception 'uye bulunamadi ya da sahip' using errcode = 'no_data_found';
  end if;
end;
$$;

-- E-posta kuyruğu (service_role) -------------------------------------------------

create or replace function public.ekip_daveti_eposta_kuyruktan_al(p_adet integer default 20, p_kilit_dakika integer default 10)
returns table (id uuid, eposta text, sirket_adi text, rol text, davet_eden_ad text, hesap_var boolean)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  return query
  with alinan as (
    select d.id from public.sirket_davetleri d
     where d.durum = 'bekliyor' and d.eposta_gonderildi_at is null
       and d.eposta_denemeleri < 8 and d.eposta_sonraki_at <= now()
     order by d.created_at
     limit greatest(1, least(p_adet, 100))
       for update skip locked
  ), kilit as (
    update public.sirket_davetleri g
       set eposta_sonraki_at = now() + make_interval(mins => greatest(1, p_kilit_dakika))
     where g.id in (select a.id from alinan a)
    returning g.*
  )
  select k.id, k.eposta, c.name, k.rol,
         (select nullif(trim(p.full_name), '') from public.profiles p where p.id = k.davet_eden),
         exists (select 1 from auth.users u where lower(u.email) = k.eposta)
    from kilit k join public.companies c on c.id = k.company_id;
end;
$$;

create or replace function public.ekip_daveti_eposta_isaretle(p_id uuid, p_basarili boolean, p_hata text default null)
returns void language sql security definer set search_path = pg_catalog, public
as $$
  update public.sirket_davetleri
     set eposta_denemeleri = eposta_denemeleri + 1,
         eposta_gonderildi_at = case when p_basarili then now() else eposta_gonderildi_at end,
         eposta_son_hata = case when p_basarili then null else left(p_hata, 500) end,
         eposta_sonraki_at = case when p_basarili then eposta_sonraki_at
           else now() + make_interval(mins => power(2, least(eposta_denemeleri + 1, 7))::int) end
   where id = p_id;
$$;

-- Yetkiler ------------------------------------------------------------------------

revoke all on function public.sirket_sahibi_mi(uuid) from public, anon;
revoke all on function public.ekip_daveti_gonder(uuid, text, text) from public, anon;
revoke all on function public.ekip_davetleri(uuid) from public, anon;
revoke all on function public.ekip_davetini_iptal(uuid) from public, anon;
revoke all on function public.benim_ekip_davetlerim() from public, anon;
revoke all on function public.ekip_davetini_kabul_et(uuid) from public, anon;
revoke all on function public.ekip_uyesini_cikar(uuid, uuid) from public, anon;
grant execute on function public.sirket_sahibi_mi(uuid) to authenticated;
grant execute on function public.ekip_daveti_gonder(uuid, text, text) to authenticated;
grant execute on function public.ekip_davetleri(uuid) to authenticated;
grant execute on function public.ekip_davetini_iptal(uuid) to authenticated;
grant execute on function public.benim_ekip_davetlerim() to authenticated;
grant execute on function public.ekip_davetini_kabul_et(uuid) to authenticated;
grant execute on function public.ekip_uyesini_cikar(uuid, uuid) to authenticated;
revoke all on function public.ekip_daveti_eposta_kuyruktan_al(integer, integer) from public, anon, authenticated;
revoke all on function public.ekip_daveti_eposta_isaretle(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.ekip_daveti_eposta_kuyruktan_al(integer, integer) to service_role;
grant execute on function public.ekip_daveti_eposta_isaretle(uuid, boolean, text) to service_role;
