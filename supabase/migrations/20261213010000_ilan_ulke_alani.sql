/*
  İŞVEREN İLANINDA ÜLKE VE UZAKTAN İLANDA BAŞVURULABİLEN ÜLKELER (13 Ekim 2026)

  ÖLÇÜLEN SORUN
  -------------
  İşverenin StajımVar'da açtığı ilanlarda `country_code` HİÇ yazılmıyordu:
    · form (src/lib/ilan-formu.mjs) yalnız şehri gönderiyordu;
    · `authenticated` rolünün `listings.country_code` için INSERT/UPDATE
      yetkisi yoktu (canlı katalogda ölçüldü).
  Ülke yazılmayınca ilan sayfası Google için JobPosting taşıyamıyor
  (`addressCountry` zorunlu) — doğrudan başvuru alan, en değerli ilanlar
  iş ilanı zengin sonucuna hiç girmiyordu.

  Uzaktan ilanda Google ayrıca başvurulabilecek en az bir ülke istiyor
  (`applicantLocationRequirements`). Bu bilgi için alan yoktu.

  NE DEĞİŞİYOR
  ------------
  1. `basvuru_ulkeleri text[]`: uzaktan ilanda başvurulabilen ülkeler
     (ISO 3166-1 alfa-2). Yalnız uzaktan ilanda dolu olabilir.
  2. İşveren `country_code` ve `basvuru_ulkeleri`ni yazabiliyor (kolon
     yetkisi). Kimse adına değer üretilmiyor.
  3. Otomatik kontrol (20261120010000) iki yeni kural alıyor:
       zorunlu.ulke            ofis/hibrit ilanda ülke seçilmeli
       zorunlu.basvuru_ulkeleri uzaktan ilanda en az bir ülke seçilmeli
     Kural sürümü 3'e çıkıyor (sonuç önbelleği sürümle anahtarlı).
  4. Yayındaki ilanın düzenlemesi (bekleyen değişiklik) iki alanı da
     taşıyor ve onayda uyguluyor.

  NE DEĞİŞMİYOR
  -------------
  · MEVCUT İLANLARIN ÜLKESİNE DOKUNULMUYOR. Geriye dönük doldurma yok:
    şehirden ülke çıkarmak tahmin olurdu. Mevcut işveren ilanı ancak
    işveren onu düzenleyip ülkeyi KENDİSİ seçtiğinde ülke kazanıyor.
  · İçerik parmak izi (ilan_icerik_ozeti) iki yeni alan BOŞKEN eskisiyle
    birebir aynı: mevcut ilanların izi değişmiyor.
  · Toplama hattından gelen ilanlar (origin <> 'employer_posted') bu
    kontrolden geçmiyor; davranışları aynı.

  JobPosting'in `basvuru_ulkeleri`ni okuması AYRI ADIM: ilan sorgusu
  (src/lib/seo/ilan-sayfasi.mjs, ILAN_SECIMI) bu sütunu ancak göç
  canlıya çıktıktan sonra isteyebilir; derleme göçten ÖNCE koşuyor.
*/

/* ------------------------------------------------------------------ 1 */
alter table public.listings
  add column if not exists basvuru_ulkeleri text[];

/*
  Ülke kodu biçim kısıtı canlıda 20260919010000'den beri var; işveren
  artık bu sütunu yazabildiği için burada da güvenceye alınıyor (yoksa
  ekleniyor, varsa dokunulmuyor).
*/
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_country_code_iso'
                  and conrelid = 'public.listings'::regclass) then
    alter table public.listings
      add constraint listings_country_code_iso check (country_code is null or country_code ~ '^[A-Z]{2}$');
  end if;
end $$;

alter table public.listings
  drop constraint if exists listings_basvuru_ulkeleri_iso,
  add constraint listings_basvuru_ulkeleri_iso check (
    basvuru_ulkeleri is null
    or (
      cardinality(basvuru_ulkeleri) between 1 and 30
      and array_to_string(basvuru_ulkeleri, ',') ~ '^[A-Z]{2}(,[A-Z]{2})*$'
    )
  );

/* Başvurulabilen ülkeler yalnız tamamen uzaktan ilanda anlamlı. */
alter table public.listings
  drop constraint if exists listings_basvuru_ulkeleri_uzaktan,
  add constraint listings_basvuru_ulkeleri_uzaktan check (
    basvuru_ulkeleri is null or work_type = 'Remote'
  );

comment on column public.listings.basvuru_ulkeleri is
  'Uzaktan ilanda başvurulabilen ülkeler (ISO 3166-1 alfa-2). İşverenin ya da yöneticinin beyanı; tahmin yazılmaz.';

/* ------------------------------------------------------------------ 2 */
grant insert (country_code, basvuru_ulkeleri) on public.listings to authenticated;
grant update (country_code, basvuru_ulkeleri) on public.listings to authenticated;
grant select (basvuru_ulkeleri) on public.listings to anon, authenticated;

/* ------------------------------------------------------------------ 3 */
/*
  İçerik alanları: iki yeni alan her zaman anahtar olarak var (boşsa
  null). Böylece bekleyen değişiklikte "ülkeyi kaldır" da taşınıyor.
*/
create or replace function public.ilan_icerik_alanlari(l public.listings)
returns jsonb language sql stable set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'title', l.title, 'description', l.description,
    'city', l.city, 'work_type', l.work_type, 'term', l.term, 'duration', l.duration,
    'is_paid', l.is_paid, 'stipend_text', l.stipend_text,
    'application_deadline', l.application_deadline, 'department', l.department,
    'responsibilities', l.responsibilities, 'required_skills', l.required_skills,
    'preferred_skills', l.preferred_skills, 'perks', l.perks,
    'insurance_note', l.insurance_note, 'min_grade_level', l.min_grade_level,
    'category', l.category, 'mandatory_staj_accepted', l.mandatory_staj_accepted,
    'voluntary_staj_accepted', l.voluntary_staj_accepted
  ) || jsonb_build_object('country_code', l.country_code, 'basvuru_ulkeleri', l.basvuru_ulkeleri)
$$;

/*
  Parmak izi: yeni alanlar BOŞKEN eski iz. jsonb anahtarları sıralı
  tuttuğu için iki boş anahtarı çıkarınca metin eskisiyle aynı.
*/
create or replace function public.ilan_icerik_ozeti(l public.listings)
returns text language sql stable set search_path = public, pg_temp
as $$
  select md5((
    (public.ilan_icerik_alanlari(l) - 'country_code' - 'basvuru_ulkeleri')
    || jsonb_strip_nulls(jsonb_build_object('country_code', l.country_code, 'basvuru_ulkeleri', l.basvuru_ulkeleri))
    || jsonb_build_object('company_id', l.company_id)
  )::text)
$$;

/* ------------------------------------------------------------------ 4 */
/*
  Bekleyen değişikliği uygularken iki yeni alan da yazılıyor. Bu göçten
  ÖNCE kaydedilmiş bekleyen içerikte anahtar yok; `?` ile bakılıyor ve
  anahtar yoksa ilanın mevcut değeri korunuyor.
*/
create or replace function public.ilan_bekleyen_icerigi_yaz(p_ilan uuid, p_icerik jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.listings%rowtype;
  y public.listings%rowtype;
begin
  select * into l from public.listings where id = p_ilan;
  y := jsonb_populate_record(l, p_icerik);
  perform set_config('stajimvar.ilan_kontrol_uygulaniyor', 'evet', true);
  update public.listings
     set title = y.title, description = y.description, city = y.city,
         work_type = y.work_type, term = y.term, duration = y.duration,
         is_paid = y.is_paid, stipend_text = y.stipend_text,
         application_deadline = y.application_deadline, department = y.department,
         responsibilities = y.responsibilities, required_skills = y.required_skills,
         preferred_skills = y.preferred_skills, perks = y.perks,
         insurance_note = y.insurance_note, min_grade_level = y.min_grade_level,
         category = y.category, mandatory_staj_accepted = y.mandatory_staj_accepted,
         voluntary_staj_accepted = y.voluntary_staj_accepted,
         country_code = case when p_icerik ? 'country_code' then y.country_code else l.country_code end,
         basvuru_ulkeleri = case when p_icerik ? 'basvuru_ulkeleri' then y.basvuru_ulkeleri else l.basvuru_ulkeleri end
   where id = p_ilan;
  perform set_config('stajimvar.ilan_kontrol_uygulaniyor', '', true);
end;
$$;

/* ------------------------------------------------------------------ 5 */
/*
  KURALLAR: mevcut kural işlevi olduğu gibi kalıyor (adı _temel), yeni
  işlev onu çağırıp konum kurallarını ekliyor. Böylece 250 satırlık
  işlev kopyalanmıyor; çağıranlar (ilan_kontrolu_uygula,
  ilan_degisikligi_uygula, ilan_duzenleme_kontrolu) aynı adı kullanıyor.
*/
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'ilan_kontrol_kurallari_temel'
  ) then
    alter function public.ilan_kontrol_kurallari(public.listings) rename to ilan_kontrol_kurallari_temel;
  end if;
end $$;

create or replace function public.ilan_kontrol_kurallari(l public.listings)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  sonuc       jsonb := public.ilan_kontrol_kurallari_temel(l);
  duzeltmeler jsonb := coalesce(sonuc -> 'duzeltmeler', '[]'::jsonb);
begin
  if l.work_type::text <> 'Remote' and l.country_code is null then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'country_code', 'kural', 'zorunlu.ulke',
      'mesaj', 'İşin yapılacağı ülkeyi seç.');
  end if;

  if l.work_type::text = 'Remote' and coalesce(cardinality(l.basvuru_ulkeleri), 0) = 0 then
    duzeltmeler := duzeltmeler || jsonb_build_object('alan', 'basvuru_ulkeleri', 'kural', 'zorunlu.basvuru_ulkeleri',
      'mesaj', 'Uzaktan ilanda hangi ülkelerden başvurulabileceğini seç.');
  end if;

  return sonuc || jsonb_build_object(
    'duzeltmeler', duzeltmeler,
    'karar', case
      when jsonb_array_length(duzeltmeler) > 0 then 'duzeltme'
      else sonuc ->> 'karar'
    end
  );
end;
$$;

revoke all on function public.ilan_kontrol_kurallari(public.listings) from public, anon, authenticated;
revoke all on function public.ilan_kontrol_kurallari_temel(public.listings) from public, anon, authenticated;

/* Kural değişti: sonuç önbelleği sürümle anahtarlı (20261120010000, not). */
create or replace function public.ilan_kontrol_kural_surumu()
returns text language sql immutable set search_path = public, pg_temp
as $$ select 'ilan-kontrol-3 (2026-10-13)'::text $$;

/* ------------------------------------------------------------------ 6 */
/*
  YAYINDAKİ İLANIN DÜZENLEMESİ: incelemeye ya da düzeltmeye düşen
  değişiklikte "son onaylı sürüm yayında kalıyor" — tetikleyici içerik
  alanlarını eski hâline döndürüyor. Ülke alanları bu listeye eklenmezse
  kontrol edilmemiş ülke değişikliği canlı satıra girerdi (PGlite
  testinde ölçüldü). İşlev 20261120010000'deki tanımın AYNISI; tek fark
  geri dönen iki alan.
*/
create or replace function public.ilan_duzenleme_kontrolu()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rol   text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  sonuc jsonb;
  karar text;
  hata_metni text;
  surum text := public.ilan_kontrol_kural_surumu();
  icerik jsonb;
  durum_d text;
  gerekce_d jsonb;
begin
  if new.origin <> 'employer_posted' or rol = 'service_role' or public.ilan_kontrol_uygulaniyor() then
    return new;
  end if;

  /* ------------------------------------------- yönetici kararı izi */
  if public.is_admin() then
    if old.status <> 'published' and new.status = 'published' then
      new.kontrol_durumu := 'gecti';
      new.kontrol_gerekceleri := '[]'::jsonb;
      new.kontrol_at := now();
      new.kontrol_denemeleri := 0;
      new.kontrol_sonraki_at := null;
      new.yonetici_incelemesi_gerekli := false;
      insert into public.ilan_kontrolleri (listing_id, kaynak, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
      values (new.id, 'yonetici', 'yonetici_onay',
              case when coalesce(btrim(new.review_note), '') <> ''
                   then jsonb_build_array(jsonb_build_object('kural', 'yonetici', 'mesaj', new.review_note))
                   else '[]'::jsonb end,
              surum, public.ilan_icerik_ozeti(new), auth.uid());
    elsif old.status = 'draft' and new.status = 'archived' and old.kontrol_durumu = 'inceleme' then
      /* Eski "Reddet" (yonetim_ilan_karari) yolu: arşivliyor, not yok. */
      new.kontrol_durumu := null;
      new.kontrol_gerekceleri := '[]'::jsonb;
      new.kontrol_at := now();
      insert into public.ilan_kontrolleri (listing_id, kaynak, karar, kural_surumu, icerik_ozeti, gonderen)
      values (new.id, 'yonetici', 'yonetici_ret', surum, public.ilan_icerik_ozeti(new), auth.uid());
    end if;
    return new;
  end if;

  /* ------------------------------ gönderilmiş taslağın içeriği değişti */
  if old.status <> 'published'
     and old.kontrol_durumu is not null
     and public.ilan_icerik_ozeti(old) is distinct from public.ilan_icerik_ozeti(new) then
    new.kontrol_durumu := null;
    new.kontrol_gerekceleri := '[]'::jsonb;
    new.kontrol_denemeleri := 0;
    new.kontrol_sonraki_at := null;
    return new;
  end if;

  /* ----------------------------------- yayındaki ilanın içeriği değişti */
  if old.status = 'published' and new.status = 'published'
     and public.ilan_icerik_ozeti(old) is distinct from public.ilan_icerik_ozeti(new) then
    icerik := public.ilan_icerik_alanlari(new);

    begin
      sonuc := public.ilan_kontrol_kurallari(new);
    exception when others then
      get stacked diagnostics hata_metni = message_text;
      sonuc := null;
    end;

    if sonuc is null then
      insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, kural_surumu, icerik_ozeti, gonderen, hata)
      values (new.id, 'otomatik', 'degisiklik', 'hata', surum, public.ilan_icerik_ozeti(new), auth.uid(), left(hata_metni, 500));
      durum_d := 'bekliyor';
      gerekce_d := '[]'::jsonb;
    else
      karar := sonuc->>'karar';
      insert into public.ilan_kontrolleri (listing_id, kaynak, kapsam, karar, gerekceler, kural_surumu, icerik_ozeti, gonderen)
      values (new.id, 'otomatik', 'degisiklik', karar,
              coalesce(sonuc->'duzeltmeler', '[]'::jsonb) || coalesce(sonuc->'supheler', '[]'::jsonb),
              surum, public.ilan_icerik_ozeti(new), auth.uid());
      if karar = 'yayinla' then
        /* Yeni sürüm yayında; önceki bekleyen değişiklik geçersiz. */
        delete from public.ilan_bekleyen_degisiklikleri where listing_id = new.id;
        new.kontrol_durumu := 'gecti';
        new.kontrol_gerekceleri := '[]'::jsonb;
        new.kontrol_at := now();
        new.kontrol_kural_surumu := surum;
        return new;
      end if;
      durum_d := karar;
      gerekce_d := public.ilan_sirkete_gorunen_gerekceler(sonuc);
    end if;

    /* Son onaylı sürüm yayında kalıyor: içerik alanları eski hâline. */
    new.title := old.title;  new.description := old.description;  new.city := old.city;
    new.work_type := old.work_type;  new.term := old.term;  new.duration := old.duration;
    new.is_paid := old.is_paid;  new.stipend_text := old.stipend_text;
    new.application_deadline := old.application_deadline;  new.department := old.department;
    new.responsibilities := old.responsibilities;  new.required_skills := old.required_skills;
    new.preferred_skills := old.preferred_skills;  new.perks := old.perks;
    new.insurance_note := old.insurance_note;  new.min_grade_level := old.min_grade_level;
    new.category := old.category;  new.mandatory_staj_accepted := old.mandatory_staj_accepted;
    new.voluntary_staj_accepted := old.voluntary_staj_accepted;
    /* 20261213010000: ülke ve başvurulabilen ülkeler de içerik. */
    new.country_code := old.country_code;  new.basvuru_ulkeleri := old.basvuru_ulkeleri;

    insert into public.ilan_bekleyen_degisiklikleri
      (listing_id, icerik, durum, gerekceler, kontrol_at, kural_surumu, denemeler, sonraki_at, gonderen)
    values (new.id, icerik, durum_d, gerekce_d, now(), surum,
            case when durum_d = 'bekliyor' then 1 else 0 end,
            case when durum_d = 'bekliyor' then now() + interval '5 minutes' end,
            auth.uid())
    on conflict (listing_id) do update
      set icerik = excluded.icerik, durum = excluded.durum, gerekceler = excluded.gerekceler,
          kontrol_at = excluded.kontrol_at, kural_surumu = excluded.kural_surumu,
          denemeler = excluded.denemeler, sonraki_at = excluded.sonraki_at,
          gonderen = excluded.gonderen, updated_at = now();
  end if;

  return new;
end;
$$;
