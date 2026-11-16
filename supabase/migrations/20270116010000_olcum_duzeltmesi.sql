-- ÖLÇÜM DÜZELTMESİ (16 Kasım 2026)
--
-- 1) GEÇMİŞ BOT OTURUMLARI ARŞİVE
-- --------------------------------
-- Ölçüldü: son 30 günde 1.767 oturumun 1.443'ü ABD'den; neredeyse tamamı
-- veri merkezi şehirlerinden (Ashburn 1.087, Phoenix, Des Moines, Moses
-- Lake, Council Bluffs), tek olaylı, 0 saniyelik, girişsiz. Yönetim paneli
-- trafiği ~6 kat fazla gösteriyordu.
--
-- Yeni istekler artık uç noktada ayıklanıyor (functions/api/olay.ts,
-- src/lib/bot-ziyareti.mjs: kullanıcı aracısı + ağ). Eski satırlarda o
-- bilgiler saklanmadı; geriye dönük ayırma yalnız DAVRANIŞTAN yapılabiliyor:
--   veri merkezi şehri (ABD) + en çok 2 olay + 10 saniyeden kısa + girişsiz
-- Bu bir tahmin kuralı; satırlar SİLİNMİYOR, `site_olaylari_bot_arsivi`ne
-- taşınıyor. Geri almak: arşivden `site_olaylari`na geri eklemek.
--
-- 2) EKİP HESAPLARININ BAŞVURULARI AYRI
-- -------------------------------------
-- `yonetim_ozet.basvuru` yönetici rolündeki hesapların başvurularını
-- saymıyor; onlar `basvuruEkip` olarak ayrı dönüyor.

create table if not exists public.site_olaylari_bot_arsivi (
  like public.site_olaylari including defaults,
  arsivlendi_at timestamptz not null default now()
);

comment on table public.site_olaylari_bot_arsivi is
  'Davranış kuralıyla bot sayılan eski ziyaret satırları (20270116010000). Panel okumuyor.';

alter table public.site_olaylari_bot_arsivi enable row level security;
revoke all on table public.site_olaylari_bot_arsivi from public, anon, authenticated;

with bot_oturumlari as (
  select oturum
    from public.site_olaylari
   group by oturum
  having max(ulke) = 'US'
     and max(sehir) in ('Ashburn', 'Phoenix', 'Des Moines', 'Moses Lake', 'Council Bluffs',
                        'Boardman', 'Quincy', 'The Dalles', 'Washington')
     and count(*) <= 2
     and max(olustu_at) - min(olustu_at) < interval '10 seconds'
     and bool_and(kullanici_id is null)
), tasinan as (
  delete from public.site_olaylari s
   using bot_oturumlari b
   where s.oturum = b.oturum
  returning s.*
)
insert into public.site_olaylari_bot_arsivi
select t.*, now() from tasinan t;

create or replace function public.yonetim_ozet()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
begin
  if not public.is_admin() then
    raise exception 'yonetim_ozet yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'ogrenci',      (select count(*) from student_profiles),
    'profilDolu',   (select count(*) from student_profiles
                      where university is not null and university <> ''),
    'teklifeAcik',  (select count(*) from student_profiles where is_open_to_offers is true),
    'rozet',        (select coalesce(sum(coalesce(array_length(earned_badges, 1), 0)), 0)
                      from student_profiles),

    /*
      EKİP HESAPLARI AYRI (20270116010000): yönetici rolündeki hesabın
      başvuruları deneme ve kendi takip listesi; "toplam başvuru"ya girerse
      gerçek öğrenci ilgisini olduğundan büyük gösteriyor (ölçüldü: 13
      başvurunun 9'u kurucunun hesabından).
    */
    'basvuru',      (select count(*) from applications a
                      where not exists (select 1 from profiles p
                                         where p.id = a.student_id and p.role = 'admin')),
    'basvuruEkip',  (select count(*) from applications a
                      where exists (select 1 from profiles p
                                     where p.id = a.student_id and p.role = 'admin')),

    -- Yayındaki ilan: toplam ve kaynağına göre kırılım.
    'ilanYayinToplam', (select count(*) from listings where status = 'published'),
    'ilanNative',      (select count(*) from listings
                         where status = 'published' and origin in ('employer_posted', 'internal')),
    'ilanElle',        (select count(*) from listings
                         where status = 'published' and origin = 'manual'),
    'ilanTaranan',     (select count(*) from listings
                         where status = 'published' and origin = 'scraped'),

    -- Onay bekleyen: TÜM taslaklar. Eskiden yalnız `origin = 'internal'`
    -- sayılıyordu; o değeri hiçbir satır kullanmıyor, dolayısıyla kuyruk her
    -- zaman boş görünüyordu ve incelenmeyi bekleyen taslaklar kayboluyordu.
    'taslakToplam',  (select count(*) from listings where status = 'draft'),
    'taslakNative',  (select count(*) from listings
                       where status = 'draft' and origin in ('employer_posted', 'internal')),
    'taslakTaranan', (select count(*) from listings
                       where status = 'draft' and origin = 'scraped'),

    'sirket',        (select count(*) from companies),
    'sahiplenmis',   (select count(*) from companies where claimed_at is not null),
    'bekleyenTalep', (select count(*) from company_claims where status = 'pending'),

    'sonTarama', (
      select jsonb_build_object(
               'zaman',   started_at,
               'durum',   status,
               'bulunan', coalesce(fetched_count, 0))
      from import_runs order by started_at desc limit 1
    ),

    -- Son 7 gün: kaydı OLMAYAN günler de sıfırla dönüyor. Yalnız dolu günleri
    -- döndürmek, "son 7 gün" başlıklı grafiği iki çubukla çizdiriyordu.
    'sonKayitlar', (
      select coalesce(jsonb_agg(
               jsonb_build_object('tarih', to_char(g.gun, 'YYYY-MM-DD'), 'sayi', s.sayi)
               order by g.gun), '[]'::jsonb)
      from generate_series(
             (now() at time zone 'Europe/Istanbul')::date - 6,
             (now() at time zone 'Europe/Istanbul')::date,
             interval '1 day') as g(gun)
      cross join lateral (
        select count(*) as sayi from profiles p
        where (p.created_at at time zone 'Europe/Istanbul')::date = g.gun::date
      ) s
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_ozet() from public, anon;
grant execute on function public.yonetim_ozet() to authenticated;

comment on function public.yonetim_ozet() is
  'Yönetim panelinin özet sayıları. Yalnız yönetici çağırabilir. Yönetici rolündeki hesapların başvuruları basvuruEkip olarak ayrı. anon çağıramaz.';
