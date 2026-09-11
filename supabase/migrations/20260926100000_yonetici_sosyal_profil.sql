-- G kapanışı — yönetici hesabına da sosyal profil
--
-- ÖLÇÜLEN DURUM
-- -------------
-- Canlıda rol bazında: 14 öğrenci → 14 sosyal profil; 1 yönetici → 0;
-- 1 şirket → 0. Yönetici /cv'yi açınca "Sosyal profilin hazırlanamadı"
-- görüyordu ve "Yeniden dene" de `ogrenci-degil` ile reddediyordu.
-- Üç kapı — kayıt tetikleyicisi, eski kullanıcı geçişi ve
-- `sosyal_profilimi_tamamla()` — yalnız `role = 'student'`e açıktı.
--
-- KARAR: ÖĞRENCİ + YÖNETİCİ
-- -------------------------
-- Sitenin sahibi kendi ürününü kendi hesabıyla göremiyordu. Yöneticiye
-- sosyal profil açmanın güvenlik maliyeti yok: sosyal katmandaki her
-- politika SATIR SAHİPLİĞİNE ve görünürlüğe bakıyor, role değil.
-- Yönetici bir sosyal profil olarak sıradan bir kullanıcıyla aynı
-- kurallara tabi.
--
-- Şirket hesapları DIŞARIDA kalıyor: onların öğrenci profili, bölümü,
-- CV'si yok ve sosyal katman bir öğrenci portfolyosu.
--
-- Rol kümesi TEK YERDE: aşağıdaki `sosyal_profil_rolu()` yardımcısı.
-- Üç kapı ayrı ayrı `role = 'student'` yazıyordu; biri güncellenip
-- öteki unutulunca bugünkü tutarsızlık doğdu. Artık üçü de aynı
-- fonksiyonu soruyor.

create or replace function sosyal_gizli.sosyal_profil_rolu(rol text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select rol in ('student', 'admin')
$$;

/* Kayıt tetikleyicisi — rol kümesi yardımcıdan. */
create or replace function sosyal_gizli.kayittan_sonra_sosyal_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if sosyal_gizli.sosyal_profil_rolu(new.role::text) then
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

/* Eski kullanıcı geçişi — aynı küme. */
create or replace function sosyal_gizli.sosyal_profilleri_tamamla()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  kim       uuid;
  dokunulan integer := 0;
begin
  for kim in
    select p.id
      from public.profiles p
      left join public.social_profiles sp on sp.profile_id = p.id
     where sosyal_gizli.sosyal_profil_rolu(p.role::text)
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

/* "Yeniden dene"nin kapısı — aynı küme, aynı dar sözleşme. */
create or replace function public.sosyal_profilimi_tamamla()
returns public.social_profiles
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ben   uuid := auth.uid();
  sonuc public.social_profiles;
begin
  if ben is null then
    raise exception 'Oturum gerekiyor.'
      using errcode = '42501', detail = 'oturum-yok';
  end if;

  if not exists (
    select 1 from public.profiles p
     where p.id = ben and sosyal_gizli.sosyal_profil_rolu(p.role::text)
  ) then
    raise exception 'Sosyal profil yalnız öğrenci ve yönetici hesaplarında açılıyor.'
      using errcode = '42501', detail = 'rol-uygun-degil';
  end if;

  perform sosyal_gizli.sosyal_profil_ac(ben);

  select * into sonuc from public.social_profiles where profile_id = ben;

  if not found then
    raise exception 'Sosyal profil hazırlanamadı.'
      using errcode = 'P0001', detail = 'profil-hazirlanamadi';
  end if;

  return sonuc;
end;
$$;

revoke all on function sosyal_gizli.sosyal_profil_rolu(text) from public;
revoke all on function public.sosyal_profilimi_tamamla()     from public;
grant execute on function public.sosyal_profilimi_tamamla()  to authenticated;

/* Yönetici için geçiş bir kez daha: idempotent, öğrencilere dokunmuyor. */
select sosyal_gizli.sosyal_profilleri_tamamla();
