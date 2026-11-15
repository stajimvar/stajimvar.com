-- KULLANICININ KENDİ HESABINI SİLMESİ (15 Kasım 2026)
--
-- NEDEN
-- -----
-- Sitede hesap silme yolu yoktu; gizlilik metni "adrese yazmanız
-- yeterli" diyordu ve ilk KVKK 11. madde talebi e-postayla geldi. Artık
-- kullanıcı kendi hesabını siliyor: `hesap-sil` kenar işlevi (JWT'li)
-- kimliği doğruluyor, dosyaları kovadan kaldırıyor, aşağıdaki hazırlığı
-- çalıştırıyor ve `auth.admin.deleteUser` ile hesabı siliyor.
--
-- SİLME ZİNCİRİ (ölçüldü, canlı şema)
-- -----------------------------------
-- auth.users → profiles → student_profiles / applications / social_profiles
-- ve kullanıcıya bağlı neredeyse bütün tablolar ON DELETE CASCADE. Silmeyi
-- ENGELLEYEN (NO ACTION / RESTRICT) bağlar yalnız şunlar:
--   companies.claimed_by, sources.tos_reviewed_by,
--   application_channels.verified_by, department_sectors.onaylayan,
--   department_aliases.onaylayan          → boşaltılabilir (null)
--   social_profile_denetim.yapan, bolum_talep_denetim.yapan
--                                          → kişinin kendi işlemleri; siliniyor
--   opportunity_admin_events.admin_user_id → yalnız yöneticide; yönetici
--                                            hesabı bu yoldan silinmiyor
--
-- KAPILAR
-- -------
--   · yönetici hesabı silinmiyor (denetim kayıtları ona bağlı; kazara
--     kendini kilitleme riski)
--   · şirketin TEK sahibi silinmiyor: şirket sahipsiz kalırdı. Önce
--     sahipliği devretmesi gerekiyor.
-- Fonksiyonlar yalnız service_role'e açık; istemci çağıramıyor.

/* ------------------------------------------------------------------ */
/* 1) Ön kontrol                                                       */
/* ------------------------------------------------------------------ */

create or replace function public.hesap_silme_on_kontrol(p_kullanici uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'yonetici', exists (select 1 from public.profiles p where p.id = p_kullanici and p.role = 'admin'),
    'son_sahip', coalesce((
      select jsonb_agg(c.name order by c.name)
        from public.company_members m
        join public.companies c on c.id = m.company_id
       where m.user_id = p_kullanici
         and m.is_owner
         and not exists (
           select 1 from public.company_members o
            where o.company_id = m.company_id and o.is_owner and o.user_id <> p_kullanici)
    ), '[]'::jsonb)
  )
$$;

/* ------------------------------------------------------------------ */
/* 2) Kullanıcının dosyaları                                           */
/* ------------------------------------------------------------------ */

/*
  Sahibi kullanıcı olan ya da yolu kullanıcının klasöründe başlayan
  dosyalar: CV ve başvuru CV kopyaları, sosyal avatar, kapak, paylaşım
  görselleri, eski avatar. HARİÇ: şirket sayfasında hâlâ kullanılan logo
  (şirketin malı) ve etkinlik kapakları (içerik, kişisel veri değil).
*/
create or replace function public.hesap_dosyalari(p_kullanici uuid)
returns table (kova text, yol text)
language sql stable security definer
set search_path = public, storage, pg_temp
as $$
  select o.bucket_id, o.name
    from storage.objects o
   where (o.owner_id = p_kullanici::text or split_part(o.name, '/', 1) = p_kullanici::text)
     and o.bucket_id <> 'event-covers'
     and not (
       o.bucket_id = 'logos'
       and exists (select 1 from public.companies c where c.logo_url like '%/logos/' || o.name)
     )
$$;

/* ------------------------------------------------------------------ */
/* 3) Silmeyi engelleyen bağları çöz                                   */
/* ------------------------------------------------------------------ */

create or replace function public.hesap_silmeye_hazirla(p_kullanici uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.profiles where id = p_kullanici and role = 'admin') then
    raise exception 'yonetici-hesabi' using errcode = 'P0001';
  end if;

  update public.companies            set claimed_by = null      where claimed_by = p_kullanici;
  update public.sources              set tos_reviewed_by = null where tos_reviewed_by = p_kullanici;
  update public.application_channels set verified_by = null     where verified_by = p_kullanici;
  update public.department_sectors   set onaylayan = null       where onaylayan = p_kullanici;
  update public.department_aliases   set onaylayan = null       where onaylayan = p_kullanici;
  delete from public.social_profile_denetim where yapan = p_kullanici;
  delete from public.bolum_talep_denetim    where yapan = p_kullanici;
end;
$$;

revoke all on function public.hesap_silme_on_kontrol(uuid) from public, anon, authenticated;
revoke all on function public.hesap_dosyalari(uuid)        from public, anon, authenticated;
revoke all on function public.hesap_silmeye_hazirla(uuid)  from public, anon, authenticated;
grant execute on function public.hesap_silme_on_kontrol(uuid) to service_role;
grant execute on function public.hesap_dosyalari(uuid)        to service_role;
grant execute on function public.hesap_silmeye_hazirla(uuid)  to service_role;
