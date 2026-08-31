-- BAŞVURU KOPYASINA İLETİŞİM YAZILAMIYOR
--
-- NEDEN BU EK ADIM
-- ----------------
-- Bir önceki göç (20260912020000) geçmiş kopyalardan `eposta` ve
-- `telefon` anahtarlarını düşürdü, istemci de artık yazmıyor
-- (lib/basvuru-kopyasi.mjs). Ama ikisi birlikte bile bir SINIR değil:
-- kopya, istemcinin gönderdiği bir JSON. Kendi isteğini kuran bir
-- istemci `profile_snapshot` içine yeniden e-posta koyabilirdi ve
-- şirket paneli onu olduğu gibi çekerdi.
--
-- Regresyon testi bunu yakaladı: test kendi satırını e-postalı
-- yazdığında kontrol düştü. Kural istemcide duruyordu, veride değil.
--
-- Artık anahtarlar YAZIM ANINDA düşüyor. Kopyanın geri kalanına
-- dokunulmuyor; ad, okul, bölüm, yetenekler, projeler aynen duruyor.
--
-- Şirket, teklif kabul edildiğinde e-postayı `public.basvuru_iletisimi`
-- üzerinden ve GÜNCEL hâliyle alıyor.
create or replace function public.guard_profile_snapshot_contact()
returns trigger
language plpgsql
as $$
begin
  if new.profile_snapshot is not null then
    new.profile_snapshot := new.profile_snapshot - 'eposta' - 'telefon';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_profile_snapshot_contact() from public, anon, authenticated;

drop trigger if exists applications_guard_snapshot_contact on public.applications;
create trigger applications_guard_snapshot_contact
  before insert or update on public.applications
  for each row execute function public.guard_profile_snapshot_contact();
