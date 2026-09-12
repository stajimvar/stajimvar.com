-- Fırsatlar — envanter modeli: yeni türler, etkinlik alanları, kaynak sağlığı
--
-- ÖLÇÜLEN DURUM (canlı, salt okunur, 11 Eylül 2026)
-- ------------------------------------------------
--   opportunities: 121 yayında — 67 international, 47 scholarship,
--     2 student_support, 2 kyk, 1 competition, 1 education, 1 youth_program.
--     8 tanesinin son başvuru tarihi GEÇMİŞ ama durumu hâlâ 'published'.
--     RLS onları halka zaten göstermiyor; durum sütunu yalan söylüyor.
--   discover_events: 163 — hepsi konser/festival/sergi/tiyatro/atölye/müze.
--     Kayıt bağlantılı KARİYER etkinliği (kariyer günü, staj fuarı,
--     hackathon) SIFIR. Yani Keşfet'ten Fırsatlar'a taşınacak satır yok;
--     bu göç yalnız yeni türleri ve alanları açıyor, veri taşımıyor.
--
-- FIRSAT TANIMI
-- -------------
-- Öğrencinin ŞU ANDA başvurabileceği ya da kayıt olabileceği açık
-- fırsatlar: burs, öğrenci/gelişim programı, Erasmus+/değişim, yarışma,
-- hackathon, Teknofest çağrısı, kayıt alınan kariyer günü, staj/kariyer
-- fuarı. Üç şart: gerçek başvuru/kayıt işlemi, resmî kaynak, geçerli
-- tarih. Sergi, konser, gezi ve festival bu tanımın DIŞINDA.
--
-- DURUMLAR — SAKLANAN VE TÜRETİLEN
-- --------------------------------
-- Saklanan enum: draft · published · expired · archived (değişmedi).
-- 'active' ve 'closing_soon' SAKLANMIYOR: ikisi de son tarihe göre her
-- sorguda değişen türetilmiş hâller. Saklansalardı her gece bir iş
-- 'active'i 'closing_soon'a çevirmek zorunda kalır ve o iş gecikince
-- etiket yalan olurdu. `firsat_durum()` bunları tarihten hesaplıyor;
-- arayüz 'published'ı "aktif" olarak okuyor.
--
-- 'expired' ise SAKLANIYOR ve `firsat_suresi_dolanlari_kapat()` ile
-- tarihten geçen kayıtları gerçekten o duruma taşıyor — arşiv görünümü
-- ve yönetim ekranı doğru sayı görsün diye.

/* ================================================================== */
/*  1) YENİ TÜRLER                                                     */
/* ================================================================== */

/*
  Enum değeri eklemek işlem içinde yapılabiliyor ama yeni değer AYNI
  işlemde kullanılamıyor. Bu yüzden aşağıdaki fonksiyonlar enum
  sabitiyle değil `::text` karşılaştırmasıyla yazıldı.
*/
alter type public.opportunity_type add value if not exists 'hackathon';
alter type public.opportunity_type add value if not exists 'teknofest';
alter type public.opportunity_type add value if not exists 'career_day';
alter type public.opportunity_type add value if not exists 'career_fair';

/* ================================================================== */
/*  2) ETKİNLİK VE ŞART ALANLARI                                       */
/* ================================================================== */

alter table public.opportunities
  add column if not exists event_mode        text
    check (event_mode is null or event_mode in ('in_person', 'online', 'hybrid')),
  add column if not exists starts_at         timestamptz,
  add column if not exists ends_at           timestamptz,
  add column if not exists venue_name        text,
  add column if not exists academic_year     text
    check (academic_year is null or academic_year ~ '^20[0-9]{2}(-20[0-9]{2})?$'),
  add column if not exists age_min           smallint check (age_min is null or age_min between 14 and 99),
  add column if not exists age_max           smallint check (age_max is null or age_max between 14 and 99),
  add column if not exists income_requirement text,
  /* Kaynak sağlığı — ilan tarafındaki 20260905020000 kalıbının aynısı. */
  add column if not exists source_checked_at   timestamptz,
  add column if not exists source_status       text
    check (source_status is null or source_status in ('ok', 'transient_error', 'closed', 'moved')),
  add column if not exists source_failure_count integer not null default 0
    check (source_failure_count >= 0);

alter table public.opportunities drop constraint if exists opportunities_etkinlik_araligi;
alter table public.opportunities
  add constraint opportunities_etkinlik_araligi
    check (ends_at is null or starts_at is null or ends_at >= starts_at);

alter table public.opportunities drop constraint if exists opportunities_yas_araligi;
alter table public.opportunities
  add constraint opportunities_yas_araligi
    check (age_min is null or age_max is null or age_max >= age_min);

comment on column public.opportunities.event_mode is
  'Kariyer etkinlikleri için: in_person | online | hybrid. Burs/program için NULL.';
comment on column public.opportunities.source_status is
  'Son kaynak kontrolünün sonucu. transient_error kapanma DEĞİL; closed/moved üst üste gelince expired.';

create index if not exists opportunities_yayin_son_tarih_idx
  on public.opportunities (application_deadline)
  where status = 'published';

/* ================================================================== */
/*  3) KATEGORİ — TEK YERDE                                            */
/* ================================================================== */

/**
 * Tür → kategori şeridi.
 *
 *   burslar               scholarship · kyk · student_support
 *   programlar            education · youth_program · international
 *   yarismalar            competition · hackathon · teknofest
 *   kariyer-etkinlikleri  career_day · career_fair
 *
 * KYK ayrı kategori DEĞİL: Burslar'ın içinde kurum süzgeci. Kategori
 * burada tanımlı ki arayüz, yönetim ve raporlar aynı listeyi okusun.
 */
create or replace function public.firsat_kategori(tur public.opportunity_type)
returns text
language sql
immutable
set search_path = public
as $$
  select case tur::text
    when 'scholarship'     then 'burslar'
    when 'kyk'             then 'burslar'
    when 'student_support' then 'burslar'
    when 'education'       then 'programlar'
    when 'youth_program'   then 'programlar'
    when 'international'   then 'programlar'
    when 'competition'     then 'yarismalar'
    when 'hackathon'       then 'yarismalar'
    when 'teknofest'       then 'yarismalar'
    when 'career_day'      then 'kariyer-etkinlikleri'
    when 'career_fair'     then 'kariyer-etkinlikleri'
    else 'programlar'
  end
$$;

/* ================================================================== */
/*  4) TÜRETİLEN DURUM                                                 */
/* ================================================================== */

/**
 * Saklanan durum + son tarih → gösterilen durum.
 *
 *   draft / archived / expired  → olduğu gibi
 *   published, tarih geçmiş     → expired   (iş henüz koşmadıysa bile)
 *   published, 3 gün ve altı    → closing_soon
 *   published, aksi             → active
 *
 * "Son 3 gün" eşiği burada; arayüzde ayrıca hesaplanmıyor.
 */
create or replace function public.firsat_durum(
  saklanan public.opportunity_status,
  son_tarih timestamptz,
  simdi timestamptz default now()
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when saklanan <> 'published' then saklanan::text
    when son_tarih is not null and son_tarih < simdi then 'expired'
    when son_tarih is not null and son_tarih < simdi + interval '3 days' then 'closing_soon'
    else 'active'
  end
$$;

/* ================================================================== */
/*  5) SÜRESİ DOLANLARI KAPATMA — İDEMPOTENT                           */
/* ================================================================== */

/**
 * Son tarihi geçmiş yayındaki kayıtları 'expired' yapar.
 *
 * Bir günlük pay var: son tarih "23:59"a kadar geçerli sayılır ve saat
 * dilimi farkı yüzünden gün bitmeden kapanmasın. RLS zaten tarihi geçeni
 * halka göstermiyor; bu iş durumu GERÇEĞE çekiyor ki arşiv ve yönetim
 * doğru saysın. Kaç satır değiştiğini döndürüyor.
 *
 * Yalnız service_role çağırabiliyor: otomasyon iş akışı (üç günde bir
 * kaynak kontrolüyle aynı koşuda) bunu RPC ile tetikliyor.
 */
create or replace function public.firsat_suresi_dolanlari_kapat()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  degisen integer;
begin
  update public.opportunities
     set status = 'expired', updated_at = now()
   where status = 'published'
     and application_deadline is not null
     and application_deadline < now() - interval '1 day';
  get diagnostics degisen = row_count;
  return degisen;
end;
$$;

revoke all on function public.firsat_suresi_dolanlari_kapat() from public, anon, authenticated;
grant execute on function public.firsat_suresi_dolanlari_kapat() to service_role;

/* İlk koşu: canlıda ölçülen 8 kayıt gerçek durumuna geçiyor. */
select public.firsat_suresi_dolanlari_kapat();

/* ================================================================== */
/*  6) ARŞİV GÖRÜNÜMÜ: SÜRESİ DOLANLAR OKUNABİLİR                      */
/* ================================================================== */

/*
  Eski politika yalnız `published + tarih geçmemiş`i açıyordu; süresi
  dolanları "ayrı arşiv görünümünde inceleme" isteği için 'expired'
  satırlar da okunabilir oluyor. Ana liste tarihi kendi süzüyor; arşiv
  görünümü `status = expired` istiyor. draft ve archived yine kapalı.
*/
drop policy if exists "yayindaki aktif firsatlar herkese acik" on public.opportunities;
create policy "yayindaki ve suresi dolan firsatlar okunur" on public.opportunities
  for select using (
    (status = 'published' and (application_deadline is null or application_deadline >= now() - interval '1 day'))
    or status = 'expired'
  );

revoke all on function public.firsat_kategori(public.opportunity_type)                              from public;
revoke all on function public.firsat_durum(public.opportunity_status, timestamptz, timestamptz)      from public;
grant execute on function public.firsat_kategori(public.opportunity_type)                            to anon, authenticated;
grant execute on function public.firsat_durum(public.opportunity_status, timestamptz, timestamptz)   to anon, authenticated;
