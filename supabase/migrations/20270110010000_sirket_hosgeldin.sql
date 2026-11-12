/*
  ŞİRKETE HOŞ GELDİN (12 Kasım 2026, kullanıcı: "onaydan sonra kuru bir
  bildirimle olmaz, StajımVar'a hoş geldiniz falan olsun")

  BU GÖÇ
    1. Yeni şirket talebi ve sahiplenme ONAYINDA bildirim "StajımVar'a hoş
       geldin" diyor ve ilk adımı (ilk ilan) söylüyor. Ret metinleri aynı.
    2. Bu iki bildirim e-postaya da dönüşüyor (hoş geldin e-postası; metni
       scripts/bildirim-epostasi.mjs ve supabase/functions/eposta-tetik).
       Hesap olayına ait tek seferlik e-posta: tercih anahtarına bağlı değil.

  GERİ ALMA
    -- 20261224010000 sirket_talebi_onay_bildir, 20261226010000
    -- sahiplenme_karar_bildir, 20270109010000 eposta_tetikle_bildirim ve
    -- bildirim_eposta_kuyruktan_al tanımlarını yeniden uygula.
*/

create or replace function public.sirket_talebi_onay_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.user_id is null then
    return new;
  end if;
  begin
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    values (
      new.user_id,
      'sirket_onaylandi',
      'StajımVar''a hoş geldin',
      coalesce(nullif(trim(new.sirket_adi), ''), 'Şirketinin')
        || ' şirket hesabı açıldı. İlk staj ilanını oluştur; başvurular doğrudan paneline düşsün.',
      '/sirket/ilanlar',
      'sirket-onaylandi:' || new.id::text
    )
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  exception when others then
    raise warning 'sirket_talebi_onay_bildir: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.sirket_talebi_onay_bildir() from public, anon, authenticated;

create or replace function public.sahiplenme_karar_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  ad text;
  gerekce text;
  onay boolean := new.status = 'approved';
begin
  if new.user_id is null then return new; end if;
  select c.name into ad from public.companies c where c.id = new.company_id;
  ad := coalesce(nullif(trim(ad), ''), 'Şirket');
  gerekce := nullif(trim(coalesce(new.reject_reason, '')), '');
  begin
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    values (
      new.user_id,
      case when onay then 'sahiplenme_onaylandi' else 'sahiplenme_reddedildi' end,
      case when onay then 'StajımVar''a hoş geldin' else 'Sahiplenme talebin reddedildi' end,
      case when onay
           then ad || ' artık senin yönetiminde. İlk staj ilanını oluştur; başvurular doğrudan paneline düşsün.'
           else ad || ' için talebin onaylanmadı.' || coalesce(' Gerekçe: ' || gerekce, '') end,
      case when onay then '/sirket/ilanlar' else '/isveren/baslangic' end,
      'sahiplenme-karar:' || new.id::text)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  exception when others then
    raise warning 'sahiplenme_karar_bildir: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.sahiplenme_karar_bildir() from public, anon, authenticated;

/*
  Hoş geldin e-postası yalnız bu göçten SONRAKİ onaylar için: eski (kuru
  metinli) onay bildirimleri e-posta kuyruğuna hiç girmesin.
*/
update public.notifications
   set eposta_gonderildi_at = now(), eposta_son_hata = 'goc-oncesi'
 where eposta_gonderildi_at is null
   and type in ('sirket_onaylandi', 'sahiplenme_onaylandi');

create or replace function public.eposta_tetikle_bildirim()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if exists (select 1 from yeni_satirlar y
              where y.type in ('yeni_basvuru', 'takip_ilan', 'sirket_onaylandi', 'sahiplenme_onaylandi')) then
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
       and n.type = any (array['yeni_basvuru', 'takip_ilan', 'sirket_onaylandi', 'sahiplenme_onaylandi'])
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
