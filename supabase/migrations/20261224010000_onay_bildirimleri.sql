/*
  ONAY BİLDİRİMLERİ — "İLANIN YAYINDA" VE "ŞİRKET HESABIN ONAYLANDI" (9 Kasım 2026)

  Kullanıcı isteği: "yönetici olarak ilanı onayladığımda 'ilanınız yayında'
  diye bildirim gitmeli". Ölçülen: Modmere'nin "Tekstil Tasarım Stajyeri"
  ilanı 9 Kasım 00:34'te yönetici onayıyla yayına girdi, şirkete hiçbir
  bildirim düşmedi. Onay işlevleri (yonetim_ilan_karari, değişiklik kararı,
  yeniden deneme işi) yalnız ilanın durumunu değiştiriyor; notifications'a
  yazan bir yol yoktu. Aynı eksik yeni şirket talebinin onayında da var.

  BU GÖÇ — işlevlere dokunmadan, durum değişimine bağlı iki tetikleyici:

    1. listings: şirket ilanı (origin employer_posted) yayında OLMAYAN bir
       durumdan 'published'e geçtiğinde şirketin her üyesine
       "İlanın yayında". Yalnız şirketin KENDİSİ yayınlamadıysa: çağıran
       yönetici ya da oturumsuz sunucu işi (yeniden deneme). Şirketin
       kendi gönderimi otomatik kontrolden geçip anında yayına girdiğinde
       sonuç zaten ekranında; ona ayrıca bildirim gitmiyor.
    2. sirket_talepleri: durum 'onaylandi'ye geçtiğinde talep sahibine
       "Şirket hesabın onaylandı".

  Tekrar yok: dedupe_key ilan başına yayın anıyla, talep başına bir kez.
  Bildirim yazılamazsa onay DURMUYOR (istisna yutuluyor): bildirim kararın
  yan ürünü, kararı geri almamalı.

  GERİ ALMA
    drop trigger if exists ilan_yayinda_bildirimi on public.listings;
    drop trigger if exists sirket_talebi_onay_bildirimi on public.sirket_talepleri;
    drop function if exists public.ilan_yayinda_bildir();
    drop function if exists public.sirket_talebi_onay_bildir();
*/

create or replace function public.ilan_yayinda_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.company_id is null or new.origin <> 'employer_posted' then
    return new;
  end if;
  if auth.uid() is not null and not public.is_admin() then
    return new;
  end if;
  begin
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    select m.user_id,
           'ilan_yayinda',
           'İlanın yayında',
           coalesce(nullif(trim(new.title), ''), 'İlan') || ' onaylandı; öğrenciler artık görebilir ve başvurabilir.',
           '/sirket/ilanlar',
           'ilan-yayinda:' || new.id::text || ':' || m.user_id::text || ':' || extract(epoch from now())::bigint::text
      from public.company_members m
     where m.company_id = new.company_id
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  exception when others then
    raise warning 'ilan_yayinda_bildir: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists ilan_yayinda_bildirimi on public.listings;
create trigger ilan_yayinda_bildirimi
  after update of status on public.listings
  for each row
  when (old.status is distinct from 'published' and new.status = 'published')
  execute function public.ilan_yayinda_bildir();

create or replace function public.sirket_talebi_onay_bildir()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.user_id is null then
    return new;
  end if;
  begin
    insert into public.notifications (recipient_id, type, title, body, target_url, dedupe_key)
    values (
      new.user_id,
      'sirket_onaylandi',
      'Şirket hesabın onaylandı',
      coalesce(nullif(trim(new.sirket_adi), ''), 'Şirketin') || ' açıldı. Artık ilan girebilirsin.',
      '/sirket/ilanlar',
      'sirket-onaylandi:' || new.id::text
    )
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  exception when others then
    raise warning 'sirket_talebi_onay_bildir: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists sirket_talebi_onay_bildirimi on public.sirket_talepleri;
create trigger sirket_talebi_onay_bildirimi
  after update of durum on public.sirket_talepleri
  for each row
  when (old.durum is distinct from 'onaylandi' and new.durum = 'onaylandi')
  execute function public.sirket_talebi_onay_bildir();

revoke all on function public.ilan_yayinda_bildir() from public, anon, authenticated;
revoke all on function public.sirket_talebi_onay_bildir() from public, anon, authenticated;
