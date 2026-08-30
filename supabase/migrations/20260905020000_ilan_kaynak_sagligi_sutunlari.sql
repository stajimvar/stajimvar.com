-- ÜRETİMDE VAR, DEPODA YOKTU
--
-- Şema temel denetimi `public.listings` tablosunu "değişmiş" diye
-- raporladı. Fark: üretimde `source_verified_at`, `source_checked_at`,
-- `source_status` sütunları ve `listings_source_status_check` kısıtı
-- var; depodaki göçlerden kurulan veritabanında yok.
--
-- Nedeni: üretim geçmişinde `20260825001218_listing_source_health`
-- adında bir göç var ama depoda karşılığı olan bir dosya yok. Tarama
-- otomasyonunun ilan tazeliği alanları yalnızca üretimde yaşıyordu.
--
-- Bu sessizce tehlikeli: `src/lib/database.types.ts` bu sütunları
-- tanımlıyor, yani kod onları bekliyor. Depodan kurulan bir
-- veritabanında bu alanlara dokunan her sorgu düşer ve tek kullanımlık
-- güvenlik testleri bunu göremez.
--
-- Tamamı idempotent: üretimde hiçbir şeyi değiştirmiyor.

alter table public.listings
  add column if not exists source_verified_at timestamptz,
  add column if not exists source_checked_at  timestamptz,
  add column if not exists source_status      text;

comment on column public.listings.source_verified_at is
  'İlanın kaynak sayfasında EN SON ne zaman doğrulandığı. last_seen_at ile karıştırma: o listede görülmeyi, bu ilanın kendisinin doğrulanmasını anlatıyor.';
comment on column public.listings.source_checked_at is
  'Kaynak sayfasına en son ne zaman bakıldığı — sonuç ne olursa olsun.';
comment on column public.listings.source_status is
  'Son bakışta kaynağın durumu: acik | kapali | erisilemedi. NULL = hiç bakılmadı.';

-- Serbest metin yerine üç bilinen değer. Yazım hatası ("açık", "open")
-- sessizce yeni bir durum icat etmesin: tazelik kararı bu alana
-- bakıyor ve tanınmayan bir değer kararı belirsiz bırakır.
alter table public.listings drop constraint if exists listings_source_status_check;
alter table public.listings add constraint listings_source_status_check
  check (source_status is null or source_status in ('acik', 'kapali', 'erisilemedi'));

-- YALNIZCA SELECT.
--
-- Bu alanları tarama otomasyonu yazıyor; o service_role ile bağlanıyor ve
-- tablo düzeyinde zaten tam yetkisi var. authenticated'a sütun düzeyinde
-- INSERT/UPDATE eklemek üretimdeki durumu da aşardı: orada bu sütunlarda
-- authenticated için yalnızca SELECT tanımlı.
--
-- Not: sütun listesi HER ayrıcalığa ayrı bağlanır; `grant select, insert
-- (sutunlar)` yazmak SELECT'i TÜM TABLOYA verirdi.
grant select (source_verified_at, source_checked_at, source_status)
  on public.listings to anon, authenticated;
