-- HUNİ ADIMLARI GERÇEK YOLLARA BAKIYOR
--
-- "İlan listesine baktı" adımı `/ilanlar` yolunu arıyordu. Böyle bir sayfa
-- YOK: liste `/staj-ilanlari` adresinde ve `/ilanlar` yalnızca oraya
-- yönlendiren eski bir adres. Ölçüldü — canlıda gezilen yollar `/` ve
-- `/staj-ilanlari` iken eski desen sıfır eşleşti.
--
-- Bu, düzeltmek için uğraştığımız hatanın aynısıydı: sessizce yanlış olan,
-- hata vermeyen ve sonsuza kadar sıfır gösterecek bir sayı. Bir adımın her
-- zaman sıfır dönmesi "kimse bakmadı" diye okunurdu.
--
-- Bölüm sayfaları da listeye sayılıyor: `/bolum/mimarlik` o bölümün
-- ilanlarını gösteriyor, yani kullanıcı orada da ilan listesine bakıyor.
-- Eski `/ilanlar` deseni korunuyor; yönlendirme uygulanmadan önce
-- yazılabilen bir olayı kaybetmemek için.

create or replace function public.yonetim_trafik(p_donem text default 'yedi')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  gun_sayisi int;
  baslangic timestamptz;
begin
  if not public.is_admin() then
    raise exception 'yonetim_trafik yalnizca yonetici tarafindan cagrilabilir'
      using errcode = '42501';
  end if;

  gun_sayisi := case p_donem when 'bugun' then 1 when 'otuz' then 30 else 7 end;
  baslangic := date_trunc('day', now() at time zone 'Europe/Istanbul')
               at time zone 'Europe/Istanbul'
               - make_interval(days => gun_sayisi - 1);

  with olay as (
    select * from site_olaylari where olustu_at >= baslangic
  ),
  bakis as (
    select * from olay where tur in ('girdi', 'sayfa')
  ),
  oturum as (
    select o.oturum,
           min(o.olustu_at) as basladi,
           max(o.olustu_at) as bitti,
           count(*) filter (where o.tur in ('girdi', 'sayfa')) as bakis_sayisi,
           count(*) as olay_sayisi,
           max(o.sehir)  as sehir,
           max(o.ulke)   as ulke,
           max(o.cihaz)  as cihaz,
           max(o.kaynak) as kaynak
    from olay o group by o.oturum
  )
  select jsonb_build_object(
    'donem', p_donem,
    'tekil', (select count(*) from oturum),
    'goruntuleme', (select count(*) from bakis),

    'bounce', (
      select case when count(*) = 0 then 0
                  else round(count(*) filter (where bakis_sayisi <= 1)::numeric
                             / count(*), 4)
             end
      from oturum
    ),

    -- Tek olaylık oturumlar ortalamaya girmiyor: süreleri sıfır değil,
    -- ölçülemez. Sıfır saymak ortalamayı yapay olarak aşağı çekerdi.
    'ortalamaOturum', (
      select coalesce(round(avg(extract(epoch from (bitti - basladi)))), 0)
      from oturum where olay_sayisi > 1
    ),

    'gunler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'tarih',  to_char(g.gun, 'YYYY-MM-DD'),
               'etiket', to_char(g.gun, 'DD.MM'),
               'tekil',  d.tekil,
               'goruntuleme', d.goruntuleme
             ) order by g.gun), '[]'::jsonb)
      from generate_series(
             (baslangic at time zone 'Europe/Istanbul')::date,
             (now() at time zone 'Europe/Istanbul')::date,
             interval '1 day') as g(gun)
      cross join lateral (
        select count(distinct b.oturum) as tekil, count(*) as goruntuleme
        from bakis b
        where (b.olustu_at at time zone 'Europe/Istanbul')::date = g.gun::date
      ) d
    ),

    'kaynaklar', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', ad, 'adet', adet)
               order by adet desc), '[]'::jsonb)
      from (select coalesce(nullif(kaynak, ''), 'doğrudan') as ad, count(*) as adet
            from oturum group by 1) k
    ),
    'sehirler', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', ad, 'adet', adet)
               order by adet desc), '[]'::jsonb)
      from (select coalesce(nullif(sehir, ''), 'bilinmiyor') as ad, count(*) as adet
            from oturum group by 1) s
    ),
    'cihazlar', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', ad, 'adet', adet)
               order by adet desc), '[]'::jsonb)
      from (select coalesce(nullif(cihaz, ''), 'bilinmiyor') as ad, count(*) as adet
            from oturum group by 1) c
    ),

    -- Sayfa listesi BAKIŞ sayıyor, kişi değil.
    'sayfalar', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', ad, 'adet', adet)
               order by adet desc), '[]'::jsonb)
      from (select coalesce(nullif(baslik, ''), yol) as ad, count(*) as adet
            from bakis group by 1 order by 2 desc limit 12) p
    ),

    'huni', (
      select jsonb_build_array(
        jsonb_build_object('ad', 'Siteye girdi',
          'adet', (select count(*) from oturum)),
        jsonb_build_object('ad', 'İlan listesine baktı',
          'adet', (select count(distinct oturum) from bakis
                    where yol like '/staj-ilanlari%'
                       or yol like '/bolum/%'
                       or yol like '/staj-programlari%'
                       or yol like '/ilanlar%')),
        jsonb_build_object('ad', 'İlan detayı açtı',
          'adet', (select count(distinct oturum) from bakis where yol like '/ilan/%')),
        jsonb_build_object('ad', 'Başvuruya gitti',
          'adet', (select count(distinct oturum) from olay where tur = 'basvuru'))
      )
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.yonetim_trafik(text) from public, anon;
grant execute on function public.yonetim_trafik(text) to authenticated;
