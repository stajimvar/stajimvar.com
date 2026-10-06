-- SADE AKIŞ: KALDIRILAN İŞLEMLER SUNUCUDA DA KAPALI
--
-- AÇIK
-- ----
-- 20261202 ile görüşme daveti, teklif ve değerlendirme aşamasına geçiş
-- şirket EKRANINDAN kaldırıldı. Ama `applications` UPDATE politikası
-- doğrulanmış şirketin Owner/Recruiter üyesine satırın her sütununu
-- yazdırıyordu: aynı üye API'ye doğrudan istek atarak adayı hâlâ
-- "Görüşme"ye ya da "Teklif"e taşıyabiliyor, davet ve teklif alanlarını
-- doldurabiliyordu. Ekranda kaldırıp sunucuda açık bırakmak, kuralı hiç
-- koymamaktı.
--
-- KURAL
-- -----
-- Şirket tarafı (öğrencinin kendisi olmayan, yönetici olmayan oturum):
--   - durumu `technical_assessment`, `interview_scheduled` ya da
--     `offer_extended` durumuna TAŞIYAMAZ;
--   - görüşme daveti alanlarını (tarih, saat, tür, yer, not) ve görüşme
--     yanıtını DEĞİŞTİREMEZ;
--   - teklif alanlarını (not, başlangıç, ücret) DEĞİŞTİREMEZ.
--
-- KORUNANLAR
-- ----------
-- * Eski kayıtlar: hiçbir satıra dokunulmuyor; okunmaya devam ediyor.
-- * Eski aşamadan ÇIKIŞ serbest: şirket "Görüşme" ya da "Teklif"teki eski
--   bir başvuruyu "İnceleniyor" ya da "Olumsuz"a alabilir (alanlara
--   dokunmadan).
-- * ÖĞRENCİ: açık teklife (`teklife_yanit_ver`) ve açık davete
--   (`gorusmeye_yanit_ver`) yanıt vermeye, başvurusunu geri çekmeye devam
--   ediyor. Oturum öğrencinin kendisiyse bu kural devreye girmiyor; onun
--   hamlelerini kendi kuralları koruyor (20260914020000 ve sonrası).
-- * Servis rolü ve yönetici: bakım ve geçmiş kaydı düzeltmeleri için
--   serbest (`auth.uid()` boş ya da `is_admin()`).

create or replace function public.sade_akis_korumasi()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_aktor uuid := auth.uid();
begin
  /* Servis/bakım ve yönetici. */
  if v_aktor is null or public.is_admin() then
    return new;
  end if;

  /* Öğrencinin kendi hamleleri (yanıt, geri çekme) bu kuralın dışında. */
  if v_aktor = new.student_id then
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status::text in ('technical_assessment', 'interview_scheduled', 'offer_extended') then
    raise exception 'Bu aşama sade başvuru akışında kaldırıldı.'
      using errcode = '42501', detail = 'sade-akis-asama';
  end if;

  if (new.interview_date, new.interview_time, new.interview_type,
      new.interview_location, new.interview_note, new.interview_response)
     is distinct from
     (old.interview_date, old.interview_time, old.interview_type,
      old.interview_location, old.interview_note, old.interview_response) then
    raise exception 'Görüşme daveti sade başvuru akışında kaldırıldı.'
      using errcode = '42501', detail = 'sade-akis-gorusme';
  end if;

  if (new.offer_note, new.offer_start_date, new.offer_compensation)
     is distinct from
     (old.offer_note, old.offer_start_date, old.offer_compensation) then
    raise exception 'Teklif gönderme sade başvuru akışında kaldırıldı.'
      using errcode = '42501', detail = 'sade-akis-teklif';
  end if;

  return new;
end;
$$;

revoke all on function public.sade_akis_korumasi() from public, anon, authenticated;

drop trigger if exists applications_sade_akis_korumasi on public.applications;
create trigger applications_sade_akis_korumasi
  before update on public.applications
  for each row execute function public.sade_akis_korumasi();

comment on function public.sade_akis_korumasi() is
  'Şirket tarafı görüşme/teklif/değerlendirme aşamasına geçemez ve davet/teklif alanlarını yazamaz. Öğrenci yanıtları, eski aşamadan çıkış, servis rolü ve yönetici serbest.';
