-- CV VE PROFİL ALANLARI — EKSİKLER TAMAMLANIYOR
--
-- Öğrenci profilini bir kez doldurup kurumsal bir CV indirebilmeli. Denetim
-- (10 Ekim 2026) şunları buldu:
--
--   VAR       telefon ve e-posta (profiles), şehir, tanıtım, LinkedIn,
--             portföy, fotoğraf, yetenekler (student_skills + soft_skills),
--             diller, projeler, deneyimler, TEK bir eğitim kaydı
--   YOK       birden fazla eğitim, sertifikalar, ilgi alanları, eğitim
--             düzeyi ve başlangıç yılı, deneyimde çalışma türü, projede
--             tarih, CV'de neyin görüneceği tercihi
--
-- Bu göç YALNIZ EKLİYOR: hiçbir sütun silinmiyor, hiçbir mevcut değer
-- değişmiyor. Yeni sütunların hepsi ya boş bırakılabilir ya da boş
-- varsayılanlı; eski kayıtlar olduğu gibi okunmaya devam ediyor.
--
-- BİRİNCİL EĞİTİM YERİNDE KALIYOR
-- `student_profiles.university / department / grade_level / gpa` sitenin
-- her yerinde okunuyor (okul rozeti, eşleşme, profil başlığı). Onları yeni
-- tabloya taşımak tek kaynağı ikiye bölerdi. Birincil eğitim profilde
-- kalıyor; `student_educations` YALNIZ ek eğitimler için (önceki okul,
-- yüksek lisans, değişim programı…). CV ikisini birleştirip sıralıyor.

/* ================================================================== */
/*  1) PROFİL: eğitim düzeyi, başlangıç, ilgi alanları, CV gizleme     */
/* ================================================================== */

alter table public.student_profiles
  add column if not exists education_level      text,
  add column if not exists education_start_year smallint,
  add column if not exists education_ongoing    boolean,
  add column if not exists interests            text[]  not null default '{}',
  add column if not exists cv_gizli             text[]  not null default '{}';

alter table public.student_profiles
  drop constraint if exists student_profiles_education_level_check,
  add constraint student_profiles_education_level_check
    check (education_level is null
           or education_level in ('lise', 'on_lisans', 'lisans', 'yuksek_lisans', 'doktora')),
  drop constraint if exists student_profiles_education_start_check,
  add constraint student_profiles_education_start_check
    check (education_start_year is null or education_start_year between 1950 and 2100),
  drop constraint if exists student_profiles_interests_check,
  add constraint student_profiles_interests_check
    check (cardinality(interests) <= 20),
  /*
    CV'DE GİZLENEN ALANLAR — PROFİLDEN SİLİNMİYOR
    Değer yalnız PDF çıktısında neyin basılmayacağını söylüyor. Bilinmeyen
    anahtar reddediliyor: yazım hatalı bir anahtar sessizce "gizli değil"
    sayılırdı ve kişi gizlediğini sandığı numarayı CV'de görürdü.
  */
  drop constraint if exists student_profiles_cv_gizli_check,
  add constraint student_profiles_cv_gizli_check
    check (cv_gizli <@ array['telefon', 'eposta', 'konum', 'linkedin', 'portfoy', 'foto', 'not', 'ilgi']::text[]);

/*
  `education_ongoing` BOŞ = BİLİNMİYOR. `true` varsayılanı, zaten mezun
  olmuş mevcut kullanıcıları CV'de "Devam ediyor" gösterirdi. Boşken
  arayüz sınıf bilgisinden türetiyor ("Yüksek Lisans / Mezun" → bitmiş).
*/
comment on column public.student_profiles.education_ongoing is
  'Birincil eğitim sürüyor mu. NULL = bilinmiyor; arayüz sınıf bilgisinden türetir.';

comment on column public.student_profiles.cv_gizli is
  'CV çıktısında BASILMAYAN alanlar. Profildeki değerler silinmez; yalnız PDF/CV görünümünde gizlenir.';

/* ================================================================== */
/*  2) DENEYİM: çalışma türü                                           */
/* ================================================================== */

alter table public.student_experiences
  add column if not exists employment_type text;

alter table public.student_experiences
  drop constraint if exists student_experiences_employment_type_check,
  add constraint student_experiences_employment_type_check
    check (employment_type is null
           or employment_type in ('tam_zamanli', 'yari_zamanli', 'staj', 'gonullu', 'serbest', 'donemlik'));

/* ================================================================== */
/*  3) PROJE: isteğe bağlı tarih                                       */
/* ================================================================== */

alter table public.student_projects
  add column if not exists start_year smallint,
  add column if not exists end_year   smallint,
  add column if not exists ongoing    boolean not null default false;

alter table public.student_projects
  drop constraint if exists student_projects_tarih_check,
  add constraint student_projects_tarih_check
    check (
      (start_year is null or start_year between 1950 and 2100)
      and (end_year is null or end_year between 1950 and 2100)
      and (end_year is null or start_year is null or end_year >= start_year)
      and (not ongoing or end_year is null)
    );

/* ================================================================== */
/*  4) EK EĞİTİMLER                                                    */
/* ================================================================== */

create table if not exists public.student_educations (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.student_profiles(id) on delete cascade,
  school      text not null,
  department  text,
  level       text,
  start_year  smallint,
  end_year    smallint,
  ongoing     boolean not null default false,
  gpa         numeric(5,2),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  constraint student_educations_school_check
    check (char_length(btrim(school)) between 1 and 160),
  constraint student_educations_department_check
    check (department is null or char_length(department) <= 160),
  constraint student_educations_level_check
    check (level is null or level in ('lise', 'on_lisans', 'lisans', 'yuksek_lisans', 'doktora')),
  constraint student_educations_tarih_check
    check (
      (start_year is null or start_year between 1950 and 2100)
      and (end_year is null or end_year between 1950 and 2100)
      and (end_year is null or start_year is null or end_year >= start_year)
      and (not ongoing or end_year is null)
    ),
  /* 4'lük ve 100'lük ölçek ikisi de kullanılıyor; ölçek uydurulmuyor. */
  constraint student_educations_gpa_check
    check (gpa is null or gpa between 0 and 100)
);

comment on table public.student_educations is
  'Öğrencinin EK eğitimleri (birincil eğitim student_profiles üzerinde). Yalnız sahibi ve yönetici okur.';

create index if not exists student_educations_student_idx
  on public.student_educations (student_id, sort_order);

/* ================================================================== */
/*  5) SERTİFİKALAR                                                    */
/* ================================================================== */

create table if not exists public.student_certificates (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.student_profiles(id) on delete cascade,
  name         text not null,
  issuer       text,
  issue_year   smallint,
  issue_month  smallint,
  url          text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  constraint student_certificates_name_check
    check (char_length(btrim(name)) between 1 and 160),
  constraint student_certificates_issuer_check
    check (issuer is null or char_length(issuer) <= 160),
  constraint student_certificates_tarih_check
    check ((issue_year is null or issue_year between 1950 and 2100)
       and (issue_month is null or issue_month between 1 and 12)),
  /* Bağlantı yalnız http(s): `javascript:` gibi bir adres CV'de tıklanabilir olurdu. */
  constraint student_certificates_url_check
    check (url is null or (char_length(url) <= 500 and url ~* '^https?://'))
);

comment on table public.student_certificates is
  'Öğrencinin sertifikaları. Yalnız sahibi ve yönetici okur.';

create index if not exists student_certificates_student_idx
  on public.student_certificates (student_id, sort_order);

/* ================================================================== */
/*  6) ERİŞİM — deneyim tablosuyla AYNI kural                          */
/* ================================================================== */

alter table public.student_educations  enable row level security;
alter table public.student_certificates enable row level security;

revoke all on public.student_educations   from public, anon, authenticated;
revoke all on public.student_certificates from public, anon, authenticated;
grant select, insert, update, delete on public.student_educations   to authenticated;
grant select, insert, update, delete on public.student_certificates to authenticated;

drop policy if exists "kendi egitimleri" on public.student_educations;
create policy "kendi egitimleri" on public.student_educations
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "yonetici egitimleri okur" on public.student_educations;
create policy "yonetici egitimleri okur" on public.student_educations
  for select to authenticated
  using (public.is_admin());

drop policy if exists "kendi sertifikalari" on public.student_certificates;
create policy "kendi sertifikalari" on public.student_certificates
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "yonetici sertifikalari okur" on public.student_certificates;
create policy "yonetici sertifikalari okur" on public.student_certificates
  for select to authenticated
  using (public.is_admin());

/* Kişi başına üst sınır: tek bir hesap tabloyu şişiremesin (deneyimdeki gibi 30). */
create or replace function public.ogrenci_cv_kayit_siniri()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  adet int;
begin
  execute format('select count(*) from public.%I where student_id = $1', tg_table_name)
    into adet using new.student_id;
  if adet >= 30 then
    raise exception 'Bu bölüme en fazla 30 kayıt eklenebilir' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.ogrenci_cv_kayit_siniri() from public, anon, authenticated;

drop trigger if exists student_educations_siniri on public.student_educations;
create trigger student_educations_siniri
  before insert on public.student_educations
  for each row execute function public.ogrenci_cv_kayit_siniri();

drop trigger if exists student_certificates_siniri on public.student_certificates;
create trigger student_certificates_siniri
  before insert on public.student_certificates
  for each row execute function public.ogrenci_cv_kayit_siniri();
