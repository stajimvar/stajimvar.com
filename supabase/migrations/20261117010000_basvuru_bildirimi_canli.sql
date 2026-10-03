-- ŞİRKETE BAŞVURU BİLDİRİMİ: YALNIZ İLETİLEN BAŞVURU, ADSIZ KAPI, ANINDA
--
-- Uçtan uca denetimde (4 Ekim 2026) ölçülen üç sorun. Canlıdaki fonksiyon
-- tanımları okunarak yazıldı; değişen yalnız aşağıda anlatılan satırlar.
--
-- 1) DIŞ BAŞVURU DA "YENİ BAŞVURU" DİYE ŞİRKETE GİDEBİLİYORDU
-- ----------------------------------------------------------
-- `basvuru_bildirimleri` her INSERT'te `bildir_sirkete` çağırıyor,
-- `bildir_sirkete` de yöntemi sormuyordu. Şirkete İLETİLEN tek başvuru
-- `internal` (`lib/basvuru-yolu.mjs`: `external` öğrencinin kendi takibi,
-- `email_application` teslimi kapalı). Bugün dış ilanların şirket üyesi
-- olmadığı için sorun canlıda görünmüyordu (4 dış başvuru, 0 bildirim);
-- üyesi olan bir şirketin dış ilanında "Yeni başvuru" yazacaktı. Kural
-- tek yerde, `bildir_sirkete` içinde: durum değişikliği bildirimleri
-- (geri çekme, teklif yanıtı) de aynı süzgeçten geçiyor.
--
-- 2) DOĞRULANMAMIŞ ŞİRKETE ADAYIN ADI BİLDİRİMLE GİDİYORDU
-- --------------------------------------------------------
-- İlan yayını yönetici onayına bağlı (20261008010000), şirketin
-- doğrulanmış olmasına değil: doğrulanmamış şirketin de `internal`
-- ilanı yayında olabiliyor. Başvuruları okuma politikası
-- ("dogrulanmis sirket basvurulari gorur") o şirkete satır vermiyor —
-- panel "adayların kim olduğu doğrulama sonrası açılıyor" diyor — ama
-- bildirim metni `profile_snapshot ->> 'ad'` ile adayın adını taşıyordu.
-- Kimlik kapısı bildirimden deliniyordu. Doğrulanmamış şirkette ad
-- yerine "Bir aday"; bildirim yine gidiyor (şirket başvuru geldiğini
-- bilmeli), kimlik gitmiyor.
--
-- 3) AÇIK PANELDE BİLDİRİM ANINDA GÖRÜNMÜYORDU
-- --------------------------------------------
-- Bildirim satırı INSERT anında yazılıyordu (ölçüldü: 1 Ekim'deki
-- `internal` başvurunun bildirimi var; Ağustos sonundaki iki başvuru
-- bildirim tetikleyicisinden — 20260913010000 — önce). Ama `notifications`
-- `supabase_realtime` yayınında değildi; istemci yalnız oturum açılışında
-- ve panel açılınca okuyordu. Tablo yayına ekleniyor. Olaylar abonenin
-- RLS'inden geçiyor ("kendi bildirimlerini okur": recipient_id =
-- auth.uid()), yani kimse başkasının bildirim olayını almıyor.
--
-- BU GÖÇ VERİYE DOKUNMUYOR: mevcut bildirimler ve başvurular olduğu gibi.

/* ================================================================== */
/*  1) bildir_sirkete — yalnız şirkete İLETİLEN (internal) başvuru     */
/* ================================================================== */

create or replace function public.bildir_sirkete(p_basvuru uuid, p_tur text, p_baslik text, p_govde text, p_aktor uuid)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  insert into public.notifications (recipient_id, type, title, body, target_url, application_id)
  select m.user_id, p_tur, p_baslik, p_govde,
         '/sirket/basvuranlar?aday=' || p_basvuru::text, p_basvuru
    from public.applications a
    join public.listings l on l.id = a.listing_id
    join public.company_members m on m.company_id = l.company_id
   where a.id = p_basvuru
     and a.application_method = 'internal'
     and m.user_id is distinct from p_aktor;
$function$;

/* ================================================================== */
/*  2) basvuru_bildirimleri — doğrulanmamış şirkete aday adı gitmiyor  */
/* ================================================================== */

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
  v_aday := case
    when coalesce(v_dogrulanmis, false) then coalesce(nullif(new.profile_snapshot ->> 'ad', ''), 'Bir aday')
    else 'Bir aday'
  end;

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

/* ================================================================== */
/*  3) ANINDA GÖRÜNME — notifications Realtime yayınında               */
/* ================================================================== */

/*
  Olaylar abonenin RLS'inden geçiyor: "kendi bildirimlerini okur"
  (recipient_id = auth.uid()). İstemci ek olarak `recipient_id=eq.<kendisi>`
  süzgeci veriyor; o yalnız trafiği azaltıyor, güvenlik RLS'te.
  Yayın yoksa (yerel kurulum) sessizce geçiliyor.
*/
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
