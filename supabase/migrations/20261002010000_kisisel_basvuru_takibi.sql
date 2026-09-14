-- KİŞİSEL BAŞVURU TAKİBİ
--
-- Öğrencinin kendi tuttuğu kayıt. `applications` tablosuyla KARIŞMIYOR:
-- orası GERÇEK başvuru (platform içi başvuru ya da gönderdiğimiz
-- e-posta), burası öğrencinin kendi takip defteri.
--
-- NEDEN AYRI TABLO
-- ---------------
-- Envanterin çoğu `application_method = 'external'`: öğrenci şirketin
-- kendi sayfasında başvuruyor ve o başvuru bizim veritabanımızda YOK.
-- Ölçüldü (14 Eylül 2026, üretim): 6 başvurunun 4'ü external.
--
-- Bu öğrencinin "başvurdum" bilgisini `applications` tablosuna yazmak,
-- göndermediğimiz bir başvuruyu göndermiş gibi kaydetmek olurdu:
-- şirket panelinde başvuru görünür, işveren cevap bekler, kimse
-- başvurmamış olur. İki kavram ayrı tabloda.
--
-- KİŞİSEL DURUM GERÇEK DURUMU EZMİYOR
-- -----------------------------------
-- `applications.status` işverenin değerlendirmesi; buradaki
-- `personal_status` öğrencinin kendi notu. İkisi aynı satırda olsaydı
-- öğrencinin "Görüşme" yazması işverenin durumunu değiştirirdi.

create type public.kisisel_basvuru_durumu as enum (
  'basvurdum',
  'bekliyorum',
  'gorusme',
  'teklif',
  'olumsuz',
  'vazgectim'
);

create table if not exists public.application_tracking (
  id uuid primary key default gen_random_uuid(),

  /* `applications` ile aynı kimlik düzeni: satırın sahibi auth kullanıcısı. */
  student_id uuid not null references auth.users (id) on delete cascade,

  /*
    İLAN SİLİNSE BİLE TAKİP GEÇMİŞİ KALIYOR

    `on delete set null` + aşağıdaki iki anlık görüntü. İlan kapanınca
    (status='closed') satır zaten duruyor; ilan SİLİNİRSE bağ kopuyor
    ama öğrenci neye başvurduğunu görmeye devam ediyor.

    `cascade` olsaydı bir ilanın silinmesi öğrencinin kendi kaydını da
    silerdi — kendi verisi, başkasının kararıyla kaybolmamalı.
  */
  listing_id uuid references public.listings (id) on delete set null,

  /*
    ANLIK GÖRÜNTÜ — İLANIN O ANDAKİ HÂLİ

    Yalnız silinme için değil: ilan başlığı sonradan düzeltilebiliyor ve
    öğrencinin "şuna başvurdum" kaydı o günkü adı taşımalı.
  */
  listing_title text,
  company_name text,

  /*
    GERÇEK BAŞVURU KAYDI — VARSA

    internal ve email_application'da dolu: takip kartı gerçek başvuruya
    bağlı ve işverenin durumu salt okunur gösterilebiliyor.
    external'da NULL: bizde gerçek bir başvuru yok.
  */
  application_id uuid references public.applications (id) on delete set null,

  /* Kanal: mevcut enum yeniden üretilmiyor. */
  channel public.application_method not null,

  /* Öğrencinin beyan ettiği başvuru tarihi. */
  applied_at timestamptz not null default now(),

  personal_status public.kisisel_basvuru_durumu not null default 'basvurdum',
  personal_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint application_tracking_ilan_ya_da_anlik
    check (listing_id is not null or length(btrim(coalesce(listing_title, ''))) > 0)
);

/*
  MÜKERRER TAKİP KAYDI YOK

  `nulls not distinct`: external takipte `application_id` NULL ve normal
  bir unique indekste iki NULL "farklı" sayılır — aynı ilana iki kez
  "başvurdum" işaretlenebilirdi. Bu sözdizimi NULL'ları da eşit
  sayıyor, yani kullanıcı + ilan + (gerçek başvuru | yok) tekil.
*/
create unique index if not exists application_tracking_tekil_idx
  on public.application_tracking (student_id, listing_id, application_id)
  nulls not distinct;

create index if not exists application_tracking_ogrenci_idx
  on public.application_tracking (student_id, applied_at desc);

/* `updated_at` elle yazılmıyor: istemci eski bir damga gönderebilirdi. */
create or replace function public.application_tracking_damga()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  /* Sahip değiştirilemiyor: satır bir kez kime aitse öyle kalıyor. */
  new.student_id := old.student_id;
  return new;
end;
$$;

drop trigger if exists application_tracking_damga_t on public.application_tracking;
create trigger application_tracking_damga_t
  before update on public.application_tracking
  for each row execute function public.application_tracking_damga();

alter table public.application_tracking enable row level security;

/*
  YALNIZ SAHİBİ — ŞİRKETLER GÖREMİYOR

  `applications` tablosunda şirketin kendi ilanına gelen başvuruları
  gördüğü bir politika var. BURADA ÖYLE BİR POLİTİKA YOK ve olmaması
  kasıtlı: kişisel notlar ve "external başvurdum" işareti öğrencinin
  kendi defteri. Şirket bunu görse, öğrenci not yazarken kendini
  sansürler ve defter işe yaramaz hâle gelir.
*/
drop policy if exists "ogrenci kendi takibini okur" on public.application_tracking;
create policy "ogrenci kendi takibini okur" on public.application_tracking
  for select to authenticated using (student_id = auth.uid());

drop policy if exists "ogrenci takip ekler" on public.application_tracking;
create policy "ogrenci takip ekler" on public.application_tracking
  for insert to authenticated with check (student_id = auth.uid());

drop policy if exists "ogrenci kendi takibini gunceller" on public.application_tracking;
create policy "ogrenci kendi takibini gunceller" on public.application_tracking
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "ogrenci kendi takibini siler" on public.application_tracking;
create policy "ogrenci kendi takibini siler" on public.application_tracking
  for delete to authenticated using (student_id = auth.uid());

comment on table public.application_tracking is
  'Öğrencinin KENDİ takip defteri. `applications` gerçek başvuru; bu '
  'tablo kişisel durum ve not. Şirketlere kapalı (select politikası yok).';

comment on column public.application_tracking.personal_status is
  'Öğrencinin kendi değerlendirmesi. applications.status işverenin '
  'değerlendirmesi ve bu alan onu EZMİYOR.';

/**
 * PLATFORM İÇİ BAŞVURUDAN TAKİP KARTI
 *
 * internal ve email_application başvuruları için takip kaydı otomatik
 * oluşuyor: öğrenci aynı şeyi iki kez işaretlemesin.
 *
 * `security definer` DEĞİL: tetikleyici zaten başvurunun sahibi
 * adına çalışıyor ve politika `student_id = auth.uid()` ile geçiyor.
 * Yükseltilmiş yetki gerekmiyor, istemiyoruz.
 *
 * `on conflict do nothing`: mükerrer indeks çakışırsa başvuru
 * kaydedilmeye devam ediyor — takip kartı bir kolaylık, başvurunun
 * kendisi asıl iş.
 */
create or replace function public.basvurudan_takip_olustur()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  ilan record;
begin
  /* external buraya hiç düşmüyor: onun gerçek başvurusu bizde yok. */
  if new.application_method = 'external' then
    return new;
  end if;

  select l.title, c.name into ilan
    from public.listings l
    left join public.companies c on c.id = l.company_id
   where l.id = new.listing_id;

  insert into public.application_tracking (
    student_id, listing_id, listing_title, company_name,
    application_id, channel, applied_at
  ) values (
    new.student_id, new.listing_id, ilan.title, ilan.name,
    new.id, new.application_method, coalesce(new.applied_at, now())
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists basvurudan_takip_t on public.applications;
create trigger basvurudan_takip_t
  after insert on public.applications
  for each row execute function public.basvurudan_takip_olustur();
