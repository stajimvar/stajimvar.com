-- SOSYAL KATMAN C AŞAMASI — EKSİK BÖLÜM / EŞLEME TALEBİ
--
-- NEDEN AYRI TABLO, `sector_requests` GENİŞLETİLMEDİ
-- --------------------------------------------------
-- `sector_requests` kullanıcının kendi yazdığı bir ALAN adını taşıyor ve
-- çözümü `sectors` tablosuna satır eklemek. Buradaki ihtiyaç farklı ve
-- iki yüzlü:
--
--   · bölüm katalogda YOK        → çözüm `departments`e satır
--   · bölüm var, EŞLEMESİ yok    → çözüm `department_sectors`e satır
--
-- İkisini tek tabloda toplamak `requested_sector` kolonunu iki ayrı
-- anlam taşımaya zorlar ve yönetim kuyruğunu belirsizleştirirdi:
-- yönetici satıra bakıp ne yapması gerektiğini anlayamazdı.
-- `sector_requests` olduğu gibi duruyor.
--
-- TALEP AÇMAK ERİŞİM VERMEZ
-- -------------------------
-- `sosyal_gorunur` yalnız `sector_id` dolu ve yayımlanmış profillere
-- bakıyor; talep satırı bu koşulların hiçbirini değiştirmiyor. Bu, aynı
-- kural `sector_requests` için de testle sabitlenmişti; burada da
-- sabitleniyor.

create table if not exists public.department_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  /* Bölüm katalogda VARSA doldurulur: sorun eşlemenin yokluğu. */
  department_id uuid references public.departments(id) on delete set null,

  /* Bölüm katalogda YOKSA kullanıcının yazdığı ad. Yalnız OKUNUR bir
     açıklama; hiçbir yoldan `departments` satırına dönüşmüyor. */
  requested_department text
    check (requested_department is null
           or length(btrim(requested_department)) between 2 and 120),

  universite text check (universite is null or length(universite) <= 120),
  aciklama   text check (aciklama is null or length(aciklama) <= 500),

  status text not null default 'bekliyor'
    check (status in ('bekliyor', 'incelendi', 'reddedildi', 'eklendi')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint talep_hedefi_var
    check (department_id is not null or requested_department is not null)
);

/* Aynı anda tek açık talep: kuyruk bir kişiyle dolmasın. */
create unique index if not exists department_requests_acik_talep_key
  on public.department_requests (user_id) where status = 'bekliyor';

create index if not exists department_requests_kuyruk_idx
  on public.department_requests (status, created_at);

drop trigger if exists department_requests_updated_at on public.department_requests;
create trigger department_requests_updated_at
  before update on public.department_requests
  for each row execute function public.sosyal_updated_at();

alter table public.department_requests enable row level security;

drop policy if exists "kendi bolum talebini yonetir" on public.department_requests;
create policy "kendi bolum talebini yonetir" on public.department_requests
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "kendi bolum talebini acar" on public.department_requests;
create policy "kendi bolum talebini acar" on public.department_requests
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "bolum taleplerini yonetici okur" on public.department_requests;
create policy "bolum taleplerini yonetici okur" on public.department_requests
  for select to authenticated using (public.is_admin());

/*
  DURUMU YALNIZ YÖNETİCİ DEĞİŞTİRİR. Kullanıcı kendi talebini
  "eklendi" yapıp erişim kazanamıyor — zaten kazanamazdı (erişim
  `sosyal_gorunur`dan geçiyor) ama kuyruğu kirletebilirdi.
*/
drop policy if exists "bolum talebini yonetici gunceller" on public.department_requests;
create policy "bolum talebini yonetici gunceller" on public.department_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.department_requests to authenticated;
revoke delete on public.department_requests from authenticated;
revoke all on public.department_requests from anon;
