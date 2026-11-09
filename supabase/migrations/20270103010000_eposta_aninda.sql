/*
  E-POSTA OLAY ANINDA (9 Kasım 2026, kullanıcı: "hepsini yap")

  Ölçülen: e-posta kuyrukları GitHub Actions'ın 10 dakikalık işine
  bağlıydı; GitHub o işi en son 6 saat önce çalıştırmıştı (saatlik işler
  4–7 saatte bir). Modmere'nin başvuru e-postası elle tetiklenene kadar
  gitmedi.

  BU GÖÇ
    1. pg_net eklentisi (veritabanından HTTP isteği; istek işlem
       bittikten SONRA arka planda gidiyor).
    2. Vault'ta rastgele bir tetik anahtarı; `eposta_tetik_dogrula`
       yalnız service_role'e açık (Edge işlevi gelen başlığı bununla
       karşılaştırıyor).
    3. Üç tetikleyici (deyim düzeyinde, satır başına değil): yeni başvuru
       bildirimi, yeni şirket talebi, yeni/yenilenen ekip daveti →
       `eposta-tetik` Edge işlevini çağırıyor. İstek atılamazsa asıl işlem
       DURMUYOR; GitHub işi yedek olarak kuyruğu yine işliyor.

  GERİ ALMA
    drop trigger if exists eposta_tetik_bildirim on public.notifications;
    drop trigger if exists eposta_tetik_sirket_talebi on public.sirket_talepleri;
    drop trigger if exists eposta_tetik_ekip_daveti on public.sirket_davetleri;
    drop function if exists public.eposta_tetikle();
    drop function if exists public.eposta_tetikle_bildirim();
    drop function if exists public.eposta_tetik_dogrula(text);
*/

create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'eposta_tetik_anahtari') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'eposta_tetik_anahtari',
      'eposta-tetik Edge işlevinin çağrı anahtarı (20270103010000)');
  end if;
end $$;

create or replace function public.eposta_tetik_dogrula(p_anahtar text)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce(p_anahtar, '') <> ''
     and exists (select 1 from vault.decrypted_secrets s
                  where s.name = 'eposta_tetik_anahtari' and s.decrypted_secret = p_anahtar);
$$;

revoke all on function public.eposta_tetik_dogrula(text) from public, anon, authenticated;
grant execute on function public.eposta_tetik_dogrula(text) to service_role;

/* Ortak çağrı: işlem bitince pg_net arka planda gönderiyor. */
create or replace function public.eposta_tetik_cagir()
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  anahtar text;
begin
  select s.decrypted_secret into anahtar from vault.decrypted_secrets s where s.name = 'eposta_tetik_anahtari';
  if anahtar is null then return; end if;
  perform net.http_post(
    url := 'https://gdumgdgwlfnohkaucfow.supabase.co/functions/v1/eposta-tetik',
    body := '{}'::jsonb,
    headers := jsonb_build_object('content-type', 'application/json', 'x-eposta-tetik', anahtar),
    timeout_milliseconds := 10000);
exception when others then
  raise warning 'eposta_tetik_cagir: %', sqlerrm;
end;
$$;

revoke all on function public.eposta_tetik_cagir() from public, anon, authenticated;

create or replace function public.eposta_tetikle()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.eposta_tetik_cagir();
  return null;
end;
$$;

/* Bildirimlerin çoğu e-postaya dönüşmüyor: yalnız yeni başvuru varsa çağır. */
create or replace function public.eposta_tetikle_bildirim()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if exists (select 1 from yeni_satirlar y where y.type = 'yeni_basvuru') then
    perform public.eposta_tetik_cagir();
  end if;
  return null;
end;
$$;

revoke all on function public.eposta_tetikle() from public, anon, authenticated;
revoke all on function public.eposta_tetikle_bildirim() from public, anon, authenticated;

drop trigger if exists eposta_tetik_bildirim on public.notifications;
create trigger eposta_tetik_bildirim
  after insert on public.notifications
  referencing new table as yeni_satirlar
  for each statement execute function public.eposta_tetikle_bildirim();

drop trigger if exists eposta_tetik_sirket_talebi on public.sirket_talepleri;
create trigger eposta_tetik_sirket_talebi
  after insert on public.sirket_talepleri
  for each statement execute function public.eposta_tetikle();

drop trigger if exists eposta_tetik_ekip_daveti on public.sirket_davetleri;
create trigger eposta_tetik_ekip_daveti
  after insert on public.sirket_davetleri
  for each statement execute function public.eposta_tetikle();
