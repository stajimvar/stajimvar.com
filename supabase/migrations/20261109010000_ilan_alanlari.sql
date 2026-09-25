/*
  İLAN ALANLARI — ilanlar sitenin 24 alanına göre süzülebiliyor

  KULLANICI İSTEĞİ (25 Eylül 2026): "Filtreye sektörleri ekle",
  "İlanları sektörlere göre filtrelemek lazım", "Bir ilan 2 ayrı
  sektörde olabilir, bu durum sorun değil."

  ÖLÇÜLEN DURUM (canlı, 25 Eylül 2026)
  ------------------------------------
  Yayındaki 186 ilanın HİÇBİRİNDE alan bilgisi yok:
    category        yalnız 'general' / 'global' (alan değil, ilan türü)
    department_tags 0 / 186 dolu
    companies.industry  53 / 186, serbest metin ("Lüks moda", "Bankacılık")
  İlanlar şirketlerin kendi kariyer sayfalarından geliyor; sektör
  etiketi taşımıyorlar. `MatchedInternshipsView` da bunu yazıyordu:
  "Sektör verimiz yok … uydurmak yerine şirket adını süzdürüyoruz."

  ALAN NEREDEN GELİYOR
  --------------------
  Alan kümesi YENİ DEĞİL: sitenin var olan 24 alanı (`sectors`). Öğrenci
  alanı, bölüm kataloğu ve bağlantı kuralı aynı kümeye bakıyor; ilan da
  artık ona bakıyor. İkinci bir sektör sözlüğü açılmadı.

  Sıra:
    1. BAŞLIK. İlanın İŞLEVİNİ söylüyor ("İnsan Kaynakları Stajyeri",
       "Supply Chain Internship"). Türkçe, İngilizce, Almanca ve Fransızca
       başlıklar Türkçe harf katlamasından (`sosyal_gizli.ad_sadelestir`)
       geçip kelime sınırlı desenlerle eşleniyor.
    2. ŞİRKETİN SEKTÖR METNİ. İlanın hangi DÜNYADA olduğunu söylüyor
       ("Lüks moda", "Bankacılık"). Başlıktan farklı bir alan veriyorsa
       İKİNCİ alan oluyor: Prada'nın işe alım stajı hem "Ekonomi,
       İşletme ve Yönetim" hem "Tekstil, Moda ve Hazır Giyim"de; J.P.
       Morgan'ın "Sales" stajı hem "Ticaret, Pazarlama" hem "Finans"ta.
    3. Başlık hiçbir işlev desenine uymuyorsa GENEL İŞ desenleri
       ("analyst", "proje", "founder's associate") → "Ekonomi, İşletme ve
       Yönetim". Bu kova ikinci alan olarak EKLENMİYOR; yoksa "proje"
       kelimesi geçen her ilan İşletme süzgecini doldururdu.
  EN ÇOK İKİ ALAN (kullanıcı kararı). Hiçbir şey eşleşmiyorsa dizi BOŞ:
  "Genel Staj Başvurusu", "Yaz Dönemi Stajyeri" gibi alanını söylemeyen
  ilan bir alana ZORLANMIYOR. Uydurmama kuralı.

  Canlıdaki 186 ilanla ölçüldü (göçten önce, salt okuma): 176'sı en az
  bir alan aldı; 10'u boş kaldı ve hepsi alanını söylemeyen genel
  program adları.

  NEDEN TETİKLEYİCİ, BETİK DEĞİL
  ------------------------------
  İlan dört yoldan geliyor: otomasyon, elle giriş betikleri, şirket
  paneli ve yönetim. Alanı bir betik yazsaydı her yolun ayrıca
  hatırlaması gerekirdi; unutulan yol alansız ilan üretirdi ve süzgeçte
  SESSİZCE kaybolurdu. Tetikleyici her yola aynı kuralı uyguluyor.

  Yeniden hesap yalnız `title` ya da `company_id` değişince. Şirketin
  sektör metni sonradan değişirse ilanların alanı kendiliğinden
  güncellenmiyor; o durumda aşağıdaki geri doldurma cümlesi yeniden
  çalıştırılır.
*/

alter table public.listings
  add column if not exists alan_idleri uuid[] not null default '{}';

comment on column public.listings.alan_idleri is
  'İlanın alanları (sectors.id), en çok 2. Başlıktan ve şirketin sektör metninden `ilan_alanlari()` ile türetiliyor; boş dizi = alanını söylemiyor (20261109010000).';

/* -------------------------------------------------------------------- */
/*  SINIFLANDIRMA                                                        */
/* -------------------------------------------------------------------- */

/*
  İŞLEV DESENLERİ — sıra önemli, ilk eşleşen birinci alan. Ayrı ve
  değişmez bir fonksiyon: sınıflandırıcı listeyi iki kez okuyor (birinci
  ve ikinci alan) ve tetikleyici her satırda çalışıyor.
  Katlanmış metin: yalnız a-z, 0-9 ve boşluk ("İnsan Kaynakları" →
  "insan kaynaklari", "F&A" → "f a").
*/
create or replace function public.ilan_islev_desenleri()
returns table (sira int, desen text, slug text)
language sql
immutable
set search_path = public
as $$
  select * from (values
    (10, '\m(hukuk|avukat|legal|lawyer|juridique)\M', 'hukuk-adalet'),
    (12, '\m(regulatory|ruhsatlandirma|ruhsat|klinik|clinical|medical|tibbi|bacter\w*|biolog\w*|biyoloj\w*|genetik|molecular|biotech\w*)', 'saglik-ilac'),
    (14, '\m(ogretmen\w*|teacher|enseignant)', 'egitim-cocuk-gelisimi'),
    (16, '\m(insan kaynaklari|hr|human resources|talent|recruit\w*|ise alim|people|learning development|training)\M', 'ekonomi-isletme-yonetim'),
    (18, '\m(qhse|isg|is sagligi|kalite|quality)', 'is-sagligi-guvenligi-kalite'),
    (20, '\m(elektronik|electronic\w*|devre tasarim|circuit|power system|power ele\w*|enerji|energy)', 'elektrik-elektronik-enerji'),
    (22, '\m(yazilim|software|it|bilgi teknolojileri|developer|coding|coder|yapay zeka|ai|llm|machine learning|data scien\w*|veri analiz\w*|qa|network|sap|digital twin|dijital sistem\w*|research engineer)\M', 'bilisim-yazilim'),
    (24, '\m(finans\w*|financ\w*|muhasebe|accounting|denetim|audit|risk|bank\w*|yatirim bankacil\w*|investment|credit|kredi|global markets|private bank|treasury|f a asistani|kontrol ve raporlama|satis finansmani|asset management)', 'finans-bankacilik-sigorta'),
    (26, '\m(fashion|moda|textile|tekstil|giyim|showroom)', 'tekstil-moda-hazir-giyim'),
    (28, '\m(lojistik|logistic\w*|tedarik|supply chain|warehouse|depo|procurement|satin alma|soguk zincir|demand planning|sop)\M', 'lojistik-havacilik-denizcilik'),
    (30, '\m(pazarlama|marketing|martech|satis|sales|vertrieb|commerce|e ticaret|e business|trade marketing|business development|is gelistirme|account management|customer success|customer service|client advisor|reklam|advertising|ticari|growth|adv|sav)\M', 'ticaret-pazarlama-eticaret'),
    (32, '\m(grafik|graphic|grafik tasarim|tasarim stajyeri|gorsel tasarim|design\w*|sosyal medya|social media|content|icerik|copy|creative|medya|media|medienproduktion|produktion|image assistant|ajans|agency|ceviri|translation|events|etkinlik)', 'medya-iletisim-yaratici'),
    (34, '\m(laboratuvar|laboratory)', 'kimya-malzeme-maden'),
    (36, '\m(operasyon\w*|operations?|uretim|production|operasyonel mukemmellik|surec)', 'endustri-operasyon-yonetimi')
  ) as d(sira, desen, slug)
$$;

revoke all on function public.ilan_islev_desenleri() from public, anon, authenticated;

create or replace function public.ilan_alanlari(p_baslik text, p_sektor text)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  b text := ' ' || coalesce(sosyal_gizli.ad_sadelestir(p_baslik), '') || ' ';
  s text := ' ' || coalesce(sosyal_gizli.ad_sadelestir(p_sektor), '') || ' ';
  birinci text;
  ikinci text;
  sektorden text;
begin
  select i.slug into birinci from public.ilan_islev_desenleri() i where b ~ i.desen order by i.sira limit 1;

  /* ŞİRKETİN SEKTÖR METNİ — serbest yazı, ilk eşleşen. */
  select k.slug into sektorden
    from (values
      (10, '(bank|yatirim|varlik yonetimi|sigorta|denetim)', 'finans-bankacilik-sigorta'),
      (12, '(enerji|lpg)', 'elektrik-elektronik-enerji'),
      (14, '(ilac)', 'saglik-ilac'),
      (16, '(gida|icecek|kahve|tarim|hayvancil)', 'gida-tarim-hayvancilik'),
      (18, '(moda|mucevher|tekstil)', 'tekstil-moda-hazir-giyim'),
      (20, '(egitim)', 'egitim-cocuk-gelisimi'),
      (22, '(hukuk)', 'hukuk-adalet'),
      (24, '(yapay zeka|yazilim)', 'bilisim-yazilim'),
      (26, '(e ticaret|hizli tuketim)', 'ticaret-pazarlama-eticaret'),
      (28, '(emlak|insaat)', 'insaat-mimarlik-yapi'),
      (30, '(endustriyel gaz|kimya)', 'kimya-malzeme-maden'),
      (32, '(spor)', 'spor-ve-rekreasyon'),
      (34, '(muzik|medya)', 'medya-iletisim-yaratici')
    ) as k(sira, desen, slug)
   where s ~ k.desen order by k.sira limit 1;

  if birinci is null then
    /* GENEL İŞ KOVASI — yalnız başlık hiçbir işleve uymadıysa. */
    if b ~ '\m(strateji|strategy|chief of staff|founder\w*|kurucu|ceo|venture|business management|is analisti|is analizi|business analyst|analyst|urun|product|consult\w*|danisman|yonetici adayi|project management|proje\w*)' then
      birinci := 'ekonomi-isletme-yonetim';
    end if;
  end if;

  if birinci is null then
    birinci := sektorden;
    sektorden := null;
  end if;

  if sektorden is not null and sektorden <> birinci then
    ikinci := sektorden;
  elsif birinci is not null then
    /*
      "Operasyon" İKİNCİ alan olmuyor: başlıklarda çoğu zaman bir
      niteleyici ("İK Operasyonları", "Sales Operations", "Ajans
      Operasyonları"). Birinci alan olarak kalıyor ("Operasyon Stajyeri").
    */
    select i.slug into ikinci from public.ilan_islev_desenleri() i
     where b ~ i.desen and i.slug <> birinci
       and i.slug <> 'endustri-operasyon-yonetimi'
     order by i.sira limit 1;
  end if;

  return coalesce(array(
    select x.id from public.sectors x
     where x.aktif and x.slug in (birinci, ikinci)
     order by (x.slug = birinci) desc
  ), '{}');
end;
$$;

revoke all on function public.ilan_alanlari(text, text) from public, anon, authenticated;

create or replace function public.listings_alan_doldur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.title is distinct from old.title
     or new.company_id is distinct from old.company_id then
    new.alan_idleri := public.ilan_alanlari(
      new.title,
      (select c.industry from public.companies c where c.id = new.company_id)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.listings_alan_doldur() from public, anon, authenticated;

drop trigger if exists listings_alan_doldur on public.listings;
create trigger listings_alan_doldur
  before insert or update of title, company_id on public.listings
  for each row execute function public.listings_alan_doldur();

/* -------------------------------------------------------------------- */
/*  ZAMAN DAMGALARI OYNAMASIN                                            */
/* -------------------------------------------------------------------- */

/*
  `alan_idleri` TÜRETİLMİŞ bir alan. `listings_zaman_damgalari`
  (20261025010000) normalize alanları `updated_at` karşılaştırmasından
  düşüyor; bu alan da o listeye giriyor. Girmeseydi aşağıdaki geri
  doldurma 186 ilanın `updated_at`ini aynı saniyeye çekerdi ve site
  haritasındaki `lastmod` anlamsızlaşırdı. `content_updated_at` zaten
  yalnız açık "anlamlı alanlar" listesine bakıyor; bu alan orada yok.
*/
create or replace function public.listings_normalize_alanlari()
returns text[]
language sql
immutable
set search_path to 'public'
as $$
  select array['il','ilce','uzaktan','ilan_tipi','kaynak_durumu','apply_url_ok','alan_idleri']::text[];
$$;

/* -------------------------------------------------------------------- */
/*  GERİ DOLDURMA                                                        */
/* -------------------------------------------------------------------- */

update public.listings l
   set alan_idleri = public.ilan_alanlari(
     l.title,
     (select c.industry from public.companies c where c.id = l.company_id)
   );

/* -------------------------------------------------------------------- */
/*  OKUMA YETKİSİ                                                        */
/* -------------------------------------------------------------------- */

/*
  42501 DERSİ (20261023010000): `listings` kolon kolon açılıyor; yeni
  kolona `grant select` verilmezse onu seçen sorgunun TAMAMI düşüyor.
  YAZMA yetkisi verilmiyor: alanı yalnız tetikleyici yazıyor.
*/
grant select (alan_idleri) on public.listings to anon, authenticated;

/*
  ALAN ADLARI ZİYARETÇİYE AÇILIYOR — bu göçteki tek yetki değişikliği.

  İlan sayfası herkese açık; süzgeçteki "Bilişim ve Yazılım" etiketi
  giriş yapmamış ziyaretçide de okunabilmeli. `sectors` bugüne kadar
  yalnız `authenticated`'a açıktı. Tabloda kişisel ya da gizli veri yok
  (kimlik, slug, ad, sıra, etkin, oluşturma zamanı); açılan kolonlar
  yalnız süzgecin ihtiyacı olan dört tanesi ve yalnız ETKİN satırlar.
  Yazma politikası (`is_admin()`) değişmedi.
*/
/*
  `aktif` de açılıyor: alan listesini okuyan sorgu (`sektorleriGetir`)
  `aktif=eq.true` süzüyor ve süzülen sütuna da SELECT izni gerekiyor —
  yoksa istek 42501 ile düşüyor (ölçüldü, yerel). RLS zaten yalnız etkin
  satırları verdiği için bu yeni bir satır açmıyor.
*/
grant select (id, slug, ad, sira, aktif) on public.sectors to anon;

drop policy if exists "sektorler ziyaretciye okunur" on public.sectors;
create policy "sektorler ziyaretciye okunur" on public.sectors
  for select to anon using (aktif);

/*
  Süzgeç yayındaki ilanları `alan_idleri && {seçilenler}` ile arıyor;
  GIN indeks dizi kesişimini karşılıyor. Kısmi: yalnız yayındakiler.
*/
create index if not exists listings_alan_idleri_idx
  on public.listings using gin (alan_idleri)
  where status = 'published';

/* -------------------------------------------------------------------- */
/*  İLAN KATALOĞU ALANI TAŞIYOR                                          */
/* -------------------------------------------------------------------- */

/*
  İlan listesi `listings` tablosundan değil bu RPC'den geliyor. Fonksiyon
  kolonları TEK TEK sayıyor; yeni kolon listeye eklenmezse arayüze hiç
  ulaşmıyor (ölçüldü: yerelde RPC yanıtında `alan_idleri` sıfır kez
  geçiyordu, her ilanın alanı boş görünüyordu). Gövde 20261026010000'deki
  son sürümün AYNISI; yalnız `l.alan_idleri` ve `alanlar` dağılımı eklendi.
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
      /* İlanın alanları (20261109010000). */
      l.alan_idleri,
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
      ), '[]'::jsonb),
      /*
        ALAN DAĞILIMI (20261109010000) — il ve tür dağılımıyla aynı gerekçe
        ve aynı yerde: ülke süzgecinden sonra, tür süzgecinden önce.
        İki alanlı ilan iki alanın sayısında da görünüyor (kullanıcı
        kararı: bir ilan iki alanda olabilir). Alanı olmayan ilan hiçbir
        alana sayılmıyor.

        TÜR KIRILIMIYLA: tür süzgeci İSTEMCİDE çalışıyor (uygulama
        `p_tip` göndermiyor) ve varsayılan seçim Staj + Uzun dönem.
        Yalnız alan başına toplam dönseydi sayı varsayılan listeyle
        ayrışırdı (ölçüldü, canlı: 185 ilanın 16'sı varsayılan türde
        değil). Satır alan × tür; arayüz seçili türleri topluyor.
        Tür anahtarı `tipler` dağılımıyla aynı: NULL → 'siniflandirilmadi'.
      */
      'alanlar', coalesce((
        select jsonb_agg(jsonb_build_object('alan', alan_id, 'tip', tip, 'count', amount)
               order by amount desc, alan_id, tip)
        from (
          select a.alan_id, coalesce(u.ilan_tipi, 'siniflandirilmadi') as tip, count(*) amount
            from ulkeli u cross join lateral unnest(u.alan_idleri) as a(alan_id)
           group by a.alan_id, coalesce(u.ilan_tipi, 'siniflandirilmadi')
        ) w
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
