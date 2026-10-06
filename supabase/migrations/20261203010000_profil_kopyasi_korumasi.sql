-- PROFİL KOPYASI SUNUCUDA DA KAPANIYOR
--
-- ÖLÇÜLEN AÇIK (6 Ekim 2026, üretim)
-- ---------------------------------
-- `authenticated` rolünün `applications` üzerinde TABLO düzeyinde SELECT
-- yetkisi var; `profile_snapshot` sütunu da buna dahil. Öğrenci paylaşımı
-- kapattığında şirket ekranı kopyayı gizliyordu (`kartVerisi`) ama
-- doğrulanmış şirketin bir üyesi aynı satırı API'den doğrudan okuyup
-- kopyayı alabiliyordu. Öğrenciye "kapalı" dediğimiz şey sunucuda açıktı.
--
-- ÇÖZÜM: KOPYA AYRI, KORUMALI TABLODA
-- -----------------------------------
-- `basvuru_profil_kopyalari` (başvuru başına bir satır). RLS:
--   - öğrenci kendi kopyasını okur;
--   - şirket üyesi YALNIZ şirket doğrulanmışsa VE paylaşım ETKİNSE okur
--     (`basvuru_iletisimi_acik`: rıza + StajımVar üzerinden başvuru ya da
--     sade sürümle verilmiş rıza). Viewer da okur — profil Viewer'a açık,
--     iletişim değil (o `basvuru_iletisimi` içinde).
-- Paylaşım kapatılınca politika satırı hemen gizliyor; açılınca aynı
-- kopya geri geliyor. Kopya SİLİNMİYOR: başvuru anının kaydı korunuyor,
-- yalnız erişim kapanıyor.
--
-- NEDEN SÜTUN YETKİSİ DEĞİL: tablo düzeyindeki SELECT'i kaldırıp sütun
-- sütun vermek, `select('*')` kullanan her istemci yolunu (öğrencinin
-- başvuru listesi, eski şirket portalı) "permission denied" ile kırardı.
-- Ayrı tablo, var olan okuma yollarını bozmadan kopyayı satır düzeyinde
-- koruyor.
--
-- SÜTUN NEDEN DURUYOR: istemci başvuruyu yazarken kopyayı hâlâ
-- `applications.profile_snapshot` ile gönderiyor ve iletişim temizliği
-- (`guard_profile_snapshot_contact`) orada çalışıyor. Bir tetikleyici
-- temizlenmiş kopyayı korumalı tabloya taşıyıp sütunu BOŞALTIYOR. Sütun
-- yalnız bir gelen kutusu; işlem tamamlandığında hep boş.
--
-- KAPSAMDA OLANLAR (paylaşım kapanınca şirkete kapanır)
--   profil kopyası · güncel profil · güncel yetenekler (aşağıda)
--   telefon/e-posta (20261201010000)
--   bildirim metnindeki ad
-- KAPSAMDA OLMAYANLAR (başvurunun temel kaydı, KORUNUR)
--   başvuru satırı, durum, tarihler, ön yazı, CV kopyası, süreç geçmişi
--   (görüşme/teklif kayıtları), sorumlu ataması. CV başvurunun eki; içinde
--   iletişim bilgisi olabilir ve öğrenciye bu açıkça yazıyor.

/* ================================================================== */
/*  1) KORUMALI TABLO                                                  */
/* ================================================================== */

create table if not exists public.basvuru_profil_kopyalari (
  basvuru_id  uuid primary key references public.applications(id) on delete cascade,
  kopya       jsonb not null,
  created_at  timestamptz not null default now()
);

comment on table public.basvuru_profil_kopyalari is
  'Başvuru anındaki profil kopyası. Şirket yalnız paylaşım etkinken okur (basvuru_iletisimi_acik).';

alter table public.basvuru_profil_kopyalari enable row level security;

revoke all on public.basvuru_profil_kopyalari from public, anon, authenticated;
grant select on public.basvuru_profil_kopyalari to authenticated;

drop policy if exists "ogrenci kendi kopyasini gorur" on public.basvuru_profil_kopyalari;
create policy "ogrenci kendi kopyasini gorur" on public.basvuru_profil_kopyalari
  for select to authenticated
  using (
    exists (select 1 from public.applications a
             where a.id = basvuru_profil_kopyalari.basvuru_id
               and a.student_id = auth.uid())
  );

drop policy if exists "sirket paylasim etkinken kopyayi gorur" on public.basvuru_profil_kopyalari;
create policy "sirket paylasim etkinken kopyayi gorur" on public.basvuru_profil_kopyalari
  for select to authenticated
  using (
    exists (select 1 from public.applications a
              join public.listings l on l.id = a.listing_id
             where a.id = basvuru_profil_kopyalari.basvuru_id
               and public.sirket_adaylarini_gorebilir(l.company_id)
               and public.basvuru_iletisimi_acik(a.id))
  );

/* ================================================================== */
/*  2) VAR OLAN KOPYALAR TAŞINIYOR                                     */
/* ================================================================== */
--
-- `t5` (touch_updated_at) bu boşaltma sırasında KAPALI: kopyayı başka
-- tabloya taşımak başvurunun güncellenmesi değil; `updated_at`i
-- tazelemek "yeni bir işlem oldu" izlenimi verirdi.

insert into public.basvuru_profil_kopyalari (basvuru_id, kopya)
select a.id, a.profile_snapshot
  from public.applications a
 where a.profile_snapshot is not null
on conflict (basvuru_id) do nothing;

alter table public.applications disable trigger t5;
update public.applications set profile_snapshot = null where profile_snapshot is not null;
alter table public.applications enable trigger t5;

/* ================================================================== */
/*  3) YENİ KOPYALAR YAZILDIĞI AN TAŞINIYOR                            */
/* ================================================================== */
--
-- AFTER tetikleyici: BEFORE'daki iletişim temizliği bitmiş, satır var.
-- İç UPDATE sütunu boşaltıyor; WHEN koşulu boş sütunda tetiklenmediği
-- için kendini yeniden çağırmıyor.
create or replace function public.profil_kopyasini_tasi()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.basvuru_profil_kopyalari (basvuru_id, kopya)
  values (new.id, new.profile_snapshot)
  on conflict (basvuru_id) do update set kopya = excluded.kopya;

  update public.applications set profile_snapshot = null where id = new.id;
  return null;
end;
$$;

revoke all on function public.profil_kopyasini_tasi() from public, anon, authenticated;

drop trigger if exists applications_profil_kopyasini_tasi on public.applications;
create trigger applications_profil_kopyasini_tasi
  after insert or update of profile_snapshot on public.applications
  for each row
  when (new.profile_snapshot is not null)
  execute function public.profil_kopyasini_tasi();

/* ================================================================== */
/*  4) GÜNCEL PROFİL VE YETENEKLER AYNI KAPIDAN                        */
/* ================================================================== */
--
-- 20261121010000'deki gövdeler BİREBİR korunuyor; değişen tek şey kapı:
-- rıza damgasının varlığı yerine etkin paylaşım.

create or replace function public.basvuru_aday_guncel_profili(p_basvuru uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ogrenci uuid;
  riza    timestamptz;
begin
  if not sosyal_gizli.basvuru_sirketi_mi(p_basvuru) then
    raise exception 'Bu basvuruyu goremezsin' using errcode = '42501';
  end if;

  select a.student_id, a.contact_share_consent_at into ogrenci, riza
    from public.applications a where a.id = p_basvuru;

  /*
    KAPI ETKİN PAYLAŞIM (20261203010000): rıza damgasının varlığı
    yetmiyor; sade akıştaki kural (`basvuru_iletisimi_acik`) soruluyor.
    Öğrenciye gösterilen paylaşım açıklamasıyla aynı cümle.
  */
  if not public.basvuru_iletisimi_acik(p_basvuru) then
    return jsonb_build_object('riza', false);
  end if;

  return jsonb_build_object(
    'riza', true,
    'guncel', (
      select jsonb_build_object(
        'ad',         nullif(btrim(pr.full_name), ''),
        /* Eski kayıtlarda avatar_url gömülü veri (data:) olabiliyor; yalnız HTTPS adres. */
        'fotoUrl',    case when pr.avatar_url ~ '^https://' then pr.avatar_url end,
        'universite', nullif(btrim(sp.university), ''),
        'bolum',      nullif(btrim(sp.department), ''),
        'sinif',      sp.grade_level::text,
        'sehir',      nullif(btrim(sp.pref_cities[1]), ''),
        'github',     nullif(btrim(sp.github_username), ''),
        'portfolyo',  nullif(btrim(sp.portfolio_url), ''),
        'linkedin',   nullif(btrim(sp.linkedin_url), ''),
        'rozetler',   coalesce(to_jsonb(sp.earned_badges), '[]'::jsonb),
        'yetenekler', coalesce((
            select jsonb_agg(s.name order by s.name)
              from public.student_skills s
             where s.student_id = ogrenci and btrim(coalesce(s.name, '')) <> ''), '[]'::jsonb),
        'diller', coalesce((
            select jsonb_agg(case when nullif(btrim(d.level), '') is null then d.language
                                  else d.language || ' (' || d.level || ')' end
                             order by d.language)
              from public.student_languages d
             where d.student_id = ogrenci and btrim(coalesce(d.language, '')) <> ''), '[]'::jsonb),
        'projeler', coalesce((
            select jsonb_agg(jsonb_build_object(
                     'baslik',   p.title,
                     'aciklama', nullif(btrim(p.description), ''),
                     'adres',    coalesce(nullif(btrim(p.live_url), ''), nullif(btrim(p.github_url), '')))
                   order by p.sort_order nulls last, p.created_at)
              from public.student_projects p
             where p.student_id = ogrenci and btrim(coalesce(p.title, '')) <> ''), '[]'::jsonb),
        'guncellendi', sp.updated_at
      )
      from public.profiles pr
      left join public.student_profiles sp on sp.id = pr.id
      where pr.id = ogrenci
    )
  );
end;
$$;

create or replace function public.basvuru_aday_yetenekleri(p_basvuru uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ogrenci uuid;
  riza    timestamptz;
begin
  if not sosyal_gizli.basvuru_sirketi_mi(p_basvuru) then
    raise exception 'Bu basvuruyu goremezsin' using errcode = '42501';
  end if;
  select a.student_id, a.contact_share_consent_at into ogrenci, riza
    from public.applications a where a.id = p_basvuru;
  /* KAPI ETKİN PAYLAŞIM (20261203010000), güncel profille aynı. */
  if not public.basvuru_iletisimi_acik(p_basvuru) then
    return '{}'::text[];
  end if;
  return coalesce((
    select array_agg(s.name order by s.name)
      from public.student_skills s
     where s.student_id = ogrenci and btrim(coalesce(s.name, '')) <> ''), '{}'::text[]);
end;
$$;

/* ================================================================== */
/*  5) BİLDİRİMDEKİ AD                                                 */
/* ================================================================== */
--
-- 20261117010000'deki gövde BİREBİR korunuyor; değişen tek şey adın
-- nereden ve hangi koşulla okunduğu.

create or replace function public.basvuru_bildirimleri()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ilan        text;
  v_sirket      text;
  v_dogrulanmis boolean;
  v_aday        text;
  v_aktor       uuid := auth.uid();
begin
  select l.title, c.name, c.verified
    into v_ilan, v_sirket, v_dogrulanmis
    from public.listings l
    join public.companies c on c.id = l.company_id
   where l.id = new.listing_id;

  /*
    Adayın adı KOPYADAN geliyor, `profiles` tablosundan değil: şirket o
    tabloyu okuyamıyor ve bildirim metni bu sınırı delmemeli. Rıza
    verilmediyse kopya da yok — o zaman ad yerine "Bir aday".

    Doğrulanmamış şirket başvuruların KENDİSİNİ okuyamıyor (RLS); adı
    bildirimden okuması o kapıyı delmek olurdu. Orada da "Bir aday".
  */
  /*
    ADAYIN ADI YALNIZ PAYLAŞIM ETKİNKEN (20261203010000)

    Kopya artık korumalı tabloda (`basvuru_profil_kopyalari`); başvuru
    satırındaki sütun yazıldıktan hemen sonra boşaltılıyor. INSERT anında
    ad hâlâ NEW'de, sonraki güncellemelerde korumalı tablodan okunuyor.
    Öğrenci paylaşımı kapattıysa bildirim metni de adı taşımıyor.
  */
  v_aday := 'Bir aday';
  if coalesce(v_dogrulanmis, false) and public.basvuru_iletisimi_acik(new.id) then
    v_aday := coalesce(
      nullif(btrim(new.profile_snapshot ->> 'ad'), ''),
      nullif(btrim((select k.kopya ->> 'ad' from public.basvuru_profil_kopyalari k
                     where k.basvuru_id = new.id)), ''),
      'Bir aday');
  end if;

  -- ------------------------------------------------- YENİ BAŞVURU
  if tg_op = 'INSERT' then
    perform public.bildir_sirkete(
      new.id, 'yeni_basvuru', 'Yeni başvuru',
      v_aday || ' · ' || coalesce(v_ilan, 'ilanınız'),
      v_aktor);
    return new;
  end if;

  -- --------------------------------------------------- DURUM DEĞİŞTİ
  if new.status is distinct from old.status then
    if new.status = 'under_review' then
      perform public.bildir_ogrenciye(
        new.id, 'inceleniyor', 'Başvurun inceleniyor',
        coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
        ' başvurunu incelemeye aldı.', v_aktor);

    elsif new.status = 'technical_assessment' then
      perform public.bildir_ogrenciye(
        new.id, 'degerlendirme', 'Başvurun değerlendirme aşamasında',
        coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
        ' başvurun değerlendiriliyor.', v_aktor);

    elsif new.status = 'interview_scheduled' then
      perform public.bildir_ogrenciye(
        new.id, 'gorusme_daveti', 'Görüşme daveti aldın',
        coalesce(v_sirket, 'Şirket') || ' seni ' || coalesce(v_ilan, 'staj') ||
        ' pozisyonu için görüşmeye davet etti.', v_aktor);

    elsif new.status = 'offer_extended' then
      perform public.bildir_ogrenciye(
        new.id, 'teklif', 'Teklif aldın',
        coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
        ' pozisyonu için teklif gönderdi.', v_aktor);

    elsif new.status = 'rejected' then
      perform public.bildir_ogrenciye(
        new.id, 'olumsuz', 'Başvurun sonuçlandı',
        coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
        ' başvurun bu süreçte ilerlemedi.', v_aktor);

    elsif new.status = 'offer_accepted' then
      perform public.bildir_sirkete(
        new.id, 'teklif_kabul', v_aday || ' teklifini kabul etti',
        coalesce(v_ilan, 'İlan') || ' · iletişim bilgileri artık açık.', v_aktor);

    elsif new.status = 'offer_declined' then
      perform public.bildir_sirkete(
        new.id, 'teklif_ret', v_aday || ' teklifi reddetti',
        coalesce(v_ilan, 'İlan'), v_aktor);

    elsif new.status = 'withdrawn' then
      perform public.bildir_sirkete(
        new.id, 'geri_cekildi', v_aday || ' başvurusunu geri çekti',
        coalesce(v_ilan, 'İlan'), v_aktor);
    end if;

    return new;
  end if;

  -- ------------------------------------------- GÖRÜŞME YANITI GELDİ
  if new.interview_response is distinct from old.interview_response
     and new.interview_response is not null then
    if new.interview_response = 'accepted' then
      perform public.bildir_sirkete(
        new.id, 'gorusme_kabul', v_aday || ' görüşme davetini kabul etti',
        coalesce(v_ilan, 'İlan'), v_aktor);
    else
      perform public.bildir_sirkete(
        new.id, 'gorusme_ret', v_aday || ' görüşme davetine katılamayacak',
        coalesce(v_ilan, 'İlan'), v_aktor);
    end if;
    return new;
  end if;

  -- ------------------------------------------ GÖRÜŞME DAVETİ GÜNCELLENDİ
  if new.status = 'interview_scheduled'
     and (
       new.interview_date     is distinct from old.interview_date or
       new.interview_time     is distinct from old.interview_time or
       new.interview_type     is distinct from old.interview_type or
       new.interview_location is distinct from old.interview_location or
       new.interview_note     is distinct from old.interview_note
     )
  then
    perform public.bildir_ogrenciye(
      new.id, 'gorusme_guncellendi', 'Görüşme davetin güncellendi',
      coalesce(v_sirket, 'Şirket') || ' · ' || coalesce(v_ilan, 'staj') ||
      ' görüşme bilgileri değişti.', v_aktor);
  end if;

  return new;
end;
$function$;
