-- =============================================================================
-- StajımVar — Başlangıç Şeması
-- Hedef: Supabase (PostgreSQL 15+), bölge: eu-central-1 (Frankfurt)
-- Çalıştırma: Supabase Dashboard > SQL Editor, veya `supabase db push`
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";      -- ilan başlığı/şirket adı arama
create extension if not exists "unaccent";     -- Türkçe karakter duyarsız arama

-- =============================================================================
-- 1. ENUM TİPLERİ  (src/types.ts ile birebir eşleşiyor)
-- =============================================================================

create type user_role        as enum ('student', 'company', 'admin');
create type skill_level      as enum ('Beginner', 'Intermediate', 'Advanced', 'Expert');
create type work_type        as enum ('Remote', 'Hybrid', 'On-site');
create type work_type_pref   as enum ('Remote', 'Hybrid', 'On-site', 'Any');
create type grade_level      as enum ('1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', 'Yüksek Lisans / Mezun');
create type internship_type  as enum ('Summer Mandatory', 'Long-term', 'Voluntary', 'Part-time', 'Any');
create type listing_term     as enum ('Summer 2026', 'Fall 2026', 'Long-term 2026', 'All Year');
create type listing_category as enum ('general', 'public_sector', 'global');
create type listing_status   as enum ('draft', 'published', 'closed', 'archived');
create type company_plan     as enum ('Free', 'Startup', 'Corporate', 'Enterprise');

create type application_status as enum (
  'submitted', 'under_review', 'technical_assessment',
  'interview_scheduled', 'offer_extended', 'rejected', 'withdrawn'
);

-- Beceri kategorileri: types.ts'te hem eski ('hard_skills') hem yeni ('Frontend')
-- değerler var. Yeni sette birleştirdim; migrasyonda eskiler map'lenmeli.
create type skill_category as enum (
  'Frontend', 'Backend', 'Mobile', 'Data/AI', 'DevOps/Cloud',
  'UI/UX Design', 'Cybersecurity', 'Product & Agile',
  'Soft Skills', 'Languages', 'General'
);

create type hard_skill_domain as enum (
  'Yazılım & Bilişim', 'Tasarım & Görsel',
  'Mühendislik & Üretim', 'İşletme, Pazarlama & Finans'
);

-- =============================================================================
-- 2. PROFİLLER  (auth.users'a 1-1 bağlı kök tablo)
-- =============================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'student',
  full_name   text not null default '',
  email       text not null,
  phone       text,
  avatar_url  text,
  -- KVKK: açık rıza kaydı. Sürüm + zaman damgası tutuluyor ki
  -- metin değiştiğinde yeniden onay isteyebilelim.
  kvkk_consent_at       timestamptz,
  kvkk_consent_version  text,
  marketing_consent     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Her auth.users kaydı için tek profil. role alanı yetkilendirmenin temeli.';

-- Yeni kullanıcı kaydolunca profil otomatik oluşsun.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 3. ÖĞRENCİ TARAFI
-- =============================================================================

create table public.student_profiles (
  id                uuid primary key references public.profiles(id) on delete cascade,
  university        text,
  faculty           text,
  department        text,
  grade_level       grade_level,
  graduation_year   int check (graduation_year between 2020 and 2040),
  gpa               numeric(3,2) check (gpa >= 0 and gpa <= 4.00),
  bio               text,
  github_username   text,
  linkedin_url      text,
  portfolio_url     text,
  cv_path           text,               -- storage: cvs/{user_id}/dosya.pdf
  target_roles      text[] not null default '{}',
  soft_skills       text[] not null default '{}',
  earned_badges     text[] not null default '{}',

  -- Tercihler (StudentPreferences)
  pref_work_type              work_type_pref not null default 'Any',
  pref_cities                 text[] not null default '{}',
  pref_type                   internship_type not null default 'Any',
  pref_uni_provides_insurance boolean not null default false,
  pref_earliest_start         date,
  pref_weekly_days            int check (pref_weekly_days between 1 and 7),
  pref_min_stipend            int check (pref_min_stipend >= 0),

  -- Öğrenci ilan arama sonuçlarında görünmek istiyor mu
  is_open_to_offers boolean not null default true,
  updated_at        timestamptz not null default now()
);

create table public.student_skills (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.student_profiles(id) on delete cascade,
  name          text not null,
  level         skill_level not null default 'Beginner',
  category      skill_category not null default 'General',
  domain        hard_skill_domain,
  -- verified yalnızca quiz geçilerek kazanılır; kullanıcı doğrudan set edemez
  -- (aşağıdaki UPDATE politikası bunu zorluyor).
  verified      boolean not null default false,
  years_of_exp  numeric(3,1),
  created_at    timestamptz not null default now(),
  unique (student_id, name)
);

create index on public.student_skills (student_id);
create index on public.student_skills using gin (name gin_trgm_ops);

create table public.student_languages (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.student_profiles(id) on delete cascade,
  language         text not null,
  level            text not null,            -- 'B2', 'C1' ...
  proficiency_text text,
  verified         boolean not null default false,
  unique (student_id, language)
);

create table public.student_projects (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.student_profiles(id) on delete cascade,
  title        text not null,
  description  text,
  tech_stack   text[] not null default '{}',
  github_url   text,
  live_url     text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index on public.student_projects (student_id);

-- =============================================================================
-- 4. ŞİRKET TARAFI
-- =============================================================================

create table public.companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,
  logo_url     text,
  industry     text,
  size         text,
  location     text,
  description  text,
  website_url  text,
  -- rating öğrenci yorumlarından türetilir; şirket kendisi yazamaz.
  rating       numeric(2,1) not null default 0 check (rating between 0 and 5),
  -- verified: vergi no / kurumsal e-posta doğrulaması sonrası admin verir
  verified     boolean not null default false,
  plan         company_plan not null default 'Free',
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on public.companies using gin (name gin_trgm_ops);

create table public.company_members (
  company_id     uuid not null references public.companies(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  recruiter_role text not null default 'Recruiter',   -- 'Owner', 'Recruiter', 'Viewer'
  is_owner       boolean not null default false,
  created_at     timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index on public.company_members (user_id);

-- =============================================================================
-- 5. İLANLAR
-- =============================================================================

create table public.listings (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references public.companies(id) on delete cascade,
  title                    text not null,
  department               text,
  work_type                work_type not null default 'On-site',
  city                     text,
  mandatory_staj_accepted  boolean not null default true,
  voluntary_staj_accepted  boolean not null default true,
  is_paid                  boolean not null default false,
  stipend_text             text,
  duration                 text,
  term                     listing_term not null default 'All Year',
  application_deadline     date,
  min_grade_level          text,
  required_skills          text[] not null default '{}',
  preferred_skills         text[] not null default '{}',
  description              text,
  responsibilities         text[] not null default '{}',
  perks                    text[] not null default '{}',
  category                 listing_category not null default 'general',
  featured                 boolean not null default false,
  status                   listing_status not null default 'draft',
  -- applicants_count trigger ile güncelleniyor (aşağıda). Client yazamaz.
  applicants_count         int not null default 0,
  posted_at                timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index on public.listings (company_id);
create index on public.listings (status, application_deadline);
create index on public.listings using gin (required_skills);
create index on public.listings using gin (title gin_trgm_ops);

-- =============================================================================
-- 6. BAŞVURULAR
-- =============================================================================

create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references public.listings(id) on delete cascade,
  student_id        uuid not null references public.student_profiles(id) on delete cascade,
  status            application_status not null default 'submitted',
  match_score       int check (match_score between 0 and 100),
  cover_letter      text,
  cv_path           text,
  interview_date    timestamptz,
  -- interview_notes SADECE şirketin görebileceği dahili not.
  interview_notes   text,
  -- company_feedback öğrenciye gösterilen geri bildirim.
  company_feedback  text,
  applied_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (listing_id, student_id)      -- aynı ilana iki kez başvurulamaz
);

create index on public.applications (student_id, status);
create index on public.applications (listing_id, status);

-- Başvuru sayacını tutarlı tut
create or replace function public.sync_applicants_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.listings set applicants_count = applicants_count + 1
    where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update public.listings set applicants_count = greatest(applicants_count - 1, 0)
    where id = old.listing_id;
  end if;
  return null;
end;
$$;

create trigger applications_count_sync
  after insert or delete on public.applications
  for each row execute function public.sync_applicants_count();

-- =============================================================================
-- 7. BECERİ QUİZLERİ
-- DİKKAT: correct_index ve explanation ASLA öğrenciye gitmemeli.
-- Bu yüzden quiz_questions'a client'ın SELECT hakkı YOK. Sorular
-- quiz_questions_public view'ından okunur, cevap kontrolü sunucuda yapılır.
-- =============================================================================

create table public.quizzes (
  id           uuid primary key default gen_random_uuid(),
  skill_name   text not null unique,
  badge_name   text not null,
  badge_icon   text,
  category     skill_category not null default 'General',
  pass_score   int not null default 70 check (pass_score between 0 and 100),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  question       text not null,
  code_snippet   text,
  options        text[] not null,
  correct_index  int not null,
  explanation    text,
  sort_order     int not null default 0
);

create index on public.quiz_questions (quiz_id);

-- Cevapsız görünüm — frontend bunu okur.
create view public.quiz_questions_public
with (security_invoker = true) as
  select id, quiz_id, question, code_snippet, options, sort_order
  from public.quiz_questions;

create table public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  student_id   uuid not null references public.student_profiles(id) on delete cascade,
  score        int not null check (score between 0 and 100),
  passed       boolean not null default false,
  answers      jsonb,
  created_at   timestamptz not null default now()
);

create index on public.quiz_attempts (student_id, quiz_id);

-- =============================================================================
-- 8. RLS YARDIMCI FONKSİYONLARI (tablolardan sonra tanımlanmalı)
-- Politika içinden tablo sorgulamak sonsuz döngü yaratır. Bu yüzden
-- security definer fonksiyonlar RLS'i bypass ederek rolü okur.
-- =============================================================================

create or replace function public.app_role()
returns user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.app_role() = 'admin', false) $$;

-- Kullanıcı bu şirkete üye mi? (İK ekibi çok kişilik olabilir.)
create or replace function public.is_company_member(target_company uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company and user_id = auth.uid()
  )
$$;

-- =============================================================================
-- 9. updated_at OTOMASYONU
-- =============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger t1 before update on public.profiles          for each row execute function public.touch_updated_at();
create trigger t2 before update on public.student_profiles  for each row execute function public.touch_updated_at();
create trigger t3 before update on public.companies         for each row execute function public.touch_updated_at();
create trigger t4 before update on public.listings          for each row execute function public.touch_updated_at();
create trigger t5 before update on public.applications      for each row execute function public.touch_updated_at();

-- =============================================================================
-- 10. RLS — HER TABLO KİLİTLİ, SONRA İZİN AÇILIYOR
-- =============================================================================

alter table public.profiles          enable row level security;
alter table public.student_profiles  enable row level security;
alter table public.student_skills    enable row level security;
alter table public.student_languages enable row level security;
alter table public.student_projects  enable row level security;
alter table public.companies         enable row level security;
alter table public.company_members   enable row level security;
alter table public.listings          enable row level security;
alter table public.applications      enable row level security;
alter table public.quizzes           enable row level security;
alter table public.quiz_questions    enable row level security;
alter table public.quiz_attempts     enable row level security;

-- ---- profiles ----
create policy "kendi profilini okur" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "kendi profilini gunceller" on public.profiles
  for update using (id = auth.uid())
  -- rol değiştirilemez: yetki yükseltmeyi engeller
  with check (id = auth.uid() and role = public.app_role());

-- ---- student_profiles ----
-- Öğrenci profilleri, öğrenci izin verdiyse doğrulanmış şirketlere açık.
create policy "ogrenci kendi profili" on public.student_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "sirketler acik profilleri gorur" on public.student_profiles
  for select using (
    is_open_to_offers
    and public.app_role() = 'company'
  );

create policy "admin tum ogrenciler" on public.student_profiles
  for select using (public.is_admin());

-- ---- student_skills / languages / projects ----
create policy "kendi becerileri" on public.student_skills
  for all using (student_id = auth.uid())
  -- verified'ı kullanıcı kendi set edemez
  with check (student_id = auth.uid() and verified = false);

create policy "basvurulan sirket becerileri gorur" on public.student_skills
  for select using (
    exists (
      select 1 from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.student_id = student_skills.student_id
        and public.is_company_member(l.company_id)
    )
  );

create policy "kendi dilleri" on public.student_languages
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "kendi projeleri" on public.student_projects
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "projeler herkese acik" on public.student_projects
  for select using (
    exists (select 1 from public.student_profiles sp
            where sp.id = student_projects.student_id and sp.is_open_to_offers)
  );

-- ---- companies ----
create policy "sirket profilleri herkese acik" on public.companies
  for select using (true);

create policy "uye sirketi gunceller" on public.companies
  for update using (public.is_company_member(id))
  -- verified ve rating şirket tarafından değiştirilemez
  with check (
    public.is_company_member(id)
    and verified = (select c.verified from public.companies c where c.id = companies.id)
    and rating   = (select c.rating   from public.companies c where c.id = companies.id)
  );

create policy "sirket hesabi olusturur" on public.companies
  for insert with check (
    auth.uid() is not null and public.app_role() = 'company'
  );

-- ---- company_members ----
create policy "uyeliklerini gorur" on public.company_members
  for select using (user_id = auth.uid() or public.is_company_member(company_id));

create policy "sahip uye ekler" on public.company_members
  for insert with check (
    -- ilk üye (kurucu) kendini ekleyebilir, sonrası sahip yetkisi ister
    user_id = auth.uid()
    or exists (select 1 from public.company_members m
               where m.company_id = company_members.company_id
                 and m.user_id = auth.uid() and m.is_owner)
  );

-- ---- listings ----
create policy "yayindaki ilanlar herkese acik" on public.listings
  for select using (status = 'published' or public.is_company_member(company_id));

create policy "sirket kendi ilanlarini yonetir" on public.listings
  for all using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- ---- applications ----
create policy "ogrenci kendi basvurulari" on public.applications
  for select using (student_id = auth.uid());

create policy "ogrenci basvuru yapar" on public.applications
  for insert with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status = 'published'
        and (l.application_deadline is null or l.application_deadline >= current_date)
    )
  );

-- Öğrenci yalnızca başvurusunu geri çekebilir; statüyü ilerletemez.
create policy "ogrenci basvuru geri ceker" on public.applications
  for update using (student_id = auth.uid())
  with check (student_id = auth.uid() and status = 'withdrawn');

create policy "sirket basvurulari gorur" on public.applications
  for select using (
    exists (select 1 from public.listings l
            where l.id = applications.listing_id
              and public.is_company_member(l.company_id))
  );

create policy "sirket basvuru durumu gunceller" on public.applications
  for update using (
    exists (select 1 from public.listings l
            where l.id = applications.listing_id
              and public.is_company_member(l.company_id))
  );

-- ---- quizzes ----
create policy "aktif quizler acik" on public.quizzes
  for select using (is_active or public.is_admin());

-- quiz_questions'a client SELECT hakkı YOK — cevaplar sızmasın.
create policy "sorulari sadece admin gorur" on public.quiz_questions
  for select using (public.is_admin());

create policy "kendi denemeleri" on public.quiz_attempts
  for select using (student_id = auth.uid() or public.is_admin());

-- INSERT yok: quiz sonucu sadece service_role ile edge function'dan yazılır.

-- =============================================================================
-- 11. STORAGE BUCKET'LARI
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cvs',    'cvs',    false, 5242880,  array['application/pdf']),
  ('logos',  'logos',  true,  2097152,  array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('avatars','avatars',true,  2097152,  array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- CV'ler gizli. Yol şeması: cvs/{user_id}/dosya.pdf
create policy "ogrenci kendi cv yukler" on storage.objects
  for insert with check (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ogrenci kendi cv okur" on storage.objects
  for select using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ogrenci kendi cv siler" on storage.objects
  for delete using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Şirket, başvuran öğrencinin CV'sini görür.
create policy "sirket basvuran cv okur" on storage.objects
  for select using (
    bucket_id = 'cvs'
    and exists (
      select 1 from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.student_id::text = (storage.foldername(name))[1]
        and public.is_company_member(l.company_id)
    )
  );

create policy "avatar ve logo yukleme" on storage.objects
  for insert with check (
    bucket_id in ('avatars','logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- NOTLAR
-- - service_role anahtarı yalnızca sunucuda (Pages Functions env) kullanılacak.
--   Frontend'e SADECE anon key gider.
-- - quiz_attempts'a INSERT politikası bilerek yazılmadı; quiz puanı yalnızca
--   service_role ile yazılır ki öğrenci kendine 100 veremesin.
-- - KVKK: kvkk_consent_at boşsa kayıt akışı tamamlanmış sayılmamalı.
--   Silme talebi geldiğinde auth.users silinince cascade ile her şey gider.
-- =============================================================================
