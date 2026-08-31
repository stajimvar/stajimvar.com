-- GÖRÜŞME DAVETİ ≠ TEKLİF
--
-- ÖLÇÜM (üretim şeması, 31 Ağustos 2026)
-- --------------------------------------
-- `interview_scheduled` durumu vardı ama içi boştu: yanında yalnızca
-- `interview_date` duruyordu ve o da opsiyoneldi. Şirket adayı bu
-- aşamaya aldığında öğrenci yalnız bir rozet görüyordu; görüşmenin
-- saati, biçimi, yeri ve öğrencinin katılıp katılamayacağı hiçbir yerde
-- yoktu.
--
-- Bu yüzden akış pratikte görüşmeyi ATLIYORDU: şirketin öğrenciye
-- söyleyebildiği ilk somut şey `offer_extended` oluyordu. Oysa gerçek
-- işe alımda ücret, başlangıç ve çalışma koşulları görüşmede
-- netleşiyor. Görüşme yapılmadan "Teklif aldın" demek yanlış.
--
-- YENİ DURUM DEĞERİ EKLENMEDİ
-- ---------------------------
-- `interview_scheduled` görüşme aşamasının canonical durumu OLARAK
-- KALIYOR. Öğrencinin davete verdiği yanıt ayrı bir alanda duruyor:
-- durumun kendisi değil, durumun İÇİNDEKİ bir olgu. Bunun için üç yeni
-- enum değeri açmak (davet gönderildi / kabul edildi / reddedildi)
-- durum makinesini şişirir ve her süzgeç, politika ve rozet haritasının
-- üçünü birden bilmesini gerektirirdi.
alter table public.applications
  -- Saat ayrı: `interview_date` bir `date` ve tipini değiştirmek
  -- geçmiş kayıtları riske atardı.
  add column if not exists interview_time     time,
  add column if not exists interview_type     text,
  -- TEK ALAN: adres de bağlantı da buraya yazılıyor. Çevrimiçi görüşmede
  -- bağlantı, yüz yüze görüşmede adres; ikisi aynı sorunun cevabı
  -- ("nereye geleceğim") ve iki ayrı kolonda tutmak birinin boş, ötekinin
  -- dolu olduğu belirsiz durumlar üretirdi.
  add column if not exists interview_location text,
  add column if not exists interview_note     text,
  -- Öğrencinin davete yanıtı. NULL = henüz yanıtlamadı.
  add column if not exists interview_response text,
  add column if not exists interview_responded_at timestamptz,
  -- GERÇEK TEKLİFTE ÜCRET
  --
  -- Serbest metin, çünkü ilandaki karşılığı da serbest metin
  -- (`listings.stipend_amount_text`): "Asgari staj ücreti", "18.000 TL /
  -- ay", "Ücret görüşmede belirlendi". Aynı bilgiyi bir yerde yapısal,
  -- başka yerde metin tutmak ikisini karşılaştırılamaz yapardı. Bordro
  -- ya da maaş hesabı YOK.
  add column if not exists offer_compensation text;

-- Uydurma değer girmesin: üç görüşme biçimi ve iki yanıt.
alter table public.applications
  drop constraint if exists applications_interview_type_check;
alter table public.applications
  add constraint applications_interview_type_check
  check (interview_type is null or interview_type in ('in_person', 'online', 'phone'));

alter table public.applications
  drop constraint if exists applications_interview_response_check;
alter table public.applications
  add constraint applications_interview_response_check
  check (interview_response is null or interview_response in ('accepted', 'declined'));

comment on column public.applications.interview_response is
  'Öğrencinin görüşme davetine yanıtı. Şirket bu alanı yazamıyor: kapı public.gorusmeye_yanit_ver.';
comment on column public.applications.offer_compensation is
  'Gerçek teklifteki ücret metni. Boşsa ilandaki ücret bilgisi geçerli.';

-- ---------------------------------------------------------------------
-- ŞİRKET, ÖĞRENCİNİN GÖRÜŞME YANITINI YAZAMAZ
-- ---------------------------------------------------------------------
-- Durum değerlerinde olduğu gibi: daveti şirket gönderiyor, yanıtı
-- öğrenci veriyor. Politikanın WITH CHECK ifadesi bunu satır düzeyinde
-- söyleyemez (yanıtın ESKİ değerini görmesi gerekir), bu yüzden
-- tetikleyiciyle korunuyor.
create or replace function public.guard_interview_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Yanıt değişmiyorsa söylenecek bir şey yok.
  if new.interview_response is not distinct from old.interview_response then
    return new;
  end if;

  -- Başvuran öğrencinin kendisi: işlev üzerinden geliyor, serbest.
  if auth.uid() = old.student_id then
    return new;
  end if;

  -- YENİ DAVET: şirket yanıtı TEMİZLEYEBİLİYOR.
  --
  -- Öğrenci katılamayacağını söyledikten sonra şirket başka bir tarih
  -- önerebilmeli. Yeni davet, eski yanıtı boşaltıp saat/yer alanlarını
  -- yeniden yazmak demek. Şirketin yazabildiği tek yanıt değeri NULL:
  -- öğrencinin yerine "katılacak" ya da "katılamayacak" diyemiyor.
  if new.interview_response is null
     and exists (
       select 1 from public.listings l
       where l.id = new.listing_id
         and public.is_company_member(l.company_id)
         and public.sirket_dogrulandi(l.company_id)
     )
  then
    return new;
  end if;

  -- service_role bakım için yazabiliyor; başka herkes reddediliyor.
  if coalesce(
       (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::json ->> 'role'),
       ''
     ) = 'service_role'
  then
    return new;
  end if;

  raise exception 'Görüşme yanıtını yalnızca başvuran öğrenci verebilir.'
    using errcode = '42501';
end;
$$;

revoke execute on function public.guard_interview_response() from public, anon, authenticated;

drop trigger if exists applications_guard_interview_response on public.applications;
create trigger applications_guard_interview_response
  before update on public.applications
  for each row execute function public.guard_interview_response();

-- ---------------------------------------------------------------------
-- GÖRÜŞME DAVETİNE YANIT — TEK KAPI
-- ---------------------------------------------------------------------
-- `teklife_yanit_ver` ile aynı biçim: satır kilitleniyor, O ANKİ durum
-- okunuyor, ikinci yanıt hata değil mevcut sonuç.
--
-- Öğrencinin kendi güncelleme politikası sonucun `withdrawn` olmasını
-- şart koştuğu için bu yazımı doğrudan yapması zaten mümkün değil.
create or replace function public.gorusmeye_yanit_ver(p_basvuru uuid, p_katilacak boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ogrenci uuid;
  v_durum   application_status;
  v_yanit   text;
begin
  select student_id, status, interview_response
    into v_ogrenci, v_durum, v_yanit
    from public.applications
   where id = p_basvuru
     for update;

  if not found then
    raise exception 'Başvuru bulunamadı.' using errcode = 'P0002';
  end if;

  if v_ogrenci is distinct from auth.uid() then
    raise exception 'Bu davete yalnızca başvuran öğrenci yanıt verebilir.'
      using errcode = '42501';
  end if;

  -- Görüşme aşamasında değilse yanıtlanacak bir davet yok. Geri
  -- çekilmiş, olumsuz kapanmış ya da teklif aşamasına geçmiş bir
  -- başvuruda davet yanıtı anlamsız.
  if v_durum <> 'interview_scheduled' then
    raise exception 'Yanıtlanacak bir görüşme daveti yok.' using errcode = 'P0001';
  end if;

  -- ZATEN YANITLANMIŞSA: çift tıklama ya da tekrarlanan istek sonucu
  -- değiştirmiyor.
  if v_yanit is not null then
    return v_yanit;
  end if;

  update public.applications
     set interview_response = case when p_katilacak then 'accepted' else 'declined' end,
         interview_responded_at = now()
   where id = p_basvuru
  returning interview_response into v_yanit;

  return v_yanit;
end;
$$;

revoke all on function public.gorusmeye_yanit_ver(uuid, boolean) from public, anon;
grant execute on function public.gorusmeye_yanit_ver(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- İLETİŞİM GÖRÜŞME KABULÜNDE AÇILMIYOR
-- ---------------------------------------------------------------------
-- `basvuru_iletisimi` DEĞİŞMİYOR: iletişim yalnızca teklif kabul
-- edildiğinde açılıyor.
--
-- Görüşmeye katılmak için gereken şey iletişim bilgisi değil, görüşmenin
-- kendisi: tarih, saat, biçim ve yer/bağlantı. Bunları şirket zaten
-- davetin içinde veriyor ve öğrenci davet ekranında görüyor. Kapıyı
-- burada da açmak, kuralı gereksiz yere gevşetirdi.
