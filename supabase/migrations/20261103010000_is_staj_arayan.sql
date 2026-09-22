-- İŞ ARIYORUM / STAJ ARIYORUM
--
-- Öğrenci profilinde iki açık seçim. Aktif edildiğinde öğrenci,
-- DOĞRULANMIŞ şirketlerin gördüğü iki ayrı listeye giriyor.
--
-- NEDEN is_open_to_offers YETMİYOR
-- --------------------------------
-- O alan kayıtta VARSAYILAN olarak açık geliyor: ölçüldü, 22 öğrencinin
-- 22'si "teklife açık" görünüyor. Yani hiçbir şey anlatmıyor ve bir rıza
-- kanıtı da değil — kimse onu bilerek açmadı. Buradaki iki alan
-- VARSAYILAN KAPALI ve yalnız öğrenci kendisi açabiliyor.
--
-- Eski alan kaldırılmadı: başka yerlerde okunuyor ve sessizce anlamını
-- değiştirmek, ona güvenen kodu bozardı.
--
-- İKİ AYRI ALAN, TEK ALAN DEĞİL
-- -----------------------------
-- Bir öğrenci hem staj hem iş arıyor olabilir; tek bir "ne arıyor"
-- alanı bunu ifade edemezdi. Şirket tarafında da iki ayrı liste var.
--
-- RIZA DAMGALANIYOR
-- -----------------
-- Düğmenin kendisi rıza: öğrenci açtığında profilinin doğrulanmış
-- şirketlere görüneceğini bilerek açıyor ve arayüz bunu yazıyor. O rızanın
-- NE ZAMAN verildiği de saklanıyor. Damga tetikleyiciyle yazılıyor,
-- istemciden gelmiyor: istemciden gelen bir rıza tarihi kanıt olmaz.

alter table public.student_profiles
  add column if not exists is_arayan      boolean     not null default false,
  add column if not exists staj_arayan    boolean     not null default false,
  add column if not exists is_arayan_at   timestamptz,
  add column if not exists staj_arayan_at timestamptz;

comment on column public.student_profiles.is_arayan is
  'Öğrenci iş arıyor: doğrulanmış şirketlerin listesine açık rızayla girdi.';
comment on column public.student_profiles.staj_arayan is
  'Öğrenci staj arıyor: doğrulanmış şirketlerin listesine açık rızayla girdi.';
comment on column public.student_profiles.is_arayan_at is
  'Rızanın verildiği an. Tetikleyici yazıyor; istemciden gelen tarih kanıt değil.';

-- Listeler yalnız açık olanları tarıyor; kapalı satırlar dizine girmiyor.
create index if not exists student_profiles_is_arayan
  on public.student_profiles (is_arayan_at desc) where is_arayan;
create index if not exists student_profiles_staj_arayan
  on public.student_profiles (staj_arayan_at desc) where staj_arayan;

grant select (is_arayan, staj_arayan, is_arayan_at, staj_arayan_at)
  on public.student_profiles to anon, authenticated;
grant update (is_arayan, staj_arayan)
  on public.student_profiles to authenticated;


-- RIZA DAMGASI
--
-- Alan kapalıdan açığa geçtiğinde damga NOW() ile yazılıyor; açıktan
-- kapalıya geçtiğinde siliniyor. İstemci damgayı yazamıyor (UPDATE izni
-- yalnız iki boolean sütununda) — dolayısıyla "ne zaman rıza verdi"
-- sorusunun cevabı uydurulamıyor.

create or replace function public.arayan_damgasi()
returns trigger
language plpgsql
as $$
begin
  if new.is_arayan and not coalesce(old.is_arayan, false) then
    new.is_arayan_at := now();
  elsif not new.is_arayan then
    new.is_arayan_at := null;
  else
    new.is_arayan_at := old.is_arayan_at;
  end if;

  if new.staj_arayan and not coalesce(old.staj_arayan, false) then
    new.staj_arayan_at := now();
  elsif not new.staj_arayan then
    new.staj_arayan_at := null;
  else
    new.staj_arayan_at := old.staj_arayan_at;
  end if;

  return new;
end;
$$;

drop trigger if exists student_profiles_arayan_damgasi on public.student_profiles;
create trigger student_profiles_arayan_damgasi
  before insert or update on public.student_profiles
  for each row execute function public.arayan_damgasi();


-- DOĞRULANMIŞ ŞİRKET ARAYAN ÖĞRENCİLERİ GÖRÜR
--
-- Bugüne kadar bir şirket, bir öğrenciyi ancak o öğrenci kendi ilanına
-- BAŞVURDUYSA görebiliyordu. Bu politika o çizgiyi yalnız öğrencinin
-- kendi açtığı kapı kadar genişletiyor: liste dışındaki hiçbir profil
-- görünmüyor ve öğrenci düğmeyi kapattığı anda satır listeden düşüyor.
--
-- Doğrulanmış şirket şartı bilinçli: sahiplenme "yetkili olduğunu söyleyen
-- biri var" demek, doğrulama "biz kontrol ettik" demek. Öğrenci listesi
-- taramasını ikincisine bağlamak gerekiyor.

drop policy if exists "dogrulanmis sirket arayan ogrencileri gorur" on public.student_profiles;
create policy "dogrulanmis sirket arayan ogrencileri gorur"
  on public.student_profiles
  for select
  using (
    (is_arayan or staj_arayan)
    and exists (
      select 1 from public.company_members cm
      where cm.user_id = auth.uid()
        and public.sirket_dogrulandi(cm.company_id)
    )
  );


-- ARAYAN ÖĞRENCİ LİSTESİ
--
-- NEDEN RPC, NEDEN DÜZ RLS DEĞİL
-- ------------------------------
-- Öğrencinin ADI `profiles` tablosunda, e-postası `auth.users` içinde ve
-- ikisi de şirkete kapalı. Bunları açmak için `profiles` politikasını
-- genişletmek gerekirdi; o zaman şirket, arayan olmayan öğrencilerin
-- adını da okuyabilecek bir kapı açılırdı. Bunun yerine tek bir
-- fonksiyon, döndüreceği alanları TEK TEK sayıyor.
--
-- Böylece "şirket ne görüyor" sorusunun cevabı tek bir yerde ve
-- okunabilir: aşağıdaki jsonb_build_object'te ne varsa o.

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

  -- Yalnız DOĞRULANMIŞ şirketin üyesi. Sahiplenme yetmiyor: sahiplenme
  -- "yetkili olduğunu söyleyen biri var", doğrulama "biz kontrol ettik".
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
               -- Rızanın ne zaman verildiği ŞİRKETE de gösteriliyor:
               -- altı ay önce açılmış bir arayış, dün açılandan farklı.
               'acildi',    case when p_tur = 'is' then sp.is_arayan_at else sp.staj_arayan_at end
             ) order by case when p_tur = 'is' then sp.is_arayan_at else sp.staj_arayan_at end desc),
             '[]'::jsonb)
      from student_profiles sp
      left join profiles p on p.id = sp.id
      left join auth.users u on u.id = sp.id
      where case when p_tur = 'is' then sp.is_arayan else sp.staj_arayan end
    )
  ) into sonuc;

  return sonuc;
end;
$$;

revoke all on function public.arayan_ogrenciler(text) from public, anon;
grant execute on function public.arayan_ogrenciler(text) to authenticated;

comment on function public.arayan_ogrenciler(text) is
  'Is/staj arayan ogrenciler. Yalniz dogrulanmis sirket uyesi ve yonetici cagirabilir.';
