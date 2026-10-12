/*
  GÖRÜNÜMLER SATIR GÜVENLİĞİNİ ATLAMASIN (12 Ekim 2026)

  BULGU
  -----
  Supabase güvenlik danışmanı iki ERROR veriyor (lint 0010
  security_definer_view): `public.discover_event_occurrence_rows` ve
  `public.firsat_tutar_kuyrugu` görünümleri `postgres` sahipliğinde ve
  `security_invoker` ayarı yok. Postgres'te böyle bir görünüm, sorgulayanın
  değil SAHİBİNİN yetkisiyle çalışır: alttaki tabloların satır güvenliği
  (RLS) uygulanmaz.

  ÖLÇÜLDÜ (üretim, anonim anahtar, yalnız okuma): `discover_events`
  tablosu RLS ile 0 satır dönerken `discover_event_occurrence_rows`
  görünümü 226 satır döndü — hepsi `archived` (Keşfet 11 Eylül'de
  kapandı). Kişisel veri yok ama yayımlanmamış kayıtlar ve iç alanlar
  (review_reason, source_fingerprint, puanlar) anonim okunabiliyordu.

  `firsat_tutar_kuyrugu` zaten yalnız `published` fırsatları süzüyor ve
  `opportunities` politikası da onları açıyor; bugün fazladan satır
  sızdırmıyor. Yine de aynı kalıp: ileride süzgeç değişirse RLS'i atlar.

  DÜZELTME
  --------
  İki görünüm de `security_invoker = on` alıyor: sorgu çağıranın
  yetkisiyle çalışıyor, alttaki RLS geçerli oluyor.
    · anonim ziyaretçi: discover_events politikası yalnız 'published'
      kayıtları açıyor (bugün 0) → görünüm de 0 dönüyor.
    · servis anahtarı (otomasyon, scripts/firsat-tutar-kontrol.mjs):
      RLS'i zaten atlıyor; davranışı değişmiyor.
    · `list_active_discover_events` görünümü yalnız dönüş TÜRÜ olarak
      kullanıyor; tür değişmiyor.

  Veri değişmiyor; yalnız görünüm seçeneği.
*/

alter view public.discover_event_occurrence_rows set (security_invoker = on);
alter view public.firsat_tutar_kuyrugu set (security_invoker = on);
