-- ÖĞRENCİ TAKİBİ: "ŞİRKET BAŞVURUNU GÖRÜNTÜLEDİ"
--
-- NEDEN VAR
-- ---------
-- Sade akışta öğrencinin göreceği iki olay var: başvurusunun şirkete
-- ULAŞTIĞI ve şirketin ona BAKTIĞI. İkincisi bugüne kadar hiçbir yerde
-- yoktu; öğrenci "görüldü mü" sorusunun cevabını hiç alamıyordu.
--
-- ÖLÇÜLEN ŞEY NE, ÖLÇÜLMEYEN NE
-- -----------------------------
-- Kayıt YALNIZ şu olduğunda yazılıyor: doğrulanmış şirketin bir üyesi
-- adayın AYRINTI ekranını BAŞARIYLA açtı. Yani:
--
--   SAYILMAYANLAR
--     başvuru listesini görmek          → listede isim okumak bakmak değil
--     ön yükleme / arka planda çekme     → kimse bakmadı
--     öğrencinin kendi başvurusunu açması → kendi bakışı
--     ayrıntı ekranının HATAYLA açılması  → istemci bu RPC'yi çağırmıyor
--
-- "CV'N AÇILDI" DEMİYORUZ
-- -----------------------
-- CV dosyasının gerçekten açıldığını ölçmüyoruz (imzalı adres
-- üretmek, dosyanın okunduğu anlamına gelmiyor). Ölçmediğimiz bir şeyi
-- söylemek, öğrenciye olmayan bir bilgi vermek olurdu. Ekranda yazan
-- cümle yalnız "başvurunu görüntüledi".
--
-- VIEWER DA SAYILIYOR
-- -------------------
-- Kapı `sirket_adaylarini_gorebilir` (üyelik + doğrulama), yazma
-- yetkisi DEĞİL. Viewer rolündeki bir insan adayın ayrıntısını açtıysa
-- şirket gerçekten bakmıştır; bunu "bakılmadı" saymak öğrenciye eksik
-- bilgi vermek olurdu.

/* ================================================================== */
/*  1) ALAN                                                            */
/* ================================================================== */

alter table public.applications
  add column if not exists ilk_goruntulenme_at timestamptz;

comment on column public.applications.ilk_goruntulenme_at is
  'Şirketin aday ayrıntısını İLK kez başarıyla açtığı an. Liste görünümü ve ön yükleme sayılmaz.';

/* ================================================================== */
/*  2) KAYIT RPC'Sİ                                                    */
/* ================================================================== */
--
-- İstemci bunu ayrıntı ekranı BAŞARIYLA çizildikten sonra çağırıyor;
-- yükleme hata verirse çağırmıyor. Kapı yine de sunucuda: çağrı
-- yetkisiz gelirse hiçbir şey yazılmıyor.
--
-- BİLDİRİM YAĞMURU YOK: `dedupe_key` başvuru başına tek. Aynı başvuru
-- yüz kez açılsa da öğrenciye bir kez haber gidiyor. Zaman damgası da
-- yalnız İLK bakışta yazılıyor — sonraki bakışlar damgayı
-- tazelemiyor, çünkü öğrenciye söylenen cümle "ilk kez ne zaman
-- bakıldı".
create or replace function public.basvuru_goruntulendi(p_basvuru uuid)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_sirket  uuid;
  v_ogrenci uuid;
  v_ilan    text;
  v_ad      text;
  v_an      timestamptz;
begin
  if auth.uid() is null then
    raise exception 'oturum-yok' using errcode = '42501';
  end if;

  select l.company_id, a.student_id, coalesce(nullif(btrim(l.title), ''), 'ilan'),
         coalesce(nullif(btrim(c.name), ''), 'Şirket'), a.ilk_goruntulenme_at
    into v_sirket, v_ogrenci, v_ilan, v_ad, v_an
    from public.applications a
    join public.listings l on l.id = a.listing_id
    join public.companies c on c.id = l.company_id
   where a.id = p_basvuru;

  if v_sirket is null then
    raise exception 'basvuru-yok' using errcode = 'P0001';
  end if;

  /* Yetkisiz çağrı sessizce hiçbir şey yazmıyor. */
  if not public.sirket_adaylarini_gorebilir(v_sirket) then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;

  /* Öğrencinin kendi bakışı sayılmıyor (zaten bu kapıdan geçemez). */
  if v_ogrenci = auth.uid() then
    return v_an;
  end if;

  /* Zaten işaretliyse dokunma: "ilk görüntülenme" ilk kalmalı. */
  if v_an is not null then
    return v_an;
  end if;

  update public.applications
     set ilk_goruntulenme_at = now()
   where id = p_basvuru and ilk_goruntulenme_at is null
  returning ilk_goruntulenme_at into v_an;

  /*
    Araya giren ikinci bir açılış damgayı yazdıysa `v_an` null kalıyor;
    o zaman bildirim de yazılmıyor (zaten yazılmış).
  */
  if v_an is null then
    select ilk_goruntulenme_at into v_an
      from public.applications where id = p_basvuru;
    return v_an;
  end if;

  insert into public.notifications
    (recipient_id, type, title, body, target_url, application_id, dedupe_key)
  values (
    v_ogrenci,
    'basvuru_goruntulendi',
    'Şirket başvurunu görüntüledi',
    v_ad || ' · ' || v_ilan || ' başvurunu açıp inceledi.',
    '/profil?basvuru=' || p_basvuru::text,
    p_basvuru,
    'goruntulendi:' || p_basvuru::text
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return v_an;
end;
$$;

revoke all on function public.basvuru_goruntulendi(uuid) from public, anon;
grant execute on function public.basvuru_goruntulendi(uuid) to authenticated;

comment on function public.basvuru_goruntulendi(uuid) is
  'Aday ayrıntısı başarıyla açıldığında çağrılır. İlk açılışta damga ve ÖĞRENCİYE tek bildirim yazar; tekrar açılışlar sessizdir.';

/* ================================================================== */
/*  3) ÜRETİMDEKİ ESKİ BAŞVURULAR                                      */
/* ================================================================== */
--
-- GERİYE DÖNÜK DOLDURMA YOK. Bu başvuruların görüntülenip
-- görüntülenmediğine dair hiçbir kaydımız yok; bir tarih uydurmak ya
-- da "görüntülendi" demek, öğrenciye olmamış bir şeyi olmuş göstermek
-- olurdu. Alan null kalıyor ve ekranda "henüz görüntülenmedi" DEĞİL,
-- "bilgi yok" anlamına gelen bir satır çiziliyor (bkz. istemci).
