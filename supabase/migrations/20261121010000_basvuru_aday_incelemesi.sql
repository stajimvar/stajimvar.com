-- =====================================================================
-- BAŞVURU İLİŞKİSİYLE SINIRLI ADAY İNCELEMESİ
-- =====================================================================
--
-- NE ÖLÇÜLDÜ (4 Ekim 2026)
-- ------------------------
-- · Başvuru rızası (ApplyDialog) "profilimin ve iletişim bilgilerimin"
--   paylaşılmasını kapsıyor; PAYLAŞIMLARI ve görselleri saymıyor.
-- · Öğrenci paylaşımlarının kitlesi 'baglantilarim' ya da
--   'alan-toplulugum'; şirket hesabı bunları bugün GÖREMİYOR
--   (`sosyal_gizli.paylasim_gorunur`).
-- · Şirketin güncel profil okuması tabloya göre dağınık: student_profiles
--   ve student_projects/student_skills başvuran için açık, dil kayıtları
--   ve ad (profiles) kapalı.
--
-- BU GÖÇ NE YAPIYOR
-- -----------------
-- 1) Öğrenciye AYRI ve İSTEĞE BAĞLI bir paylaşım izni: başvuru başına
--    `applications.paylasim_izni_at`. Yalnız öğrenci, yalnız RPC ile
--    verip geri alabiliyor. ESKİ BAŞVURULAR İZİNSİZ (null) — geriye dönük
--    onay varsayılmıyor.
-- 2) `basvuru_aday_guncel_profili(basvuru)`: başvuru rızasının kapsadığı
--    alanların GÜNCEL hâli — başvuru anı kopyasıyla karşılaştırmak için.
--    Yalnız o başvurunun ilanının sahibi DOĞRULANMIŞ şirketin üyesine,
--    yalnız rıza varsa.
-- 3) `basvuru_aday_paylasimlari(basvuru)`: öğrencinin izin verdiği
--    başvuruda, YAYINDAKİ sosyal profilinin hazır ve arşivlenmemiş
--    paylaşımları. Gizli profil / arşivlenmiş paylaşım açılmıyor.
-- 4) Görseller için dar bir depolama izni: `sosyal-paylasim` kovasında,
--    yalnız (3)'teki koşulu sağlayan paylaşımın dosyası.
--
-- NE YAPMIYOR
-- -----------
-- · `posts` / `post_media` / `social_profiles` politikalarına dokunmuyor:
--   paylaşımlar şirketin akışına, beğeni ya da yorum yüzeyine açılmıyor.
-- · Öğrenci profillerini şirketlere genel olarak açmıyor.
-- · Mevcut student_profiles okuma kuralını (başvuranın satırı, kolon
--   kısıtı yok) DEĞİŞTİRMİYOR; ayrıca ele alınmalı (rapora yazıldı).

/* ================================================================== */
/*  1) PAYLAŞIM İZNİ                                                   */
/* ================================================================== */

alter table public.applications
  add column if not exists paylasim_izni_at timestamptz;

comment on column public.applications.paylasim_izni_at is
  'Öğrencinin, bu başvurunun şirketine sosyal profil paylaşımlarını ve '
  'görsellerini gösterme izni (isteğe bağlı, geri alınabilir). null = izin '
  'yok. Yalnız basvuru_paylasim_izni() yazıyor; eski başvurular null.';

/*
  `applications` tablo düzeyinde UPDATE yetkisi taşıyor (şirket durum,
  öğrenci yanıt yazıyor); tek kolonu geri almak tablo yetkisi varken işe
  yaramıyor. Bu yüzden kolon bir tetikleyiciyle korunuyor: değer yalnız
  RPC'nin işlem içi işaretiyle değişebiliyor. Şirket kendi adına izin
  "veremiyor", öğrenci de INSERT ile geriye tarihli izin yazamıyor.
*/
create or replace function public.basvuru_paylasim_izni_korumasi()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('stajimvar.paylasim_izni_rpc', true), '') = 'evet' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.paylasim_izni_at := null;
  elsif new.paylasim_izni_at is distinct from old.paylasim_izni_at then
    raise exception 'Paylasim izni yalnizca ogrenci tarafindan verilir'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists applications_paylasim_izni_korumasi on public.applications;
create trigger applications_paylasim_izni_korumasi
  before insert or update on public.applications
  for each row execute function public.basvuru_paylasim_izni_korumasi();

create or replace function public.basvuru_paylasim_izni(p_basvuru uuid, p_acik boolean)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sonuc timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli' using errcode = '42501';
  end if;
  perform set_config('stajimvar.paylasim_izni_rpc', 'evet', true);
  update public.applications
     set paylasim_izni_at = case when p_acik then now() else null end
   where id = p_basvuru
     and student_id = auth.uid()
     /* Şirkete iletilen tek yol; dış başvuruda şirket paneli yok. */
     and application_method = 'internal'
  returning paylasim_izni_at into sonuc;
  /* FOUND hemen burada okunuyor: sonraki `perform` onu değiştirir. */
  if not found then
    raise exception 'Basvuru bulunamadi' using errcode = 'no_data_found';
  end if;
  perform set_config('stajimvar.paylasim_izni_rpc', '', true);
  return sonuc;
end;
$$;

grant select (paylasim_izni_at) on public.applications to authenticated;

/* ================================================================== */
/*  2) YETKİ YARDIMCILARI                                              */
/* ================================================================== */

/* Oturumdaki kişi bu başvurunun ilanının sahibi DOĞRULANMIŞ şirketin üyesi mi? */
create or replace function sosyal_gizli.basvuru_sirketi_mi(p_basvuru uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
      from public.applications a
      join public.listings l on l.id = a.listing_id
     where a.id = p_basvuru
       and public.is_company_member(l.company_id)
       and public.sirket_dogrulandi(l.company_id)
  )
$$;

/*
  Bu paylaşım, oturumdaki şirket üyesine BAŞVURU İZNİYLE görünür mü?

  Koşulların hepsi: paylaşım hazır ve arşivlenmemiş; öğrencinin kendi
  kitlelerinden biri (resmi/şirket sayfası paylaşımı değil); yazarın
  sosyal profili YAYINDA; aralarında engel yok; yazar bu şirketin bir
  ilanına StajımVar üzerinden başvurmuş ve O başvuruda paylaşım izni
  vermiş; şirket doğrulanmış.
*/
create or replace function sosyal_gizli.basvuru_paylasimi_gorunur(hedef_post uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
      from public.posts p
      join public.social_profiles sp on sp.profile_id = p.author_id and sp.yayinda_mi
      join public.applications a on a.student_id = p.author_id
                                and a.paylasim_izni_at is not null
                                and a.application_method = 'internal'
      join public.listings l on l.id = a.listing_id
     where p.id = hedef_post
       and p.archived_at is null
       and p.durum = 'hazir'
       and p.kitle in ('baglantilarim', 'alan-toplulugum')
       and public.is_company_member(l.company_id)
       and public.sirket_dogrulandi(l.company_id)
       and not sosyal_gizli.engelli_mi(p.author_id)
  )
$$;

create or replace function sosyal_gizli.basvuru_paylasim_dosyasi_gorunur(nesne_adi text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  parcalar text[] := string_to_array(coalesce(nesne_adi, ''), '/');
  post_kimligi uuid;
begin
  /* `sosyal_gizli.paylasim_dosyasi_gorunur` ile aynı yol biçimi: sahip/paylaşım/dosya */
  if array_length(parcalar, 1) is distinct from 3 then
    return false;
  end if;
  begin
    post_kimligi := parcalar[2]::uuid;
  exception when others then
    return false;
  end;
  return sosyal_gizli.basvuru_paylasimi_gorunur(post_kimligi);
end;
$$;

revoke all on function sosyal_gizli.basvuru_sirketi_mi(uuid) from public, anon;
revoke all on function sosyal_gizli.basvuru_paylasimi_gorunur(uuid) from public, anon;
revoke all on function sosyal_gizli.basvuru_paylasim_dosyasi_gorunur(text) from public, anon;
/* Depolama politikası oturumdaki kullanıcı adına çağırıyor. */
grant execute on function sosyal_gizli.basvuru_sirketi_mi(uuid) to authenticated;
grant execute on function sosyal_gizli.basvuru_paylasimi_gorunur(uuid) to authenticated;
grant execute on function sosyal_gizli.basvuru_paylasim_dosyasi_gorunur(text) to authenticated;

/* Görsel dosyası: yalnız yukarıdaki koşul. Mevcut kitle politikası aynen. */
drop policy if exists "basvuru izniyle paylasim dosyasi okunur" on storage.objects;
create policy "basvuru izniyle paylasim dosyasi okunur" on storage.objects
  for select to authenticated
  using (bucket_id = 'sosyal-paylasim' and sosyal_gizli.basvuru_paylasim_dosyasi_gorunur(name));

/* ================================================================== */
/*  3) GÜNCEL PROFİL (başvuru rızasının kapsadığı alanlar)              */
/* ================================================================== */
--
-- Alan kümesi başvuru kopyasıyla (src/lib/basvuru-kopyasi.mjs) BİREBİR
-- aynı: ad, fotoğraf, okul, bölüm, sınıf, şehir, github, portfolyo,
-- linkedin, yetenekler, diller, rozetler, projeler. Telefon, e-posta,
-- not ortalaması, tercihler YOK. Rıza yoksa hiçbir alan dönmüyor.

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

  if riza is null then
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
        'guncellendi', sp.updated_at
      )
      from public.profiles pr
      left join public.student_profiles sp on sp.id = pr.id
      where pr.id = ogrenci
    )
  );
end;
$$;

/* ================================================================== */
/*  4) PAYLAŞIMLAR (öğrencinin izniyle)                                */
/* ================================================================== */

create or replace function public.basvuru_aday_paylasimlari(p_basvuru uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ogrenci uuid;
  izin    timestamptz;
  yontem  text;
  yayinda boolean;
begin
  if not sosyal_gizli.basvuru_sirketi_mi(p_basvuru) then
    raise exception 'Bu basvuruyu goremezsin' using errcode = '42501';
  end if;

  select a.student_id, a.paylasim_izni_at, a.application_method::text
    into ogrenci, izin, yontem
    from public.applications a where a.id = p_basvuru;

  if izin is null or yontem <> 'internal' then
    return jsonb_build_object('izin', false, 'paylasimlar', '[]'::jsonb);
  end if;

  select coalesce(sp.yayinda_mi, false) into yayinda
    from public.social_profiles sp where sp.profile_id = ogrenci;

  /* Gizli (yayında olmayan) sosyal profil açılmıyor. */
  if not coalesce(yayinda, false) or sosyal_gizli.engelli_mi(ogrenci) then
    return jsonb_build_object('izin', true, 'izinTarihi', izin, 'profilGorunur', false,
                              'paylasimlar', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'izin', true,
    'izinTarihi', izin,
    'profilGorunur', true,
    'kullaniciAdi', (select sp.username from public.social_profiles sp where sp.profile_id = ogrenci),
    'paylasimlar', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',       p.id,
               'aciklama', p.aciklama,
               'tarih',    p.created_at,
               'medya',    coalesce((
                  select jsonb_agg(jsonb_build_object(
                           'yol', m.storage_path, 'genislik', m.genislik,
                           'yukseklik', m.yukseklik, 'alt', m.alt) order by m.sira)
                    from public.post_media m where m.post_id = p.id), '[]'::jsonb)
             ) order by p.created_at desc)
        from (
          select * from public.posts p
           where p.author_id = ogrenci
             and p.archived_at is null
             and p.durum = 'hazir'
             and p.kitle in ('baglantilarim', 'alan-toplulugum')
           order by p.created_at desc
           limit 60
        ) p
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.basvuru_paylasim_izni_korumasi() from public, anon, authenticated;
revoke all on function public.basvuru_paylasim_izni(uuid, boolean) from public, anon;
revoke all on function public.basvuru_aday_guncel_profili(uuid) from public, anon;
revoke all on function public.basvuru_aday_paylasimlari(uuid) from public, anon;
grant execute on function public.basvuru_paylasim_izni(uuid, boolean) to authenticated;
grant execute on function public.basvuru_aday_guncel_profili(uuid) to authenticated;
grant execute on function public.basvuru_aday_paylasimlari(uuid) to authenticated;

/* ================================================================== */
/*  5) GENİŞ PROFİL ERİŞİMİ KAPANIYOR                                  */
/* ================================================================== */
--
-- ÖLÇÜLDÜ (4 Ekim 2026): doğrulanmış şirket, kendisine başvuran
-- öğrencinin `student_profiles` satırını SÜTUN KISITI OLMADAN okuyordu
-- ("dogrulanmis sirket basvuranin profilini gorur"; authenticated'ın
-- sütun yetkisi gpa, pref_min_stipend, pref_* tercihleri, is_arayan
-- damgaları dahil). Aynı biçimde projeler ve yetenekler. Ayrıca
-- "dogrulanmis sirket arayan ogrencileri gorur" arayışı açık HER
-- öğrencinin bütün satırını HER doğrulanmış şirkete açıyordu. Başvuru
-- rızası ("profilim ve iletişim bilgilerim") ve arayış anahtarının rıza
-- metni bu alanları saymıyor.
--
-- Bu dört politika kaldırılıyor. Şirketin öğrenci verisine erişimi
-- artık yalnız alanları tek tek sayan security definer işlevlerden:
--   · başvuru:  `profile_snapshot` (başvuru anı kopyası, rıza ile),
--               basvuru_aday_guncel_profili, basvuru_aday_yetenekleri,
--               basvuru_aday_paylasimlari, basvuru_iletisimi
--   · arayış:   arayan_ogrenciler, aday_profili, staj_arayan_ogrenci_ozeti
-- Bunların hepsi SECURITY DEFINER (ölçüldü); politikalara dayanmıyor,
-- kaldırılmalarından etkilenmiyor. Tarayıcıda şirket adına bu tablolara
-- doğrudan giden tek yol `adayYetenekleri`ydi; `basvuru_aday_yetenekleri`
-- ile değişti. Öğrencinin kendi satırları ("ogrenci kendi profili",
-- "kendi projeleri", "kendi becerileri") ve yönetici politikası aynen.

drop policy if exists "dogrulanmis sirket basvuranin profilini gorur" on public.student_profiles;
drop policy if exists "dogrulanmis sirket arayan ogrencileri gorur" on public.student_profiles;
drop policy if exists "dogrulanmis sirket basvuranin projelerini gorur" on public.student_projects;
drop policy if exists "dogrulanmis sirket basvuranin becerilerini gorur" on public.student_skills;

/*
  Kart için yetenek listesi — başvuru kopyası yetenek taşımıyorsa (eski
  başvurular). Yalnız ilanın sahibi doğrulanmış şirkete ve yalnız rıza
  varsa; rıza yoksa boş dizi (kart zaten kimliksiz).
*/
create or replace function public.basvuru_aday_yetenekleri(p_basvuru uuid)
returns text[]
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
  if riza is null then
    return '{}'::text[];
  end if;
  return coalesce((
    select array_agg(s.name order by s.name)
      from public.student_skills s
     where s.student_id = ogrenci and btrim(coalesce(s.name, '')) <> ''), '{}'::text[]);
end;
$$;

revoke all on function public.basvuru_aday_yetenekleri(uuid) from public, anon;
grant execute on function public.basvuru_aday_yetenekleri(uuid) to authenticated;
