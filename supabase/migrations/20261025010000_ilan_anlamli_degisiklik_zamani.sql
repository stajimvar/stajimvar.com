/*
  ANLAMLI DEĞİŞİKLİK ZAMANI VE DARALTILMIŞ ZAMAN DAMGASI

  OLAY (21 Eylül 2026)
  --------------------
  Normalize kolonlar canlıya yazıldığında `listings` üzerindeki
  `t4` tetikleyicisi (genel `touch_updated_at`) 188 satırın
  `updated_at` değerini yazım anına taşıdı. `automation/sitemap.py`
  `lastmod`'u `updated_at`'ten ürettiği için, saatlik sitemap bir
  sonraki koşusunda 188 ilan için "içerik bugün değişti" diyecekti —
  oysa değişen yalnız bizim sınıflandırma kolonlarımızdı.

  Eski `updated_at` değerleri geri alınamadı: ne snapshot'ta ne geri
  dönüş dosyasında tutuluyordu. TAHMİNLE GERİ YAZILMADI; bir kerelik
  yanlış sinyal raporlandı ve tekrarı bu göçle engelleniyor.

  İKİ AYRI ZAMAN, İKİ AYRI SORU
  -----------------------------
  `updated_at`  : bu satıra en son ne zaman DOKUNULDU
  `content_updated_at` : ziyaretçinin gördüğü içerik en son ne zaman
                         ANLAMLI biçimde değişti

  İkisini tek alanda tutmak, "kaynak kontrolü ilanı doğruladı" ile
  "ilanın son başvuru tarihi değişti"yi aynı sinyale çeviriyordu.

  GEÇMİŞ UYDURULMADI
  ------------------
  `content_updated_at` geriye dönük olarak `created_at`'ten
  dolduruluyor. Ölçüldü (21 Eylül 2026, 237 satır):
    `published_at` kolonu YOK.
    `posted_at` 202/237 dolu ve 2022-01-25'e kadar gidiyor — o,
      KAYNAĞIN ilan tarihi; bizim sayfamız 2026 Ağustos'ta doğdu.
      2022 tarihli bir `lastmod` sayfanın gerçeğini anlatmazdı.
    `created_at` 237/237 dolu (2026-08-16 … 2026-09-19) ve sayfanın
      var olduğu ilk anı gösteriyor — elimizdeki en savunulabilir
      alt sınır.
  KİRLENMİŞ `updated_at` DEĞERLERİ BU ALANA KOPYALANMADI.
*/

alter table public.listings
  add column if not exists content_updated_at timestamptz;

comment on column public.listings.content_updated_at is
  'Ziyaretçiye gösterilen içeriğin son anlamlı değişim anı. sitemap lastmod bundan üretilir. Normalize alanlar, kaynak doğrulama ve link kontrolü bu alanı İLERLETMEZ.';

/* Geriye dönük doldurma: yalnız boş olanlar, yalnız created_at'ten. */
update public.listings
   set content_updated_at = created_at
 where content_updated_at is null;

/*
  42501 DERSİ: `listings` kolon kolon yetki veriyor; yetkisiz tek
  kolon bütün sorguyu düşürüyor. Okuma verildi, YAZMA VERİLMEDİ.
*/
grant select (content_updated_at) on public.listings to anon, authenticated;

/* ------------------------------------------------------------------ */
/*  DARALTILMIŞ TETİKLEYİCİ — YALNIZ `listings`                        */
/* ------------------------------------------------------------------ */

/*
  GENEL `touch_updated_at()` FONKSİYONUNA DOKUNULMUYOR.

  O fonksiyonu başka tablolar da kullanıyor; davranışını değiştirmek
  bu paketin kapsamı dışındaki tabloları etkilerdi. Bunun yerine
  `listings`e özel yeni bir fonksiyon yazıldı ve YALNIZ `t4`
  tetikleyicisi ona bağlandı.

  TETİKLEYİCİ ADI `t4` OLARAK KORUNUYOR: aynı zamanlamadaki
  tetikleyiciler ALFABETİK sırayla çalışıyor ve `t4` bugün
  `listings_enforce_application_channel` ile `listings_publish_guard`
  sonrasında, yani EN SON çalışıyor. Ad değişseydi sıra değişir ve
  guard'lardan önce çalışmaya başlayabilirdi.
*/

/* Sınıflandırma çıktısı — tek başına değişirse hiçbir zaman damgası ilerlemez. */
create or replace function public.listings_normalize_alanlari()
returns text[]
language sql
immutable
set search_path to 'public'
as $function$
  select array['il','ilce','uzaktan','ilan_tipi','kaynak_durumu','apply_url_ok']::text[];
$function$;

/*
  Ziyaretçinin gördüğü anlamlı alanlar. Liste AÇIK yazıldı: yeni bir
  kolon eklendiğinde sessizce "anlamlı" sayılmasın, eklemeyi yapan
  kişi bilerek karar versin.

  DIŞARIDA BIRAKILANLAR ve sebepleri:
    source_status / source_verified_at / source_checked_at /
    consecutive_failures / final_checked_url  → kaynak doğrulaması,
      ilanın içeriği hakkında bir şey söylemiyor
    closed_at / closure_reason → `status` zaten listede; bunlar onun
      yan kaydı ve gecelik iş her koşuda yeniden damgalıyor
    last_seen_at / imported_at / content_hash / raw → derleme izi
    applicants_count / karar_bildirim_* / review_* → içerik değil
*/
create or replace function public.listings_anlamli_alanlar()
returns text[]
language sql
immutable
set search_path to 'public'
as $function$
  select array[
    'title','description','status','application_deadline',
    'application_method','apply_url','city','work_type','term',
    'department','duration','min_grade_level','is_paid','stipend_text',
    'responsibilities','required_skills','preferred_skills','perks',
    'insurance_note','mandatory_staj_accepted','voluntary_staj_accepted',
    'company_id','country_code','category'
  ]::text[];
$function$;

create or replace function public.listings_zaman_damgalari()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  eski jsonb;
  yeni jsonb;
  alan text;
  icerik_degisti boolean := false;
  icerik_disi_degisti boolean := false;
begin
  if tg_op = 'INSERT' then
    new.content_updated_at := coalesce(new.content_updated_at, now());
    return new;
  end if;

  eski := to_jsonb(old);
  yeni := to_jsonb(new);

  /*
    "İÇERİK DIŞI BİR ŞEY DEĞİŞTİ Mİ" SORUSU GENEL SORULUYOR.

    Altı normalize alan ve iki zaman damgası çıkarıldıktan sonra kalan
    her şey karşılaştırılıyor. Kolon kolon saymak yerine böyle
    yapılıyor çünkü yeni bir kolon eklendiğinde liste güncellenmezse
    `updated_at` SESSİZCE durmaya başlardı — yani unutmanın bedeli
    yanlış davranış olurdu. Burada unutmanın bedeli yok.
  */
  for alan in select unnest(public.listings_normalize_alanlari()) loop
    eski := eski - alan;
    yeni := yeni - alan;
  end loop;
  eski := eski - 'updated_at' - 'content_updated_at';
  yeni := yeni - 'updated_at' - 'content_updated_at';

  icerik_disi_degisti := eski is distinct from yeni;

  /* Anlamlı alanlar AÇIK listeyle, tek tek. */
  for alan in select unnest(public.listings_anlamli_alanlar()) loop
    if to_jsonb(old) -> alan is distinct from to_jsonb(new) -> alan then
      icerik_degisti := true;
      exit;
    end if;
  end loop;

  /*
    Değer gerçekten değişmediyse hiçbir zaman damgası ilerlemiyor:
    "aynı değeri yeniden yazmak" bir güncelleme değil.
  */
  if icerik_disi_degisti then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;

  if icerik_degisti then
    new.content_updated_at := now();
  else
    new.content_updated_at := old.content_updated_at;
  end if;

  return new;
end;
$function$;

/*
  `t4` yeniden kuruluyor: aynı ad, aynı zamanlama, yeni gövde.
  INSERT de eklendi ki yeni satırda `content_updated_at` dolsun.
*/
drop trigger if exists t4 on public.listings;
create trigger t4
  before insert or update on public.listings
  for each row execute function public.listings_zaman_damgalari();

revoke all on function public.listings_zaman_damgalari() from public, anon, authenticated;
revoke all on function public.listings_normalize_alanlari() from public, anon, authenticated;
revoke all on function public.listings_anlamli_alanlar() from public, anon, authenticated;
