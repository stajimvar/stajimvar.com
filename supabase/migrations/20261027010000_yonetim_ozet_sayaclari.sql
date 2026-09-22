-- YÖNETİM ÖZETİ SAYAÇLARI
--
-- NEDEN BİR RPC
-- -------------
-- Panel sayıları tarayıcıdan `select('*', {count:'exact'})` ile alınıyordu.
-- İki ayrı sebeple sıfır dönüyordu:
--
--   1. `listings` (72 sütunun 60'ı) ve `companies` (26'nın 18'i) SELECT iznini
--      sütun sütun veriyor. `select('*')` izinsiz tek bir sütuna denk gelince
--      tüm sorgu 42501 ile düşüyor.
--   2. `applications` üzerinde yalnız "öğrenci kendi başvuruları" ve
--      "doğrulanmış şirket" politikaları var; yöneticiyi kapsayan politika yok,
--      dolayısıyla sayım dürüstçe 0 görüyor.
--
-- Çağıran taraf hatayı sıfıra çevirdiği için panel "0 yayındaki ilan" yazıyordu;
-- oysa 189 yayında ilan vardı. Sayıyı sunucuda, yönetici kapısının arkasında
-- üretmek bu iki sorunu da kökten kaldırıyor: izin ve RLS bir kez burada
-- çözülüyor, panel ham sayıyı okuyor.
--
-- İLAN KPI'LARI NEDEN AYRI
-- ------------------------
-- "Yayındaki ilan" tek sayı olarak yanıltıcı. Şirketin StajımVar'da açtığı
-- native ilana başvuru site içinde toplanıyor; elle eklenen ve taranan ilan
-- kariyer sayfasına yönlendiriyor ve başvuru kaydı oluşmuyor. Üçünü toplamak,
-- başvuru alabildiğimiz ilan sayısını olduğundan büyük gösterir. Bu yüzden
-- toplam da, kırılım da ayrı alan olarak dönüyor.

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

    'basvuru',      (select count(*) from applications),

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

revoke all on function public.yonetim_ozet() from public;
grant execute on function public.yonetim_ozet() to authenticated;

comment on function public.yonetim_ozet() is
  'Yönetim panelinin özet sayıları. Yalnız yönetici çağırabilir; sütun izni ve RLS sunucuda çözülür.';
