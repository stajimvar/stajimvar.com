-- CANLI AKIŞ — GERÇEK VERİ
--
-- "Şu an bakıyor" tanımı: son olayı SON BEŞ DAKİKA içinde olan ve o olay
-- 'cikti' OLMAYAN oturumlar. Beş dakika keyfi değil; sekmeyi açık bırakıp
-- okuyan biri ile sekmeyi kapatan biri arasındaki farkı ayırt edecek kadar
-- uzun, "dün giren hâlâ bakıyor" saçmalığını önleyecek kadar kısa.
--
-- Tarayıcı `pagehide` olayında 'cikti' göndermeye çalışıyor ama bu her
-- zaman ulaşmıyor (sekme çöker, telefon uygulamayı öldürür). Bu yüzden
-- beş dakikalık sessizlik de çıkış sayılıyor: yalnız 'cikti' olayına
-- güvenmek, sayacın şişmesine yol açardı.

create or replace function public.yonetim_canli()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  gun_basi timestamptz := date_trunc('day', now() at time zone 'Europe/Istanbul')
                          at time zone 'Europe/Istanbul';
begin
  if not public.is_admin() then
    raise exception 'yonetim_canli yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  with son as (
    select distinct on (o.oturum)
           o.oturum, o.tur, o.yol, o.baslik, o.kaynak, o.sehir, o.ulke,
           o.cihaz, o.kullanici_id, o.olustu_at
    from site_olaylari o
    where o.olustu_at > now() - interval '30 minutes'
    order by o.oturum, o.olustu_at desc
  ),
  acik as (
    select s.*,
           (select min(x.olustu_at) from site_olaylari x where x.oturum = s.oturum) as basladi,
           p.full_name,
           p.role::text as rol
    from son s
    left join profiles p on p.id = s.kullanici_id
    where s.olustu_at > now() - interval '5 minutes'
      and s.tur <> 'cikti'
  )
  select jsonb_build_object(
    'bakiyor', (select count(*) from acik),

    'bugunGiren',  (select count(distinct oturum) from site_olaylari
                     where tur = 'girdi' and olustu_at >= gun_basi),
    'bugunCikan',  (select count(distinct oturum) from site_olaylari
                     where tur = 'cikti' and olustu_at >= gun_basi),
    'sayfaBakisi', (select count(*) from site_olaylari
                     where tur in ('girdi', 'sayfa') and olustu_at >= gun_basi),

    'oturumlar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'kimlik',   a.oturum,
               'ad',       a.full_name,       -- isim YALNIZ giriş yapmışta dolu
               'rol',      a.rol,
               'yol',      a.yol,
               'sayfaAdi', coalesce(a.baslik, a.yol),
               'sehir',    a.sehir,
               'ulke',     a.ulke,
               'cihaz',    a.cihaz,
               'kaynak',   a.kaynak,
               'basladi',  a.basladi
             ) order by a.olustu_at desc), '[]'::jsonb)
      from acik a
    ),

    'olaylar', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'tur',      e.tur,
               'an',       e.olustu_at,
               'ad',       e.full_name,
               'rol',      e.rol,
               'sayfaAdi', coalesce(e.baslik, e.yol),
               'sehir',    e.sehir,
               'cihaz',    e.cihaz,
               'kaynak',   e.kaynak
             ) order by e.olustu_at desc), '[]'::jsonb)
      from (
        select o.tur, o.olustu_at, o.baslik, o.yol, o.sehir, o.cihaz, o.kaynak,
               p.full_name, p.role::text as rol
        from site_olaylari o
        left join profiles p on p.id = o.kullanici_id
        where o.olustu_at > now() - interval '2 hours'
        order by o.olustu_at desc
        limit 40
      ) e
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_canli() from public, anon;
grant execute on function public.yonetim_canli() to authenticated;

comment on function public.yonetim_canli() is
  'Canlı ziyaretçi akışı. Yalnız yönetici; misafirin adı yok, yalnız giriş yapmışın adı dönüyor.';
