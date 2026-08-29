-- İŞVEREN İLANI: CANLI MI, TASLAK MI
--
-- Kural şirket kademesinden ve e-posta alan adından geliyor:
--   Kademe 2 (doğrulanmış)                        -> anında yayında
--   Kademe 1 + kurumsal mail (alan adı eşleşiyor)  -> yayında
--   Kademe 1 + serbest mail (gmail vb.)            -> taslak + yönetici kuyruğu
--
-- Serbest e-posta ENGELLENMİYOR: küçük işletmelerin çoğu Gmail kullanıyor
-- ve kapıyı kapatmak onları dışarıda bırakır. Yalnızca insan bakana kadar
-- yayına çıkmıyor.
create or replace function public.eposta_alan_adi(eposta text)
returns text
language sql
immutable
as $$
  select lower(nullif(split_part(coalesce(eposta, ''), '@', 2), ''));
$$;

create or replace function public.serbest_eposta_mi(eposta text)
returns boolean
language sql
immutable
as $$
  select public.eposta_alan_adi(eposta) in (
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
    'live.com', 'msn.com', 'yandex.com', 'yandex.com.tr', 'mail.ru', 'proton.me'
  );
$$;

/*
  Site alan adı ile mail alan adı aynı mı.

  "www." ve alt alan adları atılıyor: kariyer.sirket.com ile
  ik@sirket.com aynı kurumdur. Tam eşitlik aramak, doğru kurumu haksız
  yere taslakta bırakırdı.
*/
create or replace function public.alan_adi_eslesiyor(site text, eposta text)
returns boolean
language sql
immutable
as $$
  with s as (
    select regexp_replace(
             lower(regexp_replace(coalesce(site, ''), '^https?://', '')),
             '^www\.', ''
           ) as ham
  ),
  temiz as (select split_part(ham, '/', 1) as alan from s)
  select case
    when (select alan from temiz) = '' then false
    when public.eposta_alan_adi(eposta) is null then false
    else (select alan from temiz) = public.eposta_alan_adi(eposta)
      or (select alan from temiz) like '%.' || public.eposta_alan_adi(eposta)
      or public.eposta_alan_adi(eposta) like '%.' || (select alan from temiz)
  end;
$$;

grant execute on function public.eposta_alan_adi(text) to authenticated;
grant execute on function public.serbest_eposta_mi(text) to authenticated;
grant execute on function public.alan_adi_eslesiyor(text, text) to authenticated;

-- ------------------------------------------------- iki claim kuyruğu bir
--
-- İki ayrı kuyruk vardı: company_claims (var olan şirketi sahiplenme) ve
-- sirket_talepleri (listede olmayan şirketi ekletme). Yönetici ikisine
-- ayrı ayrı bakmak zorundaydı ve biri gözden kaçıyordu.
--
-- Tablolar birleştirilmiyor (ikisi farklı şey soruyor) ama tek bir görünüm
-- altında toplanıyor: yönetici tek listeye bakıyor.
create or replace view public.yonetici_talep_kuyrugu as
  select
    'sahiplenme'::text as tur, c.id, co.name as sirket_adi, co.website_url as web_sitesi,
    c.contact_name as yetkili_adi, c.work_email as eposta, c.contact_title as gorev,
    c.phone as telefon, c.status as durum, c.created_at, c.company_id, co.vkn,
    public.serbest_eposta_mi(c.work_email) as serbest_eposta,
    public.alan_adi_eslesiyor(co.website_url, c.work_email) as alan_adi_eslesiyor
  from public.company_claims c
  join public.companies co on co.id = c.company_id
  union all
  select
    'yeni-sirket'::text, t.id, t.sirket_adi, t.web_sitesi, t.yetkili_adi,
    t.kurumsal_eposta, t.gorev, t.telefon, t.durum, t.created_at, null::uuid, null::text,
    public.serbest_eposta_mi(t.kurumsal_eposta),
    public.alan_adi_eslesiyor(t.web_sitesi, t.kurumsal_eposta)
  from public.sirket_talepleri t;

comment on view public.yonetici_talep_kuyrugu is
  'İki claim kuyruğunun tek görünümü. Yönetici tek listeye bakıyor.';

alter view public.yonetici_talep_kuyrugu set (security_invoker = on);
grant select on public.yonetici_talep_kuyrugu to authenticated;
