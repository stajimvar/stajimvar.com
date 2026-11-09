/*
  TAKİP EDİLEN ŞİRKETİN YENİ İLANI (10 Kasım 2026, kullanıcı isteği)

  "Öğrencilerin takip ettiği şirketler yeni ilan oluşturduğunda bildirim
  gitsin, hatta mail gitsin."

  BU GÖÇ
    1. İlan YAYINA çıktığında (eklenirken doğrudan ya da onay/kontrol
       sonrası) şirketi takip eden herkese 'takip_ilan' bildirimi.
       Yinelenme anahtarı ilan + kişi: ilan düzenlenip yeniden yayına
       çıksa da ikinci bildirim yok. Şirketin kendi üyelerine gitmiyor.
       Takip: takipler.hedef_id = şirket sayfası (social_profiles.sirket_id).
    2. bildirim_tercihleri.takip_ilan_eposta (varsayılan açık): öğrenci
       /ayarlar/bildirimler'den kapatabiliyor; zil bildirimi sürüyor.
    3. E-posta kuyruğu 'takip_ilan' türünü de alıyor; anında tetik de.

  Bildirim hatası ilanı DÜŞÜRMÜYOR (exception bloğu, uyarı).

  GERİ ALMA
    drop trigger if exists takip_ilan_bildirimi on public.listings;
    drop function if exists public.takipcilere_yeni_ilan_bildir();
    alter table public.bildirim_tercihleri drop column if exists takip_ilan_eposta;
    -- 20270106010000 kuyruk işlevini ve 20270103010000 tetik işlevini yeniden uygula
*/

alter table public.bildirim_tercihleri
  add column if not exists takip_ilan_eposta boolean not null default true;

create or replace function public.takipcilere_yeni_ilan_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  sirket_adi text;
begin
  if new.company_id is null then
    return new;
  end if;
  /* Zaten yayındaki ilanın güncellemesi "yeni ilan" değil. */
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;
  begin
    select nullif(trim(c.name), '') into sirket_adi from public.companies c where c.id = new.company_id;
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    select distinct t.takipci_id,
           'takip_ilan',
           left(coalesce(sirket_adi, 'Takip ettiğin şirket') || ' yeni bir ilan yayımladı', 200),
           left(coalesce(nullif(trim(new.title), ''), 'Yeni ilan')
                || coalesce(' · ' || nullif(trim(new.city), ''), ''), 300),
           public.ilan_bildirim_yolu(new.id, new.title),
           'takip-ilan:' || new.id::text || ':' || t.takipci_id::text
      from public.takipler t
      join public.social_profiles sp on sp.profile_id = t.hedef_id and sp.sirket_id = new.company_id
     where not exists (select 1 from public.company_members m
                        where m.company_id = new.company_id and m.user_id = t.takipci_id)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  exception when others then
    raise warning 'takipcilere_yeni_ilan_bildir: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.takipcilere_yeni_ilan_bildir() from public, anon, authenticated;

drop trigger if exists takip_ilan_bildirimi on public.listings;
create trigger takip_ilan_bildirimi
  after insert or update of status on public.listings
  for each row
  when (new.status = 'published')
  execute function public.takipcilere_yeni_ilan_bildir();

/* Anında e-posta tetiği: yeni başvuru ve takip edilen şirketin ilanı. */
create or replace function public.eposta_tetikle_bildirim()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if exists (select 1 from yeni_satirlar y where y.type in ('yeni_basvuru', 'takip_ilan')) then
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
     and n.type in ('yeni_basvuru', 'takip_ilan')
     and exists (select 1 from public.bildirim_tercihleri t
                  where t.user_id = n.recipient_id
                    and ((n.type = 'yeni_basvuru' and not t.yeni_basvuru_eposta)
                      or (n.type = 'takip_ilan' and not t.takip_ilan_eposta)));

  return query
  with alinan as (
    select n.id
      from public.notifications n
     where n.eposta_gonderildi_at is null
       and n.type = any (array['yeni_basvuru', 'takip_ilan'])
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
