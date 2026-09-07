-- KOPYA İLAN KAPISINDAKİ DELİK: canonical_url BOŞ KALABİLİYORDU
--
-- ÖLÇÜLDÜ (üretim, 7 Eylül 2026):
--   yayındaki ilan            114
--   canonical_url dolu         66
--   canonical_url BOŞ          48   ← hepsi FR partisi
--
-- `listings_canonical_url_key` UNIQUE (canonical_url) WHERE canonical_url
-- IS NOT NULL, yayındaki tablonun TEK veritabanı seviyesi kopya kapısı.
-- Kısmi indeks olduğu için NULL satırlar kapının DIŞINDA kalıyor: o 48
-- ilan yeniden içe aktarılsa hiçbir kısıt ikinci kaydı durdurmuyordu.
--
-- Boşluk taranan yolda değil. `automation/promote.py` her zaman
-- `canonical = raw.canonical_url or apply_url` yazıyor ve bu yüzden 10
-- taranan ilanın 10'unda da alan dolu. Delik, kaydı doğrudan yazan
-- yollarda (elle giriş, tek seferlik parti) açılıyordu.
--
-- ÇÖZÜM: KURAL VERİTABANINA TAŞINIYOR
-- promote.py'nin kuralı bir tetikleyiciye alınıyor. Böylece kapı
-- "ilanı yazan kod hatırlarsa" değil, HER yazma yolunda çalışıyor —
-- kuralın uygulama katmanında tekrar edilmesi gerekmiyor.
--
-- Alan yalnızca BOŞKEN dolduruluyor: var olan bir değeri değiştirmiyor,
-- hiçbir kaydı devre dışı bırakmıyor, birleştirmiyor. Denetim geçmişi
-- (deactivated_at, deactivation_reason, raw_listing_id) aynen duruyor.

create or replace function public.listings_canonical_url_doldur()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  /*
    Sıralama promote.py ile aynı: önce kaynağın kendi adresi, sonra
    başvuru adresi. İkisi de yoksa alan boş kalıyor — uydurma bir
    anahtar üretmek, gerçekten farklı iki ilanı çakıştırabilirdi.
  */
  if new.canonical_url is null then
    new.canonical_url := nullif(btrim(coalesce(new.source_url, new.apply_url, '')), '');
  end if;
  return new;
end;
$$;

drop trigger if exists listings_canonical_url_doldur on public.listings;
create trigger listings_canonical_url_doldur
  before insert on public.listings
  for each row
  execute function public.listings_canonical_url_doldur();

-- GERİYE DÖNÜK DOLDURMA
--
-- İKİ AYRI ÇAKIŞMA TÜRÜ VAR; İKİSİ DE ELENMELİ
--
--   1. Doldurulacak adres BAŞKA bir satırda zaten canonical olarak
--      duruyorsa.
--   2. Doldurulacak İKİ BOŞ SATIR aynı adresi gösteriyorsa. Bu ikincisi
--      ilk yazımda atlanmıştı: tek bir UPDATE kendi görüntüsüne bakıyor,
--      iki satır da o anda NULL olduğu için ikisi de "çakışma yok" deyip
--      aynı değeri alıyor ve UNIQUE kısıtını düşürüyordu. Testte yakalandı
--      (tests/ilan-kopya-kapisi.test.mjs). row_number() her adres için
--      yalnız bir satır seçiyor.
--
-- Üretimde ölçüldü: 48 satırın 48'inin source_url'i benzersizdi ve hiçbiri
-- mevcut bir canonical_url ile çakışmıyordu — orada iki kontrol de boşa
-- çalıştı ve 48 satırın hepsi dolduruldu.
with aday as (
  select l.id,
         nullif(btrim(coalesce(l.source_url, l.apply_url, '')), '') as yeni,
         row_number() over (
           partition by nullif(btrim(coalesce(l.source_url, l.apply_url, '')), '')
           order by l.created_at, l.id
         ) as sira
  from public.listings l
  where l.canonical_url is null
),
secili as (
  select a.id, a.yeni
  from aday a
  where a.yeni is not null
    and a.sira = 1
    and not exists (select 1 from public.listings o where o.canonical_url = a.yeni)
)
update public.listings l
set canonical_url = s.yeni
from secili s
where l.id = s.id;
