-- ADAYIN BEKLEYİŞİ: İÇ İŞLEM İLERLEME DEĞİLDİR
--
-- DÜZELTİLEN KUSUR
-- ----------------
-- Bekleme süresi `greatest(updated_at, applied_at)` üzerinden
-- hesaplanıyordu. `updated_at` ise `applications` üzerindeki HER
-- güncellemede damgalanıyor (tetikleyici t5) — sorumlu atamak dahil.
--
-- Sonuç şuydu: bir başvuruya sorumlu atandığı anda adayın bekleme
-- saati sıfırlanıyordu. Adaya hiçbir şey olmamıştı; yalnız ekip içinde
-- "buna ben bakacağım" denmişti. Hatırlatma 7 gün daha susuyordu ve
-- hatırlatmayı susturan şey, tam da onu tetiklemesi gereken ilginin
-- kendisiydi. Aynı şey 20261123010000'in `basvuru_sorumlusu_ata`
-- RPC'si her çağrıldığında oluyordu.
--
-- Değerlendirme yazmak bu kusuru zaten taşımıyordu (ayrı tabloya
-- yazılıyor, `applications` güncellenmiyor) ama kural burada tek yerde
-- ve açıkça tanımlanıyor ki ileride bir iç alan eklendiğinde sessizce
-- "ilerleme" sayılmasın.
--
-- AYRIM
-- -----
-- ADAYA GÖRÜNEN İLERLEME (saati sıfırlar):
--   status, interview_date, interview_time, interview_type,
--   interview_location, interview_note, company_feedback,
--   offer_note, offer_start_date, offer_compensation
--   — hepsi öğrencinin kendi başvuru sayfasında ya da e-postasında
--   karşılığı olan şeyler.
--
-- İÇ İŞLEM (saati SIFIRLAMAZ):
--   atanan_uye, atanan_at        → ekip içi iş bölümü
--   match_score                  → şirketin kendi notu
--   email_* alanları             → gönderim muhasebesi; yeniden deneme
--                                  adaya yeni bir şey söylemiyor
--   profile_snapshot, cv_* , paylasim_izni_at → kayıt tutma
--
-- ADAYIN KENDİ YANITI DA SAYILMIYOR
-- ---------------------------------
-- `interview_response` / `interview_responded_at` adayın hamlesi.
-- Aday "katılıyorum" dediğinde top ŞİRKETE geçiyor; bunu ilerleme
-- sayıp saati sıfırlamak, şirketin yeni doğan borcunu görünmez
-- kılardı.

/* ================================================================== */
/*  1) ALAN                                                            */
/* ================================================================== */

alter table public.applications
  add column if not exists aday_ilerleme_at timestamptz;

comment on column public.applications.aday_ilerleme_at is
  'Adaya yönelik son gerçek süreç ilerlemesi. İç işlemler (sorumlu atama, puan, e-posta muhasebesi) bu damgayı GÜNCELLEMEZ.';

/* ================================================================== */
/*  2) GERİYE DÖNÜK DOLDURMA                                           */
/* ================================================================== */
--
-- `updated_at` KULLANILMIYOR: tam da güvenilmez olduğu için bu göç
-- yazıldı; geçmişi onunla doldurmak kusuru veriye kalıcı olarak
-- yazmak olurdu.
--
-- `status_changed_at` gerçek bir ilerleme damgası (stamp_application_
-- status_change). Yoksa `applied_at`e düşülüyor: "ilerlediğine dair
-- kaydımız yok" durumunda başvuruyu başvuru gününden beri bekliyor
-- saymak, DOĞRU ve temkinli olan. Tersi — bugünü yazmak — hiç
-- ilerlememiş başvuruları taze gösterirdi.
--
-- İlk koşuda bu, eski başvurular için hatırlatma üretebilir. Taşkın
-- yok: eşik başına en çok bir bildirim var ve yalnız EN YÜKSEK eşik
-- yazılıyor, yani başvuru başına en fazla bir tane.
update public.applications
   set aday_ilerleme_at = greatest(applied_at, coalesce(status_changed_at, applied_at))
 where aday_ilerleme_at is null;

/* ================================================================== */
/*  3) DAMGALAYICI                                                     */
/* ================================================================== */
--
-- `is distinct from` kullanılıyor: null→değer ve değer→null geçişleri
-- de ilerleme (görüşme tarihi silmek de adaya giden bir değişiklik).
create or replace function public.stamp_aday_ilerleme()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.aday_ilerleme_at := coalesce(new.aday_ilerleme_at, new.applied_at, now());
    return new;
  end if;

  if new.status             is distinct from old.status
     or new.interview_date     is distinct from old.interview_date
     or new.interview_time     is distinct from old.interview_time
     or new.interview_type     is distinct from old.interview_type
     or new.interview_location is distinct from old.interview_location
     or new.interview_note     is distinct from old.interview_note
     or new.company_feedback   is distinct from old.company_feedback
     or new.offer_note         is distinct from old.offer_note
     or new.offer_start_date   is distinct from old.offer_start_date
     or new.offer_compensation is distinct from old.offer_compensation
  then
    new.aday_ilerleme_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists applications_stamp_aday_ilerleme on public.applications;
create trigger applications_stamp_aday_ilerleme
  before insert or update on public.applications
  for each row execute function public.stamp_aday_ilerleme();

/* Bekleyenleri bulmak en sık sorulan soru; sonuçlanmamışlar üzerinde. */
create index if not exists applications_aday_ilerleme_idx
  on public.applications (aday_ilerleme_at)
  where status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn');

/* ================================================================== */
/*  4) HATIRLATMA ARTIK İLERLEMEYE BAKIYOR                             */
/* ================================================================== */
--
-- 20261124010000'in gövdesi birebir korunuyor; DEĞİŞEN TEK ŞEY bekleme
-- ölçüsü. Eşikler, alıcı seçimi ve `dedupe_key` aynı — dolayısıyla
-- tekrar koruması da aynı: başvuru + eşik + alıcı başına bir bildirim.
--
-- DEDUPE KURALI BU DEĞİŞİKLİKTEN ETKİLENMİYOR, ama anlamı güçleniyor:
-- artık saat yalnız adaya gerçekten bir şey olduğunda sıfırlanıyor, bu
-- yüzden "7 gün" bildirimi ikinci kez yazılmıyor ve 14 ile 30 sırası
-- gelince geliyor. Eskiden sorumlu ataması saati sıfırlayıp eşiği
-- yeniden aşılabilir hâle getiriyordu — aynı eşik farklı bir alıcıya
-- yeniden yazılabiliyordu.
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
      case
        when greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at) < now() - interval '30 days' then 30
        when greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at) < now() - interval '14 days' then 14
        when greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at) < now() - interval '7 days'  then 7
        else null
      end as esik,
      (now() - greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at)) as bekleme
    from public.applications a
    join public.listings l on l.id = a.listing_id
    where a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
  ),
  hedef as (
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
      'bekleyen:' || h.basvuru_id::text || ':' || h.esik::text || ':' || h.alici::text
    from hedef h
    on conflict (dedupe_key) where dedupe_key is not null do nothing
    returning 1
  )
  select count(*) into yazilan from eklenen;

  return yazilan;
end;
$$;

revoke all on function public.bekleyen_basvuru_hatirlatmalari() from public, anon, authenticated;

comment on function public.bekleyen_basvuru_hatirlatmalari() is
  'Bekleyen başvurular için günlük hatırlatma. Ölçü: aday_ilerleme_at (iç işlemler saymaz). 7/14/30 gün, her eşik en çok bir kez. Yalnız service_role.';

/* ================================================================== */
/*  5) İLAN KAPANIŞINDAKİ LİSTE DE AYNI ÖLÇÜYÜ KULLANIYOR              */
/* ================================================================== */
--
-- Aynı soru iki ekranda iki farklı sayı vermesin: kapanış listesindeki
-- "kaç gündür bekliyor" ile hatırlatmanınki artık tek tanım.
create or replace function public.ilan_bekleyen_adaylar(p_ilan uuid)
returns table (
  basvuru_id   uuid,
  durum        text,
  bekleme_gun  integer,
  atanan_uye   uuid
)
language sql stable security definer set search_path = public
as $$
  select
    a.id,
    a.status::text,
    extract(day from (now() - greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at)))::int,
    a.atanan_uye
  from public.applications a
  join public.listings l on l.id = a.listing_id
  where a.listing_id = p_ilan
    and public.is_company_member(l.company_id)
    and a.status not in ('offer_accepted', 'offer_declined', 'rejected', 'withdrawn')
  order by greatest(coalesce(a.aday_ilerleme_at, a.applied_at), a.applied_at)
$$;

revoke all on function public.ilan_bekleyen_adaylar(uuid) from public, anon;
grant execute on function public.ilan_bekleyen_adaylar(uuid) to authenticated;
