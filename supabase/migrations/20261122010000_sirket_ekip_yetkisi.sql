-- ŞİRKET EKİP YETKİSİ: VIEWER YAZAMAZ
--
-- NUMARA: 20261121010000 ZATEN ALINMIŞ (basvuru_aday_incelemesi) ve
-- uygulanmış en yüksek sürüm de o. Aynı numarayla ikinci bir dosya
-- `db push`u "migration history divergence" ile durdurur ve dağıtım
-- sessizce atlanır — bu daha önce bir kez yaşandı. Bu yüzden 20261122.
--
-- ÖLÇÜLEN AÇIK
-- ------------
-- `company_members.recruiter_role` 0001'den beri var ve üç değer taşıyor
-- ('Owner', 'Recruiter', 'Viewer'), ama HİÇBİR politikada okunmuyordu.
-- `applications` güncelleme politikası yalnız `is_company_member()`
-- soruyordu; yani şirkete Viewer olarak eklenen biri de başvuru
-- durumunu değiştirebiliyor, not yazabiliyor, teklif verebiliyordu.
-- Rol ekranda bir etiketten ibaretti.
--
-- Üretimde ölçüldü (5 Ekim 2026): 2 şirket üyesi var ve İKİSİ DE Owner.
-- Yani bugün kimsenin yetkisi daralmıyor — bu göç, ekip büyümeden önce
-- kapıyı doğru yere koyuyor. Rol gerçekten kullanılmaya başlandığında
-- kuralın sonradan eklenmesi, o ana kadar açık kalmış bir kapı demekti.
--
-- NEDEN SUNUCUDA
-- --------------
-- Arayüzde düğmeyi gizlemek yetmez: PostgREST'e doğrudan istek atan bir
-- Viewer yine yazabilirdi. Kural burada; arayüz yalnızca aynı kuralı
-- ÖNCEDEN gösteriyor.

/* ================================================================== */
/*  1) ROL OKUYUCU                                                     */
/* ================================================================== */

/**
 * Oturum sahibinin bu şirketteki rolü.
 *
 * Satır yoksa null — "üye değil" ile "rolü yok" aynı cümle, çünkü üye
 * olmayanın rolü de yok. Boş/eksik `recruiter_role` en DAR role
 * düşüyor ('Viewer'): varsayılanı geniş tutmak, veri bozulduğunda
 * yetkiyi genişletirdi.
 */
create or replace function public.sirket_rolum(hedef uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer')
    from public.company_members cm
   where cm.company_id = hedef and cm.user_id = auth.uid()
   limit 1
$$;

/**
 * Başvuru üzerinde YAZMA yetkisi var mı?
 *
 * Owner ve Recruiter yazabiliyor; Viewer yazamıyor. `is_owner` bayrağı
 * da kabul ediliyor: 0011 ve 20260902010000 sahipleri o bayrakla
 * işaretliyor ve rol metni ileride boş kalırsa sahip kilitlenmemeli.
 */
create or replace function public.sirket_basvuru_yazabilir(hedef uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.company_members cm
     where cm.company_id = hedef
       and cm.user_id = auth.uid()
       and (cm.is_owner or coalesce(nullif(btrim(cm.recruiter_role), ''), 'Viewer') in ('Owner', 'Recruiter'))
  )
$$;

revoke all on function public.sirket_rolum(uuid)              from public, anon;
revoke all on function public.sirket_basvuru_yazabilir(uuid)  from public, anon;
grant execute on function public.sirket_rolum(uuid)             to authenticated;
grant execute on function public.sirket_basvuru_yazabilir(uuid) to authenticated;

/* ================================================================== */
/*  2) GÜNCELLEME POLİTİKASI ROLE BAKIYOR                              */
/* ================================================================== */
--
-- OKUMA DEĞİŞMİYOR: Viewer başvuruları görmeye devam ediyor — rolün
-- amacı zaten "görsün ama karışmasın".
--
-- Geçiş kuralı (hangi durumdan hangisine) tetikleyicide duruyor ve
-- ORAYA DOKUNULMUYOR (20260914020000'in gerekçesi: kural eski ve yeni
-- değeri birlikte görmek zorunda, politika bunu yapamaz). Buradaki tek
-- soru "bu kişi yazabilir mi".
drop policy if exists "dogrulanmis sirket basvuru durumu gunceller" on public.applications;

create policy "dogrulanmis sirket basvuru durumu gunceller" on public.applications
  for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.sirket_basvuru_yazabilir(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and public.sirket_basvuru_yazabilir(l.company_id)
        and public.sirket_dogrulandi(l.company_id)
    )
  );

/* ================================================================== */
/*  3) BAŞKA ŞİRKETİN VERİSİ: DEĞİŞMEDİ                                */
/* ================================================================== */
--
-- `sirket_basvuru_yazabilir` üyeliği şirket kimliğiyle birlikte
-- sorguluyor, yani A şirketinin Recruiter'ı B şirketinin başvurusunda
-- false alıyor. Okuma tarafındaki izolasyon da yerinde duruyor
-- ("sirket basvurulari gorur" → `is_company_member(l.company_id)`).
-- Bu göç o sınırı genişletmiyor; yalnız yazma tarafını daraltıyor.
