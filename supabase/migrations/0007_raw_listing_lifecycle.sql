-- =====================================================================
-- 0007 — Keşif kayıtlarına yaşam döngüsü alanları
--
-- `automation/stale_safety.py` bir ilanın kaynakta kaç ardışık taramada
-- görülmediğini bilmek zorunda. Eski repoda bu alanlar `listings` üzerindeydi;
-- bizde kaynağa bakan yaşam döngüsü `raw_listings`'e ait — `listings` yayın
-- durumunu tutar, `raw_listings` kaynakta ne olup bittiğini.
--
-- Pasifleştirme kuralları (stale_safety.py'de kodlanmış, burada sadece
-- sayaçlar tutuluyor):
--   - 3 ardışık kaçırma VE en az 48 saat yaşlanma
--   - kaynak taraması sağlıksızsa (hata, sıfır sonuç, %20'den fazla düşüş)
--     hiçbir sayaç ilerlemez — kaynak çöktüğü için ilanları silmeyelim
--   - aktif ilanların %25'inden fazlası aday olursa devre kesici devreye girer
-- =====================================================================

alter table public.raw_listings
  -- Kaç ardışık SAĞLIKLI taramada bu ilan kaynakta görülmedi.
  add column consecutive_missing_runs int not null default 0
    check (consecutive_missing_runs >= 0),
  -- Pasifleştirme eşiğine ilk ne zaman ulaştı. Sıfırlanabilir.
  add column stale_eligible_at        timestamptz,
  -- Kaynak en son ne zaman kontrol edildi (ilan görülmese de güncellenir).
  add column source_last_checked_at   timestamptz;

comment on column public.raw_listings.consecutive_missing_runs is
  'Yalnızca sağlıklı taramalarda artar. Kaynak hata verdiğinde dokunulmaz.';

create index raw_listings_stale_idx
  on public.raw_listings (source_id, consecutive_missing_runs)
  where status = 'promoted';

-- Yayındaki ilanı kaynak kaydına geri bağlayabilmek için — promote sırasında
-- yazılıyor, uzlaştırma sırasında okunuyor.
create index listings_raw_listing_idx on public.listings (raw_listing_id)
  where raw_listing_id is not null;
