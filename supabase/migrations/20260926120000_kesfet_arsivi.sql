-- Keşfet kapanıyor: etkinlikler silinmeden arşive
--
-- KARAR
-- -----
-- Keşfet sekmesi navigasyondan kalkıyor. İçeriğinden yalnız kayıt ya da
-- başvuru bağlantısı olan KARİYER etkinlikleri (kariyer günü, staj
-- fuarı, hackathon) Fırsatlar'a taşınacaktı. Ölçüm (canlı, salt okunur):
--
--   163 discover_events — konser 57, festival 52, sergi 29, tiyatro 19,
--   atölye 5, müze 1. Kategori kısıtında 'fair' var ama 0 satır; hiçbir
--   kayıt kariyer etkinliği değil.
--
-- Dolayısıyla Fırsatlar'a taşınacak satır YOK. Sergi, konser, gezi ve
-- festival Fırsatlar tanımının dışında; bunlar taşınmıyor.
--
-- VERİ SİLİNMİYOR
-- ---------------
-- 163 satır ve bağlı oluşumlar (discover_event_occurrences) duruyor;
-- yalnız durum 'archived' oluyor. Halka açık okuma politikası zaten
-- `status = 'published'` istiyor, yani arşivlenen satır dışarı çıkmıyor.
-- Yönetici politikası (`is_admin()`) hepsini görmeye devam ediyor.
-- Keşfet içe aktarma boru hattı yeni satır ekleyecek olursa o satır
-- taslak olarak gelir ve yayımlanmaz; iş akışı ayrıca kapatılıyor.

alter table public.discover_events drop constraint if exists discover_events_status_check;
alter table public.discover_events
  add constraint discover_events_status_check
    check (status in ('draft', 'published', 'archived'));

update public.discover_events
   set status = 'archived', updated_at = now()
 where status <> 'archived';

comment on table public.discover_events is
  'Keşfet (kültür etkinlikleri) — 2026-09-11 itibarıyla arşiv. Navigasyondan kaldırıldı; satırlar silinmedi, yalnız durum archived.';
