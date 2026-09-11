-- G aşaması — sosyal profil kendiliğinden açılıyor
--
-- NEDEN AYRI ONAY KALKIYOR
-- ------------------------
-- "Sosyal profil oluştur" ayrı bir karar gibi duruyordu ama arkasında
-- kullanıcının vereceği bir bilgi yoktu: ad zaten kayıtta, bölüm zaten
-- öğrenci profilinde, kullanıcı adı zaten addan üretilebiliyor. Ekran,
-- kullanıcıya sormadığı bir soruyu soruyordu.
--
-- ANA KAYIT ASLA BOZULMAZ
-- -----------------------
-- Tetikleyici `profiles` INSERT'ünün ardından çalışıyor ve gövdesi
-- komple `exception when others` ile sarılı. Sosyal profil açılamazsa
-- (bölüm eşleşmiyor, ad harfsiz, kullanıcı adı üretilemiyor) kayıt
-- YİNE tamamlanıyor; eksik profil sonradan tamamlanıyor. Kayıt akışını
-- ikincil bir özelliğin hatasına bağlamak, kullanıcıyı hesabından
-- edecek bir tasarım olurdu.
--
-- BÖLÜM SUNUCUDAN GELİYOR
-- -----------------------
-- `department_id` ve `sector_id` bu fonksiyonun İÇİNDE çözülüyor;
-- istemci ikisini de yazamıyor (20260923030000'deki `grant update`
-- listesinde yoklar). Bölüm eşleşmezse ikisi de NULL kalıyor — uydurma
-- bir bölüm atanmıyor.
--
-- TOPLULUĞA OTOMATİK KATILIM YOK
-- ------------------------------
-- `community_members`e bu göçte tek satır yazılmıyor. Üyelik isteğe
-- bağlı bir karar; profil açmak onu vermiyor.

/* ================================================================== */
/*  1) BÖLÜM METNİNİ KATALOGA BAĞLAMA                                  */
/* ================================================================== */

/**
 * Serbest metin bölüm adını katalog satırına eşler.
 *
 * `student_profiles.department` serbest metin ve öyle kalıyor
 * (20260923010000 bunu bilerek böyle bıraktı). Eşleme, büyük-küçük harf
 * ve baştaki/sondaki boşluktan bağımsız yapılıyor; bulunamazsa NULL
 * dönüyor ve çağıran taraf bunu "bölüm henüz belli değil" diye
 * okuyor — yakın bir bölüm TAHMİN EDİLMİYOR. Yanlış bölüm, yanlış alan
 * ve yanlış topluluk demek.
 */
create or replace function sosyal_gizli.bolumu_esle(ham text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
    from public.departments d
   where d.aktif
     and lower(btrim(d.ad)) = lower(btrim(coalesce(ham, '')))
   limit 1
$$;

/* ================================================================== */
/*  2) PROFİLİ AÇ / TAMAMLA                                            */
/* ================================================================== */

/**
 * Bir kullanıcı için sosyal profili açar ya da eksiklerini tamamlar.
 *
 * TEKRAR ÇALIŞTIRILABİLİR: satır varsa yeniden oluşturmuyor; yalnız
 * NULL kalmış `username`, `department_id` ve `sector_id` alanlarını
 * dolduruyor. Dolu bir alanın üzerine YAZMIYOR — kullanıcı adını
 * değiştirmiş biri, geçiş yeniden koştuğunda adını kaybetmemeli.
 *
 * Kullanıcı adı yarışı: üretim ile insert arasında başka bir oturum
 * aynı adı alabilir. Gerçek garanti tekil indekste; burada
 * `unique_violation` yakalanıp yeniden üretiliyor. Beş deneme, her
 * biri yeni rastgele ekle.
 */
create or replace function sosyal_gizli.sosyal_profil_ac(kim uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  tam_ad   text;
  bolum    uuid;
  alan     uuid;
  aday     text;
  mevcut   public.social_profiles;
  deneme   int;
begin
  if kim is null then
    return false;
  end if;

  select p.full_name into tam_ad from public.profiles p where p.id = kim;
  if not found then
    return false;
  end if;

  select sosyal_gizli.bolumu_esle(sp.department) into bolum
    from public.student_profiles sp where sp.id = kim;

  select ds.sector_id into alan
    from public.department_sectors ds where ds.department_id = bolum;

  select * into mevcut from public.social_profiles where profile_id = kim;

  if found then
    /* Yalnız EKSİKLERİ tamamla; dolu alana dokunma. */
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
        /* Ad kapılmış: döngü yeni bir ek üretecek. */
        null;
    end;
  end loop;

  /*
    Beş denemede de kapıldıysa profil ADSIZ açılıyor. Adsız profil
    yayımlanamıyor (`yayin_icin_kimlik_sart`), bu yüzden `yayinda_mi`
    false; kullanıcı düzenleme ekranından ad seçince açılıyor. Hiç satır
    açmamak, kullanıcıyı sessizce sosyal katmanın dışında bırakırdı.
  */
  insert into public.social_profiles
    (profile_id, username, department_id, sector_id, gorunen_ad, yayinda_mi)
  values
    (kim, null, bolum, alan, nullif(btrim(coalesce(tam_ad, '')), ''), false)
  on conflict (profile_id) do nothing;

  return true;
end;
$$;

/* ================================================================== */
/*  3) TETİKLEYİCİLER                                                  */
/* ================================================================== */

/**
 * Öğrenci kaydı tamamlanınca sosyal profili açar.
 *
 * Gövde tamamen yutuluyor: bu tetikleyicinin hiçbir hatası `profiles`
 * INSERT'ünü geri almamalı.
 */
create or replace function sosyal_gizli.kayittan_sonra_sosyal_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student' then
    begin
      perform sosyal_gizli.sosyal_profil_ac(new.id);
    exception
      when others then
        raise warning 'sosyal profil açılamadı (%): %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists kayittan_sonra_sosyal_profil on public.profiles;
create trigger kayittan_sonra_sosyal_profil
  after insert on public.profiles
  for each row execute function sosyal_gizli.kayittan_sonra_sosyal_profil();

/**
 * Öğrenci bölümünü sonradan girdiğinde/değiştirdiğinde profili tamamlar.
 *
 * Kayıt anında bölüm çoğu zaman HENÜZ YOK: öğrenci onu profil ekranında
 * dolduruyor. Bu tetikleyici olmasaydı, o kullanıcının sosyal profili
 * bölümsüz ve alansız kalır, hiçbir topluluğa katılamazdı.
 *
 * `sosyal_profil_ac` dolu alanın üzerine yazmadığı için, bölümünü
 * DEĞİŞTİREN kullanıcının alanı burada kendiliğinden değişmiyor; bu
 * bilinçli — alan değişimi topluluk üyeliğini de ilgilendiriyor ve
 * yönetici düzeltmesi `sosyal_bolum_duzelt` ile ayrıca yapılıyor.
 */
create or replace function sosyal_gizli.bolum_girilince_tamamla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.department is distinct from old.department then
    begin
      perform sosyal_gizli.sosyal_profil_ac(new.id);
    exception
      when others then
        raise warning 'sosyal profil tamamlanamadı (%): %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists bolum_girilince_tamamla on public.student_profiles;
create trigger bolum_girilince_tamamla
  after update of department on public.student_profiles
  for each row execute function sosyal_gizli.bolum_girilince_tamamla();

/* ================================================================== */
/*  4) ESKİ KULLANICILAR — TEKRAR ÇALIŞTIRILABİLİR GEÇİŞ               */
/* ================================================================== */

/**
 * Sosyal profili olmayan ya da eksik olan öğrencileri kapsar.
 *
 * Kaç kullanıcıya dokunulduğunu döndürüyor; ikinci çağrı 0 dönmeli,
 * çünkü `sosyal_profil_ac` dolu satırı değiştirmiyor. Geçişin gerçekten
 * bittiği böyle ölçülüyor — "çalıştı" demekle değil.
 */
create or replace function sosyal_gizli.sosyal_profilleri_tamamla()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  kim      uuid;
  dokunulan integer := 0;
begin
  for kim in
    select p.id
      from public.profiles p
      left join public.social_profiles sp on sp.profile_id = p.id
     where p.role = 'student'
       and (sp.profile_id is null or sp.department_id is null)
  loop
    begin
      if sosyal_gizli.sosyal_profil_ac(kim) then
        dokunulan := dokunulan + 1;
      end if;
    exception
      when others then
        raise warning 'geçişte atlandı (%): %', kim, sqlerrm;
    end;
  end loop;
  return dokunulan;
end;
$$;

select sosyal_gizli.sosyal_profilleri_tamamla();

revoke all on function sosyal_gizli.bolumu_esle(text)                from public;
revoke all on function sosyal_gizli.sosyal_profil_ac(uuid)           from public;
revoke all on function sosyal_gizli.sosyal_profilleri_tamamla()      from public;
