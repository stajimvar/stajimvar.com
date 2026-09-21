/*
  TEK KATALOG SÖZLEŞMESİ — v3

  ONAYLANAN TANIM (kullanıcı kararı, 21 Eylül 2026, "C")
    katalog = status='published'
              VE son başvuru tarihi GEÇMEMİŞ
    Ülke tanımın parçası DEĞİL, süzgeç. Varsayılan süzgeç TR.
    Süresi geçmiş ilan SİLİNMİYOR, yayından kaldırılmıyor; yalnız
    açık ilan sayısına ve varsayılan listeye girmiyor.

  v2 NEDEN YETMİYORDU
  -------------------
  Üç ayrı sayı ölçüldü (20-21 Eylül 2026): /staj-ilanlari sayacı 107,
  sitemap 190, veritabanı published 191. Üçü ayrı SQL yazıyordu.
  v2 son başvuru tarihine hiç bakmıyordu; sitemap bakıyordu.

  ŞEHİR SAYISI HAM METNİ SAYIYORDU
  --------------------------------
  v2: cityTotal = count(distinct nullif(btrim(l.city),''))
  Yani "İstanbul", "Istanbul", "Atasehir Istanbul" ve
  "Turkey - Istanbul" DÖRT ayrı şehir gibi sayılıyordu; ekranda
  "10 şehirde" yazıyordu. Gerçek il sayısı 7. v3 `il` kolonunu
  sayıyor — normalize edilmiş, 81 ilden biri ya da NULL.

  NORMALİZE KOLONLAR SATIR YÜKÜNE GİRDİ
  -------------------------------------
  Kart, kaynağı belirsiz ve bağlantısı kırık ilanı GÖRÜNÜR etiketle
  gösterecek (Madde 19). v2 bu kolonları döndürmüyordu, dolayısıyla
  arayüzün onları göstermesi mümkün değildi. Etiket göstermek ilanı
  listeden çıkarmıyor: kayıt duruyor, kullanıcı durumu biliyor.

  v2 KALDIRILMADI
  ---------------
  Hâlâ çağıran olabilir; iki sürüm yan yana duruyor ve v2 aynen
  eski davranışı veriyor. Geçiş tamamlanınca v2 ayrı bir göçle
  kaldırılabilir.
*/
create or replace function public.get_published_listings_catalog_v3(
  p_country text default 'all',
  p_cursor_posted_at timestamptz default null,
  p_cursor_id uuid default null,
  p_snapshot timestamptz default null,
  p_tip text[] default null
)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  watermark timestamptz := least(coalesce(p_snapshot, now()), now());
  bugun date := current_date;
  sonuc jsonb;
begin
  if p_country is null or not (p_country in ('all','remote') or p_country ~ '^[A-Z]{2}$') then
    raise exception 'Geçersiz ülke filtresi' using errcode = '22023';
  end if;
  if (p_cursor_posted_at is null) <> (p_cursor_id is null)
     or (p_cursor_id is not null and p_snapshot is null) then
    raise exception 'Eksik sayfalama imleci' using errcode = '22023';
  end if;
  /*
    Tür süzgeci sözleşmedeki beş değerle sınırlı. Bilinmeyen bir değer
    sessizce boş liste döndürmesin; çağıran yanlışını görsün.
  */
  if p_tip is not null and exists (
    select 1 from unnest(p_tip) t
     where t not in ('staj','uzun_donem','trainee','mt','erken_kariyer')
  ) then
    raise exception 'Geçersiz ilan türü süzgeci' using errcode = '22023';
  end if;

  with active as materialized (
    select l.id, l.company_id, l.title, l.source_title, l.department, l.work_type, l.city,
      l.country_code, l.original_language, l.international_applicants, l.visa_sponsorship,
      l.mandatory_staj_accepted, l.voluntary_staj_accepted, l.is_paid, l.stipend_text,
      l.duration, l.term, l.application_deadline, l.min_grade_level, l.required_skills,
      l.preferred_skills, l.description, l.responsibilities, l.perks, l.category, l.featured,
      l.status, l.applicants_count, l.posted_at, l.last_seen_at, l.source_verified_at,
      l.source_status, l.created_at, l.updated_at, l.origin, l.source_id, l.source_url,
      l.canonical_url, l.apply_url, l.application_method, l.application_channel_id,
      l.insurance_note,
      /* Normalize alanlar — kart etiketleri ve süzgeçler bunlardan besleniyor. */
      l.il, l.ilce, l.uzaktan, l.ilan_tipi, l.kaynak_durumu, l.apply_url_ok,
      l.content_updated_at,
      coalesce(l.posted_at, l.created_at) as sort_value
    from public.listings l
    where l.status = 'published'
      and l.created_at <= watermark
      /* SÖZLEŞME C: son başvurusu geçmiş ilan katalog dışı. */
      and not (l.application_deadline is not null and l.application_deadline < bugun)
  ), ulkeli as materialized (
    select * from active
     where p_country = 'all'
        or (p_country = 'remote' and work_type = 'Remote')
        or (p_country not in ('all','remote') and country_code = p_country)
  ), filtered as materialized (
    select * from ulkeli where p_tip is null or ilan_tipi = any(p_tip)
  ), candidates as materialized (
    select * from filtered
     where p_cursor_id is null or (sort_value, id) < (p_cursor_posted_at, p_cursor_id)
     order by sort_value desc, id desc
     limit 25
  ), numbered as (
    select c.*, row_number() over (order by sort_value desc, id desc) as position from candidates c
  ), page as materialized (
    select * from numbered where position <= 24
  ), sayaclar as (
    select count(*) as toplam, count(distinct company_id) as sirket,
           count(distinct il) as sehir, count(source_verified_at) as dogrulanan,
           max(source_verified_at) as son_dogrulama
      from filtered
  )
  select jsonb_build_object(
    'listings', coalesce((
      select jsonb_agg((to_jsonb(p) - 'sort_value' - 'position') || jsonb_build_object('companies', (
        select jsonb_build_object('name', c.name, 'slug', c.slug, 'logo_url', c.logo_url,
          'industry', c.industry, 'size', c.size, 'location', c.location,
          'description', c.description, 'rating', c.rating)
        from public.companies c where c.id = p.company_id
      )) order by position) from page p), '[]'::jsonb),
    'facets', jsonb_build_object(
      'countries', coalesce((
        select jsonb_agg(jsonb_build_object('code', country_code, 'count', amount) order by country_code)
        from (select country_code, count(*) amount from active where country_code is not null group by country_code) x
      ), '[]'::jsonb),
      /*
        İL VE TÜR DAĞILIMI — SÜZGEÇ SEÇENEKLERİ BURADAN.

        Arayüz süzgeç seçeneklerini kendi elindeki 24 satırdan
        üretemez: ikinci sayfadaki bir il listede hiç görünmezdi.
        Dağılım ÜLKE süzgecinden sonra ama TÜR süzgecinden önce
        hesaplanıyor — tür seçilince il seçenekleri kaybolmasın.
      */
      'iller', coalesce((
        select jsonb_agg(jsonb_build_object('il', il, 'count', amount) order by amount desc, il)
        from (select il, count(*) amount from ulkeli where il is not null group by il) y
      ), '[]'::jsonb),
      'tipler', coalesce((
        select jsonb_agg(jsonb_build_object('tip', coalesce(ilan_tipi, 'siniflandirilmadi'), 'count', amount)
               order by amount desc)
        from (select ilan_tipi, count(*) amount from ulkeli group by ilan_tipi) z
      ), '[]'::jsonb)
    ),
    'hasMore', (select count(*) > 24 from candidates),
    'nextCursor', case when (select count(*) > 24 from candidates)
      then (select jsonb_build_object('value', sort_value, 'id', id) from page order by position desc limit 1)
      else null end,
    'snapshot', watermark,
    /*
      SAYAÇLAR SÜZGEÇTEN SONRA VE AYNI İFADENİN İÇİNDE.

      `filtered` kullanılıyor, `active` değil: ekranda "şu an ne var"
      yazan cümle kullanıcının gördüğü listeyi anlatmalı.

      İlk yazımda sayaçlar ayrı bir `return sonuc || (select ... from
      filtered)` satırındaydı ve üretimde düştü:
      "relation filtered does not exist". CTE yalnızca kendi
      ifadesinde yaşıyor; sonraki RETURN onu göremiyor. Hata v3'ü
      hiçbir şey çağırmadan yakalandı.

      `cityTotal` ham `city` DEĞİL normalize `il` sayıyor:
      "İstanbul" ile "Istanbul" tek şehir.
    */
    'total', (select toplam from sayaclar),
    'companyTotal', (select sirket from sayaclar),
    'cityTotal', (select sehir from sayaclar),
    'verifiedTotal', (select dogrulanan from sayaclar),
    'lastVerifiedAt', (select son_dogrulama from sayaclar)
  ) into sonuc;

  return sonuc;
end;
$function$;

/*
  Anon ve authenticated çağırabiliyor: katalog herkese açık veri.
  v2 ile aynı yetki.
*/
grant execute on function public.get_published_listings_catalog_v3(text, timestamptz, uuid, timestamptz, text[])
  to anon, authenticated, service_role;

comment on function public.get_published_listings_catalog_v3(text, timestamptz, uuid, timestamptz, text[]) is
  'Tek katalog sözleşmesi: published + son başvurusu geçmemiş. Ülke ve tür süzgeç; şehir sayısı normalize il üzerinden.';
