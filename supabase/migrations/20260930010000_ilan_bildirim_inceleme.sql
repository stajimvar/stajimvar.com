-- İLAN BİLDİRİMİ — İNCELEME VE KUYRUK İŞÇİSİ
--
-- 20260929010000 bildirimi kalıcı olarak kaydediyor ve kuyruk alanlarını
-- tutuyordu, ama iki şey eksikti: yöneticinin bildirimi GÖRDÜĞÜ bir ekran
-- ve kuyruğu GERÇEKTEN gönderen bir işçi. Kayıt alınıyor, kimse okumuyordu.

alter table public.listing_reports
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

/*
  BİR SONRAKİ DENEME ZAMANI — BEKLEME ARALIĞI VE KİLİT, AYNI ALAN

  Tek bir alan iki işi birlikte yapıyor:
    başarısız deneme → ileri atılıyor (üstel bekleme: 2^deneme dakika)
    işçi kaydı aldı  → kilit süresi kadar ileri atılıyor

  İkinci kullanım, eş zamanlı işçilerin aynı kaydı göndermesini engelleyen
  şeyin ikinci yarısı (birincisi `for update skip locked`). Ayrı bir
  "kilitli mi" alanı, işçi çökerse sonsuza kadar kilitli kalan kayıtlar
  üretirdi; süre dolunca kayıt kendiliğinden kuyruğa dönüyor.
*/
alter table public.listing_reports
  add column if not exists notify_next_attempt_at timestamptz not null default now();

/*
  TEST KAYDI GERÇEK KULLANICI KAYDINDAN AYRI

  Canlı doğrulama gerçek bir satır yazıyor; onu gerçek bir öğrenci
  bildirimiyle karıştırmak, ya testi temizlerken gerçek kaydı silmek ya da
  test kaydını inceleme kuyruğunda bırakmak demek.

  Bayrağı İSTEMCİ SET EDEMİYOR: uç nokta bu alanı hiç göndermiyor, yazma
  fonksiyonu da almıyor. Yalnız servis anahtarıyla işaretlenebiliyor —
  yoksa kötü niyetli biri kendi bildirimini "test" diye gizleyebilirdi.
*/
alter table public.listing_reports
  add column if not exists test_mi boolean not null default false;

create index if not exists listing_reports_kuyruk_idx
  on public.listing_reports (notify_next_attempt_at)
  where notified_at is null;

/** Bir bildirim için en fazla e-posta denemesi. */
create or replace function public.ilan_bildirim_deneme_siniri()
returns integer language sql immutable as $$ select 8 $$;

/**
 * İŞÇİ KAYDI ALIR — EŞ ZAMANLI İŞÇİ AYNI KAYDI ALMAZ
 *
 * `for update skip locked`: iki işçi aynı anda koşarsa ikincisi birincinin
 * tuttuğu satırı atlıyor, beklemiyor. Alınan satırın bir sonraki deneme
 * zamanı kilit penceresi kadar ileri atılıyor; işçi e-postayı gönderemeden
 * ölürse kayıt o sürenin sonunda kendiliğinden kuyruğa dönüyor.
 */
create or replace function public.ilan_bildirimi_kuyruktan_al(
  p_adet integer default 10,
  p_kilit_dakika integer default 10
)
returns setof public.listing_reports
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  with alinan as (
    select r.id
      from public.listing_reports r
     where r.notified_at is null
       and r.notify_attempts < public.ilan_bildirim_deneme_siniri()
       and r.notify_next_attempt_at <= now()
     order by r.created_at
     limit greatest(1, least(p_adet, 100))
       for update skip locked
  )
  update public.listing_reports g
     set notify_next_attempt_at = now() + make_interval(mins => greatest(1, p_kilit_dakika))
   where g.id in (select id from alinan)
  returning g.*;
end;
$$;

revoke all on function public.ilan_bildirimi_kuyruktan_al(integer, integer) from public;
revoke all on function public.ilan_bildirimi_kuyruktan_al(integer, integer) from anon;
revoke all on function public.ilan_bildirimi_kuyruktan_al(integer, integer) from authenticated;

/**
 * Denemeyi işaretler. Başarısızlıkta ÜSTEL BEKLEME.
 *
 * Sabit aralık, geçici bir sağlayıcı hatasında da kalıcı bir yapılandırma
 * hatasında da aynı sıklıkta deniyor. 2^deneme dakika: ilk hatalar hızla,
 * ısrarlı hatalar seyrek deneniyor (son deneme ~2 saat sonra).
 *
 * Hata metni 500 karaktere kırpılıyor: sağlayıcının döndürdüğü gövde
 * bazen tüm isteği yankılıyor ve kuyruk alanı log deposuna dönüşüyor.
 */
create or replace function public.ilan_bildirimi_kuyruk_isaretle(
  p_id    uuid,
  p_basarili boolean,
  p_hata  text default null
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.listing_reports
     set notify_attempts = notify_attempts + 1,
         notified_at = case when p_basarili then now() else notified_at end,
         notify_last_error = case when p_basarili then null else left(p_hata, 500) end,
         notify_next_attempt_at = case
           when p_basarili then notify_next_attempt_at
           else now() + make_interval(mins => power(2, least(notify_attempts + 1, 7))::int)
         end
   where id = p_id;
$$;

revoke all on function public.ilan_bildirimi_kuyruk_isaretle(uuid, boolean, text) from public;
revoke all on function public.ilan_bildirimi_kuyruk_isaretle(uuid, boolean, text) from anon;
revoke all on function public.ilan_bildirimi_kuyruk_isaretle(uuid, boolean, text) from authenticated;

/**
 * YÖNETİCİ İNCELEMESİ — durum + sonuç notu.
 *
 * RLS'teki update politikası yöneticiye satırın TAMAMINI açıyor; kuyruk
 * alanları (deneme sayısı, son hata, sonraki deneme) arayüzden
 * yazılmamalı. Bu fonksiyon yalnız incelemeye ait üç alana dokunuyor.
 *
 * Yetki arayüzde DEĞİL burada: `is_admin()` içeride kontrol ediliyor, yani
 * adresi bilen yetkisiz biri fonksiyonu doğrudan çağırsa da hata alıyor.
 */
create or replace function public.ilan_bildirimi_incele(
  p_id     uuid,
  p_durum  text,
  p_not    text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiye açık.'
      using errcode = '42501', detail = 'yetki-yok';
  end if;

  if p_durum is not null
     and not (p_durum = any (enum_range(null::public.ilan_bildirim_durumu)::text[])) then
    raise exception 'Bilinmeyen inceleme durumu.' using errcode = '22023';
  end if;

  update public.listing_reports
     set status = coalesce(p_durum::public.ilan_bildirim_durumu, status),
         review_note = nullif(btrim(coalesce(p_not, '')), ''),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id;
end;
$$;

revoke all on function public.ilan_bildirimi_incele(uuid, text, text) from public;
revoke all on function public.ilan_bildirimi_incele(uuid, text, text) from anon;
grant execute on function public.ilan_bildirimi_incele(uuid, text, text) to authenticated;

/**
 * TÜKENEN DENEMEYİ YENİDEN KUYRUĞA ALIR — yalnız yönetici.
 *
 * Sekiz deneme bitince kayıt kuyrukta kalıyor ama denenmiyor: sebep
 * genellikle bir yapılandırma hatası (anahtar, alan adı doğrulaması).
 * Sebep düzeltildikten sonra bildirimi yeniden göndermenin bir yolu
 * olmalı; yoksa yönetici kaydı görür ama haber e-postasını asla alamaz.
 *
 * Sayaç sıfırlanıyor, KAYIT SİLİNMİYOR: bildirimin kendisi her hâlde
 * korunuyor.
 */
create or replace function public.ilan_bildirimi_yeniden_dene(p_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiye açık.'
      using errcode = '42501', detail = 'yetki-yok';
  end if;

  update public.listing_reports
     set notify_attempts = 0,
         notify_last_error = null,
         notify_next_attempt_at = now()
   where id = p_id
     and notified_at is null;
end;
$$;

revoke all on function public.ilan_bildirimi_yeniden_dene(uuid) from public;
revoke all on function public.ilan_bildirimi_yeniden_dene(uuid) from anon;
grant execute on function public.ilan_bildirimi_yeniden_dene(uuid) to authenticated;

/* Görünüm bekleme aralığını da bilmeli: zamanı gelmemiş kayıt "bekliyor". */
create or replace view public.ilan_bildirim_kuyrugu as
  select id, listing_url, company_name, position_title, reason, created_at,
         notify_attempts, notify_last_error, notify_next_attempt_at, test_mi
    from public.listing_reports
   where notified_at is null
     and notify_attempts < public.ilan_bildirim_deneme_siniri()
   order by created_at;
