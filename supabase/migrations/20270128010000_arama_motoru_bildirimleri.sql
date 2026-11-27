/*
  ARAMA MOTORU BİLDİRİMLERİ (28 Kasım 2026)

  Search Console: 179 sayfa "keşfedildi, şu anda dizine eklenmemiş";
  İş İlanları raporunda 206 ilandan yalnız 1'i. İlan sayfaları Google'ın
  kendi taramasını bekleyemeyecek kadar hızlı açılıp kapanıyor.

  Google Indexing API (yalnız JobPosting sayfaları için resmî yol) ve
  IndexNow (Bing, Yandex) ile ilan açılınca ve kapanınca bildirim
  gönderiliyor (scripts/arama-motoru-bildirimi.mjs, günlük iş akışı).
  Bu tablo hangi adresin hangi durumda bildirildiğini tutuyor: aynı
  adres aynı durum için ikinci kez gönderilmiyor (Google günlük kotası
  200).

  İstemciye tamamen kapalı (RLS açık, politika yok); yalnız servis rolü.
*/

create table if not exists public.arama_motoru_bildirimleri (
  url text primary key,
  durum text not null check (durum in ('acik', 'kapali')),
  google_at timestamptz,
  indexnow_at timestamptz,
  son_hata text,
  guncellendi_at timestamptz not null default now()
);

alter table public.arama_motoru_bildirimleri enable row level security;
revoke all on table public.arama_motoru_bildirimleri from public, anon, authenticated;

comment on table public.arama_motoru_bildirimleri is
  'Google Indexing API ve IndexNow ile bildirilen ilan adresleri ve son bildirilen durumu. Yalnız servis rolü.';
