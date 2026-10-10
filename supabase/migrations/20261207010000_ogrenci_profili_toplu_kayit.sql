/*
  ÖĞRENCİ PROFİLİ — TEK İŞLEMDE TOPLU KAYIT (11 Ekim 2026)

  Profil düzenleme ekranı artık bölüm bölüm değil, tek "Tüm değişiklikleri
  kaydet" düğmesiyle kaydediyor. İstemci önce iki tabloyu güncelleyip
  sonra çocuk tabloları sil-yeniden-yaz ile ayrı ayrı yazıyordu: ortada
  bir istek düşerse profil yarı kaydedilmiş kalıyordu (ör. deneyimler
  silinmiş, yenileri yazılmamış). Bu işlev hepsini TEK işlemde yapıyor;
  bir adım hata verirse hiçbiri yazılmıyor.

  GÜVENLİK: `security invoker`. İşlev çağıranın yetkileriyle çalışıyor;
  RLS, sütun yetkileri ve tetikleyiciler (kayıt sınırları, deneyim tarih
  denetimi) istemcinin doğrudan yazımındakiyle AYNI. Yalnız kendi
  satırına yazabiliyor (`auth.uid()`), başka hiçbir yetki eklenmiyor.
  Güncellenebilecek sütunlar açık bir listede; listede olmayan anahtar
  reddediliyor (sessizce yutulmuyor).

  DOĞRULANMIŞ BECERİ VE DİLLER KORUNUYOR: eski sil-yeniden-yaz, testle
  doğrulanmış beceriyi silip doğrulanmamış olarak geri yazıyordu (RLS
  öğrencinin `verified = true` yazmasına izin vermiyor). Burada listede
  kalan beceri ve dil satırına dokunulmuyor; yalnız çıkarılanlar
  siliniyor, yeniler ekleniyor, doğrulanmamışların seviyesi güncelleniyor.

  Yalnız ekleme: tablo ya da sütun değişmiyor, veri taşınmıyor.

  Yük biçimi (her anahtar isteğe bağlı; olmayan bölüme dokunulmuyor):
    profil       → profiles sütunları
    ogrenci      → student_profiles sütunları
    yetenekler   → [{ name, level, category, domain, years_of_exp }]
    diller       → [{ language, level, proficiency_text }]
    projeler     → [{ title, description, tech_stack, github_url, live_url, start_year, end_year, ongoing, sort_order }]
    deneyimler   → [{ position, organization, start_year, start_month, end_year, end_month, ongoing, description, employment_type, sort_order }]
    egitimler    → [{ school, department, level, start_year, end_year, ongoing, gpa, sort_order }]
    sertifikalar → [{ name, issuer, issue_year, issue_month, url, sort_order }]
*/

create or replace function public.ogrenci_profilini_kaydet(p jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  kimlik uuid := auth.uid();
  anahtar text;
  atamalar text;
  etkilenen integer;
  profil_sutunlari constant text[] := array[
    'full_name', 'phone', 'avatar_url', 'interface_language', 'content_language', 'home_country'
  ];
  ogrenci_sutunlari constant text[] := array[
    'university', 'faculty', 'department', 'city', 'grade_level', 'graduation_year', 'gpa', 'bio',
    'github_username', 'linkedin_url', 'portfolio_url', 'cv_path', 'target_roles', 'soft_skills',
    'education_level', 'education_start_year', 'education_ongoing', 'interests', 'cv_gizli',
    'preferred_job_countries', 'pref_work_type', 'pref_cities', 'pref_type',
    'pref_uni_provides_insurance', 'pref_earliest_start', 'pref_weekly_days', 'pref_min_stipend'
  ];
begin
  if kimlik is null then
    raise exception 'Oturum yok' using errcode = '42501';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Geçersiz profil yükü' using errcode = '22023';
  end if;
  for anahtar in select jsonb_object_keys(p) loop
    if anahtar <> all (array['profil', 'ogrenci', 'yetenekler', 'diller', 'projeler', 'deneyimler', 'egitimler', 'sertifikalar']) then
      raise exception 'Bilinmeyen bölüm: %', anahtar using errcode = '22023';
    end if;
  end loop;

  /* ---------------------------------------------------------- profiles */
  if p ? 'profil' and p->'profil' <> '{}'::jsonb then
    select string_agg(format('%I = r.%I', k, k), ', ')
      into atamalar
      from jsonb_object_keys(p->'profil') k;
    for anahtar in select jsonb_object_keys(p->'profil') loop
      if anahtar <> all (profil_sutunlari) then
        raise exception 'Bu alan güncellenemez: %', anahtar using errcode = '22023';
      end if;
    end loop;
    execute format(
      'update public.profiles t set %s from jsonb_populate_record(null::public.profiles, $1) r where t.id = $2',
      atamalar
    ) using p->'profil', kimlik;
    get diagnostics etkilenen = row_count;
    if etkilenen = 0 then
      raise exception 'Profil bulunamadı' using errcode = 'P0002';
    end if;
  end if;

  /* -------------------------------------------------- student_profiles */
  if p ? 'ogrenci' and p->'ogrenci' <> '{}'::jsonb then
    for anahtar in select jsonb_object_keys(p->'ogrenci') loop
      if anahtar <> all (ogrenci_sutunlari) then
        raise exception 'Bu alan güncellenemez: %', anahtar using errcode = '22023';
      end if;
    end loop;
    select string_agg(format('%I = r.%I', k, k), ', ')
      into atamalar
      from jsonb_object_keys(p->'ogrenci') k;
    execute format(
      'update public.student_profiles t set %s from jsonb_populate_record(null::public.student_profiles, $1) r where t.id = $2',
      atamalar
    ) using p->'ogrenci', kimlik;
    get diagnostics etkilenen = row_count;
    if etkilenen = 0 then
      raise exception 'Öğrenci profili bulunamadı' using errcode = 'P0002';
    end if;
  end if;

  /* ------------------------------------------------------- yetenekler */
  if p ? 'yetenekler' then
    delete from public.student_skills s
     where s.student_id = kimlik
       and s.name <> all (
         coalesce((select array_agg(r.name) from jsonb_populate_recordset(null::public.student_skills, p->'yetenekler') r), '{}')
       );
    update public.student_skills s
       set level = coalesce(r.level, s.level), category = coalesce(r.category, s.category),
           domain = r.domain, years_of_exp = r.years_of_exp
      from jsonb_populate_recordset(null::public.student_skills, p->'yetenekler') r
     where s.student_id = kimlik and s.name = r.name and s.verified = false
       and (s.level, s.category, s.domain, s.years_of_exp)
           is distinct from (coalesce(r.level, s.level), coalesce(r.category, s.category), r.domain, r.years_of_exp);
    insert into public.student_skills (student_id, name, level, category, domain, years_of_exp)
    select kimlik, r.name, coalesce(r.level, 'Beginner'), coalesce(r.category, 'General'), r.domain, r.years_of_exp
      from jsonb_populate_recordset(null::public.student_skills, p->'yetenekler') r
     where not exists (select 1 from public.student_skills s where s.student_id = kimlik and s.name = r.name)
    on conflict (student_id, name) do nothing;
  end if;

  /* ----------------------------------------------------------- diller */
  if p ? 'diller' then
    delete from public.student_languages l
     where l.student_id = kimlik
       and l.language <> all (
         coalesce((select array_agg(r.language) from jsonb_populate_recordset(null::public.student_languages, p->'diller') r), '{}')
       );
    /* Doğrulanmış dilin seviyesi değişmiyor: doğrulama o seviye için verildi. */
    update public.student_languages l
       set level = coalesce(r.level, l.level), proficiency_text = r.proficiency_text
      from jsonb_populate_recordset(null::public.student_languages, p->'diller') r
     where l.student_id = kimlik and l.language = r.language and l.verified = false
       and (l.level, l.proficiency_text) is distinct from (coalesce(r.level, l.level), r.proficiency_text);
    insert into public.student_languages (student_id, language, level, proficiency_text)
    select kimlik, r.language, r.level, r.proficiency_text
      from jsonb_populate_recordset(null::public.student_languages, p->'diller') r
     where not exists (select 1 from public.student_languages l where l.student_id = kimlik and l.language = r.language)
    on conflict (student_id, language) do nothing;
  end if;

  /* --------------------------------------------------------- projeler */
  if p ? 'projeler' then
    delete from public.student_projects where student_id = kimlik;
    insert into public.student_projects
      (student_id, title, description, tech_stack, github_url, live_url, start_year, end_year, ongoing, sort_order)
    select kimlik, r.title, r.description, coalesce(r.tech_stack, '{}'), r.github_url, r.live_url,
           r.start_year, r.end_year, coalesce(r.ongoing, false), coalesce(r.sort_order, 0)
      from jsonb_populate_recordset(null::public.student_projects, p->'projeler') r;
  end if;

  /* ------------------------------------------------------- deneyimler */
  if p ? 'deneyimler' then
    delete from public.student_experiences where student_id = kimlik;
    insert into public.student_experiences
      (student_id, position, organization, start_year, start_month, end_year, end_month, ongoing, description, employment_type, sort_order)
    select kimlik, r.position, r.organization, r.start_year, r.start_month, r.end_year, r.end_month,
           coalesce(r.ongoing, false), r.description, r.employment_type, coalesce(r.sort_order, 0)
      from jsonb_populate_recordset(null::public.student_experiences, p->'deneyimler') r;
  end if;

  /* -------------------------------------------------------- eğitimler */
  if p ? 'egitimler' then
    delete from public.student_educations where student_id = kimlik;
    insert into public.student_educations
      (student_id, school, department, level, start_year, end_year, ongoing, gpa, sort_order)
    select kimlik, r.school, r.department, r.level, r.start_year, r.end_year,
           coalesce(r.ongoing, false), r.gpa, coalesce(r.sort_order, 0)
      from jsonb_populate_recordset(null::public.student_educations, p->'egitimler') r;
  end if;

  /* ----------------------------------------------------- sertifikalar */
  if p ? 'sertifikalar' then
    delete from public.student_certificates where student_id = kimlik;
    insert into public.student_certificates
      (student_id, name, issuer, issue_year, issue_month, url, sort_order)
    select kimlik, r.name, r.issuer, r.issue_year, r.issue_month, r.url, coalesce(r.sort_order, 0)
      from jsonb_populate_recordset(null::public.student_certificates, p->'sertifikalar') r;
  end if;
end;
$$;

revoke all on function public.ogrenci_profilini_kaydet(jsonb) from public, anon;
grant execute on function public.ogrenci_profilini_kaydet(jsonb) to authenticated;

comment on function public.ogrenci_profilini_kaydet(jsonb) is
  'Öğrenci profilini tek işlemde kaydeder (security invoker: RLS ve sütun yetkileri aynen geçerli).';
