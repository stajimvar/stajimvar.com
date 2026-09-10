-- SOSYAL KATMAN C AŞAMASI — KULLANICIYA GÖRÜNEN KARAR AÇIKLAMASI
--
-- Talep reddedildiğinde kullanıcı yalnız "Talebin reddedildi." görüyordu.
-- Sebebi göstermek gerekiyor ama yönetimin iç notunu göstermek DEĞİL:
-- o not başka talepleri, yöneticinin kimliğini ya da değerlendirme
-- ayrıntısını içerebilir.
--
-- İKİ AYRI KANAL
-- -------------
--   `gerekce`           yönetimin iç notu → yalnız `bolum_talep_denetim`
--                       (append-only, yalnız yöneticiye açık)
--   `karar_aciklamasi`  kullanıcıya gösterilen cümle → talep satırında
--
-- Ayrı olmaları bir kolaylık değil sınırın kendisi: tek alan olsaydı
-- yönetici iç notu yazarken onu kullanıcının okuyacağını unutabilirdi.
-- İki alan, iki ayrı yazma anı demek.
--
-- KULLANICI YALNIZ KENDİ SATIRINI OKUYOR
-- --------------------------------------
-- `department_requests` SELECT politikası zaten `user_id = auth.uid()`
-- (20260923050000). Yeni kolon o politikanın altında yaşıyor; ek bir
-- görünüm ya da RPC gerekmiyor. Yöneticinin ayrı okuma politikası
-- duruyor ama o politikadan geçen satırlar kullanıcıya hiç ulaşmıyor.
--
-- KULLANICI KENDİ AÇIKLAMASINI YAZAMIYOR
-- --------------------------------------
-- Talep açarken INSERT yetkisi kolon düzeyinde daraltılıyor: kullanıcı
-- yalnız kendi anlattıklarını yazabiliyor, kararı yazamıyor. Aksi hâlde
-- talebi açan kişi "kabul edildi" diye bir açıklama yazıp kendi ekranında
-- gösterebilirdi — erişim vermezdi ama yanıltıcı olurdu.
--
-- ESKİ SATIRLAR
-- -------------
-- Kolon eklenmeden önce kararlanmış satırlarda değer NULL kalıyor ve bu
-- göç uydurma bir cümle YAZMIYOR. Arayüz o durumda yalnız dürüst genel
-- durumu ("Talebin reddedildi.") gösteriyor.

/* ================================================================== */
/*  1) KULLANICIYA GÖRÜNEN AÇIKLAMA                                    */
/* ================================================================== */

alter table public.department_requests
  add column if not exists karar_aciklamasi text
    check (karar_aciklamasi is null
           or length(btrim(karar_aciklamasi)) between 5 and 500);

comment on column public.department_requests.karar_aciklamasi is
  'Yöneticinin KULLANICIYA yazdığı karar açıklaması. Yönetimin iç notu bu alanda DEĞİL; o `bolum_talep_denetim.gerekce` içinde ve yalnız yöneticiye açık.';

/*
  INSERT KOLON DÜZEYİNDE DARALIYOR

  Tablo yetkisi geri alınıp yalnız kullanıcının kendi anlattığı alanlar
  veriliyor. `status` da listede yok: kullanıcı talebini "eklendi" diye
  açamıyor (RLS zaten erişim vermezdi ama kuyruğu kirletirdi).
*/
revoke insert on public.department_requests from authenticated;
grant insert (user_id, department_id, requested_department, universite, aciklama)
  on public.department_requests to authenticated;

/* ================================================================== */
/*  2) KARAR RPC'Sİ — AÇIKLAMA ZORUNLU                                 */
/* ================================================================== */

/*
  ESKİ BEŞ PARAMETRELİ SÜRÜM DÜŞÜYOR.

  İki imza yan yana dursaydı açıklamasız karar yolu açık kalırdı ve
  yönetim ekranı yanlışlıkla eskisini çağırabilirdi. Postgres imzayı
  parametre listesine göre ayırt ettiği için `create or replace` yeni
  bir aşırı yükleme üretirdi; bu yüzden açıkça düşürülüyor.
*/
drop function if exists public.bolum_talebini_karara_bagla(uuid, text, uuid, uuid, text);

create or replace function public.bolum_talebini_karara_bagla(
  p_talep_id         uuid,
  p_karar            text,
  p_department_id    uuid,
  p_sector_id        uuid,
  p_gerekce          text,
  p_karar_aciklamasi text
)
returns public.department_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  talep public.department_requests%rowtype;
  mevcut_alan uuid;
  sonuc public.department_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici olmak gerekiyor.'
      using errcode = '42501', detail = 'yonetici-degil';
  end if;

  if p_gerekce is null or length(btrim(p_gerekce)) < 5 then
    raise exception 'Karar gerekçesi zorunlu.'
      using errcode = '23514', detail = 'gerekce-zorunlu';
  end if;

  /*
    Kullanıcıya gösterilecek cümle de ZORUNLU. Kararın kullanıcı
    tarafında bir karşılığı olmadan verilmesi, "reddedildi" deyip
    sebebini hiç söylememek demekti.
  */
  if p_karar_aciklamasi is null or length(btrim(p_karar_aciklamasi)) < 5 then
    raise exception 'Kullanıcıya gösterilecek karar açıklaması zorunlu.'
      using errcode = '23514', detail = 'aciklama-zorunlu';
  end if;

  if p_karar is null or p_karar not in ('eklendi', 'reddedildi') then
    raise exception 'Geçersiz karar.'
      using errcode = '23514', detail = 'gecersiz-karar';
  end if;

  select * into talep from public.department_requests where id = p_talep_id;
  if not found then
    raise exception 'Talep bulunamadı.'
      using errcode = 'P0001', detail = 'talep-bulunamadi';
  end if;

  if p_karar = 'eklendi' then
    if p_department_id is null or p_sector_id is null then
      raise exception 'Kabul için bölüm ve alan seçilmeli.'
        using errcode = '23514', detail = 'secim-zorunlu';
    end if;

    if not exists (select 1 from public.departments where id = p_department_id and aktif) then
      raise exception 'Bölüm katalogda bulunamadı.'
        using errcode = 'P0001', detail = 'bolum-bulunamadi';
    end if;
    if not exists (select 1 from public.sectors where id = p_sector_id and aktif) then
      raise exception 'Alan listede bulunamadı.'
        using errcode = 'P0001', detail = 'alan-bulunamadi';
    end if;

    select ds.sector_id into mevcut_alan
      from public.department_sectors ds
     where ds.department_id = p_department_id;

    if mevcut_alan is not null and mevcut_alan is distinct from p_sector_id then
      raise exception 'Bu bölümün eşlemesi zaten var ve farklı bir alana işaret ediyor.'
        using errcode = '23505', detail = 'esleme-catismasi';
    end if;

    insert into public.department_sectors (department_id, sector_id, onaylayan, onay_notu)
    values (p_department_id, p_sector_id, auth.uid(), btrim(p_gerekce))
    on conflict (department_id) do nothing;
  end if;

  update public.department_requests
     set status = p_karar,
         department_id = coalesce(p_department_id, department_id),
         karar_aciklamasi = btrim(p_karar_aciklamasi),
         updated_at = now()
   where id = p_talep_id
  returning * into sonuc;

  /* İç not YALNIZ denetim tablosuna; kullanıcı satırına geçmiyor. */
  insert into public.bolum_talep_denetim
    (talep_id, karar, department_id, sector_id, yapan, gerekce)
  values
    (p_talep_id, p_karar, p_department_id, p_sector_id, auth.uid(), btrim(p_gerekce));

  return sonuc;
end;
$$;

revoke all on function public.bolum_talebini_karara_bagla(uuid, text, uuid, uuid, text, text) from public;
grant execute on function public.bolum_talebini_karara_bagla(uuid, text, uuid, uuid, text, text) to authenticated;
