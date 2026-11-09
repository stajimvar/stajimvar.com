/*
  ROL ŞİRKETE DÖNÜNCE ŞİRKET SAYFASI DA AÇILSIN (9 Kasım 2026)

  Ölçülen: Modmere'nin Şirketim sayfasında "Şirket sayfan henüz açılmamış;
  fotoğraf paylaşımı sayfa açıldığında geliyor" yazıyor. social_profiles
  satırı var ama sirket_id BOŞ.

  SEBEP — SIRA: sayfayı bağlayan tetikleyici (uyelikten_sonra_sirket_sayfasi,
  20261014010000) Owner üyeliği EKLENDİĞİ anda sosyal_profil_ac'ı çağırıyor
  ve o işlev şirket dalına yalnız profiles.role = 'company' ise giriyor.
  Onay işlevleri ise (approve_sirket_talebi / sirket_talebini_uygula,
  approve_company_claim, company_claim_otomatik_degerlendir) ÖNCE üyeliği,
  SONRA rolü yazıyor. Tetikleyici çalıştığında hesap hâlâ 'student';
  öğrenci dalına giriyor, sayfa şirkete bağlanmıyor.

  DÜZELTME: rol 'company'ye geçtiğinde de aynı işlev çağrılıyor
  (profiles üzerinde tetikleyici). Onay işlevlerine dokunulmuyor; hangi
  sırayla yazarlarsa yazsınlar ikinci adım sayfayı bağlıyor. İşlev
  idempotent: zaten bağlıysa bir şey yapmıyor.

  GERİYE DÖNÜK: Owner üyeliği olup şirket sayfası bağlı olmayan şirket
  hesapları (bugün Modmere) bağlanıyor.

  GERİ ALMA
    drop trigger if exists rol_degisince_sirket_sayfasi_tg on public.profiles;
    drop function if exists sosyal_gizli.rol_degisince_sirket_sayfasi();
*/

create or replace function sosyal_gizli.rol_degisince_sirket_sayfasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform sosyal_gizli.sosyal_profil_ac(new.id);
  exception
    when others then
      raise warning 'şirket sayfası açılamadı (%): %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists rol_degisince_sirket_sayfasi_tg on public.profiles;
create trigger rol_degisince_sirket_sayfasi_tg
  after update of role on public.profiles
  for each row
  when (new.role = 'company' and old.role is distinct from new.role)
  execute function sosyal_gizli.rol_degisince_sirket_sayfasi();

revoke all on function sosyal_gizli.rol_degisince_sirket_sayfasi() from public;

/* Geriye dönük: bağlanmamış şirket sahipleri. */
do $$
declare
  kim uuid;
begin
  for kim in
    select distinct cm.user_id
      from public.company_members cm
      join public.profiles p on p.id = cm.user_id
     where cm.is_owner
       and p.role = 'company'
       and not exists (
         select 1 from public.social_profiles sp
          where sp.profile_id = cm.user_id and sp.sirket_id is not null)
  loop
    begin
      perform sosyal_gizli.sosyal_profil_ac(kim);
    exception
      when others then
        raise warning 'geçişte atlandı (%): %', kim, sqlerrm;
    end;
  end loop;
end $$;
