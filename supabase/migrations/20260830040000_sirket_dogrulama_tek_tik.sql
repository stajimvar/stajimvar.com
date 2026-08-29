-- KADEME 2 ONAYI: TEK TIK
--
-- approve_company_claim üyelik veriyor (Kademe 1: ilan asabilir) ama
-- companies.verified'a DOKUNMUYOR. Bu doğru: sahiplenme talebini onaylamak
-- "bu kişi bu şirkette çalışıyor" demek, "bu şirket doğrulanmıştır" demek
-- değil. Aday verisini açan kapı ayrı ve bilerek ayrı.
--
-- Bot yok: VKN checksum'una makine bakıyor, ticari unvan ile VKN'nin aynı
-- kuruma ait olup olmadığına İNSAN bakıyor. VKN herkese açık bir bilgi;
-- doğru olması o numarayı yazan kişinin şirketi temsil ettiğini
-- kanıtlamıyor.
alter table public.companies
  add column if not exists dogrulama_notu text,
  add column if not exists dogrulama_reddi_at timestamptz;

create or replace function public.sirket_dogrula(hedef uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.companies;
begin
  if not public.is_admin() then
    raise exception 'yalnizca yonetici dogrulayabilir';
  end if;

  select * into s from public.companies where id = hedef for update;
  if not found then
    raise exception 'sirket bulunamadi';
  end if;

  -- VKN olmadan Kademe 2 verilmiyor: doğrulamanın dayanağı o.
  if s.vkn is null then
    raise exception 'VKN olmadan dogrulanamaz';
  end if;

  update public.companies
     set verified = true, vkn_dogrulandi_at = now(),
         dogrulama_notu = null, dogrulama_reddi_at = null
   where id = hedef;
end;
$$;

create or replace function public.sirket_dogrulamayi_reddet(hedef uuid, sebep text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'yalnizca yonetici reddedebilir';
  end if;
  if coalesce(trim(sebep), '') = '' then
    -- Sebepsiz red, şirketin ne yapacağını bilmemesi demek.
    raise exception 'red sebebi yazilmali';
  end if;

  update public.companies
     set verified = false, dogrulama_notu = trim(sebep), dogrulama_reddi_at = now()
   where id = hedef;
end;
$$;

revoke all on function public.sirket_dogrula(uuid) from public;
revoke all on function public.sirket_dogrulamayi_reddet(uuid, text) from public;
grant execute on function public.sirket_dogrula(uuid) to authenticated;
grant execute on function public.sirket_dogrulamayi_reddet(uuid, text) to authenticated;

grant select (dogrulama_notu, dogrulama_reddi_at) on public.companies to authenticated;
