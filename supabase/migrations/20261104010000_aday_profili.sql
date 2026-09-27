-- ADAY KARTI VE ADAY PROFİLİ
--
-- İşverenin gördüğü liste bir veri kaydı gibi duruyordu: ad, okul, birkaç
-- etiket ve bir e-posta düğmesi. Aday profilini inceleyecek bir yer yoktu.
--
-- RIZA ÖNCE GENİŞLETİLDİ, SONRA ALAN EKLENDİ
-- ------------------------------------------
-- Öğrencinin anahtarındaki metin neyin paylaşılacağını tek tek sayıyor.
-- Bu göç listeye yeni alanlar (fotoğraf, hakkında, beceriler, projeler,
-- portföy) ekliyor; aynı değişiklikte o metin de genişletildi
-- (src/components/ArayisKartlari.tsx). Metni güncellemeden alan eklemek,
-- öğrenciye söylenmemiş veriyi paylaşmak olurdu.
--
-- FOTOĞRAF AYRI ALAN DEĞİL
-- ------------------------
-- Sitenin her yerinde kullanılan ortak kaynak okunuyor:
-- `social_profiles.avatar_path`. Aday listesi için ikinci bir avatar
-- alanı açmak, öğrenci fotoğrafını değiştirdiğinde listenin eski
-- fotoğrafta kalması demekti.

create or replace function public.arayan_ogrenciler(p_tur text default 'staj')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  dogrulanmis boolean;
begin
  if p_tur not in ('is', 'staj') then
    raise exception 'gecersiz tur: %', p_tur using errcode = 'check_violation';
  end if;

  select exists (
    select 1 from company_members cm
    where cm.user_id = auth.uid() and sirket_dogrulandi(cm.company_id)
  ) into dogrulanmis;

  if not dogrulanmis and not public.is_admin() then
    raise exception 'bu liste yalnizca dogrulanmis sirketlere acik'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'tur', p_tur,
    'isArayan',   (select count(*) from student_profiles where is_arayan),
    'stajArayan', (select count(*) from student_profiles where staj_arayan),
    'ogrenciler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',        sp.id,
               'ad',        p.full_name,
               'eposta',    u.email,
               -- Ortak avatar kaynağı; listeye özel bir alan YOK.
               'avatarYolu', s.avatar_path,
               'kullaniciAdi', s.username,
               'okul',      sp.university,
               'fakulte',   sp.faculty,
               'bolum',     sp.department,
               'sinif',     sp.grade_level,
               'sehir',     sp.city,
               'mezuniyet', sp.graduation_year,
               'beceriler', sp.soft_skills,
               'hedefRoller', sp.target_roles,
               'cvVar',     (sp.cv_path is not null),
               'tanitim',   sp.bio,
               'linkedin',  sp.linkedin_url,
               'github',    sp.github_username,
               'portfolyo', sp.portfolio_url,
               'acildi',    case when p_tur = 'is' then sp.is_arayan_at else sp.staj_arayan_at end
             ) order by case when p_tur = 'is' then sp.is_arayan_at else sp.staj_arayan_at end desc),
             '[]'::jsonb)
      from student_profiles sp
      left join profiles p on p.id = sp.id
      left join auth.users u on u.id = sp.id
      left join social_profiles s on s.profile_id = sp.id
      where case when p_tur = 'is' then sp.is_arayan else sp.staj_arayan end
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.arayan_ogrenciler(text) from public, anon;
grant execute on function public.arayan_ogrenciler(text) to authenticated;


-- ADAY PROFİLİ — TEK ÖĞRENCİ
--
-- Kartın "Profili incele" düğmesi buraya geliyor. Liste sorgusuyla aynı
-- kapı: yalnız DOĞRULANMIŞ şirket üyesi ve yönetici.
--
-- ARAYIŞI KAPALI ÖĞRENCİ DÖNMÜYOR
-- -------------------------------
-- Kimliği bilen bir şirket, öğrenci anahtarı kapattıktan sonra da
-- profili açabilmemeli. Listeden düşen öğrencinin profili de düşüyor;
-- rıza tek yerden okunuyor.
--
-- DÖNEN ALANLAR TEK TEK SAYILIYOR
-- -------------------------------
-- `select *` değil: öğrencinin paylaşmayı kabul ettiği alanlar burada
-- yazılı ve başka bir sütun eklendiğinde kendiliğinden sızmıyor.
-- Telefon, GPA, CV yolu, tercih alanları ve sigorta notu KASITLI olarak
-- dışarıda — anahtarın metni bunları saymıyor.

create or replace function public.aday_profili(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sonuc jsonb;
  dogrulanmis boolean;
begin
  select exists (
    select 1 from company_members cm
    where cm.user_id = auth.uid() and sirket_dogrulandi(cm.company_id)
  ) into dogrulanmis;

  if not dogrulanmis and not public.is_admin() then
    raise exception 'aday profili yalnizca dogrulanmis sirketlere acik'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id',         sp.id,
    'ad',         p.full_name,
    'eposta',     u.email,
    'avatarYolu', s.avatar_path,
    'okul',       sp.university,
    'fakulte',    sp.faculty,
    'bolum',      sp.department,
    'sinif',      sp.grade_level,
    'sehir',      sp.city,
    'mezuniyet',  sp.graduation_year,
    'tanitim',    sp.bio,
    'hedefRoller', sp.target_roles,
    'beceriler',  sp.soft_skills,
    'linkedin',   sp.linkedin_url,
    'github',     sp.github_username,
    'portfolyo',  sp.portfolio_url,
    'cvVar',      (sp.cv_path is not null),
    'isArayan',   sp.is_arayan,
    'stajArayan', sp.staj_arayan,
    'isAcildi',   sp.is_arayan_at,
    'stajAcildi', sp.staj_arayan_at,

    -- Beceriler iki kaynakta: serbest metin dizisi (soft_skills) ve
    -- kayıtlı beceri satırları. İkisi de öğrencinin kendi girdiği veri;
    -- ayrı listelerde gösteriliyor ki "doğrulanmış" gibi okunmasın.
    'yetkinlikler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'ad', k.name, 'seviye', k.level::text, 'yil', k.years_of_exp
             ) order by k.name), '[]'::jsonb)
      from student_skills k where k.student_id = sp.id
    ),

    'projeler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'baslik', pr.title,
               'aciklama', pr.description,
               'teknoloji', pr.tech_stack,
               'github', pr.github_url,
               'adres', pr.live_url
             ) order by pr.sort_order, pr.created_at), '[]'::jsonb)
      from student_projects pr where pr.student_id = sp.id
    )
  ) into sonuc
  from student_profiles sp
  left join profiles p on p.id = sp.id
  left join auth.users u on u.id = sp.id
  left join social_profiles s on s.profile_id = sp.id
  where sp.id = p_id
    -- Arayışı kapalı öğrencinin profili açılmıyor.
    and (sp.is_arayan or sp.staj_arayan);

  return sonuc;
end;
$$;

revoke all on function public.aday_profili(uuid) from public, anon;
grant execute on function public.aday_profili(uuid) to authenticated;

comment on function public.aday_profili(uuid) is
  'Tek aday profili. Yalniz dogrulanmis sirket uyesi ve yonetici; arayisi kapali ogrenci donmuyor.';
