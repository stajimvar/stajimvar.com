/*
  BİLDİRİM E-POSTASI — YENİ BAŞVURU ŞİRKETE E-POSTAYLA (9 Kasım 2026, kullanıcı isteği)

  Uçtan uca denetimden: yeni başvuru şirkete yalnız site içi zile düşüyordu
  (bildir_sirkete, 20261117010000). İK çalışanı sitede oturmuyor; e-posta
  gelmezse başvuru günlerce okunmuyor. Kullanıcı "önerilerini yap" dedi;
  ilk öneri buydu.

  DÜZEN
    notifications satırı e-posta kuyruğu alanları taşıyor; GitHub Actions
    işi (.github/workflows/sirket-talebi-epostasi.yml, 10 dakikada bir,
    ikinci adım) kuyruğu alıp Resend ile alıcının DOĞRULANMIŞ hesap
    e-postasına gönderiyor. Yalnız EPOSTA_TURLERI'ndeki bildirimler
    e-postaya dönüşüyor (bugün: yeni_basvuru). Ekip davetinin e-postası
    davet tablosunun kendi kuyruğundan gidiyor (20261231010000): davet
    edilenin henüz hesabı olmayabilir.

    Var olan bütün bildirimler gönderilmiş sayılıyor: geçmiş için e-posta
    yağmuru yok. Listeye ileride tür eklenirse o türün eski satırları da
    gönderilmiş sayıldığı için yine yağmur olmaz.

  GÜVENLİK
    Kullanıcılar notifications'a ekleme yapamıyor (politika yok) ve yeni
    sütunlara güncelleme yetkisi verilmiyor; kuyruk yalnız sunucu
    işlevlerinin yazdığı bildirimlerden besleniyor. Kuyruk işlevleri
    yalnız service_role.

  GERİ ALMA
    drop function if exists public.bildirim_eposta_kuyruktan_al(integer, integer);
    drop function if exists public.bildirim_eposta_isaretle(uuid, boolean, text);
    alter table public.notifications drop column if exists eposta_gonderildi_at,
      drop column if exists eposta_denemeleri, drop column if exists eposta_son_hata,
      drop column if exists eposta_sonraki_at;
*/

alter table public.notifications
  add column if not exists eposta_gonderildi_at timestamptz,
  add column if not exists eposta_denemeleri integer not null default 0,
  add column if not exists eposta_son_hata text,
  add column if not exists eposta_sonraki_at timestamptz not null default now();

update public.notifications
   set eposta_gonderildi_at = coalesce(eposta_gonderildi_at, now())
 where eposta_gonderildi_at is null;

create index if not exists notifications_eposta_kuyrugu_idx
  on public.notifications (eposta_sonraki_at)
  where eposta_gonderildi_at is null;

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
  return query
  with alinan as (
    select n.id
      from public.notifications n
     where n.eposta_gonderildi_at is null
       and n.type = any (array['yeni_basvuru'])
       and n.eposta_denemeleri < 8
       and n.eposta_sonraki_at <= now()
       /* Doğrulanmamış e-postaya gönderilmiyor; o satır kilitlenmiyor da. */
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

create or replace function public.bildirim_eposta_isaretle(
  p_id uuid,
  p_basarili boolean,
  p_hata text default null
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.notifications
     set eposta_denemeleri = eposta_denemeleri + 1,
         eposta_gonderildi_at = case when p_basarili then now() else eposta_gonderildi_at end,
         eposta_son_hata = case when p_basarili then null else left(p_hata, 500) end,
         eposta_sonraki_at = case
           when p_basarili then eposta_sonraki_at
           else now() + make_interval(mins => power(2, least(eposta_denemeleri + 1, 7))::int)
         end
   where id = p_id;
$$;

revoke all on function public.bildirim_eposta_kuyruktan_al(integer, integer) from public, anon, authenticated;
revoke all on function public.bildirim_eposta_isaretle(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.bildirim_eposta_kuyruktan_al(integer, integer) to service_role;
grant execute on function public.bildirim_eposta_isaretle(uuid, boolean, text) to service_role;
