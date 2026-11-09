/*
  ŞİRKET SAYFASI: YAN HAKLAR, SOSYAL BAĞLANTILAR, TANITIM VİDEOSU
  (9 Kasım 2026, rakip analizi #12)

  LinkedIn ve Kariyer.net şirket sayfalarında yan haklar, sosyal hesaplar
  ve tanıtım videosu var; bizde yalnız açıklama ve web sitesi vardı.

  Dört yeni AÇIK sütun (öğrenci ve oturumsuz ziyaretçi görüyor), şirket
  üyesi güncelleyebiliyor (satır kuralı "uye sirketi gunceller" aynı).
  Biçim kısıtları src/lib/sirket-sayfasi-ek.mjs ile aynı: başka sitenin
  adresi LinkedIn/Instagram/video alanına yazılamıyor (oltalama bağlantısı
  şirket sayfasında güvenilir görünmesin).

  GERİ ALMA
    alter table public.companies
      drop column if exists yan_haklar, drop column if exists linkedin_url,
      drop column if exists instagram_url, drop column if exists tanitim_video_url;
*/

create or replace function public.yan_haklar_gecerli(p text[])
returns boolean
language sql immutable set search_path = pg_catalog
as $$
  select p is null or (
    cardinality(p) between 1 and 12
    and not exists (select 1 from unnest(p) s where char_length(btrim(s)) not between 2 and 60)
  );
$$;

alter table public.companies
  add column if not exists yan_haklar text[],
  add column if not exists linkedin_url text,
  add column if not exists instagram_url text,
  add column if not exists tanitim_video_url text;

alter table public.companies drop constraint if exists companies_yan_haklar_gecerli;
alter table public.companies add constraint companies_yan_haklar_gecerli
  check (public.yan_haklar_gecerli(yan_haklar));

alter table public.companies drop constraint if exists companies_linkedin_url_bicimi;
alter table public.companies add constraint companies_linkedin_url_bicimi
  check (linkedin_url is null
         or linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/(company|school|showcase)/[A-Za-z0-9_.%-]+/?$');

alter table public.companies drop constraint if exists companies_instagram_url_bicimi;
alter table public.companies add constraint companies_instagram_url_bicimi
  check (instagram_url is null
         or instagram_url ~ '^https://(www\.)?instagram\.com/[A-Za-z0-9_.]{1,30}/?$');

alter table public.companies drop constraint if exists companies_tanitim_video_bicimi;
alter table public.companies add constraint companies_tanitim_video_bicimi
  check (tanitim_video_url is null
         or (char_length(tanitim_video_url) <= 300
             and tanitim_video_url ~ '^https://((www\.|m\.)?youtube\.com/(watch\?|shorts/|embed/)|youtu\.be/)'));

grant select (yan_haklar, linkedin_url, instagram_url, tanitim_video_url)
  on public.companies to anon, authenticated;
grant update (yan_haklar, linkedin_url, instagram_url, tanitim_video_url)
  on public.companies to authenticated;
