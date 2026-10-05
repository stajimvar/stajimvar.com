-- BEKLEYEN BAŞVURU HATIRLATMASI
--
-- ÖLÇÜM (üretim, 5 Ekim 2026)
-- ---------------------------
--   submitted            5 başvuru · en eskisi 50 GÜNDÜR bekliyor · 4'ü 7+ gün
--   interview_scheduled  1 başvuru · 34 gündür hareketsiz
--   under_review         1 başvuru · 3 gün (henüz bekleyen değil)
--   offer_accepted       1 başvuru · 34 gün ama SONUÇLANMIŞ
--
-- Yani iş gerçekten bekliyor ve kimse görmüyor. Hatırlatma bu boşluk için.
--
-- BİLDİRİM YAĞMURU YOK — EN ÇOK ÜÇ KEZ, SONRA SESSİZLİK
-- -----------------------------------------------------
-- Eşikler 7, 14 ve 30 gün. Her başvuru her eşik için EN FAZLA BİR kez
-- bildirim üretiyor (`dedupe_key`), yani bir başvurunun ömrü boyunca en
-- çok üç hatırlatma geliyor. 30 günden sonra susuyor: cevap vermeyen bir
-- ekibe dördüncü kez seslenmek, bildirimi gürültüye çevirir.
--
-- YALNIZ EN YÜKSEK EŞİK: 50 gündür bekleyen bir başvuru ilk koşuda üç
-- bildirim birden üretmiyor; yalnız 30 günlük olanı yazılıyor. Üçünü de
-- yazmak, geçmişi bugünün zil sesine çevirirdi.
--
-- GERÇEK TARİH
-- ------------
-- Bekleme süresi `greatest(updated_at, applied_at)` üzerinden. `updated_at`
-- her güncellemede tetikleyiciyle damgalanıyor (0001, t5): durum değişimi,
-- not yazma, mülakat tarihi, sorumlu atama — hepsi "işlem gördü" sayılıyor.
-- Uydurma bir hareketsizlik ölçüsü yok.
--
-- SONUÇLANMIŞ BAŞVURU HATIRLATILMIYOR: teklif kabul/ret, red ve geri
-- çekmede yapılacak iş kalmıyor. Liste panodaki "Sonuçlandı" sütunuyla
-- AYNI; iki yerde ayrı yazılsaydı biri değişip öteki geride kalırdı.

/* ================================================================== */
/*  1) HATIRLATMA ÜRETİCİ                                              */
/* ================================================================== */
--
-- YALNIZ service_role ÇAĞIRIYOR. `authenticated`a açılsaydı herhangi bir
-- kullanıcı istediği an bildirim ürettirebilirdi — hız sınırı olmayan bir
-- bildirim kapısı. Zamanlama GitHub Actions'ta (günlük).
create or replace function public.bekleyen_basvuru_hatirlatmalari()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  yazilan integer := 0;
begin
  with bekleyen as (
    select
      a.id            as basvuru_id,
      a.atanan_uye,
      l.company_id,
      coalesce(nullif(btrim(l.title), ''), 'ilan') as ilan_adi,
      /*
        En yüksek AŞILAN eşik. 50 günlük bir başvuruda 30 çıkıyor ve
        yalnız o yazılıyor; 7 ile 14 geçmişte kaldı.
      */
      case
        when greatest(a.updated_at, a.applied_at) < now() - interval '30 days' then 30
        when greatest(a.updated_at, a.applied_at) < now() - interval '14 days' then 14
        when greatest(a.updated_at, a.applied_at) < now() - interval '7 days'  then 7
        else null
      end as esik,
      (now() - greatest(a.updated_at, a.applied_at)) as bekleme
    from public.applications a
    join public.listings l on l.id = a.listing_id
    where a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
  ),
  hedef as (
    /*
      ALICI: sorumlu varsa O. Yoksa şirket SAHİPLERİ — çünkü "kim
      bakacak" kararını verecek kişi onlar. Sorumsuz işi kimseye
      yazmamak, tam da unutulan işi sessiz bırakmak olurdu.

      Recruiter'lara toplu yazılmıyor: herkese giden bir hatırlatma
      kimsenin üstlenmediği bir hatırlatmadır.
    */
    select b.basvuru_id, b.esik, b.ilan_adi, b.bekleme, b.atanan_uye as alici
      from bekleyen b
     where b.esik is not null and b.atanan_uye is not null
    union all
    select b.basvuru_id, b.esik, b.ilan_adi, b.bekleme, cm.user_id
      from bekleyen b
      join public.company_members cm
        on cm.company_id = b.company_id and cm.is_owner
     where b.esik is not null and b.atanan_uye is null
  ),
  eklenen as (
    insert into public.notifications
      (recipient_id, type, title, body, target_url, application_id, dedupe_key)
    select
      h.alici,
      'basvuru_bekliyor',
      extract(day from h.bekleme)::int || ' gündür yanıt bekleyen başvuru',
      h.ilan_adi || ' ilanındaki bu başvuru ' || extract(day from h.bekleme)::int
        || ' gündür işlem görmedi.',
      '/sirket/basvuranlar?aday=' || h.basvuru_id::text,
      h.basvuru_id,
      /*
        Anahtar BAŞVURU + EŞİK + ALICI. Alıcı da içinde: sorumlu
        değişirse yeni sorumlu aynı eşikte bir kez haberdar oluyor,
        eskisinin aldığı bildirim onu susturmuyor.
      */
      'bekleyen:' || h.basvuru_id::text || ':' || h.esik::text || ':' || h.alici::text
    from hedef h
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into yazilan from eklenen;

  return yazilan;
end;
$$;

/*
  `authenticated` ve `anon` ÇAĞIRAMIYOR; yalnız service_role (GitHub
  Actions). Varsayılan ayrıcalıklar public'e execute verdiği için önce
  geri alınıyor.
*/
revoke all on function public.bekleyen_basvuru_hatirlatmalari() from public, anon, authenticated;

/* ================================================================== */
/*  2) EKRANIN KENDİSİ DE GÖRSÜN                                       */
/* ================================================================== */
--
-- Bildirim zamanlamaya bağlı; ekran değil. Panel bekleyen başvuruları
-- hatırlatma gelmeden de gösterebilsin diye bekleme süresi okunuyor.
-- Ayrı bir RPC yok: `applications.updated_at` zaten okunuyor ve istemci
-- farkı kendisi hesaplıyor (bkz. lib/bekleyen-basvuru.mjs).
comment on function public.bekleyen_basvuru_hatirlatmalari() is
  'Bekleyen başvurular için günlük hatırlatma. 7/14/30 gün eşikleri, her eşik en çok bir kez. Yalnız service_role.';
