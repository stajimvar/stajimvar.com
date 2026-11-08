/*
  YENİ ŞİRKET TALEBİ E-POSTASI (9 Kasım 2026, kullanıcı isteği)

  "Yeni şirket talebi gelince bana mail de gelsin." Talep site içi
  bildirimle yöneticiye düşüyordu (20261228010000); e-posta yoktu.

  Aynı düzen ilan bildirimlerinde çalışıyor (20260930010000,
  scripts/ilan-bildirim-kuyrugu.mjs): talep satırı kuyruk alanları
  taşıyor, GitHub Actions işi (.github/workflows/sirket-talebi-epostasi.yml,
  10 dakikada bir) kuyruğu alıp Resend ile yöneticiye gönderiyor.
  Başarısızlıkta üstel bekleme; aynı talep için ikinci e-posta yok
  (işaretleme + sağlayıcıda Idempotency-Key = talep kimliği).

  E-postada talebin otomatik değerlendirme SONUCU da yazıyor: otomatik
  onaylandıysa bilgi, onaylanmadıysa gerekçe (otomatik_karar_metni).

  Var olan talepler gönderilmiş sayılıyor: geçmiş talepler için e-posta
  yağmuru olmasın.

  GERİ ALMA
    drop function if exists public.sirket_talebi_eposta_kuyruktan_al(integer, integer);
    drop function if exists public.sirket_talebi_eposta_isaretle(uuid, boolean, text);
    alter table public.sirket_talepleri drop column if exists eposta_gonderildi_at,
      drop column if exists eposta_denemeleri, drop column if exists eposta_son_hata,
      drop column if exists eposta_sonraki_at;
*/

alter table public.sirket_talepleri
  add column if not exists eposta_gonderildi_at timestamptz,
  add column if not exists eposta_denemeleri integer not null default 0,
  add column if not exists eposta_son_hata text,
  add column if not exists eposta_sonraki_at timestamptz not null default now();

/* Geçmiş talepler gönderilmiş sayılıyor. */
update public.sirket_talepleri
   set eposta_gonderildi_at = coalesce(eposta_gonderildi_at, now())
 where eposta_gonderildi_at is null;

/* Kuyruk alanları istemciden yazılamıyor: ekleme yetkisi sütun bazlı
   (20260826020000, 20261223010000) ve bu sütunlar listede yok. */

create or replace function public.sirket_talebi_eposta_kuyruktan_al(
  p_adet integer default 10,
  p_kilit_dakika integer default 10
)
returns table (
  id uuid, sirket_adi text, web_sitesi text, sektor text, sehir text,
  yetkili_adi text, kurumsal_eposta text, gorev text, telefon text,
  durum text, karar text, hesap_eposta text, created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  with alinan as (
    select t.id
      from public.sirket_talepleri t
     where t.eposta_gonderildi_at is null
       and t.eposta_denemeleri < 8
       and t.eposta_sonraki_at <= now()
     order by t.created_at
     limit greatest(1, least(p_adet, 100))
       for update skip locked
  ), kilit as (
    update public.sirket_talepleri g
       set eposta_sonraki_at = now() + make_interval(mins => greatest(1, p_kilit_dakika))
     where g.id in (select a.id from alinan a)
    returning g.*
  )
  select k.id, k.sirket_adi, k.web_sitesi, k.sektor, k.sehir,
         k.yetkili_adi, k.kurumsal_eposta, k.gorev, k.telefon,
         k.durum,
         case
           when k.durum = 'onaylandi' and k.karar_gerekcesi like 'OTOMATIK:%' then 'Otomatik onaylandı'
           when k.durum = 'onaylandi' then 'Onaylandı'
           when k.durum = 'reddedildi' then 'Reddedildi'
           else 'Onayını bekliyor — ' || public.otomatik_karar_metni(k.karar_gerekcesi)
         end,
         (select u.email::text from auth.users u where u.id = k.user_id),
         k.created_at
    from kilit k;
end;
$$;

create or replace function public.sirket_talebi_eposta_isaretle(
  p_id uuid,
  p_basarili boolean,
  p_hata text default null
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.sirket_talepleri
     set eposta_denemeleri = eposta_denemeleri + 1,
         eposta_gonderildi_at = case when p_basarili then now() else eposta_gonderildi_at end,
         eposta_son_hata = case when p_basarili then null else left(p_hata, 500) end,
         eposta_sonraki_at = case
           when p_basarili then eposta_sonraki_at
           else now() + make_interval(mins => power(2, least(eposta_denemeleri + 1, 7))::int)
         end
   where id = p_id;
$$;

revoke all on function public.sirket_talebi_eposta_kuyruktan_al(integer, integer) from public, anon, authenticated;
revoke all on function public.sirket_talebi_eposta_isaretle(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.sirket_talebi_eposta_kuyruktan_al(integer, integer) to service_role;
grant execute on function public.sirket_talebi_eposta_isaretle(uuid, boolean, text) to service_role;
