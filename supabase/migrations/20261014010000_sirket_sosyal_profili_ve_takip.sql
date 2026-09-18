-- ŞİRKET SOSYAL PROFİLİ VE TAKİP
--
-- KARAR (kullanıcı, 18 Eylül 2026): ayrı işveren paneli kalkıyor; şirket
-- hesabı öğrenciyle aynı kabuğu, aynı profili kullanıyor. "Şirketlerin de
-- paylaşım yaptığı bir profili olsun, ağları olsun." Ağ modeli TAKİP:
-- öğrenci şirketi takip eder, şirket şirketi takip eder; karşılıklı onay
-- yok, tersi (şirket → öğrenci) yok.
--
-- ÖLÇÜLEN DURUM
-- Sosyal katman öğrenciye göre yazılmış: `sosyal_profil_rolu()` yalnız
-- student/admin; `sosyal_profil_ac()` bölümü student_profiles'tan
-- türetiyor; yayın için `sector_id` şart; görünürlük "aynı sektör"
-- (`aktif_sektor()`) ile sınırlı. Şirket rolü (`profiles.role='company'`)
-- bu katmana hiç giremiyor — 18 Eylül'de şirket hesabına çevrilen
-- ogulsize@gmail.com'un sosyal profili silinmek zorunda kaldı.
--
-- MEKANİZMA: RESMÎ HESABIN GENELLENMİŞİ
-- 20260928010000_resmi_hesap.sql tek bir hesap için şunu kurdu: bayrak +
-- sektörden bağımsız görünürlük + kendi kitlesi ('resmi'). Şirket
-- sayfası aynı üç parçayı ister; fark, bayrağın yönetici eliyle değil
-- ŞİRKET ÜYELİĞİNDEN gelmesi. Bu yüzden bayrak değil `sirket_id` var:
-- satırın hangi şirketin sayfası olduğu veriden okunuyor, kimse kendini
-- şirket ilan edemiyor (tetikleyici üyeliği soruyor).
--
-- NEDEN AYRI TABLO DEĞİL
-- Şirket sayfası için ikinci bir "company_pages" tablosu, paylaşım,
-- beğeni, görsel, bildirim ve engelleme politikalarının hepsini iki kez
-- yazdırırdı. `social_profiles` satırı + `sirket_id` ile mevcut her
-- politika (kendi satırını yönetir, arşiv, engel, beğeni) aynen çalışıyor;
-- yalnız GÖRÜNÜRLÜK ve YAYIN ŞARTI şirket için genişliyor.
--
-- TEK KULLANICI = TEK ŞİRKET
-- "Şirket hesabı şirket hesabında kalır" kararı gereği satırın anahtarı
-- yine `profile_id` (şirket kullanıcısının kendisi). Aynı şirkete ikinci
-- bir Owner eklenirse ikinci bir sayfa açılmaması için `sirket_id`
-- üzerinde kısmi tekil indeks var: bir şirketin TEK sayfası olur.

-- ---------------------------------------------------------------- 1. rol
create or replace function sosyal_gizli.sosyal_profil_rolu(rol text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select rol in ('student', 'admin', 'company')
$$;

-- ---------------------------------------------------------- 2. sirket_id
alter table public.social_profiles
  add column if not exists sirket_id uuid references public.companies(id) on delete cascade;

comment on column public.social_profiles.sirket_id is
  'Dolu ise bu satır o şirketin sayfasıdır: sektörden bağımsız herkese görünür, '
  'paylaşımları ''sirket'' kitlesiyle çıkar, takip edilebilir. Yalnız o şirketin '
  'Owner üyesi yazabilir (sirket_sayfasi_kilidi). Öğrencide NULL.';

create unique index if not exists social_profiles_sirket_tek
  on public.social_profiles (sirket_id) where sirket_id is not null;

/*
  YAYIN ŞARTI: ŞİRKETTE SEKTÖR YERİNE ŞİRKET
  Öğrenci sayfası sektör olmadan yayımlanamıyor (aynı-sektör görünürlüğü
  ona bağlı). Şirket sayfasının görünürlüğü sektöre bağlı değil; kimlik
  şartı kullanıcı adı + şirket.
*/
alter table public.social_profiles drop constraint if exists yayin_icin_kimlik_sart;
alter table public.social_profiles
  add constraint yayin_icin_kimlik_sart
    check (
      not yayinda_mi
      or (username is not null and (sector_id is not null or sirket_id is not null))
    );

/*
  KİMSE KENDİNİ ŞİRKET İLAN EDEMEZ
  `kendi sosyal profilini yonetir` satırın tamamını yazdırıyor; kolon
  bazlı RLS yok. Kapı tetikleyicide: sirket_id ancak o şirketin Owner
  üyesi tarafından ve yalnız kendi satırına yazılabilir. Yönetici serbest
  (geçiş ve düzeltme için).
*/
create or replace function sosyal_gizli.sirket_sayfasi_kilidi()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sirket_id is distinct from (case when tg_op = 'UPDATE' then old.sirket_id else null end)
     and new.sirket_id is not null
     and not public.is_admin()
     and not exists (
       select 1 from public.company_members cm
        where cm.company_id = new.sirket_id
          and cm.user_id = new.profile_id
          and cm.is_owner
     ) then
    raise exception 'Şirket sayfasını yalnız o şirketin sahibi açabilir.'
      using errcode = '42501', detail = 'sirket-sahibi-degil';
  end if;
  return new;
end;
$$;

drop trigger if exists sirket_sayfasi_kilidi_tg on public.social_profiles;
create trigger sirket_sayfasi_kilidi_tg
  before insert or update of sirket_id on public.social_profiles
  for each row execute function sosyal_gizli.sirket_sayfasi_kilidi();

-- ------------------------------------------------ 3. görünürlük (profil)
/*
  Şirket sayfası herkese açık: giriş yapmış her kullanıcı görür, sektör
  sorulmaz. Engel kuralı korunuyor — engellediğin şirket sana görünmez.
*/
drop policy if exists "sirket sayfasi okunur" on public.social_profiles;
create policy "sirket sayfasi okunur" on public.social_profiles
  for select to authenticated
  using (
    sirket_id is not null
    and yayinda_mi
    and not sosyal_gizli.engelli_mi(profile_id)
  );

-- -------------------------------------------------- 4. kitle: 'sirket'
alter table public.posts drop constraint if exists posts_kitle_gecerli;
alter table public.posts
  add constraint posts_kitle_gecerli
    check (kitle in ('baglantilarim', 'alan-toplulugum', 'resmi', 'sirket'));

comment on column public.posts.kitle is
  'baglantilarim = karşılıklı bağlantı kuranlar; alan-toplulugum = aynı alan '
  'topluluğunun üyeleri; resmi = giriş yapmış herkes (yalnız resmî hesap); '
  'sirket = giriş yapmış herkes (yalnız şirket sayfası yazabilir).';

create or replace function sosyal_gizli.paylasim_kitlesi_kilidi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kitle = 'alan-toplulugum'
     and not exists (
       select 1 from public.community_members cm
        where cm.profile_id = new.author_id
     ) then
    raise exception 'Alan topluluğuna katılmadan bu kitleyle paylaşamazsın.'
      using errcode = '42501', detail = 'topluluk-uyeligi-yok';
  end if;
  if new.kitle = 'resmi'
     and not exists (
       select 1 from public.social_profiles sp
        where sp.profile_id = new.author_id
          and sp.resmi_mi
     ) then
    raise exception 'Resmî kitleyle yalnız StajımVar resmî hesabı paylaşabilir.'
      using errcode = '42501', detail = 'resmi-hesap-degil';
  end if;
  /*
    ŞİRKET KİTLESİNİ YALNIZ ŞİRKET SAYFASI KULLANABİLİR — ve şirket
    sayfası BAŞKA kitle kullanamaz: şirketin "bağlantılarım"ı yok,
    alan topluluğu yok. Kitle istemciden geliyor; iki yön de kapalı.
  */
  if new.kitle = 'sirket'
     and not exists (
       select 1 from public.social_profiles sp
        where sp.profile_id = new.author_id
          and sp.sirket_id is not null
     ) then
    raise exception 'Şirket kitlesiyle yalnız şirket sayfası paylaşabilir.'
      using errcode = '42501', detail = 'sirket-sayfasi-degil';
  end if;
  if new.kitle <> 'sirket'
     and exists (
       select 1 from public.social_profiles sp
        where sp.profile_id = new.author_id
          and sp.sirket_id is not null
     ) then
    raise exception 'Şirket sayfası yalnız şirket kitlesiyle paylaşır.'
      using errcode = '42501', detail = 'sirket-kitlesi-sart';
  end if;
  return new;
end;
$$;

-- -------------------------------------------- 5. görünürlük (paylaşım)
/*
  paylasim_gorunur() 20260928010000'daki gövde + tek dal: 'sirket'
  kitlesi giriş yapmış herkese açık, yazar engellenmemişse. Fonksiyonun
  tamamı yeniden yazılıyor çünkü CREATE OR REPLACE gövdeyi bütün olarak
  alıyor; öteki dallar birebir korunuyor.
*/
create or replace function sosyal_gizli.paylasim_gorunur(hedef_post uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.posts p
    where p.id = hedef_post
      and p.archived_at is null
      and (
        p.author_id = auth.uid()
        or (
          p.durum = 'hazir'
          and (
            (
              p.kitle = 'resmi'
              and auth.uid() is not null
              and exists (
                select 1 from public.social_profiles sp
                 where sp.profile_id = p.author_id
                   and sp.resmi_mi
              )
            )
            or (
              p.kitle = 'sirket'
              and auth.uid() is not null
              and exists (
                select 1 from public.social_profiles sp
                 where sp.profile_id = p.author_id
                   and sp.sirket_id is not null
                   and sp.yayinda_mi
              )
              and not sosyal_gizli.engelli_mi(p.author_id)
            )
            or (
              sosyal_gizli.sosyal_gorunur(p.author_id)
              and (
                (p.kitle = 'baglantilarim'   and sosyal_gizli.baglanti_var(p.author_id))
                or (p.kitle = 'alan-toplulugum' and sosyal_gizli.ayni_toplulukta(auth.uid(), p.author_id))
              )
            )
          )
        )
      )
  )
$$;

-- --------------------------------------------------------- 6. takip
/*
  TAKİP: TEK YÖNLÜ, ONAYSIZ, YALNIZ ŞİRKETE
  `connections` karşılıklı ve onaya bağlı; şirket için o model yorucu ve
  yanlış (bir sayfayı "takip edersin", sayfa seni onaylamaz). Ayrı tablo,
  ayrı sayaç. Hedef yalnız yayında bir şirket sayfası olabilir; takipçi
  öğrenci ya da şirket. Şirketin öğrenciyi takip etmesi YOK (karar).
*/
create table if not exists public.takipler (
  takipci_id uuid not null references public.profiles(id) on delete cascade,
  hedef_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (takipci_id, hedef_id),
  constraint kendini_takip_yok check (takipci_id <> hedef_id)
);

create index if not exists takipler_hedef_idx on public.takipler (hedef_id);

comment on table public.takipler is
  'Tek yönlü takip. hedef_id her zaman bir şirket sayfası (social_profiles.sirket_id dolu); '
  'takipçi öğrenci ya da şirket. Karşılıklı onay yok; connections ile karıştırılmamalı.';

/* Hedef gerçekten yayında bir şirket sayfası mı? Politika ve tetikleyici aynı soruyu soruyor. */
create or replace function sosyal_gizli.takip_edilebilir(hedef uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.social_profiles sp
     where sp.profile_id = hedef
       and sp.sirket_id is not null
       and sp.yayinda_mi
  )
$$;

alter table public.takipler enable row level security;

drop policy if exists "takipci kendi takibini acar" on public.takipler;
create policy "takipci kendi takibini acar" on public.takipler
  for insert to authenticated
  with check (
    takipci_id = auth.uid()
    and sosyal_gizli.takip_edilebilir(hedef_id)
    and not sosyal_gizli.engelli_mi(hedef_id)
  );

drop policy if exists "takipci kendi takibini kaldirir" on public.takipler;
create policy "takipci kendi takibini kaldirir" on public.takipler
  for delete to authenticated
  using (takipci_id = auth.uid());

/*
  OKUMA: kendi takiplerin + takip ettiğin/ettirdiğin şirket sayfasının
  listesi. Şirket kendi takipçilerini görür (Ağım'da "seni takip edenler").
  Öğrenci başka öğrencinin kimleri takip ettiğini görmez.
*/
drop policy if exists "takipler taraflarca okunur" on public.takipler;
create policy "takipler taraflarca okunur" on public.takipler
  for select to authenticated
  using (takipci_id = auth.uid() or hedef_id = auth.uid());

/* Sayaç herkese açık (sayfa "N takipçi" yazar) ama satırlar değil. */
create or replace function public.takipci_sayisi(hedef uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.takipler t where t.hedef_id = hedef
$$;

revoke all on function public.takipci_sayisi(uuid) from public;
grant execute on function public.takipci_sayisi(uuid) to authenticated;

create or replace function public.takip_ediyor_muyum(hedef uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.takipler t
     where t.takipci_id = auth.uid() and t.hedef_id = hedef
  )
$$;

revoke all on function public.takip_ediyor_muyum(uuid) from public;
grant execute on function public.takip_ediyor_muyum(uuid) to authenticated;

-- ----------------------------------------- 7. şirket sayfasını açmak
/*
  sosyal_profil_ac() şirket rolünde ŞİRKETTEN türetiyor: ad ve görünen ad
  şirket adı, kullanıcı adı şirket slug'ı (boşsa üretilen), sektör YOK,
  sirket_id sahibi olduğu şirket. Öğrenci dalı 20260926050000 ile birebir.
  Şirket üyeliği yoksa (sahiplenmemiş şirket hesabı) satır AÇILMIYOR:
  bağlanacak sayfa yok, sonradan sahiplenince tetiklenir.
*/
create or replace function sosyal_gizli.sosyal_profil_ac(kim uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  rol      text;
  tam_ad   text;
  bolum    uuid;
  alan     uuid;
  aday     text;
  mevcut   public.social_profiles;
  deneme   int;
  sirket   public.companies;
begin
  if kim is null then
    return false;
  end if;

  select p.role::text, p.full_name into rol, tam_ad from public.profiles p where p.id = kim;
  if not found then
    return false;
  end if;

  select * into mevcut from public.social_profiles where profile_id = kim;

  /* ---------------------------------------------------- şirket dalı */
  if rol = 'company' then
    select c.* into sirket
      from public.company_members cm
      join public.companies c on c.id = cm.company_id
     where cm.user_id = kim and cm.is_owner
     order by cm.created_at
     limit 1;
    if not found then
      return false;
    end if;

    if mevcut.profile_id is not null then
      if mevcut.sirket_id is null then
        update public.social_profiles
           set sirket_id = sirket.id,
               gorunen_ad = coalesce(nullif(btrim(gorunen_ad), ''), sirket.name),
               updated_at = now()
         where profile_id = kim;
        return true;
      end if;
      return false;
    end if;

    /* Önce şirketin kendi slug'ı; kapılmışsa üretilen ad. */
    aday := sirket.slug;
    if aday is null
       or aday !~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
       or sosyal_gizli.kullanici_adi_dolu(aday) then
      aday := null;
    end if;

    for deneme in 1..5 loop
      begin
        aday := coalesce(aday, sosyal_gizli.kullanici_adi_uret(sirket.name));
        insert into public.social_profiles
          (profile_id, username, sirket_id, gorunen_ad, yayinda_mi)
        values
          (kim, aday, sirket.id, sirket.name, true);
        return true;
      exception
        when unique_violation then
          aday := null;
      end;
    end loop;

    insert into public.social_profiles
      (profile_id, username, sirket_id, gorunen_ad, yayinda_mi)
    values
      (kim, null, sirket.id, sirket.name, false);
    return true;
  end if;

  /* ---------------------------------------------------- öğrenci dalı */
  select sosyal_gizli.bolumu_esle(sp.department) into bolum
    from public.student_profiles sp where sp.id = kim;

  select ds.sector_id into alan
    from public.department_sectors ds where ds.department_id = bolum;

  if mevcut.profile_id is not null then
    if mevcut.department_id is null and bolum is not null then
      update public.social_profiles
         set department_id = bolum,
             sector_id = coalesce(sector_id, alan),
             updated_at = now()
       where profile_id = kim;
      return true;
    end if;
    return false;
  end if;

  for deneme in 1..5 loop
    begin
      aday := sosyal_gizli.kullanici_adi_uret(tam_ad);
      insert into public.social_profiles
        (profile_id, username, department_id, sector_id, gorunen_ad, yayinda_mi)
      values
        (kim, aday, bolum, alan, nullif(btrim(coalesce(tam_ad, '')), ''), true);
      return true;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  insert into public.social_profiles
    (profile_id, username, department_id, sector_id, gorunen_ad, yayinda_mi)
  values
    (kim, null, bolum, alan, nullif(btrim(coalesce(tam_ad, '')), ''), false);
  return true;
end;
$$;

/*
  ÜYELİK GELİNCE SAYFA AÇILSIN
  Şirket hesabı kayıt anında üyeliksiz olabiliyor (sahiplenme sonra).
  Owner üyeliği yazıldığında sayfa o anda açılıyor; kayıt tetikleyicisi
  (kayittan_sonra_sosyal_profil) rolü artık tanıdığı için orada da denenir,
  üyelik yoksa sessizce false döner.
*/
create or replace function sosyal_gizli.uyelikten_sonra_sirket_sayfasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_owner then
    begin
      perform sosyal_gizli.sosyal_profil_ac(new.user_id);
    exception
      when others then
        raise warning 'şirket sayfası açılamadı (%): %', new.user_id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists uyelikten_sonra_sirket_sayfasi_tg on public.company_members;
create trigger uyelikten_sonra_sirket_sayfasi_tg
  after insert or update of is_owner on public.company_members
  for each row execute function sosyal_gizli.uyelikten_sonra_sirket_sayfasi();

-- ---------------------------------------------------------- 8. geçiş
/* Var olan şirket sahipleri için sayfa: idempotent, öğrencilere dokunmuyor. */
do $$
declare
  kim uuid;
begin
  for kim in
    select distinct cm.user_id
      from public.company_members cm
      join public.profiles p on p.id = cm.user_id
     where cm.is_owner and p.role = 'company'
  loop
    begin
      perform sosyal_gizli.sosyal_profil_ac(kim);
    exception
      when others then
        raise warning 'geçişte atlandı (%): %', kim, sqlerrm;
    end;
  end loop;
end $$;
