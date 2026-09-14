-- RIZA SÜRÜMÜ OLMADAN E-POSTA AÇILAMIYOR
--
-- ÖLÇÜLDÜ (14 Eylül 2026, üretim): servis anahtarıyla
--
--   POST /rest/v1/saved_searches
--   {"email_enabled": true, "consent_text_version": null}
--   → HTTP 201
--
-- Kayıt kabul edildi. Sebep: ekleme tetikleyicisi `email_enabled` true
-- görünce `consent_at`i KENDİSİ dolduruyordu, dolayısıyla
-- `email_enabled = false or consent_at is not null` kısıtı hiçbir zaman
-- ihlal edilemiyordu.
--
-- Yani "e-posta açılırken açık rıza kaydedilsin" kuralı bir zaman
-- damgasına indirgenmişti: damga vardı ama KULLANICININ NEYE ONAY
-- VERDİĞİ kayıtta olmayabiliyordu. Metin bir gün değişirse eski
-- rızanın hangi metne verildiği söylenemezdi.
--
-- DÜZELTME: rıza sürümü BEYAN EDİLMEDEN e-posta açılamıyor. Tetikleyici
-- artık uydurmuyor, reddediyor.

create or replace function public.saved_searches_ekleme_damgasi()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.email_enabled then
    /*
      SÜRÜM BEYANI ŞART

      `coalesce(..., 1)` ile varsayılan atamak, gösterilmemiş bir metne
      onay varmış gibi davranmaktı. Çağıran hangi metni gösterdiğini
      söylemek zorunda.
    */
    if new.consent_text_version is null then
      raise exception 'E-posta açmak için rıza metni sürümü gerekiyor.'
        using errcode = '23514', detail = 'riza-surumu-yok';
    end if;
    new.consent_at := now();
  else
    new.consent_at := null;
    new.consent_text_version := null;
  end if;
  new.opted_out_at := null;
  return new;
end;
$$;

create or replace function public.saved_searches_damga()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  new.student_id := old.student_id;

  if new.email_enabled and not old.email_enabled then
    /* AÇMA: sürüm beyanı şart — ekleme yolundaki kuralla aynı. */
    if new.consent_text_version is null then
      raise exception 'E-posta açmak için rıza metni sürümü gerekiyor.'
        using errcode = '23514', detail = 'riza-surumu-yok';
    end if;
    new.consent_at := now();
    new.opted_out_at := null;
  elsif old.email_enabled and not new.email_enabled then
    new.opted_out_at := now();
    new.consent_at := old.consent_at;
    /*
      KAPATMADA SÜRÜM KORUNUYOR

      Denetim için: "bu kullanıcı hangi metne onay vermişti" sorusu
      kapatmadan sonra da cevaplanabilir olmalı.
    */
    new.consent_text_version := old.consent_text_version;
  else
    new.consent_at := old.consent_at;
    new.opted_out_at := old.opted_out_at;
    new.consent_text_version := old.consent_text_version;
  end if;

  return new;
end;
$$;

/* Kısıt da sürümü istiyor: tetikleyici bir gün atlanırsa tablo tutuyor. */
alter table public.saved_searches drop constraint if exists saved_searches_riza_sarti;
alter table public.saved_searches add constraint saved_searches_riza_sarti
  check (
    email_enabled = false
    or (consent_at is not null and consent_text_version is not null)
  );
