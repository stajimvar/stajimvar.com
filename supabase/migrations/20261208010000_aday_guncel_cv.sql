/*
  İŞVEREN EKRANINDA ADAYIN GÜNCEL CV'Sİ (11 Ekim 2026)

  İşveren başvuru ekranındaki CV önizlemesi yalnız başvuru anındaki kopyadan
  çiziliyordu; eski başvurularda o kopya CV alanlarını taşımadığı için şirket
  öğrencinin kendi gördüğünden çok daha boş bir CV görüyordu. Bu göç güncel
  profil işlevine (`basvuru_aday_guncel_profili`) bir `cv` alanı ekliyor;
  ekran varsayılan olarak bunu gösteriyor, "Başvuru anı" ile kopyaya dönülüyor.

  KAPI DEĞİŞMEDİ: işlev aynı, yalnız etkin paylaşımda (öğrencinin iletişim/
  profil paylaşımı açıkken) dolu dönüyor; aksi hâlde `riza: false`. Mevcut
  anahtarlar aynen duruyor (fark hesabı onlara bağlı). Eklenen alanlarda not
  ortalaması, telefon ve e-posta YOK.

  Yalnız işlev gövdesi değişiyor; tablo ya da veri değişmiyor. `create or
  replace` mevcut yetkileri koruyor.
*/

create or replace function public.basvuru_aday_guncel_profili(p_basvuru uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ogrenci uuid;
  riza    timestamptz;
begin
  if not sosyal_gizli.basvuru_sirketi_mi(p_basvuru) then
    raise exception 'Bu basvuruyu goremezsin' using errcode = '42501';
  end if;

  select a.student_id, a.contact_share_consent_at into ogrenci, riza
    from public.applications a where a.id = p_basvuru;

  /*
    KAPI ETKİN PAYLAŞIM (20261203010000): rıza damgasının varlığı
    yetmiyor; sade akıştaki kural (`basvuru_iletisimi_acik`) soruluyor.
    Öğrenciye gösterilen paylaşım açıklamasıyla aynı cümle.
  */
  if not public.basvuru_iletisimi_acik(p_basvuru) then
    return jsonb_build_object('riza', false);
  end if;

  return jsonb_build_object(
    'riza', true,
    'guncel', (
      select jsonb_build_object(
        'ad',         nullif(btrim(pr.full_name), ''),
        /* Eski kayıtlarda avatar_url gömülü veri (data:) olabiliyor; yalnız HTTPS adres. */
        'fotoUrl',    case when pr.avatar_url ~ '^https://' then pr.avatar_url end,
        'universite', nullif(btrim(sp.university), ''),
        'bolum',      nullif(btrim(sp.department), ''),
        'sinif',      sp.grade_level::text,
        'sehir',      nullif(btrim(sp.pref_cities[1]), ''),
        'github',     nullif(btrim(sp.github_username), ''),
        'portfolyo',  nullif(btrim(sp.portfolio_url), ''),
        'linkedin',   nullif(btrim(sp.linkedin_url), ''),
        'rozetler',   coalesce(to_jsonb(sp.earned_badges), '[]'::jsonb),
        'yetenekler', coalesce((
            select jsonb_agg(s.name order by s.name)
              from public.student_skills s
             where s.student_id = ogrenci and btrim(coalesce(s.name, '')) <> ''), '[]'::jsonb),
        'diller', coalesce((
            select jsonb_agg(case when nullif(btrim(d.level), '') is null then d.language
                                  else d.language || ' (' || d.level || ')' end
                             order by d.language)
              from public.student_languages d
             where d.student_id = ogrenci and btrim(coalesce(d.language, '')) <> ''), '[]'::jsonb),
        'projeler', coalesce((
            select jsonb_agg(jsonb_build_object(
                     'baslik',   p.title,
                     'aciklama', nullif(btrim(p.description), ''),
                     'adres',    coalesce(nullif(btrim(p.live_url), ''), nullif(btrim(p.github_url), '')))
                   order by p.sort_order nulls last, p.created_at)
              from public.student_projects p
             where p.student_id = ogrenci and btrim(coalesce(p.title, '')) <> ''), '[]'::jsonb),
        /*
          DENEYİMLER (20261205010000) — başvuru kopyasındaki biçimle aynı:
          ay/yıl 'YYYY-MM', devam edende bitiş null.
        */
        'deneyimler', coalesce((
            select jsonb_agg(jsonb_build_object(
                     'pozisyon',  btrim(e.position),
                     'kurum',     btrim(e.organization),
                     'baslangic', to_char(e.start_year, 'FM0000') || '-' || to_char(e.start_month, 'FM00'),
                     'bitis',     case when e.ongoing then null
                                       else to_char(e.end_year, 'FM0000') || '-' || to_char(e.end_month, 'FM00') end,
                     'devam',     e.ongoing,
                     'aciklama',  nullif(btrim(e.description), ''))
                   order by e.sort_order, e.created_at)
              from public.student_experiences e
             where e.student_id = ogrenci), '[]'::jsonb),
        /*
          CV (20261208010000) — işveren ekranındaki CV önizlemesi için,
          başvuru kopyasındaki `cv` alt nesnesiyle AYNI biçim
          (src/lib/basvuru-kopyasi.mjs `cvKopyasi`). Not ortalaması yok;
          telefon ve e-posta yok (onlar `basvuru_iletisimi`nden). Kapı
          yukarıdaki etkin paylaşım; öğrencinin "CV'de neler görünsün"
          tercihi `gizli`de ve ekran ona uyuyor.
        */
        'cv', jsonb_build_object(
          'surum',    1,
          'hakkimda', nullif(btrim(sp.bio), ''),
          'sehir',    nullif(btrim(sp.city), ''),
          'yetenekler', coalesce((
              select jsonb_agg(t.ad order by t.sira, t.n)
                from (
                  select btrim(s.name) as ad, 1 as sira,
                         row_number() over (order by s.created_at, s.name) as n
                    from public.student_skills s
                   where s.student_id = ogrenci and btrim(coalesce(s.name, '')) <> ''
                  union all
                  select btrim(x.ad), 2, x.n
                    from unnest(coalesce(sp.soft_skills, '{}'::text[])) with ordinality as x(ad, n)
                   where btrim(coalesce(x.ad, '')) <> ''
                     and not exists (select 1 from public.student_skills s2
                                      where s2.student_id = ogrenci
                                        and lower(btrim(s2.name)) = lower(btrim(x.ad)))
                ) t), '[]'::jsonb),
          'diller', coalesce((
              select jsonb_agg(jsonb_build_object('ad', btrim(d.language), 'seviye', nullif(btrim(d.level), ''))
                               order by d.language)
                from public.student_languages d
               where d.student_id = ogrenci and btrim(coalesce(d.language, '')) <> ''), '[]'::jsonb),
          'ilgiler', coalesce(to_jsonb(sp.interests), '[]'::jsonb),
          'deneyimler', coalesce((
              select jsonb_agg(jsonb_build_object(
                       'pozisyon',  btrim(e.position),
                       'kurum',     btrim(e.organization),
                       'baslangic', to_char(e.start_year, 'FM0000') || '-' || to_char(e.start_month, 'FM00'),
                       'bitis',     case when e.ongoing then null
                                         else to_char(e.end_year, 'FM0000') || '-' || to_char(e.end_month, 'FM00') end,
                       'devam',     e.ongoing,
                       'aciklama',  nullif(btrim(e.description), ''),
                       'tur',       e.employment_type)
                     order by e.ongoing desc,
                              coalesce(e.end_year, 9999) desc, coalesce(e.end_month, 12) desc,
                              e.start_year desc, e.start_month desc)
                from public.student_experiences e
               where e.student_id = ogrenci), '[]'::jsonb),
          'egitim', jsonb_build_object(
            'duzey',     sp.education_level,
            'baslangic', sp.education_start_year,
            'suruyor',   sp.education_ongoing,
            'mezuniyet', case when sp.education_ongoing is false then sp.graduation_year end),
          'ekEgitimler', coalesce((
              select jsonb_agg(jsonb_build_object(
                       'okul',      btrim(g.school),
                       'bolum',     nullif(btrim(g.department), ''),
                       'duzey',     g.level,
                       'baslangic', g.start_year,
                       'bitis',     case when g.ongoing then null else g.end_year end,
                       'suruyor',   g.ongoing)
                     order by g.sort_order, g.created_at)
                from public.student_educations g
               where g.student_id = ogrenci and btrim(coalesce(g.school, '')) <> ''), '[]'::jsonb),
          'projeler', coalesce((
              select jsonb_agg(jsonb_build_object(
                       'baslik',    btrim(p.title),
                       'aciklama',  nullif(btrim(p.description), ''),
                       'araclar',   coalesce(to_jsonb(p.tech_stack), '[]'::jsonb),
                       'adres',     coalesce(nullif(btrim(p.live_url), ''), nullif(btrim(p.github_url), '')),
                       'baslangic', p.start_year,
                       'bitis',     case when p.ongoing then null else p.end_year end,
                       'suruyor',   p.ongoing)
                     order by p.sort_order nulls last, p.created_at)
                from public.student_projects p
               where p.student_id = ogrenci and btrim(coalesce(p.title, '')) <> ''), '[]'::jsonb),
          'sertifikalar', coalesce((
              select jsonb_agg(jsonb_build_object(
                       'ad',    btrim(c.name),
                       'kurum', nullif(btrim(c.issuer), ''),
                       'yil',   c.issue_year,
                       'ay',    c.issue_month,
                       'adres', c.url)
                     order by c.sort_order, c.created_at)
                from public.student_certificates c
               where c.student_id = ogrenci and btrim(coalesce(c.name, '')) <> ''), '[]'::jsonb),
          'gizli', coalesce(to_jsonb(sp.cv_gizli), '[]'::jsonb)
        ),
        'guncellendi', sp.updated_at
      )
      from public.profiles pr
      left join public.student_profiles sp on sp.id = pr.id
      where pr.id = ogrenci
    )
  );
end;
$$;
