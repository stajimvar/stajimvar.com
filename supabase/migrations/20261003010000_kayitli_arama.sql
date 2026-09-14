-- KAYITLI ARAMA VE GÜNLÜK ÖZET
--
-- GERİ ALINABİLİR VE MEVCUT VERİYE DOKUNMUYOR: üç yeni tablo, üç yeni
-- fonksiyon. Hiçbir mevcut tablo, kolon ya da politika değişmiyor;
-- geri almak için üç tabloyu ve üç fonksiyonu düşürmek yetiyor.

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,

  /* Kullanıcının verdiği ad. Boşsa arayüz filtreden bir özet yazıyor. */
  name text,

  /*
    FİLTRELER — SÜRÜMLÜ VE DOĞRULANMIŞ

    JSON olarak saklanıyor ama doğrulamasız çalıştırılmıyor:
    `kayitli_arama_filtre_dogrula` bilinmeyen alanı atıyor ve sürümü
    damgalıyor. Sürüm, eski kayıtların güvenle okunabilmesi için:
    tanınmayan bir sürüm reddedilmiyor, alanlar tek tek yükseltiliyor.
  */
  filters jsonb not null,
  filters_version integer not null default 1,

  /*
    E-POSTA VARSAYILAN KAPALI

    Arama kaydetmek bir bildirim aboneliği DEĞİL. Kullanıcı e-posta
    açmadan da aramasını saklayabiliyor; açtığı anda rıza kaydediliyor.
  */
  email_enabled boolean not null default false,

  /* Rızanın kendisi: zaman + gösterilen metnin sürümü. */
  consent_at timestamptz,
  consent_text_version integer,

  /*
    KAPATMA ZAMANI DA SAKLANIYOR

    Denetim için: "bu kullanıcı ne zaman izin verdi, ne zaman geri
    aldı" sorusunun cevabı kayıtta olmalı. Yalnız `email_enabled`
    tutulsaydı geri alma anı kaybolurdu.
  */
  opted_out_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  /* Rıza olmadan e-posta açık olamıyor — veritabanı düzeyinde. */
  constraint saved_searches_riza_sarti
    check (email_enabled = false or consent_at is not null)
);

create index if not exists saved_searches_ogrenci_idx
  on public.saved_searches (student_id, created_at desc);
create index if not exists saved_searches_epostali_idx
  on public.saved_searches (student_id)
  where email_enabled;

/*
  TESLİM DEFTERİ — KULLANICI + İLAN DÜZEYİNDE

  Arama düzeyinde olsaydı aynı ilan iki aramaya eşleştiğinde iki kez
  gönderilirdi. Birincil anahtar (kullanıcı, ilan): bir ilan bir
  kullanıcıya en fazla bir kez gidiyor.
*/
create table if not exists public.digest_deliveries (
  student_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,

  first_matched_at timestamptz not null default now(),

  /*
    ÜÇ DURUM, ÜÇÜ AYRI

      sent_at dolu   + reason 'digest'   → e-postayla gönderildi
      sent_at dolu   + reason 'baseline' → arama kaydedildiğinde zaten
                                           eşleşiyordu; GÖNDERİLMEDİ
      sent_at null                       → aday, sıraya girmiş
                                           (10 sınırının dışında kaldı)

    Taban kayıtları "gönderilmiş e-posta" olarak raporlanmıyor: `reason`
    ayrımı tam bunun için var.
  */
  sent_at timestamptz,
  reason text not null default 'candidate',

  /* Hangi aramayla eşleştiği — e-postada kısa gösterilebilsin. */
  matched_search_id uuid references public.saved_searches (id) on delete set null,

  primary key (student_id, listing_id),
  constraint digest_deliveries_reason_check
    check (reason in ('candidate', 'baseline', 'digest'))
);

create index if not exists digest_deliveries_aday_idx
  on public.digest_deliveries (student_id)
  where sent_at is null;

/*
  KOŞU KAYDI — KULLANICI + TÜRKİYE TAKVİM GÜNÜ

  Birincil anahtar aynı gün ikinci bir özetin OLUŞMASINI engelliyor:
  eş zamanlı iki işçi de aynı satırı hedefliyor ve biri kaybediyor.

  `run_id` KALICI: Resend idempotency anahtarı bundan türüyor, yani
  yeniden denemede anahtar değişmiyor ve sağlayıcı ikinci kez teslim
  etmiyor.
*/
create table if not exists public.digest_runs (
  student_id uuid not null references auth.users (id) on delete cascade,
  gun date not null,
  run_id uuid not null default gen_random_uuid(),

  /*
    SEÇİLEN İLANLAR GÖNDERİMDEN ÖNCE SABİTLENİYOR

    Yeniden denemede içerik değişmesin: ilk denemede hangi on ilan
    seçildiyse retry aynı onunu gönderiyor. Liste burada değilse
    ikinci deneme farklı bir e-posta üretirdi ve idempotency anahtarı
    da yanlış bir gövdeyi korurdu.
  */
  listing_ids uuid[] not null default '{}',

  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  primary key (student_id, gun)
);

create index if not exists digest_runs_kuyruk_idx
  on public.digest_runs (next_attempt_at)
  where sent_at is null;

/* Damga tetikleyicisi: sahip ve rıza alanları istemciden ezilmesin. */
create or replace function public.saved_searches_damga()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  new.student_id := old.student_id;

  /*
    RIZA VE GERİ ALMA DAMGALARINI SUNUCU YAZIYOR

    İstemci `consent_at` gönderebilseydi geçmiş bir tarih yazıp "ben
    izin vermiştim" diyebilirdi. Damga burada, geçişe bakarak atılıyor.
  */
  if new.email_enabled and not old.email_enabled then
    new.consent_at := now();
    new.opted_out_at := null;
  elsif old.email_enabled and not new.email_enabled then
    new.opted_out_at := now();
    new.consent_at := old.consent_at;
  else
    new.consent_at := old.consent_at;
    new.opted_out_at := old.opted_out_at;
  end if;

  return new;
end;
$$;

drop trigger if exists saved_searches_damga_t on public.saved_searches;
create trigger saved_searches_damga_t
  before update on public.saved_searches
  for each row execute function public.saved_searches_damga();

/* Ekleme anında da rıza damgası sunucudan. */
create or replace function public.saved_searches_ekleme_damgasi()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.email_enabled then
    new.consent_at := now();
    new.consent_text_version := coalesce(new.consent_text_version, 1);
  else
    new.consent_at := null;
  end if;
  new.opted_out_at := null;
  return new;
end;
$$;

drop trigger if exists saved_searches_ekleme_t on public.saved_searches;
create trigger saved_searches_ekleme_t
  before insert on public.saved_searches
  for each row execute function public.saved_searches_ekleme_damgasi();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.saved_searches enable row level security;
alter table public.digest_deliveries enable row level security;
alter table public.digest_runs enable row level security;

drop policy if exists "ogrenci kendi aramalarini okur" on public.saved_searches;
create policy "ogrenci kendi aramalarini okur" on public.saved_searches
  for select to authenticated using (student_id = auth.uid());

drop policy if exists "ogrenci arama kaydeder" on public.saved_searches;
create policy "ogrenci arama kaydeder" on public.saved_searches
  for insert to authenticated with check (student_id = auth.uid());

drop policy if exists "ogrenci kendi aramasini gunceller" on public.saved_searches;
create policy "ogrenci kendi aramasini gunceller" on public.saved_searches
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "ogrenci kendi aramasini siler" on public.saved_searches;
create policy "ogrenci kendi aramasini siler" on public.saved_searches
  for delete to authenticated using (student_id = auth.uid());

/*
  TESLİM GEÇMİŞİ: OKUMA VAR, YAZMA YOK

  Kullanıcı kendi geçmişini görebiliyor ama "gönderildi" durumunu
  DEĞİŞTİREMİYOR: insert/update/delete politikası yok. Yazan tek taraf
  servis anahtarıyla koşan işçi. Aksi hâlde bir kullanıcı `sent_at`i
  temizleyip aynı ilanı kendine tekrar gönderebilirdi.
*/
drop policy if exists "ogrenci kendi teslimlerini okur" on public.digest_deliveries;
create policy "ogrenci kendi teslimlerini okur" on public.digest_deliveries
  for select to authenticated using (student_id = auth.uid());

drop policy if exists "ogrenci kendi kosularini okur" on public.digest_runs;
create policy "ogrenci kendi kosularini okur" on public.digest_runs
  for select to authenticated using (student_id = auth.uid());

/*
  YÖNETİCİ TÜKENEN KOŞULARI GÖRÜYOR

  Aşağıdaki `gunluk_ozet_tukenen` görünümü `security_invoker` ile
  koşuyor, yani ÇAĞIRANIN yetkisine tabi. Bu politika olmadan yönetici
  de boş liste görürdü — görünüm var ama içi görünmez olurdu.

  Politika yalnız OKUMA: yönetici de `sent_at` değiştiremiyor.
*/
drop policy if exists "yonetici kosulari okur" on public.digest_runs;
create policy "yonetici kosulari okur" on public.digest_runs
  for select to authenticated using (public.is_admin());

comment on table public.digest_deliveries is
  'Kullanıcı+ilan teslim defteri. reason: baseline = arama kaydedilirken '
  'zaten eşleşiyordu (gönderilmedi), digest = e-postayla gitti, '
  'candidate = sıraya girdi. Yazma yalnız servis anahtarıyla.';

comment on table public.digest_runs is
  'Kullanıcı + Türkiye takvim günü için tekil koşu. run_id kalıcı: '
  'Resend idempotency anahtarı bundan türüyor.';

-- ---------------------------------------------------------------------
-- FONKSİYONLAR
-- ---------------------------------------------------------------------

/**
 * TABAN KAYITLARI — ARAMA KAYDEDİLİNCE
 *
 * Kaydedildiği anda eşleşen ilanlar `reason='baseline'` ile
 * işaretleniyor: böylece ilk özet geçmişin tamamını göndermiyor.
 *
 * `sent_at` dolduruluyor ki aday listesine girmesinler, ama `reason`
 * ayrı: taban kayıtları "gönderilmiş e-posta" olarak raporlanmıyor.
 *
 * `security definer`: `digest_deliveries`e istemci yazamıyor ve
 * yazmamalı. Fonksiyon yalnız ÇAĞIRANIN kendi kullanıcısı için
 * yazıyor — `auth.uid()` içeride okunuyor, parametre olarak
 * alınmıyor; alınsaydı başkası adına taban yazılabilirdi.
 */
create or replace function public.kayitli_arama_taban_yaz(
  p_search_id uuid,
  p_listing_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  kisi uuid := auth.uid();
  yazilan integer;
begin
  if kisi is null then
    raise exception 'Oturum gerekiyor.' using errcode = '42501';
  end if;

  /* Arama gerçekten bu kullanıcının mı? */
  if not exists (
    select 1 from public.saved_searches s
     where s.id = p_search_id and s.student_id = kisi
  ) then
    raise exception 'Arama bulunamadı.' using errcode = '42501';
  end if;

  with veri as (
    select unnest(p_listing_ids) as listing_id
  )
  insert into public.digest_deliveries (
    student_id, listing_id, sent_at, reason, matched_search_id
  )
  select kisi, v.listing_id, now(), 'baseline', p_search_id
    from veri v
    join public.listings l on l.id = v.listing_id
  on conflict (student_id, listing_id) do nothing;

  get diagnostics yazilan = row_count;
  return yazilan;
end;
$$;

revoke all on function public.kayitli_arama_taban_yaz(uuid, uuid[]) from public;
revoke all on function public.kayitli_arama_taban_yaz(uuid, uuid[]) from anon;
grant execute on function public.kayitli_arama_taban_yaz(uuid, uuid[]) to authenticated;

/**
 * İŞÇİ KOŞU KAYDI ALIR — EŞ ZAMANLI İŞÇİ AYNI KULLANICIYI ALMAZ
 *
 * `for update skip locked`: iki işçi aynı anda koşarsa ikincisi
 * birincinin tuttuğu satırı atlıyor. Alınan satırın `next_attempt_at`i
 * kilit penceresi kadar ileri atılıyor; işçi çökerse kayıt o sürenin
 * sonunda kendiliğinden kuyruğa dönüyor.
 */
create or replace function public.gunluk_ozet_kosu_al(
  p_gun date,
  p_adet integer default 50,
  p_kilit_dakika integer default 10
)
returns setof public.digest_runs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  with alinan as (
    select r.student_id
      from public.digest_runs r
     where r.gun = p_gun
       and r.sent_at is null
       and r.attempts < 6
       and r.next_attempt_at <= now()
     order by r.created_at
     limit greatest(1, least(p_adet, 500))
       for update skip locked
  )
  update public.digest_runs g
     set next_attempt_at = now() + make_interval(mins => greatest(1, p_kilit_dakika))
   where g.gun = p_gun
     and g.student_id in (select student_id from alinan)
  returning g.*;
end;
$$;

revoke all on function public.gunluk_ozet_kosu_al(date, integer, integer) from public;
revoke all on function public.gunluk_ozet_kosu_al(date, integer, integer) from anon;
revoke all on function public.gunluk_ozet_kosu_al(date, integer, integer) from authenticated;

/**
 * Koşu denemesini işaretler. Başarısızlıkta ÜSTEL BEKLEME.
 *
 * Başarıda seçilen ilanlar `reason='digest'` ile teslim sayılıyor.
 * SEÇİLMEYENLERE DOKUNULMUYOR: `sent_at` null kalıyor ve sonraki güne
 * devrediyorlar — onuncu sıradan sonraki ilanlar kaybolmuyor.
 */
create or replace function public.gunluk_ozet_isaretle(
  p_student uuid,
  p_gun date,
  p_basarili boolean,
  p_hata text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  secilen uuid[];
begin
  select listing_ids into secilen
    from public.digest_runs
   where student_id = p_student and gun = p_gun;

  update public.digest_runs
     set attempts = attempts + 1,
         sent_at = case when p_basarili then now() else sent_at end,
         last_error = case when p_basarili then null else left(p_hata, 500) end,
         next_attempt_at = case
           when p_basarili then next_attempt_at
           else now() + make_interval(mins => power(2, least(attempts + 1, 6))::int)
         end
   where student_id = p_student and gun = p_gun;

  if p_basarili and secilen is not null then
    update public.digest_deliveries d
       set sent_at = now(), reason = 'digest'
     where d.student_id = p_student
       and d.listing_id = any (secilen)
       and d.sent_at is null;
  end if;
end;
$$;

revoke all on function public.gunluk_ozet_isaretle(uuid, date, boolean, text) from public;
revoke all on function public.gunluk_ozet_isaretle(uuid, date, boolean, text) from anon;
revoke all on function public.gunluk_ozet_isaretle(uuid, date, boolean, text) from authenticated;

/*
  DENEMESİ TÜKENEN KOŞULAR — YÖNETİCİ GÖRÜNÜMÜ

  `security_invoker`: görünüm ÇAĞIRANIN yetkisiyle koşuyor. Bunu
  yazmamak, altındaki tablonun RLS'ini sessizce atlamak demek — aynı
  hatayı `ilan_bildirim_kuyrugu` görünümünde yapmış ve üretimde
  ölçmüştüm (bkz. 20260930020000).
*/
create or replace view public.gunluk_ozet_tukenen
with (security_invoker = on)
as
  select student_id, gun, attempts, last_error, next_attempt_at, created_at
    from public.digest_runs
   where sent_at is null
     and attempts >= 6
   order by created_at desc;

revoke select on public.gunluk_ozet_tukenen from anon;
