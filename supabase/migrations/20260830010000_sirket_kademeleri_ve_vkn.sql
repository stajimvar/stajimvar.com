-- ŞİRKET KADEMELERİ
--
-- Kural: ilan vermek öğrenci görmek DEĞİLDİR.
--
-- Bulunduğu hâl: applications SELECT politikası yalnızca is_company_member()
-- soruyordu. Yani hesap açıp şirkete üye olan herkes — doğrulanmamış olsa
-- bile — o şirketin ilanlarına gelen başvuruları, dolayısıyla öğrenci
-- verisini görüyordu. Bu, iki yetki kademesi kuralının tam karşıtı.
--
-- Kademeler (yeni tablo yok, mevcut alanlardan türetiliyor):
--   0  ziyaretçi     üyelik yok
--   1  ilan veren    company_members'ta var, companies.verified = false
--   2  doğrulanmış   company_members'ta var, companies.verified = true
--   3  yönetici      is_admin()

-- ---------------------------------------------------------------- VKN
--
-- VKN herkese açık bir bilgidir ve tek başına yetkili olunduğunu
-- kanıtlamaz. Bu yüzden burada YALNIZCA biçim doğrulanır; onay insanın.
create or replace function public.vkn_gecerli(vkn text)
returns boolean
language plpgsql
immutable
as $$
declare
  basamak int;
  gecici  int;
  toplam  int := 0;
  i       int;
  son     int;
begin
  if vkn is null or vkn !~ '^[0-9]{10}$' then
    return false;
  end if;

  for i in 1..9 loop
    basamak := substr(vkn, i, 1)::int;
    gecici  := (basamak + 10 - i) % 10;
    if gecici = 9 then
      toplam := toplam + gecici;
    else
      toplam := toplam + (gecici * (2 ^ (10 - i))::int) % 9;
    end if;
  end loop;

  son := (10 - (toplam % 10)) % 10;
  return son = substr(vkn, 10, 1)::int;
end;
$$;

comment on function public.vkn_gecerli(text) is
  'VKN biçim/checksum doğrulaması. Yetkili olunduğunu KANITLAMAZ; onay insana ait.';

alter table public.companies
  add column if not exists vkn text,
  add column if not exists mersis text,
  add column if not exists hr_email text,
  add column if not exists vkn_dogrulandi_at timestamptz;

-- Geçersiz VKN kaydedilmiyor: yanlış bir numarayı taşımak, sonra insanın
-- ona bakıp onaylamasını istemek demek.
alter table public.companies drop constraint if exists companies_vkn_check;
alter table public.companies
  add constraint companies_vkn_check
  check (vkn is null or public.vkn_gecerli(vkn));

create unique index if not exists companies_vkn_uniq
  on public.companies (vkn) where vkn is not null;

-- ------------------------------------------------------------ kademeler
create or replace function public.sirket_dogrulandi(hedef uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.companies c where c.id = hedef and c.verified);
$$;

create or replace function public.sirket_kademesi(hedef uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then 3
    when public.is_company_member(hedef) and public.sirket_dogrulandi(hedef) then 2
    when public.is_company_member(hedef) then 1
    else 0
  end;
$$;

comment on function public.sirket_kademesi(uuid) is
  'Çağıranın o şirketteki yetki kademesi. 2 ve üstü aday verisi görebilir.';

revoke all on function public.sirket_dogrulandi(uuid) from public;
revoke all on function public.sirket_kademesi(uuid) from public;
grant execute on function public.sirket_dogrulandi(uuid) to authenticated;
grant execute on function public.sirket_kademesi(uuid) to authenticated;
grant execute on function public.vkn_gecerli(text) to authenticated;

-- ------------------------------------------- başvurular yalnızca kademe 2
--
-- Kademe 1 ilan asabiliyor ama başvuranları GÖREMİYOR. Kapı burada:
-- politika artık şirketin doğrulanmış olmasını da soruyor.
drop policy if exists "sirket basvurulari gorur" on public.applications;
create policy "dogrulanmis sirket basvurulari gorur"
  on public.applications for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );

drop policy if exists "sirket basvuru durumu gunceller" on public.applications;
create policy "dogrulanmis sirket basvuru durumu gunceller"
  on public.applications for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.is_company_member(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );
